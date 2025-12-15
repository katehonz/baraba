## Baraba - Счетоводна програма
## REST API built with Jester + Nim

import std/[json, strutils, options, times, math]
import jester
import norm/postgres

import models/[user, company, account, counterpart, journal, currency]
import services/auth
import db/config
import utils/json_utils
import graphql/resolvers
import "vendor/nim-graphql/graphql"

var graphqlCtx: GraphqlRef

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
  options "/api/companies": resp Http200, corsHeaders, ""
  options "/api/companies/@id": resp Http200, corsHeaders, ""
  options "/api/accounts": resp Http200, corsHeaders, ""
  options "/api/accounts/company/@companyId": resp Http200, corsHeaders, ""
  options "/api/counterparts": resp Http200, corsHeaders, ""
  options "/api/journal-entries": resp Http200, corsHeaders, ""
  options "/api/journal-entries/@id": resp Http200, corsHeaders, ""
  options "/api/journal-entries/@id/post": resp Http200, corsHeaders, ""
  options "/api/journal-entries/@id/unpost": resp Http200, corsHeaders, ""
  options "/api/entry-lines": resp Http200, corsHeaders, ""
  options "/api/entry-lines/@id": resp Http200, corsHeaders, ""
  options "/api/reports/turnover-sheet": resp Http200, corsHeaders, ""
  options "/api/reports/general-ledger": resp Http200, corsHeaders, ""
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
      resp Http200, jsonCors, $toJson(company)
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
  # GRAPHQL ENDPOINT
  # =====================
  post "/graphql":
    if graphqlCtx.isNil:
      resp Http500, jsonCors, $(%*{"error": "GraphQL not initialized"})

    let body = parseJson(request.body)
    let query = body.getOrDefault("query").getStr("")
    let variables = body.getOrDefault("variables")
    let operationName = body.getOrDefault("operationName").getStr("")

    if query.len == 0:
      resp Http400, jsonCors, $(%*{"error": "Query is required"})

    # Clear previous query state
    graphqlCtx.purgeQueries(includeVariables = true, includeStored = false)

    # Parse variables
    if not variables.isNil and variables.kind == JObject:
      let varsRes = graphqlCtx.parseVars($variables)
      if varsRes.isErr:
        var errMsgs: seq[string]
        for e in varsRes.error:
          errMsgs.add($e)
        resp Http400, jsonCors, $(%*{"errors": errMsgs})

    # Parse and validate query
    let queryRes = graphqlCtx.parseQuery(query)
    if queryRes.isErr:
      var errMsgs: seq[string]
      for e in queryRes.error:
        errMsgs.add($e)
      resp Http400, jsonCors, $(%*{"errors": errMsgs})

    # Execute
    let jsonResp = JsonRespStream.new()
    let execRes = graphqlCtx.executeRequest(respStream(jsonResp), operationName)
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

  echo "http://localhost:5000"
  let settings = newSettings(port = Port(5000))
  var jester = initJester(mainRouter, settings = settings)
  jester.serve()

when isMainModule:
  main()
