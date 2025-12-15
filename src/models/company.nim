import std/[times, options]
import norm/[model, pragmas]
import currency

type
  Company* = ref object of Model
    name*: string
    eik* {.unique.}: string
    vat_number*: string
    address*: string
    city*: string
    country*: string
    phone*: string
    email*: string
    contact_person*: string
    manager_name*: string
    authorized_person*: string
    manager_egn*: string
    authorized_person_egn*: string
    nap_office*: string
    is_active*: bool
    enable_vies_validation*: bool
    enable_ai_mapping*: bool
    auto_validate_on_import*: bool
    base_currency_id* {.fk: Currency.}: int64
    created_at*: DateTime
    updated_at*: DateTime

proc newCompany*(
  name = "",
  eik = "",
  vat_number = "",
  address = "",
  city = "",
  country = "BG",
  phone = "",
  email = "",
  contact_person = "",
  manager_name = "",
  is_active = true,
  base_currency_id: int64 = 0
): Company =
  Company(
    name: name,
    eik: eik,
    vat_number: vat_number,
    address: address,
    city: city,
    country: country,
    phone: phone,
    email: email,
    contact_person: contact_person,
    manager_name: manager_name,
    authorized_person: "",
    manager_egn: "",
    authorized_person_egn: "",
    nap_office: "",
    is_active: is_active,
    enable_vies_validation: false,
    enable_ai_mapping: false,
    auto_validate_on_import: false,
    base_currency_id: base_currency_id,
    created_at: now(),
    updated_at: now()
  )
