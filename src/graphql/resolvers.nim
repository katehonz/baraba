## GraphQL Resolvers for Baraba
import std/[json, strutils, options, times, tables, math]
import norm/postgres
import "../vendor/nim-graphql/graphql/api"
import ../db/config
import ../models/[user, company, account, counterpart, journal]
import ../services/auth
import ../utils/json_utils

type
  BarabaContext* = ref object of RootRef
    userId*: int64
    token*: string

const schemaFile = staticRead("schema.graphql")

{.push gcsafe, raises: [].}

# Helper to get int argument by index
proc getIntArg(params: Args, idx: int): int64 =
  if idx >= Node(params).len:
    return 0
  let node = params[idx].val
  if node.isNil or node.kind in {nkNull, nkEmpty}:
    return 0
  if node.kind == nkInt:
    try:
      return parseInt(node.intVal)
    except:
      return 0
  return 0

# Helper to get string argument by index
proc getStrArg(params: Args, idx: int, default: string = ""): string =
  if idx >= Node(params).len:
    return default
  let node = params[idx].val
  if node.isNil or node.kind in {nkNull, nkEmpty}:
    return default
  if node.kind == nkString:
    return node.stringVal
  return default

# ============= QUERY RESOLVERS =============

proc queryCompanies(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} =
  try:
    let ctx = GraphqlRef(ud)
    let typeName = ctx.createName("Company")

    let db = getDbConn()
    defer: releaseDbConn(db)

    var companies = @[newCompany()]
    db.selectAll(companies)
    if companies.len == 1 and companies[0].id == 0:
      return ok(respList())

    var list = respList()
    for c in companies:
      var item = respMap(typeName)
      item["id"] = resp(c.id)
      item["name"] = resp(c.name)
      item["eik"] = resp(c.eik)
      item["vatNumber"] = resp(c.vat_number)
      item["address"] = resp(c.address)
      item["city"] = resp(c.city)
      item["country"] = resp(c.country)
      item["isActive"] = resp(c.is_active)
      item["createdAt"] = resp($c.created_at)
      item["updatedAt"] = resp($c.updated_at)
      list.add item
    ok(list)
  except CatchableError as e:
    err(e.msg)

proc queryCompany(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} =
  try:
    let ctx = GraphqlRef(ud)
    let typeName = ctx.createName("Company")
    # params[0] = id
    let id = getIntArg(params, 0)
    if id == 0:
      return ok(respNull())

    let db = getDbConn()
    defer: releaseDbConn(db)

    var company = newCompany()
    db.select(company, "id = $1", id)
    var item = respMap(typeName)
    item["id"] = resp(company.id)
    item["name"] = resp(company.name)
    item["eik"] = resp(company.eik)
    item["vatNumber"] = resp(company.vat_number)
    item["address"] = resp(company.address)
    item["city"] = resp(company.city)
    item["country"] = resp(company.country)
    item["isActive"] = resp(company.is_active)
    item["createdAt"] = resp($company.created_at)
    item["updatedAt"] = resp($company.updated_at)
    ok(item)
  except CatchableError as e:
    err(e.msg)

proc queryAccounts(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} =
  try:
    let ctx = GraphqlRef(ud)
    let typeName = ctx.createName("Account")
    # params[0] = companyId
    let companyId = getIntArg(params, 0)

    let db = getDbConn()
    defer: releaseDbConn(db)

    var accounts = @[newAccount()]
    if companyId != 0:
      db.select(accounts, "company_id = $1 ORDER BY code", companyId)
    else:
      db.selectAll(accounts)

    if accounts.len == 1 and accounts[0].id == 0:
      return ok(respList())

    var list = respList()
    for a in accounts:
      var item = respMap(typeName)
      item["id"] = resp(a.id)
      item["code"] = resp(a.code)
      item["name"] = resp(a.name)
      item["description"] = resp(a.description)
      item["accountType"] = resp(a.account_type)
      item["accountClass"] = resp(a.account_class)
      item["level"] = resp(a.level)
      item["isActive"] = resp(a.is_active)
      item["isAnalytical"] = resp(a.is_analytical)
      item["supportsQuantities"] = resp(a.supports_quantities)
      item["companyId"] = resp(a.company_id)
      if a.parent_id.isSome:
        item["parentId"] = resp(a.parent_id.get)
      else:
        item["parentId"] = respNull()
      item["createdAt"] = resp($a.created_at)
      item["updatedAt"] = resp($a.updated_at)
      list.add item
    ok(list)
  except CatchableError as e:
    err(e.msg)

