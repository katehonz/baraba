import std/[times, options]
import orm/orm

type
  RepresentativeType* = enum
    rtManager = "MANAGER"
    rtAuthorizedPerson = "AUTHORIZED_PERSON"

  Company* = object of UuidModel
    name*: string
    eik*: string
    vat_number*: string
    address*: string
    city*: string
    country*: string
    post_code*: string
    phone*: string
    email*: string
    website*: string
    cash_account_id*: Option[string]
    bank_account_id*: Option[string]
    customers_account_id*: Option[string]
    suppliers_account_id*: Option[string]
    vat_payable_account_id*: Option[string]
    vat_receivable_account_id*: Option[string]
    expenses_account_id*: Option[string]
    revenues_account_id*: Option[string]
    is_vat_registered*: bool
    is_intrastat_registered*: bool
    nap_office*: string
    vat_period*: string
    currency*: string
    fiscal_year_start_month*: int
    representative_type*: string
    representative_name*: string
    representative_eik*: string
    saltedge_enabled*: bool
    ai_scanning_enabled*: bool
    vies_validation_enabled*: bool
    azure_di_endpoint*: string
    azure_di_api_key*: string
    saltedge_app_id*: string
    saltedge_secret*: string
    fx_gains_account_id*: Option[string]
    fx_losses_account_id*: Option[string]
    inserted_at*: DateTime
    updated_at*: DateTime

proc newCompany*(
  name = "",
  eik = "",
  vat_number = "",
  address = "",
  city = "",
  country = "BG"
): Company =
  Company(
    id: "",
    name: name,
    eik: eik,
    vat_number: vat_number,
    address: address,
    city: city,
    country: country,
    post_code: "",
    phone: "",
    email: "",
    website: "",
    cash_account_id: none(string),
    bank_account_id: none(string),
    customers_account_id: none(string),
    suppliers_account_id: none(string),
    vat_payable_account_id: none(string),
    vat_receivable_account_id: none(string),
    expenses_account_id: none(string),
    revenues_account_id: none(string),
    is_vat_registered: false,
    is_intrastat_registered: false,
    nap_office: "",
    vat_period: "monthly",
    currency: "EUR",
    fiscal_year_start_month: 1,
    representative_type: "MANAGER",
    representative_name: "",
    representative_eik: "",
    saltedge_enabled: false,
    ai_scanning_enabled: false,
    vies_validation_enabled: false,
    azure_di_endpoint: "",
    azure_di_api_key: "",
    saltedge_app_id: "",
    saltedge_secret: "",
    fx_gains_account_id: none(string),
    fx_losses_account_id: none(string),
    inserted_at: now(),
    updated_at: now()
  )
