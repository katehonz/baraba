import orm/orm
import lowdb/postgres
import ../models/company
import std/[times]

proc getDb(): DbConn =
  open("localhost", "postgres", "pas+123", "jesterac")

proc checkCompanies*() =
  let db = getDb()
  
  # Get all companies
  var companies = findAll(Company, db)
  echo "Found ", companies.len, " companies in database:"
  for company in companies:
    echo "- ID: ", company.id, ", Name: ", company.name, ", EIK: ", company.eik
  
  db.close()

when isMainModule:
  checkCompanies()