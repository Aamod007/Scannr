import express from 'express';
import path from 'path';
import cors from 'cors';
import http from 'http';
import fs from 'fs';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;
// We now serve the built Vite React app from dist
const uiPath = path.resolve(__dirname, 'dist', 'index.html');

// Microservice URLs (Docker: service names, local: localhost ports)
const VISION_URL = process.env.VISION_SVC_URL || 'http://localhost:8001';
const RISK_URL = process.env.RISK_SVC_URL || 'http://localhost:8002';
const IDENTITY_URL = process.env.IDENTITY_SVC_URL || 'http://localhost:8005';

app.use(cors());
app.use(express.json());

// Serve static assets from the Vite build directory
app.use(express.static(path.resolve(__dirname, 'dist')));

// ── Proxy helper: forward request to a microservice with fallback ──
function fetchService(url, options = {}) {
  return new Promise((resolve, reject) => {
    const timeout = options.timeout || 3000;
    const method = options.method || 'GET';
    const body = options.body ? JSON.stringify(options.body) : null;
    const urlObj = new URL(url);

    const req = http.request({
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
      },
      timeout,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

async function proxyOrFallback(url, fallback, options = {}) {
  try {
    const result = await fetchService(url, options);
    if (result.status >= 200 && result.status < 300) return result.data;
  } catch (e) {
    // Service unavailable, use fallback
  }
  return typeof fallback === 'function' ? fallback() : fallback;
}

// ==========================================================================
// SIMULATED DATA - mirrors PRD schemas and microservices
// ==========================================================================

// Container queue (clearance_decisions table)
const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60_000).toISOString();

const QUEUE = [
  {
    id: 'TCMU-7481-3', type: 'Standard 20ft', origin: 'Singapore', flag: 'SG', origin_country: 'SG',
    status: 'Auto-cleared', operator: 'AI', cargo_category: 'electronics',
    cargo_weight: 8400, cargo_volume: 28, cargo_declared_value: 3200000, hs_code: '8471.30',
    blockchain_trust_score: 95, vision_anomaly_flag: false, vision_confidence: 0.05, vision_class: 'none',
    route_transshipment_count: 0, importer_gstin: '29AALCT1234H1Z9', consignee: 'Bharat Machines Corp.',
    created_at: minutesAgo(9),
  },
  {
    id: 'MSCU-1194-8', type: 'Reefer 40ft', origin: 'Rotterdam', flag: 'NL', origin_country: 'NL',
    status: 'Manual Review', operator: 'OFF-MUM-0015', cargo_category: 'perishables',
    cargo_weight: 12600, cargo_volume: 45, cargo_declared_value: 1800000, hs_code: '0202.30',
    blockchain_trust_score: 75, vision_anomaly_flag: false, vision_confidence: 0.21, vision_class: 'density_variance',
    route_transshipment_count: 1, importer_gstin: '33AADCS0472B1Z2', consignee: 'SG Fresh Foods India',
    created_at: minutesAgo(22),
  },
  {
    id: 'CMAU-6620-2', type: 'Standard 40ft', origin: 'Shenzhen', flag: 'CN', origin_country: 'CN',
    status: 'Hold', operator: 'OFF-MUM-0042', cargo_category: 'batteries',
    cargo_weight: 15100, cargo_volume: 51, cargo_declared_value: 8800000, hs_code: '8507.60',
    blockchain_trust_score: 18, vision_anomaly_flag: true, vision_confidence: 0.83, vision_class: 'concealed_density',
    route_transshipment_count: 2, importer_gstin: '24AABCE5678F1Z1', consignee: 'MetalWorks Gujarat Pvt. Ltd.',
    created_at: minutesAgo(38),
  },
  {
    id: 'HLCU-3308-6', type: 'Open Top 20ft', origin: 'Dubai', flag: 'AE', origin_country: 'AE',
    status: 'Manual Review', operator: 'OFF-MUM-0031', cargo_category: 'machinery',
    cargo_weight: 17600, cargo_volume: 32, cargo_declared_value: 6100000, hs_code: '8429.52',
    blockchain_trust_score: 48, vision_anomaly_flag: false, vision_confidence: 0.48, vision_class: 'oversize_pattern',
    route_transshipment_count: 1, importer_gstin: '07AABCR1234E1Z3', consignee: 'EuroChem India Ltd.',
    created_at: minutesAgo(55),
  },
  {
    id: 'OOLU-9082-1', type: 'Standard 20ft', origin: 'Busan', flag: 'KR', origin_country: 'KR',
    status: 'Auto-cleared', operator: 'AI', cargo_category: 'consumer goods',
    cargo_weight: 9200, cargo_volume: 30, cargo_declared_value: 2200000, hs_code: '8517.12',
    blockchain_trust_score: 88, vision_anomaly_flag: false, vision_confidence: 0.08, vision_class: 'none',
    route_transshipment_count: 0, importer_gstin: '27AABCU9603R1ZN', consignee: 'TechCorp India Pvt. Ltd.',
    created_at: minutesAgo(74),
  },
  {
    id: 'TGHU-2044-5', type: 'Tank 20ft', origin: 'Lagos', flag: 'NG', origin_country: 'NG',
    status: 'Hold', operator: 'OFF-MUM-0028', cargo_category: 'chemicals',
    cargo_weight: 19000, cargo_volume: 26, cargo_declared_value: 12500000, hs_code: '2933.99',
    blockchain_trust_score: 30, vision_anomaly_flag: true, vision_confidence: 0.72, vision_class: 'unusual_shape',
    route_transshipment_count: 2, importer_gstin: '36AABCG9012K1Z5', consignee: 'Indo-Pak Textiles',
    created_at: minutesAgo(96),
  },
];

// Operators (officers)
const OPERATORS = [
  { id: 'OFF-MUM-0042', name: 'David Chen', initials: 'DC', role: 'Global Admin', status: 'on_shift', assigned: 6, accuracy: 98.4, shift: '06:00 - 14:00', color: 'blue' },
  { id: 'OFF-MUM-0015', name: 'Jessica Santos', initials: 'JS', role: 'Sr. Inspector', status: 'on_shift', assigned: 4, accuracy: 96.1, shift: '06:00 - 14:00', color: 'pink' },
  { id: 'OFF-MUM-0031', name: 'James Donovan', initials: 'JD', role: 'Inspector', status: 'on_shift', assigned: 3, accuracy: 94.7, shift: '06:00 - 14:00', color: 'gray' },
  { id: 'OFF-MUM-0028', name: 'Maria Kovacs', initials: 'MK', role: 'Inspector', status: 'on_shift', assigned: 5, accuracy: 97.2, shift: '06:00 - 14:00', color: 'purple' },
  { id: 'OFF-MUM-0053', name: 'Priya Mehta', initials: 'PM', role: 'Sr. Inspector', status: 'on_shift', assigned: 4, accuracy: 95.8, shift: '06:00 - 14:00', color: 'teal' },
  { id: 'OFF-MUM-0067', name: 'Arjun Lahiri', initials: 'AL', role: 'Sr. Inspector', status: 'off_duty', assigned: 0, accuracy: 95.8, shift: '14:00 - 22:00', color: 'teal' },
  { id: 'OFF-MUM-0072', name: 'Rachel Wang', initials: 'RW', role: 'Inspector', status: 'off_duty', assigned: 0, accuracy: 93.1, shift: '14:00 - 22:00', color: 'orange' },
  { id: 'OFF-MUM-0044', name: 'Rajan Kumar', initials: 'RK', role: 'Inspector', status: 'off_duty', assigned: 0, accuracy: 91.5, shift: '22:00 - 06:00', color: 'red' },
];

// Override log (officer_overrides table)
const OVERRIDES = [];

// Importer profiles (blockchain identity-svc)
const IMPORTERS = {
  '27AABCU9603R1ZN': { name: 'TechCorp India Pvt. Ltd.', gstin: '27AABCU9603R1ZN', trust_score: 88, registered_since: '2019-01-14', years_active: 7, aeo_tier: 'Tier 1 Certified', total_inspections: 47, violations: 0, sanctions_match: false, block_hash: '0x3f9a2c...e221', block_number: 184729 },
  '33AADCS0472B1Z2': { name: 'SG Fresh Foods India', gstin: '33AADCS0472B1Z2', trust_score: 75, registered_since: '2021-03-22', years_active: 5, aeo_tier: 'Tier 2', total_inspections: 23, violations: 1, sanctions_match: false, block_hash: '0x7c12ab...f893', block_number: 184614 },
  '07AABCR1234E1Z3': { name: 'EuroChem India Ltd.', gstin: '07AABCR1234E1Z3', trust_score: 48, registered_since: '2023-06-10', years_active: 3, aeo_tier: 'None', total_inspections: 12, violations: 3, sanctions_match: false, block_hash: '0x1e44df...a102', block_number: 184520 },
  '24AABCE5678F1Z1': { name: 'MetalWorks Gujarat Pvt. Ltd.', gstin: '24AABCE5678F1Z1', trust_score: 18, registered_since: '2024-11-01', years_active: 1, aeo_tier: 'None', total_inspections: 5, violations: 4, sanctions_match: true, block_hash: '0x9b33ee...c445', block_number: 184389 },
  '29AALCT1234H1Z9': { name: 'Bharat Machines Corp.', gstin: '29AALCT1234H1Z9', trust_score: 95, registered_since: '2015-04-12', years_active: 11, aeo_tier: 'Tier 1 Certified', total_inspections: 112, violations: 0, sanctions_match: false, block_hash: '0x6a88bc...d771', block_number: 184701 },
  '36AABCG9012K1Z5': { name: 'Indo-Pak Textiles', gstin: '36AABCG9012K1Z5', trust_score: 30, registered_since: '2022-08-15', years_active: 4, aeo_tier: 'None', total_inspections: 18, violations: 5, sanctions_match: false, block_hash: '0x2d11fa...b339', block_number: 184455 },
};

// Microservices health
const SERVICES = [
  { name: 'vision-svc', description: 'YOLOv8 inference + Grad-CAM', status: 'healthy', latency: '4.2s', uptime: 99.97, port: 8001 },
  { name: 'identity-svc', description: 'Hyperledger Fabric gateway', status: 'healthy', latency: '8.1s', uptime: 100, port: 8002 },
  { name: 'risk-svc', description: 'XGBoost risk scoring', status: 'healthy', latency: '1.8s', uptime: 99.94, port: 8003 },
  { name: 'tariff-sync-svc', description: 'CBIC tariff API sync', status: 'healthy', latency: 'n/a', uptime: 99.99, port: 8004 },
  { name: 'ml-monitor-svc', description: 'Drift detection + A/B test', status: 'healthy', latency: 'n/a', uptime: 99.91, port: 8005 },
  { name: 'api-gateway', description: 'Kong + FastAPI routing', status: 'healthy', latency: '12ms', uptime: 100, port: 8006 },
  { name: 'dashboard-svc', description: 'UI + API gateway', status: 'healthy', latency: 'n/a', uptime: 100, port: 8000 },
];

// Tariff data (tariff_risk_weights table)
const TARIFFS = {
  last_sync: '2026-02-20T06:12:00Z',
  next_sync: '2026-02-20T12:12:00Z',
  hs_codes_loaded: 5247,
  budget_year: '2026-27',
  changes: [
    { hs_code: '8507', description: 'Lithium batteries', risk_weight_change: '+15%', effective: '2026-02-18', category: 'increase' },
    { hs_code: '8517', description: 'Telecommunications equipment', risk_weight_change: 'No change', effective: '2026-02-18', category: 'none' },
    { hs_code: '7108', description: 'Gold (unwrought)', risk_weight_change: '+25%', effective: '2026-02-15', category: 'increase' },
    { hs_code: '2933', description: 'Chemical compounds (heterocyclic)', risk_weight_change: '+10%', effective: '2026-02-10', category: 'increase' },
    { hs_code: '8471', description: 'Data processing machines', risk_weight_change: '-5%', effective: '2026-02-08', category: 'decrease' },
  ],
};

// ML model info (ml-monitor-svc + ml_training_queue table)
const ML_MODEL = {
  current_version: 'v2.3',
  current_accuracy: 93.1,
  ab_test_version: 'v2.4',
  ab_test_traffic: 10,
  samples_queued: 34,
  retrain_trigger: 50,
  last_retrain: '2026-02-18T02:00:00Z',
  next_retrain_estimate: '2026-02-22T02:00:00Z',
  weekly_accuracy: [91.2, 91.8, 92.4, 92.9, 93.1, 93.0, 93.1],
};

// Settings (system config)
const SETTINGS = {
  thresholds: { auto_flag: 90, alert: 70, green_lane: 20 },
  features: { auto_release: true, email_alerts: true, blockchain_verification: true, nightly_retrain: true },
  notifications: { lane_changes: true, new_containers: false, model_updates: true },
  compliance: { data_retention: '5 Years', audit_log: 'Immutable', encryption: 'AES-256 + TLS 1.3' },
};

// Analytics data (aggregated from clearance_decisions)
const ANALYTICS = {
  total_scans: 1284,
  lane_distribution: { green: 0, yellow: 0, red: 0 },
  weekly_volumes: [
    { day: 'Mon', count: 172 }, { day: 'Tue', count: 196 },
    { day: 'Wed', count: 184 }, { day: 'Thu', count: 211 },
    { day: 'Fri', count: 229 }, { day: 'Sat', count: 156 },
    { day: 'Sun', count: 136 },
  ],
  risk_by_origin: [
    { code: 'CN', name: 'China', risk: 85 },
    { code: 'RU', name: 'Russia', risk: 78 },
    { code: 'NG', name: 'Nigeria', risk: 65 },
    { code: 'MM', name: 'Myanmar', risk: 62 },
  ],
  ai_accuracy_trend: [91.2, 91.8, 92.4, 92.9, 93.1, 93.0, 93.1],
  clearance_volume_trend: [172, 196, 184, 211, 229, 156, 136],
};

// Dashboard live stats
const DASHBOARD_STATS = {
  throughput: 42,
  containers_today: QUEUE.length,
  avg_clearance_time: '11m 40s',
  ai_accuracy: ML_MODEL.current_accuracy,
  active_alerts: 2,
  green_lane_pct: 0,
  red_lane_count: 0,
  yellow_lane_count: 0,
  predictive_risk: 0,
  system_health: { healthy: 7, total: 7 },
};

// Activity feed (live events)
const ACTIVITY_FEED = [
  { id: 'evt-001', type: 'clearance', message: 'TCMU-7481-3 auto-cleared through green lane', severity: 'success', timestamp: minutesAgo(9) },
  { id: 'evt-002', type: 'hold', message: 'CMAU-6620-2 moved to red lane for density anomaly', severity: 'danger', timestamp: minutesAgo(38) },
  { id: 'evt-003', type: 'review', message: 'MSCU-1194-8 assigned to manual review', severity: 'warning', timestamp: minutesAgo(22) },
  { id: 'evt-004', type: 'model', message: 'Risk model v2.3 serving with 93.1% accuracy', severity: 'info', timestamp: minutesAgo(80) },
  { id: 'evt-005', type: 'health', message: 'All seven dashboard-monitored services reporting healthy', severity: 'success', timestamp: minutesAgo(120) },
];

// Origin risk lookup (mirrors risk-svc/app/features/origin_risk.py)
const ORIGIN_RISK = {
  CN: 4.2, RU: 5.1, NG: 3.8, PK: 3.5, MM: 4.0,
  SG: 1.2, NL: 1.0, BR: 2.0, US: 0.8, IN: 2.5,
  AE: 2.8, KR: 1.1, JP: 0.7, DE: 0.9, GB: 0.8,
};

// ==========================================================================
// Risk scoring - mirrors risk-svc/app/model/predict.py (fallback mode)
// ==========================================================================
function scoreContainer(payload) {
  const trustWeight = 0.40;
  const visionWeight = 0.30;
  const cargoWeight = 0.15;
  const routeWeight = 0.10;
  const intelWeight = 0.05;

  const trustScore = payload.blockchain_trust_score ?? 50;
  const trustRisk = (100 - trustScore) * trustWeight;

  let visionRisk = 0;
  if (payload.vision_anomaly_flag) {
    visionRisk = (payload.vision_confidence ?? 0) * 100 * visionWeight;
  } else {
    visionRisk = (payload.vision_confidence ?? 0) * 20 * visionWeight;
  }

  const declaredValue = Math.max(payload.cargo_declared_value ?? 1, 1);
  const valueLog = Math.log(declaredValue);
  const cargoRisk = Math.min((valueLog / 20) * 100, 100) * cargoWeight;

  const originRisk = ORIGIN_RISK[payload.origin_country] ?? 1.0;
  const transshipments = payload.route_transshipment_count ?? 0;
  const routeRisk = (originRisk * 10 + transshipments * 10) * routeWeight;

  const intelRisk = 0 * intelWeight;

  let riskScore = trustRisk + visionRisk + cargoRisk + routeRisk + intelRisk;
  riskScore = Math.max(0, Math.min(100, riskScore));

  let lane = 'GREEN';
  if (riskScore > 60) lane = 'RED';
  else if (riskScore > 20) lane = 'YELLOW';

  const topFeatures = [
    { name: 'blockchain_trust_score', value: trustScore, impact: trustRisk.toFixed(1) },
    { name: 'vision_confidence', value: payload.vision_confidence ?? 0, impact: visionRisk.toFixed(1) },
    { name: 'cargo_value', value: declaredValue, impact: cargoRisk.toFixed(1) },
    { name: 'route_origin_risk', value: originRisk, impact: routeRisk.toFixed(1) },
  ];

  return {
    risk_score: Math.round(riskScore * 100) / 100,
    lane,
    top_features: topFeatures,
    model_used: 'fallback_weighted_sum',
  };
}

// ==========================================================================
// API ROUTES
// ==========================================================================

// --- Health ---
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'dashboard-svc', uptime: process.uptime() });
});

