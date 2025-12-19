import std/[json, times, os, strutils]
import jester
import asynchttpserver

settings:
  port = Port(5001)

router scannerRouter:
  post "/scan":
    # In a real scenario, this would receive the file and call Azure
    # For now, it mimics the mock behavior of the monolith
    
    let companyId = request.params.getOrDefault("companyId", "0")
    let invoiceType = request.params.getOrDefault("invoiceType", "purchase")

    echo "Scanning request received for company: " & companyId & ", type: " & invoiceType

    let isPurchase = invoiceType == "purchase"
    let mockResult = %*{
      "vendorName": if isPurchase: "Доставчик ЕООД (от микросървис)" else: "",
      "vendorVatNumber": if isPurchase: "BG123456789" else: "",
      "vendorAddress": if isPurchase: "ул. Примерна 1, София" else: "",
      "customerName": if not isPurchase: "Клиент ООД (от микросървис)" else: "",
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
      "manualReviewReason": "AI сканирането в микросървиса все още не е конфигурирано."
    }
    
    resp Http200, {"Content-Type": "application/json"}, $mockResult

proc main() =
  let p = Port(5001)
  let settings = newSettings(port=p)
  var jester = initJester(scannerRouter, settings=settings)
  jester.serve()

if isMainModule:
  main()
