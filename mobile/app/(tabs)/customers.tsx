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
import { useState } from 'react';
import { useData } from '@/context/DataContext';
import { Customer } from '@/types';
import { Users, Plus, Search, Phone, MapPin, X } from 'lucide-react-native';
import { getDayName } from '@/utils/date';

export default function CustomersScreen() {
  const { customers, addCustomer, updateCustomer, deleteCustomer, getCustomerBalance } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    defaultQuantity: '1',
    defaultPrice: '80',
    deliveryDays: [] as number[],
    notes: '',
  });

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  const activeCustomers = filteredCustomers.filter((c) => c.isActive);
  const inactiveCustomers = filteredCustomers.filter((c) => !c.isActive);

  const openAddModal = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      phone: '',
      address: '',
      defaultQuantity: '1',
      defaultPrice: '80',
      deliveryDays: [1, 2, 3, 4, 5, 6, 0],
      notes: '',
    });
    setModalVisible(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      defaultQuantity: customer.defaultQuantity.toString(),
      defaultPrice: customer.defaultPrice.toString(),
      deliveryDays: customer.deliveryDays,
      notes: customer.notes,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (saving) {
      return; // Prevent multiple clicks while saving
    }

    if (!formData.name.trim()) {
      Alert.alert('Error', 'Customer name is required');
      return;
    }

    setSaving(true);
    try {
      const customerData = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        defaultQuantity: parseFloat(formData.defaultQuantity) || 1,
        defaultPrice: parseFloat(formData.defaultPrice) || 0,
        deliveryDays: formData.deliveryDays,
        isActive: true,
        notes: formData.notes.trim(),
      };

      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, customerData);
        Alert.alert('Success', 'Customer updated successfully!');
      } else {
        await addCustomer(customerData);
        Alert.alert('Success', 'Customer added successfully!');
      }

      setModalVisible(false);
      // Reset form after successful save
      setFormData({
        name: '',
        phone: '',
        address: '',
        defaultQuantity: '1',
        defaultPrice: '80',
        deliveryDays: [],
        notes: '',
      });
    } catch (error: any) {
      console.error('Error saving customer:', error);
      Alert.alert(
        'Error', 
        error.message || 'Failed to save customer. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDay = (day: number) => {
    setFormData((prev) => ({
      ...prev,
      deliveryDays: prev.deliveryDays.includes(day)
        ? prev.deliveryDays.filter((d) => d !== day)
        : [...prev.deliveryDays, day],
    }));
  };

  const handleDeactivate = async (customer: Customer) => {
    Alert.alert(
      'Deactivate Customer',
      `Are you sure you want to deactivate ${customer.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: () => updateCustomer(customer.id, { isActive: false }),
        },
      ]
    );
  };

  const handleActivate = async (customer: Customer) => {
    await updateCustomer(customer.id, { isActive: true });
  };

  const renderCustomerCard = (customer: Customer) => {
    const balance = getCustomerBalance(customer.id);
    const balanceColor = balance.balance > 0 ? '#dc2626' : balance.balance < 0 ? '#16a34a' : '#6b7280';

    return (
      <TouchableOpacity
        key={customer.id}
        style={styles.customerCard}
        onPress={() => openEditModal(customer)}
      >
        <View style={styles.customerHeader}>
          <Text style={styles.customerName}>{customer.name}</Text>
          {balance.balance !== 0 && (
            <Text style={[styles.balance, { color: balanceColor }]}>
              ₹{Math.abs(balance.balance).toFixed(2)}
              {balance.balance < 0 ? ' (adv)' : ''}
            </Text>
          )}
        </View>

        <View style={styles.customerDetails}>
          {customer.phone && (
            <View style={styles.detailRow}>
              <Phone size={14} color="#6b7280" />
              <Text style={styles.detailText}>{customer.phone}</Text>
            </View>
          )}
          {customer.address && (
            <View style={styles.detailRow}>
              <MapPin size={14} color="#6b7280" />
              <Text style={styles.detailText}>{customer.address}</Text>
            </View>
          )}
        </View>

        <View style={styles.customerFooter}>
          <Text style={styles.footerText}>
            {customer.defaultQuantity}L @ ₹{customer.defaultPrice}/L
          </Text>
          <View style={styles.daysContainer}>
            {customer.deliveryDays.map((day) => (
              <Text key={day} style={styles.dayBadge}>
                {getDayName(day)}
              </Text>
            ))}
          </View>
        </View>

        {!customer.isActive && (
          <TouchableOpacity
            style={styles.activateButton}
            onPress={() => handleActivate(customer)}
          >
            <Text style={styles.activateButtonText}>Activate</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Customers</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color="#6b7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search customers..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeCustomers.length === 0 && inactiveCustomers.length === 0 && (
          <View style={styles.emptyState}>
            <Users size={48} color="#d1d5db" />
            <Text style={styles.emptyStateText}>No customers yet</Text>
            <Text style={styles.emptyStateSubtext}>Add your first customer to get started</Text>
          </View>
        )}

        {activeCustomers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active ({activeCustomers.length})</Text>
            {activeCustomers.map(renderCustomerCard)}
          </View>
        )}

        {inactiveCustomers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Inactive ({inactiveCustomers.length})</Text>
            {inactiveCustomers.map(renderCustomerCard)}
          </View>
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCustomer ? 'Edit Customer' : 'Add Customer'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Customer name"
              />

              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                placeholder="Phone number"
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Address</Text>
              <TextInput
                style={styles.input}
                value={formData.address}
                onChangeText={(text) => setFormData({ ...formData, address: text })}
                placeholder="Delivery address"
              />

              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Text style={styles.label}>Default Quantity (L)</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.defaultQuantity}
                    onChangeText={(text) => setFormData({ ...formData, defaultQuantity: text })}
                    placeholder="1.0"
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={styles.halfField}>
                  <Text style={styles.label}>Price per Liter (₹)</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.defaultPrice}
                    onChangeText={(text) => setFormData({ ...formData, defaultPrice: text })}
                    placeholder="80"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <Text style={styles.label}>Delivery Days</Text>
              <View style={styles.daysSelector}>
                {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayButton,
                      formData.deliveryDays.includes(day) && styles.dayButtonActive,
                    ]}
                    onPress={() => handleToggleDay(day)}
                  >
                    <Text
                      style={[
                        styles.dayButtonText,
                        formData.deliveryDays.includes(day) && styles.dayButtonTextActive,
                      ]}
                    >
                      {getDayName(day)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.notes}
                onChangeText={(text) => setFormData({ ...formData, notes: text })}
                placeholder="Additional notes"
                multiline
                numberOfLines={3}
              />

              <View style={styles.modalActions}>
                {editingCustomer && editingCustomer.isActive && (
                  <TouchableOpacity
                    style={styles.deactivateButton}
                    onPress={() => {
                      setModalVisible(false);
                      handleDeactivate(editingCustomer);
                    }}
                  >
                    <Text style={styles.deactivateButtonText}>Deactivate</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.saveButton, 
                    !editingCustomer?.isActive && styles.saveButtonFull,
                    saving && styles.saveButtonDisabled
                  ]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  <Text style={[styles.saveButtonText, saving && styles.saveButtonTextDisabled]}>
                    {saving ? 'Saving...' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1d4ed8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  balance: {
    fontSize: 16,
    fontWeight: '700',
  },
  customerDetails: {
    gap: 6,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
  },
  customerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  daysContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  dayBadge: {
    fontSize: 10,
    color: '#2563eb',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
  },
  activateButton: {
    marginTop: 12,
    backgroundColor: '#16a34a',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  activateButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  daysSelector: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  dayButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  dayButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  dayButtonTextActive: {
    color: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 20,
  },
  deactivateButton: {
    flex: 1,
    backgroundColor: '#fee2e2',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  deactivateButtonText: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonFull: {
    flex: 2,
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonTextDisabled: {
    color: '#e5e7eb',
  },
});
