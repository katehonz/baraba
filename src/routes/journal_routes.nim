import std/[json, strutils, options, times, strformat]
import jester
import orm/orm

import ../models/journal
import ../db/config
import ../utils/json_utils

proc journalRoutes*(): auto =
  router journalRouter:
    # Logic from baraba.nim, adapted for pool
    get "/api/journal-entries":
      let companyId = request.params.getOrDefault("companyId", "0")
      let db = getDbConn()
      try:
        var entries: seq[JournalEntry]
        if companyId != "0":
          entries = findWhere(JournalEntry, db, "company_id = $1 ORDER BY document_date DESC", companyId)
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

    # Logic from baraba.nim, adapted for pool
    post "/api/journal-entries":
      let body = parseJson(request.body)
      let db = getDbConn()
      try:
        var entry = newJournalEntry(
          document_number = body.getOrDefault("documentNumber").getStr(""),
          description = body.getOrDefault("description").getStr(""),
          total_amount = body.getOrDefault("totalAmount").getFloat(0.0),
          company_id = body["companyId"].getBiggestInt(),
          created_by_id = body.getOrDefault("createdById").getBiggestInt(1)
        )
        save(entry, db)

        # This is a simplified version from baraba.nim, the original file had line item insertion
        # which is more complex and requires more context on the models.
        # For now, keeping it simple.

        resp Http201, {"Content-Type": "application/json"}, $toJson(entry)
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