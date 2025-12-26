// Type definitions for Baraba API

export interface Company {
  id: string
  name: string
  eik: string
  vat_number?: string
  address?: string
  city?: string
  country?: string
  post_code?: string
  phone?: string
  email?: string
  website?: string
  is_vat_registered: boolean
  is_intrastat_registered: boolean
  nap_office?: string
  vat_period: string
  currency: string
  fiscal_year_start_month: number
  representative_type?: string
  representative_name?: string
  representative_eik?: string
  saltedge_enabled: boolean
  ai_scanning_enabled: boolean
  vies_validation_enabled: boolean
  cash_account_id?: string
  bank_account_id?: string
  customers_account_id?: string
  suppliers_account_id?: string
  vat_payable_account_id?: string
  vat_receivable_account_id?: string
  expenses_account_id?: string
  revenues_account_id?: string
  fx_gains_account_id?: string
  fx_losses_account_id?: string
  // Integration credentials
  azure_di_endpoint?: string
  azure_di_api_key?: string
  saltedge_app_id?: string
  saltedge_secret?: string
  // S3 Storage configuration
  s3_enabled?: boolean
  s3_bucket?: string
  s3_region?: string
  s3_endpoint?: string
  s3_access_key?: string
  s3_secret_key?: string
  s3_secret_key_configured?: boolean
  s3_folder_prefix?: string
  inserted_at: string
  updated_at: string
}

export interface Account {
  id: string
  code: string
  name: string
  description?: string
  account_type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'
  account_class?: string
  level?: number
  parent_id?: string
  is_active: boolean
  is_system: boolean
  is_analytical: boolean
  analytical_group?: string
  can_have_direct_entries: boolean
  vat_applicable: 'NONE' | 'INPUT' | 'OUTPUT' | 'BOTH'
  saft_account_code?: string
  saft_account_type?: string
  is_multi_currency: boolean
  is_quantity_tracked: boolean
  is_revaluable?: boolean
  default_unit?: string
  default_currency_id?: string
  company_id: string
  inserted_at: string
  updated_at: string
}

export interface Counterpart {
  id: string
  name: string
  eik?: string
  vat_number?: string
  address?: string
  long_address?: string
  city?: string
  country: string
  post_code?: string
  phone?: string
  email?: string
  website?: string
  contact_person?: string
  notes?: string
  is_customer: boolean
  is_supplier: boolean
  is_employee: boolean
  is_vat_registered: boolean
  is_eu_registered: boolean
  is_intrastat_registered: boolean
  vat_validated: boolean
  vat_validation_date?: string
  vies_status?: string
  payment_terms_days: number
  payment_method?: 'BANK' | 'CASH' | 'CARD'
  bank_account?: string
  bank_name?: string
  swift?: string
  iban?: string
  company_id: string
  inserted_at: string
  updated_at: string
}

export interface VatRate {
  id: string
  name: string
  percentage: number
  description?: string
  is_active: boolean
  effective_from: string
  effective_to?: string
  vat_code?: string
  saft_tax_type?: string
  is_reverse_charge_applicable: boolean
  is_intrastat_applicable: boolean
  company_id: string
  inserted_at: string
  updated_at: string
}

export interface EntryLine {
  id: string
  line_number: number
  description?: string
  debit_amount: number
  credit_amount: number
  base_debit_amount: number
  base_credit_amount: number
  quantity?: number
  unit_price?: number
  unit?: string
  exchange_rate?: number
  vat_amount: number
  vat_rate_percentage?: number
  vat_direction?: 'NONE' | 'INPUT' | 'OUTPUT'
  is_reverse_charge: boolean
  is_intrastat: boolean
  notes?: string
  journal_entry_id: string
  debit_account_id?: string
  credit_account_id?: string
  counterpart_id?: string
  vat_rate_id?: string
}

