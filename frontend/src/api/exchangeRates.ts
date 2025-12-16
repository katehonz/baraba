import api from './client';
import type { ExchangeRate } from '../types';

export const exchangeRatesApi = {
  getAll: async (): Promise<ExchangeRate[]> => {
    const { data } = await api.get<ExchangeRate[]>('/api/exchange-rates');
    return data;
  },

  fetchEcbRates: async (): Promise<any> => {
    const { data } = await api.post('/api/exchange-rates/fetch-ecb');
    return data;
  },
};
