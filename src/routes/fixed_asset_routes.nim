import std/[json, strutils, times, options, math]
import jester
import orm/orm

import ../db/config
import ../models/[fixed_asset, fixed_asset_category, depreciation_journal, journal]
import baraba_shared/utils/json_utils

proc fixedAssetRoutes*(): auto =
  router fixedAssetRouter:
    # Get all fixed assets for a company
    get "/api/fixed-assets":
      let companyId = request.params.getOrDefault("companyId", "0").parseInt
      let status = request.params.getOrDefault("status", "")
      let db = getDbConn()
      try:
        var assets: seq[FixedAsset]
        if companyId > 0:
          if status != "":
            assets = findWhere(FixedAsset, db, "company_id = $1 AND status = $2", $companyId, status)
          else:
            assets = findWhere(FixedAsset, db, "company_id = $1", $companyId)
        else:
          assets = findAll(FixedAsset, db)
        resp Http200, {"Content-Type": "application/json"}, $toJsonArray(assets)
      finally:
        releaseDbConn(db)

    # Get single fixed asset
    get "/api/fixed-assets/@id":
      let id = @"id".parseInt
      let db = getDbConn()
      try:
        let assetOpt = find(FixedAsset, id, db)
        if assetOpt.isSome:
          let asset = assetOpt.get()
          resp Http200, {"Content-Type": "application/json"}, $toJson(asset)
        else:
          resp Http404, {"Content-Type": "application/json"}, """{"error": "Fixed asset not found"}"""
      finally:
        releaseDbConn(db)

    # Create fixed asset
    post "/api/fixed-assets":
      let body = parseJson(request.body)
      let db = getDbConn()
      try:
        # Get category to set default rates
        let categoryId = body["categoryId"].getInt
        let categoryOpt = find(FixedAssetCategory, categoryId, db)
        let category = if categoryOpt.isSome: categoryOpt.get() else: newFixedAssetCategory()

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

        # Set optional dates
        if body.hasKey("documentDate") and body["documentDate"].getStr != "":
          asset.document_date = some(parse(body["documentDate"].getStr, "yyyy-MM-dd"))
        if body.hasKey("putIntoServiceDate") and body["putIntoServiceDate"].getStr != "":
          asset.put_into_service_date = some(parse(body["putIntoServiceDate"].getStr, "yyyy-MM-dd"))

        # Set initial book values
        asset.accounting_book_value = acquisitionCost
        asset.tax_book_value = acquisitionCost

        save(asset, db)
        resp Http201, {"Content-Type": "application/json"}, $toJson(asset)
      except CatchableError as e:
        resp Http400, {"Content-Type": "application/json"}, """{"error": """ & $(%e.msg) & "}"
      finally:
        releaseDbConn(db)

    # Update fixed asset
    put "/api/fixed-assets/@id":
      let id = @"id".parseInt
      let body = parseJson(request.body)
      let db = getDbConn()
      try:
        var assetOpt = find(FixedAsset, id, db)
        if assetOpt.isSome:
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
        else:
          resp Http404, {"Content-Type": "application/json"}, """{"error": "Fixed asset not found"}"""
      finally:
        releaseDbConn(db)

    # Delete fixed asset
    delete "/api/fixed-assets/@id":
      let id = @"id".parseInt
      let db = getDbConn()
      try:
        let assetOpt = find(FixedAsset, id, db)
        if assetOpt.isNone:
          resp Http404, {"Content-Type": "application/json"}, """{"error": "Fixed asset not found"}"""
          return

        deleteById(FixedAsset, id, db)
        resp Http200, {"Content-Type": "application/json"}, """{"success": true}"""
      except:
        resp Http500, {"Content-Type": "application/json"}, """{"error": "Internal server error"}"""
      finally:
        releaseDbConn(db)

    # Calculate monthly depreciation
    post "/api/fixed-assets/calculate-depreciation":
      let body = parseJson(request.body)
      let companyId = body["companyId"].getInt
      let year = body["year"].getInt
      let month = body["month"].getInt
      let db = getDbConn()
      try:
        # Get all active assets
        var assets = findWhere(FixedAsset, db, "company_id = $1 AND status = $2", $companyId, "ACTIVE")

        var calculated: seq[JsonNode] = @[]
        var totalAccountingAmount = 0.0
        var totalTaxAmount = 0.0
        var errors: seq[JsonNode] = @[]

        for asset in assets.mitems:
          # Check if already calculated for this period
          let existing = findWhere(DepreciationJournal, db, "fixed_asset_id = $1 AND period_year = $2 AND period_month = $3",
                    $asset.id, $year, $month)
          if existing.len > 0:
            continue  # Already calculated

          # Calculate monthly depreciation
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

          # Create depreciation journal entry
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

          # Update asset book values
          asset.accounting_accumulated_depreciation += accountingDepreciation
          asset.accounting_book_value -= accountingDepreciation
          asset.tax_accumulated_depreciation += taxDepreciation
          asset.tax_book_value -= taxDepreciation
          asset.last_depreciation_date = some(now())
          asset.updated_at = now()

          # Check if fully depreciated
          if asset.accounting_book_value <= asset.residual_value:
            asset.status = "DEPRECIATED"

          save(asset, db)

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
        resp Http400, {"Content-Type": "application/json"}, """{"error": """ & $(%e.msg) & "}"
      finally:
        releaseDbConn(db)

    # Post depreciation (create journal entry)
    post "/api/fixed-assets/post-depreciation":
      let body = parseJson(request.body)
      let companyId = body["companyId"].getInt
      let year = body["year"].getInt
      let month = body["month"].getInt
      let db = getDbConn()
      try:
        # Get unposted depreciation entries for this period
        var entries = findWhere(DepreciationJournal, db, "company_id = $1 AND period_year = $2 AND period_month = $3 AND is_posted = $4",
                  $companyId, $year, $month, "false")

        if entries.len == 0:
          resp Http400, {"Content-Type": "application/json"}, """{"error": "No unposted depreciation entries found"}"""
          return

        var totalAmount = 0.0
        for entry in entries:
          totalAmount += entry.accounting_depreciation_amount

        # Create journal entry
        var journalEntry = newJournalEntry(
          company_id = companyId.int64,
          description = "Месечна амортизация " & $month & "/" & $year,
          document_number = "АМОР-" & $year & "-" & $month,
          total_amount = totalAmount
        )
        save(journalEntry, db)

        # Mark depreciation entries as posted
        for entry in entries.mitems:
          entry.is_posted = true
          entry.journal_entry_id = some(journalEntry.id)
          entry.posted_at = some(now())
          entry.updated_at = now()
          save(entry, db)

        resp Http200, {"Content-Type": "application/json"}, $(%*{
          "journalEntryId": journalEntry.id,
          "totalAmount": totalAmount,
          "assetsCount": entries.len
        })
      except CatchableError as e:
        resp Http400, {"Content-Type": "application/json"}, """{"error": """ & $(%e.msg) & "}"
      finally:
        releaseDbConn(db)

    # Get depreciation journal
    get "/api/depreciation-journal":
      let companyId = request.params.getOrDefault("companyId", "0").parseInt
      let year = request.params.getOrDefault("year", "0").parseInt
      let month = request.params.getOrDefault("month", "")
      let db = getDbConn()
      try:
        var entries: seq[DepreciationJournal]
        if month != "":
          entries = findWhere(DepreciationJournal, db, "company_id = $1 AND period_year = $2 AND period_month = $3",
                    $companyId, $year, month)
        else:
          entries = findWhere(DepreciationJournal, db, "company_id = $1 AND period_year = $2", $companyId, $year)

        # Enrich with asset names
        var result: seq[JsonNode] = @[]
        for entry in entries:
          let assetOpt = find(FixedAsset, entry.fixed_asset_id.int, db)
          let asset = if assetOpt.isSome: assetOpt.get() else: newFixedAsset()
          result.add(%*{
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
            "isPosted": entry.is_posted,
            "journalEntryId": entry.journal_entry_id,
            "postedAt": entry.posted_at
          })

        resp Http200, {"Content-Type": "application/json"}, $(%result)
      finally:
        releaseDbConn(db)

    # Get calculated periods
    get "/api/calculated-periods":
      let companyId = request.params.getOrDefault("companyId", "0").parseInt
      let db = getDbConn()
      try:
        # Raw SQL query to get distinct periods with aggregations
        let rows = rawQuery(db, """
          SELECT period_year, period_month,
                 bool_and(is_posted) as all_posted,
                 SUM(accounting_depreciation_amount) as total_accounting,
                 SUM(tax_depreciation_amount) as total_tax,
                 COUNT(*) as assets_count
          FROM depreciation_journal
          WHERE company_id = $1
          GROUP BY period_year, period_month
          ORDER BY period_year DESC, period_month DESC
        """, $companyId)

        var result: seq[JsonNode] = @[]
        for row in rows:
          let year = row[0].parseInt
          let month = row[1].parseInt
          let monthNames = ["Януари", "Февруари", "Март", "Април", "Май", "Юни",
                           "Юли", "Август", "Септември", "Октомври", "Ноември", "Декември"]
          result.add(%*{
            "year": year,
            "month": month,
            "periodDisplay": monthNames[month - 1] & " " & $year,
            "isPosted": row[2] == "t",
            "totalAccountingAmount": row[3].parseFloat,
            "totalTaxAmount": row[4].parseFloat,
            "assetsCount": row[5].parseInt
          })

        resp Http200, {"Content-Type": "application/json"}, $(%result)
      except CatchableError:
        resp Http200, {"Content-Type": "application/json"}, "[]"
      finally:
        releaseDbConn(db)

  return fixedAssetRouter
