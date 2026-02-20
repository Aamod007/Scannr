const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8000;
const uiPath = path.resolve(__dirname, '..', '..', 'code.html');

app.use(cors());
app.use(express.json());

// ==========================================================================
// SIMULATED DATA — mirrors PRD schemas & all microservices
// ==========================================================================

// Container queue (clearance_decisions table)
const QUEUE = [
  { id: 'MSKU-908122-4', type: 'Dry Van 40ft', origin: 'Shanghai, CN', flag: '🇨🇳', origin_country: 'CN', status: 'Flagged', operator: 'JD', cargo_category: 'electronics', cargo_weight: 22000, cargo_volume: 67, cargo_declared_value: 480000, hs_code: '8542.31', blockchain_trust_score: 22, vision_anomaly_flag: true, vision_confidence: 0.96, vision_class: 'density_anomaly', route_transshipment_count: 3, importer_gstin: '27AABCU9603R1ZN', consignee: 'Global Logistics Ltd', created_at: '2026-02-20T03:14:00Z' },
  { id: 'CSNU-442109-1', type: 'Reefer 20ft', origin: 'Singapore, SG', flag: '🇸🇬', origin_country: 'SG', status: 'Live Scan', operator: 'AI', cargo_category: 'food', cargo_weight: 12000, cargo_volume: 33, cargo_declared_value: 95000, hs_code: '0304.99', blockchain_trust_score: 75, vision_anomaly_flag: false, vision_confidence: 0.12, vision_class: 'none', route_transshipment_count: 0, importer_gstin: '33AADCS0472B1Z2', consignee: 'SG Fresh Foods', created_at: '2026-02-20T03:18:00Z' },
  { id: 'TRHU-110293-8', type: 'Standard 40ft', origin: 'Rotterdam, NL', flag: '🇳🇱', origin_country: 'NL', status: 'Review', operator: 'JS', cargo_category: 'chemicals', cargo_weight: 18500, cargo_volume: 55, cargo_declared_value: 210000, hs_code: '2933.71', blockchain_trust_score: 48, vision_anomaly_flag: false, vision_confidence: 0.35, vision_class: 'none', route_transshipment_count: 1, importer_gstin: '07AABCR1234E1Z3', consignee: 'EuroChem India', created_at: '2026-02-20T03:22:00Z' },
  { id: 'CMAU-554102-3', type: 'Tanker 20ft', origin: 'Santos, BR', flag: '🇧🇷', origin_country: 'BR', status: 'Cleared', operator: 'AI', cargo_category: 'food', cargo_weight: 9800, cargo_volume: 20, cargo_declared_value: 42000, hs_code: '1701.14', blockchain_trust_score: 88, vision_anomaly_flag: false, vision_confidence: 0.05, vision_class: 'none', route_transshipment_count: 0, importer_gstin: '27AABCU9603R1ZN', consignee: 'TechCorp India', created_at: '2026-02-20T03:25:00Z' },
  { id: 'MAEU-102938-7', type: 'Dry Van 40ft', origin: 'Los Angeles, US', flag: '🇺🇸', origin_country: 'US', status: 'Cleared', operator: 'AI', cargo_category: 'machinery', cargo_weight: 25000, cargo_volume: 60, cargo_declared_value: 320000, hs_code: '8471.30', blockchain_trust_score: 95, vision_anomaly_flag: false, vision_confidence: 0.02, vision_class: 'none', route_transshipment_count: 0, importer_gstin: '29AALCT1234H1Z9', consignee: 'Bharat Machines', created_at: '2026-02-20T03:28:00Z' },
  { id: 'HLCU-728192-0', type: 'Open Top 20ft', origin: 'St. Petersburg, RU', flag: '🇷🇺', origin_country: 'RU', status: 'Flagged', operator: 'MK', cargo_category: 'metals', cargo_weight: 30000, cargo_volume: 40, cargo_declared_value: 720000, hs_code: '7108.12', blockchain_trust_score: 18, vision_anomaly_flag: true, vision_confidence: 0.89, vision_class: 'undeclared_goods', route_transshipment_count: 4, importer_gstin: '24AABCE5678F1Z1', consignee: 'MetalWorks Gujarat', created_at: '2026-02-20T03:30:00Z' },
  { id: 'QILL-2026-00893', type: 'Standard 40ft', origin: 'Karachi, PK', flag: '🇵🇰', origin_country: 'PK', status: 'Flagged', operator: 'DC', cargo_category: 'textiles', cargo_weight: 14000, cargo_volume: 50, cargo_declared_value: 180000, hs_code: '6204.62', blockchain_trust_score: 30, vision_anomaly_flag: true, vision_confidence: 0.91, vision_class: 'density_anomaly', route_transshipment_count: 2, importer_gstin: '36AABCG9012K1Z5', consignee: 'Indo-Pak Textiles', created_at: '2026-02-20T03:32:00Z' },
  { id: 'TCMU-2026-00147', type: 'Standard 20ft', origin: 'Busan, KR', flag: '🇰🇷', origin_country: 'KR', status: 'Cleared', operator: 'AI', cargo_category: 'electronics', cargo_weight: 8500, cargo_volume: 28, cargo_declared_value: 450000, hs_code: '8517.12', blockchain_trust_score: 92, vision_anomaly_flag: false, vision_confidence: 0.03, vision_class: 'none', route_transshipment_count: 0, importer_gstin: '27AABCU9603R1ZN', consignee: 'TechCorp India', created_at: '2026-02-20T03:35:00Z' },
];

