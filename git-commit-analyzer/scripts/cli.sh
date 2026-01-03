#!/bin/bash
# CLI コマンド実行ヘルパー

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

DB_PATH="${DB_PATH:-$ROOT_DIR/git_commits.duckdb}"

if [ $# -eq 0 ]; then
  echo "Usage: ./scripts/cli.sh <command> [options]"
  echo ""
  echo "Commands:"
  echo "  stats                    - Database statistics"
  echo "  hotspots [--limit=N]     - Frequently changed files"
  echo "  risk [--limit=N]         - Bug risk prediction"
  echo "  bugfixes [--limit=N]     - Bug fix commits"
  echo "  history <file-path>      - File change history"
  echo "  coupled [--min=N]        - Coupled files"
  echo "  authors                  - Author statistics"
  echo "  churn [--min=N]          - High churn files"
  echo "  commit <hash>            - Commit details"
  echo "  query <sql>              - Custom SQL query"
  echo ""
  echo "Examples:"
  echo "  ./scripts/cli.sh stats"
  echo "  ./scripts/cli.sh hotspots --limit=10"
  echo "  ./scripts/cli.sh risk --limit=20"
  echo "  ./scripts/cli.sh history src/main.ts"
  exit 0
fi

cd "$ROOT_DIR/packages/cli"
bun run src/index.ts "$@" --db="$DB_PATH"
