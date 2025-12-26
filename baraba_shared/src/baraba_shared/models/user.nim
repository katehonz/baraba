import std/[times, options]
import orm/orm

type
  UserGroup* = object of Model
    name*: string
    description*: string
    can_create_companies*: bool
    can_edit_companies*: bool
    can_delete_companies*: bool
    can_manage_users*: bool
    can_view_reports*: bool
    can_post_entries*: bool
    created_at*: DateTime

  # NimUser uses nim_users table (separate from Phoenix users table)
  NimUser* = object of Model
    username*: string
    email*: string
    password*: string
    salt*: string
    first_name*: string
    last_name*: string
    is_active*: bool
    group_id*: int64
    document_period_start*: Option[DateTime]
    document_period_end*: Option[DateTime]
    document_period_active*: bool
    accounting_period_start*: Option[DateTime]
    accounting_period_end*: Option[DateTime]
    accounting_period_active*: bool
    vat_period_start*: Option[DateTime]
    vat_period_end*: Option[DateTime]
    vat_period_active*: bool
    recovery_code_hash*: string
    recovery_code_created_at*: Option[DateTime]
    created_at*: DateTime
    updated_at*: DateTime

  # Alias for backward compatibility
  User* = NimUser

proc newUserGroup*(
  name = "",
  description = "",
  can_create_companies = false,
  can_edit_companies = false,
  can_delete_companies = false,
  can_manage_users = false,
  can_view_reports = false,
  can_post_entries = false
): UserGroup =
  UserGroup(
    id: 0,
    name: name,
    description: description,
    can_create_companies: can_create_companies,
    can_edit_companies: can_edit_companies,
    can_delete_companies: can_delete_companies,
    can_manage_users: can_manage_users,
    can_view_reports: can_view_reports,
    can_post_entries: can_post_entries,
    created_at: now()
  )

proc newNimUser*(
  username = "",
  email = "",
  password = "",
  salt = "",
  first_name = "",
  last_name = "",
  is_active = true,
  group_id: int64 = 0
): NimUser =
  NimUser(
    id: 0,
    username: username,
    email: email,
    password: password,
    salt: salt,
    first_name: first_name,
    last_name: last_name,
    is_active: is_active,
    group_id: group_id,
    document_period_active: false,
    accounting_period_active: false,
    vat_period_active: false,
    recovery_code_hash: "",
    created_at: now(),
    updated_at: now()
  )

# Alias for backward compatibility
proc newUser*(
  username = "",
  email = "",
  password = "",
  salt = "",
  first_name = "",
  last_name = "",
  is_active = true,
  group_id: int64 = 0
): NimUser = newNimUser(username, email, password, salt, first_name, last_name, is_active, group_id)
