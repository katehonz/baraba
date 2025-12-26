// API Client for Baraba Backend
import {
  Company,
  Account,
  Counterpart,
  JournalEntry,
  VatRate,
  FixedAsset,
  FixedAssetCategory,
  DepreciationJournal,
  CalculatedPeriod,
  CalculationResult,
  PostResult,
  Product,
  StockLevel,
  StockMovement,
  Currency,
  ExchangeRate,
  FetchRatesResult,
  CounterpartFilters,
  JournalEntryFilters,
  VatRateFilters,
  BankAccount,
  BankTransaction,
  OpeningBalance
} from '../types'

// Use empty string for dev (Vite proxy handles /api requests)
// Set VITE_API_URL for production builds
const API_BASE_URL = import.meta.env?.VITE_API_URL || ''
// VAT service uses /vat-api prefix which Vite proxies to vat_service:5004
const VAT_API_URL = import.meta.env?.VITE_VAT_API_URL || ''
const VAT_API_PREFIX = '/vat-api'

interface ApiResponse<T> {
  data: T
  errors?: Record<string, string[]>
}

interface ApiError {
  errors?: Record<string, string[]>
  error?: string
}

// Helper to get auth token
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token')
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  getBaseUrl(): string {
    return this.baseUrl
  }

  private getAuthHeaders(): Record<string, string> {
    const token = getAuthToken()
    if (token) {
      return { 'Authorization': `Bearer ${token}` }
    }
    return {}
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...options.headers,
      },
      ...options,
    }

    const response = await fetch(url, config)

    if (!response.ok) {
      let error: ApiError = {}

      if (response.headers.get('content-type')?.includes('application/json')) {
        error = await response.json()
      } else {
        error.error = `HTTP ${response.status}: ${response.statusText}`
      }

      throw error
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return undefined as T
    }

    return response.json()
  }

  private async requestBlob(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Blob> {
    const url = `${this.baseUrl}${endpoint}`

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...options.headers,
      },
      ...options,
    }

    const response = await fetch(url, config)

    if (!response.ok) {
      let error: ApiError = {}
      if (response.headers.get('content-type')?.includes('application/json')) {
         error = await response.json()
         throw error
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response.blob()
  }

  // Generic CRUD operations
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<ApiResponse<T>>(endpoint)
  }

  async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<ApiResponse<T>>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async put<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<ApiResponse<T>>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async delete<T = void>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<ApiResponse<T>>(endpoint, {
      method: 'DELETE',
    })
  }

  // Companies
  async getCompanies(): Promise<ApiResponse<Company[]>> {
    return this.get<Company[]>('/api/companies')
  }

  async getCompany(id: string): Promise<ApiResponse<Company>> {
    return this.get<Company>(`/api/companies/${id}`)
  }

  async createCompany(data: Partial<Company>): Promise<ApiResponse<Company>> {
    return this.post<Company>('/api/companies', { company: data })
  }

  async updateCompany(id: string, data: Partial<Company>): Promise<ApiResponse<Company>> {
    return this.put<Company>(`/api/companies/${id}`, { company: data })
  }

  async deleteCompany(id: string): Promise<void> {
    return this.delete(`/api/companies/${id}`)
  }

  // Accounts
  async getAccounts(companyId: string): Promise<ApiResponse<Account[]>> {
    return this.get<Account[]>(`/api/companies/${companyId}/accounts`)
  }

  async getAccount(companyId: string, id: string): Promise<ApiResponse<Account>> {
    return this.get<Account>(`/api/companies/${companyId}/accounts/${id}`)
  }

  async createAccount(companyId: string, data: Partial<Account>): Promise<ApiResponse<Account>> {
    return this.post<Account>(`/api/companies/${companyId}/accounts`, { account: data })
  }

  async updateAccount(companyId: string, id: string, data: Partial<Account>): Promise<ApiResponse<Account>> {
    return this.put<Account>(`/api/companies/${companyId}/accounts/${id}`, { account: data })
  }

  async deleteAccount(companyId: string, id: string): Promise<void> {
    return this.delete(`/api/companies/${companyId}/accounts/${id}`)
  }

  // Opening Balances
  async getOpeningBalances(companyId: string, date?: string): Promise<ApiResponse<OpeningBalance[]>> {
    const query = date ? `?date=${date}` : ''
    return this.get<OpeningBalance[]>(`/api/companies/${companyId}/opening-balances${query}`)
  }

  async createOpeningBalance(companyId: string, data: Partial<OpeningBalance>): Promise<ApiResponse<OpeningBalance>> {
    return this.post<OpeningBalance>(`/api/companies/${companyId}/opening-balances`, { opening_balance: data })
  }

  async updateOpeningBalance(companyId: string, id: string, data: Partial<OpeningBalance>): Promise<ApiResponse<OpeningBalance>> {
    return this.put<OpeningBalance>(`/api/companies/${companyId}/opening-balances/${id}`, { opening_balance: data })
  }

  async deleteOpeningBalance(companyId: string, id: string): Promise<void> {
    return this.delete(`/api/companies/${companyId}/opening-balances/${id}`)
  }

  // Counterparts
  async getCounterparts(companyId: string, filters?: CounterpartFilters): Promise<ApiResponse<Counterpart[]>> {
    const params = new URLSearchParams()
    if (filters?.customers_only) params.append('customers_only', 'true')
    if (filters?.suppliers_only) params.append('suppliers_only', 'true')
    if (filters?.vat_registered) params.append('vat_registered', 'true')
    
    const query = params.toString() ? `?${params.toString()}` : ''
    return this.get<Counterpart[]>(`/api/companies/${companyId}/counterparts${query}`)
  }

  async getCounterpart(companyId: string, id: string): Promise<ApiResponse<Counterpart>> {
    return this.get<Counterpart>(`/api/companies/${companyId}/counterparts/${id}`)
  }

  async createCounterpart(companyId: string, data: Partial<Counterpart>): Promise<ApiResponse<Counterpart>> {
    return this.post<Counterpart>(`/api/companies/${companyId}/counterparts`, { counterpart: data })
  }

  async updateCounterpart(companyId: string, id: string, data: Partial<Counterpart>): Promise<ApiResponse<Counterpart>> {
    return this.put<Counterpart>(`/api/companies/${companyId}/counterparts/${id}`, { counterpart: data })
  }

  async deleteCounterpart(companyId: string, id: string): Promise<void> {
    return this.delete(`/api/companies/${companyId}/counterparts/${id}`)
  }

  async searchCounterparts(companyId: string, term: string): Promise<ApiResponse<Counterpart[]>> {
    return this.get<Counterpart[]>(`/api/companies/${companyId}/counterparts/search/${encodeURIComponent(term)}`)
  }

  async validateVatNumber(companyId: string, vatNumber: string): Promise<ApiResponse<{valid: boolean, exists?: boolean, counterpart_id?: string}>> {
    return this.post(`/api/companies/${companyId}/counterparts/validate-vat`, { vat_number: vatNumber })
  }

  async getCounterpartTurnover(companyId: string, startDate: string, endDate: string): Promise<ApiResponse<any[]>> {
    const params = new URLSearchParams()
    params.append('start_date', startDate)
    params.append('end_date', endDate)
    return this.get<any[]>(`/api/companies/${companyId}/counterparts/turnover?${params.toString()}`)
  }

  // Journal Entries
  async getJournalEntries(companyId: string, filters?: JournalEntryFilters): Promise<ApiResponse<JournalEntry[]>> {
    const params = new URLSearchParams()
    if (filters?.posted_only) params.append('posted_only', 'true')
    if (filters?.document_type) params.append('document_type', filters.document_type)
    if (filters?.date_from) params.append('date_from', filters.date_from)
    if (filters?.date_to) params.append('date_to', filters.date_to)
    
    const query = params.toString() ? `?${params.toString()}` : ''
    return this.get<JournalEntry[]>(`/api/companies/${companyId}/journal-entries${query}`)
  }

  async getJournalEntry(companyId: string, id: string): Promise<ApiResponse<JournalEntry>> {
    return this.get<JournalEntry>(`/api/companies/${companyId}/journal-entries/${id}`)
  }

  async createJournalEntry(companyId: string, data: Partial<JournalEntry>): Promise<ApiResponse<JournalEntry>> {
    return this.post<JournalEntry>(`/api/companies/${companyId}/journal-entries`, { journal_entry: data })
  }

  async createUnifiedTransaction(companyId: string, data: any): Promise<ApiResponse<JournalEntry>> {
    return this.post<JournalEntry>(`/api/companies/${companyId}/journal-entries/unified-create`, { transaction: data })
  }

  async updateJournalEntry(companyId: string, id: string, data: Partial<JournalEntry>): Promise<ApiResponse<JournalEntry>> {
    return this.put<JournalEntry>(`/api/companies/${companyId}/journal-entries/${id}`, { journal_entry: data })
  }

  async deleteJournalEntry(companyId: string, id: string): Promise<void> {
    return this.delete(`/api/companies/${companyId}/journal-entries/${id}`)
  }

  async postJournalEntry(companyId: string, id: string): Promise<ApiResponse<JournalEntry>> {
    return this.post<JournalEntry>(`/api/companies/${companyId}/journal-entries/${id}/post`, {})
  }

  async unpostJournalEntry(companyId: string, id: string): Promise<ApiResponse<JournalEntry>> {
    return this.post<JournalEntry>(`/api/companies/${companyId}/journal-entries/${id}/unpost`, {})
  }

  async validateJournalEntryBalance(companyId: string, id: string): Promise<ApiResponse<{valid: boolean, message?: string, error?: string}>> {
    return this.post(`/api/companies/${companyId}/journal-entries/${id}/validate-balance`, {})
  }

  // VAT Rates - calls Nim VAT service at port 5004 via /vat-api proxy
  private async vatRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Replace /api prefix with /vat-api for proxy routing
    const vatEndpoint = endpoint.replace(/^\/api/, VAT_API_PREFIX)
    const url = `${VAT_API_URL}${vatEndpoint}`

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...options.headers,
      },
      ...options,
    }

    const response = await fetch(url, config)

    if (!response.ok) {
      let error: ApiError = {}
      if (response.headers.get('content-type')?.includes('application/json')) {
        error = await response.json()
      } else {
        error.error = `HTTP ${response.status}: ${response.statusText}`
      }
      throw error
    }

    if (response.status === 204) {
      return undefined as T
    }

    return response.json()
  }

  async getVatRates(companyId: string, filters?: VatRateFilters): Promise<ApiResponse<VatRate[]>> {
    const params = new URLSearchParams()
    if (filters?.active_only !== false) params.append('active_only', 'true')

    const query = params.toString() ? `?${params.toString()}` : ''
    return this.vatRequest<ApiResponse<VatRate[]>>(`/api/companies/${companyId}/vat-rates${query}`)
  }

  async getVatRate(companyId: string, id: string): Promise<ApiResponse<VatRate>> {
    return this.vatRequest<ApiResponse<VatRate>>(`/api/companies/${companyId}/vat-rates/${id}`)
  }

  async createVatRate(companyId: string, data: Partial<VatRate>): Promise<ApiResponse<VatRate>> {
    return this.vatRequest<ApiResponse<VatRate>>(`/api/companies/${companyId}/vat-rates`, {
      method: 'POST',
      body: JSON.stringify({ vat_rate: data })
    })
  }

  async updateVatRate(companyId: string, id: string, data: Partial<VatRate>): Promise<ApiResponse<VatRate>> {
    return this.vatRequest<ApiResponse<VatRate>>(`/api/companies/${companyId}/vat-rates/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ vat_rate: data })
    })
  }

  async deleteVatRate(companyId: string, id: string): Promise<void> {
    return this.vatRequest<void>(`/api/companies/${companyId}/vat-rates/${id}`, {
      method: 'DELETE'
    })
  }

  // Fixed Assets
  async getFixedAssets(companyId: string, status?: string): Promise<ApiResponse<FixedAsset[]>> {
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    const query = params.toString() ? `?${params.toString()}` : ''
    return this.get<FixedAsset[]>(`/api/companies/${companyId}/fixed-assets${query}`)
  }

  async getFixedAsset(companyId: string, id: string): Promise<ApiResponse<FixedAsset>> {
    return this.get<FixedAsset>(`/api/companies/${companyId}/fixed-assets/${id}`)
  }

  async createFixedAsset(companyId: string, data: Partial<FixedAsset>): Promise<ApiResponse<FixedAsset>> {
    return this.post<FixedAsset>(`/api/companies/${companyId}/fixed-assets`, { fixed_asset: data })
  }

  async updateFixedAsset(companyId: string, id: string, data: Partial<FixedAsset>): Promise<ApiResponse<FixedAsset>> {
    return this.put<FixedAsset>(`/api/companies/${companyId}/fixed-assets/${id}`, { fixed_asset: data })
  }

  async deleteFixedAsset(companyId: string, id: string): Promise<void> {
    return this.delete(`/api/companies/${companyId}/fixed-assets/${id}`)
  }

  // Fixed Asset Categories
  async getFixedAssetCategories(companyId: string): Promise<ApiResponse<FixedAssetCategory[]>> {
    return this.get<FixedAssetCategory[]>(`/api/companies/${companyId}/fixed-asset-categories`)
  }

  // Depreciation
  async calculateDepreciation(companyId: string, year: number, month: number): Promise<ApiResponse<CalculationResult>> {
    return this.post<CalculationResult>(`/api/companies/${companyId}/fixed-assets/calculate-depreciation`, {
      year,
      month
    })
  }

  async postDepreciation(companyId: string, year: number, month: number): Promise<ApiResponse<PostResult>> {
    return this.post<PostResult>(`/api/companies/${companyId}/fixed-assets/post-depreciation`, {
      year,
      month
    })
  }

  async getDepreciationJournal(companyId: string, year: number, month?: number): Promise<ApiResponse<DepreciationJournal[]>> {
    const params = new URLSearchParams()
    params.append('year', year.toString())
    if (month) params.append('month', month.toString())
    return this.get<DepreciationJournal[]>(`/api/companies/${companyId}/depreciation-journal?${params.toString()}`)
  }

  async getCalculatedPeriods(companyId: string): Promise<ApiResponse<CalculatedPeriod[]>> {
    return this.get<CalculatedPeriod[]>(`/api/companies/${companyId}/calculated-periods`)
  }

  // Products
  async getProducts(companyId: string): Promise<ApiResponse<Product[]>> {
    return this.get<Product[]>(`/api/companies/${companyId}/products`)
  }

  async getProduct(companyId: string, id: string): Promise<ApiResponse<Product>> {
    return this.get<Product>(`/api/companies/${companyId}/products/${id}`)
  }

  async createProduct(companyId: string, data: Partial<Product>): Promise<ApiResponse<Product>> {
    return this.post<Product>(`/api/companies/${companyId}/products`, { product: data })
  }

  async updateProduct(companyId: string, id: string, data: Partial<Product>): Promise<ApiResponse<Product>> {
    return this.put<Product>(`/api/companies/${companyId}/products/${id}`, { product: data })
  }

  async deleteProduct(companyId: string, id: string): Promise<void> {
    return this.delete(`/api/companies/${companyId}/products/${id}`)
  }

  // Stock Data (Import)
  async importStockLevels(companyId: string, data: Partial<StockLevel>[]): Promise<ApiResponse<{imported: number}>> {
    return this.post<{imported: number}>(`/api/companies/${companyId}/stock/levels/import`, { stock_levels: data })
  }

  async importStockMovements(companyId: string, data: Partial<StockMovement>[]): Promise<ApiResponse<{imported: number}>> {
    return this.post<{imported: number}>(`/api/companies/${companyId}/stock/movements/import`, { stock_movements: data })
  }

  // Reports
  async listReportTemplates(): Promise<ApiResponse<any>> {
    return this.get<any>('/api/reports/templates')
  }

  async generateReport(reportName: string, params: any, format: string = 'pdf'): Promise<Blob> {
    return this.requestBlob('/api/reports/generate', {
      method: 'POST',
      body: JSON.stringify({ report_name: reportName, parameters: params, format: format })
    })
  }

  // Bank Accounts
  async getBankAccounts(companyId: string): Promise<ApiResponse<BankAccount[]>> {
    return this.get<BankAccount[]>(`/api/companies/${companyId}/bank-accounts`)
  }

  async getBankAccount(companyId: string, id: string): Promise<ApiResponse<BankAccount>> {
    return this.get<BankAccount>(`/api/companies/${companyId}/bank-accounts/${id}`)
  }

  async createBankAccount(companyId: string, data: Partial<BankAccount>): Promise<ApiResponse<BankAccount>> {
    return this.post<BankAccount>(`/api/companies/${companyId}/bank-accounts`, { bank_account: data })
  }

  async updateBankAccount(companyId: string, id: string, data: Partial<BankAccount>): Promise<ApiResponse<BankAccount>> {
    return this.put<BankAccount>(`/api/companies/${companyId}/bank-accounts/${id}`, { bank_account: data })
  }

  async deleteBankAccount(companyId: string, id: string): Promise<void> {
    return this.delete(`/api/companies/${companyId}/bank-accounts/${id}`)
  }

  // Bank Transactions
  async getBankTransactions(companyId: string, bankAccountId: string): Promise<ApiResponse<BankTransaction[]>> {
    return this.get<BankTransaction[]>(`/api/companies/${companyId}/bank-accounts/${bankAccountId}/transactions`)
  }

  async importBankTransactions(companyId: string, bankAccountId: string, transactions: Partial<BankTransaction>[]): Promise<ApiResponse<{imported: number, total: number}>> {
    return this.post<{imported: number, total: number}>(`/api/companies/${companyId}/bank-accounts/${bankAccountId}/transactions/import`, { transactions })
  }
  
  async updateBankTransaction(companyId: string, bankAccountId: string, id: string, data: Partial<BankTransaction>): Promise<ApiResponse<BankTransaction>> {
    return this.put<BankTransaction>(`/api/companies/${companyId}/bank-accounts/${bankAccountId}/transactions/${id}`, { bank_transaction: data })
  }

  // Currencies
  async getCurrencies(): Promise<ApiResponse<Currency[]>> {
    return this.get<Currency[]>('/api/currencies')
  }

  async getCurrency(id: string): Promise<ApiResponse<Currency>> {
    return this.get<Currency>(`/api/currencies/${id}`)
  }

  async createCurrency(data: Partial<Currency>): Promise<ApiResponse<Currency>> {
    return this.post<Currency>('/api/currencies', { currency: data })
  }

  async updateCurrency(id: string, data: Partial<Currency>): Promise<ApiResponse<Currency>> {
    return this.put<Currency>(`/api/currencies/${id}`, { currency: data })
  }

  async deleteCurrency(id: string): Promise<void> {
    return this.delete(`/api/currencies/${id}`)
  }

  async toggleCurrencyActive(id: string): Promise<ApiResponse<Currency>> {
    return this.request<ApiResponse<Currency>>(`/api/currencies/${id}/toggle-active`, {
      method: 'PATCH'
    })
  }

  // Exchange Rates
  async getExchangeRates(opts?: { limit?: number }): Promise<ApiResponse<ExchangeRate[]>> {
    const params = new URLSearchParams()
    if (opts?.limit) params.append('limit', opts.limit.toString())
    const query = params.toString() ? `?${params.toString()}` : ''
    return this.get<ExchangeRate[]>(`/api/exchange-rates${query}`)
  }

  async fetchLatestRates(): Promise<FetchRatesResult> {
    return this.request<FetchRatesResult>('/api/exchange-rates/fetch-latest', {
      method: 'POST'
    })
  }

  async fetchRatesForDate(date: string): Promise<FetchRatesResult> {
    return this.request<FetchRatesResult>('/api/exchange-rates/fetch-date', {
      method: 'POST',
      body: JSON.stringify({ date })
    })
  }

  async fetchRatesForMonth(year: number, month: number): Promise<FetchRatesResult> {
    return this.request<FetchRatesResult>('/api/exchange-rates/fetch-month', {
      method: 'POST',
      body: JSON.stringify({ year: year.toString(), month: month.toString() })
    })
  }
}

export const apiClient = new ApiClient()
export default apiClient