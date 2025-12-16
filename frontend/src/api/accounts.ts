import api from './client';
import type { Account, CreateAccountInput } from '../types';

export const accountsApi = {
  getAll: async (companyId?: number): Promise<Account[]> => {
    const params = companyId ? { companyId } : {};
    const { data } = await api.get<Account[]>('/api/accounts', { params });
    return data;
  },

  getByCompany: async (companyId: number): Promise<Account[]> => {
    const { data } = await api.get<Account[]>(`/api/accounts/company/${companyId}`);
    return data;
  },

  create: async (input: CreateAccountInput): Promise<Account> => {
    const { data } = await api.post<Account>('/api/accounts', input);
    return data;
  },

  update: async (id: number, input: Partial<CreateAccountInput>): Promise<Account> => {
    const { data } = await api.put<Account>(`/api/accounts/${id}`, input);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/accounts/${id}`);
  },
};
