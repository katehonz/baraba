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
