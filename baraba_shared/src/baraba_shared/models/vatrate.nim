import std/[times, options]
import orm/orm

type
  VatRate* = object of UuidModel
    name*: string
    percentage*: float
    description*: string
    is_active*: bool
    effective_from*: string  # DATE as string YYYY-MM-DD
    effective_to*: Option[string]
    vat_code*: string
    saft_tax_type*: string
    is_reverse_charge_applicable*: bool
    is_intrastat_applicable*: bool
    company_id*: string  # UUID reference
    inserted_at*: DateTime
    updated_at*: DateTime

proc newVatRate*(
  name = "",
  percentage = 0.0,
  description = "",
  is_active = true,
  effective_from = "",
  vat_code = "",
  company_id = ""
): VatRate =
  VatRate(
    id: "",
    name: name,
    percentage: percentage,
    description: description,
    is_active: is_active,
    effective_from: effective_from,
    effective_to: none(string),
    vat_code: vat_code,
    saft_tax_type: "",
    is_reverse_charge_applicable: false,
    is_intrastat_applicable: false,
    company_id: company_id,
    inserted_at: now(),
    updated_at: now()
  )
