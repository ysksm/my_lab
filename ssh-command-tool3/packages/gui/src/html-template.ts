export const htmlContent = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SSH Command Tool</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a2e;
      color: #eee;
      min-height: 100vh;
    }
    .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
    h1 { color: #4fc3f7; margin-bottom: 20px; }
    h2 { color: #81d4fa; margin: 15px 0 10px; font-size: 1.1em; }

    .grid { display: grid; grid-template-columns: 300px 1fr 350px; gap: 20px; }
    .panel { background: #16213e; border-radius: 8px; padding: 15px; }

    .status-bar {
      display: flex; gap: 20px; margin-bottom: 20px; padding: 10px 15px;
      background: #0f3460; border-radius: 8px;
    }
    .status-item { display: flex; align-items: center; gap: 8px; }
    .status-dot { width: 10px; height: 10px; border-radius: 50%; }
    .status-dot.on { background: #4caf50; }
    .status-dot.off { background: #666; }

    input, select, button {
      padding: 8px 12px; border-radius: 4px; border: 1px solid #333;
      background: #1a1a2e; color: #eee; font-size: 14px;
    }
    input:focus, select:focus { outline: none; border-color: #4fc3f7; }
    button {
      background: #4fc3f7; color: #000; border: none; cursor: pointer;
      font-weight: 500; transition: background 0.2s;
    }
    button:hover { background: #81d4fa; }
    button:disabled { background: #444; color: #888; cursor: not-allowed; }
    button.danger { background: #f44336; color: #fff; }
    button.danger:hover { background: #e53935; }
    button.secondary { background: #555; color: #eee; }
    button.secondary:hover { background: #666; }
    button.small { padding: 4px 8px; font-size: 12px; }

    .form-group { margin-bottom: 12px; }
    .form-group label { display: block; margin-bottom: 4px; color: #aaa; font-size: 12px; }
    .form-group input, .form-group select { width: 100%; }

    .btn-group { display: flex; gap: 8px; flex-wrap: wrap; }

    .connection-list { max-height: 150px; overflow-y: auto; }
    .connection-item {
      padding: 8px; margin: 4px 0; background: #0f3460; border-radius: 4px;
      cursor: pointer; display: flex; justify-content: space-between; align-items: center;
    }
    .connection-item:hover { background: #1a4a7a; }
    .connection-item.active { border-left: 3px solid #4fc3f7; }

    .target-list { max-height: 200px; overflow-y: auto; }
    .target-item {
      padding: 8px; margin: 4px 0; background: #0f3460; border-radius: 4px;
      cursor: pointer; font-size: 13px;
    }
    .target-item:hover { background: #1a4a7a; }
    .target-item.page { border-left: 3px solid #4caf50; }
    .target-type { color: #4fc3f7; font-weight: 500; }
    .target-type.page { color: #4caf50; }
    .target-url { color: #888; font-size: 11px; word-break: break-all; }

    .screenshot {
      max-width: 100%; border-radius: 4px; border: 1px solid #333;
      margin-top: 10px;
    }

    .metrics { font-family: monospace; font-size: 12px; }
    .metric-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #333; }
    .metric-name { color: #aaa; }
    .metric-value { color: #4fc3f7; }

    .log {
      background: #0a0a15; padding: 10px; border-radius: 4px;
      font-family: monospace; font-size: 12px; max-height: 200px; overflow-y: auto;
    }
    .log-entry { padding: 2px 0; border-bottom: 1px solid #222; }
    .log-entry.error { color: #f44336; }
    .log-entry.success { color: #4caf50; }

    .toggle-group { display: flex; gap: 4px; }
    .toggle-btn { flex: 1; }
    .toggle-btn.active { background: #4caf50; }

    .network-table { font-size: 12px; width: 100%; }
    .network-table th, .network-table td { padding: 6px; text-align: left; border-bottom: 1px solid #333; }
    .network-table th { color: #aaa; }
    .network-table .method { color: #4fc3f7; }
    .network-table .status-200 { color: #4caf50; }
    .network-table .status-error { color: #f44336; }

    .url-input { display: flex; gap: 8px; }
    .url-input input { flex: 1; }

    .metrics-monitor { margin-top: 10px; }
    .metric-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .metric-label { width: 70px; font-size: 11px; color: #aaa; }
    .metric-bar-bg { flex: 1; height: 16px; background: #1a1a2e; border-radius: 8px; overflow: hidden; }
    .metric-bar-fill { height: 100%; transition: width 0.3s ease; border-radius: 8px; }
    .metric-bar-fill.cpu { background: linear-gradient(90deg, #4caf50, #ff9800); }
    .metric-bar-fill.heap { background: linear-gradient(90deg, #2196f3, #9c27b0); }
    .metric-bar-fill.dom { background: linear-gradient(90deg, #00bcd4, #009688); }
    .metric-bar-fill.documents { background: linear-gradient(90deg, #8bc34a, #cddc39); }
    .metric-bar-fill.frames { background: linear-gradient(90deg, #ffeb3b, #ffc107); }
    .metric-bar-fill.listeners { background: linear-gradient(90deg, #ff9800, #ff5722); }
    .metric-bar-fill.layout { background: linear-gradient(90deg, #ff5722, #e91e63); }
    .metric-bar-fill.style { background: linear-gradient(90deg, #673ab7, #3f51b5); }
    .metric-value { width: 60px; font-size: 11px; color: #4fc3f7; text-align: right; font-family: monospace; }
    .metric-checkbox { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #aaa; cursor: pointer; }
    .metric-checkbox input { width: 14px; height: 14px; cursor: pointer; }
    .metric-checkbox:hover { color: #fff; }

    .graph-item { margin-bottom: 8px; }
    .graph-label { font-size: 10px; color: #888; margin-bottom: 2px; display: flex; justify-content: space-between; }
    .graph-label .value { color: #4fc3f7; font-family: monospace; }
    #graphs-container { max-height: 400px; overflow-y: auto; }

    .session-list { max-height: 150px; overflow-y: auto; margin-top: 8px; }
    .session-item {
      padding: 6px 8px; margin: 4px 0; background: #0f3460; border-radius: 4px;
      cursor: pointer; font-size: 11px; display: flex; justify-content: space-between; align-items: center;
    }
    .session-item:hover { background: #1a4a7a; }
    .session-item .session-info { flex: 1; }
    .session-item .session-time { color: #888; }
    .session-item .session-count { color: #4fc3f7; font-family: monospace; }

    @media (max-width: 1200px) {
      .grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>SSH Command Tool</h1>

    <div class="status-bar">
      <div class="status-item">
        <div class="status-dot" id="ssh-status"></div>
        <span>SSH: <span id="ssh-info">Not connected</span></span>
      </div>
      <div class="status-item">
        <div class="status-dot" id="forward-status"></div>
        <span>Forward: <span id="forward-info">Inactive</span></span>
      </div>
      <div class="status-item">
        <div class="status-dot" id="chrome-status"></div>
        <span>Chrome: <span id="chrome-info">Not running</span></span>
      </div>
      <div class="status-item">
        <div class="status-dot" id="cdp-status"></div>
        <span>CDP: <span id="cdp-info">Not connected</span></span>
      </div>
    </div>

    <div class="grid">
      <!-- Left Panel: Connection -->
      <div class="panel">
        <h2>SSH Connection</h2>

        <div id="saved-connections">
          <h3 style="font-size: 12px; color: #aaa; margin-bottom: 8px;">Saved Connections</h3>
          <div class="connection-list" id="connection-list"></div>
        </div>

        <div id="connect-form" style="margin-top: 15px;">
          <div class="form-group">
            <label>Host</label>
            <input type="text" id="host" placeholder="192.168.1.100">
          </div>
          <div class="form-group">
            <label>Username</label>
            <input type="text" id="username" placeholder="user">
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" id="password">
          </div>
          <div class="form-group">
            <label>Port</label>
            <input type="number" id="port" value="22">
          </div>
          <div class="btn-group">
            <button onclick="connect()" id="btn-connect">Connect</button>
            <button onclick="disconnect()" id="btn-disconnect" class="danger" disabled>Disconnect</button>
          </div>
          <div style="margin-top: 10px;">
            <button onclick="saveConnection()" class="secondary small" id="btn-save-conn" disabled>Save Connection</button>
          </div>
        </div>

        <h2>Chrome</h2>
        <div class="btn-group">
          <button onclick="startChrome()" id="btn-chrome-start" disabled>Start Chrome</button>
          <button onclick="stopChrome()" id="btn-chrome-stop" class="danger" disabled>Stop</button>
        </div>

        <h2>Port Forward</h2>
        <div class="btn-group">
          <button onclick="startForward()" id="btn-forward-start" disabled>Start Forward</button>
          <button onclick="stopForward()" id="btn-forward-stop" class="danger" disabled>Stop</button>
        </div>

        <h2>CDP Connection</h2>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <p style="font-size: 11px; color: #888;">Click a target to connect:</p>
          <button onclick="loadTargets()" class="small secondary" id="btn-refresh-targets" disabled>Refresh</button>
        </div>
        <div id="targets-container" style="display: none;">
          <div class="target-list" id="target-list"></div>
        </div>
        <div class="btn-group" style="margin-top: 8px;">
          <button onclick="connectCdp()" id="btn-cdp-connect" disabled>Auto Connect (Page)</button>
          <button onclick="disconnectCdp()" id="btn-cdp-disconnect" class="danger" disabled>Disconnect</button>
        </div>
      </div>

      <!-- Center Panel: Main Actions -->
      <div class="panel">
        <h2>Navigation</h2>
        <div style="margin-bottom: 10px;">
          <div style="display: flex; gap: 8px; margin-bottom: 8px;">
            <select id="saved-urls" style="flex: 1;" onchange="onUrlSelect()">
              <option value="">-- Select saved URL --</option>
            </select>
            <button onclick="deleteSelectedUrl()" class="small danger" id="btn-url-delete" disabled>Delete</button>
          </div>
        </div>
        <div class="url-input">
          <input type="text" id="url" placeholder="https://www.yahoo.co.jp">
          <button onclick="navigate()" id="btn-navigate" disabled>Go</button>
          <button onclick="reload()" id="btn-reload" disabled>Reload</button>
          <button onclick="saveCurrentUrl()" class="small secondary" id="btn-url-save">Save</button>
        </div>

        <h2>Screenshot</h2>
        <button onclick="takeScreenshot()" id="btn-screenshot" disabled>Take Screenshot</button>
        <div id="screenshot-container"></div>

        <h2>Network Recording</h2>
        <div class="btn-group">
          <button onclick="startNetwork()" id="btn-network-start" disabled>Start</button>
          <button onclick="stopNetwork()" id="btn-network-stop" class="danger" disabled>Stop</button>
          <button onclick="saveNetwork()" id="btn-network-save" class="secondary" disabled>Save JSON</button>
        </div>
        <div id="network-results" style="margin-top: 10px; max-height: 300px; overflow: auto;"></div>

        <h2>Performance</h2>
        <div class="btn-group">
          <button onclick="startPerf()" id="btn-perf-start" disabled>Start Recording</button>
          <button onclick="stopPerf()" id="btn-perf-stop" class="danger" disabled>Stop</button>
          <button onclick="getMetrics()" id="btn-perf-metrics" disabled>Get Metrics</button>
          <button onclick="savePerf()" id="btn-perf-save" class="secondary" disabled>Save JSON</button>
        </div>
        <div id="perf-results" class="metrics" style="margin-top: 10px;"></div>
      </div>

      <!-- Right Panel: Tools -->
      <div class="panel">
        <h2>Performance Monitor</h2>
        <div class="btn-group" style="margin-bottom: 10px;">
          <button onclick="startMetricsMonitor()" id="btn-metrics-start" disabled>Start Monitor</button>
          <button onclick="stopMetricsMonitor()" id="btn-metrics-stop" class="danger" disabled>Stop</button>
        </div>
        <div style="margin-bottom: 10px;">
          <label class="metric-checkbox"><input type="checkbox" id="chk-jaeger-metrics"><span>Send to Jaeger</span></label>
        </div>
        <div class="metric-checkboxes" style="margin-bottom: 10px; display: flex; flex-wrap: wrap; gap: 8px;">
          <label class="metric-checkbox"><input type="checkbox" id="chk-cpu" checked onchange="updateMetricVisibility()"><span>CPU</span></label>
          <label class="metric-checkbox"><input type="checkbox" id="chk-heap" checked onchange="updateMetricVisibility()"><span>JS Heap</span></label>
          <label class="metric-checkbox"><input type="checkbox" id="chk-nodes" checked onchange="updateMetricVisibility()"><span>DOM Nodes</span></label>
          <label class="metric-checkbox"><input type="checkbox" id="chk-documents" onchange="updateMetricVisibility()"><span>Documents</span></label>
          <label class="metric-checkbox"><input type="checkbox" id="chk-frames" onchange="updateMetricVisibility()"><span>Frames</span></label>
          <label class="metric-checkbox"><input type="checkbox" id="chk-listeners" onchange="updateMetricVisibility()"><span>Listeners</span></label>
          <label class="metric-checkbox"><input type="checkbox" id="chk-layouts" checked onchange="updateMetricVisibility()"><span>Layouts/s</span></label>
          <label class="metric-checkbox"><input type="checkbox" id="chk-styles" checked onchange="updateMetricVisibility()"><span>Styles/s</span></label>
        </div>
        <div id="metrics-monitor" class="metrics-monitor">
          <div class="metric-bar" id="row-cpu">
            <span class="metric-label">CPU</span>
            <div class="metric-bar-bg"><div class="metric-bar-fill cpu" id="cpu-bar" style="width: 0%"></div></div>
            <span class="metric-value" id="cpu-value">0%</span>
          </div>
          <div class="metric-bar" id="row-heap">
            <span class="metric-label">JS Heap</span>
            <div class="metric-bar-bg"><div class="metric-bar-fill heap" id="heap-bar" style="width: 0%"></div></div>
            <span class="metric-value" id="heap-value">0 MB</span>
          </div>
          <div class="metric-bar" id="row-nodes">
            <span class="metric-label">DOM Nodes</span>
            <div class="metric-bar-bg"><div class="metric-bar-fill dom" id="dom-bar" style="width: 0%"></div></div>
            <span class="metric-value" id="dom-value">0</span>
          </div>
          <div class="metric-bar" id="row-documents" style="display: none;">
            <span class="metric-label">Documents</span>
            <div class="metric-bar-bg"><div class="metric-bar-fill documents" id="documents-bar" style="width: 0%"></div></div>
            <span class="metric-value" id="documents-value">0</span>
          </div>
          <div class="metric-bar" id="row-frames" style="display: none;">
            <span class="metric-label">Frames</span>
            <div class="metric-bar-bg"><div class="metric-bar-fill frames" id="frames-bar" style="width: 0%"></div></div>
            <span class="metric-value" id="frames-value">0</span>
          </div>
          <div class="metric-bar" id="row-listeners" style="display: none;">
            <span class="metric-label">Listeners</span>
            <div class="metric-bar-bg"><div class="metric-bar-fill listeners" id="listeners-bar" style="width: 0%"></div></div>
            <span class="metric-value" id="listeners-value">0</span>
          </div>
          <div class="metric-bar" id="row-layouts">
            <span class="metric-label">Layouts/s</span>
            <div class="metric-bar-bg"><div class="metric-bar-fill layout" id="layout-bar" style="width: 0%"></div></div>
            <span class="metric-value" id="layout-value">0</span>
          </div>
          <div class="metric-bar" id="row-styles">
            <span class="metric-label">Styles/s</span>
            <div class="metric-bar-bg"><div class="metric-bar-fill style" id="style-bar" style="width: 0%"></div></div>
            <span class="metric-value" id="style-value">0</span>
          </div>
        </div>

        <div style="margin-top: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
            <span style="font-size: 11px; color: #aaa;">Graphs (60s)</span>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <label class="metric-checkbox"><input type="checkbox" id="graph-cpu" checked onchange="updateGraphVisibility()"><span>CPU</span></label>
              <label class="metric-checkbox"><input type="checkbox" id="graph-heap" checked onchange="updateGraphVisibility()"><span>Heap</span></label>
              <label class="metric-checkbox"><input type="checkbox" id="graph-nodes" onchange="updateGraphVisibility()"><span>Nodes</span></label>
              <label class="metric-checkbox"><input type="checkbox" id="graph-layouts" onchange="updateGraphVisibility()"><span>Layouts</span></label>
              <label class="metric-checkbox"><input type="checkbox" id="graph-styles" onchange="updateGraphVisibility()"><span>Styles</span></label>
            </div>
          </div>
          <div id="graphs-container">
            <div class="graph-item" id="graph-container-cpu">
              <div class="graph-label">CPU %</div>
              <canvas id="graph-canvas-cpu" width="320" height="80" style="background: #0a0a15; border-radius: 4px; width: 100%;"></canvas>
            </div>
            <div class="graph-item" id="graph-container-heap">
              <div class="graph-label">JS Heap (MB)</div>
              <canvas id="graph-canvas-heap" width="320" height="80" style="background: #0a0a15; border-radius: 4px; width: 100%;"></canvas>
            </div>
            <div class="graph-item" id="graph-container-nodes" style="display: none;">
              <div class="graph-label">DOM Nodes</div>
              <canvas id="graph-canvas-nodes" width="320" height="80" style="background: #0a0a15; border-radius: 4px; width: 100%;"></canvas>
            </div>
            <div class="graph-item" id="graph-container-layouts" style="display: none;">
              <div class="graph-label">Layouts/s</div>
              <canvas id="graph-canvas-layouts" width="320" height="80" style="background: #0a0a15; border-radius: 4px; width: 100%;"></canvas>
            </div>
            <div class="graph-item" id="graph-container-styles" style="display: none;">
              <div class="graph-label">Styles/s</div>
              <canvas id="graph-canvas-styles" width="320" height="80" style="background: #0a0a15; border-radius: 4px; width: 100%;"></canvas>
            </div>
          </div>
        </div>

        <h2>CPU Throttling</h2>
        <div class="btn-group">
          <button onclick="setCpuThrottle(1)" id="btn-cpu-1" disabled>1x</button>
          <button onclick="setCpuThrottle(2)" id="btn-cpu-2" disabled>2x</button>
          <button onclick="setCpuThrottle(4)" id="btn-cpu-4" disabled>4x</button>
          <button onclick="setCpuThrottle(6)" id="btn-cpu-6" disabled>6x</button>
        </div>

        <h2>Rendering Overlay</h2>
        <div style="margin-bottom: 8px;">
          <label style="color: #aaa; font-size: 12px;">FPS Counter</label>
          <div class="toggle-group">
            <button onclick="setFps(true)" id="btn-fps-on" class="toggle-btn" disabled>ON</button>
            <button onclick="setFps(false)" id="btn-fps-off" class="toggle-btn" disabled>OFF</button>
          </div>
        </div>
        <div style="margin-bottom: 8px;">
          <label style="color: #aaa; font-size: 12px;">Paint Rects</label>
          <div class="toggle-group">
            <button onclick="setPaint(true)" id="btn-paint-on" class="toggle-btn" disabled>ON</button>
            <button onclick="setPaint(false)" id="btn-paint-off" class="toggle-btn" disabled>OFF</button>
          </div>
        </div>
        <div>
          <label style="color: #aaa; font-size: 12px;">Layout Shift</label>
          <div class="toggle-group">
            <button onclick="setLayoutShift(true)" id="btn-layout-on" class="toggle-btn" disabled>ON</button>
            <button onclick="setLayoutShift(false)" id="btn-layout-off" class="toggle-btn" disabled>OFF</button>
          </div>
        </div>

        <h2>Metrics History</h2>
        <div class="btn-group" style="margin-bottom: 8px;">
          <button onclick="loadSessionsList()" class="small secondary">Load Sessions</button>
          <button onclick="exportCurrentSession()" class="small secondary" id="btn-export-session" disabled>Export Current</button>
        </div>
        <div id="sessions-container" style="display: none;">
          <div class="session-list" id="session-list"></div>
        </div>
        <div id="history-viewer" style="display: none; margin-top: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
            <span style="font-size: 11px; color: #aaa;" id="history-title">Historical Data</span>
            <button onclick="closeHistoryViewer()" class="small danger">Close</button>
          </div>
          <canvas id="history-graph" width="320" height="120" style="background: #0a0a15; border-radius: 4px; width: 100%;"></canvas>
          <div style="margin-top: 5px; display: flex; gap: 8px;">
            <select id="history-metric" style="font-size: 11px; padding: 2px 5px; flex: 1;" onchange="drawHistoryGraph()">
              <option value="cpu">CPU %</option>
              <option value="heap" selected>JS Heap (MB)</option>
              <option value="nodes">DOM Nodes</option>
              <option value="layouts">Layouts/s</option>
              <option value="styles">Styles/s</option>
            </select>
          </div>
        </div>

        <h2>Jaeger Telemetry</h2>
        <div class="form-group">
          <label>Endpoint</label>
          <input type="text" id="jaeger-endpoint" value="http://localhost:4318/v1/traces" style="font-size: 11px;">
        </div>
        <div class="btn-group">
          <button onclick="enableTelemetry()" id="btn-telemetry-on">Enable</button>
          <button onclick="disableTelemetry()" id="btn-telemetry-off" class="danger" disabled>Disable</button>
          <button onclick="flushTelemetry()" id="btn-telemetry-flush" class="secondary" disabled>Flush</button>
        </div>
        <div id="telemetry-status" style="margin-top: 8px; font-size: 11px; color: #888;"></div>

        <h2>Log</h2>
        <div class="log" id="log"></div>
      </div>
    </div>
  </div>

  <script>
    // API call helper
    async function api(endpoint, body = {}) {
      try {
        const res = await fetch('/api/' + endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        return data;
      } catch (e) {
        log(e.message, 'error');
        throw e;
      }
    }

    // Logging
    function log(msg, type = '') {
      const logEl = document.getElementById('log');
      const entry = document.createElement('div');
      entry.className = 'log-entry ' + type;
      entry.textContent = new Date().toLocaleTimeString() + ' - ' + msg;
      logEl.insertBefore(entry, logEl.firstChild);
    }

    // Update UI based on status
    async function updateStatus() {
      try {
        const status = await api('status');

        // SSH
        document.getElementById('ssh-status').className = 'status-dot ' + (status.ssh.connected ? 'on' : 'off');
        document.getElementById('ssh-info').textContent = status.ssh.connected
          ? status.ssh.info.username + '@' + status.ssh.info.host
          : 'Not connected';
        document.getElementById('btn-connect').disabled = status.ssh.connected;
        document.getElementById('btn-disconnect').disabled = !status.ssh.connected;
        document.getElementById('btn-save-conn').disabled = !status.ssh.connected;
        document.getElementById('btn-chrome-start').disabled = !status.ssh.connected;
        document.getElementById('btn-chrome-stop').disabled = !status.chrome.running;
        document.getElementById('btn-forward-start').disabled = !status.ssh.connected || status.portForward.active;
        document.getElementById('btn-forward-stop').disabled = !status.portForward.active;

        // Forward
        document.getElementById('forward-status').className = 'status-dot ' + (status.portForward.active ? 'on' : 'off');
        document.getElementById('forward-info').textContent = status.portForward.active
          ? 'localhost:' + status.portForward.localPort
          : 'Inactive';

        // Chrome
        document.getElementById('chrome-status').className = 'status-dot ' + (status.chrome.running ? 'on' : 'off');
        document.getElementById('chrome-info').textContent = status.chrome.running
          ? 'PID: ' + status.chrome.pid
          : 'Not running';

        // CDP
        document.getElementById('cdp-status').className = 'status-dot ' + (status.cdp.connected ? 'on' : 'off');
        document.getElementById('cdp-info').textContent = status.cdp.connected ? 'Connected' : 'Not connected';
        document.getElementById('btn-cdp-connect').disabled = !status.portForward.active || status.cdp.connected;
        document.getElementById('btn-cdp-disconnect').disabled = !status.cdp.connected;

        // CDP dependent buttons
        const cdpButtons = ['btn-navigate', 'btn-reload', 'btn-screenshot',
          'btn-network-start', 'btn-network-stop', 'btn-perf-start', 'btn-perf-stop', 'btn-perf-metrics',
          'btn-cpu-1', 'btn-cpu-2', 'btn-cpu-4', 'btn-cpu-6',
          'btn-fps-on', 'btn-fps-off', 'btn-paint-on', 'btn-paint-off', 'btn-layout-on', 'btn-layout-off'];
        cdpButtons.forEach(id => {
          document.getElementById(id).disabled = !status.cdp.connected;
        });

        // Metrics monitor buttons
        document.getElementById('btn-metrics-start').disabled = !status.cdp.connected || status.metricsMonitor?.active;
        document.getElementById('btn-metrics-stop').disabled = !status.metricsMonitor?.active;

        // Targets
        document.getElementById('btn-refresh-targets').disabled = !status.portForward.active;
        if (status.portForward.active) {
          document.getElementById('targets-container').style.display = 'block';
          loadTargets();
        } else {
          document.getElementById('targets-container').style.display = 'none';
        }

      } catch (e) {}
    }

    // Load saved connections
    async function loadConnections() {
      try {
        const data = await api('connections/list');
        const list = document.getElementById('connection-list');
        list.innerHTML = '';
        data.connections.forEach(conn => {
          const item = document.createElement('div');
          item.className = 'connection-item' + (conn.name === data.lastConnection ? ' active' : '');
          item.innerHTML = '<span>' + conn.name + ' (' + conn.username + '@' + conn.host + ')</span>' +
            '<button class="small danger" onclick="deleteConnection(\\'' + conn.name + '\\')">X</button>';
          item.onclick = (e) => {
            if (e.target.tagName !== 'BUTTON') connectSaved(conn.name);
          };
          list.appendChild(item);
        });
      } catch (e) {}
    }

    // Load saved URLs
    async function loadSavedUrls() {
      try {
        const data = await api('urls/list');
        const select = document.getElementById('saved-urls');
        const currentValue = select.value;
        select.innerHTML = '<option value="">-- Select saved URL --</option>';
        data.urls.forEach(item => {
          const option = document.createElement('option');
          option.value = item.url;
          option.textContent = item.name + ' (' + item.url.substring(0, 40) + (item.url.length > 40 ? '...' : '') + ')';
          option.dataset.name = item.name;
          select.appendChild(option);
        });
        // Restore previous selection if still exists
        if (currentValue) {
          select.value = currentValue;
        }
        updateUrlDeleteButton();
      } catch (e) {}
    }

    function onUrlSelect() {
      const select = document.getElementById('saved-urls');
      const urlInput = document.getElementById('url');
      if (select.value) {
        urlInput.value = select.value;
      }
      updateUrlDeleteButton();
    }

    function updateUrlDeleteButton() {
      const select = document.getElementById('saved-urls');
      document.getElementById('btn-url-delete').disabled = !select.value;
    }

    async function saveCurrentUrl() {
      const urlInput = document.getElementById('url');
      const url = urlInput.value.trim();
      if (!url) {
        log('Please enter a URL first', 'error');
        return;
      }
      const name = prompt('Enter a name for this URL:');
      if (!name) return;
      try {
        await api('urls/add', { name, url });
        log('URL saved: ' + name, 'success');
        loadSavedUrls();
      } catch (e) {
        log('Failed to save URL: ' + e.message, 'error');
      }
    }

    async function deleteSelectedUrl() {
      const select = document.getElementById('saved-urls');
      const selectedOption = select.options[select.selectedIndex];
      if (!selectedOption || !selectedOption.dataset.name) {
        log('No URL selected', 'error');
        return;
      }
      const name = selectedOption.dataset.name;
      if (!confirm('Delete URL "' + name + '"?')) return;
      try {
        await api('urls/delete', { name });
        log('URL deleted: ' + name, 'success');
        loadSavedUrls();
      } catch (e) {
        log('Failed to delete URL: ' + e.message, 'error');
      }
    }

    // Load targets
    async function loadTargets() {
      try {
        const data = await api('cdp/targets');
        const list = document.getElementById('target-list');
        list.innerHTML = '';
        data.targets.forEach(target => {
          const item = document.createElement('div');
          const isPage = target.type === 'page';
          item.className = 'target-item' + (isPage ? ' page' : '');
          item.innerHTML = '<span class="target-type' + (isPage ? ' page' : '') + '">[' + target.type + ']</span> ' + target.title +
            '<div class="target-url">' + target.url + '</div>';
          item.onclick = () => connectCdpTarget(target.id);
          list.appendChild(item);
        });
      } catch (e) {}
    }

    // Actions
    async function connect() {
      await api('ssh/connect', {
        host: document.getElementById('host').value,
        username: document.getElementById('username').value,
        password: document.getElementById('password').value,
        port: parseInt(document.getElementById('port').value)
      });
      log('SSH connected', 'success');
      updateStatus();
    }

    async function connectSaved(name) {
      await api('ssh/connect-saved', { name });
      log('Connected to ' + name, 'success');
      updateStatus();
    }

    async function disconnect() {
      await api('ssh/disconnect');
      log('Disconnected', 'success');
      updateStatus();
    }

    async function saveConnection() {
      const name = prompt('Connection name:');
      if (!name) return;
      await api('connections/save', {
        name,
        password: document.getElementById('password').value
      });
      log('Connection saved: ' + name, 'success');
      loadConnections();
    }

    async function deleteConnection(name) {
      if (!confirm('Delete ' + name + '?')) return;
      await api('connections/delete', { name });
      log('Connection deleted: ' + name, 'success');
      loadConnections();
    }

    async function startChrome() {
      const data = await api('chrome/start');
      log('Chrome started: PID ' + data.pid, 'success');
      updateStatus();
    }

    async function stopChrome() {
      await api('chrome/stop');
      log('Chrome stopped', 'success');
      updateStatus();
    }

    async function startForward() {
      const data = await api('forward/start');
      log('Port forward started: ' + data.port, 'success');
      updateStatus();
    }

    async function stopForward() {
      await api('forward/stop');
      log('Port forward stopped', 'success');
      updateStatus();
    }

    async function connectCdp() {
      const result = await api('cdp/connect', {});
      log('CDP connected to page target', 'success');
      updateStatus();
    }

    async function connectCdpTarget(targetId) {
      const result = await api('cdp/connect', { targetId });
      log('CDP connected to target', 'success');
      updateStatus();
    }

    async function disconnectCdp() {
      await api('cdp/disconnect');
      log('CDP disconnected', 'success');
      updateStatus();
    }

    async function navigate() {
      const url = document.getElementById('url').value;
      await api('navigate', { url });
      log('Navigated to ' + url, 'success');
    }

    async function reload() {
      await api('reload');
      log('Page reloaded', 'success');
    }

    async function takeScreenshot() {
      const data = await api('screenshot');
      const container = document.getElementById('screenshot-container');
      container.innerHTML = '<img class="screenshot" src="data:image/png;base64,' + data.data + '">';
      log('Screenshot taken', 'success');
    }

    async function startNetwork() {
      await api('network/start');
      log('Network recording started', 'success');
    }

    let lastNetworkData = null;

    async function stopNetwork() {
      const data = await api('network/stop');
      lastNetworkData = data.requests;
      document.getElementById('btn-network-save').disabled = false;
      const container = document.getElementById('network-results');
      let html = '<table class="network-table"><tr><th>Method</th><th>URL</th><th>Status</th><th>Size</th></tr>';
      data.requests.slice(0, 50).forEach(req => {
        const status = req.response?.status || 'pending';
        const statusClass = status >= 200 && status < 300 ? 'status-200' : 'status-error';
        const size = req.encodedDataLength ? (req.encodedDataLength / 1024).toFixed(1) + ' KB' : '-';
        html += '<tr><td class="method">' + req.method + '</td><td>' + req.url.substring(0, 60) + '...</td>' +
          '<td class="' + statusClass + '">' + status + '</td><td>' + size + '</td></tr>';
      });
      html += '</table>';
      if (data.requests.length > 50) html += '<p>... and ' + (data.requests.length - 50) + ' more</p>';
      container.innerHTML = html;
      log('Network recording stopped: ' + data.requests.length + ' requests', 'success');
    }

    async function saveNetwork() {
      const data = await api('network/export');
      downloadJSON(data, 'network-' + getTimestamp() + '.har');
      log('Network data saved as HAR file', 'success');
    }

    let lastPerfData = null;

    async function startPerf() {
      await api('perf/start');
      log('Performance recording started', 'success');
    }

    async function stopPerf() {
      const data = await api('perf/stop');
      lastPerfData = data.entries;
      document.getElementById('btn-perf-save').disabled = false;
      log('Performance recording stopped: ' + data.entries.length + ' samples', 'success');
      if (data.entries.length > 0) showMetrics(data.entries[data.entries.length - 1].metrics);
    }

    async function getMetrics() {
      const data = await api('perf/metrics');
      showMetrics(data.metrics);
      log('Got ' + data.metrics.length + ' metrics', 'success');
    }

    async function savePerf() {
      if (!lastPerfData) {
        log('No performance data to save', 'error');
        return;
      }
      const data = await api('perf/export', { entries: lastPerfData });
      downloadJSON(data, 'trace-' + getTimestamp() + '.json');
      log('Performance trace saved (Open in chrome://tracing)', 'success');
    }

    function downloadJSON(data, filename) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    function getTimestamp() {
      const now = new Date();
      return now.getFullYear() +
        ('0' + (now.getMonth() + 1)).slice(-2) +
        ('0' + now.getDate()).slice(-2) + '-' +
        ('0' + now.getHours()).slice(-2) +
        ('0' + now.getMinutes()).slice(-2) +
        ('0' + now.getSeconds()).slice(-2);
    }

    function showMetrics(metrics) {
      const container = document.getElementById('perf-results');
      let html = '';
      const keyMetrics = ['JSHeapUsedSize', 'JSHeapTotalSize', 'Documents', 'Frames', 'LayoutCount', 'RecalcStyleCount', 'TaskDuration'];
      metrics.filter(m => keyMetrics.includes(m.name)).forEach(m => {
        const value = m.name.includes('Heap') ? (m.value / 1024 / 1024).toFixed(2) + ' MB' : m.value.toFixed(2);
        html += '<div class="metric-row"><span class="metric-name">' + m.name + '</span><span class="metric-value">' + value + '</span></div>';
      });
      container.innerHTML = html;
    }

    async function setCpuThrottle(rate) {
      await api('cpu/throttle', { rate });
      log('CPU throttle set to ' + rate + 'x', 'success');
    }

    async function setFps(show) {
      await api('overlay/fps', { show });
      document.getElementById('btn-fps-on').classList.toggle('active', show);
      document.getElementById('btn-fps-off').classList.toggle('active', !show);
      log('FPS counter ' + (show ? 'enabled' : 'disabled'), 'success');
    }

    async function setPaint(show) {
      await api('overlay/paint', { show });
      document.getElementById('btn-paint-on').classList.toggle('active', show);
      document.getElementById('btn-paint-off').classList.toggle('active', !show);
      log('Paint rects ' + (show ? 'enabled' : 'disabled'), 'success');
    }

    async function setLayoutShift(show) {
      await api('overlay/layout-shift', { show });
      document.getElementById('btn-layout-on').classList.toggle('active', show);
      document.getElementById('btn-layout-off').classList.toggle('active', !show);
      log('Layout shift ' + (show ? 'enabled' : 'disabled'), 'success');
    }

    // Metrics Monitor
    let metricsInterval = null;
    let lastTaskDuration = 0;
    let lastLayoutCount = 0;
    let lastStyleCount = 0;
    let lastMetricsTime = Date.now();

    // Graph data storage (last 120 points = 60 seconds at 500ms interval)
    const graphData = {
      cpu: [],
      heap: [],
      nodes: [],
      layouts: [],
      styles: []
    };
    const MAX_GRAPH_POINTS = 120;

    async function startMetricsMonitor() {
      // Reset tracking values
      lastTaskDuration = 0;
      lastLayoutCount = 0;
      lastStyleCount = 0;
      lastMetricsTime = Date.now();

      // Reset graph data
      Object.keys(graphData).forEach(key => {
        graphData[key] = [];
      });

      const sendToJaeger = document.getElementById('chk-jaeger-metrics').checked;
      const result = await api('metrics/start', { sendToJaeger, saveToStorage: true });

      const msg = sendToJaeger ? 'Metrics monitor started (sending to Jaeger)' : 'Metrics monitor started';
      log(msg + (result.sessionId ? ' [Session: ' + result.sessionId + ']' : ''), 'success');
      document.getElementById('btn-metrics-start').disabled = true;
      document.getElementById('btn-metrics-stop').disabled = false;
      document.getElementById('btn-export-session').disabled = false;

      // Poll metrics every 500ms
      metricsInterval = setInterval(updateMetricsDisplay, 500);
    }

    async function stopMetricsMonitor() {
      const result = await api('metrics/stop');
      const msg = result.sessionId
        ? 'Metrics monitor stopped. Saved ' + result.entryCount + ' entries [Session: ' + result.sessionId + ']'
        : 'Metrics monitor stopped';
      log(msg, 'success');
      document.getElementById('btn-metrics-start').disabled = false;
      document.getElementById('btn-metrics-stop').disabled = true;
      document.getElementById('btn-export-session').disabled = true;

      if (metricsInterval) {
        clearInterval(metricsInterval);
        metricsInterval = null;
      }
    }

    function updateMetricVisibility() {
      document.getElementById('row-cpu').style.display = document.getElementById('chk-cpu').checked ? 'flex' : 'none';
      document.getElementById('row-heap').style.display = document.getElementById('chk-heap').checked ? 'flex' : 'none';
      document.getElementById('row-nodes').style.display = document.getElementById('chk-nodes').checked ? 'flex' : 'none';
      document.getElementById('row-documents').style.display = document.getElementById('chk-documents').checked ? 'flex' : 'none';
      document.getElementById('row-frames').style.display = document.getElementById('chk-frames').checked ? 'flex' : 'none';
      document.getElementById('row-listeners').style.display = document.getElementById('chk-listeners').checked ? 'flex' : 'none';
      document.getElementById('row-layouts').style.display = document.getElementById('chk-layouts').checked ? 'flex' : 'none';
      document.getElementById('row-styles').style.display = document.getElementById('chk-styles').checked ? 'flex' : 'none';
    }

    async function updateMetricsDisplay() {
      try {
        const data = await api('metrics/get');
        if (!data.latest) return;

        const metrics = data.latest.metrics;
        const now = Date.now();
        const elapsed = (now - lastMetricsTime) / 1000;
        lastMetricsTime = now;

        // Find metrics
        const taskDuration = metrics.find(m => m.name === 'TaskDuration')?.value || 0;
        const heapUsed = metrics.find(m => m.name === 'JSHeapUsedSize')?.value || 0;
        const heapTotal = metrics.find(m => m.name === 'JSHeapTotalSize')?.value || 0;
        const documents = metrics.find(m => m.name === 'Documents')?.value || 0;
        const nodes = metrics.find(m => m.name === 'Nodes')?.value || 0;
        const frames = metrics.find(m => m.name === 'Frames')?.value || 0;
        const listeners = metrics.find(m => m.name === 'JSEventListeners')?.value || 0;
        const layoutCount = metrics.find(m => m.name === 'LayoutCount')?.value || 0;
        const styleCount = metrics.find(m => m.name === 'RecalcStyleCount')?.value || 0;

        // Calculate rates (delta / elapsed time)
        const taskDelta = taskDuration - lastTaskDuration;
        const cpuPercent = elapsed > 0 ? Math.min((taskDelta / elapsed) * 100, 100) : 0;
        lastTaskDuration = taskDuration;

        const layoutsPerSec = elapsed > 0 ? Math.max(0, (layoutCount - lastLayoutCount) / elapsed) : 0;
        const stylesPerSec = elapsed > 0 ? Math.max(0, (styleCount - lastStyleCount) / elapsed) : 0;
        lastLayoutCount = layoutCount;
        lastStyleCount = styleCount;

        // Update CPU (using delta-based calculation)
        document.getElementById('cpu-bar').style.width = cpuPercent + '%';
        document.getElementById('cpu-value').textContent = cpuPercent.toFixed(0) + '%';

        // Update Heap
        const heapMB = heapUsed / (1024 * 1024);
        const heapMaxMB = Math.max(heapTotal / (1024 * 1024), 100);
        const heapPercent = (heapMB / heapMaxMB) * 100;
        document.getElementById('heap-bar').style.width = Math.min(heapPercent, 100) + '%';
        document.getElementById('heap-value').textContent = heapMB.toFixed(1) + ' MB';

        // Update DOM Nodes
        const maxNodes = 10000;
        const nodePercent = (nodes / maxNodes) * 100;
        document.getElementById('dom-bar').style.width = Math.min(nodePercent, 100) + '%';
        document.getElementById('dom-value').textContent = nodes.toFixed(0);

        // Update Documents
        const maxDocs = 50;
        const docPercent = (documents / maxDocs) * 100;
        document.getElementById('documents-bar').style.width = Math.min(docPercent, 100) + '%';
        document.getElementById('documents-value').textContent = documents.toFixed(0);

        // Update Frames
        const maxFrames = 20;
        const framePercent = (frames / maxFrames) * 100;
        document.getElementById('frames-bar').style.width = Math.min(framePercent, 100) + '%';
        document.getElementById('frames-value').textContent = frames.toFixed(0);

        // Update Listeners
        const maxListeners = 1000;
        const listenerPercent = (listeners / maxListeners) * 100;
        document.getElementById('listeners-bar').style.width = Math.min(listenerPercent, 100) + '%';
        document.getElementById('listeners-value').textContent = listeners.toFixed(0);

        // Update Layouts/s
        const maxLayouts = 100;
        const layoutPercent = (layoutsPerSec / maxLayouts) * 100;
        document.getElementById('layout-bar').style.width = Math.min(layoutPercent, 100) + '%';
        document.getElementById('layout-value').textContent = layoutsPerSec.toFixed(1);

        // Update Style/s
        const maxStyles = 200;
        const stylePercent = (stylesPerSec / maxStyles) * 100;
        document.getElementById('style-bar').style.width = Math.min(stylePercent, 100) + '%';
        document.getElementById('style-value').textContent = stylesPerSec.toFixed(1);

        // Store data for graph
        graphData.cpu.push(cpuPercent);
        graphData.heap.push(heapMB);
        graphData.nodes.push(nodes);
        graphData.layouts.push(layoutsPerSec);
        graphData.styles.push(stylesPerSec);

        // Trim to max points
        Object.keys(graphData).forEach(key => {
          if (graphData[key].length > MAX_GRAPH_POINTS) {
            graphData[key].shift();
          }
        });

        // Draw graph
        drawGraph();
      } catch (e) {}
    }

    function updateGraphVisibility() {
      const metrics = ['cpu', 'heap', 'nodes', 'layouts', 'styles'];
      metrics.forEach(m => {
        const checkbox = document.getElementById('graph-' + m);
        const container = document.getElementById('graph-container-' + m);
        if (checkbox && container) {
          container.style.display = checkbox.checked ? 'block' : 'none';
        }
      });
    }

    function drawGraph() {
      // Draw all visible graphs
      const metrics = ['cpu', 'heap', 'nodes', 'layouts', 'styles'];
      metrics.forEach(metric => {
        const container = document.getElementById('graph-container-' + metric);
        if (!container || container.style.display === 'none') return;

        const canvas = document.getElementById('graph-canvas-' + metric);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const data = graphData[metric];

        if (!data || data.length < 2) {
          ctx.fillStyle = '#0a0a15';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          return;
        }

        // Clear canvas
        ctx.fillStyle = '#0a0a15';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Calculate scale
        const maxVal = Math.max(...data, 1);
        const minVal = Math.min(...data, 0);
        const range = maxVal - minVal || 1;

        // Draw grid lines
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= 4; i++) {
          const y = (canvas.height / 4) * i;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }

        // Draw line
        ctx.strokeStyle = getGraphColor(metric);
        ctx.lineWidth = 2;
        ctx.beginPath();

        const stepX = canvas.width / (MAX_GRAPH_POINTS - 1);
        const startIdx = MAX_GRAPH_POINTS - data.length;

        data.forEach((val, i) => {
          const x = (startIdx + i) * stepX;
          const y = canvas.height - ((val - minVal) / range) * (canvas.height - 10) - 5;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();

        // Draw current value
        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        const currentVal = data[data.length - 1];
        ctx.fillText(formatGraphValue(metric, currentVal), 5, 12);

        // Draw max value
        ctx.fillStyle = '#666';
        ctx.fillText('max: ' + formatGraphValue(metric, maxVal), canvas.width - 75, 12);
      });
    }

    function getGraphColor(metric) {
      const colors = {
        cpu: '#4caf50',
        heap: '#2196f3',
        nodes: '#00bcd4',
        layouts: '#ff5722',
        styles: '#673ab7'
      };
      return colors[metric] || '#4fc3f7';
    }

    function formatGraphValue(metric, val) {
      switch (metric) {
        case 'cpu': return val.toFixed(0) + '%';
        case 'heap': return val.toFixed(1) + ' MB';
        case 'nodes': return val.toFixed(0);
        case 'layouts': return val.toFixed(1) + '/s';
        case 'styles': return val.toFixed(1) + '/s';
        default: return val.toFixed(1);
      }
    }

    // Telemetry (Jaeger)
    async function enableTelemetry() {
      const endpoint = document.getElementById('jaeger-endpoint').value;
      await api('telemetry/enable', { endpoint, exporter: 'otlp' });
      log('Telemetry enabled -> ' + endpoint, 'success');
      updateTelemetryStatus();
    }

    async function disableTelemetry() {
      await api('telemetry/disable');
      log('Telemetry disabled', 'success');
      updateTelemetryStatus();
    }

    async function flushTelemetry() {
      await api('telemetry/flush');
      log('Telemetry flushed', 'success');
    }

    async function updateTelemetryStatus() {
      try {
        const data = await api('telemetry/status');
        const statusEl = document.getElementById('telemetry-status');
        if (data.enabled) {
          statusEl.innerHTML = '<span style="color: #4caf50;">Enabled</span> - ' + data.config.endpoint;
          document.getElementById('btn-telemetry-on').disabled = true;
          document.getElementById('btn-telemetry-off').disabled = false;
          document.getElementById('btn-telemetry-flush').disabled = false;
        } else {
          statusEl.innerHTML = '<span style="color: #888;">Disabled</span>';
          document.getElementById('btn-telemetry-on').disabled = false;
          document.getElementById('btn-telemetry-off').disabled = true;
          document.getElementById('btn-telemetry-flush').disabled = true;
        }
      } catch (e) {}
    }

    // History viewer
    let historyData = null;
    let historySessionId = null;

    async function loadSessionsList() {
      try {
        const data = await api('metrics/sessions');
        const container = document.getElementById('sessions-container');
        const list = document.getElementById('session-list');
        list.innerHTML = '';

        if (data.sessions.length === 0) {
          list.innerHTML = '<div style="padding: 8px; color: #888; font-size: 11px;">No saved sessions</div>';
        } else {
          data.sessions.forEach(session => {
            const item = document.createElement('div');
            item.className = 'session-item';
            const startDate = new Date(session.startTime);
            const duration = session.endTime
              ? Math.round((session.endTime - session.startTime) / 1000)
              : 'ongoing';
            item.innerHTML =
              '<div class="session-info">' +
              '<span class="session-time">' + startDate.toLocaleString() + '</span><br>' +
              '<span class="session-count">' + session.entryCount + ' entries, ' + (typeof duration === 'number' ? duration + 's' : duration) + '</span>' +
              '</div>' +
              '<button class="small danger" onclick="deleteSession(\\'' + session.id + '\\', event)">X</button>';
            item.onclick = (e) => {
              if (e.target.tagName !== 'BUTTON') loadHistorySession(session.id);
            };
            list.appendChild(item);
          });
        }
        container.style.display = 'block';
        log('Loaded ' + data.sessions.length + ' sessions', 'success');
      } catch (e) {
        log('Failed to load sessions: ' + e.message, 'error');
      }
    }

    async function loadHistorySession(sessionId) {
      try {
        const session = await api('metrics/session/load', { sessionId });
        historyData = processHistoryData(session.entries);
        historySessionId = sessionId;

        const startDate = new Date(session.startTime);
        document.getElementById('history-title').textContent =
          'Session: ' + startDate.toLocaleString() + ' (' + session.entries.length + ' entries)';
        document.getElementById('history-viewer').style.display = 'block';

        drawHistoryGraph();
        log('Loaded session: ' + sessionId, 'success');
      } catch (e) {
        log('Failed to load session: ' + e.message, 'error');
      }
    }

    function processHistoryData(entries) {
      const result = { cpu: [], heap: [], nodes: [], layouts: [], styles: [] };
      let lastTaskDuration = 0;
      let lastLayoutCount = 0;
      let lastStyleCount = 0;
      let lastTime = 0;

      entries.forEach((entry, index) => {
        const metrics = entry.metrics;
        const elapsed = lastTime > 0 ? (entry.timestamp - lastTime) / 1000 : 0.5;
        lastTime = entry.timestamp;

        const taskDuration = metrics.find(m => m.name === 'TaskDuration')?.value || 0;
        const heapUsed = metrics.find(m => m.name === 'JSHeapUsedSize')?.value || 0;
        const nodes = metrics.find(m => m.name === 'Nodes')?.value || 0;
        const layoutCount = metrics.find(m => m.name === 'LayoutCount')?.value || 0;
        const styleCount = metrics.find(m => m.name === 'RecalcStyleCount')?.value || 0;

        // Calculate CPU from TaskDuration delta
        const taskDelta = index > 0 ? taskDuration - lastTaskDuration : 0;
        const cpuPercent = elapsed > 0 ? Math.min((taskDelta / elapsed) * 100, 100) : 0;
        lastTaskDuration = taskDuration;

        // Calculate rates
        const layoutsPerSec = index > 0 && elapsed > 0 ? Math.max(0, (layoutCount - lastLayoutCount) / elapsed) : 0;
        const stylesPerSec = index > 0 && elapsed > 0 ? Math.max(0, (styleCount - lastStyleCount) / elapsed) : 0;
        lastLayoutCount = layoutCount;
        lastStyleCount = styleCount;

        result.cpu.push(cpuPercent);
        result.heap.push(heapUsed / (1024 * 1024));
        result.nodes.push(nodes);
        result.layouts.push(layoutsPerSec);
        result.styles.push(stylesPerSec);
      });

      return result;
    }

    function drawHistoryGraph() {
      if (!historyData) return;

      const canvas = document.getElementById('history-graph');
      const ctx = canvas.getContext('2d');
      const metric = document.getElementById('history-metric').value;
      const data = historyData[metric];

      if (!data || data.length < 2) {
        ctx.fillStyle = '#0a0a15';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return;
      }

      // Clear canvas
      ctx.fillStyle = '#0a0a15';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Calculate scale
      const maxVal = Math.max(...data, 1);
      const minVal = Math.min(...data, 0);
      const range = maxVal - minVal || 1;

      // Draw grid lines
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= 4; i++) {
        const y = (canvas.height / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw line
      ctx.strokeStyle = getGraphColor(metric);
      ctx.lineWidth = 2;
      ctx.beginPath();

      const stepX = canvas.width / (data.length - 1);

      data.forEach((val, i) => {
        const x = i * stepX;
        const y = canvas.height - ((val - minVal) / range) * (canvas.height - 10) - 5;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Draw stats
      ctx.fillStyle = '#fff';
      ctx.font = '10px monospace';
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      ctx.fillText('avg: ' + formatGraphValue(metric, avg), 5, 12);
      ctx.fillStyle = '#888';
      ctx.fillText('max: ' + formatGraphValue(metric, maxVal), canvas.width - 75, 12);
    }

    function closeHistoryViewer() {
      document.getElementById('history-viewer').style.display = 'none';
      historyData = null;
      historySessionId = null;
    }

    async function deleteSession(sessionId, event) {
      event.stopPropagation();
      if (!confirm('Delete this session?')) return;
      try {
        await api('metrics/session/delete', { sessionId });
        log('Session deleted: ' + sessionId, 'success');
        loadSessionsList();
        if (historySessionId === sessionId) {
          closeHistoryViewer();
        }
      } catch (e) {
        log('Failed to delete session: ' + e.message, 'error');
      }
    }

    async function exportCurrentSession() {
      try {
        const data = await api('metrics/get');
        if (!data.currentSessionId) {
          log('No active session to export', 'error');
          return;
        }
        const exportData = await api('metrics/session/export', { sessionId: data.currentSessionId });
        downloadJSON(JSON.parse(exportData.data), 'metrics-' + data.currentSessionId + '.json');
        log('Session exported: ' + data.currentSessionId, 'success');
      } catch (e) {
        log('Failed to export session: ' + e.message, 'error');
      }
    }

    // Initialize
    loadConnections();
    loadSavedUrls();
    updateStatus();
    updateTelemetryStatus();
    setInterval(updateStatus, 3000);
  </script>
</body>
</html>`;
