import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
  SshConnection,
  getConfigManager,
  fetchDevToolsInfo,
  fetchTargets,
  buildChromeCommand,
  CdpClient,
} from "../index";

/**
 * Integration tests that connect to actual SSH server
 * Requires saved connection in ~/.ssh-command-tool/config.json
 *
 * Run with: bun test packages/core/src/test/integration.test.ts
 */

const configManager = getConfigManager();
let ssh: SshConnection;
let cdp: CdpClient;
let portForwardHandle: { close: () => void; port: number } | null = null;
let chromePid: number | null = null;
let testConnection: { host: string; port: number; username: string; password?: string } | null = null;

// Test configuration
const REMOTE_DEBUG_PORT = 9222;
const REMOTE_HOST = "127.0.0.1";

describe("Integration Tests", () => {
  beforeAll(async () => {
    ssh = new SshConnection();
    cdp = new CdpClient();

    // Get saved connection
    const connections = await configManager.getConnections();
    if (connections.length === 0) {
      console.log("No saved connections found. Please save a connection first using the CLI.");
      return;
    }

    const conn = connections[0];
    testConnection = {
      host: conn.host,
      port: conn.port,
      username: conn.username,
      password: conn.password,
    };

    console.log(`Using connection: ${conn.username}@${conn.host}:${conn.port}`);
  });

  afterAll(async () => {
    // Cleanup
    if (cdp.isConnected) {
      cdp.disconnect();
    }

    if (portForwardHandle) {
      portForwardHandle.close();
    }

    if (chromePid && ssh.isConnected) {
      await ssh.executeCommand(`kill ${chromePid} 2>/dev/null || true`);
    }

    if (ssh.isConnected) {
      await ssh.disconnect();
    }
  });

  describe("SSH Connection", () => {
    test("should connect to SSH server", async () => {
      if (!testConnection) {
        console.log("Skipping: No test connection available");
        return;
      }

      await ssh.connect({
        host: testConnection.host,
        port: testConnection.port,
        username: testConnection.username,
        password: testConnection.password,
      });

      expect(ssh.isConnected).toBe(true);
      expect(ssh.connectionInfo?.host).toBe(testConnection.host);
    });

    test("should execute command", async () => {
      if (!ssh.isConnected) {
        console.log("Skipping: Not connected");
        return;
      }

      const result = await ssh.executeCommand("whoami");
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe(testConnection!.username);
    });

    test("should execute command with output", async () => {
      if (!ssh.isConnected) {
        console.log("Skipping: Not connected");
        return;
      }

      const result = await ssh.executeCommand("echo 'Hello World'");
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe("Hello World");
    });

    test("should handle command error", async () => {
      if (!ssh.isConnected) {
        console.log("Skipping: Not connected");
        return;
      }

      const result = await ssh.executeCommand("exit 42");
      expect(result.exitCode).toBe(42);
    });
  });

  describe("Chrome Remote Debugging", () => {
    test("should detect Chrome path", async () => {
      if (!ssh.isConnected) {
        console.log("Skipping: Not connected");
        return;
      }

      const detectCmd = "command -v chromium || command -v chromium-browser || command -v google-chrome || command -v google-chrome-stable";
      const result = await ssh.executeCommand(detectCmd);

      if (result.exitCode !== 0 || !result.stdout.trim()) {
        console.log("Chrome not found on remote server");
        return;
      }

      const browserPath = result.stdout.trim().split("\n")[0];
      expect(browserPath).toBeTruthy();
      console.log(`Found browser: ${browserPath}`);
    });

    test("should start Chrome with remote debugging", async () => {
      if (!ssh.isConnected) {
        console.log("Skipping: Not connected");
        return;
      }

      // Kill any existing Chrome first
      await ssh.executeCommand("pkill -f 'remote-debugging-port' || true");
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Detect browser
      const detectCmd = "command -v chromium || command -v chromium-browser || command -v google-chrome || command -v google-chrome-stable";
      const detectResult = await ssh.executeCommand(detectCmd);

      if (detectResult.exitCode !== 0 || !detectResult.stdout.trim()) {
        console.log("Skipping: Chrome not found");
        return;
      }

      const browserPath = detectResult.stdout.trim().split("\n")[0];
      const chromeCmd = buildChromeCommand(browserPath, {
        remotePort: REMOTE_DEBUG_PORT,
        userDataDir: "~/.remote-debug-profile-test",
        headless: false,
      });

      // Start Chrome and get PID
      const cmd = `export DISPLAY=:0 && mkdir -p ~/.remote-debug-profile-test && nohup ${chromeCmd} >/tmp/remote-debug-test.log 2>&1 & echo $!`;
      console.log(`Running: ${cmd}`);
      const result = await ssh.executeCommand(cmd);
      console.log(`Result: exitCode=${result.exitCode}, stdout="${result.stdout}", stderr="${result.stderr}"`);

      expect(result.exitCode).toBe(0);

      // Parse PID from output (may have multiple lines)
      const lines = result.stdout.trim().split("\n");
      const pidLine = lines[lines.length - 1];
      chromePid = parseInt(pidLine.trim(), 10);

      if (isNaN(chromePid) || chromePid <= 0) {
        // Try to find Chrome process directly
        const pidResult = await ssh.executeCommand("pgrep -f 'remote-debugging-port' | head -1");
        if (pidResult.exitCode === 0 && pidResult.stdout.trim()) {
          chromePid = parseInt(pidResult.stdout.trim(), 10);
        }
      }

      expect(chromePid).toBeGreaterThan(0);
      console.log(`Chrome started with PID: ${chromePid}`);

      // Wait for Chrome to start
      await new Promise(resolve => setTimeout(resolve, 2000));
    }, 15000); // 15 second timeout

    test("should verify Chrome is running", async () => {
      if (!ssh.isConnected || !chromePid) {
        console.log("Skipping: Chrome not started");
        return;
      }

      const result = await ssh.executeCommand(`kill -0 ${chromePid} 2>/dev/null && echo "running" || echo "stopped"`);
      expect(result.stdout.trim()).toBe("running");
    });
  });

  describe("Port Forwarding", () => {
    test("should start port forwarding", async () => {
      if (!ssh.isConnected || !chromePid) {
        console.log("Skipping: Prerequisites not met");
        return;
      }

      portForwardHandle = await ssh.forwardPort(0, REMOTE_HOST, REMOTE_DEBUG_PORT);
      expect(portForwardHandle).toBeTruthy();
      expect(portForwardHandle.port).toBeGreaterThan(0);
      console.log(`Port forwarding: localhost:${portForwardHandle.port} -> ${REMOTE_HOST}:${REMOTE_DEBUG_PORT}`);
    });

    test("should fetch DevTools info", async () => {
      if (!portForwardHandle) {
        console.log("Skipping: Port forward not active");
        return;
      }

      // Wait a bit for connection to stabilize
      await new Promise(resolve => setTimeout(resolve, 1000));

      const info = await fetchDevToolsInfo("127.0.0.1", portForwardHandle.port);
      expect(info.browser).toBeTruthy();
      console.log(`Browser: ${info.browser}`);
      console.log(`WebSocket URL: ${info.webSocketDebuggerUrl}`);
    });

    test("should fetch targets", async () => {
      if (!portForwardHandle) {
        console.log("Skipping: Port forward not active");
        return;
      }

      const targets = await fetchTargets("127.0.0.1", portForwardHandle.port);
      expect(Array.isArray(targets)).toBe(true);
      console.log(`Found ${targets.length} targets`);

      for (const target of targets) {
        console.log(`  [${target.type}] ${target.title}`);
      }
    });
  });

  describe("CDP Connection", () => {
    test("should connect to CDP", async () => {
      if (!portForwardHandle) {
        console.log("Skipping: Port forward not active");
        return;
      }

      const info = await fetchDevToolsInfo("127.0.0.1", portForwardHandle.port);
      if (!info.webSocketDebuggerUrl) {
        console.log("Skipping: No WebSocket URL");
        return;
      }

      const wsUrl = info.webSocketDebuggerUrl.replace(
        /^ws:\/\/[^/]+/,
        `ws://127.0.0.1:${portForwardHandle.port}`
      );

      await cdp.connect(wsUrl);
      expect(cdp.isConnected).toBe(true);
      console.log("CDP connected");
    });

    test("should list CDP domains", async () => {
      if (!cdp.isConnected) {
        console.log("Skipping: CDP not connected");
        return;
      }

      const result = await cdp.listDomains();
      expect(result.domains).toBeTruthy();
      expect(result.domains.length).toBeGreaterThan(0);
      console.log(`Found ${result.domains.length} CDP domains`);
    });

    test("should get performance metrics", async () => {
      if (!portForwardHandle) {
        console.log("Skipping: Port forward not active");
        return;
      }

      // Connect to a page target for performance metrics
      const targets = await fetchTargets("127.0.0.1", portForwardHandle.port);
      const pageTarget = targets.find(t => t.type === "page");

      if (!pageTarget?.webSocketDebuggerUrl) {
        console.log("Skipping: No page target found");
        return;
      }

      if (cdp.isConnected) {
        cdp.disconnect();
      }

      const wsUrl = pageTarget.webSocketDebuggerUrl.replace(
        /^ws:\/\/[^/]+/,
        `ws://127.0.0.1:${portForwardHandle.port}`
      );
      await cdp.connect(wsUrl);

      const metrics = await cdp.getPerformanceMetrics();
      expect(Array.isArray(metrics)).toBe(true);
      console.log(`Got ${metrics.length} performance metrics`);
    });
  });

  describe("Navigation", () => {
    test("should navigate to URL", async () => {
      if (!cdp.isConnected) {
        console.log("Skipping: CDP not connected");
        return;
      }

      // First connect to a page target
      const targets = await fetchTargets("127.0.0.1", portForwardHandle!.port);
      const pageTarget = targets.find(t => t.type === "page");

      if (!pageTarget?.webSocketDebuggerUrl) {
        console.log("Skipping: No page target found");
        return;
      }

      // Disconnect from browser and connect to page
      cdp.disconnect();
      const wsUrl = pageTarget.webSocketDebuggerUrl.replace(
        /^ws:\/\/[^/]+/,
        `ws://127.0.0.1:${portForwardHandle!.port}`
      );
      await cdp.connect(wsUrl);

      const result = await cdp.navigate("https://www.yahoo.co.jp");
      expect(result.frameId).toBeTruthy();
      console.log("Navigated to www.yahoo.co.jp");

      // Wait for page to load
      await new Promise(resolve => setTimeout(resolve, 3000));
    }, 15000);

    test("should take screenshot", async () => {
      if (!cdp.isConnected) {
        console.log("Skipping: CDP not connected");
        return;
      }

      const screenshot = await cdp.captureScreenshot("png");
      expect(screenshot).toBeTruthy();
      expect(screenshot.length).toBeGreaterThan(100);
      console.log(`Screenshot captured: ${screenshot.length} bytes (base64)`);
    });
  });

  describe("Network Recording", () => {
    test("should record network requests", async () => {
      if (!cdp.isConnected) {
        console.log("Skipping: CDP not connected");
        return;
      }

      await cdp.startNetworkRecording();
      console.log("Network recording started");

      // Navigate to trigger requests
      await cdp.navigate("https://www.yahoo.co.jp");
      await new Promise(resolve => setTimeout(resolve, 5000));

      const requests = await cdp.stopNetworkRecording();
      expect(Array.isArray(requests)).toBe(true);
      console.log(`Recorded ${requests.length} network requests`);

      // Show some request details
      for (const req of requests.slice(0, 5)) {
        console.log(`  [${req.method}] ${req.url.substring(0, 80)}... Status: ${req.response?.status || 'pending'}`);
      }
      if (requests.length > 5) {
        console.log(`  ... and ${requests.length - 5} more requests`);
      }
    }, 20000);
  });

  describe("Performance Recording", () => {
    test("should record performance on yahoo.co.jp", async () => {
      if (!cdp.isConnected) {
        console.log("Skipping: CDP not connected");
        return;
      }

      // Start performance recording
      await cdp.startPerformanceRecording(500);
      console.log("Performance recording started");

      // Navigate and interact
      await cdp.navigate("https://www.yahoo.co.jp");
      console.log("Navigating to Yahoo Japan...");

      // Wait for page load and collect samples
      await new Promise(resolve => setTimeout(resolve, 5000));

      const entries = await cdp.stopPerformanceRecording();
      expect(Array.isArray(entries)).toBe(true);
      expect(entries.length).toBeGreaterThan(0);
      console.log(`Recorded ${entries.length} performance samples`);

      // Show key metrics from latest sample
      if (entries.length > 0) {
        const latest = entries[entries.length - 1];
        console.log("\n=== Performance Metrics (Yahoo Japan) ===");
        for (const metric of latest.metrics) {
          if (["JSHeapUsedSize", "JSHeapTotalSize", "Documents", "Frames", "LayoutCount", "RecalcStyleCount", "TaskDuration"].includes(metric.name)) {
            const value = metric.name.includes("Heap")
              ? `${(metric.value / (1024 * 1024)).toFixed(2)} MB`
              : metric.value.toFixed(2);
            console.log(`  ${metric.name}: ${value}`);
          }
        }
      }
    }, 20000);
  });

  describe("CPU Throttling", () => {
    test("should set CPU throttling", async () => {
      if (!cdp.isConnected) {
        console.log("Skipping: CDP not connected");
        return;
      }

      await cdp.setCpuThrottling(4);
      console.log("CPU throttling set to 4x");

      // Verify by clearing
      await cdp.clearCpuThrottling();
      console.log("CPU throttling cleared");
    });
  });

  describe("Rendering Overlay", () => {
    test("should toggle FPS counter", async () => {
      if (!cdp.isConnected) {
        console.log("Skipping: CDP not connected");
        return;
      }

      await cdp.showFpsCounter(true);
      console.log("FPS counter enabled");

      // Wait to see it
      await new Promise(resolve => setTimeout(resolve, 2000));

      await cdp.showFpsCounter(false);
      console.log("FPS counter disabled");
    });

    test("should toggle paint rects", async () => {
      if (!cdp.isConnected) {
        console.log("Skipping: CDP not connected");
        return;
      }

      await cdp.showPaintRects(true);
      console.log("Paint rects enabled");

      await new Promise(resolve => setTimeout(resolve, 1000));

      await cdp.showPaintRects(false);
      console.log("Paint rects disabled");
    });
  });

  describe("Cleanup", () => {
    test("should stop Chrome", async () => {
      if (!ssh.isConnected || !chromePid) {
        console.log("Skipping: Nothing to clean up");
        return;
      }

      const result = await ssh.executeCommand(`kill ${chromePid}`);
      expect(result.exitCode).toBe(0);
      console.log("Chrome stopped");
      chromePid = null;
    });

    test("should disconnect SSH", async () => {
      if (!ssh.isConnected) {
        console.log("Skipping: Not connected");
        return;
      }

      await ssh.disconnect();
      expect(ssh.isConnected).toBe(false);
      console.log("SSH disconnected");
    });
  });
});
