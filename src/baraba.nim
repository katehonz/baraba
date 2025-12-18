## Baraba - Счетоводна програма
## REST API built with Jester + Nim

import std/[json, strutils, options, times, math, xmlparser, xmltree, httpclient, os, uri, tables, base64]
import jester
import asynchttpserver
import orm/orm

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

import models/[user, company, account, counterpart, journal, currency, exchangerate, vatrate, fixed_asset_category, fixed_asset, depreciation_journal, bank_profile, audit_log, scanned_invoice, system_settings, vat_return, bank_transaction, accounting_period]
import services/auth
import db/config
import utils/json_utils
import graphql/resolvers
import "vendor/nim-graphql/graphql"

# Import route handlers
import routes/company_routes
import routes/currency_routes
import routes/account_routes
import routes/counterpart_routes
import routes/audit_log_routes
import routes/exchange_rate_routes
import routes/vat_rate_routes
import routes/user_routes
import routes/user_group_routes
import routes/fixed_asset_category_routes
import routes/vies_routes
import controllers/vat_controller

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

router mainRouter:
  # Handle CORS preflight requests
  options "/**":
    resp Http200, corsHeaders, ""

  # =====================
  # Health check
  # =====================
  get "/":
    resp Http200, corsHeaders, $(%*{
      "name": "Baraba API",
      "version": "0.1.0",
      "description": "Счетоводна програма REST API"
    })

  get "/health":
    resp Http200, corsHeaders, $(%*{"status": "ok"})

  # =====================
  # VAT ROUTES
  # =====================
  post "/api/vat/generate/@period":
    withDb:
      let period = @"period"
      let body = parseJson(request.body)
      let companyId = body["companyId"].getInt()

      let companyOpt = find(Company, companyId, db)
      if companyOpt.isNone:
        resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Фирмата не е намерена"})
        return
      let company = companyOpt.get()

      let (purchase, sales, deklar) = generateVatFiles(company, period)

      let response = %*{
        "POKUPKI.TXT": encode(purchase),
        "PRODAGBI.TXT": encode(sales),
        "DEKLAR.TXT": encode(deklar)
      }
      resp Http200, {"Content-Type": "application/json"}, $response

  # =====================
  # SYSTEM SETTINGS
  # =====================
  get "/api/system-settings":
    resp Http200, {"Content-Type": "application/json"}, $(%*{
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
    resp Http200, {"Content-Type": "application/json"}, $(%*{"success": true})

  post "/api/system-settings/smtp/test":
    let body = parseJson(request.body)
    let testEmail = body["testEmail"].getStr()
    # TODO: Implement sending of test email
    echo "Sending test email to " & testEmail
    resp Http200, {"Content-Type": "application/json"}, $(%*{"success": true})

  put "/api/companies/@id/salt-edge":
    let companyId = parseInt(@"id")
    let body = parseJson(request.body)
    # TODO: Implement saving of SaltEdge settings
    resp Http200, {"Content-Type": "application/json"}, $(%*{"success": true})

  # =====================
  # AUTH ROUTES
  # =====================
  post "/api/auth/login":
    withDb:
      let body = parseJson(request.body)
      let username = body["username"].getStr()
      let password = body["password"].getStr()

      let userOpt = authenticateUser(db, username, password)

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
    withDb:
      let body = parseJson(request.body)
      let username = body["username"].getStr()
      let email = body["email"].getStr()
      let password = body["password"].getStr()
      let groupId = body.getOrDefault("groupId").getBiggestInt(2)

      try:
        let user = createUser(db, username, email, password, groupId)
        let token = generateToken(user.id, user.username)
        resp Http201, {"Content-Type": "application/json"}, $(%*{
          "token": token,
          "user": {"id": user.id, "username": user.username, "email": user.email}
        })
      except:
        resp Http400, {"Content-Type": "application/json"}, $(%*{"error": getCurrentExceptionMsg()})

  get "/api/auth/me":
    let authHeader = request.headers.getOrDefault("Authorization")
    if authHeader.len == 0 or not authHeader.startsWith("Bearer "):
      resp Http401, {"Content-Type": "application/json"}, $(%*{"error": "Липсва токен"})

    let token = authHeader[7..^1]
    let (valid, userId, _) = verifyToken(token)
    if not valid:
      resp Http401, {"Content-Type": "application/json"}, $(%*{"error": "Невалиден токен"})

    withDb:
      let userOpt = getUserById(db, userId)
      if userOpt.isSome:
        let user = userOpt.get
        resp Http200, {"Content-Type": "application/json"}, $(%*{
          "id": user.id, "username": user.username, "email": user.email
        })
      else:
        resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Потребителят не е намерен"})

  post "/api/auth/recover-password":
    withDb:
      let body = parseJson(request.body)
      let email = body["email"].getStr()
      let tokenOpt = recoverPassword(db, email)

      if tokenOpt.isSome:
        resp Http200, {"Content-Type": "application/json"}, $(%*{"message": "Изпратен е линк за възстановяване на паролата на вашия имейл."})
      else:
        resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Потребител с този имейл не е намерен"})

  post "/api/auth/reset-password":
    withDb:
      let body = parseJson(request.body)
      let email = body["email"].getStr()
      let token = body["token"].getStr()
      let newPassword = body["password"].getStr()
      let success = resetPassword(db, email, token, newPassword)

      if success:
        resp Http200, {"Content-Type": "application/json"}, $(%*{"message": "Паролата е променена успешно!"})
      else:
        resp Http400, {"Content-Type": "application/json"}, $(%*{"error": "Невалиден токен или изтекло време за възстановяване"})

  # =====================
  # COMPANY ROUTES
  # =====================
  # extend companyRoutes()
  # Company routes are defined in separate file

  # =====================
  # ACCOUNT ROUTES
  # =====================
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

  # =====================
  # COUNTERPART ROUTES
  # =====================
  # extend counterpartRoutes()
  # Counterpart routes are defined in separate file

  # =====================
  # CURRENCY ROUTES
  # =====================
  # extend currencyRoutes()
  # Currency routes are defined in separate file

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
    resp Http200, {"Content-Type": "application/json"}, logsResult

  get "/api/audit-log-stats":
    let companyId = request.params.getOrDefault("companyId", "0").parseInt
    let days = request.params.getOrDefault("days", "30").parseInt
    let statsResult = getAuditLogStats(companyId, days)
    resp Http200, {"Content-Type": "application/json"}, statsResult

  get "/api/monthly-stats":
    let companyId = request.params.getOrDefault("companyId", "0").parseInt
    let fromYear = request.params.getOrDefault("fromYear", "0").parseInt
    let fromMonth = request.params.getOrDefault("fromMonth", "0").parseInt
    let toYear = request.params.getOrDefault("toYear", "0").parseInt
    let toMonth = request.params.getOrDefault("toMonth", "0").parseInt
    let monthlyResult = getMonthlyTransactionStats(companyId, fromYear, fromMonth, toYear, toMonth)
    resp Http200, {"Content-Type": "application/json"}, monthlyResult

  # =====================
  # EXCHANGE RATE ROUTES
  # =====================
  get "/api/exchange-rates":
    withDb:
      var rates = findAll(ExchangeRate, db)
      resp Http200, {"Content-Type": "application/json"}, $toJsonArray(rates)

  post "/api/exchange-rates/fetch-ecb":
    withDb:
      try:
        # Fetch ECB rates XML
        let client = newHttpClient(timeout = 15000)  # 15 sec timeout
        defer: client.close()
        let ecbUrl = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml"
        let xmlContent = client.getContent(ecbUrl)

        # Parse XML
        let xml = parseXml(xmlContent)

        # Find EUR currency (base)
        var eurCurrency: Currency
        let eurCurrencies = findWhere(Currency, db, "code = $1", "EUR")
        if eurCurrencies.len > 0:
          eurCurrency = eurCurrencies[0]
        else:
          # Create EUR if not exists
          eurCurrency = newCurrency(code = "EUR", name = "Euro", symbol = "€", isBaseCurrency = true, isActive = true)
          save(eurCurrency, db)

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
                      var curr: Currency
                      let currs = findWhere(Currency, db, "code = $1", currCode)
                      if currs.len > 0:
                        curr = currs[0]
                      else:
                        curr = newCurrency(code = currCode, name = currCode, isActive = false)
                        save(curr, db)

                      # Create new rate (allow duplicates, user can manage them)
                      var newRate = newExchangeRate(
                        rate = rate,
                        reverse_rate = 1.0 / rate,
                        valid_date = validDate,
                        rate_source = "ECB",
                        from_currency_id = eurCurrency.id,
                        to_currency_id = curr.id
                      )
                      save(newRate, db)
                      ratesAdded += 1

        resp Http200, {"Content-Type": "application/json"}, $(%*{
          "success": true,
          "message": "ECB курсовете са обновени",
          "ratesAdded": ratesAdded,
          "date": ratesDate
        })
      except CatchableError as e:
        resp Http500, {"Content-Type": "application/json"}, $(%*{
          "error": "Грешка при извличане на курсове от ЕЦБ",
          "details": e.msg
        })

  # =====================
  # VAT RATE ROUTES
  # =====================
  get "/api/vat-rates":
    withDb:
      let companyId = request.params.getOrDefault("companyId", "0").parseInt
      var rates: seq[VatRate]
      if companyId > 0:
        rates = findWhere(VatRate, db, "company_id = $1", $companyId)
      else:
        rates = findAll(VatRate, db)
      resp Http200, {"Content-Type": "application/json"}, $toJsonArray(rates)

  post "/api/vat-rates":
    withDb:
      let body = parseJson(request.body)
      var vatRate = newVatRate(
        company_id = body["companyId"].getInt().int64,
        code = body["code"].getStr(),
        name = body["name"].getStr(),
        rate = body["rate"].getFloat()
      )
      if body.hasKey("effectiveFrom"):
        vatRate.valid_from = some(parse(body["effectiveFrom"].getStr(), "yyyy-MM-dd"))
      save(vatRate, db)
      resp Http201, {"Content-Type": "application/json"}, $toJson(vatRate)

  delete "/api/vat-rates/@id":
    withDb:
      let id = parseInt(@"id")
      let vatRateOpt = find(VatRate, id, db)
      if vatRateOpt.isNone:
        resp Http404, {"Content-Type": "application/json"}, """{"error": "VAT rate not found"}"""
        return
      var vatRate = vatRateOpt.get()
      delete(vatRate, db)
      resp Http200, {"Content-Type": "application/json"}, """{"success": true}"""

  # =====================
  # USER ROUTES
  # =====================
  get "/api/users":
    withDb:
      var users = findAll(User, db)
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
      resp Http200, {"Content-Type": "application/json"}, $usersJson

  post "/api/users":
    withDb:
      let body = parseJson(request.body)
      let user = createUser(db,
        body["username"].getStr(),
        body["email"].getStr(),
        body["password"].getStr(),
        body.getOrDefault("groupId").getInt(0).int64
      )
      resp Http201, {"Content-Type": "application/json"}, $toJson(user)

  put "/api/users/@id":
    withDb:
      let id = parseInt(@"id")
      let body = parseJson(request.body)
      let userOpt = find(User, id, db)
      if userOpt.isNone:
        resp Http404, {"Content-Type": "application/json"}, """{"error": "User not found"}"""
        return
      var user = userOpt.get()
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
      save(user, db)
      resp Http200, {"Content-Type": "application/json"}, $toJson(user)

  delete "/api/users/@id":
    withDb:
      let id = parseInt(@"id")
      let userOpt = find(User, id, db)
      if userOpt.isNone:
        resp Http404, {"Content-Type": "application/json"}, """{"error": "User not found"}"""
        return
      var user = userOpt.get()
      delete(user, db)
      resp Http200, {"Content-Type": "application/json"}, """{"success": true}"""

  post "/api/users/@id/reset-password":
    withDb:
      let id = parseInt(@"id")
      let body = parseJson(request.body)
      let userOpt = find(User, id, db)
      if userOpt.isNone:
        resp Http404, {"Content-Type": "application/json"}, """{"error": "User not found"}"""
        return
      var user = userOpt.get()
      let newSalt = $epochTime()
      user.password = hashPassword(body["newPassword"].getStr(), newSalt)
      user.salt = newSalt
      save(user, db)
      resp Http200, {"Content-Type": "application/json"}, """{"success": true}"""

  # =====================
  # USER GROUP ROUTES
  # =====================
  get "/api/user-groups":
    withDb:
      var groups = findAll(UserGroup, db)
      resp Http200, {"Content-Type": "application/json"}, $toJsonArray(groups)

  # =====================
  # FIXED ASSET CATEGORY ROUTES
  # =====================
  get "/api/fixed-asset-categories":
    withDb:
      let companyId = request.params.getOrDefault("companyId", "0").parseInt
      var categories: seq[FixedAssetCategory]
      if companyId > 0:
        categories = findWhere(FixedAssetCategory, db, "company_id = $1", $companyId)
      else:
        categories = findAll(FixedAssetCategory, db)
      resp Http200, {"Content-Type": "application/json"}, $toJsonArray(categories)

  # =====================
  # VIES ROUTES
  # =====================
  post "/api/validate-vat":
    let body = parseJson(request.body)
    let vatNumber = body["vatNumber"].getStr()
    if vatNumber.len < 3:
      resp Http400, {"Content-Type": "application/json"}, """{"error": "VAT number too short"}"""
    else:
      resp Http200, {"Content-Type": "application/json"}, """{"message": "VIES validation not implemented yet"}"""

  # =====================
  # VAT RETURNS ROUTES
  # =====================
  get "/api/vat-returns":
    withDb:
      let companyId = request.params.getOrDefault("companyId", "0").parseInt
      if companyId == 0:
        resp Http400, {"Content-Type": "application/json"}, $(%*{"error": "Missing companyId"})
      else:
        let returns = findWhere(VatReturn, db, "company_id = $1 ORDER BY period_year DESC, period_month DESC", $companyId)
        resp Http200, {"Content-Type": "application/json"}, $toJsonArray(returns)

  get "/api/vat-returns/@id":
    withDb:
      let id = @"id".parseInt
      let vatReturnOpt = find(VatReturn, id, db)
      if vatReturnOpt.isNone:
        resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "ДДС декларацията не е намерена"})
        return
      resp Http200, {"Content-Type": "application/json"}, $toJson(vatReturnOpt.get())

  post "/api/vat-returns":
    withDb:
      try:
        let body = parseJson(request.body)
        var vatReturn = newVatReturn(
          company_id = body["companyId"].getBiggestInt(),
          period_year = body["periodYear"].getInt(),
          period_month = body["periodMonth"].getInt(),
          status = body.getOrDefault("status").getStr("DRAFT"),
          created_by_id = body.getOrDefault("createdById").getBiggestInt(1)
        )
        save(vatReturn, db)
        resp Http201, {"Content-Type": "application/json"}, $toJson(vatReturn)
      except:
        resp Http400, {"Content-Type": "application/json"}, $(%*{"error": getCurrentExceptionMsg()})

  put "/api/vat-returns/@id":
    withDb:
      try:
        let id = @"id".parseInt
        let body = parseJson(request.body)
        let vatReturnOpt = find(VatReturn, id, db)
        if vatReturnOpt.isNone:
          resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "ДДС декларацията не е намерена"})
          return
        var vatReturn = vatReturnOpt.get()
        if body.hasKey("status"): vatReturn.status = body["status"].getStr()
        if body.hasKey("notes"): vatReturn.notes = body["notes"].getStr()
        if body.hasKey("pokupkiFile"): vatReturn.pokupki_file = body["pokupkiFile"].getStr()
        if body.hasKey("prodajbiFile"): vatReturn.prodajbi_file = body["prodajbiFile"].getStr()
        if body.hasKey("deklarFile"): vatReturn.deklar_file = body["deklarFile"].getStr()
        vatReturn.updated_at = now()
        save(vatReturn, db)
        resp Http200, {"Content-Type": "application/json"}, $toJson(vatReturn)
      except:
        resp Http400, {"Content-Type": "application/json"}, $(%*{"error": getCurrentExceptionMsg()})

  delete "/api/vat-returns/@id":
    withDb:
      let id = @"id".parseInt
      let vatReturnOpt = find(VatReturn, id, db)
      if vatReturnOpt.isNone:
        resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "ДДС декларацията не е намерена"})
        return
      var vatReturn = vatReturnOpt.get()
      if vatReturn.status != "DRAFT":
        resp Http400, {"Content-Type": "application/json"}, $(%*{"error": "Само чернови могат да бъдат изтривани"})
        return
      delete(vatReturn, db)
      resp Http200, {"Content-Type": "application/json"}, $(%*{"success": true})

  # =====================
  # SYSTEM SETTINGS ROUTES
  # =====================
  get "/api/system-settings":
    withDb:
      let category = request.params.getOrDefault("category", "")
      var settings: seq[SystemSettings]
      if category != "":
        settings = findWhere(SystemSettings, db, "category = $1 AND company_id IS NULL", category)
      else:
        settings = findWhere(SystemSettings, db, "company_id IS NULL")

      # Return as key-value object
      var settingsJson = newJObject()
      for s in settings:
        settingsJson[s.setting_key] = %s.setting_value
      resp Http200, {"Content-Type": "application/json"}, $settingsJson

  put "/api/system-settings":
    withDb:
      try:
        let body = parseJson(request.body)
        let category = body.getOrDefault("category").getStr("GENERAL")

        for key, value in body.pairs:
          if key == "category": continue

          let existing = findWhere(SystemSettings, db, "setting_key = $1 AND company_id IS NULL", key)
          if existing.len > 0:
            var setting = existing[0]
            setting.setting_value = value.getStr()
            setting.updated_at = now()
            save(setting, db)
          else:
            var setting = newSystemSettings(
              setting_key = key,
              setting_value = value.getStr(),
              category = category
            )
            save(setting, db)

        resp Http200, {"Content-Type": "application/json"}, $(%*{"success": true})
      except:
        resp Http400, {"Content-Type": "application/json"}, $(%*{"error": getCurrentExceptionMsg()})

  # =====================
  # BANK TRANSACTION ROUTES
  # =====================
  get "/api/bank-transactions":
    withDb:
      let companyId = request.params.getOrDefault("companyId", "0").parseInt
      let bankProfileId = request.params.getOrDefault("bankProfileId", "0").parseInt
      let status = request.params.getOrDefault("status", "")

      var transactions: seq[BankTransaction]
      if bankProfileId > 0:
        if status != "":
          transactions = findWhere(BankTransaction, db, "bank_profile_id = $1 AND status = $2 ORDER BY transaction_date DESC", $bankProfileId, status)
        else:
          transactions = findWhere(BankTransaction, db, "bank_profile_id = $1 ORDER BY transaction_date DESC", $bankProfileId)
      elif companyId > 0:
        if status != "":
          transactions = findWhere(BankTransaction, db, "company_id = $1 AND status = $2 ORDER BY transaction_date DESC", $companyId, status)
        else:
          transactions = findWhere(BankTransaction, db, "company_id = $1 ORDER BY transaction_date DESC", $companyId)
      else:
        resp Http400, {"Content-Type": "application/json"}, $(%*{"error": "companyId или bankProfileId е задължителен"})
        return
      resp Http200, {"Content-Type": "application/json"}, $toJsonArray(transactions)

  get "/api/bank-transactions/@id":
    withDb:
      let id = @"id".parseInt
      let txOpt = find(BankTransaction, id, db)
      if txOpt.isNone:
        resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Транзакцията не е намерена"})
        return
      resp Http200, {"Content-Type": "application/json"}, $toJson(txOpt.get())

  post "/api/bank-transactions":
    withDb:
      try:
        let body = parseJson(request.body)
        var tx = newBankTransaction(
          bank_profile_id = body["bankProfileId"].getBiggestInt(),
          company_id = body["companyId"].getBiggestInt(),
          amount = body["amount"].getFloat(),
          currency_code = body.getOrDefault("currencyCode").getStr("BGN"),
          reference = body.getOrDefault("reference").getStr(""),
          counterparty_name = body.getOrDefault("counterpartyName").getStr(""),
          description = body.getOrDefault("description").getStr(""),
          status = "NEW",
          import_source = body.getOrDefault("importSource").getStr("MANUAL")
        )
        if body.hasKey("transactionDate"):
          tx.transaction_date = parse(body["transactionDate"].getStr().split("T")[0], "yyyy-MM-dd")
        if body.hasKey("valueDate"):
          tx.value_date = parse(body["valueDate"].getStr().split("T")[0], "yyyy-MM-dd")
        save(tx, db)
        resp Http201, {"Content-Type": "application/json"}, $toJson(tx)
      except:
        resp Http400, {"Content-Type": "application/json"}, $(%*{"error": getCurrentExceptionMsg()})

  put "/api/bank-transactions/@id":
    withDb:
      try:
        let id = @"id".parseInt
        let body = parseJson(request.body)
        let txOpt = find(BankTransaction, id, db)
        if txOpt.isNone:
          resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Транзакцията не е намерена"})
          return
        var tx = txOpt.get()
        if body.hasKey("status"): tx.status = body["status"].getStr()
        if body.hasKey("category"): tx.category = body["category"].getStr()
        if body.hasKey("matchedCounterpartId"):
          if body["matchedCounterpartId"].kind == JNull:
            tx.matched_counterpart_id = none(int64)
          else:
            tx.matched_counterpart_id = some(body["matchedCounterpartId"].getBiggestInt())
        if body.hasKey("matchedAccountId"):
          if body["matchedAccountId"].kind == JNull:
            tx.matched_account_id = none(int64)
          else:
            tx.matched_account_id = some(body["matchedAccountId"].getBiggestInt())
        tx.updated_at = now()
        save(tx, db)
        resp Http200, {"Content-Type": "application/json"}, $toJson(tx)
      except:
        resp Http400, {"Content-Type": "application/json"}, $(%*{"error": getCurrentExceptionMsg()})

  delete "/api/bank-transactions/@id":
    withDb:
      let id = @"id".parseInt
      let txOpt = find(BankTransaction, id, db)
      if txOpt.isNone:
        resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Транзакцията не е намерена"})
        return
      var tx = txOpt.get()
      if tx.status == "POSTED":
        resp Http400, {"Content-Type": "application/json"}, $(%*{"error": "Не може да изтриете осчетоводена транзакция"})
        return
      delete(tx, db)
      resp Http200, {"Content-Type": "application/json"}, $(%*{"success": true})

  # =====================
  # ACCOUNTING PERIOD ROUTES
  # =====================
  get "/api/accounting-periods":
    withDb:
      let companyId = request.params.getOrDefault("companyId", "0").parseInt
      let year = request.params.getOrDefault("year", "0").parseInt
      var periods: seq[AccountingPeriod]
      if year > 0:
        periods = findWhere(AccountingPeriod, db, "company_id = $1 AND period_year = $2 ORDER BY period_month", $companyId, $year)
      else:
        periods = findWhere(AccountingPeriod, db, "company_id = $1 ORDER BY period_year DESC, period_month DESC", $companyId)
      resp Http200, {"Content-Type": "application/json"}, $toJsonArray(periods)

  get "/api/accounting-periods/@id":
    withDb:
      let id = @"id".parseInt
      let periodOpt = find(AccountingPeriod, id, db)
      if periodOpt.isNone:
        resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Периодът не е намерен"})
        return
      resp Http200, {"Content-Type": "application/json"}, $toJson(periodOpt.get())

  post "/api/accounting-periods":
    withDb:
      try:
        let body = parseJson(request.body)
        let year = body["periodYear"].getInt()
        let month = body["periodMonth"].getInt()

        # Calculate start and end dates
        let startDate = parse($year & "-" & (if month < 10: "0" else: "") & $month & "-01", "yyyy-MM-dd")
        var endDate: DateTime
        if month == 12:
          endDate = parse($year & "-12-31", "yyyy-MM-dd")
        else:
          endDate = parse($year & "-" & (if month + 1 < 10: "0" else: "") & $(month + 1) & "-01", "yyyy-MM-dd") - initDuration(days = 1)

        var period = newAccountingPeriod(
          company_id = body["companyId"].getBiggestInt(),
          period_year = year,
          period_month = month,
          period_type = body.getOrDefault("periodType").getStr("MONTHLY"),
          start_date = startDate,
          end_date = endDate,
          status = "OPEN"
        )
        save(period, db)
        resp Http201, {"Content-Type": "application/json"}, $toJson(period)
      except:
        resp Http400, {"Content-Type": "application/json"}, $(%*{"error": getCurrentExceptionMsg()})

  post "/api/accounting-periods/@id/close":
    withDb:
      try:
        let id = @"id".parseInt
        let body = parseJson(request.body)
        let periodOpt = find(AccountingPeriod, id, db)
        if periodOpt.isNone:
          resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Периодът не е намерен"})
          return
        var period = periodOpt.get()
        if period.status != "OPEN":
          resp Http400, {"Content-Type": "application/json"}, $(%*{"error": "Периодът вече е затворен"})
          return

        # Check balance
        let balanceRows = db.getAllRows(sql"""
          SELECT COALESCE(SUM(el.debit_amount), 0), COALESCE(SUM(el.credit_amount), 0)
          FROM "EntryLine" el
          JOIN "JournalEntry" je ON je.id = el.journal_entry_id
          WHERE je.company_id = $1 AND je.is_posted = true
            AND je.document_date >= $2::timestamp AND je.document_date <= $3::timestamp
        """, period.company_id, period.start_date.format("yyyy-MM-dd"), period.end_date.format("yyyy-MM-dd"))

        var totalDebit = 0.0
        var totalCredit = 0.0
        if balanceRows.len > 0:
          totalDebit = parseFloat($balanceRows[0][0])
          totalCredit = parseFloat($balanceRows[0][1])

        period.total_debit = totalDebit
        period.total_credit = totalCredit
        period.is_balanced = abs(totalDebit - totalCredit) < 0.01
        period.status = "CLOSED"
        period.closed_at = some(now())
        if body.hasKey("closedById"):
          period.closed_by_id = some(body["closedById"].getBiggestInt())
        period.updated_at = now()
        save(period, db)

        resp Http200, {"Content-Type": "application/json"}, $toJson(period)
      except:
        resp Http400, {"Content-Type": "application/json"}, $(%*{"error": getCurrentExceptionMsg()})

  post "/api/accounting-periods/@id/reopen":
    withDb:
      try:
        let id = @"id".parseInt
        let periodOpt = find(AccountingPeriod, id, db)
        if periodOpt.isNone:
          resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Периодът не е намерен"})
          return
        var period = periodOpt.get()
        if period.status == "LOCKED":
          resp Http400, {"Content-Type": "application/json"}, $(%*{"error": "Заключени периоди не могат да бъдат отваряни"})
          return

        period.status = "OPEN"
        period.closed_at = none(DateTime)
        period.closed_by_id = none(int64)
        period.updated_at = now()
        save(period, db)
        resp Http200, {"Content-Type": "application/json"}, $toJson(period)
      except:
        resp Http400, {"Content-Type": "application/json"}, $(%*{"error": getCurrentExceptionMsg()})

  # =====================
  # SCANNER ROUTES
  # =====================

  # Endpoint for AI invoice scanning with Azure Document Intelligence
  post "/api/scan-invoice":
    # This endpoint handles multipart form data with PDF file
    # For now, returns mock data - actual Azure integration requires:
    # 1. Company's Azure Form Recognizer Endpoint
    # 2. Company's Azure Form Recognizer Key
    # TODO: Implement actual Azure Document Intelligence call

    # Parse companyId from form data
    let companyId = request.formData.getOrDefault("companyId").body
    let invoiceType = request.formData.getOrDefault("invoiceType").body

    # Mock response for testing
    let isPurchase = invoiceType == "purchase"
    let mockResult = %*{
      "vendorName": if isPurchase: "Доставчик ЕООД" else: "",
      "vendorVatNumber": if isPurchase: "BG123456789" else: "",
      "vendorAddress": if isPurchase: "ул. Примерна 1, София" else: "",
      "customerName": if not isPurchase: "Клиент ООД" else: "",
      "customerVatNumber": if not isPurchase: "BG987654321" else: "",
      "customerAddress": if not isPurchase: "ул. Клиентска 2, Пловдив" else: "",
      "invoiceId": "1000000001",
      "invoiceDate": format(now(), "yyyy-MM-dd"),
      "dueDate": format(now() + initDuration(days=30), "yyyy-MM-dd"),
      "subtotal": 1000.00,
      "totalTax": 200.00,
      "invoiceTotal": 1200.00,
      "direction": if isPurchase: "PURCHASE" else: "SALE",
      "validationStatus": "PENDING",
      "viesValidationMessage": "",
      "suggestedAccounts": {
        "counterpartyAccount": nil,
        "vatAccount": nil,
        "expenseOrRevenueAccount": nil
      },
      "requiresManualReview": true,
      "manualReviewReason": "AI сканирането все още не е конфигурирано. Моля въведете Azure ключовете в настройките на компанията."
    }
    resp Http200, {"Content-Type": "application/json"}, $mockResult

  get "/api/scanned-invoices":
    withDb:
      let companyId = request.params.getOrDefault("companyId", "0")
      var invoices: seq[ScannedInvoice]
      if companyId != "0":
        invoices = findWhere(ScannedInvoice, db, "company_id = $1 ORDER BY created_at DESC", companyId)
      else:
        invoices = findAll(ScannedInvoice, db)
      resp Http200, {"Content-Type": "application/json"}, $toJsonArray(invoices)

  post "/api/scanned-invoices":
    withDb:
      try:
        let body = parseJson(request.body)
        let recognized = body["recognized"]
        var invoice = newScannedInvoice(
          direction = recognized.getOrDefault("direction").getStr("UNKNOWN"),
          status = "PENDING",
          document_number = recognized.getOrDefault("invoiceId").getStr(""),
          vendor_name = recognized.getOrDefault("vendorName").getStr(""),
          vendor_vat_number = recognized.getOrDefault("vendorVatNumber").getStr(""),
          vendor_address = recognized.getOrDefault("vendorAddress").getStr(""),
          customer_name = recognized.getOrDefault("customerName").getStr(""),
          customer_vat_number = recognized.getOrDefault("customerVatNumber").getStr(""),
          customer_address = recognized.getOrDefault("customerAddress").getStr(""),
          subtotal = recognized.getOrDefault("subtotal").getFloat(0.0),
          total_tax = recognized.getOrDefault("totalTax").getFloat(0.0),
          invoice_total = recognized.getOrDefault("invoiceTotal").getFloat(0.0),
          validation_status = recognized.getOrDefault("validationStatus").getStr("PENDING"),
          file_name = body.getOrDefault("fileName").getStr(""),
          company_id = body["companyId"].getBiggestInt(),
          created_by_id = 1
        )

        # Parse invoice date
        let invoiceDateStr = recognized.getOrDefault("invoiceDate").getStr("")
        if invoiceDateStr.len > 0:
          try:
            invoice.document_date = parse(invoiceDateStr.split("T")[0], "yyyy-MM-dd")
          except:
            invoice.document_date = now()

        invoice.requires_manual_review = recognized.getOrDefault("requiresManualReview").getBool(false)
        invoice.manual_review_reason = recognized.getOrDefault("manualReviewReason").getStr("")

        # Store suggested account IDs
        invoice.counterparty_account_id = recognized.getOrDefault("counterpartyAccountId").getBiggestInt(0)
        invoice.vat_account_id = recognized.getOrDefault("vatAccountId").getBiggestInt(0)
        invoice.expense_revenue_account_id = recognized.getOrDefault("expenseRevenueAccountId").getBiggestInt(0)

        save(invoice, db)
        resp Http201, {"Content-Type": "application/json"}, $toJson(invoice)
      except:
        resp Http400, {"Content-Type": "application/json"}, $(%*{"error": getCurrentExceptionMsg()})

  get "/api/scanned-invoices/@id":
    withDb:
      let id = @"id".parseInt
      let invoiceOpt = find(ScannedInvoice, id, db)
      if invoiceOpt.isSome:
        resp Http200, {"Content-Type": "application/json"}, $toJson(invoiceOpt.get())
      else:
        resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Фактурата не е намерена"})

  put "/api/scanned-invoices/@id":
    withDb:
      try:
        let id = @"id".parseInt
        let body = parseJson(request.body)
        var invoiceOpt = find(ScannedInvoice, id, db)
        if invoiceOpt.isNone:
          resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Фактурата не е намерена"})
          return

        var invoice = invoiceOpt.get()
        invoice.status = body.getOrDefault("status").getStr(invoice.status)
        invoice.updated_at = now()
        save(invoice, db)
        resp Http200, {"Content-Type": "application/json"}, $toJson(invoice)
      except:
        resp Http400, {"Content-Type": "application/json"}, $(%*{"error": getCurrentExceptionMsg()})

  delete "/api/scanned-invoices/@id":
    withDb:
      let id = @"id".parseInt
      var invoiceOpt = find(ScannedInvoice, id, db)
      if invoiceOpt.isSome:
        var invoice = invoiceOpt.get()
        delete(invoice, db)
        resp Http200, {"Content-Type": "application/json"}, $(%*{"success": true})
      else:
        resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Фактурата не е намерена"})

  post "/api/scanned-invoices/@id/process":
    withDb:
      try:
        let id = @"id".parseInt
        var invoiceOpt = find(ScannedInvoice, id, db)
        if invoiceOpt.isNone:
          resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Фактурата не е намерена"})
          return

        var invoice = invoiceOpt.get()
        if invoice.status == "PROCESSED":
          resp Http400, {"Content-Type": "application/json"}, $(%*{"error": "Фактурата вече е обработена"})
          return

        # Create journal entry from scanned invoice
        var entry = newJournalEntry(
          document_date = invoice.document_date,
          accounting_date = invoice.document_date,
          document_number = invoice.document_number,
          description = "Сканирана фактура от " & (if invoice.direction == "PURCHASE": invoice.vendor_name else: invoice.customer_name),
          total_amount = invoice.invoice_total,
          total_vat_amount = invoice.total_tax,
          document_type = "INVOICE",
          company_id = invoice.company_id,
          created_by_id = invoice.created_by_id
        )
        save(entry, db)

        # Create entry lines based on suggested accounts
        var lineOrder = 0

        # Counterparty line (401 or 411)
        if invoice.counterparty_account_id > 0:
          var counterpartyLine = newEntryLine(
            debit_amount = if invoice.direction == "PURCHASE": 0.0 else: invoice.invoice_total,
            credit_amount = if invoice.direction == "PURCHASE": invoice.invoice_total else: 0.0,
            description = invoice.document_number,
            line_order = lineOrder,
            journal_entry_id = entry.id,
            account_id = invoice.counterparty_account_id
          )
          save(counterpartyLine, db)
          inc lineOrder

        # VAT line (4531 or 4532)
        if invoice.vat_account_id > 0 and invoice.total_tax > 0:
          var vatLine = newEntryLine(
            debit_amount = if invoice.direction == "PURCHASE": invoice.total_tax else: 0.0,
            credit_amount = if invoice.direction == "PURCHASE": 0.0 else: invoice.total_tax,
            description = "ДДС",
            line_order = lineOrder,
            journal_entry_id = entry.id,
            account_id = invoice.vat_account_id
          )
          save(vatLine, db)
          inc lineOrder

        # Expense/Revenue line (6xx or 7xx)
        if invoice.expense_revenue_account_id > 0:
          var expRevLine = newEntryLine(
            debit_amount = if invoice.direction == "PURCHASE": invoice.subtotal else: 0.0,
            credit_amount = if invoice.direction == "PURCHASE": 0.0 else: invoice.subtotal,
            description = "Данъчна основа",
            line_order = lineOrder,
            journal_entry_id = entry.id,
            account_id = invoice.expense_revenue_account_id
          )
          save(expRevLine, db)

        # Update invoice status
        invoice.status = "PROCESSED"
        invoice.journal_entry_id = entry.id.int64
        invoice.updated_at = now()
        save(invoice, db)

        resp Http200, {"Content-Type": "application/json"}, $(%*{"id": invoice.id, "status": "PROCESSED", "journalEntryId": entry.id})
      except:
        resp Http400, {"Content-Type": "application/json"}, $(%*{"error": getCurrentExceptionMsg()})

  # =====================
  # JOURNAL ROUTES
  # =====================
  get "/api/journal-entries":
    withDb:
      let companyId = request.params.getOrDefault("companyId", "0")
      var entries: seq[JournalEntry]
      if companyId != "0":
        entries = findWhere(JournalEntry, db, "company_id = $1 ORDER BY document_date DESC", $(parseInt(companyId)))
      else:
        entries = findAll(JournalEntry, db)
      resp Http200, {"Content-Type": "application/json"}, $toJsonArray(entries)

  post "/api/journal-entries":
    withDb:
      try:
        let body = parseJson(request.body)
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

        save(entry, db)

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
            save(line, db)
            inc lineOrder

        resp Http201, {"Content-Type": "application/json"}, $toJson(entry)
      except:
        resp Http400, {"Content-Type": "application/json"}, $(%*{"error": getCurrentExceptionMsg()})

  get "/api/journal-entries/@id":
    withDb:
      try:
        let entryId = parseInt(@"id")
        let entryOpt = find(JournalEntry, entryId, db)
        if entryOpt.isNone:
          resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Записът не е намерен"})
          return
        var entry = entryOpt.get()

        # Get entry lines
        var lines = findWhere(EntryLine, db, "journal_entry_id = $1 ORDER BY line_order", $entryId)

        var entryJson = toJson(entry)
        entryJson["lines"] = toJsonArray(lines)
        resp Http200, {"Content-Type": "application/json"}, $entryJson
      except:
        resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Записът не е намерен"})

  put "/api/journal-entries/@id":
    withDb:
      try:
        let entryId = parseInt(@"id")
        let body = parseJson(request.body)
        let entryOpt = find(JournalEntry, entryId, db)
        if entryOpt.isNone:
          resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Записът не е намерен"})
          return
        var entry = entryOpt.get()

        if entry.is_posted:
          resp Http400, {"Content-Type": "application/json"}, $(%*{"error": "Не може да редактирате осчетоводен запис"})

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
        save(entry, db)
        resp Http200, {"Content-Type": "application/json"}, $toJson(entry)
      except:
        resp Http400, {"Content-Type": "application/json"}, $(%*{"error": getCurrentExceptionMsg()})

  delete "/api/journal-entries/@id":
    withDb:
      try:
        let entryId = parseInt(@"id")
        let entryOpt = find(JournalEntry, entryId, db)
        if entryOpt.isNone:
          resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Записът не е намерен"})
          return
        var entry = entryOpt.get()

        if entry.is_posted:
          resp Http400, {"Content-Type": "application/json"}, $(%*{"error": "Не може да изтриете осчетоводен запис"})

        # Delete entry lines first
        db.exec(sql"""DELETE FROM "EntryLine" WHERE journal_entry_id = $1""", entryId)
        delete(entry, db)
        resp Http200, {"Content-Type": "application/json"}, $(%*{"success": true})
      except:
        resp Http400, {"Content-Type": "application/json"}, $(%*{"error": getCurrentExceptionMsg()})

  post "/api/journal-entries/@id/post":
    withDb:
      try:
        let entryId = parseInt(@"id")
        let entryOpt = find(JournalEntry, entryId, db)
        if entryOpt.isNone:
          resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Записът не е намерен"})
          return
        var entry = entryOpt.get()

        if entry.is_posted:
          resp Http400, {"Content-Type": "application/json"}, $(%*{"error": "Записът вече е осчетоводен"})

        # Validate debit = credit
        let rows = db.getAllRows(sql"""
          SELECT COALESCE(SUM(debit_amount), 0), COALESCE(SUM(credit_amount), 0)
          FROM "EntryLine" WHERE journal_entry_id = $1
        """, entryId)
        if rows.len > 0:
          let debitSum = parseFloat($rows[0][0])
          let creditSum = parseFloat($rows[0][1])
          if abs(debitSum - creditSum) > 0.001:
            resp Http400, {"Content-Type": "application/json"}, $(%*{
              "error": "Дебит и кредит не са равни",
              "debit": debitSum,
              "credit": creditSum
            })

        entry.is_posted = true
        entry.posted_at = some(now())
        entry.updated_at = now()
        save(entry, db)
        resp Http200, {"Content-Type": "application/json"}, $toJson(entry)
      except:
        resp Http400, {"Content-Type": "application/json"}, $(%*{"error": getCurrentExceptionMsg()})

  post "/api/journal-entries/@id/unpost":
    withDb:
      try:
        let entryId = parseInt(@"id")
        let entryOpt = find(JournalEntry, entryId, db)
        if entryOpt.isNone:
          resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Записът не е намерен"})
          return
        var entry = entryOpt.get()

        if not entry.is_posted:
          resp Http400, {"Content-Type": "application/json"}, $(%*{"error": "Записът не е осчетоводен"})

        entry.is_posted = false
        entry.posted_at = none(DateTime)
        entry.updated_at = now()
        save(entry, db)
        resp Http200, {"Content-Type": "application/json"}, $toJson(entry)
      except:
        resp Http400, {"Content-Type": "application/json"}, $(%*{"error": getCurrentExceptionMsg()})

  # =====================
  # ENTRY LINE ROUTES
  # =====================
  get "/api/entry-lines":
    withDb:
      let journalEntryId = request.params.getOrDefault("journalEntryId", "0")
      var lines: seq[EntryLine]
      if journalEntryId != "0":
        lines = findWhere(EntryLine, db, "journal_entry_id = $1 ORDER BY line_order", $(parseInt(journalEntryId)))
      else:
        lines = findAll(EntryLine, db)
      resp Http200, {"Content-Type": "application/json"}, $toJsonArray(lines)

  post "/api/entry-lines":
    withDb:
      try:
        let body = parseJson(request.body)
        # Check if journal entry is posted
        let entryOpt = find(JournalEntry, body["journalEntryId"].getBiggestInt().int, db)
        if entryOpt.isNone:
          resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Journal entry not found"})
          return
        var entry = entryOpt.get()
        if entry.is_posted:
          resp Http400, {"Content-Type": "application/json"}, $(%*{"error": "Не може да добавяте редове към осчетоводен запис"})

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

        save(line, db)
        resp Http201, {"Content-Type": "application/json"}, $toJson(line)
      except:
        resp Http400, {"Content-Type": "application/json"}, $(%*{"error": getCurrentExceptionMsg()})

  delete "/api/entry-lines/@id":
    withDb:
      try:
        let lineId = parseInt(@"id")
        let lineOpt = find(EntryLine, lineId, db)
        if lineOpt.isNone:
          resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Entry line not found"})
          return
        var line = lineOpt.get()

        # Check if journal entry is posted
        let entryOpt = find(JournalEntry, line.journal_entry_id.int, db)
        if entryOpt.isNone:
          resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Journal entry not found"})
          return
        var entry = entryOpt.get()
        if entry.is_posted:
          resp Http400, {"Content-Type": "application/json"}, $(%*{"error": "Не може да изтривате редове от осчетоводен запис"})

        delete(line, db)
        resp Http200, {"Content-Type": "application/json"}, $(%*{"success": true})
      except:
        resp Http400, {"Content-Type": "application/json"}, $(%*{"error": getCurrentExceptionMsg()})

  # =====================
  # REPORTS ROUTES
  # =====================
  get "/api/reports/turnover-sheet":
    withDb:
      let companyId = request.params.getOrDefault("companyId", "0")
      let fromDate = request.params.getOrDefault("fromDate", "")
      let toDate = request.params.getOrDefault("toDate", "")

      if companyId == "0":
        resp Http400, {"Content-Type": "application/json"}, $(%*{"error": "companyId е задължителен"})

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

      resp Http200, {"Content-Type": "application/json"}, $(%*{
        "companyId": parseInt(companyId),
        "fromDate": fromDate,
        "toDate": toDate,
        "accounts": accounts
      })

  get "/api/reports/general-ledger":
    withDb:
      let companyId = request.params.getOrDefault("companyId", "0")
      let accountId = request.params.getOrDefault("accountId", "0")
      let fromDate = request.params.getOrDefault("fromDate", "")
      let toDate = request.params.getOrDefault("toDate", "")

      if companyId == "0" or accountId == "0":
        resp Http400, {"Content-Type": "application/json"}, $(%*{"error": "companyId и accountId са задължителни"})

      # Get account info
      let accountOpt = find(Account, parseInt(accountId), db)
      if accountOpt.isNone:
        resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Account not found"})
        return
      var account = accountOpt.get()

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

      resp Http200, {"Content-Type": "application/json"}, $(%*{
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

  # =====================
  # BANK PROFILE ROUTES
  # =====================
  get "/api/banks":
    withDb:
      let companyId = request.params.getOrDefault("companyId", "0").parseInt
      var banks: seq[BankProfile]
      if companyId > 0:
        banks = findWhere(BankProfile, db, "company_id = $1", $companyId)
      else:
        banks = findAll(BankProfile, db)
      resp Http200, {"Content-Type": "application/json"}, $toJsonArray(banks)

  get "/api/banks/@id":
    withDb:
      let id = @"id".parseInt
      let bankOpt = find(BankProfile, id, db)
      if bankOpt.isNone:
        resp Http404, {"Content-Type": "application/json"}, """{"error": "Bank profile not found"}"""
        return
      var bank = bankOpt.get()
      resp Http200, {"Content-Type": "application/json"}, $toJson(bank)

  post "/api/banks":
    withDb:
      try:
        let body = parseJson(request.body)
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
        save(bank, db)
        resp Http201, {"Content-Type": "application/json"}, $toJson(bank)
      except CatchableError as e:
        resp Http400, {"Content-Type": "application/json"}, $(%*{"error": e.msg})

  put "/api/banks/@id":
    withDb:
      try:
        let id = @"id".parseInt
        let body = parseJson(request.body)
        let bankOpt = find(BankProfile, id, db)
        if bankOpt.isNone:
          resp Http404, {"Content-Type": "application/json"}, """{"error": "Bank profile not found"}"""
          return
        var bank = bankOpt.get()
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
        save(bank, db)
        resp Http200, {"Content-Type": "application/json"}, $toJson(bank)
      except CatchableError as e:
        resp Http400, {"Content-Type": "application/json"}, $(%*{"error": e.msg})

  delete "/api/banks/@id":
    withDb:
      try:
        let id = @"id".parseInt
        let bankOpt = find(BankProfile, id, db)
        if bankOpt.isNone:
          resp Http404, {"Content-Type": "application/json"}, """{"error": "Bank profile not found"}"""
          return
        var bank = bankOpt.get()
        delete(bank, db)
        resp Http200, {"Content-Type": "application/json"}, """{"success": true}"""
      except CatchableError as e:
        resp Http400, {"Content-Type": "application/json"}, $(%*{"error": e.msg})

  # =====================
  # FIXED ASSET ROUTES
  # =====================
  get "/api/fixed-assets":
    withDb:
      let companyId = request.params.getOrDefault("companyId", "0").parseInt
      let status = request.params.getOrDefault("status", "")
      var assets: seq[FixedAsset]
      if companyId > 0:
        if status != "":
          assets = findWhere(FixedAsset, db, "company_id = $1 AND status = $2", $companyId, status)
        else:
          assets = findWhere(FixedAsset, db, "company_id = $1", $companyId)
      else:
        assets = findAll(FixedAsset, db)
      resp Http200, {"Content-Type": "application/json"}, $toJsonArray(assets)

  get "/api/fixed-assets/@id":
    withDb:
      let id = @"id".parseInt
      let assetOpt = find(FixedAsset, id, db)
      if assetOpt.isNone:
        resp Http404, {"Content-Type": "application/json"}, """{"error": "Fixed asset not found"}"""
        return
      var asset = assetOpt.get()
      resp Http200, {"Content-Type": "application/json"}, $toJson(asset)

  post "/api/fixed-assets":
    withDb:
      try:
        let body = parseJson(request.body)
        let categoryOpt = find(FixedAssetCategory, body["categoryId"].getInt(), db)
        if categoryOpt.isNone:
          resp Http404, {"Content-Type": "application/json"}, """{"error": "Fixed asset category not found"}"""
          return
        var category = categoryOpt.get()

        let acquisitionCost = body["acquisitionCost"].getFloat

        var asset = newFixedAsset(
          name = body["name"].getStr,
          inventory_number = body["inventoryNumber"].getStr,
          description = body.getOrDefault("description").getStr(""),
          category_id = category.id,
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

        save(asset, db)
        resp Http201, {"Content-Type": "application/json"}, $toJson(asset)
      except CatchableError as e:
        resp Http400, {"Content-Type": "application/json"}, $(%*{"error": e.msg})

  put "/api/fixed-assets/@id":
    withDb:
      try:
        let id = @"id".parseInt
        let body = parseJson(request.body)
        let assetOpt = find(FixedAsset, id, db)
        if assetOpt.isNone:
          resp Http404, {"Content-Type": "application/json"}, """{"error": "Fixed asset not found"}"""
          return
        var asset = assetOpt.get()
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
        save(asset, db)
        resp Http200, {"Content-Type": "application/json"}, $toJson(asset)
      except CatchableError as e:
        resp Http400, {"Content-Type": "application/json"}, $(%*{"error": e.msg})

  delete "/api/fixed-assets/@id":
    withDb:
      try:
        let id = @"id".parseInt
        let assetOpt = find(FixedAsset, id, db)
        if assetOpt.isNone:
          resp Http404, {"Content-Type": "application/json"}, """{"error": "Fixed asset not found"}"""
          return
        var asset = assetOpt.get()
        delete(asset, db)
        resp Http200, {"Content-Type": "application/json"}, """{"success": true}"""
      except CatchableError as e:
        resp Http400, {"Content-Type": "application/json"}, $(%*{"error": e.msg})

  post "/api/fixed-assets/calculate-depreciation":
    withDb:
      try:
        let body = parseJson(request.body)
        let companyId = body["companyId"].getInt
        let year = body["year"].getInt
        let month = body["month"].getInt
        var assets = findWhere(FixedAsset, db, "company_id = $1 AND status = $2", $companyId, "ACTIVE")

        var calculated: seq[JsonNode] = @[]
        var totalAccountingAmount = 0.0
        var totalTaxAmount = 0.0
        var errors: seq[JsonNode] = @[]

        for asset in assets:
          let existing = findWhere(DepreciationJournal, db, "fixed_asset_id = $1 AND period_year = $2 AND period_month = $3",
                    $asset.id, $year, $month)
          if existing.len > 0:
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
          save(journal, db)

          var assetToUpdate = asset
          assetToUpdate.accounting_accumulated_depreciation += accountingDepreciation
          assetToUpdate.accounting_book_value -= accountingDepreciation
          assetToUpdate.tax_accumulated_depreciation += taxDepreciation
          assetToUpdate.tax_book_value -= taxDepreciation
          assetToUpdate.last_depreciation_date = some(now())
          assetToUpdate.updated_at = now()

          if assetToUpdate.accounting_book_value <= assetToUpdate.residual_value:
            assetToUpdate.status = "DEPRECIATED"

          save(assetToUpdate, db)

          totalAccountingAmount += accountingDepreciation
          totalTaxAmount += taxDepreciation

          calculated.add(%*{
            "fixedAssetId": asset.id,
            "fixedAssetName": asset.name,
            "accountingDepreciationAmount": accountingDepreciation,
            "taxDepreciationAmount": taxDepreciation
          })

        resp Http200, {"Content-Type": "application/json"}, $(%*{
          "calculated": calculated,
          "errors": errors,
          "totalAccountingAmount": totalAccountingAmount,
          "totalTaxAmount": totalTaxAmount
        })
      except CatchableError as e:
        resp Http400, {"Content-Type": "application/json"}, $(%*{"error": e.msg})

  post "/api/fixed-assets/post-depreciation":
    withDb:
      try:
        let body = parseJson(request.body)
        let companyId = body["companyId"].getInt
        let year = body["year"].getInt
        let month = body["month"].getInt
        var entries = findWhere(DepreciationJournal, db, "company_id = $1 AND period_year = $2 AND period_month = $3 AND is_posted = $4",
                  $companyId, $year, $month, "false")

        if entries.len == 0:
          resp Http400, {"Content-Type": "application/json"}, """{"error": "No unposted depreciation entries found"}"""

        var totalAmount = 0.0
        for entry in entries:
          totalAmount += entry.accounting_depreciation_amount

        var journalEntry = newJournalEntry(
          company_id = companyId.int64,
          description = "Месечна амортизация " & $month & "/" & $year,
          document_number = "АМОР-" & $year & "-" & $month,
          total_amount = totalAmount
        )
        save(journalEntry, db)

        for entry in entries:
          var e = entry
          e.is_posted = true
          e.journal_entry_id = some(journalEntry.id.int64)
          e.posted_at = some(now())
          e.updated_at = now()
          save(e, db)

        resp Http200, {"Content-Type": "application/json"}, $(%*{
          "journalEntryId": journalEntry.id,
          "totalAmount": totalAmount,
          "assetsCount": entries.len
        })
      except CatchableError as e:
        resp Http400, {"Content-Type": "application/json"}, $(%*{"error": e.msg})

  get "/api/depreciation-journal":
    withDb:
      let companyId = request.params.getOrDefault("companyId", "0").parseInt
      let year = request.params.getOrDefault("year", "0").parseInt
      let month = request.params.getOrDefault("month", "")
      var entries: seq[DepreciationJournal]
      if month != "":
        entries = findWhere(DepreciationJournal, db, "company_id = $1 AND period_year = $2 AND period_month = $3",
                  $companyId, $year, $(month.parseInt))
      else:
        entries = findWhere(DepreciationJournal, db, "company_id = $1 AND period_year = $2", $companyId, $year)

      var journalResult: seq[JsonNode] = @[]
      for entry in entries:
        let assetOpt = find(FixedAsset, entry.fixed_asset_id.int, db)
        if assetOpt.isNone:
          continue
        var asset = assetOpt.get()
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

      resp Http200, {"Content-Type": "application/json"}, $(%journalResult)

  get "/api/calculated-periods":
    withDb:
      let companyId = request.params.getOrDefault("companyId", "0").parseInt
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

      resp Http200, {"Content-Type": "application/json"}, $(%periodsResult)

  # =====================
  # GRAPHQL ENDPOINT
  # =====================
  post "/graphql":
    let ctx = getGraphqlCtx()
    if ctx.isNil:
      resp Http500, {"Content-Type": "application/json"}, $(%*{"error": "GraphQL not initialized"})

    let body = parseJson(request.body)
    let query = body.getOrDefault("query").getStr("")
    let variables = body.getOrDefault("variables")
    let operationName = body.getOrDefault("operationName").getStr("")

    if query.len == 0:
      resp Http400, {"Content-Type": "application/json"}, $(%*{"error": "Query is required"})

    # Clear previous query state
    ctx.purgeQueries(includeVariables = true, includeStored = false)

    # Parse variables
    if not variables.isNil and variables.kind == JObject:
      let varsRes = ctx.parseVars($variables)
      if varsRes.isErr:
        var errMsgs: seq[string]
        for e in varsRes.error:
          errMsgs.add($e)
        resp Http400, {"Content-Type": "application/json"}, $(%*{"errors": errMsgs})

    # Parse and validate query
    let queryRes = ctx.parseQuery(query)
    if queryRes.isErr:
      var errMsgs: seq[string]
      for e in queryRes.error:
        errMsgs.add($e)
      resp Http400, {"Content-Type": "application/json"}, $(%*{"errors": errMsgs})

    # Execute
    let jsonResp = JsonRespStream.new()
    let execRes = ctx.executeRequest(respStream(jsonResp), operationName)
    if execRes.isErr:
      var errMsgs: seq[string]
      for e in execRes.error:
        errMsgs.add($e)
      resp Http400, {"Content-Type": "application/json"}, $(%*{"errors": errMsgs})

    let response = jsonResp.getString()
    resp Http200, {"Content-Type": "application/json"}, response

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

proc ensureAllTables() =
  ## Creates all tables if they don't exist (for fresh installations)
  echo "Checking database schema..."
  let db = getDbConn()
  defer: releaseDbConn(db)

  # Create tables in dependency order
  ensureTable(db, Currency)
  ensureTable(db, UserGroup)
  ensureTable(db, User)
  ensureTable(db, Company)
  ensureTable(db, Account)
  ensureTable(db, Counterpart)
  ensureTable(db, VatRate)
  ensureTable(db, ExchangeRate)
  ensureTable(db, FixedAssetCategory)
  ensureTable(db, FixedAsset)
  ensureTable(db, DepreciationJournal)
  ensureTable(db, JournalEntry)
  ensureTable(db, EntryLine)
  ensureTable(db, BankProfile)
  ensureTable(db, AuditLog)
  ensureTable(db, ScannedInvoice)
  ensureTable(db, SystemSettings)
  ensureTable(db, VatReturn)
  ensureTable(db, BankTransaction)
  ensureTable(db, AccountingPeriod)
  echo "Database schema ready"

proc main() =
  # Get port from environment variable or default to 5000
  let portStr = getEnv("PORT", "5000")
  let port = try: parseInt(portStr) except: 5000

  echo "Starting Baraba API server..."
  initDbPool()
  defer: closeDbPool()

  # Auto-create tables for fresh installations
  ensureAllTables()

  # Initialize GraphQL
  echo "Initializing GraphQL..."
  graphqlCtx = setupGraphQL()
  if graphqlCtx.isNil:
    echo "Warning: GraphQL initialization failed"
  else:
    echo "GraphQL ready at /graphql"

  echo "http://localhost:", port
  # Use all available CPU cores (0 = auto-detect)
  let settings = newSettings(port = Port(port), numThreads = 0)
  var jester = initJester(mainRouter, settings = settings)
  jester.serve()

when isMainModule:
  main()
