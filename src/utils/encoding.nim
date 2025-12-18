import std/encodings

proc toWindows1251*(s: string): string =
  ## Convert UTF-8 string to Windows-1251 (CP1251) encoding for Bulgarian text
  var conv = open("CP1251", "UTF-8")
  defer: conv.close()
  return conv.convert(s)

proc fromWindows1251*(s: string): string =
  ## Convert Windows-1251 encoded string to UTF-8
  var conv = open("UTF-8", "CP1251")
  defer: conv.close()
  return conv.convert(s)
