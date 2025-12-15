## Database migration script
## Run this to create/update all tables

import norm/[model, postgres]
import std/times
import ../models/[user, currency, company, account, counterpart, vatrate, journal, exchangerate]
import config

proc runMigrations*() =
  echo "Starting database migrations..."

  let db = openDb()
  try:
    # Create tables in dependency order
    echo "Creating UserGroup table..."
    db.createTables(newUserGroup())

    echo "Creating User table..."
    db.createTables(newUser())

    echo "Creating Currency table..."
    db.createTables(newCurrency())

    echo "Creating Company table..."
    db.createTables(newCompany())

    echo "Creating Account table..."
    db.createTables(newAccount())

    echo "Creating Counterpart table..."
    db.createTables(newCounterpart())

    echo "Creating VatRate table..."
    db.createTables(newVatRate())

    echo "Creating JournalEntry table..."
    db.createTables(newJournalEntry())

    echo "Creating EntryLine table..."
    db.createTables(newEntryLine())

    echo "Creating ExchangeRate table..."
    db.createTables(newExchangeRate())
  finally:
    close(db)

  echo "All migrations completed successfully!"

proc seedInitialData*() =
  echo "Seeding initial data..."

  let db = openDb()
  try:
    # Try to insert admin group - will fail if exists due to unique constraint
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
