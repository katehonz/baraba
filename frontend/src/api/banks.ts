import api from './client';
import type { BankProfile, CreateBankProfileInput, SaltEdgeProvider } from '../types';

export const banksApi = {
  getByCompany: async (companyId: number): Promise<BankProfile[]> => {
    const response = await api.get(`/banks?companyId=${companyId}`);
    return response.data;
  },

  getById: async (id: number): Promise<BankProfile> => {
    const response = await api.get(`/banks/${id}`);
    return response.data;
  },

  create: async (input: CreateBankProfileInput): Promise<BankProfile> => {
    const response = await api.post('/banks', input);
    return response.data;
  },

  update: async (id: number, input: Partial<CreateBankProfileInput>): Promise<BankProfile> => {
    const response = await api.put(`/banks/${id}`, input);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/banks/${id}`);
  },

  getSaltEdgeProviders: async (countryCode: string = 'bg'): Promise<SaltEdgeProvider[]> => {
    const response = await api.get(`/saltedge/providers/${countryCode}`);
    return response.data;
  },

  initiateSaltEdgeConnection: async (companyId: number, providerCode: string, returnUrl: string): Promise<{ connectUrl: string }> => {
    const response = await api.post(`/saltedge/connect?companyId=${companyId}&providerCode=${providerCode}&returnUrl=${encodeURIComponent(returnUrl)}`);
    return response.data;
  },

  reconnectSaltEdge: async (profileId: number, returnUrl: string): Promise<{ connectUrl: string }> => {
    const response = await api.post(`/saltedge/reconnect/${profileId}?returnUrl=${encodeURIComponent(returnUrl)}`);
    return response.data;
  },

  syncTransactions: async (profileId: number): Promise<{ count: number }> => {
    const response = await api.post(`/saltedge/transactions/${profileId}/sync`);
    return response.data;
  },
};
