# Ръководство за разработчици

Това ръководство е предназначено за разработчици, които искат да допринесат към **Baraba accounting system**, успешно мигрирана от Nim към **Elixir Phoenix umbrella архитектура**.

## Предварителни изисквания

### Необходимо софтуерно осигуряване
- **Elixir** 1.15+ и OTP 26+
- **Erlang/OTP** 26+
- **PostgreSQL** 14+
- **Node.js** 18+ (за frontend разработка)
- **Docker** и Docker Compose
- **Git** 2.30+

### Препоръчителни инструменти
- **VS Code** с Elixir и TypeScript extensions
- **Postman** или Insomnia за API тестване
- **pgAdmin** или DBeaver за database управление
- **iex** за Elixir debugging

## Настройка на development среда

### 1. Клониране на репозиторито
```bash
git clone <repository-url>
cd baraba-ub
```

### 2. Стартиране с Docker (препоръчително)
```bash
# Стартиране на всички услуги (опростено след миграция)
docker-compose up -d

# Проверка на статус
docker-compose ps

# Следене на логове
docker-compose logs -f phoenix_app    # 🔄 Обединен Elixir app
docker-compose logs -f jasper_service  # Запазен Java service
docker-compose logs -f frontend        # React development
```

### 3. Локална разработка (без Docker)

#### Backend setup (🔄 Elixir Phoenix umbrella)
```bash
cd baraba_ub  # 🆕 Ново име на директория

# Инсталиране на зависимости за всички apps
mix deps.get

# Настройка на базата данни (мигрирана схема)
mix ecto.setup

# Стартиране на Phoenix сървър (обединен)
mix phx.server

# Ето всички apps са в един процес!
```

#### Frontend setup
```bash
cd frontend

# Инсталиране на npm пакети
npm install

# Стартиране на development сървър
npm run dev
```

## Project Structure

### Elixir Phoenix Umbrella Structure (🔄 Обновена след миграция)
```
baraba_ub/                          # 🆕 Ново име
├── apps/
│   ├── baraba_umbrella/           # Core domain logic (мигриран от Nim)
│   │   ├── lib/
│   │   │   ├── baraba_umbrella/   # Main app modules
│   │   │   │   ├── accounting.ex  # Accounting context
│   │   │   │   ├── companies.ex   # Company management
│   │   │   │   ├── accounts.ex    # Account management
│   │   │   │   └── 🆕 fixed_assets.ex    # OS управление
│   │   │   │   └── 🆕 products.ex        # Склад
│   │   │   └── accounting/         # 🆕 Модулна структура
│   │   │       ├── company.ex     # Ecto schema
│   │   │       ├── account.ex     # Ecto schema
│   │   │       ├── journal_entry.ex # Ecto schema
│   │   │       └── 🆕 product.ex   # Нов schema
│   │   └── priv/
│   │       └── repo/
│   │           └── migrations/    # 🔄 20+ миграции от Nim
│   ├── baraba_umbrella_web/       # Web layer
│   │   ├── lib/
│   │   │   ├── baraba_umbrella_web/
│   │   │   │   ├── controllers/   # API controllers
│   │   │   │   │   └── 🆕 fixed_asset_controller.ex
│   │   │   │   ├── views/         # JSON views
│   │   │   │   └── router.ex      # Routing
│   │   │   └── baraba_umbrella_web.ex
│   │   └── priv/
│   │       └── static/           # Static assets
│   └── saft/                      # SAF-T service (мигриран от Nim)
│       ├── lib/
│       │   └── saft/
│       │       ├── application.ex
│       │       └── xml_generator.ex
│       └── priv/
│           └── static/
├── config/                        # Configuration files
│   ├── config.exs
│   ├── dev.exs
│   └── prod.exs
└── mix.exs                       # Mixfile
```

### Frontend Structure
```
frontend/
├── src/
│   ├── components/               # Reusable components
│   │   ├── ui/                  # Base UI components
│   │   ├── forms/               # Form components
│   │   └── layout/              # Layout components
│   ├── pages/                   # Page components
│   │   ├── Dashboard.tsx
│   │   ├── Companies.tsx
│   │   └── JournalEntries.tsx
│   ├── api/                     # API integration
│   │   ├── client.ts           # HTTP client
│   │   ├── companies.ts        # Company API
│   │   ├── accounts.ts         # Account API
│   │   └── accounting-periods.ts  # 🆕 Period management API
│   ├── types/                  # TypeScript definitions
│   │   ├── company.ts
│   │   └── journal-entry.ts
│   ├── pages/                   # Page components
│   │   ├── Dashboard.tsx
│   │   ├── Companies.tsx
│   │   ├── JournalEntries.tsx
│   │   └── AccountingPeriods.tsx    # 🆕 Period management
│   ├── contexts/               # React contexts
│   │   └── AuthContext.tsx
│   ├── locales/               # Translations
│   │   ├── bg.json
│   │   └── en.json
│   ├── App.tsx               # Main App component
│   ├── main.tsx              # Entry point
│   └── i18n.ts               # i18n configuration
├── public/                    # Static files
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
└── vite.config.ts            # Vite configuration
```

