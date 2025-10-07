// Admin Dashboard Types

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'VIEWER';
  permissions: string[];
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  isActive: boolean;
  isVerified: boolean;
  timezone: string | null;
  preferences: any;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  stats: {
    totalCustomers: number;
    totalEntries: number;
    totalPayments: number;
  };
}

export interface SystemOverview {
  users: {
    total: number;
    active: number;
    newThisMonth: number;
    growthRate: number;
    avgCustomersPerUser: number;
  };
  customers: {
    total: number;
    active: number;
    newThisMonth: number;
    avgPerVendor: number;
  };
  business: {
    totalEntries: number;
    totalQuantity: number;
    totalRevenue: number;
    totalPayments: number;
    totalCollected: number;
    pendingAmount: number;
  };
  topVendors: TopVendor[];
  systemHealth: {
    status: 'healthy' | 'degraded' | 'down';
    uptime: number;
    metrics: SystemMetric[];
  };
}

export interface TopVendor {
  id: string;
  name: string;
  email: string;
  customersCount: number;
  entriesCount: number;
  joinedAt: string;
}

export interface SystemMetric {
  id: string;
  metricName: string;
  metricValue: number;
  metadata: any;
  recordedAt: string;
}

export interface AdminCustomerView {
  id: string;
  name: string;
  phone: string;
  address: string;
  isActive: boolean;
  defaultQuantity: number;
  defaultPrice: number;
  deliveryDays: number[];
  notes: string;
  createdAt: string;
  updatedAt: string;
  vendor: {
    id: string;
    name: string;
    email: string;
    phone: string;
    isActive: boolean;
    joinedAt: string;
  };
  stats: {
    totalOrders: number;
    totalPayments: number;
    totalBilled: number;
    totalPaid: number;
    balance: number;
    lastOrderDate: string | null;
    paymentStatus: 'current' | 'overdue' | 'advanced';
    customerLifetimeValue: number;
  };
}

export interface AdminVendorView {
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  isVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  stats: {
    totalCustomers: number;
    activeCustomers: number;
    inactiveCustomers: number;
    totalOrders: number;
    totalPayments: number;
    totalRevenue: number;
    totalQuantity: number;
    averageOrderValue: number;
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
  pagination?: PaginationParams;
}

export interface AnalyticsData {
  revenue?: {
    date: string;
    amount: number;
    quantity: number;
    orders: number;
  }[];
  customers?: {
    growth: {
      date: string;
      count: number;
    }[];
    byVendor: {
      vendorName: string;
      customerCount: number;
    }[];
  };
  geographic?: {
    distribution: {
      location: string;
      count: number;
    }[];
  };
  overview?: {
    totalRevenue: number;
    totalCustomers: number;
    totalVendors: number;
    growthTrend: {
      date: string;
      count: number;
    }[];
  };
}

export interface DashboardFilters {
  search?: string;
  vendorId?: string;
  status?: boolean;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ExportOptions {
  type: 'customers' | 'vendors' | 'revenue' | 'analytics';
  format: 'csv' | 'excel' | 'pdf';
  filters?: DashboardFilters;
}