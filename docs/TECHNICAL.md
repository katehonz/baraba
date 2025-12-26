# Техническа документация

## 🚀 Архитектура на системата

**Baraba е успешно мигрирана от Nim полиглот микросървиси към Elixir Phoenix umbrella архитектура.** Системата е проектирана да бъде мащабируема, отказоустойчива и лесна за поддръжка с единен Elixir ecosystem.

## Компоненти на системата

### 1. Elixir Phoenix Umbrella (baraba_umbrella)

#### Основно приложение (apps/baraba_umbrella)
Това е ядрото на системата, съдържащо **пълно мигрирана бизнес логика от Nim**:
- **Ecto Schemas**: Всички бизнес обекти + нови модули
- **Context Modules**: Обединена бизнес логика за счетоводство
- **Database**: PostgreSQL връзки и миграции (20+ миграции)

Ключови модули:
- `BarabaUmbrella.Accounting` - Основен контекст за счетоводни операции
- `BarabaUmbrella.Companies` - Управление на фирми
- `BarabaUmbrella.Accounts` - Счетоводна план
- `BarabaUmbrella.JournalEntries` - Журнални записи
- `BarabaUmbrella.AccountingPeriods` - 🆕 Управление на счетоводни периоди
- `BarabaUmbrella.FixedAssets` - 🆕 Управление на основни средства
- `BarabaUmbrella.Products` - 🆕 Продукти и склад
- `BarabaUmbrella.VATReturns` - 🆕 ДДС декларации

#### Web приложение (apps/baraba_umbrella_web)
REST API слой с:
- **Controllers**: JSON API endpoints
- **Views**: JSON serialization
- **Routes**: API routing конфигурация

Ключови ендпойнти:
- `/api/companies` - CRUD операции за фирми
- `/api/companies/:id/accounts` - Сметки на фирма
- `/api/companies/:id/counterparts` - Контрагенти
- `/api/companies/:id/journal-entries` - Счетоводни записи

#### SAFT Service (apps/saft)
Специализирана услуга за:
- **SAF-T XML генерация** за НАП
- **Bulgarian tax compliance**
- **Plug/Cowboy сървър** на порт 5006

### 2. React Frontend (frontend/)

Модерен single-page application:
- **TypeScript** за type safety
- **Chakra UI** за компоненти
- **Vite** за bundling и development
- **React Router** за навигация
- **i18next** за международнализация

Структура:
```
src/
├── components/     # Reusable UI компоненти
├── pages/         # Page компоненти
├── api/           # API client логика
├── types/         # TypeScript интерфейси
├── contexts/      # React contexts
└── locales/       # Преводи
```

### 3. Jasper Service (jasper_service/)

Java Spring Boot приложение за:
- **PDF генерация** чрез Jasper Reports
- **Финансови отчети**
- **Invoice PDF-и**
- **Custom report templates**

Технологии:
- Spring Boot
- Jasper Reports
- PostgreSQL JDBC
- Maven

## База данни

### Схема (🔄 Пълно мигрирана от Nim ORM към Ecto)

Основни таблици (мигрирани + нови):
```sql
companies              -- Фирми
accounts              -- Сметкоплан
counterparts          -- Контрагенти
vat_rates             -- ДДС ставки
journal_entries       -- Журнални записи (header)
entry_lines           -- Редове от журнален запис
users                 -- Потребители
fixed_assets          -- 🆕 Основни средства
fixed_asset_categories-- 🆕 Категории ОС
products              -- 🆕 Продукти
stock_levels          -- 🆕 Складови наличности
stock_movements       -- 🆕 Движения на стоки
vat_entries           -- 🆕 ДДС събития
vat_returns           -- 🆕 ДДС декларации
currencies            -- 🆕 Валути
exchange_rates        -- 🆕 Валутни курсове
```

### Релации (Мигрирани + Нови)