## 🆕 Accounting Periods Functionality

### Overview
The accounting periods feature provides **period locking** to prevent modifications to journal entries in closed periods. This is critical for maintaining data integrity after VAT submissions.

### Key Components

#### Backend (Elixir Phoenix)
```elixir
# Schema Location
apps/baraba_umbrella/lib/baraba_umbrella/accounting/accounting_period.ex

# Context Functions
defmodule BarabaUmbrella.Accounting do
  def is_period_open?(company_id, date)
  def close_accounting_period(period, user_id, notes)
  def validate_accounting_date(company_id, date)
end

# API Endpoints
GET /api/companies/:id/accounting-periods
POST /api/companies/:id/accounting-periods/close/:year/:month
POST /api/companies/:id/accounting-periods/reopen/:year/:month
```

#### Frontend (React TypeScript)
```typescript
// API Client Location
frontend/src/api/accounting-periods.ts

// React Component Location  
frontend/src/pages/AccountingPeriodsPage.tsx

// Navigation Integration
Sidebar -> FiCalendar icon -> /accounting-periods
```

### Usage Examples

#### Creating a Period
```elixir
{:ok, period} = Accounting.create_accounting_period(%{
  company_id: company.id,
  year: 2025,
  month: 12,
  status: "OPEN"
})
```

#### Closing a Period
```elixir
{:ok, closed_period} = Accounting.close_accounting_period(
  period, 
  user_id, 
  "Closing period for VAT submission"
)
```

#### Period Validation (Automatic)
```elixir
# This will fail if the period is closed
{:error, "Accounting period for 2025-12-15 is closed"} = 
  Accounting.create_journal_entry(%{
    company_id: company.id,
    accounting_date: ~D[2025-12-15],
    # ... other fields
  })
```

#### Frontend Usage
```typescript
// Fetch periods
const periods = await accountingPeriodsApi.getAccountingPeriods(companyId, {
  year: 2025,
  status: 'OPEN'
});

// Close period
await accountingPeriodsApi.closeAccountingPeriod(
  companyId, 
  2025, 
  12, 
  userId, 
  "Period closed for audit"
);
```

### Database Schema
```sql
CREATE TABLE accounting_periods (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'OPEN',
  closed_by_id UUID,
  closed_at TIMESTAMP,
  notes TEXT,
  UNIQUE(company_id, year, month)
);
```

## Кодиращи конвенции

### Elixir/Phoenix

#### Naming conventions
- **Modules**: PascalCase (`BarabaUmbrella.Accounting`)
- **Functions**: snake_case (`create_journal_entry`)
- **Variables**: snake_case (`company_id`)
- **Files**: snake_case (`journal_entry.ex`)

#### Code organization
```elixir
defmodule BarabaUmbrella.Accounting do
  @moduledoc """
  Accounting context for managing journal entries and accounts.
  """

  alias BarabaUmbrella.Repo
  alias BarabaUmbrella.Accounting.{JournalEntry, EntryLine}

  @doc """
  Creates a new journal entry with validation.
  """
  def create_journal_entry(attrs) do
    %JournalEntry{}
    |> JournalEntry.changeset(attrs)
    |> Repo.insert()
  end
end
```

#### Ecto patterns
```elixir
defmodule BarabaUmbrella.Accounting.JournalEntry do
  use Ecto.Schema
  import Ecto.Changeset

  schema "journal_entries" do
    field :date, :date
    field :description, :string
    belongs_to :company, BarabaUmbrella.Companies.Company
    has_many :entry_lines, BarabaUmbrella.Accounting.EntryLine

    timestamps()
  end

  @doc false
  def changeset(journal_entry, attrs) do
    journal_entry
    |> cast(attrs, [:date, :description, :company_id])
    |> validate_required([:date, :company_id])
    |> validate_balance()
  end

  defp validate_balance(changeset) do
    # Custom validation logic
  end
end
```

### TypeScript/React

#### Component patterns
```typescript
interface CompanyFormProps {
  company?: Company;
  onSubmit: (company: CompanyFormData) => void;
  isLoading?: boolean;
}

export const CompanyForm: React.FC<CompanyFormProps> = ({
  company,
  onSubmit,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<CompanyFormData>({
    name: company?.name || '',
    vatNumber: company?.vatNumber || '',
    address: company?.address || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <FormControl isRequired>
        <FormLabel>Име на фирма</FormLabel>
        <Input
          value={formData.name}
          onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
        />
      </FormControl>
    </form>
  );
};
```

#### API client patterns
```typescript
// src/api/client.ts
import axios, { AxiosInstance, AxiosResponse } from 'axios';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:4000/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error);
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string): Promise<T> {
    const response = await this.client.get<T>(url);
    return response.data;
  }

  async post<T>(url: string, data: any): Promise<T> {
    const response = await this.client.post<T>(url, data);
    return response.data;
  }
}

export const apiClient = new ApiClient();
```

## Тестване

### Backend тестове

