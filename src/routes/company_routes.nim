import std/[json, strutils, options, times]
import jester
import orm/orm

import ../models/[company, currency, account]
import ../db/config
import ../utils/json_utils

proc companyRoutes*(): auto =
  router companyRouter:
    get "/api/companies":
      withDb:
        let companies = findAll(Company, db)
        resp Http200, {"Content-Type": "application/json"}, $toJsonArray(companies)

    get "/api/companies/@id":
      withDb:
        let companyId = parseInt(@"id")
        let companyOpt = find(Company, companyId, db)
        if companyOpt.isNone:
          resp Http404, {"Content-Type": "application/json"}, """{"error": "Company not found"}"""
          return
        
        let company = companyOpt.get()
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
            let accountOpt2 = find(Account, accountIdOpt.get.int, db)
            if accountOpt2.isSome:
              companyJson[jsonField] = toJson(accountOpt2.get())
            else:
              companyJson[jsonField] = %*{}
          else:
            companyJson[jsonField] = %*{}

        resp Http200, {"Content-Type": "application/json"}, $companyJson

    post "/api/companies":
      withDb:
        let body = parseJson(request.body)
        var baseCurrencyId: int64 = 0
        let currencies = findWhere(Currency, db, "code = $1", "BGN")
        if currencies.len > 0:
          baseCurrencyId = currencies[0].id
        var company = newCompany(
          name = body["name"].getStr(),
          eik = body["eik"].getStr(),
          vat_number = body.getOrDefault("vatNumber").getStr(""),
          address = body.getOrDefault("address").getStr(""),
          city = body.getOrDefault("city").getStr(""),
          base_currency_id = baseCurrencyId
        )
        save(company, db)
        resp Http201, {"Content-Type": "application/json"}, $toJson(company)

    put "/api/companies/@id":
      withDb:
        let companyId = parseInt(@"id")
        let body = parseJson(request.body)
        let companyOpt = find(Company, companyId, db)
        if companyOpt.isNone:
          resp Http404, {"Content-Type": "application/json"}, """{"error": "Фирмата не е намерена"}"""
          return
        var company = companyOpt.get()
        if body.hasKey("name"): company.name = body["name"].getStr()
        if body.hasKey("vatNumber"): company.vat_number = body["vatNumber"].getStr()
        if body.hasKey("address"): company.address = body["address"].getStr()
        if body.hasKey("city"): company.city = body["city"].getStr()
        company.updated_at = now()
        save(company, db)
        resp Http200, {"Content-Type": "application/json"}, $toJson(company)

    put "/api/companies/@id/default-accounts":
      withDb:
        let companyId = parseInt(@"id")
        let body = parseJson(request.body)
        let companyOpt = find(Company, companyId, db)
        if companyOpt.isNone:
          resp Http404, {"Content-Type": "application/json"}, """{"error": "Фирмата не е намерена"}"""
          return
        var company = companyOpt.get()

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
        save(company, db)
        resp Http200, {"Content-Type": "application/json"}, $toJson(company)

    delete "/api/companies/@id":
      withDb:
        let companyId = parseInt(@"id")
        let companyOpt = find(Company, companyId, db)
        if companyOpt.isNone:
          resp Http404, {"Content-Type": "application/json"}, """{"error": "Фирмата не е намерена"}"""
          return
        var company = companyOpt.get()
        delete(company, db)
        resp Http200, {"Content-Type": "application/json"}, $(%*{"success": true})

  return companyRouter