// Operators (officers)
const OPERATORS = [
  { id: 'OFF-MUM-0042', name: 'David Chen', initials: 'DC', role: 'Global Admin', status: 'on_shift', assigned: 6, accuracy: 98.4, shift: '06:00 – 14:00', color: 'blue' },
  { id: 'OFF-MUM-0015', name: 'Jessica Santos', initials: 'JS', role: 'Sr. Inspector', status: 'on_shift', assigned: 4, accuracy: 96.1, shift: '06:00 – 14:00', color: 'pink' },
  { id: 'OFF-MUM-0031', name: 'James Donovan', initials: 'JD', role: 'Inspector', status: 'on_shift', assigned: 3, accuracy: 94.7, shift: '06:00 – 14:00', color: 'gray' },
  { id: 'OFF-MUM-0028', name: 'Maria Kovacs', initials: 'MK', role: 'Inspector', status: 'on_shift', assigned: 5, accuracy: 97.2, shift: '06:00 – 14:00', color: 'purple' },
  { id: 'OFF-MUM-0053', name: 'Priya Mehta', initials: 'PM', role: 'Sr. Inspector', status: 'on_shift', assigned: 4, accuracy: 95.8, shift: '06:00 – 14:00', color: 'teal' },
  { id: 'OFF-MUM-0067', name: 'Arjun Lahiri', initials: 'AL', role: 'Sr. Inspector', status: 'off_duty', assigned: 0, accuracy: 95.8, shift: '14:00 – 22:00', color: 'teal' },
  { id: 'OFF-MUM-0072', name: 'Rachel Wang', initials: 'RW', role: 'Inspector', status: 'off_duty', assigned: 0, accuracy: 93.1, shift: '14:00 – 22:00', color: 'orange' },
  { id: 'OFF-MUM-0044', name: 'Rajan Kumar', initials: 'RK', role: 'Inspector', status: 'off_duty', assigned: 0, accuracy: 91.5, shift: '22:00 – 06:00', color: 'red' },
];

// Override log (officer_overrides table)
const OVERRIDES = [
  { id: 'OVR-001', officer_name: 'Priya M.', officer_id: 'OFF-MUM-0053', container_id: 'QILL-2026-00341', from_lane: 'YELLOW', to_lane: 'RED', reason: 'Suspicious packaging seen on physical review of adjacent container', created_at: '2026-02-20T08:42:00Z' },
  { id: 'OVR-002', officer_name: 'Rajan K.', officer_id: 'OFF-MUM-0044', container_id: 'MUMB-2026-00187', from_lane: 'RED', to_lane: 'YELLOW', reason: 'AI flagged standard industrial equipment — confirmed safe on visual', created_at: '2026-02-20T07:15:00Z' },
  { id: 'OVR-003', officer_name: 'David C.', officer_id: 'OFF-MUM-0042', container_id: 'HLCU-728192-0', from_lane: 'YELLOW', to_lane: 'RED', reason: 'Intelligence tip-off from MHA — heightened scrutiny on origin port', created_at: '2026-02-20T06:30:00Z' },
];

