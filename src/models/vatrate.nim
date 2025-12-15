import std/[times, options]
import norm/[model, pragmas]
import company

type
  VatRate* = ref object of Model
    code* {.unique.}: string
    name*: string
    rate*: float
    vat_direction*: string
    is_active*: bool
    valid_from*: Option[DateTime]
    valid_to*: Option[DateTime]
    company_id* {.fk: Company.}: int64
    created_at*: DateTime
    updated_at*: DateTime

proc newVatRate*(
  code = "",
  name = "",
  rate = 0.0,
  vat_direction = "NONE",
  is_active = true,
  company_id: int64 = 0
): VatRate =
  VatRate(
    code: code,
    name: name,
    rate: rate,
    vat_direction: vat_direction,
    is_active: is_active,
    valid_from: none(DateTime),
    valid_to: none(DateTime),
    company_id: company_id,
    created_at: now(),
    updated_at: now()
  )
