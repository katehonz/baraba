import std/[times, options]
import orm/orm
import company, fixed_asset, journal

type
  DepreciationJournal* = object of Model
    fixed_asset_id*: int64
    company_id*: int64
    period_year*: int
    period_month*: int
    accounting_depreciation_amount*: float
    accounting_book_value_before*: float
    accounting_book_value_after*: float
    tax_depreciation_amount*: float
    tax_book_value_before*: float
    tax_book_value_after*: float
    is_posted*: bool
    journal_entry_id*: Option[int64]
    posted_at*: Option[DateTime]
    created_at*: DateTime
    updated_at*: DateTime

proc newDepreciationJournal*(
  fixed_asset_id: int64 = 0,
  company_id: int64 = 0,
  period_year: int = 0,
  period_month: int = 0,
  accounting_depreciation_amount: float = 0.0,
  accounting_book_value_before: float = 0.0,
  accounting_book_value_after: float = 0.0,
  tax_depreciation_amount: float = 0.0,
  tax_book_value_before: float = 0.0,
  tax_book_value_after: float = 0.0
): DepreciationJournal =
  DepreciationJournal(
    id: 0,
    fixed_asset_id: fixed_asset_id,
    company_id: company_id,
    period_year: period_year,
    period_month: period_month,
    accounting_depreciation_amount: accounting_depreciation_amount,
    accounting_book_value_before: accounting_book_value_before,
    accounting_book_value_after: accounting_book_value_after,
    tax_depreciation_amount: tax_depreciation_amount,
    tax_book_value_before: tax_book_value_before,
    tax_book_value_after: tax_book_value_after,
    is_posted: false,
    journal_entry_id: none(int64),
    posted_at: none(DateTime),
    created_at: now(),
    updated_at: now()
  )
