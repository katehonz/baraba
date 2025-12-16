import api from './client';

export interface TurnoverSheetParams {
  companyId: number;
  fromDate: string;
  toDate: string;
  showZeroBalances?: boolean;
  accountCodeDepth?: number;
}

export interface GeneralLedgerParams {
  companyId: number;
  accountId: number;
  fromDate: string;
  toDate: string;
}

export const reportsApi = {
  getTurnoverSheet: async (params: TurnoverSheetParams) => {
    const { data } = await api.get('/api/reports/turnover-sheet', { params });
    return data;
  },

  getGeneralLedger: async (params: GeneralLedgerParams) => {
    const { data } = await api.get('/api/reports/general-ledger', { params });
    return data;
  },
};
