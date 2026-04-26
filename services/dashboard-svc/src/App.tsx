import { useState, useEffect } from 'react';
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
          <span className="text-sm font-medium">Dashboard MVP</span>
        </a>
      </nav>
      <div className="p-4 mt-auto">
        <div className="glass-card p-4 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-accent flex items-center justify-center text-white font-bold shadow-[0_0_15px_rgba(59,130,246,0.3)]">DC</div>
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
  const [stats, setStats] = useState({ cleared: 0, pending: 0, holds: 0 });
  const [wsStatus, setWsStatus] = useState('CONNECTING');
  const [backendHealth, setBackendHealth] = useState('UNKNOWN');

  const [testLog, setTestLog] = useState<string[]>([]);
  const [gstinInput, setGstinInput] = useState('27AABCU9603R1ZN');
  const [sanctionsInput, setSanctionsInput] = useState('TechCorp');

  useEffect(() => {
    fetch('/health')
      .then(res => res.json())
      .then(data => setBackendHealth(data.status))
      .catch(() => setBackendHealth('ERROR'));

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = import.meta.env.DEV ? 'ws://localhost:8000/ws/stats' : `${protocol}//${window.location.host}/ws/stats`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => setWsStatus('CONNECTED');
    ws.onclose = () => setWsStatus('DISCONNECTED');
    ws.onerror = () => setWsStatus('ERROR');
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'stats_update') {
          setStats(data.payload);
        }
      } catch (err) {
        console.error('Failed to parse WS message', err);
      }
    };
    return () => ws.close();
  }, []);

  const addLog = (msg: string) => setTestLog(prev => [msg, ...prev].slice(0, 5));

  const testImporter = async () => {
    addLog(`Testing Importer: ${gstinInput}...`);
    try {
      const res = await fetch(`/api/importer/${gstinInput}`);
      const data = await res.json();
      addLog(`Result: ${JSON.stringify(data).substring(0, 80)}...`);
    } catch (e: any) {
      addLog(`Error: ${e.message}`);
    }
  };

  const testSanctions = async () => {
    addLog(`Checking Sanctions for: ${sanctionsInput}...`);
    try {
      const res = await fetch('/api/sanctions/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity_name: sanctionsInput, gstin: sanctionsInput })
      });
      const data = await res.json();
      addLog(`Result: ${JSON.stringify(data).substring(0, 80)}...`);
    } catch (e: any) {
      addLog(`Error: ${e.message}`);
    }
  };

  const testClearance = async () => {
    addLog(`Initiating Clearance...`);
    try {
      const res = await fetch('/api/clearance/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          container_id: `TCMU-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(Math.random()*10)}`,
          importer_gstin: gstinInput,
          manifest_url: 'https://example.com/manifest',
          scan_id: `SCN-${Math.floor(100000 + Math.random() * 900000)}`,
          declared_value_inr: 4500000,
          hs_code: '8471.30'
        })
      });
      const data = await res.json();
      addLog(`Result: ${JSON.stringify(data).substring(0, 80)}...`);
    } catch (e: any) {
      addLog(`Error: ${e.message}`);
    }
  };

  return (
    <main className="page-view flex-1 overflow-y-auto p-8 relative">
      <header className="flex items-center justify-between mb-8">
        <div>
          <div className="text-[10px] font-mono text-brand-amber tracking-widest">COMMAND CENTER · MUMBAI JNPT</div>
          <h1 className="text-2xl font-bold text-white mt-1">Live Dashboard</h1>
        </div>
        <div className="flex gap-4">
          <div className="flex flex-col items-end">
            <span className="text-xs font-medium">Gateway API Health: <span className={`font-bold ${backendHealth === 'ok' ? 'text-green-400' : 'text-red-400'}`}>{backendHealth === 'ok' ? 'ACTIVE' : backendHealth}</span></span>
            <span className="text-xs font-medium">WebSocket Status: <span className={`font-bold ${wsStatus === 'CONNECTED' ? 'text-green-400' : 'text-red-400'}`}>{wsStatus}</span></span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6">
        <section className="col-span-8 space-y-6">
          <div className="glass-card rounded-3xl p-6 min-h-[160px] flex flex-col">
            <h2 className="text-lg font-semibold text-white mb-4">Live Operations Metrics</h2>
            <div className="grid grid-cols-3 gap-6 flex-1">
              <div className="bg-brand-dark/50 border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden group">
                <div className="absolute top-0 w-full h-1 bg-green-500/50"></div>
                <div className="text-5xl font-mono font-bold text-white">{stats.cleared}</div>
                <div className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-2">Cleared</div>
              </div>
              <div className="bg-brand-dark/50 border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden group">
                <div className="absolute top-0 w-full h-1 bg-brand-amber/50"></div>
                <div className="text-5xl font-mono font-bold text-white">{stats.pending}</div>
                <div className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-2">Pending</div>
              </div>
              <div className="bg-brand-dark/50 border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden group">
                <div className="absolute top-0 w-full h-1 bg-brand-red/50"></div>
                <div className="text-5xl font-mono font-bold text-white">{stats.holds}</div>
                <div className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-2">Holds</div>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6 flex flex-col">
             <h2 className="text-lg font-semibold text-white mb-4">MVP Feature Testing</h2>
             <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <h3 className="text-sm font-bold text-brand-accent mb-2">1. Importer Lookup (Fabric Identity)</h3>
                    <div className="flex gap-2">
                      <input type="text" value={gstinInput} onChange={(e) => setGstinInput(e.target.value)} className="bg-brand-dark text-xs p-2 rounded border border-white/10 flex-1 text-white" placeholder="GSTIN" />
                      <button onClick={testImporter} className="bg-brand-accent text-white px-3 py-2 rounded text-xs font-bold">Check</button>
                    </div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <h3 className="text-sm font-bold text-brand-red mb-2">2. Global Sanctions Check</h3>
                    <div className="flex gap-2">
                      <input type="text" value={sanctionsInput} onChange={(e) => setSanctionsInput(e.target.value)} className="bg-brand-dark text-xs p-2 rounded border border-white/10 flex-1 text-white" placeholder="Entity Name" />
                      <button onClick={testSanctions} className="bg-brand-red text-white px-3 py-2 rounded text-xs font-bold">Check</button>
                    </div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <h3 className="text-sm font-bold text-brand-amber mb-2">3. End-to-End Clearance Test</h3>
                    <p className="text-[10px] text-gray-400 mb-2">Simulates a new container arriving, sending it through Vision AI & Risk AI via the API Gateway.</p>
                    <button onClick={testClearance} className="bg-brand-amber text-black w-full py-2 rounded text-xs font-bold">Submit New Clearance Payload</button>
                  </div>
                </div>
                
                <div className="bg-black/50 p-4 rounded-xl border border-white/10 overflow-y-auto max-h-[300px]">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Test Activity Log</h3>
                  {testLog.length === 0 ? <p className="text-xs text-gray-600 font-mono">No activity yet...</p> : (
                    <ul className="space-y-2">
                      {testLog.map((log, i) => (
                        <li key={i} className="text-[10px] font-mono text-green-400 border-b border-white/5 pb-2">{log}</li>
                      ))}
                    </ul>
                  )}
                </div>
             </div>
          </div>
        </section>

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
