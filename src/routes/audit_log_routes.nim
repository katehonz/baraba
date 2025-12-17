import std/[json, strutils, times]
import orm/orm
import ../db/config
import ../models/audit_log

proc getAuditLogs*(companyId: int, fromDate: string, toDate: string, search: string, action: string, offset: int, limit: int): string =
  let db = getDbConn()
  defer: releaseDbConn(db)

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
    whereClause.add(" AND (username ILIKE $" & $paramIdx & " OR details ILIKE $" & $(paramIdx+1) & ")")
    args.add("%" & search & "%")
    args.add("%" & search & "%")
    inc paramIdx
    inc paramIdx

  if action.len > 0:
    whereClause.add(" AND action = $" & $paramIdx)
    args.add(action)
    inc paramIdx

  let logs = findWhere(AuditLog, db, whereClause & " ORDER BY created_at DESC LIMIT " & $limit & " OFFSET " & $offset, args)

  # Get total count
  var totalCount = 0
  let countQuery = "SELECT COUNT(*) FROM audit_logs WHERE " & whereClause
  let countRows = rawQuery(db, countQuery, args)
  if countRows.len > 0 and countRows[0].len > 0:
    totalCount = parseInt($countRows[0][0])


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

  let query = """
    SELECT action, COUNT(*) as count
    FROM audit_logs
    WHERE company_id = $1 AND created_at >= NOW() - CAST($2 || ' days' as INTERVAL)
    GROUP BY action
    ORDER BY count DESC
  """

  var stats = newJArray()
  for row in rawQuery(db, query, $companyId, $days):
    stats.add(%*{"action": $row[0], "count": parseInt($row[1])})

  return $stats

proc getMonthlyTransactionStats*(companyId: int, fromYear: int, fromMonth: int, toYear: int, toMonth: int): string =
  let db = getDbConn()
  defer: releaseDbConn(db)

  let query = """
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
    FROM journal_entries je
    LEFT JOIN entry_lines el ON el.journal_entry_id = je.id
    WHERE je.company_id = $1
      AND je.document_date >= MAKE_DATE($2, $3, 1)
      AND je.document_date <= (MAKE_DATE($4, $5, 1) + INTERVAL '1 month' - INTERVAL '1 day')::date
    GROUP BY year, month, month_name
    ORDER BY year, month
  """

  var stats = newJArray()
  for row in rawQuery(db, query, $companyId, $fromYear, $fromMonth, $toYear, $toMonth):
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
