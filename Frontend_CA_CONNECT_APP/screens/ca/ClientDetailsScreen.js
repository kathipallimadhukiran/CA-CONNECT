import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, ScrollView,
  TouchableOpacity, Linking, Alert, Modal, TextInput, Platform, FlatList, Dimensions
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, useIsFocused } from '@react-navigation/native';
import * as LocalAuthentication from 'expo-local-authentication';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import paymentService from '../../services/paymentService';
import filingService from '../../services/filingService';
import { API_BASE_URL } from '../../config';
import AddAmountModal from '../../components/modals/AddAmountModal';
import ManualPaymentModal from '../../components/modals/ManualPaymentModal';
import FileUploadModal from '../../components/modals/FileUploadModal';

const { width } = Dimensions.get('window');

const ClientDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { clientId } = route.params || {};

  // State declarations
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentPayments, setRecentPayments] = useState([]);
  const [showAddAmountModal, setShowAddAmountModal] = useState(false);
  const [showManualPaymentModal, setShowManualPaymentModal] = useState(false);
  const [showFileUploadModal, setShowFileUploadModal] = useState(false);
  const [outstandingAmount, setOutstandingAmount] = useState('');
  const [outstandingDescription, setOutstandingDescription] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualNote, setManualNote] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [token, setToken] = useState('');
  const [uploading, setUploading] = useState(false);

  // Fetch token from AsyncStorage
  const getToken = useCallback(async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (userToken) {
        setToken(userToken);
      }
    } catch (error) {
      console.error('Error fetching token:', error);
    }
  }, []);

  // Fetch client details
  const fetchClientDetails = async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      console.log('Fetching client with ID:', clientId);

      // First: fetch client with cache-busting
      const timestamp = new Date().getTime();
      const clientRes = await fetch(`${API_BASE_URL}/clients/${clientId}?_t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (clientRes.status === 404) {
        throw new Error('Client not found');
      }

      if (!clientRes.ok) {
        throw new Error(`Failed to fetch client: ${clientRes.status} ${clientRes.statusText}`);
      }

      const response = await clientRes.json();
      console.log('Client API Response:', response);

      // Handle case where client is directly in response or nested under 'client' key
      const clientData = response.client || response;

      if (!clientData) {
        throw new Error('Client data is empty');
      }

      // Log the raw client data for debugging
      console.log('Raw client data:', clientData);

      // Format client data to match expected structure
      const formattedClient = {
        ...clientData,  // Keep all original fields from the API
        // Map phoneNumber to phone for backward compatibility
        phone: clientData.phoneNumber || clientData.phone || 'N/A',
        // Ensure we have a name field, either from name or firstName/lastName
        name: clientData.name || `${clientData.firstName || ''} ${clientData.lastName || ''}`.trim(),
        // Set default values for other fields if not present
        // Use name as businessName since that's what the API provides
        businessName: clientData.businessName || 'N/A',
        gstNumber: clientData.gstNumber || 'N/A',
        panNumber: clientData.panNumber || 'N/A',
        email: clientData.email || 'N/A',
        gstType: clientData.gstType || 'N/A',
        address: clientData.address || 'N/A'
      };

      // Log the formatted client data for debugging
      console.log('Formatted client data:', formattedClient);

      // Try to fetch payment history, but don't fail if it doesn't exist
      let paymentData = { payments: [] };
      try {
        paymentData = await paymentService.getPaymentHistory(clientId, 5) || { payments: [] };
        console.log('Payment history:', paymentData);
      } catch (paymentError) {
        console.warn('Could not fetch payment history:', paymentError);
        // Continue without payment data
      }

      setClient(formattedClient);
      setRecentPayments(paymentData.payments || []);
    } catch (error) {
      console.error('Error in fetchClientDetails:', error);
      Alert.alert("Error", error.message || "Failed to fetch client details.");
      setClient(null);
    } finally {
      setLoading(false);
    }
  };


  // Fetch token on component mount
  useEffect(() => {
    getToken();
  }, [getToken]);

  // Fetch client details when clientId or token changes
  useEffect(() => {
    if (clientId) {
      fetchClientDetails();
    }
  }, [clientId, token]);

  // Handle adding outstanding amount
  const handleCreateOutstanding = async () => {
    if (!outstandingAmount || !outstandingDescription) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      await paymentService.createOutstandingPayment(
        clientId,
        parseFloat(outstandingAmount),
        outstandingDescription
      );
      await fetchClientDetails();
      setShowAddAmountModal(false);
      setOutstandingAmount('');
      setOutstandingDescription('');
      Alert.alert('Success', 'Outstanding amount added successfully');
    } catch (error) {
      console.error('Error creating outstanding amount:', error);
      Alert.alert('Error', 'Failed to add outstanding amount');
    } finally {
      setLoading(false);
    }
  };

  // Handle manual payment submission
  const handleManualSubmit = async () => {
    if (!manualAmount) {
      Alert.alert('Error', 'Please enter an amount');
      return;
    }

    try {
      setLoading(true);
      // First verify biometrics
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verify your identity to record payment',
        fallbackLabel: 'Enter Passcode',
      });

      if (result.success) {
        // Process the payment
        await paymentService.recordManualPayment({
          clientId,
          amount: parseFloat(manualAmount),
          paymentMethod,
          paidAt: manualDate || new Date().toISOString().split('T')[0],
          notes: manualNote,
        });

        // Refresh client data
        await fetchClientDetails();

        // Reset form
        setManualAmount('');
        setManualNote('');
        setShowManualPaymentModal(false);

        Alert.alert('Success', 'Payment recorded successfully');
      } else {
        Alert.alert('Authentication Failed', 'You must authenticate to record a payment');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      Alert.alert('Error', 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };


  // Handle call
  const handleCall = () => {
    const phoneNumber = client?.phone || client?.phoneNumber || client?.mobile || '';
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`).catch(() => {
        Alert.alert("Error", "Unable to open the dialer.");
      });
    } else {
      Alert.alert("Error", "No phone number available for this client.");
    }
  };

  // Handle mark as paid
  const handleMarkAsPaid = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !isEnrolled) {
      Alert.alert('Authentication Error', 'No biometric authentication is set up on this device.');
      return;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to mark as paid',
      fallbackLabel: 'Enter device PIN',
    });
    if (result.success) {
      setShowManualPaymentModal(true);
      setManualAmount('');
      setManualDate('');
      setManualNote('');
    } else {
      Alert.alert('Authentication Failed', 'Could not authenticate.');
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-GB', options);
  };

  // On date change
  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const yyyy = selectedDate.getFullYear();
      const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const dd = String(selectedDate.getDate()).padStart(2, '0');
      setManualDate(`${yyyy}-${mm}-${dd}`);
    }
  };

  // Get payment type display
  const getPaymentTypeDisplay = (item) => {
    if (item.type === 'manual') {
      return {
        title: 'Payment Made by You',
        subtitle: 'Money paid from balance',
        color: '#10B981',
        icon: 'arrow-down-circle',
        prefix: '-'
      };
    } else if (item.status === 'completed') {
      return {
        title: 'Payment Received',
        subtitle: 'Outstanding amount paid',
        color: '#10B981',
        icon: 'checkmark-circle',
        prefix: '-'
      };
    } else {
      return {
        title: 'Amount Added',
        subtitle: 'Added to client balance',
        color: 'red',
        icon: 'add-circle',
        prefix: '+'
      };
    }
  };

  // Render payment item
  const renderPaymentItem = ({ item }) => {
    const displayInfo = getPaymentTypeDisplay(item);

    return (
      <View style={styles.paymentHistoryItem}>
        <View style={styles.paymentItemHeader}>
          <View style={styles.paymentItemLeft}>
            <Ionicons name={displayInfo.icon} size={24} color={displayInfo.color} />
          </View>
          <View style={styles.paymentItemInfo}>
            <Text style={styles.paymentItemTitle}>{displayInfo.title}</Text>
            <Text style={styles.paymentItemSubtitle}>{displayInfo.subtitle}</Text>
            <Text style={styles.paymentItemDescription}>{item.description}</Text>
            <Text style={styles.paymentItemDate}>{formatDate(item.createdAt)}</Text>
          </View>
          <View style={styles.paymentItemRight}>
            <Text style={[styles.paymentItemAmount, { color: displayInfo.color }]}>
              {displayInfo.prefix}₹{item.amount.toLocaleString()}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Navigate to payment history
  const navigateToPaymentHistory = () => {
    navigation.navigate('PaymentHistory', {
      clientId,
      clientName: client?.name || 'Client'
    });
  };

  // Navigate to edit client screen
  const navigateToEditClient = () => {
    if (!client) return;

    navigation.navigate('EditClient', {
      clientId: client._id,
      clientData: {
        firstName: client.firstName || '',
        lastName: client.lastName || '',
        email: client.email || '',
        phone: client.phone || client.phoneNumber || '',
        businessName: client.businessName || '',
        gstNumber: client.gstNumber || '',
        panNumber: client.panNumber || '',
        gstType: client.gstType || 'Regular',
        address: client.address || ''
      }
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading client details...</Text>
      </View>
    );
  }

  if (!client) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="sad-outline" size={50} color="#95a5a6" />
        <Text style={styles.errorText}>Failed to load client details. Please try again.</Text>
      </View>
    );
  }

  // Get avatar initials
  const getAvatarInitials = () => {
    if (!client.name) return '?';
    return client.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
        {/* 1. Client Details Division */}
        <View style={styles.section}>
          <View style={styles.clientDetailsCard}>
            <View style={styles.clientHeader}>
              <View style={styles.avatarContainer}>
                {/* Default profile image for client */}
                <View style={{ width: 60, height: 60, borderRadius: 30, overflow: 'hidden', backgroundColor: '#e0e7ff', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="person" size={40} color="#2563EB" />
                </View>
              </View>
              <View style={styles.clientInfo}>
                <Text style={styles.clientName}>{client.businessName || 'N/A'}</Text>
                <View style={styles.clientMeta}>
                  <Text style={styles.clientEmail}>{client.email || 'N/A'}</Text>
                  <Text style={styles.clientPhone}>• {client.phone || client.phoneNumber || client.mobile || 'N/A'}</Text>
                </View>
                <View style={styles.paymentStatus}>
                  <View style={[
                    styles.statusDot,
                    { backgroundColor: (client.totalOutstanding || 0) > 0 ? '#EF4444' : '#10B981' }
                  ]} />
                  <Text style={styles.statusText}>
                    {(client.totalOutstanding || 0) > 0 ? 'Payments Pending' : 'All Payments Complete'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.callButton} onPress={handleCall}>
                <Ionicons name="call" size={24} color="#3498db" />
              </TouchableOpacity>
           
            </View>

            <View style={styles.contactInfo}>
              <View style={styles.contactRow}>
                <Ionicons name="person" size={18} color="#7f8c8d" />
                <Text style={styles.contactText}>{client.name || 'N/A'}</Text>
              </View>
              <View style={styles.contactRow}>
                <Ionicons name="location" size={18} color="#7f8c8d" />
                <Text style={styles.contactText}>{client.address || 'N/A'}</Text>
              </View>
              {client.gstNumber && (
                <View style={styles.contactRow}>
                  <Ionicons name="document-text" size={18} color="#7f8c8d" />
                  <Text style={styles.contactText}>GST: {client.gstNumber || 'N/A'}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* 2. Payment Summary Division */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payment Summary</Text>
            <Text style={styles.lastPaymentText}>Last payment: {formatDate(client.lastPaymentDate) || 'N/A'}</Text>
          </View>

          <View style={styles.summaryGrid}>
            <View style={[styles.summaryCard, styles.primaryCard]}>
              <Text style={styles.summaryLabel}>Total Added</Text>
              <Text style={styles.summaryAmount}>₹{client.totalAdded?.toLocaleString() || '0'}</Text>
            </View>

            <View style={[styles.summaryCard, styles.successCard]}>
              <Text style={styles.summaryLabel}>Total Paid</Text>
              <Text style={styles.summaryAmount}>₹{client.totalPaid?.toLocaleString() || '0'}</Text>
            </View>

            <View style={[styles.summaryCard, styles.warningCard]}>
              <Text style={styles.summaryLabel}>Balance</Text>
              <Text style={styles.summaryAmount}>₹{client.totalOutstanding?.toLocaleString() || '0'}</Text>
            </View>
          </View>
        </View>

        {/* 3. Payment Actions Division */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payment Actions</Text>
          </View>

          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={() => setShowAddAmountModal(true)}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Add Amount</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.recordButton]}
              onPress={handleMarkAsPaid}
            >
              <Ionicons name="receipt-outline" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Record Payment</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* 4. Recent Payments Division */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Payments</Text>
            <TouchableOpacity onPress={navigateToPaymentHistory}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentPayments.length > 0 ? (
            <FlatList
              data={recentPayments}
              renderItem={renderPaymentItem}
              keyExtractor={(item) => item._id}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyPayments}>
              <Ionicons name="receipt-outline" size={32} color="#D1D5DB" />
              <Text style={styles.emptyPaymentsText}>No payment history yet</Text>
            </View>
          )}
        </View>


      </ScrollView>

      {/* Add Amount Modal */}
      <AddAmountModal
        isVisible={showAddAmountModal}
        onClose={() => setShowAddAmountModal(false)}
        outstandingAmount={outstandingAmount}
        setOutstandingAmount={setOutstandingAmount}
        outstandingDescription={outstandingDescription}
        setOutstandingDescription={setOutstandingDescription}
        handleCreateOutstanding={handleCreateOutstanding}
      />

      {/* Manual Payment Modal */}
      <ManualPaymentModal
        isVisible={showManualPaymentModal}
        onClose={() => setShowManualPaymentModal(false)}
        manualAmount={manualAmount}
        setManualAmount={setManualAmount}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        manualDate={manualDate}
        setManualDate={setManualDate}
        showDatePicker={showDatePicker}
        setShowDatePicker={setShowDatePicker}
        manualNote={manualNote}
        setManualNote={setManualNote}
        handleManualSubmit={handleManualSubmit}
        client={client}
      />

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  headerButton: {
    marginRight: 16,
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 15,
    color: '#7f8c8d',
    fontSize: 16,
  },
  errorText: {
    marginTop: 15,
    color: '#e74c3c',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
    paddingBottom: 30,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  lastPaymentText: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  viewAllText: {
    color: '#3498db',
    fontSize: 14,
    fontWeight: '500',
  },
  // Client Details Styles
  clientDetailsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  clientMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  clientEmail: {
    color: '#7f8c8d',
    fontSize: 14,
  },
  clientPhone: {
    color: '#7f8c8d',
    fontSize: 14,
    marginLeft: 8,
  },
  paymentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  callButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#ecf0f1',
  },
  contactInfo: {
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    paddingTop: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  contactText: {
    marginLeft: 10,
    color: '#2c3e50',
    fontSize: 14,
  },
  // Payment Summary Styles
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCard: {
    width: (width - 48) / 3,
    padding: 12,
    borderRadius: 10,
  },
  primaryCard: {
    backgroundColor: '#e0f2fe',
  },
  successCard: {
    backgroundColor: '#dcfce7',
  },
  warningCard: {
    backgroundColor: '#fef9c3',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  // Action Buttons
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    backgroundColor: 'red',

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
  },
  addButton: {
    backgroundColor: '#3b82f6',
  },
  recordButton: {
    backgroundColor: '#10b981',
  },
  actionButtonText: {
    color: '#fff',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  // Recent Payments
  paymentHistoryItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
  },
  paymentItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentItemLeft: {
    marginRight: 12,
  },
  paymentItemInfo: {
    flex: 1,
  },
  paymentItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  paymentItemSubtitle: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  paymentItemDescription: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 4,
  },
  paymentItemDate: {
    fontSize: 12,
    color: '#95a5a6',
  },
  paymentItemRight: {
    alignItems: 'flex-end',
  },
  paymentItemAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyPayments: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  emptyPaymentsText: {
    marginTop: 10,
    color: '#7f8c8d',
    fontSize: 14,
  },
  // Upload Section
  uploadSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  uploadInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  uploadTextContainer: {
    marginLeft: 12,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  uploadSubtitle: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  uploadButtonText: {
    color: '#fff',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
    borderRadius: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    flex: 1,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
  },
  balanceHint: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  chipRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  chip: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
  },
  chipText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 12,
  },
  methodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  methodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    marginHorizontal: 4,
    backgroundColor: '#fff',
  },
  methodBtnSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  methodBtnText: {
    color: '#2563EB',
    fontWeight: '500',
    fontSize: 14,
    marginLeft: 6,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    marginRight: 10,
  },
  submitButton: {
    backgroundColor: '#2563EB',
  },
  disabledButton: {
    opacity: 0.6,
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '500',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default ClientDetailsScreen;