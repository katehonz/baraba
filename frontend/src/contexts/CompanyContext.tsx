import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Company } from '../types'
import { apiClient } from '../api/client'
import { useAuth } from './AuthContext'

const STORAGE_KEY = 'baraba_selected_company_id'

interface CompanyContextType {
  companies: Company[]
  selectedCompany: Company | null
  selectedCompanyId: string | null
  setSelectedCompanyId: (id: string) => void
  loading: boolean
  error: string | null
  refreshCompanies: () => Promise<void>
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined)

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompanyId, setSelectedCompanyIdState] = useState<string | null>(() => {
    // Load from localStorage on init
    return localStorage.getItem(STORAGE_KEY)
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Wrapper to save to localStorage
  const setSelectedCompanyId = (id: string) => {
    setSelectedCompanyIdState(id)
    localStorage.setItem(STORAGE_KEY, id)
  }

  const refreshCompanies = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getCompanies()
      setCompanies(response.data)

      // Auto-select first company only if none saved in localStorage
      const savedId = localStorage.getItem(STORAGE_KEY)
      const savedCompanyExists = savedId && response.data.some((c: Company) => c.id === savedId)

      if (!savedCompanyExists && response.data.length > 0) {
        setSelectedCompanyId(response.data[0].id)
      }
    } catch (err: any) {
      setError(err.error || 'Failed to load companies')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Wait for auth to complete before fetching companies
    if (!authLoading && isAuthenticated) {
      refreshCompanies()
    } else if (!authLoading && !isAuthenticated) {
      // Not authenticated, clear companies and stop loading
      setCompanies([])
      setLoading(false)
    }
  }, [authLoading, isAuthenticated])

  const selectedCompany = companies.find(c => c.id === selectedCompanyId) || null

  return (
    <CompanyContext.Provider
      value={{
        companies,
        selectedCompany,
        selectedCompanyId,
        setSelectedCompanyId,
        loading,
        error,
        refreshCompanies
      }}
    >
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompany() {
  const context = useContext(CompanyContext)
  if (!context) {
    throw new Error('useCompany must be used within CompanyProvider')
  }
  return context
}
