import std/[times, options]
import orm/orm
import currency

type
  Company* = object of Model
    name*: string
    eik*: string
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
    base_currency_id*: int64
    default_cash_account_id*: Option[int64]
    default_customers_account_id*: Option[int64]
    default_suppliers_account_id*: Option[int64]
    default_sales_revenue_account_id*: Option[int64]
    default_vat_purchase_account_id*: Option[int64]
    default_vat_sales_account_id*: Option[int64]
    default_card_payment_purchase_account_id*: Option[int64]
    default_card_payment_sales_account_id*: Option[int64]
    salt_edge_app_id*: string
    salt_edge_enabled*: bool
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
  base_currency_id: int64 = 0,
  default_cash_account_id: Option[int64] = none(int64),
  default_customers_account_id: Option[int64] = none(int64),
  default_suppliers_account_id: Option[int64] = none(int64),
  default_sales_revenue_account_id: Option[int64] = none(int64),
  default_vat_purchase_account_id: Option[int64] = none(int64),
  default_vat_sales_account_id: Option[int64] = none(int64),
  default_card_payment_purchase_account_id: Option[int64] = none(int64),
  default_card_payment_sales_account_id: Option[int64] = none(int64),
  salt_edge_app_id: string = "",
  salt_edge_enabled: bool = false
): Company =
  Company(
    id: 0,
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
    default_cash_account_id: default_cash_account_id,
    default_customers_account_id: default_customers_account_id,
    default_suppliers_account_id: default_suppliers_account_id,
    default_sales_revenue_account_id: default_sales_revenue_account_id,
    default_vat_purchase_account_id: default_vat_purchase_account_id,
    default_vat_sales_account_id: default_vat_sales_account_id,
    default_card_payment_purchase_account_id: default_card_payment_purchase_account_id,
    default_card_payment_sales_account_id: default_card_payment_sales_account_id,
    salt_edge_app_id: salt_edge_app_id,
    salt_edge_enabled: salt_edge_enabled,
    created_at: now(),
    updated_at: now()
  )

proc getAccountId*(company: Company, fieldName: string): Option[int64] =
  case fieldName
  of "defaultCashAccountId": return company.default_cash_account_id
  of "defaultCustomersAccountId": return company.default_customers_account_id
  of "defaultSuppliersAccountId": return company.default_suppliers_account_id
  of "defaultSalesRevenueAccountId": return company.default_sales_revenue_account_id
  of "defaultVatPurchaseAccountId": return company.default_vat_purchase_account_id
  of "defaultVatSalesAccountId": return company.default_vat_sales_account_id
  of "defaultCardPaymentPurchaseAccountId": return company.default_card_payment_purchase_account_id
  of "defaultCardPaymentSalesAccountId": return company.default_card_payment_sales_account_id
  else: return none(int64)

proc `setAccountId`*(company: var Company, fieldName: string, accountId: Option[int64]) =
  case fieldName
  of "defaultCashAccountId": company.default_cash_account_id = accountId
  of "defaultCustomersAccountId": company.default_customers_account_id = accountId
  of "defaultSuppliersAccountId": company.default_suppliers_account_id = accountId
  of "defaultSalesRevenueAccountId": company.default_sales_revenue_account_id = accountId
  of "defaultVatPurchaseAccountId": company.default_vat_purchase_account_id = accountId
  of "defaultVatSalesAccountId": company.default_vat_sales_account_id = accountId
  of "defaultCardPaymentPurchaseAccountId": company.default_card_payment_purchase_account_id = accountId
  of "defaultCardPaymentSalesAccountId": company.default_card_payment_sales_account_id = accountId
  else: discard
