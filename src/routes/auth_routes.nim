import std/[json, options, strutils]
import jester
import ../services/auth
import ../utils/json_utils
import ../models/user
import ../db/config

proc authRoutes*(): auto =
  router authRouter:
    # Logic from baraba.nim, adapted for new service signature
    post "/api/auth/login":
      let body = parseJson(request.body)
      let username = body["username"].getStr()
      let password = body["password"].getStr()
      
      let db = getDbConn()
      let userOpt = authenticateUser(db, username, password)
      releaseDbConn(db) # Release connection as soon as we're done with it

      if userOpt.isSome:
        let user = userOpt.get
        let token = generateToken(user.id, user.username)
        resp Http200, {"Content-Type": "application/json"}, $(%*{
          "token": token,
          "user": {"id": user.id, "username": user.username, "email": user.email}
        })
      else:
        resp Http401, {"Content-Type": "application/json"}, $(%*{"error": "Невалидно потребителско име или парола"})

    # Logic from baraba.nim, adapted for new service signature
    post "/api/auth/register":
      let body = parseJson(request.body)
      let username = body["username"].getStr()
      let email = body["email"].getStr()
      let password = body["password"].getStr()
      let groupId = body.getOrDefault("groupId").getBiggestInt(2)
      
      let db = getDbConn()
      try:
        let user = createUser(db, username, email, password, groupId)
        let token = generateToken(user.id, user.username)
        resp Http201, {"Content-Type": "application/json"}, $(%*{
          "token": token,
          "user": {"id": user.id, "username": user.username, "email": user.email}
        })
      except:
        resp Http400, {"Content-Type": "application/json"}, $(%*{"error": getCurrentExceptionMsg()})
      finally:
        releaseDbConn(db)

    # Logic from original auth_routes.nim, adapted for pool
    get "/api/auth/me":
      let authHeader = request.headers.getOrDefault("Authorization")
      if authHeader.len == 0 or not authHeader.startsWith("Bearer "):
        resp Http401, {"Content-Type": "application/json"}, $(%*{"error": "Липсва токен за автентикация"})
        return

      let token = authHeader[7..^1]
      let (valid, userId, username) = verifyToken(token)
      if not valid:
        resp Http401, {"Content-Type": "application/json"}, $(%*{"error": "Невалиден токен"})
        return

      let db = getDbConn()
      let userOpt = getUserById(db, userId)
      releaseDbConn(db)

      if userOpt.isSome:
        let user = userOpt.get
        resp Http200, {"Content-Type": "application/json"}, $(%*{
          "id": user.id,
          "username": user.username,
          "email": user.email
        })
      else:
        resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Потребителят не е намерен"})

  return authRouter