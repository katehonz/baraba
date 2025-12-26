# Архитектура на Baraba System

Този документ описва подробно архитектурата на **Baraba accounting system**, представляваща **хибридна архитектура** от Elixir Phoenix ядро и запазени Nim микросървизи за специализирани функции.

## High-Level Architecture

**🎯 Хибридна архитектура - най-доброто от два свята:**

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                             │
│              React + TypeScript + Chakra UI               │
│                        Port 5173                           │
└─────────────────────┬───────────────────────────────────────┘
                        │ HTTP/WebSocket
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                 Elixir Phoenix Core                        │
│                 Phoenix Endpoint                           │
│                        Port 4000                           │
│  💪 Основна счетоводна логика и бизнес правила            │
└─────────────────────┬───────────────────────────────────────┘
                        │
           ┌────────────┼──────────────────┬─────────────────┐
           ▼            ▼                  ▼                 ▼
 ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
 │  Elixir     │ │   Java      │ │    Nim      │ │   Java       │
 │  Phoenix    │ │  Scanner    │ │ Identity    │ │  Jasper      │
 │  Core       │ │  Service    │ │ Service     │ │ Service      │
 │             │ │             │ │             │ │              │
 │ • 🆕 Core   │ │ • QR/Doc    │ │ • JWT Auth  │ │ • PDF        │
 │   Logic     │ │   Scan      │ │ • Users     │ │   Reports    │
 │ • 🆕 Fixed  │ │ Port 5001   │ │ • Groups    │ │ • Jasper     │
 │   Assets    │ │             │ │ Port 5002   │ │   Templates  │
 │ • 🆕 Stock  │ │ • ✅ Migrated│ │ • 🎯 Fast   │ │ Port 5005    │
 │   Mgmt      │ │   to Java   │ │   Native    │ │              │
 │ • REST API  │ │             │ │ • 🎯 Kept   │ │ • ✅ Kept    │
 │ • SAFT XML  │ │             │ │   as Nim    │ │   as Java    │
 │ Port 4000   │ │             │ │             │ │              │
 │ Port 5006   │ └─────────────┘ └─────────────┘ └─────────────┘
 └─────────────┘         Port 5001       Port 5002       Port 5005
           │
    ┌────────┼───────────────────────────────────┐
    ▼        ▼                                   ▼
┌─────────────┐ ┌─────────────┐           ┌─────────────┐
│    Nim      │ │    Nim      │           │ PostgreSQL  │
│  VIES       │ │   VAT       │           │ Database    │
│  Service    │ │  Service    │           │             │
│             │ │             │           │ • 🔄 20+    │
│ • EU VAT    │ │ • Bulgarian │   tables   │   tables    │
│   Validation│ │   VAT Rules │             │ • Companies │
│ • 🎯 Fast   │ │ • Calculations│ │ • Accounts  │
│   Native    │ │ Port 5004   │ │ • Journal   │
│ • 🎯 Kept   │ │             │ │   Entries   │
│   as Nim    │ └─────────────┘ │ • 🆕 Fixed  │
│ Port 5003   │                 │   Assets    │
└─────────────┘                 │ • 🆕 Stock  │
                                 │   Data      │
                                 └─────────────┘
                                   Port 5432
```

## Architectural Principles

### 1. 🎯 **Hybrid Technology Stack (STRATEGIC DECISION)**
- **Elixir Phoenix**: Core бизнес логика и concurrency (порт 4000, 5006)
- **Nim микросървизи**: Специализирани services с native performance (портове 5001-5004)
- **Java Jasper Service**: Enterprise PDF генерация (порт 5005)
- **React Frontend**: Модерен UI с TypeScript (порт 5173)
- **Предимства**: Всяка технология прави това, при което е най-добра

### 2. Separation of Concerns
Всяка услуга има ясна отговорност:
- **Elixir Phoenix Core**: Счетоводна логика, FIRs, основни бизнес операции
- **Nim микросървизи**: Специализирани задачи (authentication, VAT, QR, EU validation)
- **Jasper Service**: PDF генерация и отчети (Java enterprise grade)
- **Frontend**: React TypeScript интерфейс с Chakra UI

### 3. 🎯 **Domain-Driven Design (HYBRID APPROACH)**
```
Elixir Phoenix Domain (Core Business Logic):
├── Companies & Accounts (основни счетоводни обекти)
├── Journal Entries & Entry Lines (двойно счетоводство)
├── Fixed Assets & Stock Management (нови модули)
├── Exchange Rates (нов модул)
└── SAF-T XML Generation (български НАП стандарт)

