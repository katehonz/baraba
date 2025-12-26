# AGENTS.md - Baraba Hybrid Architecture Project Guide

This document provides essential information for working with the Baraba accounting system, a **hybrid architecture application** combining Elixir Phoenix core, Nim microservices, and Java Jasper service with React frontend.

## Project Overview

This is a **hybrid technology stack** optimized for performance and maintainability:
- **Elixir Phoenix Core** (`baraba_ub/`): Core accounting business logic with Ecto schemas and SAF-T XML
- **Nim Microservices** (identity, VAT validation): Specialized services for authentication and VAT rules
- **Java Microservices** (scanner, Jasper): Enterprise-grade document scanning and PDF report generation
- **React Frontend** (`frontend/`): TypeScript/React application with Chakra UI consuming multiple APIs

## Architecture Status ✅

The system utilizes a **hybrid architecture** that combines the best of three technology stacks:

### ✅ Core Components (Elixir Phoenix)
- **Core Business Entities**: Company, Account, Counterpart, JournalEntry, EntryLine, VatRate, User
- **Database Schema**: Full PostgreSQL migrations with proper constraints and indexes
- **Phoenix Contexts**: Complete business logic with an Accounting context
- **REST API**: Full CRUD operations for all entities with validation
- **SAFT Service**: Complete XML generation for Bulgarian tax authority compliance
- **Frontend Integration**: React dashboard with API client and TypeScript types

### ✅ Specialized Nim Microservices (Kept for Performance)
- **identity_service** (порт 5002): JWT authentication, user management, and role-based permissions
- **vies_service** (порт 5003): EU VAT number validation (VIES integration)
- **vat_service** (порт 5004): Bulgarian VAT rules and calculations

### ✅ Enterprise Java Services
- **scanner_service_java** (порт 5001): QR code and document scanning with Azure OCR
- **jasper_service** (порт 5005): Professional PDF report generation with Jasper Reports

### ✅ Key Features
- Double-entry bookkeeping with balance validation
- Bulgarian VAT compliance and reporting
- Counterpart management with VAT validation
- SAF-T (Standard Audit File) monthly/annual reports
- Multi-tenant architecture with company scoping
- Full audit trails and posting workflows
- Enterprise-grade PDF reporting
- Fast native performance for specialized tasks
- **JWT-based authentication with role-based permissions**

## Architecture

### Hybrid Architecture Structure
```
baraba_ub/                         # Main directory
├── apps/                         # Elixir Phoenix umbrella
│   ├── baraba_umbrella/         # Core domain logic and Ecto schemas
│   ├── baraba_umbrella_web/    # Phoenix REST API and JSON views
│   └── saft/                   # SAF-T XML generation service
├── identity_service/             # Nim JWT authentication (5002)
├── scanner_service/              # Nim QR/document scanning (5001)
├── vies_service/                 # Nim EU VAT validation (5003)
├── vat_service/                  # Nim Bulgarian VAT rules (5004)
├── jasper_service/              # Java PDF reports (5005)
├── frontend/                     # React + TypeScript + Chakra UI (5173)
├── docker-compose.yml            # Core services
├── docker-compose.nim.yml       # Nim microservices
└── docs/                        # Updated documentation
```

### API Endpoints

**Elixir Phoenix Core (Port 4000, 5006):**
- **Companies**: `/api/companies`
- **Accounts**: `/api/companies/{id}/accounts`
- **Counterparts**: `/api/companies/{id}/counterparts`
- **Journal Entries**: `/api/companies/{id}/journal-entries`
- **VAT Rates**: `/api/companies/{id}/vat-rates`
- **System Health**: `/api/system/health`

**Nim Microservices:**
- **Identity Service** (5002): `/api/auth/*`, `/api/users/*`, `/api/user-groups/*`
- **Scanner Service** (5001): `/api/scan/*`
- **VIES Service** (5003): `/api/vat/validate/*`
- **VAT Service** (5004): `/api/vat/calculate/*`

**Java Jasper Service (5005):**
- **Reports**: `/api/reports/*`

### Database
- **PostgreSQL**: Single database with proper multi-tenancy
- **Schema**: Migrated from Nim ORM to Ecto with full validation
- **Relationships**: Maintained all foreign key relationships and constraints
- **User Authentication**: Nim users table (`nim_users`) with JWT tokens and role-based access control

## Essential Commands

### Docker & Development
```bash
# Start all services with Docker Compose
docker-compose up

# Start services in detached mode
docker-compose up -d

# Stop all services
docker-compose down

# View logs for specific service
docker-compose logs phoenix_app
docker-compose logs saft_service
docker-compose logs jasper_service
docker-compose logs frontend
```

### Elixir/Phoenix Development (from baraba_umbrella/)
```bash
# Install dependencies for all apps
mix deps.get

# Run database migrations
mix ecto.migrate

# Start Phoenix server (from umbrella root)
mix phx.server

# Run tests
mix test

# Format code
mix format

# Run setup in all child apps
mix setup
```

