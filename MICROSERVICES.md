# Baraba - Microservices Architecture Documentation

## Overview

Baraba е **счетоводна програма**, която беше успешно мигрирана от монолитна архитектура към **микросървисна архитектура**. Този документ описва текущата структура, архитектурни решения и инструкции за работа със системата.

## Architecture Summary

### 🏗️ Current Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   Frontend     │    │    PostgreSQL   │
│   (React)      │    │     Database    │
│   Port: 5173   │    │    Port: 5432  │
└───────┬─────────┘    └─────────────────┘
        │                       │
        │ HTTP/REST             │
        ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │◄───►│   Shared Models │
│  (Monolith)    │    │  (baraba_shared)│
│   Port: 5000   │    │                 │
└───────┬─────────┘    └─────────────────┘
        │
        ├───────────────────────────────────────────┐
        │                                   │
        ▼                                   ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Identity Svc   │    │ Scanner Svc     │    │ VIES Svc        │
│ (Auth/Users)   │    │ (AI Scanning)  │    │ (VAT Validation)│
│   Port: 5002   │    │   Port: 5001   │    │   Port: 5003   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                             │
                                             ▼
                                   ┌─────────────────┐
                                   │ VAT Svc         │
                                   │ (VAT Generation)│
                                   │   Port: 5004   │
                                   └─────────────────┘
```

### 📋 Service Matrix

| Service | Port | Responsibility | Database Access |
|---------|-------|----------------|-----------------|
| **Frontend** | 5173 | React UI, User Interface | None (via API) |
| **API Gateway** | 5000 | Request routing, Core business logic | Direct PostgreSQL |
| **Identity Service** | 5002 | Authentication, User management | Direct PostgreSQL |
| **Scanner Service** | 5001 | AI invoice scanning | None (mock data) |
| **VIES Service** | 5003 | VAT number validation (EU VIES) | Direct PostgreSQL |
| **VAT Service** | 5004 | VAT file generation for NRA | Direct PostgreSQL |
| **PostgreSQL** | 5432 | Data persistence | N/A |

## 🚀 Getting Started

### Prerequisites

- **Docker** & **Docker Compose**
- **Git** for cloning
- **Modern web browser** (for frontend)

### Quick Start

1. **Clone repository:**
   ```bash
   git clone <repository-url>
   cd baraba
   ```

2. **Start all services:**
   ```bash
   docker-compose up -d
   ```

3. **Initialize database:**
   ```bash
   docker-compose exec baraba_service ./bin/migrate
   ```

4. **Access application:**
   - **Frontend**: http://localhost:5173
   - **API Gateway**: http://localhost:5000
   - **Health checks**: http://localhost:5001/health, http://localhost:5002/health, etc.

### Default Credentials

- **Username**: `admin`
- **Password**: `admin123`

## 📁 Project Structure

```
baraba/
├── 📄 docker-compose.yml          # Multi-service orchestration
├── 📄 README.md                   # Main project documentation
├── 📄 DOCKER.md                   # Docker-specific documentation
├── 📄 FRONTEND_IMPACT.md         # Frontend migration analysis
├── 📄 doklad.md                   # Migration report (Bulgarian)
│
├── 📁 frontend/                   # React frontend application
│   ├── 📄 Dockerfile
│   ├── 📄 nginx.conf
│   ├── 📄 vite.config.ts
│   └── 📁 src/
│
├── 📁 src/                       # API Gateway (monolith)
│   ├── 📄 baraba.nim              # Main entry point
│   ├── 📁 models/                # Shared business models
│   ├── 📁 routes/                # API route handlers
│   └── 📁 services/              # Business logic
│
├── 📁 baraba_shared/             # Shared library
│   ├── 📁 src/
│   │   └── 📁 baraba_shared/
│   │       ├── 📁 models/        # Shared models (User, Company, etc.)
│   │       ├── 📁 db/           # Database configuration
│   │       └── 📁 utils/        # Shared utilities
│
├── 📁 identity_service/           # Authentication microservice
│   ├── 📄 Dockerfile
│   ├── 📄 identity_service.nimble
│   └── 📁 src/
│
├── 📁 scanner_service/           # AI scanning microservice
│   ├── 📄 Dockerfile
│   ├── 📄 scanner_service.nimble
│   └── 📁 src/
│
├── 📁 vies_service/             # VAT validation microservice
│   ├── 📄 Dockerfile
│   ├── 📄 vies_service.nimble
│   └── 📁 src/
│
└── 📁 vat_service/              # VAT generation microservice
    ├── 📄 Dockerfile
    ├── 📄 vat_service.nimble
    └── 📁 src/
