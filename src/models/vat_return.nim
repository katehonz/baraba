import std/[times, options]
import orm/orm

type
  VatReturnStatus* = enum
    vrsDraft = "DRAFT"
    vrsSubmitted = "SUBMITTED"
    vrsAccepted = "ACCEPTED"
    vrsRejected = "REJECTED"

  VatReturn* = object of Model
    company_id*: int64
    period_year*: int              # Year of the VAT period
    period_month*: int             # Month of the VAT period (1-12)
    status*: string                # DRAFT, SUBMITTED, ACCEPTED, REJECTED

    # Purchases (Покупки)
    purchase_base_20*: float       # Данъчна основа 20%
    purchase_vat_20*: float        # ДДС 20%
    purchase_base_9*: float        # Данъчна основа 9%
    purchase_vat_9*: float         # ДДС 9%
    purchase_base_0*: float        # Данъчна основа 0%
    purchase_intra_eu*: float      # ВОП (вътреобщностни придобивания)
    purchase_import*: float        # Внос

    # Sales (Продажби)
    sales_base_20*: float          # Данъчна основа 20%
    sales_vat_20*: float           # ДДС 20%
    sales_base_9*: float           # Данъчна основа 9%
    sales_vat_9*: float            # ДДС 9%
    sales_base_0*: float           # Данъчна основа 0% (износ)
    sales_intra_eu*: float         # ВОД (вътреобщностни доставки)
    sales_exempt*: float           # Освободени доставки

    # Totals
    total_purchase_vat*: float     # Общо ДДС за приспадане
    total_sales_vat*: float        # Общо начислено ДДС
    vat_due*: float                # ДДС за внасяне (+ стойност) или възстановяване (- стойност)

    # Files (Base64 encoded or file paths)
    pokupki_file*: string          # POKUPKI.TXT content
    prodajbi_file*: string         # PRODAJBI.TXT content
    deklar_file*: string           # DEKLAR.TXT content

    # Submission details
    submission_date*: Option[DateTime]
    submission_reference*: string  # Reference number from NAP
    rejection_reason*: string

    notes*: string
    created_by_id*: int64
    created_at*: DateTime
    updated_at*: DateTime

proc newVatReturn*(
  company_id: int64 = 0,
  period_year: int = 0,
  period_month: int = 0,
  status = "DRAFT",
  created_by_id: int64 = 0
): VatReturn =
  result = VatReturn(
    id: 0,
    company_id: company_id,
    period_year: period_year,
    period_month: period_month,
    status: status,
    purchase_base_20: 0.0,
    purchase_vat_20: 0.0,
    purchase_base_9: 0.0,
    purchase_vat_9: 0.0,
    purchase_base_0: 0.0,
    purchase_intra_eu: 0.0,
    purchase_import: 0.0,
    sales_base_20: 0.0,
    sales_vat_20: 0.0,
    sales_base_9: 0.0,
    sales_vat_9: 0.0,
    sales_base_0: 0.0,
    sales_intra_eu: 0.0,
    sales_exempt: 0.0,
    total_purchase_vat: 0.0,
    total_sales_vat: 0.0,
    vat_due: 0.0,
    pokupki_file: "",
    prodajbi_file: "",
    deklar_file: "",
    submission_date: none(DateTime),
    submission_reference: "",
    rejection_reason: "",
    notes: "",
    created_by_id: created_by_id,
    created_at: now(),
    updated_at: now()
  )

proc periodDisplay*(vr: VatReturn): string =
  const monthNames = ["Януари", "Февруари", "Март", "Април", "Май", "Юни",
                      "Юли", "Август", "Септември", "Октомври", "Ноември", "Декември"]
  if vr.period_month >= 1 and vr.period_month <= 12:
    result = monthNames[vr.period_month - 1] & " " & $vr.period_year
  else:
    result = $vr.period_month & "/" & $vr.period_year
