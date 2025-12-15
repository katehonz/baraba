import std/[json, strutils]
import jester
import norm/postgres

import ../db/config
import ../models/user
import ../utils/json_utils

proc userGroupRoutes*(): auto =
  router userGroupRouter:
    get "/api/user-groups":
      let db = getDbConn()
      try:
        var groups = @[newUserGroup()]
        db.selectAll(groups)
        if groups.len == 1 and groups[0].id == 0:
          groups = @[]
        resp Http200, {"Content-Type": "application/json"}, $toJsonArray(groups)
      finally:
        releaseDbConn(db)

  return userGroupRouter
