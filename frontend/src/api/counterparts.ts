import api from './client';
import type { Counterpart, CreateCounterpartInput } from '../types';

export const counterpartsApi = {
  getAll: async (companyId?: number): Promise<Counterpart[]> => {
    const params = companyId ? { companyId } : {};
    const { data } = await api.get<Counterpart[]>('/api/counterparts', { params });
    return data;
  },

  getByCompany: async (companyId: number): Promise<Counterpart[]> => {
    const { data } = await api.get<Counterpart[]>(`/api/counterparts/company/${companyId}`);
    return data;
  },

  create: async (input: CreateCounterpartInput): Promise<Counterpart> => {
    const { data } = await api.post<Counterpart>('/api/counterparts', input);
    return data;
  },

  update: async (id: number, input: Partial<CreateCounterpartInput>): Promise<Counterpart> => {
    const { data } = await api.put<Counterpart>(`/api/counterparts/${id}`, input);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/counterparts/${id}`);
  },
};
