# NimScript configuration for the project
# Add vendor directories to the compiler's search path
switch("path", "src/vendor/nim-graphql")
switch("path", "src/vendor/tinypool/src")
# Enable deepcopy for graphql library
switch("deepcopy", "on")
