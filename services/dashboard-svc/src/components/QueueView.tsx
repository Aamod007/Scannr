import { useState } from 'react';
import type { Container } from '../types';
import { useApi, postApi } from '../hooks/useApi';
import ContainerDetail from './ContainerDetail';

const LANE_STYLES: Record<string, { bg: string; text: string; dot: string; glow: string }> = {
  GREEN: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400', glow: 'shadow-[0_0_8px_rgba(16,185,129,0.4)]' },
  YELLOW: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400', glow: 'shadow-[0_0_8px_rgba(245,158,11,0.4)]' },
  RED: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400', glow: 'shadow-[0_0_8px_rgba(239,68,68,0.4)]' },
};

function RiskBadge({ score, lane }: { score: number; lane: string }) {
  const style = LANE_STYLES[lane] || LANE_STYLES.GREEN;
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${style.bg} ${style.glow}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      <span className={`text-[10px] font-bold ${style.text}`}>{score.toFixed(1)}</span>
      <span className={`text-[9px] font-medium ${style.text} opacity-60`}>{lane}</span>
    </div>
  );
}

export default function QueueView() {
  const { data, loading, refetch } = useApi<{ containers: Container[]; total: number }>('/api/queue');
  const [filter, setFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);

  const containers = data?.containers || [];
  const filtered = containers.filter(c => {
    if (filter !== 'ALL' && c.lane !== filter) return false;
    const query = search.toLowerCase();
    if (query && !c.id.toLowerCase().includes(query) && !c.cargo_category.toLowerCase().includes(query)) return false;
    return true;
  });

  const quickSubmit = async () => {
    setSubmitting(true);
    try {
      await postApi('/api/clearance/initiate', {
        container_id: `TCMU-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(Math.random() * 10)}`,
        importer_gstin: '27AABCU9603R1ZN',
        declared_value_inr: Math.floor(1000000 + Math.random() * 9000000),
        hs_code: ['8471.30', '8507.60', '7108.13', '2933.99'][Math.floor(Math.random() * 4)],
      });
      setTimeout(() => { refetch(); setSubmitting(false); }, 500);
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <main className="page-view flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand-amber">Clearance Pipeline</div>
          <h1 className="mt-1 text-2xl font-bold text-white">Container Queue</h1>
        </div>
        <button
          onClick={quickSubmit}
          disabled={submitting}
          className="flex items-center justify-center gap-2 rounded-xl bg-brand-accent px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-brand-accent/80 disabled:opacity-50"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeWidth="2" />
          </svg>
          {submitting ? 'Submitting...' : 'New Container'}
        </button>
      </header>

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex w-full overflow-x-auto rounded-xl bg-white/5 p-1 sm:w-auto">
          {['ALL', 'GREEN', 'YELLOW', 'RED'].map(lane => (
            <button
              key={lane}
              onClick={() => setFilter(lane)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                filter === lane ? 'bg-brand-accent text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {lane}
            </button>
          ))}
        </div>
        <div className="hidden flex-1 lg:block" />
        <div className="relative w-full sm:w-80">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeWidth="2" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search containers..."
            className="w-full rounded-xl border border-white/5 bg-white/5 py-2.5 pl-10 pr-4 text-xs text-white placeholder-gray-600 transition-colors focus:border-brand-accent/30 focus:outline-none"
          />
        </div>
        <div className="text-[11px] text-gray-500">
          <span className="font-bold text-white">{filtered.length}</span> containers
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-accent border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center rounded-xl p-12 text-center">
          <svg className="mb-4 h-16 w-16 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" />
          </svg>
          <h3 className="mb-1 font-bold text-white">No Containers in Queue</h3>
          <p className="mb-4 text-xs text-gray-500">Submit a new container to start the clearance pipeline.</p>
          <button onClick={quickSubmit} className="rounded-xl bg-brand-accent px-4 py-2 text-xs font-bold text-white">
            Submit First Container
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="hidden grid-cols-12 gap-4 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-600 lg:grid">
            <div className="col-span-3">Container ID</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-2">HS Code</div>
            <div className="col-span-2">Risk Score</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-2">Time</div>
          </div>

          {filtered.map(container => {
            const style = LANE_STYLES[container.lane] || LANE_STYLES.GREEN;
            return (
              <div
                key={container.id}
                onClick={() => setSelectedContainer(container)}
                className={`glass-card group grid cursor-pointer grid-cols-1 gap-3 rounded-xl border-l-2 px-4 py-3.5 transition-all hover:bg-white/[0.08] lg:grid-cols-12 lg:items-center lg:gap-4 ${
                  container.lane === 'RED' ? 'border-l-red-500' : container.lane === 'YELLOW' ? 'border-l-amber-500' : 'border-l-emerald-500'
                }`}
              >
                <div className="col-span-3 flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 font-mono text-[10px] text-gray-400">{container.flag || 'BOX'}</span>
                  <div className="min-w-0">
                    <div className="truncate font-mono text-xs font-bold text-white transition-colors group-hover:text-brand-accent">{container.id}</div>
                    <div className="truncate text-[10px] text-gray-500">{container.origin || 'Unknown'} - {container.type}</div>
                  </div>
                </div>
                <div className="col-span-2 text-xs capitalize text-gray-400"><span className="text-gray-600 lg:hidden">Category: </span>{container.cargo_category}</div>
                <div className="col-span-2 font-mono text-xs text-gray-400"><span className="font-sans text-gray-600 lg:hidden">HS: </span>{container.hs_code}</div>
                <div className="col-span-2"><RiskBadge score={container.risk_score} lane={container.lane} /></div>
                <div className="col-span-1">
                  <span className={`text-[10px] font-bold ${style.text}`}>{container.status}</span>
                </div>
                <div className="col-span-2 flex items-center justify-between font-mono text-[10px] text-gray-600">
                  {new Date(container.created_at).toLocaleTimeString()}
                  <svg className="h-4 w-4 text-gray-600 opacity-0 transition-opacity group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedContainer && (
        <ContainerDetail
          container={selectedContainer}
          onClose={() => {
            setSelectedContainer(null);
            refetch();
          }}
        />
      )}
    </main>
  );
}