// --- Dashboard Stats (main dashboard KPIs) ---
app.get('/api/dashboard/stats', (req, res) => {
  // Compute live stats from queue
  const scored = QUEUE.map(c => ({ ...c, ...scoreContainer(c) }));
  const reds = scored.filter(c => c.lane === 'RED').length;
  const yellows = scored.filter(c => c.lane === 'YELLOW').length;
  const greens = scored.filter(c => c.lane === 'GREEN').length;
  const total = scored.length;
  res.json({
    throughput: DASHBOARD_STATS.throughput,
    containers_today: total,
    avg_clearance_time: DASHBOARD_STATS.avg_clearance_time,
    ai_accuracy: ML_MODEL.current_accuracy,
    active_alerts: reds,
    green_lane_pct: total > 0 ? Math.round((greens / total) * 100) : 0,
    red_lane_count: reds,
    yellow_lane_count: yellows,
    green_lane_count: greens,
    predictive_risk: DASHBOARD_STATS.predictive_risk,
    system_health: { healthy: SERVICES.filter(s => s.status === 'healthy').length, total: SERVICES.length },
  });
});

// --- Activity Feed ---
app.get('/api/dashboard/activity', (req, res) => {
  res.json({ events: ACTIVITY_FEED });
});

// --- Container Queue ---
app.get('/api/queue', (req, res) => {
  const scored = QUEUE.map(c => {
    const result = scoreContainer(c);
    return {
      id: c.id, type: c.type, origin: c.origin, flag: c.flag,
      status: c.status, risk_score: result.risk_score, lane: result.lane,
      operator: c.operator, cargo_category: c.cargo_category,
      hs_code: c.hs_code, created_at: c.created_at,
    };
  });
  res.json({ containers: scored, total: scored.length });
});

