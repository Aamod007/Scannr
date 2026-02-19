const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8000;
const uiPath = path.resolve(__dirname, '..', '..', 'code.html');

app.use(cors());
app.use(express.json());

// ==========================================================================
// Simulated container queue data
// ==========================================================================
const QUEUE = [
  { id: 'MSKU-908122-4', type: 'Dry Van 40ft', origin: 'Shanghai, CN', flag: '🇨🇳', origin_country: 'CN', status: 'Flagged', risk_score: 94, lane: 'RED', operator: 'JD', cargo_category: 'electronics', cargo_weight: 22000, cargo_volume: 67, cargo_declared_value: 480000, blockchain_trust_score: 22, vision_anomaly_flag: true, vision_confidence: 0.96, vision_class: 'density_anomaly', route_transshipment_count: 3 },
  { id: 'CSNU-442109-1', type: 'Reefer 20ft', origin: 'Singapore, SG', flag: '🇸🇬', origin_country: 'SG', status: 'Live Scan', risk_score: null, lane: null, operator: 'AI', cargo_category: 'food', cargo_weight: 12000, cargo_volume: 33, cargo_declared_value: 95000, blockchain_trust_score: 75, vision_anomaly_flag: false, vision_confidence: 0.12, vision_class: 'none', route_transshipment_count: 0 },
  { id: 'TRHU-110293-8', type: 'Standard 40ft', origin: 'Rotterdam, NL', flag: '🇳🇱', origin_country: 'NL', status: 'Review', risk_score: 58, lane: 'YELLOW', operator: 'JS', cargo_category: 'chemicals', cargo_weight: 18500, cargo_volume: 55, cargo_declared_value: 210000, blockchain_trust_score: 48, vision_anomaly_flag: false, vision_confidence: 0.35, vision_class: 'none', route_transshipment_count: 1 },
  { id: 'CMAU-554102-3', type: 'Tanker 20ft', origin: 'Santos, BR', flag: '🇧🇷', origin_country: 'BR', status: 'Cleared', risk_score: 12, lane: 'GREEN', operator: 'AI', cargo_category: 'food', cargo_weight: 9800, cargo_volume: 20, cargo_declared_value: 42000, blockchain_trust_score: 88, vision_anomaly_flag: false, vision_confidence: 0.05, vision_class: 'none', route_transshipment_count: 0 },
  { id: 'MAEU-102938-7', type: 'Dry Van 40ft', origin: 'Los Angeles, US', flag: '🇺🇸', origin_country: 'US', status: 'Cleared', risk_score: 5, lane: 'GREEN', operator: 'AI', cargo_category: 'machinery', cargo_weight: 25000, cargo_volume: 60, cargo_declared_value: 320000, blockchain_trust_score: 95, vision_anomaly_flag: false, vision_confidence: 0.02, vision_class: 'none', route_transshipment_count: 0 },
  { id: 'HLCU-728192-0', type: 'Open Top 20ft', origin: 'St. Petersburg, RU', flag: '🇷🇺', origin_country: 'RU', status: 'Flagged', risk_score: 88, lane: 'RED', operator: 'MK', cargo_category: 'metals', cargo_weight: 30000, cargo_volume: 40, cargo_declared_value: 720000, blockchain_trust_score: 18, vision_anomaly_flag: true, vision_confidence: 0.89, vision_class: 'undeclared_goods', route_transshipment_count: 4 },
];

// ==========================================================================
// Origin risk lookup (mirrors risk-svc/app/features/origin_risk.py)
// ==========================================================================
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

  const intelRisk = 0 * intelWeight; // no OFAC/UN/Interpol data in prototype

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

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'dashboard-svc', uptime: process.uptime() });
});

// GET /api/queue — return all containers with live risk scores
app.get('/api/queue', (req, res) => {
  const scored = QUEUE.map(c => {
    const result = scoreContainer(c);
    return {
      id: c.id,
      type: c.type,
      origin: c.origin,
      flag: c.flag,
      status: c.status,
      risk_score: result.risk_score,
      lane: result.lane,
      operator: c.operator,
    };
  });
  res.json({ containers: scored, total: scored.length });
});

// GET /api/containers/:id — single container detail with full scoring
app.get('/api/containers/:id', (req, res) => {
  const container = QUEUE.find(c => c.id === req.params.id);
  if (!container) return res.status(404).json({ error: 'Container not found' });
  const result = scoreContainer(container);
  res.json({ ...container, ...result });
});

// POST /api/score — score an arbitrary payload (mirrors risk-svc /score)
app.post('/api/score', (req, res) => {
  const result = scoreContainer(req.body);
  res.json(result);
});

// Serve UI
app.get('*', (req, res) => {
  res.sendFile(uiPath);
});

app.listen(PORT, () => {
  console.log(`SCANNR Dashboard running on http://localhost:${PORT}`);
  console.log(`API endpoints:`);
  console.log(`  GET  /api/queue          — live container queue`);
  console.log(`  GET  /api/containers/:id — container detail`);
  console.log(`  POST /api/score          — score any payload`);
  console.log(`  GET  /health             — service health`);
});
