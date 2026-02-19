# Run SCANNR Without Docker

This guide shows how to run all SCANNR services without Docker containers.

## Prerequisites

- Python 3.11+ 
- Node.js 20+
- PostgreSQL 16 (running locally)
- Redis 7 (running locally)
- RabbitMQ 3.13 (running locally)

## Quick Start

### 1. Start Infrastructure Services

You need these running locally:

**PostgreSQL:**
```bash
# Windows (if installed)
pg_ctl -D "C:\Program Files\PostgreSQL\16\data" start

# Or use local install
psql -U postgres -c "CREATE DATABASE scannr;"
psql -U postgres -c "CREATE USER scannr WITH PASSWORD 'scannr';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE scannr TO scannr;"
```

**Redis:**
```bash
# Windows
redis-server

# Or download from https://github.com/tporadowski/redis/releases
```

**RabbitMQ:**
```bash
# Windows
# Install from https://www.rabbitmq.com/install-windows.html
# Start service
net start RabbitMQ
```

### 2. Set Environment Variables

Create `.env` file in project root:
```bash
POSTGRES_URL=postgresql://scannr:scannr@localhost:5432/scannr
REDIS_URL=redis://localhost:6379/0
RABBITMQ_URL=amqp://guest:guest@localhost:5672/

# Service URLs (for local development)
VISION_SVC_URL=http://localhost:8001
RISK_SVC_URL=http://localhost:8002
IDENTITY_SVC_URL=http://localhost:8005

# JWT
JWT_SECRET=dev-secret-key
```

### 3. Run All Services

**Terminal 1 - Dashboard (Port 8000):**
```bash
cd services/dashboard-svc
npm install
node server.js
```

**Terminal 2 - Vision AI Service (Port 8001):**
```bash
cd services/vision-svc
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

**Terminal 3 - Risk Scoring Service (Port 8002):**
```bash
cd services/risk-svc
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload
```

**Terminal 4 - ML Monitor Service (Port 8004):**
```bash
cd services/ml-monitor-svc
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8004 --reload
```

**Terminal 5 - Identity Service (Port 8005):**
```bash
cd services/identity-svc
npm install
node src/server.js
```

**Terminal 6 - API Gateway (Port 8006):**
```bash
cd services/api-gateway
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8006 --reload
```

**Terminal 7 - Tariff Sync Service (Port 8003):**
```bash
cd services/tariff-sync-svc
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8003 --reload
```

### 4. Access Services

| Service | URL |
|---------|-----|
| Dashboard | http://localhost:8000 |
| Vision AI | http://localhost:8001 |
| Risk Scoring | http://localhost:8002 |
| Tariff Sync | http://localhost:8003 |
| ML Monitor | http://localhost:8004 |
| Identity | http://localhost:8005 |
| API Gateway | http://localhost:8006 |

### 5. Test Services

```bash
# Test all health endpoints
curl http://localhost:8000/health  # Dashboard
curl http://localhost:8001/health  # Vision
curl http://localhost:8002/health  # Risk
curl http://localhost:8006/health  # API Gateway
```

## Running with Mock Infrastructure

If you don't have PostgreSQL/Redis/RabbitMQ installed, services will run in mock mode:

```bash
# Set mock mode
export USE_MOCK_DB=true
export USE_MOCK_REDIS=true
export USE_MOCK_QUEUE=true

# Then start services as above
```

## One-Command Startup (Windows PowerShell)

Create `start-all.ps1`:
```powershell
# Start all SCANNR services

# Dashboard
Start-Process powershell -ArgumentList "-Command", "cd services/dashboard-svc; node server.js" -WindowStyle Normal

# Vision Service
Start-Process powershell -ArgumentList "-Command", "cd services/vision-svc; python -m uvicorn app.main:app --host 0.0.0.0 --port 8001" -WindowStyle Normal

# Risk Service
Start-Process powershell -ArgumentList "-Command", "cd services/risk-svc; python -m uvicorn app.main:app --host 0.0.0.0 --port 8002" -WindowStyle Normal

# ML Monitor
Start-Process powershell -ArgumentList "-Command", "cd services/ml-monitor-svc; python -m uvicorn app.main:app --host 0.0.0.0 --port 8004" -WindowStyle Normal

# Identity Service
Start-Process powershell -ArgumentList "-Command", "cd services/identity-svc; node src/server.js" -WindowStyle Normal

# API Gateway
Start-Process powershell -ArgumentList "-Command", "cd services/api-gateway; python -m uvicorn app.main:app --host 0.0.0.0 --port 8006" -WindowStyle Normal

Write-Host "All services started!"
Write-Host "Dashboard: http://localhost:8000"
```

Run with:
```powershell
.\start-all.ps1
```

## Troubleshooting

**Port already in use:**
```bash
# Find and kill process using port
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

**Missing dependencies:**
```bash
# Reinstall Python deps
pip install -r requirements.txt --force-reinstall

# Reinstall Node deps
rm -rf node_modules
npm install
```

**Database connection failed:**
- Ensure PostgreSQL is running
- Check connection string in .env
- Verify database and user exist

## Stopping Services

Press `Ctrl+C` in each terminal window, or:
```bash
# Kill all Python and Node processes (Windows)
taskkill /F /IM python.exe
taskkill /F /IM node.exe
```
