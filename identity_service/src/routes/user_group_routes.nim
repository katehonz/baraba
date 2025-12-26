import std/[json, strutils]
import jester
import orm/orm
import baraba_shared/db/config
import baraba_shared/models/user
import baraba_shared/utils/json_utils

proc userGroupRoutes*(): auto =
  router userGroupRouter:
    get "/api/user-groups":
      withDb:
        let groups = findAll(UserGroup, db)
        resp Http200, {"Content-Type": "application/json"}, $toJsonArray(groups)

  return userGroupRouter