#!/usr/bin/env bun
import {
  SshConnection,
  type SshConfig,
  fetchDevToolsInfo,
  fetchTargets,
  buildChromeCommand,
  type RemoteDebugOptions,
  getConfigManager,
  type SavedConnection,
  type RemoteDebugSettings,
  CdpClient,
  saveToFile,
  formatNetworkReport,
  formatPerformanceReport,
} from "@ssh-tool/core";
import * as readline from "readline";
import { join } from "path";

const ssh = new SshConnection();
const configManager = getConfigManager();
const cdp = new CdpClient();
let portForwardHandle: { close: () => void } | null = null;
let chromePid: number | null = null;

// Settings (will be loaded from config)
let settings: RemoteDebugSettings = {
  remotePort: 9222,
  localPort: 0,
  remoteHost: "127.0.0.1",
  userDataDir: "~/.remote-debug-profile",
  headless: false,
  browserPath: "",
  debuggingAddress: "",
};

// Global readline instance
let mainRl: readline.Interface | null = null;

// Menu item definition
interface MenuItem {
  label: string;
  action: () => Promise<void>;
  requiresArgs?: string[];
  condition?: () => boolean;
}

interface MenuCategory {
  name: string;
  items: MenuItem[];
}

// Prompt helper
async function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    if (mainRl) {
      mainRl.question(question, resolve);
    } else {
      resolve("");
    }
  });
}

// ============ Actions ============

async function connectWithPassword(host: string, username: string, port: number, savedPassword?: string): Promise<void> {
  const password = savedPassword || await prompt("Password: ");
  currentPassword = password;
  const config: SshConfig = { host, port, username, password };
  console.log(`Connecting to ${username}@${host}:${port}...`);
  await ssh.connect(config);
  console.log("Connected successfully!");
}

async function connectWithKey(host: string, username: string, keyFile: string, port: number): Promise<void> {
  const keyPath = keyFile.startsWith("~") ? keyFile.replace("~", process.env.HOME || "") : keyFile;
  const privateKey = await Bun.file(keyPath).text();
  const config: SshConfig = { host, port, username, privateKey };
  console.log(`Connecting to ${username}@${host}:${port} with key...`);
  await ssh.connect(config);
  console.log("Connected successfully!");
}

async function actionConnect(): Promise<void> {
  const host = await prompt("Host: ");
  const username = await prompt("Username: ");
  const portStr = await prompt("Port [22]: ");
  const port = portStr ? parseInt(portStr, 10) : 22;
  await connectWithPassword(host, username, port);
}

async function actionConnectKey(): Promise<void> {
  const host = await prompt("Host: ");
  const username = await prompt("Username: ");
  const keyFile = await prompt("Key file path: ");
  const portStr = await prompt("Port [22]: ");
  const port = portStr ? parseInt(portStr, 10) : 22;
  await connectWithKey(host, username, keyFile, port);
}

async function actionUseConnection(): Promise<void> {
  const connections = await configManager.getConnections();
  if (connections.length === 0) {
    console.log("No saved connections");
    return;
  }

  console.log("\n=== Saved Connections ===");
  connections.forEach((conn, i) => {
    console.log(`  ${i + 1}. ${conn.name}: ${conn.username}@${conn.host}:${conn.port}`);
  });

  const choice = await prompt("\nSelect connection number: ");
  const index = parseInt(choice, 10) - 1;

  if (index < 0 || index >= connections.length) {
    console.log("Invalid selection");
    return;
  }

  const conn = connections[index];
  if (conn.privateKeyPath) {
    await connectWithKey(conn.host, conn.username, conn.privateKeyPath, conn.port);
  } else {
    await connectWithPassword(conn.host, conn.username, conn.port, conn.password);
  }
  await configManager.setLastConnection(conn.name);
}

// Store current password for saving
let currentPassword: string = "";

