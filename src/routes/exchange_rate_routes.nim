import std/json
import std/asyncdispatch
import ../db/config
import ../models/exchangerate

proc getExchangeRates*(): Future[string] {.async.} =
  let db = await openDb()
  let rates = await db.getAll(ExchangeRate)
  return $toJson(rates)

proc fetchEcbRates*(): Future[string] {.async.} =
  # TODO: Implement ECB rates fetching
  return %*{"message": "Not implemented yet"}
