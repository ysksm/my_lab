import type { ChromeTarget } from "./cdp";

export interface CdpCommand {
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

export interface CdpResponse {
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
}

export interface CdpEvent {
  method: string;
  params?: Record<string, unknown>;
}

export interface NetworkRequest {
  requestId: string;
  url: string;
  method: string;
  timestamp: number;
  type?: string;
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    mimeType?: string;
  };
  timing?: {
    requestTime: number;
    receiveHeadersEnd: number;
  };
  encodedDataLength?: number;
}

export interface PerformanceMetric {
  name: string;
  value: number;
}

export interface PerformanceEntry {
  timestamp: number;
  metrics: PerformanceMetric[];
}

export class CdpClient {
  private ws: WebSocket | null = null;
  private messageId = 0;
  private pendingCommands = new Map<number, {
    resolve: (result: unknown) => void;
    reject: (error: Error) => void;
  }>();
  private eventHandlers = new Map<string, ((params: unknown) => void)[]>();

  // Network recording
  private networkRequests = new Map<string, NetworkRequest>();
  private isRecordingNetwork = false;

  // Performance recording
  private performanceEntries: PerformanceEntry[] = [];
  private isRecordingPerformance = false;
  private performanceInterval: ReturnType<typeof setInterval> | null = null;

  // Real-time metrics monitoring
  private metricsMonitorInterval: ReturnType<typeof setInterval> | null = null;
  private metricsCallback: ((metrics: PerformanceMetric[]) => void) | null = null;

  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  async connect(wsUrl: string): Promise<void> {
    if (this.ws) {
      this.disconnect();
    }

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        resolve();
      };

      this.ws.onerror = (event) => {
        reject(new Error("WebSocket connection failed"));
      };