async function actionSaveConnection(): Promise<void> {
  if (!ssh.isConnected || !ssh.connectionInfo) {
    console.log("Error: Not connected to SSH server");
    return;
  }

  const name = await prompt("Connection name: ");
  const info = ssh.connectionInfo;
  const connection: SavedConnection = {
    name,
    host: info.host,
    port: info.port,
    username: info.username,
    password: currentPassword || undefined,
  };

  await configManager.addConnection(connection);
  await configManager.setLastConnection(name);
  console.log(`Connection saved as "${name}"`);
}

async function actionListConnections(): Promise<void> {
  const connections = await configManager.getConnections();
  const lastConn = (await configManager.load()).lastConnection;

  if (connections.length === 0) {
    console.log("No saved connections");
    return;
  }

  console.log("\n=== Saved Connections ===");
  for (const conn of connections) {
    const marker = conn.name === lastConn ? " *" : "";
    console.log(`  ${conn.name}${marker}: ${conn.username}@${conn.host}:${conn.port}`);
  }
  console.log("\n  * = last used");
}

async function actionDeleteConnection(): Promise<void> {
  const connections = await configManager.getConnections();
  if (connections.length === 0) {
    console.log("No saved connections");
    return;
  }

  console.log("\n=== Saved Connections ===");
  connections.forEach((conn, i) => {
    console.log(`  ${i + 1}. ${conn.name}`);
  });

  const choice = await prompt("\nSelect connection to delete: ");
  const index = parseInt(choice, 10) - 1;

  if (index < 0 || index >= connections.length) {
    console.log("Invalid selection");
    return;
  }

  const deleted = await configManager.removeConnection(connections[index].name);
  if (deleted) {
    console.log(`Connection "${connections[index].name}" deleted`);
  }
}

async function actionDisconnect(): Promise<void> {
  cdp.disconnect();
  await ssh.disconnect();
  portForwardHandle?.close();
  portForwardHandle = null;
  chromePid = null;
  console.log("Disconnected");
}

async function actionExec(): Promise<void> {
  if (!ssh.isConnected) {
    console.log("Error: Not connected");
    return;
  }

  const command = await prompt("Command: ");
  const result = await ssh.executeCommand(command);
  if (result.stdout) console.log(result.stdout);
  if (result.stderr) console.log("[STDERR]", result.stderr);
  console.log(`[Exit: ${result.exitCode}]`);
}

async function actionChromeStart(): Promise<void> {
  if (!ssh.isConnected) {
    console.log("Error: Not connected to SSH server");
    return;
  }

  let browserPath = settings.browserPath;
  if (!browserPath) {
    const detectCmd = "command -v chromium || command -v chromium-browser || command -v google-chrome || command -v google-chrome-stable";
    const result = await ssh.executeCommand(detectCmd);
    if (result.exitCode !== 0 || !result.stdout.trim()) {
      console.log("Error: Chrome/Chromium not found on remote server");
      return;
    }
    browserPath = result.stdout.trim().split("\n")[0];
  }

  const options: RemoteDebugOptions = {
    remotePort: settings.remotePort,
    userDataDir: settings.userDataDir,
    headless: settings.headless,
    debuggingAddress: settings.debuggingAddress || undefined,
  };

  const chromeCmd = buildChromeCommand(browserPath, options);
  const cmd = `export DISPLAY=:0 && mkdir -p ${settings.userDataDir} && nohup ${chromeCmd} >/tmp/remote-debug.log 2>&1 & echo $!`;

  console.log(`Starting Chrome: ${chromeCmd}`);
  const result = await ssh.executeCommand(cmd);

  if (result.exitCode !== 0) {
    console.log(`Error: ${result.stderr || "Failed to start Chrome"}`);
    return;
  }

  chromePid = parseInt(result.stdout.trim(), 10);
  console.log(`Chrome started with PID: ${chromePid}`);
}

async function actionChromeStop(): Promise<void> {
  if (!ssh.isConnected) {
    console.log("Error: Not connected to SSH server");
    return;
  }

  if (!chromePid) {
    console.log("Error: Chrome PID not known");
    return;
  }

  const result = await ssh.executeCommand(`kill ${chromePid}`);
  if (result.exitCode === 0) {
    console.log("Chrome stopped");
    chromePid = null;
  } else {
    console.log(`Error: ${result.stderr || "Failed to stop Chrome"}`);
  }
}

