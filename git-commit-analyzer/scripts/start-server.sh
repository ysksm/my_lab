#!/bin/bash
# バックエンドサーバーの起動

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# デフォルト設定
PORT="${PORT:-3000}"
DB_PATH="${DB_PATH:-$ROOT_DIR/git_commits.duckdb}"

echo "=== Starting Git Commit Analyzer API Server ==="
echo "Port: $PORT"
echo "Database: $DB_PATH"
echo ""

cd "$ROOT_DIR/packages/web-backend"
PORT="$PORT" DB_PATH="$DB_PATH" bun run src/index.ts
