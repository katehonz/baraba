# Development Guidelines

Този документ описва best practices и насоки за разработка на Baraba.

---

## Code Style Guidelines

### Nim Backend

#### 1. Naming Conventions
```nim
# Types и Models - PascalCase
type
  User* = object
    username*: string
    email*: string

# Variables и функции - camelCase
let dbConnection = openDb()
proc getUserById*(id: int64): User =

# Constants - UPPER_SNAKE_CASE
const
  MAX_RETRY_COUNT* = 3
  DEFAULT_PAGE_SIZE* = 25

# Private членове - долна черта отпред
type
  Company* = object
    id*: int64
    name*: string
    internalId*: int  # private field
```

#### 2. File Organization
```nim
# Imports - stdlib първо, после vendor, после local
import std/[strutils, times, json]
import vendor/[nimjwt, tinypool]
import models/user, services/auth

# Константи първо
const
  API_VERSION* = "v1"
  DEFAULT_TIMEOUT* = 30

# Types втори
type
  ApiResponse* = object
    success*: bool
    data*: JsonNode
    error*: string

# Functions последни
proc createApiResponse*(success: bool, data: JsonNode = nil, error: string = ""): ApiResponse =
  result.success = success
  result.data = data
  result.error = error
```

#### 3. Error Handling
```nim
# Използвай try-except за I/O операции
proc processFile(filename: string): Result[string, string] =
  try:
    let content = readFile(filename)
    return success(content)
  except IOError as e:
    return failure("Failed to read file: " & e.msg)

# Валидация на входни данни
proc validateUser*(user: User): Result[void, string] =
  if user.username.len < 3:
    return failure("Username must be at least 3 characters")
  
  if not user.email.contains("@"):
    return failure("Invalid email format")
    
  return success()

# Database error handling
let db = openDb()
try:
  var users = @[newUser()]
  db.select(users, "active = $1", true)
finally:
  close(db)
```

#### 4. Documentation
```nim
## Gets a user by their ID.
## 
## Parameters:
## - id: The user ID to search for
## - includeInactive: Whether to include inactive users
## 
## Returns: A User object if found, or nil if not found
## 
## Raises:
## - DbError: If database query fails
proc getUserById*(id: int64, includeInactive: bool = false): User =
  let db = openDb()
  try:
    var users = @[newUser()]
    let query = if includeInactive: "id = $1" else: "id = $1 AND active = true"
    db.select(users, query, id)
    if users.len > 0:
      return users[0]
    return nil
  finally:
    close(db)
```

---

### TypeScript Frontend

#### 1. TypeScript Config
```typescript
// Строг режим винаги
interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string; // optional property
  readonly createdAt: string; // readonly property
}

// Generics където е подходящо
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}
```

#### 2. Component Guidelines
```typescript
// Functional components с React hooks
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface UserListProps {
  companyId: number;
  onUserSelect?: (user: User) => void;
}

export const UserList: React.FC<UserListProps> = ({ 
  companyId, 
  onUserSelect 
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    loadUsers();
  }, [companyId]);

  const loadUsers = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await usersApi.getByCompany(companyId);
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* JSX content */}
    </div>
  );
};
```

#### 3. API Integration
```typescript
// API client с Axios interceptors
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor - добавя auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - обработва грешки
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Redirect към login page
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }
}
```

---

## Git Workflow

### 1. Branch Strategy
```bash
# Main branches
main          # Production ready code
develop       # Integration branch

# Feature branches
feature/user-authentication
feature/journal-entries
bugfix/login-validation
hotfix/security-patch
```

### 2. Commit Message Format
```bash
# <type>(<scope>): <subject>

# Types:
feat:     New feature
fix:      Bug fix
docs:     Documentation changes
style:    Code formatting
refactor: Code refactoring
test:     Test changes
chore:    Maintenance

# Examples:
feat(auth): add JWT token refresh mechanism
fix(journal): prevent duplicate entry numbers
docs(api): update authentication documentation
refactor(models): extract common base class
test(accounts): add unit tests for account validation
chore(deps): update React to v19.2.0
```

### 3. Pull Request Template
```markdown
## Description
Кратко описание на промените.

## Type of Change
- [ ] Bug fix (non-breaking change)
- [ ] New feature (non-breaking change)
- [ ] Breaking change (fix or feature)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Cross-browser testing (Chrome, Firefox, Safari)

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Translations updated (if applicable)
- [ ] Database migrations included (if needed)
```

---

## Testing Guidelines

