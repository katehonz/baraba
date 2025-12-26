# API Документация

Това документация описва всички достъпни API endpoints на **Baraba accounting system**, представляваща **хибридна архитектура** от Elixir Phoenix ядро и специализирани Nim микросървизи.

## Обща информация

### Базови URL-и

**Elixir Phoenix Core:**
```
Development: http://localhost:4000/api
Production: https://your-domain.com/api
```

**Nim микросървизи:**
```
Identity Service: http://localhost:5002/api
VAT Service: http://localhost:5004/api
VIES Service: http://localhost:5003/api
```

**Java микросървизи:**
```
Scanner Service: http://localhost:5001/api
Jasper Service: http://localhost:5005/api
```

**Java Jasper Service:**
```
Jasper Service: http://localhost:5005/api
```

### Authentication
JWT-based authentication се handle-ва от **identity_service** (Nim, порт 5002):
- Elixir Phoenix валидира JWT токени през identity_service
- Frontend получава токени от identity_service
- Всички последващи заявки включват Bearer token

### Response Format
Всички responses следват JSON:API стандарт:

```json
{
  "data": {
    "id": "uuid",
    "type": "resource_type",
    "attributes": { ... },
    "relationships": { ... }
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0"
  }
}
```

### Error Responses
```json
{
  "errors": [
    {
      "code": "validation_error",
      "message": "Invalid input data",
      "field": "vat_number",
      "details": "VAT number must be in BGXXXXXXXXX format"
    }
  ]
}
```

## Компании (Companies)

### Get All Companies
```http
GET /api/companies
```

**Response:**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "type": "company",
      "attributes": {
        "name": "Тест ООД",
        "vat_number": "BG123456789",
        "address": "гр. София, ул. Васил Левски 1",
        "phone": "+359 2 123 456",
        "email": "info@test.bg",
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-15T10:30:00Z"
      }
    }
  ],
  "meta": {
    "total_count": 1,
    "page": 1,
    "per_page": 20
  }
}
```

### Get Company by ID
```http
GET /api/companies/{id}
```

**Path Parameters:**
- `id` (string, required): UUID на фирмата

**Response:**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "type": "company",
    "attributes": {
      "name": "Тест ООД",
      "vat_number": "BG123456789",
      "address": "гр. София, ул. Васил Левски 1",
      "phone": "+359 2 123 456",
      "email": "info@test.bg",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    },
    "relationships": {
      "accounts": {
        "links": {
          "related": "/api/companies/550e8400-e29b-41d4-a716-446655440000/accounts"
        }
      }
    }
  }
}
```

### Create Company
```http
POST /api/companies
```

**Request Body:**
```json
{
  "data": {
    "type": "company",
    "attributes": {
      "name": "Нова фирма ООД",
      "vat_number": "BG987654321",
      "address": "гр. Пловдив, ул. Централна 5",
      "phone": "+359 32 123 456",
      "email": "office@nova.bg"
    }
  }
}
```

**Validation Rules:**
- `name` - задължително, max 255 символа
- `vat_number` - задължително, уникално, формат BGXXXXXXXXX
- `address` - опционален, max 500 символа
- `phone` - опционален, телефонен формат
- `email` - опционален, email формат

**Response (201 Created):**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "type": "company",
    "attributes": {
      "name": "Нова фирма ООД",
      "vat_number": "BG987654321",
      "address": "гр. Пловдив, ул. Централна 5",
      "phone": "+359 32 123 456",
      "email": "office@nova.bg",
      "created_at": "2024-01-15T10:35:00Z",
      "updated_at": "2024-01-15T10:35:00Z"
    }
  }
}
```

### Update Company
```http
PUT /api/companies/{id}
```

**Request Body:**
```json
{
  "data": {
    "type": "company",
    "attributes": {
      "name": "Актуализирана фирма ООД",
      "address": "Нов адрес"
    }
  }
}
```

**Response (200 OK):**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "type": "company",
    "attributes": {
      "name": "Актуализирана фирма ООД",
      "vat_number": "BG987654321",
      "address": "Нов адрес",
      "phone": "+359 32 123 456",
      "email": "office@nova.bg",
      "created_at": "2024-01-15T10:35:00Z",
      "updated_at": "2024-01-15T11:00:00Z"
    }
  }
}
```

### Delete Company
```http
DELETE /api/companies/{id}
```

**Response (204 No Content):**
```json
{}
```

## Сметки (Accounts)

### Get Company Accounts
```http
GET /api/companies/{company_id}/accounts
```

**Query Parameters:**
- `page` (integer, optional): Page number (default: 1)
- `per_page` (integer, optional): Items per page (default: 20)
- `type` (string, optional): Filter by account type (asset, liability, equity, revenue, expense)

