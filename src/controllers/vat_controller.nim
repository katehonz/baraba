import std/[times, strformat, strutils, options, algorithm, sequtils]
from ../utils/encoding import toWindows1251
import orm/orm
import ../models/[journal, company, counterpart]
import ../db/config

type
  VatTotals* = object
    # Purchase totals (columns 9-15)
    col09*: float  # Доставки без право на ДК
    col10*: float  # Облагаеми доставки с право на пълен ДК (данъчна основа)
    col10vat*: float  # ДДС за кол. 10
    col12*: float  # Облагаеми доставки с право на частичен ДК (данъчна основа)
    col12vat*: float  # ДДС за кол. 12
    col14*: float  # Годишна корекция
    col15*: float  # Тристранни операции
    # Sales totals (columns 11-25)
    col11*: float  # Облагаеми доставки 20% (данъчна основа)
    col11vat*: float  # ДДС за кол. 11
    col13*: float  # ВОП
    col17*: float  # Облагаеми доставки 9%
    col17vat*: float  # ДДС за кол. 17
    col19*: float  # Доставки със ставка 0%
    col20*: float  # ВОД
    col21*: float  # Доставки по чл.140, 146, 173
    col22*: float  # Доставки на услуги чл.21, ал.2
    col23*: float  # Доставки по чл.69, ал.2
    col24*: float  # Освободени доставки
    col25*: float  # Тристранни операции (посредник)

  VatManager* = object
    company*: Company
    period*: string # YYYYMM
    purchase_ledger*: seq[JournalEntry]
    sales_ledger*: seq[JournalEntry]
    totals*: VatTotals

proc newVatManager*(company: Company, period: string): VatManager =
  VatManager(
    company: company,
    period: period,
    purchase_ledger: @[],
    sales_ledger: @[],
    totals: VatTotals()
  )

proc formatField(s: string, len: int, alignRight: bool = false): string =
  ## Format string to fixed width, padding with spaces
  if s.len > len:
    return s[0 ..< len]
  elif alignRight:
    return repeat(" ", len - s.len) & s
  else:
    return s & repeat(" ", len - s.len)

proc formatAmount(f: float, width: int = 15): string =
  ## Format amount with 2 decimal places, right-aligned
  let formatted = formatFloat(abs(f), ffDecimal, 2)
  if f < 0:
    return ("-" & formatted).align(width)
  else:
    return formatted.align(width)

proc formatDate(dt: DateTime): string =
  ## Format date as DD/MM/YYYY
  return dt.format("dd/MM/yyyy")

proc getVatNumber(company: Company): string =
  ## Get VAT number, ensuring BG prefix
  if company.vat_number.startsWith("BG"):
    return company.vat_number
  else:
    return "BG" & company.eik

proc getCounterpartVatNumber(cp: Counterpart): string =
  ## Get counterpart VAT number with proper formatting
  if cp.vat_number != "":
    return cp.vat_number
  elif cp.eik != "":
    if cp.country == "BG":
      return "BG" & cp.eik
    else:
      return cp.eik
  else:
    return ""

proc mapPurchaseColumn(operation: string): int =
  ## Map purchase operation code to column number
  case operation
  of "1-09-1", "1-09-2": return 9
  of "1-10-1", "1-10-2", "1-10-3", "1-10-4", "1-10-5", "1-10-6": return 10
  of "1-12-1", "1-12-2", "1-12-3", "1-12-4": return 12
  of "1-14": return 14
  of "1-15": return 15
  else: return 10  # default to col 10

proc mapSalesColumn(operation: string): int =
  ## Map sales operation code to column number
  case operation
  of "2-11", "2-11-1", "2-11-2": return 11
  of "2-17", "2-17-old": return 17
  of "2-19-1", "2-19-2": return 19
  of "2-20": return 20
  of "2-21-1", "2-21-2": return 21
  of "2-22": return 22
  of "2-23": return 23
  of "2-24-1", "2-24-2", "2-24-3": return 24
  of "2-25": return 25
  else: return 11  # default to col 11

