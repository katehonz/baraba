# Package
version       = "0.1.0"
author        = "Baraba Team"
description   = "Shared logic and models for Baraba microservices"
license       = "MIT"
srcDir        = "src"

# Dependencies
requires "nim >= 2.0.0"
requires "json_serialization"
# orm_baraba is in vendor/ directory, use path include
requires "lowdb"
requires "checksums"
requires "https://github.com/katehonz/jwt-nim-baraba"
