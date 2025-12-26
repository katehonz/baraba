// VIES API for VAT number validation
// Communicates with baraba_vies microservice on port 5003

const VIES_API_URL = import.meta.env?.VITE_VIES_API_URL || 'http://localhost:5003'

// Helper to get auth token
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token')
}

export interface ViesValidationResult {
  valid: boolean
  name: string
  longAddress: string
  vatNumber: string
}

export const viesApi = {
  validateVat: async (vatNumber: string): Promise<ViesValidationResult> => {
    const token = getAuthToken()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${VIES_API_URL}/api/vies/validate/${encodeURIComponent(vatNumber)}`, {
      method: 'GET',
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'VIES validation failed' }))
      throw new Error(error.error || 'VIES validation failed')
    }

    return response.json()
  },
}