### 1. Backend Testing (Nim)
```nim
# unit_tests/test_user_service.nim
import unittest
import services/auth
import models/user

suite "User Authentication Service":
  
  setup:
    # Setup test database or mock
    discard
  
  teardown:
    # Cleanup
  
  test "should hash password correctly":
    let password = "test123"
    let hashed = hashPassword(password)
    check(hashed != password)
    check(verifyPassword(password, hashed))
  
  test "should validate strong password":
    let validPassword = "StrongP@ssw0rd"
    let weakPassword = "123"
    
    check(validatePassword(validPassword).isOk)
    check(not validatePassword(weakPassword).isOk)
  
  test "should generate valid JWT token":
    let user = User(id: 1, username: "test", email: "test@example.com")
    let token = generateToken(user)
    
    check(token.len > 0)
    
    let decoded = verifyToken(token)
    check(decoded.isOk)
    check(decoded.get.username == "test")
```

### 2. Frontend Testing (TypeScript)
```typescript
// __tests__/components/UserList.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserList } from '../components/UserList';
import { mockUsers } from '../__mocks__/users';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

describe('UserList Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    jest.clearAllMocks();
  });

  it('should display loading state initially', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <UserList companyId={1} />
      </QueryClientProvider>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should display users after loading', async () => {
    // Mock API call
    jest.spyOn(usersApi, 'getByCompany').mockResolvedValue({
      data: mockUsers,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <UserList companyId={1} />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(mockUsers[0].username)).toBeInTheDocument();
    });
  });
});
```

### 3. Integration Testing
```bash
# E2E тестове с Playwright или Cypress
# tests/e2e/user-journey.spec.ts
import { test, expect } from '@playwright/test';

test.describe('User Authentication Flow', () => {
  test('should login and create journal entry', async ({ page }) => {
    // Отвори приложението
    await page.goto('/');
    
    // Login
    await page.fill('[data-testid=username]', 'admin');
    await page.fill('[data-testid=password]', 'admin123');
    await page.click('[data-testid=login-button]');
    
    // Провери дали е логнат
    await expect(page.locator('[data-testid=dashboard]')).toBeVisible();
    
    // Създай journal entry
    await page.click('[data-testid=new-journal-entry]');
    await page.fill('[data-testid=description]', 'Test Entry');
    await page.fill('[data-testid=amount]', '100');
    await page.click('[data-testid=save]');
    
    // Провери дали е създаден
    await expect(page.locator('text=Test Entry')).toBeVisible();
  });
});
```

---

## Security Guidelines

### 1. Authentication & Authorization
```nim
# Винаги валидирай JWT token в middleware
proc authMiddleware*(request: Request): Future[Response] {.async.} =
  let authHeader = request.headers.getOrDefault("Authorization")
  
  if authHeader.len == 0 or not authHeader.startsWith("Bearer "):
    return newResponse(Http401, %{"error": "Missing authorization header"})
  
  let token = authHeader[7..authHeader.high]  # Remove "Bearer "
  
  let userResult = verifyToken(token)
  if userResult.isErr:
    return newResponse(Http401, %{"error": "Invalid token"})
  
  # Добави user към request context
  request.ctx["user"] = userResult.get()
  return await nextHandler(request)
```

### 2. Input Validation
```nim
# Винаги валидирай входни данни
proc validateJournalEntry*(entry: JournalEntryInput): Result[void, string] =
  if entry.documentNumber.len == 0:
    return failure("Document number is required")
  
  if entry.totalAmount <= 0:
    return failure("Amount must be positive")
  
  if entry.lines.len < 2:
    return failure("Journal entry must have at least 2 lines")
  
  # Провери дали дебита и кредита са равни
  var totalDebit = 0.0
  var totalCredit = 0.0
  
  for line in entry.lines:
    totalDebit += line.debitAmount
    totalCredit += line.creditAmount
  
  if abs(totalDebit - totalCredit) > 0.01:
    return failure("Debit and credit amounts must balance")
  
  return success()
```

### 3. SQL Injection Prevention
```nim
# Използвай параметризирани заявки винаги
proc getAccountsByCompany*(companyId: int64): seq[Account] =
  let db = openDb()
  try:
    var accounts = @[newAccount()]
    # Правилно - използва параметри
    db.select(accounts, "company_id = $1 AND active = true", companyId)
    
    # Грешно - уязвимо на SQL injection
    # let query = "company_id = " & $companyId & " AND active = true"
    # db.select(accounts, query)
    
    return accounts
  finally:
    close(db)
```

---

## Performance Guidelines

### 1. Database Optimization
```nim
# Използвай connection pool
proc getDbConn(): DbConn =
  return pool.getConnection()

# Pagination за големи резултати
proc getJournalEntries*(companyId: int64, page: int, limit: int): PaginatedResult[JournalEntry] =
  let offset = (page - 1) * limit
  let db = getDbConn()
  try:
    var entries = @[newJournalEntry()]
    db.select(entries, """
      SELECT * FROM journal_entries 
      WHERE company_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    """, companyId, limit, offset)
    
    # Вземи общия брой
    let total = db.getValue("""
      SELECT COUNT(*) FROM journal_entries 
      WHERE company_id = $1
    """, companyId).parseInt()
    
    return PaginatedResult[JournalEntry](
      items: entries,
      total: total,
      page: page,
      limit: limit
    )
  finally:
    pool.returnConnection(db)
```

