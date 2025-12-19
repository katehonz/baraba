import std/[times, options, strutils, base64, json, tables]
import jwt
import orm/orm
import baraba_shared/models/user
import ../db/config
import baraba_shared/utils/security

# Re-export security functions for convenience if needed, but imports should handle it
export security

proc authenticateUser*(db: DbConn, username, password: string): Option[User] =
  let users = findWhere(User, db, "username =  AND is_active = true", username)
  if users.len > 0:
    let user = users[0]
    if verifyPassword(password, user.salt, user.password):
      return some(user)
  return none(User)

proc getUserById*(db: DbConn, userId: int64): Option[User] =
  return find(User, userId.int, db)

proc createUser*(db: DbConn, username, email, password: string, groupId: int64): User =
  let salt = $epochTime()
  var user = newUser(
    username = username,
    email = email,
    password = hashPassword(password, salt),
    salt = salt,
    group_id = groupId
  )
  save(user, db)
  return user

proc recoverPassword*(db: DbConn, email: string): Option[string] =
  let users = findWhere(User, db, "email =  AND is_active = true", email)
  if users.len > 0:
    var user = users[0]
    let token = $epochTime() # In a real app, use a secure random token
    user.recovery_code_hash = hashPassword(token, user.salt)
    user.recovery_code_created_at = some(now())
    save(user, db)
    # TODO: Send email with the token
    # sendEmail(user.email, "Password recovery", "Your recovery token is: " & token)
    return some(token)
  return none(string)

proc resetPassword*(db: DbConn, email: string, token: string, newPassword: string): bool =
  let users = findWhere(User, db, "email =  AND is_active = true", email)
  if users.len > 0:
    var user = users[0]
    if verifyPassword(token, user.salt, user.recovery_code_hash):
      # Check if the token is expired (e.g., 1 hour)
      if user.recovery_code_created_at.isSome and (now() - user.recovery_code_created_at.get).inHours < 1:
        let salt = $epochTime()
        user.password = hashPassword(newPassword, salt)
        user.salt = salt
        user.recovery_code_hash = ""
        user.recovery_code_created_at = none(DateTime)
        save(user, db)
        return true
  return false

proc getUserGroup*(db: DbConn, groupId: int64): Option[UserGroup] =
  return find(UserGroup, groupId.int, db)