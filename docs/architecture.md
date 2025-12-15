# Архитектура

## Общ преглед

Baraba е full-stack приложение с разделен backend и frontend:

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend                           │
│                   (React + Vite)                        │
│                   Port: 5173                            │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTP/JSON
                          ▼
┌─────────────────────────────────────────────────────────┐
│                      Backend                            │
│                  (Nim + Jester)                         │
│                   Port: 5000                            │
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
│              Routes (baraba.nim)         │  ← HTTP endpoints
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
├── baraba.nim              # Entry point + Routes
│   └── router mainRouter   # Jester router с всички endpoints
│
├── db/
│   ├── config.nim          # Database connection settings
│   │   └── openDb()        # Отваря връзка към PostgreSQL
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
│   └── enums.nim          # Shared enums
│
├── services/
│   └── auth.nim           # Authentication
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
│
├── api/                   # API клиенти
│   ├── client.ts          # Axios instance + interceptors
│   ├── auth.ts            # Auth API calls
│   ├── companies.ts       # Companies API
│   ├── accounts.ts        # Accounts API
│   ├── counterparts.ts    # Counterparts API
│   └── journal.ts         # Journal API
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
│   │   └── RegisterPage.tsx
│   ├── companies/
│   │   └── CompaniesPage.tsx
│   ├── accounts/
│   │   └── AccountsPage.tsx
│   ├── counterparts/
│   │   └── CounterpartsPage.tsx
│   └── journal/
│       └── JournalPage.tsx
│
└── types/
    └── index.ts           # TypeScript interfaces
```

### State Management

```
┌──────────────────────────────────────────────────────┐
│                    App Component                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │              QueryClientProvider                 │ │
│  │  ┌────────────────────────────────────────────┐ │ │
│  │  │              AuthProvider                   │ │ │
│  │  │  ┌──────────────────────────────────────┐  │ │ │
│  │  │  │          CompanyProvider              │  │ │ │
│  │  │  │  ┌────────────────────────────────┐  │  │ │ │
│  │  │  │  │          AppRoutes              │  │  │ │ │
│  │  │  │  └────────────────────────────────┘  │  │ │ │
│  │  │  └──────────────────────────────────────┘  │ │ │
│  │  └────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### Routing

```
/                 → HomePage (protected)
├── companies     → CompaniesPage (protected)
├── accounts      → AccountsPage (protected)
├── counterparts  → CounterpartsPage (protected)
├── journal       → JournalPage (protected)
├── login         → LoginPage (public)
└── register      → RegisterPage (public)
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

## Deployment Considerations

### Production Changes

1. **Database credentials** - Използвай environment variables
2. **JWT Secret** - Дълъг, случаен string (32+ chars)
3. **Password hashing** - Замени base64 с bcrypt
4. **CORS** - Ограничи до конкретни домейни
5. **HTTPS** - Използвай SSL/TLS
6. **Threading** - Изследвай защо multi-threading причинява SIGSEGV

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