Nim Services (Specialized Functions):
├── identity_service (5002) - JWT authentication & user management
├── vat_service (5004) - Bulgarian VAT rules & calculations
└── vies_service (5003) - EU VAT number validation

Java Services (Specialized Functions):
├── scanner_service_java (5001) - QR code & document scanning with Azure OCR
└── jasper_service (5005) - PDF reports & Jasper Templates

Java Service (Enterprise):
└── jasper_service (5005) - PDF reports & Jasper Templates
```

### 4. 🔧 **Technology Trade-offs (OPTIMIZED ARCHITECTURE)**
- **Не се пренаписва работещ Nim код** - запазва performance и stability
- **Бързо VPS компилиране** - само Elixir core се рекомпилира
- **Специализация** - всяка технология за най-подходящите задачи
- **Production готови микросървизи** - Nim services са стабилни и бързи

## Backend Architecture

### Phoenix Umbrella Structure

```
baraba_umbrella/
├── apps/
│   ├── baraba_umbrella/           # Core Domain
│   │   ├── lib/
│   │   │   └── baraba_umbrella/
│   │   │       ├── accounting.ex
│   │   │       ├── companies.ex
│   │   │       ├── accounts.ex
│   │   │       └── journal_entries.ex
│   │   └── priv/repo/migrations/
│   │
│   ├── baraba_umbrella_web/       # Web Layer
│   │   ├── lib/
│   │   │   └── baraba_umbrella_web/
│   │   │       ├── controllers/
│   │   │       │   ├── companies_controller.ex
│   │   │       │   ├── accounts_controller.ex
│   │   │       │   └── journal_entries_controller.ex
│   │   │       ├── views/
│   │   │       └── router.ex
│   │   └── priv/static/
│   │
│   └── saft/                      # SAF-T Service
│       ├── lib/saft/
│       │   ├── application.ex
│       │   ├── xml_generator.ex
│       │   └── bg_saf_t_schema.ex
│       └── priv/static/
│
└── config/
```

### Context Pattern

```elixir
defmodule BarabaUmbrella.Accounting do
  @moduledoc """
  The Accounting context.
  """

  alias BarabaUmbrella.Repo
  alias BarabaUmbrella.Accounting.{Company, Account, JournalEntry, AccountingPeriod}

  @doc """
  Creates a journal entry with balance validation.
  """
  def create_journal_entry(attrs) do
    Multi.new()
    |> Multi.insert(:journal_entry, JournalEntry.changeset(%JournalEntry{}, attrs))
    |> Multi.run(:entry_lines, &create_entry_lines/2)
    |> Multi.run(:validate_balance, &validate_entry_balance/2)
    |> Repo.transaction()
  end
end
```

## Frontend Architecture

### Component-Based Architecture

```
src/
├── components/                    # Reusable Components
│   ├── ui/                       # Base UI (Button, Input, etc.)
│   ├── forms/                    # Form-specific components
│   └── layout/                   # Layout components
│
├── pages/                         # Page Components
│   ├── Dashboard/
│   ├── Companies/
│   ├── JournalEntries/
│   └── Reports/
│
├── api/                          # API Layer
│   ├── client.ts                 # HTTP client
│   ├── companies.ts              # Company API
│   └── accounts.ts              # Account API
│
├── contexts/                     # State Management
│   ├── AuthContext.tsx
│   └── NotificationContext.tsx
│
├── types/                        # TypeScript Definitions
│   ├── company.ts
│   ├── account.ts
│   └── journal-entry.ts
│
└── utils/                        # Utility Functions
    ├── validation.ts
    └── formatting.ts
