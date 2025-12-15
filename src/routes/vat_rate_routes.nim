import std/json
import std/asyncfutures
import ../db/config
import ../models/vatrate

proc getVatRates*(companyId: int): Future[string] {.async.} =
  let db = await openDb()
  let rates = await db.getAll(VatRate, "company_id = $1", companyId)
  return $toJson(rates)

proc createVatRate*(companyId: int, code: string, name: string, rate: float, effectiveFrom: string, isDefault: bool): Future[string] {.async.} =
  let db = await openDb()
  # The old component has isDefault, but the model does not. I will ignore it for now.
  var vatRate = newVatRate(
    company_id = companyId,
    code = code,
    name = name,
    rate = rate,
  )
  # The old component has effectiveFrom, but the model has valid_from: Option[DateTime]
  # I will parse the string and set it.
  vatRate.valid_from = some(parse(effectiveFrom, "yyyy-MM-dd"))
  
  await db.insert(vatRate)
  return $toJson(vatRate)

proc deleteVatRate*(id: int): Future[string] {.async.} =
  let db = await openDb()
  var vatRate = newVatRate()
  await db.select(vatRate, "id = $1", id)
  await db.delete(vatRate)
  return %*{"success": true}
