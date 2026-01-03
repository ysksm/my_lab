import { GitDatabase } from "./db";

export interface HotspotResult {
  file_path: string;
  change_count: number;
  total_insertions: number;
  total_deletions: number;
  churn: number;
}

export interface BugCommitResult {
  hash: string;
  author_name: string;
  date: string;
  message: string;
  files_changed: number;
}

export interface FileHistoryResult {
  hash: string;
  date: string;
  author_name: string;
  message: string;
  insertions: number;
  deletions: number;
  change_type: string;
}

export interface CoupledFilesResult {
  file1: string;
  file2: string;
  coupling_count: number;
  coupling_percentage: number;
}

export interface AuthorStatsResult {
  author_name: string;
  commit_count: number;
  files_touched: number;
  total_insertions: number;
  total_deletions: number;
}

export class GitAnalyzer {
  private db: GitDatabase;

  constructor(db: GitDatabase) {
    this.db = db;
  }

  /**
   * ホットスポット分析: 頻繁に変更されるファイルを特定
   * 不具合が発生しやすい場所の特定に有用
   */
  async getHotspots(limit: number = 20): Promise<HotspotResult[]> {
    return this.db.query<HotspotResult>(
      `
      SELECT
        file_path,
        COUNT(*) as change_count,
        SUM(insertions) as total_insertions,
        SUM(deletions) as total_deletions,
        SUM(insertions + deletions) as churn
      FROM file_changes
      GROUP BY file_path
      ORDER BY change_count DESC
      LIMIT ?
    `,
      limit
    );
  }

  /**
   * バグ修正コミットの検索
   * コミットメッセージから不具合関連のコミットを特定
   */
  async findBugFixCommits(limit: number = 50): Promise<BugCommitResult[]> {
    return this.db.query<BugCommitResult>(
      `
      SELECT
        c.hash,
        c.author_name,
        c.date,
        c.message,
        COUNT(fc.file_path) as files_changed
      FROM commits c
      LEFT JOIN file_changes fc ON c.hash = fc.commit_hash
      WHERE
        LOWER(c.message) LIKE '%fix%' OR
        LOWER(c.message) LIKE '%bug%' OR
        LOWER(c.message) LIKE '%issue%' OR
        LOWER(c.message) LIKE '%error%' OR
        LOWER(c.message) LIKE '%defect%' OR
        LOWER(c.message) LIKE '%修正%' OR
        LOWER(c.message) LIKE '%バグ%' OR
        LOWER(c.message) LIKE '%不具合%'
      GROUP BY c.hash, c.author_name, c.date, c.message
      ORDER BY c.date DESC
      LIMIT ?
    `,
      limit
    );
  }

  /**
   * 特定ファイルの変更履歴を取得
   * 不具合の原因コミットを特定するのに有用
   */
  async getFileHistory(
    filePath: string,
    limit: number = 50
  ): Promise<FileHistoryResult[]> {
    return this.db.query<FileHistoryResult>(
      `
      SELECT
        c.hash,
        c.date,
        c.author_name,
        c.message,
        fc.insertions,
        fc.deletions,
        fc.change_type
      FROM commits c
      JOIN file_changes fc ON c.hash = fc.commit_hash
      WHERE fc.file_path LIKE ?
      ORDER BY c.date DESC
      LIMIT ?
    `,
      `%${filePath}%`,
      limit
    );
  }

  /**
   * ファイルの結合度分析
   * 一緒に変更されることが多いファイルを特定（変更波及の予測に有用）
   */
  async getCoupledFiles(
    minCoupling: number = 3,
    limit: number = 30
  ): Promise<CoupledFilesResult[]> {
    return this.db.query<CoupledFilesResult>(
      `
      WITH file_pairs AS (
        SELECT
          a.file_path as file1,
          b.file_path as file2,
          COUNT(DISTINCT a.commit_hash) as coupling_count
        FROM file_changes a
        JOIN file_changes b ON a.commit_hash = b.commit_hash
        WHERE a.file_path < b.file_path
        GROUP BY a.file_path, b.file_path
        HAVING COUNT(DISTINCT a.commit_hash) >= ?
      ),
      file_counts AS (
        SELECT file_path, COUNT(DISTINCT commit_hash) as total_changes
        FROM file_changes
        GROUP BY file_path
      )
      SELECT
        fp.file1,
        fp.file2,
        fp.coupling_count,
        ROUND(100.0 * fp.coupling_count / LEAST(fc1.total_changes, fc2.total_changes), 2) as coupling_percentage
      FROM file_pairs fp
      JOIN file_counts fc1 ON fp.file1 = fc1.file_path
      JOIN file_counts fc2 ON fp.file2 = fc2.file_path
      ORDER BY coupling_count DESC
      LIMIT ?
    `,
      minCoupling,
      limit
    );
  }

