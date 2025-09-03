import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, ScrollView,
  TouchableOpacity, Linking, Alert, Modal, TextInput, Platform, FlatList
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { mime } from 'react-native-mime-types';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import paymentService from '../../services/paymentService';
import filingService from '../../services/filingService';

// Filing types with their display names and default fees
const FILING_TYPES = [
  { 
    id: 'GST', 
    name: 'GST', 
    defaultFee: 1000, 
    category: 'GST',
    description: 'Goods and Services Tax Return',
    frequency: 'Monthly/Quarterly',
    dueDate: '20th of next month'
  },
  { 
    id: 'ITR', 
    name: 'Income Tax', 
    defaultFee: 2000,
    category: 'Income Tax',
    description: 'Income Tax Return',
    frequency: 'Annual',
    dueDate: 'July 31st (Individual)'
  },
  { 
    id: 'TDS-24Q', 
    name: 'TDS 24Q', 
    defaultFee: 500,
    category: 'TDS',
    description: 'Salary TDS Return',
    frequency: 'Quarterly',
    dueDate: 'Last day of next month'
  },
  { 
    id: 'TDS-26Q', 
    name: 'TDS 26Q', 
    defaultFee: 500,
    category: 'TDS',
    description: 'Non-Salary TDS Return',
    frequency: 'Quarterly',
    dueDate: 'Last day of next month'
  },
  { 
    id: 'GSTR-1', 
    name: 'GSTR-1', 
    defaultFee: 800,
    category: 'GST',
    description: 'Outward Supplies Return',
    frequency: 'Monthly/Quarterly',
    dueDate: '11th of next month'
  },
  { 
    id: 'GSTR-3B', 
    name: 'GSTR-3B', 
    defaultFee: 1000,
    category: 'GST',
    description: 'Monthly Summary Return',
    frequency: 'Monthly',
    dueDate: '20th of next month'
  },
  { 
    id: 'GSTR-9', 
    name: 'GSTR-9', 
    defaultFee: 1500,
    category: 'GST',
    description: 'Annual Return',
    frequency: 'Annual',
    dueDate: 'December 31st'
  },
  { 
    id: 'TDS-27Q', 
    name: 'TDS 27Q', 
    defaultFee: 600,
    category: 'TDS',
    description: 'TDS for Non-Residents',
    frequency: 'Quarterly',
    dueDate: 'Last day of next month'
  },
  { 
    id: 'TDS-26QB', 
    name: 'TDS 26QB', 
    defaultFee: 700,
    category: 'TDS',
    description: 'TDS on Property Purchase',
    frequency: 'On Transaction',
    dueDate: '30 days from end of month'
  }
];

