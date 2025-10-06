import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useData } from '@/context/DataContext';
import { getTodayString } from '@/utils/date';
import { Users, Calendar, Wallet, CircleAlert as AlertCircle, TrendingUp } from 'lucide-react-native';

export default function HomeScreen() {
  console.log('🏠 HomeScreen rendering...');
  const router = useRouter();
  const { customers, dailyEntries, payments, loading, getCustomerBalance } = useData();

  console.log('📊 HomeScreen data state:', { 
    customers: customers.length, 
    dailyEntries: dailyEntries.length, 
    payments: payments.length, 
    loading 
  });

  const todayString = getTodayString();

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
        <Text style={styles.headerTitle}>Milk Delivery Manager</Text>
        <Text style={styles.headerSubtitle}>Dashboard</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Summary</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <TrendingUp size={24} color="#2563eb" />
              </View>
              <Text style={styles.statValue}>{stats.todayLiters} L</Text>
              <Text style={styles.statLabel}>Milk Delivered</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Wallet size={24} color="#16a34a" />
              </View>
              <Text style={styles.statValue}>₹{stats.todayAmount}</Text>
              <Text style={styles.statLabel}>Today's Sales</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Wallet size={24} color="#059669" />
              </View>
              <Text style={styles.statValue}>₹{stats.todayCollection}</Text>
              <Text style={styles.statLabel}>Collected</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Users size={24} color="#7c3aed" />
              </View>
              <Text style={styles.statValue}>{stats.activeCustomers}</Text>
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
            <Text style={[styles.statValue, styles.outstandingValue]}>₹{stats.totalOutstanding}</Text>
            <Text style={styles.statLabel}>{stats.customersWithDues} customers have pending dues</Text>
          </View>
        </View>

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
});
