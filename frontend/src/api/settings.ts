// Settings API
import { apiClient } from './client'
import type { Company, Account, S3Settings, S3File } from '../types'

export interface DefaultAccounts {
  cash_account_id?: string
  bank_account_id?: string
  customers_account_id?: string
  suppliers_account_id?: string
  vat_payable_account_id?: string
  vat_receivable_account_id?: string
  expenses_account_id?: string
  revenues_account_id?: string
}

export interface CompanyFeatures {
  saltedge_enabled: boolean
  ai_scanning_enabled: boolean
  vies_validation_enabled: boolean
}

export interface SmtpSettings {
  smtp_host: string
  smtp_port: number
  smtp_username: string
  smtp_password?: string
  smtp_from_email: string
  smtp_from_name: string
  smtp_use_tls: boolean
  smtp_use_ssl: boolean
  smtp_enabled: boolean
}

export interface SystemSettings extends SmtpSettings {
  id?: string
}

export interface SaltEdgeSettings {
  saltedge_app_id: string
  saltedge_secret?: string
  saltedge_enabled: boolean
}

export interface AzureSettings {
  azure_di_endpoint: string
  azure_di_api_key?: string
  ai_scanning_enabled: boolean
}

export const settingsApi = {
  // Company Settings
  getCompanySettings: async (companyId: string): Promise<Company> => {
    const response = await apiClient.getCompany(companyId)
    return response.data
  },

  updateDefaultAccounts: async (companyId: string, accounts: DefaultAccounts): Promise<Company> => {
    const response = await apiClient.updateCompany(companyId, accounts)
    return response.data
  },

  updateCompanyFeatures: async (companyId: string, features: CompanyFeatures): Promise<Company> => {
    const response = await apiClient.updateCompany(companyId, features)
    return response.data
  },

  // System Settings (SMTP) - placeholder, backend may not have these yet
  getSystemSettings: async (): Promise<SystemSettings> => {
    // Return default settings if endpoint not available
    return {
      smtp_host: '',
      smtp_port: 587,
      smtp_username: '',
      smtp_from_email: '',
      smtp_from_name: '',
      smtp_use_tls: true,
      smtp_use_ssl: false,
      smtp_enabled: false,
    }
  },

  updateSmtpSettings: async (_settings: Partial<SmtpSettings>): Promise<SystemSettings> => {
    // Placeholder - backend may not have this endpoint yet
    throw new Error('SMTP settings not implemented yet')
  },

  testSmtpConnection: async (_testEmail: string): Promise<boolean> => {
    // Placeholder - backend may not have this endpoint yet
    throw new Error('SMTP test not implemented yet')
  },

  // Salt Edge Settings
  updateSaltEdgeSettings: async (companyId: string, settings: Partial<SaltEdgeSettings>): Promise<Company> => {
    const response = await apiClient.updateCompany(companyId, settings)
    return response.data
  },

  // Azure Document Intelligence Settings
  updateAzureSettings: async (companyId: string, settings: Partial<AzureSettings>): Promise<Company> => {
    const response = await apiClient.updateCompany(companyId, settings)
    return response.data
  },

  // Get accounts for company (for selects)
  getAccounts: async (companyId: string): Promise<Account[]> => {
    const response = await apiClient.getAccounts(companyId)
    return response.data
  },

  // S3 Storage Settings
  updateS3Settings: async (companyId: string, settings: S3Settings): Promise<Company> => {
    const response = await apiClient.updateCompany(companyId, settings)
    return response.data
  },

  testS3Connection: async (companyId: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    const response = await apiClient.post<{ success: boolean; message?: string; error?: string }>(
      `/api/companies/${companyId}/s3/test`,
      {}
    )
    return response.data
  },

  listS3Files: async (companyId: string, prefix?: string): Promise<S3File[]> => {
    const params = prefix ? `?prefix=${encodeURIComponent(prefix)}` : ''
    const response = await apiClient.get<{ data: S3File[] }>(`/api/companies/${companyId}/s3/files${params}`)
    return response.data.data
  },

  uploadToS3: async (companyId: string, file: File, key: string): Promise<{ success: boolean; key?: string; error?: string }> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('key', key)

    const response = await fetch(`${apiClient.getBaseUrl()}/api/companies/${companyId}/s3/upload`, {
      method: 'POST',
      body: formData,
    })
    return response.json()
  },

  deleteS3File: async (companyId: string, key: string): Promise<{ success: boolean; error?: string }> => {
    const response = await apiClient.delete<{ success: boolean; error?: string }>(
      `/api/companies/${companyId}/s3/files?key=${encodeURIComponent(key)}`
    )
    return response.data
  },

  triggerBackup: async (companyId: string): Promise<{ success: boolean; key?: string; message?: string; error?: string }> => {
    const response = await apiClient.post<{ success: boolean; key?: string; message?: string; error?: string }>(
      `/api/companies/${companyId}/s3/backup-now`,
      {}
    )
    return response.data
  },
}
