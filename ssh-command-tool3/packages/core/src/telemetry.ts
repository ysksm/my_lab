import {
  trace,
  context,
  SpanKind,
  SpanStatusCode,
  type Tracer,
  type Span,
  type Context,
} from "@opentelemetry/api";
import {
  BasicTracerProvider,
  BatchSpanProcessor,
  ConsoleSpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import type { NetworkRequest, PerformanceMetric } from "./cdp-client";

export interface TelemetryConfig {
  enabled: boolean;
  exporter: "otlp" | "console" | "none";
  endpoint: string;
  serviceName: string;
  sampleRate: number;
}

const DEFAULT_CONFIG: TelemetryConfig = {
  enabled: false,
  exporter: "otlp",
  endpoint: "http://localhost:4318/v1/traces",
  serviceName: "ssh-command-tool",
  sampleRate: 1.0,
};

export class TelemetryService {
  private config: TelemetryConfig;
  private provider: BasicTracerProvider | null = null;
  private tracer: Tracer | null = null;
  private activeSpans: Map<string, Span> = new Map();
  private sessionSpan: Span | null = null;
  private sessionContext: Context | null = null;

  constructor(config: Partial<TelemetryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  get isEnabled(): boolean {
    return this.config.enabled && this.tracer !== null;
  }

  getConfig(): TelemetryConfig {
    return { ...this.config };
  }

  async enable(config?: Partial<TelemetryConfig>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.config.enabled = true;

    // Create resource
    const resource = new Resource({
      [ATTR_SERVICE_NAME]: this.config.serviceName,
      [ATTR_SERVICE_VERSION]: "0.1.0",
    });

    // Create provider
    this.provider = new BasicTracerProvider({
      resource,
    });

    // Configure exporter based on config
    if (this.config.exporter === "otlp") {
      const exporter = new OTLPTraceExporter({
        url: this.config.endpoint,
      });
      this.provider.addSpanProcessor(new BatchSpanProcessor(exporter));
    } else if (this.config.exporter === "console") {
      this.provider.addSpanProcessor(new BatchSpanProcessor(new ConsoleSpanExporter()));
    }

    // Register provider
    this.provider.register();

    // Get tracer
    this.tracer = trace.getTracer(this.config.serviceName, "0.1.0");

    console.log(`Telemetry enabled: ${this.config.exporter} -> ${this.config.endpoint}`);
  }

  async disable(): Promise<void> {
    this.config.enabled = false;

    // End any active spans
    this.endSession();

    // Shutdown provider
    if (this.provider) {
      await this.provider.shutdown();
      this.provider = null;
    }

    this.tracer = null;
    console.log("Telemetry disabled");
  }

  // Start a browser session trace
  startSession(connectionInfo?: { host: string; username: string }): void {
    if (!this.tracer) return;

    this.sessionSpan = this.tracer.startSpan("browser.session", {
      kind: SpanKind.CLIENT,
      attributes: {
        "session.start_time": new Date().toISOString(),
        ...(connectionInfo && {
          "ssh.host": connectionInfo.host,
          "ssh.username": connectionInfo.username,
        }),
      },
    });

    this.sessionContext = trace.setSpan(context.active(), this.sessionSpan);
  }

  endSession(): void {
    // End all active spans
    for (const [id, span] of this.activeSpans) {
      span.end();
    }
    this.activeSpans.clear();

    // End session span
    if (this.sessionSpan) {
      this.sessionSpan.end();
      this.sessionSpan = null;
      this.sessionContext = null;
    }
  }

  // Trace page navigation
  traceNavigation(url: string): string {
    if (!this.tracer) return "";

    const spanId = `nav-${Date.now()}`;
    const ctx = this.sessionContext || context.active();

    const span = this.tracer.startSpan(
      "page.navigate",
      {
        kind: SpanKind.CLIENT,
        attributes: {
          "http.url": url,
          "navigation.start_time": new Date().toISOString(),
        },
      },
      ctx
    );

    this.activeSpans.set(spanId, span);
    return spanId;
  }

  // Complete navigation with timing info
  completeNavigation(spanId: string, result: { frameId?: string; error?: string }): void {
    const span = this.activeSpans.get(spanId);
    if (!span) return;

    if (result.error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: result.error });
    } else {
      span.setStatus({ code: SpanStatusCode.OK });
      if (result.frameId) {
        span.setAttribute("page.frame_id", result.frameId);
      }
    }

    span.end();
    this.activeSpans.delete(spanId);
  }

  // Trace network request
  traceNetworkRequest(request: NetworkRequest): void {
    if (!this.tracer) return;

    const ctx = this.sessionContext || context.active();

    const span = this.tracer.startSpan(
      "http.request",
      {
        kind: SpanKind.CLIENT,
        attributes: {
          "http.method": request.method,
          "http.url": request.url,
          "http.request_id": request.requestId,
          ...(request.type && { "http.resource_type": request.type }),
        },
      },
      ctx
    );

    // If response is already available, complete the span
    if (request.response) {
      span.setAttribute("http.status_code", request.response.status);
      span.setAttribute("http.status_text", request.response.statusText);
      if (request.response.mimeType) {
        span.setAttribute("http.mime_type", request.response.mimeType);
      }
      if (request.encodedDataLength) {
        span.setAttribute("http.response_content_length", request.encodedDataLength);
      }

      // Set status based on HTTP status code
      if (request.response.status >= 400) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: request.response.statusText });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }
    }

    // Calculate duration if timing is available
    if (request.timing?.receiveHeadersEnd) {
      // Duration is already calculated in timing
    }

    span.end();
  }

  // Record batch of network requests
  traceNetworkRequests(requests: NetworkRequest[]): void {
    for (const request of requests) {
      this.traceNetworkRequest(request);
    }
  }

  // Record performance metrics as span with logs
  recordPerformanceMetrics(metrics: PerformanceMetric[]): void {
    if (!this.tracer) return;

    const ctx = this.sessionContext || context.active();

    const span = this.tracer.startSpan(
      "performance.sample",
      {
        kind: SpanKind.INTERNAL,
        attributes: {
          "sample.timestamp": new Date().toISOString(),
        },
      },
      ctx
    );

    // Add metrics as attributes
    for (const metric of metrics) {
      const attrName = `perf.${metric.name.toLowerCase()}`;
      span.setAttribute(attrName, metric.value);
    }

    // Extract key metrics for easier querying
    const jsHeapUsed = metrics.find(m => m.name === "JSHeapUsedSize")?.value;
    const jsHeapTotal = metrics.find(m => m.name === "JSHeapTotalSize")?.value;
    const nodes = metrics.find(m => m.name === "Nodes")?.value;
    const layoutCount = metrics.find(m => m.name === "LayoutCount")?.value;

    if (jsHeapUsed !== undefined) {
      span.setAttribute("js.heap.used_bytes", jsHeapUsed);
      span.setAttribute("js.heap.used_mb", jsHeapUsed / (1024 * 1024));
    }
    if (jsHeapTotal !== undefined) {
      span.setAttribute("js.heap.total_bytes", jsHeapTotal);
    }
    if (nodes !== undefined) {
      span.setAttribute("dom.nodes", nodes);
    }
    if (layoutCount !== undefined) {
      span.setAttribute("layout.count", layoutCount);
    }

    span.end();
  }

  // Record screenshot event
  recordScreenshot(format: string, sizeBytes: number): void {
    if (!this.tracer) return;

    const ctx = this.sessionContext || context.active();

    const span = this.tracer.startSpan(
      "screenshot.capture",
      {
        kind: SpanKind.INTERNAL,
        attributes: {
          "screenshot.format": format,
          "screenshot.size_bytes": sizeBytes,
          "screenshot.timestamp": new Date().toISOString(),
        },
      },
      ctx
    );

    span.end();
  }

  // Record user interaction event
  recordUserInteraction(type: string, details: Record<string, unknown>): void {
    if (!this.tracer) return;

    const ctx = this.sessionContext || context.active();

    const span = this.tracer.startSpan(
      `user.${type}`,
      {
        kind: SpanKind.INTERNAL,
        attributes: {
          "interaction.type": type,
          "interaction.timestamp": new Date().toISOString(),
          ...details,
        },
      },
      ctx
    );

    span.end();
  }

  // Record error event
  recordError(error: Error, context?: Record<string, unknown>): void {
    if (!this.tracer) return;

    const ctx = this.sessionContext || context.active();

    const span = this.tracer.startSpan(
      "error",
      {
        kind: SpanKind.INTERNAL,
        attributes: {
          "error.message": error.message,
          "error.name": error.name,
          "error.timestamp": new Date().toISOString(),
          ...context,
        },
      },
      ctx
    );

    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    span.recordException(error);
    span.end();
  }

  // Flush pending spans
  async flush(): Promise<void> {
    if (this.provider) {
      await this.provider.forceFlush();
    }
  }
}

// Singleton instance
let telemetryInstance: TelemetryService | null = null;

export function getTelemetryService(): TelemetryService {
  if (!telemetryInstance) {
    telemetryInstance = new TelemetryService();
  }
  return telemetryInstance;
}

export function createTelemetryService(config?: Partial<TelemetryConfig>): TelemetryService {
  telemetryInstance = new TelemetryService(config);
  return telemetryInstance;
}
