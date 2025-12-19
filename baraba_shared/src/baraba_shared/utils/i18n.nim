import json, strtabs, strutils, os, sequtils, tables

type
  Translations = StringTableRef
  TranslationData = ref object
    data: JsonNode
    lang: string

var 
  translations: StringTableRef = newStringTable(modeCaseInsensitive)
  currentLang = "en"
  translationCache: Table[string, TranslationData] = initTable[string, TranslationData]()

proc flattenJson*(jsonNode: JsonNode, prefix: string = "", result: var StringTableRef) =
  ## Flatten nested JSON to dot notation keys
  case jsonNode.kind:
  of JObject:
    for key, value in jsonNode.pairs:
      let newPrefix = if prefix.len > 0: prefix & "." & key else: key
      flattenJson(value, newPrefix, result)
  of JString:
    result[prefix] = jsonNode.getStr()
  else:
    # Convert other types to string
    result[prefix] = $jsonNode

proc loadTranslations(lang: string): bool =
  let filePath = "locales" / lang & ".json"
  if not fileExists(filePath):
    return false

  # Check cache first
  if translationCache.hasKey(lang):
    translations = newStringTable(modeCaseInsensitive)
    flattenJson(translationCache[lang].data, "", translations)
    currentLang = lang
    return true

  let content = readFile(filePath)
  let data = parseJson(content)
  
  # Cache the parsed data
  translationCache[lang] = TranslationData(data: data, lang: lang)

  translations = newStringTable(modeCaseInsensitive)
  flattenJson(data, "", translations)
  
  currentLang = lang
  return true

proc i18n*(key: string): string =
  result = translations.getOrDefault(key, key)

proc i18nFormat*(key: string, args: varargs[string]): string =
  ## Format translation with parameters using {} placeholders
  let templateStr = i18n(key)
  result = templateStr
  for i, arg in args:
    result = result.replace("{" & $i & "}", arg)

proc i18nNamed*(key: string, params: Table[string, string]): string =
  ## Format translation with named parameters using {name} placeholders
  let templateStr = i18n(key)
  result = templateStr
  for name, value in params:
    result = result.replace("{" & name & "}", value)

proc getCurrentLang*(): string =
  currentLang

proc setLanguage*(lang: string): bool =
  ## Change current language
  result = loadTranslations(lang)
  if not result and lang != "en":
    echo "Warning: Could not load translations for language: " & lang
    result = loadTranslations("en")

proc getAvailableLanguages*(): seq[string] =
  ## Get list of available language files
  result = @[]
  if dirExists("locales"):
    for file in walkFiles("locales/*.json"):
      let lang = file.splitFile().name
      result.add(lang)

proc initI18n*(lang: string = "en") =
  if not loadTranslations(lang):
    echo "Warning: Could not load translations for language: " & lang
    if lang != "en":
      if not loadTranslations("en"):
        echo "Error: Could not load default English translations."

# Initialize with default language
initI18n()
