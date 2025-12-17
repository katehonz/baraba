# NimScript configuration for the project
# Add vendor directories to the compiler's search path (local forks)
switch("path", "src/vendor/jester")
switch("path", "src/vendor/httpbeast")
switch("path", "src/vendor/nim-graphql")
switch("path", "src/vendor/tinypool/src")
switch("path", "vendor/orm-baraba/src")
# Enable deepcopy for graphql library
switch("deepcopy", "on")
# Using local httpbeast fork with Nim 2.x fixes
