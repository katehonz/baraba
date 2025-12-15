# Архитектура

## Общ преглед

Baraba е full-stack счетоводно приложение с разделен backend и frontend:

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend                           │
│            (React + TypeScript + Vite)                 │
│                 Port: 5173                             │
│         Chakra UI + React Query + Router              │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTP/JSON + GraphQL
                          ▼
┌─────────────────────────────────────────────────────────┐
│                      Backend                            │
│            (Nim + Jester + GraphQL)                   │
│                 Port: 5000                             │
│           REST API + GraphQL Endpoints                │
└─────────────────────────┬───────────────────────────────┘
                          │ SQL
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    PostgreSQL                           │
│                   Port: 5432                            │
└─────────────────────────────────────────────────────────┘
```

## Backend архитектура

### Слоеве

```
┌─────────────────────────────────────────┐
│              Routes (routes/*.nim)       │  ← HTTP endpoints
├─────────────────────────────────────────┤
│           GraphQL (graphql/*.nim)        │  ← GraphQL schema/resolvers
├─────────────────────────────────────────┤
│           Services (auth.nim)            │  ← Business logic
├─────────────────────────────────────────┤
│            Models (models/*.nim)         │  ← ORM models
├─────────────────────────────────────────┤
│         Database (norm/postgres)         │  ← Database access
└─────────────────────────────────────────┘
```

### Структура на файловете

```
src/
├── baraba.nim              # Entry point + Main router
│
├── routes/                 # REST API routes
│   ├── auth_routes.nim     # Authentication endpoints
│   ├── company_routes.nim  # Company CRUD
│   ├── account_routes.nim  # Account management
│   ├── counterpart_routes.nim # Counterpart CRUD
│   ├── journal_routes.nim  # Journal entries
│   ├── currency_routes.nim # Currencies
│   ├── vat_rate_routes.nim # VAT rates
│   ├── exchange_rate_routes.nim # Exchange rates
│   ├── user_routes.nim     # User management
│   ├── user_group_routes.nim # User groups
│   ├── audit_log_routes.nim # Audit logs
│   ├── fixed_asset_category_routes.nim # Fixed assets
│   └── vies_routes.nim     # VIES VAT validation
│
├── graphql/                # GraphQL layer
│   ├── schema.graphql      # GraphQL schema definition
│   └── resolvers.nim       # GraphQL resolvers
│
├── db/
│   ├── config.nim          # Database connection settings
│   │   └── getDbConn()     # Connection pool management
│   └── migrate.nim         # Schema migrations + Seed data
│       ├── runMigrations() # Създава таблици
│       └── seedInitialData() # Начални данни
│
├── models/                 # norm ORM models
│   ├── user.nim           # User, UserGroup
│   ├── company.nim        # Company
│   ├── account.nim        # Account (сметкоплан)
│   ├── counterpart.nim    # Counterpart (контрагенти)
│   ├── journal.nim        # JournalEntry, EntryLine
│   ├── currency.nim       # Currency
│   ├── vatrate.nim        # VatRate
│   ├── exchangerate.nim   # ExchangeRate
│   ├── fixed_asset_category.nim # Fixed asset categories
│   ├── audit_log.nim      # Audit logging
│   └── enums.nim          # Shared enums
│
├── services/
│   └── auth.nim           # Authentication service
│       ├── hashPassword()
│       ├── verifyPassword()
│       ├── generateToken()
│       ├── verifyToken()
│       ├── authenticateUser()
│       └── createUser()
│
└── utils/
    └── json_utils.nim     # JSON serialization helpers
        ├── toJson()
        └── toJsonArray()
```

### Request Flow

```
1. HTTP Request
       │
       ▼
2. Jester Router (mainRouter)
       │
       ├── Parse JSON body
       ├── Extract parameters
       │
       ▼
3. Service Layer (optional)
       │
       ├── Business logic
       ├── Validation
       │
       ▼
4. Database Layer (norm)
       │
       ├── openDb()
       ├── select/insert/update
       ├── close(db)
       │
       ▼
5. Response
       │
       ├── toJson()/toJsonArray()
       ├── HTTP status code
       └── JSON response
```

### Database Connection Pattern

```nim
# Pattern за всеки request
let db = openDb()
try:
  var items = @[newItem()]  # norm изисква поне 1 елемент
  db.select(items, "condition = $1", value)
  if items.len == 1 and items[0].id == 0:
    items = @[]  # Празен резултат
  # ... use items
finally:
  close(db)  # Винаги затваряй връзката
```

## Frontend архитектура

### Структура

```
frontend/src/
├── main.tsx               # Entry point
├── App.tsx                # Root component + Routes
├── App.css                # Global styles
├── index.css              # Base styles
├── theme.ts               # Chakra UI theme
│
├── api/                   # API клиенти
│   ├── client.ts          # Axios instance + interceptors
│   ├── auth.ts            # Auth API calls
│   ├── companies.ts       # Companies API
│   ├── accounts.ts        # Accounts API
│   ├── counterparts.ts    # Counterparts API
│   ├── journal.ts         # Journal API
│   ├── currencies.ts      # Currencies API
│   ├── vatRates.ts        # VAT rates API
│   ├── exchangeRates.ts   # Exchange rates API
│   ├── users.ts           # Users API
│   ├── userGroups.ts      # User groups API
│   ├── auditLogs.ts       # Audit logs API
│   ├── fixedAssetCategories.ts # Fixed assets API
│   ├── vies.ts            # VIES validation API
│   ├── reports.ts         # Reports API
│   ├── monthlyStats.ts    # Monthly statistics API
│   └── settings.ts        # Settings API
│
├── contexts/              # React Context
│   ├── AuthContext.tsx    # User + Token state
│   └── CompanyContext.tsx # Current company state
│
├── components/
│   └── Layout.tsx         # Main layout + Navigation
│
├── pages/
│   ├── HomePage.tsx
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── RecoverPasswordPage.tsx
│   │   └── ResetPasswordPage.tsx
│   ├── companies/
│   │   └── CompaniesPage.tsx
│   ├── accounts/
│   │   └── AccountsPage.tsx
│   ├── counterparts/
│   │   └── CounterpartsPage.tsx
│   ├── journal/
│   │   ├── JournalDashboardPage.tsx
│   │   ├── JournalEntriesPage.tsx
│   │   └── JournalEntryFormPage.tsx
│   ├── reports/
│   │   ├── ReportsPage.tsx
│   │   ├── AuditLogsPage.tsx
│   │   ├── CounterpartyReportsPage.tsx
│   │   └── MonthlyStatsPage.tsx
│   └── settings/
│       ├── SettingsPage.tsx
│       ├── UsersPage.tsx
│       ├── CurrenciesPage.tsx
│       └── VatRatesPage.tsx
│
├── types/
│   └── index.ts           # TypeScript interfaces
│
└── assets/
    └── react.svg
```

### State Management

```
┌──────────────────────────────────────────────────────┐
│                    App Component                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │              QueryClientProvider                 │ │  # React Query
│  │  ┌────────────────────────────────────────────┐ │ │
│  │  │              AuthProvider                   │ │ │  # AuthContext
│  │  │  ┌──────────────────────────────────────┐  │ │ │
│  │  │  │          CompanyProvider              │  │ │ │  # CompanyContext
│  │  │  │  ┌────────────────────────────────┐  │  │ │ │
│  │  │  │  │          AppRoutes              │  │  │ │ │  # React Router
│  │  │  │  └────────────────────────────────┘  │  │ │ │
│  │  │  └──────────────────────────────────────┘  │ │ │
│  │  └────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

**Технологии:**
- **React Query** - Server state management, caching, mutations
- **React Context** - Client state (auth, current company)
- **React Hook Form** - Form state management
- **Chakra UI** - Component library with built-in state management

### Routing

```
/                           → HomePage (protected)
├── companies               → CompaniesPage (protected)
├── accounts                → AccountsPage (protected)
├── counterparts            → CounterpartsPage (protected)
├── journal                 → JournalDashboardPage (protected)
│   ├── entries            → JournalEntriesPage (protected)
│   └── new                → JournalEntryFormPage (protected)
├── reports                 → ReportsPage (protected)
│   ├── audit-logs         → AuditLogsPage (protected)
│   ├── counterparties     → CounterpartyReportsPage (protected)
│   └── monthly-stats      → MonthlyStatsPage (protected)
├── settings                → SettingsPage (protected)
│   ├── users              → UsersPage (protected)
│   ├── currencies         → CurrenciesPage (protected)
│   └── vat-rates          → VatRatesPage (protected)
├── login                   → LoginPage (public)
├── register                → RegisterPage (public)
├── recover-password        → RecoverPasswordPage (public)
└── reset-password          → ResetPasswordPage (public)
```

### API Client Pattern

```typescript
// api/client.ts
const client = axios.create({
  baseURL: 'http://localhost:5000',
});

// Add auth token to requests
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Error handling
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### React Query Integration

```typescript
// Example API usage with React Query
export const useCompanies = () => {
  return useQuery({
    queryKey: ['companies'],
    queryFn: () => companiesApi.getAll(),
  });
};

export const useCreateCompany = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCompanyInput) => companiesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
};
```

## Security

### Authentication Flow

```
1. User submits credentials
       │
       ▼
2. POST /api/auth/login
       │
       ├── Verify password hash
       ├── Generate JWT token
       │
       ▼
3. Store token in localStorage
       │
       ▼
4. Include token in subsequent requests
       │
       ├── Authorization: Bearer <token>
       │
       ▼
5. Backend verifies token
       │
       ├── Check signature
       ├── Check expiration
       └── Extract user info
```

### Password Hashing

```nim
# Simple base64 encoding (demo only!)
# В production използвай bcrypt
proc hashPassword*(password: string): string =
  encode(password & JwtSecret)
```

### JWT Token Structure

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "claims": {
    "sub": "1",           // User ID
    "username": "admin",
    "iat": 1234567890,    // Issued at
    "exp": 1234654290     // Expires (24h)
  }
}
```

## GraphQL Integration

Приложението поддържа както REST API, така и GraphQL:

### GraphQL Schema

- **Query:** Вече дефинирани заявки за всички основни ресурси
- **Mutation:** CRUD операции за всички модели
- **Reports:** Специализирани заявки за оборотна ведомост и главна книга
- **Types:** Пълна дефиниция на всички типове данни

### GraphQL Endpoints

```
POST /graphql           # GraphQL playground и queries
GET  /graphql?query={...} # Simple GET queries
```

## Deployment Considerations

### Production Changes

1. **Database credentials** - Използвай environment variables
2. **JWT Secret** - Дълъг, случаен string (32+ chars)
3. **Password hashing** - Замени base64 с bcrypt
4. **CORS** - Ограничи до конкретни домейни
5. **HTTPS** - Използвай SSL/TLS
6. **Threading** - Изследвай защо multi-threading причинява SIGSEGV
7. **Connection Pooling** - Използвай connection pool за PostgreSQL

### Docker (бъдещо)

```dockerfile
# Backend
FROM nimlang/nim:2.2.4
WORKDIR /app
COPY . .
RUN nimble install -y
RUN nim c --deepcopy:on -d:release --threads:off src/baraba.nim
CMD ["./src/baraba"]

# Frontend
FROM node:18-alpine
WORKDIR /app
COPY frontend/ .
RUN npm install && npm run build
# Serve with nginx
```

### Nginx Reverse Proxy (бъдещо)

```nginx
server {
    listen 80;
    server_name baraba.example.com;

    location /api {
        proxy_pass http://localhost:5000;
    }

    location / {
        root /var/www/baraba/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
}
```
