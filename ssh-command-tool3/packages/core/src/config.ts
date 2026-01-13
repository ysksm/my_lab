import { homedir } from "os";
import { join } from "path";
import { mkdir } from "fs/promises";

export interface SavedConnection {
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKeyPath?: string;
}

export interface SavedUrl {
  name: string;
  url: string;
}

export interface RemoteDebugSettings {
  remotePort: number;
  localPort: number;
  remoteHost: string;
  userDataDir: string;
  headless: boolean;
  browserPath: string;
  debuggingAddress: string;
}

export interface AppConfig {
  connections: SavedConnection[];
  lastConnection?: string; // name of last used connection
  remoteDebug: RemoteDebugSettings;
  savedUrls: SavedUrl[];
}

const DEFAULT_CONFIG: AppConfig = {
  connections: [],
  remoteDebug: {
    remotePort: 9222,
    localPort: 0,
    remoteHost: "127.0.0.1",
    userDataDir: "~/.remote-debug-profile",
    headless: false,
    browserPath: "",
    debuggingAddress: "",
  },
  savedUrls: [],
};

export class ConfigManager {
  private configDir: string;
  private configPath: string;
  private config: AppConfig | null = null;

  constructor(configDir?: string) {
    this.configDir = configDir || join(homedir(), ".ssh-command-tool");
    this.configPath = join(this.configDir, "config.json");
  }

  async load(): Promise<AppConfig> {
    if (this.config) {
      return this.config;
    }

    try {
      const file = Bun.file(this.configPath);
      if (await file.exists()) {
        const data = await file.json();
        this.config = { ...DEFAULT_CONFIG, ...data };
      } else {
        this.config = { ...DEFAULT_CONFIG };
      }
    } catch (err) {
      console.error("Failed to load config, using defaults:", err);
      this.config = { ...DEFAULT_CONFIG };
    }

    return this.config;
  }

  async save(): Promise<void> {
    if (!this.config) {
      return;
    }

    try {
      await mkdir(this.configDir, { recursive: true });
      await Bun.write(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (err) {
      console.error("Failed to save config:", err);
      throw err;
    }
  }

  async getConnections(): Promise<SavedConnection[]> {
    const config = await this.load();
    return config.connections;
  }

  async addConnection(connection: SavedConnection): Promise<void> {
    const config = await this.load();

    // Remove existing connection with same name
    config.connections = config.connections.filter(c => c.name !== connection.name);
    config.connections.push(connection);

    await this.save();
  }

  async removeConnection(name: string): Promise<boolean> {
    const config = await this.load();
    const initialLength = config.connections.length;
    config.connections = config.connections.filter(c => c.name !== name);

    if (config.connections.length < initialLength) {
      await this.save();
      return true;
    }
    return false;
  }

  async getConnection(name: string): Promise<SavedConnection | undefined> {
    const config = await this.load();
    return config.connections.find(c => c.name === name);
  }

  async setLastConnection(name: string): Promise<void> {
    const config = await this.load();
    config.lastConnection = name;
    await this.save();
  }

  async getLastConnection(): Promise<SavedConnection | undefined> {
    const config = await this.load();
    if (config.lastConnection) {
      return config.connections.find(c => c.name === config.lastConnection);
    }
    return undefined;
  }

  async getRemoteDebugSettings(): Promise<RemoteDebugSettings> {
    const config = await this.load();
    return config.remoteDebug;
  }

  async updateRemoteDebugSettings(settings: Partial<RemoteDebugSettings>): Promise<void> {
    const config = await this.load();
    config.remoteDebug = { ...config.remoteDebug, ...settings };
    await this.save();
  }

  async getUrls(): Promise<SavedUrl[]> {
    const config = await this.load();
    return config.savedUrls || [];
  }

  async addUrl(savedUrl: SavedUrl): Promise<void> {
    const config = await this.load();
    if (!config.savedUrls) {
      config.savedUrls = [];
    }

    // Remove existing URL with same name
    config.savedUrls = config.savedUrls.filter(u => u.name !== savedUrl.name);
    config.savedUrls.push(savedUrl);

    await this.save();
  }

  async removeUrl(name: string): Promise<boolean> {
    const config = await this.load();
    if (!config.savedUrls) {
      return false;
    }

    const initialLength = config.savedUrls.length;
    config.savedUrls = config.savedUrls.filter(u => u.name !== name);

    if (config.savedUrls.length < initialLength) {
      await this.save();
      return true;
    }
    return false;
  }

  async getUrl(name: string): Promise<SavedUrl | undefined> {
    const config = await this.load();
    return config.savedUrls?.find(u => u.name === name);
  }
}

// Singleton instance for convenience
let defaultManager: ConfigManager | null = null;

export function getConfigManager(): ConfigManager {
  if (!defaultManager) {
    defaultManager = new ConfigManager();
  }
  return defaultManager;
}
