import std/[json, times, options, strutils]
import jester
import orm/orm

import ../db/config
import ../models/vatrate
import baraba_shared/utils/json_utils

proc vatRateRoutes*(): auto =
  router vatRateRouter:
    get "/api/vat-rates":
      let companyId = request.params.getOrDefault("companyId", "0").parseInt
      let db = getDbConn()
      try:
        var rates: seq[VatRate]
        if companyId > 0:
          rates = findWhere(VatRate, db, "company_id = $1", $companyId)
        else:
          rates = findAll(VatRate, db)
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
        save(vatRate, db)
        resp Http201, {"Content-Type": "application/json"}, $toJson(vatRate)
      finally:
        releaseDbConn(db)

    delete "/api/vat-rates/@id":
      let id = parseInt(@"id")
      let db = getDbConn()
      try:
        let vatRateOpt = find(VatRate, id, db)
        if vatRateOpt.isNone:
          resp Http404, {"Content-Type": "application/json"}, """{"error": "VAT rate not found"}"""
          return

        deleteById(VatRate, id, db)
        resp Http200, {"Content-Type": "application/json"}, """{"success": true}"""
      except:
        resp Http500, {"Content-Type": "application/json"}, """{"error": "Internal server error"}"""
      finally:
        releaseDbConn(db)

  return vatRateRouter
