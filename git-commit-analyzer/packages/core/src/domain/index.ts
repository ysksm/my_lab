// Entities
export { Commit, type CommitProps } from "./entities/Commit.ts";
export { FileChange, type FileChangeProps, type ChangeType } from "./entities/FileChange.ts";

// Value Objects
export type {
  HotspotResult,
  BugFixCommit,
  FileHistoryEntry,
  CoupledFiles,
  AuthorStats,
  BugRiskScore,
  DatabaseStats,
  ImportProgress,
} from "./value-objects/AnalysisResult.ts";

// Repository Interfaces
export type { ICommitRepository } from "./repositories/ICommitRepository.ts";
export type { IGitRepository, CommitWithChanges } from "./repositories/IGitRepository.ts";
