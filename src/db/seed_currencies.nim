import orm/orm
import lowdb/postgres
import ../models/currency
import std/[times]

proc getDb(): DbConn =
  open("localhost", "postgres", "pas+123", "jesterac")

proc seedCurrencies*() =
  let db = getDb()
  
  # Check if currencies already exist
  var existingCurrencies = findAll(Currency, db)
  if existingCurrencies.len > 0:
    echo "Currencies already exist in database."
    db.close()
    return
  
  # Create BGN currency
  var bgn = newCurrency(
    code = "BGN",
    name = "Bulgarian Lev",
    name_bg = "Български лев",
    symbol = "лв.",
    decimal_places = 2,
    is_active = true,
    is_base_currency = true,
    bnb_code = "BGN"
  )
  
  # Create EUR currency
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
  
  # Create USD currency
  var usd = newCurrency(
    code = "USD",
    name = "US Dollar",
    name_bg = "Долар",
    symbol = "$",
    decimal_places = 2,
    is_active = true,
    is_base_currency = false,
    bnb_code = "USD"
  )
  
  # Save currencies to database
  save(bgn, db)
  save(eur, db)
  save(usd, db)
  
  echo "Successfully added 3 currencies to the database."
  db.close()

when isMainModule:
  seedCurrencies()