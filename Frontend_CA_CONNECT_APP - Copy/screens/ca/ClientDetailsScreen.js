import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Linking, Alert, Modal, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { clientService } from '../../services/client';
import * as LocalAuthentication from 'expo-local-authentication';
import DateTimePicker from '@react-native-community/datetimepicker';

const ClientDetailsScreen = () => {
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

  useEffect(() => {
    const fetchClient = async () => {
      setLoading(true);
      try {
        // For demo, get all clients and filter (since getClientById is API-based)
        const res = await clientService.getClients(1, 20, '');
        const found = res.clients.find(c => c.id === clientId);
        setClient(found);
      } catch (e) {
        setClient(null);
      }
      setLoading(false);
    };
    fetchClient();
  }, [clientId]);

  const handleCall = () => {
    if (client?.phoneNumber) {
      Linking.openURL(`tel:${client.phoneNumber}`).catch(() => {
        Alert.alert('Error', 'Unable to open the dialer.');
      });
    }
  };

  const handleMarkAsPaid = async () => {
    // Use local biometric authentication
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

  const handleManualSubmit = () => {
    setModalVisible(false);
    Alert.alert('Success', `Payment marked as paid!\nMethod: ${paymentMethod === 'cash' ? 'Cash' : 'Online Payment'}`);
    // Here you would update the payment status in your backend, including paymentMethod
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

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /></View>;
  }
  if (!client) {
    return <View style={styles.center}><Text style={styles.emptyText}>Client not found.</Text></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      {/* Client Info Card */}
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="person-circle" size={54} color="#2563EB" style={{ marginRight: 14 }} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.clientName}>{client.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity style={styles.topIconBtn} onPress={handleCall}>
                  <Ionicons name="call-outline" size={24} color="#2563EB" />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.clientInfo}>{client.email}</Text>
            <Text style={styles.clientInfo}>{client.phoneNumber}</Text>
            <Text style={styles.clientInfo}>GST: {client.gstNumber}</Text>
            <Text style={styles.clientInfo}>{client.address}</Text>
          </View>
        </View>
      </View>
      {/* Payment Summary */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>💰 Payment Summary</Text>
        <Text style={styles.paymentText}>Total Outstanding: <Text style={{ color: '#EF4444' }}>₹{client.totalOutstanding?.toLocaleString()}</Text></Text>
        <Text style={styles.paymentText}>Total Paid: <Text style={{ color: '#10B981' }}>₹{client.totalPaid?.toLocaleString()}</Text></Text>
        <Text style={styles.paymentText}>Last Payment: 15 Jan 2024</Text>
        <TouchableOpacity style={styles.markPaidBtn} onPress={handleMarkAsPaid}>
          <Ionicons name="checkmark-done-circle" size={20} color="#fff" />
          <Text style={styles.markPaidText}> Mark as Paid</Text>
        </TouchableOpacity>
      </View>
      {/* Mark as Paid Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <>
              <Text style={styles.modalTitle}>Manual Payment Entry</Text>
              <TextInput
                style={styles.input}
                placeholder="Amount Paid"
                keyboardType="numeric"
                value={manualAmount}
                onChangeText={setManualAmount}
              />
              {/* Payment Method Selector */}
              <View style={styles.methodRow}>
                <TouchableOpacity
                  style={[styles.methodBtn, paymentMethod === 'cash' && styles.methodBtnSelected]}
                  onPress={() => setPaymentMethod('cash')}
                >
                  <Ionicons name="cash-outline" size={20} color={paymentMethod === 'cash' ? '#fff' : '#2563EB'} />
                  <Text style={[styles.methodBtnText, paymentMethod === 'cash' && { color: '#fff' }]}> Cash</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.methodBtn, paymentMethod === 'online' && styles.methodBtnSelected]}
                  onPress={() => setPaymentMethod('online')}
                >
                  <Ionicons name="card-outline" size={20} color={paymentMethod === 'online' ? '#fff' : '#2563EB'} />
                  <Text style={[styles.methodBtnText, paymentMethod === 'online' && { color: '#fff' }]}> Online Payment</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                onPress={() => setShowDatePicker(true)}
              >
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
              <TextInput
                style={styles.input}
                placeholder="Note (optional)"
                value={manualNote}
                onChangeText={setManualNote}
              />
              <TouchableOpacity style={styles.modalBtn} onPress={handleManualSubmit}>
                <Text style={styles.modalBtnText}>Submit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </>
          </View>
        </View>
      </Modal>
      {/* Files Section */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>📁 Files (12)</Text>
        <Text style={styles.fileText}>📄 Tax Return 2023-24</Text>
        <Text style={styles.fileText}>📄 GST Return - Dec 2023</Text>
        <Text style={styles.fileText}>📄 Invoice - Jan 2024</Text>
        <Text style={styles.fileText}>📄 Receipt - Payment #123</Text>
        <TouchableOpacity style={styles.linkBtn}><Text style={styles.linkText}>View All Files</Text></TouchableOpacity>
      </View>
      {/* Recent Calls */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>📞 Recent Calls</Text>
        <Text style={styles.fileText}>15 Jan 2024 - 10:30 AM</Text>
        <Text style={styles.fileText}>10 Jan 2024 - 2:15 PM</Text>
        <TouchableOpacity style={styles.linkBtn}><Text style={styles.linkText}>View Call History</Text></TouchableOpacity>
      </View>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 8,
  },
  paymentText: {
    fontSize: 15,
    color: '#1F2937',
    marginBottom: 2,
  },
  markPaidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignSelf: 'flex-start',
    marginTop: 14,
  },
  markPaidText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 6,
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
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '85%',
    alignItems: 'stretch',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
    fontSize: 15,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
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