import { ApiResponse, AccountingPeriod, AccountingPeriodForm } from '../types'
import apiClient from './client'

export const accountingPeriodsApi = {
  // Get all accounting periods for a company
  async getAccountingPeriods(companyId: string, options?: {
    year?: number
    month?: number
    status?: 'OPEN' | 'CLOSED'
  }): Promise<ApiResponse<AccountingPeriod[]>> {
    const params = new URLSearchParams()

    if (options?.year) params.append('year', options.year.toString())
    if (options?.month) params.append('month', options.month.toString())
    if (options?.status) params.append('status', options.status)

    const query = params.toString() ? `?${params.toString()}` : ''
    return apiClient.get<AccountingPeriod[]>(`/api/companies/${companyId}/accounting-periods${query}`)
  },

  // Get a specific accounting period
  async getAccountingPeriod(companyId: string, year: number, month: number): Promise<ApiResponse<AccountingPeriod>> {
    return apiClient.get<AccountingPeriod>(`/api/companies/${companyId}/accounting-periods/${year}/${month}`)
  },

  // Create an accounting period
  async createAccountingPeriod(companyId: string, period: AccountingPeriodForm): Promise<ApiResponse<AccountingPeriod>> {
    return apiClient.post<AccountingPeriod>(`/api/companies/${companyId}/accounting-periods`, { accounting_period: period })
  },

  // Close an accounting period
  async closeAccountingPeriod(
    companyId: string,
    year: number,
    month: number,
    userId: string,
    notes?: string
  ): Promise<ApiResponse<AccountingPeriod>> {
    const params = new URLSearchParams()
    params.append('user_id', userId)
    if (notes) params.append('notes', notes)

    return apiClient.post<AccountingPeriod>(`/api/companies/${companyId}/accounting-periods/${year}/${month}/close?${params.toString()}`, {})
  },

  // Reopen an accounting period
  async reopenAccountingPeriod(
    companyId: string,
    year: number,
    month: number
  ): Promise<ApiResponse<AccountingPeriod>> {
    return apiClient.post<AccountingPeriod>(`/api/companies/${companyId}/accounting-periods/${year}/${month}/reopen`, {})
  },

  // Initialize all periods for a year
  async initializeYear(companyId: string, year: number): Promise<ApiResponse<AccountingPeriod[]>> {
    return apiClient.post<AccountingPeriod[]>(`/api/companies/${companyId}/accounting-periods/initialize/${year}`, {})
  },

  // Check if a period is open for a specific date
  async isPeriodOpen(companyId: string, date: string): Promise<boolean> {
    try {
      const parsedDate = new Date(date)
      const year = parsedDate.getFullYear()
      const month = parsedDate.getMonth() + 1

      const result = await this.getAccountingPeriod(companyId, year, month)
      return result.data.status === 'OPEN'
    } catch {
      // If period doesn't exist, assume it's open
      return true
    }
  }
}
