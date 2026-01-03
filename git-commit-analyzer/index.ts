#!/usr/bin/env bun

import { GitDatabase } from "./src/db";
import { GitImporter } from "./src/git";
import { GitAnalyzer } from "./src/analyzer";
import { resolve } from "path";

const HELP_TEXT = `
Git Commit Database Analyzer
============================

Usage: bun run index.ts <command> [options]

Commands:
  import <repo-path>           Git履歴をデータベースにインポート
  hotspots [--limit=N]         頻繁に変更されるファイル（ホットスポット）を表示
  bugfixes [--limit=N]         バグ修正コミットを検索
  history <file-path>          特定ファイルの変更履歴を表示
  coupled [--min=N]            一緒に変更されることが多いファイルペアを表示
  authors                      作者別の統計情報を表示
  churn [--min=N]              コードチャーンが高いファイルを表示
  risk [--limit=N]             不具合リスクスコアの高いファイルを表示
  commit <hash>                特定コミットの詳細を表示
  query <sql>                  カスタムSQLクエリを実行
  stats                        データベースの統計情報を表示

Options:
  --db=<path>                  データベースファイルのパス (デフォルト: git_commits.duckdb)
  --help, -h                   このヘルプを表示

Examples:
  bun run index.ts import .
  bun run index.ts hotspots --limit=10
  bun run index.ts history src/main.ts
  bun run index.ts risk --limit=15
  bun run index.ts query "SELECT * FROM commits LIMIT 5"
`;

function parseArgs(
  args: string[]
): { command: string; positional: string[]; options: Record<string, string> } {
  const options: Record<string, string> = {};
  const positional: string[] = [];
  let command = "";

  for (const arg of args) {
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      options[key] = value || "true";
    } else if (arg === "-h") {
      options["help"] = "true";
    } else if (!command) {
      command = arg;
    } else {
      positional.push(arg);
    }
  }

  return { command, positional, options };
}

