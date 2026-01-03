// Entities
export { Commit, type CommitProps } from "./entities/Commit";
export { FileChange, type FileChangeProps, type ChangeType } from "./entities/FileChange";

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
} from "./value-objects/AnalysisResult";

// Repository Interfaces
export type { ICommitRepository } from "./repositories/ICommitRepository";
export type { IGitRepository, CommitWithChanges } from "./repositories/IGitRepository";
