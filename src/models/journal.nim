import std/[times, options]
import orm/orm
import company, counterpart, user, account, vatrate

type
  JournalEntry* = object of Model
    entry_number*: int
    document_date*: DateTime
    vat_date*: Option[DateTime]
    accounting_date*: DateTime
    document_number*: string
    description*: string
    total_amount*: float
    total_vat_amount*: float
    is_posted*: bool
    document_type*: string
    vat_document_type*: string
    vat_purchase_operation*: string
    vat_sales_operation*: string
    vat_additional_operation*: string
    vat_additional_data*: string
    vat_rate*: float
    company_id*: int64
    counterpart_id*: Option[int64]
    posted_by_id*: Option[int64]
    created_by_id*: int64
    posted_at*: Option[DateTime]
    created_at*: DateTime
    updated_at*: DateTime

  EntryLine* = object of Model
    debit_amount*: float
    credit_amount*: float
    currency_code*: string
    currency_amount*: float
    exchange_rate*: float
    base_amount*: float
    vat_amount*: float
    quantity*: float
    unit_of_measure_code*: string
    description*: string
    line_order*: int
    journal_entry_id*: int64
    account_id*: int64
    counterpart_id*: Option[int64]
    vat_rate_id*: Option[int64]
    created_at*: DateTime

proc newJournalEntry*(
  entry_number = 0,
  document_date = now(),
  accounting_date = now(),
  document_number = "",
  description = "",
  total_amount = 0.0,
  total_vat_amount = 0.0,
  document_type = "OTHER",
  company_id: int64 = 0,
  created_by_id: int64 = 0
): JournalEntry =
  JournalEntry(
    id: 0,
    entry_number: entry_number,
    document_date: document_date,
    vat_date: none(DateTime),
    accounting_date: accounting_date,
    document_number: document_number,
    description: description,
    total_amount: total_amount,
    total_vat_amount: total_vat_amount,
    is_posted: false,
    document_type: document_type,
    vat_document_type: "NONE",
    vat_purchase_operation: "",
    vat_sales_operation: "",
    vat_additional_operation: "",
    vat_additional_data: "",
    vat_rate: 0.0,
    company_id: company_id,
    counterpart_id: none(int64),
    posted_by_id: none(int64),
    created_by_id: created_by_id,
    posted_at: none(DateTime),
    created_at: now(),
    updated_at: now()
  )

proc newEntryLine*(
  debit_amount = 0.0,
  credit_amount = 0.0,
  currency_code = "BGN",
  description = "",
  line_order = 0,
  journal_entry_id: int64 = 0,
  account_id: int64 = 0
): EntryLine =
  EntryLine(
    id: 0,
    debit_amount: debit_amount,
    credit_amount: credit_amount,
    currency_code: currency_code,
    currency_amount: 0.0,
    exchange_rate: 1.0,
    base_amount: 0.0,
    vat_amount: 0.0,
    quantity: 0.0,
    unit_of_measure_code: "",
    description: description,
    line_order: line_order,
    journal_entry_id: journal_entry_id,
    account_id: account_id,
    counterpart_id: none(int64),
    vat_rate_id: none(int64),
    created_at: now()
  )
