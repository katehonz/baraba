// Users API

// Use a separate base URL for Identity Service (port 5002)
const IDENTITY_API_URL = import.meta.env?.VITE_IDENTITY_API_URL || 'http://localhost:5002'

export interface User {
  id: number
  username: string
  email: string
  firstName: string
  lastName: string
  isActive: boolean
  groupId: number
}

export interface UserGroup {
  id: number
  name: string
  description: string
  permissions: {
    canCreateCompanies: boolean
    canEditCompanies: boolean
    canDeleteCompanies: boolean
    canManageUsers: boolean
    canViewReports: boolean
    canPostEntries: boolean
  }
}

// Helper to get auth token (same as client.ts)
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token')
}

// Helper for Identity Service requests
async function identityRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${IDENTITY_API_URL}${endpoint}`
  const token = getAuthToken()

  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  }

  const response = await fetch(url, config)

  if (!response.ok) {
    let error: any = {}
    try {
      error = await response.json()
    } catch {
      error = { error: `HTTP ${response.status}: ${response.statusText}` }
    }
    throw error
  }

  return response.json()
}

export const usersApi = {
  // Users
  getUsers: async (): Promise<User[]> => {
    return identityRequest<User[]>('/api/users')
  },

  createUser: async (user: Partial<User> & { password?: string }): Promise<User> => {
    return identityRequest<User>('/api/users', {
      method: 'POST',
      body: JSON.stringify(user),
    })
  },

  updateUser: async (id: number, user: Partial<User>): Promise<User> => {
    return identityRequest<User>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(user),
    })
  },

  deleteUser: async (id: number): Promise<void> => {
    return identityRequest<void>(`/api/users/${id}`, {
      method: 'DELETE',
    })
  },

  resetPassword: async (id: number, newPassword: string): Promise<void> => {
    return identityRequest<void>(`/api/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    })
  },

  // Groups
  getUserGroups: async (): Promise<UserGroup[]> => {
    return identityRequest<UserGroup[]>('/api/user-groups')
  },

  // Profile (current user)
  getProfile: async (): Promise<User> => {
    return identityRequest<User>('/api/auth/me')
  },

  updateProfile: async (data: { email?: string; firstName?: string; lastName?: string }): Promise<User> => {
    return identityRequest<User>('/api/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    return identityRequest<void>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    })
  },

  // User-Company associations
  getUserCompanies: async (userId?: number, companyId?: string): Promise<any[]> => {
    const params = new URLSearchParams()
    if (userId) params.append('user_id', userId.toString())
    if (companyId) params.append('company_id', companyId)
    const query = params.toString() ? `?${params.toString()}` : ''
    return identityRequest<any[]>(`/api/user-companies${query}`)
  },

  getMyCompanies: async (): Promise<any[]> => {
    return identityRequest<any[]>('/api/user-companies/my')
  },

  addUserCompany: async (data: { userId: number; companyId: string; isDefault: boolean }): Promise<any> => {
    return identityRequest<any>('/api/user-companies', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  removeUserCompany: async (id: number): Promise<void> => {
    return identityRequest<void>(`/api/user-companies/${id}`, {
      method: 'DELETE',
    })
  },

  setDefaultCompany: async (id: number): Promise<void> => {
    return identityRequest<void>(`/api/user-companies/${id}/set-default`, {
      method: 'POST',
    })
  },
}
