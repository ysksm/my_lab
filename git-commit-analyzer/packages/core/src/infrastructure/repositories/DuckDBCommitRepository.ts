import { Database } from "duckdb-async";
import type { ICommitRepository } from "../../domain/repositories/ICommitRepository";
import { Commit } from "../../domain/entities/Commit";
import { FileChange, type ChangeType } from "../../domain/entities/FileChange";
import type {
  HotspotResult,
  BugFixCommit,
  FileHistoryEntry,
  CoupledFiles,
  AuthorStats,
  BugRiskScore,
  DatabaseStats,
} from "../../domain/value-objects/AnalysisResult";

export class DuckDBCommitRepository implements ICommitRepository {
  private db: Database | null = null;
  private dbPath: string;

  constructor(dbPath: string = "git_commits.duckdb") {
    this.dbPath = dbPath;
  }

  private escapeValue(value: unknown): string {
    if (value === null || value === undefined) {
      return "NULL";
    }
    if (typeof value === "boolean") {
      return value ? "TRUE" : "FALSE";
    }
    if (typeof value === "number") {
      return String(value);
    }
    const str = String(value).replace(/'/g, "''");
    return `'${str}'`;
  }

  async init(): Promise<void> {
    this.db = await Database.create(this.dbPath);
    await this.createTables();
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.run(`
      CREATE TABLE IF NOT EXISTS commits (
        hash VARCHAR PRIMARY KEY,
        author_name VARCHAR,
        author_email VARCHAR,
        date TIMESTAMP,
        message VARCHAR,
        is_merge BOOLEAN
      )
    `);

    await this.db.run(`CREATE SEQUENCE IF NOT EXISTS file_changes_seq START 1`);

    await this.db.run(`
      CREATE TABLE IF NOT EXISTS file_changes (
        id INTEGER DEFAULT nextval('file_changes_seq') PRIMARY KEY,
        commit_hash VARCHAR,
        file_path VARCHAR,
        change_type VARCHAR,
        insertions INTEGER,
        deletions INTEGER
      )
    `);

    await this.db.run(`
      CREATE TABLE IF NOT EXISTS commit_parents (
        commit_hash VARCHAR,
        parent_hash VARCHAR,
        parent_order INTEGER,
        PRIMARY KEY (commit_hash, parent_hash)
      )
    `);

    await this.db.run(`CREATE INDEX IF NOT EXISTS idx_file_changes_path ON file_changes(file_path)`);
    await this.db.run(`CREATE INDEX IF NOT EXISTS idx_file_changes_commit ON file_changes(commit_hash)`);
    await this.db.run(`CREATE INDEX IF NOT EXISTS idx_commits_date ON commits(date)`);
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }

  async saveCommit(commit: Commit): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.run(`DELETE FROM commits WHERE hash = ${this.escapeValue(commit.hash)}`);
    await this.db.run(`
      INSERT INTO commits (hash, author_name, author_email, date, message, is_merge)
      VALUES (${this.escapeValue(commit.hash)}, ${this.escapeValue(commit.authorName)},
              ${this.escapeValue(commit.authorEmail)}, ${this.escapeValue(commit.date.toISOString())},
              ${this.escapeValue(commit.message)}, ${this.escapeValue(commit.isMerge)})
    `);
  }

