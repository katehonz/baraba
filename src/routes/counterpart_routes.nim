import std/[json, strutils, options, times]
import jester
import orm/orm

import ../models/counterpart
import ../db/config
import ../utils/json_utils

proc counterpartRoutes*(): auto =
  router counterpartRouter:
    # Logic from baraba.nim, adapted for pool
    get "/api/counterparts":
      let companyId = request.params.getOrDefault("companyId", "0")
      let db = getDbConn()
      try:
        var counterparts: seq[Counterpart]
        if companyId != "0":
          counterparts = findWhere(Counterpart, db, "company_id = $1 ORDER BY name", companyId)
        else:
          counterparts = findAll(Counterpart, db)
        resp Http200, {"Content-Type": "application/json"}, $toJsonArray(counterparts)
      finally:
        releaseDbConn(db)

    get "/api/counterparts/company/@companyId":
      let companyId = @"companyId"
      let db = getDbConn()
      try:
        let counterparts = findWhere(Counterpart, db, "company_id = $1 ORDER BY name", companyId)
        resp Http200, {"Content-Type": "application/json"}, $toJsonArray(counterparts)
      finally:
        releaseDbConn(db)

    get "/api/counterparts/@id":
      let counterpartId = parseInt(@"id")
      let db = getDbConn()
      try:
        let counterpartOpt = find(Counterpart, counterpartId, db)
        if counterpartOpt.isSome:
          let counterpart = counterpartOpt.get()
          resp Http200, {"Content-Type": "application/json"}, $toJson(counterpart)
        else:
          resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Контрагентът не е намерен"})
      finally:
        releaseDbConn(db)

    # Logic from baraba.nim, adapted for pool
    post "/api/counterparts":
      let body = parseJson(request.body)
      let db = getDbConn()
      try:
        var counterpart = newCounterpart(
          name = body["name"].getStr(),
          eik = body.getOrDefault("eik").getStr(""),
          company_id = body["companyId"].getBiggestInt()
        )
        save(counterpart, db)
        resp Http201, {"Content-Type": "application/json"}, $toJson(counterpart)
      except:
        resp Http400, {"Content-Type": "application/json"}, $(%*{"error": getCurrentExceptionMsg()})
      finally:
        releaseDbConn(db)

    # Logic from original counterpart_routes.nim, adapted for pool
    put "/api/counterparts/@id":
      let counterpartId = parseInt(@"id")
      let body = parseJson(request.body)
      let db = getDbConn()
      try:
        var counterpartOpt = find(Counterpart, counterpartId, db)
        if counterpartOpt.isSome:
          var counterpart = counterpartOpt.get()
          if body.hasKey("name"): counterpart.name = body["name"].getStr()
          if body.hasKey("eik"): counterpart.eik = body.getOrDefault("eik").getStr(counterpart.eik)

          # The model in baraba.nim is simpler. Sticking to that.
          # if body.hasKey("vat_number"): counterpart.vat_number = body.getOrDefault("vat_number").getStr(counterpart.vat_number)
          # if body.hasKey("address"): counterpart.address = body.getOrDefault("address").getStr(counterpart.address)
          # if body.hasKey("city"): counterpart.city = body.getOrDefault("city").getStr(counterpart.city)

          counterpart.updated_at = now()

          save(counterpart, db)
          resp Http200, {"Content-Type": "application/json"}, $toJson(counterpart)
        else:
          resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Контрагентът не е намерен"})
      finally:
        releaseDbConn(db)

    # Logic from original counterpart_routes.nim, adapted for pool
    delete "/api/counterparts/@id":
      let counterpartId = parseInt(@"id")
      let db = getDbConn()
      try:
        deleteById(Counterpart, counterpartId, db)
        resp Http200, {"Content-Type": "application/json"}, $(%*{
          "success": true,
          "message": "Контрагентът е изтрит"
        })
      except:
        resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Контрагентът не е намерен"})
      finally:
        releaseDbConn(db)

  return counterpartRouter