### 2. Frontend Performance
```typescript
// React.memo за компоненти
export const UserListItem = React.memo<UserListItemProps>(({ user, onSelect }) => {
  return (
    <div onClick={() => onSelect(user)}>
      {user.username}
    </div>
  );
});

// useMemo за скъпи изчисления
const ExpensiveComponent: React.FC<{ data: number[] }> = ({ data }) => {
  const expensiveValue = useMemo(() => {
    console.log('Expensive calculation');
    return data.reduce((sum, item) => sum + item * Math.sqrt(item), 0);
  }, [data]);

  return <div>Result: {expensiveValue}</div>;
};

// useCallback за функции
const ParentComponent: React.FC = () => {
  const [count, setCount] = useState(0);
  
  const handleUserSelect = useCallback((user: User) => {
    console.log('Selected:', user.username);
  }, []);  // Празен dependency array

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>
        Count: {count}
      </button>
      <UserList onUserSelect={handleUserSelect} />
    </div>
  );
};
```

---

## Documentation Requirements

### 1. Code Documentation
```nim
## API endpoint for creating a new journal entry.
## 
## This endpoint creates a new journal entry with the provided data.
## The entry is initially created in draft mode and must be posted
## separately to affect the general ledger.
## 
## Request body:
## ```json
## {
##   "documentNumber": "INV-001",
##   "description": "Invoice for services",
##   "totalAmount": 1000.00,
##   "companyId": 1,
##   "lines": [
##     {
##       "accountId": 401,
##       "debitAmount": 1000.00,
##       "creditAmount": 0.00
##     },
##     {
##       "accountId": 601,
##       "debitAmount": 0.00,
##       "creditAmount": 1000.00
##     }
##   ]
## }
## ```
## 
## Responses:
## - 201: Entry created successfully
## - 400: Invalid input data
## - 401: Unauthorized
## - 500: Server error
proc createJournalEntry*(request: Request): Future[Response] {.async.} =
  # Implementation
```

### 2. API Documentation
- Всички REST endpoints трябва да имат OpenAPI/Swagger документация
- GraphQL schema трябва да е добре документиран
- Примери за request/response

---

## Translation Guidelines

### 1. Adding New Translations
```typescript
// frontend/public/locales/en/translation.json
{
  "journal": {
    "title": "Journal Entries",
    "new_entry": "New Entry",
    "entry_number": "Entry #{{number}}",
    "validation": {
      "required": "This field is required",
      "amount_positive": "Amount must be positive",
      "balanced": "Debit and credit must balance"
    }
  }
}

// frontend/public/locales/bg/translation.json
{
  "journal": {
    "title": "Счетоводен дневник",
    "new_entry": "Нов запис",
    "entry_number": "Запис №{{number}}",
    "validation": {
      "required": "Това поле е задължително",
      "amount_positive": "Сумата трябва да е положителна",
      "balanced": "Дебит и кредит трябва да са балансирани"
    }
  }
}
```

### 2. Usage in Components
```typescript
import { useTranslation } from 'react-i18next';

const JournalForm: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('journal.title')}</h1>
      <label>{t('journal.entry_number', { number: entry.number })}</label>
      <span className="error">{t('journal.validation.required')}</span>
    </div>
  );
};
```

---

## Development Environment Setup

### 1. Prerequisites
- Nim 2.2.4+
- Node.js 18+
- PostgreSQL 15+
- Git

### 2. Quick Setup Script
```bash
#!/bin/bash
# setup-dev.sh

echo "Setting up Baraba development environment..."

# Инсталирай Nim
if ! command -v nim &> /dev/null; then
    echo "Installing Nim..."
    curl https://nim-lang.org/choosenim/init.sh -sSf | sh
    source ~/.bashrc
    choosenim stable
fi

# Инсталирай dependencies
cd backend
nimble install -y

cd ../frontend
npm install

# Setup database
createdb baraba_dev
./bin/migrate

echo "Development environment ready!"
echo "Backend: cd backend && nim c src/baraba.nim && ./baraba"
echo "Frontend: cd frontend && npm run dev"
```

---

## Review Process

### 1. Code Review Checklist
- [ ] Code follows style guidelines
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] Translations are added/updated
- [ ] Security implications considered
- [ ] Performance impact assessed
- [ ] Error handling is proper
- [ ] Database migrations provided (if needed)

### 2. Release Process
1. Все промени са в `develop` branch
2. Интеграционни тестове преминават
3. Code review е завършен
4. Merge към `main`
5. Tag-ване на версия (v1.0.0)
6. Deployment на production

Тези насоки осигуряват consistent, maintainable и secure код за Baraba проекта.