import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { clientService } from '../../services/client';
import { Picker } from '@react-native-picker/picker';

const AddClientScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    gstNumber: '',
    phoneNumber: '',
    email: '',
    userId: '',
    password: '',
    clientType: 'Regular', // Regular / IFF / Composition
  });

  const clientTypes = ['Regular', 'IFF', 'Composition'];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.businessName.trim()) {
      Alert.alert('Error', 'Please enter business name');
      return false;
    }
    if (!formData.gstNumber.trim()) {
      Alert.alert('Error', 'Please enter GST number');
      return false;
    }
    if (!formData.phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter phone number');
      return false;
    }
    if (!formData.email.trim()) {
      Alert.alert('Error', 'Please enter email address');
      return false;
    }
    if (!formData.userId.trim()) {
      Alert.alert('Error', 'Please enter user ID');
      return false;
    }
    if (!formData.password.trim()) {
      Alert.alert('Error', 'Please enter password');
      return false;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }

    // Basic phone validation (10 digits)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(formData.phoneNumber.replace(/\s/g, ''))) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await clientService.addClient(formData);
      
      Alert.alert(
        'Success', 
        'Client added successfully!\n\nA ticket file has been automatically generated and an email notification has been sent to the client.',
        [
          { 
            text: 'OK', 
            onPress: () => {
              setFormData({
                businessName: '',
                gstNumber: '',
                phoneNumber: '',
                email: '',
                userId: '',
                password: '',
                clientType: 'Regular',
              });
              navigation.goBack();
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to add client');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Form',
      'Are you sure you want to clear all fields?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setFormData({
              businessName: '',
              gstNumber: '',
              phoneNumber: '',
              email: '',
              userId: '',
              password: '',
              clientType: 'Regular',
            });
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add New Client</Text>
          <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
            <Ionicons name="refresh" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

      {/* Form */}
      <View style={styles.form}>
        {/* Business Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Business Name <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={formData.businessName}
            onChangeText={value => handleInputChange('businessName', value)}
            placeholder="Enter business name"
            autoCapitalize="words"
          />
        </View>

        {/* GST Number */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>GST Number <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={formData.gstNumber}
            onChangeText={value => handleInputChange('gstNumber', value)}
            placeholder="Enter GST number"
            autoCapitalize="characters"
            maxLength={15}
          />
        </View>

        {/* Mobile */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mobile <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={formData.phoneNumber}
            onChangeText={value => handleInputChange('phoneNumber', value)}
            placeholder="Enter 10-digit mobile number"
            keyboardType="phone-pad"
            maxLength={10}
          />
        </View>

        {/* Email */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={formData.email}
            onChangeText={value => handleInputChange('email', value)}
            placeholder="Enter email address"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* User ID */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>User ID <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={formData.userId}
            onChangeText={value => handleInputChange('userId', value)}
            placeholder="Enter user ID"
            autoCapitalize="none"
          />
        </View>

        {/* Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={formData.password}
            onChangeText={value => handleInputChange('password', value)}
            placeholder="Enter password"
            secureTextEntry
          />
        </View>

        {/* Type: Regular / IFF / Composition */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Type <Text style={styles.required}>*</Text></Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={formData.clientType}
              onValueChange={value => handleInputChange('clientType', value)}
              style={styles.picker}
            >
              {clientTypes.map(type => (
                <Picker.Item key={type} label={type} value={type} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Add Client</Text>
          )}
        </TouchableOpacity>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color="#1E40AF" />
            <Text style={styles.infoTitle}>What happens next?</Text>
          </View>
          <Text style={styles.infoText}>
            📋 A ticket file will be automatically generated
          </Text>
          <Text style={styles.infoText}>
            📧 Email notification will be sent to the client
          </Text>
          <Text style={styles.infoText}>
            📱 Client can install the Client App for approvals
          </Text>
        </View>
              </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  backButton: {
    padding: 8
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937'
  },
  resetButton: {
    padding: 8
  },
  form: {
    padding: 20
  },
  inputGroup: {
    marginBottom: 20
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8
  },
  required: {
    color: '#EF4444'
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    fontSize: 16,
    color: '#1F2937'
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top'
  },
  submitButton: {
    backgroundColor: '#2563EB',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center'
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF'
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    padding: 20,
    borderRadius: 12,
    marginTop: 30,
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB'
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginLeft: 8
  },
  infoText: {
    color: '#1E40AF',
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'white',
},
picker: {
  height: 48,
  width: '100%',
},
});

export default AddClientScreen; 