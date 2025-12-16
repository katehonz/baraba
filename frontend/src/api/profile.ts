import api from './client';

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  group?: {
    id: number;
    name: string;
  };
}

export interface UpdateProfileInput {
  email: string;
  firstName: string;
  lastName: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export const profileApi = {
  getCurrentUser: async (): Promise<UserProfile> => {
    const { data } = await api.get<UserProfile>('/auth/me');
    return data;
  },

  updateProfile: async (input: UpdateProfileInput): Promise<UserProfile> => {
    const { data } = await api.put<UserProfile>('/auth/profile', input);
    return data;
  },

  changePassword: async (input: ChangePasswordInput): Promise<void> => {
    await api.post('/auth/change-password', input);
  },
};
