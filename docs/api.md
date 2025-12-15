# API Reference

## Base URL

```
http://localhost:5000
```

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

## HTTP Status Codes

| Code | Описание |
|------|----------|
| 200 | OK - Успешна заявка |
| 201 | Created - Ресурсът е създаден |
| 400 | Bad Request - Грешка в заявката |
| 401 | Unauthorized - Невалидна автентикация |
| 404 | Not Found - Ресурсът не е намерен |
| 500 | Internal Server Error - Грешка на сървъра |
