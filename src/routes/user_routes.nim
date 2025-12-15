import std/json
import std/asyncfutures
import ../db/config
import ../models/user
import ../services/auth

proc getUsers*(): Future[string] {.async.} =
  let db = await openDb()
  let users = await db.getAll(User)
  # For security reasons, don't return the password hash
  var usersJson = newJArray()
  for user in users:
    usersJson.add(%*{"id": user.id, "username": user.username, "email": user.email, "firstName": user.first_name, "lastName": user.last_name, "isActive": user.is_active, "groupId": user.group_id})
  return $usersJson

proc createUser*(username: string, email: string, password: string, firstName: string, lastName: string, groupId: int, isActive: bool): Future[string] {.async.} =
  let db = await openDb()
  let user = createUser(db, username, email, password, groupId)
  # a new user is active by default, but we can update it
  if not isActive:
    var updatedUser = user
    updatedUser.is_active = false
    await db.update(updatedUser)
    return $toJson(updatedUser)
  return $toJson(user)

proc updateUser*(id: int, username: string, email: string, firstName: string, lastName: string, groupId: int, isActive: bool): Future[string] {.async.} =
  let db = await openDb()
  var user = newUser()
  await db.select(user, "id = $1", id)
  user.username = username
  user.email = email
  user.first_name = firstName
  user.last_name = lastName
  user.group_id = groupId.toInt64
  user.is_active = isActive
  await db.update(user)
  return $toJson(user)

proc deleteUser*(id: int): Future[string] {.async.} =
  let db = await openDb()
  var user = newUser()
  await db.select(user, "id = $1", id)
  await db.delete(user)
  return %*{"success": true}

proc resetUserPassword*(id: int, newPassword: string): Future[string] {.async.} =
  let db = await openDb()
  var user = newUser()
  await db.select(user, "id = $1", id)
  let (hashedPassword, salt) = hashPassword(newPassword)
  user.password = hashedPassword
  user.salt = salt
  await db.update(user)
  return %*{"success": true}
