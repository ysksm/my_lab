import type { Commit } from "../entities/Commit.ts";
import type { FileChange } from "../entities/FileChange.ts";
import type { ImportProgress } from "../value-objects/AnalysisResult.ts";

export interface CommitWithChanges {
  commit: Commit;
  fileChanges: FileChange[];
  parentHashes: string[];
}

export interface IGitRepository {
  getRepoName(): Promise<string>;
  getAllCommits(
    onProgress?: (progress: ImportProgress) => void
  ): AsyncGenerator<CommitWithChanges, void, unknown>;
}