// --- Single Container Detail ---
app.get('/api/containers/:id', (req, res) => {
  const container = QUEUE.find(c => c.id === req.params.id);
  if (!container) return res.status(404).json({ error: 'Container not found' });
  const result = scoreContainer(container);
  const importer = IMPORTERS[container.importer_gstin] || null;
  res.json({ ...container, ...result, importer });
});

// --- Score Arbitrary Payload (proxy to risk-svc) ---
app.post('/api/score', async (req, res) => {
  const result = await proxyOrFallback(
    `${RISK_URL}/score`,
    () => scoreContainer(req.body),
    { method: 'POST', body: req.body }
  );
  res.json(result);
});

// --- Operators ---
app.get('/api/operators', (req, res) => {
  const onShift = OPERATORS.filter(o => o.status === 'on_shift');
  const offDuty = OPERATORS.filter(o => o.status === 'off_duty');
  res.json({
    operators: OPERATORS,
    stats: {
      on_duty: onShift.length,
      off_duty: offDuty.length,
      total: OPERATORS.length,
      avg_cases_per_day: Math.round(onShift.reduce((s, o) => s + o.assigned, 0) / Math.max(onShift.length, 1)),
      avg_accuracy: (OPERATORS.reduce((s, o) => s + o.accuracy, 0) / OPERATORS.length).toFixed(1),
    },
  });
});

