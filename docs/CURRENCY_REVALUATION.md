# Currency Revaluation (Курсови Разлики)

## Общ преглед

Модулът за курсови разлики позволява автоматично изчисляване и осчетоводяване на валутни преоценки в края на всеки месец. Системата преоценява избрани валутни сметки по актуалния курс и генерира счетоводни статии за печалби или загуби от курсови разлики.

## Функционалност

### Конфигурация

#### Маркиране на сметки за преоценка
Всяка сметка може да бъде маркирана като "подлежаща на преоценка" чрез полето `is_revaluable`:

```sql
-- Примерни сметки за преоценка
UPDATE accounts SET is_revaluable = true WHERE code IN ('504', '401', '411');
```

#### Настройка на P&L сметки
В настройките на компанията се конфигурират сметките за приходи/разходи от курсови разлики:

| Поле | Описание | Типична сметка |
|------|----------|----------------|
| `fx_gains_account_id` | Сметка за приходи от курсови разлики | 724 |
| `fx_losses_account_id` | Сметка за разходи от курсови разлики | 624 |

### Работен процес

1. **Preview** - Преглед на изчислените курсови разлики без запис
2. **Create** - Създаване на преоценка със статус PENDING
3. **Post** - Осчетоводяване (генерира журнална статия)
4. **Reverse** - Сторниране на осчетоводена преоценка
5. **Delete** - Изтриване на чакаща (PENDING) преоценка

### Статуси

| Статус | Описание |
|--------|----------|
| `PENDING` | Създадена, но не е осчетоводена |
| `POSTED` | Осчетоводена с генерирана журнална статия |
| `REVERSED` | Сторнирана |

## Database Schema

### currency_revaluations

