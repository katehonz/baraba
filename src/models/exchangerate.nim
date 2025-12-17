import std/[times, options]
import orm/orm
import currency, user

type
  ExchangeRate* = object of Model
    rate*: float
    reverse_rate*: float
    valid_date*: DateTime
    rate_source*: string
    bnb_rate_id*: string
    is_active*: bool
    notes*: string
    from_currency_id*: int64
    to_currency_id*: int64
    created_by_id*: Option[int64]
    created_at*: DateTime
    updated_at*: DateTime

proc newExchangeRate*(
  rate = 1.0,
  reverse_rate = 1.0,
  valid_date = now(),
  rate_source = "MANUAL",
  from_currency_id: int64 = 0,
  to_currency_id: int64 = 0
): ExchangeRate =
  ExchangeRate(
    id: 0,
    rate: rate,
    reverse_rate: reverse_rate,
    valid_date: valid_date,
    rate_source: rate_source,
    bnb_rate_id: "",
    is_active: true,
    notes: "",
    from_currency_id: from_currency_id,
    to_currency_id: to_currency_id,
    created_by_id: none(int64),
    created_at: now(),
    updated_at: now()
  )
