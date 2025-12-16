import api from './client';
import type { User } from '../types';

interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  groupId?: number;
  isActive?: boolean;
}

interface UpdateUserInput {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  groupId?: number;
  isActive?: boolean;
}

export const usersApi = {
  getUsers: async (): Promise<User[]> => {
    const { data } = await api.get<User[]>('/api/users');
    return data;
  },

  createUser: async (user: CreateUserInput): Promise<User> => {
    const { data } = await api.post<User>('/api/users', user);
    return data;
  },

  updateUser: async (id: number, user: UpdateUserInput): Promise<User> => {
    const { data } = await api.put<User>(`/api/users/${id}`, user);
    return data;
  },

  deleteUser: async (id: number): Promise<void> => {
    await api.delete(`/api/users/${id}`);
  },

  resetUserPassword: async (id: number, newPassword: string): Promise<void> => {
    await api.post(`/api/users/${id}/reset-password`, { newPassword });
  },
};
