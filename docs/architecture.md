# SCANNR System Architecture

## 1. Overview

SCANNR is a three-pillar AI-enabled customs clearance engine mandated by Budget 2026-27 Para 87. It integrates Computer Vision, Blockchain Identity, and Dynamic ML Risk Scoring to reduce clearance time from 7.2 days to under 15 minutes for trusted traders.

---

## 2. System Diagram

```
                         ┌──────────────────────────────────────────────┐
                         │              SCANNR Platform                 │
                         └──────────────────────────────────────────────┘

                                    ┌─────────────┐
                                    │  Dashboard   │
                                    │  (React/TS)  │
                                    │   :8006      │
                                    └──────┬───────┘
                                           │ HTTP / WebSocket
                                           ▼
   ┌─────────┐    ┌─────────┐    ┌─────────────────┐    ┌──────────────┐
   │  GSTN   │    │ ICEGATE │    │   API Gateway    │    │  MHA/OFAC    │
   │  Bridge │◄──►│  Bridge │◄──►│   (Starlette)    │◄──►│  Sanctions   │
   │         │    │ XML↔REST│    │     :8000         │    │   Feed       │
   └─────────┘    └─────────┘    └────┬───┬───┬─────┘    └──────────────┘
                                      │   │   │
                     ┌────────────────┘   │   └─────────────────┐
                     ▼                    ▼                     ▼
           ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
           │   Vision SVC    │  │  Identity SVC   │  │    Risk SVC     │
           │   (FastAPI)     │  │  (Express.js)   │  │   (Starlette)   │
           │     :8001       │  │    :8005        │  │     :8002       │
           │                 │  │                 │  │                 │
           │ • YOLOv8        │  │ • Fabric SDK    │  │ • XGBoost       │
           │ • Grad-CAM      │  │ • Go Chaincode  │  │ • 25+ features  │
           │ • CLAHE preproc │  │ • Trust score   │  │ • OFAC/sanctions│
           │ • DICOM support │  │ • AEO certs     │  │ • Retrain sched │
           └────────┬────────┘  └────────┬────────┘  └────────┬────────┘
                    │                    │                     │
                    ▼                    ▼                     ▼
           ┌─────────────┐     ┌─────────────┐      ┌─────────────────┐
           │   Uploads/  │     │  CouchDB    │      │   PostgreSQL    │
           │   Heatmaps  │     │  (Fabric)   │      │     16.2        │
           └─────────────┘     │    :5984    │      │    :5432        │
                               └─────────────┘      └────────┬────────┘
                                                              │
                        ┌─────────────────────────────────────┤
                        ▼                                     ▼
              ┌─────────────────┐                   ┌─────────────────┐
              │ Tariff Sync SVC │                   │ ML Monitor SVC  │
              │  (Starlette)    │                   │  (Starlette)    │
              │    :8003        │                   │    :8004        │
              │                 │                   │                 │
              │ • CBIC polling  │                   │ • KS/PSI drift  │
              │ • APScheduler   │                   │ • A/B testing   │
              │ • 6hr sync      │                   │ • MLflow registry│
              └─────────────────┘                   └─────────────────┘

                        ┌─────────────┐    ┌──────────────┐
                        │   Redis     │    │  RabbitMQ    │
                        │   7.2       │    │   3.13       │
                        │   :6379     │    │   :5672      │
                        └─────────────┘    └──────────────┘
```

---

## 3. Service Inventory

| Service | Port | Language | Framework | Purpose |
|---|---|---|---|---|
| **api-gateway** | 8000 | Python | Starlette | Central routing, auth (JWT), orchestration, WebSocket |
| **vision-svc** | 8001 | Python | FastAPI | YOLOv8 inference, Grad-CAM heatmaps, DICOM/PNG |
| **risk-svc** | 8002 | Python | Starlette | XGBoost scoring (25+ features), retrain scheduler |
| **tariff-sync-svc** | 8003 | Python | Starlette | CBIC tariff polling, HS code risk weight updates |
| **ml-monitor-svc** | 8004 | Python | Starlette | Drift detection (KS/PSI), A/B testing, model registry |
| **identity-svc** | 8005 | Node.js | Express | Hyperledger Fabric SDK, importer CRUD, trust score |
| **dashboard-svc** | 8006 | Node.js | Express | React 18 + TypeScript dashboard UI |

