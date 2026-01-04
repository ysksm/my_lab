#!/usr/bin/env bun

import { resolve } from "path";
import {
  DuckDBCommitRepository,
  SimpleGitRepository,
  ImportCommitsUseCase,
  AnalyzeCommitsUseCase,
} from "../../core/src/index.ts";

const HELP_TEXT = `
Git Commit Database Analyzer (CLI)
===================================

Usage: bun run start <command> [options]

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
  bun run start import .
  bun run start hotspots --limit=10
  bun run start history src/main.ts
  bun run start risk --limit=15
`;

function parseArgs(args: string[]): {
  command: string;
  positional: string[];
  options: Record<string, string>;
} {
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

function formatTable(rows: Record<string, unknown>[], columns?: string[]): string {
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
    .map((row) => cols.map((c) => String(row[c] ?? "").padEnd(widths[c])).join(" | "))
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
  const commitRepository = new DuckDBCommitRepository(dbPath);
  await commitRepository.init();

  const analyzeUseCase = new AnalyzeCommitsUseCase(commitRepository);

  try {
    switch (command) {
      case "import": {
        const repoPath = positional[0] || ".";
        const absolutePath = resolve(repoPath);
        console.log(`Importing git history from: ${absolutePath}`);

        const gitRepository = new SimpleGitRepository(absolutePath);
        const importUseCase = new ImportCommitsUseCase(commitRepository, gitRepository);

        const result = await importUseCase.execute((progress) => {
          process.stdout.write(`\rProgress: ${progress.current}/${progress.total} commits`);
        });

        console.log(`\nRepository: ${result.repoName}`);
        console.log(`Imported ${result.importedCount} new commits.`);
        console.log(`Total commits in database: ${await commitRepository.getCommitCount()}`);
        break;
      }

      case "hotspots": {
        const limit = parseInt(options["limit"] || "20");
        console.log(`\n=== Hotspots (Top ${limit} frequently changed files) ===\n`);
        const results = await analyzeUseCase.getHotspots(limit);
        console.log(
          formatTable(
            results.map((r) => ({
              file_path: r.filePath,
              change_count: r.changeCount,
              total_insertions: r.totalInsertions,
              total_deletions: r.totalDeletions,
              churn: r.churn,
            }))
          )
        );
        break;
      }

      case "bugfixes": {
        const limit = parseInt(options["limit"] || "30");
        console.log(`\n=== Bug Fix Commits (Latest ${limit}) ===\n`);
        const results = await analyzeUseCase.findBugFixCommits(limit);
        console.log(
          formatTable(
            results.map((r) => ({
              hash: r.hash.substring(0, 7),
              date: r.date,
              author_name: r.authorName,
              files_changed: r.filesChanged,
              message: r.message,
            }))
          )
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
        const results = await analyzeUseCase.getFileHistory(filePath, limit);
        console.log(
          formatTable(
            results.map((r) => ({
              hash: r.hash.substring(0, 7),
              date: r.date,
              author_name: r.authorName,
              change_type: r.changeType,
              insertions: r.insertions,
              deletions: r.deletions,
              message: r.message,
            }))
          )
        );
        break;
      }

      case "coupled": {
        const minCoupling = parseInt(options["min"] || "3");
        const limit = parseInt(options["limit"] || "30");
        console.log(`\n=== Coupled Files (min ${minCoupling} co-changes) ===\n`);
        const results = await analyzeUseCase.getCoupledFiles(minCoupling, limit);
        console.log(
          formatTable(
            results.map((r) => ({
              file1: r.file1,
              file2: r.file2,
              coupling_count: r.couplingCount,
              coupling_percentage: r.couplingPercentage,
            }))
          )
        );
        break;
      }

      case "authors": {
        console.log("\n=== Author Statistics ===\n");
        const results = await analyzeUseCase.getAuthorStats();
        console.log(
          formatTable(
            results.map((r) => ({
              author_name: r.authorName,
              commit_count: r.commitCount,
              files_touched: r.filesTouched,
              total_insertions: r.totalInsertions,
              total_deletions: r.totalDeletions,
            }))
          )
        );
        break;
      }

      case "churn": {
        const minChurn = parseInt(options["min"] || "100");
        const limit = parseInt(options["limit"] || "20");
        console.log(`\n=== High Churn Files (min ${minChurn} lines changed) ===\n`);
        const results = await analyzeUseCase.getHighChurnFiles(minChurn, limit);
        console.log(
          formatTable(
            results.map((r) => ({
              file_path: r.filePath,
              change_count: r.changeCount,
              total_insertions: r.totalInsertions,
              total_deletions: r.totalDeletions,
              churn: r.churn,
            }))
          )
        );
        break;
      }

      case "risk": {
        const limit = parseInt(options["limit"] || "20");
        console.log(`\n=== Bug Risk Prediction (Top ${limit}) ===\n`);
        const results = await analyzeUseCase.getBugPredictionScores(limit);
        console.log(
          formatTable(
            results.map((r) => ({
              file_path: r.filePath,
              change_frequency: r.changeFrequency,
              churn: r.churn,
              bug_fix_count: r.bugFixCount,
              author_count: r.authorCount,
              risk_score: r.riskScore,
            }))
          )
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
        const result = await analyzeUseCase.getCommitDetails(hash);
        if (!result) {
          console.log("Commit not found.");
          break;
        }
        console.log(`Hash:    ${result.commit.hash}`);
        console.log(`Author:  ${result.commit.authorName}`);
        console.log(`Date:    ${result.commit.date.toISOString()}`);
        console.log(`Message: ${result.commit.message}`);
        console.log("\nFiles changed:");
        console.log(
          formatTable(
            result.files.map((f) => ({
              file_path: f.filePath,
              change_type: f.changeType,
              insertions: f.insertions,
              deletions: f.deletions,
            }))
          )
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
        const results = await analyzeUseCase.executeCustomQuery<Record<string, unknown>>(sql);
        console.log(formatTable(results));
        break;
      }

      case "stats": {
        console.log("\n=== Database Statistics ===\n");
        const stats = await analyzeUseCase.getDatabaseStats();
        console.log(`Total commits:        ${stats.totalCommits}`);
        console.log(`Total file changes:   ${stats.totalFileChanges}`);
        console.log(`Unique files tracked: ${stats.uniqueFilesTracked}`);
        if (stats.dateRange.minDate) {
          console.log(`Date range:           ${stats.dateRange.minDate} to ${stats.dateRange.maxDate}`);
        }
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        console.log(HELP_TEXT);
        process.exit(1);
    }
  } finally {
    await commitRepository.close();
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
