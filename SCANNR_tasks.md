# SCANNR — Development Task List
> UI is secondary. Ship the brain first.

---

## PHASE 0 — Project Scaffold
- [ ] Init monorepo with `/services`, `/infra`, `/notebooks`, `/docs` folders
- [ ] Write `docker-compose.yml` wiring all 7 services + RabbitMQ + Redis + PostgreSQL + CouchDB
- [ ] Create `.env.example` with all required environment variables documented
- [ ] Set up GitHub Actions CI pipeline (lint + test on every PR)
- [ ] Write base `Dockerfile` template (Python 3.11 slim) reused across services
- [ ] Init PostgreSQL with `01_init.sql` (all table schemas) and `02_seed.sql` (tariff weights)
- [ ] Confirm `docker-compose up` boots cleanly with all `/health` endpoints returning 200

---

## PHASE 1 — Vision AI (`vision-svc`) ⬅ Priority 1

### Data & Training
- [ ] Download and extract GDXray dataset (Baggages subset)
- [ ] Write `xray_pipeline.py` — OpenCV CLAHE contrast enhancement, resize to 640×640, DICOM→PNG
- [ ] Create train/val/test split script (80/10/10) with stratification by class
- [ ] Configure YOLOv8-Large with transfer learning from COCO weights
- [ ] Define 4 detection classes: `weapon`, `narcotic`, `undeclared_goods`, `density_anomaly`
- [ ] Set augmentation config: flips, brightness ±30%, Gaussian noise, mosaic
- [ ] Run training: 100 epochs, batch 32, AdamW, cosine LR — log to MLflow
- [ ] Write `evaluate.py` — compute precision, recall, F1, FNR per class
- [ ] Gate: model must hit **≥ 92% accuracy, < 1% FNR** before proceeding

### Inference Service
- [ ] Build `inference.py` — load model, run YOLOv8, return bounding boxes + confidence scores
- [ ] Integrate `pytorch-grad-cam` — generate heatmap PNG for every inference
- [ ] Add nearest historical case lookup (query PostgreSQL by anomaly class)
- [ ] Build FastAPI app (`main.py`) with:
  - [ ] `POST /scan` — accepts scan_id, fetches DICOM, runs pipeline, returns JSON
  - [ ] `GET /health`
- [ ] Publish result JSON to RabbitMQ `vision.results` queue
- [ ] Persist result + heatmap to PostgreSQL + S3-compatible storage (MinIO locally)
- [ ] Write unit tests: mock scanner input → assert detection output schema
- [ ] Confirm p95 latency **< 5 seconds** under load

---

## PHASE 2 — Blockchain Identity (`identity-svc`) ⬅ Priority 2

### Fabric Network
- [ ] Write `configtx.yaml` — define org structure (CBIC, 4 ports, GSTN, MHA)
- [ ] Write `crypto-config.yaml` — generate certs for 10 peers + 3 orderers
- [ ] Configure Raft ordering service (3 orderer nodes)
- [ ] Create `india-customs-main` channel
- [ ] Create `india-singapore-trade` bilateral private channel

### Chaincode (Go)
- [ ] Define `ImporterProfile` struct (all fields)
- [ ] Implement `RegisterImporter` — sets `RegistrationDate` immutably on first write
- [ ] Implement `GetImporter` — returns full profile
- [ ] Implement `AddViolation` — append-only, no update/delete path
- [ ] Implement `LogInspection` — records every clearance outcome
- [ ] Implement `CalculateTrustScore` — pure on-chain computation, no external override
- [ ] Implement `AddAEOCertificate` — enforce dual multi-sig (CBIC + port authority)
- [ ] Write adversarial tests: attempt to modify `RegistrationDate` → must fail; attempt to delete violation → must fail
- [ ] Deploy chaincode via Fabric lifecycle on dev network

