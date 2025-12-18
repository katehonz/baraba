import std/[times, options]
import orm/orm

type
  BankTransactionStatus* = enum
    btsNew = "NEW"
    btsMatched = "MATCHED"
    btsPosted = "POSTED"
    btsIgnored = "IGNORED"

  BankTransaction* = object of Model
    bank_profile_id*: int64
    company_id*: int64

    # Transaction details
    transaction_date*: DateTime
    value_date*: DateTime
    amount*: float                 # Positive = credit, Negative = debit
    currency_code*: string

    # Identifiers
    reference*: string             # Bank's transaction reference
    end_to_end_id*: string         # End-to-end identifier (SEPA)

    # Counterparty info
    counterparty_name*: string
    counterparty_iban*: string
    counterparty_bic*: string

    # Description
    description*: string           # Bank's description
    additional_info*: string       # Additional transaction info

    # Categorization
    transaction_type*: string      # TRANSFER, PAYMENT, FEE, INTEREST, etc.
    category*: string              # User-defined category

    # Matching status
    status*: string                # NEW, MATCHED, POSTED, IGNORED
    matched_counterpart_id*: Option[int64]
    matched_account_id*: Option[int64]

    # Posting
    journal_entry_id*: Option[int64]
    posted_at*: Option[DateTime]

    # Import info
    import_batch_id*: string       # Batch ID for grouped imports
    import_source*: string         # MT940, CSV, SALTEDGE, etc.
    raw_data*: string              # Original raw transaction data (JSON)

    # AI suggestions
    suggested_counterpart_id*: Option[int64]
    suggested_account_id*: Option[int64]
    suggestion_confidence*: float  # 0.0 - 1.0

    created_at*: DateTime
    updated_at*: DateTime

proc newBankTransaction*(
  bank_profile_id: int64 = 0,
  company_id: int64 = 0,
  transaction_date: DateTime = now(),
  value_date: DateTime = now(),
  amount: float = 0.0,
  currency_code = "BGN",
  reference = "",
  counterparty_name = "",
  description = "",
  status = "NEW",
  import_source = "MANUAL"
): BankTransaction =
  result = BankTransaction(
    id: 0,
    bank_profile_id: bank_profile_id,
    company_id: company_id,
    transaction_date: transaction_date,
    value_date: value_date,
    amount: amount,
    currency_code: currency_code,
    reference: reference,
    end_to_end_id: "",
    counterparty_name: counterparty_name,
    counterparty_iban: "",
    counterparty_bic: "",
    description: description,
    additional_info: "",
    transaction_type: "",
    category: "",
    status: status,
    matched_counterpart_id: none(int64),
    matched_account_id: none(int64),
    journal_entry_id: none(int64),
    posted_at: none(DateTime),
    import_batch_id: "",
    import_source: import_source,
    raw_data: "",
    suggested_counterpart_id: none(int64),
    suggested_account_id: none(int64),
    suggestion_confidence: 0.0,
    created_at: now(),
    updated_at: now()
  )

proc isDebit*(tx: BankTransaction): bool =
  tx.amount < 0

proc isCredit*(tx: BankTransaction): bool =
  tx.amount > 0

proc absoluteAmount*(tx: BankTransaction): float =
  abs(tx.amount)
