import std/[json, times, options, strutils]

proc snakeToCamel(s: string): string =
  ## Convert snake_case to camelCase
  result = ""
  var capitalizeNext = false
  for c in s:
    if c == '_':
      capitalizeNext = true
    elif capitalizeNext:
      result.add(c.toUpperAscii)
      capitalizeNext = false
    else:
      result.add(c)

proc toJson*[T](obj: T): JsonNode =
  result = %*{}
  for name, value in fieldPairs(obj):
    let jsonName = snakeToCamel(name)
    when value is Option:
      if value.isSome:
        when value.get is DateTime:
          result[jsonName] = %($value.get)
        else:
          result[jsonName] = %value.get
      else:
        result[jsonName] = newJNull()
    elif value is DateTime:
      result[jsonName] = %($value)
    elif value is ref:
      if value != nil:
        result[jsonName] = toJson(value)
      else:
        result[jsonName] = newJNull()
    else:
      result[jsonName] = %value

proc toJsonArray*[T](items: seq[T]): JsonNode =
  result = newJArray()
  for item in items:
    result.add(toJson(item))

proc parseDateTime*(s: string): DateTime =
  try:
    parse(s, "yyyy-MM-dd'T'HH:mm:ss")
  except:
    try:
      parse(s, "yyyy-MM-dd")
    except:
      now()
