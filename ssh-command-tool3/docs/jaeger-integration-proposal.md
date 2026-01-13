# Jaeger連携提案書

## 概要

SSH Command ToolのパフォーマンスデータをJaeger（分散トレーシングシステム）と連携し、ブラウザパフォーマンスの可視化・分析を強化する提案。

## Jaegerとは

Jaegerは、Uberが開発したオープンソースの分散トレーシングプラットフォーム。

**主な機能**:
- 分散トランザクションの監視
- パフォーマンスボトルネックの特定
- サービス依存関係の分析
- 根本原因分析

**データモデル**:
```
Trace
  └── Span (操作の単位)
        ├── operationName
        ├── startTime / duration
        ├── tags (key-value metadata)
        ├── logs (timestamped events)
        └── references (親子関係)
```

## 連携のメリット

| メリット | 説明 |
|---------|------|
| 統一的な可視化 | 複数のリモートデバッグセッションを一元管理 |
| 時系列分析 | パフォーマンスの経時変化を追跡 |
| 比較分析 | 異なるセッション間のパフォーマンス比較 |
| アラート連携 | 閾値超過時の通知（Prometheus/Grafana経由） |
| チーム共有 | パフォーマンスデータをチームで共有・レビュー |

## データマッピング設計

### 1. Trace構造

```
Trace: "Browser Session"
├── Span: "Page Navigation" (url, loadTime)
│     ├── Span: "Network Request" (url, status, duration)
│     ├── Span: "Network Request" ...
│     └── Span: "DOM Content Loaded"
├── Span: "User Interaction" (type, target)
├── Span: "Performance Sample"
│     └── Logs: metrics (CPU, heap, layouts...)
└── Span: "Screenshot Capture"
```

### 2. SSH Command Tool データ → Jaeger Span マッピング

#### ページナビゲーション
```javascript
{
  operationName: "page.navigate",
  tags: {
    "http.url": "https://example.com",
    "page.title": "Example Page",
    "browser.name": "Chromium"
  },
  logs: [
    { timestamp: t1, event: "navigationStart" },
    { timestamp: t2, event: "domContentLoaded" },
    { timestamp: t3, event: "load" }
  ]
}
```

#### ネットワークリクエスト
```javascript
{
  operationName: "http.request",
  tags: {
    "http.method": "GET",
    "http.url": "https://api.example.com/data",
    "http.status_code": 200,
    "http.response_content_length": 1024,
    "resource.type": "xhr"
  },
  duration: 150 // ms
}
```

#### パフォーマンスメトリクス
```javascript
{
  operationName: "performance.sample",
  tags: {
    "js.heap.used": 15728640,
    "js.heap.total": 33554432,
    "dom.nodes": 1500,
    "dom.documents": 1,
    "layout.count": 5,
    "style.recalc_count": 12
  }
}
```

## 実装案

### 案1: OpenTelemetry SDK経由（推奨）

OpenTelemetryは業界標準のテレメトリ収集フレームワーク。Jaegerはネイティブサポート。

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────┐
│ SSH Command Tool│────▶│ OpenTelemetry SDK│────▶│ Jaeger  │
│   (CDP Data)    │     │   (OTLP Export)  │     │ Collector│
└─────────────────┘     └──────────────────┘     └─────────┘
```

**メリット**:
- 標準プロトコル（OTLP）
- 他のバックエンド（Zipkin, Tempo等）への切り替えが容易
- 豊富なエコシステム

**実装例**:
```typescript
// packages/core/src/telemetry.ts
import { trace, SpanKind } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const tracer = trace.getTracer('ssh-command-tool');

export function traceNavigation(url: string, timing: NavigationTiming) {
  const span = tracer.startSpan('page.navigate', {
    kind: SpanKind.CLIENT,
    attributes: {
      'http.url': url,
    }
  });

  span.addEvent('domContentLoaded', timing.domContentLoaded);
  span.addEvent('load', timing.loadEventEnd);
  span.end();
}
```

### 案2: Jaeger Client直接連携

Jaegerのネイティブクライアントを使用。

```
┌─────────────────┐     ┌─────────────────┐
│ SSH Command Tool│────▶│ Jaeger Agent    │
│  (jaeger-client)│     │ (UDP 6831)      │
└─────────────────┘     └─────────────────┘
```

**メリット**:
- シンプルな構成
- 低レイテンシ（UDP）

**デメリット**:
- Jaeger専用（ベンダーロックイン）

### 案3: HTTP API直接送信

JaegerのHTTP APIに直接データを送信。

```typescript
// packages/core/src/jaeger-exporter.ts
export class JaegerExporter {
  constructor(private endpoint: string) {}

