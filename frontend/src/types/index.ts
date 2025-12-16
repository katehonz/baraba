// User types
export interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  groupId: number;
}

export interface UserGroup {
  id: number;
  name: string;
  description: string;
  canCreateCompanies: boolean;
  canEditCompanies: boolean;
  canDeleteCompanies: boolean;
  canManageUsers: boolean;
  canViewReports: boolean;
  canPostEntries: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Company types
export interface Company {
  id: number;
  name: string;
  eik: string;
  vatNumber: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  contactPerson: string;
  managerName: string;
  isActive: boolean;
  baseCurrencyId: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompanyInput {
  name: string;
  eik: string;
  vatNumber?: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
}

// Account types
export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
export type VatDirection = 'NONE' | 'INPUT' | 'OUTPUT' | 'BOTH';

export interface Account {
  id: number;
  code: string;
  name: string;
  description: string;
  accountType: AccountType;
  accountClass: number;
  level: number;
  isVatApplicable: boolean;
  vatDirection: VatDirection;
  isActive: boolean;
  isAnalytical: boolean;
  supportsQuantities: boolean;
  defaultUnit: string;
  companyId: number;
  parentId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountInput {
  code: string;
  name: string;
  description?: string;
  accountType?: AccountType;
  accountClass?: number;
  companyId: number;
  parentId?: number | null;
}

// Counterpart types
export type CounterpartType = 'CUSTOMER' | 'SUPPLIER' | 'EMPLOYEE' | 'BANK' | 'GOVERNMENT' | 'OTHER';

export interface Counterpart {
  id: number;
  name: string;
  eik: string;
  vatNumber: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  contactPerson: string;
  counterpartType: CounterpartType;
  isCustomer: boolean;
  isSupplier: boolean;
  isVatRegistered: boolean;
  isActive: boolean;
  companyId: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCounterpartInput {
  name: string;
  eik?: string;
  vatNumber?: string;
  address?: string;
  city?: string;
  counterpartType?: CounterpartType;
  isCustomer?: boolean;
  isSupplier?: boolean;
  companyId?: number;
}

export interface FixedAssetCategory {
  id: number;
  name: string;
  description: string;
  minDepreciationRate: number;
  maxDepreciationRate: number;
  companyId: number;
}

// Journal types
export interface JournalEntry {
  id: number;
  entryNumber: number;
  documentDate: string;
  vatDate: string | null;
  accountingDate: string;
  documentNumber: string;
  description: string;
  totalAmount: number;
  totalVatAmount: number;
  isPosted: boolean;
  documentType: string;
  companyId: number;
  counterpartId: number | null;
  createdById: number;
  postedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EntryLine {
  id: number;
  debitAmount: number;
  creditAmount: number;
  currencyCode: string;
  description: string;
  lineOrder: number;
  journalEntryId: number;
  accountId: number;
  counterpartId: number | null;
}

export interface CreateJournalEntryInput {
  documentNumber?: string;
  description?: string;
  totalAmount?: number;
  companyId: number;
  counterpartId?: number;
  lines?: CreateEntryLineInput[];
}

export interface CreateEntryLineInput {
  debitAmount?: number;
  creditAmount?: number;
  currencyCode?: string;
  currencyAmount?: number;
  exchangeRate?: number;
  description?: string;
  accountId: number;
}

// Currency
export interface Currency {
  id: number;
  code: string;
  name: string;
  nameBg: string;
  symbol: string;
  isActive: boolean;
  isBaseCurrency: boolean;
}

export interface ExchangeRate {
  id: number;
  from_currency_id: number;
  to_currency_id: number;
  fromCurrency?: { code: string };
  toCurrency?: { code: string };
  rate: number;
  valid_date: string;
  validDate?: string;
  rate_source: string;
  rateSource?: string;
}

export interface VatRate {
  id: number;
  code: string;
  name: string;
  rate: number;
  isDefault: boolean;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  companyId: number;
}

// Bank types
export type ConnectionType = 'FILE_IMPORT' | 'SALT_EDGE' | 'MANUAL';
export type ImportFormat = 'UNICREDIT_MT940' | 'WISE_CAMT053' | 'REVOLUT_CAMT053' | 'PAYSERA_CAMT053' | 'POSTBANK_XML' | 'OBB_XML' | 'CCB_CSV';

export interface BankProfile {
  id: number;
  name: string;
  iban: string;
  accountId: number;
  bufferAccountId: number;
  currencyCode: string;
  connectionType: ConnectionType;
  importFormat: ImportFormat;
  saltEdgeProviderCode: string;
  saltEdgeProviderName: string;
  saltEdgeStatus: string;
  saltEdgeLastSyncAt: string;
  isActive: boolean;
  companyId: number;
}

export interface CreateBankProfileInput {
  companyId: number;
  name: string;
  iban?: string;
  accountId: number;
  bufferAccountId: number;
  currencyCode: string;
  connectionType: ConnectionType;
  importFormat?: ImportFormat;
  saltEdgeProviderCode?: string;
  isActive: boolean;
}

export interface SaltEdgeProvider {
  id: string;
  code: string;
  name: string;
  countryCode: string;
  logoUrl: string;
}

// Scanned Invoice types
export type InvoiceDirection = 'PURCHASE' | 'SALE' | 'UNKNOWN';
export type ValidationStatus = 'PENDING' | 'VALID' | 'INVALID' | 'NOT_APPLICABLE' | 'MANUAL_REVIEW';
export type ScannedInvoiceStatus = 'PENDING' | 'PROCESSED' | 'REJECTED';

export interface SuggestedAccounts {
  counterpartyAccount: { id: number; code: string; name: string } | null;
  vatAccount: { id: number; code: string; name: string } | null;
  expenseOrRevenueAccount: { id: number; code: string; name: string } | null;
}

export interface RecognizedInvoice {
  vendorName: string;
  vendorVatNumber: string;
  vendorAddress: string;
  customerName: string;
  customerVatNumber: string;
  customerAddress: string;
  invoiceId: string;
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  totalTax: number;
  invoiceTotal: number;
  direction: InvoiceDirection;
  validationStatus: ValidationStatus;
  viesValidationMessage: string;
  suggestedAccounts: SuggestedAccounts;
  requiresManualReview: boolean;
  manualReviewReason: string;
}

export interface ScannedInvoice {
  id: number;
  direction: InvoiceDirection;
  status: ScannedInvoiceStatus;
  documentNumber: string;
  documentDate: string;
  vendorName: string;
  vendorVatNumber: string;
  customerName: string;
  customerVatNumber: string;
  subtotal: number;
  totalTax: number;
  invoiceTotal: number;
  validationStatus: ValidationStatus;
  requiresManualReview: boolean;
  manualReviewReason: string;
  fileName: string;
  counterpartId: number | null;
  journalEntryId: number | null;
  companyId: number;
  createdAt: string;
}

// VAT Return types
export type VatReturnStatus = 'DRAFT' | 'CALCULATED' | 'SUBMITTED' | 'ACCEPTED' | 'PAID';

export interface VatReturn {
  id: number;
  periodYear: number;
  periodMonth: number;
  periodFrom: string;
  periodTo: string;
  status: VatReturnStatus;
  outputVatAmount: number;
  inputVatAmount: number;
  vatToPay: number;
  vatToRefund: number;
  submittedAt?: string;
  dueDate: string;
  salesDocumentCount: number;
  purchaseDocumentCount: number;
  companyId: number;
}

export interface VatReturnDetails extends VatReturn {
  salesBase20: number;
  salesVat20: number;
  salesBase9: number;
  salesVat9: number;
  salesBaseVop: number;
  salesVatVop: number;
  salesBase0Export: number;
  salesBase0Vod: number;
  salesBase0Art3: number;
  salesBaseArt21: number;
  salesBaseArt69: number;
  salesBaseExempt: number;
  salesVatPersonalUse: number;
  purchaseBaseFullCredit: number;
  purchaseVatFullCredit: number;
  purchaseBasePartialCredit: number;
  purchaseVatPartialCredit: number;
  purchaseBaseNoCredit: number;
  purchaseVatAnnualAdjustment: number;
  creditCoefficient: number;
  totalDeductibleVat: number;
  calculatedAt?: string;
  effectiveVatToPay: number;
  vatForDeduction: number;
  vatRefundArt92: number;
}

export interface VatDocumentType {
  code: string;
  name: string;
}

export interface VatOperation {
  code: string;
  name: string;
  description: string;
}
