import {
  ssh,
  cdp,
  chromePid,
  portForwardHandle,
  latestMetrics,
  metricsHistory,
} from "./state";

export function generatePrometheusMetrics(): string {
  const lines: string[] = [];

  // Connection status metrics
  lines.push('# HELP ssh_connected SSH connection status (1=connected, 0=disconnected)');
  lines.push('# TYPE ssh_connected gauge');
  lines.push(`ssh_connected ${ssh.isConnected ? 1 : 0}`);

  lines.push('# HELP cdp_connected CDP connection status (1=connected, 0=disconnected)');
  lines.push('# TYPE cdp_connected gauge');
  lines.push(`cdp_connected ${cdp.isConnected ? 1 : 0}`);

  lines.push('# HELP chrome_running Chrome browser status (1=running, 0=stopped)');
  lines.push('# TYPE chrome_running gauge');
  lines.push(`chrome_running ${chromePid !== null ? 1 : 0}`);

  lines.push('# HELP port_forward_active Port forwarding status (1=active, 0=inactive)');
  lines.push('# TYPE port_forward_active gauge');
  lines.push(`port_forward_active ${portForwardHandle !== null ? 1 : 0}`);

  // Performance metrics from latest sample
  if (latestMetrics && latestMetrics.metrics) {
    const metricsMap: Record<string, { help: string; value: number }> = {};

    for (const m of latestMetrics.metrics) {
      metricsMap[m.name] = { help: m.name, value: m.value };
    }

    // JS Heap
    if (metricsMap['JSHeapUsedSize']) {
      lines.push('# HELP browser_js_heap_used_bytes JavaScript heap used size in bytes');
      lines.push('# TYPE browser_js_heap_used_bytes gauge');
      lines.push(`browser_js_heap_used_bytes ${metricsMap['JSHeapUsedSize'].value}`);
    }

    if (metricsMap['JSHeapTotalSize']) {
      lines.push('# HELP browser_js_heap_total_bytes JavaScript heap total size in bytes');
      lines.push('# TYPE browser_js_heap_total_bytes gauge');
      lines.push(`browser_js_heap_total_bytes ${metricsMap['JSHeapTotalSize'].value}`);
    }

    // DOM
    if (metricsMap['Nodes']) {
      lines.push('# HELP browser_dom_nodes Number of DOM nodes');
      lines.push('# TYPE browser_dom_nodes gauge');
      lines.push(`browser_dom_nodes ${metricsMap['Nodes'].value}`);
    }

    if (metricsMap['Documents']) {
      lines.push('# HELP browser_documents Number of documents');
      lines.push('# TYPE browser_documents gauge');
      lines.push(`browser_documents ${metricsMap['Documents'].value}`);
    }

    if (metricsMap['Frames']) {
      lines.push('# HELP browser_frames Number of frames');
      lines.push('# TYPE browser_frames gauge');
      lines.push(`browser_frames ${metricsMap['Frames'].value}`);
    }

    // Event Listeners
    if (metricsMap['JSEventListeners']) {
      lines.push('# HELP browser_event_listeners Number of JS event listeners');
      lines.push('# TYPE browser_event_listeners gauge');
      lines.push(`browser_event_listeners ${metricsMap['JSEventListeners'].value}`);
    }

    // Layout & Style
    if (metricsMap['LayoutCount']) {
      lines.push('# HELP browser_layout_count_total Total layout operations');
      lines.push('# TYPE browser_layout_count_total counter');
      lines.push(`browser_layout_count_total ${metricsMap['LayoutCount'].value}`);
    }

    if (metricsMap['RecalcStyleCount']) {
      lines.push('# HELP browser_style_recalc_count_total Total style recalculations');
      lines.push('# TYPE browser_style_recalc_count_total counter');
      lines.push(`browser_style_recalc_count_total ${metricsMap['RecalcStyleCount'].value}`);
    }

    // Task Duration (CPU)
    if (metricsMap['TaskDuration']) {
      lines.push('# HELP browser_task_duration_seconds Total task duration in seconds');
      lines.push('# TYPE browser_task_duration_seconds counter');
      lines.push(`browser_task_duration_seconds ${metricsMap['TaskDuration'].value}`);
    }

    // Script Duration
    if (metricsMap['ScriptDuration']) {
      lines.push('# HELP browser_script_duration_seconds Total script duration in seconds');
      lines.push('# TYPE browser_script_duration_seconds counter');
      lines.push(`browser_script_duration_seconds ${metricsMap['ScriptDuration'].value}`);
    }

    // Layout Duration
    if (metricsMap['LayoutDuration']) {
      lines.push('# HELP browser_layout_duration_seconds Total layout duration in seconds');
      lines.push('# TYPE browser_layout_duration_seconds counter');
      lines.push(`browser_layout_duration_seconds ${metricsMap['LayoutDuration'].value}`);
    }
  }

  // Metrics history count
  lines.push('# HELP metrics_history_count Number of metrics samples in history');
  lines.push('# TYPE metrics_history_count gauge');
  lines.push(`metrics_history_count ${metricsHistory.length}`);

  return lines.join('\n') + '\n';
}
