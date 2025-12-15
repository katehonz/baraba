import std/[json, strutils, options, times]
import jester
import norm/postgres

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
        var counterparts = @[newCounterpart()]
        if companyId != "0":
          db.select(counterparts, "company_id = $1 ORDER BY name", parseInt(companyId))
        else:
          db.selectAll(counterparts)
        if counterparts.len == 1 and counterparts[0].id == 0:
          counterparts = @[]
        resp Http200, {"Content-Type": "application/json"}, $toJsonArray(counterparts)
      finally:
        releaseDbConn(db)

    get "/api/counterparts/company/@companyId":
      let companyId = parseInt(@"companyId")
      let db = getDbConn()
      try:
        var counterparts = @[newCounterpart()]
        db.select(counterparts, "company_id = $1 ORDER BY name", companyId)
        if counterparts.len == 1 and counterparts[0].id == 0:
          counterparts = @[]
        resp Http200, {"Content-Type": "application/json"}, $toJsonArray(counterparts)
      finally:
        releaseDbConn(db)

    get "/api/counterparts/@id":
      let counterpartId = parseInt(@"id")
      let db = getDbConn()
      try:
        var counterpart = newCounterpart()
        db.select(counterpart, "id = $1", counterpartId)
        resp Http200, {"Content-Type": "application/json"}, $toJson(counterpart)
      except:
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
        db.insert(counterpart)
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
        var counterpart = newCounterpart()
        db.select(counterpart, "id = $1", counterpartId)

        if body.hasKey("name"): counterpart.name = body["name"].getStr()
        if body.hasKey("eik"): counterpart.eik = body.getOrDefault("eik").getStr(counterpart.eik)
        
        # The model in baraba.nim is simpler. Sticking to that.
        # if body.hasKey("vat_number"): counterpart.vat_number = body.getOrDefault("vat_number").getStr(counterpart.vat_number)
        # if body.hasKey("address"): counterpart.address = body.getOrDefault("address").getStr(counterpart.address)
        # if body.hasKey("city"): counterpart.city = body.getOrDefault("city").getStr(counterpart.city)
        
        counterpart.updated_at = now()

        db.update(counterpart)
        resp Http200, {"Content-Type": "application/json"}, $toJson(counterpart)
      except:
        resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Контрагентът не е намерен"})
      finally:
        releaseDbConn(db)

    # Logic from original counterpart_routes.nim, adapted for pool
    delete "/api/counterparts/@id":
      let counterpartId = parseInt(@"id")
      let db = getDbConn()
      try:
        var counterpart = newCounterpart()
        db.select(counterpart, "id = $1", counterpartId)
        db.delete(counterpart)
        resp Http200, {"Content-Type": "application/json"}, $(%*{
          "success": true,
          "message": "Контрагентът е изтрит"
        })
      except:
        resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Контрагентът не е намерен"})
      finally:
        releaseDbConn(db)

  return counterpartRouter