import {
  type SshConfig,
  fetchDevToolsInfo,
  fetchTargets,
  buildChromeCommand,
  type TelemetryConfig,
} from "@ssh-tool/core";

import {
  ssh,
  cdp,
  configManager,
  telemetry,
  settings,
  updateSettings,
  portForwardHandle,
  setPortForwardHandle,
  chromePid,
  setChromePid,
  latestMetrics,
  setLatestMetrics,
  metricsHistory,
  addToMetricsHistory,
  clearMetricsHistory,
  MAX_METRICS_HISTORY,
} from "./state";

import {
  startMetricsSession,
  endMetricsSession,
  addMetricsEntry,
  getCurrentSession,
  listSessions,
  loadSession,
  deleteSession,
  exportSession,
} from "./metrics-storage";

export const apiHandlers: Record<string, (body: any) => Promise<any>> = {
  // Status
  "status": async () => ({
    ssh: {
      connected: ssh.isConnected,
      info: ssh.connectionInfo,
    },
    portForward: portForwardHandle ? {
      active: true,
      localPort: settings.localPort,
      remoteHost: settings.remoteHost,
      remotePort: settings.remotePort,
    } : { active: false },
    chrome: {
      running: chromePid !== null,
      pid: chromePid,
    },
    cdp: {
      connected: cdp.isConnected,
    },
    metricsMonitor: {
      active: cdp.isMonitoringMetrics,
    },
    settings,
  }),

  // Connections
  "connections/list": async () => {
    const connections = await configManager.getConnections();
    const config = await configManager.load();
    return { connections, lastConnection: config.lastConnection };
  },

  "connections/save": async (body) => {
    if (!ssh.isConnected || !ssh.connectionInfo) {
      throw new Error("Not connected");
    }
    const info = ssh.connectionInfo;
    await configManager.addConnection({
      name: body.name,
      host: info.host,
      port: info.port,
      username: info.username,
      password: body.password,
    });
    return { success: true };
  },

  "connections/delete": async (body) => {
    await configManager.removeConnection(body.name);
    return { success: true };
  },

  // SSH
  "ssh/connect": async (body) => {
    const config: SshConfig = {
      host: body.host,
      port: body.port || 22,
      username: body.username,
      password: body.password,
    };
    await ssh.connect(config);
    return { success: true };
  },

  "ssh/connect-saved": async (body) => {
    const conn = await configManager.getConnection(body.name);
    if (!conn) throw new Error("Connection not found");

    await ssh.connect({
      host: conn.host,
      port: conn.port,
      username: conn.username,
      password: conn.password,
    });
    await configManager.setLastConnection(body.name);
    return { success: true };
  },

  "ssh/disconnect": async () => {
    cdp.disconnect();
    if (portForwardHandle) {
      portForwardHandle.close();
      setPortForwardHandle(null);
    }
    setChromePid(null);
    await ssh.disconnect();
    return { success: true };
  },

  "ssh/exec": async (body) => {
    if (!ssh.isConnected) throw new Error("Not connected");
    const result = await ssh.executeCommand(body.command);
    return result;
  },

  // Chrome
  "chrome/start": async () => {
    if (!ssh.isConnected) throw new Error("Not connected");

    // Kill existing Chrome
    await ssh.executeCommand("pkill -f 'remote-debugging-port' || true");
    await new Promise(r => setTimeout(r, 1000));

    // Detect browser
    const detectResult = await ssh.executeCommand(
      "command -v chromium || command -v chromium-browser || command -v google-chrome || command -v google-chrome-stable"
    );
    if (detectResult.exitCode !== 0 || !detectResult.stdout.trim()) {
      throw new Error("Chrome not found on remote server");
    }

    const browserPath = settings.browserPath || detectResult.stdout.trim().split("\n")[0];
    const chromeCmd = buildChromeCommand(browserPath, {
      remotePort: settings.remotePort,
      userDataDir: settings.userDataDir,
      headless: settings.headless,
      debuggingAddress: settings.debuggingAddress || undefined,
    });

    const cmd = `export DISPLAY=:0 && mkdir -p ${settings.userDataDir} && nohup ${chromeCmd} >/tmp/remote-debug.log 2>&1 & echo $!`;
    const result = await ssh.executeCommand(cmd);

    if (result.exitCode !== 0) throw new Error(result.stderr || "Failed to start Chrome");

    const pid = parseInt(result.stdout.trim(), 10);
    setChromePid(pid);
    return { pid };
  },

  "chrome/stop": async () => {
    if (!ssh.isConnected) throw new Error("Not connected");
    if (!chromePid) throw new Error("Chrome not running");

    await ssh.executeCommand(`kill ${chromePid}`);
    setChromePid(null);
    return { success: true };
  },

  // Port Forward
  "forward/start": async (body) => {
    if (!ssh.isConnected) throw new Error("Not connected");
    if (portForwardHandle) throw new Error("Already active");

    const port = body.localPort || 0;
    const result = await ssh.forwardPort(port, settings.remoteHost, settings.remotePort);
    setPortForwardHandle(result);
    updateSettings({ localPort: result.port });
    return { port: result.port };
  },

  "forward/stop": async () => {
    if (!portForwardHandle) throw new Error("Not active");
    portForwardHandle.close();
    setPortForwardHandle(null);
    return { success: true };
  },

  // CDP
  "cdp/info": async () => {
    if (!portForwardHandle) throw new Error("Port forward not active");
    const info = await fetchDevToolsInfo("127.0.0.1", settings.localPort);
    return info;
  },

  "cdp/targets": async () => {
    if (!portForwardHandle) throw new Error("Port forward not active");
    const targets = await fetchTargets("127.0.0.1", settings.localPort);
    return { targets };
  },

  "cdp/connect": async (body) => {
    if (!portForwardHandle) throw new Error("Port forward not active");

    let wsUrl: string;
    if (body.targetId) {
      const targets = await fetchTargets("127.0.0.1", settings.localPort);
      const target = targets.find(t => t.id === body.targetId);
      if (!target?.webSocketDebuggerUrl) throw new Error("Target not found");
      wsUrl = target.webSocketDebuggerUrl.replace(/^ws:\/\/[^/]+/, `ws://127.0.0.1:${settings.localPort}`);
    } else {
      const targets = await fetchTargets("127.0.0.1", settings.localPort);
      const pageTarget = targets.find(t => t.type === "page");
      if (pageTarget?.webSocketDebuggerUrl) {
        wsUrl = pageTarget.webSocketDebuggerUrl.replace(/^ws:\/\/[^/]+/, `ws://127.0.0.1:${settings.localPort}`);
      } else {
        const info = await fetchDevToolsInfo("127.0.0.1", settings.localPort);
        if (!info.webSocketDebuggerUrl) throw new Error("No WebSocket URL");
        wsUrl = info.webSocketDebuggerUrl.replace(/^ws:\/\/[^/]+/, `ws://127.0.0.1:${settings.localPort}`);
      }
    }

    await cdp.connect(wsUrl);
    return { success: true, url: wsUrl };
  },

  "cdp/disconnect": async () => {
    cdp.disconnect();
    return { success: true };
  },

  // Navigation
  "navigate": async (body) => {
    if (!cdp.isConnected) throw new Error("CDP not connected");

    const spanId = telemetry.traceNavigation(body.url);

    try {
      const result = await cdp.navigate(body.url);
      telemetry.completeNavigation(spanId, { frameId: result.frameId });
      return result;
    } catch (error) {
      telemetry.completeNavigation(spanId, { error: String(error) });
      throw error;
    }
  },

  "reload": async () => {
    if (!cdp.isConnected) throw new Error("CDP not connected");
    await cdp.reload();
    return { success: true };
  },

  "screenshot": async () => {
    if (!cdp.isConnected) throw new Error("CDP not connected");
    const data = await cdp.captureScreenshot("png");
    telemetry.recordScreenshot("png", data.length);
    return { data };
  },

  // Network
  "network/start": async () => {
    if (!cdp.isConnected) throw new Error("CDP not connected");
    await cdp.startNetworkRecording();
    return { success: true };
  },

  "network/stop": async () => {
    if (!cdp.isConnected) throw new Error("CDP not connected");
    const requests = await cdp.stopNetworkRecording();
    telemetry.traceNetworkRequests(requests);
    return { requests };
  },

  "network/get": async () => {
    return { requests: cdp.getNetworkRequests() };
  },

  "network/export": async () => {
    const requests = cdp.getNetworkRequests();
    const har = {
      log: {
        version: "1.2",
        creator: { name: "SSH Command Tool", version: "0.1.0" },
        pages: [{
          startedDateTime: new Date().toISOString(),
          id: "page_1",
          title: "Network Recording",
          pageTimings: {},
        }],
        entries: requests.map(r => {
          const startTime = r.timestamp ? new Date(r.timestamp * 1000).toISOString() : new Date().toISOString();
          return {
            startedDateTime: startTime,
            time: r.timing?.receiveHeadersEnd || 0,
            request: {
              method: r.method,
              url: r.url,
              httpVersion: "HTTP/1.1",
              headers: [],
              queryString: [],
              cookies: [],
              headersSize: -1,
              bodySize: -1,
            },
            response: {
              status: r.response?.status || 0,
              statusText: r.response?.statusText || "",
              httpVersion: "HTTP/1.1",
              headers: Object.entries(r.response?.headers || {}).map(([name, value]) => ({ name, value })),
              cookies: [],
              content: {
                size: r.encodedDataLength || 0,
                mimeType: r.response?.mimeType || "application/octet-stream",
              },
              redirectURL: "",
              headersSize: -1,
              bodySize: r.encodedDataLength || -1,
            },
            cache: {},
            timings: {
              send: 0,
              wait: r.timing?.receiveHeadersEnd || 0,
              receive: 0,
            },
            pageref: "page_1",
          };
        }),
      },
    };
    return har;
  },

  // Performance
  "perf/start": async () => {
    if (!cdp.isConnected) throw new Error("CDP not connected");
    await cdp.startPerformanceRecording(500);
    return { success: true };
  },

  "perf/stop": async () => {
    if (!cdp.isConnected) throw new Error("CDP not connected");
    const entries = await cdp.stopPerformanceRecording();
    for (const entry of entries) {
      telemetry.recordPerformanceMetrics(entry.metrics);
    }
    return { entries };
  },

  "perf/metrics": async () => {
    if (!cdp.isConnected) throw new Error("CDP not connected");
    const metrics = await cdp.getPerformanceMetrics();
    return { metrics };
  },

  "perf/export": async (body) => {
    const entries = body.entries || [];
    if (entries.length === 0) {
      return { traceEvents: [] };
    }

    const traceEvents: any[] = [];
    const pid = 1;
    const tid = 1;
    const startTime = entries[0].timestamp * 1000000;

    traceEvents.push({
      name: "process_name", ph: "M", pid, tid, ts: 0,
      args: { name: "SSH Command Tool" }
    });

    traceEvents.push({
      name: "thread_name", ph: "M", pid, tid, ts: 0,
      args: { name: "Main" }
    });

    entries.forEach((entry: any, index: number) => {
      const ts = Math.round((entry.timestamp * 1000000) - startTime);

      entry.metrics.forEach((metric: any) => {
        traceEvents.push({
          name: metric.name, ph: "C", pid, tid, ts,
          args: { value: metric.value }
        });
      });

      traceEvents.push({
        name: "PerformanceSample", ph: "i", pid, tid, ts, s: "g",
        args: {
          sampleIndex: index,
          JSHeapUsedSize: entry.metrics.find((m: any) => m.name === "JSHeapUsedSize")?.value,
          Documents: entry.metrics.find((m: any) => m.name === "Documents")?.value,
        }
      });
    });

    return { traceEvents };
  },

  // Metrics Monitor
  "metrics/start": async (body) => {
    if (!cdp.isConnected) throw new Error("CDP not connected");
    clearMetricsHistory();

    const sendToJaeger = body?.sendToJaeger ?? false;
    const saveToStorage = body?.saveToStorage ?? true;

    // Start a new storage session if saving is enabled
    let sessionId: string | undefined;
    if (saveToStorage) {
      sessionId = startMetricsSession();
    }

    await cdp.startMetricsMonitor(500, (metrics) => {
      const entry = { timestamp: Date.now(), metrics };
      setLatestMetrics(entry);
      addToMetricsHistory(entry);

      // Save to persistent storage
      if (saveToStorage) {
        addMetricsEntry(entry);
      }

      if (sendToJaeger && telemetry.isEnabled) {
        telemetry.recordPerformanceMetrics(metrics);
      }
    });
    return { success: true, sessionId };
  },

  "metrics/stop": async () => {
    cdp.stopMetricsMonitor();
    const session = endMetricsSession();
    return {
      success: true,
      sessionId: session?.id,
      entryCount: session?.entries.length || 0,
    };
  },

  "metrics/get": async () => {
    const currentSession = getCurrentSession();
    return {
      latest: latestMetrics,
      history: metricsHistory,
      isMonitoring: cdp.isMonitoringMetrics,
      currentSessionId: currentSession?.id || null,
    };
  },

  // Historical metrics sessions
  "metrics/sessions": async () => {
    const sessions = listSessions();
    return { sessions };
  },

  "metrics/session/load": async (body) => {
    if (!body.sessionId) throw new Error("sessionId required");
    const session = await loadSession(body.sessionId);
    if (!session) throw new Error("Session not found");
    return session;
  },

  "metrics/session/delete": async (body) => {
    if (!body.sessionId) throw new Error("sessionId required");
    const deleted = deleteSession(body.sessionId);
    return { success: deleted };
  },

  "metrics/session/export": async (body) => {
    if (!body.sessionId) throw new Error("sessionId required");
    const data = await exportSession(body.sessionId);
    if (!data) throw new Error("Session not found");
    return { data };
  },

  // CPU Throttling
  "cpu/throttle": async (body) => {
    if (!cdp.isConnected) throw new Error("CDP not connected");
    await cdp.setCpuThrottling(body.rate);
    return { success: true };
  },

  "cpu/clear": async () => {
    if (!cdp.isConnected) throw new Error("CDP not connected");
    await cdp.clearCpuThrottling();
    return { success: true };
  },

  // Overlay
  "overlay/fps": async (body) => {
    if (!cdp.isConnected) throw new Error("CDP not connected");
    await cdp.showFpsCounter(body.show);
    return { success: true };
  },

  "overlay/paint": async (body) => {
    if (!cdp.isConnected) throw new Error("CDP not connected");
    await cdp.showPaintRects(body.show);
    return { success: true };
  },

  "overlay/layout-shift": async (body) => {
    if (!cdp.isConnected) throw new Error("CDP not connected");
    await cdp.showLayoutShiftRegions(body.show);
    return { success: true };
  },

  // Settings
  "settings/get": async () => ({ settings }),

  "settings/update": async (body) => {
    updateSettings(body);
    return { success: true };
  },

  "settings/save": async () => {
    await configManager.updateRemoteDebugSettings(settings);
    return { success: true };
  },

  // Saved URLs
  "urls/list": async () => {
    const urls = await configManager.getUrls();
    return { urls };
  },

  "urls/add": async (body) => {
    if (!body.name || !body.url) {
      throw new Error("name and url are required");
    }
    await configManager.addUrl({ name: body.name, url: body.url });
    return { success: true };
  },

  "urls/delete": async (body) => {
    if (!body.name) {
      throw new Error("name is required");
    }
    const deleted = await configManager.removeUrl(body.name);
    return { success: deleted };
  },

  // Telemetry (Jaeger)
  "telemetry/status": async () => {
    return {
      enabled: telemetry.isEnabled,
      config: telemetry.getConfig(),
    };
  },

  "telemetry/enable": async (body) => {
    const config: Partial<TelemetryConfig> = {
      enabled: true,
      exporter: body.exporter || "otlp",
      endpoint: body.endpoint || "http://localhost:4318/v1/traces",
      serviceName: body.serviceName || "ssh-command-tool",
      sampleRate: body.sampleRate || 1.0,
    };
    await telemetry.enable(config);

    if (ssh.isConnected && ssh.connectionInfo) {
      telemetry.startSession({
        host: ssh.connectionInfo.host,
        username: ssh.connectionInfo.username,
      });
    }

    return { success: true, config: telemetry.getConfig() };
  },

  "telemetry/disable": async () => {
    await telemetry.disable();
    return { success: true };
  },

  "telemetry/flush": async () => {
    await telemetry.flush();
    return { success: true };
  },
};
