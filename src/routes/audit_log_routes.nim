import std/[json, strutils, asyncfutures]
import norm/postgres
import ../db/config
import ../models/audit_log

proc getAuditLogs*(companyId: int, fromDate: string, toDate: string, search: string, action: string, offset: int, limit: int): Future[string] {.async.} =
  let db = await openDb()
  var whereClause = "1 = 1"
  var params: seq[string] = @[]

  if companyId > 0:
    whereClause.add(" AND company_id = $" & $(params.len + 1))
    params.add($companyId)
  
  if fromDate.len > 0:
    whereClause.add(" AND created_at >= $" & $(params.len + 1))
    params.add(fromDate)
  
  if toDate.len > 0:
    whereClause.add(" AND created_at <= $" & $(params.len + 1))
    params.add(toDate)
  
  if search.len > 0:
    whereClause.add(" AND (username ILIKE $" & $(params.len + 1) & " OR details ILIKE $" & $(params.len + 1) & ")")
    params.add("%" & search & "%")

  if action.len > 0:
    whereClause.add(" AND action = $" & $(params.len + 1))
    params.add(action)

  let logs = await db.getAll(AuditLog, whereClause, params, "created_at DESC", limit, offset)
  let totalCount = await db.count(AuditLog, whereClause, params)

  return %*{"logs": logs, "totalCount": totalCount, "hasMore": (offset + logs.len) < totalCount}

proc getAuditLogStats*(companyId: int, days: int): Future[string] {.async.} =
  let db = await openDb()
  let query = sql"""
    SELECT action, COUNT(*) as count
    FROM "AuditLog"
    WHERE company_id = $1 AND created_at >= NOW() - INTERVAL '$2 days'
    GROUP BY action
    ORDER BY count DESC
  """
  let rows = await db.getAllRows(query, companyId, days)
  
  var stats = newJArray()
  for row in rows:
    stats.add(%*{"action": row[0], "count": parseInt(row[1])})

  return $stats

proc getMonthlyTransactionStats*(companyId: int, fromYear: int, fromMonth: int, toYear: int, toMonth: int): Future[string] {.async.} =
  let db = await openDb()
  let query = sql"""
    SELECT
      EXTRACT(YEAR FROM je.document_date) as year,
      EXTRACT(MONTH FROM je.document_date) as month,
      TO_CHAR(je.document_date, 'Month') as month_name,
      COUNT(DISTINCT je.id) as total_entries,
      COUNT(DISTINCT CASE WHEN je.is_posted THEN je.id END) as posted_entries,
      COUNT(el.id) as total_entry_lines,
      COUNT(CASE WHEN je.is_posted THEN el.id END) as posted_entry_lines,
      SUM(je.total_amount) as total_amount,
      SUM(je.total_vat_amount) as vat_amount
    FROM "JournalEntry" je
    LEFT JOIN "EntryLine" el ON el.journal_entry_id = je.id
    WHERE je.company_id = $1
      AND je.document_date >= MAKE_DATE($2, $3, 1)
      AND je.document_date <= (MAKE_DATE($4, $5, 1) + INTERVAL '1 month - 1 day')
    GROUP BY year, month, month_name
    ORDER BY year, month
  """
  let rows = await db.getAllRows(query, companyId, fromYear, fromMonth, toYear, toMonth)
  
  var stats = newJArray()
  for row in rows:
    stats.add(%*{
      "year": parseInt(row[0]),
      "month": parseInt(row[1]),
      "monthName": row[2].strip(),
      "totalEntries": parseInt(row[3]),
      "postedEntries": parseInt(row[4]),
      "totalEntryLines": parseInt(row[5]),
      "postedEntryLines": parseInt(row[6]),
      "totalAmount": parseFloat(row[7]),
      "vatAmount": parseFloat(row[8]),
    })

  return $stats
