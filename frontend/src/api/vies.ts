import api from './client';

export const viesApi = {
  validateVat: async (vatNumber: string): Promise<any> => {
    const { data } = await api.post('/api/validate-vat', { vatNumber });
    return data;
  },
};
