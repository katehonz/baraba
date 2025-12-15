# Baraba - Счетоводна програма

Минимална счетоводна система, построена с Nim (Jester) backend и React frontend.

## Технологии

### Backend
- **Nim** 2.2.4
- **Jester** - Web framework
- **norm** - ORM за PostgreSQL
- **jwt** - JSON Web Token автентикация
- **nim-graphql** - GraphQL API

### Frontend
- **React** 19 + TypeScript
- **Vite** 7 - Build tool
- **Chakra UI** 2 - UI библиотека с light/dark theme
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
# Clone
git clone https://gitlab.com/balvatar/baraba.git
cd baraba

# Frontend dependencies
cd frontend
npm install
cd ..
```

### 4. Миграция и seed на базата данни

```bash
nim c -d:ssl -p:src/vendor -p:src/vendor/nim-jwt/src -p:src/vendor/tinypool/src -p:src/vendor/nim-graphql -o:bin/migrate src/db/migrate.nim

./bin/migrate
```

Това създава:
- Всички таблици
- Групи потребители (Администратори, Потребители)
- **Default admin user**: `admin` / `admin123`
- Валути (BGN, EUR, USD)

### 5. Компилация и стартиране

```bash
# Backend
nim c -d:ssl -p:src/vendor -p:src/vendor/nim-jwt/src -p:src/vendor/tinypool/src -p:src/vendor/nim-graphql -o:bin/baraba src/baraba.nim

./bin/baraba
# Сървърът слуша на http://localhost:5000

# Frontend (в друг терминал)
cd frontend
npm run dev
# Приложението е на http://localhost:5173
```

### Production build

```bash
# Backend с оптимизации
nim c -d:release -d:ssl -p:src/vendor -p:src/vendor/nim-jwt/src -p:src/vendor/tinypool/src -p:src/vendor/nim-graphql -o:bin/baraba src/baraba.nim

# Frontend build
cd frontend
npm run build
# Static файловете са в frontend/dist/
```

## Default Credentials

| Потребител | Парола | Роля |
|------------|--------|------|
| admin | admin123 | Администратор |

**Важно:** Сменете паролата в production!

## Структура на проекта

```
baraba/
├── src/
│   ├── baraba.nim          # Главен файл - REST API routes
│   ├── db/
│   │   ├── config.nim      # Database connection pool
│   │   └── migrate.nim     # Миграции и seed данни
│   ├── models/             # ORM модели (norm)
│   │   ├── user.nim        # User, UserGroup
│   │   ├── company.nim     # Company
│   │   ├── account.nim     # Account (сметкоплан)
│   │   ├── counterpart.nim # Counterpart (контрагенти)
│   │   ├── journal.nim     # JournalEntry, EntryLine
│   │   ├── currency.nim    # Currency
│   │   ├── vatrate.nim     # VatRate
│   │   └── exchangerate.nim# ExchangeRate
│   ├── services/
│   │   └── auth.nim        # JWT автентикация
│   ├── graphql/
│   │   ├── schema.graphql  # GraphQL schema
│   │   └── resolvers.nim   # GraphQL resolvers
│   ├── utils/
│   │   └── json_utils.nim  # JSON помощни функции
│   └── vendor/             # Vendored dependencies
│       ├── nim-jwt/
│       ├── nim-graphql/
│       └── tinypool/
├── frontend/
│   ├── src/
│   │   ├── api/            # API клиенти (axios)
│   │   ├── components/     # React компоненти
│   │   │   └── Layout.tsx  # Main layout с навигация
│   │   ├── contexts/       # React contexts
│   │   │   ├── AuthContext.tsx
│   │   │   └── CompanyContext.tsx
│   │   ├── pages/          # Страници
│   │   │   ├── auth/       # Login, Register
│   │   │   ├── companies/  # Фирми
│   │   │   ├── accounts/   # Сметкоплан
│   │   │   ├── counterparts/ # Контрагенти
│   │   │   └── journal/    # Дневник
│   │   ├── types/          # TypeScript типове
│   │   ├── theme.ts        # Chakra UI тема
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
├── bin/                    # Compiled binaries
└── README.md
```

## API Reference

### REST Endpoints

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/` | Health check |
| POST | `/api/auth/login` | Вход |
| POST | `/api/auth/register` | Регистрация |
| GET | `/api/auth/me` | Текущ потребител |
| GET | `/api/companies` | Списък фирми |
| POST | `/api/companies` | Нова фирма |
| GET | `/api/companies/:id` | Фирма по ID |
| GET | `/api/accounts/:id` | Сметка по ID |
| GET | `/api/accounts/company/:companyId` | Сметкоплан на фирма |
| POST | `/api/accounts` | Нова сметка |
| GET | `/api/counterparts/:id` | Контрагент по ID |
| GET | `/api/counterparts?companyId=X` | Контрагенти на фирма |
| POST | `/api/counterparts` | Нов контрагент |
| GET | `/api/journal-entries?companyId=X` | Дневник на фирма |
| GET | `/api/journal-entries/:id` | Запис по ID |
| POST | `/api/journal-entries` | Нов запис |
| PUT | `/api/journal-entries/:id` | Редакция на запис |
| POST | `/api/journal-entries/:id/post` | Осчетоводяване |
| POST | `/api/journal-entries/:id/unpost` | Отмяна на осчетоводяване |
| GET | `/api/entry-lines?journalEntryId=X` | Редове на запис |
| POST | `/api/entry-lines` | Нов ред |
| PUT | `/api/entry-lines/:id` | Редакция на ред |
| DELETE | `/api/entry-lines/:id` | Изтриване на ред |
| GET | `/api/reports/turnover-sheet` | Оборотна ведомост |
| GET | `/api/reports/general-ledger` | Главна книга |

