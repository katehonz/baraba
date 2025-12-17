import std/[times, options, strutils, base64, json, tables]
import jwt
import orm/orm
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
  let header = %*{
    "alg": "HS256",
    "typ": "JWT"
  }
  var claims = newTable[string, Claim]()
  claims["sub"] = newStringClaim($userId)
  claims["username"] = newStringClaim(username)
  claims["iat"] = newTimeClaim(fromUnix(epochTime().int64))
  claims["exp"] = newTimeClaim(fromUnix((epochTime() + (JwtExpirationHours * 3600).float).int64))

  var token = initJWT(header, claims)
  token.sign(JwtSecret)
  result = $token

proc verifyToken*(tokenStr: string): tuple[valid: bool, userId: int64, username: string] =
  result = (false, 0'i64, "")
  try:
    let jwtToken = tokenStr.toJWT()
    if jwtToken.verify(JwtSecret, HS256):
      let claimsTable = jwtToken.claims
      if claimsTable.hasKey("exp") and claimsTable.hasKey("sub") and claimsTable.hasKey("username"):
        let exp = claimsTable["exp"].getClaimTime().toUnix()
        if exp > epochTime().int64:
          result.valid = true
          result.userId = parseBiggestInt(claimsTable["sub"].node.str)
          result.username = claimsTable["username"].node.str
  except:
    discard

proc authenticateUser*(db: DbConn, username, password: string): Option[User] =
  let users = findWhere(User, db, "username = $1 AND is_active = true", username)
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
  let users = findWhere(User, db, "email = $1 AND is_active = true", email)
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
  let users = findWhere(User, db, "email = $1 AND is_active = true", email)
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