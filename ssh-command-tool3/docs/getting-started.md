# SSH Command Tool - Getting Started (Mac)

## 前提条件

- macOS
- [Bun](https://bun.sh/) v1.0以上
- [Docker](https://www.docker.com/products/docker-desktop/) (Jaeger連携を使用する場合)

## インストール

```bash
# リポジトリのクローン
cd /path/to/project

# 依存関係のインストール
bun install
```

## サーバー起動

### GUIサーバー

```bash
# GUIサーバーを起動
bun run gui

# または直接実行
bun run packages/gui/src/server.ts
```

起動後、ブラウザで http://localhost:3000 にアクセス

### CLIツール

```bash
# CLIツールを起動
bun run cli

# または直接実行
bun run packages/cli/src/index.ts
```

## Jaeger連携 (オプション)

### 1. Jaegerの起動

```bash
# docker-composeでJaegerを起動
docker-compose up -d

# ログの確認
docker-compose logs -f jaeger
```

### 2. Jaeger UIにアクセス

ブラウザで http://localhost:16686 を開く

### 3. SSH Command ToolでTelemetryを有効化

1. GUIの右パネルで「Jaeger Telemetry」セクションを見つける
2. Endpoint: `http://localhost:4318/v1/traces` (デフォルト)
3. 「Enable」ボタンをクリック

### 4. データの確認

1. SSH接続、Chrome起動、ナビゲーションなどの操作を行う
2. Jaeger UI (http://localhost:16686) で「ssh-command-tool」サービスを選択
3. 「Find Traces」をクリックしてトレースを確認

## 基本的な使い方

### 1. SSH接続

1. GUIの「SSH Connection」セクションで接続情報を入力
   - Host: リモートサーバーのIPアドレス
   - Username: ユーザー名
   - Password: パスワード
   - Port: 22 (デフォルト)
2. 「Connect」をクリック

### 2. Chrome起動

1. SSH接続後、「Start Chrome」をクリック
2. リモートサーバーでChromeが起動

### 3. ポートフォワーディング

1. 「Start Forward」をクリック
2. ローカルポートが自動的に割り当てられる

### 4. CDP接続

1. ターゲット一覧から接続したいページを選択
2. または「Auto Connect (Page)」をクリック

### 5. ページ操作

- **ナビゲーション**: URLを入力して「Go」をクリック
- **スクリーンショット**: 「Take Screenshot」をクリック
- **リロード**: 「Reload」をクリック

### 6. パフォーマンス計測

- **Network Recording**: 「Start」→ ページ操作 →「Stop」→「Save JSON」(HAR形式)
- **Performance Recording**: 「Start Recording」→ 操作 →「Stop」→「Save JSON」(Chrome Trace形式)
- **Performance Monitor**: 「Start Monitor」でリアルタイム表示

## ファイル構成

```
ssh-command-tool3/
├── packages/
│   ├── core/           # コアライブラリ
│   │   └── src/
│   │       ├── ssh.ts        # SSH接続
│   │       ├── cdp.ts        # CDP基本機能
│   │       ├── cdp-client.ts # CDPクライアント
│   │       ├── config.ts     # 設定管理
│   │       └── telemetry.ts  # Jaeger連携
│   ├── cli/            # CLIツール
│   └── gui/            # GUIサーバー
├── docs/               # ドキュメント
├── docker-compose.yml  # Jaeger設定
└── package.json
```

## 設定ファイル

設定は `~/.ssh-command-tool/config.json` に保存される

```json
{
  "connections": [
    {
      "name": "my-server",
      "host": "192.168.1.100",
      "port": 22,
      "username": "user",
      "password": "..."
    }
  ],
  "remoteDebug": {
    "remotePort": 9222,
    "localPort": 0,
    "remoteHost": "127.0.0.1",
    "userDataDir": "~/.remote-debug-profile",
    "headless": false
  },
  "lastConnection": "my-server"
}
```

## トラブルシューティング

### Bunがインストールされていない

```bash
# Bunのインストール
curl -fsSL https://bun.sh/install | bash
```

### ポート3000が使用中

```bash
# 使用中のプロセスを確認
lsof -i :3000

# プロセスを終了
kill -9 <PID>
```

### Jaegerに接続できない

```bash
# Jaegerコンテナの状態を確認
docker-compose ps

# 再起動
docker-compose restart jaeger
```

### SSH接続エラー

- ホスト名/IPアドレスが正しいか確認
- ポート22が開いているか確認
- パスワードが正しいか確認
- SSH鍵認証が必要な場合は未対応（パスワード認証のみ）

## 開発

### テストの実行

```bash
# ユニットテスト
bun test

# 統合テスト（実際のSSH接続が必要）
bun test packages/core/src/test/integration.test.ts
```

### ビルド

現在はビルドステップなしで直接実行可能（Bunのトランスパイル機能を使用）
