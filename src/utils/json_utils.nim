import std/[json, times, options]

proc toJson*[T](obj: T): JsonNode =
  result = %*{}
  for name, value in fieldPairs(obj):
    when value is Option:
      if value.isSome:
        when value.get is DateTime:
          result[name] = %($value.get)
        else:
          result[name] = %value.get
      else:
        result[name] = newJNull()
    elif value is DateTime:
      result[name] = %($value)
    elif value is ref:
      if value != nil:
        result[name] = toJson(value)
      else:
        result[name] = newJNull()
    else:
      result[name] = %value

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
