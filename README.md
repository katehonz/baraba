# Baraba Accounting System 📊

🚀 **ХИБРИДНА АРХИТЕКТУРА** - Elixir Phoenix ядро + Nim/Java микросървизи + Java Jasper Service - модерна счетоводна система за български фирми.

## 📋 Общ преглед

**Baraba** е иновативна счетоводна система, използваща **хибридна архитектура**, която комбинира най-доброто от три технологии:
- **Elixir Phoenix** за core бизнес логика и concurrency
- **Nim** за бързи микросървизи (identity, VAT validation)
- **Java** за enterprise PDF генерация и document scanning

Системата е предназначена за малки и средни предприятия в България и предоставя оптимизирано решение за двойно счетоводство, ДДС съответствие и генериране на отчети.

### 🎯 Основни характеристики

- ✅ **Пълно двойно счетоводство** с автоматична валидация на баланси  
- ✅ **Българско ДДС съответствие** с всички необходими данъчни ставки
- ✅ **SAF-T отчети** за Национална агенция за приходите (НАП)
- ✅ **Управление на основни средства** с амортизация и категории
- ✅ **Складово управление** с FIFO/Average costing
- ✅ **Валутни курсове** в реално време от ECB
- ✅ **Многонаемна архитектура** с поддръжка на множество фирми
- ✅ **Модерен уеб интерфейс** с React, TypeScript и Chakra UI
- ✅ **RESTful API** за интеграция с външни системи
- ✅ **PDF отчети** чрез Jasper Reports integration

## 🏗️ Хибридна Архитектура

Системата използва **оптимизирана хибридна архитектура**, която съчетава силните страни на три технологии:

```
🎯 HYBRID STACK ARCHITECTURE
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (5173)                   │
│              TypeScript + Chakra UI + Vite                │
└─────────────────────┬───────────────────────────────────────┘
                        │ HTTP/WebSocket
                        ▼
┌─────────────────────────────────────────────────────────────┐
│               Elixir Phoenix Core                          │
│              (4000 - API, 5006 - SAFT)                    │
│  💪 Счетоводна логика, бизнес правила, concurrency        │
└─────┬───────────┬───────────┬───────────────────────────────┘
      │           │           │
      ▼           ▼           ▼
 ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
 │  Java    │ │   Nim    │ │   Nim    │ │   Nim    │ │  Java    │
 │ Scanner  │ │ Identity │ │   VIES   │ │   VAT    │ │ Jasper   │
 │ Service  │ │ Service  │ │ Service  │ │ Service  │ │ Service  │
 │          │ │          │ │          │ │          │ │          │
 │ • QR/Doc │ │ • JWT    │ │ • EU VAT │ │ • BG VAT │ │ • PDF    │
 │ • Scan   │ │ • Users  │ │ • Valid  │ │ • Rules  │ │ • Reports│
 │ Port 5001│ │ • Groups │ │ Port 5003│ │ Port 5004│ │ Port 5005│
 └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
      │           │           │           │           │
      └────────────┴────────────┴────────────┴────────────┘
                                    ▼
                         ┌─────────────────────┐
                         │   PostgreSQL         │
                         │     Database         │
                         │     Port 5432        │
                         └─────────────────────┘
```

### 🚀 **Технологични предимства:**

| Технология | Приложение | Предимства |
|------------|-----------|------------|
| **Elixir** | Core бизнес логика | Concurrency, fault tolerance, hot reload |
| **Nim** | Специализирани микросървизи | Native performance, бърза компилация, малък footprint |
| **Java** | Jasper PDF генерация | Enterprise grade, богата екосистема за отчети |
| **React** | Frontend | Модерен UI, TypeScript, rich ecosystem |

### 🛠️ Хибриден технологичен стек

**Backend Core:**
- **Elixir 1.15+**: Phoenix framework, Ecto ORM, OTP supervision
- **PostgreSQL 15+**: ACID transactions, reliability, scalability

**Специализирани микросървизи:**
- **Nim 2.0+**: Native performance за специализирани задачи
   - JWT authentication & user management
   - EU VAT validation (VIES integration)
   - Bulgarian VAT rules & calculations
- **Java 17+**: Spring Boot, Jasper Reports, Azure OCR за enterprise PDF генерация и document scanning

**Frontend & DevOps:**
- **React 18**: TypeScript, Chakra UI, Vite за blazing fast development
- **Docker & Docker Compose**: Multi-orchestration за production готовина

## 🚀 Бърз старт

### Предварителни изисквания

