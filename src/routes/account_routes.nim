import std/[json, strutils, options, times]
import jester
import orm/orm

import ../models/account
import ../db/config
import ../utils/json_utils

proc accountRoutes*(): auto =
  router accountRouter:
    get "/api/accounts":
      withDb:
        let companyId = request.params.getOrDefault("companyId", "0")
        var accounts: seq[Account]
        if companyId != "0":
          accounts = findWhere(Account, db, "company_id = $1 ORDER BY code", $(parseInt(companyId)))
        else:
          accounts = findAll(Account, db)
        resp Http200, {"Content-Type": "application/json"}, $toJsonArray(accounts)

    get "/api/accounts/company/@companyId":
      withDb:
        let companyId = parseInt(@"companyId")
        var accounts = findWhere(Account, db, "company_id = $1 ORDER BY code", $companyId)
        resp Http200, {"Content-Type": "application/json"}, $toJsonArray(accounts)

    get "/api/accounts/analytical/@companyId":
      withDb:
        let companyId = parseInt(@"companyId")
        let accounts = findWhere(Account, db, "company_id = $1 AND is_analytical = true ORDER BY code", $companyId)
        resp Http200, {"Content-Type": "application/json"}, $toJsonArray(accounts)

    get "/api/accounts/@id":
      withDb:
        let accountOpt = find(Account, parseInt(@"id"), db)
        if accountOpt.isNone:
          resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Account not found"})
          return
        var account = accountOpt.get()
        resp Http200, {"Content-Type": "application/json"}, $toJson(account)

    post "/api/accounts":
      withDb:
        let body = parseJson(request.body)
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
        save(account, db)
        resp Http201, {"Content-Type": "application/json"}, $toJson(account)

    put "/api/accounts/@id":
      withDb:
        let accountId = parseInt(@"id")
        let body = parseJson(request.body)
        var accountOpt = find(Account, accountId, db)
        if accountOpt.isSome:
          var account = accountOpt.get()
          if body.hasKey("name"): account.name = body["name"].getStr()
          if body.hasKey("account_type"): account.account_type = body.getOrDefault("accountType").getStr(account.account_type)
          account.updated_at = now()

          save(account, db)
          resp Http200, {"Content-Type": "application/json"}, $toJson(account)
        else:
          resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Сметката не е намерена"})

    delete "/api/accounts/@id":
      withDb:
        let accountId = parseInt(@"id")
        deleteById(Account, accountId, db)
        resp Http200, {"Content-Type": "application/json"}, $(%*{"success": true, "message": "Сметката е изтрита"})

  return accountRouter
