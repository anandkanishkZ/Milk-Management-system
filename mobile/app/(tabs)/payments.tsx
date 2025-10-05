import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useData } from '@/context/DataContext';
import { Customer, Payment } from '@/types';
import { getTodayString, formatDisplayDate } from '@/utils/date';
import { Wallet, Plus, X, Check, Trash2, Shield } from 'lucide-react-native';
import SecurityPinModal from '@/components/SecurityPinModal';
// Security PIN handled by SecurityPinModal component

export default function PaymentsScreen() {
  const { customers, payments, addPayment, deletePayment, getCustomerBalance, getCustomerPayments } = useData();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinAction, setPinAction] = useState<'payment' | 'setup' | null>(null);
  const [isPinSetup, setIsPinSetup] = useState(false);
  const [pendingPaymentData, setPendingPaymentData] = useState<any>(null);

  const [formData, setFormData] = useState({
    amount: '',
    method: 'cash' as Payment['method'],
    reference: '',
    paymentDate: getTodayString(),
    notes: '',
  });

  const activeCustomers = customers.filter((c) => c.isActive);

  useEffect(() => {
    checkPinSetup();
  }, []);

  const checkPinSetup = async () => {
    try {
      // For now, assume PIN is always set up
      setIsPinSetup(true);
    } catch (error) {
      console.error('Error checking PIN setup:', error);
    }
  };

  const customersWithBalance = activeCustomers
    .map((customer) => ({
      customer,
      balance: getCustomerBalance(customer.id),
    }))
    .sort((a, b) => b.balance.balance - a.balance.balance);

  const openAddPaymentModal = async (customer: Customer) => {
    // Check if PIN is set up
    if (!isPinSetup) {
      Alert.alert(
        'Security PIN Required',
        'You need to set up a security PIN before adding payments. This helps protect sensitive financial operations.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Setup PIN',
            onPress: () => {
              setPinAction('setup');
              setPinModalVisible(true);
              setPendingPaymentData(customer);
            },
          },
        ]
      );
      return;
    }

    // Require PIN verification for payment
    setPinAction('payment');
    setPendingPaymentData(customer);
    setPinModalVisible(true);
  };

  const openDetailModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDetailModalVisible(true);
  };

  const handleDeletePayment = async (payment: Payment, customerName: string) => {
    Alert.alert(
      'Delete Payment',
      `Are you sure you want to delete this payment of ₹${payment.amount.toFixed(2)} from ${customerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePayment(payment.id);
              Alert.alert('Success', 'Payment deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete payment');
            }
          },
        },
      ]
    );
  };

  const handlePinSuccess = () => {
    setPinModalVisible(false);
    
    if (pinAction === 'setup') {
      setIsPinSetup(true);
      if (pendingPaymentData) {
        // After PIN setup, open payment modal directly
        const customer = pendingPaymentData;
        const balance = getCustomerBalance(customer.id);
        setSelectedCustomer(customer);
        setFormData({
          amount: balance.balance > 0 ? balance.balance.toFixed(2) : '',
          method: 'cash',
          reference: '',
          paymentDate: getTodayString(),
          notes: '',
        });
        setModalVisible(true);
      }
    } else if (pinAction === 'payment') {
      // Open payment modal after PIN verification
      const customer = pendingPaymentData;
      const balance = getCustomerBalance(customer.id);
      setSelectedCustomer(customer);
      setFormData({
        amount: balance.balance > 0 ? balance.balance.toFixed(2) : '',
        method: 'cash',
        reference: '',
        paymentDate: getTodayString(),
        notes: '',
      });
      setModalVisible(true);
    }
    
    setPendingPaymentData(null);
    setPinAction(null);
  };

  const handlePinClose = () => {
    setPinModalVisible(false);
    setPendingPaymentData(null);
    setPinAction(null);
  };

  const handleSavePayment = async () => {
    if (!selectedCustomer) return;

    const amount = parseFloat(formData.amount);
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    await addPayment({
      customerId: selectedCustomer.id,
      amount,
      method: formData.method,
      reference: formData.reference.trim(),
      paymentDate: formData.paymentDate,
      notes: formData.notes.trim(),
    });

    setModalVisible(false);
    Alert.alert('Success', 'Payment recorded successfully');
  };

  const todayPayments = payments.filter((p) => p.paymentDate === getTodayString());
  const todayTotal = todayPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payments</Text>
      </View>

      <View style={styles.todaySummary}>
        <Wallet size={32} color="#16a34a" />
        <View style={styles.todaySummaryText}>
          <Text style={styles.todaySummaryLabel}>Today's Collection</Text>
          <Text style={styles.todaySummaryValue}>₹{todayTotal.toFixed(2)}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Balances</Text>

          {customersWithBalance.length === 0 ? (
            <View style={styles.emptyState}>
              <Wallet size={48} color="#d1d5db" />
              <Text style={styles.emptyStateText}>No customers yet</Text>
            </View>
          ) : (
            customersWithBalance.map(({ customer, balance }) => {
              const balanceColor =
                balance.balance > 0
                  ? '#dc2626'
                  : balance.balance < 0
                  ? '#16a34a'
                  : '#6b7280';
              const balanceLabel =
                balance.balance > 0 ? 'Due' : balance.balance < 0 ? 'Advance' : 'Clear';

              return (
                <TouchableOpacity
                  key={customer.id}
                  style={styles.customerCard}
                  onPress={() => openDetailModal(customer)}
                >
                  <View style={styles.customerInfo}>
                    <Text style={styles.customerName}>{customer.name}</Text>
                    <View style={styles.balanceInfo}>
                      <Text style={styles.balanceLabel}>Billed: ₹{balance.totalBilled.toFixed(2)}</Text>
                      <Text style={styles.balanceLabel}>Paid: ₹{balance.totalPaid.toFixed(2)}</Text>
                    </View>
                  </View>

                  <View style={styles.customerActions}>
                    <View style={[styles.balanceBadge, { backgroundColor: getBalanceColor(balanceColor).bg }]}>
                      <Text style={[styles.balanceAmount, { color: balanceColor }]}>
                        ₹{Math.abs(balance.balance).toFixed(2)}
                      </Text>
                      <Text style={[styles.balanceStatus, { color: balanceColor }]}>
                        {balanceLabel}
                      </Text>
                    </View>

                    {balance.balance > 0 && (
                      <TouchableOpacity
                        style={styles.payButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          openAddPaymentModal(customer);
                        }}
                      >
                        <Plus size={16} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Payment</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {selectedCustomer && (
              <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
                <View style={styles.customerSummary}>
                  <Text style={styles.customerSummaryName}>{selectedCustomer.name}</Text>
                  <Text style={styles.customerSummaryBalance}>
                    Outstanding: ₹{getCustomerBalance(selectedCustomer.id).balance.toFixed(2)}
                  </Text>
                </View>

                <Text style={styles.label}>Amount (₹) *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.amount}
                  onChangeText={(text) => setFormData({ ...formData, amount: text })}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />

                <Text style={styles.label}>Payment Method</Text>
                <View style={styles.methodSelector}>
                  {(['cash', 'mobile', 'bank'] as const).map((method) => (
                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.methodButton,
                        formData.method === method && styles.methodButtonActive,
                      ]}
                      onPress={() => setFormData({ ...formData, method })}
                    >
                      <Text
                        style={[
                          styles.methodButtonText,
                          formData.method === method && styles.methodButtonTextActive,
                        ]}
                      >
                        {method.charAt(0).toUpperCase() + method.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Reference / Transaction ID</Text>
                <TextInput
                  style={styles.input}
                  value={formData.reference}
                  onChangeText={(text) => setFormData({ ...formData, reference: text })}
                  placeholder="Optional"
                />

                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.notes}
                  onChangeText={(text) => setFormData({ ...formData, notes: text })}
                  placeholder="Optional notes"
                  multiline
                  numberOfLines={3}
                />

                <TouchableOpacity style={styles.saveButton} onPress={handleSavePayment}>
                  <Check size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>Record Payment</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={detailModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payment History</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {selectedCustomer && (
              <ScrollView style={styles.detailContent} showsVerticalScrollIndicator={false}>
                <View style={styles.customerSummary}>
                  <Text style={styles.customerSummaryName}>{selectedCustomer.name}</Text>
                  <Text style={styles.customerSummaryBalance}>
                    Balance: ₹{getCustomerBalance(selectedCustomer.id).balance.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.historySection}>
                  <Text style={styles.historySectionTitle}>Recent Payments</Text>
                  {getCustomerPayments(selectedCustomer.id).map((payment) => (
                    <View style={styles.historyItem} {...{ key: payment.id }}>
                      <View style={styles.historyItemLeft}>
                        <Text style={styles.historyDate}>
                          {formatDisplayDate(payment.paymentDate)}
                        </Text>
                        <Text style={styles.historyMethod}>
                          {payment.method} {payment.reference && `• ${payment.reference}`}
                        </Text>
                      </View>
                      <View style={styles.historyItemRight}>
                        <Text style={styles.historyAmount}>₹{payment.amount.toFixed(2)}</Text>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDeletePayment(payment, selectedCustomer.name)}
                        >
                          <Trash2 size={16} color="#F44336" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}

                  {getCustomerPayments(selectedCustomer.id).length === 0 && (
                    <Text style={styles.noHistory}>No payment history</Text>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.addPaymentButton}
                  onPress={() => {
                    setDetailModalVisible(false);
                    openAddPaymentModal(selectedCustomer);
                  }}
                >
                  <Plus size={20} color="#fff" />
                  <Text style={styles.addPaymentButtonText}>Add Payment</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <SecurityPinModal
        visible={pinModalVisible}
        onClose={handlePinClose}
        onSuccess={handlePinSuccess}
        title={pinAction === 'setup' ? 'Setup Security PIN' : 'Security Verification'}
        subtitle={
          pinAction === 'setup'
            ? 'Create a 4-digit PIN to secure payment operations'
            : 'Enter your security PIN to add payment'
        }
        mode={pinAction === 'setup' ? 'setup' : 'verify'}
      />

    </View>
  );
}

function getBalanceColor(color: string) {
  if (color === '#dc2626') return { bg: '#fee2e2' };
  if (color === '#16a34a') return { bg: '#dcfce7' };
  return { bg: '#f3f4f6' };
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
  todaySummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 20,
    borderRadius: 12,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  todaySummaryText: {
    flex: 1,
  },
  todaySummaryLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  todaySummaryValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#16a34a',
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
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  balanceInfo: {
    gap: 2,
  },
  balanceLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  customerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  balanceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'flex-end',
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  balanceStatus: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  payButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  form: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  customerSummary: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  customerSummaryName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  customerSummaryBalance: {
    fontSize: 14,
    color: '#6b7280',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  methodSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  methodButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  methodButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  methodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  methodButtonTextActive: {
    color: '#fff',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
    marginBottom: 20,
    gap: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  detailContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  historySection: {
    marginTop: 8,
  },
  historySectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  historyItemLeft: {
    flex: 1,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  historyMethod: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#16a34a',
  },
  noHistory: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 20,
  },
  addPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 20,
    gap: 8,
  },
  addPaymentButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Simple delete button styles
  historyItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
  },
});