function formatTable(
  rows: Record<string, unknown>[],
  columns?: string[]
): string {
  if (rows.length === 0) return "No results found.";

  const cols = columns || Object.keys(rows[0]);
  const widths: Record<string, number> = {};

  for (const col of cols) {
    widths[col] = col.length;
    for (const row of rows) {
      const val = String(row[col] ?? "");
      widths[col] = Math.max(widths[col], val.length);
    }
  }

  const header = cols.map((c) => c.padEnd(widths[c])).join(" | ");
  const separator = cols.map((c) => "-".repeat(widths[c])).join("-+-");
  const body = rows
    .map((row) =>
      cols.map((c) => String(row[c] ?? "").padEnd(widths[c])).join(" | ")
    )
    .join("\n");

  return `${header}\n${separator}\n${body}`;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const { command, positional, options } = parseArgs(args);

  if (options["help"] || !command) {
    console.log(HELP_TEXT);
    return;
  }

  const dbPath = options["db"] || "git_commits.duckdb";
  const db = new GitDatabase(dbPath);
  await db.init();

  const analyzer = new GitAnalyzer(db);

  try {
    switch (command) {
      case "import": {
        const repoPath = positional[0] || ".";
        const absolutePath = resolve(repoPath);
        console.log(`Importing git history from: ${absolutePath}`);

        const importer = new GitImporter(absolutePath, db);
        const repoName = await importer.getRepoName();
        console.log(`Repository: ${repoName}`);

        const imported = await importer.importAllCommits((progress) => {
          process.stdout.write(
            `\rProgress: ${progress.current}/${progress.total} commits`
          );
        });

        console.log(`\nImported ${imported} new commits.`);
        const total = await db.getCommitCount();
        console.log(`Total commits in database: ${total}`);
        break;
      }

      case "hotspots": {
        const limit = parseInt(options["limit"] || "20");
        console.log(`\n=== Hotspots (Top ${limit} frequently changed files) ===\n`);
        const results = await analyzer.getHotspots(limit);
        console.log(
          formatTable(results, [
            "file_path",
            "change_count",
            "total_insertions",
            "total_deletions",
            "churn",
          ])
        );
        break;
      }

      case "bugfixes": {
        const limit = parseInt(options["limit"] || "30");
        console.log(`\n=== Bug Fix Commits (Latest ${limit}) ===\n`);
        const results = await analyzer.findBugFixCommits(limit);
        console.log(
          formatTable(results, [
            "hash",
            "date",
            "author_name",
            "files_changed",
            "message",
          ])
        );
        break;
      }

      case "history": {
        const filePath = positional[0];
        if (!filePath) {
          console.error("Error: Please specify a file path");
          process.exit(1);
        }
        const limit = parseInt(options["limit"] || "50");
        console.log(`\n=== File History: ${filePath} ===\n`);
        const results = await analyzer.getFileHistory(filePath, limit);
        console.log(
          formatTable(results, [
            "hash",
            "date",
            "author_name",
            "change_type",
            "insertions",
            "deletions",
            "message",
          ])
        );
        break;
      }

      case "coupled": {
        const minCoupling = parseInt(options["min"] || "3");
        const limit = parseInt(options["limit"] || "30");
        console.log(`\n=== Coupled Files (min ${minCoupling} co-changes) ===\n`);
        const results = await analyzer.getCoupledFiles(minCoupling, limit);
        console.log(
          formatTable(results, [
            "file1",
            "file2",
            "coupling_count",
            "coupling_percentage",
          ])
        );
        break;
      }

      case "authors": {
        console.log("\n=== Author Statistics ===\n");
        const results = await analyzer.getAuthorStats();
        console.log(
          formatTable(results, [
            "author_name",
            "commit_count",
            "files_touched",
            "total_insertions",
            "total_deletions",
          ])
        );
        break;
      }

      case "churn": {
        const minChurn = parseInt(options["min"] || "100");
        const limit = parseInt(options["limit"] || "20");
        console.log(`\n=== High Churn Files (min ${minChurn} lines changed) ===\n`);
        const results = await analyzer.getHighChurnFiles(minChurn, limit);
        console.log(
          formatTable(results, [
            "file_path",
            "change_count",
            "total_insertions",
            "total_deletions",
            "churn",
          ])
        );
        break;
      }

      case "risk": {
        const limit = parseInt(options["limit"] || "20");
        console.log(`\n=== Bug Risk Prediction (Top ${limit}) ===\n`);
        const results = await analyzer.getBugPredictionScores(limit);
        console.log(
          formatTable(results, [
            "file_path",
            "change_frequency",
            "churn",
            "bug_fix_count",
            "author_count",
            "risk_score",
          ])
        );
        break;
      }

      case "commit": {
        const hash = positional[0];
        if (!hash) {
          console.error("Error: Please specify a commit hash");
          process.exit(1);
        }
        console.log(`\n=== Commit Details: ${hash} ===\n`);
        const commitInfo = await db.query<{
          hash: string;
          author_name: string;
          date: string;
          message: string;
        }>("SELECT * FROM commits WHERE hash LIKE ?", `${hash}%`);
        if (commitInfo.length === 0) {
          console.log("Commit not found.");
          break;
        }
        console.log(`Hash:    ${commitInfo[0].hash}`);
        console.log(`Author:  ${commitInfo[0].author_name}`);
        console.log(`Date:    ${commitInfo[0].date}`);
        console.log(`Message: ${commitInfo[0].message}`);
        console.log("\nFiles changed:");
        const files = await analyzer.getCommitFiles(commitInfo[0].hash);
        console.log(
          formatTable(files, ["file_path", "change_type", "insertions", "deletions"])
        );
        break;
      }

      case "query": {
        const sql = positional.join(" ");
        if (!sql) {
          console.error("Error: Please specify a SQL query");
          process.exit(1);
        }
        console.log("\n=== Custom Query Results ===\n");
        const results = await analyzer.executeCustomQuery<Record<string, unknown>>(sql);
        console.log(formatTable(results));
        break;
      }

      case "stats": {
        console.log("\n=== Database Statistics ===\n");
        const commitCount = await db.getCommitCount();
        const fileChangeCount = await db.query<{ count: number }>(
          "SELECT COUNT(*) as count FROM file_changes"
        );
        const uniqueFiles = await db.query<{ count: number }>(
          "SELECT COUNT(DISTINCT file_path) as count FROM file_changes"
        );
        const dateRange = await db.query<{ min_date: string; max_date: string }>(
          "SELECT MIN(date) as min_date, MAX(date) as max_date FROM commits"
        );

        console.log(`Total commits:        ${commitCount}`);
        console.log(`Total file changes:   ${fileChangeCount[0]?.count || 0}`);
        console.log(`Unique files tracked: ${uniqueFiles[0]?.count || 0}`);
        if (dateRange[0]?.min_date) {
          console.log(`Date range:           ${dateRange[0].min_date} to ${dateRange[0].max_date}`);
        }
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        console.log(HELP_TEXT);
        process.exit(1);
    }
  } finally {
    await db.close();
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
