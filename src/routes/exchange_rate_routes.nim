import std/json
import jester
import orm/orm

import ../db/config
import ../models/exchangerate
import ../utils/json_utils

proc exchangeRateRoutes*(): auto =
  router exchangeRateRouter:
    get "/api/exchange-rates":
      let db = getDbConn()
      try:
        let rates = findAll(ExchangeRate, db)
        resp Http200, {"Content-Type": "application/json"}, $toJsonArray(rates)
      finally:
        releaseDbConn(db)

    post "/api/exchange-rates/fetch-ecb":
      # TODO: Implement ECB rates fetching
      resp Http200, {"Content-Type": "application/json"}, """{"message": "ECB rates fetching not implemented yet"}"""

  return exchangeRateRouter
