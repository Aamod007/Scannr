import { useEffect, useMemo, useState } from 'react';
import type { ActivityEvent, Container, DashboardStats } from '../types';
import { useWebSocket } from '../hooks/useWebSocket';
import { useApi, postApi } from '../hooks/useApi';

const DEFAULT_STATS: DashboardStats = {
  throughput: 0,
  containers_today: 0,
  avg_clearance_time: '0s',
  ai_accuracy: 0,
  active_alerts: 0,
  green_lane_pct: 0,
  red_lane_count: 0,
  yellow_lane_count: 0,
  green_lane_count: 0,
  system_health: { healthy: 0, total: 7 },
};

const ICONS = {
  containers: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  green: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  review: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  alert: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
};

function KpiCard({ label, value, tone, icon, detail }: { label: string; value: string | number; tone: string; icon: string; detail: string }) {
  const colorMap: Record<string, string> = {
    green: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400',
    amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-400',
    red: 'from-red-500/20 to-red-500/5 border-red-500/20 text-red-400',
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/20 text-blue-400',
  };
  const classes = colorMap[tone] || colorMap.blue;

  return (
    <div className={`relative overflow-hidden rounded-xl border bg-gradient-to-br p-4 sm:p-5 ${classes}`}>
      <div className="absolute right-3 top-3 opacity-10">
        <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d={icon} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" />
        </svg>
      </div>
      <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500">{label}</div>
      <div className="font-mono text-3xl font-bold text-white">{value}</div>
      <div className="mt-2 text-[11px] text-gray-500">{detail}</div>
    </div>
  );
}

function LaneBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const colorMap: Record<string, string> = {
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
  };
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[11px]">
        <span className="font-medium text-gray-400">{label}</span>
        <span className="font-mono font-bold text-white">{count} <span className="text-gray-600">({pct}%)</span></span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
        <div className={`h-full rounded-full ${colorMap[color]} transition-all duration-700 ease-out`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ActivityRow({ event }: { event: ActivityEvent }) {
  const tone: Record<ActivityEvent['severity'], string> = {
    info: 'bg-blue-500/15 text-blue-300',
    success: 'bg-emerald-500/15 text-emerald-300',
    warning: 'bg-amber-500/15 text-amber-300',
    danger: 'bg-red-500/15 text-red-300',
  };

  return (
    <div className="flex gap-3 border-b border-white/[0.04] pb-3 last:border-b-0 last:pb-0">
      <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${tone[event.severity]}`} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs text-gray-300">{event.message}</div>
        <div className="mt-1 font-mono text-[10px] text-gray-600">{new Date(event.timestamp).toLocaleTimeString()}</div>
      </div>
    </div>
  );
}

export default function DashboardView() {
  const { status: wsStatus, lastMessage } = useWebSocket();
  const { data: healthData } = useApi<{ status: string }>('/health');
  const { data: initialStats } = useApi<DashboardStats>('/api/dashboard/stats');
  const { data: activityData } = useApi<{ events: ActivityEvent[] }>('/api/dashboard/activity');
  const { data: queueData, refetch: refetchQueue } = useApi<{ containers: Container[]; total: number }>('/api/queue');

  const [testLog, setTestLog] = useState<string[]>([]);
  const [gstinInput, setGstinInput] = useState('27AABCU9603R1ZN');
  const [sanctionsInput, setSanctionsInput] = useState('TechCorp');

  const stats = useMemo(() => {
    if (lastMessage?.type === 'stats_update' && typeof lastMessage.stats === 'object') {
      return lastMessage.stats as DashboardStats;
    }
    return initialStats ?? DEFAULT_STATS;
  }, [initialStats, lastMessage]);

  useEffect(() => {
    if (lastMessage?.type === 'new_clearance') {
      refetchQueue();
    }
  }, [lastMessage, refetchQueue]);

  const total = stats.green_lane_count + stats.yellow_lane_count + stats.red_lane_count;
  const backendHealth = healthData?.status || 'unknown';
  const recentContainers = useMemo(() => queueData?.containers.slice(0, 5) ?? [], [queueData]);

  const addLog = (msg: string) => setTestLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 8));

  const testImporter = async () => {
    addLog(`Querying importer: ${gstinInput}`);
    try {
      const res = await fetch(`/api/importer/${gstinInput}`);
      const data = await res.json();
      addLog(`OK ${data.name || 'Unknown'} - Trust: ${data.trust_score ?? 'N/A'}, AEO: ${data.aeo_tier ?? 'N/A'}`);
    } catch (e: unknown) {
      addLog(`Error: ${e instanceof Error ? e.message : 'Failed'}`);
    }
  };

  const testSanctions = async () => {
    addLog(`Sanctions check: ${sanctionsInput}`);
    try {
      const data = await postApi<{ overall: string; matched_entity: string | null }>('/api/sanctions/check', { query: sanctionsInput });
      addLog(`OK Result: ${data.overall}${data.matched_entity ? ` - Matched: ${data.matched_entity}` : ''}`);
    } catch (e: unknown) {
      addLog(`Error: ${e instanceof Error ? e.message : 'Failed'}`);
    }
  };

  const testClearance = async () => {
    const cid = `TCMU-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(Math.random() * 10)}`;
    addLog(`Initiating clearance: ${cid}`);
    try {
      const data = await postApi<{ clearance_id: string; status: string }>('/api/clearance/initiate', {
        container_id: cid,
        importer_gstin: gstinInput,
        manifest_url: 'https://example.com/manifest',
        xray_scan_id: `SCN-${Math.floor(100000 + Math.random() * 900000)}`,
        declared_value_inr: 4500000,
        hs_code: '8471.30',
      });
      addLog(`OK Clearance ${data.clearance_id}: ${data.status}`);
      refetchQueue();
    } catch (e: unknown) {
      addLog(`Error: ${e instanceof Error ? e.message : 'Failed'}`);
    }
  };

  return (
    <main className="page-view flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
      <header className="mb-6 flex flex-col gap-4 lg:mb-8 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand-amber">Command Center - Mumbai JNPT</div>
          <h1 className="mt-1 text-2xl font-bold text-white">Live Dashboard</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill label="Gateway" value={backendHealth === 'ok' ? 'ACTIVE' : backendHealth.toUpperCase()} healthy={backendHealth === 'ok'} />
          <StatusPill label="WebSocket" value={wsStatus} healthy={wsStatus === 'CONNECTED'} pulse={wsStatus === 'CONNECTED'} />
        </div>
      </header>

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Containers Today" value={stats.containers_today} tone="blue" icon={ICONS.containers} detail={`${stats.throughput}/hr throughput`} />
        <KpiCard label="Green Lane" value={stats.green_lane_count} tone="green" icon={ICONS.green} detail={`${stats.green_lane_pct}% auto-clear`} />
        <KpiCard label="Pending Review" value={stats.yellow_lane_count} tone="amber" icon={ICONS.review} detail={`${stats.avg_clearance_time} average`} />
        <KpiCard label="Active Holds" value={stats.red_lane_count} tone="red" icon={ICONS.alert} detail={`${stats.active_alerts} open alerts`} />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-5">
          <div className="glass-card rounded-xl p-5 sm:p-6">
            <h2 className="mb-5 flex items-center gap-2 text-sm font-bold text-white">
              <span className="h-2 w-2 rounded-full bg-brand-accent" />
              Lane Distribution
            </h2>
            <div className="space-y-4">
              <LaneBar label="Green Lane" count={stats.green_lane_count} total={total} color="green" />
              <LaneBar label="Yellow Lane" count={stats.yellow_lane_count} total={total} color="amber" />
              <LaneBar label="Red Lane" count={stats.red_lane_count} total={total} color="red" />
            </div>
            <div className="mt-4 flex justify-between border-t border-white/5 pt-4 text-[10px] text-gray-500">
              <span>AI accuracy <span className="font-bold text-white">{stats.ai_accuracy}%</span></span>
              <span>Services <span className="font-bold text-white">{stats.system_health.healthy}/{stats.system_health.total}</span></span>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              System Health
            </h2>
            <div className="flex items-center gap-6">
              <HealthRing healthy={stats.system_health.healthy} total={stats.system_health.total} />
              <div className="space-y-2 text-[11px]">
                <LegendDot color="bg-emerald-400" label="Healthy services" />
                <LegendDot color="bg-brand-amber" label={`Green lane ${stats.green_lane_pct}%`} />
                <LegendDot color="bg-brand-accent" label={`Throughput ${stats.throughput}/hr`} />
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
              <span className="h-2 w-2 rounded-full bg-brand-neon" />
              Live Activity
            </h2>
            <div className="space-y-3">
              {(activityData?.events ?? []).slice(0, 5).map(event => <ActivityRow key={event.id} event={event} />)}
            </div>
          </div>
        </div>

        <div className="space-y-6 xl:col-span-7">
          <div className="glass-card rounded-xl p-5 sm:p-6">
            <h2 className="mb-5 flex items-center gap-2 text-sm font-bold text-white">
              <span className="h-2 w-2 rounded-full bg-brand-neon" />
              Integration Test Panel
            </h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <ActionInput label="Importer Lookup" value={gstinInput} onChange={setGstinInput} action="Query" onAction={testImporter} tone="blue" />
                <ActionInput label="Sanctions Check" value={sanctionsInput} onChange={setSanctionsInput} action="Check" onAction={testSanctions} tone="red" />
                <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4 transition-colors hover:border-amber-500/20">
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-amber-400">Initiate Clearance</div>
                  <button onClick={testClearance} className="w-full rounded-lg bg-amber-500/90 py-2.5 text-[10px] font-bold text-black transition-colors hover:bg-amber-500">
                    Submit New Container
                  </button>
                </div>
              </div>

              <div className="flex min-h-[220px] flex-col rounded-xl border border-white/5 bg-black/40 p-4">
                <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-gray-600">Activity Log</div>
                <div className="flex-1 space-y-1.5 overflow-y-auto">
                  {testLog.length === 0 ? (
                    <p className="font-mono text-[10px] italic text-gray-700">Run a test to see results here.</p>
                  ) : testLog.map((log, i) => (
                    <div key={`${log}-${i}`} className={`border-b border-white/[0.03] pb-1.5 font-mono text-[10px] leading-relaxed ${
                      log.includes('OK') ? 'text-emerald-400' : log.includes('Error') ? 'text-red-400' : 'text-gray-400'
                    }`}>{log}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 sm:p-6">
            <h2 className="mb-4 flex items-center justify-between text-sm font-bold text-white">
              <span>Recent Queue</span>
              <span className="font-mono text-[10px] text-gray-600">{queueData?.total ?? 0} total</span>
            </h2>
            <div className="space-y-2">
              {recentContainers.map(container => (
                <div key={container.id} className="grid grid-cols-[1fr_auto] gap-3 rounded-lg border border-white/[0.04] bg-white/[0.025] px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate font-mono text-xs font-bold text-white">{container.id}</div>
                    <div className="mt-0.5 truncate text-[10px] text-gray-500">{container.origin} - {container.cargo_category} - HS {container.hs_code}</div>
                  </div>
                  <div className={`self-center rounded-full px-2.5 py-1 text-[10px] font-bold ${
                    container.lane === 'RED' ? 'bg-red-500/10 text-red-400' : container.lane === 'YELLOW' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                  }`}>{container.lane}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function StatusPill({ label, value, healthy, pulse }: { label: string; value: string; healthy: boolean; pulse?: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-[11px]">
      <span className="text-gray-500">{label}</span>
      <span className={`inline-flex items-center gap-1 font-bold ${healthy ? 'text-emerald-400' : 'text-red-400'}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${healthy ? 'bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.6)]' : 'bg-red-400'} ${pulse ? 'animate-pulse' : ''}`} />
        {value}
      </span>
    </div>
  );
}

function HealthRing({ healthy, total }: { healthy: number; total: number }) {
  const pct = total > 0 ? (healthy / total) * 100 : 0;
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#1a1a1c" strokeWidth="3" />
        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10B981" strokeWidth="3" strokeDasharray={`${pct} 100`} strokeLinecap="round" className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-white">{healthy}/{total}</span>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      <span className="text-gray-400">{label}</span>
    </div>
  );
}

function ActionInput({
  label,
  value,
  onChange,
  action,
  onAction,
  tone,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  action: string;
  onAction: () => void;
  tone: 'blue' | 'red';
}) {
  const toneClass = tone === 'red'
    ? 'text-red-400 hover:border-red-500/20 focus:border-red-500/40 bg-red-500/80 hover:bg-red-500'
    : 'text-brand-accent hover:border-brand-accent/20 focus:border-brand-accent/40 bg-brand-accent hover:bg-brand-accent/80';

  return (
    <div className={`rounded-xl border border-white/5 bg-white/[0.03] p-4 transition-colors ${toneClass.split(' ')[1]}`}>
      <div className={`mb-2 text-[10px] font-bold uppercase tracking-wider ${tone === 'red' ? 'text-red-400' : 'text-brand-accent'}`}>{label}</div>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`min-w-0 flex-1 rounded-lg border border-white/10 bg-brand-dark/80 p-2 font-mono text-[11px] text-white transition-colors placeholder-gray-600 focus:outline-none ${tone === 'red' ? 'focus:border-red-500/40' : 'focus:border-brand-accent/40'}`}
        />
        <button onClick={onAction} className={`shrink-0 rounded-lg px-3 py-2 text-[10px] font-bold text-white transition-colors ${toneClass.split(' ').slice(4).join(' ')}`}>
          {action}
        </button>
      </div>
    </div>
  );
}
