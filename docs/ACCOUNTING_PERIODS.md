# Приключване на счетоводни периоди (Period Locking)

## Преглед

Функционалността за приключване на периоди предоставя контролиран достъп до счетоводни данни като предотвратява нежелани промени в приключени периоди. Това е критично важно за съответствие с регулациите след подаване на ДДС декларации.

## Архитектура

### Database Schema

```sql
CREATE TABLE accounting_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'OPEN',
  closed_by_id UUID REFERENCES users(id),
  closed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  inserted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique constraint per company, year, month
UNIQUE INDEX accounting_periods_company_id_year_month_index (company_id, year, month);
```

### Бизнес Правила

1. **OPEN** период - Позволени всички операции (create, update, delete, post)
2. **CLOSED** период - Забранени всички модификации на JournalEntry
3. Автоматично създаване на периоди при нужда
4. Audit trail с who/when/why за close операции

## Backend Имплементация

### Elixir Phoenix Components

#### AccountingPeriod Schema
- **Location:** `apps/baraba_umbrella/lib/baraba_umbrella/accounting/accounting_period.ex`
- **Валидации:** Година (1999-2100), Месец (1-12), Status (OPEN/CLOSED)
- **Query функции:** `by_company/2`, `by_year/2`, `by_month/2`, `open/1`, `closed/1`

#### Accounting Context
- **Location:** `apps/baraba_umbrella/lib/baraba_umbrella/accounting.ex`
- **Ключови функции:**
  - `is_period_open?(company_id, date)` - проверява статус
  - `validate_accounting_date(company_id, date)` - валидация
  - `close_accounting_period(period, user_id, notes)` - заключване
  - `reopen_accounting_period(period)` - отключване

#### JournalEntry Validation
- **Location:** `apps/baraba_umbrella/lib/baraba_umbrella/accounting/journal_entry.ex`
- **Validation:** `validate_period_open/1` проверява дали accounting_date е в отворен период

#### Period Checks
Защитени операции:
- `create_journal_entry/1` - блокира създаване в затворен период
- `update_journal_entry/2` - блокира редакция в затворен период  
- `delete_journal_entry/1` - блокира изтриване в затворен период
- `post_journal_entry/2` - блокира постинг в затворен период

### API Endpoints

| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/api/companies/{id}/accounting-periods` | Списък с периоди (с филтри) |
| GET | `/api/companies/{id}/accounting-periods/{year}/{month}` | Детайли за период |
| POST | `/api/companies/{id}/accounting-periods` | Създаване на период |
| POST | `/api/companies/{id}/accounting-periods/close/{year}/{month}` | Приключване на период |
| POST | `/api/companies/{id}/accounting-periods/reopen/{year}/{month}` | Отваряне на период |

**Query Parameters (за GET):**
- `year` - филтър по година
- `month` - филтър по месец  
- `status` - филтър по статус (OPEN/CLOSED)

## Frontend Имплементация

### React Components

#### AccountingPeriodsPage
- **Location:** `frontend/src/pages/AccountingPeriodsPage.tsx`
- **Функционалности:**
  - Табличен изглед на всички периоди
  - Филтриране по година/месец/статус
  - Close/Open операции с modal confirmation
  - Toast notifications за резултати

#### API Client
- **Location:** `frontend/src/api/accounting-periods.ts`
- **Функции:**
  - `getAccountingPeriods()` - извличане с филтри
  - `createAccountingPeriod()` - създаване
  - `closeAccountingPeriod()` - приключване
  - `reopenAccountingPeriod()` - отваряне
  - `isPeriodOpen()` - проверка статус

### TypeScript Types
- **Location:** `frontend/src/types/index.ts`
- **Interfaces:** `AccountingPeriod`, `AccountingPeriodForm`

### Navigation Integration
- **Място:** Sidebar -> Main секция
- **Икона:** FiCalendar (календар)
- **Рута:** `/accounting-periods`

## Локализация

### Български (bg)
- **Location:** `frontend/src/locales/bg/translation.json`
- **Секция:** `accountingPeriods`

### Английски (en)  
- **Location:** `frontend/src/locales/en/translation.json`
- **Секция:** `accountingPeriods`

## Потребителски Интерфейс

### Функционалности
1. **Филтриране:** Година (number input), Месец (dropdown), Статус (dropdown)
2. **Таблица:** Година, Месец, Статус (badge), Приключен на, Действия
3. **Действия:** Close (за OPEN периоди), Reopen (за CLOSED периоди)
4. **Modal Confirmation:** Предупреждение при close с опция за notes

### UX/WAF аспекти
- Цветово кодиране на статуси (Open=green, Closed=red)
- Месечни имена на български/английски
- Responsive design за всички устройства
- Loading states и error handling

## Security Considerations

1. **Permission Checks:** Само потребители с права могат да close/reopen периоди
2. **Audit Trail:** Записване на who/when/why за всички close операции
3. **Validation:** Server-side validation за всички операции
4. **Cascade Protection:** Предотвратяване на indirect промени през релации

## Error Handling

### Backend Errors
- `{:error, "Accounting period for YYYY-MM-DD is closed"}` - периодът е приключен
- `Ecto.ConstraintError` - duplicate period (company_id, year, month)
- Authorization errors при липса на права

### Frontend Error Handling
- Toast notifications за всички операции
- Modal dialogs за confirmation
- Graceful fallback при network грешки

## Performance Considerations

1. **Indexes:** 
   - `company_id, year, month` (unique)
   - `company_id, status` за филтриране
   - `closed_by_id` за audit trail

2. **Caching:** Frontend кешира списъка с периоди
3. **Lazy Loading:** Пагинация при много периоди
4. **Query Optimization:** Efficient filtering в backend

## Testing Strategy

### Unit Tests
- AccountingPeriod schema validations
- Period checking functions
- JournalEntry blocking logic

### Integration Tests  
- API endpoints
- Period locking enforcement
- Cross-company isolation

### E2E Tests
- Close/reopen workflows
- UI interactions
- Error scenarios

## Deployment Notes

1. **Database Migration:** Изпълнява се безопасно с `mix ecto.migrate`
2. **Backward Compatibility:** Съществуващи entries продължават да работят
3. **Rollback:** Може да се rollback без загуба на данни
4. **Monitoring:** Допълнителни metrics за period locking

## Future Enhancements

1. **Automatic Closing:** Scheduler за автоматично приключване
2. **Bulk Operations:** Масово close/reopen на периоди
3. **Approval Workflow:** Multi-step approval за critical periods
4. **Reporting:** Period locking reports и audit trails
5. **Integration:** Свързване с VAT submission процеси

---

**Версия:** 1.0  
**Дата:** 21.12.2025  
**Автор:** OpenCode Assistant