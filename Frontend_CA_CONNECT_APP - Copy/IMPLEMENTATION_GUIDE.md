# 🚀 CA Connect - Implementation Guide

## 📋 Project Overview

This guide provides step-by-step instructions for implementing the CA Connect mobile application, including both the CA App and Client App components.

## 🎯 Implementation Phases

### **Phase 1: Foundation Setup (Week 1-2)**
### **Phase 2: Core Features (Week 3-8)**
### **Phase 3: Advanced Features (Week 9-12)**
### **Phase 4: Testing & Deployment (Week 13-16)**

---

## 🏗️ Phase 1: Foundation Setup

### **Step 1: Project Initialization**

#### 1.1 Create React Native Project
```bash
# Create new Expo project
npx create-expo-app@latest ca-connect-app
cd ca-connect-app

# Install essential dependencies
npm install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context
npm install @react-native-async-storage/async-storage
npm install react-native-chart-kit react-native-svg
npm install expo-image-picker expo-document-picker
npm install expo-notifications expo-device
npm install expo-linking expo-sharing
```

#### 1.2 Project Structure Setup
```
ca-connect-app/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.js
│   │   │   ├── Input.js
│   │   │   ├── Card.js
│   │   │   └── Loading.js
│   │   ├── charts/
│   │   │   ├── EarningsChart.js
│   │   │   └── PaymentChart.js
│   │   └── forms/
│   │       ├── AddClientForm.js
│   │       └── AddTaskForm.js
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── LoginScreen.js
│   │   │   └── RegisterScreen.js
│   │   ├── ca/
│   │   │   ├── HomeScreen.js
│   │   │   ├── AddClientScreen.js
│   │   │   ├── ClientListScreen.js
│   │   │   ├── ClientDetailsScreen.js
│   │   │   ├── PaymentScreen.js
│   │   │   ├── CallScreen.js
│   │   │   └── TaskScreen.js
│   │   └── client/
│   │       ├── ClientHomeScreen.js
│   │       ├── ClientFilesScreen.js
│   │       └── ClientPaymentScreen.js
│   ├── navigation/
│   │   ├── AppNavigator.js
│   │   ├── AuthNavigator.js
│   │   ├── CANavigator.js
│   │   └── ClientNavigator.js
│   ├── services/
│   │   ├── api.js
│   │   ├── auth.js
│   │   ├── storage.js
│   │   └── notifications.js
│   ├── utils/
│   │   ├── constants.js
│   │   ├── helpers.js
│   │   └── validation.js
│   └── assets/
│       ├── images/
│       └── icons/
├── App.js
└── package.json
```

#### 1.3 Configure Navigation
```javascript
// src/navigation/AppNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AuthNavigator from './AuthNavigator';
import CANavigator from './CANavigator';
import ClientNavigator from './ClientNavigator';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const isAuthenticated = false; // Replace with actual auth state
  const userType = 'ca'; // Replace with actual user type

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : userType === 'ca' ? (
          <Stack.Screen name="CA" component={CANavigator} />
        ) : (
          <Stack.Screen name="Client" component={ClientNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

### **Step 2: Backend Setup**

#### 2.1 Create Node.js Backend
```bash
# Create backend directory
mkdir ca-connect-backend
cd ca-connect-backend

# Initialize Node.js project
npm init -y

# Install dependencies
npm install express mongoose cors dotenv
npm install jsonwebtoken bcryptjs
npm install multer aws-sdk
npm install nodemailer
npm install firebase-admin
npm install express-validator
npm install helmet morgan
```

#### 2.2 Backend Structure
```
ca-connect-backend/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   ├── firebase.js
│   │   └── aws.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── clientController.js
│   │   ├── fileController.js
│   │   ├── paymentController.js
│   │   └── taskController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── validation.js
│   │   └── upload.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Client.js
│   │   ├── File.js
│   │   ├── Payment.js
│   │   └── Task.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── clients.js
│   │   ├── files.js
│   │   ├── payments.js
│   │   └── tasks.js
│   ├── services/
│   │   ├── emailService.js
│   │   ├── notificationService.js
│   │   └── fileService.js
│   └── utils/
│       ├── constants.js
│       └── helpers.js
├── server.js
└── package.json
```

#### 2.3 Database Models
```javascript
// src/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userType: {
    type: String,
    enum: ['ca', 'client', 'staff'],
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  profileImage: String,
  isActive: {
    type: Boolean,
    default: true
  },
  caId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client'
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
```

---

## 🔧 Phase 2: Core Features Implementation

### **Step 3: Authentication System**

#### 3.1 Login Screen Implementation
```javascript
// src/screens/auth/LoginScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert
} from 'react-native';
import { authService } from '../../services/auth';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.login(email, password);
      // Handle successful login
      console.log('Login successful:', response);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CA Connect</Text>
      <Text style={styles.subtitle}>Smart Client Management</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email Address"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity
        style={styles.loginButton}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.loginButtonText}>
          {loading ? 'Logging in...' : 'Login'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.linkText}>Create New Account</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#f5f5f5'
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#2563EB',
    marginBottom: 10
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#6B7280',
    marginBottom: 40
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  loginButton: {
    backgroundColor: '#2563EB',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20
  },
  loginButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600'
  },
  linkText: {
    color: '#2563EB',
    textAlign: 'center',
    fontSize: 14
  }
});
```

#### 3.2 Authentication Service
```javascript
// src/services/auth.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://localhost:3000/api';

