## Baraba - Счетоводна програма
## REST API built with Jester + Nim

import std/[json, strutils, options, times]
import jester
import norm/postgres

import models/[user, company, account, counterpart, journal, currency]
import services/auth
import db/config
import utils/json_utils

const corsHeaders = @{"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization"}

template addCors() =
  for (k, v) in corsHeaders:
    response.headers[k] = v

router mainRouter:
  # CORS preflight for all routes
  options "/api/auth/login":
    resp Http200, corsHeaders, ""
  options "/api/auth/register":
    resp Http200, corsHeaders, ""
  options "/api/companies":
    resp Http200, corsHeaders, ""
  options "/api/accounts":
    resp Http200, corsHeaders, ""
  options "/api/counterparts":
    resp Http200, corsHeaders, ""
  options "/api/journal-entries":
    resp Http200, corsHeaders, ""

  # Health check
  get "/":
    resp Http200, {"Content-Type": "application/json"}, $(%*{
      "name": "Baraba API",
      "version": "0.1.0",
      "description": "Счетоводна програма REST API"
    })

  get "/health":
    resp Http200, {"Content-Type": "application/json"}, $(%*{"status": "ok"})

  # === AUTH ROUTES ===
  post "/api/auth/login":
    let body = parseJson(request.body)
    let username = body["username"].getStr()
    let password = body["password"].getStr()
    let userOpt = authenticateUser(username, password)
    if userOpt.isSome:
      let user = userOpt.get
      let token = generateToken(user.id, user.username)
      resp Http200, {"Content-Type": "application/json"}, $(%*{
        "token": token,
        "user": {"id": user.id, "username": user.username, "email": user.email}
      })
    else:
      resp Http401, {"Content-Type": "application/json"}, $(%*{"error": "Невалидно потребителско име или парола"})

  post "/api/auth/register":
    let body = parseJson(request.body)
    let username = body["username"].getStr()
    let email = body["email"].getStr()
    let password = body["password"].getStr()
    let groupId = body.getOrDefault("groupId").getBiggestInt(2)
    try:
      let user = createUser(username, email, password, groupId)
      let token = generateToken(user.id, user.username)
      resp Http201, {"Content-Type": "application/json"}, $(%*{
        "token": token,
        "user": {"id": user.id, "username": user.username, "email": user.email}
      })
    except:
      resp Http400, {"Content-Type": "application/json"}, $(%*{"error": getCurrentExceptionMsg()})

  # === COMPANY ROUTES ===
  get "/api/companies":
    let db = openDb()
    try:
      var companies = @[newCompany()]
      db.selectAll(companies)
      if companies.len == 1 and companies[0].id == 0:
        companies = @[]
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
      resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Фирмата не е намерена"})
    finally:
      close(db)

  post "/api/companies":
    let body = parseJson(request.body)
    let db = openDb()
    try:
      var baseCurrencyId: int64 = 0
      var currencies = @[newCurrency()]
      db.select(currencies, "code = $1", "BGN")
      if currencies.len > 0 and currencies[0].id != 0:
        baseCurrencyId = currencies[0].id
      var company = newCompany(
        name = body["name"].getStr(),
        eik = body["eik"].getStr(),
        vat_number = body.getOrDefault("vatNumber").getStr(""),
        address = body.getOrDefault("address").getStr(""),
        city = body.getOrDefault("city").getStr(""),
        base_currency_id = baseCurrencyId
      )
      db.insert(company)
      resp Http201, {"Content-Type": "application/json"}, $toJson(company)
    except:
      resp Http400, {"Content-Type": "application/json"}, $(%*{"error": getCurrentExceptionMsg()})
    finally:
      close(db)

  # === ACCOUNT ROUTES ===
  get "/api/accounts":
    let companyId = request.params.getOrDefault("companyId", "0")
    let db = openDb()
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
      close(db)

  get "/api/accounts/company/@companyId":
    let companyId = parseInt(@"companyId")
    let db = openDb()
    try:
      var accounts = @[newAccount()]
      db.select(accounts, "company_id = $1 ORDER BY code", companyId)
      if accounts.len == 1 and accounts[0].id == 0:
        accounts = @[]
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
        account_type = body.getOrDefault("accountType").getStr("ASSET"),
        company_id = body["companyId"].getBiggestInt(),
        parent_id = parentId
      )
      db.insert(account)
      resp Http201, {"Content-Type": "application/json"}, $toJson(account)
    except:
      resp Http400, {"Content-Type": "application/json"}, $(%*{"error": getCurrentExceptionMsg()})
    finally:
      close(db)

  # === COUNTERPART ROUTES ===
  get "/api/counterparts":
    let companyId = request.params.getOrDefault("companyId", "0")
    let db = openDb()
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
      close(db)

  post "/api/counterparts":
    let body = parseJson(request.body)
    let db = openDb()
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
      close(db)

  # === JOURNAL ENTRY ROUTES ===
  get "/api/journal-entries":
    let companyId = request.params.getOrDefault("companyId", "0")
    let db = openDb()
    try:
      var entries = @[newJournalEntry()]
      if companyId != "0":
        db.select(entries, "company_id = $1 ORDER BY document_date DESC", parseInt(companyId))
      else:
        db.selectAll(entries)
      if entries.len == 1 and entries[0].id == 0:
        entries = @[]
      resp Http200, {"Content-Type": "application/json"}, $toJsonArray(entries)
    finally:
      close(db)

  post "/api/journal-entries":
    let body = parseJson(request.body)
    let db = openDb()
    try:
      var entry = newJournalEntry(
        document_number = body.getOrDefault("documentNumber").getStr(""),
        description = body.getOrDefault("description").getStr(""),
        total_amount = body.getOrDefault("totalAmount").getFloat(0.0),
        company_id = body["companyId"].getBiggestInt(),
        created_by_id = body.getOrDefault("createdById").getBiggestInt(1)
      )
      db.insert(entry)
      resp Http201, {"Content-Type": "application/json"}, $toJson(entry)
    except:
      resp Http400, {"Content-Type": "application/json"}, $(%*{"error": getCurrentExceptionMsg()})
    finally:
      close(db)

proc main() =
  echo "Starting Baraba API server..."
  echo "http://localhost:5000"
  let settings = newSettings(port = Port(5000))
  var jester = initJester(mainRouter, settings = settings)
  jester.serve()

when isMainModule:
  main()