// --- Overrides ---
app.get('/api/overrides', (req, res) => {
  res.json({ overrides: OVERRIDES, total: OVERRIDES.length });
});
app.post('/api/overrides', (req, res) => {
  const { container_id, officer_id, from_lane, to_lane, reason } = req.body;
  const override = {
    id: 'OVR-' + String(OVERRIDES.length + 1).padStart(3, '0'),
    officer_name: OPERATORS.find(o => o.id === officer_id)?.name || officer_id,
    officer_id, container_id, from_lane, to_lane, reason,
    created_at: new Date().toISOString(),
  };
  OVERRIDES.unshift(override);
  res.json(override);
});

// --- Importer Lookup (proxy to real identity-svc) ---
app.get('/api/importer/:gstin', async (req, res) => {
  const gstin = req.params.gstin;
  const profile = await proxyOrFallback(
    `${IDENTITY_URL}/importer/${gstin}`,
    () => IMPORTERS[gstin] || null
  );
  if (!profile) return res.status(404).json({ error: 'Importer not found', gstin });
  res.json(profile);
});

// --- List all importers (proxy to identity-svc) ---
app.get('/api/importers', async (req, res) => {
  const result = await proxyOrFallback(
    `${IDENTITY_URL}/importers`,
    () => ({ importers: Object.values(IMPORTERS), total: Object.keys(IMPORTERS).length })
  );
  res.json(result);
});