export const authService = {
  async login(email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store tokens
      await AsyncStorage.setItem('accessToken', data.accessToken);
      await AsyncStorage.setItem('refreshToken', data.refreshToken);
      await AsyncStorage.setItem('userData', JSON.stringify(data.user));

      return data;
    } catch (error) {
      throw new Error(error.message);
    }
  },

  async logout() {
    try {
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('refreshToken');
      await AsyncStorage.removeItem('userData');
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  async getCurrentUser() {
    try {
      const userData = await AsyncStorage.getItem('userData');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }
};
```

### **Step 4: Home Screen Implementation**

#### 4.1 Home Screen with Dashboard
```javascript
// src/screens/ca/HomeScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { authService } from '../../services/auth';
import { clientService } from '../../services/client';

const screenWidth = Dimensions.get('window').width;

export default function HomeScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    monthlyEarnings: 0,
    totalClients: 0,
    pendingFiles: 0
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadUserData();
    loadDashboardStats();
  }, []);

  const loadUserData = async () => {
    const userData = await authService.getCurrentUser();
    setUser(userData);
  };

  const loadDashboardStats = async () => {
    try {
      const statsData = await clientService.getDashboardStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardStats();
    setRefreshing(false);
  };

  const chartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        data: [20000, 45000, 28000, 80000, 99000, 43000],
        color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
        strokeWidth: 2
      }
    ]
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          Welcome back, {user?.name || 'CA'}
        </Text>
      </View>

      {/* Earnings Chart */}
      <View style={styles.chartContainer}>
        <Text style={styles.sectionTitle}>Total Earnings</Text>
        <Text style={styles.earningsAmount}>₹{stats.totalEarnings.toLocaleString()}</Text>
        <LineChart
          data={chartData}
          width={screenWidth - 40}
          height={220}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
            style: {
              borderRadius: 16
            },
            propsForDots: {
              r: '6',
              strokeWidth: '2',
              stroke: '#2563EB'
            }
          }}
          bezier
          style={styles.chart}
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Call')}
          >
            <Text style={styles.actionButtonText}>📞 Call</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('AddClient')}
          >
            <Text style={styles.actionButtonText}>📋 Add Client</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('ClientList')}
          >
            <Text style={styles.actionButtonText}>📁 Files</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Payment')}
          >
            <Text style={styles.actionButtonText}>💰 Payments</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Statistics */}
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>This Month's Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalClients}</Text>
            <Text style={styles.statLabel}>Clients</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.pendingFiles}</Text>
            <Text style={styles.statLabel}>Pending Files</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>₹{stats.monthlyEarnings.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Earnings</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937'
  },
  chartContainer: {
    margin: 20,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 10
  },
  earningsAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 20
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16
  },
  quickActionsContainer: {
    margin: 20,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap'
  },
  actionButton: {
    backgroundColor: '#2563EB',
    padding: 15,
    borderRadius: 8,
    width: '48%',
    marginBottom: 10
  },
  actionButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600'
  },
  statsContainer: {
    margin: 20,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 15
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563EB'
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 5
  }
});
```

### **Step 5: Client Management**

#### 5.1 Add Client Screen
```javascript
// src/screens/ca/AddClientScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView
} from 'react-native';
import { clientService } from '../../services/client';