- [Docker](https://www.docker.com/) и Docker Compose
- Git
- (Опционално) Elixir/OTP, Node.js, Nim, Java за локална разработка

### Инсталация и стартиране

1. **Клонирайте репозиторито:**
   ```bash
   git clone <repository-url>
   cd baraba-ub
   ```

2. **Стартирайте основната система:**
   ```bash
   docker-compose up -d
   ```

3. **Стартирайте Nim микросървизите (ако са нужни):**
   ```bash
   docker-compose -f docker-compose.nim.yml up -d
   ```

4. **Проверете статус на всички услуги:**
   ```bash
   docker-compose ps && docker-compose -f docker-compose.nim.yml ps
   ```

5. **Достъп до системата:**
   - **Уеб интерфейс**: http://localhost:5173
   - **Elixir API**: http://localhost:4000/api
   - **Identity Service** (Nim): http://localhost:5002/api
    - **Scanner Service** (Java): http://localhost:5001/api
   - **VIES Service** (Nim): http://localhost:5003/api
   - **VAT Service** (Nim): http://localhost:5004/api
   - **Jasper Service** (Java): http://localhost:5005/api
   - **SAFT Service** (Elixir): http://localhost:5006

## 📚 Документация

### 🚀 Основна документация
- [🏗️ Хибридна Архитектура](docs/ARCHITECTURE.md) - Технологичен стек и design decisions
- [🔌 API Документация](docs/API.md) - Пълен API reference за всички услуги
- [🚀 Deployment Guide](docs/DEPLOYMENT.md) - Production deployment и configuration
- [📖 Техническа документация](docs/TECHNICAL.md) - Вътрешна структура и patterns
- [👨‍💻 Ръководство за разработчици](docs/DEVELOPMENT.md) - Development workflow

### 📋 Миграция
- [🔄 Migration Guide](MIGRATION.md) - Преход от Nim към хибридна архитектура

### 📖 Специализирана документация
- **Nim микросървизи**: Identity, Scanner, VIES, VAT
- **Java Jasper Service**: PDF генерация и отчети  
- **Elixir Phoenix**: Core бизнес логика и SAFT

## 🗂️ Основни модули

### 🔢 Счетоводни записи (Core)
- **Фирми** - Управление на фирми и техните данни
- **Сметки** - Счетоводна сметка план
- **Контрагенти** - Доставчици и клиенти с ДДС валидация
- **Счетоводни записи** - Журнални записи с двойна статия и баланс валидация
- **ДДС Ставки** - Управление на данъчни ставки и валидност

### 🏢 Основни средства и материали (New)
- **Основни средства** - Управление с амортизация и категории
- **Продукти** - Каталог на стоки и услуги
- **Складова наличност** - Проследяване на количества и стойности
- **Складови движения** - FIFO/Average costing методи

### 💱 Валутни операции (New)  
- **Валутни курсове** - Автоматично актуализиране от ECB
- **Обменни валидации** - Конвертиране и калкулации

### 📊 Отчети и декларации
- **SAF-T XML** - Стандартен одитен файл за НАП (месечен/годишен)
- **ДДС декларации** - Автоматично генериране на НАП форми
- **PDF отчети** - Финансови отчети чрез Jasper Reports
- **Складови справки** - Движения и наличности

## 🔄 Работен процес

### 1. Създаване на фирма
```bash
curl -X POST http://localhost:4000/api/companies \
  -H "Content-Type: application/json" \
  -d '{"name": "Тест ООД", "vat_number": "BG123456789", "address": "София"}'
```

### 2. Създаване на сметки
```bash
curl -X POST http://localhost:4000/api/companies/{id}/accounts \
  -H "Content-Type: application/json" \
  -d '{"number": "501", "name": "Материали", "type": "asset"}'
```

### 3. Въвеждане на счетоводен запис
```bash
curl -X POST http://localhost:4000/api/companies/{id}/journal-entries \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2024-01-15",
    "description": "Покупка на стоки",
    "entry_lines": [
      {"account_id": "acc1", "debit": 1000, "credit": 0},
      {"account_id": "acc2", "debit": 0, "credit": 1000}
    ]
  }'
```

## 🧪 Тестване

### Backend тестове
```bash
cd baraba_ub
mix test                           # Всички тестове
mix test apps/baraba_umbrella/test  # Само core домейни
mix test apps/baraba_umbrella_web/test # Само API тестове
```

### Frontend тестове
```bash
cd frontend
npm test                          # React component тестове
npm run test:coverage            # С coverage отчет
```

### API тестове
```bash
# Проверка на health endpoint
curl http://localhost:4000/api/health

# Тест на SAFT генерация 
curl -X POST http://localhost:5006/api/saft/monthly \
  -H "Content-Type: application/json" \
  -d '{"company_id": "test", "year": 2024, "month": 1}'

# Тест на новите модули
curl -X POST http://localhost:4000/api/companies/{id}/fixed-assets \
  -H "Content-Type: application/json" \
  -d '{"name": "Компютър", "category": "IT", "value": 2500}'
```

## 🔧 Конфигурация

### Променливи на средата
- `DB_HOST` - Хост на базата данни (по подразбиране: localhost)
- `DB_PORT` - Порт на базата данни (по подразбиране: 5432)
- `DB_NAME` - Име на базата данни (по подразбиране: jesterac)
- `DB_USER` - Потребител на базата данни (по подразбиране: postgres)
- `DB_PASSWORD` - Парола на базата данни (по подразбиране: pas+123)

### База данни
- **Тип**: PostgreSQL
- **Име**: jesterac
- **Миграции**: Автоматични при стартиране
- **Seed данни**: Демо данни за тестове

## 📋 Изисквания за съответствие

### Българско законодателство
- ✅ Наредба Н-18 за електронни услуги
- ✅ ДДС закон и регламенти
- ✅ Счетоводен закон
- ✅ SAF-T формат за НАП

### Сигурност
- 🔐 HTTPS връзки (в production)
- 🛡️ Валидация на данни
- 🔒 Роли и права на достъп
- 📝 Одитни следи

## 🚀 Продукционна среда

### Docker deployment
```bash
# Production конфигурация
docker-compose -f docker-compose.prod.yml up -d
```

### Environment конфигурация
```bash
# Променливи за production
export MIX_ENV=prod
export DB_HOST=your-db-host
export DB_PASSWORD=your-secure-password
export SECRET_KEY_BASE=your-secret-key
```

## 🤝 Приноси

Сътрудничеството е добре дошло! Моля, прочетете [CONTRIBUTING.md](CONTRIBUTING.md) за насоки.

### Процес на принос
1. Fork-нете репозиторито
2. Създайте branch за вашата промяна
3. Направете commits със смислени съобщения
4. Push-нете към вашия fork
5. Създайте Pull Request

## 📄 Лиценз

Този проект е лицензиран под MIT лиценз - вижте [LICENSE](LICENSE) файл за подробности.

## 🆘 Поддръжка

- 📧 Email: support@baraba.bg
- 💬 Discord: [Baraba Community](https://discord.gg/baraba)
- 🐛 Issues: [GitHub Issues](https://github.com/baraba/baraba-ub/issues)

## 🗺️ Пътна карта

### Версия 1.0 (Текуща) ✅
- ✅ **Успешна миграция** от Nim към Elixir Phoenix
- ✅ Основно двойно счетоводство с баланс валидация
- ✅ Българско ДДС съответствие и SAF-T отчети
- ✅ Управление на основни средства и склад
- ✅ Валутни курсове и обменни операции
- ✅ Модерен React интерфейс с TypeScript

### Версия 1.1 (Планирана Q3 2024)
- 🔄 User authentication и authorization с Guardian JWT
- 🔄 Автоматична банков интеграция
- 🔄 Real-time updates с Phoenix Channels
- 🔄 Advanced reporting и dashboard
- 🔄 Mobile API endpoints

### Версия 2.0 (Бъдещо 2025)
- 🔮 AI-powered финансови анализи
- 🔮 Multi-language поддръжка (EN/DE/GR)
- 🔮 GraphQL API за complex queries
- 🔮 Third-party интеграции (ERP, CRM)
- 🔮 Micro-frontends за large teams

## 👥 Екип

- **Lead Developer**: Development Team
- **Backend Team**: Elixir/Phoenix специалисти
- **Frontend Team**: React/TypeScript разработчици  
- **DevOps**: Docker/Kubernetes инженери

## 🎉 Хибридна архитектура - успешно внедрена!

**Проектът използва оптимална хибридна архитектура!** 

🚀 **Резултати:**
- **Най-доброто от три технологии** - Elixir, Nim, Java
- **Запазени работещи Nim микросървизи** - без нужда от пренаписване
- **Бързо VPS компилиране** - само Elixir core се рекомпилира
- **Enterprise grade PDF генерация** с Jasper Reports
- **Нативна performance** за специализирани задачи
- **Fault tolerance** и concurrency за core логика
- **Модерен TypeScript/React UI** с hot reload

**🎯 Технологичен оптимизъм:**
- Всеки компонент използва най-подходящата технология
- Минимално компилационно време за deployment
- Максимална производителност за всяка задача
- Производство-готова инфраструктура

---

**Baraba** - Счетоводната система за модерния български бизнес! 🇧🇬

*Мигрирана с ❤️ към Elixir в България*