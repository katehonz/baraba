import std/[times, options]
import norm/[model, pragmas]
import company

type
  FixedAssetCategory* = ref object of Model
    name*: string
    description*: string
    min_depreciation_rate*: float
    max_depreciation_rate*: float
    company_id* {.fk: Company.}: int64
    created_at*: DateTime
    updated_at*: DateTime

proc newFixedAssetCategory*(
  name = "",
  description = "",
  min_depreciation_rate = 0.0,
  max_depreciation_rate = 0.0,
  company_id: int64 = 0
): FixedAssetCategory =
  FixedAssetCategory(
    name: name,
    description: description,
    min_depreciation_rate: min_depreciation_rate,
    max_depreciation_rate: max_depreciation_rate,
    company_id: company_id,
    created_at: now(),
    updated_at: now()
  )
