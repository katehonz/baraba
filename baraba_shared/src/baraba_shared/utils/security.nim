import std/[times, options, strutils, base64, json, tables]
import jwt

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
