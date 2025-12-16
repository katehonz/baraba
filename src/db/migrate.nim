## Database migration script
## Run this to create/update all tables

import norm/[model, postgres]
import std/[times, os]
import ../models/[user, currency, company, account, counterpart, vatrate, journal, exchangerate, audit_log, fixed_asset_category, fixed_asset, depreciation_journal, bank_profile]

proc getDb(): DbConn =
  open("localhost", "postgres", "pas+123", "jesterac")

proc runMigration*() =
  let db = getDb()
  echo "Starting migration..."
  db.createTables(newUser())
  db.createTables(newCurrency())
  db.createTables(newCompany())
  db.createTables(newAccount())
  db.createTables(newCounterpart())
  db.createTables(newVatRate())
  db.createTables(newJournalEntry())
  db.createTables(newEntryLine())
  db.createTables(newExchangeRate())
  db.createTables(newAuditLog())
  db.createTables(newFixedAssetCategory())
  db.createTables(newFixedAsset())
  db.createTables(newDepreciationJournal())
  db.createTables(newBankProfile())
  echo "Migration finished."
  db.close()

when isMainModule:
  runMigration()
