## Database configuration and connection pool for norm ORM
import std/[locks, sequtils]
import norm/postgres

export postgres

const
  DbHost* = "localhost"
  DbUser* = "postgres"
  DbPassword* = "pas+123"
  DbName* = "jesterac"
  PoolSize* = 10

type
  ConnectionPool = object
    connections: seq[DbConn]
    lock: Lock
    initialized: bool

var pool: ConnectionPool

proc createConnection(): DbConn =
  ## Creates a new database connection
  result = postgres.open(DbHost, DbUser, DbPassword, DbName)

proc initDbPool*() =
  ## Initializes the database connection pool
  if pool.initialized:
    return

  initLock(pool.lock)
  pool.connections = @[]

  for i in 1..PoolSize:
    pool.connections.add(createConnection())

  pool.initialized = true
  echo "Database pool initialized with ", PoolSize, " connections"

proc closeDbPool*() =
  ## Closes all connections in the pool
  if not pool.initialized:
    return

  withLock pool.lock:
    for conn in pool.connections:
      conn.close()
    pool.connections = @[]

  pool.initialized = false
  echo "Database pool closed"

proc getDbConn*(): DbConn {.gcsafe.} =
  ## Borrows a connection from the pool
  {.cast(gcsafe).}:
    if not pool.initialized:
      raise newException(DbError, "Database pool not initialized")

    withLock pool.lock:
      if pool.connections.len == 0:
        # Pool exhausted, create a new connection
        return createConnection()
      result = pool.connections.pop()

proc releaseDbConn*(conn: DbConn) {.gcsafe.} =
  ## Returns a connection to the pool
  {.cast(gcsafe).}:
    if not pool.initialized:
      conn.close()
      return

    withLock pool.lock:
      if pool.connections.len < PoolSize:
        pool.connections.add(conn)
      else:
        # Pool is full, close the connection
        conn.close()

template withDb*(body: untyped) =
  ## Convenience template - borrows connection, executes body, releases connection
  let db {.inject.} = getDbConn()
  try:
    body
  finally:
    releaseDbConn(db)

# Legacy function for backwards compatibility
proc openDb*(): DbConn =
  ## Opens a new database connection (not pooled)
  ## Deprecated: Use withDb or getDbConn/releaseDbConn instead
  postgres.open(DbHost, DbUser, DbPassword, DbName)
