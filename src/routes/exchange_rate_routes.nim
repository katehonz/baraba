import std/json
import jester
import norm/postgres

import ../db/config
import ../models/exchangerate
import ../utils/json_utils

proc exchangeRateRoutes*(): auto =
  router exchangeRateRouter:
    get "/api/exchange-rates":
      let db = getDbConn()
      try:
        var rates = @[newExchangeRate()]
        db.selectAll(rates)
        if rates.len == 1 and rates[0].id == 0:
          rates = @[]
        resp Http200, {"Content-Type": "application/json"}, $toJsonArray(rates)
      finally:
        releaseDbConn(db)

    post "/api/exchange-rates/fetch-ecb":
      # TODO: Implement ECB rates fetching
      resp Http200, {"Content-Type": "application/json"}, """{"message": "ECB rates fetching not implemented yet"}"""

  return exchangeRateRouter