### Node.js SDK Layer
- [ ] Write `connection.js` — Fabric gateway connection pool with retry logic
- [ ] Write `importer.js` — `queryImporter(gstin)`, `registerImporter(data)`, `addViolation(data)`
- [ ] Add Redis cache layer: TTL 6 hours per GSTIN, invalidate on write
- [ ] Build Express server with:
  - [ ] `GET /importer/:gstin` — returns profile + trust score
  - [ ] `POST /importer` — register new importer (CBIC admin only)
  - [ ] `GET /health`
- [ ] Write ZK-SNARK proof PoC: prove `trust_score > 70` without exposing raw profile
- [ ] Confirm query p95 **< 10 seconds** (cached reads < 200ms), network sustains **350 TPS**

---

## PHASE 3 — Risk Scoring (`risk-svc`) ⬅ Priority 3

### Feature Engineering
- [ ] Write `features.py` — assemble all 25+ features from 5 groups:
  - [ ] Blockchain trust (trust score, years active, violation count, AEO tier, recent outcomes)
  - [ ] Vision AI output (anomaly flag, confidence, detection count, class)
  - [ ] Cargo details (HS code, declared value, weight, volume, category)
  - [ ] Route risk (origin country risk index, transshipment count, carrier history)
  - [ ] External intel (OFAC match, UN conflict flag, INTERPOL alert, seasonal index)
- [ ] Build OFAC/UN sanctions feed ingestion (poll daily, store in PostgreSQL)
- [ ] Build origin country risk index table (seed from FATF/UN data)

### Model Training
- [ ] Generate synthetic training dataset from historical clearance rules (if real data unavailable)
- [ ] Train XGBoost with weights: trust=40%, vision=30%, cargo=15%, route=10%, intel=5%
- [ ] Tune hyperparameters via cross-validation
- [ ] Gate: AUC-ROC **> 0.90** on held-out set
- [ ] Log model to MLflow registry with full feature importance report

### Scoring Service
- [ ] Build `predict.py` — load model from MLflow registry, score in < 2s, return lane + top features
- [ ] Implement decision logic: GREEN (0–20), YELLOW (21–60), RED (61–100)
- [ ] Build FastAPI app:
  - [ ] `POST /score` — accepts feature payload, returns `{ lane, risk_score, top_features }`
  - [ ] `GET /health`
- [ ] Confirm p95 latency **< 2 seconds**

### Self-Healing Retrain Pipeline
- [ ] Build `retrain_scheduler.py` — cron at 02:00 IST:
  - [ ] Query `ml_training_queue` for `trained = false` rows
  - [ ] If count ≥ 50: trigger retrain job
  - [ ] Log new model to MLflow, deploy to 10% traffic (A/B split)
  - [ ] After 48hrs: compare accuracy → auto-promote if better
- [ ] Build adversarial spike detector: 15% spike in any class → emergency retrain flag

### Tariff Sync (`tariff-sync-svc`)
- [ ] Write `sync.py` — poll CBIC tariff API every 6 hours
- [ ] On HS code change: update `tariff_risk_weights` table
- [ ] Trigger `risk-svc` weight refresh within 24 hours of change
- [ ] Log every sync event to PostgreSQL with diff and timestamp

---

## PHASE 4 — API Gateway & Integrations

### Gateway
- [ ] Configure Kong routes for all service endpoints
- [ ] Implement mTLS + JWT authentication on all routes
- [ ] Return `401` for all unauthenticated requests (write test to verify)
- [ ] Implement rate limiting: 10,000 req/sec aggregate
- [ ] Add request/response logging middleware

### ICEGATE Bridge
- [ ] Write XML↔JSON middleware for ICEGATE SOAP API
- [ ] Map ICEGATE manifest fields → SCANNR `container_id`, `hs_code`, `declared_value`
- [ ] Handle ICEGATE auth (legacy certificate-based)
- [ ] Fallback: manual data entry endpoint for Year 1 parallel operation

### Main Clearance Orchestrator
- [ ] Build `POST /clearance/initiate` — orchestrates all 3 pillars sequentially:
  1. Call `identity-svc` → get trust profile
  2. Trigger scanner → get `xray_scan_id`
  3. Call `vision-svc` → get anomaly result
  4. Call `risk-svc` → get lane decision
  5. Write to `clearance_decisions` table with `audit_hash` (SHA-256)
