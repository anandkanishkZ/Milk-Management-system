'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp,
  Users,
  DollarSign,
  ShoppingCart,
  RefreshCw,
  Download,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { adminApiService } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';

// Types for analytics data based on API response
interface OverviewAnalytics {
  overview: {
    totalRevenue: number;
    totalCustomers: number;
    totalVendors: number;
    growthTrend: {
      date: string;
      count: number;
    }[];
  };
}

interface RevenueAnalytics {
  revenue: {
    date: string;
    amount: number;
    quantity: number;
    orders: number;
  }[];
}

interface CustomerAnalytics {
  growth: {
    date: string;
    count: number;
  }[];
  byVendor: {
    vendorName: string;
    customerCount: number;
  }[];
}

interface GeographicAnalytics {
  distribution: {
    location: string;
    count: number;
  }[];
}

// Filters interface
interface AnalyticsFilters {
  type: 'overview' | 'revenue' | 'customers' | 'geographic';
  from?: string;
  to?: string;
}



// Utility functions
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0
  }).format(amount);
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-IN').format(num);
};

const formatPercentage = (num: number) => {
  return `${num.toFixed(1)}%`;
};

const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
  switch (trend) {
    case 'up':
      return <ArrowUpRight className="h-4 w-4 text-green-500" />;
    case 'down':
      return <ArrowDownRight className="h-4 w-4 text-red-500" />;
    default:
      return <Activity className="h-4 w-4 text-gray-500" />;
  }
};

const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
  switch (trend) {
    case 'up':
      return 'text-green-600';
    case 'down':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
};

export default function AnalyticsPage() {
  const [filters, setFilters] = useState<AnalyticsFilters>({
    type: 'overview'
  });

  // Fetch analytics data using React Query
  const { data: analyticsData, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-analytics', filters],
    queryFn: async () => {
      console.log('🔍 Fetching analytics with filters:', filters);
      const result = await adminApiService.getAnalytics(filters.type);
      console.log('📊 Analytics API response:', result);
      return result;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const refreshData = async () => {
    refetch();
  };

  // Handle error state
  if (error) {
    console.error('❌ Analytics fetch error:', error);
    return (
      <AdminLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading analytics</h3>
            <p className="text-gray-500 mb-4">Failed to fetch analytics data</p>
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

  // Get analytics data safely based on type
  const overviewData = (analyticsData as OverviewAnalytics)?.overview;
  const revenueData = (analyticsData as RevenueAnalytics)?.revenue;
  const customerData = (analyticsData as CustomerAnalytics);
  const geographicData = (analyticsData as GeographicAnalytics)?.distribution;

  const exportData = async () => {
    try {
      console.log('Exporting analytics data...');
      // const blob = await adminApiService.exportAnalytics({ timeRange, format: 'pdf' });
      // downloadBlob(blob, 'analytics-report.pdf');
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
              <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">
                Business insights and performance metrics
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as any }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 3 months</option>
                <option value="1y">Last year</option>
              </select>
              <button
                onClick={exportData}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Report
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

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  {overviewData ? formatCurrency(overviewData.totalRevenue) : '₹0'}
                </p>
                <p className="text-sm text-green-600">
                  Total revenue generated
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Customers</p>
                <p className="text-2xl font-bold text-gray-900">
                  {overviewData ? formatNumber(overviewData.totalCustomers) : '0'}
                </p>
                <p className="text-sm text-gray-500">
                  Total customers registered
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">
                  {overviewData?.growthTrend?.length || 0}
                </p>
                <p className="text-sm text-gray-500">
                  Growth data points
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Vendors</p>
                <p className="text-2xl font-bold text-gray-900">
                  {overviewData ? formatNumber(overviewData.totalVendors) : '0'}
                </p>
                <p className="text-sm text-green-600">
                  Total vendors registered
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Growth Metrics */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Growth Metrics</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {overviewData?.growthTrend?.slice(0, 4).map((trend, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-500">Growth Trend</p>
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                  </div>
                  <p className="text-xl font-bold text-gray-900">
                    {formatNumber(trend.count)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(trend.date).toLocaleDateString('en-IN')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Vendor Performance */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Top Performing Vendors</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customers
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customerData?.byVendor?.slice(0, 5).map((vendor, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {vendor.vendorName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      -
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      -
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(vendor.customerCount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      -
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="font-medium text-blue-600">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Customer Segmentation and Regional Data */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Customer Segmentation */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Customer Segmentation</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {customerData?.growth?.slice(0, 3).map((growth, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">Growth Period {index + 1}</span>
                        <span className="text-sm text-gray-500">{formatNumber(growth.count)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${Math.min(growth.count * 10, 100)}%` }}
                        ></div>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Date: {new Date(growth.date).toLocaleDateString('en-IN')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Regional Performance */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Regional Performance</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {geographicData?.slice(0, 4).map((location, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{location.location}</h3>
                      <span className="text-sm font-medium text-blue-600">
                        {formatNumber(location.count)} customers
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      <p>Customer distribution by location</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </AdminLayout>
  );
}