export interface VatEntry {
  id?: string
  document_type: string
  document_number: string
  document_date: string
  posting_date: string
  deal_type: string
  description?: string
  tax_base: number
  vat_amount: number
  vat_rate: number
  total_amount: number
  is_purchase: boolean
  is_included: boolean
  company_id: string
  journal_entry_id?: string
  counterpart_id?: string
}

export interface JournalEntry {
  id: string
  entry_number: string
  description?: string
  document_number?: string
  document_type: 'INVOICE' | 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'RECEIPT' | 'PAYMENT' | 'BANK_STATEMENT' | 'OTHER'
  document_date: string
  accounting_date: string
  vat_date?: string
  currency: string
  exchange_rate?: number
  total_debit?: number
  total_credit?: number
  base_total_debit?: number
  base_total_credit?: number
  vat_amount: number
  is_posted: boolean
  posted_at?: string
  posted_by_id?: string
  created_by_id?: string
  notes?: string
  vat_operation_type?: string
  vat_document_type?: string
  company_id: string
  debtor_counterpart_id?: string
  creditor_counterpart_id?: string
  entry_lines: EntryLine[]
  vat_entry?: VatEntry
  inserted_at: string
  updated_at: string
}

export interface UnifiedTransactionForm {
  company_id: string
  document_date: string
  document_number: string
  document_type: string
  description: string
  currency: string
  exchange_rate?: number
  debtor_counterpart_id?: string
  creditor_counterpart_id?: string
  vat_entry?: Partial<VatEntry>
  entry_lines: Partial<EntryLine>[]
}

export interface User {
  id: string
  email: string
  first_name?: string
  last_name?: string
  phone?: string
  role: 'admin' | 'accountant' | 'user'
  is_active: boolean
  last_login_at?: string
  password_reset_token?: string
  password_reset_expires_at?: string
  email_verified_at?: string
  inserted_at: string
  updated_at: string
}

export interface FixedAssetCategory {
  id: string
  name: string
  description?: string
  min_depreciation_rate?: number
  max_depreciation_rate?: number
  company_id: string
}

export interface FixedAsset {
  id: string
  name: string
  inventory_number: string
  description?: string
  acquisition_date: string
  acquisition_cost: number
  residual_value: number
  document_number?: string
  document_date?: string
  put_into_service_date?: string
  status: 'ACTIVE' | 'DEPRECIATED' | 'DISPOSED' | 'SOLD'
  depreciation_method: 'LINEAR' | 'DECLINING_BALANCE'
  accounting_depreciation_rate?: number
  tax_depreciation_rate?: number
  accounting_accumulated_depreciation: number
  accounting_book_value?: number
  tax_accumulated_depreciation: number
  tax_book_value?: number
  last_depreciation_date?: string
  disposed_date?: string
  disposal_amount?: number
  company_id: string
  category_id: string
  category?: FixedAssetCategory
}

export interface DepreciationJournal {
  id: string
  fixed_asset_id: string
  fixed_asset_name: string
  fixed_asset_inventory_number: string
  period: string
  accounting_depreciation_amount: number
  accounting_book_value_before: number
  accounting_book_value_after: number
  tax_depreciation_amount: number
  tax_book_value_before: number
  tax_book_value_after: number
  is_posted: boolean
  journal_entry_id?: string
  company_id: string
}

export interface CalculatedPeriod {
  year: number
  month: number
  period_display: string
  is_posted: boolean
  total_accounting_amount: number
  total_tax_amount: number
  assets_count: number
}

export interface CalculationResult {
  calculated: Array<{
    fixed_asset_id: string
    fixed_asset_name: string
    accounting_depreciation_amount: number
    tax_depreciation_amount: number
  }>
  errors: Array<{
    fixed_asset_id: string
    asset_name: string
    error_message: string
  }>
  total_accounting_amount: number
  total_tax_amount: number
}

export interface PostResult {
  journal_entry_id: string
  total_amount: number
  assets_count: number
}

// Filter types
export interface CounterpartFilters {
  customers_only?: boolean
  suppliers_only?: boolean
  vat_registered?: boolean
}

