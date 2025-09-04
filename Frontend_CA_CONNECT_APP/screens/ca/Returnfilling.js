import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  Dimensions,
  SafeAreaView,
  Platform,
  Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { authService } from '../../services/auth';
import { useAuth } from '../../App';


const screenWidth = Dimensions.get('window').width;

const Returnfilling = () => {
  const navigation = useNavigation();
  const { updateAuthState } = useAuth();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    monthlyEarnings: 0,
    totalClients: 0,
    pendingFiles: 0,
    completedTasks: 0,
    overduePayments: 0
  });
  const [refreshing, setRefreshing] = useState(false);
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(true);

  // Clear data when screen loses focus
  useFocusEffect(
    React.useCallback(() => {
      // Clear data when screen is focused
      setClients([]);
      setStats({
        totalEarnings: 0,
        monthlyEarnings: 0,
        totalClients: 0,
        pendingFiles: 0,
        completedTasks: 0,
        overduePayments: 0
      });

      // Load fresh data
      loadUserData();
      loadClients();
    }, [])
  );

  const loadUserData = async () => {
    const userData = await authService.getCurrentUser();
    setUser(userData);
  };

  // Test function to debug credential storage
  const testCredentials = async () => {
    try {
      console.log('=== Testing Credential Storage ===');
      const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
      const userEmail = await AsyncStorage.getItem('userEmail');
      const userData = await AsyncStorage.getItem('userData');

      console.log('Storage test results:');
      console.log('- isLoggedIn:', isLoggedIn);
      console.log('- userEmail:', userEmail);
      console.log('- userData:', userData ? 'exists' : 'null');

      // Test secure storage
      const { email, password } = await authService.getStoredCredentials();
      console.log('- Retrieved credentials:', { email, password: password ? '***' : null });

      console.log('=== End Test ===');
    } catch (error) {
      console.error('Test credentials error:', error);
    }
  };

  // Function to clear all storage and force fresh login
  const clearStorageAndRelogin = async () => {
    try {
      console.log('=== Clearing All Storage ===');
      await AsyncStorage.clear();
      console.log('Storage cleared successfully');

      // Force logout and return to login screen
      await updateAuthState();
    } catch (error) {
      console.error('Clear storage error:', error);
    }
  };

  // Function to test backend authentication directly
  const testBackendAuth = async () => {
    try {
      console.log('=== Testing Backend Authentication ===');
      const { email, password } = await authService.getStoredCredentials();

      if (!email || !password) {
        console.log('No stored credentials to test');
        return;
      }

      console.log('Testing backend with credentials:', { email, password: '***' });

      const response = await fetch(`${API_BASE_URL}/test-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });

      console.log('Backend test response status:', response.status);
      const data = await response.json();
      console.log('Backend test response data:', data);

      if (response.ok) {
        console.log('✅ Backend authentication working correctly');
        Alert.alert('Success', 'Backend authentication is working!');
      } else {
        console.log('❌ Backend authentication failed:', data.message);
        Alert.alert('Error', `Backend test failed: ${data.message}`);
      }

    } catch (error) {
      console.error('Backend auth test error:', error);
      Alert.alert('Error', `Network error: ${error.message}`);
    }
  };

  // Update loadClients to calculate all stats including earnings
  const loadClients = async () => {
    setClientsLoading(true);
    try {
      // Call API using the configured base URL
      const res = await fetch(`${API_BASE_URL}/clients?page=1&limit=50`);
      const data = await res.json();

      const clientList = data.clients || [];
      setClients(clientList);

      // Calculate stats
      const totalClients = clientList.length;
      const totalPendingFiles = clientList.reduce((sum, client) => sum + (client.pendingFiles || 0), 0);
      const totalOutstanding = clientList.reduce((sum, client) => sum + (client.totalOutstanding || 0), 0);
      const totalPaid = clientList.reduce((sum, client) => sum + (client.totalPaid || 0), 0);
      const overdueClients = clientList.filter(client => (client.pendingFiles || 0) > 3).length;

      const monthlyEarnings = totalOutstanding * 0.3; // you can adjust logic

      setStats({
        totalEarnings: totalOutstanding + totalPaid,
        monthlyEarnings: monthlyEarnings,
        totalClients,
        pendingFiles: totalPendingFiles,
        completedTasks: Math.floor(totalClients * 1.8),
        overduePayments: overdueClients
      });
    } catch (e) {
      console.error('LoadClients error:', e);
      setClients([]);
    }
    setClientsLoading(false);
  };


  // Update onRefresh to only call loadClients
  const onRefresh = async () => {
    setRefreshing(true);
    await loadClients();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.logout();
              await updateAuthState(); // This will trigger navigation back to login
            } catch (error) {
              console.error('Logout error:', error);
              // Force logout even if there's an error
              await updateAuthState();
            }
          }
        }
      ]
    );
  };

  // Graph data: monthly earnings
  const chartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        data: [20000, 40000, 25000, 80000, 99000, 43000],
        color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
        strokeWidth: 2
      }
    ]
  };

  // Quick Actions with semantic colors/icons
  const quickActions = [
    {
      id: '1',
      title: 'Call',
      icon: <Ionicons name="call" size={20} color="#fff" />, // blue
      onPress: () => navigation.navigate('Calls'),
      color: '#2563EB'
    },
    {
      id: '2',
      title: 'Add Client',
      icon: <MaterialIcons name="person-add-alt" size={20} color="#fff" />, // green
      onPress: () => navigation.navigate('AddClient'),
      color: '#10B981'
    },

  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
       
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
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 42 : 54,
    paddingBottom: 8,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    minHeight: 60
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    maxWidth: 220
  },
  subtitleText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2
  },
  logoutButton: {
    padding: 6
  },
  chartContainer: {
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8
  },emptyClientsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    marginTop: 8,
  },
  emptyClientsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  emptyClientsSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  emptyAddButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  
  earningsAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 10
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16
  },
  quickActionsContainer: {
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 15,
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
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 8,
    width: '48%',
    marginBottom: 10,
    gap: 8
  },
  actionIcon: {
    marginRight: 6
  },
  actionButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600'
  },
  statsContainer: {
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 15,
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
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: 2
  },
  statCard: {
    width: '23%',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
    marginBottom: 0
  },
  statIcon: {
    marginBottom: 2
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 2
  },
  statLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center'
  },
  clientListSection: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 10,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  clientListLoading: {
    color: '#6B7280',
    fontSize: 15,
    textAlign: 'center',
  },
  clientCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 12,
    minWidth: 180,
    maxWidth: 220,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  clientCardName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  clientCardAddress: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  clientCardCallBtn: {
    marginLeft: 8,
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 6,
  },
});

export default Returnfilling; 