# VIES Service Documentation

## Overview

The **VIES (VAT Information Exchange System) Service** is a Nim microservice that validates EU VAT numbers using the official European Commission VIES web service. It provides real-time VAT number validation with company name and address information.

## Architecture

**Technology Stack**: Nim + Jester framework  
**Port**: 5003  
**Database**: None (uses external VIES API)  
**Authentication**: JWT-based (integrates with identity_service)

## Features

- ✅ **Real-time VAT Validation**: Validates VAT numbers against official EU VIES database
- ✅ **JWT Authentication**: Secured endpoints with role-based access control
- ✅ **Company Information**: Returns validated company name and address
- ✅ **CORS Support**: Full frontend integration support
- ✅ **Error Handling**: Comprehensive error responses and timeout handling
- ✅ **Frontend Integration**: React TypeScript client with proper types

## API Endpoints

### Health Check (Public)
```bash
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "service": "vies-service", 
  "jwtConfigured": true
}
```

### VAT Validation (Protected)
```bash
GET /api/vies/validate/{vatNumber}
```

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "valid": true,
  "name": "COMPANY NAME",
  "longAddress": "COMPANY ADDRESS",
  "vatNumber": "BG123456789"
}
```

**Error Responses:**
- `401`: Missing or invalid JWT token
- `400`: VAT number too short or invalid format
- `500`: VIES service unavailable or timeout

## Frontend Integration

### API Client Location
`frontend/src/api/vies.ts`

### TypeScript Interfaces
```typescript
export interface ViesValidationResult {
  valid: boolean
  name: string
  longAddress: string
  vatNumber: string
}
```

### Usage Example
```typescript
import { viesApi } from '../api/vies'

// Validate VAT number
try {
  const result = await viesApi.validateVat('BG123456789')
  if (result.valid) {
    console.log(`Company: ${result.name}`)
    console.log(`Address: ${result.longAddress}`)
  } else {
    console.log('Invalid VAT number')
  }
} catch (error) {
  console.error('Validation failed:', error.message)
}
```

## Authentication

The VIES service uses JWT tokens for authentication:

1. **Token Verification**: Validates JWT tokens using the identity_service public key
2. **User Context**: Extracts user ID and username from valid tokens
3. **Access Control**: All validation endpoints require valid authentication
4. **CORS Support**: Proper headers for frontend integration

## Service Configuration

### Environment Variables
- `JWT_SECRET`: Shared secret for JWT token validation
- `VITE_VIES_API_URL`: Frontend API URL (default: `http://localhost:5003`)

### Dependencies
- **Nim 2.0+**: Core language runtime
- **Jester**: Web framework for HTTP routing
- **JWT-nim**: Token validation library
- **baraba_shared**: Shared security utilities

## Deployment

### Docker Configuration
```dockerfile
# Multi-stage build
FROM nimlang/nim:2.2.2-alpine-regular as builder
# Build with SSL support
FROM alpine:latest
```

### Service Ports
- **VIES Service**: 5003
- **Frontend**: 5173 (development)
- **Identity Service**: 5002 (authentication)

### Docker Compose
The service is integrated into the main `docker-compose.nim.yml`:
```yaml
vies_service:
  build:
    context: .
    dockerfile: vies_service/Dockerfile
  ports:
    - "5003:5003"
  environment:
    - JWT_SECRET=${JWT_SECRET}
  depends_on:
    - identity_service
```

## Integration with Baraba System

### Workflow
1. **User Authentication**: Frontend gets JWT token from identity_service
2. **VAT Validation**: Frontend calls VIES service with valid token
3. **Response Processing**: Results displayed in React components
4. **Error Handling**: Proper error messages shown to users

### Security Benefits
- **Isolated Service**: Separate microservice for security boundaries
- **JWT Validation**: Centralized authentication through identity_service
- **No Direct Database Access**: Uses external VIES API only
- **CORS Protection**: Proper cross-origin request handling

### Performance Characteristics
- **Fast Response**: Native Nim performance for request handling
- **Timeout Protection**: 10-second timeout for VIES API calls
- **Lightweight**: Minimal memory footprint and startup time
- **Scalable**: Stateless service can be horizontally scaled

## Error Handling

### Common Error Scenarios

#### 1. Invalid VAT Number Format
```bash
GET /api/vies/validate/AB
# Response: 400 Bad Request
{"error": "VAT number too short"}
```

#### 2. Missing Authentication
```bash
GET /api/vies/validate/BG123456789
# Response: 401 Unauthorized
{"error": "Missing Authorization header"}
```

#### 3. VIES Service Unavailable
```bash
GET /api/vies/validate/BG123456789
# Response: 500 Internal Server Error
{"error": "Failed to validate VAT number"}
```

#### 4. Invalid VAT Number (VIES Response)
```json
{
  "valid": false,
  "name": "",
  "longAddress": "",
  "vatNumber": "BG123456789"
}
```

## Development

### Local Development Setup
```bash
cd vies_service
nimble build
./vies_service
```

### Testing with Frontend
1. Start VIES service: `./vies_service`
2. Start identity service: `./identity_service`
3. Start frontend: `npm run dev`
4. Test VAT validation in browser console

### Debug Logging
The service logs validation requests with usernames:
```
VIES validation request from user: accountant1
```

## Benefits of Nim Implementation

### Performance
- **Native Speed**: Compiled to C for optimal performance
- **Low Memory**: Minimal runtime overhead compared to Node.js/Java
- **Fast XML Parsing**: Efficient SOAP response handling

### Security
- **Memory Safety**: Nim's garbage collection prevents common vulnerabilities
- **Type Safety**: Strong typing prevents runtime errors
- **No Runtime Overhead**: Direct compilation to machine code

### Development
- **Simple Deployment**: Single binary executable
- **Fast Compilation**: Quick build times during development
- **Excellent JSON/XML Support**: Built-in libraries for web services

## Future Enhancements

### Potential Improvements
1. **Caching**: Add Redis caching for frequent VAT validations
2. **Rate Limiting**: Implement request throttling per user
3. **Batch Validation**: Support multiple VAT number validation
4. **Audit Logging**: Log all validation attempts for compliance
5. **Enhanced Error Details**: More specific error messages from VIES

### Integration Opportunities
- **Counterpart Management**: Auto-populate counterpart details from VIES
- **Invoice Validation**: Validate customer VAT numbers during invoicing
- **Reporting**: Include VAT validation status in financial reports

## Conclusion

The VIES service provides robust, secure, and performant VAT number validation for the Baraba accounting system. Its Nim implementation ensures optimal performance while maintaining security through JWT authentication and proper error handling. The service integrates seamlessly with the React frontend, providing users with real-time VAT validation capabilities.