  async exportTrace(spans: Span[]) {
    const batch = {
      process: {
        serviceName: 'ssh-command-tool',
        tags: [
          { key: 'browser', value: 'chromium' }
        ]
      },
      spans: spans.map(this.convertSpan)
    };

    await fetch(`${this.endpoint}/api/traces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch)
    });
  }
}
```

**メリット**:
- 依存関係が少ない
- カスタマイズ性が高い

**デメリット**:
- 自前でプロトコル実装が必要

## 推奨アーキテクチャ

```
┌──────────────────────────────────────────────────────────────┐
│                    SSH Command Tool                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │  CDP Client │───▶│ Telemetry   │───▶│ OpenTelemetry   │  │
│  │  (existing) │    │ Collector   │    │ SDK             │  │
│  └─────────────┘    └─────────────┘    └────────┬────────┘  │
│                                                  │           │
└──────────────────────────────────────────────────│───────────┘
                                                   │
                                         OTLP/HTTP │
                                                   ▼
┌──────────────────────────────────────────────────────────────┐
│                    Observability Stack                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │   Jaeger    │    │ Prometheus  │    │    Grafana      │  │
│  │  Collector  │    │  (metrics)  │    │  (dashboard)    │  │
│  └─────────────┘    └─────────────┘    └─────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## 実装計画

### Phase 1: 基盤構築

| タスク | 詳細 |
|-------|------|
| OpenTelemetry SDK導入 | `@opentelemetry/sdk-node` パッケージ追加 |
| Tracer初期化 | アプリケーション起動時にTracer設定 |
| 基本Span生成 | ページナビゲーションのSpan作成 |

### Phase 2: データ連携

| タスク | 詳細 |
|-------|------|
| ネットワークリクエストSpan | Network.requestWillBeSent → Span変換 |
| パフォーマンスメトリクスSpan | Performance.getMetrics → Span/Logs変換 |
| エラーイベント | エラー発生時のSpan記録 |

### Phase 3: 高度な機能

| タスク | 詳細 |
|-------|------|
| サンプリング設定 | 大量データ時のサンプリング戦略 |
| コンテキスト伝播 | 複数ページ間のトレース連携 |
| カスタムダッシュボード | Grafanaダッシュボード作成 |

## 設定例

### Jaeger起動（Docker Compose）

```yaml
# docker-compose.yml
version: '3'
services:
  jaeger:
    image: jaegertracing/all-in-one:1.50
    ports:
      - "16686:16686"  # UI
      - "4318:4318"    # OTLP HTTP
      - "14268:14268"  # Jaeger HTTP
    environment:
      - COLLECTOR_OTLP_ENABLED=true
```

### SSH Command Tool設定

```json
// ~/.ssh-command-tool/config.json
{
  "telemetry": {
    "enabled": true,
    "exporter": "otlp",
    "endpoint": "http://localhost:4318/v1/traces",
    "serviceName": "ssh-command-tool",
    "sampleRate": 1.0
  }
}
```

## API設計案

### TelemetryService

```typescript
// packages/core/src/telemetry.ts
export interface TelemetryConfig {
  enabled: boolean;
  exporter: 'otlp' | 'jaeger' | 'console';
  endpoint: string;
  serviceName: string;
  sampleRate: number;
}

export class TelemetryService {
  private tracer: Tracer;

  constructor(config: TelemetryConfig) { }

  // ページナビゲーションのトレース
  traceNavigation(url: string): Span { }

  // ネットワークリクエストのトレース
  traceNetworkRequest(request: NetworkRequest): Span { }

  // パフォーマンスサンプルの記録
  recordPerformanceSample(metrics: PerformanceMetric[]): void { }

  // スクリーンショットイベントの記録
  recordScreenshot(timestamp: number, size: number): void { }

  // セッション終了時のフラッシュ
  async flush(): Promise<void> { }
}
```

### GUI連携

```typescript
// GUI APIエンドポイント追加
const apiHandlers = {
  // ...existing handlers...

  "telemetry/enable": async (body) => {
    await telemetry.enable(body.config);
    return { success: true };
  },

  "telemetry/disable": async () => {
    await telemetry.disable();
    return { success: true };
  },

  "telemetry/status": async () => {
    return { enabled: telemetry.isEnabled, config: telemetry.config };
  }
};
```

## 必要パッケージ

```json
{
  "dependencies": {
    "@opentelemetry/api": "^1.7.0",
    "@opentelemetry/sdk-node": "^0.45.0",
    "@opentelemetry/exporter-trace-otlp-http": "^0.45.0",
    "@opentelemetry/resources": "^1.18.0",
    "@opentelemetry/semantic-conventions": "^1.18.0"
  }
}
```

## 想定される課題と対策

| 課題 | 対策 |
|------|------|
| データ量が多い | サンプリングレート調整、バッチ送信 |
| ネットワーク遅延 | 非同期エクスポート、ローカルバッファリング |
| Jaeger未起動時 | フォールバック（ローカル保存 or 無視） |
| 機密データ | URLパラメータのマスキング、除外設定 |

## まとめ

OpenTelemetry SDKを使用したJaeger連携を推奨。

**理由**:
1. 業界標準プロトコル
2. 将来的な拡張性（他のバックエンドへの切り替え）
3. 豊富なドキュメントとコミュニティサポート
4. Bun/Node.js環境での実績

**次のステップ**:
1. OpenTelemetry SDKの動作検証
2. 最小限のSpan生成実装
3. ローカルJaeger環境での動作確認
