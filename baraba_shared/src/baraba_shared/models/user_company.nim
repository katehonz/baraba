import std/[times, options]
import orm/orm

type
  UserCompany* = object of Model
    user_id*: int64
    company_id*: string  # UUID from companies table
    is_default*: bool
    inserted_at*: DateTime
    updated_at*: DateTime

proc newUserCompany*(
  user_id: int64 = 0,
  company_id = "",
  is_default = false
): UserCompany =
  UserCompany(
    id: 0,
    user_id: user_id,
    company_id: company_id,
    is_default: is_default,
    inserted_at: now(),
    updated_at: now()
  )
