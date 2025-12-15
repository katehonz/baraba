import std/[json, options, strutils, times]
import jester
import norm/postgres
import ../models/journal
import ../db/config
import ../utils/json_utils

proc journalRoutes*(): auto =
  router journalRouter:
    get "/api/journal-entries":
      let companyId = request.params.getOrDefault("companyId", "0")
      let isPosted = request.params.getOrDefault("isPosted", "")
      let limit = request.params.getOrDefault("limit", "100")
      let offset = request.params.getOrDefault("offset", "0")

      let db = openDb()
      try:
        var entries: seq[JournalEntry] = @[]
        var whereClause = "1=1"
        if companyId != "0":
          whereClause &= " AND \"companyId\" = " & companyId
        if isPosted != "":
          whereClause &= " AND \"isPosted\" = " & isPosted
        whereClause &= " ORDER BY \"documentDate\" DESC LIMIT " & limit & " OFFSET " & offset

        db.select(entries, whereClause)
        resp Http200, {"Content-Type": "application/json"}, $toJsonArray(entries)
      finally:
        close(db)

    get "/api/journal-entries/@id":
      let entryId = parseInt(@"id")
      let db = openDb()
      try:
        var entry = newJournalEntry()
        db.select(entry, "id = $1", entryId)

        # Get entry lines
        var lines: seq[EntryLine] = @[]
        db.select(lines, "\"journalEntryId\" = $1 ORDER BY \"lineOrder\"", entryId)

        let response = %*{
          "entry": toJson(entry),
          "lines": toJsonArray(lines)
        }
        resp Http200, {"Content-Type": "application/json"}, $response
      except:
        resp Http404, {"Content-Type": "application/json"}, $(%*{
          "error": "Записът не е намерен"
        })
      finally:
        close(db)

    get "/api/journal-entries/company/@companyId":
      let companyId = parseInt(@"companyId")
      let db = openDb()
      try:
        var entries: seq[JournalEntry] = @[]
        db.select(entries, "\"companyId\" = $1 ORDER BY \"documentDate\" DESC", companyId)
        resp Http200, {"Content-Type": "application/json"}, $toJsonArray(entries)
      finally:
        close(db)

    get "/api/journal-entries/unposted/@companyId":
      let companyId = parseInt(@"companyId")
      let db = openDb()
      try:
        var entries: seq[JournalEntry] = @[]
        db.select(entries, "\"companyId\" = $1 AND \"isPosted\" = false ORDER BY \"documentDate\" DESC", companyId)
        resp Http200, {"Content-Type": "application/json"}, $toJsonArray(entries)
      finally:
        close(db)

    post "/api/journal-entries":
      let body = parseJson(request.body)
      let db = openDb()
      try:
        var counterpartId = none(int64)
        if body.hasKey("counterpartId") and body["counterpartId"].kind != JNull:
          counterpartId = some(body["counterpartId"].getBiggestInt())

        var entry = newJournalEntry(
          entryNumber = body.getOrDefault("entryNumber").getInt(0),
          documentDate = if body.hasKey("documentDate"): parseDateTime(body["documentDate"].getStr()) else: now(),
          accountingDate = if body.hasKey("accountingDate"): parseDateTime(body["accountingDate"].getStr()) else: now(),
          documentNumber = body.getOrDefault("documentNumber").getStr(""),
          description = body.getOrDefault("description").getStr(""),
          totalAmount = body.getOrDefault("totalAmount").getFloat(0.0),
          totalVatAmount = body.getOrDefault("totalVatAmount").getFloat(0.0),
          documentType = body.getOrDefault("documentType").getStr("OTHER"),
          companyId = body["companyId"].getBiggestInt(),
          createdById = body.getOrDefault("createdById").getBiggestInt(1)
        )
        entry.counterpartId = counterpartId

        db.insert(entry)

        # Insert entry lines if provided
        if body.hasKey("lines"):
          for i, lineJson in body["lines"].getElems():
            var lineCounterpartId = none(int64)
            if lineJson.hasKey("counterpartId") and lineJson["counterpartId"].kind != JNull:
              lineCounterpartId = some(lineJson["counterpartId"].getBiggestInt())

            var vatRateId = none(int64)
            if lineJson.hasKey("vatRateId") and lineJson["vatRateId"].kind != JNull:
              vatRateId = some(lineJson["vatRateId"].getBiggestInt())

            var line = newEntryLine(
              debitAmount = lineJson.getOrDefault("debitAmount").getFloat(0.0),
              creditAmount = lineJson.getOrDefault("creditAmount").getFloat(0.0),
              currencyCode = lineJson.getOrDefault("currencyCode").getStr("BGN"),
              description = lineJson.getOrDefault("description").getStr(""),
              lineOrder = i,
              journalEntryId = entry.id,
              accountId = lineJson["accountId"].getBiggestInt()
            )
            line.counterpartId = lineCounterpartId
            line.vatRateId = vatRateId
            db.insert(line)

        resp Http201, {"Content-Type": "application/json"}, $toJson(entry)
      except:
        resp Http400, {"Content-Type": "application/json"}, $(%*{
          "error": "Грешка при създаване: " & getCurrentExceptionMsg()
        })
      finally:
        close(db)

    post "/api/journal-entries/@id/post":
      let entryId = parseInt(@"id")
      let db = openDb()
      try:
        var entry = newJournalEntry()
        db.select(entry, "id = $1", entryId)
        entry.isPosted = true
        entry.postedAt = some(now())
        entry.updatedAt = now()
        db.update(entry)
        resp Http200, {"Content-Type": "application/json"}, $toJson(entry)
      except:
        resp Http404, {"Content-Type": "application/json"}, $(%*{
          "error": "Записът не е намерен"
        })
      finally:
        close(db)

    post "/api/journal-entries/@id/unpost":
      let entryId = parseInt(@"id")
      let db = openDb()
      try:
        var entry = newJournalEntry()
        db.select(entry, "id = $1", entryId)
        entry.isPosted = false
        entry.postedAt = none(DateTime)
        entry.updatedAt = now()
        db.update(entry)
        resp Http200, {"Content-Type": "application/json"}, $toJson(entry)
      except:
        resp Http404, {"Content-Type": "application/json"}, $(%*{
          "error": "Записът не е намерен"
        })
      finally:
        close(db)

    delete "/api/journal-entries/@id":
      let entryId = parseInt(@"id")
      let db = openDb()
      try:
        var entry = newJournalEntry()
        db.select(entry, "id = $1", entryId)
        if entry.isPosted:
          resp Http400, {"Content-Type": "application/json"}, $(%*{
            "error": "Не може да изтриете осчетоводен запис"
          })
        else:
          # Delete entry lines first
          db.exec(sql"""DELETE FROM "EntryLine" WHERE "journalEntryId" = ?""", entryId)
          db.delete(entry)
          resp Http200, {"Content-Type": "application/json"}, $(%*{
            "success": true
          })
      except:
        resp Http404, {"Content-Type": "application/json"}, $(%*{
          "error": "Записът не е намерен"
        })
      finally:
        close(db)

  return journalRouter
