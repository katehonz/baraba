import api from './client';
import type { VatRate } from '../types';

export const vatRatesApi = {
  getVatRates: async (companyId: number): Promise<VatRate[]> => {
    const { data } = await api.get<VatRate[]>(`/api/vat-rates?companyId=${companyId}`);
    return data;
  },

  createVatRate: async (vatRate: Partial<VatRate>): Promise<VatRate> => {
    const { data } = await api.post<VatRate>('/api/vat-rates', vatRate);
    return data;
  },

  deleteVatRate: async (id: number): Promise<void> => {
    await api.delete(`/api/vat-rates/${id}`);
  },
};