proc queryCounterparts(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} =
  try:
    let ctx = GraphqlRef(ud)
    let typeName = ctx.createName("Counterpart")
    # params[0] = companyId
    let companyId = getIntArg(params, 0)

    let db = getDbConn()
    defer: releaseDbConn(db)

    var counterparts = @[newCounterpart()]
    if companyId != 0:
      db.select(counterparts, "company_id = $1 ORDER BY name", companyId)
    else:
      db.selectAll(counterparts)

    if counterparts.len == 1 and counterparts[0].id == 0:
      return ok(respList())

    var list = respList()
    for c in counterparts:
      var item = respMap(typeName)
      item["id"] = resp(c.id)
      item["name"] = resp(c.name)
      item["eik"] = resp(c.eik)
      item["vatNumber"] = resp(c.vat_number)
      item["address"] = resp(c.address)
      item["city"] = resp(c.city)
      item["country"] = resp(c.country)
      item["isActive"] = resp(c.is_active)
      item["companyId"] = resp(c.company_id)
      item["createdAt"] = resp($c.created_at)
      item["updatedAt"] = resp($c.updated_at)
      list.add item
    ok(list)
  except CatchableError as e:
    err(e.msg)

proc queryJournalEntries(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} =
  try:
    let ctx = GraphqlRef(ud)
    let entryTypeName = ctx.createName("JournalEntry")
    let lineTypeName = ctx.createName("EntryLine")
    # params[0] = companyId, params[1] = posted (optional)
    let companyId = getIntArg(params, 0)

    let db = getDbConn()
    defer: releaseDbConn(db)

    var entries = @[newJournalEntry()]
    if companyId != 0:
      db.select(entries, "company_id = $1 ORDER BY document_date DESC", companyId)
    else:
      db.selectAll(entries)

    if entries.len == 1 and entries[0].id == 0:
      return ok(respList())

    var list = respList()
    for e in entries:
      var item = respMap(entryTypeName)
      item["id"] = resp(e.id)
      item["entryNumber"] = resp(e.entry_number)
      item["documentDate"] = resp($e.document_date)
      item["accountingDate"] = resp($e.accounting_date)
      item["documentNumber"] = resp(e.document_number)
      item["description"] = resp(e.description)
      item["totalAmount"] = resp(e.total_amount)
      item["totalVatAmount"] = resp(e.total_vat_amount)
      item["isPosted"] = resp(e.is_posted)
      item["documentType"] = resp(e.document_type)
      item["companyId"] = resp(e.company_id)
      item["createdById"] = resp(e.created_by_id)
      item["createdAt"] = resp($e.created_at)
      item["updatedAt"] = resp($e.updated_at)

      # Get entry lines
      var lines = @[newEntryLine()]
      db.select(lines, "journal_entry_id = $1 ORDER BY line_order", e.id)
      var linesList = respList()
      if not (lines.len == 1 and lines[0].id == 0):
        for l in lines:
          var lineItem = respMap(lineTypeName)
          lineItem["id"] = resp(l.id)
          lineItem["journalEntryId"] = resp(l.journal_entry_id)
          lineItem["accountId"] = resp(l.account_id)
          lineItem["debitAmount"] = resp(l.debit_amount)
          lineItem["creditAmount"] = resp(l.credit_amount)
          lineItem["currencyCode"] = resp(l.currency_code)
          lineItem["baseAmount"] = resp(l.base_amount)
          lineItem["vatAmount"] = resp(l.vat_amount)
          lineItem["description"] = resp(l.description)
          lineItem["lineOrder"] = resp(l.line_order)
          lineItem["createdAt"] = resp($l.created_at)
          linesList.add lineItem
      item["lines"] = linesList
      list.add item
    ok(list)
  except CatchableError as e:
    err(e.msg)

