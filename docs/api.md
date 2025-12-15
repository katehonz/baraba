# API Reference

## Base URL

```
http://localhost:5000
```

## API видове

Приложението поддържа два вида API:
1. **REST API** - Традиционни HTTP endpoints
2. **GraphQL API** - Гъвкав query/mutation език

## Автентикация

API използва JWT (JSON Web Token) за автентикация. След успешен login/register, получавате token който трябва да изпращате в header:

```
Authorization: Bearer <token>
```

## CORS

Всички endpoints поддържат CORS с headers:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`

---

## Health Check

### GET /health

Проверка дали сървърът работи.

**Response:**
```json
{
  "status": "ok"
}
```

### GET /

Информация за API-то.

**Response:**
```json
{
  "name": "Baraba API",
  "version": "0.1.0",
  "description": "Счетоводна програма REST API"
}
```

---

## Автентикация

### POST /api/auth/register

Регистрация на нов потребител.

**Request Body:**
```json
{
  "username": "user123",
  "email": "user@example.com",
  "password": "password123",
  "groupId": 2  // optional, default: 2 (Потребители)
}
```

**Response (201):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "username": "user123",
    "email": "user@example.com"
  }
}
```

**Errors:**
- `400` - Username или email вече съществуват

---

### POST /api/auth/login

Вход в системата.

**Request Body:**
```json
{
  "username": "user123",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "username": "user123",
    "email": "user@example.com"
  }
}
```

**Errors:**
- `401` - Невалидно потребителско име или парола

---

## Валути (Currencies)

### GET /api/currencies

Списък на всички валути.

**Response (200):**
```json
[
  {
    "id": 1,
    "code": "BGN",
    "name": "Bulgarian Lev",
    "nameBg": "Български лев",
    "symbol": "лв",
    "decimalPlaces": 2,
    "isActive": true,
    "isBaseCurrency": true,
    "bnbCode": "BGN",
    "createdAt": "2025-12-15T15:00:00Z",
    "updatedAt": "2025-12-15T15:00:00Z"
  }
]
```

---

### POST /api/currencies

Създаване на нова валута.

**Request Body:**
```json
{
  "code": "USD",
  "name": "US Dollar",
  "nameBg": "Щатски долар",
  "symbol": "$",
  "decimalPlaces": 2,
  "isBaseCurrency": false
}
```

---

## Валутни курсове (Exchange Rates)

### GET /api/exchange-rates

Списък на валутни курсове.

**Query Parameters:**
- `fromCurrencyId` (optional) - ID на начална валута
- `toCurrencyId` (optional) - ID на целева валута
- `validDate` (optional) - Дата на валидност

---

### POST /api/exchange-rates

Създаване на нов валутен курс.

**Request Body:**
```json
{
  "fromCurrencyId": 2,
  "toCurrencyId": 1,
  "rate": 1.956,
  "reverseRate": 0.511,
  "validDate": "2025-12-15",
  "rateSource": "MANUAL",
  "notes": "Курс за деня"
}
```

---

## ДДС ставки (VAT Rates)

### GET /api/vat-rates

Списък на ДДС ставки.

**Query Parameters:**
- `companyId` (optional) - ID на фирма

---

### POST /api/vat-rates

Създаване на нова ДДС ставка.

**Request Body:**
```json
{
  "code": "VAT20",
  "name": "ДДС 20%",
  "rate": 20.0,
  "vatDirection": "SALE",
  "isActive": true,
  "companyId": 1
}
```

---

## Потребители (Users)

### GET /api/users

Списък на потребители.

**Query Parameters:**
- `isActive` (optional) - Филтрирай по активност
- `groupId` (optional) - Филтрирай по група

---

### POST /api/users

Създаване на нов потребител.

**Request Body:**
```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "password123",
  "firstName": "Иван",
  "lastName": "Петров",
  "groupId": 2
}
```

---

## Потребителски групи (User Groups)

### GET /api/user-groups

Списък на потребителски групи.

---

## Одитни логове (Audit Logs)

### GET /api/audit-logs

Списък на одитни логове.

**Query Parameters:**
- `companyId` (optional) - ID на фирма
- `fromDate` (optional) - Начална дата
- `toDate` (optional) - Крайна дата
- `search` (optional) - Търсене в username/details
- `action` (optional) - Филтрирай по действие
- `offset` (optional) - Offset за pagination
- `limit` (optional) - Limit за pagination

