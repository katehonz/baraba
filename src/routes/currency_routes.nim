import std/json
import ../db/config
import ../models/currency

proc getCurrencies*(): Future[string] {.async.} =
  let db = await openDb()
  let currencies = await db.getAll(Currency)
  return $toJson(currencies)

proc createCurrency*(code: string, name: string, nameBg: string, symbol: string, decimalPlaces: int, isBaseCurrency: bool): Future[string] {.async.} =
  let db = await openDb()
  var currency = newCurrency(
    code = code,
    name = name,
    name_bg = nameBg,
    symbol = symbol,
    decimal_places = decimalPlaces,
    is_base_currency = isBaseCurrency,
    is_active = true
  )
  await db.insert(currency)
  return $toJson(currency)

proc updateCurrency*(id: int, isActive: bool): Future[string] {.async.} =
  let db = await openDb()
  var currency = newCurrency()
  await db.select(currency, "id = $1", id)
  currency.is_active = isActive
  await db.update(currency)
  return $toJson(currency)
