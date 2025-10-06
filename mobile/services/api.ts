import AsyncStorage from '@react-native-async-storage/async-storage';
import { Customer, DailyEntry, Payment, ActivityLog } from '@/types';
import { ENV, getApiUrl, log, logError } from '@/config/environment';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name?: string;
    phone?: string;
    isActive: boolean;
    isVerified: boolean;
    createdAt: string;
    updatedAt: string;
  };
  tokens: AuthTokens;
}

class ApiService {
  private baseUrl: string;
  private apiUrl: string;

  constructor() {
    this.baseUrl = ENV.apiBaseUrl;
    this.apiUrl = `${this.baseUrl}${ENV.apiVersion}`;
  }

  // Token Management
  private async getAuthToken(): Promise<string | null> {
    try {
      const tokens = await AsyncStorage.getItem('auth_tokens');
      if (tokens) {
        const { accessToken } = JSON.parse(tokens);
        return accessToken;
      }
      return null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  private async getRefreshToken(): Promise<string | null> {
    try {
      const tokens = await AsyncStorage.getItem('auth_tokens');
      if (tokens) {
        const { refreshToken } = JSON.parse(tokens);
        return refreshToken;
      }
      return null;
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  }

  private async refreshAccessToken(): Promise<string | null> {
    try {
      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) {
        return null;
      }

      const response = await fetch(`${this.apiUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        // Refresh token is invalid or expired
        await this.clearAuthTokens();
        return null;
      }

      const data = await response.json();
      if (data.success && data.data) {
        await this.setAuthTokens(data.data);
        return data.data.accessToken;
      }

      return null;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  }

  private async setAuthTokens(tokens: AuthTokens): Promise<void> {
    try {
      await AsyncStorage.setItem('auth_tokens', JSON.stringify(tokens));
    } catch (error) {
      console.error('Error setting auth tokens:', error);
    }
  }

  private async clearAuthTokens(): Promise<void> {
    try {
      await AsyncStorage.removeItem('auth_tokens');
      await AsyncStorage.removeItem('user_data');
    } catch (error) {
      console.error('Error clearing auth tokens:', error);
    }
  }

  // HTTP Request Helper with automatic token refresh
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<ApiResponse<T>> {
    try {
      const token = await this.getAuthToken();
      const url = `${this.apiUrl}${endpoint}`;

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), ENV.apiTimeout);

      const config: RequestInit = {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
        ...options,
      };

      log(`🌐 API Request: ${options.method || 'GET'} ${url}`);

      const response = await fetch(url, config);
      clearTimeout(timeoutId);
      const data = await response.json();

      if (!response.ok) {
        // Handle 401 Unauthorized - try to refresh token
        if (response.status === 401 && retryCount === 0) {
          log('🔄 Access token expired, attempting to refresh...');
          const newToken = await this.refreshAccessToken();
          
          if (newToken) {
            log('✅ Token refreshed successfully, retrying request...');
            // Retry the request with new token
            return this.request(endpoint, options, retryCount + 1);
          } else {
            log('❌ Token refresh failed, clearing tokens...');
            await this.clearAuthTokens();
            throw new Error('Session expired. Please login again.');
          }
        }
        throw new Error(data.error || data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      logError(`❌ API Error: ${endpoint}`, error);
      throw error;
    }
  }

  // Authentication API
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success && response.data) {
      await this.setAuthTokens(response.data.tokens);
      await AsyncStorage.setItem('user_data', JSON.stringify(response.data.user));
    }

    return response.data!;
  }

  async register(userData: {
    email: string;
    password: string;
    name: string;
    phone?: string;
  }): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    if (response.success && response.data) {
      await this.setAuthTokens(response.data.tokens);
      await AsyncStorage.setItem('user_data', JSON.stringify(response.data.user));
    }

    return response.data!;
  }

  async logout(): Promise<void> {
    try {
      const refreshToken = await this.getRefreshToken();
      if (refreshToken) {
        await this.request('/auth/logout', { 
          method: 'POST',
          body: JSON.stringify({ refreshToken })
        });
      }
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      await this.clearAuthTokens();
    }
  }

  async getCurrentUser(): Promise<any> {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  // Customer API
  async getCustomers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    active?: boolean;
  }): Promise<{ customers: Customer[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.active !== undefined) queryParams.append('active', params.active.toString());

    const endpoint = `/customers${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await this.request<Customer[]>(endpoint);

    return {
      customers: response.data || [],
      pagination: response.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 }
    };
  }

  async getCustomer(id: string): Promise<Customer> {
    const response = await this.request<Customer>(`/customers/${id}`);
    return response.data!;
  }

  async createCustomer(customerData: Omit<Customer, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
    const response = await this.request<Customer>('/customers', {
      method: 'POST',
      body: JSON.stringify(customerData),
    });
    return response.data!;
  }

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
    const response = await this.request<Customer>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return response.data!;
  }

  async deleteCustomer(id: string, permanent?: boolean): Promise<Customer | void> {
    if (permanent) {
      await this.request(`/customers/${id}/permanent?confirm=true`, { method: 'DELETE' });
      return; // Permanent delete returns void
    } else {
      // Soft delete returns updated customer with isActive: false
      const response = await this.request<Customer>(`/customers/${id}`, { method: 'DELETE' });
      return response.data!;
    }
  }

  async checkCustomerCanDelete(id: string): Promise<{
    canDelete: boolean;
    customer: { id: string; name: string; phone: string };
    dependencies: {
      entries: number;
      payments: number;
      pendingBalance: number;
      hasAdvance: boolean;
      list: string[];
    };
    message: string;
  }> {
    const response = await this.request<any>(`/customers/${id}/can-delete`);
    return response.data!;
  }

  // Daily Entries API
  async getDailyEntries(params?: {
    page?: number;
    limit?: number;
    customerId?: string;
    from?: string;
    to?: string;
    productType?: string;
  }): Promise<{ entries: DailyEntry[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.customerId) queryParams.append('customerId', params.customerId);
    if (params?.from) queryParams.append('from', params.from);
    if (params?.to) queryParams.append('to', params.to);
    if (params?.productType) queryParams.append('productType', params.productType);

    const endpoint = `/daily-entries${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await this.request<any[]>(endpoint);

    return {
      entries: response.data || [],
      pagination: response.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 }
    };
  }

  async createDailyEntry(entryData: {
    customerId: string;
    entryDate: string;
    quantity: number;
    productType?: string;
    pricePerLiter: number;
    notes?: string;
  }): Promise<DailyEntry> {
    const response = await this.request<any>('/daily-entries', {
      method: 'POST',
      body: JSON.stringify(entryData),
    });
    return response.data!;
  }

  async updateDailyEntry(id: string, updates: Partial<DailyEntry>): Promise<DailyEntry> {
    const response = await this.request<any>(`/daily-entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return response.data!;
  }

  async deleteDailyEntry(id: string): Promise<void> {
    await this.request(`/daily-entries/${id}`, { method: 'DELETE' });
  }

  // Payments API
  async getPayments(params?: {
    page?: number;
    limit?: number;
    customerId?: string;
    from?: string;
    to?: string;
    method?: string;
  }): Promise<{ payments: Payment[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.customerId) queryParams.append('customerId', params.customerId);
    if (params?.from) queryParams.append('from', params.from);
    if (params?.to) queryParams.append('to', params.to);
    if (params?.method) queryParams.append('method', params.method);

    const endpoint = `/payments${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await this.request<any[]>(endpoint);

    return {
      payments: response.data || [],
      pagination: response.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 }
    };
  }

  async createPayment(paymentData: {
    customerId: string;
    amount: number;
    method: 'CASH' | 'MOBILE' | 'BANK';
    reference?: string;
    paymentDate: string;
    notes?: string;
  }): Promise<Payment> {
    const response = await this.request<any>('/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
    return response.data!;
  }

  async deletePayment(id: string): Promise<void> {
    await this.request(`/payments/${id}`, { method: 'DELETE' });
  }

  // Activity Logs API
  async getActivityLogs(params?: {
    page?: number;
    limit?: number;
    action?: string;
    entityType?: string;
    from?: string;
    to?: string;
  }): Promise<{ logs: ActivityLog[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.action) queryParams.append('action', params.action);
    if (params?.entityType) queryParams.append('entityType', params.entityType);
    if (params?.from) queryParams.append('from', params.from);
    if (params?.to) queryParams.append('to', params.to);

    const endpoint = `/activity-logs${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await this.request<any[]>(endpoint);

    return {
      logs: response.data || [],
      pagination: response.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 }
    };
  }

  async createActivityLog(activityData: {
    action: string;
    entityType: string;
    entityId?: string;
    entityName?: string;
    description?: string;
    metadata?: any;
  }): Promise<ActivityLog> {
    const response = await this.request<ActivityLog>('/activity-logs', {
      method: 'POST',
      body: JSON.stringify(activityData),
    });
    return response.data!;
  }

  // Reports API
  async getDashboardReport(params?: {
    from?: string;
    to?: string;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params?.from) queryParams.append('from', params.from);
    if (params?.to) queryParams.append('to', params.to);

    const endpoint = `/reports/dashboard${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await this.request<any>(endpoint);
    return response.data!;
  }

  async getRevenueReport(params: {
    from: string;
    to: string;
    customerId?: string;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<any> {
    const queryParams = new URLSearchParams({
      from: params.from,
      to: params.to,
    });
    if (params.customerId) queryParams.append('customerId', params.customerId);
    if (params.groupBy) queryParams.append('groupBy', params.groupBy);

    const endpoint = `/reports/revenue?${queryParams.toString()}`;
    const response = await this.request<any>(endpoint);
    return response.data!;
  }

  async getCustomerReport(params?: {
    from?: string;
    to?: string;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params?.from) queryParams.append('from', params.from);
    if (params?.to) queryParams.append('to', params.to);

    const endpoint = `/reports/customers${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await this.request<any>(endpoint);
    return response.data!;
  }

  // Health Check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;