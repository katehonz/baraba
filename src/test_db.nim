import db_connector/db_postgres

const
  DbHost = "localhost"
  DbUser = "postgres"
  DbPassword = "pas+123"
  DbName = "jesterac"

proc testConnection() =
  echo "Тестване на връзка с PostgreSQL..."
  echo "Host: ", DbHost
  echo "User: ", DbUser
  echo "Database: ", DbName

  try:
    let db = open(DbHost, DbUser, DbPassword, DbName)
    echo "✓ Връзката е успешна!"

    let version = db.getValue(sql"SELECT version()")
    echo "PostgreSQL версия: ", version

    db.close()
    echo "✓ Връзката е затворена."
  except DbError as e:
    echo "✗ Грешка: ", e.msg

when isMainModule:
  testConnection()
