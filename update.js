const fs = require('fs');
let code = fs.readFileSync('services/dashboard-svc/server.js', 'utf8');
code = code.replace(/const QUEUE = \[[\s\S]*?\];/, 'const QUEUE = [];');
code = code.replace(/const OVERRIDES = \[[\s\S]*?\];/, 'const OVERRIDES = [];');
code = code.replace(/const ANALYTICS = \{[\s\S]*?\};\n/, 'const ANALYTICS = { total_scans: 0, lane_distribution: { green: 0, yellow: 0, red: 0 }, weekly_volumes: [], risk_by_origin: [], ai_accuracy_trend: [], clearance_volume_trend: [] };\n');
code = code.replace(/const ACTIVITY_FEED = \[[\s\S]*?\];/, 'const ACTIVITY_FEED = [];');
code = code.replace(/const DASHBOARD_STATS = \{[\s\S]*?\};\n/, 'const DASHBOARD_STATS = { throughput: 0, containers_today: 0, avg_clearance_time: \"0s\", ai_accuracy: 99.8, active_alerts: 0, green_lane_pct: 0, red_lane_count: 0, yellow_lane_count: 0, predictive_risk: 0, system_health: { healthy: 7, total: 7 } };\n');
fs.writeFileSync('services/dashboard-svc/server.js', code, 'utf8');
