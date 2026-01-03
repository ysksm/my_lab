import { Database } from "duckdb-async";

export interface CommitRow {
  hash: string;
  author_name: string;
  author_email: string;
  date: string;
  message: string;
  is_merge: boolean;
}

export interface FileChangeRow {
  commit_hash: string;
  file_path: string;
  change_type: string;
  insertions: number;
  deletions: number;
}

export class GitDatabase {
  private db: Database | null = null;
  private dbPath: string;

  constructor(dbPath: string = "git_commits.duckdb") {
    this.dbPath = dbPath;
  }

  async init(): Promise<void> {
    this.db = await Database.create(this.dbPath);
    await this.createTables();
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    // コミットテーブル
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

    // ファイル変更テーブル (auto-increment用にSEQUENCEを使用)
    await this.db.run(`
      CREATE SEQUENCE IF NOT EXISTS file_changes_seq START 1
    `);

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

    // 親コミット関係テーブル（マージコミットの追跡用）
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS commit_parents (
        commit_hash VARCHAR,
        parent_hash VARCHAR,
        parent_order INTEGER,
        PRIMARY KEY (commit_hash, parent_hash)
      )
    `);

    // インデックス作成
    await this.db.run(
      `CREATE INDEX IF NOT EXISTS idx_file_changes_path ON file_changes(file_path)`
    );
    await this.db.run(
      `CREATE INDEX IF NOT EXISTS idx_file_changes_commit ON file_changes(commit_hash)`
    );
    await this.db.run(
      `CREATE INDEX IF NOT EXISTS idx_commits_date ON commits(date)`
    );
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
    // 文字列: シングルクォートをエスケープ
    const str = String(value).replace(/'/g, "''");
    return `'${str}'`;
  }

  async insertCommit(commit: CommitRow): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    // 既存のコミットを削除してから挿入（UPSERT代替）
    await this.db.run(
      `DELETE FROM commits WHERE hash = ${this.escapeValue(commit.hash)}`
    );

    await this.db.run(
      `INSERT INTO commits (hash, author_name, author_email, date, message, is_merge)
       VALUES (${this.escapeValue(commit.hash)}, ${this.escapeValue(commit.author_name)}, ${this.escapeValue(commit.author_email)}, ${this.escapeValue(commit.date)}, ${this.escapeValue(commit.message)}, ${this.escapeValue(commit.is_merge)})`
    );
  }

  async insertFileChange(change: FileChangeRow): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.run(
      `INSERT INTO file_changes (commit_hash, file_path, change_type, insertions, deletions)
       VALUES (${this.escapeValue(change.commit_hash)}, ${this.escapeValue(change.file_path)}, ${this.escapeValue(change.change_type)}, ${this.escapeValue(change.insertions)}, ${this.escapeValue(change.deletions)})`
    );
  }

  async insertCommitParent(
    commitHash: string,
    parentHash: string,
    order: number
  ): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    // 既存を削除してから挿入
    await this.db.run(
      `DELETE FROM commit_parents WHERE commit_hash = ${this.escapeValue(commitHash)} AND parent_hash = ${this.escapeValue(parentHash)}`
    );

    await this.db.run(
      `INSERT INTO commit_parents (commit_hash, parent_hash, parent_order)
       VALUES (${this.escapeValue(commitHash)}, ${this.escapeValue(parentHash)}, ${this.escapeValue(order)})`
    );
  }

  async query<T>(sql: string, ...params: unknown[]): Promise<T[]> {
    if (!this.db) throw new Error("Database not initialized");

    // パラメータを置換
    let processedSql = sql;
    for (let i = 0; i < params.length; i++) {
      processedSql = processedSql.replace("?", this.escapeValue(params[i]));
    }

    return this.db.all(processedSql) as Promise<T[]>;
  }

  async getCommitCount(): Promise<number> {
    const result = await this.query<{ count: bigint }>(
      "SELECT COUNT(*) as count FROM commits"
    );
    return Number(result[0]?.count ?? 0);
  }

  async commitExists(hash: string): Promise<boolean> {
    const result = await this.query<{ count: bigint }>(
      "SELECT COUNT(*) as count FROM commits WHERE hash = ?",
      hash
    );
    return Number(result[0]?.count ?? 0) > 0;
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}
