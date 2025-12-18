## Migration: Add representative_type column to companies table
## Run: nim c -r src/db/migrations/add_representative_type.nim

import lowdb/postgres

proc getDb(): DbConn =
  open("localhost", "postgres", "pas+123", "jesterac")

proc migrate*() =
  let db = getDb()
  echo "Running migration: Add representative_type to companies..."

  # Check if column already exists
  let checkQuery = """
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'companies'
    AND column_name = 'representative_type'
  """

  let exists = db.getAllRows(sql(checkQuery))

  if exists.len > 0:
    echo "Column representative_type already exists. Skipping."
  else:
    # Add the column with default value 'MANAGER'
    let alterQuery = """
      ALTER TABLE companies
      ADD COLUMN representative_type VARCHAR(20) NOT NULL DEFAULT 'MANAGER'
    """
    try:
      db.exec(sql(alterQuery))
      echo "Successfully added representative_type column to companies table."
    except Exception as e:
      echo "Error adding column: ", e.msg

  db.close()
  echo "Migration complete."

when isMainModule:
  migrate()
