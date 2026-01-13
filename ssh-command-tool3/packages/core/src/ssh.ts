import { Client, type ConnectConfig, type ClientChannel } from "ssh2";

export interface SshConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export class SshConnection {
  private client: Client | null = null;
  private config: SshConfig | null = null;

  get isConnected(): boolean {
    return this.client !== null;
  }

  get connectionInfo(): SshConfig | null {
    return this.config;
  }

  async connect(config: SshConfig): Promise<void> {
    if (this.client) {
      await this.disconnect();
    }

    return new Promise((resolve, reject) => {
      const client = new Client();

      const connectConfig: ConnectConfig = {
        host: config.host,
        port: config.port,
        username: config.username,
      };

      if (config.password) {
        connectConfig.password = config.password;
      } else if (config.privateKey) {
        connectConfig.privateKey = config.privateKey;
      }

      client.on("ready", () => {
        this.client = client;
        this.config = config;
        resolve();
      });

      client.on("error", (err) => {
        reject(new Error(`SSH connection failed: ${err.message}`));
      });

      client.connect(connectConfig);
    });
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      this.client.end();
      this.client = null;
      this.config = null;
    }
  }

  async executeCommand(command: string, timeoutMs: number = 30000): Promise<CommandResult> {
    if (!this.client) {
      throw new Error("Not connected to SSH server");
    }

    return new Promise((resolve, reject) => {
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          reject(new Error(`Command timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);

      this.client!.exec(command, (err, stream) => {
        if (err) {
          clearTimeout(timeout);
          if (!resolved) {
            resolved = true;
            reject(new Error(`Command execution failed: ${err.message}`));
          }
          return;
        }

        let stdout = "";
        let stderr = "";

        const done = (code: number) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve({
              stdout,
              stderr,
              exitCode: code ?? 0,
            });
          }
        };

        stream.on("close", (code: number) => {
          done(code);
        });

        stream.on("exit", (code: number) => {
          done(code);
        });

        stream.on("data", (data: Buffer) => {
          stdout += data.toString();
        });

        stream.stderr.on("data", (data: Buffer) => {
          stderr += data.toString();
        });

        stream.on("error", (err: Error) => {
          clearTimeout(timeout);
          if (!resolved) {
            resolved = true;
            reject(new Error(`Stream error: ${err.message}`));
          }
        });
      });
    });
  }

  async forwardPort(
    localPort: number,
    remoteHost: string,
    remotePort: number
  ): Promise<{ close: () => void; port: number }> {
    if (!this.client) {
      throw new Error("Not connected to SSH server");
    }

    const client = this.client;

    interface SocketData {
      channel?: ClientChannel;
      pendingData: Buffer[];
      ready: boolean;
    }

    const server = Bun.listen<SocketData>({
      hostname: "127.0.0.1",
      port: localPort,
      socket: {
        open: (socket) => {
          socket.data = { pendingData: [], ready: false };

          client.forwardOut(
            "127.0.0.1",
            localPort,
            remoteHost,
            remotePort,
            (err, channel) => {
              if (err) {
                console.error("Forward error:", err.message);
                socket.end();
                return;
              }

              socket.data.channel = channel;
              socket.data.ready = true;

              // Send any pending data
              for (const data of socket.data.pendingData) {
                channel.write(data);
              }
              socket.data.pendingData = [];

              channel.on("data", (data: Buffer) => {
                socket.write(data);
              });

              channel.on("close", () => {
                socket.end();
              });

              channel.on("error", (err: Error) => {
                console.error("Channel error:", err.message);
                socket.end();
              });
            }
          );
        },
        data: (socket, data) => {
          if (socket.data.ready && socket.data.channel) {
            socket.data.channel.write(data);
          } else {
            // Queue data until channel is ready
            socket.data.pendingData.push(Buffer.from(data));
          }
        },
        close: (socket) => {
          if (socket.data.channel) {
            socket.data.channel.close();
          }
        },
        error: (socket, err) => {
          console.error("Socket error:", err);
        },
      },
    });

    return {
      close: () => {
        server.stop();
      },
      port: server.port,
    };
  }
}
