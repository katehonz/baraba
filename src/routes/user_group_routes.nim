import std/json
import std/asyncfutures
import ../db/config
import ../models/user

proc getUserGroups*(): Future[string] {.async.} =
  let db = await openDb()
  let groups = await db.getAll(UserGroup)
  return $toJson(groups)