export default function AddClientScreen({ navigation }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    address: '',
    gstNumber: '',
    businessType: ''
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.phoneNumber) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await clientService.addClient(formData);
      Alert.alert('Success', 'Client added successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Add New Client</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Client Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(value) => handleInputChange('name', value)}
            placeholder="Enter client name"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email Address *</Text>
          <TextInput
            style={styles.input}
            value={formData.email}
            onChangeText={(value) => handleInputChange('email', value)}
            placeholder="Enter email address"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            value={formData.phoneNumber}
            onChangeText={(value) => handleInputChange('phoneNumber', value)}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Business Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.address}
            onChangeText={(value) => handleInputChange('address', value)}
            placeholder="Enter business address"
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>GST Number (Optional)</Text>
          <TextInput
            style={styles.input}
            value={formData.gstNumber}
            onChangeText={(value) => handleInputChange('gstNumber', value)}
            placeholder="Enter GST number"
            autoCapitalize="characters"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Business Type</Text>
          <TextInput
            style={styles.input}
            value={formData.businessType}
            onChangeText={(value) => handleInputChange('businessType', value)}
            placeholder="Enter business type"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Adding Client...' : 'Add Client'}
          </Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            📋 A ticket file will be automatically generated
          </Text>
          <Text style={styles.infoText}>
            📧 Email notification will be sent to client
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937'
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
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    fontSize: 16
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top'
  },
  submitButton: {
    backgroundColor: '#2563EB',
    padding: 15,
    borderRadius: 8,
    marginTop: 20
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF'
  },
  submitButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600'
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    padding: 15,
    borderRadius: 8,
    marginTop: 20
  },
  infoText: {
    color: '#1E40AF',
    fontSize: 14,
    marginBottom: 5
  }
});
```

---

## 🔧 Phase 3: Advanced Features

### **Step 6: File Management System**

#### 6.1 File Upload Component
```javascript
// src/components/common/FileUpload.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

export default function FileUpload({ onFileSelect, maxSize = 10 }) {
  const [uploading, setUploading] = useState(false);

  const pickDocument = async () => {
    try {
      setUploading(true);
      
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true
      });

      if (result.type === 'success') {
        const fileInfo = await FileSystem.getInfoAsync(result.uri);
        const fileSizeInMB = fileInfo.size / (1024 * 1024);

        if (fileSizeInMB > maxSize) {
          Alert.alert('Error', `File size must be less than ${maxSize}MB`);
          return;
        }

        onFileSelect({
          uri: result.uri,
          name: result.name,
          size: fileInfo.size,
          type: result.mimeType
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    } finally {
      setUploading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
      onPress={pickDocument}
      disabled={uploading}
    >
      <Text style={styles.uploadButtonText}>
        {uploading ? 'Selecting...' : '📁 Select File'}
      </Text>
      <Text style={styles.uploadButtonSubtext}>
        Max size: {maxSize}MB
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  uploadButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center'
  },
  uploadButtonDisabled: {
    opacity: 0.5
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151'
  },
  uploadButtonSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 5
  }
});
```

### **Step 7: Payment Tracking System**

#### 7.1 Payment Screen Implementation
```javascript
// src/screens/ca/PaymentScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert
} from 'react-native';
import { paymentService } from '../../services/payment';

export default function PaymentScreen({ navigation }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('amount'); // 'amount', 'date', 'status'

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const data = await paymentService.getPayments();
      setPayments(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = async (clientId) => {
    try {
      await paymentService.sendReminder(clientId);
      Alert.alert('Success', 'Payment reminder sent successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to send reminder');
    }
  };

  const handleMarkPaid = async (paymentId) => {
    try {
      await paymentService.markAsPaid(paymentId);
      loadPayments(); // Refresh the list
      Alert.alert('Success', 'Payment marked as paid');
    } catch (error) {
      Alert.alert('Error', 'Failed to update payment');
    }
  };

  const renderPaymentCard = ({ item }) => (
    <View style={styles.paymentCard}>
      <View style={styles.paymentHeader}>
        <Text style={styles.clientName}>{item.clientName}</Text>
        <View style={[
          styles.statusBadge,
          item.status === 'overdue' && styles.statusOverdue,
          item.status === 'paid' && styles.statusPaid
        ]}>
          <Text style={styles.statusText}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.paymentDetails}>
        <Text style={styles.amount}>₹{item.amount.toLocaleString()}</Text>
        <Text style={styles.dueDate}>Due: {new Date(item.dueDate).toLocaleDateString()}</Text>
      </View>

      <View style={styles.paymentActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleSendReminder(item.clientId)}
        >
          <Text style={styles.actionButtonText}>📱 Send Reminder</Text>
        </TouchableOpacity>

        {item.status !== 'paid' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.markPaidButton]}
            onPress={() => handleMarkPaid(item.id)}
          >
            <Text style={styles.markPaidButtonText}>💰 Mark Paid</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Payment Management</Text>
        
        <View style={styles.sortButtons}>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'amount' && styles.sortButtonActive]}
            onPress={() => setSortBy('amount')}
          >
            <Text style={styles.sortButtonText}>Amount</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'date' && styles.sortButtonActive]}
            onPress={() => setSortBy('date')}
          >
            <Text style={styles.sortButtonText}>Date</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'status' && styles.sortButtonActive]}
            onPress={() => setSortBy('status')}
          >
            <Text style={styles.sortButtonText}>Status</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={payments}
        renderItem={renderPaymentCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.paymentList}
        refreshing={loading}
        onRefresh={loadPayments}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 15
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 10
  },
  sortButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6'
  },
  sortButtonActive: {
    backgroundColor: '#2563EB'
  },
  sortButtonText: {
    fontSize: 14,
    color: '#374151'
  },
  paymentList: {
    padding: 20
  },
  paymentCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937'
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    backgroundColor: '#FEF3C7'
  },
  statusOverdue: {
    backgroundColor: '#FEE2E2'
  },
  statusPaid: {
    backgroundColor: '#D1FAE5'
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151'
  },
  paymentDetails: {
    marginBottom: 15
  },
  amount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 5
  },
  dueDate: {
    fontSize: 14,
    color: '#6B7280'
  },
  paymentActions: {
    flexDirection: 'row',
    gap: 10
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151'
  },
  markPaidButton: {
    backgroundColor: '#10B981'
  },
  markPaidButtonText: {
    color: 'white'
  }
});
```

---

## 🧪 Phase 4: Testing & Deployment

### **Step 8: Testing Strategy**

#### 8.1 Unit Testing Setup
```bash
# Install testing dependencies
npm install --save-dev @testing-library/react-native @testing-library/jest-native
npm install --save-dev jest-expo
```

#### 8.2 Test Configuration
```javascript
// jest.config.js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@react-navigation)'
  ],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/']
};
```

#### 8.3 Example Test
```javascript
// src/screens/auth/__tests__/LoginScreen.test.js
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../LoginScreen';