```

## 🔧 Development Workflow

### Local Development

1. **Start databases:**
   ```bash
   docker-compose up -d postgres
   ```

2. **Start individual services:**
   ```bash
   # Terminal 1
   cd scanner_service && nimble build -y && ./scanner_service
   
   # Terminal 2  
   cd identity_service && nimble build -y && ./identity_service
   
   # Terminal 3
   cd vies_service && nimble build -y && ./vies_service
   
   # Terminal 4
   cd vat_service && nimble build -y && ./vat_service
   
   # Terminal 5
   cd .. && nimble build -y && ./baraba
   
   # Terminal 6
   cd frontend && npm run dev
   ```

### Service-Specific Development

Each microservice can be developed independently:

```bash
cd identity_service
nimble build -y
./identity_service

# Test health endpoint
curl http://localhost:5002/health
```

### Building Individual Services

```bash
# Build specific service
docker-compose up --build identity_service

# Rebuild without cache
docker-compose build --no-cache identity_service
```

## 🌐 API Documentation

### Gateway Pattern

All frontend requests go through the **API Gateway** (port 5000), which routes them to appropriate microservices:

```
Frontend → API Gateway (5000) → Microservice

/api/auth/*     → Identity Service (5002)
/api/users/*     → Identity Service (5002)  
/api/vies/*      → VIES Service (5003)
/api/vat/*       → VAT Service (5004)
/api/scan*       → Scanner Service (5001)
/api/*           → Gateway (port 5000)
```

### Service Endpoints

#### Identity Service (Port 5002)
- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration  
- `GET /api/auth/me` - Current user info
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user
- `GET /health` - Health check

#### Scanner Service (Port 5001)
- `POST /scan` - Scan invoice (mock AI)
- `GET /health` - Health check

#### VIES Service (Port 5003)
- `GET /api/vies/validate/{vatNumber}` - Validate VAT number
- `GET /health` - Health check

#### VAT Service (Port 5004)
- `POST /api/vat/generate/{period}` - Generate VAT files
- `GET /health` - Health check

#### API Gateway (Port 5000)
- All endpoints from other services (proxied)
- Core business logic endpoints
- `GET /health` - Health check

## 🐳 Docker Containerization

### Image Strategy

Each service uses **multi-stage builds**:

1. **Builder Stage**: Nim compilation with Alpine Linux
2. **Runtime Stage**: Minimal Alpine image with only the binary
3. **Security**: Non-root users, minimal attack surface

### Container Architecture

```yaml
# Services use consistent patterns:
services:
  service_name:
    build:
      context: ./service_path
      dockerfile: Dockerfile
    ports:
      - "external:internal"
    networks:
      - baraba_network
    environment:
      - DB_HOST=postgres
      # ... other env vars
```

### Production Considerations

- **Resource Limits**: Set CPU/memory constraints
- **Health Checks**: Implement proper health checks
- **Restart Policies**: Handle failures gracefully
- **Logging**: Centralized log aggregation
- **Monitoring**: Prometheus/Grafana setup

## 🔄 Migration Journey

### Pre-Migration (Monolith)
- Single application (`baraba.nim`)
- Direct database access
- All functionality in one codebase

### Migration Steps Completed

1. **✅ Step 1**: Created shared library (`baraba_shared`)
2. **✅ Step 2**: Extracted Scanner Service (AI functionality)
3. **✅ Step 3**: Extracted Identity Service (authentication + user management)
4. **✅ Step 4**: Extracted VIES Service (VAT validation)
5. **✅ Step 4**: Extracted VAT Service (VAT file generation)
6. **✅ Step 5**: Implemented API Gateway pattern
7. **✅ Step 5**: Containerized all services
8. **✅ Step 5**: Frontend integration completed

### Migration Benefits

#### 🚀 Performance
- **Parallel Processing**: Services can run independently
- **Scalability**: Each service scales based on load
- **Resource Optimization**: Smaller, focused applications

#### 🔧 Development
- **Team Autonomy**: Independent development cycles
- **Technology Flexibility**: Different stacks per service
- **Faster Deployment**: Smaller codebases, quicker builds

#### 🛡️ Operations  
- **Fault Isolation**: Service failure doesn't crash entire system
- **Security**: Smaller attack surfaces, focused security
- **Maintenance**: Easier debugging, targeted updates

## 🎯 Next Steps

### Immediate (Post-Migration)

1. **Monitoring Setup**
   - Prometheus for metrics collection
   - Grafana for visualization
   - Alerting for failures

2. **Logging Infrastructure**
   - Centralized logging (ELK stack)
   - Structured logging
   - Log correlation across services

3. **Load Balancing**
   - nginx reverse proxy
   - SSL termination
   - Request routing optimization

### Future Enhancements

1. **Database Per Service**
   - Each service with own database
   - Service-to-service API communication
   - Data consistency patterns

2. **Service Discovery**
   - Dynamic service registration
   - Health checking
   - Automatic failover

3. **Advanced Security**
   - OAuth2/OpenID Connect
   - API rate limiting
   - Request authentication between services

## 🚨 Troubleshooting

### Common Issues

#### Service Won't Start
```bash
# Check logs
docker-compose logs service_name

# Check container status  
docker-compose ps

# Check port conflicts
netstat -tulpn | grep :5000
```

#### Database Connection Issues
```bash
# Test database connectivity
docker-compose exec postgres psql -U postgres -d jesterac

# Check network connectivity
docker-compose exec baraba_service ping postgres
```

#### Frontend Connection Issues
```bash
# Check proxy configuration
curl http://localhost:5000/health

# Check frontend build
docker-compose logs frontend
```

### Health Check Monitoring

```bash
# Monitor all services
for port in 5001 5002 5003 5004 5000; do
  echo "Port $port: $(curl -s http://localhost:$port/health || echo 'DOWN')"
done
```

## 📊 Performance Metrics

### Service Response Times (Expected)
- Identity Service: 50-100ms
- Scanner Service: 100-200ms (mock)
- VIES Service: 500-2000ms (EU VIES API)
- VAT Service: 200-500ms (complex calculations)
- API Gateway: 10-50ms (routing overhead)

### Resource Utilization
- **Memory per service**: 50-100MB (except VAT: 100-200MB)
- **CPU usage**: Low during normal operation
- **Network**: Service-to-service communication minimal

## 🔒 Security Considerations

### Current Security Measures
- **JWT Authentication**: For API access
- **CORS Headers**: Frontend integration
- **Non-root Containers**: Reduced attack surface
- **Environment Variables**: Sensitive data protection

### Future Security Enhancements
- **OAuth2 Integration**: External authentication
- **API Rate Limiting**: Abuse prevention
- **Service Mesh**: Inter-service security
- **Secret Management**: HashiCorp Vault or similar

## 📈 Scaling Strategy

### Horizontal Scaling
```yaml
# Docker Compose scaling example
services:
  identity_service:
    deploy:
      replicas: 3
  baraba_service:
    deploy:
      replicas: 2
```

### Load Balancer Configuration
```nginx
upstream api_gateway {
    server baraba_service:5000;
}

server {
    listen 80;
    location /api/ {
        proxy_pass http://api_gateway;
    }
}
```

## 🏁 Conclusion

Baraba успешно трансформира от монолитна към микросървисна архитектура с минимално въздействие върху frontend-а и запазване на всички функционалности. Системата е:

- **🚀 Scalable**: Всеки микросървис може да се мащабира независимо
- **🛡️ Resilient**: Отказ в един микросървис не срива системата  
- **🔧 Maintainable**: По-малки, фокусирани кодbase-и
- **🔄 Future-Ready**: Подготвена за следващи архитектурни подобрения

Миграцията е успешна и системата е готова за продуктивна употреба с всички предимства на микросървисната архитектура.