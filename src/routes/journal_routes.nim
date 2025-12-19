import std/[json, strutils, options, times, strformat]
import jester
import orm/orm

import ../models/journal
import ../db/config
import baraba_shared/utils/json_utils

proc parseDate(s: string): DateTime =
  if s.len == 0:
    return now()
  try:
    result = parse(s, "yyyy-MM-dd")
  except:
    result = now()

proc journalRoutes*(): auto =
  router journalRouter:
    # Logic from baraba.nim, adapted for pool
    get "/api/journal-entries":
      let companyId = request.params.getOrDefault("companyId", "0")
      let db = getDbConn()
      try:
        var entries: seq[JournalEntry]
        if companyId != "0":
          entries = findWhere(JournalEntry, db, "company_id = $1 ORDER BY document_date DESC", $(parseInt(companyId)))
        else:
          entries = findAll(JournalEntry, db)
        resp Http200, {"Content-Type": "application/json"}, $toJsonArray(entries)
      finally:
        releaseDbConn(db)

    get "/api/journal-entries/@id":
      let entryId = parseInt(@"id")
      let db = getDbConn()
      try:
        let entryOpt = find(JournalEntry, entryId, db)
        if entryOpt.isSome:
          let entry = entryOpt.get()
          let lines = findWhere(EntryLine, db, "journal_entry_id = $1 ORDER BY line_order", $entryId)

          let response = %*{
            "entry": toJson(entry),
            "lines": toJsonArray(lines)
          }
          resp Http200, {"Content-Type": "application/json"}, $response
        else:
          resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Записът не е намерен"})
      finally:
        releaseDbConn(db)

    # Create new journal entry with lines
    post "/api/journal-entries":
      let body = parseJson(request.body)
      let db = getDbConn()
      try:
        # Parse dates
        let docDate = parseDate(body.getOrDefault("documentDate").getStr(""))
        let accDate = parseDate(body.getOrDefault("accountingDate").getStr(""))

        var entry = newJournalEntry(
          document_number = body.getOrDefault("documentNumber").getStr(""),
          description = body.getOrDefault("description").getStr(""),
          total_amount = body.getOrDefault("totalAmount").getFloat(0.0),
          document_type = body.getOrDefault("documentType").getStr("OTHER"),
          company_id = body["companyId"].getBiggestInt(),
          created_by_id = body.getOrDefault("createdById").getBiggestInt(1)
        )
        entry.document_date = docDate
        entry.accounting_date = accDate
        entry.vat_document_type = body.getOrDefault("vatDocumentType").getStr("")
        entry.vat_purchase_operation = body.getOrDefault("vatPurchaseOperation").getStr("")
        entry.vat_sales_operation = body.getOrDefault("vatSalesOperation").getStr("")

        # Handle counterpartId
        let counterpartId = body.getOrDefault("counterpartId").getBiggestInt(0)
        if counterpartId > 0:
          entry.counterpart_id = some(counterpartId)

        save(entry, db)

        # Process lines
        let linesNode = body.getOrDefault("lines")
        if linesNode.kind == JArray:
          var lineOrder = 0
          var totalDebit = 0.0
          var totalCredit = 0.0
          for lineJson in linesNode:
            let accountId = lineJson.getOrDefault("accountId").getBiggestInt(0)
            if accountId == 0:
              continue  # Skip lines without account

            let debitAmt = lineJson.getOrDefault("debitAmount").getFloat(0.0)
            let creditAmt = lineJson.getOrDefault("creditAmount").getFloat(0.0)

            if debitAmt == 0.0 and creditAmt == 0.0:
              continue  # Skip empty lines

            var line = newEntryLine(
              debit_amount = debitAmt,
              credit_amount = creditAmt,
              currency_code = lineJson.getOrDefault("currencyCode").getStr("BGN"),
              description = lineJson.getOrDefault("description").getStr(""),
              line_order = lineOrder,
              journal_entry_id = entry.id,
              account_id = accountId
            )
            line.currency_amount = lineJson.getOrDefault("currencyAmount").getFloat(0.0)
            line.exchange_rate = lineJson.getOrDefault("exchangeRate").getFloat(1.0)

            # Handle counterpartId for line
            let lineCounterpartId = lineJson.getOrDefault("counterpartId").getBiggestInt(0)
            if lineCounterpartId > 0:
              line.counterpart_id = some(lineCounterpartId)
            elif counterpartId > 0:
              line.counterpart_id = some(counterpartId)

            save(line, db)
            inc lineOrder
            totalDebit += debitAmt
            totalCredit += creditAmt

          # Update entry total
          entry.total_amount = totalDebit
          save(entry, db)

        resp Http201, {"Content-Type": "application/json"}, $toJson(entry)
      except:
        resp Http400, {"Content-Type": "application/json"}, $(%*{"error": getCurrentExceptionMsg()})
      finally:
        releaseDbConn(db)

    # Update existing journal entry
    put "/api/journal-entries/@id":
      let entryId = parseInt(@"id")
      let body = parseJson(request.body)
      let db = getDbConn()
      try:
        var entryOpt = find(JournalEntry, entryId, db)
        if entryOpt.isNone:
          resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Записът не е намерен"})
          return

        var entry = entryOpt.get()
        if entry.is_posted:
          resp Http400, {"Content-Type": "application/json"}, $(%*{"error": "Не може да редактирате осчетоводен запис"})
          return

        # Update fields
        entry.document_number = body.getOrDefault("documentNumber").getStr(entry.document_number)
        entry.description = body.getOrDefault("description").getStr(entry.description)
        entry.document_type = body.getOrDefault("documentType").getStr(entry.document_type)
        entry.vat_document_type = body.getOrDefault("vatDocumentType").getStr(entry.vat_document_type)
        entry.vat_purchase_operation = body.getOrDefault("vatPurchaseOperation").getStr(entry.vat_purchase_operation)
        entry.vat_sales_operation = body.getOrDefault("vatSalesOperation").getStr(entry.vat_sales_operation)

        let docDateStr = body.getOrDefault("documentDate").getStr("")
        if docDateStr.len > 0:
          entry.document_date = parseDate(docDateStr)

        let accDateStr = body.getOrDefault("accountingDate").getStr("")
        if accDateStr.len > 0:
          entry.accounting_date = parseDate(accDateStr)

        let counterpartId = body.getOrDefault("counterpartId").getBiggestInt(0)
        if counterpartId > 0:
          entry.counterpart_id = some(counterpartId)
        else:
          entry.counterpart_id = none(int64)

        entry.updated_at = now()

        # Delete old lines
        rawExec(db, "DELETE FROM entry_lines WHERE journal_entry_id = $1", $entryId)

        # Insert new lines
        let linesNode = body.getOrDefault("lines")
        if linesNode.kind == JArray:
          var lineOrder = 0
          var totalDebit = 0.0
          var totalCredit = 0.0
          for lineJson in linesNode:
            let accountId = lineJson.getOrDefault("accountId").getBiggestInt(0)
            if accountId == 0:
              continue

            let debitAmt = lineJson.getOrDefault("debitAmount").getFloat(0.0)
            let creditAmt = lineJson.getOrDefault("creditAmount").getFloat(0.0)

            if debitAmt == 0.0 and creditAmt == 0.0:
              continue

            var line = newEntryLine(
              debit_amount = debitAmt,
              credit_amount = creditAmt,
              currency_code = lineJson.getOrDefault("currencyCode").getStr("BGN"),
              description = lineJson.getOrDefault("description").getStr(""),
              line_order = lineOrder,
              journal_entry_id = entry.id,
              account_id = accountId
            )
            line.currency_amount = lineJson.getOrDefault("currencyAmount").getFloat(0.0)
            line.exchange_rate = lineJson.getOrDefault("exchangeRate").getFloat(1.0)

            let lineCounterpartId = lineJson.getOrDefault("counterpartId").getBiggestInt(0)
            if lineCounterpartId > 0:
              line.counterpart_id = some(lineCounterpartId)
            elif counterpartId > 0:
              line.counterpart_id = some(counterpartId)

            save(line, db)
            inc lineOrder
            totalDebit += debitAmt
            totalCredit += creditAmt

          entry.total_amount = totalDebit

        save(entry, db)
        resp Http200, {"Content-Type": "application/json"}, $toJson(entry)
      except:
        resp Http400, {"Content-Type": "application/json"}, $(%*{"error": getCurrentExceptionMsg()})
      finally:
        releaseDbConn(db)

    # Specific routes from original file, adapted for pool
    post "/api/journal-entries/@id/post":
      let entryId = parseInt(@"id")
      let db = getDbConn()
      try:
        var entryOpt = find(JournalEntry, entryId, db)
        if entryOpt.isSome:
          var entry = entryOpt.get()
          entry.is_posted = true
          entry.posted_at = some(now())
          entry.updated_at = now()
          save(entry, db)
          resp Http200, {"Content-Type": "application/json"}, $toJson(entry)
        else:
          resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Записът не е намерен"})
      finally:
        releaseDbConn(db)

    post "/api/journal-entries/@id/unpost":
      let entryId = parseInt(@"id")
      let db = getDbConn()
      try:
        var entryOpt = find(JournalEntry, entryId, db)
        if entryOpt.isSome:
          var entry = entryOpt.get()
          entry.is_posted = false
          entry.posted_at = none(DateTime)
          entry.updated_at = now()
          save(entry, db)
          resp Http200, {"Content-Type": "application/json"}, $toJson(entry)
        else:
          resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Записът не е намерен"})
      finally:
        releaseDbConn(db)

    delete "/api/journal-entries/@id":
      let entryId = parseInt(@"id")
      let db = getDbConn()
      try:
        let entryOpt = find(JournalEntry, entryId, db)
        if entryOpt.isSome:
          var entry = entryOpt.get()
          if entry.is_posted:
            resp Http400, {"Content-Type": "application/json"}, $(%*{"error": "Не може да изтриете осчетоводен запис"})
          else:
            rawExec(db, "DELETE FROM entry_lines WHERE journal_entry_id = $1", $entryId)
            delete(entry, db)
            resp Http200, {"Content-Type": "application/json"}, $(%*{"success": true})
        else:
          resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Записът не е намерен"})
      finally:
        releaseDbConn(db)

  return journalRouter