---

## 4. Data Flow — Container Clearance

```
 Container Arrival at Port
         │
         ▼
 ┌───────────────────────────────────────────────────────────────┐
 │ API Gateway receives POST /clearance/initiate                 │
 │                                                               │
 │  Step 0a: GSTN Bridge ─── Validate importer GSTIN            │
 │  Step 0b: ICEGATE Bridge ─ Fetch manifest (XML→JSON)          │
 │  Step 0c: MHA Bridge ──── OFAC/UN/INTERPOL sanctions check    │
 │                                                               │
 │  Step 1: identity-svc ─── Blockchain trust score query        │
 │           (Fabric chaincode → trust score 0-100)              │
 │                                                               │
 │  Step 2: vision-svc ───── YOLOv8 + Grad-CAM analysis          │
 │           (anomaly detection, heatmap generation)              │
 │                                                               │
 │  Step 3: risk-svc ─────── XGBoost prediction                  │
 │           (25+ features → risk score → GREEN/YELLOW/RED)       │
 │                                                               │
 │  Step 4: Store to PostgreSQL with SHA-256 audit hash          │
 │  Step 5: Submit result back to ICEGATE                        │
 │  Step 6: Push update via WebSocket /ws/stats                  │
 └───────────────────────────────────────────────────────────────┘
         │
         ▼
   ┌─────────┐  ┌──────────┐  ┌─────────┐
   │  GREEN  │  │  YELLOW  │  │   RED   │
   │  0-20   │  │  21-60   │  │  61-100 │
   │ Auto-   │  │ Officer  │  │ Physical│
   │ release │  │ reviews  │  │ inspect │
   └─────────┘  └──────────┘  └─────────┘
```

---

## 5. Pillar Details

### 5.1 Pillar 1 — Vision AI (vision-svc)

- **Model:** YOLOv8 (ultralytics) trained on GDXray + OPIXray + SIXray + CLCXray + CompassXP
- **Pre-processing:** OpenCV CLAHE contrast enhancement, resize to 640×640
- **Inference:** Real-time object detection with confidence thresholds
- **Explainability:** Grad-CAM heatmap overlay using pytorch-grad-cam library
- **Format support:** PNG, JPG, DICOM (pydicom)
- **SLA:** < 5 seconds per scan at p95

### 5.2 Pillar 2 — Blockchain Identity (identity-svc)

- **Platform:** Hyperledger Fabric 2.5 (LTS)
- **Chaincode:** Go — ImporterProfile CRUD with anti-fraud rules
- **Anti-fraud enforcement:**
  - `RegistrationDate` is immutable (set once at creation, modifications rejected)
  - `ViolationHistory` is append-only (deletions and modifications rejected)
  - Trust score computed on-chain only (no external override)
- **Caching:** Redis (6hr TTL, 80% hit rate target)
- **SLA:** < 10 seconds query (< 200ms cached)

### 5.3 Pillar 3 — Risk Scoring (risk-svc)

- **Model:** XGBoost (gradient boosting) with 25+ input features
- **Feature groups:** Blockchain Trust (40%), Vision AI (30%), Cargo (15%), Route (10%), Intel (5%)
- **Decision thresholds:** GREEN (0-20), YELLOW (21-60), RED (61-100)
- **Self-healing pipeline:**
  1. Officers flag errors via dashboard override
  2. Flagged cases auto-queued for retraining
  3. Retrain triggered when >50 new samples
  4. A/B test new model on 10% traffic for 48hrs
  5. Auto-promote if accuracy improves
  6. Adversarial spike detection (15% threshold)
