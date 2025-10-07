'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApiService } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';
import { 
  Users, 
  UserCheck, 
  TrendingUp, 
  DollarSign, 
  ShoppingCart,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Download,
  Calendar,
  Eye
} from 'lucide-react';
import { toast } from 'react-toastify';

// Types
interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalVendors: number;
  activeVendors: number;
  totalCustomers: number;
  activeCustomers: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  recentActivity: Array<{
    id: string;
    action: string;
    user: string;
    timestamp: string;
    details: string;
  }>;
  topVendors: Array<{
    id: string;
    name: string;
    revenue: number;
    customers: number;
    rating: number;
  }>;
}

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  // Fetch dashboard data
  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard-stats', dateRange],
    queryFn: () => adminApiService.getDashboardStats(dateRange),
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: false, // Don't retry on failure
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  const handleExport = async () => {
    try {
      const blob = await adminApiService.exportData('dashboard', 'pdf', dateRange);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `dashboard-report-${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Report exported successfully');
    } catch (error) {
      toast.error('Failed to export report');
    }
  };

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

  if (error) {
    return (
      <AdminLayout>
        <div className="p-6">
          <div className="text-center py-12">
            <div className="text-red-600 text-lg font-medium">Failed to load dashboard</div>
            <p className="text-gray-500 mt-2">Please try refreshing the page</p>
            <button 
              onClick={() => refetch()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Welcome to your admin dashboard overview
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Date Range Selector */}
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <button
              onClick={handleExport}
              className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
            
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Users */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-gray-500">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(stats?.totalUsers || 0)}
                    </p>
                    <div className="flex items-center mt-1">
                      <UserCheck className="h-3 w-3 text-blue-500 mr-1" />
                      <span className="text-sm text-blue-600">
                        {formatNumber(stats?.activeUsers || 0)} active
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Revenue */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(stats?.totalRevenue || 0)}
                    </p>
                    <div className="flex items-center mt-1">
                      <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                      <span className="text-sm text-green-600">
                        {formatCurrency(stats?.monthlyRevenue || 0)} this month
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Customers */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-gray-500">Active Customers</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(stats?.activeCustomers || 0)}
                    </p>
                    <div className="flex items-center mt-1">
                      <span className="text-sm text-gray-600">
                        of {formatNumber(stats?.totalCustomers || 0)} total
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Vendors */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <UserCheck className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-gray-500">Active Vendors</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(stats?.activeVendors || 0)}
                    </p>
                    <div className="flex items-center mt-1">
                      <span className="text-sm text-gray-600">
                        of {formatNumber(stats?.totalVendors || 0)} total
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Orders */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <ShoppingCart className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-gray-500">Total Orders</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(stats?.totalOrders || 0)}
                    </p>
                    <div className="flex items-center mt-1">
                      <span className="text-sm text-gray-600">
                        Avg: {formatCurrency(stats?.averageOrderValue || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts and Tables Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Top Performing Vendors */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Top Performing Vendors</h2>
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center">
                    <Eye className="h-4 w-4 mr-1" />
                    View All
                  </button>
                </div>
                
                <div className="space-y-4">
                  {stats?.topVendors?.slice(0, 5).map((vendor: any, index: number) => (
                    <div key={vendor.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                          {index + 1}
                        </div>
                        <div className="ml-3">
                          <div className="font-medium text-gray-900">{vendor.name}</div>
                          <div className="text-sm text-gray-500">{vendor.customers} customers</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900">{formatCurrency(vendor.revenue)}</div>
                        <div className="text-sm text-yellow-600">★ {vendor.rating.toFixed(1)}</div>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-8 text-gray-500">
                      No vendor data available
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center">
                    <Eye className="h-4 w-4 mr-1" />
                    View All
                  </button>
                </div>
                
                <div className="space-y-4">
                  {stats?.recentActivity?.slice(0, 5).map((activity: any) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-900">
                          <span className="font-medium">{activity.user}</span> {activity.action}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{activity.details}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(activity.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-8 text-gray-500">
                      No recent activity
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Users className="h-6 w-6 text-blue-600 mb-2" />
              <div className="font-medium text-gray-900">View Customers</div>
              <div className="text-sm text-gray-500">Manage all customers</div>
            </button>
            
            <button className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <UserCheck className="h-6 w-6 text-green-600 mb-2" />
              <div className="font-medium text-gray-900">View Vendors</div>
              <div className="text-sm text-gray-500">Manage all vendors</div>
            </button>
            
            <button className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <TrendingUp className="h-6 w-6 text-purple-600 mb-2" />
              <div className="font-medium text-gray-900">Analytics</div>
              <div className="text-sm text-gray-500">View detailed reports</div>
            </button>
            
            <button className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Activity className="h-6 w-6 text-orange-600 mb-2" />
              <div className="font-medium text-gray-900">System Health</div>
              <div className="text-sm text-gray-500">Monitor system status</div>
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}