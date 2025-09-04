import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import axios from "axios";
import { API_BASE_URL } from '../../config';

const { width, height } = Dimensions.get('window');

// Define styles


// Generate months from current month to previous months
const getLastSixMonths = () => {
  const months = [];
  const date = new Date();
  const currentMonth = date.getMonth();
  const currentYear = date.getFullYear();
  
  // Start from current month and go back 5 more months (total 6 months)
  for (let i = 0; i < 6; i++) {
    // Calculate month and year (handling year transitions)
    const month = (currentMonth - i + 12) % 12;
    const year = currentYear - Math.floor((i - currentMonth) / 12);
    
    // Format month name (short)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = monthNames[month];
    
    // Format display values
    const formattedMonth = `${monthName} ${year}`;
    const monthKey = `${monthName} '${year.toString().slice(-2)}`;
    
    // Add to beginning of array to maintain reverse chronological order
    months.unshift({
      value: formattedMonth,
      key: monthKey,
      monthName: monthName,
      month: month + 1, // 1-12
      year: year,
      displayName: monthName,
      fullYear: year,
      isCurrent: i === 0 // Mark current month
    });
    
    // Move to previous month
    date.setMonth(date.getMonth() - 1);
  }
  
  return months;
};

const months = getLastSixMonths();

const STATUS_OPTIONS = [
  { id: 'completed', label: 'Completed', color: '#10B981', icon: 'checkmark-circle' },
  { id: 'in_progress', label: 'In Progress', color: '#3B82F6', icon: 'time' },
  { id: 'pending', label: 'Pending', color: '#F59E0B', icon: 'alert-circle' },
  { id: 'not_started', label: 'Not Started', color: '#9CA3AF', icon: 'ellipse-outline' },
  { id: 'overdue', label: 'Overdue', color: '#EF4444', icon: 'alert' }
];

