import type { Commit } from "../entities/Commit";
import type { FileChange } from "../entities/FileChange";
import type { ImportProgress } from "../value-objects/AnalysisResult";

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
