import std/[json, times, options, strutils]
import jester
import norm/postgres

import ../db/config
import ../models/vatrate
import ../utils/json_utils

proc vatRateRoutes*(): auto =
  router vatRateRouter:
    get "/api/vat-rates":
      let companyId = request.params.getOrDefault("companyId", "0").parseInt
      let db = getDbConn()
      try:
        var rates = @[newVatRate()]
        if companyId > 0:
          db.select(rates, "company_id = $1", companyId)
        else:
          db.selectAll(rates)
        if rates.len == 1 and rates[0].id == 0:
          rates = @[]
        resp Http200, {"Content-Type": "application/json"}, $toJsonArray(rates)
      finally:
        releaseDbConn(db)

    post "/api/vat-rates":
      let body = parseJson(request.body)
      let db = getDbConn()
      try:
        var vatRate = newVatRate(
          company_id = body["companyId"].getInt().int64,
          code = body["code"].getStr(),
          name = body["name"].getStr(),
          rate = body["rate"].getFloat()
        )
        if body.hasKey("effectiveFrom"):
          vatRate.valid_from = some(parse(body["effectiveFrom"].getStr(), "yyyy-MM-dd"))
        db.insert(vatRate)
        resp Http201, {"Content-Type": "application/json"}, $toJson(vatRate)
      finally:
        releaseDbConn(db)

    delete "/api/vat-rates/@id":
      let id = parseInt(@"id")
      let db = getDbConn()
      try:
        var vatRate = newVatRate()
        db.select(vatRate, "id = $1", id)
        if vatRate.id == 0:
          resp Http404, {"Content-Type": "application/json"}, """{"error": "VAT rate not found"}"""
        else:
          db.delete(vatRate)
          resp Http200, {"Content-Type": "application/json"}, """{"success": true}"""
      finally:
        releaseDbConn(db)

  return vatRateRouter
