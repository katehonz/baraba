import std/[json, strutils, options, times]
import jester
import norm/postgres

import ../models/account
import ../db/config
import ../utils/json_utils

proc accountRoutes*(): auto =
  router accountRouter:
    # Logic from baraba.nim, adapted for pool
    get "/api/accounts":
      let companyId = request.params.getOrDefault("companyId", "0")
      let db = getDbConn()
      try:
        var accounts = @[newAccount()]
        if companyId != "0":
          db.select(accounts, "company_id = $1 ORDER BY code", parseInt(companyId))
        else:
          db.selectAll(accounts)
        if accounts.len == 1 and accounts[0].id == 0:
          accounts = @[]
        resp Http200, {"Content-Type": "application/json"}, $toJsonArray(accounts)
      finally:
        releaseDbConn(db)

    get "/api/accounts/company/@companyId":
      let companyId = parseInt(@"companyId")
      let db = getDbConn()
      try:
        var accounts = @[newAccount()]
        db.select(accounts, "company_id = $1 ORDER BY code", companyId)
        if accounts.len == 1 and accounts[0].id == 0:
          accounts = @[]
        resp Http200, {"Content-Type": "application/json"}, $toJsonArray(accounts)
      finally:
        releaseDbConn(db)
    
    # This is a new route from the original account_routes.nim
    get "/api/accounts/analytical/@companyId":
      let companyId = parseInt(@"companyId")
      let db = getDbConn()
      try:
        var accounts: seq[Account] = @[]
        # Assuming is_analytical field exists based on original file
        db.select(accounts, "company_id = $1 AND is_analytical = true ORDER BY code", companyId)
        resp Http200, {"Content-Type": "application/json"}, $toJsonArray(accounts)
      finally:
        releaseDbConn(db)

    get "/api/accounts/@id":
      let accountId = parseInt(@"id")
      let db = getDbConn()
      try:
        var account = newAccount()
        db.select(account, "id = $1", accountId)
        resp Http200, {"Content-Type": "application/json"}, $toJson(account)
      except:
        resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Сметката не е намерена"})
      finally:
        releaseDbConn(db)

    # Logic from baraba.nim, adapted for pool
    post "/api/accounts":
      let body = parseJson(request.body)
      let db = getDbConn()
      try:
        var parentId = none(int64)
        if body.hasKey("parentId") and body["parentId"].kind != JNull:
          parentId = some(body["parentId"].getBiggestInt())
        var account = newAccount(
          code = body["code"].getStr(),
          name = body["name"].getStr(),
          account_type = body.getOrDefault("accountType").getStr("ASSET"),
          company_id = body["companyId"].getBiggestInt(),
          parent_id = parentId
        )
        db.insert(account)
        resp Http201, {"Content-Type": "application/json"}, $toJson(account)
      except:
        resp Http400, {"Content-Type": "application/json"}, $(%*{"error": getCurrentExceptionMsg()})
      finally:
        releaseDbConn(db)

    # Logic from original account_routes.nim, adapted for pool
    put "/api/accounts/@id":
      let accountId = parseInt(@"id")
      let body = parseJson(request.body)
      let db = getDbConn()
      try:
        var account = newAccount()
        db.select(account, "id = $1", accountId)

        if body.hasKey("name"): account.name = body["name"].getStr()
        if body.hasKey("account_type"): account.account_type = body.getOrDefault("accountType").getStr(account.account_type)
        account.updated_at = now()

        db.update(account)
        resp Http200, {"Content-Type": "application/json"}, $toJson(account)
      except:
        resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Сметката не е намерена"})
      finally:
        releaseDbConn(db)

    # Logic from original account_routes.nim, adapted for pool
    delete "/api/accounts/@id":
      let accountId = parseInt(@"id")
      let db = getDbConn()
      try:
        var account = newAccount()
        db.select(account, "id = $1", accountId)
        db.delete(account)
        resp Http200, {"Content-Type": "application/json"}, $(%*{"success": true, "message": "Сметката е изтрита"})
      except:
        resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Сметката не е намерена"})
      finally:
        releaseDbConn(db)

  return accountRouter