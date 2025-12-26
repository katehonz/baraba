# 🚀 Deployment Guide - Baraba Hybrid Architecture

Този документ описва deployment процеса за **Baraba accounting system** с хибридна архитектура от Elixir Phoenix, Nim микросървизи, Java Jasper Service и React frontend.

## 📦 Architecture Overview

### Service Components

```
🎯 Hybrid Stack:
├── Elixir Phoenix Core          (порт 4000, 5006)     - Основна бизнес логика
├── Identity Service (Nim)       (порт 5002)           - JWT Authentication
├── Scanner Service (Java)        (порт 5001)           - QR/Document scanning
├── VIES Service (Nim)           (порт 5003)           - EU VAT validation
├── VAT Service (Nim)             (порт 5004)           - Bulgarian VAT rules
├── Jasper Service (Java)        (порт 5005)           - PDF отчети
├── React Frontend               (порт 5173)           - Web интерфейс
└── PostgreSQL Database          (порт 5432)           - База данни
```

## 🔧 Prerequisites

### System Requirements

**Минимални:**
- CPU: 4 cores
- RAM: 8GB  
- Storage: 50GB SSD
- Network: 100Mbps

**Препоръчителни (Production):**
- CPU: 8 cores
- RAM: 16GB
- Storage: 200GB SSD
- Network: 1Gbps

### Software Dependencies

**Required:**
- Docker 20.10+
- Docker Compose 2.0+
- Git

**For development:**
- Elixir 1.15+
- OTP 26+
- Node.js 18+
- Nim 2.0+
- Java 17+

## 🏗️ Production Deployment

### 1. Environment Setup

```bash
# Clone repository
git clone <repository-url>
cd baraba-ub

# Create environment files
cp .env.example .env.production
cp docker-compose.yml docker-compose.prod.yml
```

### 2. Environment Configuration

**`.env.production`:**
```bash
# Database Configuration
DB_HOST=baraba_postgres
DB_PORT=5432
DB_NAME=jesterac_prod
DB_USER=baraba_user
DB_PASSWORD=your_secure_password

# Elixir Configuration
SECRET_KEY_BASE=$(mix phx.gen.secret)
MIX_ENV=prod
HOST=0.0.0.0
PORT=4000

 # Services Configuration
 IDENTITY_SERVICE_URL=http://identity_service:5002
 SCANNER_SERVICE_URL=http://scanner_service_java:5001
 VIES_SERVICE_URL=http://vies_service:5003
 VAT_SERVICE_URL=http://vat_service:5004
 JASPER_SERVICE_URL=http://jasper_service:5005

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# Frontend Configuration
REACT_APP_API_URL=https://your-domain.com/api
REACT_APP_WS_URL=wss://your-domain.com/live

# SSL Configuration
SSL_CERT_PATH=/etc/ssl/certs/baraba.crt
SSL_KEY_PATH=/etc/ssl/private/baraba.key

# Monitoring
SENTRY_DSN=your_sentry_dsn
LOG_LEVEL=info
```

### 3. Production Docker Compose

**`docker-compose.prod.yml`:**
```yaml
version: '3.8'

services:
  # Elixir Phoenix Core
  phoenix_app:
    build:
      context: ./baraba_ub
      dockerfile: Dockerfile
      target: production
    container_name: baraba_phoenix
    ports:
      - "4000:4000"
      - "5006:5006"
    environment:
      - MIX_ENV=prod
      - SECRET_KEY_BASE=${SECRET_KEY_BASE}
      - DB_HOST=${DB_HOST}
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=${DB_NAME}
    volumes:
      - ./ssl:/etc/ssl:ro
    depends_on:
      - postgres
    networks:
      - baraba_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Identity Service (Nim)
  identity_service:
    build:
      context: .
      dockerfile: identity_service/Dockerfile
    container_name: baraba_identity
    ports:
      - "5002:5002"
    environment:
      - DB_HOST=${DB_HOST}
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=${DB_NAME}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - postgres
    networks:
      - baraba_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5002/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Scanner Service (Java)
  scanner_service:
    build:
      context: ./scanner_service_java
      dockerfile: Dockerfile
    container_name: baraba_scanner
    ports:
      - "5001:5001"
    environment:
      - AZURE_OCR_KEY=${AZURE_OCR_KEY}
      - AZURE_OCR_ENDPOINT=${AZURE_OCR_ENDPOINT}
      - DB_HOST=${DB_HOST}
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
    depends_on:
      - postgres
    networks:
      - baraba_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # VIES Service (Nim)
  vies_service:
    build:
      context: .
      dockerfile: vies_service/Dockerfile
    container_name: baraba_vies
    ports:
      - "5003:5003"
    networks:
      - baraba_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5003/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # VAT Service (Nim)
  vat_service:
    build:
      context: .
      dockerfile: vat_service/Dockerfile
    container_name: baraba_vat
    ports:
      - "5004:5004"
    environment:
      - DB_HOST=${DB_HOST}
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=${DB_NAME}
    depends_on:
      - postgres
    networks:
      - baraba_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5004/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Jasper Service (Java)
  jasper_service:
    build:
      context: ./jasper_service
      dockerfile: Dockerfile
    container_name: baraba_jasper
    ports:
      - "5005:5005"
    environment:
      - SPRING_PROFILES_ACTIVE=production
      - DB_HOST=${DB_HOST}
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=${DB_NAME}
      - JAVA_OPTS=-Xmx2g -Xms1g
    depends_on:
      - postgres
    networks:
      - baraba_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5005/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # React Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: production
    container_name: baraba_frontend
    ports:
      - "80:80"
      - "443:443"
    environment:
      - REACT_APP_API_URL=https://your-domain.com/api
      - REACT_APP_WS_URL=wss://your-domain.com/live
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl:ro
    depends_on:
      - phoenix_app
      - identity_service
    networks:
      - baraba_network
    restart: unless-stopped

  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: baraba_postgres
    environment:
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    networks:
      - baraba_network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache (Optional)
  redis:
    image: redis:7-alpine
    container_name: baraba_redis
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - baraba_network
    restart: unless-stopped

  # Monitoring (Optional)
  prometheus:
    image: prom/prometheus:latest
    container_name: baraba_prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    networks:
      - baraba_network
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:

networks:
  baraba_network:
    driver: bridge
```

