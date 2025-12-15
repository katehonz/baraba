import std/json
import std/asyncfutures
import ../db/config
import ../models/fixed_asset_category

proc getFixedAssetCategories*(companyId: int): Future[string] {.async.} =
  let db = await openDb()
  let categories = await db.getAll(FixedAssetCategory, "company_id = $1", companyId)
  return $toJson(categories)
