// Scanner API for AI-powered invoice recognition
// Communicates with baraba_scanner Java microservice on port 5001 AND Baraba Elixir Backend on port 4000

import type { RecognizedInvoice, ScannedInvoice } from '../types'
import { apiClient } from './client'

const SCANNER_API_URL = import.meta.env?.VITE_SCANNER_API_URL || 'http://localhost:5001'

// Batch upload types
export interface BatchUploadResponse {
  sessionId: number
  totalFiles: number
  totalBatches: number
  status: string
  message: string
  createdAt?: string
}

export interface SessionStatusResponse {
  sessionId: number
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  totalFiles: number
  processedFiles: number
  totalBatches: number
  processedBatches: number
  progressPercent: number
  errorMessage?: string
  createdAt?: string
  completedAt?: string
  invoices: RecognizedInvoice[]
}

export const scannerApi = {
  // Single file scan (backwards compatible)
  scanInvoice: async (file: File, invoiceType: 'purchase' | 'sales', companyId: string): Promise<RecognizedInvoice> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('invoiceType', invoiceType)
    formData.append('companyUid', companyId)

    const response = await fetch(`${SCANNER_API_URL}/api/scan`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Scan failed' }))
      throw new Error(error.error || error.message || 'Failed to scan invoice')
    }

    return response.json()
  },

  // Batch upload - multiple files at once
  uploadBatch: async (
    files: File[],
    invoiceType: 'purchase' | 'sales',
    companyUid: string
  ): Promise<BatchUploadResponse> => {
    const formData = new FormData()
    files.forEach(file => formData.append('files', file))
    formData.append('invoiceType', invoiceType)
    formData.append('companyUid', companyUid)

    const response = await fetch(`${SCANNER_API_URL}/api/scan/batch`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Batch upload failed' }))
      throw new Error(error.error || error.message || 'Failed to upload batch')
    }

    return response.json()
  },

  // Get batch session status
  getSessionStatus: async (sessionId: number): Promise<SessionStatusResponse> => {
    const response = await fetch(`${SCANNER_API_URL}/api/scan/sessions/${sessionId}/status`)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Status check failed' }))
      throw new Error(error.error || error.message || 'Failed to get session status')
    }

    return response.json()
  },

  // Cancel a running session
  cancelSession: async (sessionId: number): Promise<void> => {
    const response = await fetch(`${SCANNER_API_URL}/api/scan/sessions/${sessionId}/cancel`, {
      method: 'POST',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Cancel failed' }))
      throw new Error(error.error || error.message || 'Failed to cancel session')
    }
  },

  saveScannedInvoice: async (companyId: string, recognized: RecognizedInvoice, fileName?: string): Promise<ScannedInvoice> => {
    const response = await fetch(`${SCANNER_API_URL}/api/scan/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        companyUid: companyId,
        recognized: {
          vendorName: recognized.vendorName,
          vendorVatNumber: recognized.vendorVatNumber,
          vendorAddress: recognized.vendorAddress,
          customerName: recognized.customerName,
          customerVatNumber: recognized.customerVatNumber,
          customerAddress: recognized.customerAddress,
          invoiceId: recognized.invoiceId,
          invoiceDate: recognized.invoiceDate,
          dueDate: recognized.dueDate,
          subtotal: recognized.subtotal,
          totalTax: recognized.totalTax,
          invoiceTotal: recognized.invoiceTotal,
          direction: recognized.direction,
          validationStatus: recognized.validationStatus,
          requiresManualReview: recognized.requiresManualReview,
          manualReviewReason: recognized.manualReviewReason,
        },
        fileName,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Save failed' }))
      throw new Error(error.error || error.message || 'Failed to save scanned invoice')
    }

    return response.json()
  },

  // CRUD via Elixir Backend
  getScannedInvoices: async (companyId: string): Promise<ScannedInvoice[]> => {
    const response = await apiClient.get<ScannedInvoice[]>(`/api/companies/${companyId}/scanned-invoices`)
    return response.data
  },

  getScannedInvoice: async (companyId: string, id: number): Promise<ScannedInvoice> => {
    const response = await apiClient.get<ScannedInvoice>(`/api/companies/${companyId}/scanned-invoices/${id}`)
    return response.data
  },

  updateScannedInvoice: async (companyId: string, id: number, data: Partial<ScannedInvoice>): Promise<ScannedInvoice> => {
    const response = await apiClient.put<ScannedInvoice>(`/api/companies/${companyId}/scanned-invoices/${id}`, { scanned_invoice: data })
    return response.data
  },

  deleteScannedInvoice: async (companyId: string, id: number): Promise<void> => {
    await apiClient.delete(`/api/companies/${companyId}/scanned-invoices/${id}`)
  },

  getNextPendingScannedInvoice: async (companyId: string, currentId?: number): Promise<ScannedInvoice | null> => {
    try {
      const query = currentId ? `?current_id=${currentId}` : ''
      const response = await apiClient.get<ScannedInvoice>(`/api/companies/${companyId}/scanned-invoices/next-pending${query}`)
      return response.data
    } catch (e: any) {
      if (e.status === 204 || e.error?.includes('404')) {
        return null
      }
      throw e
    }
  },

  processScannedInvoice: async (id: number): Promise<{ journalEntryId: number }> => {
    // This is still pointing to Java - should probably be moved to Elixir eventually
    const response = await fetch(`${SCANNER_API_URL}/api/scanned-invoices/${id}/process`, {
      method: 'POST',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Process failed' }))
      throw new Error(error.error || 'Failed to process scanned invoice')
    }

    return response.json()
  },

  /**
   * Approve a scanned invoice:
   * 1. Fetches PDF from scanner_service
   * 2. Uploads to S3 with structure: {EIK}/{MM-YYYY}/{purchases|sales}/{NNNNN}.pdf
   * 3. Updates status to APPROVED
   */
  approveScannedInvoice: async (companyId: string, id: number): Promise<ScannedInvoice> => {
    const response = await apiClient.post<ScannedInvoice>(`/api/companies/${companyId}/scanned-invoices/${id}/approve`)
    return response.data
  },

  /**
   * Download PDF for an approved scanned invoice from S3
   */
  downloadScannedInvoicePdf: async (companyId: string, id: number): Promise<Blob> => {
    const response = await fetch(`/api/companies/${companyId}/scanned-invoices/${id}/download-pdf`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to download PDF')
    }

    return response.blob()
  },
}

