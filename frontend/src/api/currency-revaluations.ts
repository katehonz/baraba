import {
  CurrencyRevaluation,
  RevaluationPreview,
  RevaluableAccount,
  ApiResponse
} from '../types'

const API_BASE_URL = '/api'

export const currencyRevaluationsApi = {
  // Get all currency revaluations for a company
  async getCurrencyRevaluations(
    companyId: string,
    status?: 'PENDING' | 'POSTED' | 'REVERSED'
  ): Promise<ApiResponse<CurrencyRevaluation[]>> {
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    const query = params.toString() ? `?${params.toString()}` : ''

    const response = await fetch(
      `${API_BASE_URL}/companies/${companyId}/currency-revaluations${query}`
    )
    if (!response.ok) throw new Error('Failed to fetch currency revaluations')
    return response.json()
  },

  // Get a specific currency revaluation with lines
  async getCurrencyRevaluation(
    companyId: string,
    id: string
  ): Promise<ApiResponse<CurrencyRevaluation>> {
    const response = await fetch(
      `${API_BASE_URL}/companies/${companyId}/currency-revaluations/${id}`
    )
    if (!response.ok) throw new Error('Failed to fetch currency revaluation')
    return response.json()
  },

  // Preview revaluation without creating records
  async previewRevaluation(
    companyId: string,
    year: number,
    month: number
  ): Promise<{ success: boolean; data?: RevaluationPreview; error?: string }> {
    const response = await fetch(
      `${API_BASE_URL}/companies/${companyId}/currency-revaluations/preview`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month })
      }
    )
    return response.json()
  },

  // Create a revaluation (saves to database, but not posted)
  async createRevaluation(
    companyId: string,
    year: number,
    month: number
  ): Promise<ApiResponse<CurrencyRevaluation>> {
    const response = await fetch(
      `${API_BASE_URL}/companies/${companyId}/currency-revaluations`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month })
      }
    )
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create revaluation')
    }
    return response.json()
  },

  // Post a revaluation (creates journal entry)
  async postRevaluation(
    companyId: string,
    id: string
  ): Promise<{
    success: boolean
    revaluation?: CurrencyRevaluation
    journal_entry_id?: string
    error?: string
  }> {
    const response = await fetch(
      `${API_BASE_URL}/companies/${companyId}/currency-revaluations/${id}/post`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }
    )
    return response.json()
  },

  // Reverse a posted revaluation
  async reverseRevaluation(
    companyId: string,
    id: string
  ): Promise<{
    success: boolean
    revaluation?: CurrencyRevaluation
    error?: string
  }> {
    const response = await fetch(
      `${API_BASE_URL}/companies/${companyId}/currency-revaluations/${id}/reverse`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }
    )
    return response.json()
  },

  // Delete a pending revaluation
  async deleteRevaluation(companyId: string, id: string): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/companies/${companyId}/currency-revaluations/${id}`,
      {
        method: 'DELETE'
      }
    )
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete revaluation')
    }
  },

  // Get revaluable accounts for a company
  async getRevaluableAccounts(
    companyId: string
  ): Promise<ApiResponse<RevaluableAccount[]>> {
    const response = await fetch(
      `${API_BASE_URL}/companies/${companyId}/currency-revaluations/revaluable-accounts`
    )
    if (!response.ok) throw new Error('Failed to fetch revaluable accounts')
    return response.json()
  }
}
