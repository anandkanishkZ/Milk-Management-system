'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  Users,
  DollarSign,
  Package,
  BarChart3,
  PieChart,
  LineChart,
  Filter,
  RefreshCw,
  Eye,
  FileSpreadsheet,
  File,
  Printer,
  ChevronDown,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { adminApiService } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';
import { Toast } from '@/lib/toast';
import { 
  useAdminSocket, 
  useRealtimeStats, 
  useRealtimeDeliveries, 
  useRealtimePayments,
  useSocketHealth 
} from '@/hooks/useSocket';

// Types for reports
interface ReportData {
  id: string;
  name: string;
  description: string;
  type: 'sales' | 'users' | 'orders' | 'financial' | 'inventory' | 'performance';
  generatedAt: string;
  size: string;
  status: 'completed' | 'generating' | 'failed';
  downloadUrl?: string;
}

interface ReportSummary {
  totalReports: number;
  reportsThisMonth: number;
  avgGenerationTime: string;
  totalDownloads: number;
}

interface QuickStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  revenueGrowth: number;
  ordersGrowth: number;
  customersGrowth: number;
  productsGrowth: number;
}

const ReportsPage = () => {
  const [selectedReportType, setSelectedReportType] = useState<string>('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('30d');
  const [selectedFormat, setSelectedFormat] = useState<string>('pdf');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const queryClient = useQueryClient();

  // Real-time Socket.IO hooks
  const { isConnected: socketConnected, lastError: socketError } = useAdminSocket();
  const { stats: realtimeStats, lastUpdate: statsLastUpdate } = useRealtimeStats();
  const { lastDelivery } = useRealtimeDeliveries();
  const { lastPayment } = useRealtimePayments();
  const { isHealthy: socketHealthy, startHealthCheck } = useSocketHealth();

  // Start health monitoring
  useEffect(() => {
    const cleanup = startHealthCheck(30000); // Check every 30 seconds
    return cleanup;
  }, [startHealthCheck]);

  // Notify when switching to real-time mode
  useEffect(() => {
    if (socketConnected && socketHealthy) {
      Toast.success('📡 Real-time updates enabled');
    } else if (socketError) {
      Toast.warning('⚠️ Switched to polling mode - real-time updates unavailable');
    }
  }, [socketConnected, socketHealthy, socketError]);

  // Fetch reports summary with auto-refresh
  const { data: reportSummary, isLoading: summaryLoading, refetch: refetchSummary } = useQuery<ReportSummary>({
    queryKey: ['reports-summary'],
    queryFn: () => adminApiService.getReportsSummary(),
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchIntervalInBackground: true,
  });

  // Fetch quick stats with fallback to REST API
  const { data: apiStats, isLoading: statsLoading, refetch: refetchStats } = useQuery<QuickStats>({
    queryKey: ['quick-stats', selectedTimeRange],
    queryFn: () => adminApiService.getQuickStats(selectedTimeRange),
    refetchInterval: socketConnected ? false : 60000, // Only poll if socket disconnected
    refetchIntervalInBackground: false,
    enabled: !socketConnected, // Disable when socket is connected
  });

  // Use real-time stats if available, fallback to API stats
  const quickStats = realtimeStats || apiStats;

  // Fetch recent reports with smart refresh
  const { data: recentReports, isLoading: reportsLoading, refetch: refetchReports } = useQuery<ReportData[]>({
    queryKey: ['recent-reports', selectedReportType],
    queryFn: () => adminApiService.getReports({ 
      type: selectedReportType === 'all' ? undefined : selectedReportType,
      limit: 20
    }),
    refetchInterval: socketConnected ? false : 30000, // Reduce polling when socket is connected
    refetchIntervalInBackground: false,
  });

  // Auto-refresh when real-time updates occur
  useEffect(() => {
    if (lastDelivery || lastPayment) {
      refetchReports();
    }
  }, [lastDelivery, lastPayment, refetchReports]);

  const reportTypes = [
    { value: 'all', label: 'All Reports', icon: FileText },
    { value: 'sales', label: 'Sales Reports', icon: TrendingUp },
    { value: 'users', label: 'User Reports', icon: Users },
    { value: 'financial', label: 'Financial Reports', icon: DollarSign },
    { value: 'inventory', label: 'Inventory Reports', icon: Package },
    { value: 'performance', label: 'Performance Reports', icon: BarChart3 }
  ];

  const timeRanges = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 3 Months' },
    { value: '1y', label: 'Last Year' },
    { value: 'custom', label: 'Custom Range' }
  ];

  const exportFormats = [
    { value: 'pdf', label: 'PDF', icon: File },
    { value: 'excel', label: 'Excel', icon: FileSpreadsheet },
    { value: 'csv', label: 'CSV', icon: FileText }
  ];

  // Report generation mutation
  const generateReportMutation = useMutation({
    mutationFn: (params: { type: string; timeRange: string; format: string }) =>
      adminApiService.generateReport(params),
    onSuccess: (data, variables) => {
      Toast.success(`${variables.type.charAt(0).toUpperCase() + variables.type.slice(1)} report generated successfully!`);
      // Invalidate and refetch reports
      queryClient.invalidateQueries({ queryKey: ['recent-reports'] });
      queryClient.invalidateQueries({ queryKey: ['reports-summary'] });
    },
    onError: (error) => {
      console.error('Report generation failed:', error);
      Toast.error('Failed to generate report. Please try again.');
    }
  });

  const handleGenerateReport = async (reportType: string) => {
    generateReportMutation.mutate({
      type: reportType,
      timeRange: selectedTimeRange,
      format: selectedFormat
    });
  };

  const handleDownloadReport = async (reportId: string, reportName: string) => {
    try {
      Toast.info('Starting download...');
      const blob = await adminApiService.downloadReport(reportId);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportName}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      Toast.success(`${reportName} downloaded successfully!`);
    } catch (error) {
      console.error('Download failed:', error);
      Toast.error('Failed to download report. Please try again.');
    }
  };

  const handleViewReport = (reportId: string) => {
    // Open report in new tab or modal
    console.log('Viewing report:', reportId);
    Toast.info('Report viewer will be implemented soon');
  };

  const handleRetryReport = async (reportId: string, reportType: string) => {
    try {
      await adminApiService.generateReport({
        type: reportType,
        timeRange: selectedTimeRange,
        format: selectedFormat
      });
      
      Toast.success('Report regeneration started successfully!');
      // Refresh reports list
      queryClient.invalidateQueries({ queryKey: ['recent-reports'] });
    } catch (error) {
      console.error('Retry failed:', error);
      Toast.error('Failed to retry report generation');
    }
  };

  const handleRefreshAll = () => {
    refetchSummary();
    refetchStats();
    refetchReports();
    Toast.success('Data refreshed successfully!');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'generating':
        return <Clock className="h-5 w-5 text-yellow-500 animate-pulse" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTypeColor = (type: string) => {
    const colors = {
      sales: 'bg-blue-100 text-blue-800',
      users: 'bg-green-100 text-green-800',
      financial: 'bg-purple-100 text-purple-800',
      inventory: 'bg-orange-100 text-orange-800',
      performance: 'bg-indigo-100 text-indigo-800',
      orders: 'bg-pink-100 text-pink-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (summaryLoading || statsLoading || reportsLoading) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading reports dashboard...</p>
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
                <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Generate and download comprehensive business reports
                </p>
              </div>
              <div className="flex items-center space-x-3">
                {/* Real-time Connection Status */}
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    socketConnected && socketHealthy 
                      ? 'bg-green-500' 
                      : socketConnected 
                      ? 'bg-yellow-500' 
                      : 'bg-red-500'
                  }`}></div>
                  <span className="text-xs text-gray-500">
                    {socketConnected 
                      ? (socketHealthy ? 'Real-time' : 'Connected') 
                      : 'Offline'
                    }
                  </span>
                  {statsLastUpdate && (
                    <span className="text-xs text-gray-400">
                      • Updated {statsLastUpdate.toLocaleTimeString()}
                    </span>
                  )}
                </div>
                
                <button className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500">
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </button>
                <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <Download className="h-4 w-4 mr-2" />
                  Export All
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">₹{quickStats?.totalRevenue.toLocaleString()}</p>
                  <p className="text-xs text-green-600 mt-1">
                    +{quickStats?.revenueGrowth}% from last period
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{quickStats?.totalOrders.toLocaleString()}</p>
                  <p className="text-xs text-blue-600 mt-1">
                    +{quickStats?.ordersGrowth}% from last period
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Customers</p>
                  <p className="text-2xl font-bold text-gray-900">{quickStats?.totalCustomers.toLocaleString()}</p>
                  <p className="text-xs text-purple-600 mt-1">
                    +{quickStats?.customersGrowth}% from last period
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Products</p>
                  <p className="text-2xl font-bold text-gray-900">{quickStats?.totalProducts}</p>
                  <p className="text-xs text-orange-600 mt-1">
                    +{quickStats?.productsGrowth}% from last period
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-full">
                  <BarChart3 className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Report Generation Section */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Generate New Report</h3>
                  <p className="text-sm text-gray-500 mt-1">Create custom reports based on your requirements</p>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    {/* Report Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Report Type
                      </label>
                      <div className="relative">
                        <select
                          value={selectedReportType}
                          onChange={(e) => setSelectedReportType(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                        >
                          {reportTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Time Range */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Time Range
                      </label>
                      <div className="relative">
                        <select
                          value={selectedTimeRange}
                          onChange={(e) => setSelectedTimeRange(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                        >
                          {timeRanges.map((range) => (
                            <option key={range.value} value={range.value}>
                              {range.label}
                            </option>
                          ))}
                        </select>
                        <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Export Format */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Format
                      </label>
                      <div className="relative">
                        <select
                          value={selectedFormat}
                          onChange={(e) => setSelectedFormat(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                        >
                          {exportFormats.map((format) => (
                            <option key={format.value} value={format.value}>
                              {format.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Quick Report Buttons */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {reportTypes.slice(1).map((type) => {
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.value}
                          onClick={() => handleGenerateReport(type.value)}
                          disabled={generateReportMutation.isPending}
                          className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {generateReportMutation.isPending ? (
                            <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mb-2" />
                          ) : (
                            <Icon className="h-8 w-8 text-blue-600 mb-2" />
                          )}
                          <span className="text-sm font-medium text-gray-900 text-center">
                            {type.label.replace(' Reports', '')}
                          </span>
                          <span className="text-xs text-gray-500 mt-1">
                            {generateReportMutation.isPending ? 'Generating...' : 'Generate Report'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Recent Reports */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-8">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Recent Reports</h3>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-2 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md ${showFilters ? 'text-blue-600' : 'text-gray-400'}`}
                        title="Filter Reports"
                      >
                        <Filter className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={handleRefreshAll}
                        className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
                        title="Refresh Data"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Filter Panel */}
                {showFilters && (
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Filter by Type
                        </label>
                        <select
                          value={selectedReportType}
                          onChange={(e) => setSelectedReportType(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          {reportTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Time Range
                        </label>
                        <select
                          value={selectedTimeRange}
                          onChange={(e) => setSelectedTimeRange(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          {timeRanges.map((range) => (
                            <option key={range.value} value={range.value}>
                              {range.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Export Format
                        </label>
                        <select
                          value={selectedFormat}
                          onChange={(e) => setSelectedFormat(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          {exportFormats.map((format) => (
                            <option key={format.value} value={format.value}>
                              {format.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Report
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Generated
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Size
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {recentReports?.map((report) => (
                        <tr key={report.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{report.name}</div>
                              <div className="text-sm text-gray-500">{report.description}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(report.type)}`}>
                              {report.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(report.generatedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {report.size}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              {getStatusIcon(report.status)}
                              <span className="ml-2 text-sm text-gray-600 capitalize">
                                {report.status}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              {report.status === 'completed' && (
                                <>
                                  <button 
                                    onClick={() => handleViewReport(report.id)}
                                    className="text-blue-600 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md p-1"
                                    title="View Report"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleDownloadReport(report.id, report.name)}
                                    className="text-green-600 hover:text-green-900 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-md p-1"
                                    title="Download Report"
                                  >
                                    <Download className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                              {report.status === 'failed' && (
                                <button 
                                  onClick={() => handleRetryReport(report.id, report.type)}
                                  className="text-red-600 hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-md p-1"
                                  title="Retry Generation"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Sidebar - Report Summary */}
            <div className="space-y-6">
              {/* Report Summary */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Report Summary</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Reports</span>
                    <span className="text-sm font-medium text-gray-900">{reportSummary?.totalReports}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">This Month</span>
                    <span className="text-sm font-medium text-gray-900">{reportSummary?.reportsThisMonth}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Avg Generation Time</span>
                    <span className="text-sm font-medium text-gray-900">{reportSummary?.avgGenerationTime}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Downloads</span>
                    <span className="text-sm font-medium text-gray-900">{reportSummary?.totalDownloads}</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button 
                    onClick={() => Toast.info('Analytics dashboard coming soon!')}
                    className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Analytics
                  </button>
                  <button 
                    onClick={() => Toast.info('Report scheduling will be available soon!')}
                    className="w-full flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Report
                  </button>
                  <button 
                    onClick={() => handleGenerateReport('financial')}
                    className="w-full flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Quick Export
                  </button>
                </div>
              </div>

              {/* Report Templates */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Report Templates</h3>
                <div className="space-y-3">
                  <div 
                    onClick={() => {
                      setSelectedTimeRange('7d');
                      handleGenerateReport('sales');
                    }}
                    className="flex items-center p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <PieChart className="h-5 w-5 text-blue-600 mr-3" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Daily Summary</div>
                      <div className="text-xs text-gray-500">Revenue, orders, customers</div>
                    </div>
                  </div>
                  <div 
                    onClick={() => {
                      setSelectedTimeRange('7d');
                      handleGenerateReport('performance');
                    }}
                    className="flex items-center p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <LineChart className="h-5 w-5 text-green-600 mr-3" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Weekly Trends</div>
                      <div className="text-xs text-gray-500">Performance analysis</div>
                    </div>
                  </div>
                  <div 
                    onClick={() => {
                      setSelectedTimeRange('30d');
                      handleGenerateReport('financial');
                    }}
                    className="flex items-center p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <BarChart3 className="h-5 w-5 text-purple-600 mr-3" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Monthly Report</div>
                      <div className="text-xs text-gray-500">Comprehensive overview</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ReportsPage;