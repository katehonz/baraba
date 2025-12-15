import std/[json, strutils]
import jester
import norm/postgres

import ../models/currency
import ../db/config
import ../utils/json_utils

proc currencyRoutes*(): auto =
  router currencyRouter:
    get "/api/currencies":
      let db = getDbConn()
      try:
        var currencies = @[newCurrency()]
        db.selectAll(currencies)
        if currencies.len == 1 and currencies[0].id == 0:
          currencies = @[]
        resp Http200, {"Content-Type": "application/json"}, $toJsonArray(currencies)
      finally:
        releaseDbConn(db)

    post "/api/currencies":
      let body = parseJson(request.body)
      let db = getDbConn()
      try:
        var currency = newCurrency(
          code = body["code"].getStr(),
          name = body["name"].getStr(),
          name_bg = body.getOrDefault("nameBg").getStr(""),
          symbol = body.getOrDefault("symbol").getStr(""),
          decimal_places = body.getOrDefault("decimalPlaces").getInt(2),
          is_base_currency = body.getOrDefault("isBaseCurrency").getBool(false),
          is_active = body.getOrDefault("isActive").getBool(true)
        )
        db.insert(currency)
        resp Http201, {"Content-Type": "application/json"}, $toJson(currency)
      finally:
        releaseDbConn(db)

    put "/api/currencies/@id":
      let id = parseInt(@"id")
      let body = parseJson(request.body)
      let db = getDbConn()
      try:
        var currency = newCurrency()
        db.select(currency, "id = $1", id)
        if currency.id == 0:
          resp Http404, {"Content-Type": "application/json"}, """{"error": "Currency not found"}"""
        else:
          if body.hasKey("isActive"):
            currency.is_active = body["isActive"].getBool()
          if body.hasKey("code"):
            currency.code = body["code"].getStr()
          if body.hasKey("name"):
            currency.name = body["name"].getStr()
          db.update(currency)
          resp Http200, {"Content-Type": "application/json"}, $toJson(currency)
      finally:
        releaseDbConn(db)

  return currencyRouter