### GraphQL Endpoint

```
POST /graphql
```

**Примерни заявки:**

```graphql
# Вход
mutation {
  login(username: "admin", password: "admin123") {
    token
    user { id username email }
  }
}

# Списък фирми
query {
  companies {
    id name eik vatNumber
  }
}

# Счетоводен дневник
query {
  journalEntries(companyId: 1) {
    id documentDate documentNumber description totalAmount isPosted
    lines {
      id debitAmount creditAmount
      account { code name }
    }
  }
}

# Оборотна ведомост
query {
  turnoverSheet(companyId: 1, startDate: "2024-01-01", endDate: "2024-12-31") {
    account { code name accountType }
    openingDebit openingCredit
    turnoverDebit turnoverCredit
    closingDebit closingCredit
  }
}
```

## Конфигурация

### База данни (src/db/config.nim)

```nim
const
  DbHost* = "localhost"
  DbUser* = "postgres"
  DbPassword* = "pas+123"
  DbName* = "jesterac"
  PoolSize* = 10
```

### JWT (src/services/auth.nim)

```nim
const
  JwtSecret* = "your-secret-key-change-in-production-min-32-chars!"
  JwtExpirationHours* = 24
```

**Важно:** Сменете `JwtSecret` в production!

## VPS Deployment

### 1. Подготовка на сървъра

```bash
# Инсталирай Nim
curl https://nim-lang.org/choosenim/init.sh -sSf | sh

# Инсталирай PostgreSQL
apt install postgresql postgresql-contrib

# Инсталирай Node.js (за frontend build)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

### 2. Deploy

```bash
# Clone проекта
git clone https://gitlab.com/balvatar/baraba.git
cd baraba

# Настрой базата данни
sudo -u postgres createdb jesterac
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'your-password';"

# Редактирай src/db/config.nim с новата парола

# Build backend
nim c -d:release -d:ssl -p:src/vendor -p:src/vendor/nim-jwt/src -p:src/vendor/tinypool/src -p:src/vendor/nim-graphql -o:bin/baraba src/baraba.nim

# Миграции
nim c -d:ssl -p:src/vendor -p:src/vendor/nim-jwt/src -p:src/vendor/tinypool/src -p:src/vendor/nim-graphql -o:bin/migrate src/db/migrate.nim
./bin/migrate

# Build frontend
cd frontend
npm install
npm run build
cd ..
```

### 3. Systemd service

```bash
# /etc/systemd/system/baraba.service
[Unit]
Description=Baraba Accounting API
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/baraba
ExecStart=/var/www/baraba/bin/baraba
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
systemctl enable baraba
systemctl start baraba
```

### 4. Nginx reverse proxy

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend static files
    location / {
        root /var/www/baraba/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # GraphQL proxy
    location /graphql {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Функционалност

### Реализирано
- [x] Автентикация (JWT)
- [x] Управление на фирми
- [x] Сметкоплан
- [x] Контрагенти
- [x] Счетоводен дневник
- [x] Осчетоводяване/отмяна
- [x] Оборотна ведомост
- [x] Главна книга
- [x] GraphQL API
- [x] Light/Dark theme
- [x] Responsive UI

### Планирано
- [ ] Фактуриране
- [ ] ДДС дневници
- [ ] Експорт към NAP
- [ ] Multi-currency операции
- [ ] Банкови извлечения

## Лиценз

MIT
