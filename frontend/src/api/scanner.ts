import api from './client';
import type { RecognizedInvoice, ScannedInvoice } from '../types';

export const scannerApi = {
  scanInvoice: async (file: File, invoiceType: 'purchase' | 'sales', companyId: number): Promise<RecognizedInvoice> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('invoiceType', invoiceType);
    formData.append('companyId', companyId.toString());

    const response = await api.post('/scan-invoice', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  saveScannedInvoice: async (companyId: number, recognized: RecognizedInvoice, fileName?: string): Promise<ScannedInvoice> => {
    const response = await api.post('/scanned-invoices', {
      companyId,
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
        counterpartyAccountId: recognized.suggestedAccounts?.counterpartyAccount?.id,
        vatAccountId: recognized.suggestedAccounts?.vatAccount?.id,
        expenseRevenueAccountId: recognized.suggestedAccounts?.expenseOrRevenueAccount?.id,
      },
      fileName,
    });
    return response.data;
  },

  getScannedInvoices: async (companyId: number): Promise<ScannedInvoice[]> => {
    const response = await api.get(`/scanned-invoices?companyId=${companyId}`);
    return response.data;
  },

  getScannedInvoice: async (id: number): Promise<ScannedInvoice> => {
    const response = await api.get(`/scanned-invoices/${id}`);
    return response.data;
  },

  updateScannedInvoice: async (id: number, data: Partial<ScannedInvoice>): Promise<ScannedInvoice> => {
    const response = await api.put(`/scanned-invoices/${id}`, data);
    return response.data;
  },

  deleteScannedInvoice: async (id: number): Promise<void> => {
    await api.delete(`/scanned-invoices/${id}`);
  },

  processScannedInvoice: async (id: number): Promise<{ journalEntryId: number }> => {
    const response = await api.post(`/scanned-invoices/${id}/process`);
    return response.data;
  },
};
