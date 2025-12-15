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

export const settingsApi = {
  getCompanySettings: async (companyId: number): Promise<Company> => {
    const { data } = await api.get<Company>(`/api/companies/${companyId}`);
    return data;
  },

  updateDefaultAccounts: async (companyId: number, accounts: DefaultAccounts): Promise<Company> => {
    const { data } = await api.put<Company>(`/api/companies/${companyId}/default-accounts`, accounts);
    return data;
  },
};
