# Jaeger バイナリ版セットアップガイド

Dockerを使わずにJaegerバイナリを直接ダウンロードして使用する方法。

## v1 vs v2 の主な違い

| 項目 | v1.x | v2.x |
|------|------|------|
| アーキテクチャ | 独自実装 | OpenTelemetry Collector ベース |
| バイナリ名 | `jaeger-all-in-one` | `jaeger` |
| 設定方式 | コマンドライン引数 | YAML設定ファイル |
| OTLP | オプション (`--collector.otlp.enabled`) | デフォルトで有効 |
| 設定の柔軟性 | 限定的 | OTel Collector の全機能が利用可能 |

**v2を推奨**: OpenTelemetryとの親和性が高く、OTLPがデフォルトで有効。

---

## Jaeger v2 セットアップ

### ダウンロード

#### Mac (Apple Silicon)

```bash
curl -LO https://github.com/jaegertracing/jaeger/releases/download/v2.1.0/jaeger-2.1.0-darwin-arm64.tar.gz
tar -xzf jaeger-2.1.0-darwin-arm64.tar.gz
cd jaeger-2.1.0-darwin-arm64
```

#### Mac (Intel)

```bash
curl -LO https://github.com/jaegertracing/jaeger/releases/download/v2.1.0/jaeger-2.1.0-darwin-amd64.tar.gz
tar -xzf jaeger-2.1.0-darwin-amd64.tar.gz
cd jaeger-2.1.0-darwin-amd64
```

#### Linux (x64)

```bash
curl -LO https://github.com/jaegertracing/jaeger/releases/download/v2.1.0/jaeger-2.1.0-linux-amd64.tar.gz
tar -xzf jaeger-2.1.0-linux-amd64.tar.gz
cd jaeger-2.1.0-linux-amd64
```

### 起動方法

v2では設定ファイル（YAML）を使用:

```bash
# デフォルト設定で起動
./jaeger
```

v2はデフォルトでOTLP HTTP (4318) と OTLP gRPC (4317) が有効。

### ポート一覧 (v2)

| ポート | プロトコル | 用途 |
|--------|-----------|------|
| 16686 | HTTP | Jaeger UI |
| 4317 | gRPC | OTLP gRPC |
| 4318 | HTTP | OTLP HTTP (**SSH Command Toolで使用**) |
| 16685 | gRPC | Jaeger gRPC Query |

### カスタム設定ファイル

`config.yaml` を作成:

```yaml
service:
  extensions: [jaeger_storage, jaeger_query]
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [jaeger_storage_exporter]

extensions:
  jaeger_storage:
    backends:
      memory:
        memory:
          max_traces: 100000
  jaeger_query:
    storage:
      traces: memory
    ui:
      config_file: ""

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:

exporters:
  jaeger_storage_exporter:
    trace_storage: memory
```

設定ファイルを指定して起動:

```bash
./jaeger --config config.yaml
```

### バックグラウンド起動

```bash
# Mac/Linux
./jaeger > jaeger.log 2>&1 &

# プロセス確認
ps aux | grep jaeger

# 停止
pkill jaeger
```

---

## SSH Command Tool との連携

### 1. Jaeger v2 起動

```bash
./jaeger
```

### 2. SSH Command Tool GUI起動

```bash
bun run gui
```

### 3. Telemetry有効化

1. http://localhost:3000 を開く
2. 右パネルの「Jaeger Telemetry」セクション
3. Endpoint: `http://localhost:4318/v1/traces` (デフォルト)
4. 「Enable」をクリック

### 4. Jaeger UIで確認

1. http://localhost:16686 を開く
2. 「Service」で `ssh-command-tool` を選択
3. 「Find Traces」をクリック

---

## Jaeger v1 セットアップ（参考）

v1を使用する場合:

### ダウンロード

```bash
# Mac (Apple Silicon)
curl -LO https://github.com/jaegertracing/jaeger/releases/download/v1.64.0/jaeger-1.64.0-darwin-arm64.tar.gz
tar -xzf jaeger-1.64.0-darwin-arm64.tar.gz
cd jaeger-1.64.0-darwin-arm64
```

### 起動

```bash
# OTLP有効化が必要
./jaeger-all-in-one --collector.otlp.enabled=true
```

### 永続化（Badger）

```bash
./jaeger-all-in-one \
  --collector.otlp.enabled=true \
  --badger.ephemeral=false \
  --badger.directory-key=/tmp/jaeger/key \
  --badger.directory-value=/tmp/jaeger/value
```

---

## トラブルシューティング

### ポートが使用中

```bash
lsof -i :16686
lsof -i :4318
kill -9 <PID>
```

### Macのセキュリティ警告

```bash
xattr -d com.apple.quarantine ./jaeger
```

または「システム設定」→「プライバシーとセキュリティ」で許可。

### UIにトレースが表示されない

1. SSH Command Tool側でTelemetryが「Enabled」か確認
2. 何か操作（ナビゲーションなど）を実行
3. 「Flush」ボタンをクリック
4. Jaeger UIでサービス名 `ssh-command-tool` を選択

### v2でOTLPが動かない場合

デフォルト設定を確認:

```bash
./jaeger --help
```

設定ファイルを明示的に指定して起動。

---

## PATH に追加（オプション）

```bash
# ~/.zshrc に追加
export PATH="$PATH:/path/to/jaeger-2.1.0-darwin-arm64"
source ~/.zshrc
```

## 参考リンク

- [Jaeger Releases](https://github.com/jaegertracing/jaeger/releases)
- [Jaeger v2 Migration Guide](https://www.jaegertracing.io/docs/2.0/migration/)
- [Jaeger v2 Configuration](https://www.jaegertracing.io/docs/2.0/configuration/)
- [OpenTelemetry Collector Configuration](https://opentelemetry.io/docs/collector/configuration/)
