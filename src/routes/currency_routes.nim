import std/[json, strutils]
import jester
import orm/orm

import ../models/currency
import ../db/config
import ../utils/json_utils

proc currencyRoutes*(): auto =
  router currencyRouter:
    get "/api/currencies":
      withDb:
        let currencies = findAll(Currency, db)
        resp Http200, {"Content-Type": "application/json"}, $toJsonArray(currencies)

    post "/api/currencies":
      withDb:
        let body = parseJson(request.body)
        var currency = newCurrency(
          code = body["code"].getStr(),
          name = body["name"].getStr(),
          name_bg = body.getOrDefault("nameBg").getStr(""),
          symbol = body.getOrDefault("symbol").getStr(""),
          decimal_places = body.getOrDefault("decimalPlaces").getInt(2),
          is_base_currency = body.getOrDefault("isBaseCurrency").getBool(false),
          is_active = body.getOrDefault("isActive").getBool(true)
        )
        save(currency, db)
        resp Http201, {"Content-Type": "application/json"}, $toJson(currency)

    put "/api/currencies/@id":
      withDb:
        let id = parseInt(@"id")
        let body = parseJson(request.body)
        var currencyOpt = find(Currency, id, db)
        if currencyOpt.isSome:
          var currency = currencyOpt.get()
          if body.hasKey("isActive"):
            currency.is_active = body["isActive"].getBool()
          if body.hasKey("code"):
            currency.code = body["code"].getStr()
          if body.hasKey("name"):
            currency.name = body["name"].getStr()
          save(currency, db)
          resp Http200, {"Content-Type": "application/json"}, $toJson(currency)
        else:
          resp Http404, {"Content-Type": "application/json"}, """{"error": "Currency not found"}"""

  return currencyRouter
