import std/[json, strutils, options, times, os]
import jester
import asynchttpserver
import orm/orm
import baraba_shared/db/config
import baraba_shared/models/user
import baraba_shared/utils/[json_utils, security]
import routes/user_routes
import routes/user_group_routes

# In a real microservice, we might want to copy auth routes here.
# For now, let's create a basic entry point.

settings:
  port = Port(5002)

router identityRouter:
  # Health check
  get "/health":
    resp Http200, {"Content-Type": "application/json"}, $(%*{"status": "ok", "service": "identity-service"})

  # Login route (Migrated logic)
  post "/api/auth/login":
    withDb:
      let body = parseJson(request.body)
      let username = body["username"].getStr()
      let password = body["password"].getStr()

      # Logic from monolithic auth service
      let users = findWhere(User, db, "username = $1 AND is_active = true", username)
      
      if users.len > 0:
        let user = users[0]
        if verifyPassword(password, user.salt, user.password):
          let token = generateToken(user.id, user.username)
          resp Http200, {"Content-Type": "application/json"}, $(%*{
            "token": token,
            "user": {"id": user.id, "username": user.username, "email": user.email}
          })
        else:
          resp Http401, {"Content-Type": "application/json"}, $(%*{"error": "Невалидно потребителско име или парола"})
      else:
        resp Http401, {"Content-Type": "application/json"}, $(%*{"error": "Невалидно потребителско име или парола"})

  # Register route (Migrated logic)
  post "/api/auth/register":
    withDb:
      let body = parseJson(request.body)
      let username = body["username"].getStr()
      let email = body["email"].getStr()
      let password = body["password"].getStr()
      let groupId = body.getOrDefault("groupId").getBiggestInt(2)

      try:
        let user = createUser(db, username, email, password, groupId)
        let token = generateToken(user.id, user.username)
        resp Http201, {"Content-Type": "application/json"}, $(%*{
          "token": token,
          "user": {"id": user.id, "username": user.username, "email": user.email}
        })
      except:
        resp Http400, {"Content-Type": "application/json"}, $(%*{"error": getCurrentExceptionMsg()})

  # Verify token route (Internal use or gateway)
  get "/api/auth/verify":
    let authHeader = request.headers.getOrDefault("Authorization")
    if authHeader.len == 0 or not authHeader.startsWith("Bearer "):
      resp Http401, {"Content-Type": "application/json"}, $(%*{"error": "Missing token"})
    
    let token = authHeader[7..^1]
    let (valid, userId, username) = verifyToken(token)
    
    if valid:
      resp Http200, {"Content-Type": "application/json"}, $(%*{"valid": true, "userId": userId, "username": username})
    else:
      resp Http401, {"Content-Type": "application/json"}, $(%*{"valid": false, "error": "Invalid token"})

  # Get current user info
  get "/api/auth/me":
    let authHeader = request.headers.getOrDefault("Authorization")
    if authHeader.len == 0 or not authHeader.startsWith("Bearer "):
      resp Http401, {"Content-Type": "application/json"}, $(%*{"error": "Липсва токен"})

    let token = authHeader[7..^1]
    let (valid, userId, _) = verifyToken(token)
    if not valid:
      resp Http401, {"Content-Type": "application/json"}, $(%*{"error": "Невалиден токен"})

    withDb:
      let userOpt = getUserById(db, userId)
      if userOpt.isSome:
        let user = userOpt.get
        resp Http200, {"Content-Type": "application/json"}, $(%*{
          "id": user.id, "username": user.username, "email": user.email
        })
      else:
        resp Http404, {"Content-Type": "application/json"}, $(%*{"error": "Потребителят не е намерен"})

# Include user and user group routes
let userRouter = userRoutes()
let userGroupRouter = userGroupRoutes()

# Combine all routers
router combinedRouter:
  # Forward to identityRouter
  extend identityRouter
  # Forward to userRouter
  extend userRouter
  # Forward to userGroupRouter
  extend userGroupRouter

proc main() =
  let p = Port(5002)
  let settings = newSettings(port=p)
  var jester = initJester(combinedRouter, settings=settings)
  
  # Initialize DB connection pool
  try:
    initDbPool()
    echo "Identity Service started on port 5002"
    jester.serve()
  finally:
    closeDbPool()

if isMainModule:
  main()
