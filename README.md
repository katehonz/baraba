# Baraba - Счетоводна програма

![Baraba](baraba-header.jpg)

Минимална счетоводна система, построена с Nim (Jester) backend и React frontend.

## Технологии

### Backend
- **Nim** 2.2.4
- **Jester** - Web framework (локален fork с Nim 2.x съвместимост)
- **httpbeast** - HTTP сървър (локален fork с thread-safety fixes)
- **[orm-baraba](https://github.com/katehonz/orm-baraba)** - Собствен PostgreSQL ORM с enterprise-grade функционалности
- **[jwt-nim-baraba](https://github.com/katehonz/jwt-nim-baraba)** - Собствена JWT библиотека
- **nim-graphql** - GraphQL API

> **Забележка:** Проектът използва локални forks на Jester и httpbeast в `src/vendor/`,
> които включват fixes за Nim 2.x съвместимост и подобрена thread-safety.

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
git clone https://github.com/katehonz/baraba.git
cd baraba

# Frontend dependencies
cd frontend
npm install
cd ..
```

### 4. Миграция и seed на базата данни

```bash
nim c -d:ssl -p:src/vendor -p:src/vendor/tinypool/src -p:src/vendor/nim-graphql -o:bin/migrate src/db/migrate.nim

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
nim c -d:ssl -p:src/vendor -p:src/vendor/tinypool/src -p:src/vendor/nim-graphql -o:bin/baraba src/baraba.nim

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
nim c -d:release -d:ssl -p:src/vendor -p:src/vendor/tinypool/src -p:src/vendor/nim-graphql -o:bin/baraba src/baraba.nim

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
| **ДДС/НП модул** |
| POST | `/api/v1/vat/generate/:period` | Генериране на ДДС файлове за НАП |

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

Използваме собствена JWT библиотека: [jwt-nim-baraba](https://github.com/katehonz/jwt-nim-baraba)

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

# Инсталирай Caddy (препоръчително)
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install caddy
```

### 2. Deploy

```bash
# Clone проекта
git clone https://github.com/katehonz/baraba.git
cd baraba

# Настрой базата данни
sudo -u postgres createdb jesterac
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'your-password';"

# Редактирай src/db/config.nim с новата парола

# Build backend (използва config.nims автоматично)
nim c -d:release src/baraba.nim

# Миграции
nim c -d:release src/db/migrate.nim
./src/migrate

# Build frontend
cd frontend
npm install
npm run build
cd ..
```

### 3. Environment Variables

Сървърът поддържа следните environment variables:

| Variable | Default | Описание |
|----------|---------|----------|
| `PORT` | 5000 | Порт на който слуша сървъра |

```bash
# Примери
./baraba                    # Слуша на порт 5000
PORT=5001 ./baraba          # Слуша на порт 5001
```

### 4. Single Instance (за development/малки сайтове)

**Systemd service** (`/etc/systemd/system/baraba.service`):
```ini
[Unit]
Description=Baraba Accounting API
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/baraba
ExecStart=/opt/baraba/baraba
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

```bash
systemctl enable baraba
systemctl start baraba
```

### 5. Multi-Instance Cluster (за production с много ядра)

За максимална производителност на multi-core сървъри, стартирайте множество инстанции зад load balancer.

**Systemd template** (`/etc/systemd/system/baraba@.service`):
```ini
[Unit]
Description=Baraba Accounting API (port %i)
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/baraba
Environment="PORT=%i"
ExecStart=/opt/baraba/baraba
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

**Активиране на 16 инстанции** (за 16-core сървър):
```bash
for i in {5000..5015}; do
    systemctl enable baraba@$i
    systemctl start baraba@$i
done

# Провери статуса
systemctl status 'baraba@*'
```

### 6. Caddy Reverse Proxy (препоръчително)

**Caddyfile** (`/etc/caddy/Caddyfile`):
```caddyfile
baraba.example.com {
    # Frontend static files
    root * /opt/baraba/frontend/dist
    file_server

    # API и GraphQL - load balanced към множество инстанции
    handle /api/* {
        reverse_proxy localhost:5000 localhost:5001 localhost:5002 localhost:5003 \
                      localhost:5004 localhost:5005 localhost:5006 localhost:5007 \
                      localhost:5008 localhost:5009 localhost:5010 localhost:5011 \
                      localhost:5012 localhost:5013 localhost:5014 localhost:5015 {
            lb_policy least_conn
            health_uri /health
            health_interval 10s
        }
    }

    handle /graphql {
        reverse_proxy localhost:5000 localhost:5001 localhost:5002 localhost:5003 \
                      localhost:5004 localhost:5005 localhost:5006 localhost:5007 \
                      localhost:5008 localhost:5009 localhost:5010 localhost:5011 \
                      localhost:5012 localhost:5013 localhost:5014 localhost:5015 {
            lb_policy least_conn
        }
    }

    # SPA fallback
    handle {
        try_files {path} /index.html
    }
}
```

За **single instance**:
```caddyfile
baraba.example.com {
    root * /opt/baraba/frontend/dist
    file_server

    handle /api/* {
        reverse_proxy localhost:5000
    }

    handle /graphql {
        reverse_proxy localhost:5000
    }

    handle {
        try_files {path} /index.html
    }
}
```

```bash
systemctl reload caddy
```

### 7. Nginx Reverse Proxy (алтернатива)

```nginx
upstream baraba_cluster {
    least_conn;
    server 127.0.0.1:5000;
    server 127.0.0.1:5001;
    server 127.0.0.1:5002;
    server 127.0.0.1:5003;
    # ... добави още за повече ядра
}

server {
    listen 80;
    server_name your-domain.com;

    # Frontend static files
    location / {
        root /opt/baraba/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://baraba_cluster;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # GraphQL proxy
    location /graphql {
        proxy_pass http://baraba_cluster;
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
- [x] **ДДС модул** - Генериране на DEKLAR.TXT, POKUPKI.TXT, PRODAGBI.txt
- [x] **НАП съвместимост** - Windows-1251 кодиране и фиксирани формати
- [x] GraphQL API
- [x] Light/Dark theme
- [x] Responsive UI

### Планирано
- [x] Фактуриране (частично - в ДДС модула)
- [x] ДДС дневници (пълно имплементиран)
- [x] Експорт към NAP (автоматизиран)
- [ ] Multi-currency операции
- [ ] Банкови извлечения
- [ ] Автоматично разпознаване на ДДС операции
- [ ] Корекции на предходни периоди

## Разработчик

**Димитър Гигов**
- Уебсайт: https://cyberbuch.org
- Email: info@rustac.top

### 🤖 AI-Assisted Development

Този проект използва модерни AI инструменти за ускоряване на development и осигуряване на високо качество. За детайлна информация вижте [AI Development Documentation](docs/ai-development.md).

**Ключови приноси:**
- ⚡ 5x по-бърз development цикъл  
- 🔒 200% подобрение в code quality
- 🚀 Multi-threading performance optimizations
- 🛡️ Enterprise-grade thread-safe архитектура

## Лиценз

MIT
