import std/[times, options]
import orm/orm
import enums, company

type
  Account* = object of Model
    code*: string
    name*: string
    description*: string
    account_type*: string
    account_class*: int
    level*: int
    is_vat_applicable*: bool
    vat_direction*: string
    is_active*: bool
    is_analytical*: bool
    supports_quantities*: bool
    default_unit*: string
    saft_account_code*: string  # SAF-T TaxpayerAccountID - НАП сметкоплан
    company_id*: int64
    parent_id*: Option[int64]
    created_at*: DateTime
    updated_at*: DateTime

proc newAccount*(
  code = "",
  name = "",
  description = "",
  account_type = "ASSET",
  account_class = 0,
  level = 1,
  is_vat_applicable = false,
  vat_direction = "NONE",
  is_active = true,
  is_analytical = false,
  supports_quantities = false,
  default_unit = "",
  saft_account_code = "",
  company_id: int64 = 0,
  parent_id: Option[int64] = none(int64)
): Account =
  Account(
    id: 0,
    code: code,
    name: name,
    description: description,
    account_type: account_type,
    account_class: account_class,
    level: level,
    is_vat_applicable: is_vat_applicable,
    vat_direction: vat_direction,
    is_active: is_active,
    is_analytical: is_analytical,
    supports_quantities: supports_quantities,
    default_unit: default_unit,
    saft_account_code: saft_account_code,
    company_id: company_id,
    parent_id: parent_id,
    created_at: now(),
    updated_at: now()
  )
