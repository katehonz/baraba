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
requires "baraba_shared"
requires "orm_baraba"
