import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../../config';
import * as ScreenOrientation from 'expo-screen-orientation';

// Reusable guard function for enterprise-grade validation
const hasOutstandingBalance = (client) => {
  const outstanding = client?.totalOutstanding || 0;
  return outstanding > 0;
};

const EditClientScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { clientId, clientData } = route.params;

  const [loading, setLoading] = useState(!clientData);
  const [saving, setSaving] = useState(false);
  const [originalData, setOriginalData] = useState(null);
  const [currentClientData, setCurrentClientData] = useState(null); // Store fresh client data with outstanding balance
  // Split name into firstName and lastName if it exists, otherwise use empty strings
  const initialName = clientData?.name || '';
  const [formData, setFormData] = useState({
    firstName: clientData?.firstName || (initialName ? initialName.split(' ')[0] : ''),
    lastName: clientData?.lastName || (initialName ? initialName.split(' ').slice(1).join(' ') : ''),
    email: clientData?.email || '',
    phone: clientData?.phone || clientData?.phoneNumber || '',
    businessName: clientData?.businessName || '',
    gstNumber: clientData?.gstNumber || '',
    panNumber: clientData?.panNumber || '',
    gstType: clientData?.gstType || 'Regular',
    address: clientData?.address || '',
    isActive: clientData?.isActive !== false, // Default to true if undefined
  });

  // Set originalData when clientData is available from navigation params
  useEffect(() => {
    if (clientData) {
      setOriginalData({
        firstName: clientData?.firstName || '',
        lastName: clientData?.lastName || '',
        email: clientData?.email || '',
        phone: (clientData?.phone || clientData?.phoneNumber || '').toString(),
        businessName: clientData?.businessName || '',
        gstNumber: clientData?.gstNumber || '',
        panNumber: clientData?.panNumber || '',
        gstType: clientData?.gstType || 'Regular',
        address: clientData?.address || '',
        isActive: clientData?.isActive !== false,
      });
    }
  }, [clientData]);

  useFocusEffect(
    useCallback(() => {
      // 🔒 Lock to portrait when screen is focused
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP
      );

      // 🔥 Force refresh form data on focus
      setFormData({ ...formData }); // force re-render

      return () => {
        // 🔓 Unlock when leaving the screen (optional)
        ScreenOrientation.unlockAsync();
      };
    }, [])
  );

  // Fetch client details if not passed in params
  useEffect(() => {
    const fetchClientDetails = async () => {
      if (!clientId) return;
      // ALWAYS fetch fresh client data


      try {
        const token = await AsyncStorage.getItem('userToken');
        const response = await fetch(`${API_BASE_URL}/clients/${clientId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch client details');
        }

        const data = await response.json();

        // Store the fresh client data with outstanding balance
        setCurrentClientData(data);

        // Split the name into first and last name
        const nameParts = data.name ? data.name.split(' ') : [];

        setFormData({
          ...{
            firstName: data.firstName || (nameParts[0] || ''),
            lastName: data.lastName || (nameParts.slice(1).join(' ') || ''),
            email: data.email || '',
            phone: data.phone || data.phoneNumber || '',
            businessName: data.businessName || '',
            gstNumber: data.gstNumber || '',
            panNumber: data.panNumber || '',
            gstType: data.gstType || 'Regular',
            address: data.address || '',
            isActive: data.isActive !== false, // Default to true if undefined
          }
        });

        // Store original data for change detection
        setOriginalData({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          phone: (data.phone || data.phoneNumber || '').toString(),
          businessName: data.businessName || '',
          gstNumber: data.gstNumber || '',
          panNumber: data.panNumber || '',
          gstType: data.gstType || 'Regular',
          address: data.address || '',
          isActive: data.isActive !== false,
        });
      } catch (error) {
        console.error('Error fetching client details:', error);
        Alert.alert('Error', 'Failed to load client details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (clientId && !clientData) {
      fetchClientDetails();
    } else {
      setLoading(false);
    }
  }, [clientId, clientData]);

  // Format phone number for display
  const formatPhoneNumber = (value) => {
    if (!value) return '';
    // Remove all non-digit characters
    const cleaned = ('' + value).replace(/\D/g, '');

    // Format as (XXX) XXX-XXXX
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (match) {
      return !match[2] ? match[1] : `(${match[1]}) ${match[2]}${match[3] ? `-${match[3]}` : ''}`;
    }
    return value;
  };

  // Handle phone number input with formatting
  const handlePhoneChange = (text) => {
    // Remove all non-digit characters
    const cleaned = text.replace(/\D/g, '');
    // Format the phone number for display
    const formatted = formatPhoneNumber(cleaned);
    // Update the form data with the cleaned number (without formatting)
    setFormData({ ...formData, phone: cleaned, formattedPhone: formatted });
  };

  // Enterprise-grade change detection
  const hasChanges = () => {
    if (!originalData) return true;

    return (
      originalData.firstName !== formData.firstName.trim() ||
      originalData.lastName !== formData.lastName.trim() ||
      originalData.email !== formData.email.trim() ||
      originalData.phone !== formData.phone.replace(/\D/g, '') ||
      originalData.businessName !== formData.businessName.trim() ||
      originalData.gstNumber !== formData.gstNumber.trim() ||
      originalData.panNumber !== formData.panNumber.trim() ||
      originalData.gstType !== formData.gstType ||
      originalData.address !== formData.address.trim() ||
      originalData.isActive !== formData.isActive
    );
  };

  const handleUpdate = async () => {
    if (!formData.firstName || !formData.phone) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Check if any changes were made
    if (!hasChanges()) {
      Alert.alert(
        'No Changes',
        'No changes were made to the client details.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
      return;
    }

    // If trying to deactivate, fetch fresh client data to check current outstanding balance
    if (!formData.isActive) {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const response = await fetch(`${API_BASE_URL}/clients/${clientId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const freshData = await response.json();
          setCurrentClientData(freshData);

          console.log('Fresh client data for validation:', freshData);
          console.log('Outstanding balance:', freshData.totalOutstanding);

          // Check with fresh data
          if (hasOutstandingBalance(freshData)) {
            Alert.alert(
              'Cannot Deactivate Client',
              `This client has outstanding balance of ₹${freshData.totalOutstanding || 0}. Please clear all outstanding amounts before deactivating.`,
              [{ text: 'OK' }]
            );
            return;
          } else {
            console.log('No outstanding balance, allowing deactivation');
          }
        }
      } catch (error) {
        console.error('Error fetching fresh client data:', error);
      }
    }

    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_BASE_URL}/clients/${clientId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.replace(/\D/g, ''),
          phoneNumber: formData.phone.replace(/\D/g, ''),   // extra safe
          businessName: formData.businessName.trim(),
          gstNumber: formData.gstNumber.trim(),
          panNumber: formData.panNumber.trim(),
          gstType: formData.gstType,
          address: formData.address.trim(),
          isActive: formData.isActive,
        }),

      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update client');
      }

      Alert.alert('Success', 'Client details updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('Error updating client:', error);
      Alert.alert('Error', error.message || 'Failed to update client');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <ScrollView style={styles.scrollView}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>First Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.firstName}
              onChangeText={(text) => setFormData({ ...formData, firstName: text })}
              placeholder="Enter first name"
              placeholderTextColor="#95a5a6"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={styles.input}
              value={formData.lastName}
              onChangeText={(text) => setFormData({ ...formData, lastName: text })}
              placeholder="Enter last name"
              placeholderTextColor="#95a5a6"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              placeholder="Enter email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              value={formatPhoneNumber(formData.phone)}
              onChangeText={handlePhoneChange}
              placeholder="(123) 456-7890"
              placeholderTextColor="#95a5a6"
              keyboardType="phone-pad"
              maxLength={14} // (123) 456-7890
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Business Name</Text>
            <TextInput
              style={styles.input}
              value={formData.businessName}
              onChangeText={(text) => setFormData({ ...formData, businessName: text })}
              placeholder="Enter business name"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>GST Number</Text>
            <TextInput
              style={styles.input}
              value={formData.gstNumber}
              onChangeText={(text) => setFormData({ ...formData, gstNumber: text.toUpperCase() })}
              placeholder="Enter GST number"
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>PAN Number</Text>
            <TextInput
              style={styles.input}
              value={formData.panNumber}
              onChangeText={(text) => setFormData({ ...formData, panNumber: text.toUpperCase() })}
              placeholder="Enter PAN number"
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>GST Type</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.gstType}
                onValueChange={(itemValue) => setFormData({ ...formData, gstType: itemValue })}
                style={styles.picker}
              >
                <Picker.Item label="Regular" value="Regular" />
                <Picker.Item label="Composition" value="Composition" />
                <Picker.Item label="Unregistered" value="Unregistered" />
              </Picker>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.address}
              onChangeText={(text) => setFormData({ ...formData, address: text })}
              placeholder="Enter address"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.formGroup}>
            <View style={styles.switchContainer}>
              <Text style={styles.label}>Client Status</Text>
              <TouchableOpacity
                style={[
                  styles.switch,
                  formData.isActive ? styles.switchActive : styles.switchInactive
                ]}
                onPress={() => {
                  const clientToCheck = currentClientData || clientData;
                  if (formData.isActive && hasOutstandingBalance(clientToCheck)) {
                    Alert.alert(
                      'Cannot Deactivate Client',
                      `This client has outstanding balance of ₹${clientToCheck?.totalOutstanding || 0}. Please clear all outstanding amounts before deactivating.`,
                      [{ text: 'OK' }]
                    );
                    return;
                  }

                  setFormData({ ...formData, isActive: !formData.isActive });
                }}
              >
                <View
                  style={[
                    styles.switchThumb,
                    formData.isActive ? styles.switchThumbActive : styles.switchThumbInactive
                  ]}
                />
              </TouchableOpacity>
            </View>
            <Text style={[
              styles.statusDescription,
              { color: formData.isActive ? '#10B981' : '#EF4444' }
            ]}>
              {formData.isActive ? 'Active - Client is visible and can be managed' : 'Inactive - Client is hidden from general views'}
            </Text>
            {hasOutstandingBalance(currentClientData || clientData) && (
              <Text style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>
                Outstanding Balance: ₹{(currentClientData || clientData)?.totalOutstanding || 0} - Deactivation disabled
              </Text>
            )}
          </View>
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => navigation.goBack()}
            disabled={saving}
          >
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.saveButton, (saving || !hasChanges()) && styles.disabledButton]}
            onPress={handleUpdate}
            disabled={saving || !hasChanges()}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#111827',   // darker
    marginBottom: 6,
    fontWeight: '700',
  },

  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#000000',     // Strong text
    borderWidth: 1.8,
    borderColor: '#2563EB',   // clearer blue border
  },


  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1.8,
    borderColor: '#CBD5E1',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#000',
  }
  ,

  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#CBD5E1',
  },
  saveButton: {
    backgroundColor: '#2563EB',   // brighter blue like other screen
  },

  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  switch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  switchActive: {
    backgroundColor: '#10B981',
  },
  switchInactive: {
    backgroundColor: '#D1D5DB',
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  switchThumbInactive: {
    alignSelf: 'flex-start',
  },
  statusDescription: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
});

export default EditClientScreen;