- [ ] Build `GET /clearance/{id}/result`
- [ ] Build `POST /officer/override` — writes to `officer_overrides` + adds to `ml_training_queue`
- [ ] Ensure full E2E clearance (GREEN lane) completes in **< 3 minutes**

---

## PHASE 5 — ML Monitoring (`ml-monitor-svc`)

- [ ] Write `monitor.py` — Evidently AI drift detection on vision + risk model inputs
- [ ] Alert when feature distribution drifts > threshold (email + RabbitMQ event)
- [ ] Write `ab_test.py` — route 10% of `/score` traffic to challenger model
- [ ] Build accuracy comparison job: compare A vs. B over 48hrs, auto-promote winner
- [ ] MLflow model registry: enforce version tagging, never delete old versions

---

## PHASE 6 — Load Testing & Security

- [ ] Write k6 load test simulating 50 concurrent clearance requests
- [ ] Confirm all p95 SLAs hold under sustained load
- [ ] Run VAPT scan on all API endpoints
- [ ] Verify AES-256 encryption at rest (PostgreSQL, S3, Fabric state)
- [ ] Verify TLS 1.3 on all inter-service communication
- [ ] Penetration test: attempt blockchain fraud (backdate, delete violation) — must fail
- [ ] Penetration test: attempt unauthenticated API access — must return 401

---

## PHASE 7 — Kubernetes & Production Infra

- [ ] Write K8s deployment manifests for all 7 services
- [ ] Configure horizontal pod autoscaling (HPA) for `vision-svc` and `risk-svc`
- [ ] Write K8s manifests for RabbitMQ, Redis, PostgreSQL (StatefulSets)
- [ ] Configure Fabric peer K8s deployments with persistent volumes
- [ ] Set up Ingress with TLS termination
- [ ] Write `deployment_guide.md`

---

## PHASE 8 — Documentation

- [ ] Write `docs/api.yaml` (OpenAPI 3.1) — every endpoint, request/response schema, auth
- [ ] Write `README.md` — quickstart in < 10 minutes (clone → `.env` → `docker-compose up`)
- [ ] Write `docs/architecture.md` with system diagram
- [ ] Run Jupyter notebooks 01–03 end-to-end, confirm they reproduce model metrics
- [ ] Write `docs/deployment_guide.md` for K8s production deployment

---

## PHASE 9 — UI (`dashboard-svc`) ⬅ Do last

- [ ] Scaffold React 18 + TypeScript app
- [ ] `ContainerQueue.tsx` — list of containers with lane badge (GREEN/YELLOW/RED)
- [ ] `RiskScoreCard.tsx` — score breakdown with feature importances
- [ ] `HeatmapViewer.tsx` — Grad-CAM image overlay with bounding boxes
- [ ] `StatsPanel.tsx` — today's processed count, seizures, accuracy metrics
- [ ] `OverrideModal.tsx` — officer override form with reason field
- [ ] `useWebSocket.ts` hook — live updates from `/ws/stats`
- [ ] Wire all components to real API endpoints
- [ ] Mobile-responsive layout (officers use tablets at port)
- [ ] Basic auth guard (JWT from API gateway)

---

## Acceptance Gates (ship-blockers)

| Gate | Criteria |
|---|---|
| Vision AI | ≥ 92% accuracy, < 1% FNR on test set |
| Blockchain | Adversarial tamper tests all fail; query p95 < 10s |
| Risk Scoring | AUC-ROC > 0.90; score p95 < 2s |
| Tariff Sync | HS weight update propagates within 24hrs |
| E2E Flow | GREEN-lane clearance < 3 minutes |
| Security | mTLS enforced; unauthenticated → 401; encryption verified |
| Load | 50 concurrent requests without SLA breach |
| Docs | README quickstart works; OpenAPI spec matches deployed endpoints |