**Response:**
```json
{
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "type": "account",
      "attributes": {
        "number": "501",
        "name": "Материали",
        "account_type": "asset",
        "description": "Суровини и материали",
        "is_active": true,
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-15T10:30:00Z"
      }
    }
  ],
  "meta": {
    "total_count": 1,
    "page": 1,
    "per_page": 20
  }
}
```

### Create Account
```http
POST /api/companies/{company_id}/accounts
```

**Request Body:**
```json
{
  "data": {
    "type": "account",
    "attributes": {
      "number": "502",
      "name": "Готова продукция",
      "account_type": "asset",
      "description": "Финални продукти за продажба"
    }
  }
}
```

**Account Types:**
- `asset` - Активи
- `liability` - Задължения
- `equity` - Собствен капитал
- `revenue` - Приходи
- `expense` - Разходи

## Контрагенти (Counterparts)

### Get Company Counterparts
```http
GET /api/companies/{company_id}/counterparts
```

**Query Parameters:**
- `type` (string, optional): Filter by type (client, supplier, both)
- `vat_registered` (boolean, optional): Filter by VAT registration

**Response:**
```json
{
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "type": "counterpart",
      "attributes": {
        "name": "Доставчик АД",
        "vat_number": "BG111111111",
        "bulstat": "111111111",
        "address": "гр. Варна, ул. Морска 10",
        "type": "supplier",
        "is_vat_registered": true,
        "phone": "+359 52 123 456",
        "email": "office@supplier.bg",
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-15T10:30:00Z"
      }
    }
  ]
}
```

### Create Counterpart
```http
POST /api/companies/{company_id}/counterparts
```

**Request Body:**
```json
{
  "data": {
    "type": "counterpart",
    "attributes": {
      "name": "Нов клиент ООД",
      "vat_number": "BG222222222",
      "bulstat": "222222222",
      "address": "гр. Бургас, ул. Приморска 5",
      "type": "client",
      "is_vat_registered": true,
      "phone": "+359 56 123 456",
      "email": "client@new.bg"
    }
  }
}
```

## Счетоводни записи (Journal Entries)

### Get Company Journal Entries
```http
GET /api/companies/{company_id}/journal-entries
```

**Query Parameters:**
- `from_date` (date, optional): Filter from date (YYYY-MM-DD)
- `to_date` (date, optional): Filter to date (YYYY-MM-DD)
- `status` (string, optional): Filter by status (draft, posted, cancelled)
- `page` (integer, optional): Page number

**Response:**
```json
{
  "data": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440000",
      "type": "journal_entry",
      "attributes": {
        "date": "2024-01-15",
        "description": "Покупка на материали",
        "status": "posted",
        "total_debit": "1000.00",
        "total_credit": "1000.00",
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-15T10:30:00Z"
      },
      "relationships": {
        "entry_lines": {
          "links": {
            "related": "/api/journal-entries/880e8400-e29b-41d4-a716-446655440000/entry-lines"
          }
        }
      }
    }
  ]
}
```

### Create Journal Entry
```http
POST /api/companies/{company_id}/journal-entries
```

**Request Body:**
```json
{
  "data": {
    "type": "journal_entry",
    "attributes": {
      "date": "2024-01-15",
      "description": "Покупка на материали",
      "status": "draft",
      "entry_lines": [
        {
          "account_id": "660e8400-e29b-41d4-a716-446655440000",
          "debit": "1000.00",
          "credit": "0.00",
          "description": "Материали"
        },
        {
          "account_id": "660e8400-e29b-41d4-a716-446655440001",
          "debit": "0.00",
          "credit": "1000.00",
          "description": "Доставчик АД"
        }
      ]
    }
  }
}
```

**Validation Rules:**
- Трябва да има поне два записа (entry_lines)
- Сборът на дебит трябва да е равен на сбора на кредит
- Всички account_ids трябва да са валидни за фирмата
- Всички суми трябва да са положителни числа

### Post Journal Entry
```http
POST /api/journal-entries/{id}/post
```

**Response (200 OK):**
```json
{
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440000",
    "type": "journal_entry",
    "attributes": {
      "date": "2024-01-15",
      "description": "Покупка на материали",
      "status": "posted",
      "total_debit": "1000.00",
      "total_credit": "1000.00",
      "posted_at": "2024-01-15T11:00:00Z",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T11:00:00Z"
    }
  }
}
```

## ДДС ставки (VAT Rates)

### Get Company VAT Rates
```http
GET /api/companies/{company_id}/vat-rates
```