// --- Blockchain/Fabric Status (proxy to identity-svc) ---
app.get('/api/blockchain/status', async (req, res) => {
  const result = await proxyOrFallback(
    `${IDENTITY_URL}/fabric/status`,
    () => ({
      network: 'india-customs-network',
      fabric_version: '2.5.4',
      organizations: [
        { name: 'CustomsOrg', mspId: 'CustomsMSP', status: 'active' },
        { name: 'PortAuthorityOrg', mspId: 'PortAuthorityMSP', status: 'active' },
      ],
      ledger_height: 12,
      consensus: 'Raft',
    })
  );
  res.json(result);
});

// --- Blockchain Ledger (proxy to identity-svc) ---
app.get('/api/blockchain/ledger', async (req, res) => {
  const result = await proxyOrFallback(
    `${IDENTITY_URL}/fabric/ledger`,
    () => ({ channel: 'india-customs-main', height: 0, transactions: [] })
  );
  res.json(result);
});

// --- Sanctions Check ---
app.post('/api/sanctions/check', (req, res) => {
  const { query } = req.body;
  const importer = Object.values(IMPORTERS).find(
    i => i.name.toLowerCase().includes((query || '').toLowerCase()) || i.gstin === query
  );
  const isSanctioned = importer?.sanctions_match || false;
  res.json({
    query,
    databases: [
      { name: 'OFAC SDN List', updated: '2026-02-18', status: isSanctioned ? 'MATCH' : 'CLEAR' },
      { name: 'UN Consolidated', updated: '2026-02-17', status: 'CLEAR' },
      { name: 'EU Sanctions', updated: '2026-02-16', status: 'CLEAR' },
      { name: 'INTERPOL Notices', updated: '2026-02-18', status: 'CLEAR' },
      { name: 'India CIBIL', updated: '2026-02-15', status: isSanctioned ? 'MATCH' : 'CLEAR' },
    ],
    overall: isSanctioned ? 'MATCH_FOUND' : 'ALL_CLEAR',
    matched_entity: isSanctioned ? importer?.name : null,
  });
});

