import std/[json, options, strutils]
import jester
import ../services/auth
import ../utils/json_utils
import ../models/user

proc authRoutes*(): auto =
  router authRouter:
    post "/api/auth/login":
      let body = parseJson(request.body)
      let username = body["username"].getStr()
      let password = body["password"].getStr()

      let userOpt = authenticateUser(username, password)
      if userOpt.isSome:
        let user = userOpt.get
        let token = generateToken(user.id, user.username)
        resp Http200, {"Content-Type": "application/json"}, $(%*{
          "token": token,
          "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "firstName": user.firstName,
            "lastName": user.lastName
          }
        })
      else:
        resp Http401, {"Content-Type": "application/json"}, $(%*{
          "error": "Невалидно потребителско име или парола"
        })

    post "/api/auth/register":
      let body = parseJson(request.body)
      let username = body["username"].getStr()
      let email = body["email"].getStr()
      let password = body["password"].getStr()
      let groupId = body.getOrDefault("groupId").getBiggestInt(2)  # Default to user group

      try:
        let user = createUser(username, email, password, groupId)
        let token = generateToken(user.id, user.username)
        resp Http201, {"Content-Type": "application/json"}, $(%*{
          "token": token,
          "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email
          }
        })
      except:
        resp Http400, {"Content-Type": "application/json"}, $(%*{
          "error": "Грешка при регистрация: " & getCurrentExceptionMsg()
        })

    get "/api/auth/me":
      let authHeader = request.headers.getOrDefault("Authorization")
      if authHeader.len == 0 or not authHeader.startsWith("Bearer "):
        resp Http401, {"Content-Type": "application/json"}, $(%*{
          "error": "Липсва токен за автентикация"
        })
      else:
        let token = authHeader[7..^1]
        let (valid, userId, username) = verifyToken(token)
        if valid:
          let userOpt = getUserById(userId)
          if userOpt.isSome:
            let user = userOpt.get
            resp Http200, {"Content-Type": "application/json"}, $(%*{
              "id": user.id,
              "username": user.username,
              "email": user.email,
              "firstName": user.firstName,
              "lastName": user.lastName,
              "isActive": user.isActive,
              "groupId": user.groupId
            })
          else:
            resp Http404, {"Content-Type": "application/json"}, $(%*{
              "error": "Потребителят не е намерен"
            })
        else:
          resp Http401, {"Content-Type": "application/json"}, $(%*{
            "error": "Невалиден токен"
          })

  return authRouter
