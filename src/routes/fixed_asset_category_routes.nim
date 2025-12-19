import std/[json, strutils]
import jester
import orm/orm

import ../db/config
import ../models/fixed_asset_category
import baraba_shared/utils/json_utils

proc fixedAssetCategoryRoutes*(): auto =
  router fixedAssetCategoryRouter:
    get "/api/fixed-asset-categories":
      let companyId = request.params.getOrDefault("companyId", "0").parseInt
      let db = getDbConn()
      try:
        var categories: seq[FixedAssetCategory]
        if companyId > 0:
          categories = findWhere(FixedAssetCategory, db, "company_id = $1", $companyId)
        else:
          categories = findAll(FixedAssetCategory, db)
        resp Http200, {"Content-Type": "application/json"}, $toJsonArray(categories)
      finally:
        releaseDbConn(db)

  return fixedAssetCategoryRouter