      this.ws.onclose = () => {
        this.ws = null;
        this.pendingCommands.clear();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data as string);
      };
    });
  }

  disconnect(): void {
    if (this.performanceInterval) {
      clearInterval(this.performanceInterval);
      this.performanceInterval = null;
    }
    if (this.metricsMonitorInterval) {
      clearInterval(this.metricsMonitorInterval);
      this.metricsMonitorInterval = null;
      this.metricsCallback = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      if ("id" in message) {
        // Response to a command
        const pending = this.pendingCommands.get(message.id);
        if (pending) {
          this.pendingCommands.delete(message.id);
          if (message.error) {
            pending.reject(new Error(message.error.message));
          } else {
            pending.resolve(message.result);
          }
        }
      } else if ("method" in message) {
        // Event
        this.handleEvent(message.method, message.params);
      }
    } catch (err) {
      console.error("Failed to parse CDP message:", err);
    }
  }

  private handleEvent(method: string, params: unknown): void {
    const handlers = this.eventHandlers.get(method);
    if (handlers) {
      for (const handler of handlers) {
        handler(params);
      }
    }

    // Handle network events
    if (this.isRecordingNetwork) {
      this.handleNetworkEvent(method, params as Record<string, unknown>);
    }
  }

  private handleNetworkEvent(method: string, params: Record<string, unknown>): void {
    switch (method) {
      case "Network.requestWillBeSent": {
        const request = params.request as Record<string, unknown>;
        this.networkRequests.set(params.requestId as string, {
          requestId: params.requestId as string,
          url: request.url as string,
          method: request.method as string,
          timestamp: params.timestamp as number,
          type: params.type as string,
        });
        break;
      }
      case "Network.responseReceived": {
        const existing = this.networkRequests.get(params.requestId as string);
        if (existing) {
          const response = params.response as Record<string, unknown>;
          existing.response = {
            status: response.status as number,
            statusText: response.statusText as string,
            headers: response.headers as Record<string, string>,
            mimeType: response.mimeType as string,
          };
          existing.timing = response.timing as {
            requestTime: number;
            receiveHeadersEnd: number;
          };
        }
        break;
      }
      case "Network.loadingFinished": {
        const existing = this.networkRequests.get(params.requestId as string);
        if (existing) {
          existing.encodedDataLength = params.encodedDataLength as number;
        }
        break;
      }
    }
  }

  on(event: string, handler: (params: unknown) => void): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.push(handler);
    this.eventHandlers.set(event, handlers);
  }

  off(event: string, handler: (params: unknown) => void): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  async send(method: string, params?: Record<string, unknown>): Promise<unknown> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Not connected to CDP");
    }

    const id = ++this.messageId;
    const command: CdpCommand = { id, method, params };

    return new Promise((resolve, reject) => {
      this.pendingCommands.set(id, { resolve, reject });
      this.ws!.send(JSON.stringify(command));

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingCommands.has(id)) {
          this.pendingCommands.delete(id);
          reject(new Error(`Command ${method} timed out`));
        }
      }, 30000);
    });
  }

  // ============ CDP Domain Methods ============

  async listDomains(): Promise<{ domains: Array<{ name: string; version: string }> }> {
    // Note: Schema.getDomains is not available on all targets
    // Return a static list of commonly used domains
    const domains = [
      { name: "Browser", version: "1.3" },
      { name: "DOM", version: "1.3" },
      { name: "Emulation", version: "1.3" },
      { name: "Input", version: "1.3" },
      { name: "Network", version: "1.3" },
      { name: "Page", version: "1.3" },
      { name: "Performance", version: "1.3" },
      { name: "Runtime", version: "1.3" },
      { name: "Target", version: "1.3" },
    ];
    return { domains };
  }

  // Network Domain
  async startNetworkRecording(): Promise<void> {
    this.networkRequests.clear();
    this.isRecordingNetwork = true;
    await this.send("Network.enable");
  }

  async stopNetworkRecording(): Promise<NetworkRequest[]> {
    this.isRecordingNetwork = false;
    await this.send("Network.disable");
    return Array.from(this.networkRequests.values());
  }

  getNetworkRequests(): NetworkRequest[] {
    return Array.from(this.networkRequests.values());
  }

  // Performance Domain
  async startPerformanceRecording(intervalMs: number = 1000): Promise<void> {
    this.performanceEntries = [];
    this.isRecordingPerformance = true;
    await this.send("Performance.enable");

    this.performanceInterval = setInterval(async () => {
      if (this.isRecordingPerformance) {
        try {
          const result = await this.send("Performance.getMetrics") as { metrics: PerformanceMetric[] };
          this.performanceEntries.push({
            timestamp: Date.now(),
            metrics: result.metrics,
          });
        } catch (err) {
          // Ignore errors during recording
        }
      }
    }, intervalMs);
  }

  async stopPerformanceRecording(): Promise<PerformanceEntry[]> {
    this.isRecordingPerformance = false;
    if (this.performanceInterval) {
      clearInterval(this.performanceInterval);
      this.performanceInterval = null;
    }
    await this.send("Performance.disable");
    return this.performanceEntries;
  }

  async getPerformanceMetrics(): Promise<PerformanceMetric[]> {
    const result = await this.send("Performance.getMetrics") as { metrics: PerformanceMetric[] };
    return result.metrics;
  }

  // Real-time metrics monitor
  async startMetricsMonitor(intervalMs: number = 500, callback: (metrics: PerformanceMetric[]) => void): Promise<void> {
    if (this.metricsMonitorInterval) {
      this.stopMetricsMonitor();
    }

    await this.send("Performance.enable");
    this.metricsCallback = callback;

    this.metricsMonitorInterval = setInterval(async () => {
      if (this.metricsCallback) {
        try {
          const result = await this.send("Performance.getMetrics") as { metrics: PerformanceMetric[] };
          this.metricsCallback(result.metrics);
        } catch (err) {
          // Ignore errors during monitoring
        }
      }
    }, intervalMs);
  }

  stopMetricsMonitor(): void {
    if (this.metricsMonitorInterval) {
      clearInterval(this.metricsMonitorInterval);
      this.metricsMonitorInterval = null;
      this.metricsCallback = null;
    }
  }

  get isMonitoringMetrics(): boolean {
    return this.metricsMonitorInterval !== null;
  }

  // Emulation Domain - CPU Throttling
  async setCpuThrottling(rate: number): Promise<void> {
    // rate: 1 = no throttle, 2 = 2x slowdown, 4 = 4x slowdown, etc.
    await this.send("Emulation.setCPUThrottlingRate", { rate });
  }

  async clearCpuThrottling(): Promise<void> {
    await this.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  }

  // Page Domain
  async navigate(url: string): Promise<{ frameId: string; loaderId?: string }> {
    await this.send("Page.enable");
    const result = await this.send("Page.navigate", { url }) as { frameId: string; loaderId?: string };
    return result;
  }

  async reload(ignoreCache: boolean = false): Promise<void> {
    await this.send("Page.reload", { ignoreCache });
  }

  async getNavigationHistory(): Promise<{ currentIndex: number; entries: Array<{ id: number; url: string; title: string }> }> {
    const result = await this.send("Page.getNavigationHistory") as { currentIndex: number; entries: Array<{ id: number; url: string; title: string }> };
    return result;
  }

  async goBack(): Promise<void> {
    const history = await this.getNavigationHistory();
    if (history.currentIndex > 0) {
      const entry = history.entries[history.currentIndex - 1];
      await this.send("Page.navigateToHistoryEntry", { entryId: entry.id });
    }
  }

  async goForward(): Promise<void> {
    const history = await this.getNavigationHistory();
    if (history.currentIndex < history.entries.length - 1) {
      const entry = history.entries[history.currentIndex + 1];
      await this.send("Page.navigateToHistoryEntry", { entryId: entry.id });
    }
  }

  // Screenshot
  async captureScreenshot(format: "jpeg" | "png" = "png"): Promise<string> {
    const result = await this.send("Page.captureScreenshot", { format }) as { data: string };
    return result.data; // base64 encoded
  }

  // Overlay Domain - FPS Counter
  async showFpsCounter(show: boolean): Promise<void> {
    await this.send("Overlay.setShowFPSCounter", { show });
  }

  // Overlay Domain - Paint Rects
  async showPaintRects(show: boolean): Promise<void> {
    await this.send("Overlay.setShowPaintRects", { result: show });
  }

  // Overlay Domain - Layout Shift Regions
  async showLayoutShiftRegions(show: boolean): Promise<void> {
    await this.send("Overlay.setShowLayoutShiftRegions", { result: show });
  }

  // Overlay Domain - Scroll Bottleneck Rects
  async showScrollBottleneckRects(show: boolean): Promise<void> {
    await this.send("Overlay.setShowScrollBottleneckRects", { show });
  }

  // Overlay Domain - Rendering stats
  async showRenderingStats(show: boolean): Promise<void> {
    // Enable multiple overlay indicators at once
    await this.showFpsCounter(show);
  }

  // Runtime Domain
  async evaluate(expression: string): Promise<unknown> {
    const result = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
    });
    return result;
  }
}

