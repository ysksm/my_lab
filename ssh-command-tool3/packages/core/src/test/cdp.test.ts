import { describe, test, expect } from "bun:test";
import { buildChromeCommand, type RemoteDebugOptions } from "../cdp";

describe("CDP Utils", () => {
  describe("buildChromeCommand", () => {
    test("should build basic command with remote debugging port", () => {
      const options: RemoteDebugOptions = {
        remotePort: 9222,
      };

      const cmd = buildChromeCommand("/usr/bin/chromium", options);
      expect(cmd).toContain("/usr/bin/chromium");
      expect(cmd).toContain("--remote-debugging-port=9222");
    });

    test("should include user data dir when specified", () => {
      const options: RemoteDebugOptions = {
        remotePort: 9222,
        userDataDir: "/tmp/chrome-profile",
      };

      const cmd = buildChromeCommand("/usr/bin/chromium", options);
      expect(cmd).toContain("--user-data-dir=/tmp/chrome-profile");
    });

    test("should include headless flag when enabled", () => {
      const options: RemoteDebugOptions = {
        remotePort: 9222,
        headless: true,
      };

      const cmd = buildChromeCommand("/usr/bin/chromium", options);
      expect(cmd).toContain("--headless=new");
    });

    test("should include debugging address when specified", () => {
      const options: RemoteDebugOptions = {
        remotePort: 9222,
        debuggingAddress: "0.0.0.0",
      };

      const cmd = buildChromeCommand("/usr/bin/chromium", options);
      expect(cmd).toContain("--remote-debugging-address=0.0.0.0");
    });

    test("should include extra args when specified", () => {
      const options: RemoteDebugOptions = {
        remotePort: 9222,
        extraArgs: ["--no-sandbox", "--disable-gpu"],
      };

      const cmd = buildChromeCommand("/usr/bin/chromium", options);
      expect(cmd).toContain("--no-sandbox");
      expect(cmd).toContain("--disable-gpu");
    });

    test("should build complete command with all options", () => {
      const options: RemoteDebugOptions = {
        remotePort: 9333,
        userDataDir: "~/.chrome-debug",
        headless: true,
        debuggingAddress: "0.0.0.0",
        extraArgs: ["--no-first-run"],
      };

      const cmd = buildChromeCommand("/opt/google/chrome/chrome", options);
      expect(cmd).toBe(
        "/opt/google/chrome/chrome --remote-debugging-port=9333 --user-data-dir=~/.chrome-debug --remote-debugging-address=0.0.0.0 --headless=new --no-first-run"
      );
    });
  });
});