// Importer profiles (blockchain — identity-svc)
const IMPORTERS = {
  '27AABCU9603R1ZN': { name: 'TechCorp India Pvt. Ltd.', gstin: '27AABCU9603R1ZN', trust_score: 88, registered_since: '2019-01-14', years_active: 7, aeo_tier: 'Tier 1 Certified', total_inspections: 47, violations: 0, sanctions_match: false, block_hash: '0x3f9a2c...e221', block_number: 184729 },
  '33AADCS0472B1Z2': { name: 'SG Fresh Foods India', gstin: '33AADCS0472B1Z2', trust_score: 75, registered_since: '2021-03-22', years_active: 5, aeo_tier: 'Tier 2', total_inspections: 23, violations: 1, sanctions_match: false, block_hash: '0x7c12ab...f893', block_number: 184614 },
  '07AABCR1234E1Z3': { name: 'EuroChem India Ltd.', gstin: '07AABCR1234E1Z3', trust_score: 48, registered_since: '2023-06-10', years_active: 3, aeo_tier: 'None', total_inspections: 12, violations: 3, sanctions_match: false, block_hash: '0x1e44df...a102', block_number: 184520 },
  '24AABCE5678F1Z1': { name: 'MetalWorks Gujarat Pvt. Ltd.', gstin: '24AABCE5678F1Z1', trust_score: 18, registered_since: '2024-11-01', years_active: 1, aeo_tier: 'None', total_inspections: 5, violations: 4, sanctions_match: true, block_hash: '0x9b33ee...c445', block_number: 184389 },
  '29AALCT1234H1Z9': { name: 'Bharat Machines Corp.', gstin: '29AALCT1234H1Z9', trust_score: 95, registered_since: '2015-04-12', years_active: 11, aeo_tier: 'Tier 1 Certified', total_inspections: 112, violations: 0, sanctions_match: false, block_hash: '0x6a88bc...d771', block_number: 184701 },
  '36AABCG9012K1Z5': { name: 'Indo-Pak Textiles', gstin: '36AABCG9012K1Z5', trust_score: 30, registered_since: '2022-08-15', years_active: 4, aeo_tier: 'None', total_inspections: 18, violations: 5, sanctions_match: false, block_hash: '0x2d11fa...b339', block_number: 184455 },
};

// Microservices health (mirrors 7 microservices from PRD §3.2)
const SERVICES = [
  { name: 'vision-svc', description: 'YOLOv8 inference + Grad-CAM', status: 'healthy', latency: '4.2s', uptime: 99.97, port: 8001 },
  { name: 'identity-svc', description: 'Hyperledger Fabric gateway', status: 'healthy', latency: '8.1s', uptime: 100, port: 8002 },
  { name: 'risk-svc', description: 'XGBoost risk scoring', status: 'healthy', latency: '1.8s', uptime: 99.94, port: 8003 },
  { name: 'tariff-sync-svc', description: 'CBIC tariff API sync', status: 'healthy', latency: '—', uptime: 99.99, port: 8004 },
  { name: 'ml-monitor-svc', description: 'Drift detection + A/B test', status: 'healthy', latency: '—', uptime: 99.91, port: 8005 },
  { name: 'api-gateway', description: 'Kong + FastAPI routing', status: 'healthy', latency: '12ms', uptime: 100, port: 8006 },
  { name: 'dashboard-svc', description: 'UI + API gateway', status: 'healthy', latency: '—', uptime: 100, port: 8000 },
];

// Tariff data (tariff_risk_weights table — per PRD §5.3.4)
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
  total_scans: 87412,
  lane_distribution: { green: 0.72, yellow: 0.18, red: 0.10 },
  weekly_volumes: [
    { day: 'Mon', count: 12400 }, { day: 'Tue', count: 11800 },
    { day: 'Wed', count: 13200 }, { day: 'Thu', count: 14100 },
    { day: 'Fri', count: 12900 }, { day: 'Sat', count: 8200 },
    { day: 'Sun', count: 6800 },
  ],
  risk_by_origin: [
    { country: 'China', flag: '🇨🇳', avg_risk: 72, containers: 234, trend: '+3%' },
    { country: 'Russia', flag: '🇷🇺', avg_risk: 68, containers: 89, trend: '+8%' },
    { country: 'Nigeria', flag: '🇳🇬', avg_risk: 54, containers: 67, trend: '-2%' },
    { country: 'Pakistan', flag: '🇵🇰', avg_risk: 41, containers: 48, trend: '0%' },
    { country: 'Myanmar', flag: '🇲🇲', avg_risk: 37, containers: 61, trend: '+5%' },
  ],
  ai_accuracy_trend: [91.2, 91.8, 92.4, 92.9, 93.1, 93.0, 93.1],
  clearance_volume_trend: [
    { month: 'Sep', count: 11200 }, { month: 'Oct', count: 12100 },
    { month: 'Nov', count: 11800 }, { month: 'Dec', count: 13500 },
    { month: 'Jan', count: 14200 }, { month: 'Feb', count: 12800 },
  ],
};

// Dashboard live stats
const DASHBOARD_STATS = {
  throughput: 4847,
  containers_today: 847,
  avg_clearance_time: '2m 18s',
  ai_accuracy: 93.1,
  active_alerts: 3,
  green_lane_pct: 72,
  red_lane_count: 12,
  yellow_lane_count: 23,
  predictive_risk: 56,
  system_health: { healthy: 7, total: 7 },
};

