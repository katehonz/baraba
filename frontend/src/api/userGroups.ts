import api from './client';
import type { UserGroup } from '../types';

export const userGroupsApi = {
  getUserGroups: async (): Promise<UserGroup[]> => {
    const { data } = await api.get<UserGroup[]>('/api/user-groups');
    return data;
  },
};
