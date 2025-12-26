import std/[json, strutils, options, times, os]
import jester
import asynchttpserver
import orm/orm
import baraba_shared/db/config
import baraba_shared/models/user  # Uses NimUser type -> nim_users table
import baraba_shared/models/user_company
import baraba_shared/models/company
import baraba_shared/utils/[json_utils, security]
import services/auth

# Helper to get permissions JSON from user group
proc getPermissionsJson(db: DbConn, groupId: int64): JsonNode =
  let groupOpt = getUserGroup(db, groupId)
  if groupOpt.isSome:
    let g = groupOpt.get
    return %*{
      "canCreateCompanies": g.can_create_companies,
      "canEditCompanies": g.can_edit_companies,
      "canDeleteCompanies": g.can_delete_companies,
      "canManageUsers": g.can_manage_users,
      "canViewReports": g.can_view_reports,
      "canPostEntries": g.can_post_entries,
      "groupName": g.name
    }
  else:
    return %*{
      "canCreateCompanies": false,
      "canEditCompanies": false,
      "canDeleteCompanies": false,
      "canManageUsers": false,
      "canViewReports": false,
      "canPostEntries": false,
      "groupName": "none"
    }

# Helper to check if user is superadmin (group_id = 1)
proc isSuperAdmin(db: DbConn, userId: int): bool =
  let userOpt = getUserById(db, userId)
  if userOpt.isSome:
    return userOpt.get.group_id == 1
  return false

# Helper to get all companies for a user
proc findUserCompaniesByUserId(db: DbConn, userId: int64): seq[UserCompany] =
  findWhere(UserCompany, db, "user_id = $1::bigint", $userId)

# Helper to get all users for a company
proc findUserCompaniesByCompanyId(db: DbConn, companyId: string): seq[UserCompany] =
  findWhere(UserCompany, db, "company_id = $1::uuid", companyId)

# Helper to find a specific user-company link
proc findUserCompanyByUserAndCompany(db: DbConn, userId: int64, companyId: string): Option[UserCompany] =
  let results = findWhere(UserCompany, db, "user_id = $1::bigint AND company_id = $2::uuid", $userId, companyId)
  if results.len > 0:
    some(results[0])
  else:
    none(UserCompany)

# Helper to set a company as default for user (clears other defaults)
proc setUserCompanyAsDefault(db: DbConn, userId: int64, companyId: string) =
  # Clear all defaults for this user
  rawExec(db, "UPDATE user_companies SET is_default = false WHERE user_id = $1::bigint", $userId)
  # Set the new default
  rawExec(db, "UPDATE user_companies SET is_default = true WHERE user_id = $1::bigint AND company_id = $2::uuid", $userId, companyId)

# Helper to get user's companies with full company info
proc getUserCompaniesJson(db: DbConn, userId: int64): JsonNode =
  result = newJArray()
  let userCompanies = findUserCompaniesByUserId(db, userId)
  for uc in userCompanies:
    let companyOpt = findUuid(Company, uc.company_id, db)
    if companyOpt.isSome:
      let c = companyOpt.get
      result.add(%*{
        "id": uc.id,
        "companyId": uc.company_id,
        "isDefault": uc.is_default,
        "company": {
          "id": c.id,
          "name": c.name,
          "eik": c.eik,
          "vatNumber": c.vat_number
        }
      })

settings:
  port = Port(5002)

# CORS headers helper
proc corsHeaders(): RawHeaders =
  @{
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  }

proc corsPreflightHeaders(): RawHeaders =
  @{
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  }