### 4. SSL Configuration

**Nginx Configuration (`nginx.conf`):**
```nginx
events {
    worker_connections 1024;
}

http {
    upstream phoenix_backend {
        server phoenix_app:4000;
    }

    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/ssl/baraba.crt;
        ssl_certificate_key /etc/ssl/baraba.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        location / {
            root /usr/share/nginx/html;
            index index.html;
            try_files $uri $uri/ /index.html;
        }

        location /api {
            proxy_pass http://phoenix_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /live {
            proxy_pass http://phoenix_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
    }
}
```

### 5. Deployment Commands

```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml up -d --build

# Check service status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Run database migrations
docker-compose -f docker-compose.prod.yml exec phoenix_app mix ecto.migrate

# Seed initial data
docker-compose -f docker-compose.prod.yml exec phoenix_app mix run priv/repo/seeds.exs
```

## 🔍 Health Monitoring

### Service Health Checks

```bash
# Individual service health
curl https://your-domain.com/api/health  # Elixir Phoenix
curl https://your-domain.com/api/system/health  # System overview

# Direct service health (internal)
curl http://localhost:5002/api/health  # Identity Service
curl http://localhost:5001/api/health  # Scanner Service
curl http://localhost:5003/api/health  # VIES Service
curl http://localhost:5004/api/health  # VAT Service
curl http://localhost:5005/api/health  # Jasper Service
```

### Monitoring Scripts

**`monitor.sh`:**
```bash
#!/bin/bash

# Service Health Monitor
SERVICES=(
    "phoenix_app:4000"
    "identity_service:5002"
    "scanner_service:5001"
    "vies_service:5003"
    "vat_service:5004"
    "jasper_service:5005"
)

for service in "${SERVICES[@]}"; do
    IFS=':' read -r name port <<< "$service"
    if curl -f "http://localhost:$port/api/health" > /dev/null 2>&1; then
        echo "✅ $name is healthy"
    else
        echo "❌ $name is unhealthy"
        # Send alert (email, Slack, etc.)
    fi
done
```

## 🔄 Backup & Recovery

### Database Backup

```bash
# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
docker-compose -f docker-compose.prod.yml exec postgres pg_dump \
    -U $DB_USER -d $DB_NAME > "$BACKUP_DIR/baraba_backup_$DATE.sql"

# Compress backup
gzip "$BACKUP_DIR/baraba_backup_$DATE.sql"

# Remove old backups (keep last 7 days)
find $BACKUP_DIR -name "baraba_backup_*.sql.gz" -mtime +7 -delete
```

### Recovery Process

```bash
# Restore from backup
docker-compose -f docker-compose.prod.yml exec -T postgres psql \
    -U $DB_USER -d $DB_NAME < backup_file.sql
```

## 🚀 Scaling Strategy

### Horizontal Scaling

```yaml
# Scale phoenix_app for load
services:
  phoenix_app:
    deploy:
      replicas: 3
  # Add load balancer
  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx_lb.conf:/etc/nginx/nginx.conf
    ports:
      - "80:80"
      - "443:443"
```

### Database Scaling

```bash
# Add read replicas for reporting
docker-compose -f docker-compose.prod.yml up -d postgres_replica
```

## 📊 Performance Optimization

### Resource Limits

```yaml
services:
  phoenix_app:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
```

### Caching Strategy

```elixir
# Elixir application cache
config :baraba_umbrella, BarabaUmbrella.Cache,
  backend: :redis,
  redis_url: "redis://redis:6379"
```

## 🔒 Security Best Practices

### Network Security

```bash
# Firewall rules
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw enable
```

### Security Headers

```nginx
# Nginx security headers
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
```

## 🐛 Troubleshooting

### Common Issues

**Service won't start:**
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs service_name

# Check resource usage
docker stats
```

**Database connection issues:**
```bash
# Test database connectivity
docker-compose -f docker-compose.prod.yml exec phoenix_app mix ecto.migrate
```

**High memory usage:**
```bash
# Check memory by service
docker stats --no-stream

# Optimize JVM for Jasper service
JAVA_OPTS="-Xmx1g -Xms512m -XX:+UseG1GC"
```

## 📋 Deployment Checklist

### Pre-deployment
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Database backups current
- [ ] Monitoring alerts configured
- [ ] Security scan completed

### Post-deployment
- [ ] All services healthy
- [ ] Database migrations applied
- [ ] SSL certificate valid
- [ ] Performance baseline recorded
- [ ] Backup schedule active

Този deployment подход осигурява надеждна, сигурна и мащабируема инфраструктура за хибридната Baraba система.