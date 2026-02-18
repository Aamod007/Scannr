# SCANNR - Production Directory Structure

```
scannr/
├── .github/                    # GitHub configurations
│   ├── workflows/              # CI/CD pipelines
│   │   ├── test.yml
│   │   ├── build.yml
│   │   └── deploy.yml
│   └── ISSUE_TEMPLATE.md
│
├── docs/                       # Documentation
│   ├── architecture/           # System architecture docs
│   │   ├── overview.md
│   │   ├── data-flow.md
│   │   └── security.md
│   ├── deployment/             # Deployment guides
│   │   ├── docker.md
│   │   ├── kubernetes.md
│   │   ├── gpu-setup.md
│   │   └── monitoring.md
│   ├── api/                    # API documentation
│   │   └── openapi.yaml
│   ├── vapt-certification.md   # Security certification
│   └── CONTRIBUTING.md
│
├── infra/                      # Infrastructure
│   ├── kubernetes/             # K8s manifests
│   │   ├── 00-namespace.yaml
│   │   ├── 01-api-gateway.yaml
│   │   ├── 02-vision-svc.yaml
│   │   ├── 03-risk-svc.yaml
│   │   ├── 04-postgres.yaml
│   │   ├── 05-redis.yaml
│   │   ├── 06-ingress.yaml
│   │   ├── 07-secrets.yaml
│   │   ├── 08-configmap-sql.yaml
│   │   └── 09-monitoring.yaml
│   ├── blockchain/             # Hyperledger Fabric config
│   │   ├── configtx.yaml
│   │   └── crypto-config.yaml
│   ├── kong/                   # API Gateway config
│   │   └── kong.yml
│   └── postgres/               # Database schemas
│       ├── 01_init.sql
│       └── 02_seed.sql
│
├── scripts/                    # Utility scripts
│   ├── setup.sh                # Initial setup
│   ├── deploy.sh               # Deployment script
│   ├── backup.sh               # Backup script
│   └── load-test.sh            # Load testing
│
├── services/                   # Microservices
│   ├── api-gateway/            # FastAPI + Kong
│   │   ├── app/
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   ├── vision-svc/             # YOLOv8 AI
│   │   ├── app/
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   ├── risk-svc/               # XGBoost scoring
│   │   ├── app/
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   ├── identity-svc/           # Blockchain identity
│   │   ├── src/
│   │   ├── chaincode/
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── dashboard-svc/          # React UI
│   │   ├── src/
│   │   ├── public/
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── ml-monitor-svc/         # ML monitoring
│   │   ├── app/
│   │   └── requirements.txt
│   └── tariff-sync-svc/        # Tariff sync
│       ├── app/
│       └── requirements.txt
│
├── tests/                      # Test suites
│   ├── e2e/                    # End-to-end tests
│   │   └── test_clearance_flow.py
│   ├── integration/            # Integration tests
│   ├── security/               # Security/VAPT tests
│   │   ├── test_security.py
│   │   ├── penetration.py
│   │   └── vapt.py
│   └── load/                   # Load tests
│       └── load-test.js
│
├── .env.example                # Environment template
├── .gitignore                  # Git ignore rules
├── docker-compose.yml          # Local development
├── LICENSE                     # MIT License
├── Makefile                    # Common tasks
├── README.md                   # Main documentation
└── SCANNR_PRD.md               # Product Requirements
```

## File Organization Rules

### 1. Services
- Each service in its own directory under `services/`
- Contains `Dockerfile` for containerization
- Has `tests/` directory with unit tests
- Independent deployment capability

### 2. Documentation
- All docs under `docs/`
- Architecture docs in `docs/architecture/`
- Deployment guides in `docs/deployment/`
- API specs in `docs/api/`

### 3. Infrastructure
- K8s manifests in `infra/kubernetes/`
- Numbered for deployment order
- One file per service/resource

### 4. Tests
- Organized by test type
- E2E tests verify full workflows
- Security tests for VAPT
- Load tests for performance

### 5. Scripts
- Automation scripts in `scripts/`
- Executable bash scripts
- Helper utilities

## Naming Conventions

- **Files**: lowercase-with-hyphens.md
- **Directories**: lowercase-no-spaces
- **Services**: service-name-svc
- **K8s Files**: NN-descriptive-name.yaml

## Clean Code Principles

1. No `__pycache__` or `.pytest_cache` directories
2. No `node_modules` in git
3. No `.venv` or virtual environments
4. No large binary files
5. No secrets or credentials
6. No logs or temporary files
