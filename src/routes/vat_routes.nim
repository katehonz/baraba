import std/[json, base64, times]
import jester, ../controllers/vat_controller

proc addVatRoutes*(router: var Router) =
  router.post("/api/v1/vat/generate/@period"):
    let period = @"period"
    # Note: company is magically added by a middleware
    # based on the auth token
    let company = ctx.get().get("company", newCompany())

    let (purchase, sales, deklar) = generateVatFiles(company, period)

    let response = %*{"POKUPKI.TXT": encode(purchase), "PRODAGBI.TXT": encode(sales), "DEKLAR.TXT": encode(deklar)}
    resp(Http200, $response)
