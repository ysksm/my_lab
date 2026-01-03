#!/bin/bash
# Angularフロントエンドの起動

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Starting Git Commit Analyzer Frontend ==="
echo "URL: http://localhost:4200"
echo ""
echo "Note: Make sure the API server is running on port 3000"
echo ""

cd "$ROOT_DIR/packages/web-frontend"
npm start