async function actionChromeStatus(): Promise<void> {
  if (!ssh.isConnected) {
    console.log("Error: Not connected to SSH server");
    return;
  }

  if (!chromePid) {
    console.log("Chrome PID not known");
    return;
  }

  const result = await ssh.executeCommand(`kill -0 ${chromePid} 2>/dev/null && echo "running" || echo "stopped"`);
  console.log(`Chrome status: ${result.stdout.trim()}`);
}

async function actionForwardStart(): Promise<void> {
  if (!ssh.isConnected) {
    console.log("Error: Not connected to SSH server");
    return;
  }

  if (portForwardHandle) {
    console.log("Error: Port forward already active. Stop it first.");
    return;
  }

  const portStr = await prompt(`Local port [auto]: `);
  const port = portStr ? parseInt(portStr, 10) : 0;

  const result = await ssh.forwardPort(port, settings.remoteHost, settings.remotePort);
  portForwardHandle = result;
  settings.localPort = result.port;

  console.log(`Port forwarding started: localhost:${settings.localPort} -> ${settings.remoteHost}:${settings.remotePort}`);
}

async function actionForwardStop(): Promise<void> {
  if (!portForwardHandle) {
    console.log("Error: Port forward not active");
    return;
  }

  portForwardHandle.close();
  portForwardHandle = null;
  console.log("Port forwarding stopped");
}

async function actionCdpInfo(): Promise<void> {
  if (!portForwardHandle) {
    console.log("Error: Port forward not active");
    return;
  }

  const info = await fetchDevToolsInfo("127.0.0.1", settings.localPort);
  console.log("\n=== DevTools Info ===");
  console.log(`Browser: ${info.browser || "Unknown"}`);
  console.log(`WebSocket URL: ${info.webSocketDebuggerUrl || "N/A"}`);
}

async function actionCdpTargets(): Promise<void> {
  if (!portForwardHandle) {
    console.log("Error: Port forward not active");
    return;
  }

  const targets = await fetchTargets("127.0.0.1", settings.localPort);
  console.log("\n=== Chrome Targets ===");
  targets.forEach((target, i) => {
    console.log(`  ${i + 1}. [${target.type}] ${target.title}`);
    console.log(`     URL: ${target.url}`);
  });
}

async function actionCdpConnect(): Promise<void> {
  if (!portForwardHandle) {
    console.log("Error: Port forward not active");
    return;
  }

  const targets = await fetchTargets("127.0.0.1", settings.localPort);
  const info = await fetchDevToolsInfo("127.0.0.1", settings.localPort);

  console.log("\n=== Connection Options ===");
  console.log("  0. Browser (global)");
  targets.forEach((target, i) => {
    console.log(`  ${i + 1}. [${target.type}] ${target.title}`);
  });

  const choice = await prompt("\nSelect target: ");
  const index = parseInt(choice, 10);

  let wsUrl: string;
  if (index === 0) {
    if (!info.webSocketDebuggerUrl) {
      console.log("Error: No WebSocket URL available");
      return;
    }
    wsUrl = info.webSocketDebuggerUrl.replace(/^ws:\/\/[^/]+/, `ws://127.0.0.1:${settings.localPort}`);
  } else {
    const target = targets[index - 1];
    if (!target || !target.webSocketDebuggerUrl) {
      console.log("Error: Invalid target or no WebSocket URL");
      return;
    }
    wsUrl = target.webSocketDebuggerUrl.replace(/^ws:\/\/[^/]+/, `ws://127.0.0.1:${settings.localPort}`);
  }

  console.log(`Connecting to ${wsUrl}...`);
  await cdp.connect(wsUrl);
  console.log("CDP connected!");
}

