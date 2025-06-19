#!/bin/bash

echo "Building Single Executable Application..."

# 1. フロントエンドがビルドされているか確認
if [ ! -d "../web-frontend/dist" ]; then
  echo "Error: Frontend not built. Please run 'npm run build' in web-frontend first."
  exit 1
fi

# 2. SEA blob を生成
echo "Generating SEA blob..."
node --experimental-sea-config sea-config.json

# 3. node 実行ファイルをコピー
echo "Copying node executable..."
cp $(command -v node) web-app

# 4. SEA blob を注入
echo "Injecting application into executable..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  npx postject web-app NODE_SEA_BLOB web-app.blob \
    --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 \
    --macho-segment-name NODE_SEA
else
  # Linux
  npx postject web-app NODE_SEA_BLOB web-app.blob \
    --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
fi

# 5. 実行権限を付与
chmod +x web-app

echo "Build complete! Run ./web-app to start the server."