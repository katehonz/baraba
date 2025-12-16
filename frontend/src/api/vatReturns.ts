import api from './client';
import type { VatReturn, VatReturnDetails } from '../types';

export const vatReturnsApi = {
  getByCompany: async (companyId: number): Promise<VatReturn[]> => {
    const response = await api.get(`/vat-returns?companyId=${companyId}`);
    return response.data;
  },

  getById: async (id: number): Promise<VatReturnDetails> => {
    const response = await api.get(`/vat-returns/${id}`);
    return response.data;
  },

  generate: async (companyId: number, periodYear: number, periodMonth: number): Promise<VatReturn> => {
    const response = await api.post('/vat-returns/generate', {
      companyId,
      periodYear,
      periodMonth,
    });
    return response.data;
  },

  update: async (id: number, data: Partial<VatReturnDetails>): Promise<VatReturnDetails> => {
    const response = await api.put(`/vat-returns/${id}`, data);
    return response.data;
  },

  submit: async (id: number): Promise<VatReturn> => {
    const response = await api.post(`/vat-returns/${id}/submit`);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/vat-returns/${id}`);
  },

  exportDeklar: async (id: number): Promise<string> => {
    const response = await api.get(`/vat-returns/${id}/export/deklar`);
    return response.data;
  },

  exportPokupki: async (id: number): Promise<string> => {
    const response = await api.get(`/vat-returns/${id}/export/pokupki`);
    return response.data;
  },

  exportProdajbi: async (id: number): Promise<string> => {
    const response = await api.get(`/vat-returns/${id}/export/prodajbi`);
    return response.data;
  },

  getJournalEntries: async (
    companyId: number,
    vatFromDate: string,
    vatToDate: string,
    type: 'purchase' | 'sales'
  ): Promise<any[]> => {
    const response = await api.get('/journal-entries', {
      params: {
        companyId,
        vatFromDate,
        vatToDate,
        [type === 'purchase' ? 'vatPurchaseOperation' : 'vatSalesOperation']: 'any',
      },
    });
    return response.data;
  },
};
