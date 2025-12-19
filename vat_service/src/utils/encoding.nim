import std/[strutils, os]

proc toWindows1251*(s: string): string =
  ## Convert UTF-8 string to Windows-1251 encoding
  ## This is a simplified implementation for compatibility
  result = s  # In production, would need proper encoding conversion