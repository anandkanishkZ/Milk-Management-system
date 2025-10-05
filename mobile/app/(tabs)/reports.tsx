import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { getTodayString, formatDisplayDate } from '@/utils/date';
import { ChartBar as BarChart3, TrendingUp, Users, Wallet, Calendar } from 'lucide-react-native';

export default function ReportsScreen() {
  const { customers, dailyEntries, payments, getCustomerBalance } = useData();
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');

  const getDateRange = () => {
    const today = new Date();
    const todayStr = getTodayString();

    switch (period) {
      case 'today':
        return { from: todayStr, to: todayStr };
      case 'week': {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return {
          from: weekAgo.toISOString().split('T')[0],
          to: todayStr,
        };
      }
      case 'month': {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return {
          from: monthAgo.toISOString().split('T')[0],
          to: todayStr,
        };
      }
    }
  };

  const stats = useMemo(() => {
    const { from, to } = getDateRange();

    const periodEntries = dailyEntries.filter(
      (e) => e.entryDate >= from && e.entryDate <= to
    );

    const periodPayments = payments.filter(
      (p) => p.paymentDate >= from && p.paymentDate <= to
    );

    const totalLiters = periodEntries.reduce((sum, e) => sum + e.quantity, 0);
    const totalSales = periodEntries.reduce((sum, e) => sum + e.amount, 0);
    const totalCollection = periodPayments.reduce((sum, p) => sum + p.amount, 0);

    const activeCustomers = customers.filter((c) => c.isActive).length;

    let totalOutstanding = 0;
    let customersWithDues = 0;

    customers.forEach((customer) => {
      const balance = getCustomerBalance(customer.id);
      if (balance.balance > 0) {
        totalOutstanding += balance.balance;
        customersWithDues++;
      }
    });

    const customerStats = customers
      .filter((c) => c.isActive)
      .map((customer) => {
        const entries = periodEntries.filter((e) => e.customerId === customer.id);
        const liters = entries.reduce((sum, e) => sum + e.quantity, 0);
        const sales = entries.reduce((sum, e) => sum + e.amount, 0);
        const balance = getCustomerBalance(customer.id);

        return {
          customer,
          liters,
          sales,
          balance: balance.balance,
        };
      })
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10);

    const cashPayments = periodPayments
      .filter((p) => p.method === 'cash')
      .reduce((sum, p) => sum + p.amount, 0);

    const mobilePayments = periodPayments
      .filter((p) => p.method === 'mobile')
      .reduce((sum, p) => sum + p.amount, 0);

    const bankPayments = periodPayments
      .filter((p) => p.method === 'bank')
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      totalLiters,
      totalSales,
      totalCollection,
      activeCustomers,
      totalOutstanding,
      customersWithDues,
      customerStats,
      paymentMethods: {
        cash: cashPayments,
        mobile: mobilePayments,
        bank: bankPayments,
      },
    };
  }, [customers, dailyEntries, payments, period, getCustomerBalance]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reports</Text>
      </View>

      <View style={styles.periodSelector}>
        <TouchableOpacity
          style={[styles.periodButton, period === 'today' && styles.periodButtonActive]}
          onPress={() => setPeriod('today')}
        >
          <Text
            style={[styles.periodButtonText, period === 'today' && styles.periodButtonTextActive]}
          >
            Today
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodButton, period === 'week' && styles.periodButtonActive]}
          onPress={() => setPeriod('week')}
        >
          <Text
            style={[styles.periodButtonText, period === 'week' && styles.periodButtonTextActive]}
          >
            Week
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodButton, period === 'month' && styles.periodButtonActive]}
          onPress={() => setPeriod('month')}
        >
          <Text
            style={[styles.periodButtonText, period === 'month' && styles.periodButtonTextActive]}
          >
            Month
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <TrendingUp size={24} color="#2563eb" />
              </View>
              <Text style={styles.statValue}>{stats.totalLiters.toFixed(1)}L</Text>
              <Text style={styles.statLabel}>Milk Delivered</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <BarChart3 size={24} color="#16a34a" />
              </View>
              <Text style={styles.statValue}>₹{stats.totalSales.toFixed(0)}</Text>
              <Text style={styles.statLabel}>Total Sales</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Wallet size={24} color="#059669" />
              </View>
              <Text style={styles.statValue}>₹{stats.totalCollection.toFixed(0)}</Text>
              <Text style={styles.statLabel}>Collected</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Users size={24} color="#7c3aed" />
              </View>
              <Text style={styles.statValue}>{stats.activeCustomers}</Text>
              <Text style={styles.statLabel}>Active Customers</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Outstanding</Text>
          <View style={styles.outstandingCard}>
            <View style={styles.outstandingHeader}>
              <Text style={styles.outstandingAmount}>₹{stats.totalOutstanding.toFixed(2)}</Text>
              <Text style={styles.outstandingLabel}>Total Pending</Text>
            </View>
            <Text style={styles.outstandingSubtext}>
              {stats.customersWithDues} customers have pending dues
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Methods</Text>
          <View style={styles.paymentMethodsCard}>
            <View style={styles.paymentMethod}>
              <Text style={styles.paymentMethodLabel}>Cash</Text>
              <Text style={styles.paymentMethodValue}>₹{stats.paymentMethods.cash.toFixed(2)}</Text>
            </View>
            <View style={styles.paymentMethodDivider} />
            <View style={styles.paymentMethod}>
              <Text style={styles.paymentMethodLabel}>Mobile</Text>
              <Text style={styles.paymentMethodValue}>₹{stats.paymentMethods.mobile.toFixed(2)}</Text>
            </View>
            <View style={styles.paymentMethodDivider} />
            <View style={styles.paymentMethod}>
              <Text style={styles.paymentMethodLabel}>Bank</Text>
              <Text style={styles.paymentMethodValue}>₹{stats.paymentMethods.bank.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Customers</Text>
          {stats.customerStats.map(({ customer, liters, sales, balance }, index) => (
            <View key={customer.id} style={styles.customerStatCard}>
              <View style={styles.customerStatRank}>
                <Text style={styles.customerStatRankText}>{index + 1}</Text>
              </View>
              <View style={styles.customerStatInfo}>
                <Text style={styles.customerStatName}>{customer.name}</Text>
                <View style={styles.customerStatDetails}>
                  <Text style={styles.customerStatDetail}>{liters.toFixed(1)}L</Text>
                  <Text style={styles.customerStatDetailSeparator}>•</Text>
                  <Text style={styles.customerStatDetail}>₹{sales.toFixed(2)}</Text>
                  {balance > 0 && (
                    <>
                      <Text style={styles.customerStatDetailSeparator}>•</Text>
                      <Text style={styles.customerStatDue}>Due: ₹{balance.toFixed(2)}</Text>
                    </>
                  )}
                </View>
              </View>
            </View>
          ))}

          {stats.customerStats.length === 0 && (
            <Text style={styles.noData}>No customer data for this period</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#2563eb',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  periodButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  outstandingHeader: {
    marginBottom: 8,
  },
  outstandingAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#dc2626',
    marginBottom: 4,
  },
  outstandingLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  outstandingSubtext: {
    fontSize: 12,
    color: '#6b7280',
  },
  paymentMethodsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  paymentMethod: {
    flex: 1,
    alignItems: 'center',
  },
  paymentMethodLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  paymentMethodValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  paymentMethodDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 8,
  },
  customerStatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  customerStatRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerStatRankText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb',
  },
  customerStatInfo: {
    flex: 1,
  },
  customerStatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  customerStatDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customerStatDetail: {
    fontSize: 12,
    color: '#6b7280',
  },
  customerStatDetailSeparator: {
    fontSize: 12,
    color: '#d1d5db',
  },
  customerStatDue: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
  },
  noData: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 40,
  },
});