```
companies 1:N accounts
companies 1:N counterparts
companies 1:N journal_entries
companies 1:N vat_rates
companies 1:N fixed_assets           -- 🆕
companies 1:N products               -- 🆕
companies 1:N vat_returns             -- 🆕

journal_entries 1:N entry_lines
journal_entries 1:N vat_entries       -- 🆕
entry_lines N:1 accounts
entry_lines N:1 counterparts
entry_lines N:1 products              -- 🆕

products 1:N stock_levels            -- 🆕
products 1:N stock_movements         -- 🆕
fixed_assets N:1 fixed_asset_categories-- 🆕
currencies 1:N exchange_rates         -- 🆕
```

### Миграции

Миграциите се намират в:
```
apps/baraba_umbrella/priv/repo/migrations/
```

## API Дизайн

### RESTful конвенции

- `GET /api/resource` - List всички ресурси
- `GET /api/resource/:id` - Вземи конкретен ресурс
- `POST /api/resource` - Създай нов ресурс
- `PUT /api/resource/:id` - Актуализирай ресурс
- `DELETE /api/resource/:id` - Изтрий ресурс

### Response формат

```json
{
  "data": {
    "id": "uuid",
    "type": "company",
    "attributes": {
      "name": "Фирма ООД",
      "vat_number": "BG123456789"
    }
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Error handling

```json
{
  "errors": [
    {
      "code": "validation_error",
      "message": "Invalid VAT number format",
      "field": "vat_number"
    }
  ]
}
```

## Сигурност

### Authentication & Authorization
- JWT токени за authentication
- Роли: admin, accountant, viewer
- Company-scoped достъп

### Data Validation
- Backend валидация в Ecto changesets
- Frontend валидация в React forms
- SQL injection защита чрез Ecto

### HTTPS & Security Headers
- HTTPS за продукция
- CORS конфигурация
- Rate limiting
- SQL injection защита

## Performance

### Database оптимизация
- Индекси за често заявявани полета
- Database pooling (10 connections)
- Query optimization за големи datasets

### Caching
- ETS за краткосрочен cache
- Redis за long-term caching (опционално)
- CDN за static assets

### Scalability
- Stateless API дизайн
- Horizontal scaling възможност
- Load balancer готовност

## Monitoring & Logging

### Logging
- Structured logging с JSON формат
- Log levels: debug, info, warn, error
- Centralized logging (ELK stack готовност)

### Metrics
- Phoenix telemetry
- Database query performance
- Request/response metrics
- Error rates

### Health Checks
- `/api/health` endpoint
- Database connectivity
- Service dependencies статус

## Deployment

### Docker Configuration

Multi-stage Docker builds:
```dockerfile
# Phoenix app
FROM elixir:1.15-alpine AS builder
# Production image
FROM elixir:1.15-alpine AS runtime
```

### Environment-specific конфигурация

- `config/dev.exs` - Development настройки
- `config/prod.exs` - Production настройки
- `config/runtime.exs` - Runtime конфигурация

### CI/CD Pipeline

GitHub Actions пример:
```yaml
name: CI/CD
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Elixir
        uses: erlef/setup-beam@v1
      - name: Install dependencies
        run: mix deps.get
      - name: Run tests
        run: mix test
```

## Backup & Recovery

### Database Backup
```bash
# Daily backup
pg_dump jesterac > backup_$(date +%Y%m%d).sql

# Automated script
0 2 * * * /path/to/backup_script.sh
```

### Disaster Recovery
- Database replication
- Application snapshots
- Recovery time objective: < 1 час
- Recovery point objective: < 15 минути

## Development Workflow

### Git Workflow
- Main branch: `main`
- Feature branches: `feature/feature-name`
- Pull requests за всички промени
- Automated testing

### Code Quality
- `mix format` за Elixir code
- ESLint/Prettier за TypeScript
- Static analysis tools
- Code review процес

### Testing Strategy
- Unit тестове (>90% coverage)
- Integration тестове
- E2E тестове (опционално)
- Performance тестове