async function actionCdpDisconnect(): Promise<void> {
  if (!cdp.isConnected) {
    console.log("Error: CDP not connected");
    return;
  }
  cdp.disconnect();
  console.log("CDP disconnected");
}

async function actionCdpCommands(): Promise<void> {
  if (!cdp.isConnected) {
    console.log("Error: CDP not connected");
    return;
  }

  const result = await cdp.listDomains();
  console.log("\n=== CDP Domains ===");
  for (const domain of result.domains) {
    console.log(`  ${domain.name} (v${domain.version})`);
  }
}

async function actionNetworkStart(): Promise<void> {
  if (!cdp.isConnected) {
    console.log("Error: CDP not connected");
    return;
  }

  await cdp.startNetworkRecording();
  console.log("Network recording started");
}

async function actionNetworkStop(): Promise<void> {
  if (!cdp.isConnected) {
    console.log("Error: CDP not connected");
    return;
  }

  const requests = await cdp.stopNetworkRecording();
  console.log(formatNetworkReport(requests));
}

async function actionNetworkSave(): Promise<void> {
  const requests = cdp.getNetworkRequests();
  if (requests.length === 0) {
    console.log("No network data to save");
    return;
  }

  const filePath = await prompt("File path: ");
  const fullPath = filePath.startsWith("/") ? filePath : join(process.cwd(), filePath);
  await saveToFile(fullPath, { timestamp: new Date().toISOString(), requests });
  console.log(`Network data saved to ${fullPath}`);
}

async function actionPerfStart(): Promise<void> {
  if (!cdp.isConnected) {
    console.log("Error: CDP not connected");
    return;
  }

  await cdp.startPerformanceRecording(1000);
  console.log("Performance recording started (sampling every 1s)");
}

async function actionPerfStop(): Promise<void> {
  if (!cdp.isConnected) {
    console.log("Error: CDP not connected");
    return;
  }

  const entries = await cdp.stopPerformanceRecording();
  console.log(formatPerformanceReport(entries));
}

async function actionPerfSave(): Promise<void> {
  if (!cdp.isConnected) {
    console.log("Error: CDP not connected");
    return;
  }

  const entries = await cdp.stopPerformanceRecording();
  if (entries.length === 0) {
    console.log("No performance data to save");
    return;
  }

  const filePath = await prompt("File path: ");
  const fullPath = filePath.startsWith("/") ? filePath : join(process.cwd(), filePath);
  await saveToFile(fullPath, { timestamp: new Date().toISOString(), entries });
  console.log(`Performance data saved to ${fullPath}`);
}

async function actionPerfMetrics(): Promise<void> {
  if (!cdp.isConnected) {
    console.log("Error: CDP not connected");
    return;
  }

  const metrics = await cdp.getPerformanceMetrics();
  console.log("\n=== Performance Metrics ===");
  for (const metric of metrics) {
    const value = metric.name.includes("Heap") || metric.name.includes("Size")
      ? `${(metric.value / (1024 * 1024)).toFixed(2)} MB`
      : metric.value.toFixed(2);
    console.log(`  ${metric.name}: ${value}`);
  }
}

async function actionCpuThrottle(): Promise<void> {
  if (!cdp.isConnected) {
    console.log("Error: CDP not connected");
    return;
  }

  console.log("\n=== CPU Throttle Options ===");
  console.log("  1. No throttle (1x)");
  console.log("  2. 2x slowdown");
  console.log("  3. 4x slowdown");
  console.log("  4. 6x slowdown");

  const choice = await prompt("\nSelect: ");
  const rates = [1, 2, 4, 6];
  const index = parseInt(choice, 10) - 1;

  if (index < 0 || index >= rates.length) {
    console.log("Invalid selection");
    return;
  }

  await cdp.setCpuThrottling(rates[index]);
  console.log(`CPU throttling set to ${rates[index]}x`);
}

async function actionCpuThrottleOff(): Promise<void> {
  if (!cdp.isConnected) {
    console.log("Error: CDP not connected");
    return;
  }

  await cdp.clearCpuThrottling();
  console.log("CPU throttling disabled");
}

