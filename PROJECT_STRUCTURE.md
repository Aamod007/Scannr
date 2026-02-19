# SCANNR Project Structure Overview

This document provides a comprehensive overview of the organized SCANNR codebase structure.

## 📁 Root Directory Structure

```
SCANNR/
├── .github/                    # GitHub workflows and CI/CD
│   └── workflows/
│       ├── deploy.yml
│       └── tests.yml
├── docs/                       # Documentation
│   ├── architecture/
│   │   └── security.md
│   ├── deployment/
│   │   ├── gpu-support.md
│   │   └── run-without-docker.md
│   ├── guides/
│   │   ├── SCANNR_data_sources_and_working.md
│   │   ├── SCANNR_tasks.md
│   │   └── XRAY_DATASET_INTEGRATION.md
│   ├── api/                    # API documentation (empty)
│   └── examples/               # Usage examples (empty)
├── infra/                      # Infrastructure configuration
│   ├── blockchain/             # Hyperledger Fabric configs
│   ├── kong/                   # API Gateway configuration
│   ├── kubernetes/             # K8s manifests
│   └── postgres/               # Database initialization
├── notebooks/                  # Jupyter notebooks (empty)
├── scripts/                    # Utility scripts
│   ├── data/                   # Dataset management
│   │   ├── create_sample_datasets.py
│   │   ├── preprocess_datasets.py
│   │   ├── xray_dataset_demo.py
│   │   └── download_datasets.py
│   ├── deployment/             # Deployment scripts
│   │   ├── start-all.bat
│   │   └── stop-all.bat
│   ├── testing/                # Testing utilities
│   └── training/               # Model training
│       └── train_yolov8.py
├── services/                   # Microservices
│   ├── api-gateway/            # FastAPI orchestration service
│   ├── dashboard-svc/          # React frontend
│   ├── identity-svc/           # Hyperledger Fabric service
│   ├── ml-monitor-svc/         # MLflow monitoring
│   ├── risk-svc/               # XGBoost risk scoring
│   ├── tariff-sync-svc/        # CBIC tariff sync
│   └── vision-svc/             # YOLOv8 X-ray analysis
├── tests/                      # Test suites
│   ├── e2e/                    # End-to-end tests
│   ├── load/                   # Load testing
│   └── security/               # Security tests
└── data/                       # Data directory
    ├── logs/                   # Application logs
    ├── models/                 # Trained ML models
    ├── processed/              # Processed datasets
    └── raw/                    # Raw datasets
```

## 🚀 Services Overview

### Core Services

| Service | Port | Technology | Purpose |
|---------|------|------------|---------|
| API Gateway | 8000 | FastAPI (Starlette) | Central orchestration |
| Vision AI | 8001 | YOLOv8 + PyTorch | X-ray contraband detection |
| Risk Scoring | 8002 | XGBoost + Scikit-learn | Risk assessment |
| Identity | 8005 | Hyperledger Fabric | Blockchain credentials |
| ML Monitor | 8004 | MLflow + Evidently | Model monitoring |
| Dashboard | 8003 | React.js + Node.js | Officer interface |
| Tariff Sync | 8006 | Python | CBIC tariff updates |

### Infrastructure Services

| Service | Port | Technology | Purpose |
|---------|------|------------|---------|
| PostgreSQL | 5432 | PostgreSQL 16.2 | Primary database |
| Redis | 6379 | Redis 7.2 | Caching |
| RabbitMQ | 5672 | RabbitMQ 3.13 | Message queue |
| CouchDB | 5984 | CouchDB 3.3 | Fabric state DB |

## 📊 Data Structure

### X-ray Datasets

```
data/raw/
├── xray/
│   ├── gdxray/          # 1,000 synthetic baggage images
│   ├── clcxray/         # 500 cluttered baggage images
│   └── opixray/         # 800 occluded prohibited items
├── processed/
│   ├── train/           # 1,610 training images
│   ├── val/             # 460 validation images
│   └── test/            # 230 test images
└── models/              # Trained YOLOv8 models
```

### Dataset Statistics

