# Database Models

## Общ преглед

Всички модели използват norm ORM и наследяват от `Model`. Полетата са в snake_case за съвместимост с PostgreSQL.

## Entity Relationship Diagram

```
┌─────────────┐     ┌─────────────┐
│  UserGroup  │────<│    User     │
└─────────────┘     └─────────────┘
                           │
                           │ created_by_id
                           ▼
┌─────────────┐     ┌─────────────────┐     ┌─────────────┐
│  Currency   │────<│    Company      │────<│   Account   │
└─────────────┘     └─────────────────┘     └─────────────┘
       │                   │                       │
       │                   │                       │
       ▼                   ▼                       ▼
┌─────────────┐     ┌─────────────────┐     ┌─────────────┐
│ExchangeRate │     │  Counterpart    │     │  EntryLine  │
└─────────────┘     └─────────────────┘     └─────────────┘
                           │                       │
                           │                       │
                           └───────────┬───────────┘
                                       ▼
                              ┌─────────────────┐
                              │  JournalEntry   │
                              └─────────────────┘
```

---

## UserGroup

Групи потребители с права за достъп.

| Поле | Тип | Описание |
|------|-----|----------|
| id | int64 | Primary key |
| name | string | Име (unique) |
| description | string | Описание |
| can_create_companies | bool | Право за създаване на фирми |
| can_edit_companies | bool | Право за редакция на фирми |
| can_delete_companies | bool | Право за изтриване на фирми |
| can_manage_users | bool | Право за управление на потребители |
| can_view_reports | bool | Право за преглед на справки |
| can_post_entries | bool | Право за осчетоводяване |
| created_at | DateTime | Дата на създаване |

**Seed данни:**
- Администратори (id: 1) - пълен достъп
- Потребители (id: 2) - ограничен достъп

---

## User

Потребители на системата.

| Поле | Тип | Описание |
|------|-----|----------|
| id | int64 | Primary key |
| username | string | Потребителско име (unique) |
| email | string | Email (unique) |
| password_hash | string | Хеширана парола |
| first_name | string | Име |
| last_name | string | Фамилия |
| is_active | bool | Активен ли е |
| group_id | int64 | FK към UserGroup |
| document_period_start | DateTime? | Начало на период за документи |
| document_period_end | DateTime? | Край на период за документи |
| document_period_active | bool | Активен ли е периодът |
| accounting_period_start | DateTime? | Начало на счетоводен период |
| accounting_period_end | DateTime? | Край на счетоводен период |
| accounting_period_active | bool | Активен ли е периодът |
| vat_period_start | DateTime? | Начало на ДДС период |
| vat_period_end | DateTime? | Край на ДДС период |
| vat_period_active | bool | Активен ли е периодът |
| recovery_code_hash | string | Хеш за възстановяване на парола |
| recovery_code_created_at | DateTime? | Кога е създаден кодът |
| created_at | DateTime | Дата на създаване |
| updated_at | DateTime | Дата на обновяване |

---

## Currency

Валути.

| Поле | Тип | Описание |
|------|-----|----------|
| id | int64 | Primary key |
| code | string | Код (unique), напр. "BGN" |
| name | string | Име на английски |
| name_bg | string | Име на български |
| symbol | string | Символ, напр. "лв" |
| decimal_places | int | Брой знаци след десетичната |
| is_active | bool | Активна ли е |
| is_base_currency | bool | Базова валута ли е |
| bnb_code | string | Код в БНБ |
| created_at | DateTime | Дата на създаване |
| updated_at | DateTime | Дата на обновяване |

**Seed данни:**
- BGN - Български лев (базова)
- EUR - Евро
- USD - Щатски долар

---

## Company

Фирми.

| Поле | Тип | Описание |
|------|-----|----------|
| id | int64 | Primary key |
| name | string | Име на фирмата |
| eik | string | ЕИК (unique) |
| vat_number | string | ДДС номер |
| address | string | Адрес |
| city | string | Град |
| country | string | Държава (default: "BG") |
| phone | string | Телефон |
| email | string | Email |
| contact_person | string | Лице за контакт |
| manager_name | string | Управител |
| authorized_person | string | Упълномощено лице |
| manager_egn | string | ЕГН на управител |
| authorized_person_egn | string | ЕГН на упълномощено лице |
| nap_office | string | НАП офис |
| is_active | bool | Активна ли е |
| enable_vies_validation | bool | VIES валидация |
| enable_ai_mapping | bool | AI mapping |
| auto_validate_on_import | bool | Автовалидация |
| base_currency_id | int64 | FK към Currency |
| created_at | DateTime | Дата на създаване |
| updated_at | DateTime | Дата на обновяване |

---

## Account

Сметкоплан - сметки.