// Activity feed (live events)
const ACTIVITY_FEED = [
  { time: '09:42:18', icon: '🔴', message: 'RED LANE — QILL-2026-00893 · density_anomaly 91% · physical inspection initiated' },
  { time: '09:41:55', icon: '✅', message: 'AUTO-CLEARED — TCMU-2026-00147 · score 18 · 2m 18s' },
  { time: '09:40:11', icon: '🤖', message: 'MODEL v2.3 · A/B test started · 10% traffic on v2.4' },
  { time: '09:38:44', icon: '🟡', message: 'YELLOW LANE — MUMB-2026-00901 · officer review requested' },
  { time: '09:35:00', icon: '🔄', message: 'TARIFF SYNC — HS 8507 weight +15% · Budget 2026 applied' },
  { time: '09:30:12', icon: '🔒', message: 'BLOCKCHAIN — Importer 27AABCU9603R1ZN verified · trust 88' },
  { time: '09:28:00', icon: '👤', message: 'SHIFT — Priya Mehta clocked in · Zone B assigned' },
];

// Origin risk lookup (mirrors risk-svc/app/features/origin_risk.py)
const ORIGIN_RISK = {
  CN: 4.2, RU: 5.1, NG: 3.8, PK: 3.5, MM: 4.0,
  SG: 1.2, NL: 1.0, BR: 2.0, US: 0.8, IN: 2.5,
  AE: 2.8, KR: 1.1, JP: 0.7, DE: 0.9, GB: 0.8,
};

// ==========================================================================
// Risk scoring — mirrors risk-svc/app/model/predict.py (fallback mode)
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

// --- Score Arbitrary Payload ---
app.post('/api/score', (req, res) => {
  const result = scoreContainer(req.body);
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

// --- Importer Lookup (blockchain — identity-svc) ---
app.get('/api/importer/:gstin', (req, res) => {
  const profile = IMPORTERS[req.params.gstin];
  if (!profile) return res.status(404).json({ error: 'Importer not found', gstin: req.params.gstin });
  res.json(profile);
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

// --- Initiate Clearance (POST /clearance/initiate per PRD §7) ---
app.post('/api/clearance/initiate', (req, res) => {
  const { container_id, importer_gstin, manifest_url, xray_scan_id, declared_value_inr, hs_code } = req.body;
  const clearance_id = 'CLR-' + Date.now().toString(36).toUpperCase();
  // Add to queue
  const newContainer = {
    id: container_id || 'NEW-' + Date.now().toString(36).toUpperCase(),
    type: 'Standard 20ft', origin: 'Unknown', flag: '🏳️', origin_country: 'IN',
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
    total_scans: ANALYTICS.total_scans,
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

// --- Microservices Status ---
app.get('/api/services', (req, res) => {
  res.json({
    services: SERVICES,
    healthy: SERVICES.filter(s => s.status === 'healthy').length,
    total: SERVICES.length,
  });
});

// --- Tariff Sync ---
app.get('/api/tariffs', (req, res) => {
  res.json(TARIFFS);
});

// --- ML Model Info ---
app.get('/api/ml/status', (req, res) => {
  res.json(ML_MODEL);
});

// Serve UI (catch-all — must be last)
app.get('*', (req, res) => {
  res.sendFile(uiPath);
});

app.listen(PORT, () => {
  console.log(`\n🚀 SCANNR Dashboard running on http://localhost:${PORT}`);
  console.log(`\n📡 API Endpoints:`);
  console.log(`  GET  /api/dashboard/stats    — live dashboard KPIs`);
  console.log(`  GET  /api/dashboard/activity — activity feed`);
  console.log(`  GET  /api/queue              — container queue`);
  console.log(`  GET  /api/containers/:id     — container detail`);
  console.log(`  GET  /api/operators          — operator roster`);
  console.log(`  GET  /api/overrides          — override log`);
  console.log(`  GET  /api/analytics          — analytics data`);
  console.log(`  GET  /api/importer/:gstin    — blockchain lookup`);
  console.log(`  POST /api/sanctions/check    — sanctions check`);
  console.log(`  POST /api/clearance/initiate — new clearance`);
  console.log(`  GET  /api/settings           — system settings`);
  console.log(`  GET  /api/services           — microservices health`);
  console.log(`  GET  /api/tariffs            — tariff sync status`);
  console.log(`  GET  /api/ml/status          — ML model info`);
  console.log(`  GET  /health                 — service health\n`);
});
