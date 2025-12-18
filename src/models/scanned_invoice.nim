import std/[times]
import orm/orm

type
  ScannedInvoice* = object of Model
    direction*: string        # PURCHASE, SALE, UNKNOWN
    status*: string           # PENDING, PROCESSED, REJECTED
    document_number*: string
    document_date*: DateTime
    due_date*: DateTime
    # Vendor info
    vendor_name*: string
    vendor_vat_number*: string
    vendor_address*: string
    # Customer info
    customer_name*: string
    customer_vat_number*: string
    customer_address*: string
    # Amounts
    subtotal*: float
    total_tax*: float
    invoice_total*: float
    # Validation
    validation_status*: string
    vies_validation_message*: string
    requires_manual_review*: bool
    manual_review_reason*: string
    # File
    file_name*: string
    file_path*: string
    # Suggested accounts
    counterparty_account_id*: int64
    vat_account_id*: int64
    expense_revenue_account_id*: int64
    # Relations
    company_id*: int64
    counterpart_id*: int64
    journal_entry_id*: int64
    created_by_id*: int64
    created_at*: DateTime
    updated_at*: DateTime

proc newScannedInvoice*(
  direction = "UNKNOWN",
  status = "PENDING",
  document_number = "",
  document_date = now(),
  vendor_name = "",
  vendor_vat_number = "",
  vendor_address = "",
  customer_name = "",
  customer_vat_number = "",
  customer_address = "",
  subtotal = 0.0,
  total_tax = 0.0,
  invoice_total = 0.0,
  validation_status = "PENDING",
  file_name = "",
  company_id: int64 = 0,
  created_by_id: int64 = 0
): ScannedInvoice =
  ScannedInvoice(
    id: 0,
    direction: direction,
    status: status,
    document_number: document_number,
    document_date: document_date,
    due_date: now(),
    vendor_name: vendor_name,
    vendor_vat_number: vendor_vat_number,
    vendor_address: vendor_address,
    customer_name: customer_name,
    customer_vat_number: customer_vat_number,
    customer_address: customer_address,
    subtotal: subtotal,
    total_tax: total_tax,
    invoice_total: invoice_total,
    validation_status: validation_status,
    vies_validation_message: "",
    requires_manual_review: false,
    manual_review_reason: "",
    file_name: file_name,
    file_path: "",
    counterparty_account_id: 0,
    vat_account_id: 0,
    expense_revenue_account_id: 0,
    company_id: company_id,
    counterpart_id: 0,
    journal_entry_id: 0,
    created_by_id: created_by_id,
    created_at: now(),
    updated_at: now()
  )