### SAFT Service Development (from apps/saft/)
```bash
# The SAFT service is integrated into the umbrella app
# It runs on port 5006 with Plug/Cowboy
# No separate commands needed
```

### Frontend Development (from frontend/)
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Preview production build
npm run preview
```

### Jasper Service Development (from jasper_service/)
```bash
# Build and run with Maven
mvn spring-boot:run

# Package the application
mvn package

# Run tests
mvn test

# Clean and build
mvn clean install
```

### Identity Service Development (from identity_service/)
```bash
# Build the Nim service
nimble build

# Run the service
./identity_service

# Run tests (if available)
nimble test
```

## Code Organization

### Hybrid Technology Structure
- **Elixir Phoenix Core**: `baraba_ub/` contains the main accounting application
- **Nim Microservices**: Individual directories for specialized services
- **Java Jasper Service**: Separate Spring Boot application for PDF generation
- **React Frontend**: Modern TypeScript/React application

### Elixir/Phoenix Structure
- **Umbrella Application**: `baraba_ub/apps/` contains the core Elixir application
- **Core Domain**: `apps/baraba_umbrella/` contains business entities and logic
- **Web Layer**: `apps/baraba_umbrella_web/` contains Phoenix controllers, views, and endpoints
- **SAFT Service**: `apps/saft/` contains specialized SAF-T XML processing logic

### Frontend Structure
- **Source**: `frontend/src/` contains TypeScript/React components
- **API Client**: `frontend/src/api/client.ts` contains API integration
- **Types**: `frontend/src/types/index.ts` contains TypeScript interfaces
- **Entry Points**: `src/main.tsx` and `src/App.tsx`
- **Configuration**: `vite.config.ts` with proxy configuration for API calls
- **UI Framework**: Chakra UI with React Icons

### Jasper Service Structure
- **Java Source**: `jasper_service/src/main/java/com/baraba/`
- **Configuration**: `application.yml` with database and service settings
- **Reports**: `jasper_service/reports/` contains Jasper report templates
- **Templates**: `jasper_service/src/main/resources/templates/`

### Identity Service Structure
- **Nim Source**: `identity_service/src/identity_service.nim` - Main service with Jester routes
- **Models**: `baraba_shared/src/baraba_shared/models/user.nim` - User and UserGroup models
- **Auth Service**: `identity_service/src/services/auth.nim` - JWT token generation and verification
- **Configuration**: `identity_service/config.nims` - Database and service configuration
- **Database Tables**: `nim_users` and `user_groups` with role-based permissions

## Authentication & Permission System

### User Groups and Permissions
The system uses a role-based access control (RBAC) with 6 core permissions:

#### Permission Types
- **`can_create_companies`**: Create new companies in the system
- **`can_edit_companies`**: Edit existing company information
- **`can_delete_companies`**: Delete companies from the system
- **`can_manage_users`**: Manage users and user groups
- **`can_view_reports`**: Access financial reports and analytics
- **`can_post_entries`**: Create and post accounting journal entries

#### Default User Groups
1. **Super Admin** (ID: 1): Full access to all permissions
2. **Accountant**: Can manage accounting entries and reports, but cannot manage users
3. **Viewer**: Read-only access to reports and data

### API Endpoints for Authentication

#### Authentication Routes
```bash
# Login with username/password
POST /api/auth/login
{
  "username": "superadmin",
  "password": "password"
}

# Register new user
POST /api/auth/register
{
  "username": "newuser",
  "email": "user@example.com", 
  "password": "password123",
  "groupId": 2
}

# Verify JWT token and get permissions
GET /api/auth/verify
Headers: Authorization: Bearer <token>

# Get current user info with permissions
GET /api/auth/me
Headers: Authorization: Bearer <token>

# Check specific permission
POST /api/auth/check-permission
{
  "permission": "canPostEntries"
}
```

#### User Management Routes
```bash
# Get all users
GET /api/users

# Create new user
POST /api/users

# Update user
PUT /api/users/{id}

# Reset user password
POST /api/users/{id}/reset-password

# Get all user groups
GET /api/user-groups
```

### Why Nim for Identity Service?
The choice of Nim for the identity service provides several advantages:

#### Performance Benefits
- **Native Performance**: Compiled to C, providing superior speed for authentication operations
- **Low Memory Footprint**: Minimal resource usage compared to interpreted languages
- **Fast JWT Operations**: Optimized cryptographic operations for token generation/verification

#### Security Advantages
- **Memory Safety**: Nim's garbage collection and memory management prevent common vulnerabilities
- **Type Safety**: Strong typing prevents many classes of bugs
- **No Runtime Overhead**: Direct compilation to efficient machine code

#### Development Benefits
- **Simple Deployment**: Single binary executable
- **Cross-Platform**: Easy compilation for different operating systems
- **Minimal Dependencies**: Lightweight with fast startup times
- **Excellent JSON Support**: Built-in JSON handling for API responses

### Integration with Phoenix
- **CORS Headers**: Full CORS support for frontend integration
- **Shared Database**: Uses the same PostgreSQL database as Phoenix
- **JWT Standard**: Compatible with modern web authentication patterns
- **Permission Checking**: Phoenix can verify permissions via API calls

## Configuration

### Database
- PostgreSQL is the primary database
- Database name: `jesterac`
- Default credentials: `postgres/pas+123` (change for production)
- Configuration in `config/config.exs` and docker-compose.yml

### Service URLs
- Phoenix App: `http://localhost:4000`
- Frontend: `http://localhost:5173`
- SAFT Service: `http://localhost:5006`
- Jasper Service: `http://localhost:5005`
- Identity Service: `http://localhost:5002`

