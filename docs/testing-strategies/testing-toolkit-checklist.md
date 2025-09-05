# Testing Toolkit Checklist for Java Microservices

## Quick Setup Checklist

### 1. Essential Dependencies ✅
- [ ] Spring Boot Test Starter
- [ ] Testcontainers (JUnit Jupiter + specific containers)
- [ ] Contract Testing Framework (Pact or Spring Cloud Contract)
- [ ] Service Virtualization (WireMock or Hoverfly)
- [ ] Performance Testing (Gatling or JMeter)
- [ ] Chaos Engineering (Chaos Monkey)
- [ ] Security Testing (OWASP ZAP Client API)
- [ ] Observability (OpenTelemetry + Jaeger)

### 2. Maven Configuration ✅
- [ ] Surefire plugin for unit tests
- [ ] Failsafe plugin for integration tests
- [ ] JaCoCo for coverage reporting
- [ ] Dedicated profiles for different test types
- [ ] OWASP Dependency Check plugin
- [ ] SpotBugs for static analysis

### 3. CI/CD Pipeline Setup ✅
- [ ] Unit tests run on every commit
- [ ] Integration tests run on PRs
- [ ] Contract tests publish to broker
- [ ] Performance tests run on main branch
- [ ] Security scans integrated
- [ ] Chaos tests run periodically

## Testing Strategy Implementation

### Phase 1: Foundation (Week 1-2)
```bash
# Setup Testcontainers
./mvnw dependency:add -Dartifact=org.testcontainers:junit-jupiter:1.19.3:test
./mvnw dependency:add -Dartifact=org.testcontainers:postgresql:1.19.3:test

# Add basic integration test
mkdir -p src/test/java/integration
# Create first integration test with database
```

### Phase 2: Contract Testing (Week 3-4)
```bash
# Add Pact dependencies
./mvnw dependency:add -Dartifact=au.com.dius.pact.consumer:junit5:4.6.4:test
./mvnw dependency:add -Dartifact=au.com.dius.pact.provider:junit5spring:4.6.4:test

# Setup Pact broker
export PACT_BROKER_URL=https://your-pact-broker.com
export PACT_BROKER_TOKEN=your-token
```

### Phase 3: Service Virtualization (Week 5-6)
```bash
# Add WireMock
./mvnw dependency:add -Dartifact=org.wiremock:wiremock-standalone:3.3.1:test

# Add Hoverfly (alternative)
./mvnw dependency:add -Dartifact=io.specto:hoverfly-java-junit5:0.16.0:test
```

### Phase 4: Advanced Testing (Week 7-8)
```bash
# Add Chaos Engineering
./mvnw dependency:add -Dartifact=de.codecentric:chaos-monkey-spring-boot:3.0.0

# Add Performance Testing
./mvnw dependency:add -Dartifact=io.gatling.highcharts:gatling-charts-highcharts:3.9.5:test

# Add Security Testing
./mvnw dependency:add -Dartifact=org.zaproxy:zap-clientapi:1.13.0:test
```

## Common Maven Commands

### Running Different Test Types
```bash
# Unit tests only
./mvnw test

# Integration tests
./mvnw verify -Pintegration-tests

# Contract tests
./mvnw test -Pcontract-tests

# Performance tests
./mvnw gatling:test -Pperformance-tests

# Chaos tests
./mvnw test -Pchaos-tests

# Security tests
./mvnw test -Psecurity-tests

# All tests
./mvnw verify -Pintegration-tests,contract-tests,performance-tests
```

### Coverage and Quality
```bash
# Generate coverage report
./mvnw jacoco:report

# Run static analysis
./mvnw spotbugs:check

# Check dependencies for vulnerabilities
./mvnw org.owasp:dependency-check-maven:check
```

## Configuration Templates

