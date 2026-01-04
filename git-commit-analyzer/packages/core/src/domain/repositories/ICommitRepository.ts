import type { Commit } from "../entities/Commit.ts";
import type { FileChange } from "../entities/FileChange.ts";
import type {
  HotspotResult,
  BugFixCommit,
  FileHistoryEntry,
  CoupledFiles,
  AuthorStats,
  BugRiskScore,
  DatabaseStats,
} from "../value-objects/AnalysisResult.ts";

export interface ICommitRepository {
  // 基本操作
  init(): Promise<void>;
  close(): Promise<void>;

  // コミット操作
  saveCommit(commit: Commit): Promise<void>;
  saveFileChange(fileChange: FileChange): Promise<void>;
  saveCommitParent(commitHash: string, parentHash: string, order: number): Promise<void>;
  commitExists(hash: string): Promise<boolean>;
  getCommitCount(): Promise<number>;

  // 分析クエリ
  getHotspots(limit: number): Promise<HotspotResult[]>;
  findBugFixCommits(limit: number): Promise<BugFixCommit[]>;
  getFileHistory(filePath: string, limit: number): Promise<FileHistoryEntry[]>;
  getCoupledFiles(minCoupling: number, limit: number): Promise<CoupledFiles[]>;
  getAuthorStats(): Promise<AuthorStats[]>;
  getHighChurnFiles(minChurn: number, limit: number): Promise<HotspotResult[]>;
  getBugPredictionScores(limit: number): Promise<BugRiskScore[]>;
  getCommitFiles(commitHash: string): Promise<FileChange[]>;
  getCommitByHash(hash: string): Promise<Commit | null>;
  getDatabaseStats(): Promise<DatabaseStats>;

  // カスタムクエリ
  executeQuery<T>(sql: string): Promise<T[]>;
}
