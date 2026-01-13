# Prometheus + Grafana セットアップガイド

SSH Command Toolのパフォーマンスメトリクスを可視化・監視するための設定ガイド。

## 概要

```
┌─────────────────┐     ┌────────────┐     ┌─────────┐
│ SSH Command Tool│────▶│ Prometheus │────▶│ Grafana │
│   :3000/metrics │     │   :9090    │     │  :3001  │
└─────────────────┘     └────────────┘     └─────────┘
```

- **Prometheus**: メトリクスを定期的に収集・保存
- **Grafana**: メトリクスをグラフ・ダッシュボードで可視化

## クイックスタート

### 1. Docker Composeで起動

```bash
cd ssh-command-tool3
docker-compose up -d
```

### 2. 各サービスにアクセス

| サービス | URL | 認証 |
|---------|-----|------|
| SSH Command Tool | http://localhost:3000 | なし |
| Prometheus | http://localhost:9090 | なし |
| Grafana | http://localhost:3001 | admin / admin |
| Jaeger | http://localhost:16686 | なし |

## Prometheus

### 基本操作

#### ターゲットの確認

1. http://localhost:9090 を開く
2. Status → Targets
3. `ssh-command-tool` が `UP` になっていることを確認

#### メトリクスのクエリ

1. http://localhost:9090/graph を開く
2. クエリ入力欄にメトリクス名を入力
3. 「Execute」をクリック

### 利用可能なメトリクス

#### 接続状態

| メトリクス | 説明 | 値 |
|-----------|------|-----|
| `ssh_connected` | SSH接続状態 | 0=切断, 1=接続 |
| `cdp_connected` | CDP接続状態 | 0=切断, 1=接続 |
| `chrome_running` | Chrome実行状態 | 0=停止, 1=実行中 |
| `port_forward_active` | ポートフォワード状態 | 0=無効, 1=有効 |

#### メモリ

| メトリクス | 説明 | 単位 |
|-----------|------|------|
| `browser_js_heap_used_bytes` | JSヒープ使用量 | bytes |
| `browser_js_heap_total_bytes` | JSヒープ合計 | bytes |

#### DOM

| メトリクス | 説明 |
|-----------|------|
| `browser_dom_nodes` | DOMノード数 |
| `browser_documents` | ドキュメント数 |
| `browser_frames` | フレーム数 |
| `browser_event_listeners` | イベントリスナー数 |

#### パフォーマンス (カウンター)

| メトリクス | 説明 |
|-----------|------|
| `browser_layout_count_total` | レイアウト操作の累計 |
| `browser_style_recalc_count_total` | スタイル再計算の累計 |
| `browser_task_duration_seconds` | タスク実行時間の累計 |
| `browser_script_duration_seconds` | スクリプト実行時間の累計 |
| `browser_layout_duration_seconds` | レイアウト処理時間の累計 |

### よく使うクエリ例

```promql
# JSヒープ使用量 (MB)
browser_js_heap_used_bytes / 1024 / 1024

# ヒープ使用率
browser_js_heap_used_bytes / browser_js_heap_total_bytes * 100

# 1分あたりのレイアウト回数
rate(browser_layout_count_total[1m]) * 60

# CPU使用率 (過去30秒の平均)
rate(browser_task_duration_seconds[30s]) * 100

# スタイル再計算の増加率
rate(browser_style_recalc_count_total[1m])
```

## Grafana

### 初回ログイン

1. http://localhost:3001 を開く
2. Username: `admin`
3. Password: `admin`
4. パスワード変更を求められたら、新しいパスワードを設定（またはSkip）

### ダッシュボードの確認

1. 左メニュー → Dashboards
2. 「Browser Performance」を選択

### プリセットダッシュボード

`Browser Performance` ダッシュボードには以下のパネルが含まれます:

| パネル | 内容 |
|--------|------|
| SSH Connection | SSH接続状態 |
| CDP Connection | CDP接続状態 |
| Chrome Browser | Chrome実行状態 |
| JavaScript Heap | JSヒープの使用量/合計の推移 |
| DOM Metrics | DOMノード数、イベントリスナー数の推移 |
| Layout & Style Operations | レイアウト/スタイル操作の頻度 |
| CPU Time Breakdown | CPU時間の内訳 |

### カスタムダッシュボードの作成

1. 左メニュー → Dashboards → New → New Dashboard
2. 「Add visualization」をクリック
3. データソースで「Prometheus」を選択
4. クエリを入力してグラフを作成

### アラートの設定

1. ダッシュボードのパネルを編集
2. 「Alert」タブを選択
3. 条件を設定（例: JSヒープが100MB超えたら通知）
4. 通知先を設定（Slack, Email等）

## 設定ファイル

### prometheus.yml

```yaml
global:
  scrape_interval: 5s      # メトリクス収集間隔
  evaluation_interval: 5s

scrape_configs:
  - job_name: 'ssh-command-tool'
    static_configs:
      - targets: ['host.docker.internal:3000']
    metrics_path: '/metrics'
```

### docker-compose.yml (抜粋)

```yaml
prometheus:
  image: prom/prometheus:v2.48.0
  ports:
    - "9090:9090"
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml

grafana:
  image: grafana/grafana:10.2.0
  ports:
    - "3001:3000"
  environment:
    - GF_SECURITY_ADMIN_USER=admin
    - GF_SECURITY_ADMIN_PASSWORD=admin
```

## 運用

### サービスの起動/停止

```bash
# 全サービス起動
docker-compose up -d

# 特定サービスのみ起動
docker-compose up -d prometheus grafana

# 停止
docker-compose down

# ログ確認
docker-compose logs -f prometheus
docker-compose logs -f grafana
```

### データの永続化

docker-compose.ymlでボリュームが設定されているため、コンテナを再起動してもデータは保持されます。

```yaml
volumes:
  prometheus-data:
  grafana-data:
```

### データの削除

```bash
# コンテナとボリュームを削除
docker-compose down -v
```

## トラブルシューティング

### Prometheusでターゲットがdownになる

1. SSH Command Toolが起動しているか確認
   ```bash
   curl http://localhost:3000/metrics
   ```

2. ファイアウォール設定を確認

3. Docker内からアクセスできるか確認
   ```bash
   docker exec prometheus wget -qO- http://host.docker.internal:3000/metrics
   ```

### Grafanaでデータが表示されない

1. データソースの設定を確認
   - Configuration → Data Sources → Prometheus
   - URL: `http://prometheus:9090`

2. Performance Monitorが起動しているか確認
   - SSH Command Tool GUIで「Start Monitor」をクリック

### メトリクスが更新されない

1. Performance Monitorが動作中か確認
2. Prometheusのスクレイプ間隔を確認（デフォルト5秒）
3. Grafanaのリフレッシュ間隔を確認（ダッシュボード右上）

## 参考リンク

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [PromQL クエリ言語](https://prometheus.io/docs/prometheus/latest/querying/basics/)
