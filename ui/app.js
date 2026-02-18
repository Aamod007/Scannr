const byId = (id) => document.getElementById(id)

const setText = (id, value) => {
  byId(id).textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2)
}

const toNumber = (value, fallback) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

byId("registerImporter").addEventListener("click", async () => {
  const payload = {
    importer_id: byId("importerId").value.trim(),
    years_active: toNumber(byId("yearsActive").value, 0),
    aeo_tier: toNumber(byId("aeoTier").value, 0),
    violations: toNumber(byId("violations").value, 0),
    clean_inspections: toNumber(byId("cleanInspections").value, 0),
  }
  const response = await fetch("/blockchain/importer/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const result = await response.json()
  setText("importerResult", result)
})

byId("syncTariff").addEventListener("click", async () => {
  const payload = {
    items: [
      {
        hs_code: byId("hsCode").value.trim(),
        risk_weight: toNumber(byId("riskWeight").value, 1),
      },
    ],
  }
  const response = await fetch("/tariff/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const result = await response.json()
  setText("tariffResult", result)
})

byId("initiateClearance").addEventListener("click", async () => {
  const payload = {
    container_id: byId("containerId").value.trim(),
    importer_gstin: byId("importerGstin").value.trim(),
    manifest_url: byId("manifestUrl").value.trim(),
    xray_scan_id: byId("xrayScanId").value.trim(),
    declared_value_inr: toNumber(byId("declaredValue").value, 0),
    hs_code: byId("hsCodeInitiate").value.trim(),
    simulate_anomaly: byId("simulateAnomaly").checked,
    anomaly_confidence: toNumber(byId("anomalyConfidence").value, 0.8),
  }
  const response = await fetch("/clearance/initiate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const result = await response.json()
  setText("initiateResult", result)
  if (result.clearance_id) {
    byId("clearanceId").value = result.clearance_id
    byId("overrideClearanceId").value = result.clearance_id
  }
})

byId("fetchResult").addEventListener("click", async () => {
  const clearanceId = byId("clearanceId").value.trim()
  const response = await fetch(`/clearance/${clearanceId}/result`)
  const result = await response.json()
  setText("clearanceResult", result)
})

byId("submitOverride").addEventListener("click", async () => {
  const payload = {
    clearance_id: byId("overrideClearanceId").value.trim(),
    officer_id: byId("officerId").value.trim(),
    override_to: byId("overrideTo").value.trim(),
    reason: byId("overrideReason").value.trim(),
  }
  const response = await fetch("/officer/override", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const result = await response.json()
  setText("overrideResult", result)
})

byId("refreshStats").addEventListener("click", async () => {
  const response = await fetch("/dashboard/stats")
  const result = await response.json()
  setText("statsResult", result)
})