  async saveFileChange(fileChange: FileChange): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.run(`
      INSERT INTO file_changes (commit_hash, file_path, change_type, insertions, deletions)
      VALUES (${this.escapeValue(fileChange.commitHash)}, ${this.escapeValue(fileChange.filePath)},
              ${this.escapeValue(fileChange.changeType)}, ${this.escapeValue(fileChange.insertions)},
              ${this.escapeValue(fileChange.deletions)})
    `);
  }

  async saveCommitParent(commitHash: string, parentHash: string, order: number): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.run(`
      DELETE FROM commit_parents
      WHERE commit_hash = ${this.escapeValue(commitHash)} AND parent_hash = ${this.escapeValue(parentHash)}
    `);
    await this.db.run(`
      INSERT INTO commit_parents (commit_hash, parent_hash, parent_order)
      VALUES (${this.escapeValue(commitHash)}, ${this.escapeValue(parentHash)}, ${this.escapeValue(order)})
    `);
  }

  async commitExists(hash: string): Promise<boolean> {
    const result = await this.executeQuery<{ count: bigint }>(
      `SELECT COUNT(*) as count FROM commits WHERE hash = ${this.escapeValue(hash)}`
    );
    return Number(result[0]?.count ?? 0) > 0;
  }

  async getCommitCount(): Promise<number> {
    const result = await this.executeQuery<{ count: bigint }>("SELECT COUNT(*) as count FROM commits");
    return Number(result[0]?.count ?? 0);
  }

  async getHotspots(limit: number): Promise<HotspotResult[]> {
    const rows = await this.executeQuery<{
      file_path: string;
      change_count: bigint;
      total_insertions: bigint;
      total_deletions: bigint;
      churn: bigint;
    }>(`
      SELECT
        file_path,
        COUNT(*) as change_count,
        SUM(insertions) as total_insertions,
        SUM(deletions) as total_deletions,
        SUM(insertions + deletions) as churn
      FROM file_changes
      GROUP BY file_path
      ORDER BY change_count DESC
      LIMIT ${limit}
    `);

    return rows.map((row) => ({
      filePath: row.file_path,
      changeCount: Number(row.change_count),
      totalInsertions: Number(row.total_insertions),
      totalDeletions: Number(row.total_deletions),
      churn: Number(row.churn),
    }));
  }

  async findBugFixCommits(limit: number): Promise<BugFixCommit[]> {
    const rows = await this.executeQuery<{
      hash: string;
      author_name: string;
      date: Date;
      message: string;
      files_changed: bigint;
    }>(`
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
      LIMIT ${limit}
    `);

    return rows.map((row) => ({
      hash: row.hash,
      authorName: row.author_name,
      date: String(row.date),
      message: row.message,
      filesChanged: Number(row.files_changed),
    }));
  }

  async getFileHistory(filePath: string, limit: number): Promise<FileHistoryEntry[]> {
    const rows = await this.executeQuery<{
      hash: string;
      date: Date;
      author_name: string;
      message: string;
      insertions: number;
      deletions: number;
      change_type: string;
    }>(`
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
      WHERE fc.file_path LIKE ${this.escapeValue(`%${filePath}%`)}
      ORDER BY c.date DESC
      LIMIT ${limit}
    `);

    return rows.map((row) => ({
      hash: row.hash,
      date: String(row.date),
      authorName: row.author_name,
      message: row.message,
      insertions: row.insertions,
      deletions: row.deletions,
      changeType: row.change_type,
    }));
  }

  async getCoupledFiles(minCoupling: number, limit: number): Promise<CoupledFiles[]> {
    const rows = await this.executeQuery<{
      file1: string;
      file2: string;
      coupling_count: bigint;
      coupling_percentage: number;
    }>(`
      WITH file_pairs AS (
        SELECT
          a.file_path as file1,
          b.file_path as file2,
          COUNT(DISTINCT a.commit_hash) as coupling_count
        FROM file_changes a
        JOIN file_changes b ON a.commit_hash = b.commit_hash
        WHERE a.file_path < b.file_path
        GROUP BY a.file_path, b.file_path
        HAVING COUNT(DISTINCT a.commit_hash) >= ${minCoupling}
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
      LIMIT ${limit}
    `);

    return rows.map((row) => ({
      file1: row.file1,
      file2: row.file2,
      couplingCount: Number(row.coupling_count),
      couplingPercentage: row.coupling_percentage,
    }));
  }

  async getAuthorStats(): Promise<AuthorStats[]> {
    const rows = await this.executeQuery<{
      author_name: string;
      commit_count: bigint;
      files_touched: bigint;
      total_insertions: bigint;
      total_deletions: bigint;
    }>(`
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
    `);

    return rows.map((row) => ({
      authorName: row.author_name,
      commitCount: Number(row.commit_count),
      filesTouched: Number(row.files_touched),
      totalInsertions: Number(row.total_insertions),
      totalDeletions: Number(row.total_deletions),
    }));
  }

  async getHighChurnFiles(minChurn: number, limit: number): Promise<HotspotResult[]> {
    const rows = await this.executeQuery<{
      file_path: string;
      change_count: bigint;
      total_insertions: bigint;
      total_deletions: bigint;
      churn: bigint;
    }>(`
      SELECT
        file_path,
        COUNT(*) as change_count,
        SUM(insertions) as total_insertions,
        SUM(deletions) as total_deletions,
        SUM(insertions + deletions) as churn
      FROM file_changes
      GROUP BY file_path
      HAVING SUM(insertions + deletions) >= ${minChurn}
      ORDER BY churn DESC
      LIMIT ${limit}
    `);

    return rows.map((row) => ({
      filePath: row.file_path,
      changeCount: Number(row.change_count),
      totalInsertions: Number(row.total_insertions),
      totalDeletions: Number(row.total_deletions),
      churn: Number(row.churn),
    }));
  }

  async getBugPredictionScores(limit: number): Promise<BugRiskScore[]> {
    const rows = await this.executeQuery<{
      file_path: string;
      change_frequency: bigint;
      churn: bigint;
      bug_fix_count: bigint;
      author_count: bigint;
      risk_score: number;
    }>(`
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
      LIMIT ${limit}
    `);

    return rows.map((row) => ({
      filePath: row.file_path,
      changeFrequency: Number(row.change_frequency),
      churn: Number(row.churn),
      bugFixCount: Number(row.bug_fix_count),
      authorCount: Number(row.author_count),
      riskScore: row.risk_score,
    }));
  }

  async getCommitFiles(commitHash: string): Promise<FileChange[]> {
    const rows = await this.executeQuery<{
      id: number;
      commit_hash: string;
      file_path: string;
      change_type: string;
      insertions: number;
      deletions: number;
    }>(`
      SELECT id, commit_hash, file_path, change_type, insertions, deletions
      FROM file_changes
      WHERE commit_hash = ${this.escapeValue(commitHash)}
      ORDER BY file_path
    `);

    return rows.map(
      (row) =>
        new FileChange({
          id: row.id,
          commitHash: row.commit_hash,
          filePath: row.file_path,
          changeType: row.change_type as ChangeType,
          insertions: row.insertions,
          deletions: row.deletions,
        })
    );
  }

  async getCommitByHash(hash: string): Promise<Commit | null> {
    const rows = await this.executeQuery<{
      hash: string;
      author_name: string;
      author_email: string;
      date: Date;
      message: string;
      is_merge: boolean;
    }>(`SELECT * FROM commits WHERE hash LIKE ${this.escapeValue(`${hash}%`)} LIMIT 1`);

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return new Commit({
      hash: row.hash,
      authorName: row.author_name,
      authorEmail: row.author_email,
      date: new Date(row.date),
      message: row.message,
      isMerge: row.is_merge,
    });
  }

  async getDatabaseStats(): Promise<DatabaseStats> {
    const commitCount = await this.getCommitCount();

    const fileChangeResult = await this.executeQuery<{ count: bigint }>(
      "SELECT COUNT(*) as count FROM file_changes"
    );
    const uniqueFilesResult = await this.executeQuery<{ count: bigint }>(
      "SELECT COUNT(DISTINCT file_path) as count FROM file_changes"
    );
    const dateRangeResult = await this.executeQuery<{ min_date: Date | null; max_date: Date | null }>(
      "SELECT MIN(date) as min_date, MAX(date) as max_date FROM commits"
    );

    return {
      totalCommits: commitCount,
      totalFileChanges: Number(fileChangeResult[0]?.count ?? 0),
      uniqueFilesTracked: Number(uniqueFilesResult[0]?.count ?? 0),
      dateRange: {
        minDate: dateRangeResult[0]?.min_date ? String(dateRangeResult[0].min_date) : null,
        maxDate: dateRangeResult[0]?.max_date ? String(dateRangeResult[0].max_date) : null,
      },
    };
  }

  async executeQuery<T>(sql: string): Promise<T[]> {
    if (!this.db) throw new Error("Database not initialized");
    return this.db.all(sql) as Promise<T[]>;
  }
}
