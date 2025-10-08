'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  Users,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  TrendingUp,
  MoreHorizontal,
  Wifi,
  WifiOff,
  Activity
} from 'lucide-react';
import { adminApiService } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';
import { 
  useAdminSocket, 
  useRealtimeStats, 
  useRealtimeDeliveries, 
  useRealtimePayments,
  useRealtimeCustomers,
  useSocketHealth 
} from '@/hooks/useSocket';
import { toast } from 'react-toastify';

// Types
interface Customer {
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

interface CustomersResponse {
  data: Customer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface Filters {
  search: string;
  vendorId: string;
  status: string;
  paymentStatus: string;
}

// Utility functions
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const getStatusBadge = (isActive: boolean) => {
  return isActive 
    ? 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800'
    : 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800';
};

const getPaymentStatusBadge = (status: string) => {
  const styles = {
    current: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
    advanced: 'bg-blue-100 text-blue-800'
  };
  return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.current}`;
};

const getDayNames = (days: number[]) => {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days.map(day => dayNames[day]).join(', ');
};

export default function AllCustomersPage() {
  const [filters, setFilters] = useState<Filters>({
    search: '',
    vendorId: '',
    status: 'all',
    paymentStatus: 'all'
  });
  const queryClient = useQueryClient();

  // Real-time Socket.IO hooks
  const { isConnected: socketConnected, lastError: socketError } = useAdminSocket();
  const { lastCustomerUpdate } = useRealtimeCustomers();
  const { lastPayment } = useRealtimePayments();
  const { lastDelivery } = useRealtimeDeliveries();
  const { isHealthy: socketHealthy, startHealthCheck } = useSocketHealth();

  // Start health monitoring
  useEffect(() => {
    const cleanup = startHealthCheck(30000);
    return cleanup;
  }, [startHealthCheck]);

  // Notify when switching to real-time mode
  useEffect(() => {
    if (socketConnected && socketHealthy) {
      toast.success('📡 Real-time customer updates enabled');
    } else if (socketError) {
      toast.warning('⚠️ Customer page switched to polling mode');
    }
  }, [socketConnected, socketHealthy, socketError]);

  // Auto-refresh customer list when real-time updates occur
  useEffect(() => {
    if (lastCustomerUpdate || lastPayment || lastDelivery) {
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
    }
  }, [lastCustomerUpdate, lastPayment, lastDelivery, queryClient]);

  // Fetch customers data using React Query
  const { data: customersData, isLoading, error, refetch } = useQuery<Customer[]>({
    queryKey: ['admin-customers', filters],
    queryFn: async () => {
      console.log('🔍 Fetching customers with filters:', filters);
      
      // Prepare filters for API - exclude if 'all'
      const apiFilters: any = { ...filters };
      
      // Remove filters with 'all' values
      if (apiFilters.status === 'all') {
        delete apiFilters.status;
      }
      if (apiFilters.paymentStatus === 'all') {
        delete apiFilters.paymentStatus;
      }
      if (!apiFilters.search) {
        delete apiFilters.search;
      }
      if (!apiFilters.vendorId) {
        delete apiFilters.vendorId;
      }
      
      console.log('📤 Sending to API:', apiFilters);
      const result = await adminApiService.getAllCustomers(apiFilters);
      console.log('📊 Customers API response:', result);
      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      vendorId: '',
      status: 'all',
      paymentStatus: 'all'
    });
  };

  const refreshData = async () => {
    refetch();
  };

  const exportData = async () => {
    try {
      console.log('🔄 Exporting data with filters:', filters);
      // TODO: Implement export functionality
      // const blob = await adminApiService.exportData({ type: 'customers', format: 'csv', filters });
      // downloadBlob(blob, 'customers-export.csv');
    } catch (error) {
      console.error('❌ Error exporting data:', error);
    }
  };

  // Get customers data safely
  const customers = customersData || [];
  
  // Get unique vendors from customers
  const uniqueVendors = Array.from(
    new Set(customers.map((c: Customer) => c.vendor.id))
  ).map(id => customers.find((c: Customer) => c.vendor.id === id)?.vendor).filter(Boolean);

  // Handle error state
  if (error) {
    console.error('❌ Customers fetch error:', error);
    return (
      <AdminLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading customers</h3>
            <p className="text-gray-500 mb-4">Failed to fetch customer data</p>
            <button
              onClick={() => refetch()}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold text-gray-900">All Customers</h1>
                {/* Real-time Connection Status */}
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                  socketConnected 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {socketConnected ? (
                    <>
                      <Wifi className="h-3 w-3" />
                      <span>Live Updates</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-3 w-3" />
                      <span>Manual Refresh</span>
                    </>
                  )}
                </div>
                {/* Real-time update indicators */}
                {lastCustomerUpdate && (
                  <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                    <Activity className="h-3 w-3" />
                    <span>Customer Updated</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {customers.length} customers
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={exportData}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
              <button
                onClick={refreshData}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search customers, vendors..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Vendor Filter */}
            <select
              value={filters.vendorId}
              onChange={(e) => handleFilterChange('vendorId', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Vendors</option>
              {uniqueVendors.map((vendor) => (
                <option key={vendor?.id} value={vendor?.id}>
                  {vendor?.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* Payment Status Filter */}
            <select
              value={filters.paymentStatus}
              onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Payment Status</option>
              <option value="current">Current</option>
              <option value="overdue">Overdue</option>
              <option value="advanced">Advanced</option>
            </select>

            {/* Clear Filters */}
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 focus:outline-none"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customers.map((customer: Customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {customer.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            <Phone className="inline h-3 w-3 mr-1" />
                            {customer.phone}
                          </div>
                          <div className="text-sm text-gray-500">
                            <MapPin className="inline h-3 w-3 mr-1" />
                            {customer.address.length > 30 
                              ? customer.address.substring(0, 30) + '...' 
                              : customer.address}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{customer.vendor.name}</div>
                      <div className="text-sm text-gray-500">
                        <Mail className="inline h-3 w-3 mr-1" />
                        {customer.vendor.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadge(customer.isActive)}>
                        {customer.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <div className="mt-1">
                        <span className={getPaymentStatusBadge(customer.stats.paymentStatus)}>
                          {customer.stats.paymentStatus}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{customer.stats.totalOrders}</div>
                      <div className="text-gray-500">
                        {formatCurrency(customer.stats.customerLifetimeValue)} LTV
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className={`font-medium ${
                        customer.stats.balance > 0 ? 'text-red-600' : 
                        customer.stats.balance < 0 ? 'text-blue-600' : 'text-green-600'
                      }`}>
                        {formatCurrency(Math.abs(customer.stats.balance))}
                      </div>
                      <div className="text-gray-500">
                        {customer.stats.balance > 0 ? 'Due' : 
                         customer.stats.balance < 0 ? 'Advanced' : 'Clear'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {customer.stats.lastOrderDate 
                        ? formatDate(customer.stats.lastOrderDate)
                        : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button className="text-gray-400 hover:text-gray-600">
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading customers...</p>
            </div>
          )}

          {customers.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No customers found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
    </AdminLayout>
  );
}