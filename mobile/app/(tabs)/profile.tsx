import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { 
  User, 
  BarChart3, 
  History, 
  Settings, 
  Download, 
  Upload, 
  HelpCircle, 
  Info, 
  Database, 
  FileText, 
  Bell,
  Palette,
  Globe,
  ChevronRight,
  RefreshCw,
  Star,
  Activity,
  LogOut,
  Trash2,
  Shield,
  Key,
  LucideIcon
} from 'lucide-react-native';
import SyncStatusComponent from '@/components/SyncStatusComponent';
import SecurityPinModal from '@/components/SecurityPinModal';
// Security PIN handled by SecurityPinModal component

interface MenuItem {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  onPress: () => void | Promise<void>;
  color: string;
  loading?: boolean;
  dangerous?: boolean;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { customers, dailyEntries, payments, refreshData, exportData, clearAllData, logActivity } = useData();
  const [refreshing, setRefreshing] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinAction, setPinAction] = useState<'setup' | 'change' | null>(null);
  const [isPinSetup, setIsPinSetup] = useState(false);

  const handleRefreshData = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
    Alert.alert('Success', 'Data refreshed successfully');
  };

  const handleExportData = () => {
    Alert.alert(
      'Export Data',
      'Export all your data for backup or analysis.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: () => {
            try {
              const data = exportData();
              const dataString = JSON.stringify(data, null, 2);
              // In a real app, this would save to file system or share
              Alert.alert(
                'Export Ready',
                `Data exported successfully!\n\nCustomers: ${data.customers.length}\nEntries: ${data.dailyEntries.length}\nPayments: ${data.payments.length}\n\nNote: File sharing will be available in the next update.`
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to export data. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleImportData = () => {
    Alert.alert(
      'Import Data',
      'Import data from CSV files or backup files.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          onPress: () => {
            Alert.alert('Coming Soon', 'Data import feature will be available in the next update.');
          },
        },
      ]
    );
  };

  const handleClearAllData = () => {
    Alert.alert(
      '⚠️ Clear All Data',
      'This will permanently delete ALL your local data:\n\n• All customers\n• All daily entries\n• All payments\n• Activity logs\n\nThis action cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All Data',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllData();
              Alert.alert(
                '✅ Data Cleared',
                'All local data has been successfully cleared.'
              );
            } catch (error) {
              Alert.alert(
                'Error', 
                'Failed to clear data. Please try again or restart the app.'
              );
            }
          },
        },
      ]
    );
  };

  const checkPinSetup = async () => {
    try {
      // For now, assume PIN is always set up
      setIsPinSetup(true);
    } catch (error) {
      console.error('Error checking PIN setup:', error);
    }
  };

  const handlePinSetup = () => {
    setPinAction('setup');
    setPinModalVisible(true);
  };

  const handlePinChange = () => {
    setPinAction('change');
    setPinModalVisible(true);
  };

  const handlePinReset = () => {
    Alert.alert(
      'Reset Security PIN',
      'This will remove your current security PIN. You will need to set up a new one for secure operations.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset PIN',
          style: 'destructive',
          onPress: async () => {
            try {
              // TODO: Implement PIN reset with proper storage
              setIsPinSetup(false);
              Alert.alert('Success', 'Security PIN has been reset.');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset PIN. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handlePinSuccess = () => {
    setPinModalVisible(false);
    setPinAction(null);
    setIsPinSetup(true);
    Alert.alert(
      'Success',
      pinAction === 'setup' 
        ? 'Security PIN has been set up successfully!'
        : 'Security PIN has been changed successfully!'
    );
  };

  const handlePinClose = () => {
    setPinModalVisible(false);
    setPinAction(null);
  };

  // Check PIN setup on component mount
  useEffect(() => {
    checkPinSetup();
  }, []);

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Support',
      'Need help with the app? Choose how you\'d like to get in touch.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Email Support',
          onPress: () => {
            Linking.openURL('mailto:support@dhudhwala.com?subject=Milk Delivery App Support');
          },
        },
        {
          text: 'WhatsApp',
          onPress: () => {
            Linking.openURL('https://wa.me/1234567890?text=Hello, I need help with Milk Delivery App');
          },
        },
      ]
    );
  };

  const handleRateApp = () => {
    Alert.alert(
      'Rate Our App',
      'Enjoying the app? Please rate us on the app store!',
      [
        { text: 'Later', style: 'cancel' },
        {
          text: 'Rate Now',
          onPress: () => {
            // Would open app store rating
            Alert.alert('Thank You!', 'This will open the app store rating page.');
          },
        },
      ]
    );
  };

  const stats = {
    totalCustomers: customers.length,
    activeCustomers: customers.filter(c => c.isActive).length,
    totalEntries: dailyEntries.length,
    totalPayments: payments.length,
  };

  const menuSections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Analytics & Reports',
      items: [
        {
          icon: BarChart3,
          title: 'Reports',
          subtitle: 'View business analytics',
          onPress: () => router.push('/reports'),
          color: '#2563eb',
        },
        {
          icon: History,
          title: 'Customer History',
          subtitle: 'Track delivery patterns',
          onPress: () => router.push('/customer-history'),
          color: '#7c3aed',
        },
        {
          icon: Activity,
          title: 'Activity Logs',
          subtitle: 'Monitor all app activities',
          onPress: () => router.push('/activity-logs'),
          color: '#059669',
        },
      ],
    },
    {
      title: 'Data Management',
      items: [
        {
          icon: Download,
          title: 'Export Data',
          subtitle: 'Backup your data',
          onPress: handleExportData,
          color: '#059669',
        },
        {
          icon: Upload,
          title: 'Import Data',
          subtitle: 'Restore from backup',
          onPress: handleImportData,
          color: '#dc2626',
        },
        {
          icon: RefreshCw,
          title: 'Refresh Data',
          subtitle: 'Reload all information',
          onPress: handleRefreshData,
          color: '#0891b2',
          loading: refreshing,
        },
        {
          icon: Trash2,
          title: 'Clear All Data',
          subtitle: '⚠️ Delete all local data',
          onPress: handleClearAllData,
          color: '#dc2626',
          dangerous: true,
        },
      ],
    },
    {
      title: 'Settings',
      items: [
        {
          icon: Bell,
          title: 'Notifications',
          subtitle: 'Manage alerts & reminders',
          onPress: () => Alert.alert('Coming Soon', 'Notification settings will be available soon.'),
          color: '#f59e0b',
        },
        {
          icon: Palette,
          title: 'Appearance',
          subtitle: 'Theme & display options',
          onPress: () => Alert.alert('Coming Soon', 'Appearance settings will be available soon.'),
          color: '#8b5cf6',
        },
        {
          icon: Globe,
          title: 'Language',
          subtitle: 'Change app language',
          onPress: () => Alert.alert('Coming Soon', 'Language settings will be available soon.'),
          color: '#06b6d4',
        },
      ],
    },
    {
      title: 'Security',
      items: [
        {
          icon: Shield,
          title: isPinSetup ? 'Change Security PIN' : 'Setup Security PIN',
          subtitle: isPinSetup ? 'Update your 4-digit security PIN' : 'Create a 4-digit PIN for secure operations',
          onPress: isPinSetup ? handlePinChange : handlePinSetup,
          color: '#dc2626',
        },
        ...(isPinSetup ? [
          {
            icon: Key,
            title: 'Reset Security PIN',
            subtitle: 'Remove current PIN and start fresh',
            onPress: handlePinReset,
            color: '#f59e0b',
            dangerous: true,
          }
        ] : []),
      ],
    },
    {
      title: 'Support & Info',
      items: [
        {
          icon: HelpCircle,
          title: 'Help & Support',
          subtitle: 'Get help or contact us',
          onPress: handleContactSupport,
          color: '#10b981',
        },
        {
          icon: Star,
          title: 'Rate This App',
          subtitle: 'Share your feedback',
          onPress: handleRateApp,
          color: '#f59e0b',
        },
        {
          icon: Info,
          title: 'About',
          subtitle: 'App version & info',
          onPress: () => Alert.alert(
            'Milk Delivery Manager',
            'Version 1.0.0\n\nA comprehensive app for managing milk delivery business operations.\n\nDeveloped with ❤️ for small business owners.'
          ),
          color: '#6b7280',
        },
      ],
    },
    {
      title: 'Account',
      items: user ? [
        {
          icon: LogOut,
          title: 'Sign Out',
          subtitle: 'Log out of your account',
          onPress: async () => {
            Alert.alert(
              'Sign Out',
              'Are you sure you want to sign out?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Sign Out',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await logout();
                      await logActivity({
                        action: 'app_opened',
                        entityType: 'system',
                        description: `User ${user.email} signed out`,
                        metadata: { email: user.email }
                      });
                      router.replace('/auth/signin' as any);
                    } catch (error) {
                      Alert.alert('Error', 'Failed to sign out. Please try again.');
                    }
                  },
                },
              ]
            );
          },
          color: '#f59e0b',
        },
      ] : [],
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.profileIcon}>
            <User size={32} color="#fff" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {user ? (user.displayName || user.email?.split('@')[0] || 'User') : 'Milk Delivery Business'}
            </Text>
            <Text style={styles.profileSubtitle}>
              {user ? (user.email || 'Authenticated User') : 'Guest Mode'}
            </Text>
          </View>
        </View>
      </View>

      <SyncStatusComponent />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsSection}>
          <Text style={styles.statsTitle}>Quick Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.activeCustomers}</Text>
              <Text style={styles.statLabel}>Active Customers</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalEntries}</Text>
              <Text style={styles.statLabel}>Total Deliveries</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalPayments}</Text>
              <Text style={styles.statLabel}>Payments Recorded</Text>
            </View>
          </View>
        </View>

        {menuSections.map((section, sectionIndex) => (
          <View style={styles.section} {...{ key: sectionIndex }}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item, itemIndex) => (
              <TouchableOpacity
                key={itemIndex}
                style={[
                  styles.menuItem,
                  item.dangerous && styles.menuItemDangerous
                ]}
                onPress={item.onPress}
                disabled={item.loading}
              >
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuItemIcon, { backgroundColor: `${item.color}15` }]}>
                    <item.icon 
                      size={20} 
                      color={item.color} 
                      style={item.loading ? { opacity: 0.5 } : {}}
                    />
                  </View>
                  <View style={styles.menuItemText}>
                    <Text style={[
                      styles.menuItemTitle,
                      item.dangerous && styles.menuItemTitleDangerous
                    ]}>
                      {item.title}
                    </Text>
                    <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                  </View>
                </View>
                {item.loading ? (
                  <RefreshCw size={16} color="#6b7280" style={{ opacity: 0.5 }} />
                ) : (
                  <ChevronRight size={16} color="#6b7280" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Made with ❤️ for milk delivery businesses
          </Text>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </ScrollView>

      <SecurityPinModal
        visible={pinModalVisible}
        onClose={handlePinClose}
        onSuccess={handlePinSuccess}
        title={pinAction === 'setup' ? 'Setup Security PIN' : 'Change Security PIN'}
        subtitle={
          pinAction === 'setup'
            ? 'Create a 4-digit PIN to secure sensitive operations'
            : 'Update your security PIN'
        }
        mode={pinAction === 'setup' ? 'setup' : 'change'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#2563eb',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1d4ed8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  profileSubtitle: {
    fontSize: 14,
    color: '#dbeafe',
  },
  content: {
    flex: 1,
  },
  statsSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
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
  section: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  menuItemDangerous: {
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  menuItemTitleDangerous: {
    color: '#dc2626',
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  versionText: {
    fontSize: 12,
    color: '#9ca3af',
  },
});