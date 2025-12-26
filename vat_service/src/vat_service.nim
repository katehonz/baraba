import std/[json, base64, times, strutils, os, options, re]
import jester
import asynchttpserver
import orm/orm
import baraba_shared/db/config
import baraba_shared/models/[company, vatrate]
import baraba_shared/utils/security
import controllers/vat_controller
import utils/encoding

settings:
  port = Port(5004)

# JWT Auth helper
proc verifyAuth(request: jester.Request): tuple[valid: bool, userId: int64, username: string, error: string] =
  let authHeader = request.headers.getOrDefault("Authorization")
  if authHeader.len == 0:
    return (false, 0'i64, "", "Missing Authorization header")
  if not authHeader.startsWith("Bearer "):
    return (false, 0'i64, "", "Invalid Authorization header format")
  let token = authHeader[7..^1]
  let (valid, userId, username) = verifyToken(token)
  if not valid:
    return (false, 0'i64, "", "Invalid or expired token")
  return (true, userId, username, "")

# Convert VatRate to JSON
proc toJson(vr: VatRate): JsonNode =
  result = %*{
    "id": vr.id,
    "name": vr.name,
    "percentage": $vr.percentage,
    "description": vr.description,
    "is_active": vr.is_active,
    "effective_from": vr.effective_from,
    "vat_code": vr.vat_code,
    "saft_tax_type": vr.saft_tax_type,
    "is_reverse_charge_applicable": vr.is_reverse_charge_applicable,
    "is_intrastat_applicable": vr.is_intrastat_applicable,
    "company_id": vr.company_id,
    "inserted_at": vr.inserted_at.format("yyyy-MM-dd'T'HH:mm:ss"),
    "updated_at": vr.updated_at.format("yyyy-MM-dd'T'HH:mm:ss")
  }
  if vr.effective_to.isSome:
    result["effective_to"] = %vr.effective_to.get
  else:
    result["effective_to"] = newJNull()

# CORS headers
template corsHeaders(): untyped =
  {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Content-Type": "application/json"}

router vatRouter:
  # CORS preflight handler
  options re".*":
    resp Http200, corsHeaders(), ""

  # Health check (public)
  get "/health":
    resp Http200, corsHeaders(), $(%*{
      "status": "ok",
      "service": "vat-service",
      "jwtConfigured": getEnv("JWT_SECRET", "").len > 0
    })

  # ============================================================================
  # VAT Rates CRUD
  # ============================================================================

  # List VAT rates for a company
  get "/api/companies/@companyId/vat-rates":
    let auth = verifyAuth(request)
    if not auth.valid:
      resp Http401, corsHeaders(), $(%*{"error": auth.error})

    let companyId = @"companyId"
    let activeOnly = request.params.getOrDefault("active_only", "true") == "true"

    let db = getDbConn()
    defer: releaseDbConn(db)

    var rates: seq[VatRate]
    if activeOnly:
      let today = now().format("yyyy-MM-dd")
      rates = findWhereUuid(VatRate, db,
        "company_id = $1::uuid AND is_active = true AND effective_from <= $2::date AND (effective_to IS NULL OR effective_to >= $3::date) ORDER BY percentage",
        companyId, today, today)
    else:
      rates = findWhereUuid(VatRate, db, "company_id = $1::uuid ORDER BY percentage", companyId)

    var ratesJson = newJArray()
    for rate in rates:
      ratesJson.add(toJson(rate))

    resp Http200, corsHeaders(), $(%*{"data": ratesJson})

  # Get single VAT rate
  get "/api/companies/@companyId/vat-rates/@id":
    let auth = verifyAuth(request)
    if not auth.valid:
      resp Http401, corsHeaders(), $(%*{"error": auth.error})

    let id = @"id"
    let db = getDbConn()
    defer: releaseDbConn(db)

    let rateOpt = findUuid(VatRate, id, db)
    if rateOpt.isNone:
      resp Http404, corsHeaders(), $(%*{"error": "VAT rate not found"})

    resp Http200, corsHeaders(), $(%*{"data": toJson(rateOpt.get)})

  # Create VAT rate
  post "/api/companies/@companyId/vat-rates":
    let auth = verifyAuth(request)
    if not auth.valid:
      resp Http401, corsHeaders(), $(%*{"error": auth.error})

    let companyId = @"companyId"
    let body = parseJson(request.body)
    let vatRateData = body{"vat_rate"}
    if vatRateData.isNil:
      resp Http400, corsHeaders(), $(%*{"error": "Missing vat_rate object"})

    var rate = newVatRate(
      name = vatRateData{"name"}.getStr(""),
      percentage = vatRateData{"percentage"}.getFloat(0.0),
      description = vatRateData{"description"}.getStr(""),
      is_active = vatRateData{"is_active"}.getBool(true),
      effective_from = vatRateData{"effective_from"}.getStr(now().format("yyyy-MM-dd")),
      vat_code = vatRateData{"vat_code"}.getStr(""),
      company_id = companyId
    )

    if vatRateData.hasKey("effective_to") and vatRateData{"effective_to"}.kind != JNull:
      rate.effective_to = some(vatRateData{"effective_to"}.getStr)

    if vatRateData.hasKey("saft_tax_type"):
      rate.saft_tax_type = vatRateData{"saft_tax_type"}.getStr("")
    if vatRateData.hasKey("is_reverse_charge_applicable"):
      rate.is_reverse_charge_applicable = vatRateData{"is_reverse_charge_applicable"}.getBool(false)
    if vatRateData.hasKey("is_intrastat_applicable"):
      rate.is_intrastat_applicable = vatRateData{"is_intrastat_applicable"}.getBool(false)

    let db = getDbConn()
    defer: releaseDbConn(db)

    try:
      saveUuid(rate, db)
      resp Http201, corsHeaders(), $(%*{"data": toJson(rate)})
    except Exception as e:
      resp Http400, corsHeaders(), $(%*{"error": e.msg})

  # Update VAT rate
  put "/api/companies/@companyId/vat-rates/@id":
    let auth = verifyAuth(request)
    if not auth.valid:
      resp Http401, corsHeaders(), $(%*{"error": auth.error})

    let id = @"id"
    let body = parseJson(request.body)
    let vatRateData = body{"vat_rate"}
    if vatRateData.isNil:
      resp Http400, corsHeaders(), $(%*{"error": "Missing vat_rate object"})

    let db = getDbConn()
    defer: releaseDbConn(db)

    let rateOpt = findUuid(VatRate, id, db)
    if rateOpt.isNone:
      resp Http404, corsHeaders(), $(%*{"error": "VAT rate not found"})

    var rate = rateOpt.get

    if vatRateData.hasKey("name"):
      rate.name = vatRateData{"name"}.getStr
    if vatRateData.hasKey("percentage"):
      rate.percentage = vatRateData{"percentage"}.getFloat
    if vatRateData.hasKey("description"):
      rate.description = vatRateData{"description"}.getStr
    if vatRateData.hasKey("is_active"):
      rate.is_active = vatRateData{"is_active"}.getBool
    if vatRateData.hasKey("effective_from"):
      rate.effective_from = vatRateData{"effective_from"}.getStr
    if vatRateData.hasKey("effective_to"):
      if vatRateData{"effective_to"}.kind == JNull:
        rate.effective_to = none(string)
      else:
        rate.effective_to = some(vatRateData{"effective_to"}.getStr)
    if vatRateData.hasKey("vat_code"):
      rate.vat_code = vatRateData{"vat_code"}.getStr
    if vatRateData.hasKey("saft_tax_type"):
      rate.saft_tax_type = vatRateData{"saft_tax_type"}.getStr
    if vatRateData.hasKey("is_reverse_charge_applicable"):
      rate.is_reverse_charge_applicable = vatRateData{"is_reverse_charge_applicable"}.getBool
    if vatRateData.hasKey("is_intrastat_applicable"):
      rate.is_intrastat_applicable = vatRateData{"is_intrastat_applicable"}.getBool

    rate.updated_at = now()

    try:
      saveUuid(rate, db)
      resp Http200, corsHeaders(), $(%*{"data": toJson(rate)})
    except Exception as e:
      resp Http400, corsHeaders(), $(%*{"error": e.msg})

  # Delete VAT rate
  delete "/api/companies/@companyId/vat-rates/@id":
    let auth = verifyAuth(request)
    if not auth.valid:
      resp Http401, corsHeaders(), $(%*{"error": auth.error})

    let id = @"id"
    let db = getDbConn()
    defer: releaseDbConn(db)

    let rateOpt = findUuid(VatRate, id, db)
    if rateOpt.isNone:
      resp Http404, corsHeaders(), $(%*{"error": "VAT rate not found"})

    try:
      deleteByUuid(VatRate, id, db)
      resp Http204, corsHeaders(), ""
    except Exception as e:
      resp Http400, corsHeaders(), $(%*{"error": e.msg})

  # ============================================================================
  # VAT File Generation (for NAP)
  # ============================================================================

  post "/api/vat/generate/@period":
    let auth = verifyAuth(request)
    if not auth.valid:
      resp Http401, corsHeaders(), $(%*{"error": auth.error})

    let period = @"period"
    let body = parseJson(request.body)
    let companyId = body["companyId"].getStr()

    echo "VAT generation request from user: " & auth.username

    let db = getDbConn()
    defer: releaseDbConn(db)

    let companyOpt = findUuid(Company, companyId, db)
    if companyOpt.isNone:
      resp Http404, corsHeaders(), $(%*{"error": "Фирмата не е намерена"})

    let company = companyOpt.get()
    let (purchase, sales, deklar) = generateVatFiles(company, period, db)

    let response = %*{
      "POKUPKI.TXT": encode(purchase),
      "PRODAGBI.TXT": encode(sales),
      "DEKLAR.TXT": encode(deklar)
    }
    resp Http200, corsHeaders(), $response

proc main() =
  let p = Port(5004)
  let settings = newSettings(port=p)
  var jester = initJester(vatRouter, settings=settings)

  # Initialize DB connection pool
  try:
    initDbPool()
    echo "VAT Service started on port 5004"
    jester.serve()
  finally:
    closeDbPool()

if isMainModule:
  main()
