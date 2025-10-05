import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { useState, useMemo, useRef } from 'react';
import { useData } from '@/context/DataContext';
import { Customer, CustomerHistoryDay } from '@/types';
import { 
  History, 
  Users, 
  Calendar, 
  TrendingUp, 
  BarChart3, 
  CheckCircle, 
  XCircle, 
  Minus,
  ChevronLeft,
  ChevronRight,
  Filter,
  CalendarDays,
  Clock,
  X
} from 'lucide-react-native';
import { formatDisplayDate, getTodayString, formatDate } from '@/utils/date';

const { width } = Dimensions.get('window');

type DateRangePreset = 'today' | 'week' | 'month' | '3months' | '6months' | 'year' | 'custom';

interface CustomDateRange {
  from: string;
  to: string;
}

export default function CustomerHistoryScreen() {
  const { customers, getCustomerHistory, getCustomerHistoryStats } = useData();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [dateRange, setDateRange] = useState<DateRangePreset>('month');
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<CustomDateRange>({ from: '', to: '' });
  const [selectingFromDate, setSelectingFromDate] = useState(true);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const activeCustomers = customers.filter(c => c.isActive);

  const getDateRangeValues = () => {
    const today = new Date();
    const todayStr = getTodayString();
    
    if (dateRange === 'custom') {
      return customDateRange;
    }
    
    switch (dateRange) {
      case 'today':
        return { from: todayStr, to: todayStr };
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return { from: formatDate(weekAgo), to: todayStr };
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return { from: formatDate(monthAgo), to: todayStr };
      case '3months':
        const threeMonthsAgo = new Date(today);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        return { from: formatDate(threeMonthsAgo), to: todayStr };
      case '6months':
        const sixMonthsAgo = new Date(today);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        return { from: formatDate(sixMonthsAgo), to: todayStr };
      case 'year':
        const yearAgo = new Date(today);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        return { from: formatDate(yearAgo), to: todayStr };
      default:
        const defaultMonthAgo = new Date(today);
        defaultMonthAgo.setMonth(defaultMonthAgo.getMonth() - 1);
        return { from: formatDate(defaultMonthAgo), to: todayStr };
    }
  };

  const customerHistoryData = useMemo(() => {
    if (!selectedCustomer) return [];
    const { from, to } = getDateRangeValues();
    return getCustomerHistory(selectedCustomer.id, from, to);
  }, [selectedCustomer, dateRange, getCustomerHistory]);

  const historyStats = useMemo(() => {
    if (!selectedCustomer) return null;
    const { from, to } = getDateRangeValues();
    return getCustomerHistoryStats(selectedCustomer.id, from, to);
  }, [selectedCustomer, dateRange, getCustomerHistoryStats]);

  const openHistoryModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setModalVisible(true);
  };

  const openDatePicker = () => {
    setDatePickerVisible(true);
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeDatePicker = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setDatePickerVisible(false);
    });
  };

  const selectPresetRange = (preset: DateRangePreset) => {
    setDateRange(preset);
    if (preset !== 'custom') {
      closeDatePicker();
    }
  };

  const generateDateOptions = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 0; i < 90; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push(formatDate(date));
    }
    
    return dates;
  };

  const selectCustomDate = (dateStr: string) => {
    if (selectingFromDate) {
      setCustomDateRange({ ...customDateRange, from: dateStr });
      setSelectingFromDate(false);
    } else {
      const fromDate = new Date(customDateRange.from);
      const toDate = new Date(dateStr);
      
      if (toDate >= fromDate) {
        setCustomDateRange({ ...customDateRange, to: dateStr });
        setDateRange('custom');
        closeDatePicker();
        setSelectingFromDate(true);
      } else {
        Alert.alert('Invalid Range', 'End date must be after start date');
      }
    }
  };

  const getDateRangeLabel = () => {
    switch (dateRange) {
      case 'today': return 'Today';
      case 'week': return 'Last 7 Days';
      case 'month': return 'Last Month';
      case '3months': return 'Last 3 Months';
      case '6months': return 'Last 6 Months';
      case 'year': return 'Last Year';
      case 'custom': {
        const { from, to } = customDateRange;
        return from && to ? `${formatDisplayDate(from)} - ${formatDisplayDate(to)}` : 'Custom Range';
      }
      default: return 'Last Month';
    }
  };

  const getStatusColor = (status: CustomerHistoryDay['status']) => {
    switch (status) {
      case 'delivered': return '#16a34a';
      case 'skipped': return '#dc2626';
      case 'not-scheduled': return '#6b7280';
    }
  };

  const getStatusIcon = (status: CustomerHistoryDay['status']) => {
    switch (status) {
      case 'delivered': return <CheckCircle size={16} color="#16a34a" />;
      case 'skipped': return <XCircle size={16} color="#dc2626" />;
      case 'not-scheduled': return <Minus size={16} color="#6b7280" />;
    }
  };

  const renderHistoryItem = ({ item }: { item: CustomerHistoryDay }) => (
    <View style={styles.historyItem}>
      <View style={styles.historyDate}>
        <Text style={styles.dayName}>{item.dayName}</Text>
        <Text style={styles.dateText}>{formatDisplayDate(item.date)}</Text>
      </View>
      
      <View style={styles.historyStatus}>
        {getStatusIcon(item.status)}
        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
          {item.status === 'delivered' ? 'Delivered' : 
           item.status === 'skipped' ? 'Skipped' : 'Not Scheduled'}
        </Text>
      </View>

      {item.entry && (
        <View style={styles.historyDetails}>
          <Text style={styles.quantityText}>{item.entry.quantity}L</Text>
          <Text style={styles.amountText}>₹{item.entry.amount.toFixed(2)}</Text>
        </View>
      )}
    </View>
  );

  const renderCustomerCard = (customer: Customer) => {
    const { from, to } = getDateRangeValues();
    const stats = getCustomerHistoryStats(customer.id, from, to);
    
    return (
      <TouchableOpacity
        key={customer.id}
        style={styles.customerCard}
        onPress={() => openHistoryModal(customer)}
      >
        <View style={styles.customerHeader}>
          <Text style={styles.customerName}>{customer.name}</Text>
          <Text style={styles.deliveryRate}>
            {stats.deliveryRate.toFixed(1)}% delivery rate
          </Text>
        </View>
        
        <View style={styles.customerStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.deliveredDays}</Text>
            <Text style={styles.statLabel}>Delivered</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.skippedDays}</Text>
            <Text style={styles.statLabel}>Skipped</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalLiters.toFixed(1)}L</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <History size={24} color="#2563eb" />
        <Text style={styles.headerTitle}>Customer History</Text>
      </View>

      <View style={styles.dateRangeContainer}>
        <TouchableOpacity style={styles.dateRangeSelector} onPress={openDatePicker}>
          <View style={styles.dateRangeSelectorContent}>
            <CalendarDays size={20} color="#2563eb" />
            <View style={styles.dateRangeInfo}>
              <Text style={styles.dateRangeLabel}>Date Range</Text>
              <Text style={styles.dateRangeValue}>{getDateRangeLabel()}</Text>
            </View>
            <ChevronRight size={20} color="#6b7280" />
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeCustomers.map(renderCustomerCard)}
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectedCustomer?.name} - History
            </Text>
            <View style={styles.placeholder} />
          </View>

          {historyStats && (
            <View style={styles.statsContainer}>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <BarChart3 size={20} color="#2563eb" />
                  <Text style={styles.statCardValue}>{historyStats.deliveryRate.toFixed(1)}%</Text>
                  <Text style={styles.statCardLabel}>Delivery Rate</Text>
                </View>
                <View style={styles.statCard}>
                  <CheckCircle size={20} color="#16a34a" />
                  <Text style={styles.statCardValue}>{historyStats.deliveredDays}</Text>
                  <Text style={styles.statCardLabel}>Delivered</Text>
                </View>
                <View style={styles.statCard}>
                  <TrendingUp size={20} color="#7c3aed" />
                  <Text style={styles.statCardValue}>{historyStats.totalLiters.toFixed(1)}L</Text>
                  <Text style={styles.statCardLabel}>Total Liters</Text>
                </View>
              </View>
            </View>
          )}

          <FlatList
            data={customerHistoryData}
            renderItem={renderHistoryItem}
            keyExtractor={(item) => item.date}
            style={styles.historyList}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Modal>

      {/* Enhanced Date Range Picker Modal */}
      <Modal
        visible={datePickerVisible}
        animationType="none"
        transparent={true}
        onRequestClose={closeDatePicker}
      >
        <View style={styles.datePickerOverlay}>
          <Animated.View
            style={[
              styles.datePickerModal,
              {
                transform: [{
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [400, 0],
                  }),
                }],
              },
            ]}
          >
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>Select Date Range</Text>
              <TouchableOpacity onPress={closeDatePicker} style={styles.datePickerClose}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.datePickerContent} showsVerticalScrollIndicator={false}>
              {/* Quick Presets */}
              <View style={styles.presetsSection}>
                <Text style={styles.sectionTitle}>Quick Select</Text>
                <View style={styles.presetsGrid}>
                  {[
                    { key: 'today' as DateRangePreset, label: 'Today', icon: Clock },
                    { key: 'week' as DateRangePreset, label: 'Last 7 Days', icon: Calendar },
                    { key: 'month' as DateRangePreset, label: 'Last Month', icon: Calendar },
                    { key: '3months' as DateRangePreset, label: '3 Months', icon: Calendar },
                    { key: '6months' as DateRangePreset, label: '6 Months', icon: Calendar },
                    { key: 'year' as DateRangePreset, label: 'Last Year', icon: Calendar },
                  ].map(({ key, label, icon: Icon }) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.presetButton,
                        dateRange === key && styles.presetButtonActive,
                      ]}
                      onPress={() => selectPresetRange(key)}
                    >
                      <Icon size={18} color={dateRange === key ? '#fff' : '#2563eb'} />
                      <Text
                        style={[
                          styles.presetButtonText,
                          dateRange === key && styles.presetButtonTextActive,
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Custom Date Selection */}
              <View style={styles.customSection}>
                <Text style={styles.sectionTitle}>Custom Range</Text>
                
                {dateRange === 'custom' && (
                  <View style={styles.customDateInfo}>
                    <Text style={styles.customDateLabel}>
                      {selectingFromDate ? 'Select Start Date' : 'Select End Date'}
                    </Text>
                    {customDateRange.from && (
                      <Text style={styles.selectedDateText}>
                        From: {formatDisplayDate(customDateRange.from)}
                      </Text>
                    )}
                  </View>
                )}
                
                <TouchableOpacity
                  style={[
                    styles.customRangeButton,
                    dateRange === 'custom' && styles.customRangeButtonActive,
                  ]}
                  onPress={() => {
                    setDateRange('custom');
                    setSelectingFromDate(true);
                    setCustomDateRange({ from: '', to: '' });
                  }}
                >
                  <CalendarDays size={18} color={dateRange === 'custom' ? '#fff' : '#2563eb'} />
                  <Text
                    style={[
                      styles.customRangeButtonText,
                      dateRange === 'custom' && styles.customRangeButtonTextActive,
                    ]}
                  >
                    Custom Date Range
                  </Text>
                </TouchableOpacity>

                {dateRange === 'custom' && (
                  <ScrollView style={styles.dateGrid} showsVerticalScrollIndicator={false}>
                    <View style={styles.dateGridContainer}>
                      {generateDateOptions().map((date) => {
                        const isFromDate = customDateRange.from === date;
                        const isToDate = customDateRange.to === date;
                        const isInRange = customDateRange.from && customDateRange.to &&
                          date >= customDateRange.from && date <= customDateRange.to;
                        
                        return (
                          <TouchableOpacity
                            key={date}
                            style={[
                              styles.dateOption,
                              isFromDate && styles.dateOptionFrom,
                              isToDate && styles.dateOptionTo,
                              isInRange && !isFromDate && !isToDate && styles.dateOptionInRange,
                            ]}
                            onPress={() => selectCustomDate(date)}
                          >
                            <Text
                              style={[
                                styles.dateOptionText,
                                (isFromDate || isToDate) && styles.dateOptionTextActive,
                              ]}
                            >
                              {formatDisplayDate(date)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                )}
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginLeft: 12,
  },
  dateRangeContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  dateRangeSelector: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  dateRangeSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dateRangeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  dateRangeLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateRangeValue: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '600',
    marginTop: 2,
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  datePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  datePickerClose: {
    padding: 4,
  },
  datePickerContent: {
    maxHeight: 500,
  },
  presetsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
    minWidth: (width - 56) / 2,
    justifyContent: 'center',
    marginBottom: 8,
  },
  presetButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  presetButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563eb',
  },
  presetButtonTextActive: {
    color: '#fff',
  },
  customSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  customDateInfo: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  customDateLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563eb',
    marginBottom: 4,
  },
  selectedDateText: {
    fontSize: 12,
    color: '#64748b',
  },
  customRangeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
    marginBottom: 16,
  },
  customRangeButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  customRangeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563eb',
  },
  customRangeButtonTextActive: {
    color: '#fff',
  },
  dateGrid: {
    maxHeight: 200,
  },
  dateGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dateOption: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minWidth: (width - 56) / 3,
    alignItems: 'center',
  },
  dateOptionFrom: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  dateOptionTo: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  dateOptionInRange: {
    backgroundColor: '#dbeafe',
    borderColor: '#93c5fd',
  },
  dateOptionText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  dateOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  customerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  deliveryRate: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
  customerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  placeholder: {
    width: 60,
  },
  statsContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statCardValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 8,
  },
  statCardLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  historyList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  historyItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyDate: {
    flex: 1,
  },
  dayName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  dateText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  historyStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  historyDetails: {
    flex: 1,
    alignItems: 'flex-end',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  amountText: {
    fontSize: 14,
    color: '#16a34a',
    marginTop: 2,
  },
});