// Helper to save data to file
export async function saveToFile(filePath: string, data: unknown): Promise<void> {
  const content = JSON.stringify(data, null, 2);
  await Bun.write(filePath, content);
}

export function formatNetworkReport(requests: NetworkRequest[]): string {
  const lines: string[] = ["=== Network Recording Report ===", ""];

  let totalSize = 0;
  let totalRequests = requests.length;

  for (const req of requests) {
    const status = req.response?.status ?? "pending";
    const size = req.encodedDataLength ?? 0;
    totalSize += size;

    lines.push(`[${req.method}] ${req.url}`);
    lines.push(`  Status: ${status}, Size: ${formatBytes(size)}, Type: ${req.type || "unknown"}`);
    lines.push("");
  }

  lines.push("=== Summary ===");
  lines.push(`Total Requests: ${totalRequests}`);
  lines.push(`Total Size: ${formatBytes(totalSize)}`);

  return lines.join("\n");
}

export function formatPerformanceReport(entries: PerformanceEntry[]): string {
  const lines: string[] = ["=== Performance Recording Report ===", ""];

  if (entries.length === 0) {
    lines.push("No performance data recorded");
    return lines.join("\n");
  }

  // Get key metrics from latest entry
  const latest = entries[entries.length - 1];
  const keyMetrics = ["JSHeapUsedSize", "JSHeapTotalSize", "Documents", "Frames", "LayoutCount", "TaskDuration"];

  lines.push("Latest Metrics:");
  for (const metric of latest.metrics) {
    if (keyMetrics.includes(metric.name)) {
      const value = metric.name.includes("Heap") ? formatBytes(metric.value) : metric.value.toFixed(2);
      lines.push(`  ${metric.name}: ${value}`);
    }
  }

  lines.push("");
  lines.push(`Total Samples: ${entries.length}`);
  lines.push(`Duration: ${((entries[entries.length - 1].timestamp - entries[0].timestamp) / 1000).toFixed(1)}s`);

  return lines.join("\n");
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