// --- Initiate Clearance ---
app.post('/api/clearance/initiate', (req, res) => {
  const { container_id, importer_gstin, declared_value_inr, hs_code } = req.body;
  const clearance_id = 'CLR-' + Date.now().toString(36).toUpperCase();
  // Add to queue
  const newContainer = {
    id: container_id || 'NEW-' + Date.now().toString(36).toUpperCase(),
    type: 'Standard 20ft', origin: 'Unknown', flag: 'IN', origin_country: 'IN',
    status: 'Live Scan', operator: 'AI',
    cargo_category: 'mixed', cargo_weight: 10000, cargo_volume: 30,
    cargo_declared_value: declared_value_inr || 100000,
    hs_code: hs_code || '0000.00',
    blockchain_trust_score: IMPORTERS[importer_gstin]?.trust_score ?? 50,
    vision_anomaly_flag: false, vision_confidence: 0, vision_class: 'none',
    route_transshipment_count: 0, importer_gstin: importer_gstin || '',
    consignee: IMPORTERS[importer_gstin]?.name || 'Unknown',
    created_at: new Date().toISOString(),
  };
  QUEUE.unshift(newContainer);

  const scored = scoreContainer(newContainer);
  clearanceCount++;
  ACTIVITY_FEED.unshift({
    id: `evt-${Date.now()}`,
    type: 'clearance',
    message: `${newContainer.id} entered ${scored.lane.toLowerCase()} lane`,
    severity: scored.lane === 'RED' ? 'danger' : scored.lane === 'YELLOW' ? 'warning' : 'success',
    timestamp: new Date().toISOString(),
  });
  ACTIVITY_FEED.splice(12);

  // Broadcast new container event to all WebSocket clients.
  broadcastWS({
    type: 'new_clearance',
    container: { ...newContainer, ...scored },
    timestamp: new Date().toISOString(),
  });

  res.json({ clearance_id, container_id: newContainer.id, status: 'PROCESSING', estimated_completion_sec: 50 });
});

