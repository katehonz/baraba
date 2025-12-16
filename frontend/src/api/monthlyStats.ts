import api from './client';

export interface MonthlyStatsParams {
  companyId: number;
  fromYear: number;
  fromMonth: number;
  toYear: number;
  toMonth: number;
}

export interface ExportStatsParams extends MonthlyStatsParams {
  format: string;
}

export const monthlyStatsApi = {
  getMonthlyStats: async (params: MonthlyStatsParams) => {
    const { data } = await api.get('/api/monthly-stats', { params });
    return data;
  },

  exportStats: async (params: ExportStatsParams): Promise<Blob> => {
    const { data } = await api.get('/api/monthly-stats/export', {
      params,
      responseType: 'blob',
    });
    return data;
  },
};
