import express from "express"
import { queryImporter, registerImporter, addViolation } from "./importer.js"
import { connectFabricGateway, disconnectFabricGateway } from "./connection.js"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { calculateTrustScore } from "./importer.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const port = process.env.PORT || 8000

app.use(express.json())

// ── Fabric connection (initialized at startup) ──
let fabricConnection = null
let fabricStatus = "initializing"

// ── Blockchain transaction ledger (simulated) ──
const ledger = []
function logTransaction(txType, data) {
  const tx = {
    txId: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    channel: "india-customs-main",
    chaincode: "importer",
    txType,
    data,
    blockNumber: ledger.length + 1,
    org: Math.random() > 0.5 ? "CustomsOrg" : "PortAuthorityOrg",
  }
  ledger.push(tx)
  return tx
}

// ── Metrics counters ──
let queryCount = 0
let registerCount = 0
let violationCount = 0
let requestCount = 0

// ── Pre-load sample importers on startup ──
const sampleImporters = [
  { importer_id: "27AABCU9603R1ZN", name: "TechCorp India Pvt. Ltd.", years_active: 7, aeo_tier: 1, violations: 0, clean_inspections: 47, sector: "electronics", state: "Maharashtra" },
  { importer_id: "33AADCS0472B1Z2", name: "SG Fresh Foods India", years_active: 5, aeo_tier: 2, violations: 1, clean_inspections: 23, sector: "food", state: "Tamil Nadu" },
  { importer_id: "07AABCR1234E1Z3", name: "EuroChem India Ltd.", years_active: 3, aeo_tier: 0, violations: 3, clean_inspections: 12, sector: "chemicals", state: "Delhi" },
  { importer_id: "24AABCE5678F1Z1", name: "MetalWorks Gujarat Pvt. Ltd.", years_active: 2, aeo_tier: 0, violations: 4, clean_inspections: 5, sector: "metals", state: "Gujarat" },
  { importer_id: "29AALCT1234H1Z9", name: "Bharat Machines Corp.", years_active: 11, aeo_tier: 1, violations: 0, clean_inspections: 112, sector: "machinery", state: "Karnataka" },
  { importer_id: "36AABCG9012K1Z5", name: "Indo-Pak Textiles", years_active: 4, aeo_tier: 0, violations: 5, clean_inspections: 18, sector: "textiles", state: "Telangana" },
  { importer_id: "19AABCE3456N1Z7", name: "Bengal Pharma Industries", years_active: 9, aeo_tier: 1, violations: 1, clean_inspections: 89, sector: "pharmaceuticals", state: "West Bengal" },
  { importer_id: "32AABCM7890P1Z4", name: "Kerala Spice Exports Ltd.", years_active: 10, aeo_tier: 2, violations: 0, clean_inspections: 67, sector: "food", state: "Kerala" },
  { importer_id: "06AABCD2345Q1Z6", name: "Haryana Auto Parts Mfg.", years_active: 6, aeo_tier: 2, violations: 2, clean_inspections: 34, sector: "vehicles", state: "Haryana" },
  { importer_id: "09AABCE8901R1Z8", name: "Uttar Electronics Pvt. Ltd.", years_active: 8, aeo_tier: 1, violations: 0, clean_inspections: 56, sector: "electronics", state: "Uttar Pradesh" },
  { importer_id: "21AABCF4567S1Z3", name: "Odisha Minerals Corp.", years_active: 7, aeo_tier: 0, violations: 3, clean_inspections: 28, sector: "metals", state: "Odisha" },
  { importer_id: "08AABCG1234T1Z5", name: "Rajasthan Stone Exports", years_active: 12, aeo_tier: 1, violations: 1, clean_inspections: 134, sector: "minerals", state: "Rajasthan" },
]

async function preloadImporters() {
  console.log(`\n🔗 Pre-loading ${sampleImporters.length} importers into blockchain ledger...`)
  for (const imp of sampleImporters) {
    try {
      await registerImporter(imp)
      logTransaction("RegisterImporter", { importer_id: imp.importer_id, name: imp.name })
      console.log(`   ✅ ${imp.importer_id} — ${imp.name}`)
    } catch (e) {
      // Already exists
    }
  }
  console.log(`   Ledger: ${ledger.length} transactions recorded\n`)
}

// ── Request counter middleware ──
app.use((req, res, next) => {
  requestCount++
  next()
})

// ── Health check ──
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "identity-svc",
    blockchain: {
      network: fabricConnection && !fabricConnection.stub
        ? "Hyperledger Fabric v2.5 (live)"
        : "Hyperledger Fabric v2.5 (simulated)",
      mode: fabricConnection && !fabricConnection.stub ? "fabric" : "in-memory",
      channel: "india-customs-main",
      chaincode: "importer",
      organizations: ["CustomsOrg", "PortAuthorityOrg"],
      ledger_height: ledger.length,
      fabric_status: fabricStatus,
    },
  })
})

