import std/[json, strutils]
import jester
import orm/orm

import ../db/config
import ../models/user
import ../utils/json_utils

proc userGroupRoutes*(): auto =
  router userGroupRouter:
    get "/api/user-groups":
      let db = getDbConn()
      try:
        let groups = findAll(UserGroup, db)
        resp Http200, {"Content-Type": "application/json"}, $toJsonArray(groups)
      finally:
        releaseDbConn(db)

  return userGroupRouter
