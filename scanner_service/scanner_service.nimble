# Package
version       = "0.1.0"
author        = "Baraba Team"
description   = "AI Scanner Microservice for Baraba"
license       = "MIT"
srcDir        = "src"
bin           = @["scanner_service"]

# Dependencies
requires "nim >= 2.0.0"
requires "jester"
requires "baraba_shared"
