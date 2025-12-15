# Baraba - Счетоводна програма

Минимална счетоводна система, построена с Nim (Jester) backend и React frontend.

## Технологии

### Backend
- **Nim** 2.2.4
- **Jester** - Web framework
- **norm** - ORM за PostgreSQL
- **jwt** - JSON Web Token автентикация

### Frontend
- **React** 18 + TypeScript
- **Vite** - Build tool
- **axios** - HTTP клиент
- **react-router-dom** - Routing
- **@tanstack/react-query** - Data fetching

### База данни
- **PostgreSQL** 15+

## Бърз старт

### 1. Изисквания

```bash
# Nim
choosenim stable

# Node.js
node --version  # v18+

# PostgreSQL
psql --version  # 15+
```

### 2. Настройка на базата данни

```bash
# Създай база данни
createdb jesterac

# Или с psql
psql -U postgres -c "CREATE DATABASE jesterac;"
```

### 3. Инсталация

```bash
# Backend dependencies
cd /home/dvg/z-nim-proloq/baraba
nimble install

# Frontend dependencies
cd frontend
npm install
```

### 4. Миграция на базата данни

```bash
cd /home/dvg/z-nim-proloq/baraba
nim c --deepcopy:on -d:release --threads:off src/db/migrate.nim
./src/db/migrate
```

### 5. Компилация и стартиране

```bash
# Backend
nim c --deepcopy:on -d:release --threads:off src/baraba.nim
./src/baraba
# Сървърът слуша на http://localhost:5000

# Frontend (в друг терминал)
cd frontend
npm run dev
# Приложението е на http://localhost:5173
```

## Структура на проекта

```
baraba/
├── src/
│   ├── baraba.nim          # Главен файл - REST API routes
│   ├── db/
│   │   ├── config.nim      # Настройки за база данни
│   │   └── migrate.nim     # Миграции и seed данни
│   ├── models/             # ORM модели
│   │   ├── user.nim
│   │   ├── company.nim
│   │   ├── account.nim
│   │   ├── counterpart.nim
│   │   ├── journal.nim
│   │   ├── currency.nim
│   │   ├── vatrate.nim
│   │   └── exchangerate.nim
│   ├── services/
│   │   └── auth.nim        # JWT автентикация
│   └── utils/
│       └── json_utils.nim  # JSON помощни функции
├── frontend/
│   ├── src/
│   │   ├── api/            # API клиенти
│   │   ├── components/     # React компоненти
│   │   ├── contexts/       # React contexts
│   │   ├── pages/          # Страници
│   │   └── types/          # TypeScript типове
│   └── package.json
├── docs/                   # Документация
└── baraba.nimble          # Nim package config
```

## API Endpoints

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/health` | Health check |
| POST | `/api/auth/register` | Регистрация |
| POST | `/api/auth/login` | Вход |
| GET | `/api/companies` | Списък фирми |
| POST | `/api/companies` | Нова фирма |
| GET | `/api/accounts?companyId=X` | Сметкоплан |
| POST | `/api/accounts` | Нова сметка |
| GET | `/api/counterparts?companyId=X` | Контрагенти |
| POST | `/api/counterparts` | Нов контрагент |
| GET | `/api/journal-entries?companyId=X` | Дневник |
| POST | `/api/journal-entries` | Нов запис |

## Конфигурация

### База данни (src/db/config.nim)

```nim
const
  DbHost* = "localhost"
  DbUser* = "postgres"
  DbPassword* = "pas+123"
  DbName* = "jesterac"
```

### JWT Secret (src/services/auth.nim)

```nim
const
  JwtSecret* = "your-secret-key-change-in-production-min-32-chars!"
  JwtExpirationHours* = 24
```

## Документация

- [API Reference](docs/api.md)
- [Инсталация](docs/setup.md)
- [Модели](docs/models.md)
- [Архитектура](docs/architecture.md)

## Лиценз

MIT
