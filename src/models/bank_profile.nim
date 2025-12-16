import std/[times, options]
import norm/model

type
  BankProfile* = ref object of Model
    name*: string
    iban*: string
    account_id*: int64
    buffer_account_id*: int64
    company_id*: int64
    currency_code*: string
    connection_type*: string  # MANUAL, SALTEDGE
    import_format*: string    # MT940, CSV, CAMT
    saltedge_provider_code*: string
    saltedge_provider_name*: string
    saltedge_connection_id*: Option[string]
    is_active*: bool
    created_at*: DateTime
    updated_at*: DateTime

proc newBankProfile*(
  name = "",
  iban = "",
  account_id: int64 = 0,
  buffer_account_id: int64 = 0,
  company_id: int64 = 0,
  currency_code = "BGN",
  connection_type = "MANUAL",
  import_format = "MT940",
  saltedge_provider_code = "",
  saltedge_provider_name = "",
  saltedge_connection_id = none(string),
  is_active = true
): BankProfile =
  result = BankProfile(
    name: name,
    iban: iban,
    account_id: account_id,
    buffer_account_id: buffer_account_id,
    company_id: company_id,
    currency_code: currency_code,
    connection_type: connection_type,
    import_format: import_format,
    saltedge_provider_code: saltedge_provider_code,
    saltedge_provider_name: saltedge_provider_name,
    saltedge_connection_id: saltedge_connection_id,
    is_active: is_active,
    created_at: now(),
    updated_at: now()
  )