### application-test.yml
```yaml
spring:
  datasource:
    # Testcontainers will override these
    url: jdbc:postgresql://localhost:5432/testdb
    username: test
    password: test
  jpa:
    hibernate:
      ddl-auto: create-drop
    show-sql: true

chaos:
  monkey:
    enabled: ${chaos.monkey.enabled:false}
    watcher:
      controller: true
      restController: true
      service: true
    assaults:
      level: 3
      latencyActive: true

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  tracing:
    sampling:
      probability: 1.0
```

### Docker Compose for Testing
```yaml
# docker-compose.test.yml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: testdb
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - "5432:5432"
  
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"
      - "14250:14250"
  
  zap:
    image: owasp/zap2docker-stable
    ports:
      - "8080:8080"
    command: zap.sh -daemon -host 0.0.0.0 -port 8080
```

## Test Naming Conventions

### File Naming
- Unit Tests: `*Test.java`
- Integration Tests: `*IntegrationTest.java`
- Contract Tests: `*ContractTest.java` or `*PactTest.java`
- E2E Tests: `*E2ETest.java`
- Performance Tests: `*LoadTest.scala` (Gatling)
- Chaos Tests: `*ChaosTest.java`
- Security Tests: `*SecurityTest.java`

### Package Structure
```
src/test/java/
├── unit/                    # Unit tests
├── integration/             # Integration tests
├── contract/               # Contract tests
├── e2e/                    # End-to-end tests
├── performance/            # Performance test scenarios
├── chaos/                  # Chaos engineering tests
└── security/               # Security tests
```

## Environment Setup

### Local Development
```bash
# Start required services
docker-compose -f docker-compose.test.yml up -d

# Run all tests
./mvnw clean verify -Pall-tests

# Generate comprehensive report
./mvnw site
```

### CI/CD Environment Variables
```bash
# Pact Broker
PACT_BROKER_URL=https://your-pact-broker.com
PACT_BROKER_TOKEN=your-token

# Performance Testing
PERFORMANCE_TEST_DURATION=60s
PERFORMANCE_MAX_USERS=100

# Security Testing
ZAP_BASELINE_SCAN_ENABLED=true
SECURITY_SCAN_TARGET=http://localhost:8080

# Chaos Testing
CHAOS_MONKEY_ENABLED=false  # Only enable in specific environments
```

## Monitoring and Observability

### Key Metrics to Track
- Test execution time
- Test coverage percentage
- Number of contract violations
- Performance benchmarks
- Security vulnerability count
- Chaos experiment results

### Dashboards and Reports
```bash
# Generate test reports
./mvnw surefire-report:report
./mvnw jacoco:report
./mvnw site

# View reports
open target/site/index.html
open target/site/jacoco/index.html
```

## Troubleshooting Guide

### Common Issues and Solutions

#### Testcontainers Issues
```bash
# Docker daemon not running
docker info

# Port conflicts
docker ps
netstat -tlnp | grep :5432

# Container startup timeout
# Increase timeout in test configuration
```

#### Contract Test Failures
```bash
# Check Pact broker connectivity
curl -H "Authorization: Bearer $PACT_BROKER_TOKEN" $PACT_BROKER_URL

# Verify contract compatibility
./mvnw pact:verify
```

#### Performance Test Issues
```bash
# Check system resources
top
free -h

# Review Gatling logs
tail -f target/gatling/*/simulation.log
```

### Best Practices Checklist
- [ ] Tests are deterministic and repeatable
- [ ] Test data is isolated between tests
- [ ] External dependencies are properly mocked/virtualized
- [ ] Performance tests have realistic load patterns
- [ ] Security tests cover OWASP Top 10
- [ ] Chaos tests gradually increase complexity
- [ ] All tests include proper assertions and error handling
- [ ] Test execution time is optimized
- [ ] Test reports are accessible and actionable

## Quick Start Command
```bash
# Clone example and run all test types
git clone https://github.com/example/microservice-testing-example
cd microservice-testing-example
./mvnw clean verify -Pall-tests
```