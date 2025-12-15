import std/[times, options, strutils, base64, json, tables]
import jwt
import norm/postgres
import ../models/user
import ../db/config

# Re-export openDb for convenience
export config.openDb

const
  JwtSecret* = "your-secret-key-change-in-production-min-32-chars!"
  JwtExpirationHours* = 24

type
  AuthError* = object of CatchableError

proc hashPassword*(password: string): string =
  # Simple hash for demo - use bcrypt in production
  # Using base64 encoding of password for simplicity
  encode(password & JwtSecret)

proc verifyPassword*(password, hash: string): bool =
  hashPassword(password) == hash

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

proc authenticateUser*(username, password: string): Option[User] =
  let db = openDb()
  try:
    var users = @[newUser()]
    db.select(users, "username = $1 AND is_active = true", username)
    if users.len > 0 and users[0].id != 0:
      let user = users[0]
      if verifyPassword(password, user.password_hash):
        return some(user)
  finally:
    close(db)
  return none(User)

proc getUserById*(userId: int64): Option[User] =
  let db = openDb()
  try:
    var user = newUser()
    db.select(user, "id = $1", userId)
    return some(user)
  except:
    discard
  finally:
    close(db)
  return none(User)

proc createUser*(username, email, password: string, groupId: int64): User =
  var user = newUser(
    username = username,
    email = email,
    password_hash = hashPassword(password),
    group_id = groupId
  )
  let db = openDb()
  try:
    db.insert(user)
  finally:
    close(db)
  return user

proc getUserGroup*(groupId: int64): Option[UserGroup] =
  let db = openDb()
  try:
    var group = newUserGroup()
    db.select(group, "id = $1", groupId)
    return some(group)
  except:
    discard
  finally:
    close(db)
  return none(UserGroup)
