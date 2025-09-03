import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Modal from 'react-native-modal';
import DateTimePicker from '@react-native-community/datetimepicker';

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
 
];

const AddFilingModal = ({
  isVisible,
  onClose,
  filingType,
  setFilingType,
  filingPeriod,
  setFilingPeriod,
  filingYear,
  setFilingYear,
  filingStatus,
  setFilingStatus,
  filingNotes,
  setFilingNotes,
  filingFee,
  setFilingFee,
  filingDueDate,
  setFilingDueDate,
  showFilingDatePicker,
  setShowFilingDatePicker,
  handleAddFiling,
  isEditMode = false
}) => {
  const [selectedType, setSelectedType] = useState(
    FILING_TYPES.find(type => type.id === filingType) || null
  );
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setFilingType(type.id);
    setFilingFee(type.defaultFee.toString());
  };

  const handleYearChange = (event, selectedDate) => {
    setShowYearPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setFilingYear(selectedDate.getFullYear().toString());
    }
  };

  const handleDueDateChange = (event, selectedDate) => {
    setShowDueDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setFilingDueDate(selectedDate.toISOString().split('T')[0]);
    }
  };

  const renderTypeItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.typeItem,
        selectedType?.id === item.id && styles.typeItemSelected
      ]}
      onPress={() => handleTypeSelect(item)}
    >
      <View style={styles.typeInfo}>
        <Text style={styles.typeName}>{item.name}</Text>
        <Text style={styles.typeDescription}>{item.description}</Text>
        <View style={styles.typeMeta}>
          <Text style={styles.typeMetaText}>Fee: ₹{item.defaultFee}</Text>
          <Text style={styles.typeMetaText}>•</Text>
          <Text style={styles.typeMetaText}>{item.frequency}</Text>
          <Text style={styles.typeMetaText}>•</Text>
          <Text style={styles.typeMetaText}>Due: {item.dueDate}</Text>
        </View>
      </View>
      {selectedType?.id === item.id && (
        <Ionicons name="checkmark-circle" size={24} color="#10B981" />
      )}
    </TouchableOpacity>
  );

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
            <Ionicons 
              name={isEditMode ? "pencil-outline" : "add-circle-outline"} 
              size={28} 
              color="#2563EB" 
            />
            <View style={styles.headerText}>
              <Text style={styles.modalTitle}>
                {isEditMode ? 'Edit Filing' : 'Add New Filing'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {isEditMode 
                  ? 'Update the filing details' 
                  : 'Select the type of filing and provide the required information'}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView}>
          {/* Filing Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Filing Type</Text>
            <View style={styles.typeList}>
              {FILING_TYPES.map((type) => (
                <View key={type.id} style={styles.typeItemContainer}>
                  {renderTypeItem({ item: type })}
                </View>
              ))}
            </View>
          </View>

          {selectedType && (
            <>
              {/* Filing Details */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Filing Details</Text>
                
                {/* Period */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Period (e.g., Apr-Jun 2023)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter period"
                    value={filingPeriod}
                    onChangeText={setFilingPeriod}
                  />
                </View>

                {/* Year */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Assessment Year</Text>
                  <TouchableOpacity 
                    style={styles.dateInput}
                    onPress={() => setShowYearPicker(true)}
                  >
                    <Text style={[styles.dateText, !filingYear && styles.placeholderText]}>
                      {filingYear || 'Select Year'}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color="#2563EB" />
                  </TouchableOpacity>
                  {showYearPicker && (
                    <DateTimePicker
                      value={filingYear ? new Date(parseInt(filingYear), 0, 1) : new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleYearChange}
                      maximumDate={new Date()}
                    />
                  )}
                </View>

                {/* Status */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Status</Text>
                  <View style={styles.statusContainer}>
                    {['Pending', 'In Progress', 'Completed', 'Filed'].map((status) => (
                      <TouchableOpacity
                        key={status}
                        style={[
                          styles.statusChip,
                          filingStatus === status && styles.statusChipSelected
                        ]}
                        onPress={() => setFilingStatus(status)}
                      >
                        <Text
                          style={[
                            styles.statusChipText,
                            filingStatus === status && styles.statusChipTextSelected
                          ]}
                        >
                          {status}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Due Date */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Due Date</Text>
                  <TouchableOpacity 
                    style={styles.dateInput}
                    onPress={() => setShowDueDatePicker(true)}
                  >
                    <Text style={[styles.dateText, !filingDueDate && styles.placeholderText]}>
                      {filingDueDate || 'Select Due Date'}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color="#2563EB" />
                  </TouchableOpacity>
                  {showDueDatePicker && (
                    <DateTimePicker
                      value={filingDueDate ? new Date(filingDueDate) : new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleDueDateChange}
                      minimumDate={new Date()}
                    />
                  )}
                </View>

                {/* Fee */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Fee (₹)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter fee amount"
                    keyboardType="numeric"
                    value={filingFee}
                    onChangeText={setFilingFee}
                  />
                </View>

                {/* Notes */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Notes (Optional)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Add any additional notes"
                    value={filingNotes}
                    onChangeText={setFilingNotes}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>
            </>
          )}
        </ScrollView>

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
              (!filingType || !filingPeriod || !filingYear || !filingStatus) && styles.disabledButton
            ]}
            onPress={handleAddFiling}
            disabled={!filingType || !filingPeriod || !filingYear || !filingStatus}
          >
            <Text style={styles.submitButtonText}>
              {isEditMode ? 'Update Filing' : 'Add Filing'}
            </Text>
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
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  headerSubtitle: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 4,
  },
  closeButton: {
    padding: 4,
    marginLeft: 12,
  },
  scrollView: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  typeList: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  typeItemContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  typeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
  },
  typeItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  typeInfo: {
    flex: 1,
  },
  typeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  typeDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  },
  typeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  typeMetaText: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 8,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
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
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  statusChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusChipSelected: {
    backgroundColor: '#DBEAFE',
    borderColor: '#2563EB',
  },
  statusChipText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  statusChipTextSelected: {
    color: '#2563EB',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    marginRight: 12,
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

export default AddFilingModal;