proc queryJournalEntry(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} =
  try:
    let ctx = GraphqlRef(ud)
    let entryTypeName = ctx.createName("JournalEntry")
    let lineTypeName = ctx.createName("EntryLine")
    # params[0] = id
    let id = getIntArg(params, 0)
    if id == 0:
      return ok(respNull())

    let db = getDbConn()
    defer: releaseDbConn(db)

    var entry = newJournalEntry()
    db.select(entry, "id = $1", id)

    var item = respMap(entryTypeName)
    item["id"] = resp(entry.id)
    item["entryNumber"] = resp(entry.entry_number)
    item["documentDate"] = resp($entry.document_date)
    item["accountingDate"] = resp($entry.accounting_date)
    item["documentNumber"] = resp(entry.document_number)
    item["description"] = resp(entry.description)
    item["totalAmount"] = resp(entry.total_amount)
    item["totalVatAmount"] = resp(entry.total_vat_amount)
    item["isPosted"] = resp(entry.is_posted)
    item["documentType"] = resp(entry.document_type)
    item["companyId"] = resp(entry.company_id)
    item["createdById"] = resp(entry.created_by_id)
    item["createdAt"] = resp($entry.created_at)
    item["updatedAt"] = resp($entry.updated_at)

    # Get entry lines
    var lines = @[newEntryLine()]
    db.select(lines, "journal_entry_id = $1 ORDER BY line_order", id)
    var linesList = respList()
    if not (lines.len == 1 and lines[0].id == 0):
      for l in lines:
        var lineItem = respMap(lineTypeName)
        lineItem["id"] = resp(l.id)
        lineItem["journalEntryId"] = resp(l.journal_entry_id)
        lineItem["accountId"] = resp(l.account_id)
        lineItem["debitAmount"] = resp(l.debit_amount)
        lineItem["creditAmount"] = resp(l.credit_amount)
        lineItem["currencyCode"] = resp(l.currency_code)
        lineItem["baseAmount"] = resp(l.base_amount)
        lineItem["vatAmount"] = resp(l.vat_amount)
        lineItem["description"] = resp(l.description)
        lineItem["lineOrder"] = resp(l.line_order)
        lineItem["createdAt"] = resp($l.created_at)
        linesList.add lineItem
    item["lines"] = linesList
    ok(item)
  except CatchableError as e:
    err(e.msg)

# ============= MUTATION RESOLVERS =============

proc mutationLogin(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} =
  try:
    let ctx = GraphqlRef(ud)
    let userTypeName = ctx.createName("User")
    let authTypeName = ctx.createName("AuthPayload")
    # params[0] = username, params[1] = password
    let username = getStrArg(params, 0)
    let password = getStrArg(params, 1)

    let db = getDbConn()
    defer: releaseDbConn(db)

    let userOpt = authenticateUser(db, username, password)
    if userOpt.isNone:
      return err("Невалидно потребителско име или парола")

    let user = userOpt.get
    let token = generateToken(user.id, user.username)

    var userMap = respMap(userTypeName)
    userMap["id"] = resp(user.id)
    userMap["username"] = resp(user.username)
    userMap["email"] = resp(user.email)

    var res = respMap(authTypeName)
    res["token"] = resp(token)
    res["user"] = userMap
    ok(res)
  except CatchableError as e:
    err(e.msg)

proc mutationPostJournalEntry(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} =
  try:
    let ctx = GraphqlRef(ud)
    let entryTypeName = ctx.createName("JournalEntry")
    # params[0] = id
    let id = getIntArg(params, 0)

    let db = getDbConn()
    defer: releaseDbConn(db)

    var entry = newJournalEntry()
    db.select(entry, "id = $1", id)

    if entry.is_posted:
      return err("Записът вече е осчетоводен")

    # Validate debit = credit
    var debitSum, creditSum: float64
    try:
      let rows = db.getAllRows(sql"""
        SELECT COALESCE(SUM(debit_amount), 0), COALESCE(SUM(credit_amount), 0)
        FROM "EntryLine" WHERE journal_entry_id = $1
      """, id)
      if rows.len > 0:
        debitSum = parseFloat($rows[0][0])
        creditSum = parseFloat($rows[0][1])
    except:
      discard  # Defaults to 0
    if abs(debitSum - creditSum) > 0.001:
      return err("Дебит и кредит не са равни")

    entry.is_posted = true
    entry.posted_at = some(now())
    entry.updated_at = now()
    db.update(entry)

    var item = respMap(entryTypeName)
    item["id"] = resp(entry.id)
    item["entryNumber"] = resp(entry.entry_number)
    item["isPosted"] = resp(entry.is_posted)
    item["documentDate"] = resp($entry.document_date)
    item["description"] = resp(entry.description)
    item["companyId"] = resp(entry.company_id)
    item["lines"] = respList()
    ok(item)
  except CatchableError as e:
    err(e.msg)