// Overlay / Rendering
async function actionFpsOn(): Promise<void> {
  if (!cdp.isConnected) {
    console.log("Error: CDP not connected");
    return;
  }

  await cdp.showFpsCounter(true);
  console.log("FPS counter enabled");
}

async function actionFpsOff(): Promise<void> {
  if (!cdp.isConnected) {
    console.log("Error: CDP not connected");
    return;
  }

  await cdp.showFpsCounter(false);
  console.log("FPS counter disabled");
}

async function actionPaintRectsOn(): Promise<void> {
  if (!cdp.isConnected) {
    console.log("Error: CDP not connected");
    return;
  }

  await cdp.showPaintRects(true);
  console.log("Paint rects enabled");
}

async function actionPaintRectsOff(): Promise<void> {
  if (!cdp.isConnected) {
    console.log("Error: CDP not connected");
    return;
  }

  await cdp.showPaintRects(false);
  console.log("Paint rects disabled");
}

async function actionLayoutShiftOn(): Promise<void> {
  if (!cdp.isConnected) {
    console.log("Error: CDP not connected");
    return;
  }

  await cdp.showLayoutShiftRegions(true);
  console.log("Layout shift regions enabled");
}

async function actionLayoutShiftOff(): Promise<void> {
  if (!cdp.isConnected) {
    console.log("Error: CDP not connected");
    return;
  }

  await cdp.showLayoutShiftRegions(false);
  console.log("Layout shift regions disabled");
}

// Navigation
async function actionNavigate(): Promise<void> {
  if (!cdp.isConnected) {
    console.log("Error: CDP not connected");
    return;
  }

  const url = await prompt("URL: ");
  if (!url) {
    console.log("URL is required");
    return;
  }

  const fullUrl = url.startsWith("http") ? url : `https://${url}`;
  console.log(`Navigating to ${fullUrl}...`);
  await cdp.navigate(fullUrl);
  console.log("Navigation started");
}

async function actionReload(): Promise<void> {
  if (!cdp.isConnected) {
    console.log("Error: CDP not connected");
    return;
  }

  await cdp.reload();
  console.log("Page reloaded");
}

async function actionGoBack(): Promise<void> {
  if (!cdp.isConnected) {
    console.log("Error: CDP not connected");
    return;
  }

  await cdp.goBack();
  console.log("Navigated back");
}

async function actionGoForward(): Promise<void> {
  if (!cdp.isConnected) {
    console.log("Error: CDP not connected");
    return;
  }

  await cdp.goForward();
  console.log("Navigated forward");
}

async function actionScreenshot(): Promise<void> {
  if (!cdp.isConnected) {
    console.log("Error: CDP not connected");
    return;
  }

  const filePath = await prompt("File path (e.g., screenshot.png): ");
  if (!filePath) {
    console.log("File path is required");
    return;
  }

  const format = filePath.endsWith(".jpg") || filePath.endsWith(".jpeg") ? "jpeg" : "png";
  const data = await cdp.captureScreenshot(format);
  const buffer = Buffer.from(data, "base64");
  const fullPath = filePath.startsWith("/") ? filePath : join(process.cwd(), filePath);
  await Bun.write(fullPath, buffer);
  console.log(`Screenshot saved to ${fullPath}`);
}

