import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Alert,
  TextInput,
  ScrollView,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import paymentService from '../../services/paymentService';
import * as ScreenOrientation from 'expo-screen-orientation';

const PaymentHistoryScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { clientId, clientName } = route.params || {};

  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [summary, setSummary] = useState({});

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedMethod, setSelectedMethod] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Sort states
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showSortModal, setShowSortModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [markPaidModal, setMarkPaidModal] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [notes, setNotes] = useState('');

  useFocusEffect(
    useCallback(() => {
      // 🔒 Lock to portrait when screen is focused
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      );

      // 🔥 Force refresh payment data on focus
      setPayments([]);            // force reset
      setLoading(true);           // show loading
      fetchPaymentHistory();       // fetch fresh

      return () => {
        // 🔓 Unlock when leaving the screen (optional)
        ScreenOrientation.unlockAsync();
      };
    }, [])
  );

  useEffect(() => {
    navigation.setOptions({
      title: `${clientName} - Payments`,
      headerStyle: { backgroundColor: '#2563EB' },
      headerTintColor: '#fff',
    });
  }, [clientName]);

  useEffect(() => {
    fetchPaymentHistory();
  }, [clientId]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [payments, searchQuery, selectedMonth, selectedType, selectedMethod, selectedStatus, sortBy, sortOrder]);

  const fetchPaymentHistory = async () => {
    try {
      setLoading(true);
      const data = await paymentService.getPaymentHistory(clientId);
      setPayments([...data.payments]); // 🔥 clone to force re-render
      setSummary({ ...data.summary });   // 🔥 clone summary
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch payment history');
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...payments];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(payment =>
        payment.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.amount.toString().includes(searchQuery)
      );
    }

    // Month filter
    if (selectedMonth !== 'all') {
      filtered = filtered.filter(payment => {
        const paymentMonth = new Date(payment.createdAt).getMonth();
        return paymentMonth === parseInt(selectedMonth);
      });
    }

    // Type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(payment => payment.type === selectedType);
    }

    // Method filter
    if (selectedMethod !== 'all') {
      filtered = filtered.filter(payment => payment.paymentMethod === selectedMethod);
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(payment => payment.status === selectedStatus);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          comparison = new Date(a.createdAt) - new Date(b.createdAt);
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'method':
          comparison = a.paymentMethod.localeCompare(b.paymentMethod);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredPayments([...filtered]); // 🔥 clone to force re-render
  };

  const getMonthOptions = () => {
    const months = [
      { value: 'all', label: 'All Months' },
      { value: '0', label: 'January' },
      { value: '1', label: 'February' },
      { value: '2', label: 'March' },
      { value: '3', label: 'April' },
      { value: '4', label: 'May' },
      { value: '5', label: 'June' },
      { value: '6', label: 'July' },
      { value: '7', label: 'August' },
      { value: '8', label: 'September' },
      { value: '9', label: 'October' },
      { value: '10', label: 'November' },
      { value: '11', label: 'December' }
    ];
    return months;
  };

  const getFilteredSummary = () => {
    const totalAdded = filteredPayments
      .filter(p => p.type === 'outstanding')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalPaid = filteredPayments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    const balance = totalAdded - totalPaid;

    return { totalAdded, totalPaid, balance };
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPaymentHistory();
    setRefreshing(false);
  };

  const handleMarkAsPaid = async () => {
    if (!selectedPayment) return;

    try {
      await paymentService.markPaymentAsPaid(selectedPayment._id, transactionId, notes);
      Alert.alert('Success', 'Payment marked as paid successfully');
      setMarkPaidModal(false);
      setTransactionId('');
      setNotes('');
      setSelectedPayment(null);
      fetchPaymentHistory();
    } catch (error) {
      Alert.alert('Error', 'Failed to mark payment as paid');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const getPaymentTypeDisplay = (item) => {
    if (item.status === 'completed') {
      return {
        title: item.type === 'manual' ? 'Payment Made by You' : 'Payment Received',
        color: '#10B981',
        icon: 'checkmark-circle'
      };
    } else {
      return {
        title: 'Amount Added to Balance',
        color: 'red',
        icon: 'add-circle'
      };
    }
  };

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'cash': return 'cash-outline';
      case 'online': return 'card-outline';
      case 'upi': return 'phone-portrait-outline';
      case 'bank-transfer': return 'business-outline';
      default: return 'wallet-outline';
    }
  };

  const renderPaymentItem = ({ item }) => {
    const displayInfo = getPaymentTypeDisplay(item);

    return (
      <TouchableOpacity
        style={styles.paymentItem}
        onPress={() => item.status === 'pending' && setSelectedPayment(item)}
      >
        <View style={styles.paymentHeader}>
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentTitle}>{displayInfo.title}</Text>
            <Text style={styles.paymentDescription}>{item.description}</Text>
            <Text style={styles.paymentDate}>{formatDate(item.createdAt)}</Text>
            <View style={styles.paymentMethodContainer}>
              <Ionicons name={getPaymentMethodIcon(item.paymentMethod)} size={14} color="#6B7280" />
              <Text style={styles.paymentMethod}>{item.paymentMethod}</Text>
            </View>
          </View>
          <View style={styles.paymentAmountContainer}>
            <Text style={[styles.paymentAmount, { color: displayInfo.color }]}>
              {item.status === 'completed' ? '-' : '+'}₹{item.amount.toLocaleString()}
            </Text>
            <Ionicons name={displayInfo.icon} size={20} color={displayInfo.color} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading payment history...</Text>
      </View>
    );
  }

  const filteredSummary = getFilteredSummary();

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search payments..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#6B7280" />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons name="filter-outline" size={20} color="#2563EB" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setShowSortModal(true)}
        >
          <Ionicons name="swap-vertical-outline" size={20} color="#2563EB" />
        </TouchableOpacity>
      </View>


      {/* Payment Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>
          {searchQuery || selectedMonth !== 'all' || selectedType !== 'all' || selectedMethod !== 'all'
            ? 'Filtered Summary' : 'Payment Summary'}
        </Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Added</Text>
            <Text style={[styles.summaryAmount, { color: '#2563EB' }]}>
              ₹{filteredSummary.totalAdded?.toLocaleString() || '0'}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Paid</Text>
            <Text style={[styles.summaryAmount, { color: '#10B981' }]}>
              ₹{filteredSummary.totalPaid?.toLocaleString() || '0'}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Balance</Text>
            <Text style={[styles.summaryAmount, { color: '#EF4444' }]}>
              ₹{filteredSummary.balance?.toLocaleString() || '0'}
            </Text>
          </View>
        </View>

        {/* Additional Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Transactions</Text>
            <Text style={styles.statValue}>{filteredPayments.length}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Cash Payments</Text>
            <Text style={styles.statValue}>
              {filteredPayments.filter(p => p.paymentMethod === 'cash').length}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Online Payments</Text>
            <Text style={styles.statValue}>
              {filteredPayments.filter(p => p.paymentMethod === 'online').length}
            </Text>
          </View>
        </View>
      </View>

      {/* Payment List */}
      <FlatList
        data={filteredPayments}
        renderItem={renderPaymentItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No payment history found</Text>
            <Text style={styles.emptySubtext}>Payments will appear here once added</Text>
          </View>
        }
      />

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter & Sort</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Month Filter */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Month</Text>
                {getMonthOptions().map(month => (
                  <TouchableOpacity
                    key={month.value}
                    style={[
                      styles.optionItem,
                      selectedMonth === month.value && styles.optionItemActive
                    ]}
                    onPress={() => setSelectedMonth(month.value)}
                  >
                    <Text style={[
                      styles.optionText,
                      selectedMonth === month.value && styles.optionTextActive
                    ]}>
                      {month.label}
                    </Text>
                    {selectedMonth === month.value && (
                      <Ionicons name="checkmark" size={20} color="#2563EB" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Type Filter */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Payment Type</Text>
                {[
                  { value: 'all', label: 'All Types' },
                  { value: 'outstanding', label: 'Added Amount' },
                  { value: 'manual', label: 'Payment Made' }
                ].map(type => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.optionItem,
                      selectedType === type.value && styles.optionItemActive
                    ]}
                    onPress={() => setSelectedType(type.value)}
                  >
                    <Text style={[
                      styles.optionText,
                      selectedType === type.value && styles.optionTextActive
                    ]}>
                      {type.label}
                    </Text>
                    {selectedType === type.value && (
                      <Ionicons name="checkmark" size={20} color="#2563EB" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Method Filter */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Payment Method</Text>
                {[
                  { value: 'all', label: 'All Methods' },
                  { value: 'cash', label: 'Cash' },
                  { value: 'online', label: 'Online' },
                  { value: 'upi', label: 'UPI' },
                  { value: 'bank-transfer', label: 'Bank Transfer' }
                ].map(method => (
                  <TouchableOpacity
                    key={method.value}
                    style={[
                      styles.optionItem,
                      selectedMethod === method.value && styles.optionItemActive
                    ]}
                    onPress={() => setSelectedMethod(method.value)}
                  >
                    <Text style={[
                      styles.optionText,
                      selectedMethod === method.value && styles.optionTextActive
                    ]}>
                      {method.label}
                    </Text>
                    {selectedMethod === method.value && (
                      <Ionicons name="checkmark" size={20} color="#2563EB" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Status Filter */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Status</Text>
                {[
                  { value: 'all', label: 'All Status' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'completed', label: 'Completed' }
                ].map(status => (
                  <TouchableOpacity
                    key={status.value}
                    style={[
                      styles.optionItem,
                      selectedStatus === status.value && styles.optionItemActive
                    ]}
                    onPress={() => setSelectedStatus(status.value)}
                  >
                    <Text style={[
                      styles.optionText,
                      selectedStatus === status.value && styles.optionTextActive
                    ]}>
                      {status.label}
                    </Text>
                    {selectedStatus === status.value && (
                      <Ionicons name="checkmark" size={20} color="#2563EB" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.resetButton]}
                onPress={() => {
                  setSelectedType('all');
                  setSelectedStatus('all');
                  setSelectedMonth('all');
                  setSelectedMethod('all');
                }}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.confirmButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSortModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sort Options</Text>
              <TouchableOpacity onPress={() => setShowSortModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Sort By */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Sort By</Text>
                {[
                  { value: 'date', label: 'Date' },
                  { value: 'amount', label: 'Amount' },
                  { value: 'type', label: 'Amount Type' },
                  { value: 'method', label: 'Payment Method' }
                ].map(sort => (
                  <TouchableOpacity
                    key={sort.value}
                    style={[
                      styles.optionItem,
                      sortBy === sort.value && styles.optionItemActive
                    ]}
                    onPress={() => setSortBy(sort.value)}
                  >
                    <Text style={[
                      styles.optionText,
                      sortBy === sort.value && styles.optionTextActive
                    ]}>
                      {sort.label}
                    </Text>
                    {sortBy === sort.value && (
                      <Ionicons name="checkmark" size={20} color="#2563EB" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Sort Order */}
              {/* Sort Order */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Order</Text>

                {sortBy === 'date' && (
                  <>
                    <TouchableOpacity
                      style={[styles.optionItem, sortOrder === 'desc' && styles.optionItemActive]}
                      onPress={() => setSortOrder('desc')}
                    >
                      <Text style={[styles.optionText, sortOrder === 'desc' && styles.optionTextActive]}>
                        Newest First
                      </Text>
                      {sortOrder === 'desc' && <Ionicons name="checkmark" size={20} color="#2563EB" />}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.optionItem, sortOrder === 'asc' && styles.optionItemActive]}
                      onPress={() => setSortOrder('asc')}
                    >
                      <Text style={[styles.optionText, sortOrder === 'asc' && styles.optionTextActive]}>
                        Oldest First
                      </Text>
                      {sortOrder === 'asc' && <Ionicons name="checkmark" size={20} color="#2563EB" />}
                    </TouchableOpacity>
                  </>
                )}

                {sortBy === 'amount' && (
                  <>
                    <TouchableOpacity
                      style={[styles.optionItem, sortOrder === 'desc' && styles.optionItemActive]}
                      onPress={() => setSortOrder('desc')}
                    >
                      <Text style={[styles.optionText, sortOrder === 'desc' && styles.optionTextActive]}>
                        High to Low
                      </Text>
                      {sortOrder === 'desc' && <Ionicons name="checkmark" size={20} color="#2563EB" />}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.optionItem, sortOrder === 'asc' && styles.optionItemActive]}
                      onPress={() => setSortOrder('asc')}
                    >
                      <Text style={[styles.optionText, sortOrder === 'asc' && styles.optionTextActive]}>
                        Low to High
                      </Text>
                      {sortOrder === 'asc' && <Ionicons name="checkmark" size={20} color="#2563EB" />}
                    </TouchableOpacity>
                  </>
                )}

                {(sortBy === 'type' || sortBy === 'method') && (
                  <>
                    <TouchableOpacity
                      style={[styles.optionItem, sortOrder === 'asc' && styles.optionItemActive]}
                      onPress={() => setSortOrder('asc')}
                    >
                      <Text style={[styles.optionText, sortOrder === 'asc' && styles.optionTextActive]}>
                        cash
                      </Text>
                      {sortOrder === 'asc' && <Ionicons name="checkmark" size={20} color="#2563EB" />}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.optionItem, sortOrder === 'desc' && styles.optionItemActive]}
                      onPress={() => setSortOrder('desc')}
                    >
                      <Text style={[styles.optionText, sortOrder === 'desc' && styles.optionTextActive]}>
                        online
                      </Text>
                      {sortOrder === 'desc' && <Ionicons name="checkmark" size={20} color="#2563EB" />}
                    </TouchableOpacity>
                  </>
                )}
              </View>

            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.resetButton]}
                onPress={() => {
                  setSortBy('date');
                  setSortOrder('desc');
                }}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={() => setShowSortModal(false)}
              >
                <Text style={styles.confirmButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Mark as Paid Modal */}
      <Modal
        visible={markPaidModal}
        transparent
        animationType="slide"
        onRequestClose={() => setMarkPaidModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Mark Payment as Paid</Text>

            {selectedPayment && (
              <View style={styles.paymentPreview}>
                <Text style={styles.previewAmount}>
                  ₹{selectedPayment.amount.toLocaleString()}
                </Text>
                <Text style={styles.previewDescription}>
                  {selectedPayment.description}
                </Text>
              </View>
            )}

            <TextInput
              style={styles.input}
              placeholder="Transaction ID (optional)"
              value={transactionId}
              onChangeText={setTransactionId}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Notes (optional)"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setMarkPaidModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleMarkAsPaid}
              >
                <Text style={styles.confirmButtonText}>Mark as Paid</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  summaryCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  paymentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  paymentDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  paymentDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  paymentAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 4,
  },
  paidInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  paidText: {
    fontSize: 14,
    color: '#10B981',
    marginLeft: 6,
  },
  transactionId: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontFamily: 'monospace',
  },
  notesText: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 4,
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 20,
  },
  paymentPreview: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  previewAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  previewDescription: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  confirmButton: {
    backgroundColor: '#2563EB',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1F2937',
  },
  filterButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  sortButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  optionItemActive: {
    backgroundColor: '#EBF4FF',
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  optionText: {
    fontSize: 14,
    color: '#374151',
  },
  optionTextActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  resetButton: {
    backgroundColor: '#F3F4F6',
    flex: 1,
    marginRight: 8,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
});

export default PaymentHistoryScreen;
