import {
  SshConnection,
  getConfigManager,
  CdpClient,
  getTelemetryService,
} from "@ssh-tool/core";

// Singleton instances
export const ssh = new SshConnection();
export const configManager = getConfigManager();
export const cdp = new CdpClient();
export const telemetry = getTelemetryService();

// Connection state
export let portForwardHandle: { close: () => void; port: number } | null = null;
export let chromePid: number | null = null;

export function setPortForwardHandle(handle: { close: () => void; port: number } | null) {
  portForwardHandle = handle;
}

export function setChromePid(pid: number | null) {
  chromePid = pid;
}

// Metrics state
export let latestMetrics: { timestamp: number; metrics: any[] } | null = null;
export let metricsHistory: Array<{ timestamp: number; metrics: any[] }> = [];
export const MAX_METRICS_HISTORY = 120; // Keep 60 seconds of data at 500ms interval

export function setLatestMetrics(metrics: { timestamp: number; metrics: any[] } | null) {
  latestMetrics = metrics;
}

export function addToMetricsHistory(entry: { timestamp: number; metrics: any[] }) {
  metricsHistory.push(entry);
  if (metricsHistory.length > MAX_METRICS_HISTORY) {
    metricsHistory.shift();
  }
}

export function clearMetricsHistory() {
  metricsHistory = [];
  latestMetrics = null;
}

// Settings
export let settings = {
  remotePort: 9222,
  localPort: 0,
  remoteHost: "127.0.0.1",
  userDataDir: "~/.remote-debug-profile",
  headless: false,
  browserPath: "",
  debuggingAddress: "",
};

export function updateSettings(newSettings: Partial<typeof settings>) {
  settings = { ...settings, ...newSettings };
}

export function setSettings(newSettings: typeof settings) {
  settings = newSettings;
}

// Load settings on startup
export async function initSettings() {
  settings = await configManager.getRemoteDebugSettings();
}
