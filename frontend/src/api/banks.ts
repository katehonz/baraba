import api from './client';
import type { BankProfile, CreateBankProfileInput, SaltEdgeProvider } from '../types';

export const banksApi = {
  getByCompany: async (companyId: number): Promise<BankProfile[]> => {
    const response = await api.get(`/api/banks?companyId=${companyId}`);
    return response.data;
  },

  getById: async (id: number): Promise<BankProfile> => {
    const response = await api.get(`/api/banks/${id}`);
    return response.data;
  },

  create: async (input: CreateBankProfileInput): Promise<BankProfile> => {
    const response = await api.post('/api/banks', input);
    return response.data;
  },

  update: async (id: number, input: Partial<CreateBankProfileInput>): Promise<BankProfile> => {
    const response = await api.put(`/api/banks/${id}`, input);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/banks/${id}`);
  },

  getSaltEdgeProviders: async (countryCode: string = 'bg'): Promise<SaltEdgeProvider[]> => {
    const response = await api.get(`/api/saltedge/providers/${countryCode}`);
    return response.data;
  },

  initiateSaltEdgeConnection: async (companyId: number, providerCode: string, returnUrl: string): Promise<{ connectUrl: string }> => {
    const response = await api.post(`/api/saltedge/connect?companyId=${companyId}&providerCode=${providerCode}&returnUrl=${encodeURIComponent(returnUrl)}`);
    return response.data;
  },

  reconnectSaltEdge: async (profileId: number, returnUrl: string): Promise<{ connectUrl: string }> => {
    const response = await api.post(`/api/saltedge/reconnect/${profileId}?returnUrl=${encodeURIComponent(returnUrl)}`);
    return response.data;
  },

  syncTransactions: async (profileId: number): Promise<{ count: number }> => {
    const response = await api.post(`/api/saltedge/transactions/${profileId}/sync`);
    return response.data;
  },
};
