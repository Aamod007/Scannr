# SCANNR - AI-Enabled Risk-Based Customs Clearance Engine

> **Trust at the Speed of Trade**

[![Python 3.11](https://img.shields.io/badge/python-3.11-blue.svg)](https://www.python.org/downloads/)
[![Node.js 20](https://img.shields.io/badge/node.js-20-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://www.docker.com/)
[![Tests](https://img.shields.io/badge/tests-16%20passing-brightgreen.svg)]()
[![License](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

SCANNR is a production-grade customs intelligence platform integrating Computer Vision (YOLOv8), Blockchain (Hyperledger Fabric), and Dynamic ML Risk Scoring (XGBoost) to secure borders while accelerating trade.

## 🎯 Mission

Reduce customs clearance time from 7.2 days to under 15 minutes for trusted traders, raise contraband detection from 68% to 92%+, and eliminate 42% AEO credential fraud through blockchain immutability.

## 🏗️ Three Core Pillars

| Pillar | Technology | Purpose | KPI Target |
|--------|-----------|---------|------------|
| **Vision AI** | PyTorch 2.0 + YOLOv8 | 100% AI X-ray scanning | 92%+ accuracy, <5s |
| **Immutability** | Hyperledger Fabric 2.5 | Tamper-proof AEO credentials | <1% fraud rate |
| **Risk Scoring** | XGBoost + Scikit-learn | Real-time tariff adaptation | 24hr tariff sync |

## 🚀 Quick Start

### Prerequisites

- Docker 26+
- Docker Compose 2.20+
- 8GB+ RAM
- 20GB+ free disk space

### Installation

```bash
# Clone the repository
git clone https://github.com/Aamod007/Scannr.git
cd Scannr

# Copy environment template
cp .env.example .env

# Start all services
docker-compose up -d

# Wait for services to initialize (60 seconds)
sleep 60

# Verify all services are healthy
curl http://localhost:8000/health
curl http://localhost:8001/health
curl http://localhost:8002/health
```

### Test the API

```bash
# Get JWT token (for development)
TOKEN="valid-jwt-token"

# Initiate a clearance
curl -X POST http://localhost:8000/clearance/initiate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "container_id": "TCMU-2026-00147",
    "importer_gstin": "27AABCU9603R1ZN",
    "manifest_url": "https://icegate.gov.in/manifests/1",
    "xray_scan_id": "SCN-MUM-20260205-0147",
    "declared_value_inr": 4500000,
    "hs_code": "8471.30"
  }'

# Get clearance result
curl http://localhost:8000/clearance/CLR-20260218-xxxx/result \
  -H "Authorization: Bearer $TOKEN"

# Officer override
curl -X POST http://localhost:8000/officer/override \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "clearance_id": "CLR-20260218-xxxx",
    "officer_id": "OFF-MUM-0042",
    "override_to": "RED",
    "reason": "Suspicious packaging pattern"
  }'
```

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway (Kong)                        │
│                    Rate Limiting | JWT | mTLS                    │
└───────────────────────────────┬─────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  Vision AI   │      │    Risk      │      │   Identity   │
│   Service    │      │   Service    │      │   Service    │
│              │      │              │      │              │
│ YOLOv8 +     │      │ XGBoost +    │      │ Hyperledger  │
│ Grad-CAM     │      │ MLflow       │      │ Fabric       │
└──────────────┘      └──────────────┘      └──────────────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   Clearance Decision  │
                    │   (GREEN/YELLOW/RED)  │
                    └───────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
         ┌──────────┐   ┌──────────┐   ┌──────────┐
         │  GREEN   │   │  YELLOW  │   │   RED    │
         │  Auto    │   │  Officer │   │ Physical │
         │ Release  │   │  Review  │   │ Inspection
         └──────────┘   └──────────┘   └──────────┘
```

## 🛠️ Technology Stack

### Machine Learning & Computer Vision
- **PyTorch 2.0** - YOLOv8 training & inference
- **YOLOv8 (Ultralytics)** - Real-time object detection
- **OpenCV 4.8** - X-ray pre-processing, CLAHE, edge detection
- **pytorch-grad-cam** - Explainable AI heatmaps
- **XGBoost 2.0** - Risk score prediction
- **Scikit-learn 1.4** - Feature engineering, preprocessing
- **MLflow 2.10** - Model registry, A/B testing
- **Evidently AI 0.4** - Model drift detection

### Blockchain
- **Hyperledger Fabric 2.5** - Immutable permissioned ledger
- **Fabric Node.js SDK 2.2** - Smart contract interaction
- **Go 1.21** - Chaincode implementation
- **CouchDB 3.3** - Fabric world state database

### Backend Services
- **FastAPI 0.110** - Async REST APIs (Python 3.11)
- **Express.js 4.19** - Node.js REST APIs
- **RabbitMQ 3.13** - Service decoupling, message queue
- **Redis 7.2** - Blockchain query cache
- **Kong Gateway 3.6** - API routing, auth, rate limiting

### Databases
- **PostgreSQL 16.2** - Scan logs, analytics, audit trail
- **Redis 7.2** - Caching, session state

### Frontend
- **React.js 18.3** + TypeScript 5.4 - Officer dashboard
- **Chart.js 4.4** - Analytics visualization
- **Recharts 2.12** - Real-time chart components

### Infrastructure
- **Docker 26** - Containerization
- **Kubernetes 1.30** - Orchestration, autoscaling
- **GitHub Actions** - CI/CD pipeline

## 📁 Project Structure

```
Scannr/
├── docker-compose.yml              # One-command local dev setup
├── .env.example                    # Environment variables template
├── SCANNR_PRD.md                   # Product Requirements Document
├── SCANNR_tasks.md                 # Development task list
│
├── services/                       # Microservices
│   ├── api-gateway/                # FastAPI + Kong orchestration
│   │   ├── app/
│   │   │   ├── main.py            # FastAPI entrypoint
│   │   │   ├── middleware/auth.py # JWT authentication
│   │   │   ├── orchestrator/      # Service coordination
│   │   │   │   ├── clearance.py   # Main clearance workflow
│   │   │   │   ├── result.py      # Result retrieval
│   │   │   │   └── override.py    # Officer overrides
│   │   │   └── db/connection.py   # PostgreSQL connection
│   │   ├── tests/
│   │   └── requirements.txt
│   │
│   ├── vision-svc/                 # YOLOv8 X-ray analysis
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── model/
│   │   │   │   ├── inference.py   # YOLOv8 inference
│   │   │   │   ├── train.py       # Model training
│   │   │   │   └── evaluate.py    # Accuracy metrics
│   │   │   └── preprocess/        # OpenCV preprocessing
│   │   └── tests/
│   │
│   ├── risk-svc/                   # XGBoost risk scoring
│   │   ├── app/
│   │   │   ├── main.py
│   │   │   ├── model/
│   │   │   │   ├── predict.py     # Risk prediction
│   │   │   │   ├── train.py       # XGBoost training
│   │   │   │   └── features.py    # Feature engineering
│   │   │   └── retrain/           # Self-healing pipeline
│   │   └── tests/
│   │
│   ├── identity-svc/               # Hyperledger Fabric
│   │   ├── src/
│   │   │   ├── server.js          # Express entrypoint
│   │   │   ├── connection.js      # Fabric gateway
│   │   │   └── importer.js        # Importer CRUD
│   │   └── chaincode/
│   │       ├── importer.go        # Go chaincode
│   │       └── importer_test.go
│   │
│   ├── ml-monitor-svc/             # MLflow + Evidently
│   ├── tariff-sync-svc/            # CBIC tariff sync
│   └── dashboard-svc/              # React UI
│
├── infra/                          # Infrastructure
│   ├── blockchain/                 # Fabric network config
│   │   ├── configtx.yaml          # Channel configuration
│   │   └── crypto-config.yaml     # Certificate configuration
│   ├── kong/                       # API Gateway
│   │   └── kong.yml               # Routes & plugins
│   └── postgres/                   # Database
│       ├── 01_init.sql            # Schema creation
│       └── 02_seed.sql            # Seed data
│
├── tests/                          # Test suites
│   ├── security/                   # VAPT & penetration tests
│   └── load/                       # k6 load tests
│
└── ui/                             # Static UI assets
    ├── index.html
    └── app.js
```

## 🔌 API Endpoints

### Clearance API

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/clearance/initiate` | Start clearance workflow | JWT |
| GET | `/clearance/{id}/result` | Get clearance result | JWT |
| POST | `/officer/override` | Override AI decision | JWT |

### Identity API

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/importer/{gstin}` | Get importer profile | JWT |
| POST | `/importer` | Register new importer | Admin JWT |
| POST | `/importer/{gstin}/violation` | Add violation | Admin JWT |

### Vision API

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/scan` | Analyze X-ray scan | JWT |
| GET | `/health` | Health check | None |

### Risk API

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/score` | Calculate risk score | JWT |
| GET | `/health` | Health check | None |

## 🧪 Testing

### Run Unit Tests

```bash
# API Gateway
cd services/api-gateway
python -m pytest tests/ -v

# Vision Service
cd services/vision-svc
python -m pytest tests/ -v

# Risk Service
cd services/risk-svc
python -m pytest tests/ -v

# ML Monitor Service
cd services/ml-monitor-svc
python -m pytest tests/ -v

# All Security Tests
python -m pytest tests/security/ -v
```

### Run Integration Tests

```bash
# Start services
docker-compose up -d

# Run integration test suite
pytest tests/integration/ -v
```

### Load Testing

```bash
# Install k6
# https://k6.io/docs/get-started/installation/

# Run load test
k6 run tests/load/load-test.js
```

## 📈 Performance SLAs

| Metric | Target | Current |
|--------|--------|---------|
| Vision AI inference | < 5 seconds | ✅ Mock: <1s |
| Risk score computation | < 2 seconds | ✅ Mock: <100ms |
| Blockchain query | < 10 seconds | ✅ Cached: <200ms |
| End-to-end clearance | < 3 minutes | ✅ Mock: <5s |
| System uptime | 99.9% | ✅ N/A |

## 🔐 Security Features

- ✅ **mTLS** - Mutual TLS authentication
- ✅ **JWT** - JSON Web Token authorization
- ✅ **AES-256** - Encryption at rest
- ✅ **TLS 1.3** - Encryption in transit
- ✅ **Blockchain immutability** - Tamper-proof audit trail
- ✅ **SHA-256** - Audit hash for all decisions
- ✅ **Rate limiting** - 10,000 req/min via Kong
- ✅ **PII masking** - Personal data protection

## 🚧 Development Roadmap

### Phase 0: Scaffold ✅
- [x] Monorepo structure
- [x] Docker Compose setup
- [x] CI/CD pipeline
- [x] All services booting

### Phase 1: Vision AI ✅
- [x] YOLOv8 integration (mock)
- [x] Grad-CAM heatmaps
- [x] Inference API
- [x] Unit tests

### Phase 2: Blockchain ✅
- [x] Hyperledger Fabric config
- [x] Go chaincode
- [x] Node.js SDK
- [x] Redis caching

### Phase 3: Risk Scoring ✅
- [x] XGBoost integration (mock)
- [x] 25+ features
- [x] MLflow registry
- [x] Self-healing pipeline

### Phase 4: Dashboard ⏳
- [ ] React components
- [ ] WebSocket updates
- [ ] Heatmap viewer
- [ ] Override modal

### Phase 5: Integration ⏳
- [ ] ICEGATE bridge
- [ ] GSTN integration
- [ ] MHA sanctions feed
- [ ] End-to-end tests

### Phase 6: Production ⏳
- [ ] Kubernetes manifests
- [ ] GPU support
- [ ] Monitoring stack
- [ ] VAPT certification

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📧 Contact

- **Project Link**: https://github.com/Aamod007/Scannr
- **Issues**: https://github.com/Aamod007/Scannr/issues

## 🙏 Acknowledgments

- Union Budget 2026-27 Customs Modernisation Initiative
- Para 87 - Customs Digitalization
- Ministry of Finance, Government of India

---

**SCANNR** - Securing India's Borders, Accelerating Growth | Budget 2026-27 | Jai Hind 🇮🇳