```sql
CREATE TABLE currency_revaluations (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id),
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    revaluation_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    total_gains DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_losses DECIMAL(15,2) NOT NULL DEFAULT 0,
    net_result DECIMAL(15,2) NOT NULL DEFAULT 0,
    journal_entry_id UUID REFERENCES journal_entries(id),
    created_by_id UUID,
    posted_by_id UUID,
    posted_at TIMESTAMP,
    notes TEXT,
    inserted_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

### currency_revaluation_lines

```sql
CREATE TABLE currency_revaluation_lines (
    id UUID PRIMARY KEY,
    currency_revaluation_id UUID NOT NULL REFERENCES currency_revaluations(id),
    account_id UUID NOT NULL REFERENCES accounts(id),
    currency_id UUID NOT NULL REFERENCES currencies(id),
    foreign_debit_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    foreign_credit_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    foreign_net_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    recorded_base_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    exchange_rate DECIMAL(18,6) NOT NULL,
    revalued_base_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    revaluation_difference DECIMAL(15,2) NOT NULL DEFAULT 0,
    is_gain BOOLEAN NOT NULL DEFAULT false,
    inserted_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

### Промени в съществуващи таблици

#### accounts
```sql
ALTER TABLE accounts ADD COLUMN is_revaluable BOOLEAN DEFAULT false;
ALTER TABLE accounts ADD COLUMN default_currency_id UUID REFERENCES currencies(id);
```

#### companies
```sql
ALTER TABLE companies ADD COLUMN fx_gains_account_id UUID;
ALTER TABLE companies ADD COLUMN fx_losses_account_id UUID;
```

## API Endpoints

### GET /api/companies/:company_id/currency-revaluations

Списък на всички преоценки за компания.

**Query параметри:**
- `status` (optional): PENDING, POSTED, REVERSED

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "year": 2025,
      "month": 12,
      "revaluation_date": "2025-12-31",
      "status": "POSTED",
      "total_gains": "150.00",
      "total_losses": "75.50",
      "net_result": "74.50",
      "journal_entry_id": "uuid"
    }
  ]
}
```

### GET /api/companies/:company_id/currency-revaluations/:id

Детайли на преоценка с всички редове.

### POST /api/companies/:company_id/currency-revaluations/preview

Preview на курсови разлики за период.

**Request:**
```json
{
  "year": 2025,
  "month": 12
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "year": 2025,
    "month": 12,
    "total_gains": "150.00",
    "total_losses": "75.50",
    "net_result": "74.50",
    "lines": [
      {
        "account_id": "uuid",
        "account_code": "504",
        "account_name": "Разплащателна сметка EUR",
        "currency_id": "uuid",
        "currency_code": "EUR",
        "foreign_net_balance": "1000.00",
        "recorded_base_balance": "1950.00",
        "exchange_rate": "1.95583",
        "revalued_base_balance": "1955.83",
        "revaluation_difference": "5.83",
        "is_gain": true
      }
    ]
  }
}
```

### POST /api/companies/:company_id/currency-revaluations

Създаване на преоценка (PENDING).

**Request:**
```json
{
  "year": 2025,
  "month": 12
}
```

### POST /api/companies/:company_id/currency-revaluations/:id/post

Осчетоводяване на преоценка.

**Response:**
```json
{
  "success": true,
  "revaluation": { ... },
  "journal_entry_id": "uuid"
}
```

### POST /api/companies/:company_id/currency-revaluations/:id/reverse

Сторниране на осчетоводена преоценка.

### DELETE /api/companies/:company_id/currency-revaluations/:id

Изтриване на PENDING преоценка.

### GET /api/companies/:company_id/currency-revaluations/revaluable-accounts

Списък на сметки маркирани за преоценка.

## Frontend

### Достъп
Навигация: Reports > Currency Revaluation (`/currency-revaluation`)

### Табове

#### История
- Списък на всички преоценки
- Филтриране по статус
- Действия: View, Post, Reverse, Delete

#### Изчисляване
- Избор на период (година/месец)
- Preview бутон за преглед
- Статистика: Общо печалби, Общо загуби, Нетен резултат
- Таблица с детайли по сметка/валута
- Create бутон за създаване на преоценка

### Локализация

Поддържани езици: Български, Английски

Ключове за превод: `currencyRevaluation.*`

## Счетоводна логика

### Изчисляване на курсови разлики

За всяка сметка маркирана като `is_revaluable`:

1. Изчислява се валутното салдо от `entry_lines` за периода
2. Изчислява се записаното BGN салдо
3. Взема се актуалният курс от `exchange_rates` за последния ден на месеца
4. Преоцененото салдо = Валутно салдо × Курс
5. Разлика = Преоценено салдо - Записано салдо
6. Ако разлика > 0 → Печалба (is_gain = true)
7. Ако разлика < 0 → Загуба (is_gain = false)

### Генерирана журнална статия

При осчетоводяване се създава журнална статия:

**За печалби:**
```
Дт [Валутна сметка]     Сума на печалбата
    Кт 724 (fx_gains)   Сума на печалбата
```

**За загуби:**
```
Дт 624 (fx_losses)      Сума на загубата
    Кт [Валутна сметка] Сума на загубата
```

## Миграции

| Файл | Описание |
|------|----------|
| `20251222000001_add_revaluation_fields_to_accounts.exs` | Добавя `is_revaluable`, `default_currency_id` |
| `20251222000002_add_revaluation_config_to_companies.exs` | Добавя `fx_gains_account_id`, `fx_losses_account_id` |
| `20251222000003_create_currency_revaluations.exs` | Създава таблица `currency_revaluations` |
| `20251222000004_create_currency_revaluation_lines.exs` | Създава таблица `currency_revaluation_lines` |

## Примерен сценарий

1. Маркирайте сметки 504 (EUR каса) и 411 (Клиенти EUR) като `is_revaluable = true`
2. Задайте в компанията `fx_gains_account_id` = сметка 724, `fx_losses_account_id` = сметка 624
3. В края на декември отворете Currency Revaluation > Изчисляване
4. Изберете 2025 / Декември и натиснете Preview
5. Прегледайте резултатите
6. Натиснете "Create Revaluation" за създаване
7. От таб "История" изберете преоценката и натиснете "Post"
8. Системата генерира журнална статия с курсовите разлики