proc generatePurchaseLedger*(self: var VatManager, db: DbConn): string =
  ## Generate POKUPKI.TXT content (Purchase ledger)
  ## Fixed-width format:
  ## VAT(15) + Period(6) + Space(3) + Type(1) + LineNo(14) + DocNo(20) + Date(10) + CounterpartVAT(15) + Name(50) + City(40) + 7 amounts(15 each)
  var lines: seq[string] = @[]
  let companyVat = formatField(getVatNumber(self.company), 15)

  # Sort entries by document date
  var sortedEntries = self.purchase_ledger
  sortedEntries.sort(proc(a, b: JournalEntry): int =
    cmp(a.document_date, b.document_date))

  var lineNo = 0
  for entry in sortedEntries:
    lineNo += 1

    # Get counterpart info
    var cpName = ""
    var cpCity = ""
    var cpVat = ""

    if entry.counterpart_id.isSome:
      let cp = find(Counterpart, int(entry.counterpart_id.get), db)
      if cp.isSome:
        cpName = cp.get.name
        cpCity = cp.get.city
        cpVat = getCounterpartVatNumber(cp.get)

    # Determine amounts based on operation
    var col09, col10, col10vat, col12, col12vat, col14, col15: float = 0.0
    let col = mapPurchaseColumn(entry.vat_purchase_operation)

    case col
    of 9:
      col09 = entry.total_amount
      self.totals.col09 += col09
    of 10:
      col10 = entry.total_amount
      col10vat = entry.total_vat_amount
      self.totals.col10 += col10
      self.totals.col10vat += col10vat
    of 12:
      col12 = entry.total_amount
      col12vat = entry.total_vat_amount
      self.totals.col12 += col12
      self.totals.col12vat += col12vat
    of 14:
      col14 = entry.total_amount
      self.totals.col14 += col14
    of 15:
      col15 = entry.total_amount
      self.totals.col15 += col15
    else:
      col10 = entry.total_amount
      col10vat = entry.total_vat_amount
      self.totals.col10 += col10
      self.totals.col10vat += col10vat

    # Build the line
    var line = companyVat
    line &= formatField(self.period, 6)
    line &= "   "  # 3 spaces
    line &= "0"    # type indicator
    line &= formatField($lineNo, 14, true)  # right-aligned line number
    line &= formatField(entry.document_number, 20)
    line &= formatDate(entry.document_date)
    line &= formatField(cpVat, 15)
    line &= formatField(cpName, 50)
    line &= formatField(cpCity, 40)
    line &= formatAmount(col09)
    line &= formatAmount(col10)
    line &= formatAmount(col10vat)
    line &= formatAmount(col12)
    line &= formatAmount(col12vat)
    line &= formatAmount(col14)
    line &= formatAmount(col15)
    line &= "  "  # trailing spaces

    lines.add(line)

  return toWindows1251(lines.join("\n") & "\n")

proc generateSalesLedger*(self: var VatManager, db: DbConn): string =
  ## Generate PRODAGBI.TXT content (Sales ledger)
  ## Similar format to purchase ledger but with 17 amount columns
  var lines: seq[string] = @[]
  let companyVat = formatField(getVatNumber(self.company), 15)

  # Sort entries by document date
  var sortedEntries = self.sales_ledger
  sortedEntries.sort(proc(a, b: JournalEntry): int =
    cmp(a.document_date, b.document_date))

  var lineNo = 0
  for entry in sortedEntries:
    lineNo += 1

    # Get counterpart info
    var cpName = ""
    var cpCity = ""
    var cpVat = ""

    if entry.counterpart_id.isSome:
      let cp = find(Counterpart, int(entry.counterpart_id.get), db)
      if cp.isSome:
        cpName = cp.get.name
        cpCity = cp.get.city
        cpVat = getCounterpartVatNumber(cp.get)

    # Initialize all sales columns
    var col11, col11vat, col12, col13, col14, col16, col17, col17vat: float = 0.0
    var col19, col20, col21, col22, col23_1, col23_2, col24_1, col24_2, col25: float = 0.0

    let col = mapSalesColumn(entry.vat_sales_operation)

    case col
    of 11:
      col11 = entry.total_amount
      col11vat = entry.total_vat_amount
      self.totals.col11 += col11
      self.totals.col11vat += col11vat
    of 17:
      col17 = entry.total_amount
      col17vat = entry.total_vat_amount
      self.totals.col17 += col17
      self.totals.col17vat += col17vat
    of 19:
      col19 = entry.total_amount
      self.totals.col19 += col19
    of 20:
      col20 = entry.total_amount
      self.totals.col20 += col20
    of 21:
      col21 = entry.total_amount
      self.totals.col21 += col21
    of 22:
      col22 = entry.total_amount
      self.totals.col22 += col22
    of 23:
      col23_1 = entry.total_amount
      self.totals.col23 += col23_1
    of 24:
      col24_1 = entry.total_amount
      self.totals.col24 += col24_1
    of 25:
      col25 = entry.total_amount
      self.totals.col25 += col25
    else:
      col11 = entry.total_amount
      col11vat = entry.total_vat_amount
      self.totals.col11 += col11
      self.totals.col11vat += col11vat

    # Build the line - sales ledger has more columns
    var line = companyVat
    line &= formatField(self.period, 6)
    line &= "   "  # 3 spaces
    line &= "0"    # type indicator
    line &= formatField($lineNo, 14, true)  # right-aligned line number
    line &= formatField(entry.document_number, 20)
    line &= formatDate(entry.document_date)
    line &= formatField(cpVat, 15)
    line &= formatField(cpName, 50)
    line &= formatField(cpCity, 40)
    # 17 amount columns for sales
    line &= formatAmount(col11)       # col 11 - base 20%
    line &= formatAmount(col11vat)    # col 11 - VAT 20%
    line &= formatAmount(col11)       # col 11 repeat (total)
    line &= formatAmount(col11vat)    # col 11 VAT repeat
    line &= formatAmount(col12)       # col 12
    line &= formatAmount(col13)       # col 13 - ВОП
    line &= formatAmount(col14)       # col 14
    line &= formatAmount(col16)       # col 16
    line &= formatAmount(col17)       # col 17 - base 9%
    line &= formatAmount(col17vat)    # col 17 - VAT 9%
    line &= formatAmount(col19)       # col 19 - 0%
    line &= formatAmount(col20)       # col 20 - ВОД
    line &= formatAmount(col21)       # col 21
    line &= formatAmount(col22)       # col 22
    line &= formatAmount(col23_1)     # col 23-1
    line &= formatAmount(col24_1)     # col 24-1
    line &= formatAmount(col25)       # col 25
    line &= "  "  # trailing spaces

    lines.add(line)

  return toWindows1251(lines.join("\n") & "\n")

