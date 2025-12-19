# Changelog

All notable changes to Baraba will be documented in this file.

## [2.0.0] - 2025-12-19 - Microservices Architecture Release

### 🚀 **MAJOR - Complete Microservices Migration**

#### **New Architecture**
- ✅ **5 Microservices**: Identity (5002), Scanner (5001), VIES (5003), VAT (5004), Gateway (5000)
- ✅ **API Gateway Pattern**: Monolith now acts as request router
- ✅ **Docker Compose**: Full containerization with 7 services (including frontend + postgres)
- ✅ **Shared Library**: `baraba_shared` for common models and utilities

#### **New Services**
- **Identity Service** (Port 5002)
  - Complete authentication system
  - User management (CRUD operations)
  - JWT token handling
  - User group management
  
- **Scanner Service** (Port 5001)
  - AI invoice scanning (mock implementation)
  - RESTful API for scan requests
  
- **VIES Service** (Port 5003)
  - EU VIES VAT number validation
  - SOAP integration with European Commission
  - JSON API wrapper
  
- **VAT Service** (Port 5004)
  - Complex VAT file generation for NRA
  - POKUPKI.TXT, PRODAGBI.TXT, DEKLAR.TXT generation
  - Windows-1251 encoding support

#### **Frontend Integration**
- 🎉 **Zero Frontend Changes Required**
- ✅ API Gateway handles all routing transparently
- ✅ Dockerized frontend with nginx reverse proxy
- ✅ Full integration at http://localhost:5173

#### **Infrastructure & DevOps**
- ✅ **Multi-stage Docker builds** for all services
- ✅ **Docker Compose orchestration** with service dependencies
- ✅ **Health check endpoints** for all services (`/health`)
- ✅ **Consistent port allocation**: 5001-5005 + 5173 (frontend)
- ✅ **Non-root containers** for security
- ✅ **Environment variable configuration**

#### **Code Organization**
- ✅ **Shared Library**: `baraba_shared/models/` with common entities
- ✅ **Service-specific folders**: Each microservice in own directory
- ✅ **Clean separation**: Removed duplicate code from monolith
- ✅ **Updated imports**: All services use shared library

#### **Documentation**
- ✅ **Complete microservices documentation** (`MICROSERVICES.md`)
- ✅ **Docker-specific guide** (`DOCKER.md`)
- ✅ **Frontend impact analysis** (`FRONTEND_IMPACT.md`)
- ✅ **Migration report** (`doklad.md`)
- ✅ **Updated README** with new architecture

### 🔧 **Technical Improvements**

#### **Backend Changes**
- **API Gateway Implementation**: Monolith now proxies requests
- **Service Communication**: HTTP-based inter-service calls
- **Error Handling**: Service unavailable responses
- **Database Sharing**: Shared Database pattern maintained

#### **Frontend Changes**
- **Proxy Configuration**: Vite proxy routes to API Gateway
- **Zero API Changes**: All endpoints work as before
- **Docker Integration**: nginx reverse proxy for production

#### **Security Improvements**
- **Service Isolation**: Each service runs in isolated container
- **Non-root Users**: All containers run as non-root users
- **Secret Management**: Environment variables for sensitive data

### 🐳 **Docker Infrastructure**

#### **Service Matrix**
```
Port 5173: Frontend (React + nginx)
Port 5000: API Gateway (Monolith)
Port 5001: Scanner Service (AI Scanning)
Port 5002: Identity Service (Auth + Users)
Port 5003: VIES Service (VAT Validation)
Port 5004: VAT Service (VAT Generation)
Port 5432: PostgreSQL Database
```

#### **Development Workflow**
```bash
# Single command to start everything
docker-compose up -d

# Initialize database
docker-compose exec baraba_service ./bin/migrate

# Access application
open http://localhost:5173
```

### 📈 **Performance & Scalability**

#### **Improved Scalability**
- **Horizontal Scaling**: Each service can scale independently
- **Resource Optimization**: Smaller, focused containers
- **Parallel Processing**: Services can process requests concurrently

#### **Better Fault Tolerance**
- **Service Isolation**: Failure in one service doesn't crash entire system
- **Graceful Degradation**: Gateway returns 500 when service unavailable
- **Independent Recovery**: Services can restart independently

### 🔄 **Migration Benefits**

#### **Development Benefits**
- **Team Autonomy**: Teams can work on different services independently
- **Faster Builds**: Smaller codebases compile faster
- **Technology Flexibility**: Different stacks possible for different services
- **Easier Testing**: Each service can be tested in isolation

#### **Operational Benefits**
- **Selective Updates**: Update only services that changed
- **Monitoring**: Service-specific health monitoring
- **Logging**: Centralized logging per service
- **Deployment**: Zero-downtime deployments possible

### 🐛 **Bug Fixes**
- Fixed CORS configuration issues in monolith
- Improved error handling in service communication
- Fixed database connection pooling in microservices
- Resolved JWT token validation inconsistencies

### 📝 **Breaking Changes**

#### **Database**
- No database schema changes required
- Shared Database pattern maintained
- Backward compatible with existing data

#### **API**
- **No breaking changes** for frontend clients
- All endpoints work through API Gateway
- Internal service endpoints not exposed externally

#### **Deployment**
- New Docker-based deployment required
- Traditional monolith deployment deprecated
- Environment variable configuration mandatory

### 📚 **Documentation Updates**

#### **New Documentation Files**
- `MICROSERVICES.md` - Complete architecture guide
- `DOCKER.md` - Docker deployment guide
- `FRONTEND_IMPACT.md` - Frontend migration analysis

