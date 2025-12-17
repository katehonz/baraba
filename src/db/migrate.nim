## Database migration script
## Run this to create/update all tables

import orm/orm
import lowdb/postgres
import std/[times, os]
import ../models/[user, currency, company, account, counterpart, vatrate, journal, exchangerate, audit_log, fixed_asset_category, fixed_asset, depreciation_journal, bank_profile]

proc getDb(): DbConn =
  open("localhost", "postgres", "pas+123", "jesterac")

proc runMigration*() =
  let db = getDb()
  echo "Starting migration..."
  db.createTable(User)
  db.createTable(Currency)
  db.createTable(Company)
  db.createTable(Account)
  db.createTable(Counterpart)
  db.createTable(VatRate)
  db.createTable(JournalEntry)
  db.createTable(EntryLine)
  db.createTable(ExchangeRate)
  db.createTable(AuditLog)
  db.createTable(FixedAssetCategory)
  db.createTable(FixedAsset)
  db.createTable(DepreciationJournal)
  db.createTable(BankProfile)
  echo "Migration finished."
  db.close()

when isMainModule:
  runMigration()