```

### State Management Pattern

```typescript
// React Context + Reducer pattern
interface AccountingState {
  companies: Company[];
  currentCompany: Company | null;
  loading: boolean;
  error: string | null;
}

const AccountingContext = createContext<AccountingContextType>({
  state: initialState,
  dispatch: () => {}
});

const accountingReducer = (
  state: AccountingState, 
  action: AccountingAction
): AccountingState => {
  switch (action.type) {
    case 'LOAD_COMPANIES_SUCCESS':
      return { ...state, companies: action.payload, loading: false };
    default:
      return state;
  }
};
```

## Data Flow Architecture

### Request Flow

```
1. User Action (React Component)
   ↓
2. API Client (axios)
   ↓
3. Phoenix Router
   ↓
4. Controller (validation, parsing)
   ↓
5. Context (business logic)
   ↓
6. Ecto (database operations)
   ↓
7. Database (PostgreSQL)
   ↓
8. Response (JSON)
   ↓
9. UI Update (React)
```

### WebSocket Architecture (Future)

```elixir
# Phoenix Channels за real-time updates
defmodule BarabaUmbrellaWeb.AccountingChannel do
  use Phoenix.Channel

  def join("accounting:" <> company_id, _params, socket) do
    {:ok, assign(socket, :company_id, company_id)}
  end

  def handle_in("journal_entry_created", entry, socket) do
    broadcast!(socket, "journal_entry_created", entry)
    {:noreply, socket}
  end
end
```

## Database Architecture

### Schema Design

```sql
-- Core entities
companies (id, name, vat_number, address, ...)
accounts (id, company_id, number, name, account_type, ...)
counterparts (id, company_id, name, vat_number, type, ...)

-- Journaling system
journal_entries (id, company_id, date, description, status, ...)
entry_lines (id, journal_entry_id, account_id, counterpart_id, 
             debit, credit, description, ...)

