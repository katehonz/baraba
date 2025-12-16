## Baraba - Счетоводна програма
## REST API built with Jester + Nim

import std/[json, strutils, options, times, math, xmlparser, xmltree, httpclient, os]
import jester
import asynchttpserver
import norm/postgres

import models/[user, company, account, counterpart, journal, currency, exchangerate, vatrate, fixed_asset_category, fixed_asset, depreciation_journal, bank_profile]
import services/auth
import db/config
import utils/json_utils
import graphql/resolvers
import "vendor/nim-graphql/graphql"

# Import route handlers
import routes/currency_routes
import routes/audit_log_routes
import routes/exchange_rate_routes
import routes/vat_rate_routes
import routes/user_routes
import routes/user_group_routes
import routes/fixed_asset_category_routes
import routes/vies_routes

var graphqlCtx {.threadvar.}: GraphqlRef
var graphqlInitialized {.threadvar.}: bool

proc getGraphqlCtx(): GraphqlRef =
  ## Lazy initialization of GraphQL context per thread
  if not graphqlInitialized:
    graphqlCtx = setupGraphQL()
    graphqlInitialized = true
  result = graphqlCtx

const corsHeaders* = @{
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
}

const jsonCors* = @{
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*"
}

router mainRouter:
  # =====================
  # CORS preflight
  # =====================
  options "/api/auth/login": resp Http200, corsHeaders, ""
  options "/api/auth/register": resp Http200, corsHeaders, ""
  options "/api/auth/me": resp Http200, corsHeaders, ""
  options "/api/auth/recover-password": resp Http200, corsHeaders, ""
  options "/api/auth/reset-password": resp Http200, corsHeaders, ""
  options "/api/companies": resp Http200, corsHeaders, ""
  options "/api/companies/@id": resp Http200, corsHeaders, ""
  options "/api/accounts": resp Http200, corsHeaders, ""
  options "/api/accounts/company/@companyId": resp Http200, corsHeaders, ""
  options "/api/counterparts": resp Http200, corsHeaders, ""
  options "/api/currencies": resp Http200, corsHeaders, ""
  options "/api/currencies/@id": resp Http200, corsHeaders, ""
  options "/api/audit-logs": resp Http200, corsHeaders, ""
  options "/api/audit-log-stats": resp Http200, corsHeaders, ""
  options "/api/monthly-stats": resp Http200, corsHeaders, ""
  options "/api/exchange-rates": resp Http200, corsHeaders, ""
  options "/api/exchange-rates/fetch-ecb": resp Http200, corsHeaders, ""
  options "/api/vat-rates": resp Http200, corsHeaders, ""
  options "/api/vat-rates/@id": resp Http200, corsHeaders, ""
  options "/api/users": resp Http200, corsHeaders, ""
  options "/api/users/@id": resp Http200, corsHeaders, ""
  options "/api/users/@id/reset-password": resp Http200, corsHeaders, ""
  options "/api/user-groups": resp Http200, corsHeaders, ""
  options "/api/fixed-asset-categories": resp Http200, corsHeaders, ""
  options "/api/banks": resp Http200, corsHeaders, ""
  options "/api/banks/@id": resp Http200, corsHeaders, ""
  options "/api/fixed-assets": resp Http200, corsHeaders, ""
  options "/api/fixed-assets/@id": resp Http200, corsHeaders, ""
  options "/api/fixed-assets/calculate-depreciation": resp Http200, corsHeaders, ""
  options "/api/fixed-assets/post-depreciation": resp Http200, corsHeaders, ""
  options "/api/depreciation-journal": resp Http200, corsHeaders, ""
  options "/api/calculated-periods": resp Http200, corsHeaders, ""
  options "/api/validate-vat": resp Http200, corsHeaders, ""
  options "/api/journal-entries": resp Http200, corsHeaders, ""
  options "/api/journal-entries/@id": resp Http200, corsHeaders, ""
  options "/api/journal-entries/@id/post": resp Http200, corsHeaders, ""
  options "/api/journal-entries/@id/unpost": resp Http200, corsHeaders, ""
  options "/api/entry-lines": resp Http200, corsHeaders, ""
  options "/api/entry-lines/@id": resp Http200, corsHeaders, ""
  options "/api/reports/turnover-sheet": resp Http200, corsHeaders, ""
  options "/api/reports/general-ledger": resp Http200, corsHeaders, ""
  options "/api/system-settings": resp Http200, corsHeaders, ""
  options "/api/system-settings/smtp": resp Http200, corsHeaders, ""
  options "/api/system-settings/smtp/test": resp Http200, corsHeaders, ""
  options "/api/companies/@id/salt-edge": resp Http200, corsHeaders, ""
  options "/api/scanned-invoices": resp Http200, corsHeaders, ""
  options "/api/scanned-invoices/@id": resp Http200, corsHeaders, ""
  options "/api/scanned-invoices/@id/process": resp Http200, corsHeaders, ""
  options "/graphql": resp Http200, corsHeaders, ""

  # =====================
  # Health check
  # =====================
  get "/":
    resp Http200, jsonCors, $(%*{
      "name": "Baraba API",
      "version": "0.1.0",
      "description": "Счетоводна програма REST API"
    })

  get "/health":
    resp Http200, jsonCors, $(%*{"status": "ok"})

  # =====================
  # SYSTEM SETTINGS
  # =====================
  get "/api/system-settings":
    resp Http200, jsonCors, $(%*{
      "smtpHost": "smtp.example.com",
      "smtpPort": 587,
      "smtpUsername": "user@example.com",
      "smtpFromEmail": "noreply@example.com",
      "smtpFromName": "Baraba",
      "smtpUseTls": true,
      "smtpUseSsl": false,
      "smtpEnabled": true
    })

  put "/api/system-settings/smtp":
    let body = parseJson(request.body)
    # TODO: Implement saving of SMTP settings
    resp Http200, jsonCors, $(%*{"success": true})

  post "/api/system-settings/smtp/test":
    let body = parseJson(request.body)
    let testEmail = body["testEmail"].getStr()
    # TODO: Implement sending of test email
    echo "Sending test email to " & testEmail
    resp Http200, jsonCors, $(%*{"success": true})

  put "/api/companies/@id/salt-edge":
    let companyId = parseInt(@"id")
    let body = parseJson(request.body)
    # TODO: Implement saving of SaltEdge settings
    resp Http200, jsonCors, $(%*{"success": true})

  # =====================
  # AUTH ROUTES
  # =====================
  post "/api/auth/login":
    let body = parseJson(request.body)
    let username = body["username"].getStr()
    let password = body["password"].getStr()

    let db = getDbConn()
    let userOpt = authenticateUser(db, username, password)
    releaseDbConn(db)

    if userOpt.isSome:
      let user = userOpt.get
      let token = generateToken(user.id, user.username)
      resp Http200, jsonCors, $(%*{
        "token": token,
        "user": {"id": user.id, "username": user.username, "email": user.email}
      })
    else:
      resp Http401, jsonCors, $(%*{"error": "Невалидно потребителско име или парола"})

  post "/api/auth/register":
    let body = parseJson(request.body)
    let username = body["username"].getStr()
    let email = body["email"].getStr()
    let password = body["password"].getStr()
    let groupId = body.getOrDefault("groupId").getBiggestInt(2)

    let db = getDbConn()
    try:
      let user = createUser(db, username, email, password, groupId)
      let token = generateToken(user.id, user.username)
      resp Http201, jsonCors, $(%*{
        "token": token,
        "user": {"id": user.id, "username": user.username, "email": user.email}
      })
    except:
      resp Http400, jsonCors, $(%*{"error": getCurrentExceptionMsg()})
    finally:
      releaseDbConn(db)

  get "/api/auth/me":
    let authHeader = request.headers.getOrDefault("Authorization")
    if authHeader.len == 0 or not authHeader.startsWith("Bearer "):
      resp Http401, jsonCors, $(%*{"error": "Липсва токен"})

    let token = authHeader[7..^1]
    let (valid, userId, _) = verifyToken(token)
    if not valid:
      resp Http401, jsonCors, $(%*{"error": "Невалиден токен"})

    let db = getDbConn()
    let userOpt = getUserById(db, userId)
    releaseDbConn(db)

    if userOpt.isSome:
      let user = userOpt.get
      resp Http200, jsonCors, $(%*{
        "id": user.id, "username": user.username, "email": user.email
      })
    else:
      resp Http404, jsonCors, $(%*{"error": "Потребителят не е намерен"})

  post "/api/auth/recover-password":
    let body = parseJson(request.body)
    let email = body["email"].getStr()
    
    let db = getDbConn()
    let tokenOpt = recoverPassword(db, email)
    releaseDbConn(db)

    if tokenOpt.isSome:
      resp Http200, jsonCors, $(%*{"message": "Изпратен е линк за възстановяване на паролата на вашия имейл."})
    else:
      resp Http404, jsonCors, $(%*{"error": "Потребител с този имейл не е намерен"})

  post "/api/auth/reset-password":
    let body = parseJson(request.body)
    let email = body["email"].getStr()
    let token = body["token"].getStr()
    let newPassword = body["password"].getStr()

    let db = getDbConn()
    let success = resetPassword(db, email, token, newPassword)
    releaseDbConn(db)

    if success:
      resp Http200, jsonCors, $(%*{"message": "Паролата е променена успешно!"})
    else:
      resp Http400, jsonCors, $(%*{"error": "Невалиден токен или изтекло време за възстановяване"})

  # =====================
  # COMPANY ROUTES
  # =====================
  get "/api/companies":
    let db = getDbConn()
    try:
      var companies = @[newCompany()]
      db.selectAll(companies)
      if companies.len == 1 and companies[0].id == 0:
        companies = @[]
      resp Http200, jsonCors, $toJsonArray(companies)
    finally:
      releaseDbConn(db)

  get "/api/companies/@id":
    let companyId = parseInt(@"id")
    let db = getDbConn()
    try:
      var company = newCompany()
      db.select(company, "id = $1", companyId)
      
      var companyJson = toJson(company)
      let fields = [
        ("defaultCashAccountId", "defaultCashAccount"),
        ("defaultCustomersAccountId", "defaultCustomersAccount"),
        ("defaultSuppliersAccountId", "defaultSuppliersAccount"),
        ("defaultSalesRevenueAccountId", "defaultSalesRevenueAccount"),
        ("defaultVatPurchaseAccountId", "defaultVatPurchaseAccount"),
        ("defaultVatSalesAccountId", "defaultVatSalesAccount"),
        ("defaultCardPaymentPurchaseAccountId", "defaultCardPaymentPurchaseAccount"),
        ("defaultCardPaymentSalesAccountId", "defaultCardPaymentSalesAccount")
      ]

      for (field, jsonField) in fields:
        let accountIdOpt = company.getAccountId(field)
        if accountIdOpt.isSome:
          var account = newAccount()
          db.select(account, "id = $1", accountIdOpt.get)
          companyJson[jsonField] = toJson(account)
        else:
          companyJson[jsonField] = %*{}

      resp Http200, jsonCors, $companyJson
    except:
      resp Http404, jsonCors, $(%*{"error": "Фирмата не е намерена"})
    finally:
      releaseDbConn(db)

  post "/api/companies":
    let body = parseJson(request.body)
    let db = getDbConn()
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
      resp Http201, jsonCors, $toJson(company)
    except:
      resp Http400, jsonCors, $(%*{"error": getCurrentExceptionMsg()})
    finally:
      releaseDbConn(db)

  put "/api/companies/@id":
    let companyId = parseInt(@"id")
    let body = parseJson(request.body)
    let db = getDbConn()
    try:
      var company = newCompany()
      db.select(company, "id = $1", companyId)
      if body.hasKey("name"): company.name = body["name"].getStr()
      if body.hasKey("vatNumber"): company.vat_number = body["vatNumber"].getStr()
      if body.hasKey("address"): company.address = body["address"].getStr()
      if body.hasKey("city"): company.city = body["city"].getStr()
      company.updated_at = now()
      db.update(company)
      resp Http200, jsonCors, $toJson(company)
    except:
      resp Http404, jsonCors, $(%*{"error": "Фирмата не е намерена"})
    finally:
      releaseDbConn(db)

  put "/api/companies/@id/default-accounts":
    let companyId = parseInt(@"id")
    let body = parseJson(request.body)
    let db = getDbConn()
    try:
      var company = newCompany()
      db.select(company, "id = $1", companyId)

      let fields = [
        "defaultCashAccountId",
        "defaultCustomersAccountId",
        "defaultSuppliersAccountId",
        "defaultSalesRevenueAccountId",
        "defaultVatPurchaseAccountId",
        "defaultVatSalesAccountId",
        "defaultCardPaymentPurchaseAccountId",
        "defaultCardPaymentSalesAccountId"
      ]

      for field in fields:
        if body.hasKey(field):
          if body[field].kind == JNull or body[field].getInt() == 0:
            company.setAccountId(field, none(int64))
          else:
            company.setAccountId(field, some(body[field].getInt().int64))
      
      company.updated_at = now()
      db.update(company)
      resp Http200, jsonCors, $toJson(company)
    except:
      resp Http400, jsonCors, $(%*{"error": getCurrentExceptionMsg()})
    finally:
      releaseDbConn(db)

  delete "/api/companies/@id":
    let companyId = parseInt(@"id")
    let db = getDbConn()
    try:
      var company = newCompany()
      db.select(company, "id = $1", companyId)
      db.delete(company)
      resp Http200, jsonCors, $(%*{"success": true})
    except:
      resp Http404, jsonCors, $(%*{"error": "Фирмата не е намерена"})
    finally:
      releaseDbConn(db)

  # =====================
  # ACCOUNT ROUTES
  # =====================
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
      resp Http200, jsonCors, $toJsonArray(accounts)
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
      resp Http200, jsonCors, $toJsonArray(accounts)
    finally:
      releaseDbConn(db)

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
      resp Http201, jsonCors, $toJson(account)
    except:
      resp Http400, jsonCors, $(%*{"error": getCurrentExceptionMsg()})
    finally:
      releaseDbConn(db)

  get "/api/accounts/@id":
    let db = getDbConn()
    try:
      var account = newAccount()
      try:
        db.select(account, "id = $1", parseInt(@"id"))
      except:
        resp Http404, jsonCors, $(%*{"error": "Account not found"})
      if account.id == 0:
        resp Http404, jsonCors, $(%*{"error": "Account not found"})
      resp Http200, jsonCors, $toJson(account)
    except:
      resp Http500, jsonCors, $(%*{"error": getCurrentExceptionMsg()})
    finally:
      releaseDbConn(db)

  # =====================
  # COUNTERPART ROUTES
  # =====================
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
      resp Http200, jsonCors, $toJsonArray(counterparts)
    finally:
      releaseDbConn(db)

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
      resp Http201, jsonCors, $toJson(counterpart)
    except:
      resp Http400, jsonCors, $(%*{"error": getCurrentExceptionMsg()})
    finally:
      releaseDbConn(db)

  get "/api/counterparts/@id":
    let db = getDbConn()
    try:
      var counterpart = newCounterpart()
      try:
        db.select(counterpart, "id = $1", parseInt(@"id"))
      except:
        resp Http404, jsonCors, $(%*{"error": "Counterpart not found"})
      if counterpart.id == 0:
        resp Http404, jsonCors, $(%*{"error": "Counterpart not found"})
      resp Http200, jsonCors, $toJson(counterpart)
    except:
      resp Http500, jsonCors, $(%*{"error": getCurrentExceptionMsg()})
    finally:
      releaseDbConn(db)

  # =====================
  # CURRENCY ROUTES
  # =====================
  get "/api/currencies":
    let db = getDbConn()
    try:
      var currencies = @[newCurrency()]
      db.selectAll(currencies)
      if currencies.len == 1 and currencies[0].id == 0:
        currencies = @[]
      resp Http200, jsonCors, $toJsonArray(currencies)
    finally:
      releaseDbConn(db)

  post "/api/currencies":
    let body = parseJson(request.body)
    let db = getDbConn()
    try:
      var currency = newCurrency(
        code = body["code"].getStr(),
        name = body["name"].getStr(),
        name_bg = body.getOrDefault("nameBg").getStr(""),
        symbol = body.getOrDefault("symbol").getStr(""),
        decimal_places = body.getOrDefault("decimalPlaces").getInt(2),
        is_base_currency = body.getOrDefault("isBaseCurrency").getBool(false),
        is_active = true
      )
      db.insert(currency)
      resp Http201, jsonCors, $toJson(currency)
    finally:
      releaseDbConn(db)

  put "/api/currencies/@id":
    let id = parseInt(@"id")
    let body = parseJson(request.body)
    let db = getDbConn()
    try:
      var currency = newCurrency()
      db.select(currency, "id = $1", id)
      if currency.id == 0:
        resp Http404, jsonCors, """{"error": "Currency not found"}"""
      else:
        if body.hasKey("isActive"):
          currency.is_active = body["isActive"].getBool()
        db.update(currency)
        resp Http200, jsonCors, $toJson(currency)
    finally:
      releaseDbConn(db)

  # =====================
  # AUDIT LOG ROUTES
  # =====================
  get "/api/audit-logs":
    let companyId = request.params.getOrDefault("companyId", "0").parseInt
    let fromDate = request.params.getOrDefault("fromDate", "")
    let toDate = request.params.getOrDefault("toDate", "")
    let search = request.params.getOrDefault("search", "")
    let action = request.params.getOrDefault("action", "")
    let offset = request.params.getOrDefault("offset", "0").parseInt
    let limit = request.params.getOrDefault("limit", "50").parseInt
    let logsResult = getAuditLogs(companyId, fromDate, toDate, search, action, offset, limit)
    resp Http200, jsonCors, logsResult

  get "/api/audit-log-stats":
    let companyId = request.params.getOrDefault("companyId", "0").parseInt
    let days = request.params.getOrDefault("days", "30").parseInt
    let statsResult = getAuditLogStats(companyId, days)
    resp Http200, jsonCors, statsResult

  get "/api/monthly-stats":
    let companyId = request.params.getOrDefault("companyId", "0").parseInt
    let fromYear = request.params.getOrDefault("fromYear", "0").parseInt
    let fromMonth = request.params.getOrDefault("fromMonth", "0").parseInt
    let toYear = request.params.getOrDefault("toYear", "0").parseInt
    let toMonth = request.params.getOrDefault("toMonth", "0").parseInt
    let monthlyResult = getMonthlyTransactionStats(companyId, fromYear, fromMonth, toYear, toMonth)
    resp Http200, jsonCors, monthlyResult

  # =====================
  # EXCHANGE RATE ROUTES
  # =====================
  get "/api/exchange-rates":
    let db = getDbConn()
    try:
      var rates = @[newExchangeRate()]
      db.selectAll(rates)
      if rates.len == 1 and rates[0].id == 0:
        rates = @[]
      resp Http200, jsonCors, $toJsonArray(rates)
    finally:
      releaseDbConn(db)

  post "/api/exchange-rates/fetch-ecb":
    let db = getDbConn()
    try:
      # Fetch ECB rates XML
      let client = newHttpClient()
      let ecbUrl = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml"
      let xmlContent = client.getContent(ecbUrl)
      client.close()

      # Parse XML
      let xml = parseXml(xmlContent)

      # Find EUR currency (base)
      var eurCurrency = newCurrency()
      var eurCurrencies = @[newCurrency()]
      db.select(eurCurrencies, "code = $1", "EUR")
      if eurCurrencies.len > 0 and eurCurrencies[0].id != 0:
        eurCurrency = eurCurrencies[0]
      else:
        # Create EUR if not exists
        eurCurrency = newCurrency(code = "EUR", name = "Euro", symbol = "€", isBaseCurrency = true, isActive = true)
        db.insert(eurCurrency)

      var ratesAdded = 0
      var ratesDate = ""

      # Navigate to Cube elements
      for envelope in xml:
        if envelope.tag == "Cube":
          for dateCube in envelope:
            if dateCube.tag == "Cube" and dateCube.attr("time") != "":
              ratesDate = dateCube.attr("time")
              let validDate = parse(ratesDate, "yyyy-MM-dd")

              for rateCube in dateCube:
                if rateCube.tag == "Cube":
                  let currCode = rateCube.attr("currency")
                  let rateStr = rateCube.attr("rate")
                  if currCode != "" and rateStr != "":
                    let rate = parseFloat(rateStr)

                    # Find or create currency
                    var curr = newCurrency()
                    var currs = @[newCurrency()]
                    db.select(currs, "code = $1", currCode)
                    if currs.len > 0 and currs[0].id != 0:
                      curr = currs[0]
                    else:
                      curr = newCurrency(code = currCode, name = currCode, isActive = false)
                      db.insert(curr)

                    # Create new rate (allow duplicates, user can manage them)
                    var newRate = newExchangeRate(
                      rate = rate,
                      reverse_rate = 1.0 / rate,
                      valid_date = validDate,
                      rate_source = "ECB",
                      from_currency_id = eurCurrency.id,
                      to_currency_id = curr.id
                    )
                    db.insert(newRate)
                    ratesAdded += 1

      resp Http200, jsonCors, $(%*{
        "success": true,
        "message": "ECB курсовете са обновени",
        "ratesAdded": ratesAdded,
        "date": ratesDate
      })
    except CatchableError as e:
      resp Http500, jsonCors, $(%*{
        "error": "Грешка при извличане на курсове от ЕЦБ",
        "details": e.msg
      })
    finally:
      releaseDbConn(db)

  # =====================
  # VAT RATE ROUTES
  # =====================
  get "/api/vat-rates":
    let companyId = request.params.getOrDefault("companyId", "0").parseInt
    let db = getDbConn()
    try:
      var rates = @[newVatRate()]
      if companyId > 0:
        db.select(rates, "company_id = $1", companyId)
      else:
        db.selectAll(rates)
      if rates.len == 1 and rates[0].id == 0:
        rates = @[]
      resp Http200, jsonCors, $toJsonArray(rates)
    finally:
      releaseDbConn(db)

  post "/api/vat-rates":
    let body = parseJson(request.body)
    let db = getDbConn()
    try:
      var vatRate = newVatRate(
        company_id = body["companyId"].getInt().int64,
        code = body["code"].getStr(),
        name = body["name"].getStr(),
        rate = body["rate"].getFloat()
      )
      if body.hasKey("effectiveFrom"):
        vatRate.valid_from = some(parse(body["effectiveFrom"].getStr(), "yyyy-MM-dd"))
      db.insert(vatRate)
      resp Http201, jsonCors, $toJson(vatRate)
    finally:
      releaseDbConn(db)

  delete "/api/vat-rates/@id":
    let id = parseInt(@"id")
    let db = getDbConn()
    try:
      var vatRate = newVatRate()
      db.select(vatRate, "id = $1", id)
      if vatRate.id == 0:
        resp Http404, jsonCors, """{"error": "VAT rate not found"}"""
      else:
        db.delete(vatRate)
        resp Http200, jsonCors, """{"success": true}"""
    finally:
      releaseDbConn(db)

  # =====================
  # USER ROUTES
  # =====================
  get "/api/users":
    let db = getDbConn()
    try:
      var users = @[newUser()]
      db.selectAll(users)
      if users.len == 1 and users[0].id == 0:
        users = @[]
      var usersJson = newJArray()
      for user in users:
        usersJson.add(%*{
          "id": user.id,
          "username": user.username,
          "email": user.email,
          "firstName": user.first_name,
          "lastName": user.last_name,
          "isActive": user.is_active,
          "groupId": user.group_id
        })
      resp Http200, jsonCors, $usersJson
    finally:
      releaseDbConn(db)

  post "/api/users":
    let body = parseJson(request.body)
    let db = getDbConn()
    try:
      let user = createUser(db,
        body["username"].getStr(),
        body["email"].getStr(),
        body["password"].getStr(),
        body.getOrDefault("groupId").getInt(0).int64
      )
      resp Http201, jsonCors, $toJson(user)
    finally:
      releaseDbConn(db)

  put "/api/users/@id":
    let id = parseInt(@"id")
    let body = parseJson(request.body)
    let db = getDbConn()
    try:
      var user = newUser()
      db.select(user, "id = $1", id)
      if user.id == 0:
        resp Http404, jsonCors, """{"error": "User not found"}"""
      else:
        if body.hasKey("username"):
          user.username = body["username"].getStr()
        if body.hasKey("email"):
          user.email = body["email"].getStr()
        if body.hasKey("firstName"):
          user.first_name = body["firstName"].getStr()
        if body.hasKey("lastName"):
          user.last_name = body["lastName"].getStr()
        if body.hasKey("groupId"):
          user.group_id = body["groupId"].getInt().int64
        if body.hasKey("isActive"):
          user.is_active = body["isActive"].getBool()
        db.update(user)
        resp Http200, jsonCors, $toJson(user)
    finally:
      releaseDbConn(db)

  delete "/api/users/@id":
    let id = parseInt(@"id")
    let db = getDbConn()
    try:
      var user = newUser()
      db.select(user, "id = $1", id)
      if user.id == 0:
        resp Http404, jsonCors, """{"error": "User not found"}"""
      else:
        db.delete(user)
        resp Http200, jsonCors, """{"success": true}"""
    finally:
      releaseDbConn(db)

  post "/api/users/@id/reset-password":
    let id = parseInt(@"id")
    let body = parseJson(request.body)
    let db = getDbConn()
    try:
      var user = newUser()
      db.select(user, "id = $1", id)
      if user.id == 0:
        resp Http404, jsonCors, """{"error": "User not found"}"""
      else:
        let newSalt = $epochTime()
        user.password = hashPassword(body["newPassword"].getStr(), newSalt)
        user.salt = newSalt
        db.update(user)
        resp Http200, jsonCors, """{"success": true}"""
    finally:
      releaseDbConn(db)

  # =====================
  # USER GROUP ROUTES
  # =====================
  get "/api/user-groups":
    let db = getDbConn()
    try:
      var groups = @[newUserGroup()]
      db.selectAll(groups)
      if groups.len == 1 and groups[0].id == 0:
        groups = @[]
      resp Http200, jsonCors, $toJsonArray(groups)
    finally:
      releaseDbConn(db)

  # =====================
  # FIXED ASSET CATEGORY ROUTES
  # =====================
  get "/api/fixed-asset-categories":
    let companyId = request.params.getOrDefault("companyId", "0").parseInt
    let db = getDbConn()
    try:
      var categories = @[newFixedAssetCategory()]
      if companyId > 0:
        db.select(categories, "company_id = $1", companyId)
      else:
        db.selectAll(categories)
      if categories.len == 1 and categories[0].id == 0:
        categories = @[]
      resp Http200, jsonCors, $toJsonArray(categories)
    finally:
      releaseDbConn(db)

  # =====================
  # VIES ROUTES
  # =====================
  post "/api/validate-vat":
    let body = parseJson(request.body)
    let vatNumber = body["vatNumber"].getStr()
    if vatNumber.len < 3:
      resp Http400, jsonCors, """{"error": "VAT number too short"}"""
    else:
      resp Http200, jsonCors, """{"message": "VIES validation not implemented yet"}"""

  # =====================
  # SCANNER ROUTES
  # =====================
  get "/api/scanned-invoices":
    let companyId = request.params.getOrDefault("companyId", "0")
    resp Http200, jsonCors, "[]"

  post "/api/scanned-invoices":
    resp Http201, jsonCors, $(%*{"id": 1, "fileName": "invoice.pdf", "status": "UPLOADED"})

  get "/api/scanned-invoices/@id":
    let id = @"id".parseInt
    resp Http200, jsonCors, $(%*{"id": id, "fileName": "invoice.pdf", "status": "UPLOADED", "lines": []})

  put "/api/scanned-invoices/@id":
    let id = @"id".parseInt
    resp Http200, jsonCors, $(%*{"id": id, "fileName": "invoice.pdf", "status": "PROCESSING"})

  delete "/api/scanned-invoices/@id":
    let id = @"id".parseInt
    resp Http200, jsonCors, $(%*{"success": true})

  post "/api/scanned-invoices/@id/process":
    let id = @"id".parseInt
    resp Http200, jsonCors, $(%*{"id": id, "status": "PROCESSED"})

  # =====================
  # JOURNAL ROUTES
  # =====================
  get "/api/journal-entries":
    let companyId = request.params.getOrDefault("companyId", "0")
    let db = getDbConn()
    try:
      var entries = @[newJournalEntry()]
      if companyId != "0":
        db.select(entries, "company_id = $1 ORDER BY document_date DESC", parseInt(companyId))
      else:
        db.selectAll(entries)
      if entries.len == 1 and entries[0].id == 0:
        entries = @[]
      resp Http200, jsonCors, $toJsonArray(entries)
    finally:
      releaseDbConn(db)

  post "/api/journal-entries":
    let body = parseJson(request.body)
    let db = getDbConn()
    try:
      # Get next entry number
      var maxNum: int64 = 0
      let rows = db.getAllRows(sql"""SELECT COALESCE(MAX(entry_number), 0) FROM "JournalEntry" WHERE company_id = $1""", body["companyId"].getBiggestInt())
      if rows.len > 0 and ($rows[0][0]).len > 0:
        maxNum = parseInt($rows[0][0])

      var entry = newJournalEntry(
        entry_number = int(maxNum + 1),
        document_number = body.getOrDefault("documentNumber").getStr(""),
        description = body.getOrDefault("description").getStr(""),
        total_amount = body.getOrDefault("totalAmount").getFloat(0.0),
        company_id = body["companyId"].getBiggestInt(),
        created_by_id = body.getOrDefault("createdById").getBiggestInt(1)
      )
      if body.hasKey("documentDate"):
        entry.document_date = parse(body["documentDate"].getStr(), "yyyy-MM-dd")
      if body.hasKey("accountingDate"):
        entry.accounting_date = parse(body["accountingDate"].getStr(), "yyyy-MM-dd")
      if body.hasKey("documentType"):
        entry.document_type = body["documentType"].getStr()
      if body.hasKey("counterpartId") and body["counterpartId"].kind != JNull:
        entry.counterpart_id = some(body["counterpartId"].getBiggestInt())

      db.insert(entry)

      # Insert entry lines if provided
      if body.hasKey("lines"):
        var lineOrder = 1
        for lineJson in body["lines"]:
          var line = newEntryLine(
            journal_entry_id = entry.id,
            account_id = lineJson["accountId"].getBiggestInt(),
            debit_amount = lineJson.getOrDefault("debitAmount").getFloat(0.0),
            credit_amount = lineJson.getOrDefault("creditAmount").getFloat(0.0),
            description = lineJson.getOrDefault("description").getStr(""),
            line_order = lineOrder
          )
          if lineJson.hasKey("counterpartId") and lineJson["counterpartId"].kind != JNull:
            line.counterpart_id = some(lineJson["counterpartId"].getBiggestInt())
          db.insert(line)
          inc lineOrder

      resp Http201, jsonCors, $toJson(entry)
    except:
      resp Http400, jsonCors, $(%*{"error": getCurrentExceptionMsg()})
    finally:
      releaseDbConn(db)

  get "/api/journal-entries/@id":
    let entryId = parseInt(@"id")
    let db = getDbConn()
    try:
      var entry = newJournalEntry()
      db.select(entry, "id = $1", entryId)

      # Get entry lines
      var lines = @[newEntryLine()]
      db.select(lines, "journal_entry_id = $1 ORDER BY line_order", entryId)
      if lines.len == 1 and lines[0].id == 0:
        lines = @[]

      var entryJson = toJson(entry)
      entryJson["lines"] = toJsonArray(lines)
      resp Http200, jsonCors, $entryJson
    except:
      resp Http404, jsonCors, $(%*{"error": "Записът не е намерен"})
    finally:
      releaseDbConn(db)

  put "/api/journal-entries/@id":
    let entryId = parseInt(@"id")
    let body = parseJson(request.body)
    let db = getDbConn()
    try:
      var entry = newJournalEntry()
      db.select(entry, "id = $1", entryId)

      if entry.is_posted:
        resp Http400, jsonCors, $(%*{"error": "Не може да редактирате осчетоводен запис"})

      if body.hasKey("documentNumber"): entry.document_number = body["documentNumber"].getStr()
      if body.hasKey("description"): entry.description = body["description"].getStr()
      if body.hasKey("totalAmount"): entry.total_amount = body["totalAmount"].getFloat()
      if body.hasKey("documentDate"):
        entry.document_date = parse(body["documentDate"].getStr(), "yyyy-MM-dd")
      if body.hasKey("counterpartId"):
        if body["counterpartId"].kind == JNull:
          entry.counterpart_id = none(int64)
        else:
          entry.counterpart_id = some(body["counterpartId"].getBiggestInt())
      entry.updated_at = now()
      db.update(entry)
      resp Http200, jsonCors, $toJson(entry)
    except:
      resp Http400, jsonCors, $(%*{"error": getCurrentExceptionMsg()})
    finally:
      releaseDbConn(db)

  delete "/api/journal-entries/@id":
    let entryId = parseInt(@"id")
    let db = getDbConn()
    try:
      var entry = newJournalEntry()
      db.select(entry, "id = $1", entryId)

      if entry.is_posted:
        resp Http400, jsonCors, $(%*{"error": "Не може да изтриете осчетоводен запис"})

      # Delete entry lines first
      db.exec(sql"""DELETE FROM "EntryLine" WHERE journal_entry_id = $1""", entryId)
      db.delete(entry)
      resp Http200, jsonCors, $(%*{"success": true})
    except:
      resp Http400, jsonCors, $(%*{"error": getCurrentExceptionMsg()})
    finally:
      releaseDbConn(db)

  post "/api/journal-entries/@id/post":
    let entryId = parseInt(@"id")
    let db = getDbConn()
    try:
      var entry = newJournalEntry()
      db.select(entry, "id = $1", entryId)

      if entry.is_posted:
        resp Http400, jsonCors, $(%*{"error": "Записът вече е осчетоводен"})

      # Validate debit = credit
      let rows = db.getAllRows(sql"""
        SELECT COALESCE(SUM(debit_amount), 0), COALESCE(SUM(credit_amount), 0)
        FROM "EntryLine" WHERE journal_entry_id = $1
      """, entryId)
      if rows.len > 0:
        let debitSum = parseFloat($rows[0][0])
        let creditSum = parseFloat($rows[0][1])
        if abs(debitSum - creditSum) > 0.001:
          resp Http400, jsonCors, $(%*{
            "error": "Дебит и кредит не са равни",
            "debit": debitSum,
            "credit": creditSum
          })

      entry.is_posted = true
      entry.posted_at = some(now())
      entry.updated_at = now()
      db.update(entry)
      resp Http200, jsonCors, $toJson(entry)
    except:
      resp Http400, jsonCors, $(%*{"error": getCurrentExceptionMsg()})
    finally:
      releaseDbConn(db)

  post "/api/journal-entries/@id/unpost":
    let entryId = parseInt(@"id")
    let db = getDbConn()
    try:
      var entry = newJournalEntry()
      db.select(entry, "id = $1", entryId)

      if not entry.is_posted:
        resp Http400, jsonCors, $(%*{"error": "Записът не е осчетоводен"})

      entry.is_posted = false
      entry.posted_at = none(DateTime)
      entry.updated_at = now()
      db.update(entry)
      resp Http200, jsonCors, $toJson(entry)
    except:
      resp Http400, jsonCors, $(%*{"error": getCurrentExceptionMsg()})
    finally:
      releaseDbConn(db)

  # =====================
  # ENTRY LINE ROUTES
  # =====================
  get "/api/entry-lines":
    let journalEntryId = request.params.getOrDefault("journalEntryId", "0")
    let db = getDbConn()
    try:
      var lines = @[newEntryLine()]
      if journalEntryId != "0":
        db.select(lines, "journal_entry_id = $1 ORDER BY line_order", parseInt(journalEntryId))
      else:
        db.selectAll(lines)
      if lines.len == 1 and lines[0].id == 0:
        lines = @[]
      resp Http200, jsonCors, $toJsonArray(lines)
    finally:
      releaseDbConn(db)

  post "/api/entry-lines":
    let body = parseJson(request.body)
    let db = getDbConn()
    try:
      # Check if journal entry is posted
      var entry = newJournalEntry()
      db.select(entry, "id = $1", body["journalEntryId"].getBiggestInt())
      if entry.is_posted:
        resp Http400, jsonCors, $(%*{"error": "Не може да добавяте редове към осчетоводен запис"})

      # Get next line order
      let rows = db.getAllRows(sql"""SELECT COALESCE(MAX(line_order), 0) FROM "EntryLine" WHERE journal_entry_id = $1""", body["journalEntryId"].getBiggestInt())
      var maxOrder = 0
      if rows.len > 0 and ($rows[0][0]).len > 0:
        maxOrder = parseInt($rows[0][0])

      var line = newEntryLine(
        journal_entry_id = body["journalEntryId"].getBiggestInt(),
        account_id = body["accountId"].getBiggestInt(),
        debit_amount = body.getOrDefault("debitAmount").getFloat(0.0),
        credit_amount = body.getOrDefault("creditAmount").getFloat(0.0),
        description = body.getOrDefault("description").getStr(""),
        line_order = maxOrder + 1
      )
      if body.hasKey("counterpartId") and body["counterpartId"].kind != JNull:
        line.counterpart_id = some(body["counterpartId"].getBiggestInt())
      if body.hasKey("currencyCode"):
        line.currency_code = body["currencyCode"].getStr()
      if body.hasKey("currencyAmount"):
        line.currency_amount = body["currencyAmount"].getFloat()
      if body.hasKey("exchangeRate"):
        line.exchange_rate = body["exchangeRate"].getFloat()

      db.insert(line)
      resp Http201, jsonCors, $toJson(line)
    except:
      resp Http400, jsonCors, $(%*{"error": getCurrentExceptionMsg()})
    finally:
      releaseDbConn(db)

  delete "/api/entry-lines/@id":
    let lineId = parseInt(@"id")
    let db = getDbConn()
    try:
      var line = newEntryLine()
      db.select(line, "id = $1", lineId)

      # Check if journal entry is posted
      var entry = newJournalEntry()
      db.select(entry, "id = $1", line.journal_entry_id)
      if entry.is_posted:
        resp Http400, jsonCors, $(%*{"error": "Не може да изтривате редове от осчетоводен запис"})

      db.delete(line)
      resp Http200, jsonCors, $(%*{"success": true})
    except:
      resp Http400, jsonCors, $(%*{"error": getCurrentExceptionMsg()})
    finally:
      releaseDbConn(db)

  # =====================
  # REPORTS ROUTES
  # =====================
  get "/api/reports/turnover-sheet":
    let companyId = request.params.getOrDefault("companyId", "0")
    let fromDate = request.params.getOrDefault("fromDate", "")
    let toDate = request.params.getOrDefault("toDate", "")

    if companyId == "0":
      resp Http400, jsonCors, $(%*{"error": "companyId е задължителен"})

    let db = getDbConn()
    try:
      # Query for turnover sheet (Оборотна ведомост)
      let query = sql"""
        SELECT
          a.code,
          a.name,
          COALESCE(SUM(CASE WHEN je.document_date < $1::timestamp THEN el.debit_amount ELSE 0 END), 0) as opening_debit,
          COALESCE(SUM(CASE WHEN je.document_date < $1::timestamp THEN el.credit_amount ELSE 0 END), 0) as opening_credit,
          COALESCE(SUM(CASE WHEN je.document_date >= $1::timestamp AND je.document_date <= $2::timestamp THEN el.debit_amount ELSE 0 END), 0) as period_debit,
          COALESCE(SUM(CASE WHEN je.document_date >= $1::timestamp AND je.document_date <= $2::timestamp THEN el.credit_amount ELSE 0 END), 0) as period_credit
        FROM "Account" a
        LEFT JOIN "EntryLine" el ON el.account_id = a.id
        LEFT JOIN "JournalEntry" je ON je.id = el.journal_entry_id AND je.is_posted = true
        WHERE a.company_id = $3
        GROUP BY a.id, a.code, a.name
        ORDER BY a.code
      """
      let rows = db.getAllRows(query, fromDate, toDate, parseInt(companyId))

      var accounts = newJArray()
      for row in rows:
        let openingDebit = parseFloat($row[2])
        let openingCredit = parseFloat($row[3])
        let periodDebit = parseFloat($row[4])
        let periodCredit = parseFloat($row[5])
        let closingDebit = openingDebit + periodDebit
        let closingCredit = openingCredit + periodCredit

        accounts.add(%*{
          "code": $row[0],
          "name": $row[1],
          "openingDebit": openingDebit,
          "openingCredit": openingCredit,
          "periodDebit": periodDebit,
          "periodCredit": periodCredit,
          "closingDebit": closingDebit,
          "closingCredit": closingCredit
        })

      resp Http200, jsonCors, $(%*{
        "companyId": parseInt(companyId),
        "fromDate": fromDate,
        "toDate": toDate,
        "accounts": accounts
      })
    finally:
      releaseDbConn(db)

  get "/api/reports/general-ledger":
    let companyId = request.params.getOrDefault("companyId", "0")
    let accountId = request.params.getOrDefault("accountId", "0")
    let fromDate = request.params.getOrDefault("fromDate", "")
    let toDate = request.params.getOrDefault("toDate", "")

    if companyId == "0" or accountId == "0":
      resp Http400, jsonCors, $(%*{"error": "companyId и accountId са задължителни"})

    let db = getDbConn()
    try:
      # Get account info
      var account = newAccount()
      db.select(account, "id = $1", parseInt(accountId))

      # Get opening balance
      let openingRows = db.getAllRows(sql"""
        SELECT
          COALESCE(SUM(el.debit_amount), 0),
          COALESCE(SUM(el.credit_amount), 0)
        FROM "EntryLine" el
        JOIN "JournalEntry" je ON je.id = el.journal_entry_id
        WHERE el.account_id = $1 AND je.is_posted = true AND je.document_date < $2::timestamp
      """, parseInt(accountId), fromDate)

      var openingDebit = 0.0
      var openingCredit = 0.0
      if openingRows.len > 0:
        openingDebit = parseFloat($openingRows[0][0])
        openingCredit = parseFloat($openingRows[0][1])

      # Get transactions
      let transRows = db.getAllRows(sql"""
        SELECT
          je.document_date,
          je.entry_number,
          je.document_number,
          je.description,
          el.debit_amount,
          el.credit_amount,
          el.description as line_description
        FROM "EntryLine" el
        JOIN "JournalEntry" je ON je.id = el.journal_entry_id
        WHERE el.account_id = $1 AND je.is_posted = true
          AND je.document_date >= $2::timestamp AND je.document_date <= $3::timestamp
        ORDER BY je.document_date, je.entry_number
      """, parseInt(accountId), fromDate, toDate)

      var transactions = newJArray()
      var runningDebit = openingDebit
      var runningCredit = openingCredit

      for row in transRows:
        let debit = parseFloat($row[4])
        let credit = parseFloat($row[5])
        runningDebit += debit
        runningCredit += credit
        let lineDesc = $row[6]
        let entryDesc = $row[3]

        transactions.add(%*{
          "date": $row[0],
          "entryNumber": $row[1],
          "documentNumber": $row[2],
          "description": if lineDesc.len > 0: lineDesc else: entryDesc,
          "debit": debit,
          "credit": credit,
          "balance": runningDebit - runningCredit
        })

      resp Http200, jsonCors, $(%*{
        "account": {
          "id": account.id,
          "code": account.code,
          "name": account.name
        },
        "fromDate": fromDate,
        "toDate": toDate,
        "openingDebit": openingDebit,
        "openingCredit": openingCredit,
        "openingBalance": openingDebit - openingCredit,
        "transactions": transactions,
        "closingDebit": runningDebit,
        "closingCredit": runningCredit,
        "closingBalance": runningDebit - runningCredit
      })
    except:
      resp Http400, jsonCors, $(%*{"error": getCurrentExceptionMsg()})
    finally:
      releaseDbConn(db)

  # =====================
  # BANK PROFILE ROUTES
  # =====================
  get "/api/banks":
    let companyId = request.params.getOrDefault("companyId", "0").parseInt
    let db = getDbConn()
    try:
      var banks = @[newBankProfile()]
      if companyId > 0:
        db.select(banks, "company_id = $1", companyId)
      else:
        db.selectAll(banks)
      if banks.len == 1 and banks[0].id == 0:
        banks = @[]
      resp Http200, jsonCors, $toJsonArray(banks)
    finally:
      releaseDbConn(db)

  get "/api/banks/@id":
    let id = @"id".parseInt
    let db = getDbConn()
    try:
      var bank = newBankProfile()
      db.select(bank, "id = $1", id)
      if bank.id == 0:
        resp Http404, jsonCors, """{"error": "Bank profile not found"}"""
      else:
        resp Http200, jsonCors, $toJson(bank)
    finally:
      releaseDbConn(db)

  post "/api/banks":
    let body = parseJson(request.body)
    let db = getDbConn()
    try:
      var bank = newBankProfile(
        name = body["name"].getStr,
        iban = body.getOrDefault("iban").getStr(""),
        account_id = body["accountId"].getInt.int64,
        buffer_account_id = body["bufferAccountId"].getInt.int64,
        company_id = body["companyId"].getInt.int64,
        currency_code = body.getOrDefault("currencyCode").getStr("BGN"),
        connection_type = body.getOrDefault("connectionType").getStr("MANUAL"),
        import_format = body.getOrDefault("importFormat").getStr("MT940"),
        saltedge_provider_code = body.getOrDefault("saltEdgeProviderCode").getStr(""),
        saltedge_provider_name = body.getOrDefault("saltEdgeProviderName").getStr(""),
        is_active = body.getOrDefault("isActive").getBool(true)
      )
      db.insert(bank)
      resp Http201, jsonCors, $toJson(bank)
    except CatchableError as e:
      resp Http400, jsonCors, $(%*{"error": e.msg})
    finally:
      releaseDbConn(db)

  put "/api/banks/@id":
    let id = @"id".parseInt
    let body = parseJson(request.body)
    let db = getDbConn()
    try:
      var bank = newBankProfile()
      db.select(bank, "id = $1", id)
      if bank.id == 0:
        resp Http404, jsonCors, """{"error": "Bank profile not found"}"""
      else:
        if body.hasKey("name"):
          bank.name = body["name"].getStr
        if body.hasKey("iban"):
          bank.iban = body["iban"].getStr
        if body.hasKey("accountId"):
          bank.account_id = body["accountId"].getInt.int64
        if body.hasKey("bufferAccountId"):
          bank.buffer_account_id = body["bufferAccountId"].getInt.int64
        if body.hasKey("currencyCode"):
          bank.currency_code = body["currencyCode"].getStr
        if body.hasKey("connectionType"):
          bank.connection_type = body["connectionType"].getStr
        if body.hasKey("importFormat"):
          bank.import_format = body["importFormat"].getStr
        if body.hasKey("isActive"):
          bank.is_active = body["isActive"].getBool
        bank.updated_at = now()
        db.update(bank)
        resp Http200, jsonCors, $toJson(bank)
    finally:
      releaseDbConn(db)

  delete "/api/banks/@id":
    let id = @"id".parseInt
    let db = getDbConn()
    try:
      var bank = newBankProfile()
      db.select(bank, "id = $1", id)
      if bank.id == 0:
        resp Http404, jsonCors, """{"error": "Bank profile not found"}"""
      else:
        db.delete(bank)
        resp Http200, jsonCors, """{"success": true}"""
    finally:
      releaseDbConn(db)

  # =====================
  # FIXED ASSET ROUTES
  # =====================
  get "/api/fixed-assets":
    let companyId = request.params.getOrDefault("companyId", "0").parseInt
    let status = request.params.getOrDefault("status", "")
    let db = getDbConn()
    try:
      var assets = @[newFixedAsset()]
      if companyId > 0:
        if status != "":
          db.select(assets, "company_id = $1 AND status = $2", companyId, status)
        else:
          db.select(assets, "company_id = $1", companyId)
      else:
        db.selectAll(assets)
      if assets.len == 1 and assets[0].id == 0:
        assets = @[]
      resp Http200, jsonCors, $toJsonArray(assets)
    finally:
      releaseDbConn(db)

  get "/api/fixed-assets/@id":
    let id = @"id".parseInt
    let db = getDbConn()
    try:
      var asset = newFixedAsset()
      db.select(asset, "id = $1", id)
      if asset.id == 0:
        resp Http404, jsonCors, """{"error": "Fixed asset not found"}"""
      else:
        resp Http200, jsonCors, $toJson(asset)
    finally:
      releaseDbConn(db)

  post "/api/fixed-assets":
    let body = parseJson(request.body)
    let db = getDbConn()
    try:
      var category = newFixedAssetCategory()
      let categoryId = body["categoryId"].getInt
      db.select(category, "id = $1", categoryId)

      let acquisitionCost = body["acquisitionCost"].getFloat

      var asset = newFixedAsset(
        name = body["name"].getStr,
        inventory_number = body["inventoryNumber"].getStr,
        description = body.getOrDefault("description").getStr(""),
        category_id = categoryId.int64,
        company_id = body["companyId"].getInt.int64,
        acquisition_date = parse(body["acquisitionDate"].getStr, "yyyy-MM-dd"),
        acquisition_cost = acquisitionCost,
        residual_value = body.getOrDefault("residualValue").getFloat(0.0),
        document_number = body.getOrDefault("documentNumber").getStr(""),
        status = "ACTIVE",
        depreciation_method = body.getOrDefault("depreciationMethod").getStr("LINEAR"),
        accounting_depreciation_rate = if category.id > 0: category.max_depreciation_rate else: 15.0,
        tax_depreciation_rate = if category.id > 0: category.max_depreciation_rate else: 15.0
      )

      if body.hasKey("documentDate") and body["documentDate"].getStr != "":
        asset.document_date = some(parse(body["documentDate"].getStr, "yyyy-MM-dd"))
      if body.hasKey("putIntoServiceDate") and body["putIntoServiceDate"].getStr != "":
        asset.put_into_service_date = some(parse(body["putIntoServiceDate"].getStr, "yyyy-MM-dd"))

      asset.accounting_book_value = acquisitionCost
      asset.tax_book_value = acquisitionCost

      db.insert(asset)
      resp Http201, jsonCors, $toJson(asset)
    except CatchableError as e:
      resp Http400, jsonCors, $(%*{"error": e.msg})
    finally:
      releaseDbConn(db)

  put "/api/fixed-assets/@id":
    let id = @"id".parseInt
    let body = parseJson(request.body)
    let db = getDbConn()
    try:
      var asset = newFixedAsset()
      db.select(asset, "id = $1", id)
      if asset.id == 0:
        resp Http404, jsonCors, """{"error": "Fixed asset not found"}"""
      else:
        if body.hasKey("name"):
          asset.name = body["name"].getStr
        if body.hasKey("description"):
          asset.description = body["description"].getStr
        if body.hasKey("status"):
          asset.status = body["status"].getStr
        if body.hasKey("accountingDepreciationRate"):
          asset.accounting_depreciation_rate = body["accountingDepreciationRate"].getFloat
        if body.hasKey("taxDepreciationRate"):
          asset.tax_depreciation_rate = body["taxDepreciationRate"].getFloat

        asset.updated_at = now()
        db.update(asset)
        resp Http200, jsonCors, $toJson(asset)
    finally:
      releaseDbConn(db)

  delete "/api/fixed-assets/@id":
    let id = @"id".parseInt
    let db = getDbConn()
    try:
      var asset = newFixedAsset()
      db.select(asset, "id = $1", id)
      if asset.id == 0:
        resp Http404, jsonCors, """{"error": "Fixed asset not found"}"""
      else:
        db.delete(asset)
        resp Http200, jsonCors, """{"success": true}"""
    finally:
      releaseDbConn(db)

  post "/api/fixed-assets/calculate-depreciation":
    let body = parseJson(request.body)
    let companyId = body["companyId"].getInt
    let year = body["year"].getInt
    let month = body["month"].getInt
    let db = getDbConn()
    try:
      var assets = @[newFixedAsset()]
      db.select(assets, "company_id = $1 AND status = $2", companyId, "ACTIVE")
      if assets.len == 1 and assets[0].id == 0:
        assets = @[]

      var calculated: seq[JsonNode] = @[]
      var totalAccountingAmount = 0.0
      var totalTaxAmount = 0.0
      var errors: seq[JsonNode] = @[]

      for asset in assets:
        var existing = @[newDepreciationJournal()]
        db.select(existing, "fixed_asset_id = $1 AND period_year = $2 AND period_month = $3",
                  asset.id, year, month)
        if existing.len > 0 and existing[0].id > 0:
          continue

        let monthlyAccountingRate = asset.accounting_depreciation_rate / 12.0 / 100.0
        let monthlyTaxRate = asset.tax_depreciation_rate / 12.0 / 100.0

        let accountingDepreciation = min(
          asset.accounting_book_value * monthlyAccountingRate,
          asset.accounting_book_value - asset.residual_value
        )
        let taxDepreciation = min(
          asset.tax_book_value * monthlyTaxRate,
          asset.tax_book_value
        )

        if accountingDepreciation <= 0 and taxDepreciation <= 0:
          continue

        var journal = newDepreciationJournal(
          fixed_asset_id = asset.id,
          company_id = companyId.int64,
          period_year = year,
          period_month = month,
          accounting_depreciation_amount = accountingDepreciation,
          accounting_book_value_before = asset.accounting_book_value,
          accounting_book_value_after = asset.accounting_book_value - accountingDepreciation,
          tax_depreciation_amount = taxDepreciation,
          tax_book_value_before = asset.tax_book_value,
          tax_book_value_after = asset.tax_book_value - taxDepreciation
        )
        db.insert(journal)

        var assetToUpdate = asset
        assetToUpdate.accounting_accumulated_depreciation += accountingDepreciation
        assetToUpdate.accounting_book_value -= accountingDepreciation
        assetToUpdate.tax_accumulated_depreciation += taxDepreciation
        assetToUpdate.tax_book_value -= taxDepreciation
        assetToUpdate.last_depreciation_date = some(now())
        assetToUpdate.updated_at = now()

        if assetToUpdate.accounting_book_value <= assetToUpdate.residual_value:
          assetToUpdate.status = "DEPRECIATED"

        db.update(assetToUpdate)

        totalAccountingAmount += accountingDepreciation
        totalTaxAmount += taxDepreciation

        calculated.add(%*{
          "fixedAssetId": asset.id,
          "fixedAssetName": asset.name,
          "accountingDepreciationAmount": accountingDepreciation,
          "taxDepreciationAmount": taxDepreciation
        })

      resp Http200, jsonCors, $(%*{
        "calculated": calculated,
        "errors": errors,
        "totalAccountingAmount": totalAccountingAmount,
        "totalTaxAmount": totalTaxAmount
      })
    except CatchableError as e:
      resp Http400, jsonCors, $(%*{"error": e.msg})
    finally:
      releaseDbConn(db)

  post "/api/fixed-assets/post-depreciation":
    let body = parseJson(request.body)
    let companyId = body["companyId"].getInt
    let year = body["year"].getInt
    let month = body["month"].getInt
    let db = getDbConn()
    try:
      var entries = @[newDepreciationJournal()]
      db.select(entries, "company_id = $1 AND period_year = $2 AND period_month = $3 AND is_posted = $4",
                companyId, year, month, false)
      if entries.len == 1 and entries[0].id == 0:
        entries = @[]

      if entries.len == 0:
        resp Http400, jsonCors, """{"error": "No unposted depreciation entries found"}"""

      var totalAmount = 0.0
      for entry in entries:
        totalAmount += entry.accounting_depreciation_amount

      var journalEntry = newJournalEntry(
        company_id = companyId.int64,
        description = "Месечна амортизация " & $month & "/" & $year,
        document_number = "АМОР-" & $year & "-" & $month,
        total_amount = totalAmount
      )
      db.insert(journalEntry)

      for entry in entries:
        var e = entry
        e.is_posted = true
        e.journal_entry_id = some(journalEntry.id)
        e.posted_at = some(now())
        e.updated_at = now()
        db.update(e)

      resp Http200, jsonCors, $(%*{
        "journalEntryId": journalEntry.id,
        "totalAmount": totalAmount,
        "assetsCount": entries.len
      })
    except CatchableError as e:
      resp Http400, jsonCors, $(%*{"error": e.msg})
    finally:
      releaseDbConn(db)

  get "/api/depreciation-journal":
    let companyId = request.params.getOrDefault("companyId", "0").parseInt
    let year = request.params.getOrDefault("year", "0").parseInt
    let month = request.params.getOrDefault("month", "")
    let db = getDbConn()
    try:
      var entries = @[newDepreciationJournal()]
      if month != "":
        db.select(entries, "company_id = $1 AND period_year = $2 AND period_month = $3",
                  companyId, year, month.parseInt)
      else:
        db.select(entries, "company_id = $1 AND period_year = $2", companyId, year)
      if entries.len == 1 and entries[0].id == 0:
        entries = @[]

      var journalResult: seq[JsonNode] = @[]
      for entry in entries:
        var asset = newFixedAsset()
        db.select(asset, "id = $1", entry.fixed_asset_id)
        var entryJson = %*{
          "id": entry.id,
          "fixedAssetId": entry.fixed_asset_id,
          "fixedAssetName": asset.name,
          "fixedAssetInventoryNumber": asset.inventory_number,
          "period": $entry.period_year & "-" & (if entry.period_month < 10: "0" else: "") & $entry.period_month & "-01",
          "accountingDepreciationAmount": entry.accounting_depreciation_amount,
          "accountingBookValueBefore": entry.accounting_book_value_before,
          "accountingBookValueAfter": entry.accounting_book_value_after,
          "taxDepreciationAmount": entry.tax_depreciation_amount,
          "taxBookValueBefore": entry.tax_book_value_before,
          "taxBookValueAfter": entry.tax_book_value_after,
          "isPosted": entry.is_posted
        }
        if entry.journal_entry_id.isSome:
          entryJson["journalEntryId"] = %entry.journal_entry_id.get
        else:
          entryJson["journalEntryId"] = newJNull()
        if entry.posted_at.isSome:
          entryJson["postedAt"] = %entry.posted_at.get.format("yyyy-MM-dd'T'HH:mm:ss")
        else:
          entryJson["postedAt"] = newJNull()
        journalResult.add(entryJson)

      resp Http200, jsonCors, $(%journalResult)
    finally:
      releaseDbConn(db)

  get "/api/calculated-periods":
    let companyId = request.params.getOrDefault("companyId", "0").parseInt
    let db = getDbConn()
    try:
      let rows = db.getAllRows(sql"""
        SELECT period_year, period_month,
               bool_and(is_posted) as all_posted,
               SUM(accounting_depreciation_amount) as total_accounting,
               SUM(tax_depreciation_amount) as total_tax,
               COUNT(*) as assets_count
        FROM "DepreciationJournal"
        WHERE company_id = $1
        GROUP BY period_year, period_month
        ORDER BY period_year DESC, period_month DESC
      """, companyId)

      var periodsResult: seq[JsonNode] = @[]
      for row in rows:
        let year = parseInt($row[0])
        let month = parseInt($row[1])
        let monthNames = ["Януари", "Февруари", "Март", "Април", "Май", "Юни",
                         "Юли", "Август", "Септември", "Октомври", "Ноември", "Декември"]
        periodsResult.add(%*{
          "year": year,
          "month": month,
          "periodDisplay": monthNames[month - 1] & " " & $year,
          "isPosted": $row[2] == "t",
          "totalAccountingAmount": parseFloat($row[3]),
          "totalTaxAmount": parseFloat($row[4]),
          "assetsCount": parseInt($row[5])
        })

      resp Http200, jsonCors, $(%periodsResult)
    except CatchableError:
      resp Http200, jsonCors, "[]"
    finally:
      releaseDbConn(db)

  # =====================
  # GRAPHQL ENDPOINT
  # =====================
  post "/graphql":
    let ctx = getGraphqlCtx()
    if ctx.isNil:
      resp Http500, jsonCors, $(%*{"error": "GraphQL not initialized"})

    let body = parseJson(request.body)
    let query = body.getOrDefault("query").getStr("")
    let variables = body.getOrDefault("variables")
    let operationName = body.getOrDefault("operationName").getStr("")

    if query.len == 0:
      resp Http400, jsonCors, $(%*{"error": "Query is required"})

    # Clear previous query state
    ctx.purgeQueries(includeVariables = true, includeStored = false)

    # Parse variables
    if not variables.isNil and variables.kind == JObject:
      let varsRes = ctx.parseVars($variables)
      if varsRes.isErr:
        var errMsgs: seq[string]
        for e in varsRes.error:
          errMsgs.add($e)
        resp Http400, jsonCors, $(%*{"errors": errMsgs})

    # Parse and validate query
    let queryRes = ctx.parseQuery(query)
    if queryRes.isErr:
      var errMsgs: seq[string]
      for e in queryRes.error:
        errMsgs.add($e)
      resp Http400, jsonCors, $(%*{"errors": errMsgs})

    # Execute
    let jsonResp = JsonRespStream.new()
    let execRes = ctx.executeRequest(respStream(jsonResp), operationName)
    if execRes.isErr:
      var errMsgs: seq[string]
      for e in execRes.error:
        errMsgs.add($e)
      resp Http400, jsonCors, $(%*{"errors": errMsgs})

    let response = jsonResp.getString()
    resp Http200, jsonCors, response

  get "/graphql":
    # GraphiQL interface
    const graphiqlHtml = """
<!DOCTYPE html>
<html>
<head>
  <title>Baraba GraphQL</title>
  <link href="https://unpkg.com/graphiql/graphiql.min.css" rel="stylesheet" />
</head>
<body style="margin: 0;">
  <div id="graphiql" style="height: 100vh;"></div>
  <script crossorigin src="https://unpkg.com/react/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom/umd/react-dom.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/graphiql/graphiql.min.js"></script>
  <script>
    const fetcher = GraphiQL.createFetcher({ url: '/graphql' });
    ReactDOM.render(
      React.createElement(GraphiQL, { fetcher: fetcher }),
      document.getElementById('graphiql'),
    );
  </script>
</body>
</html>
"""
    resp Http200, {"Content-Type": "text/html"}, graphiqlHtml

proc main() =
  # Get port from environment variable or default to 5000
  let portStr = getEnv("PORT", "5000")
  let port = try: parseInt(portStr) except: 5000

  echo "Starting Baraba API server..."
  initDbPool()
  defer: closeDbPool()

  # Initialize GraphQL
  echo "Initializing GraphQL..."
  graphqlCtx = setupGraphQL()
  if graphqlCtx.isNil:
    echo "Warning: GraphQL initialization failed"
  else:
    echo "GraphQL ready at /graphql"

  echo "http://localhost:", port
  # Use httpbeast with 1 thread - for multi-core scaling, run multiple instances
  # behind Caddy/nginx load balancer
  let settings = newSettings(port = Port(port), numThreads = 1)
  var jester = initJester(mainRouter, settings = settings)
  jester.serve()

when isMainModule:
  main()
