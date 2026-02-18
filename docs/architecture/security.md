# VAPT Certification Guide

## Overview

This document outlines the Vulnerability Assessment and Penetration Testing (VAPT) certification requirements for SCANNR deployment in production.

## Scope

### In-Scope Assets
- API Gateway (api.scannr.in)
- Dashboard (dashboard.scannr.in)
- All 7 microservices
- Kubernetes infrastructure
- Database systems
- Blockchain network
- External integrations (ICEGATE, GSTN, MHA)

## OWASP Top 10 Compliance

### 1. Broken Access Control ✅
**Mitigations Implemented:**
- JWT-based authentication with expiration
- Role-based access control (RBAC)
- API endpoint authorization
- Session management

**Validation:**
```bash
# Test unauthorized access
curl -X POST http://api.scannr.in/clearance/initiate \
  -H "Content-Type: application/json" \
  -d '{"container_id":"test"}'
# Expected: 401 Unauthorized
```

### 2. Cryptographic Failures ✅
**Mitigations Implemented:**
- AES-256 encryption at rest
- TLS 1.3 for data in transit
- SHA-256 for audit hashes
- Secure key management

**Validation:**
```bash
# Verify TLS version
openssl s_client -connect api.scannr.in:443 -tls1_3

# Check cipher suites
nmap --script ssl-enum-ciphers -p 443 api.scannr.in
```

### 3. Injection ✅
**Mitigations Implemented:**
- Parameterized queries (asyncpg)
- Input validation
- ORM usage
- SQL injection prevention

**Validation:**
```bash
# SQL injection test
curl -X POST http://api.scannr.in/clearance/initiate \
  -H "Authorization: Bearer token" \
  -d '{"container_id":"test\' OR \'1\'=\'1"}'
# Expected: Input validation error
```

### 4. Insecure Design ✅
**Mitigations Implemented:**
- Defense in depth architecture
- Rate limiting (Kong)
- Circuit breakers
- Fail-secure defaults

### 5. Security Misconfiguration ✅
**Mitigations Implemented:**
- Secure headers
- Minimal service exposure
- Secrets management (K8s secrets)
- Regular security updates

**Validation:**
```bash
# Check security headers
curl -I https://api.scannr.in | grep -E "(X-Frame-Options|X-Content-Type-Options|X-XSS-Protection|Strict-Transport-Security)"
```

### 6. Vulnerable Components ✅
**Mitigations Implemented:**
- Dependency scanning (Snyk)
- Regular updates
- SBOM generation
- License compliance

### 7. Authentication Failures ✅
**Mitigations Implemented:**
- Strong password policies
- Multi-factor authentication (MFA)
- Account lockout
- Secure session management

### 8. Data Integrity Failures ✅
**Mitigations Implemented:**
- Blockchain immutability
- Digital signatures
- Audit trails
- SHA-256 checksums

### 9. Logging Failures ✅
**Mitigations Implemented:**
- Comprehensive audit logging
- Log integrity protection
- Centralized logging (ELK stack)
- Real-time alerting

### 10. Server-Side Request Forgery ✅
**Mitigations Implemented:**
- URL validation
- Allowlist for external APIs
- Network segmentation
- Request signing

## Penetration Testing Checklist

### Network Security
- [ ] Port scanning
- [ ] Service enumeration
- [ ] SSL/TLS configuration
- [ ] Certificate validation
- [ ] Network segmentation verification

### Application Security
- [ ] Authentication bypass
- [ ] Session management
- [ ] Authorization testing
- [ ] Input validation
- [ ] Business logic flaws
- [ ] API security

### Infrastructure Security
- [ ] Kubernetes security
- [ ] Container security
- [ ] Secrets management
- [ ] RBAC verification
- [ ] Network policies

### Blockchain Security
- [ ] Chaincode vulnerabilities
- [ ] Consensus mechanism
- [ ] Node security
- [ ] Private channel isolation

## Testing Tools

### Automated Scanning
```bash
# OWASP ZAP
docker run -t owasp/zap2docker-stable zap-baseline.py -t https://api.scannr.in

# Nikto
nikto -h https://api.scannr.in

# SQLMap
sqlmap -u "https://api.scannr.in/clearance/initiate" --data="container_id=test"

# Nuclei
nuclei -u https://api.scannr.in
```

### Manual Testing
```bash
# Burp Suite configuration
# OWASP Testing Guide procedures
# Custom test cases
```

## Compliance Standards

### CERT-In Guidelines
- [ ] Information Security Policy
- [ ] Incident Response Plan
- [ ] Business Continuity Plan
- [ ] Data Protection Measures

### ISO 27001
- [ ] Risk Assessment
- [ ] Security Controls
- [ ] Audit Trails
- [ ] Compliance Monitoring

### IT Act 2000 (India)
- [ ] Section 43A - Data Protection
- [ ] Section 66 - Cybersecurity
- [ ] Section 72 - Privacy

## Certification Process

### Phase 1: Self-Assessment (2 weeks)
1. Run automated scanners
2. Review findings
3. Fix critical vulnerabilities
4. Document mitigations

### Phase 2: Internal Audit (1 week)
1. Internal security team review
2. Penetration testing
3. Compliance verification
4. Remediation

### Phase 3: External Audit (2 weeks)
1. CERT-empaneled auditor selection
2. External penetration testing
3. Vulnerability assessment
4. Report generation

### Phase 4: Certification (1 week)
1. Final review
2. Certificate issuance
3. Compliance maintenance plan

## Security Metrics

### Key Performance Indicators
- Mean Time to Detect (MTTD): < 5 minutes
- Mean Time to Respond (MTTR): < 1 hour
- Vulnerability remediation: < 7 days (critical)
- False positive rate: < 5%

### Monitoring
- SIEM integration
- Real-time alerting
- Threat intelligence
- Incident response

## Incident Response

### Severity Levels
1. **Critical**: Data breach, system compromise
2. **High**: Unauthorized access, data leak
3. **Medium**: Policy violation, misconfiguration
4. **Low**: Minor issue, informational

### Response Procedures
1. Detection and reporting
2. Containment
3. Eradication
4. Recovery
5. Lessons learned

## Documentation Requirements

### For Certification
- [ ] Security architecture diagram
- [ ] Data flow diagrams
- [ ] Network topology
- [ ] Asset inventory
- [ ] Risk assessment report
- [ ] Penetration test report
- [ ] Vulnerability assessment
- [ ] Incident response plan
- [ ] Business continuity plan
- [ ] Disaster recovery plan

## Contact Information

### Security Team
- Security Officer: security@scannr.in
- Incident Response: incident@scannr.in
- Compliance: compliance@scannr.in

### External Auditors
- CERT-In Empaneled: [To be selected]
- ISO 27001: [To be selected]

## Approval

This VAPT certification guide is approved for implementation:

- **Prepared by**: Security Team
- **Reviewed by**: CTO
- **Approved by**: CISO
- **Date**: February 2026
- **Version**: 1.0
