import { useApi } from '../hooks/useApi';
import type { Operator } from '../types';

function OperatorCard({ op }: { op: Operator }) {
  const isOnShift = op.status === 'on_shift';
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    pink: 'from-pink-500 to-pink-600',
    gray: 'from-gray-500 to-gray-600',
    purple: 'from-purple-500 to-purple-600',
    teal: 'from-teal-500 to-teal-600',
    orange: 'from-orange-500 to-orange-600',
    red: 'from-red-500 to-red-600',
  };
  const gradient = colorMap[op.color] || colorMap.blue;

  return (
    <div className={`glass-card rounded-xl p-5 transition-all hover:scale-[1.01] ${
      isOnShift ? 'border border-white/5' : 'border border-white/[0.02] opacity-60'
    }`}>
      <div className="flex items-start gap-3 mb-4">
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-lg`}>
          {op.initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white truncate">{op.name}</span>
            {isOnShift && <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />}
          </div>
          <div className="text-[10px] text-gray-500">{op.role}</div>
        </div>
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
          isOnShift ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-500'
        }`}>
          {isOnShift ? 'ON SHIFT' : 'OFF DUTY'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/[0.03] rounded-lg p-2.5 text-center">
          <div className="text-lg font-bold text-white font-mono">{op.assigned}</div>
          <div className="text-[9px] text-gray-500 uppercase tracking-wider">Cases</div>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-2.5 text-center">
          <div className="text-lg font-bold text-white font-mono">{op.accuracy}%</div>
          <div className="text-[9px] text-gray-500 uppercase tracking-wider">Accuracy</div>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-2.5 text-center">
          <div className="text-[11px] font-bold text-white font-mono leading-tight mt-0.5">{op.shift.split(' - ')[0]}</div>
          <div className="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">Shift</div>
        </div>
      </div>

      {/* Accuracy bar */}
      <div className="mt-3">
        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${
            op.accuracy >= 96 ? 'bg-emerald-500' : op.accuracy >= 94 ? 'bg-amber-500' : 'bg-red-500'
          }`} style={{ width: `${op.accuracy}%` }} />
        </div>
      </div>
    </div>
  );
}

export default function OperatorsView() {
  const { data, loading } = useApi<{
    operators: Operator[];
    stats: { on_duty: number; off_duty: number; total: number; avg_cases_per_day: number; avg_accuracy: string };
  }>('/api/operators');

  const operators = data?.operators || [];
  const stats = data?.stats;
  const onShift = operators.filter(o => o.status === 'on_shift');
  const offDuty = operators.filter(o => o.status !== 'on_shift');

  return (
    <main className="page-view flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
      <header className="mb-6">
        <div>
          <div className="text-[10px] font-mono text-brand-amber tracking-[0.2em] uppercase">Personnel</div>
          <h1 className="text-2xl font-bold text-white mt-1">Operators</h1>
        </div>
      </header>

      {/* Stats bar */}
      {stats && (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'On Duty', value: stats.on_duty, color: 'text-emerald-400' },
            { label: 'Off Duty', value: stats.off_duty, color: 'text-gray-400' },
            { label: 'Avg Cases/Day', value: stats.avg_cases_per_day, color: 'text-blue-400' },
            { label: 'Avg Accuracy', value: `${stats.avg_accuracy}%`, color: 'text-purple-400' },
          ].map(s => (
            <div key={s.label} className="glass-card rounded-xl px-5 py-4 flex items-center justify-between">
              <span className="text-[11px] text-gray-500 font-medium">{s.label}</span>
              <span className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* On Shift */}
          <div className="mb-8">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
              On Shift ({onShift.length})
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {onShift.map(op => <OperatorCard key={op.id} op={op} />)}
            </div>
          </div>

          {/* Off Duty */}
          {offDuty.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-gray-500 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-600" />
                Off Duty ({offDuty.length})
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {offDuty.map(op => <OperatorCard key={op.id} op={op} />)}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