#### **Updated Documentation**
- `README.md` - Complete rewrite for microservices
- `doklad.md` - Migration progress report
- Added comprehensive API endpoint documentation

### 🔮 **Migration Path**

#### **For Existing Deployments**
1. **Backup Database**: `pg_dump jesterac > backup.sql`
2. **Deploy Docker Stack**: `docker-compose up -d`
3. **Run Migrations**: `docker-compose exec baraba_service ./bin/migrate`
4. **Update Frontend Config**: Point to new API Gateway

#### **For New Deployments**
1. **Clone Repository**: `git clone <repo>`
2. **Start Services**: `docker-compose up -d`
3. **Initialize Database**: `docker-compose exec baraba_service ./bin/migrate`
4. **Access Application**: http://localhost:5173

### 🎯 **Next Steps (Post-Migration)**

#### **Immediate (v2.0.1)**
- [ ] Add Prometheus metrics collection
- [ ] Implement centralized logging (ELK stack)
- [ ] Add API rate limiting
- [ ] Set up nginx reverse proxy for production

#### **Short Term (v2.1.0)**
- [ ] Separate databases per service
- [ ] Implement service discovery
- [ ] Add OAuth2/OpenID Connect
- [ ] Implement circuit breakers

#### **Long Term (v3.0.0)**
- [ ] Event-driven architecture
- [ ] CQRS pattern implementation
- [ ] GraphQL federation
- [ ] Advanced monitoring & alerting

### 🙏 **Acknowledgments**

This migration represents a significant architectural evolution from monolith to microservices. Special thanks to:

- **Development Team** for their dedication during the migration process
- **QA Team** for comprehensive testing of the new architecture
- **DevOps Team** for designing the container infrastructure
- **Management** for supporting the architectural investment

---

## [1.5.0] - 2025-11-15 - Frontend Improvements

### ✨ **New Features**
- Dark/Light theme toggle implemented
- Improved responsive design for mobile devices
- Added data export functionality (PDF/Excel)
- Enhanced chart visualizations
- Real-time notifications system

### 🔧 **Improvements**
- Optimized bundle size by 40%
- Improved loading times with lazy loading
- Better error boundary implementation
- Enhanced form validation
- Improved accessibility (WCAG 2.1 AA)

### 🐛 **Bug Fixes**
- Fixed memory leak in chart components
- Resolved infinite loop in data fetching
- Fixed CORS issues with API
- Corrected date/time handling
- Fixed mobile menu toggle

---

## [1.4.0] - 2025-10-20 - Performance & Security

### 🔒 **Security Enhancements**
- Implemented rate limiting on API endpoints
- Added input sanitization for XSS prevention
- Enhanced JWT token security
- Added audit logging for sensitive operations
- Implemented CSRF protection

### ⚡ **Performance Improvements**
- Database query optimization (50% faster reports)
- Implemented database connection pooling
- Added Redis caching for frequently accessed data
- Optimized frontend bundle splitting
- Implemented lazy loading for images

### 🐛 **Bug Fixes**
- Fixed memory usage spikes during report generation
- Resolved concurrent user session issues
- Fixed decimal precision in financial calculations
- Corrected timezone handling
- Fixed email notification delays

---

## [1.3.0] - 2025-09-10 - Reporting Enhancements

### 📊 **New Reports**
- Interactive dashboard with real-time data
- Cash flow statement
- Trial balance report
- Custom report builder
- Scheduled report generation

### 🔧 **Features**
- Report template system
- Export to multiple formats (PDF, Excel, CSV)
- Report sharing and collaboration
- Historical report comparisons
- Drill-down capabilities

### 🐛 **Bug Fixes**
- Fixed report calculation errors
- Corrected currency formatting
- Fixed date range filters
- Resolved print layout issues
- Fixed email report delivery

---

## [1.2.0] - 2025-08-05 - VAT Module Enhancement

### 🧾 **VAT Features**
- Complete VAT reporting system
- VIES validation integration
- Automated VAT return generation
- VAT rate management
- Intrastat reporting

### 🔧 **Improvements**
- Enhanced audit trail
- Better error handling in VAT calculations
- Improved validation of VAT numbers
- Multi-currency VAT support
- VAT reconciliation tools

### 🐛 **Bug Fixes**
- Fixed VAT round-off issues
- Corrected VIES service timeout handling
- Fixed VAT report export formatting
- Resolved duplicate VAT detection
- Fixed multi-company VAT handling

---

## [1.1.0] - 2025-07-01 - Core Features

### 💰 **Accounting Features**
- Chart of accounts management
- Journal entry system
- Account reconciliation
- Financial statements generation
- Closing periods functionality

### 🏢 **Company Management**
- Multi-company support
- Company profiles management
- User permissions per company
- Company-specific settings
- Fiscal year management

### 🐛 **Bug Fixes**
- Fixed balance sheet calculations
- Corrected profit/loss statement
- Fixed currency conversion issues
- Resolved data import problems
- Fixed user authentication bugs

---

## [1.0.0] - 2025-06-01 - Initial Release

### 🎉 **First Release**
- Basic accounting functionality
- User authentication system
- Company setup wizard
- Data import/export
- Basic reporting

### 📋 **Core Features**
- User management
- Chart of accounts
- Journal entries
- Trial balance
- Simple financial reports

### 🚀 **Technology Stack**
- Nim backend with Jester framework
- React frontend with TypeScript
- PostgreSQL database
- JWT authentication
- RESTful API design