// --- Analytics ---
app.get('/api/analytics', (req, res) => {
  // Compute live analytics from queue
  const scored = QUEUE.map(c => ({ ...c, ...scoreContainer(c) }));
  const greens = scored.filter(c => c.lane === 'GREEN').length;
  const yellows = scored.filter(c => c.lane === 'YELLOW').length;
  const reds = scored.filter(c => c.lane === 'RED').length;
  const total = scored.length;

  res.json({
    ...ANALYTICS,
    lane_distribution: {
      green: total > 0 ? +(greens / total).toFixed(2) : 0,
      yellow: total > 0 ? +(yellows / total).toFixed(2) : 0,
      red: total > 0 ? +(reds / total).toFixed(2) : 0,
    },
    total_scans: ANALYTICS.total_scans + total,
  });
});

// --- Settings ---
app.get('/api/settings', (req, res) => {
  res.json(SETTINGS);
});
app.put('/api/settings', (req, res) => {
  Object.assign(SETTINGS, req.body);
  res.json(SETTINGS);
});

// --- Microservices Status (live ping) ---
app.get('/api/services', async (req, res) => {
  const svcChecks = SERVICES.map(async (svc) => {
    const urlMap = {
      'vision-svc': VISION_URL,
      'risk-svc': RISK_URL,
      'identity-svc': IDENTITY_URL,
    };
    const url = urlMap[svc.name];
    if (url) {
      const start = Date.now();
      try {
        await fetchService(`${url}/health`, { timeout: 2000 });
        return { ...svc, status: 'healthy', latency: `${Date.now() - start}ms` };
      } catch {
        return { ...svc, status: 'unreachable', latency: 'n/a' };
      }
    }
    return svc;
  });
  const services = await Promise.all(svcChecks);
  res.json({
    services,
    healthy: services.filter(s => s.status === 'healthy').length,
    total: services.length,
  });
});

// --- Tariff Sync ---
app.get('/api/tariffs', (req, res) => {
  res.json(TARIFFS);
});

// --- ML Model Info (read real model cards) ---
app.get('/api/ml/status', (req, res) => {
  const modelsDir = path.resolve(__dirname, '..', '..', 'data', 'models');
  let modelInfo = { ...ML_MODEL };

  // Try to read real YOLOv8 model card
  try {
    const yoloCard = JSON.parse(fs.readFileSync(path.join(modelsDir, 'yolov8_model_card.json'), 'utf8'));
    modelInfo.vision_model = yoloCard;
    modelInfo.model_version = yoloCard.model || modelInfo.model_version;
  } catch { }

  // Try to read real XGBoost model info
  try {
    const xgbExists = fs.existsSync(path.join(modelsDir, 'xgboost_risk_model.json'));
    modelInfo.risk_model = {
      name: 'XGBoost Risk Classifier',
      status: xgbExists ? 'loaded' : 'fallback',
      path: 'data/models/xgboost_risk_model.json',
    };
  } catch { }

  res.json(modelInfo);
});

// ── Prometheus-style metrics endpoint ──
let requestCount = 0;
let clearanceCount = 0;
let wsConnectionCount = 0;

app.use((req, res, next) => {
  requestCount++;
  next();
});