// ── Prometheus metrics endpoint ──
app.get("/metrics", (req, res) => {
  res.set("Content-Type", "text/plain")
  res.send([
    "# HELP identity_queries_total Total importer queries",
    "# TYPE identity_queries_total counter",
    `identity_queries_total ${queryCount}`,
    "# HELP identity_registrations_total Total importer registrations",
    "# TYPE identity_registrations_total counter",
    `identity_registrations_total ${registerCount}`,
    "# HELP identity_violations_total Total violations recorded",
    "# TYPE identity_violations_total counter",
    `identity_violations_total ${violationCount}`,
    "# HELP identity_http_requests_total Total HTTP requests",
    "# TYPE identity_http_requests_total counter",
    `identity_http_requests_total ${requestCount}`,
    "# HELP identity_ledger_height Current ledger height",
    "# TYPE identity_ledger_height gauge",
    `identity_ledger_height ${ledger.length}`,
    "# HELP identity_importers_total Total registered importers",
    "# TYPE identity_importers_total gauge",
    `identity_importers_total ${sampleImporters.length}`,
    `# HELP identity_fabric_connected Whether Fabric SDK is connected`,
    `# TYPE identity_fabric_connected gauge`,
    `identity_fabric_connected ${fabricConnection && !fabricConnection.stub ? 1 : 0}`,
    "",
  ].join("\n"))
})

// ── Fabric network status (for dashboard) ──
app.get("/fabric/status", (req, res) => {
  res.json({
    network: "india-customs-network",
    fabric_version: "2.5.4",
    channel: "india-customs-main",
    chaincode: { name: "importer", version: "1.0", language: "Go" },
    mode: fabricConnection && !fabricConnection.stub ? "live" : "simulated",
    organizations: [
      {
        name: "CustomsOrg",
        mspId: "CustomsMSP",
        peers: ["peer0.customs.scannr.in", "peer1.customs.scannr.in"],
        ca: "ca-customs",
        status: "active",
      },
      {
        name: "PortAuthorityOrg",
        mspId: "PortAuthorityMSP",
        peers: ["peer0.port.scannr.in", "peer1.port.scannr.in"],
        ca: "ca-port",
        status: "active",
      },
    ],
    orderer: {
      name: "orderer.scannr.in",
      type: "etcdraft",
      status: "active",
    },
    ledger_height: ledger.length,
    total_importers: sampleImporters.length,
    consensus: "Raft",
    tps: "~1000 tx/s",
  })
})

// ── Ledger (recent transactions) ──
app.get("/fabric/ledger", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100)
  res.json({
    channel: "india-customs-main",
    height: ledger.length,
    transactions: ledger.slice(-limit).reverse(),
  })
})

// ── Query importer ──
app.get("/importer/:gstin", async (req, res) => {
  try {
    queryCount++
    const profile = await queryImporter(req.params.gstin)
    logTransaction("QueryImporter", { importer_id: req.params.gstin })
    res.json(profile)
  } catch (err) {
    res.status(404).json({ error: err.message })
  }
})

// ── List all importers ──
app.get("/importers", async (req, res) => {
  try {
    const importers = sampleImporters.map((imp) => ({
      importer_id: imp.importer_id,
      name: imp.name,
      trust_score: calculateTrustScore(imp.years_active, imp.aeo_tier, imp.violations, imp.clean_inspections),
      aeo_tier: imp.aeo_tier,
      sector: imp.sector,
      state: imp.state,
    }))
    res.json({ importers, total: importers.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Register new importer ──
app.post("/importer", async (req, res) => {
  try {
    registerCount++
    const profile = await registerImporter(req.body)
    logTransaction("RegisterImporter", { importer_id: req.body.importer_id })
    res.status(201).json(profile)
  } catch (err) {
    res.status(409).json({ error: err.message })
  }
})

// ── Add violation ──
app.post("/importer/:gstin/violation", async (req, res) => {
  try {
    violationCount++
    await addViolation(req.params.gstin, req.body)
    logTransaction("AddViolation", { importer_id: req.params.gstin, ...req.body })
    res.json({ status: "ok" })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ── Start server ──
app.listen(port, async () => {
  console.log(`🔗 Identity Service running on port ${port}`)
  console.log(`📊 Prometheus metrics on http://localhost:${port}/metrics`)

  // Try to connect to Fabric SDK
  try {
    fabricConnection = await connectFabricGateway()
    fabricStatus = fabricConnection.stub ? "simulated" : "connected"
    console.log(`🔗 Fabric mode: ${fabricStatus}`)
  } catch (e) {
    fabricStatus = "simulated"
    fabricConnection = { stub: true }
    console.log("🔗 Fabric unavailable, using in-memory ledger")
  }

  await preloadImporters()
})

// ── Graceful shutdown ──
process.on("SIGTERM", () => {
  console.log("Shutting down identity-svc...")
  if (fabricConnection) disconnectFabricGateway(fabricConnection)
  process.exit(0)
})