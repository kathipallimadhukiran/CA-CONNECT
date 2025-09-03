import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Modal from 'react-native-modal';

const AddAmountModal = ({
  isVisible,
  onClose,
  outstandingAmount,
  setOutstandingAmount,
  outstandingDescription,
  setOutstandingDescription,
  handleCreateOutstanding
}) => {
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
        {/* Header */}
        <View style={styles.modalHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={styles.iconContainer}>
              <Ionicons name="wallet-outline" size={32} color="#2563EB" />
            </View>
            <View style={{ marginLeft: 16 }}>
              <Text style={styles.modalTitle}>Add Balance</Text>
              <Text style={styles.headerSubtitle}>
                Top up the client's balance
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* Quick Amount Selection */}
        <View style={styles.chipRow}>
          {['500','1000','2000','5000'].map(preset => (
            <TouchableOpacity 
              key={preset} 
              style={[
                styles.chip,
                { 
                  backgroundColor: outstandingAmount === preset ? '#2563EB' : '#F3F4F6',
                }
              ]} 
              onPress={() => setOutstandingAmount(preset)}
            >
              <Text style={[
                styles.chipText,
                { color: outstandingAmount === preset ? '#FFFFFF' : '#374151' }
              ]}>₹{preset}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Amount Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Amount (₹)</Text>
          <View style={styles.amountInputContainer}>
            <Ionicons name="cash-outline" size={24} color="#6B7280" />
            <TextInput 
              style={styles.amountInput}
              placeholder="Enter custom amount"
              keyboardType="numeric"
              value={outstandingAmount}
              onChangeText={setOutstandingAmount}
            />
          </View>
        </View>

        {/* Description Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Description</Text>
          <View style={styles.textAreaContainer}>
            <TextInput 
              style={styles.textArea}
              placeholder="What is this amount for?"
              value={outstandingDescription}
              onChangeText={setOutstandingDescription}
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        {/* Action Buttons */}
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
              (!outstandingAmount || !outstandingDescription) && styles.disabledButton
            ]}
            onPress={handleCreateOutstanding}
            disabled={!outstandingAmount || !outstandingDescription}
          >
            <Ionicons name="add-circle-outline" size={24} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.submitButtonText}>Add to Balance</Text>
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
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  iconContainer: {
    backgroundColor: '#EBF5FF',
    padding: 10,
    borderRadius: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
  },
  headerSubtitle: {
    color: '#6B7280',
    marginTop: 4,
    fontSize: 14,
  },
  closeButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 50,
    padding: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 24,
    marginBottom: 20,
  },
  chip: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginRight: 12,
    marginBottom: 12,
  },
  chipText: {
    fontSize: 16,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: '#374151',
    fontWeight: '500',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  amountInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 18,
    paddingVertical: 12,
    color: '#111827',
  },
  textAreaContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    color: '#111827',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 'auto',
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  submitButton: {
    backgroundColor: '#2563EB',
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

export default AddAmountModal;
