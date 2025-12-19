import std/[json, base64, times, strutils]
import jester
import asynchttpserver
import orm/orm
import baraba_shared/db/config
import controllers/vat_controller
import utils/encoding

settings:
  port = Port(5004)

router vatRouter:
  # Health check
  get "/health":
    resp Http200, {"Content-Type": "application/json"}, $(%*{"status": "ok", "service": "vat-service"})

  # VAT Generation route
  post "/api/vat/generate/@period":
    let period = @"period"
    let body = parseJson(request.body)
    let companyId = body["companyId"].getInt()

    withDb:
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