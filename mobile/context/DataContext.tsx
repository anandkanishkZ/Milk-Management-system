import React, { createContext, useContext, useState, useEffect } from 'react';
import { Customer, DailyEntry, Payment, CustomerBalance, ActivityLog } from '@/types';
import { apiService } from '@/services/api';
import { useAuth } from './AuthContext';
import { log, logError } from '@/config/environment';

interface DataContextType {
  customers: Customer[];
  dailyEntries: DailyEntry[];
  payments: Payment[];
  activityLogs: ActivityLog[];
  loading: boolean;
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => Promise<void>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  addDailyEntry: (entry: Omit<DailyEntry, 'id' | 'createdAt'>) => Promise<void>;
  updateDailyEntry: (id: string, updates: Partial<DailyEntry>) => Promise<void>;
  deleteDailyEntry: (id: string) => Promise<void>;
  addPayment: (payment: Omit<Payment, 'id' | 'createdAt'>) => Promise<void>;
  deletePayment: (paymentId: string) => Promise<void>;
  getCustomerBalance: (customerId: string) => CustomerBalance;
  getCustomerPayments: (customerId: string) => Payment[];
  getCustomerHistory: (customerId: string, from?: string, to?: string) => any[];
  getCustomerHistoryStats: (customerId: string, from?: string, to?: string) => any;
  getActivityLogs: (limit?: number, filter?: string) => ActivityLog[];
  getActivityStats: () => any;
  logActivity: (activity: Omit<ActivityLog, 'id' | 'timestamp'>) => Promise<void>;
  exportData: () => any;
  refreshData: () => Promise<void>;
  clearAllData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, logout } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [dailyEntries, setDailyEntries] = useState<DailyEntry[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);

  // Handle session expiry errors
  const handleAuthError = async (error: any) => {
    if (error.message && error.message.includes('Session expired')) {
      console.log('Session expired, logging out user...');
      await logout();
      return true; // Indicate that this was a session expiry error
    }
    return false; // Not a session expiry error
  };

  // Load data when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    } else {
      // Clear data when user logs out
      setCustomers([]);
      setDailyEntries([]);
      setPayments([]);
      setActivityLogs([]);
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    try {
      setLoading(true);
      log('🔄 Loading data from API...');

      // Load data sequentially to avoid overwhelming the API
      try {
        const customersResponse = await apiService.getCustomers({ page: 1, limit: 1000 });
        if (customersResponse.customers) {
          setCustomers(customersResponse.customers);
        }
      } catch (error) {
        const isSessionExpired = await handleAuthError(error);
        if (!isSessionExpired) {
          logError('Failed to load customers:', error);
        }
      }

      try {
        const entriesResponse = await apiService.getDailyEntries({ page: 1, limit: 1000 });
        if (entriesResponse.entries) {
          setDailyEntries(entriesResponse.entries);
        }
      } catch (error) {
        const isSessionExpired = await handleAuthError(error);
        if (!isSessionExpired) {
          logError('Failed to load daily entries:', error);
        }
      }

      try {
        const paymentsResponse = await apiService.getPayments({ page: 1, limit: 1000 });
        if (paymentsResponse.payments) {
          setPayments(paymentsResponse.payments);
        }
      } catch (error) {
        const isSessionExpired = await handleAuthError(error);
        if (!isSessionExpired) {
          logError('Failed to load payments:', error);
        }
      }

      log('✅ Data loaded successfully');
    } catch (error) {
      logError('❌ Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Customer operations
  const addCustomer = async (customerData: Omit<Customer, 'id' | 'createdAt'>) => {
    try {
      const newCustomer = await apiService.createCustomer(customerData);
      setCustomers(prev => [...prev, newCustomer]);
    } catch (error) {
      const isSessionExpired = await handleAuthError(error);
      if (!isSessionExpired) {
        logError('Failed to add customer:', error);
        throw error;
      }
    }
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    try {
      const updatedCustomer = await apiService.updateCustomer(id, updates);
      setCustomers(prev => prev.map(c => c.id === id ? updatedCustomer : c));
    } catch (error) {
      const isSessionExpired = await handleAuthError(error);
      if (!isSessionExpired) {
        logError('Failed to update customer:', error);
        throw error;
      }
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      await apiService.deleteCustomer(id);
      setCustomers(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      const isSessionExpired = await handleAuthError(error);
      if (!isSessionExpired) {
        logError('Failed to delete customer:', error);
        throw error;
      }
    }
  };

  // Daily entry operations
  const addDailyEntry = async (entryData: Omit<DailyEntry, 'id' | 'createdAt'>) => {
    try {
      const newEntry = await apiService.createDailyEntry(entryData);
      setDailyEntries(prev => [...prev, newEntry]);
    } catch (error) {
      const isSessionExpired = await handleAuthError(error);
      if (!isSessionExpired) {
        logError('Failed to add daily entry:', error);
        throw error;
      }
    }
  };

  const updateDailyEntry = async (id: string, updates: Partial<DailyEntry>) => {
    try {
      const updatedEntry = await apiService.updateDailyEntry(id, updates);
      setDailyEntries(prev => prev.map(e => e.id === id ? updatedEntry : e));
    } catch (error) {
      const isSessionExpired = await handleAuthError(error);
      if (!isSessionExpired) {
        logError('Failed to update daily entry:', error);
        throw error;
      }
    }
  };

  const deleteDailyEntry = async (id: string) => {
    try {
      await apiService.deleteDailyEntry(id);
      setDailyEntries(prev => prev.filter(entry => entry.id !== id));
    } catch (error) {
      const isSessionExpired = await handleAuthError(error);
      if (!isSessionExpired) {
        logError('Failed to delete daily entry:', error);
        throw error;
      }
    }
  };

  // Payment operations
  const addPayment = async (paymentData: Omit<Payment, 'id' | 'createdAt'>) => {
    try {
      // Convert lowercase payment method to uppercase for API
      const apiPaymentData = {
        customerId: paymentData.customerId,
        amount: paymentData.amount,
        method: paymentData.method.toUpperCase() as 'CASH' | 'MOBILE' | 'BANK',
        reference: paymentData.reference,
        paymentDate: paymentData.paymentDate,
        notes: paymentData.notes
      };
      
      const newPayment = await apiService.createPayment(apiPaymentData);
      setPayments(prev => [...prev, newPayment]);
    } catch (error) {
      const isSessionExpired = await handleAuthError(error);
      if (!isSessionExpired) {
        logError('Failed to add payment:', error);
        throw error;
      }
    }
  };

  const deletePayment = async (paymentId: string) => {
    try {
      await apiService.deletePayment(paymentId);
      setPayments(prev => prev.filter(p => p.id !== paymentId));
    } catch (error) {
      const isSessionExpired = await handleAuthError(error);
      if (!isSessionExpired) {
        logError('Failed to delete payment:', error);
        throw error;
      }
    }
  };

  // Helper functions
  const getCustomerBalance = (customerId: string): CustomerBalance => {
    const customerEntries = dailyEntries.filter(e => e.customerId === customerId);
    const customerPayments = payments.filter(p => p.customerId === customerId);
    
    const totalBilled = customerEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const totalPaid = customerPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const balance = totalBilled - totalPaid;
    
    return { customerId, totalBilled, totalPaid, balance };
  };

  const refreshData = async () => {
    await loadData();
  };

  const clearAllData = async () => {
    try {
      setLoading(true);
      // Clear local state - backend would need an endpoint to clear all user data
      setCustomers([]);
      setDailyEntries([]);
      setPayments([]);
      setActivityLogs([]);
    } catch (error) {
      logError('Failed to clear data:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const getCustomerPayments = (customerId: string): Payment[] => {
    return payments.filter(p => p.customerId === customerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const getCustomerHistory = (customerId: string, from?: string, to?: string) => {
    const entries = dailyEntries.filter(entry => {
      if (entry.customerId !== customerId) return false;
      if (from && entry.entryDate < from) return false;
      if (to && entry.entryDate > to) return false;
      return true;
    }).sort((a, b) => b.entryDate.localeCompare(a.entryDate));

    return entries.map(entry => ({
      date: entry.entryDate,
      entry,
      wasScheduled: true,
      dayName: new Date(entry.entryDate).toLocaleDateString('en-US', { weekday: 'long' }),
      status: 'delivered' as const
    }));
  };

  const getCustomerHistoryStats = (customerId: string, from?: string, to?: string) => {
    const entries = dailyEntries.filter(entry => {
      if (entry.customerId !== customerId) return false;
      if (from && entry.entryDate < from) return false;
      if (to && entry.entryDate > to) return false;
      return true;
    });

    const totalDays = entries.length;
    const totalLiters = entries.reduce((sum, entry) => sum + entry.quantity, 0);
    const totalAmount = entries.reduce((sum, entry) => sum + entry.amount, 0);

    return {
      totalDays,
      deliveredDays: totalDays,
      skippedDays: 0,
      deliveryRate: totalDays > 0 ? 100 : 0,
      totalLiters,
      totalAmount,
      averageQuantity: totalDays > 0 ? totalLiters / totalDays : 0
    };
  };

  const getActivityLogs = (limit?: number, filter?: string): ActivityLog[] => {
    let filtered = activityLogs;
    
    if (filter) {
      filtered = activityLogs.filter(log => 
        log.action.includes(filter) || 
        log.description.toLowerCase().includes(filter.toLowerCase())
      );
    }
    
    return limit ? filtered.slice(0, limit) : filtered;
  };

  const getActivityStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);
    const weekStart = thisWeek.toISOString().split('T')[0];
    
    const todayLogs = activityLogs.filter(log => log.timestamp.startsWith(today));
    const weekLogs = activityLogs.filter(log => log.timestamp >= weekStart);
    
    return {
      totalActivities: activityLogs.length,
      todayActivities: todayLogs.length,
      weekActivities: weekLogs.length,
      monthActivities: activityLogs.length, // Simplified
      mostActiveDay: today,
      activityByType: {},
      recentActivities: activityLogs.slice(0, 10)
    };
  };

  const logActivity = async (activity: Omit<ActivityLog, 'id' | 'timestamp'>) => {
    try {
      // For now, just add to local state - backend endpoint can be added later
      const newLog: ActivityLog = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        ...activity
      };
      
      setActivityLogs(prev => [newLog, ...prev].slice(0, 1000));
    } catch (error) {
      logError('Failed to log activity:', error);
    }
  };

  const exportData = () => {
    return {
      customers,
      dailyEntries,
      payments,
      activityLogs
    };
  };

  const value = {
    customers,
    dailyEntries,
    payments,
    activityLogs,
    loading,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addDailyEntry,
    updateDailyEntry,
    deleteDailyEntry,
    addPayment,
    deletePayment,
    getCustomerBalance,
    getCustomerPayments,
    getCustomerHistory,
    getCustomerHistoryStats,
    getActivityLogs,
    getActivityStats,
    logActivity,
    exportData,
    refreshData,
    clearAllData,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}