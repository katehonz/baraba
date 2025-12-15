import std/[json, strutils, times]
import norm/postgres
import ../db/config
import ../models/audit_log

proc getAuditLogs*(companyId: int, fromDate: string, toDate: string, search: string, action: string, offset: int, limit: int): string =
  let db = getDbConn()
  defer: releaseDbConn(db)

  var logs: seq[AuditLog] = @[]
  var whereClause = "1=1"
  var args: seq[string] = @[]
  var paramIdx = 1

  if companyId > 0:
    whereClause.add(" AND company_id = $" & $paramIdx)
    args.add($companyId)
    inc paramIdx

  if fromDate.len > 0:
    whereClause.add(" AND created_at >= $" & $paramIdx)
    args.add(fromDate)
    inc paramIdx

  if toDate.len > 0:
    whereClause.add(" AND created_at <= $" & $paramIdx)
    args.add(toDate)
    inc paramIdx

  if search.len > 0:
    whereClause.add(" AND (username ILIKE $" & $paramIdx & " OR details ILIKE $" & $paramIdx & ")")
    args.add("%" & search & "%")
    inc paramIdx

  if action.len > 0:
    whereClause.add(" AND action = $" & $paramIdx)
    args.add(action)
    inc paramIdx

  # Build query with ORDER BY, LIMIT, OFFSET
  let fullWhere = whereClause & " ORDER BY created_at DESC LIMIT " & $limit & " OFFSET " & $offset

  logs = @[newAuditLog()]
  case args.len
  of 0:
    db.select(logs, fullWhere)
  of 1:
    db.select(logs, fullWhere, args[0])
  of 2:
    db.select(logs, fullWhere, args[0], args[1])
  of 3:
    db.select(logs, fullWhere, args[0], args[1], args[2])
  of 4:
    db.select(logs, fullWhere, args[0], args[1], args[2], args[3])
  else:
    db.select(logs, fullWhere, args[0], args[1], args[2], args[3], args[4])

  if logs.len == 1 and logs[0].id == 0:
    logs = @[]

  # Get total count using raw query
  var totalCount = logs.len
  let countQuery = sql("SELECT COUNT(*) FROM \"AuditLog\" WHERE " & whereClause)
  try:
    var countRows: seq[Row]
    case args.len
    of 0:
      countRows = db.getAllRows(countQuery)
    of 1:
      countRows = db.getAllRows(countQuery, args[0])
    of 2:
      countRows = db.getAllRows(countQuery, args[0], args[1])
    of 3:
      countRows = db.getAllRows(countQuery, args[0], args[1], args[2])
    of 4:
      countRows = db.getAllRows(countQuery, args[0], args[1], args[2], args[3])
    else:
      countRows = db.getAllRows(countQuery, args[0], args[1], args[2], args[3], args[4])
    if countRows.len > 0 and countRows[0].len > 0:
      totalCount = parseInt($countRows[0][0])
  except:
    discard

  var logsJson = newJArray()
  for log in logs:
    logsJson.add(%*{
      "id": log.id,
      "companyId": log.company_id,
      "userId": log.user_id,
      "username": log.username,
      "userRole": log.user_role,
      "action": log.action,
      "entityType": log.entity_type,
      "entityId": log.entity_id,
      "details": log.details,
      "ipAddress": log.ip_address,
      "userAgent": log.user_agent,
      "success": log.success,
      "errorMessage": log.error_message,
      "createdAt": $log.created_at
    })

  return $(%*{"logs": logsJson, "totalCount": totalCount, "hasMore": (offset + logs.len) < totalCount})

proc getAuditLogStats*(companyId: int, days: int): string =
  let db = getDbConn()
  defer: releaseDbConn(db)

  let query = sql"""
    SELECT action, COUNT(*) as count
    FROM "AuditLog"
    WHERE company_id = ? AND created_at >= NOW() - INTERVAL '30 days'
    GROUP BY action
    ORDER BY count DESC
  """

  var stats = newJArray()
  for row in db.getAllRows(query, companyId):
    stats.add(%*{"action": $row[0], "count": parseInt($row[1])})

  return $stats

proc getMonthlyTransactionStats*(companyId: int, fromYear: int, fromMonth: int, toYear: int, toMonth: int): string =
  let db = getDbConn()
  defer: releaseDbConn(db)

  let query = sql"""
    SELECT
      EXTRACT(YEAR FROM je.document_date)::int as year,
      EXTRACT(MONTH FROM je.document_date)::int as month,
      TO_CHAR(je.document_date, 'Month') as month_name,
      COUNT(DISTINCT je.id)::int as total_entries,
      COUNT(DISTINCT CASE WHEN je.is_posted THEN je.id END)::int as posted_entries,
      COUNT(el.id)::int as total_entry_lines,
      COUNT(CASE WHEN je.is_posted THEN el.id END)::int as posted_entry_lines,
      COALESCE(SUM(el.debit_amount), 0) as total_amount,
      0 as vat_amount
    FROM "JournalEntry" je
    LEFT JOIN "EntryLine" el ON el.journal_entry_id = je.id
    WHERE je.company_id = ?
      AND je.document_date >= MAKE_DATE(?, ?, 1)
      AND je.document_date <= (MAKE_DATE(?, ?, 1) + INTERVAL '1 month' - INTERVAL '1 day')::date
    GROUP BY year, month, month_name
    ORDER BY year, month
  """

  var stats = newJArray()
  for row in db.getAllRows(query, companyId, fromYear, fromMonth, toYear, toMonth):
    stats.add(%*{
      "year": parseInt($row[0]),
      "month": parseInt($row[1]),
      "monthName": ($row[2]).strip(),
      "totalEntries": parseInt($row[3]),
      "postedEntries": parseInt($row[4]),
      "totalEntryLines": parseInt($row[5]),
      "postedEntryLines": parseInt($row[6]),
      "totalAmount": $row[7],
      "vatAmount": $row[8]
    })

  return $stats
