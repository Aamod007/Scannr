import './App.css';
import './App.css';

function Sidebar() {
  return (
    <aside className="w-64 border-r border-white/5 flex flex-col h-full bg-brand-dark z-20" data-purpose="sidebar-navigation">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-accent rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-white uppercase">Scannr<span className="text-brand-accent ml-1 text-sm align-top">PRO</span></span>
        </div>
      </div>
      <nav className="flex-1 px-4 space-y-1 mt-4">
        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-3 mb-2">Main Menu</div>
        <a className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 text-white border border-white/5 cursor-pointer">
          <svg className="w-5 h-5 text-brand-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
          </svg>
          <span className="text-sm font-medium">Dashboard</span>
        </a>
      </nav>
      <div className="p-4 mt-auto">
        <div className="glass-card p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-accent flex items-center justify-center text-white font-bold">DC</div>
          <div>
            <div className="text-xs font-bold text-white">David Chen</div>
            <div className="text-[10px] text-gray-500">Global Admin</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function LiveDashboard() {
  return (
    <main className="page-view flex-1 overflow-y-auto p-8 relative">
      <div className="glass-card rounded-2xl px-5 py-3 mb-6 flex items-center justify-between">
        <div className="text-xs font-mono text-gray-500"><span className="text-brand-amber">▸</span> Budget 2026-27 · Para 87 · Customs Digitalization Initiative</div>
      </div>
      <header className="flex items-center justify-between mb-8">
        <div>
          <div className="text-[10px] font-mono text-brand-amber tracking-widest">COMMAND CENTER · MUMBAI JNPT</div>
          <h1 className="text-2xl font-bold text-white mt-1">Live Dashboard</h1>
        </div>
      </header>
      <div className="grid grid-cols-12 gap-6">
        <section className="col-span-8 glass-card rounded-3xl p-6 min-h-[500px] flex items-center justify-center border border-dashed border-white/20">
          <div className="text-center">
            <span className="material-symbols-outlined text-4xl text-brand-accent mb-2">dashboard_customize</span>
            <h2 className="text-xl font-bold text-white">Dashboard Layout</h2>
            <p className="text-sm text-gray-500 mt-2">React Port Phase 4 Initialization Complete.</p>
          </div>
        </section>
        <aside className="col-span-4 space-y-6">
          <article className="glass-card rounded-3xl p-6">
            <h3 className="text-sm font-semibold text-white mb-4">System Health</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">UI Framework</span>
                <span className="text-xs font-bold text-brand-neon">React + Vite</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">WebSocket connection</span>
                <span className="text-xs font-bold text-green-400">PENDING</span>
              </div>
            </div>
          </article>
        </aside>
      </div>
    </main>
  );
}

function App() {
  return (
    <div className="flex h-full w-full bg-brand-dark text-gray-300">
      <Sidebar />
      <LiveDashboard />
    </div>
  )
}

export default App
