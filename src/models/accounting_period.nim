import std/[times, options]
import orm/orm

type
  PeriodStatus* = enum
    psOpen = "OPEN"
    psClosed = "CLOSED"
    psLocked = "LOCKED"

  AccountingPeriod* = object of Model
    company_id*: int64
    period_year*: int
    period_month*: int             # 0 = yearly period, 1-12 = monthly
    period_type*: string           # MONTHLY, QUARTERLY, YEARLY

    start_date*: DateTime
    end_date*: DateTime

    status*: string                # OPEN, CLOSED, LOCKED

    # Closing details
    closed_at*: Option[DateTime]
    closed_by_id*: Option[int64]
    closing_journal_entry_id*: Option[int64]  # Entry for closing balances

    # Opening balances
    opening_entry_id*: Option[int64]  # Entry for opening balances

    # Validation
    is_balanced*: bool             # Debit = Credit check passed
    total_debit*: float            # Total debit for period
    total_credit*: float           # Total credit for period

    notes*: string
    created_at*: DateTime
    updated_at*: DateTime

proc newAccountingPeriod*(
  company_id: int64 = 0,
  period_year: int = 0,
  period_month: int = 0,
  period_type = "MONTHLY",
  start_date: DateTime = now(),
  end_date: DateTime = now(),
  status = "OPEN"
): AccountingPeriod =
  result = AccountingPeriod(
    id: 0,
    company_id: company_id,
    period_year: period_year,
    period_month: period_month,
    period_type: period_type,
    start_date: start_date,
    end_date: end_date,
    status: status,
    closed_at: none(DateTime),
    closed_by_id: none(int64),
    closing_journal_entry_id: none(int64),
    opening_entry_id: none(int64),
    is_balanced: false,
    total_debit: 0.0,
    total_credit: 0.0,
    notes: "",
    created_at: now(),
    updated_at: now()
  )

proc periodDisplay*(ap: AccountingPeriod): string =
  const monthNames = ["Януари", "Февруари", "Март", "Април", "Май", "Юни",
                      "Юли", "Август", "Септември", "Октомври", "Ноември", "Декември"]
  if ap.period_month == 0:
    result = "Година " & $ap.period_year
  elif ap.period_month >= 1 and ap.period_month <= 12:
    result = monthNames[ap.period_month - 1] & " " & $ap.period_year
  else:
    result = $ap.period_month & "/" & $ap.period_year

proc isOpen*(ap: AccountingPeriod): bool =
  ap.status == "OPEN"

proc isClosed*(ap: AccountingPeriod): bool =
  ap.status == "CLOSED" or ap.status == "LOCKED"

proc canPost*(ap: AccountingPeriod): bool =
  ap.status == "OPEN"