- **Total Images**: 2,300
- **Training Split**: 70% train, 20% val, 10% test
- **Classes**: 7 contraband categories
- **Format**: YOLOv8 compatible

## 🧪 Testing Structure

### Test Categories

1. **Unit Tests** (`services/*/tests/`)
   - Individual service testing
   - API endpoint validation
   - Function-level testing

2. **Integration Tests** (`tests/`)
   - End-to-end workflow testing
   - Service communication
   - Data pipeline validation

3. **Security Tests** (`tests/security/`)
   - Vulnerability assessment
   - Penetration testing
   - Authentication validation

4. **Load Tests** (`tests/load/`)
   - Performance benchmarking
   - Scalability testing
   - Stress testing

## 📚 Documentation

### Documentation Categories

1. **Architecture** (`docs/architecture/`)
   - System design documents
   - Security specifications
   - Technical architecture

2. **Deployment** (`docs/deployment/`)
   - Installation guides
   - Configuration instructions
   - Operational procedures

3. **Guides** (`docs/guides/`)
   - Data sources and workflows
   - Task management
   - Dataset integration

4. **API** (`docs/api/`)
   - API specifications
   - Endpoint documentation
   - Integration guides

## 🔧 Scripts Organization

### Script Categories

1. **Data Scripts** (`scripts/data/`)
   - Dataset creation utilities
   - Data preprocessing tools
   - Dataset validation scripts

2. **Training Scripts** (`scripts/training/`)
   - Model training pipelines
   - Hyperparameter tuning
   - Model evaluation tools

3. **Deployment Scripts** (`scripts/deployment/`)
   - Service startup scripts
   - Environment setup
   - Deployment automation

4. **Testing Scripts** (`scripts/testing/`)
   - Test execution utilities
   - Test data generation
   - Performance benchmarking

## 🏗️ Infrastructure

### Infrastructure Components

1. **Blockchain** (`infra/blockchain/`)
   - Hyperledger Fabric configuration
   - Channel definitions
   - Certificate authorities

2. **Kubernetes** (`infra/kubernetes/`)
   - Service deployments
   - ConfigMaps and Secrets
   - Ingress configurations

3. **Databases** (`infra/postgres/`)
   - Schema definitions
   - Seed data
   - Migration scripts

4. **API Gateway** (`infra/kong/`)
   - Route definitions
   - Plugin configurations
   - Rate limiting rules

## 🎯 Key Features

### System Capabilities

1. **AI-Powered Detection**
   - YOLOv8 for X-ray contraband detection
   - Grad-CAM for explainable AI
   - Real-time inference (<5 seconds)

2. **Blockchain Security**
   - Immutable credential storage
   - Multi-signature validation
   - Tamper-proof audit trail

3. **Risk Assessment**
   - XGBoost-based scoring
   - 25+ risk factors
   - Dynamic tariff adaptation

4. **Modern UI/UX**
   - React.js dashboard
   - Real-time updates
   - Mobile-responsive design

## 🚀 Getting Started

### Quick Start

```bash
# Start all services
scripts/deployment/start-all.bat

# Run tests
make test

# Train models
scripts/training/train_yolov8.py

# Create datasets
scripts/data/create_sample_datasets.py
```

### Development Workflow

1. **Setup**: Configure environment variables
2. **Data**: Prepare or generate datasets
3. **Train**: Train ML models
4. **Test**: Run comprehensive test suite
5. **Deploy**: Deploy to target environment
6. **Monitor**: Monitor system performance

## 📈 Performance Targets

### System SLAs

- **Vision AI**: <5 seconds inference
- **Risk Scoring**: <2 seconds computation
- **Blockchain Query**: <10 seconds (cached)
- **End-to-End**: <3 minutes clearance
- **Uptime**: 99.9% availability

### Model Performance

- **Accuracy**: >92% mAP@0.5
- **False Positive**: <3%
- **False Negative**: <8%
- **Throughput**: 100+ scans/hour

This structure provides a clean, organized, and scalable foundation for the SCANNR customs intelligence platform.