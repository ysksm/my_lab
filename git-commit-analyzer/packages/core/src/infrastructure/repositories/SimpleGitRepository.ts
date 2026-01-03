import simpleGit, { type SimpleGit, type LogResult } from "simple-git";
import type { IGitRepository, CommitWithChanges } from "../../domain/repositories/IGitRepository";
import { Commit } from "../../domain/entities/Commit";
import { FileChange, type ChangeType } from "../../domain/entities/FileChange";
import type { ImportProgress } from "../../domain/value-objects/AnalysisResult";

export class SimpleGitRepository implements IGitRepository {
  private git: SimpleGit;
  private repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
    this.git = simpleGit(repoPath);
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
    return this.repoPath.split("/").pop() || "unknown";
  }

  async *getAllCommits(
    onProgress?: (progress: ImportProgress) => void
  ): AsyncGenerator<CommitWithChanges, void, unknown> {
    const log: LogResult = await this.git.log(["--all", "--date=iso-strict"]);
    const commits = log.all;

    for (let i = 0; i < commits.length; i++) {
      const gitCommit = commits[i];

      if (onProgress) {
        onProgress({
          total: commits.length,
          current: i + 1,
          hash: gitCommit.hash,
        });
      }

      const isMerge =
        gitCommit.message.startsWith("Merge") ||
        (gitCommit as unknown as { parent?: string }).parent?.includes(" ");

      const commit = new Commit({
        hash: gitCommit.hash,
        authorName: gitCommit.author_name,
        authorEmail: gitCommit.author_email,
        date: new Date(gitCommit.date),
        message: gitCommit.message,
        isMerge: Boolean(isMerge),
      });

      const fileChanges = await this.getFileChanges(gitCommit.hash);
      const parentHashes = await this.getParentHashes(gitCommit.hash);

      yield {
        commit,
        fileChanges,
        parentHashes,
      };
    }
  }

  private async getFileChanges(commitHash: string): Promise<FileChange[]> {
    const changes: FileChange[] = [];

    try {
      const diffResult = await this.git.show([commitHash, "--numstat", "--format="]);
      const lines = diffResult.split("\n").filter((line) => line.trim());

      for (const line of lines) {
        const parts = line.split("\t");
        if (parts.length >= 3) {
          const [insertions, deletions, filePath] = parts;

          const ins = insertions === "-" ? 0 : parseInt(insertions, 10);
          const del = deletions === "-" ? 0 : parseInt(deletions, 10);

          let changeType: ChangeType = "M";
          if (ins > 0 && del === 0) {
            changeType = "A";
          } else if (ins === 0 && del > 0) {
            changeType = "D";
          }

          let finalPath = filePath;
          if (filePath.includes(" => ")) {
            changeType = "R";
            finalPath = filePath.replace(/\{[^}]+ => ([^}]+)\}/, "$1");
            if (finalPath.includes(" => ")) {
              finalPath = finalPath.split(" => ")[1];
            }
          }

          changes.push(
            new FileChange({
              commitHash,
              filePath: finalPath,
              changeType,
              insertions: ins,
              deletions: del,
            })
          );
        }
      }
    } catch {
      // Initial commit or other errors
    }

    return changes;
  }

  private async getParentHashes(commitHash: string): Promise<string[]> {
    try {
      const result = await this.git.raw(["rev-parse", `${commitHash}^@`]);
      return result.trim().split("\n").filter(Boolean);
    } catch {
      return [];
    }
  }
}
