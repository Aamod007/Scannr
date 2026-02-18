import http from "k6/http"
import { check, sleep } from "k6"

export const options = {
  stages: [
    { duration: "30s", target: 50 },
    { duration: "1m", target: 50 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<3000"],
    http_req_failed: ["rate<0.01"],
  },
}

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000"
const JWT = "Bearer valid-jwt-token"

export default function () {
  const payload = {
    container_id: `TCMU-${Math.random().toString(36).slice(2, 8)}`,
    importer_gstin: "27AABCU9603R1ZN",
    hs_code: "8471.30",
    declared_value_inr: 4500000,
  }
  const headers = {
    "Content-Type": "application/json",
    Authorization: JWT,
  }
  const res = http.post(`${BASE_URL}/clearance/initiate`, JSON.stringify(payload), { headers })
  check(res, {
    "status is 200": (r) => r.status === 200,
    "clearance_id present": (r) => JSON.parse(r.body).clearance_id !== undefined,
  })
  sleep(1)
}