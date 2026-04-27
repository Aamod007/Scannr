import { useApi } from '../hooks/useApi';
import type { ServiceInfo, MLModelInfo } from '../types';

function StatusDot({ status }: { status: string }) {
  const isHealthy = status === 'healthy';
  return (
    <span className={`relative flex h-2.5 w-2.5`}>
      {isHealthy && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40" />}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isHealthy ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
    </span>
  );
}

function ServiceCard({ service }: { service: ServiceInfo }) {
  const isHealthy = service.status === 'healthy';
  return (
    <div className={`glass-card rounded-xl p-5 border transition-all hover:scale-[1.01] ${
      isHealthy ? 'border-emerald-500/10 hover:border-emerald-500/20' : 'border-red-500/20 hover:border-red-500/30'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <StatusDot status={service.status} />
          <span className="text-sm font-bold text-white">{service.name}</span>
        </div>
        <span className="text-[10px] font-mono text-gray-600">:{service.port}</span>
      </div>
      <p className="text-[11px] text-gray-500 mb-4">{service.description}</p>
      <div className="flex gap-4 text-[10px]">
        <div>
          <span className="text-gray-600">Latency</span>
          <div className="text-white font-mono font-bold mt-0.5">{service.latency}</div>
        </div>
        <div>
          <span className="text-gray-600">Uptime</span>
          <div className="text-white font-mono font-bold mt-0.5">{service.uptime}%</div>
        </div>
        <div>
          <span className="text-gray-600">Status</span>
          <div className={`font-bold font-mono mt-0.5 ${isHealthy ? 'text-emerald-400' : 'text-red-400'}`}>
            {service.status.toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  );
}

function AccuracyChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 100);
  const min = Math.min(...data) - 2;
  const range = max - min;
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((val, i) => {
        const height = range > 0 ? ((val - min) / range) * 100 : 50;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
            <span className="text-[9px] font-mono text-gray-500">{val}%</span>
            <div className="w-full rounded-t-lg bg-gradient-to-t from-brand-accent/60 to-brand-accent/20 transition-all duration-500"
              style={{ height: `${height}%`, minHeight: '4px' }} />
            <span className="text-[9px] text-gray-600">{days[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function HealthView() {
  const { data: servicesData, loading: svcLoading } = useApi<{ services: ServiceInfo[]; healthy: number; total: number }>('/api/services');
  const { data: mlData, loading: mlLoading } = useApi<MLModelInfo>('/api/ml/status');

  const services = servicesData?.services || [];
  const healthyCount = servicesData?.healthy ?? 0;
  const totalCount = servicesData?.total ?? 0;

  return (
    <main className="page-view flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-[10px] font-mono text-brand-amber tracking-[0.2em] uppercase">Infrastructure</div>
          <h1 className="text-2xl font-bold text-white mt-1">System Health</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold ${
            healthyCount === totalCount ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            <StatusDot status={healthyCount === totalCount ? 'healthy' : 'degraded'} />
            {healthyCount === totalCount ? 'All Systems Operational' : `${totalCount - healthyCount} Service(s) Down`}
          </div>
        </div>
      </header>

      {/* Services Grid */}
      <div className="mb-8">
        <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand-accent" />
          Microservices ({healthyCount}/{totalCount} healthy)
        </h2>
        {svcLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {services.map(svc => <ServiceCard key={svc.name} service={svc} />)}
          </div>
        )}
      </div>

      {/* ML Model Info */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-sm font-bold text-white mb-5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            ML Model Status
          </h2>
          {mlLoading ? (
            <div className="flex items-center justify-center h-24">
              <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : mlData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/[0.03] rounded-xl p-3">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Production</div>
                  <div className="text-lg font-bold text-white font-mono">{mlData.current_version}</div>
                  <div className="text-[10px] text-emerald-400">{mlData.current_accuracy}% accuracy</div>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-3">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">A/B Test</div>
                  <div className="text-lg font-bold text-white font-mono">{mlData.ab_test_version}</div>
                  <div className="text-[10px] text-amber-400">{mlData.ab_test_traffic}% traffic</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[11px]">
                  <span className="text-gray-500">Retrain Queue</span>
                  <span className="text-white font-mono">{mlData.samples_queued}/{mlData.retrain_trigger} samples</span>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: `${(mlData.samples_queued / mlData.retrain_trigger) * 100}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-gray-600">
                  <span>Last: {new Date(mlData.last_retrain).toLocaleDateString()}</span>
                  <span>Next: {new Date(mlData.next_retrain_estimate).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="glass-card rounded-xl p-6">
          <h2 className="text-sm font-bold text-white mb-5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-accent" />
            Weekly Accuracy Trend
          </h2>
          {mlData?.weekly_accuracy ? (
            <AccuracyChart data={mlData.weekly_accuracy} />
          ) : (
            <div className="flex items-center justify-center h-32 text-xs text-gray-600">No data available</div>
          )}
        </div>
      </div>
    </main>
  );
}