{.pop.}

# ============= FIELD RESOLVERS =============

# Helper to get field from parent respMap by name
proc getFieldFromParent(parent: Node, fieldName: string): Node =
  if parent.kind == nkMap:
    for (key, val) in parent.map:
      if key == fieldName:
        return val
  return Node(kind: nkNull, pos: Pos())

# Generic field resolver factory - creates resolver that extracts field by name
template makeFieldResolver(fieldName: string): ResolverProc =
  proc(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} =
    ok(getFieldFromParent(parent, fieldName))

{.push gcsafe, raises: [].}

# Company field resolvers
proc companyId(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "id"))
proc companyName(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "name"))
proc companyEik(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "eik"))
proc companyVatNumber(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "vatNumber"))
proc companyAddress(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "address"))
proc companyCity(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "city"))
proc companyCountry(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "country"))
proc companyIsActive(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "isActive"))
proc companyCreatedAt(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "createdAt"))
proc companyUpdatedAt(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "updatedAt"))

# Account field resolvers
proc accountId(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "id"))
proc accountCode(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "code"))
proc accountName(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "name"))
proc accountDescription(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "description"))
proc accountAccountType(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "accountType"))
proc accountAccountClass(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "accountClass"))
proc accountLevel(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "level"))
proc accountIsActive(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "isActive"))
proc accountIsAnalytical(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "isAnalytical"))
proc accountSupportsQuantities(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "supportsQuantities"))
proc accountCompanyId(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "companyId"))
proc accountParentId(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "parentId"))
proc accountCreatedAt(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "createdAt"))
proc accountUpdatedAt(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "updatedAt"))

# Counterpart field resolvers
proc counterpartId(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "id"))
proc counterpartName(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "name"))
proc counterpartEik(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "eik"))
proc counterpartVatNumber(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "vatNumber"))
proc counterpartAddress(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "address"))
proc counterpartCity(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "city"))
proc counterpartCountry(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "country"))
proc counterpartIsActive(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "isActive"))
proc counterpartCompanyId(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "companyId"))
proc counterpartCreatedAt(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "createdAt"))
proc counterpartUpdatedAt(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "updatedAt"))

# JournalEntry field resolvers
proc jeId(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "id"))
proc jeEntryNumber(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "entryNumber"))
proc jeDocumentDate(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "documentDate"))
proc jeAccountingDate(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "accountingDate"))
proc jeDocumentNumber(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "documentNumber"))
proc jeDescription(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "description"))
proc jeTotalAmount(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "totalAmount"))
proc jeTotalVatAmount(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "totalVatAmount"))
proc jeIsPosted(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "isPosted"))
proc jeDocumentType(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "documentType"))
proc jeCompanyId(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "companyId"))
proc jeCreatedById(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "createdById"))
proc jeCreatedAt(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "createdAt"))
proc jeUpdatedAt(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "updatedAt"))
proc jeLines(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "lines"))

# EntryLine field resolvers
proc elId(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "id"))
proc elJournalEntryId(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "journalEntryId"))
proc elAccountId(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "accountId"))
proc elDebitAmount(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "debitAmount"))
proc elCreditAmount(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "creditAmount"))
proc elCurrencyCode(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "currencyCode"))
proc elBaseAmount(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "baseAmount"))
proc elVatAmount(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "vatAmount"))
proc elDescription(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "description"))
proc elLineOrder(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "lineOrder"))
proc elCreatedAt(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "createdAt"))

# User field resolvers
proc userId(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "id"))
proc userName(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "username"))
proc userEmail(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "email"))

