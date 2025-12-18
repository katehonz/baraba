import { api } from './client';

export interface ViesValidationResult {
  valid: boolean;
  name: string;
  longAddress: string;
  vatNumber: string;
}

export const viesApi = {
  validateVat: async (vatNumber: string): Promise<ViesValidationResult> => {
    const { data } = await api.get(`/api/vies/validate/${vatNumber}`);
    return data;
  },
};