**Response:**
```json
{
  "data": [
    {
      "id": "990e8400-e29b-41d4-a716-446655440000",
      "type": "vat_rate",
      "attributes": {
        "name": "ДДС 20%",
        "rate": "0.20",
        "description": "Стандартна ставка",
        "is_active": true,
        "valid_from": "2024-01-01",
        "valid_until": null,
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-15T10:30:00Z"
      }
    }
  ]
}
```

## 🆕 Основни средства (Fixed Assets)

### Get Company Fixed Assets
```http
GET /api/companies/{company_id}/fixed-assets
```

**Query Parameters:**
- `category` (string, optional): Filter by asset category
- `status` (string, optional): Filter by status (active, disposed)

**Response:**
```json
{
  "data": [
    {
      "id": "aa1e8400-e29b-41d4-a716-446655440000",
      "type": "fixed_asset",
      "attributes": {
        "name": "Компютър HP",
        "category": "IT оборудване",
        "purchase_value": "2500.00",
        "current_value": "1800.00",
        "depreciation_rate": "0.20",
        "purchase_date": "2023-01-15",
        "status": "active",
        "asset_number": "OS-001"
      }
    }
  ]
}
```

### Create Fixed Asset
```http
POST /api/companies/{company_id}/fixed-assets
```

**Request Body:**
```json
{
  "data": {
    "type": "fixed_asset",
    "attributes": {
      "name": "Лаптоп Dell",
      "category": "IT оборудване",
      "purchase_value": "3200.00",
      "purchase_date": "2024-01-15",
      "useful_life_months": 36,
      "depreciation_method": "straight_line"
    }
  }
}
```

## 🆕 Продукти (Products)

### Get Company Products
```http
GET /api/companies/{company_id}/products
```

**Response:**
```json
{
  "data": [
    {
      "id": "bb2e8400-e29b-41d4-a716-446655440000",
      "type": "product",
      "attributes": {
        "code": "PROD-001",
        "name": "Стол офис",
        "description": "Ергономичен офис стол",
        "unit": "бр.",
        "purchase_price": "150.00",
        "sale_price": "250.00",
        "vat_rate_id": "vat-20-id",
        "is_active": true
      }
    }
  ]
}
```

## 🆕 Складови наличности (Stock Levels)

### Get Stock Levels
```http
GET /api/companies/{company_id}/stock-levels
```

**Response:**
```json
{
  "data": [
    {
      "id": "cc3e8400-e29b-41d4-a716-446655440000",
      "type": "stock_level",
      "attributes": {
        "product_id": "bb2e8400-e29b-41d4-a716-446655440000",
        "warehouse": "Основен склад",
        "quantity": 45,
        "reserved_quantity": 5,
        "available_quantity": 40,
        "unit_cost": "150.00",
        "total_value": "6750.00",
        "last_updated": "2024-01-15T10:30:00Z"
      }
    }
  ]
}
```

## 🆕 Валутни курсове (Exchange Rates)

### Get Exchange Rates
```http
GET /api/exchange-rates
```

**Query Parameters:**
- `from_date` (date, optional): Filter from date
- `to_date` (date, optional): Filter to date
- `currency` (string, optional): Filter by currency code

**Response:**
```json
{
  "data": [
    {
      "id": "dd4e8400-e29b-41d4-a716-446655440000",
      "type": "exchange_rate",
      "attributes": {
        "from_currency": "EUR",
        "to_currency": "BGN",
        "rate": "1.95583",
        "date": "2024-01-15",
        "source": "ECB"
      }
    }
  ]
}
```

## 🆕 Счетоводни периоди (Accounting Periods)

### Get Accounting Periods
```http
GET /api/companies/{company_id}/accounting-periods
```

**Query Parameters:**
- `year` (integer, optional): Filter by year
- `month` (integer, optional): Filter by month
- `status` (string, optional): OPEN, CLOSED

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "company_id": "uuid",
      "year": 2025,
      "month": 12,
      "status": "OPEN",
      "closed_at": null,
      "notes": null
    }
  ]
}
```

### Close Accounting Period
```http
POST /api/companies/{company_id}/accounting-periods/{year}/{month}/close
```

**Request Body:**
```json
{
  "closed_by_id": "user-uuid",
  "notes": "Месечно приключване"
}
```

### Reopen Accounting Period
```http
POST /api/companies/{company_id}/accounting-periods/{year}/{month}/reopen
```

## 🆕 Курсови разлики (Currency Revaluations)

### Get Currency Revaluations
```http
GET /api/companies/{company_id}/currency-revaluations
```

**Query Parameters:**
- `status` (string, optional): PENDING, POSTED, REVERSED

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

### Preview Revaluation
```http
POST /api/companies/{company_id}/currency-revaluations/preview
```

**Request Body:**
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
        "account_code": "504",
        "account_name": "Разплащателна сметка EUR",
        "currency_code": "EUR",
        "foreign_net_balance": "1000.00",
        "recorded_base_balance": "1950.00",
        "exchange_rate": "1.955830",
        "revalued_base_balance": "1955.83",
        "revaluation_difference": "5.83",
        "is_gain": true
      }
    ]
  }
}
```