# AuthPayload field resolvers
proc authToken(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "token"))
proc authUser(ud: RootRef, params: Args, parent: Node): RespResult {.cdecl, gcsafe, raises: [].} = ok(getFieldFromParent(parent, "user"))

{.pop.}

# ============= SETUP =============

proc setupGraphQL*(): GraphqlRef =
  var ctx = GraphqlRef.new()

  # Parse schema
  let res = ctx.parseSchema(schemaFile)
  if res.isErr:
    echo "GraphQL schema error: "
    for e in res.error:
      echo "  ", e
    return nil

  # Register Query resolvers
  ctx.addResolvers(ctx, "Query", [
    ("companies", queryCompanies),
    ("company", queryCompany),
    ("accounts", queryAccounts),
    ("counterparts", queryCounterparts),
    ("journalEntries", queryJournalEntries),
    ("journalEntry", queryJournalEntry)
  ])

  # Register Mutation resolvers
  ctx.addResolvers(ctx, "Mutation", [
    ("login", mutationLogin),
    ("postJournalEntry", mutationPostJournalEntry)
  ])

  # Register Company field resolvers
  ctx.addResolvers(ctx, "Company", [
    ("id", companyId), ("name", companyName), ("eik", companyEik),
    ("vatNumber", companyVatNumber), ("address", companyAddress),
    ("city", companyCity), ("country", companyCountry),
    ("isActive", companyIsActive), ("createdAt", companyCreatedAt),
    ("updatedAt", companyUpdatedAt)
  ])

  # Register Account field resolvers
  ctx.addResolvers(ctx, "Account", [
    ("id", accountId), ("code", accountCode), ("name", accountName),
    ("description", accountDescription), ("accountType", accountAccountType),
    ("accountClass", accountAccountClass), ("level", accountLevel),
    ("isActive", accountIsActive), ("isAnalytical", accountIsAnalytical),
    ("supportsQuantities", accountSupportsQuantities), ("companyId", accountCompanyId),
    ("parentId", accountParentId), ("createdAt", accountCreatedAt),
    ("updatedAt", accountUpdatedAt)
  ])

  # Register Counterpart field resolvers
  ctx.addResolvers(ctx, "Counterpart", [
    ("id", counterpartId), ("name", counterpartName), ("eik", counterpartEik),
    ("vatNumber", counterpartVatNumber), ("address", counterpartAddress),
    ("city", counterpartCity), ("country", counterpartCountry),
    ("isActive", counterpartIsActive), ("companyId", counterpartCompanyId),
    ("createdAt", counterpartCreatedAt), ("updatedAt", counterpartUpdatedAt)
  ])

  # Register JournalEntry field resolvers
  ctx.addResolvers(ctx, "JournalEntry", [
    ("id", jeId), ("entryNumber", jeEntryNumber), ("documentDate", jeDocumentDate),
    ("accountingDate", jeAccountingDate), ("documentNumber", jeDocumentNumber),
    ("description", jeDescription), ("totalAmount", jeTotalAmount),
    ("totalVatAmount", jeTotalVatAmount), ("isPosted", jeIsPosted),
    ("documentType", jeDocumentType), ("companyId", jeCompanyId),
    ("createdById", jeCreatedById), ("createdAt", jeCreatedAt),
    ("updatedAt", jeUpdatedAt), ("lines", jeLines)
  ])

  # Register EntryLine field resolvers
  ctx.addResolvers(ctx, "EntryLine", [
    ("id", elId), ("journalEntryId", elJournalEntryId), ("accountId", elAccountId),
    ("debitAmount", elDebitAmount), ("creditAmount", elCreditAmount),
    ("currencyCode", elCurrencyCode), ("baseAmount", elBaseAmount),
    ("vatAmount", elVatAmount), ("description", elDescription),
    ("lineOrder", elLineOrder), ("createdAt", elCreatedAt)
  ])

  # Register User field resolvers
  ctx.addResolvers(ctx, "User", [
    ("id", userId), ("username", userName), ("email", userEmail)
  ])

  # Register AuthPayload field resolvers
  ctx.addResolvers(ctx, "AuthPayload", [
    ("token", authToken), ("user", authUser)
  ])

  ctx
