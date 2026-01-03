import simpleGit, { type SimpleGit, type LogResult } from "simple-git";
import { GitDatabase, type CommitRow, type FileChangeRow } from "./db";

export interface ImportProgress {
  total: number;
  current: number;
  hash: string;
}

export class GitImporter {
  private git: SimpleGit;
  private db: GitDatabase;
  private repoPath: string;

  constructor(repoPath: string, db: GitDatabase) {
    this.repoPath = repoPath;
    this.git = simpleGit(repoPath);
    this.db = db;
  }

  async importAllCommits(
    onProgress?: (progress: ImportProgress) => void
  ): Promise<number> {
    // 全コミットのログを取得
    const log: LogResult = await this.git.log([
      "--all",
      "--date=iso-strict",
      "--numstat",
    ]);

    const commits = log.all;
    let imported = 0;

    for (let i = 0; i < commits.length; i++) {
      const commit = commits[i];

      // 既にインポート済みならスキップ
      if (await this.db.commitExists(commit.hash)) {
        continue;
      }

      const isMerge =
        commit.message.startsWith("Merge") ||
        (commit as unknown as { parent?: string }).parent?.includes(" ");

      // コミット情報を保存
      const commitRow: CommitRow = {
        hash: commit.hash,
        author_name: commit.author_name,
        author_email: commit.author_email,
        date: commit.date,
        message: commit.message,
        is_merge: isMerge,
      };

      await this.db.insertCommit(commitRow);

      // ファイル変更情報を取得して保存
      await this.importFileChanges(commit.hash);

      // 親コミット情報を保存
      await this.importParentCommits(commit.hash);

      imported++;

      if (onProgress) {
        onProgress({
          total: commits.length,
          current: i + 1,
          hash: commit.hash,
        });
      }
    }

    return imported;
  }

  private async importFileChanges(commitHash: string): Promise<void> {
    try {
      // git show でファイル変更情報を取得
      const diffResult = await this.git.show([
        commitHash,
        "--numstat",
        "--format=",
      ]);

      const lines = diffResult.split("\n").filter((line) => line.trim());

      for (const line of lines) {
        const parts = line.split("\t");
        if (parts.length >= 3) {
          const [insertions, deletions, filePath] = parts;

          // バイナリファイルの場合は - が入る
          const ins = insertions === "-" ? 0 : parseInt(insertions, 10);
          const del = deletions === "-" ? 0 : parseInt(deletions, 10);

          // 変更タイプを推測
          let changeType = "M"; // Modified
          if (ins > 0 && del === 0) {
            changeType = "A"; // Added (新規ファイルの可能性)
          } else if (ins === 0 && del > 0) {
            changeType = "D"; // Deleted
          }

          // リネームの検出 (ファイルパスに => が含まれる場合)
          let finalPath = filePath;
          if (filePath.includes(" => ")) {
            changeType = "R";
            // {old => new} 形式のパスを処理
            finalPath = filePath.replace(/\{[^}]+ => ([^}]+)\}/, "$1");
            if (finalPath.includes(" => ")) {
              finalPath = finalPath.split(" => ")[1];
            }
          }

          const fileChange: FileChangeRow = {
            commit_hash: commitHash,
            file_path: finalPath,
            change_type: changeType,
            insertions: ins,
            deletions: del,
          };

          await this.db.insertFileChange(fileChange);
        }
      }
    } catch {
      // 最初のコミットなど、親がない場合はスキップ
    }
  }

  private async importParentCommits(commitHash: string): Promise<void> {
    try {
      const result = await this.git.raw(["rev-parse", `${commitHash}^@`]);
      const parents = result.trim().split("\n").filter(Boolean);

      for (let i = 0; i < parents.length; i++) {
        await this.db.insertCommitParent(commitHash, parents[i], i);
      }
    } catch {
      // 親がないコミット（initial commit）はスキップ
    }
  }

  async getRepoName(): Promise<string> {
    const remotes = await this.git.getRemotes(true);
    if (remotes.length > 0 && remotes[0].refs.fetch) {
      const url = remotes[0].refs.fetch;
      const match = url.match(/\/([^/]+?)(\.git)?$/);
      if (match) {
        return match[1];
      }
    }
    // リモートがない場合はディレクトリ名を使用
    return this.repoPath.split("/").pop() || "unknown";
  }
}
