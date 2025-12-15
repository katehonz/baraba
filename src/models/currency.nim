import std/[times, options]
import norm/[model, pragmas]

type
  Currency* = ref object of Model
    code* {.unique.}: string
    name*: string
    name_bg*: string
    symbol*: string
    decimal_places*: int
    is_active*: bool
    is_base_currency*: bool
    bnb_code*: string
    created_at*: DateTime
    updated_at*: DateTime

proc newCurrency*(
  code = "",
  name = "",
  name_bg = "",
  symbol = "",
  decimal_places = 2,
  is_active = true,
  is_base_currency = false,
  bnb_code = ""
): Currency =
  Currency(
    code: code,
    name: name,
    name_bg: name_bg,
    symbol: symbol,
    decimal_places: decimal_places,
    is_active: is_active,
    is_base_currency: is_base_currency,
    bnb_code: bnb_code,
    created_at: now(),
    updated_at: now()
  )
