import api from './client';
import type { Company } from '../types';

export interface DefaultAccounts {
  defaultCashAccountId?: number;
  defaultCustomersAccountId?: number;
  defaultSuppliersAccountId?: number;
  defaultSalesRevenueAccountId?: number;
  defaultVatPurchaseAccountId?: number;
  defaultVatSalesAccountId?: number;
  defaultCardPaymentPurchaseAccountId?: number;
  defaultCardPaymentSalesAccountId?: number;
}

export interface SmtpSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword?: string;
  smtpFromEmail: string;
  smtpFromName: string;
  smtpUseTls: boolean;
  smtpUseSsl: boolean;
  smtpEnabled: boolean;
}

export interface SystemSettings extends SmtpSettings {
  id?: number;
}

export interface SaltEdgeSettings {
  saltEdgeAppId: string;
  saltEdgeSecret?: string;
  saltEdgeEnabled: boolean;
}

export const settingsApi = {
  getCompanySettings: async (companyId: number): Promise<Company> => {
    const { data } = await api.get<Company>(`/companies/${companyId}`);
    return data;
  },

  updateDefaultAccounts: async (companyId: number, accounts: DefaultAccounts): Promise<Company> => {
    const { data } = await api.put<Company>(`/companies/${companyId}/default-accounts`, accounts);
    return data;
  },

  // SMTP Settings
  getSystemSettings: async (): Promise<SystemSettings> => {
    const { data } = await api.get<SystemSettings>('/system-settings');
    return data;
  },

  updateSmtpSettings: async (settings: Partial<SmtpSettings>): Promise<SystemSettings> => {
    const { data } = await api.put<SystemSettings>('/system-settings/smtp', settings);
    return data;
  },

  testSmtpConnection: async (testEmail: string): Promise<boolean> => {
    const { data } = await api.post<{ success: boolean }>('/system-settings/smtp/test', { testEmail });
    return data.success;
  },

  // Salt Edge Settings (per company)
  updateSaltEdgeSettings: async (companyId: number, settings: Partial<SaltEdgeSettings>): Promise<Company> => {
    const { data } = await api.put<Company>(`/companies/${companyId}/salt-edge`, settings);
    return data;
  },
};