describe('LoginScreen', () => {
  it('renders login form correctly', () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    
    expect(getByPlaceholderText('Email Address')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
    expect(getByText('Login')).toBeTruthy();
  });

  it('shows error for empty fields', async () => {
    const { getByText } = render(<LoginScreen />);
    
    fireEvent.press(getByText('Login'));
    
    await waitFor(() => {
      expect(getByText('Please fill in all fields')).toBeTruthy();
    });
  });
});
```

### **Step 9: Deployment Preparation**

#### 9.1 Environment Configuration
```javascript
// src/config/environment.js
const ENV = {
  development: {
    API_BASE_URL: 'http://localhost:3000/api',
    FIREBASE_CONFIG: {
      // Development Firebase config
    }
  },
  staging: {
    API_BASE_URL: 'https://staging-api.caconnect.com/api',
    FIREBASE_CONFIG: {
      // Staging Firebase config
    }
  },
  production: {
    API_BASE_URL: 'https://api.caconnect.com/api',
    FIREBASE_CONFIG: {
      // Production Firebase config
    }
  }
};

export default ENV[process.env.NODE_ENV || 'development'];
```

#### 9.2 Build Configuration
```json
// app.json
{
  "expo": {
    "name": "CA Connect",
    "slug": "ca-connect-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#2563EB"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.caconnect.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#2563EB"
      },
      "package": "com.caconnect.app"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-notifications",
      "expo-document-picker",
      "expo-image-picker"
    ]
  }
}
```

---

## 📋 Implementation Checklist

### **Phase 1: Foundation Setup**
- [ ] Project initialization with Expo
- [ ] Navigation setup
- [ ] Basic folder structure
- [ ] Backend API setup
- [ ] Database models
- [ ] Authentication system

### **Phase 2: Core Features**
- [ ] Login/Register screens
- [ ] Home dashboard
- [ ] Client management
- [ ] File upload system
- [ ] Payment tracking
- [ ] Basic notifications

### **Phase 3: Advanced Features**
- [ ] Task management
- [ ] Call integration
- [ ] Advanced charts
- [ ] File approval workflow
- [ ] Payment reminders
- [ ] Client app features

### **Phase 4: Testing & Deployment**
- [ ] Unit tests
- [ ] Integration tests
- [ ] User acceptance testing
- [ ] Performance optimization
- [ ] Security audit
- [ ] Production deployment

---

## 🚀 Next Steps

1. **Start with Phase 1**: Set up the project foundation
2. **Implement core features**: Focus on essential functionality first
3. **Test thoroughly**: Ensure quality at each phase
4. **Deploy incrementally**: Use staging environment for testing
5. **Gather feedback**: Iterate based on user input

**This implementation guide provides a comprehensive roadmap for building the CA Connect application. Follow the phases sequentially and ensure each step is completed before moving to the next.** 