- **SLA:** < 2 seconds per score

---

## 6. Infrastructure

### 6.1 Data Stores

| Store | Version | Purpose |
|---|---|---|
| **PostgreSQL** | 16.2 | Clearance decisions, tariff weights, ML training queue, officer overrides |
| **Redis** | 7.2 | Blockchain trust cache, session cache, rate limiting |
| **CouchDB** | 3.3 | Hyperledger Fabric world state database |
| **RabbitMQ** | 3.13 | Async event bus between services |

### 6.2 PostgreSQL Schema

```
clearance_decisions     ─── Core clearance records (UUID PK, container, risk, lane, audit hash)
tariff_risk_weights     ─── HS code → risk weight mapping (synced from CBIC every 6hrs)
ml_training_queue       ─── Officer-flagged cases awaiting retraining
officer_overrides       ─── Audit trail for every officer lane override
```

### 6.3 External Integrations

| System | Protocol | Bridge Module | Purpose |
|---|---|---|---|
| **GSTN** | REST + OAuth 2.0 | `bridge/gstn.py` | GSTIN validation, filing compliance |
| **ICEGATE** | SOAP/XML | `bridge/icegate.py` | Manifest fetch/submit (XML↔REST conversion) |
| **MHA/OFAC** | REST + Webhook | `bridge/mha.py` | Sanctions screening (OFAC SDN, UN, INTERPOL) |
| **CBIC Tariff API** | REST | `tariff-sync-svc` | Tariff risk weight synchronisation |

---

## 7. Security Architecture

- **Authentication:** JWT Bearer tokens (python-jose) with configurable secret
- **Transport:** TLS 1.3 (all inter-service communication)
- **Data at rest:** AES-256 encryption (PostgreSQL, Redis)
- **Blockchain:** mTLS between Fabric peers; chaincode-enforced immutability
- **Audit trail:** SHA-256 hash of every clearance decision stored immutably
- **API Gateway:** Central auth enforcement — all endpoints return 401 for unauthenticated requests

---

## 8. Deployment

### 8.1 Docker Compose (Development)

```bash
docker-compose up          # Starts all 7 services + PostgreSQL + Redis + RabbitMQ + CouchDB
```

### 8.2 Kubernetes (Production)

Manifests in `infra/kubernetes/`:
- Namespace: `scannr`
- Services: Deployments + ClusterIP Services for each microservice
- Ingress: NGINX ingress with TLS termination
- Secrets: JWT keys, DB credentials, Fabric crypto material
- ConfigMaps: SQL init scripts, Kong configuration
- Monitoring: Prometheus + Grafana stack

---

## 9. Monitoring & ML Operations

- **Drift detection:** KS test + PSI per feature (ml-monitor-svc)
- **A/B testing:** Proportion z-test for statistical significance
- **Model registry:** MLflow-compatible with Production/Staging/Archived stages
- **Retraining:** Automated pipeline triggered by officer feedback volume
- **Alerting:** Drift alerts when p-value < 0.05 or PSI > 0.2

---

## 10. Key Design Decisions

| Decision | Rationale |
|---|---|
| Starlette over FastAPI for gateway | Lightweight, WebSocket-native, minimal overhead |
| XGBoost over deep learning for risk | Interpretable feature importances, fast inference on CPU |
| Go chaincode over JavaScript | 3-5× performance advantage for Fabric chaincode |
| Append-only violation history | Anti-fraud: prevents tampering with compliance records |
| SHA-256 audit hashes | Every clearance decision is tamper-evident |
| Redis blockchain cache | 80% cache hit rate reduces Fabric query load |
| 6-hour tariff sync interval | Balance between freshness and CBIC API rate limits |
| Grad-CAM over SHAP for vision | Spatial heatmaps more intuitive for customs officers |
