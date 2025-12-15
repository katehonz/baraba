import std/[json, options, strutils, times]
import jester
import norm/postgres
import ../models/account
import ../db/config
import ../utils/json_utils

proc accountRoutes*(): auto =
  router accountRouter:
    get "/api/accounts":
      let companyId = request.params.getOrDefault("companyId", "0")
      let db = openDb()
      try:
        var accounts: seq[Account] = @[]
        if companyId != "0":
          db.select(accounts, "\"companyId\" = $1 ORDER BY code", parseInt(companyId))
        else:
          db.selectAll(accounts)
        resp Http200, {"Content-Type": "application/json"}, $toJsonArray(accounts)
      finally:
        close(db)

    get "/api/accounts/@id":
      let accountId = parseInt(@"id")
      let db = openDb()
      try:
        var account = newAccount()
        db.select(account, "id = $1", accountId)
        resp Http200, {"Content-Type": "application/json"}, $toJson(account)
      except:
        resp Http404, {"Content-Type": "application/json"}, $(%*{
          "error": "Сметката не е намерена"
        })
      finally:
        close(db)

    get "/api/accounts/company/@companyId":
      let companyId = parseInt(@"companyId")
      let db = openDb()
      try:
        var accounts: seq[Account] = @[]
        db.select(accounts, "\"companyId\" = $1 ORDER BY code", companyId)
        resp Http200, {"Content-Type": "application/json"}, $toJsonArray(accounts)
      finally:
        close(db)

    get "/api/accounts/analytical/@companyId":
      let companyId = parseInt(@"companyId")
      let db = openDb()
      try:
        var accounts: seq[Account] = @[]
        db.select(accounts, "\"companyId\" = $1 AND \"isAnalytical\" = true ORDER BY code", companyId)
        resp Http200, {"Content-Type": "application/json"}, $toJsonArray(accounts)
      finally:
        close(db)

    post "/api/accounts":
      let body = parseJson(request.body)
      let db = openDb()
      try:
        var parentId = none(int64)
        if body.hasKey("parentId") and body["parentId"].kind != JNull:
          parentId = some(body["parentId"].getBiggestInt())

        var account = newAccount(
          code = body["code"].getStr(),
          name = body["name"].getStr(),
          description = body.getOrDefault("description").getStr(""),
          accountType = body.getOrDefault("accountType").getStr("ASSET"),
          accountClass = body.getOrDefault("accountClass").getInt(0),
          level = body.getOrDefault("level").getInt(1),
          isVatApplicable = body.getOrDefault("isVatApplicable").getBool(false),
          vatDirection = body.getOrDefault("vatDirection").getStr("NONE"),
          isActive = body.getOrDefault("isActive").getBool(true),
          isAnalytical = body.getOrDefault("isAnalytical").getBool(false),
          supportsQuantities = body.getOrDefault("supportsQuantities").getBool(false),
          defaultUnit = body.getOrDefault("defaultUnit").getStr(""),
          companyId = body["companyId"].getBiggestInt(),
          parentId = parentId
        )

        db.insert(account)
        resp Http201, {"Content-Type": "application/json"}, $toJson(account)
      except:
        resp Http400, {"Content-Type": "application/json"}, $(%*{
          "error": "Грешка при създаване: " & getCurrentExceptionMsg()
        })
      finally:
        close(db)

    put "/api/accounts/@id":
      let accountId = parseInt(@"id")
      let body = parseJson(request.body)
      let db = openDb()
      try:
        var account = newAccount()
        db.select(account, "id = $1", accountId)

        if body.hasKey("name"): account.name = body["name"].getStr()
        if body.hasKey("description"): account.description = body["description"].getStr()
        if body.hasKey("accountType"): account.accountType = body["accountType"].getStr()
        if body.hasKey("isVatApplicable"): account.isVatApplicable = body["isVatApplicable"].getBool()
        if body.hasKey("vatDirection"): account.vatDirection = body["vatDirection"].getStr()
        if body.hasKey("isActive"): account.isActive = body["isActive"].getBool()
        if body.hasKey("isAnalytical"): account.isAnalytical = body["isAnalytical"].getBool()
        account.updatedAt = now()

        db.update(account)
        resp Http200, {"Content-Type": "application/json"}, $toJson(account)
      except:
        resp Http404, {"Content-Type": "application/json"}, $(%*{
          "error": "Сметката не е намерена"
        })
      finally:
        close(db)

    delete "/api/accounts/@id":
      let accountId = parseInt(@"id")
      let db = openDb()
      try:
        var account = newAccount()
        db.select(account, "id = $1", accountId)
        db.delete(account)
        resp Http200, {"Content-Type": "application/json"}, $(%*{
          "success": true
        })
      except:
        resp Http404, {"Content-Type": "application/json"}, $(%*{
          "error": "Сметката не е намерена"
        })
      finally:
        close(db)

  return accountRouter
