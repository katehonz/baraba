import api from './client';
import type { Company, CreateCompanyInput } from '../types';

export const companiesApi = {
  getAll: async (): Promise<Company[]> => {
    const { data } = await api.get<Company[]>('/api/companies');
    return data;
  },

  getById: async (id: number): Promise<Company> => {
    const { data } = await api.get<Company>(`/api/companies/${id}`);
    return data;
  },

  create: async (input: CreateCompanyInput): Promise<Company> => {
    const { data } = await api.post<Company>('/api/companies', input);
    return data;
  },

  update: async (id: number, input: Record<string, any>): Promise<Company> => {
    const { data } = await api.put<Company>(`/api/companies/${id}`, input);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/companies/${id}`);
  },
};
