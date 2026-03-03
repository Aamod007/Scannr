const http = require('http');

console.clear();
const cases = [
  { container_id: 'MSCU-TEST-GREEN', importer_gstin: '29AALCT1234H1Z9', manifest_url: 's3://test', xray_scan_id: 'scan-g-01', declared_value_inr: 500000, hs_code: '8471.30' },
  { container_id: 'CMAU-TEST-YLW1', importer_gstin: '07AABCR1234E1Z3', manifest_url: 's3://test', xray_scan_id: 'scan-y-01', declared_value_inr: 1200000, hs_code: '2933.39' },
  { container_id: 'HLCU-TEST-RED1', importer_gstin: '24AABCE5678F1Z1', manifest_url: 's3://test', xray_scan_id: 'scan-r-01', declared_value_inr: 45000, hs_code: '9021.10' }
];

let idx = 0;
function sendNext() {
  if (idx >= cases.length) { console.log('All sent'); process.exit(0); }
  const data = JSON.stringify(cases[idx++]);
  const req = http.request({ hostname: 'localhost', port: 8000, path: '/api/clearance/initiate', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': data.length } }, res => {
    let raw = ''; res.on('data', c => raw += c); res.on('end', () => { console.log('Response:', raw); setTimeout(sendNext, 2000); });
  });
  req.on('error', (e) => console.log('Error', e.message));
  req.write(data); req.end();
}
sendNext();
