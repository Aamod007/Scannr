# Contributing to SCANNR

Thank you for your interest in contributing to SCANNR! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code:

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Respect different viewpoints and experiences

## How Can I Contribute?

### Reporting Bugs

Before creating a bug report, please:

1. Check if the bug has already been reported
2. Try to reproduce the issue with the latest version
3. Collect information about the bug (logs, screenshots, etc.)

When submitting a bug report, include:

- Clear title and description
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Docker version, etc.)
- Relevant logs or screenshots

### Suggesting Enhancements

Enhancement suggestions are welcome! Please provide:

- Clear use case
- Expected behavior
- Possible implementation approach
- Any relevant examples

### Pull Requests

1. Fork the repository
2. Create a branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`pytest`)
5. Commit with clear messages
6. Push to your fork
7. Submit a Pull Request

## Development Setup

### Prerequisites

- Docker 26+
- Docker Compose 2.20+
- Python 3.11+
- Node.js 20+

### Local Development

```bash
# Clone your fork
git clone https://github.com/your-username/Scannr.git
cd Scannr

# Copy environment file
cp .env.example .env

# Start services
docker-compose up -d

# Run tests
docker-compose exec api-gateway pytest
```

## Style Guidelines

### Python

- Follow PEP 8
- Use type hints
- Write docstrings
- Maximum line length: 88 characters (Black formatter)

### JavaScript/TypeScript

- Use ESLint configuration
- Follow Airbnb style guide
- Use async/await for asynchronous code
- Write JSDoc comments

### Git Commit Messages

- Use present tense ("Add feature" not "Added feature")
- Use imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit first line to 72 characters
- Reference issues and PRs where appropriate

Example:
```
Add JWT authentication middleware

- Implement JWT token validation
- Add role-based access control
- Update API gateway configuration

Fixes #123
```

## Testing

All contributions must include tests:

- Unit tests for new functions
- Integration tests for API endpoints
- Security tests for authentication/authorization

Run tests before submitting:
```bash
# Python services
pytest services/api-gateway/tests/
pytest services/vision-svc/tests/
pytest services/risk-svc/tests/

# Security tests
pytest tests/security/
```

## Documentation

- Update README.md if adding new features
- Document API changes in docs/api.yaml
- Add inline comments for complex logic
- Update CHANGELOG.md

## Review Process

1. All PRs require at least one review
2. All tests must pass
3. Code must follow style guidelines
4. Documentation must be updated

## Questions?

- Open an issue for questions
- Join our discussions

Thank you for contributing to SCANNR!