const Returnfilling = () => {
  const navigation = useNavigation();
  const [statusPopupVisible, setStatusPopupVisible] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [tempStatus, setTempStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollViewRef = useRef(null);
  
  // Update filtered clients when clients or search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredClients(clients);
    } else {
      const filtered = clients.filter(client => 
        client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.phone?.includes(searchQuery)
      );
      setFilteredClients(filtered);
    }
  }, [clients, searchQuery]);
  const [userToken, setUserToken] = useState('');

  // Set header options
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Return Filling Status',
      headerStyle: {
        backgroundColor: '#f8f9fa',
        elevation: 0,
        shadowOpacity: 0
      },
      headerLeft: () => (
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={{ marginLeft: 16 }}
        >
          <Ionicons name="arrow-back" size={24} color="#2563EB" />
        </TouchableOpacity>
      )
    });
  }, [navigation]);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      console.log('Fetching clients and returns data...');
      
      const timestamp = new Date().getTime();
      
      const [clientsRes, returnsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/clients`, {
          params: { 
            page: 1, 
            limit: 50,
            _t: timestamp,
            ...(searchQuery.trim() && { search: searchQuery.trim() })
          },
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }),
        axios.get(`${API_BASE_URL}/returns`, {
          params: { _t: timestamp },
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        })
      ]);
      
      const clientsData = clientsRes.data.clients || [];
      const returnsData = returnsRes.data.returns || returnsRes.data.data || [];
      
      console.log(`Fetched ${clientsData.length} clients and ${returnsData.length} return records`);
      console.log('Returns data structure:', returnsRes.data);
      
      // Create a map of client statuses
      const clientStatusMap = {};
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      console.log('Raw returns data:', JSON.stringify(returnsData, null, 2));
      
      returnsData.forEach(returnItem => {
        const clientId = returnItem.client?._id || returnItem.client;
        if (!clientId || !returnItem.monthNumber || !returnItem.year) return;

        if (!clientStatusMap[clientId]) {
          clientStatusMap[clientId] = {};
        }

        // Always use monthNumber from backend (1-12)
        const monthIndex = returnItem.monthNumber;
        if (monthIndex < 1 || monthIndex > 12) return;
        
        const monthName = monthNames[monthIndex - 1];
        const year = returnItem.year;
        const monthKey = `${monthName} '${year.toString().slice(-2)}`;

        // Store backend status directly - we'll map it in renderStatusCell
        console.log(`Mapping status for client ${clientId}, ${monthKey}: ${returnItem.status}`);
        clientStatusMap[clientId][monthKey] = returnItem.status;
      });
      
      console.log('Processed status map:', JSON.stringify(clientStatusMap, null, 2));
      console.log('Sample month keys being generated:', months.map(m => `${m.monthName} '${m.year.toString().slice(-2)}`));
   
      
      // Merge return statuses with client data
      const clientsWithStatus = clientsData.map(client => ({
        ...client,
        status: clientStatusMap[client._id] || {}
      }));
      
      setClients(clientsWithStatus);
      
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const filtered = clientsWithStatus.filter(client => 
          (client.name?.toLowerCase().includes(query) ||
          client.email?.toLowerCase().includes(query) ||
          client.phone?.includes(query))
        );
        setFilteredClients(filtered);
      } else {
        setFilteredClients(clientsWithStatus);
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to fetch data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  // Handle status selection
  const handleStatusSelect = (clientId, month, currentStatus = '') => {
    setSelectedClient(clientId);
    setSelectedMonth(month);
    setSelectedStatus(currentStatus);
    setStatusModalVisible(true);
  };

  const handleStatusUpdate = (status) => {
    // Map the status to ensure we're using the correct format
    const statusMap = {
      'not_started': 'pending',
      'in_progress': 'in-progress',
      'completed': 'completed',
      'overdue': 'filed',
      'pending': 'pending',
      'filed': 'filed'
    };
    
    setTempStatus(status);
    setShowConfirmation(true);
    setStatusModalVisible(false);
  };

  const getShortMonthName = (monthNumber) => {
    const date = new Date(2023, monthNumber - 1, 1);
    return date.toLocaleString('default', { month: 'short' });
  };

  const confirmStatusUpdate = async () => {
    try {
      if (!selectedClient || !selectedMonth) {
        throw new Error('Missing required data for update');
      }
      
      setLoading(true);
      
      // Status mapping (frontend -> backend)
      const statusMapToBackend = {
        'not_started': 'pending',
        'in_progress': 'in-progress',
        'completed': 'completed',
        'overdue': 'filed',
        'pending': 'pending'
      };
      
      const backendStatus = statusMapToBackend[tempStatus] || 'pending';
      
      // Get month name in full format (e.g., "September")
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const fullMonthName = monthNames[selectedMonth.month - 1];
      
      const updateData = {
        clientId: selectedClient,
        month: `${fullMonthName} ${selectedMonth.year}`,
        status: backendStatus,
        monthNumber: selectedMonth.month,
        year: selectedMonth.year
      };
      
      console.log('Updating status:', updateData);
      
      const response = await axios.put(
        `${API_BASE_URL}/returns/update-status`,
        updateData,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      if (response.data.success) {
        // Refetch data to ensure consistency with backend
        await fetchClients();
        
        Alert.alert('Success', 'Status updated successfully');
      } else {
        throw new Error(response.data.message || 'Failed to update status');
      }
      
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update status');
    } finally {
      setLoading(false);
      setShowConfirmation(false);
      setTempStatus('');
      setSelectedStatus('');
    }
  };


const renderStatusCell = (client, month) => {
  if (!client || !month) return null;
  
  const monthKey = `${month.monthName} '${month.year.toString().slice(-2)}`;
  const backendStatus = (client.status && client.status[monthKey]) || 'pending';
  
  // Map backend status to frontend status
  const statusMap = {
    'pending': 'not_started',
    'in-progress': 'in_progress',
    'completed': 'completed',
    'filed': 'overdue'
  };
  
  const frontendStatus = statusMap[backendStatus] || 'not_started';
  const statusConfig = STATUS_OPTIONS.find(opt => opt.id === frontendStatus) || { 
    color: '#9CA3AF', 
    label: 'Not Started',
    icon: 'help-circle-outline'
  };
  
  return (
    <TouchableOpacity 
      style={[
        styles.statusCell, 
        { 
          backgroundColor: `${statusConfig.color}15`,
          borderWidth: month.isCurrent ? 2 : 1,
          borderColor: month.isCurrent ? statusConfig.color : '#E5E7EB',
          borderRadius: 8,
        }
      ]}
      onPress={() => handleStatusSelect(client._id, month, frontendStatus)}
    >
      {/* Radio button indicator */}
      <View style={[
        styles.radioButton,
        {
          borderColor: statusConfig.color,
          backgroundColor: frontendStatus !== 'not_started' ? statusConfig.color : 'transparent'
        }
      ]}>
        {frontendStatus !== 'not_started' && (
          <View style={[styles.radioButtonInner, { backgroundColor: '#FFFFFF' }]} />
        )}
      </View>
      
      {/* Status text */}
      <Text style={[
        styles.statusText, 
        { 
          color: statusConfig.color,
          fontWeight: frontendStatus !== 'not_started' ? '600' : '400',
          fontSize: 11
        }
      ]}>
        {statusConfig.label}
      </Text>
    </TouchableOpacity>
  );
}; 

  const renderClientItem = ({ item }) => (
    <View style={styles.clientRow} key={item._id}>
      <View style={styles.clientNameCell}>
        <Text style={styles.clientNameText} numberOfLines={1}>
          {item.businessName || item.name || 'Unnamed Business'}
        </Text>
      </View>
      {months.map(month => (
        <View key={`${item._id}-${month.key}`} style={styles.statusCell}>
          {renderStatusCell(item, month)}
        </View>
      ))}
    </View>
  );

  useFocusEffect(
    useCallback(() => {
      fetchClients();
    }, [fetchClients])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchClients();
    setRefreshing(false);
  };

  
  
  // Render loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search clients..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      
      </View>

      {/* Status Grid */}
      <View style={styles.statusSection}>
        <ScrollView 
          ref={scrollViewRef}
          horizontal 
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={styles.scrollContent}
        >
          <View>
            {/* Header Row */}
            <View style={styles.headerRow}>
              <View style={styles.headerCell}>
                <Text style={styles.headerText}>Business Name</Text>
              </View>
              {months.map((month, index) => (
                <View key={`month-header-${month.month}-${month.year}-${index}`} style={styles.monthHeaderCell}>
                  <Text style={[
                    styles.monthHeaderText,
                    month.isCurrent && { fontWeight: 'bold', color: '#3B82F6' }
                  ]}>
                    {month.displayName}
                  </Text>
                  <Text style={[
                    styles.monthYearText,
                    month.isCurrent && { color: '#3B82F6' }
                  ]}>
                    {month.fullYear}
                  </Text>
                </View>
              ))}
            </View>

            {/* Client Rows */}
            <FlatList
              data={filteredClients}
              renderItem={renderClientItem}
              keyExtractor={(item) => item._id}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#3B82F6']}
                  tintColor="#3B82F6"
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="document-text-outline" size={48} color="#9CA3AF" />
                  <Text style={styles.emptyText}>
                    {loading ? 'Loading...' : 'No clients found'}
                  </Text>
                </View>
              }
            />
          </View>
        </ScrollView>
      </View>

      {/* Status Update Modal */}
    {/* Status Update Modal */}
<Modal
  visible={statusModalVisible}
  transparent={true}
  animationType="slide"
  onRequestClose={() => setStatusModalVisible(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.statusModalContent}>
      
      {/* Header */}
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Update Return Status</Text>
        <TouchableOpacity 
          onPress={() => setStatusModalVisible(false)}
          style={styles.modalCloseButton}
        >
          <Ionicons name="close" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* Client + Month Info */}
      <View style={styles.modalInfoContainer}>
        <Text style={styles.modalInfoText}>
          <Text style={styles.modalInfoLabel}>Client: </Text>
          {selectedClient && clients.find(c => c._id === selectedClient)?.businessName || 
           selectedClient && clients.find(c => c._id === selectedClient)?.name || 
           'Unknown Client'}
        </Text>
        <Text style={styles.modalInfoText}>
          <Text style={styles.modalInfoLabel}>Month: </Text>
          {selectedMonth ? `${selectedMonth.displayName} ${selectedMonth.fullYear}` : 'Unknown Month'}
        </Text>
      </View>

      {/* Status Options */}
      <ScrollView style={styles.statusOptionsContainer}>
        {STATUS_OPTIONS.map(option => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.statusOption,
              selectedStatus === option.id && { 
                backgroundColor: `${option.color}15`,
                borderColor: option.color,
                borderWidth: 2,
              }
            ]}
            onPress={() => setSelectedStatus(option.id)}
          >
            <Ionicons 
              name={option.icon} 
              size={22} 
              color={selectedStatus === option.id ? option.color : '#6B7280'} 
              style={{ marginRight: 12 }}
            />
            <Text style={[
              styles.statusOptionText,
              { color: selectedStatus === option.id ? option.color : '#111827' }
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.modalFooter}>
        <TouchableOpacity
          style={[styles.modalButton, styles.cancelButton]}
          onPress={() => setStatusModalVisible(false)}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.modalButton,
            styles.submitButton,
            !selectedStatus && { opacity: 0.5 }
          ]}
          onPress={() => handleStatusUpdate(selectedStatus)}
          disabled={!selectedStatus}
        >
          <Text style={styles.submitButtonText}>Update</Text>
        </TouchableOpacity>
      </View>

    </View>
  </View>