| Поле | Тип | Описание |
|------|-----|----------|
| id | int64 | Primary key |
| code | string | Код на сметката, напр. "401" |
| name | string | Наименование |
| description | string | Описание |
| account_type | string | Тип: ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE |
| account_class | int | Клас (1-7) |
| level | int | Ниво в йерархията |
| is_vat_applicable | bool | Приложим ли е ДДС |
| vat_direction | string | Посока: NONE, PURCHASE, SALE |
| is_active | bool | Активна ли е |
| is_analytical | bool | Аналитична ли е |
| supports_quantities | bool | Поддържа количества |
| default_unit | string | Мерна единица по подразбиране |
| company_id | int64 | FK към Company |
| parent_id | int64? | FK към Account (родител) |
| created_at | DateTime | Дата на създаване |
| updated_at | DateTime | Дата на обновяване |

---

## Counterpart

Контрагенти - клиенти и доставчици.

| Поле | Тип | Описание |
|------|-----|----------|
| id | int64 | Primary key |
| name | string | Име |
| eik | string | ЕИК |
| vat_number | string | ДДС номер |
| street | string | Улица |
| address | string | Адрес |
| long_address | string | Пълен адрес |
| city | string | Град |
| postal_code | string | Пощенски код |
| country | string | Държава |
| phone | string | Телефон |
| email | string | Email |
| contact_person | string | Лице за контакт |
| counterpart_type | string | Тип: COMPANY, PERSON, OTHER |
| is_customer | bool | Клиент ли е |
| is_supplier | bool | Доставчик ли е |
| is_vat_registered | bool | Регистриран по ДДС |
| is_active | bool | Активен ли е |
| company_id | int64 | FK към Company |
| created_at | DateTime | Дата на създаване |
| updated_at | DateTime | Дата на обновяване |

---

## JournalEntry

Счетоводен дневник - записи.

| Поле | Тип | Описание |
|------|-----|----------|
| id | int64 | Primary key |
| entry_number | int | Номер на запис |
| document_date | DateTime | Дата на документа |
| vat_date | DateTime? | Дата за ДДС |
| accounting_date | DateTime | Счетоводна дата |
| document_number | string | Номер на документа |
| description | string | Описание |
| total_amount | float | Обща сума |
| total_vat_amount | float | ДДС сума |
| is_posted | bool | Осчетоводен ли е |
| document_type | string | Тип документ |
| vat_document_type | string | Тип ДДС документ |
| vat_purchase_operation | string | Операция покупка |
| vat_sales_operation | string | Операция продажба |
| vat_additional_operation | string | Допълнителна операция |
| vat_additional_data | string | Допълнителни данни |
| vat_rate | float | ДДС ставка |
| company_id | int64 | FK към Company |
| counterpart_id | int64? | FK към Counterpart |
| posted_by_id | int64? | FK към User (осчетоводил) |
| created_by_id | int64 | FK към User (създал) |
| posted_at | DateTime? | Дата на осчетоводяване |
| created_at | DateTime | Дата на създаване |
| updated_at | DateTime | Дата на обновяване |

---

## EntryLine

Редове на счетоводен запис.

| Поле | Тип | Описание |
|------|-----|----------|
| id | int64 | Primary key |
| debit_amount | float | Дебит сума |
| credit_amount | float | Кредит сума |
| currency_code | string | Код на валута |
| currency_amount | float | Сума във валута |
| exchange_rate | float | Курс |
| base_amount | float | Сума в базова валута |
| vat_amount | float | ДДС сума |
| quantity | float | Количество |
| unit_of_measure_code | string | Мерна единица |
| description | string | Описание |
| line_order | int | Поредност |
| journal_entry_id | int64 | FK към JournalEntry |
| account_id | int64 | FK към Account |
| counterpart_id | int64? | FK към Counterpart |
| vat_rate_id | int64? | FK към VatRate |
| created_at | DateTime | Дата на създаване |

---

## VatRate

ДДС ставки.

| Поле | Тип | Описание |
|------|-----|----------|
| id | int64 | Primary key |
| code | string | Код (unique) |
| name | string | Наименование |
| rate | float | Ставка в проценти |
| vat_direction | string | Посока: NONE, PURCHASE, SALE |
| is_active | bool | Активна ли е |
| valid_from | DateTime? | Валидна от |
| valid_to | DateTime? | Валидна до |
| company_id | int64 | FK към Company |
| created_at | DateTime | Дата на създаване |
| updated_at | DateTime | Дата на обновяване |

---

## ExchangeRate

Валутни курсове.

| Поле | Тип | Описание |
|------|-----|----------|
| id | int64 | Primary key |
| rate | float | Курс |
| reverse_rate | float | Обратен курс |
| valid_date | DateTime | Дата на валидност |
| rate_source | string | Източник: MANUAL, BNB, ECB |
| bnb_rate_id | string | ID от БНБ |
| is_active | bool | Активен ли е |
| notes | string | Бележки |
| from_currency_id | int64 | FK към Currency (от) |
| to_currency_id | int64 | FK към Currency (към) |
| created_by_id | int64? | FK към User |
| created_at | DateTime | Дата на създаване |
| updated_at | DateTime | Дата на обновяване |
