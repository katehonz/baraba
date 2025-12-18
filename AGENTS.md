# AGENTS.md - Baraba Accounting System

This document provides essential information for AI agents working with the Baraba accounting system codebase.

## Project Overview

Baraba is a **minimalist full-stack accounting application** showcasing advanced technology integration:
- **Backend**: Nim 2.2.6+ with Jester web framework (multi-threaded)
- **Frontend**: React 19 + TypeScript with Vite
- **Database**: PostgreSQL 15+
- **ORM**: Custom orm-baraba (Norm-based PostgreSQL ORM, thread-safe)
- **Architecture**: Demonstrates sophisticated thread-safety patterns and minimalistic design

## Development Commands

### Backend (Nim)

```bash
# Database setup
createdb jesterac
nim c -d:ssl -p:src/vendor -p:src/vendor/tinypool/src -p:src/vendor/nim-graphql -o:bin/migrate src/db/migrate.nim
./bin/migrate

# Development build
nim c -d:ssl -p:src/vendor -p:src/vendor/tinypool/src -p:src/vendor/nim-graphql -o:bin/baraba src/baraba.nim
./bin/baraba

# Production build
nim c -d:release -d:ssl --threads:on -p:src/vendor -p:src/vendor/tinypool/src -p:src/vendor/nim-graphql -o:bin/baraba src/baraba.nim

# Quick start script (handles everything)
./start.sh
./stop.sh
```

### Frontend (React/TypeScript)

```bash
cd frontend
npm install
npm run dev      # Development server on port 5173
npm run build    # Production build
npm run lint     # ESLint checking
```

## Architecture

### Backend Structure

```
src/
├── baraba.nim              # Main entry point with Jester routes
├── db/
│   ├── config.nim          # Database connection pool (thread-safe)
│   └── migrate.nim         # Database migrations and seed data
├── models/                 # ORM models (norm-based)
├── services/
│   └── auth.nim            # JWT authentication service
├── routes/                 # REST API route handlers
├── graphql/                # GraphQL schema and resolvers
├── utils/                  # Utility functions
└── vendor/                 # Local vendored dependencies
    ├── orm-baraba/         # Custom PostgreSQL ORM
    ├── nim-graphql/        # GraphQL library
    ├── jester/             # Forked Jester with Nim 2.x fixes
    └── tinypool/           # Thread pool implementation
```

### Frontend Structure

```
frontend/src/
├── api/                    # API client functions (axios-based)
├── components/             # React components
├── contexts/              # React Context providers
├── pages/                 # Page components
├── types/                 # TypeScript type definitions
└── main.tsx              # Application entry point
```

## Technical Excellence

This project demonstrates sophisticated technical solutions:

### Thread-Safe Database Architecture

```nim
# Thread-safe connection pool pattern
let db = getDbConn()
try:
  var items = @[newItem()]
  db.select(items, "condition = $1", value)
finally:
  releaseDbConn(db)

# Template helper with automatic connection management
withDb:
  var accounts = @[newAccount()]
  db.select(accounts, "company_id = $1", companyId)
```

### Advanced Multi-threading Patterns

```nim
# Thread-local GraphQL context for concurrent requests
var graphqlCtx {.threadvar.}: GraphqlRef

# Thread-safe database operations with {.gcsafe.}
proc getDbConn*(): DbConn {.gcsafe.} = # Returns pooled connection
proc releaseDbConn*(conn: DbConn) {.gcsafe.} = # Returns to pool
```

### REST API Response Pattern

```nim
# Success response
resp Http200, jsonCors, $toJson(item)

# Error response
resp Http400, jsonCors, $(%*{"error": "Error message"})

# CORS headers are pre-defined
const jsonCors* = @{
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*"
}
```

### Minimalist Frontend Architecture

```typescript
// Streamlined API client with JWT integration
import client from './client';

export const getCompanies = async () => {
  const response = await client.get('/api/companies');
  return response.data;
};

// React Query for optimal data management
export const useCompanies = () => {
  return useQuery({
    queryKey: ['companies'],
    queryFn: getCompanies,
  });
};
```

## Configuration

### Database Configuration

Located in `src/db/config.nim`:
```nim
const
  DbHost* = "localhost"
  DbUser* = "postgres"
  DbPassword* = "pas+123"
  DbName* = "jesterac"
  PoolSize* = 10
```

### JWT Configuration

In `src/services/auth.nim`:
```nim
const
  JwtSecret* = "your-secret-key-change-in-production-min-32-chars!"
  JwtExpirationHours* = 24
```

## Multi-threading Mastery

The project implements sophisticated concurrent patterns:

### Thread Safety Architecture

