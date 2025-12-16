import api from './client';
import type { FixedAsset, FixedAssetCategory, DepreciationJournal, CalculatedPeriod, CalculationResult, PostResult } from '../types';

export interface CreateFixedAssetInput {
  name: string;
  inventoryNumber: string;
  description?: string;
  categoryId: number;
  companyId: number;
  acquisitionDate: string;
  acquisitionCost: number;
  residualValue?: number;
  documentNumber?: string;
  documentDate?: string;
  putIntoServiceDate?: string;
  depreciationMethod?: string;
}

export const fixedAssetsApi = {
  getAll: async (companyId: number, status?: string): Promise<FixedAsset[]> => {
    let url = `/api/fixed-assets?companyId=${companyId}`;
    if (status) {
      url += `&status=${status}`;
    }
    const { data } = await api.get<FixedAsset[]>(url);
    return data;
  },

  getById: async (id: number): Promise<FixedAsset> => {
    const { data } = await api.get<FixedAsset>(`/api/fixed-assets/${id}`);
    return data;
  },

  create: async (input: CreateFixedAssetInput): Promise<FixedAsset> => {
    const { data } = await api.post<FixedAsset>('/api/fixed-assets', input);
    return data;
  },

  update: async (id: number, updates: Partial<FixedAsset>): Promise<FixedAsset> => {
    const { data } = await api.put<FixedAsset>(`/api/fixed-assets/${id}`, updates);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/fixed-assets/${id}`);
  },

  calculateDepreciation: async (companyId: number, year: number, month: number): Promise<CalculationResult> => {
    const { data } = await api.post<CalculationResult>('/api/fixed-assets/calculate-depreciation', {
      companyId,
      year,
      month,
    });
    return data;
  },

  postDepreciation: async (companyId: number, year: number, month: number): Promise<PostResult> => {
    const { data } = await api.post<PostResult>('/api/fixed-assets/post-depreciation', {
      companyId,
      year,
      month,
    });
    return data;
  },

  getDepreciationJournal: async (companyId: number, year: number, month?: number): Promise<DepreciationJournal[]> => {
    let url = `/api/depreciation-journal?companyId=${companyId}&year=${year}`;
    if (month) {
      url += `&month=${month}`;
    }
    const { data } = await api.get<DepreciationJournal[]>(url);
    return data;
  },

  getCalculatedPeriods: async (companyId: number): Promise<CalculatedPeriod[]> => {
    const { data } = await api.get<CalculatedPeriod[]>(`/api/calculated-periods?companyId=${companyId}`);
    return data;
  },

  getCategories: async (companyId: number): Promise<FixedAssetCategory[]> => {
    const { data } = await api.get<FixedAssetCategory[]>(`/api/fixed-asset-categories?companyId=${companyId}`);
    return data;
  },
};
