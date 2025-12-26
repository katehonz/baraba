import std/[times, options, strutils, base64, json, tables]
import jwt

import std/os

var JwtSecret* {.threadvar.}: string

proc getJwtSecret(): string =
  if JwtSecret.len == 0:
    JwtSecret = getEnv("JWT_SECRET", "changeme-set-JWT_SECRET-env-var")
  result = JwtSecret

const JwtExpirationHours* = 24

type
  AuthError* = object of CatchableError

proc hashPassword*(password: string, salt: string): string =
  # TODO: Use a more secure hashing algorithm like bcrypt
  encode(password & salt)

proc verifyPassword*(password, salt, hash: string): bool =
  hashPassword(password, salt) == hash

proc generateToken*(userId: int64, username: string, groupId: int64 = 0): string =
  let header = %*{
    "alg": "HS256",
    "typ": "JWT"
  }
  var claims = newTable[string, Claim]()
  claims["sub"] = newStringClaim($userId)
  claims["username"] = newStringClaim(username)
  claims["group_id"] = newStringClaim($groupId)
  claims["iat"] = newTimeClaim(fromUnix(epochTime().int64))
  claims["exp"] = newTimeClaim(fromUnix((epochTime() + (JwtExpirationHours * 3600).float).int64))

  var token = initJWT(header, claims)
  token.sign(getJwtSecret())
  result = $token

proc verifyToken*(tokenStr: string): tuple[valid: bool, userId: int64, username: string, groupId: int64] =
  result = (false, 0'i64, "", 0'i64)
  try:
    let jwtToken = tokenStr.toJWT()
    if jwtToken.verify(getJwtSecret(), HS256):
      let claimsTable = jwtToken.claims
      if claimsTable.hasKey("exp") and claimsTable.hasKey("sub") and claimsTable.hasKey("username"):
        let exp = claimsTable["exp"].getClaimTime().toUnix()
        if exp > epochTime().int64:
          result.valid = true
          result.userId = parseBiggestInt(claimsTable["sub"].node.str)
          result.username = claimsTable["username"].node.str
          if claimsTable.hasKey("group_id"):
            result.groupId = parseBiggestInt(claimsTable["group_id"].node.str)
  except:
    discard
