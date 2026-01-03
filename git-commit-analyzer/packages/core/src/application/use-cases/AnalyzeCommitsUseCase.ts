import type { ICommitRepository } from "../../domain/repositories/ICommitRepository";
import type {
  HotspotResult,
  BugFixCommit,
  FileHistoryEntry,
  CoupledFiles,
  AuthorStats,
  BugRiskScore,
  DatabaseStats,
} from "../../domain/value-objects/AnalysisResult";
import type { Commit } from "../../domain/entities/Commit";
import type { FileChange } from "../../domain/entities/FileChange";

export class AnalyzeCommitsUseCase {
  constructor(private readonly commitRepository: ICommitRepository) {}

  async getHotspots(limit: number = 20): Promise<HotspotResult[]> {
    return this.commitRepository.getHotspots(limit);
  }

  async findBugFixCommits(limit: number = 50): Promise<BugFixCommit[]> {
    return this.commitRepository.findBugFixCommits(limit);
  }

  async getFileHistory(filePath: string, limit: number = 50): Promise<FileHistoryEntry[]> {
    return this.commitRepository.getFileHistory(filePath, limit);
  }

  async getCoupledFiles(minCoupling: number = 3, limit: number = 30): Promise<CoupledFiles[]> {
    return this.commitRepository.getCoupledFiles(minCoupling, limit);
  }

  async getAuthorStats(): Promise<AuthorStats[]> {
    return this.commitRepository.getAuthorStats();
  }

  async getHighChurnFiles(minChurn: number = 100, limit: number = 20): Promise<HotspotResult[]> {
    return this.commitRepository.getHighChurnFiles(minChurn, limit);
  }

  async getBugPredictionScores(limit: number = 20): Promise<BugRiskScore[]> {
    return this.commitRepository.getBugPredictionScores(limit);
  }

  async getCommitDetails(hash: string): Promise<{ commit: Commit; files: FileChange[] } | null> {
    const commit = await this.commitRepository.getCommitByHash(hash);
    if (!commit) {
      return null;
    }
    const files = await this.commitRepository.getCommitFiles(commit.hash);
    return { commit, files };
  }

  async getDatabaseStats(): Promise<DatabaseStats> {
    return this.commitRepository.getDatabaseStats();
  }

  async executeCustomQuery<T>(sql: string): Promise<T[]> {
    return this.commitRepository.executeQuery<T>(sql);
  }
}