-- Configuration
vat_rates (id, company_id, name, rate, valid_from, valid_until, ...)
```

### Relationship Patterns

```
Companies 1:N Accounts (счетоводен план)
Companies 1:N Journal Entries (журнални записи)
Companies 1:N Counterparts (контрагенти)
Journal Entries 1:N Entry Lines (редове от записи)
Entry Lines → Accounts (сметка на записа)
Entry Lines → Counterparts (контрагент на записа)
```

## Service Integration Patterns

### 1. **Elixir ↔ Nim Services Integration**
```elixir
# Identity Service (Nim) integration за JWT validation
def validate_user_token(token) do
  case HTTPoison.get(
    "#{identity_service_url()}/api/auth/validate",
    [{"Authorization", "Bearer #{token}"}]
  ) do
    {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
      {:ok, Jason.decode!(body)}
    {:error, reason} ->
      {:error, :invalid_token}
  end
end

# VAT Service (Nim) integration за Bulgarian VAT rules
def calculate_bulgarian_vat(entry_data) do
  case HTTPoison.post(
    "#{vat_service_url()}/api/vat/calculate",
    Jason.encode!(entry_data),
    [{"Content-Type", "application/json"}]
  ) do
    {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
      {:ok, Jason.decode!(body)}
    {:error, reason} ->
      {:error, reason}
  end
end

# VIES Service (Nim) integration за EU VAT validation
def validate_eu_vat(vat_number) do
  case HTTPoison.get(
    "#{vies_service_url()}/api/vat/validate/#{vat_number}"
  ) do
    {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
      {:ok, Jason.decode!(body)}
    {:error, reason} ->
      {:error, reason}
  end
end
```

### 2. **Elixir ↔ Java Jasper Service Integration**
```elixir
# Jasper Service integration за PDF генерация
def generate_financial_report(company_id, report_type) do
  case HTTPoison.post(
    "#{jasper_service_url()}/api/reports/#{report_type}",
    Jason.encode!(%{company_id: company_id}),
    [{"Content-Type", "application/json"}]
  ) do
    {:ok, %HTTPoison.Response{status_code: 200, body: pdf_binary}} ->
      {:ok, pdf_binary}
    {:error, reason} ->
      {:error, reason}
  end
end
```

### 2. Asynchronous Message Queue (Future)
```elixir
# GenStage background processing
defmodule BarabaUmbrella.ReportGenerator do
  use GenStage

  def start_link(_) do
    GenStage.start_link(__MODULE__, :ok, name: __MODULE__)
  end

  def init(:ok) do
    {:producer_consumer, %{}, subscribe_to: [JournalEntryProducer]}
  end

  def handle_events(events, _from, state) do
    reports = Enum.map(events, &generate_report/1)
    {:noreply, reports, state}
  end
end
```

## Security Architecture

### Authentication Flow (Future)

```
1. User Login Request
   ↓
2. Phoenix Auth Controller
   ↓
3. Guardian JWT Generation
   ↓
4. JWT Token Response
   ↓
5. Client Storage (httpOnly cookie)
   ↓
6. Subsequent API Calls with JWT
   ↓
7. JWT Validation Middleware
   ↓
8. Resource Access
```

### Authorization Patterns

```elixir
# Plug-based authorization
defmodule BarabaUmbrellaWeb.Plugs.Authorization do
  import Plug.Conn

  def init(opts), do: opts

  def call(conn, _opts) do
    user = conn.assigns.current_user
    company_id = conn.params["company_id"]

    if has_company_access?(user, company_id) do
      conn
    else
      conn |> send_resp(403, "Forbidden") |> halt()
    end
  end

  defp has_company_access?(user, company_id) do
    user.company_id == company_id or user.role == :admin
  end
end
```

## Performance Architecture

### Database Optimization Strategies

1. **Indexing Strategy**
```sql
-- Composite indexes за често заявявани филтри
CREATE INDEX idx_journal_entries_company_date 
ON journal_entries(company_id, date DESC);

-- Partial indexes за performance
CREATE INDEX idx_active_accounts 
ON accounts(company_id, number) 
WHERE is_active = true;
```

2. **Query Optimization**
```elixir
# Ecto query optimization
def list_journal_entries_with_lines(company_id, opts \\ []) do
  from(je in JournalEntry,
    where: je.company_id == ^company_id,
    preload: [:entry_lines],
    order_by: [desc: je.date]
  )
  |> apply_filters(opts)
  |> Repo.all()
end
```

3. **Connection Pooling**
```elixir
# Database pool configuration
config :baraba_umbrella, BarabaUmbrella.Repo,
  pool_size: 20,
  ownership_timeout: 60_000,
  queue_target: 5_000,
  queue_interval: 1_000
```

### Caching Strategy

1. **Multi-level Caching**
```
Browser Cache (static assets)
    ↓
CDN Cache (global distribution)
    ↓
Application Cache (ETS/Redis)
    ↓
Database Cache (query results)
```

2. **Cache Keys Pattern**
```elixir
defmodule BarabaUmbrella.Cache do
  def cache_key(:companies, company_id), do: "companies:#{company_id}"
  def cache_key(:accounts, company_id), do: "accounts:#{company_id}"
  def cache_key(:journal_entries, {company_id, year, month}), 
    do: "journal_entries:#{company_id}:#{year}:#{month}"
end
```

## Scalability Architecture

### Horizontal Scaling Strategy

```
Load Balancer (Nginx)
    ↓
┌─────────────────────────────────────────┐
│          Phoenix Cluster                │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  │
│  │Node 1   │  │Node 2   │  │Node 3   │  │
│  │4001     │  │4002     │  │4003     │  │
│  └─────────┘  └─────────┘  └─────────┘  │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│            PostgreSQL Cluster           │
│  ┌─────────┐    ┌─────────────────────┐  │
│  │Primary  │────│  Read Replicas     │  │
│  │ (RW)    │    │    (RO)            │  │
│  └─────────┘    └─────────────────────┘  │
└─────────────────────────────────────────┘
```

### Database Partitioning Strategy

```sql
-- Partition по години за големи таблици
CREATE TABLE journal_entries_2024 
PARTITION OF journal_entries
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE journal_entries_2025 
PARTITION OF journal_entries
FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
```

## Monitoring & Observability

### Telemetry Architecture

```elixir
# Phoenix Telemetry integration
defmodule BarabaUmbrella.Telemetry do
  def setup do
    :telemetry.attach_many(
      "phoenix-requests",
      [
        [:phoenix, :endpoint, :stop],
        [:phoenix, :router_dispatch, :stop],
        [:ecto, :query, :stop]
      ],
      &BarabaUmbrella.TelemetryHandler.handle_event/4,
      nil
    )
  end
end
```

### Logging Architecture

```
Application Logs (structured JSON)
    ↓
Log Shipper (Filebeat)
    ↓
Log Aggregation (ELK Stack)
    ↓
Visualization & Alerting (Kibana)
```

## Deployment Architecture

### Container Orchestration

```yaml
# docker-compose.production.yml
version: '3.8'
services:
  phoenix_app:
    image: baraba/phoenix:latest
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
    depends_on:
      - postgres
      
  postgres:
    image: postgres:15
    deploy:
      replicas: 1
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

### CI/CD Pipeline

```
Git Push
    ↓
GitHub Actions (CI)
    ├─ Run Tests
    ├─ Security Scan
    ├─ Build Images
    └─ Push to Registry
    ↓
ArgoCD (CD)
    ├─ Deploy to Staging
    ├─ Run E2E Tests
    └─ Deploy to Production
```

## Future Architectural Considerations

### 1. Event Sourcing (Future)
```elixir
# Event-driven architecture
defmodule BarabaUmbrella.JournalEntry.Events do
  defmodule Created do
    @enforce_keys [:journal_entry_id, :company_id, :date]
    defstruct [:journal_entry_id, :company_id, :date]
  end
  
  defmodule Posted do
    @enforce_keys [:journal_entry_id, :posted_at]
    defstruct [:journal_entry_id, :posted_at]
  end
end
```

### 2. GraphQL API (Future)
```elixir
# Absinthe integration
defmodule BarabaUmbrellaWeb.Schema do
  use Absinthe.Schema

  query do
    field :companies, list_of(:company) do
      resolve &Resolvers.Accounting.list_companies/2
    end
  end
end
```

### 3. Microservices Migration (Future)
```
Current (Monolithic DB) → Future (Bounded Contexts)

Accounting Service        → accounting_db
Reporting Service         → reporting_db  
User Management Service   → users_db
Integration Service        → integration_db
```

## Architecture Trade-offs

### Decision Matrix

| Decision | Pros | Cons | Rationale |
|----------|------|------|-----------|
| Shared DB | Strong consistency, simple joins | Coupling, scaling complexity | Accounting requires ACID transactions |
| Phoenix + React | Productive, good tooling | Separate codebases | Best of both worlds for team skills |
| Docker | Consistent environment, deployment | Learning curve | Industry standard for microservices |
| REST API | Simple, well-understood | Less flexible than GraphQL | Fits current needs, easier to secure |

### Technical Debt Considerations

1. **Current**: Database coupling между services
   **Future**: Event-driven architecture със bounded contexts
   
2. **Current**: REST API за всички операции
   **Future**: GraphQL за complex queries + REST за CRUD
   
3. **Current**: Monolithic frontend
   **Future**: Micro-frontends за large teams

Тази архитектура е проектирана да бъде evolvable - да може да расте и да се адаптира към нови изисквания, като същевременно поддържа high quality и maintainability.