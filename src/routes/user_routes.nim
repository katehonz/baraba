import std/[json, strutils, times]
import jester
import orm/orm

import ../db/config
import ../models/user
import ../services/auth
import ../utils/json_utils

proc userRoutes*(): auto =
  router userRouter:
    get "/api/users":
      let db = getDbConn()
      try:
        let users = findAll(User, db)
        var usersJson = newJArray()
        for user in users:
          usersJson.add(%*{
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "firstName": user.first_name,
            "lastName": user.last_name,
            "isActive": user.is_active,
            "groupId": user.group_id
          })
        resp Http200, {"Content-Type": "application/json"}, $usersJson
      finally:
        releaseDbConn(db)

    post "/api/users":
      let body = parseJson(request.body)
      let db = getDbConn()
      try:
        let user = createUser(db,
          body["username"].getStr(),
          body["email"].getStr(),
          body["password"].getStr(),
          body.getOrDefault("groupId").getInt(0)
        )
        resp Http201, {"Content-Type": "application/json"}, $toJson(user)
      finally:
        releaseDbConn(db)

    put "/api/users/@id":
      let id = parseInt(@"id")
      let body = parseJson(request.body)
      let db = getDbConn()
      try:
        var userOpt = find(User, id, db)
        if userOpt.isSome:
          var user = userOpt.get()
          if body.hasKey("username"):
            user.username = body["username"].getStr()
          if body.hasKey("email"):
            user.email = body["email"].getStr()
          if body.hasKey("firstName"):
            user.first_name = body["firstName"].getStr()
          if body.hasKey("lastName"):
            user.last_name = body["lastName"].getStr()
          if body.hasKey("groupId"):
            user.group_id = body["groupId"].getInt().int64
          if body.hasKey("isActive"):
            user.is_active = body["isActive"].getBool()
          save(user, db)
          resp Http200, {"Content-Type": "application/json"}, $toJson(user)
        else:
          resp Http404, {"Content-Type": "application/json"}, """{"error": "User not found"}"""
      finally:
        releaseDbConn(db)

    delete "/api/users/@id":
      let id = parseInt(@"id")
      let db = getDbConn()
      try:
        let userOpt = find(User, id, db)
        if userOpt.isNone:
          resp Http404, {"Content-Type": "application/json"}, """{"error": "User not found"}"""
          return

        deleteById(User, id, db)
        resp Http200, {"Content-Type": "application/json"}, """{"success": true}"""
      except:
        resp Http500, {"Content-Type": "application/json"}, """{"error": "Internal server error"}"""
      finally:
        releaseDbConn(db)

    post "/api/users/@id/reset-password":
      let id = parseInt(@"id")
      let body = parseJson(request.body)
      let db = getDbConn()
      try:
        var userOpt = find(User, id, db)
        if userOpt.isSome:
          var user = userOpt.get()
          let newSalt = $epochTime()
          user.password = hashPassword(body["newPassword"].getStr(), newSalt)
          user.salt = newSalt
          save(user, db)
          resp Http200, {"Content-Type": "application/json"}, """{"success": true}"""
        else:
          resp Http404, {"Content-Type": "application/json"}, """{"error": "User not found"}"""
      finally:
        releaseDbConn(db)

  return userRouter
