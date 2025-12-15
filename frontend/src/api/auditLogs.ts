import api from './client';

export interface AuditLogParams {
  companyId?: number;
  fromDate?: string;
  toDate?: string;
  search?: string;
  action?: string;
  offset?: number;
  limit?: number;
}

export interface AuditLogStatsParams {
  companyId?: number;
  days?: number;
}

export const auditLogsApi = {
  getAuditLogs: async (params: AuditLogParams) => {
    const { data } = await api.get('/api/audit-logs', { params });
    return data;
  },

  getAuditLogStats: async (params: AuditLogStatsParams) => {
    const { data } = await api.get('/api/audit-log-stats', { params });
    return data;
  },
};
