# SCANNR - Current State Review & Next Steps

This document provides a comprehensive review of the `SCANNR` codebase as of its current state, an architectural assessment, and a step-by-step actionable guide for implementing the remaining phases (Phase 4, Phase 5, Phase 6) as outlined in the PRD and `README.md`.

## 1. Current State of the Codebase

### Fully Implemented Components (Phases 0-3)

- **Monorepo & Orchestration:** The repo uses Docker Compose (`docker-compose.yml`) to orchestrate the multiple microservices cleanly. Basic startup scripts (`start-local.bat`/`.ps1`) are present.
- **API Gateway (`services/api-gateway`):**
  - Built with Starlette (FastAPI style).
  - Handles routing, JWT extraction (`_auth`), and orchestrates clearance (`initiate_clearance`, `clearance_result`), dashboard statistics, ICEGATE bridge endpoints, and MHA sanctions check.
- **Vision AI Service (`services/vision-svc`):**
  - Fully scaffolded with FastAPI.
  - Implements an inference model for YOLOv8 and generates Grad-CAM heatmaps.
  - Mock functionality is present (`payload.simulate_anomaly`) to simulate anomalies if the correct model weights aren't present.
- **Blockchain / Identity Service (`services/identity-svc`):**
  - Built with Node.js/Express.
  - Has a mock/simulated ledger and pre-loads sample importers at startup. It mocks Hyperledger Fabric connections.
- **Risk Scoring Service (`services/risk-svc`):**
  - Contains FastAPI-style logic for predicting risks (`app.model.predict`) using assembled features.
  - It also includes endpoints for ML model training, evaluation, and retraining.
- **ML Monitor Service (`services/ml-monitor-svc`):**
  - A Starlette app to track data drift, coordinate A/B tests, and maintain an MLflow registry.
- **Tariff Sync Service (`services/tariff-sync-svc`):**
  - Mocks CBIC API fetching to update tariff rates dynamically, polling every 6 hours using `APScheduler`.

### Infrastructure & Testing (`infra/` & `tests/`)
- **Infra:** Complete Kubernetes manifests (`infra/kubernetes/`) including namespace configurations, API gateway, vision service, datastores (PostgreSQL, Redis), ingress, secrets, config maps, and monitoring setups.
- **Tests:** Contains robust load tests (`k6`), E2E clearance flow tests (`pytest`), and simulated security checks (VAPT & penetration testing mocks).

### What is Missing / Needs Work (Phases 4-6)

- **Phase 4: Dashboard:** The `dashboard-svc` contains a single `index.html` file right now that represents a fully-styled React/Tailwind frontend, but it operates as a monolithic static HTML file without an actual React build system (e.g., Vite/Webpack/Next.js) or modular React components.
- **Phase 5: Integration:** The ICEGATE Bridge, GSTN Integration, and MHA Sanctions feed are present in the `api-gateway/app/bridge/` directory but likely require full integration testing and configuration against real-world test environments.
- **Phase 6: Production:** Kubernetes manifests are provided but likely need fine-tuning for specific GPU node allocations (for `vision-svc`), ingress controllers, and proper observability (Prometheus/Grafana) deployment.

## 2. Architectural Feedback

- **Microservices Design:** Excellent decoupling. The separation into `vision-svc` (PyTorch/GPU focus), `risk-svc` (XGBoost/CPU focus), `identity-svc` (Node/Blockchain), and `api-gateway` provides independent scaling. Event-driven communication is well planned.
- **Simulations vs Reality:** The `identity-svc` currently simulates the Hyperledger Fabric ledger (`const ledger = []`). This should be transitioned to use the actual Fabric Node.js SDK and communicate with real peers/orderers as intended by Phase 2/Production.
- **Dashboard Structure:** The `dashboard-svc` currently relies on a large `index.html` file using CDN links for React/Tailwind. For production, this should be modularized into a standard React project using TypeScript to allow better state management, maintainability, and component reusability.
- **Security:** Good use of simulated API keys, JWT validation in the API Gateway, and Kubernetes secrets.

## 3. Step-by-Step Guide for Remaining Phases

### Phase 4: Dashboard Modernization
1. **Bootstrap React App:** Initialize a proper React application in `services/dashboard-svc/` using Vite (e.g., `npm create vite@latest src -- --template react-ts`).
2. **Component Separation:** Break down `index.html` into modular components: `Sidebar`, `LiveQueue`, `HeatmapViewer`, `AnalyticsChart`, etc.
3. **State Management:** Implement React Context or Zustand to manage global state (e.g., active container ID, notifications, user authentication state).
4. **WebSocket Integration:** Connect the React frontend to the API Gateway's `/ws/stats` endpoint to receive live updates instead of long-polling.

### Phase 5: External Integrations
1. **ICEGATE & GSTN Configuration:** Transition the mock responses in `api-gateway/app/bridge/` to hit actual staging environments for ICEGATE and GSTN.
2. **Blockchain Implementation:** Update `identity-svc` to replace the in-memory array ledger with genuine Hyperledger Fabric SDK calls connecting to the channels specified in `infra/blockchain/`.
3. **End-to-End Testing:** Run the existing `tests/e2e/test_clearance_flow.py` against the real external dependencies to verify integration success.

### Phase 6: Production Readiness
1. **GPU Orchestration:** Update the Kubernetes manifest `infra/kubernetes/02-vision-svc.yaml` to request GPU resources (`nvidia.com/gpu: 1`) for the YOLOv8 inference node.
2. **Observability Stack:** Deploy Prometheus and Grafana using the `09-monitoring.yaml` manifest. Ensure all microservices export standard metrics (e.g., using `prometheus-client` in Python).
3. **VAPT Certification:** Execute the scripts in `tests/security/` and resolve any flagged vulnerabilities (e.g., secure headers, strict CORS, rate-limiting tuning).
4. **CI/CD Pipelines:** Setup GitHub Actions or GitLab CI to run linting, unit tests, and build Docker images automatically on pull requests.