router identityRouter:
  # CORS preflight for all routes
  options "/api/auth/login":
    resp Http200, corsPreflightHeaders(), ""
  options "/api/auth/register":
    resp Http200, corsPreflightHeaders(), ""
  options "/api/auth/verify":
    resp Http200, corsPreflightHeaders(), ""
  options "/api/auth/me":
    resp Http200, corsPreflightHeaders(), ""
  options "/api/auth/profile":
    resp Http200, corsPreflightHeaders(), ""
  options "/api/auth/change-password":
    resp Http200, corsPreflightHeaders(), ""
  options "/api/users":
    resp Http200, corsPreflightHeaders(), ""
  options "/api/users/@id":
    resp Http200, corsPreflightHeaders(), ""
  options "/api/users/@id/reset-password":
    resp Http200, corsPreflightHeaders(), ""
  options "/api/user-groups":
    resp Http200, corsPreflightHeaders(), ""
  options "/api/auth/check-permission":
    resp Http200, corsPreflightHeaders(), ""
  options "/api/user-companies":
    resp Http200, corsPreflightHeaders(), ""
  options "/api/user-companies/my":
    resp Http200, corsPreflightHeaders(), ""
  options "/api/user-companies/@id":
    resp Http200, corsPreflightHeaders(), ""
  options "/api/user-companies/@id/set-default":
    resp Http200, corsPreflightHeaders(), ""

  # Health check
  get "/health":
    resp Http200, corsHeaders(), $(%*{"status": "ok", "service": "identity-service"})

  # Login route
  post "/api/auth/login":
    withDb:
      let body = parseJson(request.body)
      let username = body["username"].getStr()
      let password = body["password"].getStr()
      let users = findWhere(NimUser, db, "username = $1 AND is_active = true", username)

      if users.len > 0:
        let user = users[0]
        if verifyPassword(password, user.salt, user.password):
          let token = generateToken(user.id, user.username, user.group_id)
          resp Http200, corsHeaders(), $(%*{
            "token": token,
            "user": {"id": user.id, "username": user.username, "email": user.email}
          })
        else:
          resp Http401, corsHeaders(), $(%*{"error": "Невалидно потребителско име или парола"})
      else:
        resp Http401, corsHeaders(), $(%*{"error": "Невалидно потребителско име или парола"})

  # Register route
  post "/api/auth/register":
    withDb:
      let body = parseJson(request.body)
      let username = body["username"].getStr()
      let email = body["email"].getStr()
      let password = body["password"].getStr()
      let groupId = body.getOrDefault("groupId").getBiggestInt(2)

      try:
        let user = createUser(db, username, email, password, groupId)
        let token = generateToken(user.id, user.username, user.group_id)
        resp Http201, corsHeaders(), $(%*{
          "token": token,
          "user": {"id": user.id, "username": user.username, "email": user.email}
        })
      except:
        resp Http400, corsHeaders(), $(%*{"error": getCurrentExceptionMsg()})

  # Verify token route - returns user info AND permissions
  get "/api/auth/verify":
    let authHeader = request.headers.getOrDefault("Authorization")
    if authHeader.len == 0 or not authHeader.startsWith("Bearer "):
      resp Http401, corsHeaders(), $(%*{"error": "Missing token"})

    let token = authHeader[7..^1]
    let (valid, userId, username) = verifyToken(token)

    if valid:
      withDb:
        let userOpt = getUserById(db, userId)
        if userOpt.isSome:
          let user = userOpt.get
          let permissions = getPermissionsJson(db, user.group_id)
          let isSuperAdminUser = user.group_id == 1

          # Get user's companies (superadmin sees all, others see only assigned)
          var companies: JsonNode
          if isSuperAdminUser:
            # Superadmin sees all companies
            companies = newJArray()
            let allCompanies = findAllUuid(Company, db)
            for c in allCompanies:
              companies.add(%*{
                "companyId": c.id,
                "isDefault": false,
                "company": {
                  "id": c.id,
                  "name": c.name,
                  "eik": c.eik,
                  "vatNumber": c.vat_number
                }
              })
          else:
            companies = getUserCompaniesJson(db, userId.int64)

          resp Http200, corsHeaders(), $(%*{
            "valid": true,
            "userId": userId,
            "username": username,
            "groupId": user.group_id,
            "permissions": permissions,
            "isSuperAdmin": isSuperAdminUser,
            "companies": companies
          })
        else:
          resp Http200, corsHeaders(), $(%*{"valid": true, "userId": userId, "username": username})
    else:
      resp Http401, corsHeaders(), $(%*{"valid": false, "error": "Invalid token"})

  # Check specific permission - POST body: {"permission": "canPostEntries"}
  # Valid permissions: canCreateCompanies, canEditCompanies, canDeleteCompanies,
  #                    canManageUsers, canViewReports, canPostEntries
  post "/api/auth/check-permission":
    let authHeader = request.headers.getOrDefault("Authorization")
    if authHeader.len == 0 or not authHeader.startsWith("Bearer "):
      resp Http401, corsHeaders(), $(%*{"error": "Missing token", "allowed": false})
      return

    let token = authHeader[7..^1]
    let (valid, userId, _) = verifyToken(token)
    if not valid:
      resp Http401, corsHeaders(), $(%*{"error": "Invalid token", "allowed": false})
      return

    let body = parseJson(request.body)
    let permission = body.getOrDefault("permission").getStr("")
    if permission == "":
      resp Http400, corsHeaders(), $(%*{"error": "Permission required", "allowed": false})
      return

    withDb:
      let userOpt = getUserById(db, userId)
      if userOpt.isNone:
        resp Http404, corsHeaders(), $(%*{"error": "User not found", "allowed": false})
        return

      let user = userOpt.get
      let groupOpt = getUserGroup(db, user.group_id)
      if groupOpt.isNone:
        resp Http200, corsHeaders(), $(%*{"allowed": false, "reason": "No group assigned"})
        return

      let g = groupOpt.get
      var allowed = false
      case permission:
        of "canCreateCompanies": allowed = g.can_create_companies
        of "canEditCompanies": allowed = g.can_edit_companies
        of "canDeleteCompanies": allowed = g.can_delete_companies
        of "canManageUsers": allowed = g.can_manage_users
        of "canViewReports": allowed = g.can_view_reports
        of "canPostEntries": allowed = g.can_post_entries
        else:
          resp Http400, corsHeaders(), $(%*{"error": "Unknown permission: " & permission, "allowed": false})
          return

      resp Http200, corsHeaders(), $(%*{
        "allowed": allowed,
        "permission": permission,
        "groupName": g.name
      })

  # Get current user info with permissions
  get "/api/auth/me":
    let authHeader = request.headers.getOrDefault("Authorization")
    if authHeader.len == 0 or not authHeader.startsWith("Bearer "):
      resp Http401, corsHeaders(), $(%*{"error": "Липсва токен"})
      return

    let token = authHeader[7..^1]
    let (valid, userId, _) = verifyToken(token)
    if not valid:
      resp Http401, corsHeaders(), $(%*{"error": "Невалиден токен"})
      return

    withDb:
      let userOpt = getUserById(db, userId)
      if userOpt.isSome:
        let user = userOpt.get
        let permissions = getPermissionsJson(db, user.group_id)
        let isSuperAdminUser = user.group_id == 1

        # Get user's companies (superadmin sees all, others see only assigned)
        var companies: JsonNode
        if isSuperAdminUser:
          companies = newJArray()
          let allCompanies = findAllUuid(Company, db)
          for c in allCompanies:
            companies.add(%*{
              "companyId": c.id,
              "isDefault": false,
              "company": {
                "id": c.id,
                "name": c.name,
                "eik": c.eik,
                "vatNumber": c.vat_number
              }
            })
        else:
          companies = getUserCompaniesJson(db, userId.int64)

        resp Http200, corsHeaders(), $(%*{
          "id": user.id,
          "username": user.username,
          "email": user.email,
          "firstName": user.first_name,
          "lastName": user.last_name,
          "groupId": user.group_id,
          "permissions": permissions,
          "isSuperAdmin": isSuperAdminUser,
          "companies": companies
        })
      else:
        resp Http404, corsHeaders(), $(%*{"error": "Потребителят не е намерен"})

  # Update current user profile
  put "/api/auth/profile":
    let authHeader = request.headers.getOrDefault("Authorization")
    if authHeader.len == 0 or not authHeader.startsWith("Bearer "):
      resp Http401, corsHeaders(), $(%*{"error": "Липсва токен"})
      return

    let token = authHeader[7..^1]
    let (valid, userId, _) = verifyToken(token)
    if not valid:
      resp Http401, corsHeaders(), $(%*{"error": "Невалиден токен"})
      return

    withDb:
      var userOpt = find(NimUser, userId, db)
      if userOpt.isNone:
        resp Http404, corsHeaders(), $(%*{"error": "Потребителят не е намерен"})
        return

      var user = userOpt.get()
      let body = parseJson(request.body)

      if body.hasKey("email"):
        user.email = body["email"].getStr()
      if body.hasKey("firstName"):
        user.first_name = body["firstName"].getStr()
      if body.hasKey("lastName"):
        user.last_name = body["lastName"].getStr()

      save(user, db)
      resp Http200, corsHeaders(), $(%*{
        "id": user.id, "username": user.username, "email": user.email,
        "firstName": user.first_name, "lastName": user.last_name
      })

  # Change current user password
  post "/api/auth/change-password":
    let authHeader = request.headers.getOrDefault("Authorization")
    if authHeader.len == 0 or not authHeader.startsWith("Bearer "):
      resp Http401, corsHeaders(), $(%*{"error": "Липсва токен"})
      return

    let token = authHeader[7..^1]
    let (valid, userId, _) = verifyToken(token)
    if not valid:
      resp Http401, corsHeaders(), $(%*{"error": "Невалиден токен"})
      return

    withDb:
      var userOpt = find(NimUser, userId, db)
      if userOpt.isNone:
        resp Http404, corsHeaders(), $(%*{"error": "Потребителят не е намерен"})
        return

      var user = userOpt.get()
      let body = parseJson(request.body)
      let currentPassword = body["currentPassword"].getStr()
      let newPassword = body["newPassword"].getStr()

      # Verify current password
      if not verifyPassword(currentPassword, user.salt, user.password):
        resp Http400, corsHeaders(), $(%*{"error": "Грешна текуща парола"})
        return

      # Validate new password
      if newPassword.len < 6:
        resp Http400, corsHeaders(), $(%*{"error": "Новата парола трябва да е поне 6 символа"})
        return

      # Update password
      let newSalt = $epochTime()
      user.password = hashPassword(newPassword, newSalt)
      user.salt = newSalt
      save(user, db)

      resp Http200, corsHeaders(), $(%*{"success": true, "message": "Паролата е сменена успешно"})

  # User routes
  get "/api/users":
    withDb:
      let users = findAll(NimUser, db)
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
      resp Http200, corsHeaders(), $usersJson

  post "/api/users":
    withDb:
      let body = parseJson(request.body)
      let user = createUser(db,
        body["username"].getStr(),
        body["email"].getStr(),
        body["password"].getStr(),
        body.getOrDefault("groupId").getInt(0)
      )
      resp Http201, corsHeaders(), $toJson(user)

  put "/api/users/@id":
    let idParam = @"id"
    withDb:
      let id = parseInt(idParam)
      let body = parseJson(request.body)
      var userOpt = find(NimUser, id, db)
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
        resp Http200, corsHeaders(), $toJson(user)
      else:
        resp Http404, corsHeaders(), """{"error": "User not found"}"""

  delete "/api/users/@id":
    let idParam = @"id"
    withDb:
      let id = parseInt(idParam)
      let userOpt = find(NimUser, id, db)
      if userOpt.isNone:
        resp Http404, corsHeaders(), """{"error": "User not found"}"""
        return

      try:
        deleteById(NimUser, id, db)
      except Exception as e:
        echo "Error deleting User: ", e.msg
        resp Http500, corsHeaders(), """{"error": "Delete failed"}"""
        return
      resp Http200, corsHeaders(), """{"success": true}"""

  post "/api/users/@id/reset-password":
    let idParam = @"id"
    withDb:
      let id = parseInt(idParam)
      let body = parseJson(request.body)
      var userOpt = find(NimUser, id, db)
      if userOpt.isSome:
        var user = userOpt.get()
        let newSalt = $epochTime()
        user.password = hashPassword(body["newPassword"].getStr(), newSalt)
        user.salt = newSalt
        save(user, db)
        resp Http200, corsHeaders(), """{"success": true}"""
      else:
        resp Http404, corsHeaders(), """{"error": "User not found"}"""

  # User-Company routes
  # Get current user's companies
  get "/api/user-companies/my":
    let authHeader = request.headers.getOrDefault("Authorization")
    if authHeader.len == 0 or not authHeader.startsWith("Bearer "):
      resp Http401, corsHeaders(), $(%*{"error": "Липсва токен"})
      return

    let token = authHeader[7..^1]
    let (valid, userId, _) = verifyToken(token)
    if not valid:
      resp Http401, corsHeaders(), $(%*{"error": "Невалиден токен"})
      return

    withDb:
      let companies = getUserCompaniesJson(db, userId.int64)
      resp Http200, corsHeaders(), $companies

  # Get all user-company associations (superadmin only) or for a specific user
  get "/api/user-companies":
    let authHeader = request.headers.getOrDefault("Authorization")
    if authHeader.len == 0 or not authHeader.startsWith("Bearer "):
      resp Http401, corsHeaders(), $(%*{"error": "Липсва токен"})
      return

    let token = authHeader[7..^1]
    let (valid, userId, _) = verifyToken(token)
    if not valid:
      resp Http401, corsHeaders(), $(%*{"error": "Невалиден токен"})
      return

    withDb:
      # Check if superadmin
      if not isSuperAdmin(db, userId):
        resp Http403, corsHeaders(), $(%*{"error": "Нямате права за тази операция"})
        return

      # Optional filter by user_id or company_id
      let userIdFilter = request.params.getOrDefault("user_id")
      let companyIdFilter = request.params.getOrDefault("company_id")

      var jsonResult = newJArray()
      if userIdFilter != "":
        let userCompanies = findUserCompaniesByUserId(db, parseInt(userIdFilter).int64)
        for uc in userCompanies:
          let companyOpt = findUuid(Company, uc.company_id, db)
          let userOpt = getUserById(db, uc.user_id.int)
          var item = %*{
            "id": uc.id,
            "userId": uc.user_id,
            "companyId": uc.company_id,
            "isDefault": uc.is_default
          }
          if companyOpt.isSome:
            item["companyName"] = %companyOpt.get.name
          if userOpt.isSome:
            item["username"] = %userOpt.get.username
          jsonResult.add(item)
      elif companyIdFilter != "":
        let userCompanies = findUserCompaniesByCompanyId(db, companyIdFilter)
        for uc in userCompanies:
          let userOpt = getUserById(db, uc.user_id.int)
          var item = %*{
            "id": uc.id,
            "userId": uc.user_id,
            "companyId": uc.company_id,
            "isDefault": uc.is_default
          }
          if userOpt.isSome:
            item["username"] = %userOpt.get.username
          jsonResult.add(item)
      else:
        # Return all
        let allUc = findAll(UserCompany, db)
        for uc in allUc:
          let companyOpt = findUuid(Company, uc.company_id, db)
          let userOpt = getUserById(db, uc.user_id.int)
          var item = %*{
            "id": uc.id,
            "userId": uc.user_id,
            "companyId": uc.company_id,
            "isDefault": uc.is_default
          }
          if companyOpt.isSome:
            item["companyName"] = %companyOpt.get.name
          if userOpt.isSome:
            item["username"] = %userOpt.get.username
          jsonResult.add(item)

      resp Http200, corsHeaders(), $jsonResult

  # Add user to company (superadmin only)
  post "/api/user-companies":
    let authHeader = request.headers.getOrDefault("Authorization")
    if authHeader.len == 0 or not authHeader.startsWith("Bearer "):
      resp Http401, corsHeaders(), $(%*{"error": "Липсва токен"})
      return

    let token = authHeader[7..^1]
    let (valid, userId, _) = verifyToken(token)
    if not valid:
      resp Http401, corsHeaders(), $(%*{"error": "Невалиден токен"})
      return

    withDb:
      if not isSuperAdmin(db, userId):
        resp Http403, corsHeaders(), $(%*{"error": "Нямате права за тази операция"})
        return

      let body = parseJson(request.body)
      let targetUserId = body["userId"].getBiggestInt()
      let companyId = body["companyId"].getStr()
      let isDefault = body.getOrDefault("isDefault").getBool(false)

      # Check if user exists
      let userOpt = getUserById(db, targetUserId.int)
      if userOpt.isNone:
        resp Http404, corsHeaders(), $(%*{"error": "Потребителят не е намерен"})
        return

      # Check if company exists
      let companyOpt = findUuid(Company, companyId, db)
      if companyOpt.isNone:
        resp Http404, corsHeaders(), $(%*{"error": "Фирмата не е намерена"})
        return

      # Check if already linked
      let existingOpt = findUserCompanyByUserAndCompany(db, targetUserId.int64, companyId)
      if existingOpt.isSome:
        resp Http400, corsHeaders(), $(%*{"error": "Потребителят вече е свързан с тази фирма"})
        return

      # If setting as default, clear other defaults first
      if isDefault:
        rawExec(db, "UPDATE user_companies SET is_default = false WHERE user_id = $1::bigint", $targetUserId)

      # Insert using raw SQL with proper UUID cast
      let insertResult = rawQuery(db,
        "INSERT INTO user_companies (user_id, company_id, is_default, inserted_at, updated_at) VALUES ($1::bigint, $2::uuid, $3::boolean, NOW(), NOW()) RETURNING id",
        $targetUserId, companyId, $isDefault)

      var newId = 0
      if insertResult.len > 0:
        newId = parseInt($insertResult[0][0])

      resp Http201, corsHeaders(), $(%*{
        "id": newId,
        "userId": targetUserId,
        "companyId": companyId,
        "isDefault": isDefault,
        "companyName": companyOpt.get.name
      })

  # Remove user from company
  delete "/api/user-companies/@id":
    let authHeader = request.headers.getOrDefault("Authorization")
    if authHeader.len == 0 or not authHeader.startsWith("Bearer "):
      resp Http401, corsHeaders(), $(%*{"error": "Липсва токен"})
      return

    let token = authHeader[7..^1]
    let (valid, userId, _) = verifyToken(token)
    if not valid:
      resp Http401, corsHeaders(), $(%*{"error": "Невалиден токен"})
      return

    let idParam = @"id"  # Capture param before withDb to avoid threading issues
    withDb:
      if not isSuperAdmin(db, userId):
        resp Http403, corsHeaders(), $(%*{"error": "Нямате права за тази операция"})
        return

      let id = parseInt(idParam)
      let ucOpt = find(UserCompany, id, db)
      if ucOpt.isNone:
        resp Http404, corsHeaders(), $(%*{"error": "Връзката не е намерена"})
        return

      try:
        deleteById(UserCompany, id, db)
      except Exception as e:
        echo "Error deleting UserCompany: ", e.msg
        resp Http500, corsHeaders(), $(%*{"error": "Грешка при изтриване"})
        return

      resp Http200, corsHeaders(), $(%*{"success": true})

  # Set company as default for user
  post "/api/user-companies/@id/set-default":
    let authHeader = request.headers.getOrDefault("Authorization")
    if authHeader.len == 0 or not authHeader.startsWith("Bearer "):
      resp Http401, corsHeaders(), $(%*{"error": "Липсва токен"})
      return

    let token = authHeader[7..^1]
    let (valid, userId, _) = verifyToken(token)
    if not valid:
      resp Http401, corsHeaders(), $(%*{"error": "Невалиден токен"})
      return

    let idParam = @"id"
    withDb:
      let id = parseInt(idParam)
      let ucOpt = find(UserCompany, id, db)
      if ucOpt.isNone:
        resp Http404, corsHeaders(), $(%*{"error": "Връзката не е намерена"})
        return

      let uc = ucOpt.get
      # User can set default for themselves, or superadmin can do it for anyone
      if uc.user_id != userId.int64 and not isSuperAdmin(db, userId):
        resp Http403, corsHeaders(), $(%*{"error": "Нямате права за тази операция"})
        return

      setUserCompanyAsDefault(db, uc.user_id, uc.company_id)
      resp Http200, corsHeaders(), $(%*{"success": true})

  # User group routes
  get "/api/user-groups":
    withDb:
      let groups = findAll(UserGroup, db)
      resp Http200, corsHeaders(), $toJsonArray(groups)

proc main() =
  let p = Port(5002)
  let settings = newSettings(port=p)
  var jester = initJester(identityRouter, settings=settings)

  try:
    initDbPool()
    echo "Identity Service started on port 5002"
    jester.serve()
  finally:
    closeDbPool()

if isMainModule:
  main()
