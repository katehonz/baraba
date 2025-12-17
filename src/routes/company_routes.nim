import std/[json, strutils, options, times]
import jester
import orm/orm

import ../models/[company, currency]
import ../db/config
import ../utils/json_utils

proc companyRoutes*(): auto =
  router companyRouter:
    # GET /api/companies - Logic from baraba.nim
    get "/api/companies":
      let db = getDbConn()
      try:
        let companies = findAll(Company, db)
        resp Http200, {"Content-Type": "application/json"}, $toJsonArray(companies)
      finally:
        releaseDbConn(db)

    # GET /api/companies/@id - Logic from baraba.nim
    get "/api/companies/@id":
      let companyId = parseInt(@"id")
      let db = getDbConn()
      try:
        let companyOpt = find(Company, companyId, db)
        if companyOpt.isSome:
          let company = companyOpt.get()
          resp Http200, {"Content-Type": "application/json"}, $toJson(company)
        else:
          resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Фирмата не е намерена"})
      finally:
        releaseDbConn(db)

    # POST /api/companies - Logic from baraba.nim
    post "/api/companies":
      let body = parseJson(request.body)
      let db = getDbConn()
      try:
        var baseCurrencyId: int64 = 0
        let currencies = findWhere(Currency, db, "code = $1", "BGN")
        if currencies.len > 0:
          baseCurrencyId = currencies[0].id
        var company = newCompany(
          name = body["name"].getStr(),
          eik = body["eik"].getStr(),
          vat_number = body.getOrDefault("vatNumber").getStr(""),
          address = body.getOrDefault("address").getStr(""),
          city = body.getOrDefault("city").getStr(""),
          base_currency_id = baseCurrencyId
        )
        save(company, db)
        resp Http201, {"Content-Type": "application/json"}, $toJson(company)
      except:
        resp Http400, {"Content-Type": "application/json"}, $(%*{"error": getCurrentExceptionMsg()})
      finally:
        releaseDbConn(db)

    # PUT from original company_routes.nim, adapted for pool
    put "/api/companies/@id":
      let companyId = parseInt(@"id")
      let body = parseJson(request.body)
      let db = getDbConn()
      try:
        var companyOpt = find(Company, companyId, db)
        if companyOpt.isSome:
          var company = companyOpt.get()
          if body.hasKey("name"): company.name = body["name"].getStr()
          if body.hasKey("vat_number"): company.vat_number = body["vat_number"].getStr()
          if body.hasKey("address"): company.address = body["address"].getStr()
          if body.hasKey("city"): company.city = body["city"].getStr()
          # Note: original file had more fields, but the model in baraba.nim is simpler.
          # Sticking to the simpler model for now.
          company.updated_at = now()

          save(company, db)
          resp Http200, {"Content-Type": "application/json"}, $toJson(company)
        else:
          resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Фирмата не е намерена"})
      finally:
        releaseDbConn(db)

    # DELETE from original company_routes.nim, adapted for pool
    delete "/api/companies/@id":
      let companyId = parseInt(@"id")
      let db = getDbConn()
      try:
        deleteById(Company, companyId, db)
        resp Http200, {"Content-Type": "application/json"}, $(%*{
          "success": true,
          "message": "Фирмата е изтрита"
        })
      except:
        resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Фирмата не е намерена"})
      finally:
        releaseDbConn(db)

  return companyRouter