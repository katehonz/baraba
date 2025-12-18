# src/cli.nim
# CLI for baraba application tasks, starting with migrations.

import std/[os, strutils]
import lowdb/postgres
import orm/migrations
import db/config
import orm/logger as l

proc showUsage() =
  echo "Baraba CLI"
  echo ""
  echo "Usage:"
  echo "  nim c -r src/cli.nim <command> [args]"
  echo ""
  echo "Commands:"
  echo "  migrate              Apply pending database migrations"
  echo "  baseline <version>   Create a baseline for an existing database"
  echo ""

proc main() =
  let args = commandLineParams()

  if args.len == 0:
    showUsage()
    return

  let command = args[0].toLowerAscii()

  var db: DbConn
  try:
    # Use the non-pooled connection for simplicity in a CLI tool
    db = openDb() 

    case command:
    of "migrate":
      # The migrations are in src/db/migrations
      applyMigrations(db, "src/db/migrations")
    of "baseline":
      if args.len < 2:
        l.error("Baseline command requires a version number.")
        showUsage()
        quit(1)
      let version = parseInt(args[1])
      baselineMigration(db, version, "src/db/migrations")
    else:
      l.error("Unknown command: " & command)
      showUsage()
      quit(1)

  except Exception as e:
    l.error(e.msg)
    quit(1)
  finally:
    if db != nil:
      db.close()

main()