export interface JournalEntryFilters {
  posted_only?: boolean
  document_type?: string
  date_from?: string
  date_to?: string
}

export interface VatRateFilters {
  active_only?: boolean
}

// Form types (for create/update operations)
export type CompanyForm = Omit<Company, 'id' | 'inserted_at' | 'updated_at'>
export type AccountForm = Omit<Account, 'id' | 'inserted_at' | 'updated_at'>
export type CounterpartForm = Omit<Counterpart, 'id' | 'inserted_at' | 'updated_at'>
export type VatRateForm = Omit<VatRate, 'id' | 'inserted_at' | 'updated_at'>
export type JournalEntryForm = Omit<JournalEntry, 'id' | 'inserted_at' | 'updated_at'>

// API Response wrapper
export interface ApiResponse<T> {
  data: T
}

export interface ApiError {
  errors?: Record<string, string[]>
  error?: string
}

export interface Product {
  id: string
  product_code: string
  type: 'PRODUCT' | 'SERVICE'
  product_group?: string
  description: string
  commodity_code?: string
  ean_code?: string
  valuation_method?: string
  uom_base: string
  uom_standard: string
  uom_conversion_factor: number
  tax_type: string
  tax_code: string
  company_id: string
  inserted_at: string
  updated_at: string
}

export interface StockLevel {
  id: string
  period_start: string
  period_end: string
  warehouse_id: string
  location_id?: string
  product_code: string
  product_type: string
  uom_physical_stock?: string
  unit_price_begin?: number
  unit_price_end?: number
  opening_stock_quantity?: number
  opening_stock_value?: number
  closing_stock_quantity?: number
  closing_stock_value?: number
  owner_id?: string
  company_id: string
}

export interface StockMovement {
  id: string
  movement_reference: string
  movement_type: string
  movement_date: string
  product_code: string
  quantity: number
  uom: string
  unit_price?: number
  amount?: number
  warehouse_id: string
  location_id?: string
  description?: string
  company_id: string
}

export interface Currency {
  id: string
  code: string
  name: string
  name_bg?: string
  symbol?: string
  decimal_places: number
  is_active: boolean
  is_base_currency: boolean
  bnb_code?: string
}

export interface ExchangeRate {
  id: string
  rate: number
  reverse_rate?: number
  valid_date: string
  rate_source: string
  is_active: boolean
  from_currency: {
    id: string
    code: string
    name: string
    symbol?: string
  }
  to_currency: {
    id: string
    code: string
    name: string
    symbol?: string
  }
}

export type CurrencyForm = Omit<Currency, 'id'>

export interface FetchRatesResult {
  success: boolean
  date?: string
  year?: number
  month?: number
  days_count?: number
  imported_count?: number
  message?: string
  error?: string
}

// Scanner / AI Invoice Recognition types
export type InvoiceDirection = 'PURCHASE' | 'SALE' | 'UNKNOWN'
export type ValidationStatus = 'PENDING' | 'VALID' | 'INVALID' | 'NOT_APPLICABLE' | 'MANUAL_REVIEW'
export type ScannedInvoiceStatus = 'PENDING' | 'APPROVED' | 'PROCESSED' | 'REJECTED'

export interface BankAccount {
  id: string
  name: string
  iban?: string
  currency?: string
  import_type: 'manual' | 'saltedge'
  saltedge_connection_id?: string
  company_id: string
  account_id?: string
  account_code?: string
  inserted_at: string
  updated_at: string
}

export interface BankTransaction {
  id: string
  transaction_date: string
  booking_date?: string
  amount: number
  currency: string
  description?: string
  counterparty_name?: string
  counterparty_iban?: string
  external_id?: string
  status: 'pending' | 'posted' | 'ignored'
  raw_data?: any
  bank_account_id: string
  journal_entry_id?: string
  inserted_at: string
  updated_at: string
}

export interface SuggestedAccounts {
  counterpartyAccount: { id: number; code: string; name: string } | null
  vatAccount: { id: number; code: string; name: string } | null
  expenseOrRevenueAccount: { id: number; code: string; name: string } | null
}

