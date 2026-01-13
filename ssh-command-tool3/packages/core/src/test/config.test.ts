import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { ConfigManager, type SavedConnection, type RemoteDebugSettings } from "../config";
import { rmSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("ConfigManager", () => {
  let configManager: ConfigManager;
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `ssh-tool-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    configManager = new ConfigManager(testDir);
  });

  afterEach(() => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {}
  });

  test("should load default config when no file exists", async () => {
    const config = await configManager.load();
    expect(config.connections).toEqual([]);
    expect(config.remoteDebug.remotePort).toBe(9222);
  });

  test("should add and retrieve connection", async () => {
    const connection: SavedConnection = {
      name: "test-server",
      host: "192.168.1.100",
      port: 22,
      username: "testuser",
      password: "testpass",
    };

    await configManager.addConnection(connection);
    const retrieved = await configManager.getConnection("test-server");

    expect(retrieved).toBeDefined();
    expect(retrieved?.host).toBe("192.168.1.100");
    expect(retrieved?.username).toBe("testuser");
    expect(retrieved?.password).toBe("testpass");
  });

  test("should list all connections", async () => {
    await configManager.addConnection({
      name: "server1",
      host: "host1",
      port: 22,
      username: "user1",
    });
    await configManager.addConnection({
      name: "server2",
      host: "host2",
      port: 22,
      username: "user2",
    });

    const connections = await configManager.getConnections();
    expect(connections.length).toBe(2);
  });

  test("should remove connection", async () => {
    await configManager.addConnection({
      name: "to-delete",
      host: "host",
      port: 22,
      username: "user",
    });

    const deleted = await configManager.removeConnection("to-delete");
    expect(deleted).toBe(true);

    const retrieved = await configManager.getConnection("to-delete");
    expect(retrieved).toBeUndefined();
  });

  test("should update connection with same name", async () => {
    await configManager.addConnection({
      name: "server",
      host: "old-host",
      port: 22,
      username: "user",
    });

    await configManager.addConnection({
      name: "server",
      host: "new-host",
      port: 22,
      username: "user",
    });

    const connections = await configManager.getConnections();
    expect(connections.length).toBe(1);
    expect(connections[0].host).toBe("new-host");
  });

  test("should save and load last connection", async () => {
    await configManager.addConnection({
      name: "last-used",
      host: "host",
      port: 22,
      username: "user",
    });

    await configManager.setLastConnection("last-used");
    const lastConn = await configManager.getLastConnection();

    expect(lastConn).toBeDefined();
    expect(lastConn?.name).toBe("last-used");
  });

  test("should update remote debug settings", async () => {
    await configManager.updateRemoteDebugSettings({
      remotePort: 9333,
      headless: true,
    });

    const settings = await configManager.getRemoteDebugSettings();
    expect(settings.remotePort).toBe(9333);
    expect(settings.headless).toBe(true);
    expect(settings.remoteHost).toBe("127.0.0.1"); // default
  });

  test("should persist config across instances", async () => {
    await configManager.addConnection({
      name: "persist-test",
      host: "host",
      port: 22,
      username: "user",
    });

    // Create new instance with same directory
    const newManager = new ConfigManager(testDir);
    const retrieved = await newManager.getConnection("persist-test");

    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe("persist-test");
  });
});
