# Package

version       = "0.1.0"
author        = "dvg"
description   = "Счетоводна програма - Jester REST API"
license       = "MIT"
srcDir        = "src"
bin           = @["baraba"]

# Dependencies

requires "nim >= 2.0.0"
requires "jester >= 0.6.0"
requires "vendor/orm-baraba/orm_baraba.nimble"
requires "https://github.com/katehonz/jwt-nim-baraba"