**Response (200):**
```json
{
  "logs": [
    {
      "id": 1,
      "companyId": 1,
      "userId": 1,
      "username": "admin",
      "userRole": "Администратор",
      "action": "CREATE_COMPANY",
      "entityType": "Company",
      "entityId": "1",
      "details": "Created company 'Тест ЕООД'",
      "ipAddress": "127.0.0.1",
      "userAgent": "Mozilla/5.0...",
      "success": true,
      "errorMessage": null,
      "createdAt": "2025-12-15T15:00:00Z"
    }
  ],
  "totalCount": 1,
  "hasMore": false
}
```

---

### GET /api/audit-logs/stats

Статистика на одитни логове.

**Query Parameters:**
- `companyId` - ID на фирма
- `days` - Брой дни назад (default: 30)

---

## VIES валидация

### GET /api/vies/validate/:vatNumber

Валидация на ДДС номер през VIES.

**Example:**
```
GET /api/vies/validate/BG123456789
```

**Response (200):**
```json
{
  "valid": true,
  "name": "TEST COMPANY LTD",
  "longAddress": "123 Test Street, Sofia, Bulgaria",
  "vatNumber": "BG123456789"
}
```

---

## Статистики (Reports)

### GET /api/reports/monthly-stats

Месечни статистики за фирма.

**Query Parameters:**
- `companyId` - ID на фирма
- `fromYear` - Начална година
- `fromMonth` - Начален месец
- `toYear` - Крайна година
- `toMonth` - Краен месец

**Response (200):**
```json
[
  {
    "year": 2025,
    "month": 12,
    "monthName": "December",
    "totalEntries": 45,
    "postedEntries": 40,
    "totalEntryLines": 89,
    "postedEntryLines": 80,
    "totalAmount": "125000.50",
    "vatAmount": "25000.10"
  }
]
```

---

## Фирми (Companies)

### GET /api/companies

Списък на всички фирми.

**Response (200):**
```json
[
  {
    "id": 1,
    "name": "Тест ЕООД",
    "eik": "123456789",
    "vat_number": "BG123456789",
    "address": "ул. Примерна 1",
    "city": "София",
    "country": "BG",
    "is_active": true,
    "base_currency_id": 1,
    "created_at": "2025-12-15T15:00:00Z",
    "updated_at": "2025-12-15T15:00:00Z"
  }
]
```

---

### GET /api/companies/:id

Детайли за конкретна фирма.

**Response (200):**
```json
{
  "id": 1,
  "name": "Тест ЕООД",
  "eik": "123456789",
  ...
}
```

**Errors:**
- `404` - Фирмата не е намерена

---

### POST /api/companies

Създаване на нова фирма.

**Request Body:**
```json
{
  "name": "Нова Фирма ООД",
  "eik": "987654321",
  "vatNumber": "BG987654321",  // optional
  "address": "ул. Нова 5",     // optional
  "city": "Пловдив"            // optional
}
```

**Response (201):**
```json
{
  "id": 2,
  "name": "Нова Фирма ООД",
  "eik": "987654321",
  ...
}
```

---

## Сметки (Accounts)

### GET /api/accounts

Списък на сметки. Може да се филтрира по фирма.

**Query Parameters:**
- `companyId` (optional) - ID на фирма

**Example:**
```
GET /api/accounts?companyId=1
```

**Response (200):**
```json
[
  {
    "id": 1,
    "code": "401",
    "name": "Доставчици",
    "account_type": "LIABILITY",
    "company_id": 1,
    "is_active": true,
    ...
  }
]
```

---

### GET /api/accounts/company/:companyId

Сметки за конкретна фирма.

**Response (200):** Същият формат като горе.

---

### POST /api/accounts

Създаване на нова сметка.

**Request Body:**
```json
{
  "code": "401",
  "name": "Доставчици",
  "accountType": "LIABILITY",  // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
  "companyId": 1,
  "parentId": null  // optional - за подсметки
}
```

**Response (201):**
```json
{
  "id": 1,
  "code": "401",
  "name": "Доставчици",
  ...
}
```

---

## Контрагенти (Counterparts)

### GET /api/counterparts

Списък на контрагенти.

