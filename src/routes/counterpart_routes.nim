import std/[json, strutils, options, times, tables, uri]
import jester
import orm/orm

import ../models/counterpart
import ../db/config
import baraba_shared/utils/json_utils

# Helper to parse query string parameters
proc parseQueryParams(queryString: string): Table[string, string] =
  result = initTable[string, string]()
  if queryString.len == 0:
    return
  for pair in queryString.split('&'):
    let parts = pair.split('=', 1)
    if parts.len == 2:
      result[decodeUrl(parts[0])] = decodeUrl(parts[1])
    elif parts.len == 1:
      result[decodeUrl(parts[0])] = ""

proc counterpartRoutes*(): auto =
  router counterpartRouter:
    get "/api/counterparts":
      withDb:
        let queryParams = parseQueryParams(request.query)
        let companyIdStr = queryParams.getOrDefault("companyId", "")
        var counterparts: seq[Counterpart]
        if companyIdStr != "" and companyIdStr != "0":
          counterparts = findWhere(Counterpart, db, "company_id = CAST($1 AS BIGINT) ORDER BY name", companyIdStr)
        else:
          counterparts = @[]
        resp Http200, {"Content-Type": "application/json"}, $toJsonArray(counterparts)

    get "/api/counterparts/company/@companyId":
      withDb:
        let companyId = parseInt(@"companyId")
        var counterparts = findWhere(Counterpart, db, "company_id = $1 ORDER BY name", $companyId)
        resp Http200, {"Content-Type": "application/json"}, $toJsonArray(counterparts)

    post "/api/counterparts":
      withDb:
        let body = parseJson(request.body)
        let name = body["name"].getStr()
        let eik = body.getOrDefault("eik").getStr("")
        let companyId = body["companyId"].getBiggestInt()

        var existing: seq[Counterpart]
        if eik != "":
          existing = findWhere(Counterpart, db, "company_id = $1 AND (name = $2 OR eik = $3)", $companyId, name, eik)
        else:
          existing = findWhere(Counterpart, db, "company_id = $1 AND name = $2", $companyId, name)

        if existing.len > 0:
          resp Http409, {"Content-Type": "application/json"}, $(%*{"error": "Контрагент с това име или ЕИК вече съществува"})
          return

        var counterpart = newCounterpart(
          name = name,
          eik = eik,
          company_id = companyId
        )
        save(counterpart, db)
        resp Http201, {"Content-Type": "application/json"}, $toJson(counterpart)

    get "/api/counterparts/@id":
      withDb:
        let counterpartOpt = find(Counterpart, parseInt(@"id"), db)
        if counterpartOpt.isNone:
          resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Counterpart not found"})
          return
        var counterpart = counterpartOpt.get()
        resp Http200, {"Content-Type": "application/json"}, $toJson(counterpart)

    put "/api/counterparts/@id":
      withDb:
        let id = parseInt(@"id")
        let body = parseJson(request.body)
        let counterpartOpt = find(Counterpart, id, db)
        if counterpartOpt.isNone:
          resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Контрагентът не е намерен"})
          return
        var counterpart = counterpartOpt.get()
        if body.hasKey("name"): counterpart.name = body["name"].getStr()
        if body.hasKey("eik"): counterpart.eik = body["eik"].getStr()
        if body.hasKey("vatNumber"): counterpart.vat_number = body["vatNumber"].getStr()
        if body.hasKey("isCustomer"): counterpart.is_customer = body["isCustomer"].getBool()
        if body.hasKey("isSupplier"): counterpart.is_supplier = body["isSupplier"].getBool()
        counterpart.updated_at = now()
        save(counterpart, db)
        resp Http200, {"Content-Type": "application/json"}, $toJson(counterpart)

    delete "/api/counterparts/@id":
      withDb:
        let id = parseInt(@"id")
        let counterpartOpt = find(Counterpart, id, db)
        if counterpartOpt.isNone:
          resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Контрагентът не е намерен"})
          return
        deleteById(Counterpart, id, db)
        resp Http200, {"Content-Type": "application/json"}, $(%*{"success": true, "message": "Контрагентът е изтрит"})

  return counterpartRouter
