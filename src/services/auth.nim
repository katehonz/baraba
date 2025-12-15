import std/[times, options, strutils, base64, json, tables]
import jwt
import norm/postgres
import ../models/user
import ../db/config

const
  JwtSecret* = "your-secret-key-change-in-production-min-32-chars!"
  JwtExpirationHours* = 24

type
  AuthError* = object of CatchableError

proc hashPassword*(password: string, salt: string): string =
  # TODO: Use a more secure hashing algorithm like bcrypt
  encode(password & salt)

proc verifyPassword*(password, salt, hash: string): bool =
  hashPassword(password, salt) == hash

proc generateToken*(userId: int64, username: string): string =
  var token = toJWT(%*{
    "header": {
      "alg": "HS256",
      "typ": "JWT"
    },
    "claims": {
      "sub": $userId,
      "username": username,
      "iat": epochTime().int,
      "exp": (epochTime() + (JwtExpirationHours * 3600)).int
    }
  })
  token.sign(JwtSecret)
  result = $token

proc verifyToken*(token: string): tuple[valid: bool, userId: int64, username: string] =
  result = (false, 0'i64, "")
  try:
    let jwtToken = token.toJWT()
    if jwtToken.verify(JwtSecret, HS256):
      let claimsTable = jwtToken.claims
      if claimsTable.contains("exp") and claimsTable.contains("sub") and claimsTable.contains("username"):
        let expNode = claimsTable["exp"].node
        let exp = expNode.getInt()
        if exp > epochTime().int:
          result.valid = true
          result.userId = parseBiggestInt(claimsTable["sub"].node.getStr())
          result.username = claimsTable["username"].node.getStr()
  except:
    discard

proc authenticateUser*(db: DbConn, username, password: string): Option[User] =
  var users = @[newUser()]
  db.select(users, "username = $1 AND is_active = true", username)
  if users.len > 0 and users[0].id != 0:
    let user = users[0]
    if verifyPassword(password, user.salt, user.password):
      return some(user)
  return none(User)

proc getUserById*(db: DbConn, userId: int64): Option[User] =
  var user = newUser()
  try:
    db.select(user, "id = $1", userId)
    if user.id != 0:
      return some(user)
  except:
    discard
  return none(User)

proc createUser*(db: DbConn, username, email, password: string, groupId: int64): User =
  let salt = $epochTime()
  var user = newUser(
    username = username,
    email = email,
    password = hashPassword(password, salt),
    salt = salt,
    group_id = groupId
  )
  db.insert(user)
  return user

proc recoverPassword*(db: DbConn, email: string): Option[string] =
  var users = @[newUser()]
  db.select(users, "email = $1 AND is_active = true", email)
  if users.len > 0 and users[0].id != 0:
    var user = users[0]
    let token = $epochTime() # In a real app, use a secure random token
    user.recovery_code_hash = hashPassword(token, user.salt)
    user.recovery_code_created_at = some(now())
    db.update(user)
    # TODO: Send email with the token
    # sendEmail(user.email, "Password recovery", "Your recovery token is: " & token)
    return some(token)
  return none(string)

proc resetPassword*(db: DbConn, email: string, token: string, newPassword: string): bool =
  var users = @[newUser()]
  db.select(users, "email = $1 AND is_active = true", email)
  if users.len > 0 and users[0].id != 0:
    var user = users[0]
    if verifyPassword(token, user.salt, user.recovery_code_hash):
      # Check if the token is expired (e.g., 1 hour)
      if user.recovery_code_created_at.isSome and (now() - user.recovery_code_created_at.get).inHours < 1:
        let salt = $epochTime()
        user.password = hashPassword(newPassword, salt)
        user.salt = salt
        user.recovery_code_hash = ""
        user.recovery_code_created_at = none(DateTime)
        db.update(user)
        return true
  return false

proc getUserGroup*(db: DbConn, groupId: int64): Option[UserGroup] =
  try:
    var group = newUserGroup()
    db.select(group, "id = $1", groupId)
    if group.id != 0:
      return some(group)
  except:
    discard
  return none(UserGroup)