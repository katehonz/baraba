## Database configuration and connection pool for norm ORM
## Thread-safe connection pool for multi-threaded servers
import std/[locks, sequtils, atomics]
import "../../vendor/lowdb_baraba/lowdb/postgres"

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
    initialized: Atomic[bool]

var pool: ConnectionPool
var poolInitLock: Lock

# Initialize the init lock at module load time
initLock(poolInitLock)

proc createConnection(): DbConn =
  ## Creates a new database connection
  result = postgres.open(DbHost, DbUser, DbPassword, DbName)

proc initDbPool*() =
  ## Initializes the database connection pool (thread-safe)
  # Fast path - already initialized
  if pool.initialized.load(moAcquire):
    return

  # Slow path - need to initialize with lock
  withLock poolInitLock:
    # Double-check after acquiring lock
    if pool.initialized.load(moAcquire):
      return

    initLock(pool.lock)
    pool.connections = @[]

    for i in 1..PoolSize:
      pool.connections.add(createConnection())

    pool.initialized.store(true, moRelease)
    echo "Database pool initialized with ", PoolSize, " connections"

proc closeDbPool*() =
  ## Closes all connections in the pool
  if not pool.initialized.load(moAcquire):
    return

  withLock pool.lock:
    for conn in pool.connections:
      conn.close()
    pool.connections = @[]

  pool.initialized.store(false, moRelease)
  echo "Database pool closed"

proc getDbConn*(): DbConn {.gcsafe.} =
  ## Borrows a connection from the pool (thread-safe)
  {.cast(gcsafe).}:
    if not pool.initialized.load(moAcquire):
      raise newException(DbError, "Database pool not initialized")

    withLock pool.lock:
      if pool.connections.len == 0:
        # Pool exhausted, create a new connection outside lock
        discard
      else:
        return pool.connections.pop()

    # Create connection outside lock to avoid blocking
    return createConnection()

proc releaseDbConn*(conn: DbConn) {.gcsafe.} =
  ## Returns a connection to the pool (thread-safe)
  {.cast(gcsafe).}:
    if not pool.initialized.load(moAcquire):
      conn.close()
      return

    var shouldClose = false
    withLock pool.lock:
      if pool.connections.len < PoolSize:
        pool.connections.add(conn)
      else:
        shouldClose = true

    # Close outside lock
    if shouldClose:
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
