import std/[times, options]
import orm/orm
import company

type
  Counterpart* = object of Model
    name*: string
    eik*: string
    vat_number*: string
    street*: string
    address*: string
    long_address*: string
    city*: string
    postal_code*: string
    country*: string
    phone*: string
    email*: string
    contact_person*: string
    counterpart_type*: string
    is_customer*: bool
    is_supplier*: bool
    is_vat_registered*: bool
    is_active*: bool
    company_id*: int64
    created_at*: DateTime
    updated_at*: DateTime

proc newCounterpart*(
  name = "",
  eik = "",
  vat_number = "",
  address = "",
  city = "",
  country = "BG",
  counterpart_type = "OTHER",
  is_customer = false,
  is_supplier = false,
  is_vat_registered = false,
  is_active = true,
  company_id: int64 = 0
): Counterpart =
  Counterpart(
    id: 0,
    name: name,
    eik: eik,
    vat_number: vat_number,
    street: "",
    address: address,
    long_address: "",
    city: city,
    postal_code: "",
    country: country,
    phone: "",
    email: "",
    contact_person: "",
    counterpart_type: counterpart_type,
    is_customer: is_customer,
    is_supplier: is_supplier,
    is_vat_registered: is_vat_registered,
    is_active: is_active,
    company_id: company_id,
    created_at: now(),
    updated_at: now()
  )
