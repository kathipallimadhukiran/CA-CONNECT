import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { API_BASE_URL } from '../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PaymentScreen = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });
  const [summary, setSummary] = useState({
    totalPayments: 0,
    pendingPayments: 0,
    completedPayments: 0
  });

  const fetchPayments = async (page = 1, limit = 10) => {
    try {
      setRefreshing(true);
      setLoading(true);
      
      console.log('Fetching payments from:', `${API_BASE_URL}/payment?page=${page}&limit=${limit}`);
      const response = await fetch(`${API_BASE_URL}/payment?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      console.log('Received payments data:', data);
      
      // Update payments and pagination state
      setPayments(data.payments || []);
      setPagination({
        page: data.pagination.page,
        limit: data.pagination.limit,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages
      });
      
      // Update summary
      if (data.summary) {
        setSummary({
          totalPayments: data.summary.totalPayments || 0,
          pendingPayments: data.summary.pendingPayments || 0,
          completedPayments: data.summary.completedPayments || 0
        });
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      setError(error.message);
      Alert.alert('Error', `Failed to fetch payments: ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchPayments(newPage, pagination.limit);
    }
  };

  // Handle refresh
  const onRefresh = () => {
    fetchPayments(pagination.page, pagination.limit);
  };

  useEffect(() => {
    fetchPayments(pagination.page, pagination.limit);
  }, []);

  const markAsPaid = async (paymentId) => {
    try {
      setPayments(payments.map(payment => 
        payment.id === paymentId 
          ? { ...payment, status: 'completed' }
          : payment
      ));
      
      // Here you would typically make an API call to update the payment status
      // await updatePaymentStatus(paymentId, 'completed');
      
      Alert.alert('Success', 'Payment marked as completed');
    } catch (error) {
      console.error('Error updating payment status:', error);
      Alert.alert('Error', 'Failed to update payment status');
    }
  };

  const filteredPayments = payments.filter(payment => {
    if (filter === 'all') return true;
    return payment.status === 'completed';
  });

  const sortedPayments = [...(filteredPayments || [])].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    } else if (sortBy === 'oldest') {
      return new Date(a.createdAt) - new Date(b.createdAt);
    } else if (sortBy === 'amount_high') {
      return b.amount - a.amount;
    } else if (sortBy === 'amount_low') {
      return a.amount - b.amount;
    }
    return 0;
  });

  const renderPaymentItem = ({ item }) => {
    const isPaid = item.status === 'completed';
    const paidAmount = isPaid ? item.amount : (item.paidAmount || 0);
    const balanceAmount = isPaid ? 0 : (item.amount - (item.paidAmount || 0));
    
    return (
      <View style={[
        styles.paymentCard,
        isPaid ? styles.paidCard : styles.pendingCard
      ]}>
        <View style={styles.amountContainer}>
          <View style={styles.amountSection}>
            <Text style={styles.amountLabel}>Paid</Text>
            <Text style={[styles.amount, styles.paidAmount]}>
              ₹{paidAmount.toLocaleString()}
            </Text>
          </View>
          
          {!isPaid && (
            <View style={styles.amountSection}>
              <Text style={styles.amountLabel}>Balance</Text>
              <Text style={[styles.amount, styles.balanceAmount]}>
                ₹{balanceAmount.toLocaleString()}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  // Render payment summary
  const renderSummary = () => (
    <View style={styles.summaryContainer}>
      <View style={styles.summaryItem}>
        <Text style={styles.summaryLabel}>Total Payments</Text>
        <Text style={styles.summaryValue}>{summary.totalPayments}</Text>
      </View>
      <View style={styles.summaryItem}>
        <Text style={styles.summaryLabel}>Pending</Text>
        <Text style={[styles.summaryValue, styles.pendingValue]}>{summary.pendingPayments}</Text>
      </View>
      <View style={styles.summaryItem}>
        <Text style={styles.summaryLabel}>Completed</Text>
        <Text style={[styles.summaryValue, styles.completedValue]}>{summary.completedPayments}</Text>
      </View>
    </View>
  );

  // Render pagination controls
  const renderPagination = () => (
    <View style={styles.paginationContainer}>
      <TouchableOpacity 
        style={[styles.paginationButton, pagination.page === 1 && styles.disabledButton]}
        onPress={() => handlePageChange(pagination.page - 1)}
        disabled={pagination.page === 1}>
        <Ionicons name="chevron-back" size={20} color={pagination.page === 1 ? '#999' : '#2563EB'} />
      </TouchableOpacity>
      
      <Text style={styles.pageInfo}>
        Page {pagination.page} of {pagination.totalPages}
      </Text>
      
      <TouchableOpacity 
        style={[styles.paginationButton, pagination.page >= pagination.totalPages && styles.disabledButton]}
        onPress={() => handlePageChange(pagination.page + 1)}
        disabled={pagination.page >= pagination.totalPages}>
        <Ionicons name="chevron-forward" size={20} color={pagination.page >= pagination.totalPages ? '#999' : '#2563EB'} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Payments</Text>
        <Text style={styles.subtitle}>Track client payments and outstanding amounts</Text>
      </View>
      
      {renderSummary()}

      <View style={styles.filtersContainer}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Show:</Text>
          <Picker
            selectedValue={filter}
            style={styles.filterPicker}
            onValueChange={(itemValue) => setFilter(itemValue)}>
            <Picker.Item label="All Payments" value="all" />
            <Picker.Item label="Completed Only" value="completed" />
          </Picker>
        </View>

        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Sort by:</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={sortBy}
              onValueChange={(value) => setSortBy(value)}
              style={styles.picker}
              dropdownIconColor="#6B7280"
            >
              <Picker.Item label="Newest First" value="newest" />
              <Picker.Item label="Oldest First" value="oldest" />
              <Picker.Item label="Amount: High to Low" value="amount_high" />
              <Picker.Item label="Amount: Low to High" value="amount_low" />
            </Picker>
          </View>
        </View>
      </View>

      <FlatList
        data={payments}
        renderItem={renderPaymentItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt" size={60} color="#D1D5DB" />
            <Text style={styles.emptyText}>No payments found</Text>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={onRefresh}>
              <Ionicons name="refresh" size={16} color="#2563EB" />
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        }
      />
      
      {payments.length > 0 && renderPagination()}
    </SafeAreaView>
  );
};

// Helper function to format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#4F46E5',
    padding: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: '#E0E7FF',
    fontSize: 14,
    opacity: 0.9,
  },
  // Filters
  filtersContainer: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    marginTop: 8,
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterGroup: {
    marginBottom: 12,
    marginBottom: 12,
  },
  filterLabel: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    marginLeft: 4,
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 40,
    color: '#1F2937',
  },
  listContent: {
    padding: 16,
  },
  // Payment Cards
  paymentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  paidCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  pendingCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  amountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountSection: {
    alignItems: 'flex-start',
  },
  amountLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  paidAmount: {
    color: '#10B981',
  },
  balanceAmount: {
    color: '#EF4444',
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  invoiceText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statusPaid: {
    color: '#10B981',
  },
  statusPending: {
    color: '#F59E0B',
  },
  amountContainer: {
    marginBottom: 12,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  amountLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  paidAmount: {
    color: '#10B981',
  },
  balanceAmount: {
    color: '#EF4444',
  },
  payButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  payNowButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  description: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 12,
  },
  paymentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#6B7280',
  },
  paidText: {
    color: '#10B981',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    marginTop: 40,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
    marginBottom: 16,
    marginTop: 16,
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
});

export default PaymentScreen; 