### Environment Variables
The following environment variables are used by the services:
- `DB_HOST`: Database host (default: localhost)
- `DB_PORT`: Database port (default: 5432)
- `DB_NAME`: Database name (default: jesterac)
- `DB_USER`: Database user (default: postgres)
- `DB_PASSWORD`: Database password (default: pas+123)
- `JASPER_SERVICE_URL`: URL for Jasper service (default: http://jasper_service:5005)

## Development Workflow

1. **Backend Development**: Make changes to Phoenix app, then restart Phoenix server or reload in IEx console
2. **Frontend Development**: Vite's hot reload automatically applies changes
3. **SAFT Service**: Integrated into umbrella, no separate restart needed
4. **Jasper Service**: Requires restart after Java code changes

## Testing

### Elixir Tests
```bash
# Run all tests
mix test

# Run specific test file
mix test apps/baraba_umbrella_web/test/specific_test.exs

# Test with coverage
mix test --cover
```

### Frontend Tests
No frontend test framework is currently configured (could add Jest/React Testing Library)

### SAFT Service Tests
The SAFT service can be tested via API endpoints:
```bash
# Test health check
curl http://localhost:5006/health

# Generate SAFT XML
curl -X POST http://localhost:5006/api/saft/monthly \
  -H "Content-Type: application/json" \
  -d '{"company_id": "company-id", "year": 2023, "month": 12}'
```

### Java Tests
```bash
# Run Maven tests
mvn test

# Run with coverage
mvn clean verify jacoco:report
```

## Code Style and Patterns

### Elixir
- Follow standard Elixir conventions
- Use `mix format` for code formatting
- Tests use ExUnit with SQL Sandbox for database tests

### TypeScript/React
- Uses Chakra UI for components
- TypeScript for type safety
- Vite for bundling and development server
- API client pattern for backend communication

### Java
- Spring Boot conventions
- Maven for dependency management
- Standard Java naming conventions

## Gotchas and Important Notes

1. **Docker Environment**: When running in Docker, services communicate via container names (e.g., `jasper_service:5005`)
2. **Database Setup**: First-time setup requires running `mix ecto.setup` to create and migrate the database
3. **Hot Reloading**: Phoenix supports hot reloading with `mix phx.server`, but some changes require full restart
4. **Frontend Proxy**: Vite is configured to proxy `/api` requests to the Phoenix backend
5. **Jasper Reports**: Report templates should be placed in `jasper_service/reports/` directory
6. **SAFT Service**: Now integrated into umbrella, runs on port 5006, provides XML generation for Bulgarian tax authorities
7. **Port Conflicts**: Ensure ports 4000, 5173, 5002, 5005, and 5006 are available before starting services
8. **Identity Service**: Uses `username` for login (not email) - `nim_users` table is separate from Phoenix users

## Migration Notes

The project has been **successfully migrated** from a polyglot microservices architecture to a consolidated Elixir Phoenix umbrella application. The migration preserved all business logic while simplifying the development and deployment workflow.

### Benefits of Migration
- **Unified Stack**: Single Elixir ecosystem for easier development
- **Reduced Complexity**: Fewer services to manage
- **Better Tooling**: Access to Elixir's excellent debugging and tooling
- **Maintained Functionality**: All business features preserved
- **Improved Performance**: Eliminated inter-service network overhead

### Preserved Services
- **Jasper Service**: Kept as separate Java service due to its specialized nature
- **Database Schema**: Completely preserved with all constraints and relationships
- **Business Logic**: All accounting and Bulgarian tax compliance rules maintained

## Production Deployment

The Docker setup is production-ready with all necessary services configured. Use environment-specific configurations in `config/prod.exs` for production settings.

### Deployment Checklist
- [ ] Set production database credentials
- [ ] Configure proper SSL certificates
- [ ] Set up monitoring and logging
- [ ] Configure backup strategies
- [ ] Test SAFT report generation
- [ ] Verify Jasper service integration
- [ ] Set up proper CORS and security headers

## Next Steps

1. **Enhanced Testing**: Add comprehensive test suites for all modules
2. **Monitoring**: Add application metrics and health checks
3. **Performance**: Optimize database queries and add caching
4. **Features**: Add additional accounting features and reports
5. **User Groups**: Create additional user groups (Accountant, Viewer) with appropriate permissions
6. **Frontend Auth Integration**: Connect React frontend with identity service for full auth flow

The application is now ready for productive use with all the benefits of the Elixir ecosystem while maintaining full Bulgarian accounting compliance and secure user authentication. 🎉