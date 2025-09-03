import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, ScrollView,
  TouchableOpacity, Linking, Alert, Modal, TextInput, Platform, FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as LocalAuthentication from 'expo-local-authentication';
import DateTimePicker from '@react-native-community/datetimepicker';
import paymentService from '../../services/paymentService';

const ClientDetailsScreen = () => {
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

  // ✅ fetch client details
  const fetchClientDetails = async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const res = await fetch(`http://192.168.29.44:5000/api/clients/${clientId}`);
      const data = await res.json();
      setClient(data);
      
      // Fetch recent payment history
      const paymentData = await paymentService.getPaymentHistory(clientId, 5);
      setRecentPayments(paymentData.payments);
    } catch (error) {
      Alert.alert("Error", "Failed to fetch client details.");
      setClient(null);
    }
    setLoading(false);
  };

  // ✅ only one useEffect
  useEffect(() => {
    fetchClientDetails();
  }, [clientId]);

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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="add-circle" size={32} color="#2563EB" />
              <Text style={styles.modalTitle}>Add Amount to Balance</Text>
              <Text style={styles.modalSubtitle}>Add money to client's account balance</Text>
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Amount (₹)</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Enter amount" 
                keyboardType="numeric" 
                value={outstandingAmount} 
                onChangeText={setOutstandingAmount} 
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput 
                style={styles.input} 
                placeholder="What is this amount for?" 
                value={outstandingDescription} 
                onChangeText={setOutstandingDescription} 
                multiline
              />
            </View>
            
            <TouchableOpacity style={styles.modalBtn} onPress={handleCreateOutstanding}>
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.modalBtnText}>Add to Balance</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => setShowOutstandingModal(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
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
            <Text style={styles.modalTitle}>Record Payment Made by You</Text>
            <View style={styles.inputContainer}>
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
            {/* Method Selector */}
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
            <TouchableOpacity style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]} onPress={() => setShowDatePicker(true)}>
              <Text style={{ color: manualDate ? '#1F2937' : '#6B7280', fontSize: 15 }}>
                {manualDate ? manualDate : 'Select Date'}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#2563EB" />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={manualDate ? new Date(manualDate) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
                maximumDate={new Date()}
              />
            )}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Note (optional)</Text>
              <TextInput style={styles.input} placeholder="Add a note about this payment" value={manualNote} onChangeText={setManualNote} />
            </View>
            <TouchableOpacity style={styles.modalBtn} onPress={handleManualSubmit}>
              <Text style={styles.modalBtnText}>Submit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Files Section */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>📁 Files ({client.fileCount || 0})</Text>
        {client.fileCount > 0 ? (
          <TouchableOpacity style={styles.linkBtn}><Text style={styles.linkText}>View All Files</Text></TouchableOpacity>
        ) : (
          <Text style={styles.fileText}>No files uploaded yet.</Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  input: {
    width: '100%',
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  button: {
    borderRadius: 5,
    padding: 10,
    elevation: 2,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  buttonClose: {
    backgroundColor: '#ccc',
  },
  buttonSubmit: {
    backgroundColor: '#2196F3',
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
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
    borderRadius: 12,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  clientName: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 2,
    flexShrink: 1,
  },
  clientInfo: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 1,
  },
  completionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  completionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
  },
  paymentText: {
    fontSize: 15,
    color: '#1F2937',
    marginBottom: 2,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    marginTop: 14,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginRight: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 6,
  },
  paymentHistoryItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  paymentItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentItemInfo: {
    flex: 1,
  },
  paymentItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  paymentItemDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  paymentItemRight: {
    alignItems: 'flex-end',
  },
  paymentItemAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  paymentStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 2,
  },
  paymentStatusText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  lastPaymentText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 15,
  },
  paymentItemLeft: {
    marginRight: 12,
    justifyContent: 'center',
  },
  paymentItemSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  paymentItemDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  balanceHint: {
    fontSize: 12,
    color: '#059669',
    marginBottom: 8,
    fontWeight: '500',
  },
  emptyPayments: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyPaymentsText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  fileText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 2,
  },
  linkBtn: {
    marginTop: 6,
  },
  linkText: {
    color: '#2563EB',
    fontWeight: '500',
    fontSize: 14,
  },
  topIconBtn: {
    marginLeft: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    padding: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  modalBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  cancelText: {
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 4,
    fontSize: 15,
  },
  emptyText: {
    color: '#EF4444',
    fontSize: 16,
    textAlign: 'center',
  },
  methodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  methodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  methodBtnSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  methodBtnText: {
    color: '#2563EB',
    fontWeight: '500',
    fontSize: 15,
    marginLeft: 6,
  },
});

export default ClientDetailsScreen;