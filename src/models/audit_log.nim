import std/times
import orm/orm

type
  AuditLog* = object of Model
    company_id*: int64
    user_id*: int64
    username*: string
    user_role*: string
    action*: string
    entity_type*: string
    entity_id*: string
    details*: string
    ip_address*: string
    user_agent*: string
    success*: bool
    error_message*: string
    created_at*: DateTime

proc newAuditLog*(
  company_id: int64 = 0,
  user_id: int64 = 0,
  username: string = "",
  user_role: string = "",
  action: string = "",
  entity_type: string = "",
  entity_id: string = "",
  details: string = "",
  ip_address: string = "",
  user_agent: string = "",
  success: bool = true,
  error_message: string = "",
): AuditLog =
  AuditLog(
    id: 0,
    company_id: company_id,
    user_id: user_id,
    username: username,
    user_role: user_role,
    action: action,
    entity_type: entity_type,
    entity_id: entity_id,
    details: details,
    ip_address: ip_address,
    user_agent: user_agent,
    success: success,
    error_message: error_message,
    created_at: now()
  )