```nim
# Thread-local GraphQL context for concurrent request handling
var graphqlCtx {.threadvar.}: GraphqlRef

# Thread-safe database connection pool
proc getDbConn*(): DbConn {.gcsafe.} = # Returns pooled connection
proc releaseDbConn*(conn: DbConn) {.gcsafe.} = # Returns to pool

# Multi-threaded server with optimized request routing
```

## Advanced ORM Implementation

The custom orm-baraba demonstrates sophisticated database patterns:

### Thread-Safe Model Pattern

```nim
type
  User* = object of Model
    username*: string
    email*: string
    password*: string
    # Optimized for thread-safe operations

proc newUser*(username = "", email = "", ...): User =
  User(id: 0, username: username, email: email, ...)
```

### Optimized Database Operations

```nim
# Thread-safe create with connection pooling
var user = newUser("admin", "admin@example.com", "hashedpw")
save(user, db)

# Concurrent-safe read operations
var users = @[newUser()]
db.select(users, "active = $1", true)

# Atomic update operations
user.email = "new@example.com"
save(user, db)

# Safe deletion patterns
delete(user, db)
```

## Testing Approach

### Backend Testing (Nim)

No formal test structure exists yet. Tests should be placed in a `tests/` directory and follow this pattern:

```nim
import unittest
import baraba

suite "User Management":
  test "should create user":
    # Test implementation
    check(true)
```

### Frontend Testing

Uses standard React testing patterns with Vitest/React Testing Library.

## Development Workflow

### Adding New Features

1. **Backend**:
   - Add/update model in `src/models/`
   - Add routes in `src/routes/`
   - Update main router in `src/baraba.nim`
   - Add migration in `src/db/migrate.nim` if needed

2. **Frontend**:
   - Add API client in `frontend/src/api/`
   - Add page/component in `frontend/src/pages/`
   - Update routing in `App.tsx`
   - Add types in `frontend/src/types/`

### Default Credentials

- Username: `admin`
- Password: `admin123`
- Database: `jesterac`

## Advanced Technical Considerations

### Multi-threading Best Practices

- Use `{.threadvar.}` for thread-local variables
- Database connections must use the thread-safe connection pool
- GraphQL context is thread-local and lazy-initialized
- All database operations must be wrapped in proper connection management

### Custom Technology Stack

The project showcases custom implementations for maximum control:
- **Custom Jester fork**: Enhanced with Nim 2.x compatibility fixes
- **Custom GraphQL library**: Optimized for thread-safety and performance
- **Custom orm-baraba**: Thread-safe PostgreSQL ORM with advanced patterns

Critical compilation flags for multi-threading:
```bash
-p:src/vendor -p:src/vendor/tinypool/src -p:src/vendor/nim-graphql --threads:on
```

### Database Schema

- All tables use auto-incrementing primary keys
- Timestamp fields use PostgreSQL `TIMESTAMP`
- Foreign keys are `int64` types
- Soft deletes are not implemented - use direct deletes

### Authentication

- JWT tokens stored in localStorage on frontend
- Token includes user ID and username
- Middleware validation in routes extracts user from token

### API Standards

- All endpoints return JSON
- Error responses: `{"error": "message"}`
- Success responses: direct object/array
- CORS headers pre-configured for development

## Performance Architecture

This system demonstrates advanced performance optimizations:
- **Database Connection Pool**: 10 concurrent connections with thread-safe management
- **Parameterized Queries**: Prevents SQL injection while maintaining performance
- **Thread-local GraphQL Schema Caching**: Optimizes concurrent request handling
- **Frontend React Query**: Intelligent API caching for responsive UI
- **Multi-threaded Request Processing**: Leverages all CPU cores efficiently

## Deployment Notes

### Environment Variables

- `PORT`: Server port (default: 5000)

### Production Checklist

- Change database credentials in `src/db/config.nim`
- Change JWT secret in `src/services/auth.nim`
- Use HTTPS in production
- Configure CORS properly for production domains
- Consider multi-instance deployment with load balancer

## Localization

Translations are managed in:
- Frontend: `frontend/public/locales/` (JSON files)
- Backend: Direct string literals in code (Bulgarian)

## Code Style

### Nim Backend

- Types and Models: PascalCase
- Variables and functions: camelCase
- Constants: UPPER_SNAKE_CASE
- Always use database connection patterns shown above

### TypeScript Frontend

- Functional components with hooks
- Strict TypeScript enabled
- Use React Query for server state
- Use Chakra UI components

## Development Best Practices

When modifying this sophisticated system:

1. **Database Operations** - Always use thread-safe connection pool patterns
2. **Thread Safety** - Ensure all shared state is properly protected with {.gcsafe.}
3. **API Consistency** - Maintain consistency between backend and frontend
4. **Authentication** - Protect endpoints with proper JWT validation
5. **Migration Scripts** - Update database schema while preserving data integrity
6. **Multi-threading** - Test under concurrent load conditions
7. **Performance** - Monitor connection pool usage and optimize queries