### Create Revaluation
```http
POST /api/companies/{company_id}/currency-revaluations
```

**Request Body:**
```json
{
  "year": 2025,
  "month": 12
}
```

### Post Revaluation
```http
POST /api/companies/{company_id}/currency-revaluations/{id}/post
```

**Response:**
```json
{
  "success": true,
  "revaluation": { ... },
  "journal_entry_id": "uuid"
}
```

### Reverse Revaluation
```http
POST /api/companies/{company_id}/currency-revaluations/{id}/reverse
```

### Delete Revaluation
```http
DELETE /api/companies/{company_id}/currency-revaluations/{id}
```

*Само за PENDING преоценки*

### Get Revaluable Accounts
```http
GET /api/companies/{company_id}/currency-revaluations/revaluable-accounts
```

## 🔒 Authentication & User Management (Identity Service - Nim, порт 5002)

### JWT Authentication
```http
POST http://localhost:5002/api/auth/login
```

**Request Body:**
```json
{
  "username": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-uuid",
      "username": "user@example.com",
      "role": "accountant",
      "company_id": "company-uuid"
    },
    "expires_at": "2024-01-16T10:30:00Z"
  }
}
```

### User Registration
```http
POST http://localhost:5002/api/users/register
```

### Validate Token
```http
GET http://localhost:5002/api/auth/validate
```

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🔍 QR & Document Scanning (Scanner Service - Java, порт 5001)

### QR Code Scan
```http
POST http://localhost:5001/api/scan/qr
```

**Request Body:**
```json
{
  "image_data": "base64_encoded_image_data",
  "format": "qr_code"
}
```

**Response:**
```json
{
  "data": {
    "scanned_text": "BG123456789:INV-2024-001:1000.50",
    "confidence": 0.95,
    "format": "qr_code",
    "parsed_data": {
      "vat_number": "BG123456789",
      "invoice_number": "INV-2024-001", 
      "amount": "1000.50"
    }
  }
}
```

### Document OCR
```http
POST http://localhost:5001/api/scan/document
```

## 🇪🇺 EU VAT Validation (VIES Service - Nim, порт 5003)

### Validate EU VAT Number
```http
GET http://localhost:5003/api/vat/validate/{vat_number}
```

**Response:**
```json
{
  "data": {
    "vat_number": "BG123456789",
    "valid": true,
    "company_name": "EXAMPLE COMPANY LTD",
    "address": "123 STREET, CITY, COUNTRY",
    "country_code": "BG",
    "request_date": "2024-01-15"
  }
}
```

### Batch VAT Validation
```http
POST http://localhost:5003/api/vat/batch-validate
```

**Request Body:**
```json
{
  "vat_numbers": ["BG123456789", "DE123456789", "RO123456789"]
}
```

## 🇧🇬 Bulgarian VAT Service (VAT Service - Nim, порт 5004)

### Calculate VAT
```http
POST http://localhost:5004/api/vat/calculate
```

**Request Body:**
```json
{
  "amount": 1000.00,
  "vat_rate": 0.20,
  "transaction_type": "sale",
  "company_vat_registered": true
}
```

**Response:**
```json
{
  "data": {
    "base_amount": 1000.00,
    "vat_amount": 200.00,
    "total_amount": 1200.00,
    "vat_rate": 0.20,
    "vat_code": "20",
    "transaction_type": "sale"
  }
}
```

### VAT Rules Check
```http
POST http://localhost:5004/api/vat/rules-check
```

**Request Body:**
```json
{
  "transaction_type": "intra_community_supply",
  "partner_country": "DE",
  "partner_vat_number": "DE123456789",
  "amount": 5000.00
}
```

## 📄 PDF Reports (Jasper Service - Java, порт 5005)

### Generate Financial Report
```http
POST http://localhost:5005/api/reports/financial-statement
```

**Request Body:**
```json
{
  "company_id": "company-uuid",
  "report_type": "balance_sheet",
  "period": {
    "from_date": "2024-01-01",
    "to_date": "2024-12-31"
  },
  "format": "pdf"
}
```

