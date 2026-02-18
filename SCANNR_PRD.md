# SCANNR — Product Requirements Document
### AI-Enabled Risk-Based Customs Clearance Engine
> *Trust at the Speed of Trade*

---

| Field | Details |
|---|---|
| **Document Type** | Product Requirements Document (PRD) |
| **Version** | 1.0 — For Agentic Development |
| **Date** | February 2026 |
| **Initiative** | Union Budget 2026-27 Customs Modernisation |
| **Budget Reference** | Para 87 — Customs Digitalization |
| **Total Investment** | ₹4,460 Crore |
| **Payback Period** | 4 Months (post full deployment) |
| **Status** | ✅ Ready for Agentic Coding Agent |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [System Architecture](#3-system-architecture)
4. [Full Technology Stack](#4-full-technology-stack)
5. [Detailed Functional Requirements](#5-detailed-functional-requirements)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [API Specifications](#7-api-specifications)
8. [Database Schemas](#8-database-schemas)
9. [Repository Structure](#9-repository-structure)
10. [Development Phases & Milestones](#10-development-phases--milestones)
11. [Known Risks & Mitigations](#11-known-risks--mitigations)
12. [Definition of Done — Acceptance Criteria](#12-definition-of-done--acceptance-criteria)
13. [Financial Summary](#13-financial-summary)
14. [Glossary](#14-glossary)

---

## 1. Executive Summary

SCANNR is a three-pillar AI system for customs clearance, mandated by Budget 2026-27 Para 87. It reduces clearance time from 7.2 days to under 15 minutes for trusted traders, raises contraband detection from 68% to 92%+, and eliminates 42% AEO credential fraud through blockchain immutability.

> **Mission:** Build a production-grade customs intelligence platform integrating Computer Vision (YOLOv8), Blockchain (Hyperledger Fabric), and Dynamic ML Risk Scoring (XGBoost) to secure India's borders while accelerating trade.

### 1.1 Three Core Pillars

| Pillar | Technology | Budget 2026 Need | KPI Target |
|---|---|---|---|
| **Vision AI** | PyTorch 2.0 + YOLOv8 | 100% AI X-ray scanning | 92%+ accuracy, <5s |
| **Immutability** | Hyperledger Fabric 2.5 | Tamper-proof AEO credentials | <1% fraud rate |
| **Risk Scoring** | XGBoost + Scikit-learn | Real-time tariff adaptation | 24hr tariff sync |

---

## 2. Problem Statement

### 2.1 The Crisis Budget 2026 Must Solve

The Finance Minister identified in Budget Speech 2026-27 (Para 87) that India's average customs clearance of 7.2 days vs. Singapore's 36 hours costs the nation ₹15,000 crore annually.

| Problem Metric | Current State | Budget 2026 Target | Global Benchmark |
|---|---|---|---|
| Average Clearance | **7.2 days** ❌ | <2 days | 1.5 days (Singapore) |
| Inspection Coverage | **3.2% scanned** ❌ | 100% AI-scanned | 100% (Dubai) |
| Contraband Detection | **68% catch rate** ❌ | 90%+ | 95% (US CBP) |
| AEO Fraud Rate | **42% fake credentials** ❌ | <5% | Negligible (EU) |
| Economic Loss / Year | **₹15,000 Cr** ❌ | ₹3,000 Cr | Minimal |

*Source: Economic Survey 2025-26, Ministry of Finance*

### 2.2 Four Critical Root Causes

1. **Security-Speed Paradox** — Cannot inspect 100% manually without a 17-day backlog. AI analysis required in under 5 seconds per container.
2. **Reputation Fraud Epidemic** — 42% of Trusted Trader credentials falsified (CAG audit 2025). Tamper-proof verification is mandatory.
3. **Static Risk Models** — Current models update once per year, but smuggling tactics evolve daily. Real-time adaptation to 2026 tariff changes required.
4. **Human Fatigue** — Officers miss 15–20% of threats after 90 minutes on duty. Tireless AI first-line screening is essential.

---

## 3. System Architecture

### 3.1 High-Level Flow

```
Container Arrival
      │
      ▼
┌─────────────────────────────┐
│ STEP 1: Blockchain ID Check │  ← identity-svc   │ SLA: 10s
│ Hyperledger Fabric query    │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│ STEP 2: X-ray Scan          │  ← Port scanner   │ SLA: 30s
│ DICOM image ingestion       │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│ STEP 3: Vision AI Analysis  │  ← vision-svc     │ SLA: 5s
│ YOLOv8 + Grad-CAM heatmap   │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│ STEP 4: Risk Scoring        │  ← risk-svc       │ SLA: 2s
│ XGBoost (25+ features)      │
└─────────────┬───────────────┘
              │
      ┌───────┴───────┐
      ▼               ▼
  Score < 20      Score > 60
  🟢 GREEN        🔴 RED LANE
  AUTO-RELEASE    PHYSICAL INSPECTION
  (< 3 minutes)   (15–45 minutes)
```

### 3.2 Microservices Breakdown

| Service | Responsibility | Tech Stack | SLA |
|---|---|---|---|
| `identity-svc` | Blockchain importer lookup | Hyperledger Fabric 2.5, Node.js SDK | <10s |
| `vision-svc` | X-ray scan analysis, Grad-CAM | PyTorch 2.0, YOLOv8, FastAPI | <5s |
| `risk-svc` | XGBoost risk scoring | Scikit-learn, FastAPI, Redis | <2s |
| `tariff-sync-svc` | Budget tariff auto-update | Python, APScheduler, CBIC API | <24hr sync |
| `dashboard-svc` | Officer UI, real-time updates | React 18, Chart.js, WebSockets | 99.9% uptime |
| `api-gateway` | Routing, auth, rate limiting | FastAPI + Kong Gateway | 10K req/sec |
| `ml-monitor-svc` | Model drift, auto-retrain | MLflow 2.10, Evidently AI | Weekly retrain |

### 3.3 Government System Integrations

| System | Purpose | Protocol |
|---|---|---|
| **ICEGATE** | Manifest data, duty calculations | REST/SOAP bridge (XML↔JSON middleware) |
| **GSTN** | GST-based importer legitimacy check | REST API |
| **MHA** | OFAC/UN sanctions real-time feed | Webhook + REST |
| **CBIC API** | Live Budget 2026 tariff schedule | REST, polled every 6 hours |

---

## 4. Full Technology Stack

### 4.1 ML & Computer Vision

| Technology | Version | Purpose |
|---|---|---|
| PyTorch | 2.0, CUDA 12.1 | YOLOv8 training & inference |
| YOLOv8 (Ultralytics) | 8.0.196 | Real-time object detection on X-rays |
| OpenCV | 4.8.0 | X-ray pre-processing, CLAHE, edge detection |
| pytorch-grad-cam | 1.4 | Explainable AI heatmaps |
| NumPy | 1.26 | Array operations |

### 4.2 Risk ML

| Technology | Version | Purpose |
|---|---|---|
| XGBoost | 2.0.3 | Risk score prediction (25+ features) |
| Scikit-learn | 1.4.0 | Feature engineering, preprocessing, evaluation |
| MLflow | 2.10.0 | Model registry, A/B testing, experiment tracking |
| Evidently AI | 0.4 | Model drift detection |

### 4.3 Blockchain

| Technology | Version | Purpose |
|---|---|---|
| Hyperledger Fabric | 2.5 LTS | Immutable permissioned ledger |
| Fabric Node.js SDK | 2.2.20 | Smart contract interaction |
| Go | 1.21 | Chaincode implementation |
| CouchDB | 3.3.3 | Fabric world state database |

### 4.4 Backend

| Technology | Version | Purpose |
|---|---|---|
| FastAPI | 0.110.0 (Python 3.11) | Async REST APIs, 10K req/sec |
| RabbitMQ | 3.13 + AMQP | Service decoupling, message queue |
| Redis | 7.2 | Blockchain query cache (80% hit rate target) |
| Kong Gateway | 3.6 | API routing, auth, rate limiting |

### 4.5 Databases

| Technology | Version | Purpose |
|---|---|---|
| PostgreSQL | 16.2 | Scan logs, analytics, audit trail |
| Redis | 7.2 | Caching, session state |

### 4.6 Frontend

| Technology | Version | Purpose |
|---|---|---|
| React.js | 18.3 + TypeScript 5.4 | Officer dashboard UI |
| Chart.js | 4.4 | Analytics visualisation |
| Recharts | 2.12 | Real-time chart components |
| WebSockets | — | Live dashboard updates |

### 4.7 Infrastructure

| Technology | Version | Purpose |
|---|---|---|
| Docker | 26 | Containerisation |
| Kubernetes | 1.30 | Orchestration, autoscaling |
| NVIDIA A100 GPUs | ×12 | YOLOv8 training at scale |
| GitHub Actions | — | CI/CD pipeline |

---

## 5. Detailed Functional Requirements

### 5.1 Pillar 1 — Vision AI Service (`vision-svc`)

#### 5.1.1 Model Training

- **Dataset:** GDXray public dataset (initial), augmented with 10,000 real port scans (Phase 2 pilot)
- **Architecture:** YOLOv8-Large, pre-trained on COCO, fine-tuned on customs X-ray data
- **Training config:** 100 epochs, batch size 32, AdamW optimiser, cosine LR schedule, GPU: NVIDIA A100
- **Validation split:** 80/10/10 train/val/test. Minimum test accuracy: **92%**
- **Augmentation:** Random flips, brightness jitter (±30%), Gaussian noise, mosaic augmentation

#### 5.1.2 Detection Classes

| Class | Sub-types | Confidence Threshold |
|---|---|---|
| **Weapons** | Firearms, blades, explosives, detonators | 70% (alert), 90% (auto-flag) |
| **Narcotics** | Packaged drugs, chemical precursors | 70% (alert), 85% (auto-flag) |
| **Undeclared Goods** | Gold bars, bulk electronics, currency | 80% (alert) |
| **Density Anomaly** | Hidden compartments, density mismatches | 75% (flag for officer review) |

#### 5.1.3 Inference Pipeline

```
Step 1: Ingest X-ray DICOM image from port scanner API
Step 2: Pre-process — resize to 640×640, CLAHE contrast enhancement via OpenCV
Step 3: Run YOLOv8 inference → bounding boxes + confidence scores
Step 4: Generate Grad-CAM heatmap overlaid on original image
Step 5: Emit JSON payload to RabbitMQ 'vision.results' queue
Step 6: Persist result + heatmap PNG to PostgreSQL + S3-compatible storage
```

> **Performance SLA:** < 5 seconds end-to-end. False Negative Rate: < 1%. Every alert must include Grad-CAM heatmap URL, bounding box coordinates, and nearest historical case reference.

---

### 5.2 Pillar 2 — Blockchain Identity Service (`identity-svc`)

#### 5.2.1 Hyperledger Fabric Network Setup

- **Participants:** CBIC (2 peers), 4 major ports (1 peer each), GSTN (1 peer), MHA (1 peer) = 10 peers total
- **Consensus:** Raft ordering service, 3 orderer nodes (fault tolerant)
- **Channels:** `india-customs-main` (all participants) + bilateral `india-singapore-trade` private channel
- **Chaincode:** Written in Go (performance). Deployed via Fabric lifecycle management.

#### 5.2.2 Importer Profile Data Model (Chaincode State)

```go
type ImporterProfile struct {
    ImporterID       string      // GSTIN or IEC
    RegistrationDate time.Time   // Immutable — set once on creation
    AEOCertificates  []AEOCert   // Multi-signature validated
    ViolationHistory []Violation // Append-only — no deletes
    InspectionLogs   []Inspection
    TrustScore       float64     // 0–100, auto-calculated on-chain
    LastUpdated      time.Time
}
```

#### 5.2.3 Anti-Fraud Rules (Enforced in Chaincode)

- `RegistrationDate` is set once at creation — no transaction can modify it
- `ViolationHistory` is append-only — no delete or update operations permitted
- AEO certificates require multi-signature: CBIC endorsement + port authority endorsement
- Trust score is computed on-chain by chaincode function — no external override permitted

#### 5.2.4 Trust Score Algorithm

```
TrustScore = (YearsActive × 10) + (AEOTier × 20)
           - (Violations × 15) + (CleanInspections × 0.5)
           [Clamped to range 0–100]
```

#### 5.2.5 Cross-Border Zero-Knowledge Federation

- Implement ZK-SNARK proof for bilateral trust sharing: prove "score > 70" without revealing raw profile data
- Smart contract standard: Common JSON-LD API schema for ASEAN interoperability
- Private Fabric channels: bilateral partner data never visible on main channel

> **Performance SLA:** Blockchain query < 10 seconds. Redis cache TTL: 6 hours. Network throughput: 350 TPS. Cache hit rate target: 80%.

---

### 5.3 Pillar 3 — Dynamic Risk Scoring Service (`risk-svc`)

#### 5.3.1 Feature Set (25+ Input Features)

| Feature Group | Features | XGBoost Weight |
|---|---|---|
| **Blockchain Trust** | Trust score, years active, violation count, AEO tier, recent inspection outcomes | 40% |
| **Vision AI Output** | Anomaly flag (bool), confidence score, number of detections, anomaly class | 30% |
| **Cargo Details** | HS tariff code (2026 Budget), declared value, weight, volume, declared goods category | 15% |
| **Route Risk** | Origin country risk index, transshipment count, port of entry risk, carrier history | 10% |
| **External Intel** | OFAC sanctions match, UN conflict zone flag, INTERPOL alert, seasonal smuggling index | 5% |

#### 5.3.2 Decision Thresholds

| Lane | Score Range | Action | Target Volume |
|---|---|---|---|
| 🟢 **GREEN** | 0 — 20 | Auto-release, update blockchain log | 70–75% of containers |
| 🟡 **YELLOW** | 21 — 60 | Officer reviews AI output, decides | 15–20% of containers |
| 🔴 **RED** | 61 — 100 | Physical inspection mandatory | 10–15% of containers |

#### 5.3.3 Self-Healing ML Pipeline (Continuous Learning)

```
Step 1: Officers flag false negatives/positives via dashboard UI toggle
Step 2: Flagged cases auto-added to retraining queue in MLflow dataset registry
Step 3: Nightly retrain job (02:00 IST) if > 50 new samples queued
Step 4: New model deployed to 10% traffic (A/B test) for 48 hours
Step 5: If new model accuracy > current model → auto-promote to production
Step 6: Adversarial spike detection → 15% spike in any class → emergency retrain within 48hrs
```

#### 5.3.4 Budget Tariff Synchronisation (`tariff-sync-svc`)

- Poll CBIC tariff API every 6 hours. On change detection: update HS code risk weights table
- XGBoost feature weights for tariff-sensitive categories auto-adjusted within 24 hours
- All tariff changes logged to PostgreSQL with timestamp and source (full audit trail)

---

## 6. Non-Functional Requirements

| Category | Requirement | Target |
|---|---|---|
| **Performance** | End-to-end clearance decision (trusted trader) | < 3 minutes |
| **Performance** | Vision AI inference latency | < 5 seconds per scan |
| **Performance** | Risk score computation latency | < 2 seconds |
| **Scalability** | Concurrent containers at peak (12 ports) | 1,200 containers/day |
| **Scalability** | Blockchain throughput | 350 TPS (5× headroom vs. 60 TPS peak) |
| **Availability** | Platform uptime SLA | 99.9% (< 8.7 hrs downtime/year) |
| **Security** | Data encryption at rest and in transit | AES-256 + TLS 1.3 |
| **Security** | API authentication | mTLS + JWT (OAuth 2.0) |
| **Explainability** | AI decision audit trail | Grad-CAM + feature importances stored 5 years |
| **Compliance** | Data retention (X-ray scans + logs) | 5 years (CBIC mandate) |
| **Compliance** | PDPA / IT Act data privacy | PII masked in logs; DPIA completed |

---

## 7. API Specifications

All endpoints are authenticated via mTLS + JWT Bearer token.  
Base URL: `https://api.scannr.in/api/v1`

---

### `POST /clearance/initiate`

Initiates the clearance workflow. Triggers all three pillars sequentially.

**Request body:**
```json
{
  "container_id": "TCMU-2026-00147",
  "importer_gstin": "27AABCU9603R1ZN",
  "manifest_url": "https://icegate.gov.in/manifests/...",
  "xray_scan_id": "SCN-MUM-20260205-0147",
  "declared_value_inr": 4500000,
  "hs_code": "8471.30"
}
```

**Response:**
```json
{
  "clearance_id": "CLR-2026-00147",
  "status": "PROCESSING",
  "estimated_completion_sec": 50
}
```

---

### `GET /clearance/{clearance_id}/result`

**Response:**
```json
{
  "lane": "GREEN",
  "risk_score": 18,
  "blockchain_trust": {
    "score": 88,
    "years_active": 7,
    "violations": 0,
    "aeo_tier": 1
  },
  "vision_result": {
    "anomaly_detected": false,
    "heatmap_url": "https://storage.scannr.in/heatmaps/...",
    "confidence": 0.04,
    "detections": []
  },
  "risk_features": {
    "top_features": [
      { "name": "blockchain_trust_score", "importance": 0.41 },
      { "name": "origin_country_risk", "importance": 0.18 }
    ]
  },
  "decision_time_sec": 47,
  "audit_hash": "sha256:a3f9b2c1..."
}
```

---

### `POST /officer/override`

Officer overrides AI lane decision. Required for audit trail and ML retraining.

```json
{
  "clearance_id": "CLR-2026-00147",
  "officer_id": "OFF-MUM-0042",
  "override_to": "RED",
  "reason": "Suspicious packaging pattern not flagged by AI"
}
```

---

### `GET /dashboard/stats`

Real-time port statistics. Also available as WebSocket stream at `/ws/stats`.

---

### `POST /blockchain/importer/register`

Register new importer on Hyperledger Fabric. Requires CBIC admin JWT.

---

### `GET /blockchain/importer/{gstin}/profile`

Fetch immutable importer profile from blockchain with current trust score.

---

## 8. Database Schemas

### 8.1 PostgreSQL — `clearance_decisions`

```sql
CREATE TABLE clearance_decisions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    container_id        VARCHAR(30)  NOT NULL,
    importer_gstin      VARCHAR(20)  NOT NULL,
    risk_score          FLOAT        NOT NULL,
    lane                VARCHAR(10)  CHECK (lane IN ('GREEN', 'YELLOW', 'RED')),
    vision_anomaly      BOOLEAN,
    vision_confidence   FLOAT,
    blockchain_trust    FLOAT,
    heatmap_s3_url      TEXT,
    officer_override    BOOLEAN      DEFAULT FALSE,
    override_reason     TEXT,
    created_at          TIMESTAMPTZ  DEFAULT NOW(),
    audit_hash          VARCHAR(64)  -- SHA-256 of full payload
);

CREATE INDEX idx_clearance_importer ON clearance_decisions(importer_gstin);
CREATE INDEX idx_clearance_created  ON clearance_decisions(created_at DESC);
```

### 8.2 PostgreSQL — `tariff_risk_weights`

```sql
CREATE TABLE tariff_risk_weights (
    hs_code           VARCHAR(12)  PRIMARY KEY,
    description       TEXT,
    risk_weight       FLOAT        NOT NULL DEFAULT 1.0,
    budget_year       INTEGER,
    effective_from    DATE,
    last_synced_at    TIMESTAMPTZ
);
```

### 8.3 PostgreSQL — `ml_training_queue`

```sql
CREATE TABLE ml_training_queue (
    id              UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    clearance_id    UUID      REFERENCES clearance_decisions(id),
    label_correct   BOOLEAN,        -- Was AI correct?
    officer_label   VARCHAR(20),    -- Officer's correct classification
    flagged_at      TIMESTAMPTZ     DEFAULT NOW(),
    trained         BOOLEAN         DEFAULT FALSE
);
```

### 8.4 PostgreSQL — `officer_overrides`

```sql
CREATE TABLE officer_overrides (
    id              UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    clearance_id    UUID      REFERENCES clearance_decisions(id),
    officer_id      VARCHAR(30) NOT NULL,
    original_lane   VARCHAR(10),
    override_lane   VARCHAR(10),
    reason          TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 9. Repository Structure

The agentic coding agent should generate the following monorepo structure:

```
scannr/
├── README.md
├── docker-compose.yml              # One-command local dev setup
├── .env.example
│
├── services/
│   │
│   ├── vision-svc/                 # Python · FastAPI · PyTorch
│   │   ├── Dockerfile
│   │   ├── requirements.txt
│   │   └── app/
│   │       ├── main.py             # FastAPI entrypoint + /health
│   │       ├── model/
│   │       │   ├── train.py        # YOLOv8 training script
│   │       │   ├── inference.py    # Inference + Grad-CAM generation
│   │       │   └── evaluate.py     # Accuracy / F1 / FNR metrics
│   │       ├── preprocess/
│   │       │   └── xray_pipeline.py # OpenCV CLAHE pre-processing
│   │       └── tests/
│   │           └── test_inference.py
│   │
│   ├── identity-svc/               # Node.js · Hyperledger Fabric SDK
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/
│   │       ├── server.js           # Express entrypoint
│   │       ├── fabric/
│   │       │   ├── connection.js   # Fabric gateway connection
│   │       │   └── importer.js     # Query / register importer
│   │       └── chaincode/          # Go chaincode
│   │           ├── importer.go
│   │           └── importer_test.go
│   │
│   ├── risk-svc/                   # Python · XGBoost · FastAPI
│   │   ├── Dockerfile
│   │   ├── requirements.txt
│   │   └── app/
│   │       ├── main.py
│   │       ├── model/
│   │       │   ├── train.py              # XGBoost training + MLflow logging
│   │       │   ├── predict.py            # Scoring + feature importances
│   │       │   ├── features.py           # Feature engineering (25+ features)
│   │       │   └── retrain_scheduler.py  # Self-healing retrain pipeline
│   │       └── tests/
│   │           └── test_predict.py
│   │
│   ├── tariff-sync-svc/            # Python · APScheduler
│   │   ├── Dockerfile
│   │   └── app/
│   │       └── sync.py             # CBIC API poll + weight update
│   │
│   ├── api-gateway/                # FastAPI + Kong
│   │   ├── kong.yml
│   │   └── Dockerfile
│   │
│   ├── dashboard-svc/              # React 18 · TypeScript
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── src/
│   │       ├── App.tsx
│   │       ├── components/
│   │       │   ├── ContainerQueue.tsx
│   │       │   ├── RiskScoreCard.tsx
│   │       │   ├── HeatmapViewer.tsx     # Grad-CAM display
│   │       │   ├── StatsPanel.tsx
│   │       │   └── OverrideModal.tsx
│   │       └── hooks/
│   │           └── useWebSocket.ts
│   │
│   └── ml-monitor-svc/             # Python · MLflow · Evidently
│       ├── Dockerfile
│       └── app/
│           ├── monitor.py          # Drift detection + alerting
│           └── ab_test.py          # A/B test traffic splitting
│
├── infra/
│   ├── kubernetes/                 # K8s manifests for all 7 services
│   │   ├── vision-svc.yaml
│   │   ├── identity-svc.yaml
│   │   ├── risk-svc.yaml
│   │   ├── dashboard-svc.yaml
│   │   └── ingress.yaml
│   ├── blockchain/                 # Fabric network config + crypto material
│   │   ├── configtx.yaml
│   │   └── crypto-config.yaml
│   └── postgres/
│       ├── 01_init.sql             # Schema creation
│       └── 02_seed.sql             # Tariff weights seed data
│
├── notebooks/                      # Jupyter notebooks
│   ├── 01_xray_eda.ipynb
│   ├── 02_yolov8_training.ipynb
│   └── 03_xgboost_risk_model.ipynb
│
└── docs/
    ├── api.yaml                    # OpenAPI 3.1 specification
    ├── architecture.md
    └── deployment_guide.md
```

---

## 10. Development Phases & Milestones

| Phase | Timeline | Deliverables | Success Criteria |
|---|---|---|---|
| **0 — Scaffold** | Week 1 | Monorepo, Docker Compose, PostgreSQL schema, Fabric dev network, CI/CD | `docker-compose up` deploys all 7 services |
| **1 — Vision AI** | Weeks 2–4 | YOLOv8 trained on GDXray, Grad-CAM integrated, `vision-svc` API live, unit tests | > 92% accuracy on test set |
| **2 — Blockchain** | Weeks 5–7 | Fabric chaincode deployed, importer CRUD, trust score on-chain, Redis cache, ZK proof PoC | < 10s query SLA; anti-fraud rules pass adversarial tests |
| **3 — Risk Scoring** | Weeks 8–10 | XGBoost trained (25+ features), `risk-svc` API, `tariff-sync-svc`, self-healing retrain | < 2s score SLA; tariff sync < 24hrs |
| **4 — Dashboard** | Weeks 11–13 | React dashboard, WebSocket real-time updates, officer override workflow, Grad-CAM viewer | Dashboard renders < 500ms updates |
| **5 — Integration** | Weeks 14–16 | API gateway, ICEGATE XML↔REST bridge, E2E integration tests, Swagger docs, K8s manifests | Full clearance flow < 3 mins E2E |
| **6 — Hardening** | Weeks 17–20 | Load testing (1,200 containers/day), security audit, VAPT, performance tuning | 99.9% uptime; all SLAs met under sustained load |

---

## 11. Known Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| GDXray accuracy gap vs. real port X-rays | 🔴 HIGH | 🔴 HIGH | Phase 1 pilot collects 10,000 real scans. Supervised mode (AI suggests, officer decides) until 90% accuracy validated on real data. |
| ICEGATE SOAP/XML integration lag | 🔴 HIGH | 🔴 HIGH | Year 1: parallel manual data entry bridge. Year 2: XML↔REST middleware. Full integration Year 3 with ICEGATE 2.0. |
| Blockchain TPS ceiling under peak load | 🟡 MEDIUM | 🟡 MEDIUM | Redis caching (80% hit rate), orderer nodes scaled 3→10 (350 TPS), off-chain metadata for non-critical fields. |
| Officer resistance to AI decisions | 🟡 MEDIUM | 🟡 MEDIUM | Year 1 AI is advisory only (100% override permitted). Explainable Grad-CAM builds trust. 6-month training programme. |
| Adversarial spoofing (lead-lined bags) | 🟢 LOW | 🔴 HIGH | Automated adversarial spike detection. Density void classified as automatic RED-lane flag regardless of other scores. |
| Budget 2027 funding cuts | 🟡 MEDIUM | 🔴 HIGH | Phased deployment maximises early ROI. 3-port pilot demonstrates ₹1,500 Cr/year return before full investment committed. |

> **Overall programme risk of failure: ~30%** (honest assessment disclosed per Budget 2026 transparency mandate)

---

## 12. Definition of Done — Acceptance Criteria

The system is production-ready for Mundra Port pilot when **all** of the following pass:

### 12.1 Performance

- [ ] `vision-svc` processes X-ray scan to JSON result in **< 5 seconds** at p95
- [ ] Blockchain identity query returns trust profile in **< 10 seconds** at p95 (cached reads < 200ms)
- [ ] Risk scoring returns lane decision in **< 2 seconds** at p95
- [ ] Full end-to-end clearance for GREEN-lane container completes in **< 3 minutes**

### 12.2 Accuracy

- [ ] YOLOv8 achieves **≥ 92% precision and recall** on held-out test set
- [ ] False Negative Rate is **< 1%** on test set
- [ ] XGBoost AUC-ROC is **> 0.90** on historical clearance data
- [ ] Tariff weight updates propagate to active `risk-svc` within **24 hours** of CBIC API change

### 12.3 Security & Compliance

- [ ] No chaincode transaction can modify `RegistrationDate` or delete `ViolationHistory` (verified by adversarial unit tests)
- [ ] All API endpoints return `401` for unauthenticated requests
- [ ] All data encrypted at rest (AES-256) and in transit (TLS 1.3)
- [ ] Audit log exists for **every** clearance decision including officer overrides

### 12.4 Operational

- [ ] `docker-compose up` starts all 7 services with **zero manual steps** beyond `.env` setup
- [ ] All services respond with `200 OK` on `/health` within 60 seconds of startup
- [ ] Kubernetes manifests deploy successfully to a standard K8s 1.30 cluster
- [ ] Load test: system sustains **50 concurrent clearance requests** without SLA degradation
- [ ] MLflow self-healing pipeline retrains and promotes a model when given 50+ flagged samples

### 12.5 Documentation

- [ ] `docs/api.yaml` (OpenAPI 3.1) is complete and matches all deployed endpoints
- [ ] `README.md` provides working quickstart in **under 10 minutes** for a new developer
- [ ] Jupyter notebooks `01–03` run end-to-end without errors and reproduce model metrics
- [ ] `docs/architecture.md` contains system diagram

---

## 13. Financial Summary

### 13.1 Investment Breakdown (3 Years)

| Investment Item | Cost |
|---|---|
| X-ray scanners (12 ports) | ₹2,400 Cr |
| AI Infrastructure (12× NVIDIA A100 + 50 K8s nodes) | ₹850 Cr |
| Blockchain Network (15 Fabric peers) | ₹320 Cr |
| Integration, Training & Change Management | ₹180 Cr |
| Contingency (20%) | ₹710 Cr |
| **TOTAL INVESTMENT** | **₹4,460 Crore** |

### 13.2 Annual Returns (from 2028)

| Benefit Category | Annual Value |
|---|---|
| Port congestion eliminated | ₹6,200 Cr |
| Demurrage charges saved by traders | ₹4,800 Cr |
| Manufacturing competitiveness gains (JIT enabled) | ₹2,500 Cr |
| Additional duty recovery (fraud reduction) | ₹1,500 Cr |
| Staffing optimisation | ₹300 Cr |
| Less: Annual operating costs | -₹1,800 Cr |
| **NET ANNUAL SAVINGS** | **₹13,500 Crore** |

### 13.3 ROI Summary

| Metric | Value |
|---|---|
| Total Investment | ₹4,460 Cr |
| Net Annual Return | ₹13,500 Cr |
| **Payback Period** | **4 months** |
| 10-Year NPV | ₹1.2 Lakh Crore |
| Operating Cost Ratio | 0.2% of savings |

---

## 14. Glossary

| Term | Definition |
|---|---|
| **AEO** | Authorised Economic Operator — trusted trader certification issued by CBIC |
| **CBIC** | Central Board of Indirect Taxes and Customs — India's customs authority |
| **Grad-CAM** | Gradient-weighted Class Activation Mapping — visual heatmaps explaining CNN predictions |
| **HS Code** | Harmonised System code — international 6-8 digit product classification for tariffs |
| **ICEGATE** | Indian Customs EDI Gateway — government system for customs declarations and duty payments |
| **TPS** | Transactions Per Second — blockchain throughput metric |
| **YOLOv8** | You Only Look Once v8 — state-of-the-art real-time object detection neural network |
| **XGBoost** | Extreme Gradient Boosting — ensemble tree-based ML algorithm for tabular prediction |
| **ZK-SNARK** | Zero-Knowledge Succinct Non-Interactive Argument of Knowledge — prove knowledge without data disclosure |
| **MLflow** | Open-source ML lifecycle platform for experiment tracking, model registry and deployment |
| **mTLS** | Mutual TLS — both client and server authenticate each other's certificates |
| **Green Lane** | Risk score 0–20: container auto-cleared without physical inspection |
| **Yellow Lane** | Risk score 21–60: officer reviews AI output and makes final decision |
| **Red Lane** | Risk score 61–100: mandatory physical inspection by customs officer |
| **AUC-ROC** | Area Under the Receiver Operating Characteristic curve — ML model performance metric |
| **VAPT** | Vulnerability Assessment and Penetration Testing — security audit methodology |
| **DPIA** | Data Protection Impact Assessment — privacy compliance document |

---

*SCANNR — Securing India's Borders, Accelerating Growth | Budget 2026-27 | Jai Hind 🇮🇳*