**Query Parameters:**
- `companyId` (optional) - ID на фирма

**Response (200):**
```json
[
  {
    "id": 1,
    "name": "Клиент ООД",
    "eik": "111222333",
    "vat_number": "BG111222333",
    "is_customer": true,
    "is_supplier": false,
    "company_id": 1,
    ...
  }
]
```

---

### POST /api/counterparts

Създаване на нов контрагент.

**Request Body:**
```json
{
  "name": "Нов Контрагент",
  "eik": "444555666",
  "companyId": 1
}
```

**Response (201):**
```json
{
  "id": 2,
  "name": "Нов Контрагент",
  ...
}
```

---

## Счетоводен дневник (Journal Entries)

### GET /api/journal-entries

Списък на счетоводни записи.

**Query Parameters:**
- `companyId` (optional) - ID на фирма

**Response (200):**
```json
[
  {
    "id": 1,
    "entry_number": 1,
    "document_date": "2025-12-15T00:00:00Z",
    "document_number": "INV-001",
    "description": "Фактура за доставка",
    "total_amount": 1000.00,
    "is_posted": false,
    "company_id": 1,
    ...
  }
]
```

---

### POST /api/journal-entries

Създаване на нов счетоводен запис.

**Request Body:**
```json
{
  "documentNumber": "INV-002",
  "description": "Нова фактура",
  "totalAmount": 500.00,
  "companyId": 1,
  "createdById": 1  // optional, default: 1
}
```

**Response (201):**
```json
{
  "id": 2,
  "document_number": "INV-002",
  ...
}
```

---

---

## GraphQL API

### Endpoint

```
POST /graphql
```

### Playground

GraphQL Playground е достъпен на:
```
http://localhost:5000/graphql
```

### Основни Query-та

```graphql
# Вземане на текущ потребител
query {
  me {
    id
    username
    email
  }
}

# Списък с фирми
query {
  companies {
    id
    name
    eik
    isActive
  }
}

# Сметки за фирма
query GetAccounts($companyId: Int!) {
  accounts(companyId: $companyId) {
    id
    code
    name
    accountType
  }
}

# Журнални записи
query GetJournalEntries($companyId: Int!, $posted: Boolean) {
  journalEntries(companyId: $companyId, posted: $posted) {
    id
    entryNumber
    documentDate
    description
    totalAmount
    isPosted
    lines {
      id
      debitAmount
      creditAmount
      account {
        code
        name
      }
    }
  }
}
```

### Основни Mutations

```graphql
# Създаване на фирма
mutation CreateCompany($input: CreateCompanyInput!) {
  createCompany(input: $input) {
    id
    name
    eik
  }
}

# Създаване на счетоводен запис
mutation CreateJournalEntry($input: CreateJournalEntryInput!) {
  createJournalEntry(input: $input) {
    id
    entryNumber
    documentDate
    description
  }
}

# Осчетоводяване на запис
mutation PostJournalEntry($id: Int!) {
  postJournalEntry(id: $id) {
    id
    isPosted
    postedAt
  }
}
```

### Справки

```graphql
# Оборотна ведомост
query TurnoverSheet($companyId: Int!, $fromDate: String!, $toDate: String!) {
  turnoverSheet(companyId: $companyId, fromDate: $fromDate, toDate: $toDate) {
    companyId
    fromDate
    toDate
    accounts {
      code
      name
      openingDebit
      openingCredit
      periodDebit
      periodCredit
      closingDebit
      closingCredit
    }
  }
}

# Главна книга
query GeneralLedger($companyId: Int!, $accountId: Int!, $fromDate: String!, $toDate: String!) {
  generalLedger(companyId: $companyId, accountId: $accountId, fromDate: $fromDate, toDate: $toDate) {
    account {
      id
      code
      name
    }
    openingBalance
    closingBalance
    transactions {
      date
      entryNumber
      documentNumber
      description
      debit
      credit
      balance
    }
  }
}
```

---

## HTTP Status Codes

| Code | Описание |
|------|----------|
| 200 | OK - Успешна заявка |
| 201 | Created - Ресурсът е създаден |
| 400 | Bad Request - Грешка в заявката |
| 401 | Unauthorized - Невалидна автентикация |
| 404 | Not Found - Ресурсът не е намерен |
| 500 | Internal Server Error - Грешка на сървъра |
