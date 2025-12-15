import std/[json, options, strutils, times]
import jester
import norm/postgres
import ../models/counterpart
import ../db/config
import ../utils/json_utils

proc counterpartRoutes*(): auto =
  router counterpartRouter:
    get "/api/counterparts":
      let companyId = request.params.getOrDefault("companyId", "0")
      let db = openDb()
      try:
        var counterparts: seq[Counterpart] = @[]
        if companyId != "0":
          db.select(counterparts, "\"companyId\" = $1 ORDER BY name", parseInt(companyId))
        else:
          db.selectAll(counterparts)
        resp Http200, {"Content-Type": "application/json"}, $toJsonArray(counterparts)
      finally:
        close(db)

    get "/api/counterparts/@id":
      let counterpartId = parseInt(@"id")
      let db = openDb()
      try:
        var counterpart = newCounterpart()
        db.select(counterpart, "id = $1", counterpartId)
        resp Http200, {"Content-Type": "application/json"}, $toJson(counterpart)
      except:
        resp Http404, {"Content-Type": "application/json"}, $(%*{
          "error": "Контрагентът не е намерен"
        })
      finally:
        close(db)

    get "/api/counterparts/company/@companyId":
      let companyId = parseInt(@"companyId")
      let db = openDb()
      try:
        var counterparts: seq[Counterpart] = @[]
        db.select(counterparts, "\"companyId\" = $1 ORDER BY name", companyId)
        resp Http200, {"Content-Type": "application/json"}, $toJsonArray(counterparts)
      finally:
        close(db)

    post "/api/counterparts":
      let body = parseJson(request.body)
      let db = openDb()
      try:
        var counterpart = newCounterpart(
          name = body["name"].getStr(),
          eik = body.getOrDefault("eik").getStr(""),
          vatNumber = body.getOrDefault("vatNumber").getStr(""),
          address = body.getOrDefault("address").getStr(""),
          city = body.getOrDefault("city").getStr(""),
          country = body.getOrDefault("country").getStr("BG"),
          counterpartType = body.getOrDefault("counterpartType").getStr("OTHER"),
          isCustomer = body.getOrDefault("isCustomer").getBool(false),
          isSupplier = body.getOrDefault("isSupplier").getBool(false),
          isVatRegistered = body.getOrDefault("isVatRegistered").getBool(false),
          companyId = body["companyId"].getBiggestInt()
        )

        db.insert(counterpart)
        resp Http201, {"Content-Type": "application/json"}, $toJson(counterpart)
      except:
        resp Http400, {"Content-Type": "application/json"}, $(%*{
          "error": "Грешка при създаване: " & getCurrentExceptionMsg()
        })
      finally:
        close(db)

    put "/api/counterparts/@id":
      let counterpartId = parseInt(@"id")
      let body = parseJson(request.body)
      let db = openDb()
      try:
        var counterpart = newCounterpart()
        db.select(counterpart, "id = $1", counterpartId)

        if body.hasKey("name"): counterpart.name = body["name"].getStr()
        if body.hasKey("eik"): counterpart.eik = body["eik"].getStr()
        if body.hasKey("vatNumber"): counterpart.vatNumber = body["vatNumber"].getStr()
        if body.hasKey("address"): counterpart.address = body["address"].getStr()
        if body.hasKey("city"): counterpart.city = body["city"].getStr()
        if body.hasKey("isCustomer"): counterpart.isCustomer = body["isCustomer"].getBool()
        if body.hasKey("isSupplier"): counterpart.isSupplier = body["isSupplier"].getBool()
        if body.hasKey("isActive"): counterpart.isActive = body["isActive"].getBool()
        counterpart.updatedAt = now()

        db.update(counterpart)
        resp Http200, {"Content-Type": "application/json"}, $toJson(counterpart)
      except:
        resp Http404, {"Content-Type": "application/json"}, $(%*{
          "error": "Контрагентът не е намерен"
        })
      finally:
        close(db)

    delete "/api/counterparts/@id":
      let counterpartId = parseInt(@"id")
      let db = openDb()
      try:
        var counterpart = newCounterpart()
        db.select(counterpart, "id = $1", counterpartId)
        db.delete(counterpart)
        resp Http200, {"Content-Type": "application/json"}, $(%*{
          "success": true
        })
      except:
        resp Http404, {"Content-Type": "application/json"}, $(%*{
          "error": "Контрагентът не е намерен"
        })
      finally:
        close(db)

  return counterpartRouter