#### Unit тестове
```elixir
defmodule BarabaUmbrella.AccountingTest do
  use BarabaUmbrella.DataCase

  alias BarabaUmbrella.Accounting

  describe "journal entries" do
    test "create_journal_entry/1 with valid data creates a journal entry" do
      attrs = %{
        date: ~D[2024-01-15],
        description: "Test entry",
        company_id: company.id
      }

      assert {:ok, %JournalEntry{} = journal_entry} = Accounting.create_journal_entry(attrs)
      assert journal_entry.date == ~D[2024-01-15]
      assert journal_entry.description == "Test entry"
    end
  end
end
```

#### Integration тестове
```elixir
defmodule BarabaUmbrellaWeb.CompaniesControllerTest do
  use BarabaUmbrellaWeb.ConnCase

  describe "POST /api/companies" do
    test "creates company with valid data", %{conn: conn} do
      attrs = %{
        name: "Test Company",
        vat_number: "BG123456789",
        address: "Test Address"
      }

      conn = post(conn, Routes.company_path(conn, :create), company: attrs)
      
      assert %{"id" => id} = json_response(conn, 201)["data"]
      assert json_response(conn, 201)["data"]["attributes"]["name"] == "Test Company"
    end
  end
end
```

### Frontend тестове

#### Component тестове
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { CompanyForm } from './CompanyForm';

describe('CompanyForm', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  test('renders form fields correctly', () => {
    render(<CompanyForm onSubmit={mockOnSubmit} />);
    
    expect(screen.getByLabelText('Име на фирма')).toBeInTheDocument();
    expect(screen.getByLabelText('ДДС номер')).toBeInTheDocument();
  });

  test('submits form with correct data', () => {
    render(<CompanyForm onSubmit={mockOnSubmit} />);
    
    fireEvent.change(screen.getByLabelText('Име на фирма'), {
      target: { value: 'Test Company' }
    });
    
    fireEvent.click(screen.getByRole('button', { name: /изпрати/i }));
    
    expect(mockOnSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Test Company' })
    );
  });
});
```

## Debugging

### Backend debugging

#### IEx console
```bash
# Start IEx with app
iex -S mix

# Connect to running node
iex --name debug@127.0.0.1 --cookie secret --remesh baraba@127.0.0.1

# Debug queries
Repo.all(Company) |> Ecto.Explain.log()
```

#### Logger debugging
```elixir
# In development config
config :logger, level: :debug

# In code
require Logger
Logger.debug("Processing journal entry: #{inspect(entry)}")
```

### Frontend debugging

#### React DevTools
- Инсталирайте React Developer Tools extension
- Използвайте React компонент tree за debugging
- Проверете props и state

#### Network debugging
- Chrome DevTools Network tab
- Проверете API calls и responses
- Използвайте console.log за debugging

## Performance optimization

### Backend оптимизация

#### Database queries
```elixir
# Bad: N+1 queries
companies = Repo.all(Company)
Enum.map(companies, fn company -> 
  Repo.preload(company, :accounts)
end)

# Good: Preload with single query
Repo.all(Company) |> Repo.preload(:accounts)
```

#### Caching
```elixir
# ETS cache
def get_vat_rates do
  case :ets.lookup(:cache, :vat_rates) do
    [{:vat_rates, rates}] -> rates
    [] -> 
      rates = fetch_vat_rates()
      :ets.insert(:cache, {:vat_rates, rates})
      rates
  end
end
```

### Frontend оптимизация

#### React optimization
```typescript
// Use React.memo for component memoization
const CompanyListItem = React.memo<{ company: Company }>(({ company }) => {
  return (
    <div>
      <h3>{company.name}</h3>
      <p>{company.vatNumber}</p>
    </div>
  );
});

// Use useMemo for expensive calculations
const expensiveValue = useMemo(() => {
  return calculateExpensiveValue(data);
}, [data]);
```

## Deployment

### Pre-deployment checklist
- [ ] Всички тестове преминават
- [ ] Code review е завършен
- [ ] Database миграции са тествани
- [ ] Environment променливи са конфигурирани
- [ ] Monitoring е настроен
- [ ] Backup plan е готов

### Production deployment
```bash
# Build and deploy
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Run database migrations
docker-compose exec phoenix_app mix ecto.migrate

# Check deployment status
docker-compose ps
```

## Добри практики

### Git workflow
1. Създавайте feature branches от `main`
2. Използвайте смислени commit съобщения
3. Пишете comprehensive pull request описания
4. Изисквайте code review за всички промени
5. Тествайте преди merge

### Code review
- Проверявайте за performance проблеми
- Уверете се, че тестовете покриват новия код
- Проверете за security уязвимости
- Валидирайте business logic
- Проверявайте documentation

### Documentation
- Документирайте сложни business rules
- Обяснявайте архитектурни решения
- Поддържайте README файлове актуални
- Добавяйте inline comments за сложен код

## Въпроси и поддръжка

За въпроси relative към разработката:
- Създайте GitHub issue за bug репорти
- Използвайте Discord канала за общи въпроси
- Консултирайте техническата документация
- Проверете съществуващите pull requests за подобни проблеми