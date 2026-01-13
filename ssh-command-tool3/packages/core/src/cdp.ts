export interface DevToolsInfo {
  browser?: string;
  webSocketDebuggerUrl?: string;
  devtoolsFrontendUrl?: string;
  devtoolsUrl?: string;
}

export interface ChromeTarget {
  id: string;
  type: string;
  title: string;
  url: string;
  webSocketDebuggerUrl?: string;
  devtoolsFrontendUrl?: string;
}

export async function fetchDevToolsInfo(
  host: string,
  port: number
): Promise<DevToolsInfo> {
  const url = `http://${host}:${port}/json/version`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    const frontendPath = data.devtoolsFrontendUrl as string | undefined;
    const devtoolsUrl = frontendPath
      ? `http://${host}:${port}${frontendPath}`
      : undefined;

    return {
      browser: data.Browser,
      webSocketDebuggerUrl: data.webSocketDebuggerUrl,
      devtoolsFrontendUrl: frontendPath,
      devtoolsUrl,
    };
  } catch (err) {
    throw new Error(
      `Failed to fetch DevTools info from ${host}:${port}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

export async function fetchTargets(
  host: string,
  port: number
): Promise<ChromeTarget[]> {
  const url = `http://${host}:${port}/json/list`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data as ChromeTarget[];
  } catch (err) {
    throw new Error(
      `Failed to fetch targets from ${host}:${port}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

export interface RemoteDebugOptions {
  remotePort: number;
  userDataDir?: string;
  headless?: boolean;
  browserPath?: string;
  extraArgs?: string[];
  debuggingAddress?: string;
}

export function buildChromeCommand(
  browserPath: string,
  options: RemoteDebugOptions
): string {
  const args: string[] = [
    `--remote-debugging-port=${options.remotePort}`,
  ];

  if (options.userDataDir) {
    args.push(`--user-data-dir=${options.userDataDir}`);
  }

  if (options.debuggingAddress) {
    args.push(`--remote-debugging-address=${options.debuggingAddress}`);
  }

  if (options.headless) {
    args.push("--headless=new");
  }

  if (options.extraArgs) {
    args.push(...options.extraArgs);
  }

  return `${browserPath} ${args.join(" ")}`;
}
