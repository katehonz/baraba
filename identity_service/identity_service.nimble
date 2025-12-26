# Package
version       = "0.1.0"
author        = "Baraba Team"
description   = "Identity Microservice for Baraba"
license       = "MIT"
srcDir        = "src"
bin           = @["identity_service"]

# Dependencies
requires "nim >= 2.0.0"
requires "jester"
requires "db_connector"
requires "checksums"
requires "json_serialization"
requires "https://github.com/katehonz/jwt-nim-baraba"
# baraba_shared and orm_baraba included via path in compile command
