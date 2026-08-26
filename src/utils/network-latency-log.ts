/**
 * Lightweight latency logging for thesis metrics (WiFi vs cellular comparison).
 * During field tests, note connection type in the device log or spreadsheet when collecting samples.
 */

export type LatencyNetworkHint = 'wifi' | 'cellular' | 'unknown';

export interface LatencyLogEntry {
  endpoint: string;
  durationMs: number;
  ok: boolean;
  status?: number;
  networkHint?: LatencyNetworkHint;
  recordedAt: string;
}

const recentLogs: LatencyLogEntry[] = [];
const MAX_LOGS = 200;

export function logAiResponseTime(params: {
  endpoint: string;
  durationMs: number;
  ok: boolean;
  status?: number;
  networkHint?: LatencyNetworkHint;
}): LatencyLogEntry {
  const entry: LatencyLogEntry = {
    ...params,
    networkHint: params.networkHint ?? 'unknown',
    recordedAt: new Date().toISOString(),
  };
  recentLogs.unshift(entry);
  if (recentLogs.length > MAX_LOGS) recentLogs.pop();

  if (__DEV__) {
    console.info(
      `[IniTify latency] ${entry.endpoint} ${entry.durationMs}ms` +
        (entry.ok ? '' : ` (HTTP ${entry.status ?? 'error'})`),
    );
  }

  return entry;
}

/** Returns recent samples for export during usability / response-time trials. */
export function getRecentLatencyLogs(limit = 50): LatencyLogEntry[] {
  return recentLogs.slice(0, limit);
}

export function summarizeLatencyByNetwork(
  logs: LatencyLogEntry[] = recentLogs,
): Record<LatencyNetworkHint, { count: number; avgMs: number; minMs: number; maxMs: number }> {
  const buckets: Record<LatencyNetworkHint, number[]> = {
    wifi: [],
    cellular: [],
    unknown: [],
  };

  for (const log of logs) {
    buckets[log.networkHint ?? 'unknown'].push(log.durationMs);
  }

  const summarize = (values: number[]) => {
    if (!values.length) return { count: 0, avgMs: 0, minMs: 0, maxMs: 0 };
    const sum = values.reduce((a, b) => a + b, 0);
    return {
      count: values.length,
      avgMs: Math.round(sum / values.length),
      minMs: Math.min(...values),
      maxMs: Math.max(...values),
    };
  };

  return {
    wifi: summarize(buckets.wifi),
    cellular: summarize(buckets.cellular),
    unknown: summarize(buckets.unknown),
  };
}
