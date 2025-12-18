import std/[times, options]
import orm/orm

type
  SystemSettings* = object of Model
    setting_key*: string           # Unique key for the setting
    setting_value*: string         # JSON or plain text value
    setting_type*: string          # STRING, INTEGER, BOOLEAN, JSON
    category*: string              # SMTP, GENERAL, SECURITY, etc.
    description*: string           # Human-readable description
    is_encrypted*: bool            # Whether the value is encrypted (for passwords)
    company_id*: Option[int64]     # None = global setting, Some = company-specific
    created_at*: DateTime
    updated_at*: DateTime

proc newSystemSettings*(
  setting_key = "",
  setting_value = "",
  setting_type = "STRING",
  category = "GENERAL",
  description = "",
  is_encrypted = false,
  company_id = none(int64)
): SystemSettings =
  result = SystemSettings(
    id: 0,
    setting_key: setting_key,
    setting_value: setting_value,
    setting_type: setting_type,
    category: category,
    description: description,
    is_encrypted: is_encrypted,
    company_id: company_id,
    created_at: now(),
    updated_at: now()
  )

# Default SMTP settings keys
const
  SMTP_HOST* = "smtp_host"
  SMTP_PORT* = "smtp_port"
  SMTP_USERNAME* = "smtp_username"
  SMTP_PASSWORD* = "smtp_password"
  SMTP_FROM_EMAIL* = "smtp_from_email"
  SMTP_FROM_NAME* = "smtp_from_name"
  SMTP_USE_TLS* = "smtp_use_tls"
  SMTP_USE_SSL* = "smtp_use_ssl"
  SMTP_ENABLED* = "smtp_enabled"