proc generateVatDeclaration*(self: var VatManager, db: DbConn): string =
  ## Generate DEKLAR.TXT content (VAT Declaration summary)
  ## Single line with company info and totals
  let companyVat = formatField(getVatNumber(self.company), 15)
  let companyName = formatField(self.company.name, 50)

  # Manager info
  let managerEgn = formatField(self.company.manager_egn, 10)
  let managerName = formatField(self.company.manager_name, 50)

  # Count entries
  let purchaseCount = self.purchase_ledger.len
  let salesCount = self.sales_ledger.len

  # Calculate declaration totals
  # Кол. 01 = Кол. 11 + Кол. 12 + ... (всички облагаеми продажби)
  let totalSalesBase = self.totals.col11 + self.totals.col17 + self.totals.col19 +
                       self.totals.col20 + self.totals.col21 + self.totals.col22 +
                       self.totals.col23 + self.totals.col25
  let totalSalesVat = self.totals.col11vat + self.totals.col17vat

  # Кол. 31 = ДДС за внасяне или възстановяване
  let totalPurchaseVat = self.totals.col10vat + self.totals.col12vat
  let vatDue = totalSalesVat - totalPurchaseVat

  var line = companyVat
  line &= formatField(companyName, 50)
  line &= managerEgn
  line &= formatField(managerName, 50)
  line &= formatField($salesCount, 15, true)
  line &= formatField($purchaseCount, 15, true)
  # Sales totals
  line &= formatAmount(totalSalesBase)
  line &= formatAmount(totalSalesVat)
  line &= formatAmount(self.totals.col11)
  line &= formatAmount(self.totals.col11vat)
  # Exempt and other
  line &= formatAmount(self.totals.col24)
  line &= formatAmount(self.totals.col19)
  line &= formatAmount(self.totals.col20)
  line &= formatAmount(self.totals.col21)
  line &= formatAmount(self.totals.col22)
  line &= formatAmount(self.totals.col23)
  line &= formatAmount(self.totals.col25)
  # Purchase totals
  line &= formatAmount(self.totals.col10)
  line &= formatAmount(self.totals.col10vat)
  line &= formatAmount(self.totals.col12)
  line &= formatAmount(self.totals.col12vat)
  line &= formatAmount(self.totals.col09)
  line &= formatAmount(self.totals.col14)
  line &= formatAmount(self.totals.col15)
  # VAT calculation
  line &= formatAmount(totalPurchaseVat)  # Total input VAT
  line &= formatAmount(vatDue)            # VAT due/refund
  line &= formatAmount(0.0)               # Correction
  line &= formatAmount(vatDue)            # Final VAT
  line &= "  "

  return toWindows1251(line & "\n")

proc generateVatFiles*(company: Company, period: string): tuple[purchase: string, sales: string, deklar: string] =
  var manager = newVatManager(company, period)

  let year = parseInt(period[0..3])
  let month = parseInt(period[4..5])
  let startDate = dateTime(year, Month(month), MonthdayRange(1))
  let endDate = startDate + 1.months - 1.days

  let db = getDbConn()
  defer: releaseDbConn(db)

  let startDateStr = startDate.format("yyyy-MM-dd")
  let endDateStr = endDate.format("yyyy-MM-dd")
  let allEntries = findWhere(JournalEntry, db, "company_id = $1 AND document_date >= $2 AND document_date <= $3", $company.id, startDateStr, endDateStr)

  for entry in allEntries:
    if entry.vat_purchase_operation != "":
      manager.purchase_ledger.add(entry)
    if entry.vat_sales_operation != "":
      manager.sales_ledger.add(entry)

  # Generate in order: first purchase to calculate totals, then sales, then declaration
  let purchase_content = manager.generatePurchaseLedger(db)
  let sales_content = manager.generateSalesLedger(db)
  let deklar_content = manager.generateVatDeclaration(db)

  return (purchase: purchase_content, sales: sales_content, deklar: deklar_content)
