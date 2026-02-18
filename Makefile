# SCANNR Makefile
# Common development and deployment tasks

.PHONY: help install test build deploy clean lint fmt

# Default target
help:
	@echo "SCANNR - Available commands:"
	@echo ""
	@echo "  make install     - Install all dependencies"
	@echo "  make test        - Run all tests"
	@echo "  make test-unit   - Run unit tests only"
	@echo "  make test-e2e    - Run end-to-end tests"
	@echo "  make build       - Build all Docker images"
	@echo "  make up          - Start services with docker-compose"
	@echo "  make down        - Stop all services"
	@echo "  make deploy      - Deploy to Kubernetes"
	@echo "  make lint        - Run linters"
	@echo "  make fmt         - Format code"
	@echo "  make clean       - Clean up artifacts"
	@echo "  make logs        - View logs"
	@echo ""

# Install dependencies
install:
	@echo "Installing Python dependencies..."
	@pip install -r services/api-gateway/requirements.txt
	@pip install -r services/vision-svc/requirements.txt
	@pip install -r services/risk-svc/requirements.txt
	@echo "Installing Node.js dependencies..."
	@cd services/dashboard-svc && npm install
	@cd services/identity-svc && npm install
	@echo "Done!"

# Run all tests
test: test-unit test-integration

# Unit tests
test-unit:
	@echo "Running unit tests..."
	@pytest services/api-gateway/tests/ -v
	@pytest services/vision-svc/tests/ -v
	@pytest services/risk-svc/tests/ -v
	@pytest services/ml-monitor-svc/tests/ -v

# Integration tests
test-integration:
	@echo "Running integration tests..."
	@pytest tests/security/ -v
	@pytest tests/e2e/ -v

# E2E tests
test-e2e:
	@echo "Running E2E tests..."
	@pytest tests/e2e/ -v --tb=short

# Build Docker images
build:
	@echo "Building Docker images..."
	@docker-compose build

# Start services
up:
	@echo "Starting services..."
	@docker-compose up -d
	@echo "Waiting for services to be ready..."
	@sleep 30
	@echo "Services ready!"

# Stop services
down:
	@echo "Stopping services..."
	@docker-compose down

# View logs
logs:
	@docker-compose logs -f

# Deploy to Kubernetes
deploy:
	@echo "Deploying to Kubernetes..."
	@kubectl apply -f infra/kubernetes/
	@echo "Deployment complete!"

# Delete from Kubernetes
delete:
	@echo "Deleting from Kubernetes..."
	@kubectl delete -f infra/kubernetes/

# Lint code
lint:
	@echo "Running linters..."
	@flake8 services/ --max-line-length=100 --ignore=E501,W503,W291,W292,W293,W391,E302,W504
	@echo "Python linting complete!"

# Format code
fmt:
	@echo "Formatting code..."
	@black services/ --line-length=100
	@echo "Formatting complete!"

# Clean up
clean:
	@echo "Cleaning up..."
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@find . -type f -name "*.log" -delete 2>/dev/null || true
	@docker-compose down -v 2>/dev/null || true
	@docker system prune -f 2>/dev/null || true
	@echo "Cleanup complete!"

# Setup development environment
setup:
	@echo "Setting up development environment..."
	@cp .env.example .env
	@mkdir -p logs data models
	@echo "Setup complete! Edit .env with your configuration."

# Load testing
load-test:
	@echo "Running load tests..."
	@k6 run tests/load/load-test.js

# Health check
health:
	@echo "Checking service health..."
	@curl -s http://localhost:8000/health | jq .
	@curl -s http://localhost:8001/health | jq .
	@curl -s http://localhost:8002/health | jq .
