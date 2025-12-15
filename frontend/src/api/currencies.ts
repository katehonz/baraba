import api from './client';
import type { Currency } from '../types';

export const currenciesApi = {
  getAll: async (): Promise<Currency[]> => {
    const { data } = await api.get<Currency[]>('/api/currencies');
    return data;
  },

  create: async (currency: Partial<Currency>): Promise<Currency> => {
    const { data } = await api.post<Currency>('/api/currencies', currency);
    return data;
  },

  update: async (id: number, currency: Partial<Currency>): Promise<Currency> => {
    const { data } = await api.put<Currency>(`/api/currencies/${id}`, currency);
    return data;
  },
};