</Modal>


      {/* Confirmation Dialog */}
      <Modal
        visible={showConfirmation}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmation(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmationModal}>
            <Text style={styles.confirmationTitle}>Confirm Status Update</Text>
            
            {/* Update details */}
            <View style={styles.confirmationDetails}>
              <View style={styles.confirmationDetailRow}>
                <Ionicons name="business" size={18} color="#6B7280" />
                <Text style={styles.confirmationDetailLabel}>Client:</Text>
                <Text style={styles.confirmationDetailValue}>
                  {selectedClient && clients.find(c => c._id === selectedClient)?.businessName || 
                   selectedClient && clients.find(c => c._id === selectedClient)?.name || 
                   'Unknown Client'}
                </Text>
              </View>
              
              <View style={styles.confirmationDetailRow}>
                <Ionicons name="calendar" size={18} color="#6B7280" />
                <Text style={styles.confirmationDetailLabel}>Month:</Text>
                <Text style={styles.confirmationDetailValue}>
                  {selectedMonth ? `${selectedMonth.displayName} ${selectedMonth.fullYear}` : 'Unknown Month'}
                </Text>
              </View>
              
              <View style={styles.confirmationDetailRow}>
                <Ionicons name="checkmark-circle" size={18} color="#6B7280" />
                <Text style={styles.confirmationDetailLabel}>New Status:</Text>
                <Text style={[
                  styles.confirmationDetailValue,
                  { color: STATUS_OPTIONS.find(opt => opt.id === tempStatus)?.color || '#1F2937' }
                ]}>
                  {STATUS_OPTIONS.find(opt => opt.id === tempStatus)?.label || tempStatus}
                </Text>
              </View>
            </View>
            
            <Text style={styles.confirmationText}>
              Are you sure you want to update this return status?
            </Text>
            <View style={styles.confirmationButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelButton]}
                onPress={() => setShowConfirmation(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.submitButton]}
                onPress={confirmStatusUpdate}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
    // Layout
    container: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    
    // Search Section
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F3F4F6',
      borderRadius: 8,
      margin: 16,
      paddingHorizontal: 16,
      height: 48,
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },
    searchInput: {
      flex: 1,
      height: '100%',
      marginLeft: 8,
      color: '#1F2937',
      fontSize: 16,
      fontFamily: 'System',
    },
    searchIcon: {
      marginRight: 8,
      color: '#6B7280',
    },
 
  
    
    // Loading & Empty States
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    emptyText: {
      fontSize: 16,
      color: '#6B7280',
      textAlign: 'center',
      fontFamily: 'System',
      lineHeight: 24,
    },
    
    // Status Grid
    statusSection: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    scrollContent: {
      paddingBottom: 20,
    },
    
    // Header Row
    headerRow: {
      flexDirection: 'row',
      borderBottomWidth: 2,
      borderBottomColor: '#E5E7EB',
      backgroundColor: '#F1F5F9',
      paddingVertical: 0,
    },
    headerCell: {
      width: 200,
      paddingHorizontal: 16,
      paddingVertical: 16,
      justifyContent: 'center',
      borderRightWidth: 1,
      borderRightColor: '#E5E7EB',
      backgroundColor: '#F8FAFC',
    },
    headerText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#1F2937',
      fontFamily: 'System',
    },
    
    // Month Headers
    monthHeaderCell: {
      width: 100,
      paddingHorizontal: 8,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F8FAFC',
      borderRightWidth: 1,
      borderRightColor: '#E5E7EB',
      minHeight: 60,
    },
    monthHeaderText: {
      fontWeight: '700',
      color: '#1F2937',
      textAlign: 'center',
      fontSize: 13,
      fontFamily: 'System',
      marginBottom: 2,
    },
    monthYearText: {
      fontWeight: '500',
      color: '#6B7280',
      fontSize: 11,
      fontFamily: 'System',
    },
    
    // Client Rows
    clientRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#E5E7EB',
      minHeight: 70,
      backgroundColor: '#FFFFFF',
    },
    statusCell: {
      width: 100,
      padding: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    clientNameCell: {
      width: 200,
      padding: 16,
      justifyContent: 'center',
      borderRightWidth: 1,
      borderRightColor: '#E5E7EB',
      backgroundColor: '#FAFBFC',
    },
    clientNameText: {
      fontSize: 14,
      color: '#1F2937',
      fontFamily: 'System',
      fontWeight: '500',
    },
    
    // Status Cells
    statusCell: {
      width: 100,
      padding: 6,
      alignItems: 'center',
      justifyContent: 'center',
      borderRightWidth: 1,
      borderRightColor: '#E5E7EB',
      minHeight: 60,
    },
    

    
    // Radio Button Styles
    radioButton: {
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 2,
      marginBottom: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioButtonInner: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    modalRadioButton: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalRadioButtonInner: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    
    // Status Options
    statusOptionsContainer: {
      marginBottom: 24,
    },
    statusOptionsTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#1F2937',
      marginBottom: 12,
      fontFamily: 'System',
    },
    statusOption: {
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 6,
      marginBottom: 4,
    },
    statusOptionText: {
      marginLeft: 8,
      fontSize: 14,
      color: '#1F2937',
      fontFamily: 'System',
    },
    
    // Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    statusModalContent: {
      backgroundColor: 'white',
      borderRadius: 12,
      padding: 24,
      width: '90%',
      maxWidth: 400,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: '#111827',
      fontFamily: 'System',
      flex: 1,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#E5E7EB',
    },
    modalCloseButton: {
      padding: 4,
      borderRadius: 20,
      backgroundColor: '#F3F4F6',
    },
    modalSubtitle: {
      fontSize: 16,
      color: '#6B7280',
      marginBottom: 24,
      textAlign: 'center',
      fontFamily: 'System',
    },
    
    // Modal Info Container
    modalInfoContainer: {
      backgroundColor: '#F8FAFC',
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },
    modalInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    modalInfoLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: '#374151',
      marginLeft: 8,
      marginRight: 8,
      minWidth: 80,
    },
    modalInfoValue: {
      fontSize: 14,
      color: '#1F2937',
      fontWeight: '500',
      flex: 1,
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 24,
    },
    modalButton: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButton: {
      backgroundColor: '#F3F4F6',
      marginRight: 8,
    },
    submitButton: {
      backgroundColor: '#3B82F6',
      marginLeft: 8,
      opacity: 1,
    },
    cancelButtonText: {
      color: '#374151',
      fontWeight: '600',
      fontSize: 16,
      fontFamily: 'System',
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontWeight: '600',
      fontSize: 16,
      fontFamily: 'System',
    },
    confirmationModal: {
      backgroundColor: 'white',
      borderRadius: 12,
      padding: 24,
      width: '90%',
      maxWidth: 400,
    },
    confirmationTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: '#111827',
      marginBottom: 16,
      textAlign: 'center',
      fontFamily: 'System',
    },
    confirmationText: {
      fontSize: 16,
      color: '#4B5563',
      marginBottom: 24,
      textAlign: 'center',
      lineHeight: 24,
      fontFamily: 'System',
    },
    
    // Confirmation Details
    confirmationDetails: {
      backgroundColor: '#F8FAFC',
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },
    confirmationDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    confirmationDetailLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: '#374151',
      marginLeft: 6,
      marginRight: 8,
      minWidth: 70,
    },
    confirmationDetailValue: {
      fontSize: 13,
      color: '#1F2937',
      fontWeight: '500',
      flex: 1,
    },
    confirmationButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    confirmButton: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statusText: {
      fontSize: 12,
      fontWeight: '500',
      textAlign: 'center',
      fontFamily: 'System',
    },

    statusModalContent: {
      backgroundColor: 'white',
      borderRadius: 16,
      padding: 20,
      width: '90%',
      maxHeight: '80%',
    },
    
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#111827',
    },
    
    modalCloseButton: {
      padding: 6,
      borderRadius: 20,
      backgroundColor: '#F3F4F6',
    },
    
    modalInfoContainer: {
      backgroundColor: '#F9FAFB',
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },
    
    modalInfoText: {
      fontSize: 14,
      color: '#374151',
      marginBottom: 6,
    },
    
    modalInfoLabel: {
      fontWeight: '600',
      color: '#111827',
    },
    
    statusOptionsContainer: {
      flexGrow: 0,
      marginBottom: 20,
    },
    
    statusOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },
    
    statusOptionText: {
      fontSize: 15,
      fontWeight: '500',
    },
    
    modalFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    
    modalButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 4,
    },
    
    cancelButton: {
      backgroundColor: '#F3F4F6',
    },
    
    cancelButtonText: {
      color: '#374151',
      fontWeight: '600',
    },
    
    submitButton: {
      backgroundColor: '#3B82F6',
    },
    
    submitButtonText: {
      color: '#FFFFFF',
      fontWeight: '600',
    },
    
    cancelButtonText: {
      color: '#4B5563',
      fontSize: 16,
      fontWeight: '600',
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });
export default Returnfilling;
        