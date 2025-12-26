# Baraba Deployment Guide

## Архитектура на сървисите

| Сървис | Език | Порт | Миграции | Таблици |
|--------|------|------|----------|---------|
| **phoenix-app** | Elixir | 4000 | Ecto (`schema_migrations`) | **ВСИЧКИ** - централизирано |
| **identity-service** | Nim | 5002 | Ecto (от Phoenix) | `nim_users`, `user_groups` |
| **scanner-service** | Java/Spring | 5001 | Ecto (от Phoenix) | scan_sessions, scan_session_files, scanned_invoices |
| **jasper-service** | Java | 5005 | Няма (само чете) | - |
| **frontend** | React | 5173 | - | - |

## База данни

Всички сървиси използват **една PostgreSQL база**: `jesterac`

### Централизирана миграционна система

```
┌─────────────────────────────────────────────────────────────────┐
│                     PostgreSQL (jesterac)                       │
├─────────────────────────────────────────────────────────────────┤
│  schema_migrations (Ecto) - ЕДИНСТВЕН източник на истина       │
│                                                                 │
│  Таблици:                                                       │
│  - Elixir: companies, accounts, journal_entries, etc.          │
│  - Nim:    nim_users, user_groups                              │
│  - Java:   scan_sessions, scan_session_files, scanned_invoices │
└─────────────────────────────────────────────────────────────────┘
```

**Важно:** Flyway в Java Scanner Service е **изключен**. Всички миграции минават през Ecto.

## Миграции за други сървиси

Всички таблици са в Ecto миграции:

| Миграция | Описание |
|----------|----------|
| `20251222154807_create_identity_tables.exs` | `nim_users`, `user_groups` + seed data |
| `20251222154808_create_scanner_tables.exs` | `scan_sessions`, `scan_session_files`, `scanned_invoices` |

Всички миграции използват `IF NOT EXISTS` за безопасно повторно изпълнение.

### Default потребители

| Username | Password | Група | Email |
|----------|----------|-------|-------|
| superadmin | admin123 | superadmin | superadmin@baraba.local |

### User Groups

| ID | Име | Права |
|----|-----|-------|
| 1 | superadmin | Всички права |
| 2 | accountant | Преглед + осчетоводяване |
| 3 | viewer | Само преглед |

## Deployment стъпки за VPS

### 1. Clone и Setup

```bash
git clone <repo> /opt/baraba
cd /opt/baraba/baraba_ub
```

### 2. Environment Variables

Създайте `.env` файл:

```env
# Database
DB_HOST=postgres
DB_USER=postgres
DB_PASSWORD=<SECURE_PASSWORD>
DB_NAME=jesterac

# JWT
JWT_SECRET=<GENERATE_SECURE_SECRET>

# Azure (optional)
AZURE_DI_ENDPOINT=
AZURE_DI_API_KEY=

# Salt Edge (optional)
SALTEDGE_APP_ID=
SALTEDGE_SECRET=
```

### 3. Стартиране

```bash
# Build и стартиране
docker compose up -d

# Изчакайте PostgreSQL да стартира
sleep 10

# Ecto миграции (автоматично при стартиране на phoenix-app)
# Всички таблици (включително nim_users, user_groups, scan_*) се създават автоматично
docker compose exec phoenix-app mix ecto.migrate
```

### 4. Проверка

```bash
# Проверете таблиците
docker compose exec postgres psql -U postgres -d jesterac -c "\dt"

# Проверете потребителите
docker compose exec postgres psql -U postgres -d jesterac -c "SELECT username, email FROM nim_users"

# Проверете услугите
curl http://localhost:4000/api/health
curl http://localhost:5002/health
curl http://localhost:5001/health
```

## Сигурност

### Пароли

- **НИКОГА** не използвайте default паролите в production!
- Генерирайте нов JWT_SECRET: `openssl rand -hex 32`
- Сменете superadmin паролата след първия login

### Password Hashing

Identity Service използва **base64(password + salt)** - това е **СЛАБО** за production!

**TODO за production:**
- Имплементирайте bcrypt или argon2
- Файл: `baraba_shared/src/baraba_shared/utils/security.nim`

## Backup

```bash
# Backup на базата
docker compose exec postgres pg_dump -U postgres jesterac > backup_$(date +%Y%m%d).sql

# Restore
docker compose exec -T postgres psql -U postgres jesterac < backup_20251222.sql
```

## Troubleshooting

### Identity Service не работи

```bash
# Проверете дали таблиците съществуват
docker compose exec postgres psql -U postgres -d jesterac -c "\d nim_users"

# Проверете логовете
docker compose logs identity-service
```

### Миграции failing

```bash
# Проверете статуса на Ecto миграциите
docker compose exec phoenix-app mix ecto.migrations

# Rollback последната миграция
docker compose exec phoenix-app mix ecto.rollback
```
