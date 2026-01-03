#!/bin/bash
# Gitリポジトリのインポート

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

REPO_PATH="${1:-.}"
DB_PATH="${DB_PATH:-$ROOT_DIR/git_commits.duckdb}"

# 相対パスを絶対パスに変換
if [[ ! "$REPO_PATH" = /* ]]; then
  REPO_PATH="$(cd "$REPO_PATH" 2>/dev/null && pwd)"
fi

echo "=== Importing Git Repository ==="
echo "Repository: $REPO_PATH"
echo "Database: $DB_PATH"
echo ""

cd "$ROOT_DIR/packages/cli"
bun run src/index.ts import "$REPO_PATH" --db="$DB_PATH"
