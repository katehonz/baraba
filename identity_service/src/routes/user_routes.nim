import std/[json, strutils, times]
import jester
import orm/orm
import baraba_shared/db/config
import baraba_shared/models/user
import baraba_shared/utils/[json_utils, security]
import services/auth

proc userRoutes*(): auto =
  router userRouter:
    get "/api/users":
      withDb:
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

    post "/api/users":
      withDb:
        let body = parseJson(request.body)
        let user = createUser(db,
          body["username"].getStr(),
          body["email"].getStr(),
          body["password"].getStr(),
          body.getOrDefault("groupId").getInt(0)
        )
        resp Http201, {"Content-Type": "application/json"}, $toJson(user)

    put "/api/users/@id":
      withDb:
        let id = parseInt(@"id")
        let body = parseJson(request.body)
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

    delete "/api/users/@id":
      withDb:
        let id = parseInt(@"id")
        let userOpt = find(User, id, db)
        if userOpt.isNone:
          resp Http404, {"Content-Type": "application/json"}, """{"error": "User not found"}"""
          return

        deleteById(User, id, db)
        resp Http200, {"Content-Type": "application/json"}, """{"success": true}"""

    post "/api/users/@id/reset-password":
      withDb:
        let id = parseInt(@"id")
        let body = parseJson(request.body)
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

  return userRouter