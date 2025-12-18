import orm/orm
import lowdb/postgres
import ../models/[company, currency]
import std/[times]

proc getDb(): DbConn =
  open("localhost", "postgres", "pas+123", "jesterac")

proc addDemoData*() =
  let db = getDb()
  
  # Get BGN currency
  var currencies = findWhere(Currency, db, "code = $1", "BGN")
  if currencies.len == 0:
    echo "BGN currency not found. Please ensure currencies are seeded first."
    db.close()
    return
  
  let baseCurrencyId = currencies[0].id
  
  # Check if demo companies already exist (by checking for our specific demo names)
  var demoCompanies = findWhere(Company, db, "name = $1", "Демо ООД")
  if demoCompanies.len > 0:
    echo "Demo companies already exist in the database."
    db.close()
    return
  
  # Create demo companies
  var company1 = newCompany(
    name = "Демо ООД",
    eik = "123456789",
    vat_number = "BG123456789",
    address = "ул. Витоша 1",
    city = "София",
    base_currency_id = baseCurrencyId
  )
  
  var company2 = newCompany(
    name = "Тест ЕАД",
    eik = "987654321",
    vat_number = "BG987654321",
    address = "пл. Славейков 5",
    city = "Пловдив",
    base_currency_id = baseCurrencyId
  )
  
  var company3 = newCompany(
    name = "Пример ООД",
    eik = "555666777",
    address = "бул. България 100",
    city = "Варна",
    base_currency_id = baseCurrencyId
  )
  
  # Save companies to database
  save(company1, db)
  save(company2, db)
  save(company3, db)
  
  echo "Successfully added 3 demo companies to the database."
  db.close()

when isMainModule:
  addDemoData()