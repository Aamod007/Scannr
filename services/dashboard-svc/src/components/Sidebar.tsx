import type { ViewPage } from '../types';

const NAV_ITEMS: { id: ViewPage; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
  { id: 'queue', label: 'Container Queue', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
  { id: 'health', label: 'System Health', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 'operators', label: 'Operators', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
];

interface SidebarProps {
  activePage: ViewPage;
  onNavigate: (page: ViewPage) => void;
}

export default function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <aside className="w-64 border-r border-white/5 flex flex-col h-full bg-brand-dark z-20 shrink-0">
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-brand-accent to-blue-400 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.4)]">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white">SCANNR</span>
            <span className="text-brand-accent ml-1 text-[10px] font-bold align-top bg-brand-accent/10 px-1.5 py-0.5 rounded-full">PRO</span>
          </div>
        </div>
        <div className="text-[10px] text-gray-600 mt-2 font-mono tracking-wider">AI-POWERED CUSTOMS INTELLIGENCE</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 mt-2">
        <div className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em] px-3 mb-3">Navigation</div>
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left group ${activePage === item.id
                ? 'bg-brand-accent/10 text-white border border-brand-accent/20'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03] border border-transparent'
              }`}
          >
            <svg className={`w-[18px] h-[18px] shrink-0 transition-colors ${activePage === item.id ? 'text-brand-accent' : 'text-gray-600 group-hover:text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d={item.icon} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
            </svg>
            <span className="text-[13px] font-medium">{item.label}</span>
            {activePage === item.id && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-accent shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
            )}
          </button>
        ))}
      </nav>

      {/* System info */}
      <div className="px-3 pb-2">
        <div className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em] px-3 mb-3">System</div>
        <div className="glass-card p-3 rounded-xl space-y-2">
          <div className="flex justify-between text-[10px]">
            <span className="text-gray-500">Region</span>
            <span className="text-gray-300 font-mono">MUMBAI JNPT</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-gray-500">Build</span>
            <span className="text-gray-300 font-mono">v2.3.0</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-gray-500">Env</span>
            <span className="text-brand-green font-mono font-bold">LOCAL DEV</span>
          </div>
        </div>
      </div>

      {/* User profile */}
      <div className="p-3">
        <div className="glass-card p-3 rounded-xl flex items-center gap-3 hover:bg-white/[0.04] transition-colors cursor-pointer">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-accent to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-[0_0_12px_rgba(59,130,246,0.3)]">
            AC
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white truncate">Admin Console</div>
            <div className="text-[10px] text-gray-500">Super Admin</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
