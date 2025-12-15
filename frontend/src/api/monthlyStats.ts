import api from './client';

export interface MonthlyStatsParams {
  companyId: number;
  fromYear: number;
  fromMonth: number;
  toYear: number;
  toMonth: number;
}

export const monthlyStatsApi = {
  getMonthlyStats: async (params: MonthlyStatsParams) => {
    const { data } = await api.get('/api/monthly-stats', { params });
    return data;
  },
};
