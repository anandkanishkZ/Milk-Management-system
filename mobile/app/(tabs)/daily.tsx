import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useState, useMemo, useEffect } from 'react';
import { useData } from '@/context/DataContext';
import { getTodayString, formatDisplayDate, getWeekDayIndex, isDateInFuture, isDateToday } from '@/utils/date';
import { Calendar, ChevronLeft, ChevronRight, Plus, Minus, Check, AlertTriangle, Shield, Edit3, Trash2 } from 'lucide-react-native';
import SecurityPinModal from '@/components/SecurityPinModal';
// Security PIN handled by SecurityPinModal component

export default function DailyScreen() {
  const { customers, dailyEntries, addDailyEntry, updateDailyEntry, deleteDailyEntry, loading } = useData();
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [saving, setSaving] = useState<string | null>(null);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinAction, setPinAction] = useState<'backdate' | 'setup' | null>(null);
  const [isPinSetup, setIsPinSetup] = useState(false);
  const [pendingEntryData, setPendingEntryData] = useState<any>(null);
  const [quantityEditModal, setQuantityEditModal] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [editQuantityValue, setEditQuantityValue] = useState('');

  const activeCustomers = customers.filter((c) => c.isActive);

  useEffect(() => {
    checkPinSetup();
  }, []);

  const checkPinSetup = async () => {
    try {
      // For now, assume PIN is always set up
      // In a real app, this would check AsyncStorage or a secure store
      setIsPinSetup(true);
    } catch (error) {
      console.error('Error checking PIN setup:', error);
    }
  };

  const todayDeliveries = useMemo(() => {
    const dayIndex = getWeekDayIndex(selectedDate);
    const scheduledCustomers = activeCustomers.filter((c) => c.deliveryDays.includes(dayIndex));

    return scheduledCustomers.map((customer) => {
      const existingEntry = dailyEntries.find(
        (e) => e.customerId === customer.id && e.entryDate === selectedDate
      );

      return {
        customer,
        quantity: existingEntry?.quantity ?? 1, // Default to 1 liter
        pricePerLiter: existingEntry?.pricePerLiter ?? customer.defaultPrice,
        notes: existingEntry?.notes ?? '',
        saved: !!existingEntry,
        entryId: existingEntry?.id, // Store entry ID for edit/delete
      };
    });
  }, [activeCustomers, dailyEntries, selectedDate]);

  const changeDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    const newDateStr = formatDate(date);
    
    // Don't allow selection of future dates
    if (isDateInFuture(newDateStr)) {
      Alert.alert(
        'Invalid Date',
        'You can only view and add milk entries for today or past dates. Future dates are not allowed.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    setSelectedDate(newDateStr);
  };

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSave = async (customerId: string, quantity: number, pricePerLiter: number, notes: string) => {
    // Check if this is a backdated entry (not today)
    const isBackdatedEntry = !isDateToday(selectedDate);
    
    if (isBackdatedEntry) {
      // Check if PIN is set up
      if (!isPinSetup) {
        Alert.alert(
          'Security PIN Required',
          'You need to set up a security PIN before editing backdated milk deliveries. This helps protect sensitive historical data.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Setup PIN',
              onPress: () => {
                setPinAction('setup');
                setPinModalVisible(true);
                setPendingEntryData({ customerId, quantity, pricePerLiter, notes });
              },
            },
          ]
        );
        return;
      }

      // Require PIN verification for backdated entry
      Alert.alert(
        'Security Verification Required',
        `You are editing a milk delivery entry for ${formatDisplayDate(selectedDate)}. This requires security verification.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Verify PIN',
            onPress: () => {
              setPinAction('backdate');
              setPendingEntryData({ customerId, quantity, pricePerLiter, notes });
              setPinModalVisible(true);
            },
          },
        ]
      );
      return;
    }

    // For today's entries, save directly
    await saveEntry(customerId, quantity, pricePerLiter, notes);
  };

  const saveEntry = async (customerId: string, quantity: number, pricePerLiter: number, notes: string) => {
    try {
      setSaving(customerId);
      await addDailyEntry({
        customerId,
        entryDate: selectedDate,
        quantity,
        pricePerLiter,
        amount: quantity * pricePerLiter,
        productType: 'milk',
        notes,
      });
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to save milk entry',
        [{ text: 'OK' }]
      );
    } finally {
      setSaving(null);
    }
  };

  const handlePinSuccess = () => {
    setPinModalVisible(false);
    
    if (pinAction === 'setup') {
      setIsPinSetup(true);
      if (pendingEntryData) {
        // After PIN setup, save the entry
        const { customerId, quantity, pricePerLiter, notes } = pendingEntryData;
        saveEntry(customerId, quantity, pricePerLiter, notes);
      }
    } else if (pinAction === 'backdate') {
      // Save backdated entry after PIN verification
      if (pendingEntryData) {
        const { customerId, quantity, pricePerLiter, notes } = pendingEntryData;
        saveEntry(customerId, quantity, pricePerLiter, notes);
      }
    }
    
    setPendingEntryData(null);
    setPinAction(null);
  };

  const handlePinClose = () => {
    setPinModalVisible(false);
    setPendingEntryData(null);
    setPinAction(null);
  };

  const handleQuantityChange = (customerId: string, delta: number) => {
    const delivery = todayDeliveries.find((d) => d.customer.id === customerId);
    if (!delivery) return;

    const newQuantity = Math.max(0.5, Math.round((delivery.quantity + delta) * 2) / 2); // Minimum 0.5L, round to nearest 0.5
    
    // If entry is already saved, use edit function, otherwise use save
    if (delivery.saved && delivery.entryId) {
      handleEditEntry(customerId, newQuantity);
    } else {
      handleSave(customerId, newQuantity, delivery.pricePerLiter, delivery.notes);
    }
  };

  const handleQuantitySet = (customerId: string, quantity: number) => {
    const delivery = todayDeliveries.find((d) => d.customer.id === customerId);
    if (!delivery) return;

    // If entry is already saved, use edit function, otherwise use save
    if (delivery.saved && delivery.entryId) {
      handleEditEntry(customerId, quantity);
    } else {
      handleSave(customerId, quantity, delivery.pricePerLiter, delivery.notes);
    }
  };

  const handleDeleteEntry = async (customerId: string, customerName: string) => {
    const delivery = todayDeliveries.find((d) => d.customer.id === customerId);
    if (!delivery || !delivery.entryId) return;

    Alert.alert(
      'Delete Entry',
      `Are you sure you want to delete the milk entry for ${customerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(customerId);
              await deleteDailyEntry(delivery.entryId!);
            } catch (error) {
              Alert.alert(
                'Error',
                error instanceof Error ? error.message : 'Failed to delete entry',
                [{ text: 'OK' }]
              );
            } finally {
              setSaving(null);
            }
          },
        },
      ]
    );
  };

  const handleEditEntry = async (customerId: string, newQuantity: number) => {
    const delivery = todayDeliveries.find((d) => d.customer.id === customerId);
    if (!delivery || !delivery.entryId) return;

    try {
      setSaving(customerId);
      await updateDailyEntry(delivery.entryId, {
        quantity: newQuantity,
        amount: newQuantity * delivery.pricePerLiter,
      });
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to update entry',
        [{ text: 'OK' }]
      );
    } finally {
      setSaving(null);
    }
  };

  const handleQuantityEditSave = () => {
    if (!editingCustomerId) return;

    const customQuantity = parseFloat(editQuantityValue);
    if (isNaN(customQuantity) || customQuantity < 0.5 || customQuantity > 20) {
      Alert.alert('Invalid Quantity', 'Please enter a quantity between 0.5L and 20L');
      return;
    }

    const roundedQuantity = Math.round(customQuantity * 2) / 2; // Round to nearest 0.5L
    handleQuantitySet(editingCustomerId, roundedQuantity);
    
    // Close modal
    setQuantityEditModal(false);
    setEditingCustomerId(null);
    setEditQuantityValue('');
  };

  const handleQuantityEditCancel = () => {
    setQuantityEditModal(false);
    setEditingCustomerId(null);
    setEditQuantityValue('');
  };

  const isToday = selectedDate === getTodayString();
  const isBackdatedView = !isToday && !isDateInFuture(selectedDate);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Daily Entries</Text>
      </View>

      <View style={styles.dateSelector}>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => changeDate(-1)}
        >
          <ChevronLeft size={24} color="#2563eb" />
        </TouchableOpacity>

        <View style={styles.dateDisplay}>
          <Calendar size={20} color="#2563eb" />
          <View>
            <Text style={styles.dateText}>{formatDisplayDate(selectedDate)}</Text>
            {isToday && <Text style={styles.todayBadge}>Today</Text>}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.dateButton, isDateInFuture(formatDate(new Date(new Date(selectedDate).getTime() + 24 * 60 * 60 * 1000))) && styles.dateButtonDisabled]}
          onPress={() => changeDate(1)}
          disabled={isDateInFuture(formatDate(new Date(new Date(selectedDate).getTime() + 24 * 60 * 60 * 1000)))}
        >
          <ChevronRight size={24} color={isDateInFuture(formatDate(new Date(new Date(selectedDate).getTime() + 24 * 60 * 60 * 1000))) ? "#d1d5db" : "#2563eb"} />
        </TouchableOpacity>
      </View>

      {isToday && (
        <View style={styles.validationNotice}>
          <AlertTriangle size={16} color="#f59e0b" />
          <Text style={styles.validationNoticeText}>
            Milk entries can only be added for today. Future dates are restricted.
          </Text>
        </View>
      )}

      {isBackdatedView && (
        <View style={styles.securityWarning}>
          <Shield size={16} color="#dc2626" />
          <Text style={styles.securityWarningText}>
            Backdated Entry - Security PIN required for changes
          </Text>
        </View>
      )}

      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{todayDeliveries.length}</Text>
          <Text style={styles.summaryLabel}>Scheduled</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {todayDeliveries.reduce((sum, d) => sum + d.quantity, 0).toFixed(0)}L
          </Text>
          <Text style={styles.summaryLabel}>Total Milk</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            ₹{todayDeliveries.reduce((sum, d) => sum + d.quantity * d.pricePerLiter, 0).toFixed(0)}
          </Text>
          <Text style={styles.summaryLabel}>Total Amount</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {todayDeliveries.length === 0 ? (
          <View style={styles.emptyState}>
            <Calendar size={48} color="#d1d5db" />
            <Text style={styles.emptyStateText}>No deliveries scheduled</Text>
            <Text style={styles.emptyStateSubtext}>
              No customers are scheduled for delivery on this day
            </Text>
          </View>
        ) : (
          todayDeliveries.map(({ customer, quantity, pricePerLiter, saved, entryId }, index) => {
            const amount = quantity * pricePerLiter;
            const isSaving = saving === customer.id;

            return (
              <View style={styles.deliveryCard} {...{ key: customer.id }}>
                <View style={styles.deliveryHeader}>
                  <View style={styles.deliveryInfo}>
                    <Text style={styles.customerName}>{customer.name}</Text>
                    <Text style={styles.deliveryDetails}>
                      Default: 1L @ ₹{customer.defaultPrice}/L {saved ? '(Saved)' : '(New Entry)'}
                    </Text>
                  </View>
                  {saved && !isSaving ? (
                    <View style={styles.actionButtons}>
                      <View style={styles.savedBadge}>
                        <Check size={12} color="#16a34a" />
                        <Text style={styles.savedText}>Saved</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => handleDeleteEntry(customer.id, customer.name)}
                      >
                        <Trash2 size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>

                {/* Quick Preset Buttons */}
                <View style={styles.presetButtons}>
                  {[1, 2, 3, 4, 5].map((preset) => (
                    <TouchableOpacity
                      key={preset}
                      style={[
                        styles.presetButton,
                        quantity === preset && styles.presetButtonActive
                      ]}
                      onPress={() => handleQuantitySet(customer.id, preset)}
                      disabled={isSaving}
                    >
                      <Text style={[
                        styles.presetButtonText,
                        quantity === preset && styles.presetButtonTextActive
                      ]}>
                        {preset % 1 === 0 ? preset.toFixed(0) : preset.toFixed(1)}L
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Quantity Control */}
                <View style={styles.quantityControl}>
                  <TouchableOpacity
                    style={[
                      styles.quantityButton,
                      quantity <= 0.5 && styles.quantityButtonDisabled
                    ]}
                    onPress={() => handleQuantityChange(customer.id, -0.5)}
                    disabled={isSaving || quantity <= 0.5}
                  >
                    <Minus size={20} color={quantity <= 0.5 ? '#d1d5db' : '#2563eb'} />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.quantityDisplay}
                    onPress={() => {
                      setEditingCustomerId(customer.id);
                      setEditQuantityValue(quantity.toString());
                      setQuantityEditModal(true);
                    }}
                  >
                    <Text style={styles.quantityValue}>
                      {quantity % 1 === 0 ? quantity.toFixed(0) : quantity.toFixed(1)}
                    </Text>
                    <Text style={styles.quantityLabel}>Tap to edit directly</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => handleQuantityChange(customer.id, 0.5)}
                    disabled={isSaving}
                  >
                    <Plus size={20} color="#2563eb" />
                  </TouchableOpacity>
                </View>

                {/* Custom Amount Input */}
                {quantity > 5 && (
                  <View style={styles.customQuantityNote}>
                    <Text style={styles.customQuantityText}>
                      Custom: {quantity % 1 === 0 ? quantity.toFixed(0) : quantity.toFixed(1)} Liters
                    </Text>
                  </View>
                )}



                <View style={styles.amountDisplay}>
                  <Text style={styles.amountLabel}>Amount:</Text>
                  <Text style={styles.amountValue}>₹{amount.toFixed(2)}</Text>
                </View>

                {isSaving && (
                  <View style={styles.savingIndicator}>
                    <ActivityIndicator size="small" color="#2563eb" />
                    <Text style={styles.savingText}>Saving...</Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Quantity Edit Modal */}
      <Modal
        visible={quantityEditModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleQuantityEditCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.quantityEditModal}>
            <Text style={styles.modalTitle}>Edit Quantity</Text>
            <Text style={styles.modalSubtitle}>
              Enter quantity in liters (e.g., 0.5, 1.5, 2.5)
            </Text>
            
            <TextInput
              style={styles.quantityInput}
              value={editQuantityValue}
              onChangeText={setEditQuantityValue}
              placeholder="Enter quantity"
              keyboardType="decimal-pad"
              autoFocus={true}
              selectTextOnFocus={true}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={handleQuantityEditCancel}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleQuantityEditSave}
              >
                <Text style={styles.modalSaveText}>Set Quantity</Text>
              </TouchableOpacity>
            </View>
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
            ? 'Create a 4-digit PIN to secure backdated entries'
            : 'Enter your security PIN to modify this backdated entry'
        }
        mode={pinAction === 'setup' ? 'setup' : 'verify'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
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
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  dateButton: {
    padding: 8,
  },
  dateButtonDisabled: {
    opacity: 0.5,
  },
  validationNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    marginHorizontal: 20,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f59e0b',
    gap: 8,
  },
  validationNoticeText: {
    flex: 1,
    fontSize: 14,
    color: '#92400e',
    fontWeight: '500',
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  todayBadge: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '600',
  },
  summary: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
  },
  content: {
    flex: 1,
    paddingTop: 16,
  },
  deliveryCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  deliveryInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  deliveryDetails: {
    fontSize: 14,
    color: '#6b7280',
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  savedText: {
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '600',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  quantityButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityDisplay: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minWidth: 100,
  },
  quantityValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
  },
  quantityLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    textAlign: 'center',
  },
  amountDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  amountLabel: {
    fontSize: 16,
    color: '#6b7280',
  },
  amountValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2563eb',
  },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  savingText: {
    fontSize: 14,
    color: '#6b7280',
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
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  securityWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 20,
    marginVertical: 8,
    gap: 8,
  },
  securityWarningText: {
    flex: 1,
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '500',
  },
  presetButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  presetButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  presetButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  presetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  presetButtonTextActive: {
    color: '#ffffff',
  },
  quantityButtonDisabled: {
    opacity: 0.5,
  },
  customQuantityNote: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 6,
    alignItems: 'center',
  },
  customQuantityText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  helpNotice: {
    marginHorizontal: 20,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  helpNoticeText: {
    fontSize: 12,
    color: '#1d4ed8',
    textAlign: 'center',
  },
  
  // Quantity Edit Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  quantityEditModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  quantityInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  modalCancelText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#007bff',
  },
  modalSaveText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },

});
