import std/[json, strutils]
import jester
import norm/postgres

import ../db/config
import ../models/fixed_asset_category
import ../utils/json_utils

proc fixedAssetCategoryRoutes*(): auto =
  router fixedAssetCategoryRouter:
    get "/api/fixed-asset-categories":
      let companyId = request.params.getOrDefault("companyId", "0").parseInt
      let db = getDbConn()
      try:
        var categories = @[newFixedAssetCategory()]
        if companyId > 0:
          db.select(categories, "company_id = $1", companyId)
        else:
          db.selectAll(categories)
        if categories.len == 1 and categories[0].id == 0:
          categories = @[]
        resp Http200, {"Content-Type": "application/json"}, $toJsonArray(categories)
      finally:
        releaseDbConn(db)

  return fixedAssetCategoryRouter
