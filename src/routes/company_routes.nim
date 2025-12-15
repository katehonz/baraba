import std/[json, options, strutils, times]
import jester
import norm/postgres
import ../models/[company, currency]
import ../db/config
import ../utils/json_utils

proc companyRoutes*(): auto =
  router companyRouter:
    get "/api/companies":
      let db = openDb()
      try:
        var companies: seq[Company] = @[]
        db.selectAll(companies)
        resp Http200, {"Content-Type": "application/json"}, $toJsonArray(companies)
      finally:
        close(db)

    get "/api/companies/@id":
      let companyId = parseInt(@"id")
      let db = openDb()
      try:
        var company = newCompany()
        db.select(company, "id = $1", companyId)
        resp Http200, {"Content-Type": "application/json"}, $toJson(company)
      except:
        resp Http404, {"Content-Type": "application/json"}, $(%*{
          "error": "Фирмата не е намерена"
        })
      finally:
        close(db)

    post "/api/companies":
      let body = parseJson(request.body)
      let db = openDb()
      try:
        # Get base currency
        var baseCurrencyId: int64 = 0
        var currencies: seq[Currency] = @[]
        db.select(currencies, "code = $1", "BGN")
        if currencies.len > 0:
          baseCurrencyId = currencies[0].id

        var company = newCompany(
          name = body["name"].getStr(),
          eik = body["eik"].getStr(),
          vatNumber = body.getOrDefault("vatNumber").getStr(""),
          address = body.getOrDefault("address").getStr(""),
          city = body.getOrDefault("city").getStr(""),
          country = body.getOrDefault("country").getStr("BG"),
          phone = body.getOrDefault("phone").getStr(""),
          email = body.getOrDefault("email").getStr(""),
          contactPerson = body.getOrDefault("contactPerson").getStr(""),
          managerName = body.getOrDefault("managerName").getStr(""),
          baseCurrencyId = baseCurrencyId
        )

        db.insert(company)
        resp Http201, {"Content-Type": "application/json"}, $toJson(company)
      except:
        resp Http400, {"Content-Type": "application/json"}, $(%*{
          "error": "Грешка при създаване: " & getCurrentExceptionMsg()
        })
      finally:
        close(db)

    put "/api/companies/@id":
      let companyId = parseInt(@"id")
      let body = parseJson(request.body)
      let db = openDb()
      try:
        var company = newCompany()
        db.select(company, "id = $1", companyId)

        if body.hasKey("name"): company.name = body["name"].getStr()
        if body.hasKey("vatNumber"): company.vatNumber = body["vatNumber"].getStr()
        if body.hasKey("address"): company.address = body["address"].getStr()
        if body.hasKey("city"): company.city = body["city"].getStr()
        if body.hasKey("phone"): company.phone = body["phone"].getStr()
        if body.hasKey("email"): company.email = body["email"].getStr()
        if body.hasKey("isActive"): company.isActive = body["isActive"].getBool()
        company.updatedAt = now()

        db.update(company)
        resp Http200, {"Content-Type": "application/json"}, $toJson(company)
      except:
        resp Http404, {"Content-Type": "application/json"}, $(%*{
          "error": "Фирмата не е намерена"
        })
      finally:
        close(db)

    delete "/api/companies/@id":
      let companyId = parseInt(@"id")
      let db = openDb()
      try:
        var company = newCompany()
        db.select(company, "id = $1", companyId)
        db.delete(company)
        resp Http200, {"Content-Type": "application/json"}, $(%*{
          "success": true,
          "message": "Фирмата е изтрита"
        })
      except:
        resp Http404, {"Content-Type": "application/json"}, $(%*{
          "error": "Фирмата не е намерена"
        })
      finally:
        close(db)

  return companyRouter