async function actionSettings(): Promise<void> {
  console.log("\n=== Settings ===");
  console.log(`  1. remotePort: ${settings.remotePort}`);
  console.log(`  2. localPort: ${settings.localPort || "(auto)"}`);
  console.log(`  3. remoteHost: ${settings.remoteHost}`);
  console.log(`  4. userDataDir: ${settings.userDataDir}`);
  console.log(`  5. headless: ${settings.headless}`);
  console.log(`  6. browserPath: ${settings.browserPath || "(auto-detect)"}`);
  console.log(`  7. debuggingAddress: ${settings.debuggingAddress || "(default)"}`);
  console.log("  0. Back");

  const choice = await prompt("\nSelect to edit (0 to go back): ");
  const index = parseInt(choice, 10);

  if (index === 0) return;

  const keys = ["remotePort", "localPort", "remoteHost", "userDataDir", "headless", "browserPath", "debuggingAddress"];
  if (index < 1 || index > keys.length) {
    console.log("Invalid selection");
    return;
  }

  const key = keys[index - 1];
  const newValue = await prompt(`New value for ${key}: `);

  switch (key) {
    case "remotePort":
      settings.remotePort = parseInt(newValue, 10);
      break;
    case "localPort":
      settings.localPort = parseInt(newValue, 10);
      break;
    case "remoteHost":
      settings.remoteHost = newValue;
      break;
    case "userDataDir":
      settings.userDataDir = newValue;
      break;
    case "headless":
      settings.headless = newValue === "true";
      break;
    case "browserPath":
      settings.browserPath = newValue;
      break;
    case "debuggingAddress":
      settings.debuggingAddress = newValue;
      break;
  }
  console.log(`Set ${key} = ${newValue}`);
}

async function actionSaveSettings(): Promise<void> {
  await configManager.updateRemoteDebugSettings(settings);
  console.log("Settings saved");
}

async function actionStatus(): Promise<void> {
  console.log("\n=== Status ===");
  if (ssh.isConnected) {
    const info = ssh.connectionInfo!;
    console.log(`SSH: Connected to ${info.username}@${info.host}:${info.port}`);
  } else {
    console.log("SSH: Not connected");
  }

  if (portForwardHandle) {
    console.log(`Port Forward: Active (localhost:${settings.localPort} -> ${settings.remoteHost}:${settings.remotePort})`);
  } else {
    console.log("Port Forward: Not active");
  }

  if (chromePid) {
    console.log(`Chrome: Running (PID: ${chromePid})`);
  } else {
    console.log("Chrome: Not started");
  }

  if (cdp.isConnected) {
    console.log("CDP: Connected");
  } else {
    console.log("CDP: Not connected");
  }
}

// ============ Menu Definition ============

