import api from './client';
import type { FixedAssetCategory } from '../types';

export const fixedAssetCategoriesApi = {
  getFixedAssetCategories: async (companyId: number): Promise<FixedAssetCategory[]> => {
    const { data } = await api.get<FixedAssetCategory[]>(`/api/fixed-asset-categories?companyId=${companyId}`);
    return data;
  },
};
