# Docker Compose Setup for Baraba Microservices

This guide will help you set up and run the Baraba accounting system with all its microservices using Docker Compose.

## Prerequisites

- Docker
- Docker Compose

## Quick Start

1. **Start all services:**
   ```bash
   docker-compose up -d
   ```

2. **Initialize the database:**
   ```bash
   # Run migrations
   docker-compose exec baraba_service ./bin/migrate
   ```

3. **Check service status:**
   ```bash
   docker-compose ps
   ```

4. **View logs:**
   ```bash
   docker-compose logs -f
   ```

## Services

- **PostgreSQL** (Port 5432): The database
- **Scanner Service** (Port 5001): AI invoice scanning
- **Identity Service** (Port 5002): User authentication and management
- **VIES Service** (Port 5003): VAT number validation
- **VAT Service** (Port 5004): VAT file generation
- **Baraba Main Service** (Port 5000): The main application (API Gateway)
- **Frontend** (Port 5173): React frontend application

## Development

### Access Individual Services

- **Frontend Application**: http://localhost:5173
- **Main App API**: http://localhost:5000
- **Identity Service**: http://localhost:5002
- **Scanner Service**: http://localhost:5001
- **VIES Service**: http://localhost:5003
- **VAT Service**: http://localhost:5004

### Database Access

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d jesterac
```

### Stop Services

```bash
docker-compose down
```

### Rebuild Services

After making changes to the code:

```bash
# Rebuild and restart
docker-compose up --build -d

# Or rebuild just one service
docker-compose up --build -d scanner_service
```

## Environment Variables

The services use these environment variables:

- `DB_HOST`: PostgreSQL host
- `DB_PORT`: PostgreSQL port
- `DB_NAME`: Database name
- `DB_USER`: Database username
- `DB_PASSWORD`: Database password
- `SCANNER_SERVICE_URL`: Scanner service URL
- `IDENTITY_SERVICE_URL`: Identity service URL

## Testing

After starting all services:

1. Test health endpoints:
   ```bash
   curl http://localhost:5000/health
   curl http://localhost:5001/health
   curl http://localhost:5002/health
   ```

2. Test authentication:
   ```bash
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username": "admin", "password": "admin123"}'
   ```

3. Test user management:
   ```bash
   curl -X GET http://localhost:5000/api/users \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

4. Test VIES validation:
   ```bash
   curl http://localhost:5000/api/vies/validate/BG123456789
   ```

5. Test VAT generation:
   ```bash
   curl -X POST http://localhost:5000/api/vat/generate/202312 \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -d '{"companyId": 1}'
   ```

6. Access frontend:
   ```bash
   open http://localhost:5173
   ```
   Or visit in your browser: http://localhost:5173

## Troubleshooting

### Service Not Starting

Check logs for the specific service:
```bash
docker-compose logs scanner_service
docker-compose logs identity_service
docker-compose logs baraba_service
```

### Database Connection Issues

1. Verify PostgreSQL is running:
   ```bash
   docker-compose ps postgres
   ```

2. Check database connection:
   ```bash
   docker-compose exec postgres psql -U postgres -d jesterac -c "SELECT version();"
   ```

3. Verify network connectivity:
   ```bash
   docker-compose exec baraba_service ping postgres
   docker-compose exec baraba_service ping identity_service
   docker-compose exec baraba_service ping scanner_service
   ```

### Frontend Connection

The frontend should connect to the main service on port 5000. Make sure your frontend configuration points to `http://localhost:5000` for API calls.

## Production Considerations

- Change default passwords in docker-compose.yml
- Use proper secrets management
- Configure proper CORS for production domains
- Set up proper logging and monitoring
- Consider using HTTPS with reverse proxy (nginx)

## Next Steps

After the migration is complete, the system will have:

1. **Full separation of concerns**: Each microservice handles its specific domain
2. **Independent scaling**: Services can be scaled based on demand
3. **Isolation**: Issues in one service don't affect others
4. **Technology flexibility**: Services can use different technologies if needed