**Response:**
```json
{
  "data": {
    "report_id": "report-uuid",
    "download_url": "/api/reports/download/report-uuid",
    "format": "pdf",
    "size_bytes": 1048576,
    "generated_at": "2024-01-15T10:30:00Z"
  }
}
```

### Download Report
```http
GET http://localhost:5005/api/reports/download/{report_id}
```

### Available Report Types
- `balance_sheet` - Балансов отчет
- `income_statement` - Отчет за приходи и разходи
- `cash_flow` - Отчет за паричния поток
- `vat_return` - ДДС декларация
- `trial_balance` - Оборотна ведомост

## 🔗 Service-to-Service Communication

### Service Health Check
```http
GET http://localhost:5002/api/health  # Identity Service
 GET http://localhost:5001/api/health  # Scanner Service (Java)
GET http://localhost:5003/api/health  # VIES Service
GET http://localhost:5004/api/health  # VAT Service
GET http://localhost:5005/api/health  # Jasper Service
GET http://localhost:4000/api/health  # Elixir Phoenix
```

**Example Response:**
```json
{
  "data": {
    "service": "identity_service",
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0",
    "dependencies": {
      "database": "connected",
      "redis": "connected"
    },
    "uptime": 86400
  }
}
```

## System Overview Health
```http
GET http://localhost:4000/api/system/health
```

**Response:**
```json
{
  "data": {
    "system_status": "healthy",
    "timestamp": "2024-01-15T10:30:00Z",
    "services": {
      "elixir_phoenix": "healthy",
      "identity_service": "healthy",
       "scanner_service": "healthy",  # Java-based
      "vat_service": "healthy",
      "vies_service": "healthy",
      "jasper_service": "healthy",
      "database": "connected"
    },
    "total_uptime": 86400,
    "active_connections": 42
  }
}
```

## Rate Limiting

API-то е защитено с rate limiting:
- **1000 заявки на час** на IP адрес
- **100 заявки на минута** на authenticated потребител
- **HTTP 429 Too Many Requests** при превишение

## Versioning

API версията се указва чрез URL path:
- `/api/v1/companies` - Версия 1
- `/api/v2/companies` - Версия 2 (бъдещи промени)

Текущата версия е v1 и се счита за основен API endpoint.

## Error Codes

| Error Code | HTTP Status | Описание |
|------------|-------------|----------|
| `validation_error` | 400 | Невалидни данни |
| `not_found` | 404 | Ресурсът не е намерен |
| `unauthorized` | 401 | Няма достъп |
| `forbidden` | 403 | Забранен достъп |
| `conflict` | 409 | Конфликт на данни |
| `rate_limit_exceeded` | 429 | Превишен лимит на заявки |
| `internal_error` | 500 | Вътрешна грешка |

## SDK и Client Libraries

### JavaScript/TypeScript
```typescript
import { BarabaClient } from '@baraba/client';

const client = new BarabaClient({
  baseURL: 'http://localhost:4000/api'
});

const companies = await client.companies.list();
const company = await client.companies.create({
  name: 'Нова фирма',
  vatNumber: 'BG123456789'
});
```

### Elixir
```elixir
# В mix.exs:
{:baraba_client, "~> 1.0"}

# В кода:
{:ok, companies} = BarabaClient.Companies.list()
{:ok, company} = BarabaClient.Companies.create(%{
  name: "Нова фирма",
  vat_number: "BG123456789"
})
```

## Примери за използване

### Пълен workflow за създаване на счетоводен запис

```bash
# 1. Създаване на фирма
curl -X POST http://localhost:4000/api/companies \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "type": "company",
      "attributes": {
        "name": "Тест ООД",
        "vat_number": "BG123456789",
        "address": "София"
      }
    }
  }'

# 2. Създаване на сметки
curl -X POST http://localhost:4000/api/companies/{company_id}/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "type": "account",
      "attributes": {
        "number": "501",
        "name": "Материали",
        "account_type": "asset"
      }
    }
  }'

# 3. Създаване на счетоводен запис
curl -X POST http://localhost:4000/api/companies/{company_id}/journal-entries \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "type": "journal_entry",
      "attributes": {
        "date": "2024-01-15",
        "description": "Покупка на материали",
        "entry_lines": [
          {
            "account_id": "account_1_id",
            "debit": "1000.00",
            "credit": "0.00"
          },
          {
            "account_id": "account_2_id", 
            "debit": "0.00",
            "credit": "1000.00"
          }
        ]
      }
    }
  }'

# 4. Одобряване на записа
curl -X POST http://localhost:4000/api/journal-entries/{entry_id}/post
```

За допълнителна информация или въпроси, моля свържете се с development екипа или създайте GitHub issue.