function getMenuCategories(): MenuCategory[] {
  return [
    {
      name: "SSH Connection",
      items: [
        { label: "Connect (password)", action: actionConnect, condition: () => !ssh.isConnected },
        { label: "Connect (key file)", action: actionConnectKey, condition: () => !ssh.isConnected },
        { label: "Use saved connection", action: actionUseConnection, condition: () => !ssh.isConnected },
        { label: "Save current connection", action: actionSaveConnection, condition: () => ssh.isConnected },
        { label: "List saved connections", action: actionListConnections },
        { label: "Delete saved connection", action: actionDeleteConnection },
        { label: "Execute command", action: actionExec, condition: () => ssh.isConnected },
        { label: "Disconnect", action: actionDisconnect, condition: () => ssh.isConnected },
      ],
    },
    {
      name: "Chrome Remote Debugging",
      items: [
        { label: "Start Chrome", action: actionChromeStart, condition: () => ssh.isConnected },
        { label: "Stop Chrome", action: actionChromeStop, condition: () => ssh.isConnected && chromePid !== null },
        { label: "Check Chrome status", action: actionChromeStatus, condition: () => ssh.isConnected && chromePid !== null },
      ],
    },
    {
      name: "Port Forwarding",
      items: [
        { label: "Start port forward", action: actionForwardStart, condition: () => ssh.isConnected && !portForwardHandle },
        { label: "Stop port forward", action: actionForwardStop, condition: () => portForwardHandle !== null },
      ],
    },
    {
      name: "CDP",
      items: [
        { label: "DevTools info", action: actionCdpInfo, condition: () => portForwardHandle !== null },
        { label: "List targets", action: actionCdpTargets, condition: () => portForwardHandle !== null },
        { label: "Connect to CDP", action: actionCdpConnect, condition: () => portForwardHandle !== null && !cdp.isConnected },
        { label: "Disconnect CDP", action: actionCdpDisconnect, condition: () => cdp.isConnected },
        { label: "List CDP domains", action: actionCdpCommands, condition: () => cdp.isConnected },
      ],
    },
    {
      name: "Network Recording",
      items: [
        { label: "Start recording", action: actionNetworkStart, condition: () => cdp.isConnected },
        { label: "Stop recording", action: actionNetworkStop, condition: () => cdp.isConnected },
        { label: "Save to file", action: actionNetworkSave },
      ],
    },
    {
      name: "Performance",
      items: [
        { label: "Start recording", action: actionPerfStart, condition: () => cdp.isConnected },
        { label: "Stop recording", action: actionPerfStop, condition: () => cdp.isConnected },
        { label: "Save to file", action: actionPerfSave, condition: () => cdp.isConnected },
        { label: "Show metrics", action: actionPerfMetrics, condition: () => cdp.isConnected },
      ],
    },
    {
      name: "Navigation",
      items: [
        { label: "Navigate to URL", action: actionNavigate, condition: () => cdp.isConnected },
        { label: "Reload page", action: actionReload, condition: () => cdp.isConnected },
        { label: "Go back", action: actionGoBack, condition: () => cdp.isConnected },
        { label: "Go forward", action: actionGoForward, condition: () => cdp.isConnected },
        { label: "Take screenshot", action: actionScreenshot, condition: () => cdp.isConnected },
      ],
    },
    {
      name: "CPU Throttling",
      items: [
        { label: "Set throttle", action: actionCpuThrottle, condition: () => cdp.isConnected },
        { label: "Disable throttle", action: actionCpuThrottleOff, condition: () => cdp.isConnected },
      ],
    },
    {
      name: "Rendering Overlay",
      items: [
        { label: "FPS counter ON", action: actionFpsOn, condition: () => cdp.isConnected },
        { label: "FPS counter OFF", action: actionFpsOff, condition: () => cdp.isConnected },
        { label: "Paint rects ON", action: actionPaintRectsOn, condition: () => cdp.isConnected },
        { label: "Paint rects OFF", action: actionPaintRectsOff, condition: () => cdp.isConnected },
        { label: "Layout shift ON", action: actionLayoutShiftOn, condition: () => cdp.isConnected },
        { label: "Layout shift OFF", action: actionLayoutShiftOff, condition: () => cdp.isConnected },
      ],
    },
    {
      name: "Settings",
      items: [
        { label: "View/Edit settings", action: actionSettings },
        { label: "Save settings", action: actionSaveSettings },
        { label: "Show status", action: actionStatus },
      ],
    },
  ];
}

// ============ Main Menu ============

function printMenu(): MenuItem[] {
  const categories = getMenuCategories();
  const availableItems: MenuItem[] = [];
  let num = 1;

  console.log("\n========================================");
  console.log("  SSH Command Tool v0.1.0");
  console.log("========================================\n");

  for (const category of categories) {
    const visibleItems = category.items.filter(item => !item.condition || item.condition());
    if (visibleItems.length === 0) continue;

    console.log(`[${category.name}]`);
    for (const item of visibleItems) {
      console.log(`  ${num}. ${item.label}`);
      availableItems.push(item);
      num++;
    }
    console.log("");
  }

  console.log("  0. Exit\n");

  return availableItems;
}

async function main(): Promise<void> {
  // Load settings from config
  settings = await configManager.getRemoteDebugSettings();

  mainRl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const loop = async () => {
    const items = printMenu();
    const choice = await prompt("Select: ");
    const index = parseInt(choice, 10);

    if (index === 0) {
      cdp.disconnect();
      await ssh.disconnect();
      portForwardHandle?.close();
      mainRl?.close();
      process.exit(0);
    }

    if (index < 1 || index > items.length) {
      console.log("Invalid selection");
      loop();
      return;
    }

    try {
      await items[index - 1].action();
    } catch (err) {
      console.log(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Small delay before showing menu again
    setTimeout(loop, 500);
  };

  loop();
}

main().catch(console.error);