app.get('/metrics', (req, res) => {
  const scored = QUEUE.map(c => ({ ...c, ...scoreContainer(c) }));
  const greens = scored.filter(c => c.lane === 'GREEN').length;
  const yellows = scored.filter(c => c.lane === 'YELLOW').length;
  const reds = scored.filter(c => c.lane === 'RED').length;
  res.set('Content-Type', 'text/plain');
  res.send([
    '# HELP scannr_http_requests_total Total HTTP requests',
    '# TYPE scannr_http_requests_total counter',
    `scannr_http_requests_total ${requestCount}`,
    '# HELP scannr_clearances_total Total clearances initiated',
    '# TYPE scannr_clearances_total counter',
    `scannr_clearances_total ${clearanceCount}`,
    '# HELP scannr_containers_queued Current containers in queue',
    '# TYPE scannr_containers_queued gauge',
    `scannr_containers_queued ${QUEUE.length}`,
    '# HELP scannr_lane_distribution Containers by lane',
    '# TYPE scannr_lane_distribution gauge',
    `scannr_lane_distribution{lane="green"} ${greens}`,
    `scannr_lane_distribution{lane="yellow"} ${yellows}`,
    `scannr_lane_distribution{lane="red"} ${reds}`,
    '# HELP scannr_ws_connections Active WebSocket connections',
    '# TYPE scannr_ws_connections gauge',
    `scannr_ws_connections ${wsConnectionCount}`,
    '# HELP scannr_services_healthy Number of healthy microservices',
    '# TYPE scannr_services_healthy gauge',
    `scannr_services_healthy ${SERVICES.filter(s => s.status === 'healthy').length}`,
    '',
  ].join('\n'));
});

// Serve UI (catch-all, must be last)
app.get('*', (req, res) => {
  res.sendFile(uiPath);
});

// ── WebSocket server for live stats push ──
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/stats' });

function broadcastWS(data) {
  const payload = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(payload);
  });
}

// Push live dashboard stats to all clients every 5 seconds
setInterval(() => {
  if (wss.clients.size === 0) return;
  const scored = QUEUE.map(c => ({ ...c, ...scoreContainer(c) }));
  const reds = scored.filter(c => c.lane === 'RED').length;
  const yellows = scored.filter(c => c.lane === 'YELLOW').length;
  const greens = scored.filter(c => c.lane === 'GREEN').length;
  const total = scored.length;
  broadcastWS({
    type: 'stats_update',
    stats: {
      throughput: DASHBOARD_STATS.throughput,
      containers_today: total,
      avg_clearance_time: DASHBOARD_STATS.avg_clearance_time,
      ai_accuracy: ML_MODEL.current_accuracy,
      active_alerts: reds,
      green_lane_pct: total > 0 ? Math.round((greens / total) * 100) : 0,
      red_lane_count: reds,
      yellow_lane_count: yellows,
      green_lane_count: greens,
      system_health: { healthy: SERVICES.filter(s => s.status === 'healthy').length, total: SERVICES.length },
    },
    timestamp: new Date().toISOString(),
  });
}, 5000);

wss.on('connection', (ws) => {
  wsConnectionCount++;
  ws.on('close', () => wsConnectionCount--);
});

server.listen(PORT, () => {
  console.log(`\nSCANNR Dashboard running on http://localhost:${PORT}`);
  console.log(`WebSocket live stats on ws://localhost:${PORT}/ws/stats`);
  console.log(`Prometheus metrics on http://localhost:${PORT}/metrics`);
  console.log(`\nAPI Endpoints:`);
  console.log(`  GET  /api/dashboard/stats    - live dashboard KPIs`);
  console.log(`  GET  /api/dashboard/activity - activity feed`);
  console.log(`  GET  /api/queue              - container queue`);
  console.log(`  GET  /api/containers/:id     - container detail`);
  console.log(`  GET  /api/operators          - operator roster`);
  console.log(`  GET  /api/overrides          - override log`);
  console.log(`  GET  /api/analytics          - analytics data`);
  console.log(`  GET  /api/importer/:gstin    - blockchain lookup`);
  console.log(`  POST /api/sanctions/check    - sanctions check`);
  console.log(`  POST /api/clearance/initiate - new clearance`);
  console.log(`  GET  /api/settings           - system settings`);
  console.log(`  GET  /api/services           - microservices health`);
  console.log(`  GET  /api/tariffs            - tariff sync status`);
  console.log(`  GET  /api/ml/status          - ML model info`);
  console.log(`  GET  /metrics                - Prometheus metrics`);
  console.log(`  GET  /health                 - service health\n`);
});
