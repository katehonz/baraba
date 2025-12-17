# Инсталация и настройка

## Изисквания

### Nim

```bash
# Инсталирай choosenim (Nim version manager)
curl https://nim-lang.org/choosenim/init.sh -sSf | sh

# Инсталирай stable версия
choosenim stable

# Провери версията
nim --version
# Nim Compiler Version 2.2.4
```

### Node.js

```bash
# Провери версията
node --version
# v18.0.0 или по-нова

npm --version
# 9.0.0 или по-нова
```

### PostgreSQL

```bash
# Debian/Ubuntu
sudo apt install postgresql postgresql-contrib

# Стартирай услугата
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Провери версията
psql --version
# psql (PostgreSQL) 15.x
```

## Настройка на базата данни

### 1. Създай база данни

```bash
# Като postgres потребител
sudo -u postgres createdb jesterac

# Или с psql
sudo -u postgres psql
CREATE DATABASE jesterac;
\q
```

### 2. Настрой парола (ако е нужно)

```bash
sudo -u postgres psql
ALTER USER postgres PASSWORD 'pas+123';
\q
```

### 3. Провери връзката

```bash
PGPASSWORD='pas+123' psql -h localhost -U postgres -d jesterac -c '\conninfo'
```

## Инсталация на проекта

### 1. Clone проекта

```bash
cd /home/dvg/z-nim-proloq
git clone <repo-url> baraba
cd baraba
```

### 2. Backend dependencies

```bash
# Инсталирай Nim пакети
nimble install

# Това инсталира:
# - jester >= 0.6.0          # Web framework
# - norm >= 2.8.0            # PostgreSQL ORM
# - jwt (собствена библиотека) # JWT authentication (https://github.com/katehonz/jwt-nim-baraba)
# - nim-graphql              # GraphQL support (vendor)
# - tinypool                 # Connection pool (vendor)
```

### 3. Frontend dependencies

```bash
cd frontend
npm install
```

### 4. Конфигурация

Редактирай `src/db/config.nim` ако трябва:

```nim
const
  DbHost* = "localhost"
  DbUser* = "postgres"
  DbPassword* = "pas+123"  # Смени с твоята парола
  DbName* = "jesterac"
```

Смени JWT secret в `src/services/auth.nim`:

```nim
const
  JwtSecret* = "your-very-long-secret-key-at-least-32-characters!"
```

## Компилация

### Backend

```bash
# Компилирай миграцията
nim c --deepcopy:on -d:release --threads:off src/db/migrate.nim

# Компилирай сървъра
nim c --deepcopy:on -d:release --threads:off src/baraba.nim
```

**Важни флагове:**
- `--deepcopy:on` - Нужен за norm ORM с --mm:orc
- `-d:release` - Оптимизиран build
- `--threads:off` - Избягва SIGSEGV в многонишков режим

### Frontend

```bash
cd frontend

# Development build
npm run dev

# Production build
npm run build

# Lint
npm run lint

# Preview production build
npm run preview
```

**Frontend зависимости:**
- React 19.2.0
- TypeScript
- Vite (build tool)
- Chakra UI (component library)
- React Router (routing)
- React Query (server state)
- React Hook Form (forms)
- Axios (HTTP client)

## Миграция на базата данни

```bash
# Стартирай миграцията
./src/db/migrate

# Output:
# Starting database migrations...
# Creating UserGroup table...
# Creating User table...
# ...
# All migrations completed successfully!
# Seeding initial data...
# Created admin group (id: 1)
# Created user group (id: 2)
# Created BGN currency
# Created EUR currency
# Created USD currency
# Initial data seeded!
```

## Стартиране

### Backend

```bash
./src/baraba

# Output:
# Starting Baraba API server...
# http://localhost:5000
# INFO Jester is making jokes at http://0.0.0.0:5000
# Starting 1 threads
# Listening on port 5000
```

### Frontend

```bash
cd frontend
npm run dev

# Output:
# VITE v7.x.x ready in xxx ms
# ➜ Local: http://localhost:5173/
```

## Проверка

```bash
# Health check
curl http://localhost:5000/health
# {"status":"ok"}

# Регистрация
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.bg","password":"test123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'

# GraphQL Playground
curl http://localhost:5000/graphql
```

## Проблеми и решения

### SIGSEGV при стартиране

**Проблем:** Сървърът се срива с "Illegal storage access"

**Решение:** Компилирай с `--threads:off`:
```bash
nim c --deepcopy:on -d:release --threads:off src/baraba.nim
```

### Database select query failed

**Проблем:** Грешка при SELECT заявки

**Решение:** Увери се, че колоните в базата са snake_case. Ако не са:
```bash
# Drop всички таблици
PGPASSWORD='pas+123' psql -h localhost -U postgres -d jesterac -c "
DROP TABLE IF EXISTS \"EntryLine\" CASCADE;
DROP TABLE IF EXISTS \"JournalEntry\" CASCADE;
..."

# Стартирай миграцията отново
./src/db/migrate
```

### Connection refused на PostgreSQL

**Проблем:** Не може да се свърже с базата

**Решение:**
```bash
# Провери дали PostgreSQL работи
sudo systemctl status postgresql

# Стартирай ако не работи
sudo systemctl start postgresql

# Провери pg_hba.conf за localhost достъп
sudo nano /etc/postgresql/15/main/pg_hba.conf
# Добави: local all all md5
```

### Frontend CORS грешки

**Проблем:** CORS blocked в браузъра

**Решение:** Backend-ът автоматично добавя CORS headers. Увери се, че сървърът работи на порт 5000.

### GraphQL грешки

**Проблем:** GraphQL заявки не работят

**Решение:** Провери дали GraphQL е зареден правилно в main router:
```nim
# В baraba.nim трябва да има:
import graphql/resolvers
# И router-ът трябва да включва GraphQL routes
```

### Vendor пакети

Приложението използва vendor-нати пакети:
- `nim-graphql` в `src/vendor/nim-graphql/`
- `tinypool` в `src/vendor/tinypool/`

Тези пакети са включени в репозиторито и не изискват отделна инсталация.
