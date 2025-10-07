import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || '/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: `${API_BASE_URL}${API_VERSION}`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/admin/login', { email, password });
    return response.data;
  },
  
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
  
  getCurrentUser: async () => {
    const response = await api.get('/auth/admin/me');
    return response.data;
  },
};

// Admin API service
export const adminApiService = {
  // Dashboard
  getDashboardStats: async (dateRange?: { from: string; to: string }) => {
    const params = dateRange ? `?from=${dateRange.from}&to=${dateRange.to}` : '';
    const response = await api.get(`/admin/dashboard${params}`);
    return response.data.data;
  },

  // Customers
  getAllCustomers: async (filters?: any) => {
    const params = new URLSearchParams(filters).toString();
    const response = await api.get(`/admin/customers${params ? `?${params}` : ''}`);
    return response.data.data;
  },

  // Vendors
  getAllVendors: async (filters?: any) => {
    const params = new URLSearchParams(filters).toString();
    const response = await api.get(`/admin/vendors${params ? `?${params}` : ''}`);
    return response.data.data;
  },

  // Analytics
  getAnalytics: async (timeRange?: string) => {
    const params = timeRange ? `?timeRange=${timeRange}` : '';
    const response = await api.get(`/admin/analytics${params}`);
    return response.data.data;
  },

  // Export data
  exportData: async (type: string, format: string, filters?: any) => {
    const response = await api.post('/admin/export', {
      type,
      format,
      filters,
    }, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Users
  getAllUsers: async (filters?: any) => {
    const params = new URLSearchParams(filters).toString();
    const response = await api.get(`/admin/users${params ? `?${params}` : ''}`);
    return response.data.data;
  },

  getUserDetails: async (userId: string) => {
    const response = await api.get(`/admin/users/${userId}`);
    return response.data.data;
  },

  toggleUserStatus: async (userId: string) => {
    const response = await api.put(`/admin/users/${userId}/toggle-status`);
    return response.data.data;
  },

  // System metrics
  getSystemMetrics: async () => {
    const response = await api.get('/admin/system-metrics');
    return response.data.data;
  },

  // Settings & Profile
  getCurrentAdmin: async () => {
    const response = await api.get('/admin/profile');
    return response.data.data;
  },

  updateAdminProfile: async (profileData: any) => {
    const response = await api.put('/admin/profile', profileData);
    return response.data.data;
  },

  updatePassword: async (passwordData: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    const response = await api.put('/admin/password', passwordData);
    return response.data.data;
  },

  getSystemSettings: async () => {
    const response = await api.get('/admin/settings/system');
    return response.data.data;
  },

  updateSystemSettings: async (settings: any) => {
    const response = await api.put('/admin/settings/system', settings);
    return response.data.data;
  },

  getSecuritySettings: async () => {
    const response = await api.get('/admin/settings/security');
    return response.data.data;
  },

  updateSecuritySettings: async (settings: any) => {
    const response = await api.put('/admin/settings/security', settings);
    return response.data.data;
  },

  getNotificationSettings: async () => {
    const response = await api.get('/admin/settings/notifications');
    return response.data.data;
  },

  updateNotificationSettings: async (settings: any) => {
    const response = await api.put('/admin/settings/notifications', settings);
    return response.data.data;
  },

  // Database operations
  createDatabaseBackup: async () => {
    const response = await api.post('/admin/database/backup');
    return response.data.data;
  },

  restoreDatabaseBackup: async (backupFile: File) => {
    const formData = new FormData();
    formData.append('backup', backupFile);
    const response = await api.post('/admin/database/restore', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  optimizeDatabase: async () => {
    const response = await api.post('/admin/database/optimize');
    return response.data.data;
  },

  getDatabaseStats: async () => {
    const response = await api.get('/admin/database/stats');
    return response.data.data;
  },

  // Reports
  getReportsSummary: async () => {
    const response = await api.get('/admin/reports/summary');
    return response.data.data;
  },

  getReports: async (filters?: { type?: string; limit?: number; page?: number }) => {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.page) params.append('page', filters.page.toString());
    
    const response = await api.get(`/admin/reports${params.toString() ? `?${params.toString()}` : ''}`);
    return response.data.data;
  },

  generateReport: async (data: { type: string; timeRange: string; format: string; filters?: any }) => {
    const response = await api.post('/admin/reports/generate', data);
    return response.data.data;
  },

  getReportDetails: async (reportId: string) => {
    const response = await api.get(`/admin/reports/${reportId}`);
    return response.data.data;
  },

  downloadReport: async (reportId: string) => {
    const response = await api.get(`/admin/reports/${reportId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  },

  getQuickStats: async (timeRange?: string) => {
    const params = timeRange ? `?timeRange=${timeRange}` : '';
    const response = await api.get(`/admin/reports/stats/quick${params}`);
    return response.data.data;
  },
};

// Utility function to handle API errors
export const handleApiError = (error: any) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  return error.message || 'An unexpected error occurred';
};

// Export default for backward compatibility
export default adminApiService;