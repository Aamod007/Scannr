import { useState } from 'react';
import type { Container } from '../types';
import { useApi, postApi } from '../hooks/useApi';

interface ImporterData {
  name: string;
  gstin: string;
  trust_score: number;
  aeo_tier: string;
  years_active: number;
  total_inspections: number;
  violations: number;
  sanctions_match: boolean;
  block_hash: string;
  block_number: number;
}

interface ContainerDetailProps {
  container: Container;
  onClose: () => void;
}

const LANE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  GREEN: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  YELLOW: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  RED: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
};

export default function ContainerDetail({ container, onClose }: ContainerDetailProps) {
  const { data: detail } = useApi<Container & { importer?: ImporterData; top_features?: { name: string; impact: string }[] }>(
    `/api/containers/${container.id}`
  );
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideLane, setOverrideLane] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideStatus, setOverrideStatus] = useState<string | null>(null);

  const laneStyle = LANE_COLORS[container.lane] || LANE_COLORS.GREEN;
  const importer = detail?.importer;

  const submitOverride = async () => {
    if (!overrideLane || !overrideReason) return;
    try {
      await postApi('/api/overrides', {
        container_id: container.id,
        officer_id: 'OFF-MUM-0042',
        from_lane: container.lane,
        to_lane: overrideLane,
        reason: overrideReason,
      });
      setOverrideStatus('Override submitted successfully');
      setOverrideOpen(false);
    } catch {
      setOverrideStatus('Failed to submit override');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="animate-slideIn relative h-full w-full overflow-y-auto border-l border-white/5 bg-brand-dark sm:max-w-[520px]">
        <div className={`border-b border-white/5 p-6 ${laneStyle.bg}`}>
          <div className="mb-4 flex items-center justify-between">
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${laneStyle.border} ${laneStyle.bg}`}>
              <span className={`h-2 w-2 rounded-full ${container.lane === 'RED' ? 'bg-red-400' : container.lane === 'YELLOW' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              <span className={`text-xs font-bold ${laneStyle.text}`}>{container.lane} LANE</span>
            </div>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 transition-colors hover:bg-white/10">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeWidth="2" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 font-mono text-[10px] text-gray-400">{container.flag || 'BOX'}</span>
            <div className="min-w-0">
              <h2 className="truncate font-mono text-xl font-bold text-white">{container.id}</h2>
              <p className="truncate text-xs text-gray-400">{container.origin} - {container.type}</p>
            </div>
          </div>
        </div>

        <div className="border-b border-white/5 p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="relative h-20 w-20 shrink-0">
              <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#1a1a1c" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke={container.lane === 'RED' ? '#EF4444' : container.lane === 'YELLOW' ? '#F59E0B' : '#10B981'}
                  strokeWidth="3"
                  strokeDasharray={`${container.risk_score} 100`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`font-mono text-lg font-bold ${laneStyle.text}`}>{container.risk_score.toFixed(1)}</span>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Risk Assessment</div>
              <div className="grid grid-cols-2 gap-2">
                <InfoChip label="Category" value={container.cargo_category} />
                <InfoChip label="HS Code" value={container.hs_code} mono />
                <InfoChip label="Status" value={container.status} />
                <InfoChip label="Operator" value={container.operator} />
              </div>
            </div>
          </div>
        </div>

        {detail?.top_features && (
          <div className="border-b border-white/5 p-6">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
              Risk Feature Breakdown
            </h3>
            <div className="space-y-2">
              {detail.top_features.map((f, i) => (
                <div key={`${f.name}-${i}`} className="flex items-center gap-3">
                  <span className="w-36 truncate font-mono text-[10px] text-gray-500">{f.name}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-purple-500/60 transition-all duration-500" style={{ width: `${Math.min(parseFloat(f.impact) * 2.5, 100)}%` }} />
                  </div>
                  <span className="w-8 text-right font-mono text-[10px] text-gray-400">{f.impact}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {importer && (
          <div className="border-b border-white/5 p-6">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-accent" />
              Importer Profile
            </h3>
            <div className="glass-card space-y-3 rounded-xl p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-sm font-bold text-white">{importer.name}</span>
                {importer.sanctions_match && (
                  <span className="shrink-0 rounded-full bg-red-500/20 px-2 py-0.5 text-[9px] font-bold text-red-400">
                    SANCTIONED
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <InfoChip label="GSTIN" value={importer.gstin} mono />
                <InfoChip label="Trust Score" value={`${importer.trust_score}/100`} />
                <InfoChip label="AEO Tier" value={importer.aeo_tier} />
                <InfoChip label="Active" value={`${importer.years_active} yrs`} />
                <InfoChip label="Inspections" value={String(importer.total_inspections)} />
                <InfoChip label="Violations" value={String(importer.violations)} />
              </div>
              <div className="border-t border-white/5 pt-2">
                <div className="font-mono text-[9px] text-gray-600">
                  Block #{importer.block_number} - {importer.block_hash}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="p-6">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-bold text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-amber" />
            Officer Actions
          </h3>
          {overrideStatus && (
            <div className={`mb-3 rounded-lg px-3 py-2 text-[11px] font-bold ${
              overrideStatus.includes('success') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
            }`}>
              {overrideStatus}
            </div>
          )}
          {!overrideOpen ? (
            <button
              onClick={() => setOverrideOpen(true)}
              className="w-full rounded-xl border border-white/5 bg-white/5 py-3 text-xs font-bold text-white transition-colors hover:border-brand-amber/30 hover:bg-white/[0.08]"
            >
              Override Lane Assignment
            </button>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-gray-500">New Lane</label>
                <div className="flex gap-2">
                  {['GREEN', 'YELLOW', 'RED'].filter(l => l !== container.lane).map(lane => (
                    <button
                      key={lane}
                      onClick={() => setOverrideLane(lane)}
                      className={`flex-1 rounded-lg py-2 text-[10px] font-bold transition-all ${
                        overrideLane === lane
                          ? `${LANE_COLORS[lane].bg} ${LANE_COLORS[lane].text} border ${LANE_COLORS[lane].border}`
                          : 'border border-transparent bg-white/5 text-gray-500 hover:bg-white/[0.08]'
                      }`}
                    >
                      {lane}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] uppercase tracking-wider text-gray-500">Reason</label>
                <textarea
                  value={overrideReason}
                  onChange={e => setOverrideReason(e.target.value)}
                  className="h-20 w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white placeholder-gray-600 transition-colors focus:border-brand-amber/40 focus:outline-none"
                  placeholder="Provide justification for override..."
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setOverrideOpen(false)} className="flex-1 rounded-xl bg-white/5 py-2.5 text-xs font-bold text-gray-400 transition-colors hover:bg-white/[0.08]">Cancel</button>
                <button onClick={submitOverride} disabled={!overrideLane || !overrideReason} className="flex-1 rounded-xl bg-brand-amber py-2.5 text-xs font-bold text-black transition-colors hover:bg-brand-amber/80 disabled:opacity-30">
                  Submit Override
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoChip({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg bg-white/[0.03] px-3 py-2">
      <div className="text-[9px] uppercase tracking-wider text-gray-600">{label}</div>
      <div className={`mt-0.5 truncate text-[11px] font-medium text-white ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}
