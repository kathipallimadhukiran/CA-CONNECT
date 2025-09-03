import React, { useState, useEffect } from 'react';
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
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { API_BASE_URL } from '../../config';

const PaymentScreen = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filter and sort states
  const [filter, setFilter] = useState('all'); // all | completed | pending
  const [sortBy, setSortBy] = useState('newest'); // newest | oldest | amount_high | amount_low

  // Date range
  const [showDatePicker, setShowDatePicker] = useState(null);
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

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = `${API_BASE_URL}/payment?from=${dateRange.from.toISOString()}&to=${dateRange.to.toISOString()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed: ${response.status}`);

      const data = await response.json();
      const filteredByDate = (data.payments || []).filter(p => {
        const createdAt = new Date(p.createdAt);
        return createdAt >= dateRange.from && createdAt <= dateRange.to;
      });

      setPayments(filteredByDate);

      // Stats
      let total = 0, received = 0, pending = 0;
      filteredByDate.forEach(p => {
        total += p.amount;
        if (p.status === 'completed') received += p.amount;
        else pending += (p.amount - (p.paidAmount || 0));
      });
      setStats({ totalAmount: total, received, pending });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [dateRange]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPayments();
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

      {/* Date Range */}
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

      {/* Sorting + Filter */}
      <View style={styles.rowContainer}>
        <View style={styles.pickerBox}>
          <Picker
            selectedValue={sortBy}
            onValueChange={setSortBy}
            style={styles.picker}
            itemStyle={{ height: 120 }}
          >
            <Picker.Item label="Newest" value="newest" />
            <Picker.Item label="Oldest" value="oldest" />
            <Picker.Item label="Amount High" value="amount_high" />
            <Picker.Item label="Amount Low" value="amount_low" />
          </Picker>
        </View>
        <View style={styles.pickerBox}>
          <Picker
            selectedValue={filter}
            onValueChange={setFilter}
            style={styles.picker}
            itemStyle={{ height: 120 }}
          >
            <Picker.Item label="All" value="all" />
            <Picker.Item label="All Paid" value="completed" />
            <Picker.Item label="Balance Due" value="pending" />
          </Picker>
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
          <TouchableOpacity onPress={fetchPayments} style={styles.retryButton}>
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
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
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
  pickerBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginHorizontal: 4,
    height: 50,
    justifyContent: 'center'
  },
  picker: { width: '100%' },
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
