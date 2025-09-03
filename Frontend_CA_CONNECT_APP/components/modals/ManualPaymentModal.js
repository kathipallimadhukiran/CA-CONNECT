import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Modal from 'react-native-modal';
import DateTimePicker from '@react-native-community/datetimepicker';

const ManualPaymentModal = ({
  isVisible,
  onClose,
  manualAmount,
  setManualAmount,
  paymentMethod,
  setPaymentMethod,
  manualDate,
  setManualDate,
  showDatePicker,
  setShowDatePicker,
  manualNote,
  setManualNote,
  handleManualSubmit,
  client
}) => {
  const [selectedDate, setSelectedDate] = useState(manualDate ? new Date(manualDate) : new Date());

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || manualDate;
    setShowDatePicker(Platform.OS === 'ios');
    setManualDate(currentDate.toISOString().split('T')[0]);
  };

  return (
    <Modal 
      isVisible={isVisible}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      backdropTransitionOutTiming={0}
      onBackdropPress={onClose}
      style={styles.modal}
    >
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <View style={styles.headerContent}>
            <Ionicons name="card-outline" size={28} color="#10B981" />
            <View style={styles.headerText}>
              <Text style={styles.modalTitle}>Record Payment</Text>
              <Text style={styles.headerSubtitle}>Deduct from client's outstanding balance</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={22} color="#6B7280" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.inputContainer}>
          <View style={styles.inputWithIcon}>
            <Ionicons name="pricetag-outline" size={20} color="#6B7280" style={styles.inputIcon} />
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Amount Paid (₹)</Text>
              <Text style={styles.balanceHint}>
                Available Balance: ₹{(client.totalOutstanding || 0).toLocaleString()}
              </Text>
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
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Payment Method</Text>
          <View style={styles.methodRow}>
            <TouchableOpacity 
              style={[
                styles.methodBtn, 
                paymentMethod === 'cash' && styles.methodBtnSelected
              ]} 
              onPress={() => setPaymentMethod('cash')}
            >
              <Ionicons 
                name="cash-outline" 
                size={20} 
                color={paymentMethod === 'cash' ? '#fff' : '#2563EB'} 
              />
              <Text style={[
                styles.methodBtnText, 
                paymentMethod === 'cash' && styles.methodBtnTextSelected
              ]}>
                Cash
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.methodBtn, 
                paymentMethod === 'online' && styles.methodBtnSelected
              ]} 
              onPress={() => setPaymentMethod('online')}
            >
              <Ionicons 
                name="card-outline" 
                size={20} 
                color={paymentMethod === 'online' ? '#fff' : '#2563EB'} 
              />
              <Text style={[
                styles.methodBtnText, 
                paymentMethod === 'online' && styles.methodBtnTextSelected
              ]}>
                Online
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.inputContainer}>
          <View style={styles.inputWithIcon}>
            <Ionicons name="calendar-outline" size={20} color="#6B7280" style={styles.inputIcon} />
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Payment Date</Text>
              <TouchableOpacity 
                style={styles.dateInput} 
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={[styles.dateText, !manualDate && styles.placeholderText]}>
                  {manualDate || 'Select Date'}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#2563EB" />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
                  maximumDate={new Date()}
                />
              )}
            </View>
          </View>
        </View>
        
        <View style={styles.inputContainer}>
          <View style={styles.inputWithIcon}>
            <Ionicons name="chatbox-ellipses-outline" size={20} color="#6B7280" style={styles.inputIcon} />
            <View style={styles.inputWrapper}>
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
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.modalActions}>
          <TouchableOpacity 
            style={[styles.modalButton, styles.cancelButton]} 
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.modalButton, 
              styles.submitButton, 
              (!manualAmount || !manualDate) && styles.disabledButton
            ]} 
            onPress={handleManualSubmit}
            disabled={!manualAmount || !manualDate}
          >
            <Text style={styles.submitButtonText}>Submit Payment</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerText: {
    marginLeft: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  headerSubtitle: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    marginRight: 12,
  },
  inputWrapper: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
    fontWeight: '500',
  },
  balanceHint: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  methodRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  methodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2563EB',
    marginRight: 12,
    backgroundColor: '#fff',
  },
  methodBtnSelected: {
    backgroundColor: '#2563EB',
  },
  methodBtnText: {
    marginLeft: 8,
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '500',
  },
  methodBtnTextSelected: {
    color: '#fff',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateText: {
    color: '#111827',
    fontSize: 16,
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  submitButton: {
    backgroundColor: '#10B981',
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ManualPaymentModal;