  /**
   * 作者別の統計情報
   */
  async getAuthorStats(): Promise<AuthorStatsResult[]> {
    return this.db.query<AuthorStatsResult>(
      `
      SELECT
        c.author_name,
        COUNT(DISTINCT c.hash) as commit_count,
        COUNT(DISTINCT fc.file_path) as files_touched,
        SUM(fc.insertions) as total_insertions,
        SUM(fc.deletions) as total_deletions
      FROM commits c
      LEFT JOIN file_changes fc ON c.hash = fc.commit_hash
      GROUP BY c.author_name
      ORDER BY commit_count DESC
    `
    );
  }

  /**
   * 期間指定でコミットを検索
   */
  async getCommitsByDateRange(
    startDate: string,
    endDate: string
  ): Promise<BugCommitResult[]> {
    return this.db.query<BugCommitResult>(
      `
      SELECT
        c.hash,
        c.author_name,
        c.date,
        c.message,
        COUNT(fc.file_path) as files_changed
      FROM commits c
      LEFT JOIN file_changes fc ON c.hash = fc.commit_hash
      WHERE c.date >= ? AND c.date <= ?
      GROUP BY c.hash, c.author_name, c.date, c.message
      ORDER BY c.date DESC
    `,
      startDate,
      endDate
    );
  }

  /**
   * コードチャーン分析: 追加後すぐに削除されるコードを持つファイルを特定
   * 不安定なコードの指標として有用
   */
  async getHighChurnFiles(
    minChurn: number = 100,
    limit: number = 20
  ): Promise<HotspotResult[]> {
    return this.db.query<HotspotResult>(
      `
      SELECT
        file_path,
        COUNT(*) as change_count,
        SUM(insertions) as total_insertions,
        SUM(deletions) as total_deletions,
        SUM(insertions + deletions) as churn
      FROM file_changes
      GROUP BY file_path
      HAVING SUM(insertions + deletions) >= ?
      ORDER BY churn DESC
      LIMIT ?
    `,
      minChurn,
      limit
    );
  }

  /**
   * 特定のコミットに含まれるファイル変更を取得
   */
  async getCommitFiles(
    commitHash: string
  ): Promise<
    { file_path: string; change_type: string; insertions: number; deletions: number }[]
  > {
    return this.db.query(
      `
      SELECT file_path, change_type, insertions, deletions
      FROM file_changes
      WHERE commit_hash = ?
      ORDER BY file_path
    `,
      commitHash
    );
  }

  /**
   * 不具合予測スコアの計算
   * 複数の指標を組み合わせてファイルの不具合リスクを算出
   */
  async getBugPredictionScores(
    limit: number = 20
  ): Promise<
    {
      file_path: string;
      change_frequency: number;
      churn: number;
      bug_fix_count: number;
      author_count: number;
      risk_score: number;
    }[]
  > {
    return this.db.query(
      `
      WITH bug_fixes AS (
        SELECT
          fc.file_path,
          COUNT(*) as bug_fix_count
        FROM file_changes fc
        JOIN commits c ON fc.commit_hash = c.hash
        WHERE
          LOWER(c.message) LIKE '%fix%' OR
          LOWER(c.message) LIKE '%bug%' OR
          LOWER(c.message) LIKE '%修正%' OR
          LOWER(c.message) LIKE '%バグ%'
        GROUP BY fc.file_path
      ),
      file_stats AS (
        SELECT
          fc.file_path,
          COUNT(*) as change_frequency,
          SUM(fc.insertions + fc.deletions) as churn,
          COUNT(DISTINCT c.author_name) as author_count
        FROM file_changes fc
        JOIN commits c ON fc.commit_hash = c.hash
        GROUP BY fc.file_path
      )
      SELECT
        fs.file_path,
        fs.change_frequency,
        fs.churn,
        COALESCE(bf.bug_fix_count, 0) as bug_fix_count,
        fs.author_count,
        ROUND(
          (fs.change_frequency * 1.0 +
           fs.churn * 0.1 +
           COALESCE(bf.bug_fix_count, 0) * 5.0 +
           fs.author_count * 2.0),
          2
        ) as risk_score
      FROM file_stats fs
      LEFT JOIN bug_fixes bf ON fs.file_path = bf.file_path
      ORDER BY risk_score DESC
      LIMIT ?
    `,
      limit
    );
  }

  /**
   * カスタムSQLクエリの実行
   */
  async executeCustomQuery<T>(sql: string): Promise<T[]> {
    return this.db.query<T>(sql);
  }
}
