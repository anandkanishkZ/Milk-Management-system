'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Users,
  DollarSign,
  TrendingUp,
  MoreHorizontal,
  Star,
  Activity
} from 'lucide-react';
import { adminApiService } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';

// Types
interface Vendor {
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

interface VendorFilters {
  search: string;
  status: string;
  sortBy: string;
  sortOrder: string;
}

interface VendorsResponse {
  data: Vendor[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
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

const formatDateTime = (date: string) => {
  return new Date(date).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getStatusBadge = (isActive: boolean) => {
  return isActive 
    ? 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800'
    : 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800';
};

const getPerformanceColor = (score: number) => {
  if (score >= 90) return 'text-green-600';
  if (score >= 75) return 'text-yellow-600';
  return 'text-red-600';
};

const getRatingStars = (rating: number) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;
  const stars = [];
  
  for (let i = 0; i < fullStars; i++) {
    stars.push(<Star key={i} className="h-4 w-4 fill-current text-yellow-500" />);
  }
  
  if (hasHalfStar) {
    stars.push(<Star key="half" className="h-4 w-4 fill-current text-yellow-500 opacity-50" />);
  }
  
  const emptyStars = 5 - Math.ceil(rating);
  for (let i = 0; i < emptyStars; i++) {
    stars.push(<Star key={`empty-${i}`} className="h-4 w-4 text-gray-300" />);
  }
  
  return stars;
};

export default function VendorsPage() {
  const [filters, setFilters] = useState<VendorFilters>({
    search: '',
    status: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // Fetch vendors data using React Query
  const { data: vendorsData, isLoading, error, refetch } = useQuery<Vendor[]>({
    queryKey: ['admin-vendors', filters],
    queryFn: async () => {
      console.log('🔍 Fetching vendors with filters:', filters);
      
      // Prepare filters for API - exclude if 'all'
      const apiFilters: any = { ...filters };
      
      // Remove filters with 'all' values
      if (apiFilters.status === 'all') {
        delete apiFilters.status;
      }
      if (!apiFilters.search) {
        delete apiFilters.search;
      }
      
      console.log('📤 Sending to API:', apiFilters);
      const result = await adminApiService.getAllVendors(apiFilters);
      console.log('📊 Vendors API response:', result);
      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleFilterChange = (key: keyof VendorFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  };

  // Handle error state
  if (error) {
    console.error('❌ Vendors fetch error:', error);
    return (
      <AdminLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading vendors</h3>
            <p className="text-gray-500 mb-4">Failed to fetch vendor data</p>
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

  // Get vendors data safely
  const vendors = vendorsData || [];

  const refreshData = async () => {
    refetch();
  };

  const exportData = async () => {
    try {
      console.log('🔄 Exporting vendors data with filters:', filters);
      // TODO: Implement export functionality
      // const blob = await adminApiService.exportData({ type: 'vendors', format: 'csv', filters });
      // downloadBlob(blob, 'vendors-export.csv');
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
              <p className="text-sm text-gray-500 mt-1">
                {vendors.length} vendors
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
                placeholder="Search vendors..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>

            {/* Sort By Filter */}
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="createdAt">Sort by Join Date</option>
              <option value="name">Sort by Name</option>
              <option value="email">Sort by Email</option>
              <option value="lastLoginAt">Sort by Last Login</option>
            </select>

            {/* Sort Order Filter */}
            <select
              value={filters.sortOrder}
              onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 3 months</option>
              <option value="365">Last year</option>
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
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status & Verification
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customers
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue & Stats
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orders & Payments
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {vendors.map((vendor: Vendor) => (
                  <tr key={vendor.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {vendor.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            <Mail className="inline h-3 w-3 mr-1" />
                            {vendor.email}
                          </div>
                          <div className="text-sm text-gray-500">
                            <Phone className="inline h-3 w-3 mr-1" />
                            {vendor.phone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadge(vendor.isActive)}>
                        {vendor.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <div className="flex items-center mt-1">
                        <span className={`text-xs px-2 py-1 rounded-full ${vendor.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {vendor.isVerified ? 'Verified' : 'Unverified'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1 text-gray-400" />
                        <span>{vendor.stats.activeCustomers}/{vendor.stats.totalCustomers}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {vendor.stats.inactiveCustomers} inactive
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="font-medium">
                        {formatCurrency(vendor.stats.totalRevenue)}
                      </div>
                      <div className="text-gray-500">
                        {vendor.stats.totalQuantity} L total
                      </div>
                      <div className="text-xs text-gray-500">
                        Avg: {formatCurrency(vendor.stats.averageOrderValue)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="font-medium text-blue-600">
                        {vendor.stats.totalOrders}
                      </div>
                      <div className="text-gray-500">
                        {vendor.stats.totalPayments} payments
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Activity className="h-3 w-3 mr-1" />
                        {vendor.lastLoginAt ? formatDateTime(vendor.lastLoginAt) : 'Never'}
                      </div>
                      <div className="text-xs text-gray-400">
                        Joined {formatDate(vendor.createdAt)}
                      </div>
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
              <p className="text-gray-500 mt-2">Loading vendors...</p>
            </div>
          )}

          {vendors.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <User className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No vendors found</h3>
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