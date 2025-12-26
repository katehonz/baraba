# Package
version       = "0.1.0"
author        = "Baraba Team"
description   = "VAT Generation Microservice for Baraba"
license       = "MIT"
srcDir        = "src"
bin           = @["vat_service"]

# Dependencies
requires "nim >= 2.0.0"
requires "jester"
# baraba_shared and orm_baraba included via path in compile command