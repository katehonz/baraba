import api from './client';
import type { JournalEntry, CreateJournalEntryInput } from '../types';

export const journalApi = {
  getAll: async (companyId?: number): Promise<JournalEntry[]> => {
    const params = companyId ? { companyId } : {};
    const { data } = await api.get<JournalEntry[]>('/api/journal-entries', { params });
    return data;
  },

  getById: async (id: number): Promise<{ entry: JournalEntry; lines: any[] }> => {
    const { data } = await api.get(`/api/journal-entries/${id}`);
    return data;
  },

  create: async (input: CreateJournalEntryInput): Promise<JournalEntry> => {
    const { data } = await api.post<JournalEntry>('/api/journal-entries', input);
    return data;
  },

  post: async (id: number): Promise<JournalEntry> => {
    const { data } = await api.post<JournalEntry>(`/api/journal-entries/${id}/post`);
    return data;
  },

  unpost: async (id: number): Promise<JournalEntry> => {
    const { data } = await api.post<JournalEntry>(`/api/journal-entries/${id}/unpost`);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/journal-entries/${id}`);
  },
};
