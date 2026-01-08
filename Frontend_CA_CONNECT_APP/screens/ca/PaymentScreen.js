import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Modal,
  TouchableWithoutFeedback,
  Platform,
  StatusBar
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { API_BASE_URL } from '../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ScreenOrientation from 'expo-screen-orientation';

const PaymentScreen = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [caEmail, setCaEmail] = useState(null);

  // Filter and sort states
  const [filter, setFilter] = useState('all'); // all | completed | pending
  const [sortBy, setSortBy] = useState('newest'); // newest | oldest | amount_high | amount_low

  // Date range
  const [showDatePicker, setShowDatePicker] = useState(null);
  const [useDateFilter, setUseDateFilter] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date()
  });

  // Statistics
  const [stats, setStats] = useState({
    totalAmount: 0,
    received: 0,
    pending: 0
  });

  useFocusEffect(
  useCallback(() => {
    // 🔒 Lock to portrait when screen is focused
    ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.PORTRAIT_UP
    );

    return () => {
      // 🔓 Unlock when leaving the screen (optional)
      ScreenOrientation.unlockAsync();
    };
  }, [])
);

  const fetchCAPayments = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get CA email from AsyncStorage
      const email = await AsyncStorage.getItem('userEmail');
      if (!email) {
        throw new Error('CA email not found. Please login again.');
      }
      setCaEmail(email);

      // 1. First get all clients for this CA
      const clientsResponse = await fetch(`${API_BASE_URL}/clients?caUserName=${encodeURIComponent(email)}`);
      if (!clientsResponse.ok) throw new Error('Failed to fetch clients');
      const { clients } = await clientsResponse.json();

      if (!clients || clients.length === 0) {
        setPayments([]);
        setStats({ totalAmount: 0, received: 0, pending: 0 });
        return;
      }

      // 2. Get payments for all clients
      const clientIds = clients.map(c => c._id);
      let url = `${API_BASE_URL}/payments`;

      if (useDateFilter) {
        url += `?from=${dateRange.from.toISOString()}&to=${dateRange.to.toISOString()}`;
      }

      const paymentsResponse = await fetch(url);
      if (!paymentsResponse.ok) throw new Error('Failed to fetch payments');
      const data = await paymentsResponse.json();

      // Filter payments by client IDs and date range if enabled
      const filteredPayments = (data.payments || []).filter(p => {
        const clientMatch = clientIds.includes(p.clientId);
        if (!useDateFilter) return clientMatch;

        const createdAt = new Date(p.createdAt);
        return clientMatch && createdAt >= dateRange.from && createdAt <= dateRange.to;
      });

      setPayments(filteredPayments);

      let outstandingAdded = 0;
      let outstandingPaid = 0;
      let manualPaid = 0;
      filteredPayments.forEach(p => {
        if (p.type === 'outstanding') {
          outstandingAdded += p.amount;

          if (p.status === 'completed') {
            outstandingPaid += p.amount;
          }
        }

        if (p.type === 'manual') {
          manualPaid += p.amount;
        }
      });
      const balance = outstandingAdded - (outstandingPaid + manualPaid);

      setStats({
        totalAmount: outstandingAdded,
        received: outstandingPaid + manualPaid,
        pending: balance < 0 ? 0 : balance
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCAPayments();
  }, [dateRange, useDateFilter]);
  useFocusEffect(
    useCallback(() => {
      fetchCAPayments();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchCAPayments();
  };

  const formatDate = (date) =>
    date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const onDateChange = (event, selectedDate, type) => {
    setShowDatePicker(null);
    if (selectedDate) {
      setDateRange(prev => ({ ...prev, [type]: selectedDate }));
    }
  };

  const filteredPayments = payments.filter(p => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  const sortedPayments = [...filteredPayments].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    if (sortBy === 'amount_high') return b.amount - a.amount;
    if (sortBy === 'amount_low') return a.amount - b.amount;
    return 0;
  });

  const renderPaymentItem = ({ item }) => {
    const isPaid = item.status === 'completed';
    const balance = isPaid ? 0 : item.amount - (item.paidAmount || 0);

    const formattedDate = new Date(item.createdAt).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View style={[styles.paymentCard, isPaid ? styles.paidCard : styles.pendingCard]}>
        {/* Top Row: Date + Business Name */}
        <View style={styles.cardHeader}>
          <Text style={styles.cardDate}>{formattedDate}</Text>
          {item.client?.name && <Text style={styles.cardClient}>{item.client.name}</Text>}
        </View>

        {/* Amount Section */}
        <Text style={styles.amountLabel}>{isPaid ? 'Payment Received' : 'Balance Due'}</Text>
        <Text style={[styles.amount, isPaid ? styles.paidAmount : styles.balanceAmount]}>
          ₹{(isPaid ? item.amount : balance).toLocaleString()}
        </Text>

        {/* Description */}
        {item.description && <Text style={styles.description}>{item.description}</Text>}
      </View>
    );
  };


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Date Range Toggle */}
      <View style={styles.filterToggleContainer}>
        <TouchableOpacity
          style={[styles.filterToggle, useDateFilter && styles.filterToggleActive]}
          onPress={() => setUseDateFilter(!useDateFilter)}
        >
          <Ionicons
            name={useDateFilter ? 'calendar' : 'calendar-outline'}
            size={16}
            color={useDateFilter ? '#4F46E5' : '#6B7280'}
          />
          <Text style={[styles.filterToggleText, useDateFilter && styles.filterToggleTextActive]}>
            Filter by Date
          </Text>
        </TouchableOpacity>
      </View>

      {/* Date Range Picker (Conditional) */}
      {useDateFilter && (
        <View style={styles.rowContainer}>
          <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker('from')}>
            <Ionicons name="calendar" size={16} color="#4F46E5" />
            <Text style={styles.dateText}>{formatDate(dateRange.from)}</Text>
          </TouchableOpacity>
          <Text style={styles.dateSeparator}>to</Text>
          <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker('to')}>
            <Ionicons name="calendar" size={16} color="#4F46E5" />
            <Text style={styles.dateText}>{formatDate(dateRange.to)}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Enhanced Filter and Sort Section */}
      <View style={styles.enhancedFiltersContainer}>
        <Text style={styles.sectionTitle}>Filter & Sort</Text>

        <View style={styles.filtersRow}>
          {/* Sort By */}
          <View style={styles.filterCard}>
            <View style={styles.filterHeader}>
              <Ionicons name="funnel-outline" size={16} color="#4F46E5" />
              <Text style={styles.filterTitle}>Sort By</Text>
            </View>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={sortBy}
                onValueChange={setSortBy}
                style={styles.picker}
                dropdownIconColor="#4F46E5"
                mode="dropdown"
              >
                <Picker.Item
                  label="Newest First"
                  value="newest"
                  style={styles.pickerItem}
                />
                <Picker.Item
                  label="Oldest First"
                  value="oldest"
                  style={styles.pickerItem}
                />
                <Picker.Item
                  label="Amount (High to Low)"
                  value="amount_high"
                  style={styles.pickerItem}
                />
                <Picker.Item
                  label="Amount (Low to High)"
                  value="amount_low"
                  style={styles.pickerItem}
                />
              </Picker>
            </View>
          </View>

          {/* Filter */}
          <View style={styles.filterCard}>
            <View style={styles.filterHeader}>
              <Ionicons name="filter-outline" size={16} color="#4F46E5" />
              <Text style={styles.filterTitle}>Status</Text>
            </View>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={filter}
                onValueChange={setFilter}
                style={styles.picker}
                dropdownIconColor="#4F46E5"
                mode="dropdown"
              >
                <Picker.Item
                  label="All Payments"
                  value="all"
                  style={styles.pickerItem}
                />
                <Picker.Item
                  label="Paid"
                  value="completed"
                  style={styles.pickerItem}
                />
                <Picker.Item
                  label="Pending"
                  value="pending"
                  style={styles.pickerItem}
                />
              </Picker>
            </View>
          </View>
        </View>
      </View>

      {/* Statistics */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: '#F0F9FF' }]}>
          <Text style={[styles.statValue, { color: '#0369A1' }]}>₹{stats.totalAmount}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#F0FDF4' }]}>
          <Text style={[styles.statValue, { color: '#0D9488' }]}>₹{stats.received}</Text>
          <Text style={styles.statLabel}>All Paid</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FEF2F2' }]}>
          <Text style={[styles.statValue, { color: '#DC2626' }]}>₹{stats.pending}</Text>
          <Text style={styles.statLabel}>Balance Due</Text>
        </View>
      </View>

      {/* Payments List */}
      {loading ? (
        <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 20 }} />
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchCAPayments} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sortedPayments}
          renderItem={renderPaymentItem}
          keyExtractor={item => item._id || String(Math.random())}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.emptyText}>No payments found</Text>}
        />
      )}

      {/* Date Picker Modal */}
      {showDatePicker && (
        <Modal transparent animationType="fade" visible={!!showDatePicker}>
          <TouchableWithoutFeedback onPress={() => setShowDatePicker(null)}>
            <View style={styles.dateOverlay}>
              <View style={styles.dateBox}>
                <DateTimePicker
                  value={showDatePicker === 'from' ? dateRange.from : dateRange.to}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(e, d) => onDateChange(e, d, showDatePicker)}
                  maximumDate={showDatePicker === 'to' ? new Date() : dateRange.to}
                  minimumDate={showDatePicker === 'from' ? null : dateRange.from}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  filterToggleContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  filterToggleActive: {
    backgroundColor: '#EEF2FF',
  },
  filterToggleText: {
    marginLeft: 6,
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  filterToggleTextActive: {
    color: '#4F46E5',
  },
  enhancedFiltersContainer: {
    backgroundColor: '#ffffff',
    padding: 18,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
    borderRadius: 12,
    marginHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },
  filtersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
  },
  filterCard: {
    flex: 1,
    backgroundColor: '#F8FAFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E7FF',

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  filterTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 6,
  },

  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flex: 1,
    marginHorizontal: 4,
  },
  dateText: { marginLeft: 6, color: '#111827' },
  dateSeparator: { marginHorizontal: 6, color: '#6B7280' },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 10,
    gap: 10,
  },

  pickerContainer: {
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',

    height: 49,
    justifyContent: 'center',
  },
  picker: {
    height: 45,
    color: '#111827',
    fontSize: 14,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  pickerItem: {
    fontSize: 14,

    color: 'white',
  },

  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', padding: 12 },
  statCard: { flex: 1, margin: 4, padding: 12, borderRadius: 8, alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '700' },
  statLabel: { fontSize: 12, color: '#6B7280' },
  paymentCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  paidCard: { borderLeftColor: '#10B981' },
  pendingCard: { borderLeftColor: '#F59E0B' },
  amountLabel: { fontSize: 12, color: '#6B7280' },
  amount: { fontSize: 16, fontWeight: '600' },
  paidAmount: { color: '#10B981' },
  balanceAmount: { color: '#DC2626' },
  description: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  errorBox: { padding: 20, alignItems: 'center' },
  errorText: { color: '#DC2626', marginBottom: 8 },
  retryButton: { backgroundColor: '#4F46E5', padding: 10, borderRadius: 6 },
  retryText: { color: '#fff' },
  emptyText: { textAlign: 'center', color: '#6B7280', marginTop: 40 },
  dateOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  dateBox: { backgroundColor: '#fff', borderRadius: 10, padding: 16, width: '90%' },
});

export default PaymentScreen;
