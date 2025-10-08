import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useData } from '@/context/DataContext';
import { getTodayString } from '@/utils/date';
import { Users, Calendar, Wallet, CircleAlert as AlertCircle, TrendingUp, Wifi, WifiOff } from 'lucide-react-native';
import { useUserSocket, useRealtimeStats, useRealtimeActivity, useRealtimeNotifications } from '@/hooks/useSocket';

export default function HomeScreen() {
  console.log('🏠 HomeScreen rendering...');
  const router = useRouter();
  const { customers, dailyEntries, payments, loading, getCustomerBalance } = useData();

  // Socket.IO hooks for real-time data
  const { isConnected, reconnect } = useUserSocket();
  const { stats: realtimeStats, lastUpdate, requestUpdate } = useRealtimeStats();
  const { activities } = useRealtimeActivity();
  const { notifications, unreadCount } = useRealtimeNotifications();

  const todayString = getTodayString();

  console.log('📊 HomeScreen data state:', { 
    customers: customers.length, 
    dailyEntries: dailyEntries.length, 
    payments: payments.length, 
    loading,
    socketConnected: isConnected,
    realtimeStats: !!realtimeStats,
    todayString,
    todayEntries: dailyEntries.filter((e) => e.entryDate === todayString).length,
    todayPayments: payments.filter((p) => p.paymentDate === todayString).length
  });

  // Debug: Log first few entries to check date format
  if (dailyEntries.length > 0) {
    console.log('📅 Sample dailyEntries dates:', dailyEntries.slice(0, 3).map(e => ({
      id: e.id,
      entryDate: e.entryDate,
      todayString,
      matches: e.entryDate === todayString
    })));
  }

  if (payments.length > 0) {
    console.log('💰 Sample payments dates:', payments.slice(0, 3).map(p => ({
      id: p.id,
      paymentDate: p.paymentDate,
      todayString,
      matches: p.paymentDate === todayString
    })));
  }

  console.log('🔄 Real-time stats:', realtimeStats);

  // Request real-time stats on mount
  useEffect(() => {
    if (isConnected) {
      requestUpdate();
    }
  }, [isConnected, requestUpdate]);

  const stats = useMemo(() => {
    const activeCustomers = customers.filter((c) => c.isActive).length;
    const todayEntries = dailyEntries.filter((e) => e.entryDate === todayString);
    const todayLiters = todayEntries.reduce((sum, e) => sum + e.quantity, 0);
    const todayAmount = todayEntries.reduce((sum, e) => sum + e.amount, 0);

    const todayPayments = payments.filter((p) => p.paymentDate === todayString);
    const todayCollection = todayPayments.reduce((sum, p) => sum + p.amount, 0);

    let totalOutstanding = 0;
    let customersWithDues = 0;

    customers.forEach((customer) => {
      const balance = getCustomerBalance(customer.id);
      if (balance.balance > 0) {
        totalOutstanding += balance.balance;
        customersWithDues++;
      }
    });

    return {
      activeCustomers,
      todayLiters: todayLiters.toFixed(1),
      todayAmount: todayAmount.toFixed(2),
      todayCollection: todayCollection.toFixed(2),
      totalOutstanding: totalOutstanding.toFixed(2),
      customersWithDues,
    };
  }, [customers, dailyEntries, payments, todayString, getCustomerBalance]);

  // Use real-time stats when available, fallback to calculated stats
  const displayStats = useMemo(() => {
    if (realtimeStats && isConnected) {
      console.log('🔄 Using Socket.IO real-time stats:', realtimeStats);
      return {
        activeCustomers: realtimeStats.activeCustomers || 0,
        todayLiters: (realtimeStats.todayDeliveries || 0).toFixed(1), // ✅ Fixed: now matches API
        todayAmount: (realtimeStats.todayRevenue || 0).toFixed(2), // ✅ Fixed: now matches API
        todayCollection: (realtimeStats.todayCollection || 0).toFixed(2), // ✅ Fixed: use todayCollection
        totalOutstanding: (realtimeStats.totalBalance || 0).toFixed(2),
        customersWithDues: realtimeStats.pendingPayments || 0,
      };
    }
    console.log('📊 Using local calculated stats:', stats);
    return stats || {
      activeCustomers: 0,
      todayLiters: '0.0',
      todayAmount: '0.00',
      todayCollection: '0.00',
      totalOutstanding: '0.00',
      customersWithDues: 0,
    };
  }, [realtimeStats, stats, isConnected]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" backgroundColor="#2563eb" />
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Milk Delivery Manager</Text>
          <Text style={styles.headerSubtitle}>Dashboard</Text>
        </View>
        <View style={styles.headerRight}>
          {/* Connection Status Indicator */}
          <TouchableOpacity onPress={reconnect} style={styles.connectionIndicator}>
            {isConnected ? (
              <Wifi size={20} color="#22c55e" />
            ) : (
              <WifiOff size={20} color="#ef4444" />
            )}
          </TouchableOpacity>
          {/* Notifications Badge */}
          {unreadCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationCount}>{unreadCount}</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Summary</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <TrendingUp size={24} color="#2563eb" />
              </View>
              <Text style={styles.statValue}>{displayStats.todayLiters} L</Text>
              <Text style={styles.statLabel}>Milk Delivered</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Wallet size={24} color="#16a34a" />
              </View>
              <Text style={styles.statValue}>₹{displayStats.todayAmount}</Text>
              <Text style={styles.statLabel}>Today's Sales</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Wallet size={24} color="#059669" />
              </View>
              <Text style={styles.statValue}>₹{displayStats.todayCollection}</Text>
              <Text style={styles.statLabel}>Collected</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Users size={24} color="#7c3aed" />
              </View>
              <Text style={styles.statValue}>{displayStats.activeCustomers}</Text>
              <Text style={styles.statLabel}>Active Customers</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Outstanding</Text>
          <View style={[styles.statCard, styles.outstandingCard]}>
            <View style={styles.statIconContainer}>
              <AlertCircle size={24} color="#dc2626" />
            </View>
            <Text style={[styles.statValue, styles.outstandingValue]}>₹{displayStats.totalOutstanding}</Text>
            <Text style={styles.statLabel}>{displayStats.customersWithDues} customers have pending dues</Text>
          </View>
        </View>

        {/* Real-time Activity Feed */}
        {activities.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <View style={styles.realtimeBadge}>
                <Text style={styles.realtimeBadgeText}>Live</Text>
              </View>
            </View>
            
            <View style={styles.activityList}>
              {activities.slice(0, 3).map((activity, index) => (
                <View key={activity.id || index} style={styles.activityItem}>
                  <View style={styles.activityIcon}>
                    {activity.type === 'payment' && <Wallet size={16} color="#22c55e" />}
                    {activity.type === 'delivery' && <TrendingUp size={16} color="#3b82f6" />}
                    {activity.type === 'customer' && <Users size={16} color="#8b5cf6" />}
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityText}>{activity.description}</Text>
                    <Text style={styles.activityTime}>
                      {lastUpdate ? `${Math.floor((new Date().getTime() - lastUpdate.getTime()) / 60000)}m ago` : 'Just now'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/customers')}
          >
            <Users size={20} color="#2563eb" />
            <Text style={styles.actionButtonText}>Manage Customers</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/daily')}
          >
            <Calendar size={20} color="#2563eb" />
            <Text style={styles.actionButtonText}>Today's Entries</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/payments')}
          >
            <Wallet size={20} color="#2563eb" />
            <Text style={styles.actionButtonText}>Record Payment</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    paddingBottom: 75, // Account for tab bar height
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#2563eb',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#dbeafe',
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  outstandingCard: {
    width: '100%',
  },
  outstandingValue: {
    color: '#dc2626',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  connectionIndicator: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  notificationBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  notificationCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  realtimeBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  realtimeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  activityList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#6b7280',
  },
});
