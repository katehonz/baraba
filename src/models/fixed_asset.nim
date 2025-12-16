import std/[times, options]
import norm/[model, pragmas]
import company, fixed_asset_category

type
  FixedAssetStatus* = enum
    fasActive = "ACTIVE"
    fasDepreciated = "DEPRECIATED"
    fasDisposed = "DISPOSED"
    fasSold = "SOLD"

  DepreciationMethod* = enum
    dmLinear = "LINEAR"
    dmDecliningBalance = "DECLINING_BALANCE"

  FixedAsset* = ref object of Model
    name*: string
    inventory_number*: string
    description*: string
    category_id* {.fk: FixedAssetCategory.}: int64
    company_id* {.fk: Company.}: int64
    acquisition_date*: DateTime
    acquisition_cost*: float
    residual_value*: float
    document_number*: string
    document_date*: Option[DateTime]
    put_into_service_date*: Option[DateTime]
    status*: string  # FixedAssetStatus as string
    depreciation_method*: string  # DepreciationMethod as string
    accounting_depreciation_rate*: float
    tax_depreciation_rate*: float
    accounting_accumulated_depreciation*: float
    accounting_book_value*: float
    tax_accumulated_depreciation*: float
    tax_book_value*: float
    last_depreciation_date*: Option[DateTime]
    disposed_date*: Option[DateTime]
    disposal_amount*: float
    created_at*: DateTime
    updated_at*: DateTime

proc newFixedAsset*(
  name = "",
  inventory_number = "",
  description = "",
  category_id: int64 = 0,
  company_id: int64 = 0,
  acquisition_date: DateTime = now(),
  acquisition_cost: float = 0.0,
  residual_value: float = 0.0,
  document_number = "",
  document_date: Option[DateTime] = none(DateTime),
  put_into_service_date: Option[DateTime] = none(DateTime),
  status = "ACTIVE",
  depreciation_method = "LINEAR",
  accounting_depreciation_rate: float = 0.0,
  tax_depreciation_rate: float = 0.0
): FixedAsset =
  FixedAsset(
    name: name,
    inventory_number: inventory_number,
    description: description,
    category_id: category_id,
    company_id: company_id,
    acquisition_date: acquisition_date,
    acquisition_cost: acquisition_cost,
    residual_value: residual_value,
    document_number: document_number,
    document_date: document_date,
    put_into_service_date: put_into_service_date,
    status: status,
    depreciation_method: depreciation_method,
    accounting_depreciation_rate: accounting_depreciation_rate,
    tax_depreciation_rate: tax_depreciation_rate,
    accounting_accumulated_depreciation: 0.0,
    accounting_book_value: acquisition_cost,
    tax_accumulated_depreciation: 0.0,
    tax_book_value: acquisition_cost,
    last_depreciation_date: none(DateTime),
    disposed_date: none(DateTime),
    disposal_amount: 0.0,
    created_at: now(),
    updated_at: now()
  )
