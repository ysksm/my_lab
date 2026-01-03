# Git Commit Analyzer

ローカルのGitコミット履歴をDuckDBにデータベース化し、不具合解析や不具合予測に活用するためのツール。

## 特徴

- **ホットスポット分析** - 頻繁に変更されるファイルを特定（不具合が発生しやすい場所）
- **不具合リスク予測** - 変更頻度、コードチャーン、バグ修正履歴などから不具合リスクスコアを算出
- **ファイル結合度分析** - 一緒に変更されることが多いファイルペアを特定（変更波及の予測）
- **ファイル履歴検索** - 特定ファイルの全変更履歴から原因コミットを特定
- **カスタムSQLクエリ** - DuckDBに直接SQLを実行して独自の分析

## アーキテクチャ

DDDレイヤードアーキテクチャを採用したモノレポ構成:

```
packages/
├── core/                      # コアロジック（DDD）
│   └── src/
│       ├── domain/            # ドメイン層
│       │   ├── entities/      # Commit, FileChange
│       │   ├── repositories/  # リポジトリインターフェース
│       │   └── value-objects/ # 分析結果の型定義
│       ├── application/       # アプリケーション層
│       │   └── use-cases/     # ImportCommits, AnalyzeCommits
│       └── infrastructure/    # インフラ層
│           └── repositories/  # DuckDB, SimpleGit実装
├── cli/                       # CLIアプリケーション
├── web-backend/               # REST APIサーバー（Bun）
└── web-frontend/              # Webダッシュボード（Angular）
```

## セットアップ

### 依存関係のインストール

```bash
# ルートでbunをインストール
bun install

# Angularフロントエンド
cd packages/web-frontend
npm install
```

## 使い方

### CLI

```bash
cd packages/cli

# リポジトリをインポート
bun run src/index.ts import /path/to/repo

# ホットスポット分析
bun run src/index.ts hotspots --limit=20

# 不具合リスク予測
bun run src/index.ts risk --limit=20

# ファイル履歴検索
bun run src/index.ts history src/main.ts

# 結合度分析
bun run src/index.ts coupled --min=3

# 作者別統計
bun run src/index.ts authors

# カスタムSQLクエリ
bun run src/index.ts query "SELECT * FROM commits LIMIT 10"

# データベース統計
bun run src/index.ts stats

# ヘルプ
bun run src/index.ts --help
```

### Web API サーバー

```bash
cd packages/web-backend

# サーバー起動（デフォルト: http://localhost:3000）
bun run src/index.ts

# 環境変数でカスタマイズ
PORT=8080 DB_PATH=./my_db.duckdb bun run src/index.ts
```

**APIエンドポイント:**

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/stats` | データベース統計 |
| GET | `/api/hotspots?limit=N` | ホットスポット |
| GET | `/api/risk?limit=N` | 不具合リスク予測 |
| GET | `/api/bugfixes?limit=N` | バグ修正コミット |
| GET | `/api/history?file=PATH` | ファイル履歴 |
| GET | `/api/coupled?min=N` | 結合度分析 |
| GET | `/api/authors` | 作者別統計 |
| GET | `/api/churn?min=N` | コードチャーン |
| GET | `/api/commit?hash=HASH` | コミット詳細 |
| POST | `/api/import` | リポジトリインポート |
| POST | `/api/query` | カスタムSQLクエリ |

### Web フロントエンド（Angular）

```bash
cd packages/web-frontend

# 開発サーバー起動（http://localhost:4200）
npm start

# ビルド
npm run build
```

**画面:**
- **Dashboard** - 統計情報の概要
- **Hotspots** - 頻繁に変更されるファイル一覧
- **Risk Analysis** - 不具合リスクスコアランキング
- **File History** - ファイルの変更履歴検索
- **Coupled Files** - 一緒に変更されるファイルペア
- **Authors** - 作者別の統計情報

## データベーススキーマ

| テーブル | 説明 |
|---------|------|
| `commits` | コミット情報（hash, author, date, message） |
| `file_changes` | ファイル変更（insertions, deletions, change_type） |
| `commit_parents` | 親コミット関係（マージ追跡用） |

## 技術スタック

- **Runtime**: Bun
- **Database**: DuckDB
- **Git操作**: simple-git
- **Frontend**: Angular 21
- **Backend**: Bun native server

## ライセンス

MIT
