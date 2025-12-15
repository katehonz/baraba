## Database migration script
## Run this to create/update all tables

import norm/[model, postgres]
import std/times
import ../models/[user, currency, company, account, counterpart, vatrate, journal, exchangerate, audit_log, fixed_asset_category]

proc runMigration*() =
  let db = getDbConn()
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
  echo "Migration finished."
  db.close()

proc seedInitialData*() =
  echo "Seeding initial data..."

  let db = openDb()
  try:
    # Try to insert admin group - will fail if exists due to unique constraint
    # Create admin group
    var adminGroupId: int64 = 0
    try:
      var adminGroup = newUserGroup(
        name = "Администратори",
        description = "Пълен достъп до системата",
        can_create_companies = true,
        can_edit_companies = true,
        can_delete_companies = true,
        can_manage_users = true,
        can_view_reports = true,
        can_post_entries = true
      )
      db.insert(adminGroup)
      adminGroupId = adminGroup.id
      echo "Created admin group (id: " & $adminGroup.id & ")"

      var userGroup = newUserGroup(
        name = "Потребители",
        description = "Стандартен достъп",
        can_create_companies = false,
        can_edit_companies = false,
        can_delete_companies = false,
        can_manage_users = false,
        can_view_reports = true,
        can_post_entries = true
      )
      db.insert(userGroup)
      echo "Created user group (id: " & $userGroup.id & ")"
    except:
      echo "- User groups already exist, skipping..."
      # Get existing admin group id
      var groups = @[newUserGroup()]
      db.select(groups, "name = $1", "Администратори")
      if groups.len > 0:
        adminGroupId = groups[0].id

    # Create default admin user
    # Default credentials: admin / admin123
    if adminGroupId > 0:
      try:
        var adminUser = newUser(
          username = "admin",
          email = "admin@baraba.local",
          password_hash = hashPassword("admin123"),
          group_id = adminGroupId,
          is_active = true
        )
        db.insert(adminUser)
        echo "Created admin user (username: admin, password: admin123)"
      except:
        echo "- Admin user already exists, skipping..."

    # Try to insert currencies
    try:
      var bgn = newCurrency(
        code = "BGN",
        name = "Bulgarian Lev",
        name_bg = "Български лев",
        symbol = "лв",
        decimal_places = 2,
        is_active = true,
        is_base_currency = true,
        bnb_code = "BGN"
      )
      db.insert(bgn)
      echo "Created BGN currency"

      var eur = newCurrency(
        code = "EUR",
        name = "Euro",
        name_bg = "Евро",
        symbol = "€",
        decimal_places = 2,
        is_active = true,
        is_base_currency = false,
        bnb_code = "EUR"
      )
      db.insert(eur)
      echo "Created EUR currency"

      var usd = newCurrency(
        code = "USD",
        name = "US Dollar",
        name_bg = "Щатски долар",
        symbol = "$",
        decimal_places = 2,
        is_active = true,
        is_base_currency = false,
        bnb_code = "USD"
      )
      db.insert(usd)
      echo "Created USD currency"
    except:
      echo "- Currencies already exist, skipping..."
  finally:
    close(db)

  echo "Initial data seeded!"

when isMainModule:
  runMigrations()
  seedInitialData()
