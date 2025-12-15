import norm/postgres

const
  DbHost* = "localhost"
  DbUser* = "postgres"
  DbPassword* = "pas+123"
  DbName* = "jesterac"

proc openDb*(): DbConn =
  ## Opens a new database connection
  open(DbHost, DbUser, DbPassword, DbName)
