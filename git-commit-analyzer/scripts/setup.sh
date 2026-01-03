#!/bin/bash
# 依存関係のインストール

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Git Commit Analyzer Setup ==="
echo ""

# ルートの依存関係
echo "[1/4] Installing root dependencies..."
cd "$ROOT_DIR"
bun install

# Core
echo "[2/4] Installing core dependencies..."
cd "$ROOT_DIR/packages/core"
bun install

# CLI
echo "[3/4] Installing CLI dependencies..."
cd "$ROOT_DIR/packages/cli"
bun install

# Web Backend
echo "[4/4] Installing web-backend dependencies..."
cd "$ROOT_DIR/packages/web-backend"
bun install

# Web Frontend (npm)
echo "[5/5] Installing web-frontend dependencies..."
cd "$ROOT_DIR/packages/web-frontend"
npm install

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Import a repository:  ./scripts/import.sh /path/to/repo"
echo "  2. Start the server:     ./scripts/start-server.sh"
echo "  3. Start the frontend:   ./scripts/start-frontend.sh"
echo "  4. Use CLI:              ./scripts/cli.sh stats"