export interface RecognizedInvoice {
  vendorName: string
  vendorVatNumber: string
  vendorAddress: string
  customerName: string
  customerVatNumber: string
  customerAddress: string
  invoiceId: string
  invoiceDate: string
  dueDate: string
  subtotal: number
  totalTax: number
  invoiceTotal: number
  direction: InvoiceDirection
  validationStatus: ValidationStatus
  viesValidationMessage: string
  suggestedAccounts: SuggestedAccounts
  requiresManualReview: boolean
  manualReviewReason: string
}

export interface ScannedInvoice {
  id: number
  direction: InvoiceDirection
  status: ScannedInvoiceStatus
  documentNumber: string
  documentDate: string
  vendorName: string
  vendorVatNumber: string
  customerName: string
  customerVatNumber: string
  subtotal: number
  totalTax: number
  invoiceTotal: number
  validationStatus: ValidationStatus
  requiresManualReview: boolean
  manualReviewReason: string
  fileName: string
  counterpartId: number | null
  journalEntryId: number | null
  companyId: number
  createdAt: string
  // S3 Storage
  internal_number?: number
  s3_key?: string
  s3_uploaded_at?: string
}

export interface AccountingPeriod {
  id: string
  company_id: string
  year: number
  month: number
  status: 'OPEN' | 'CLOSED'
  closed_at?: string
  notes?: string
  closed_by?: string
  inserted_at: string
  updated_at: string
}

export type AccountingPeriodForm = Omit<AccountingPeriod, 'id' | 'inserted_at' | 'updated_at'>

// Currency Revaluation Types
export interface CurrencyRevaluationLine {
  id?: string
  account_id: string
  account_code?: string
  account_name?: string
  currency_id: string
  currency_code?: string
  foreign_debit_balance: number
  foreign_credit_balance: number
  foreign_net_balance: number
  recorded_base_balance: number
  exchange_rate: number
  revalued_base_balance: number
  revaluation_difference: number
  is_gain: boolean
}

export interface CurrencyRevaluation {
  id: string
  company_id: string
  year: number
  month: number
  revaluation_date: string
  status: 'PENDING' | 'POSTED' | 'REVERSED'
  total_gains: number
  total_losses: number
  net_result: number
  notes?: string
  journal_entry_id?: string
  posted_at?: string
  lines?: CurrencyRevaluationLine[]
  inserted_at: string
  updated_at: string
}

export interface RevaluationPreview {
  year: number
  month: number
  revaluation_date: string
  lines: CurrencyRevaluationLine[]
  total_gains: number
  total_losses: number
  net_result: number
  fx_gains_account_id?: string
  fx_losses_account_id?: string
}

export interface RevaluableAccount {
  id: string
  code: string
  name: string
  is_revaluable: boolean
  is_multi_currency: boolean
  default_currency_id?: string
  default_currency_code?: string
}

export interface OpeningBalance {
  id: string
  date: string
  debit: number
  credit: number
  account_id: string
  account_code?: string
  account_name?: string
  company_id: string
  accounting_period_id?: string
  inserted_at: string
  updated_at: string
}

export type OpeningBalanceForm = Omit<OpeningBalance, 'id' | 'inserted_at' | 'updated_at' | 'account_code' | 'account_name'>

// User-Company relationship types
export interface UserCompany {
  id: number
  userId: number
  companyId: string
  isDefault: boolean
  username?: string
  companyName?: string
}

export interface UserCompanyCreate {
  userId: number
  companyId: string
  isDefault: boolean
}

// S3 Storage types
export interface S3Settings {
  s3_enabled: boolean
  s3_bucket?: string
  s3_region?: string
  s3_endpoint?: string
  s3_access_key?: string
  s3_secret_key?: string
  s3_folder_prefix?: string
}

export interface S3File {
  key: string
  size: number
  last_modified: string
  etag?: string
}