const ClientDetailsScreen = () => {
  const [showFileUploadModal, setShowFileUploadModal] = useState(false);
  const [selectedFileType, setSelectedFileType] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear().toString());
  const [currentMonth, setCurrentMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  
  // Get default fee based on selected file type
  const getDefaultFee = (fileType) => {
    const selectedType = FILING_TYPES.find(type => type.id === fileType);
    return selectedType ? selectedType.defaultFee : '';
  };
  
  // Update fee when file type changes
  useEffect(() => {
    if (selectedFileType) {
      setNewFiling(prev => ({
        ...prev,
        fee: getDefaultFee(selectedFileType)
      }));
    }
  }, [selectedFileType]);

  const handleFileUpload = async () => {
    if (!selectedFileType || !newFiling.fee) return;
    
    setIsUploading(true);
    
    try {
      const financialYear = `${currentYear}-${currentMonth}`;
      const formData = new FormData();
      formData.append('clientId', clientId);
      formData.append('fileType', selectedFileType);
      formData.append('financialYear', financialYear);
      formData.append('month', currentMonth);
      formData.append('fee', newFiling.fee);

      const response = await fetch('http://192.168.29.44:5000/api/filings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await AsyncStorage.getItem('userToken')}`
        },
        body: JSON.stringify({
          clientId,
          type: selectedFileType,
          month: financialYear,
          fee: newFiling.fee,
          status: 'pending'
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        Alert.alert('Success', 'Filing record created successfully!');
        setShowFileUploadModal(false);
        setSelectedFileType('');
        setCurrentYear(new Date().getFullYear().toString());
        setCurrentMonth((new Date().getMonth() + 1).toString().padStart(2, '0'));
        setNewFiling({
          ...newFiling,
          fee: ''
        });
        // Refresh filings list
        fetchClientFilings();
      } else {
        throw new Error(data.message || 'Failed to create filing record');
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', error.message || 'Failed to create filing record. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };
  const [showOutstandingModal, setShowOutstandingModal] = useState(false);
  const [outstandingAmount, setOutstandingAmount] = useState('');
  const [outstandingDescription, setOutstandingDescription] = useState('');
  const route = useRoute();
  const navigation = useNavigation();
  const { clientId } = route.params || {};
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [authStep, setAuthStep] = useState(false);
  const [manualAmount, setManualAmount] = useState('');
  const [manualDate, setManualDate] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [recentPayments, setRecentPayments] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  
  // Filing states
  const [filings, setFilings] = useState([]);
  const [showAddFiling, setShowAddFiling] = useState(false);
  const [newFiling, setNewFiling] = useState({
    type: '',
    month: '',
    fee: '',
    notes: ''
  });
  const [loadingFilings, setLoadingFilings] = useState(false);
  const [token, setToken] = useState('');

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

  // Fetch client filings
  const fetchClientFilings = useCallback(async () => {
    if (!clientId || !token) return;
    setLoadingFilings(true);
    try {
      const filingsData = await filingService.getClientFilings(clientId, token);
      setFilings(filingsData);
    } catch (error) {
      console.error('Error fetching filings:', error);
      Alert.alert('Error', 'Failed to fetch filing details.');
    }
    setLoadingFilings(false);
  }, [clientId, token]);

  // ✅ fetch client details
  const fetchClientDetails = async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const [clientRes, paymentData] = await Promise.all([
        fetch(`http://192.168.29.44:5000/api/clients/${clientId}`),
        paymentService.getPaymentHistory(clientId, 5)
      ]);
      
      const clientData = await clientRes.json();
      setClient(clientData);
      setRecentPayments(paymentData.payments);
      
      // Fetch filings if token is available
      if (token) {
        await fetchClientFilings();
      }
    } catch (error) {
      console.error('Error in fetchClientDetails:', error);
      Alert.alert("Error", "Failed to fetch client details.");
      setClient(null);
    }
    setLoading(false);
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

  // Handle filing type change
  const handleFilingTypeChange = (type) => {
    const selectedType = FILING_TYPES.find(t => t.id === type);
    setNewFiling(prev => ({
      ...prev,
      type,
      fee: selectedType ? selectedType.defaultFee.toString() : ''
    }));
  };

  // Handle month change
  const handleMonthChange = (month) => {
    setNewFiling(prev => ({
      ...prev,
      month: month
    }));
  };

  // Save new filing
  const handleSaveFiling = async () => {
    if (!newFiling.type || !newFiling.month) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      await filingService.saveFiling(
        {
          clientId,
          type: newFiling.type,
          month: newFiling.month,
          fee: parseFloat(newFiling.fee) || 0,
          notes: newFiling.notes,
          status: 'pending'
        },
        token
      );
      
      setShowAddFiling(false);
      setNewFiling({
        type: 'GST',
        month: new Date().toISOString().slice(0, 7),
        fee: '',
        notes: ''
      });
      
      await fetchClientFilings();
      Alert.alert('Success', 'Filing added successfully');
    } catch (error) {
      console.error('Error saving filing:', error);
      Alert.alert('Error', error.message || 'Failed to save filing');
    }
  };

  // Mark filing as filed
  const handleMarkAsFiled = async (filingId) => {
    try {
      await filingService.markFilingAsFiled(filingId, '', token);
      await fetchClientFilings();
      Alert.alert('Success', 'Filing marked as filed');
    } catch (error) {
      console.error('Error marking as filed:', error);
      Alert.alert('Error', error.message || 'Failed to update filing status');
    }
  };

  // Delete filing
  const handleDeleteFiling = async (filingId) => {
    try {
      await filingService.deleteFiling(filingId, token);
      await fetchClientFilings();
      Alert.alert('Success', 'Filing deleted successfully');
    } catch (error) {
      console.error('Error deleting filing:', error);
      Alert.alert('Error', error.message || 'Failed to delete filing');
    }
  };

  // Add Outstanding
  const handleCreateOutstanding = async () => {
    if (!outstandingAmount || !outstandingDescription) {
      Alert.alert("Error", "Please enter both amount and description.");
      return;
    }

    try {
      await paymentService.createOutstandingPayment(
        clientId,
        parseFloat(outstandingAmount),
        outstandingDescription
      );

      Alert.alert("Success", "Outstanding payment request added successfully ✅");
      setShowOutstandingModal(false);
      setOutstandingAmount("");
      setOutstandingDescription("");
      fetchClientDetails();
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const handleCall = () => {
    if (client?.phone) {
      Linking.openURL(`tel:${client.phone}`).catch(() => {
        Alert.alert("Error", "Unable to open the dialer.");
      });
    }
  };

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
      setAuthStep(true);
      setModalVisible(true);
      setManualAmount('');
      setManualDate('');
      setManualNote('');
    } else {
      Alert.alert('Authentication Failed', 'Could not authenticate.');
    }
  };

  const handleManualSubmit = async () => {
    if (!manualAmount || !manualDate) {
      Alert.alert('Missing Information', 'Please enter amount and select date');
      return;
    }

    const paymentAmount = parseFloat(manualAmount);
    const currentBalance = client.totalOutstanding || 0;

    if (paymentAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0');
      return;
    }

    if (paymentAmount > currentBalance) {
      Alert.alert(
        'Amount Too High', 
        `Maximum amount you can record is ₹${currentBalance.toLocaleString()}`,
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const paymentData = {
        clientId,
        amount: paymentAmount,
        paymentMethod,
        description: manualNote || 'Payment made',
        paidAt: new Date(manualDate).toISOString()
      };

      await paymentService.recordManualPayment(paymentData);

      Alert.alert('Payment Recorded', `₹${paymentAmount.toLocaleString()} payment recorded successfully`);
      setModalVisible(false);
      setManualAmount('');
      setManualNote('');
      setManualDate('');
      fetchClientDetails();
    } catch (error) {
      console.error('Payment recording failed:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Something went wrong';
      Alert.alert('Recording Failed', errorMessage);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-GB', options);
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const yyyy = selectedDate.getFullYear();
      const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const dd = String(selectedDate.getDate()).padStart(2, '0');
      setManualDate(`${yyyy}-${mm}-${dd}`);
    }
  };

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
        color: '#2563EB',
        icon: 'add-circle',
        prefix: '+'
      };
    }
  };

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

  const navigateToPaymentHistory = () => {
    navigation.navigate('PaymentHistory', { 
      clientId, 
      clientName: client?.name || 'Client' 
    });
  };

  const renderFilingItem = ({ item }) => {
    const filingType = FILING_TYPES.find(ft => ft.id === item.type);
    const status = item.status?.toLowerCase() || 'pending';
    
    const statusColors = {
      pending: { bg: '#fef3c7', text: '#92400e', icon: 'time-outline' },
      completed: { bg: '#dcfce7', text: '#166534', icon: 'checkmark-done-circle' },
      filed: { bg: '#dbeafe', text: '#1e40af', icon: 'document-text' },
      overdue: { bg: '#fee2e2', text: '#991b1b', icon: 'alert-circle' },
    };

    const statusConfig = statusColors[status] || statusColors.pending;

    return (
      <View style={styles.filingItem}>
        <View style={styles.filingIconContainer}>
          <Ionicons 
            name={filingType?.category === 'GST' ? 'receipt' : 'document-text'} 
            size={24} 
            color={statusConfig.text} 
          />
        </View>
        
        <View style={styles.filingContent}>
          <View style={styles.filingHeader}>
            <Text style={styles.filingType} numberOfLines={1}>
              {filingType?.name || item.type}
            </Text>
            <Text style={[styles.filingFee, { color: statusConfig.text }]}>
              ₹{parseFloat(item.fee || 0).toLocaleString()}
            </Text>
          </View>
          
          <Text style={styles.filingDescription} numberOfLines={1}>
            {filingType?.description || ''}
          </Text>
          
          <View style={styles.filingFooter}>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
              <Ionicons 
                name={statusConfig.icon} 
                size={14} 
                color={statusConfig.text} 
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.statusText, { color: statusConfig.text }]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </View>
            
            <Text style={styles.filingDate}>
              {item.month} • {filingType?.frequency || 'N/A'}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.filingAction}
          onPress={() => handleDeleteFiling(item._id)}
        >
          <Ionicons name="ellipsis-vertical" size={18} color="#94a3b8" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyFilings = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={48} color="#9CA3AF" />
      <Text style={styles.emptyText}>No filings found</Text>
      <Text style={styles.emptySubtext}>Add a new filing to get started</Text>
    </View>
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /></View>;
  }
  if (!client) {
    return <View style={styles.center}><Text style={styles.emptyText}>Client not found.</Text></View>;
  }

  const completionStatus = client.totalOutstanding === 0 ? 'completed' : 'pending';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      {/* Client Info */}
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="person-circle" size={54} color="#2563EB" style={{ marginRight: 14 }} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.clientName}>{client.name}</Text>
              <TouchableOpacity style={styles.topIconBtn} onPress={handleCall}>
                <Ionicons name="call-outline" size={24} color="#2563EB" />
              </TouchableOpacity>
            </View>
            <Text style={styles.clientInfo}>{client.email}</Text>
            <Text style={styles.clientInfo}>{client.phoneNumber}</Text>
            <Text style={styles.clientInfo}>GST: {client.gstNumber}</Text>
            <Text style={styles.clientInfo}>{client.address}</Text>
            
            {/* Status Badge */}
            <View style={[styles.completionBadge, { 
              backgroundColor: completionStatus === 'completed' ? '#10B981' : '#F59E0B' 
            }]}>
              <Ionicons 
                name={completionStatus === 'completed' ? 'checkmark-circle' : 'time-outline'} 
                size={16} 
                color="#fff" 
              />
              <Text style={styles.completionText}>
                {(client.totalOutstanding || 0) > 0 ? 'Payments Pending' : 'All Payments Complete'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Add Amount Modal */}
      <Modal animationType="slide" transparent={true} visible={showOutstandingModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { borderRadius: 20, paddingHorizontal: 24 }]}>
            {/* Header */}
            <View style={[styles.modalHeader, { paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ backgroundColor: '#EBF5FF', padding: 10, borderRadius: 12 }}>
                  <Ionicons name="wallet-outline" size={32} color="#2563EB" />
                </View>
                <View style={{ marginLeft: 16 }}>
                  <Text style={[styles.modalTitle, { fontSize: 24, fontWeight: '600' }]}>Add Balance</Text>
                  <Text style={[styles.headerSubtitle, { color: '#6B7280', marginTop: 4 }]}>
                    Top up the client's balance
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                onPress={() => setShowOutstandingModal(false)} 
                style={[styles.closeButton, { backgroundColor: '#F3F4F6', borderRadius: 50, padding: 8 }]}
              >
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            {/* Quick Amount Selection */}
            <View style={[styles.chipRow, { marginTop: 24, marginBottom: 20 }]}>
              {['500','1000','2000','5000'].map(preset => (
                <TouchableOpacity 
                  key={preset} 
                  style={[
                    styles.chip,
                    { 
                      backgroundColor: outstandingAmount === preset ? '#2563EB' : '#F3F4F6',
                      paddingVertical: 12,
                      paddingHorizontal: 20,
                      borderRadius: 12,
                      marginRight: 12
                    }
                  ]} 
                  onPress={() => setOutstandingAmount(preset)}
                >
                  <Text style={[
                    styles.chipText,
                    { color: outstandingAmount === preset ? '#FFFFFF' : '#374151', fontSize: 16 }
                  ]}>₹{preset}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Amount Input */}
            <View style={[styles.inputContainer, { marginBottom: 24 }]}>
              <Text style={[styles.inputLabel, { fontSize: 16, marginBottom: 8, color: '#374151' }]}>
                Amount (₹)
              </Text>
              <View style={{ 
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#F9FAFB',
                borderRadius: 12,
                paddingHorizontal: 16,
                borderWidth: 1,
                borderColor: '#E5E7EB'
              }}>
                <Ionicons name="cash-outline" size={24} color="#6B7280" />
                <TextInput 
                  style={[styles.input, { 
                    flex: 1,
                    marginLeft: 12,
                    fontSize: 18,
                    paddingVertical: 12
                  }]}
                  placeholder="Enter custom amount"
                  keyboardType="numeric"
                  value={outstandingAmount}
                  onChangeText={setOutstandingAmount}
                />
              </View>
            </View>

            {/* Description Input */}
            <View style={[styles.inputContainer, { marginBottom: 24 }]}>
              <Text style={[styles.inputLabel, { fontSize: 16, marginBottom: 8, color: '#374151' }]}>
                Description
              </Text>
              <View style={{
                backgroundColor: '#F9FAFB',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#E5E7EB'
              }}>
                <TextInput 
                  style={[styles.textArea, { 
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    fontSize: 16,
                    minHeight: 100,
                    textAlignVertical: 'top'
                  }]}
                  placeholder="What is this amount for?"
                  value={outstandingDescription}
                  onChangeText={setOutstandingDescription}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>

            {/* Action Buttons */}
            <View style={[styles.modalActions, { 
              paddingTop: 16,
              borderTopWidth: 1,
              borderTopColor: '#E5E7EB',
              marginTop: 'auto'
            }]}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton, { 
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  borderRadius: 12,
                  backgroundColor: '#F3F4F6'
                }]} 
                onPress={() => setShowOutstandingModal(false)}
              >
                <Text style={[styles.cancelButtonText, { fontSize: 16, color: '#374151' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.modalButton, 
                  styles.submitButton,
                  { 
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    borderRadius: 12,
                    backgroundColor: (!outstandingAmount || !outstandingDescription) ? '#93C5FD' : '#2563EB',
                    flexDirection: 'row',
                    alignItems: 'center'
                  }
                ]}
                onPress={handleCreateOutstanding}
                disabled={!outstandingAmount || !outstandingDescription}
              >
                <Ionicons name="add-circle-outline" size={24} color="#fff" style={{ marginRight: 8 }} />
                <Text style={[styles.submitButtonText, { fontSize: 16 }]}>Add to Balance</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment Summary */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>💰 Payment Summary</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Added</Text>
            <Text style={[styles.summaryAmount, { color: '#2563EB' }]}>
              ₹{client.totalAdded?.toLocaleString() || '0'}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Paid</Text>
            <Text style={[styles.summaryAmount, { color: '#10B981' }]}>
              ₹{client.totalPaid?.toLocaleString() || '0'}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Balance</Text>
            <Text style={[styles.summaryAmount, { color: '#EF4444' }]}>
              ₹{client.totalOutstanding?.toLocaleString() || '0'}
            </Text>
          </View>
        </View>
        <Text style={styles.lastPaymentText}>Last Payment: {formatDate(client.lastPaymentDate)}</Text>
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={() => setShowOutstandingModal(true)}>
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Add Amount to Balance</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleMarkAsPaid}>
            <Ionicons name="checkmark-done-circle" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Record Payment</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Payments */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📋 Recent Payments</Text>
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

      {/* Manual Payment Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Ionicons name="card-outline" size={28} color="#10B981" />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.modalTitle}>Record Payment</Text>
                  <Text style={styles.headerSubtitle}>Deduct from client's outstanding balance</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <View style={[styles.inputContainer, styles.modalField]}>
              <Ionicons name="pricetag-outline" size={20} color="#6B7280" style={styles.inputIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Amount Paid (₹)</Text>
                <Text style={styles.balanceHint}>Available Balance: ₹{(client.totalOutstanding || 0).toLocaleString()}</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Enter amount" 
                  keyboardType="numeric" 
                  value={manualAmount} 
                  onChangeText={(text) => {
                    const numericValue = parseFloat(text) || 0;
                    const currentBalance = client.totalOutstanding || 0;
                    if (text === '' || numericValue <= currentBalance) {
                      setManualAmount(text);
                    }
                  }}
                />
              </View>
            </View>
            
            {/* Method Selector */}
            <View style={[styles.inputContainer, styles.modalField]}>
              <Text style={styles.inputLabel}>Payment Method</Text>
              <View style={styles.methodRow}>
                <TouchableOpacity style={[styles.methodBtn, paymentMethod === 'cash' && styles.methodBtnSelected]} onPress={() => setPaymentMethod('cash')}>
                  <Ionicons name="cash-outline" size={20} color={paymentMethod === 'cash' ? '#fff' : '#2563EB'} />
                  <Text style={[styles.methodBtnText, paymentMethod === 'cash' && { color: '#fff' }]}> Cash</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.methodBtn, paymentMethod === 'online' && styles.methodBtnSelected]} onPress={() => setPaymentMethod('online')}>
                  <Ionicons name="card-outline" size={20} color={paymentMethod === 'online' ? '#fff' : '#2563EB'} />
                  <Text style={[styles.methodBtnText, paymentMethod === 'online' && { color: '#fff' }]}> Online</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={[styles.inputContainer, styles.modalField]}>
              <Ionicons name="calendar-outline" size={20} color="#6B7280" style={styles.inputIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Payment Date</Text>
                <TouchableOpacity style={[styles.input, styles.dateInput]} onPress={() => setShowDatePicker(true)}>
                  <Text style={{ color: manualDate ? '#1F2937' : '#6B7280', fontSize: 15 }}>
                    {manualDate ? manualDate : 'Select Date'}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color="#2563EB" />
                </TouchableOpacity>
              </View>
              {showDatePicker && (
                <DateTimePicker
                  value={manualDate ? new Date(manualDate) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
                  maximumDate={new Date()}
                />
              )}
            </View>
            
            <View style={[styles.inputContainer, styles.modalField]}>
              <Ionicons name="chatbox-ellipses-outline" size={20} color="#6B7280" style={styles.inputIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Note (optional)</Text>
                <TextInput 
                  style={[styles.input, styles.textArea]} 
                  placeholder="Add a note about this payment" 
                  value={manualNote} 
                  onChangeText={setManualNote} 
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>
            
            <View style={styles.divider} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.submitButton, (!manualAmount || !manualDate) && styles.disabledButton]} 
                onPress={handleManualSubmit}
                disabled={!manualAmount || !manualDate}
              >
                <Text style={styles.submitButtonText}>Submit Payment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Filing Status Section */}
      <View style={[styles.card, { marginTop: 16 }]}>
        <View style={[styles.sectionHeader, { marginBottom: 12 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="document-text-outline" size={20} color="#2563EB" style={{ marginRight: 8 }} />
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Filing Status</Text>
          </View>
          <TouchableOpacity 
            style={styles.addFilingButton}
            onPress={() => setShowAddFiling(true)}
          >
            <Ionicons name="add" size={16} color="#fff" style={{ marginRight: 4 }} />
            <Text style={styles.addFilingButtonText}>New Filing</Text>
          </TouchableOpacity>
        </View>

        {loadingFilings ? (
          <ActivityIndicator size="small" color="#2563EB" />
        ) : (
          <View style={styles.filingsList}>
            {filings.length > 0 ? (
              <FlatList
                data={filings}
                renderItem={renderFilingItem}
                keyExtractor={(item) => item._id}
                contentContainerStyle={styles.filingsContainer}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              renderEmptyFilings()
            )}
          </View>
        )}
      </View>

      {/* Add Filing Modal */}
      <Modal
        visible={showAddFiling}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddFiling(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="document-text-outline" size={24} color="#2563EB" />
                <Text style={[styles.modalTitle, { marginLeft: 8 }]}>New Filing</Text>
              </View>
              <TouchableOpacity 
                onPress={() => setShowAddFiling(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, width: '100%' }}>
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Filing Type</Text>
                <View style={[styles.pickerContainer, { minHeight: 50 }]}>
                  <Ionicons name="document-text-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                  <Picker
                    selectedValue={newFiling.type}
                    onValueChange={handleFilingTypeChange}
                    style={[styles.picker, { height: 48 }]}
                    dropdownIconColor="#6B7280"
                    mode="dropdown"
                  >
                    {FILING_TYPES.map((type) => (
                      <Picker.Item 
                        key={type.id} 
                        label={type.name} 
                        value={type.id}
                        style={{ 
                          fontSize: 16,
                          height: 50,
                          paddingVertical: 12
                        }}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Period</Text>
                <View style={[styles.pickerContainer, { paddingRight: 0 }]}>
                  <Ionicons name="calendar" size={20} color="#6B7280" style={styles.inputIcon} />
                  <View style={{ flex: 1, flexDirection: 'row' }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[styles.inputLabel, { marginBottom: 4, fontSize: 12 }]}>Month</Text>
                      <Picker
                        selectedValue={newFiling.month?.split('-')[1] || ''}
                        onValueChange={(month) => {
                          const year = newFiling.month?.split('-')[0] || new Date().getFullYear();
                          handleMonthChange(`${year}-${month.padStart(2, '0')}`);
                        }}
                        style={[styles.picker, { height: 44 }]}
                        dropdownIconColor="#6B7280"
                      >
                        {Array.from({length: 12}, (_, i) => {
                          const month = (i + 1).toString().padStart(2, '0');
                          return (
                            <Picker.Item 
                              key={month} 
                              label={new Date(2000, i).toLocaleString('default', { month: 'long' })} 
                              value={month}
                            />
                          );
                        })}
                      </Picker>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Fee (₹)</Text>
                <View style={styles.pickerContainer}>
                  <Ionicons name="cash" size={20} color="#6B7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={newFiling.fee}
                    onChangeText={(text) => setNewFiling({...newFiling, fee: text})}
                    placeholder="Enter fee amount"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Notes (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={newFiling.notes}
                  onChangeText={(text) => setNewFiling({...newFiling, notes: text})}
                  placeholder="Add any notes here"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowAddFiling(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.submitButton]}
                  onPress={handleSaveFiling}
                >
                  <Text style={styles.submitButtonText}>Save Filing</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Files Section */}
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={styles.sectionTitle}>📁 Files ({client.fileCount || 0})</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowFileUploadModal(true)}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Upload File</Text>
          </TouchableOpacity>
        </View>
        
        {client.fileCount > 0 ? (
          <TouchableOpacity style={styles.linkBtn} onPress={() => {}}>
            <Text style={styles.linkText}>View All Files</Text>
            <Ionicons name="chevron-forward" size={16} color="#2563EB" />
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="document-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyStateText}>No files uploaded yet</Text>
            <Text style={styles.emptyStateSubtext}>Upload documents, receipts, or any client files</Text>
          </View>
        )}
      </View>

      {/* File Upload Modal */}
      <Modal
        visible={showFileUploadModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFileUploadModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%', padding: 20 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Ionicons name="cloud-upload-outline" size={26} color="#2563EB" />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.modalTitle}>Upload File</Text>
                  <Text style={styles.headerSubtitle}>Tag the file to a filing type and period</Text>
                </View>
              </View>
              <TouchableOpacity 
                onPress={() => setShowFileUploadModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={[styles.formGroup, styles.modalField, { marginBottom: 16 }]}>
              <Text style={styles.inputLabel}>Filing Type</Text>
              <View style={styles.pickerContainer}>
                <Ionicons name="document-text-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                <Picker
                  selectedValue={selectedFileType}
                  onValueChange={setSelectedFileType}
                  style={[styles.picker, { width: '100%' }]}
                  dropdownIconColor="#6B7280"
                >
                  <Picker.Item label="Select Filing Type" value="" />
                  {FILING_TYPES.map((type) => (
                    <Picker.Item 
                      key={type.id} 
                      label={`${type.name} (${type.category})`} 
                      value={type.id}
                    />
                  ))}
                </Picker>
              </View>
              {!!selectedFileType && (
                <Text style={styles.helperText}>Default fee will auto-fill based on selection</Text>
              )}
            </View>

            <View style={[styles.row, styles.modalField, { marginBottom: 16 }]}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Year</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={currentYear}
                    onChangeText={setCurrentYear}
                    keyboardType="numeric"
                    placeholder="YYYY"
                    maxLength={4}
                  />
                </View>
              </View>
              
              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>Month</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={currentMonth}
                    onChangeText={(text) => {
                      // Ensure month is between 1 and 12
                      const month = parseInt(text) || '';
                      if (month === '' || (month >= 1 && month <= 12)) {
                        setCurrentMonth(month ? month.toString().padStart(2, '0') : '');
                      }
                    }}
                    keyboardType="numeric"
                    placeholder="MM"
                    maxLength={2}
                  />
                </View>
              </View>
            </View>

            <View style={[styles.formGroup, styles.modalField]}>
              <Text style={styles.inputLabel}>Fee Amount (₹)</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="cash" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={newFiling.fee}
                  onChangeText={(text) => setNewFiling({...newFiling, fee: text})}
                  placeholder="Enter fee amount"
                  keyboardType="numeric"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <Text style={styles.helperText}>You can adjust this fee before submitting</Text>
            </View>

            <View style={styles.divider} />
            <View style={[styles.modalFooter, { marginTop: 12 }]}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowFileUploadModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.modalButton, 
                  styles.submitButton,
                  (!selectedFileType || !newFiling.fee) && styles.disabledButton
                ]}
                onPress={handleFileUpload}
                disabled={!selectedFileType || !newFiling.fee || isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  clientName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
    flexShrink: 1,
  },
  clientInfo: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 2,
  },
  completionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  completionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  // Action Buttons
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1,
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 8,
  },
  
  // Link Styles
  linkBtn: {
    marginTop: 8,
  },
  linkText: {
    color: '#2563EB',
    fontWeight: '500',
    fontSize: 14,
  },
  
  // File Styles
  fileText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 2,
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
    padding: 16,
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
    flex: 1,
    marginLeft: 8,
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
  
  // Form Elements
  formGroup: {
    marginBottom: 16,
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
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    marginBottom: 16,
  },
  picker: {
    flex: 1,
    height: 44,
    color: '#111827',
  },
  inputIcon: {
    marginRight: 8,
    color: '#6B7280',
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  
  // Modal Actions
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
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
  
  // Method Selector
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
    borderRadius: 10,
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
  methodBtnSelectedText: {
    color: '#fff',
  },
  
  // Empty States
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    marginBottom: 16,
  },
  picker: {
    flex: 1,
    height: 50,
    color: '#1F2937',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#F9FAFB',
  },
  modalField: {
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 8,
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  addButtonText: {
    color: '#fff',
    marginLeft: 6,
    fontWeight: '500',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginTop: 8,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    backgroundColor: '#F9FAFB',
  },
  uploadText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    textAlign: 'center',
  },
  uploadSubtext: {
    marginTop: 4,
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  changeFileButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
  },
  changeFileText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.6,
  },
  chipRow: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 8,
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
  
  // Status Badges
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  
  // Balance Hint
  balanceHint: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  
  // Date Input
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 12,
  },
});

export default ClientDetailsScreen;