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
import { authService } from '../../services/auth';

// Response interceptor
axios.interceptors.response.use(
  response => response,
  error => Promise.reject(error)
);

const { width, height } = Dimensions.get('window');

// Define styles

const getAllMonths = () => {
  const months = [];
  const date = new Date();
  const currentMonth = date.getMonth(); // 0 = Jan
  const currentYear = date.getFullYear();
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul",
    "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  // Get 6 months before and 6 months after current month
  for (let i = -6; i <= 6; i++) {
    const tempDate = new Date(currentYear, currentMonth + i, 1);
    const month = tempDate.getMonth();
    const year = tempDate.getFullYear();
    const monthName = monthNames[month];
    const isCurrent = month === currentMonth && year === currentYear;

    months.push({
      key: `${monthName}-${year}`,
      monthName: monthName,
      month: month + 1, // 1-12
      year: year,
      displayName: monthName,
      fullYear: year,
      isCurrent: isCurrent,
      date: tempDate
    });
  }

  return months;
};
// Reorder months so current month stays after previous ones
const reorderMonths = () => {
  const allMonths = getAllMonths();
  const currentIndex = allMonths.findIndex((m) => m.isCurrent);

  const previous = allMonths.slice(0, currentIndex);
  const current = allMonths[currentIndex];
  const future = allMonths.slice(currentIndex + 1);

  return [...previous, current, ...future];
};

const months = reorderMonths();


const STATUS_OPTIONS = [
  { id: 'filed', label: 'File', color: '#10B981', icon: 'checkmark-circle' },
  { id: 'not_filed', label: 'Not File', color: '#EF4444', icon: 'close-circle' }
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
  const currentYear = new Date().getFullYear();
  const [filteredClients, setFilteredClients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const scrollViewRef = useRef(null);
  const [fee, setFee] = useState(0);


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


  // Simple retry mechanism with limited retries
  const fetchWithRetry = async (url, options = {}) => {
    const maxRetries = 3;
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios({
          ...options,
          url: `${API_BASE_URL}${url}`,
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
          transformResponse: [
            (data) => {
              try {
                return typeof data === 'string' ? JSON.parse(data) : data;
              } catch (e) {
                console.error('Error parsing JSON response:', e);
                return data; // Return as is if parsing fails
              }
            }
          ]
        });

        // Ensure consistent response format
        if (response.data && typeof response.data === 'object') {
          // Check if the response indicates an error
          if (response.data.error) {
            throw new Error(`API Error: ${response.data.message || 'Unknown error'}`);
          }
          return response;
        } else if (typeof response.data === 'string') {
          // If we still have a string, try to parse it
          try {
            const parsedData = JSON.parse(response.data);
            if (parsedData && parsedData.error) {
              throw new Error(`API Error: ${parsedData.message || 'Unknown error'}`);
            }
            response.data = parsedData;
            return response;
          } catch (e) {
            throw new Error('Invalid JSON response from server');
          }
        }

        return response;
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          // Retrying API call...
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
        }
      }
    }
    throw lastError; // If all retries failed, throw the last error
  };
const fetchClients = useCallback(async () => {
  setLoading(true);
  setRefreshing(true);
  setError(null);

  try {
    const creds = await authService.getStoredCredentials();
    if (!creds?.email) return;

    const caUserName = creds.email;

    const res = await axios.get(`${API_BASE_URL}/returns/all`, {
      params: {
        year: new Date().getFullYear(),
        caUserName,
        ...(searchQuery.trim() && { search: searchQuery.trim() }),
      },
    });

    const data = res.data?.data || [];

    // Convert API response to your UI structure
    const mappedClients = data.map(item => ({
      _id: item.client._id,
      businessName: item.client.businessName,
      name: item.client.businessName,
      email: item.client.email,
      phone: item.client.phone,
      gstNumber: item.gstNumber,
      returns: {
        gst: {
          [item.year]: Object.fromEntries(
            Object.entries(item.months).map(([m, v]) => [
              Number(m),
              { status: v.status }
            ])
          )
        }
      }
    }));

    setClients(mappedClients);
    setFilteredClients(mappedClients);

  } catch (e) {
    console.log("Return Filing Load Error:", e);
    Alert.alert("Error", "Failed to load Return Filing data");
  } finally {
    setLoading(false);
    setRefreshing(false);
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
    const mappedStatus = status === 'filed' ? 'filed' : 'not_filed';
    setTempStatus(mappedStatus);

    const client = clients.find(c => c._id === selectedClient);
    setFee(client?.defaultFee || 0);   // <-- AUTO FILL FEE

    setShowConfirmation(true);
    setStatusModalVisible(false);
  };

  const getShortMonthName = (monthNumber) => {
    const date = new Date(2023, monthNumber - 1, 1);
    return date.toLocaleString('default', { month: 'short' });
  };

  const confirmStatusUpdate = async () => {
    if (!selectedClient || !selectedMonth || tempStatus === undefined) {
      Alert.alert('Error', 'Missing required data for update');
      return;
    }

    setLoading(true);

    try {
      const client = clients.find(c => c._id === selectedClient);
      if (!client) {
        Alert.alert('Error', 'Client not found');
        return;
      }

      const backendStatus = tempStatus === 'filed' ? 'filed' : 'not_filed';

      // Create month key in format 'MMM 'YY' to match renderStatusCell format (e.g., 'Jan '23')
      const monthKey = `${selectedMonth.monthName} '${String(selectedMonth.year).slice(-2)}`;

      // Create display name for the month (e.g., 'Jan 2023')
      const displayMonthName = `${selectedMonth.monthName} ${selectedMonth.year}`;

      // Create optimistic update
      const updatedClients = clients.map(c => {
        if (c._id === selectedClient) {
          return {
            ...c,
            status: {
              ...c.status,
              [monthKey]: backendStatus,
              // Also store the display name for rendering
              [`${monthKey}_display`]: displayMonthName
            }
          };
        }
        return c;
      });

      // Update local state immediately for better UX
      setClients(updatedClients);
      setFilteredClients(updatedClients);

      // Prepare update data
      const updateData = {
        clientId: selectedClient,
        month: selectedMonth.monthName,
        monthNumber: selectedMonth.month,
        year: selectedMonth.year,
        status: backendStatus,
        gstNumber: client.gstNumber,
        fee: fee,
        totalOutstanding: client.totalOutstanding || 0
      };

      // Send update to server
      const response = await axios.put(
        `${API_BASE_URL}/returns/update-status`,
        updateData,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'Authorization': `Bearer ${await AsyncStorage.getItem('userToken')}`
          },
          timeout: 10000
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update status');
      }

      // Reset selections and close modals on success
      setSelectedStatus('');
      setSelectedClient(null);
      setSelectedMonth(null);
      setShowConfirmation(false);
      setStatusModalVisible(false);

    
      Alert.alert('Success', `Status updated successfully for ${displayMonthName}`);
    } catch (error) {
      console.error('Error updating status:', error);
      // Revert to previous state on error
     
      Alert.alert('Error', error.response?.data?.message || 'Failed to update status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStatusCell = (client, month) => {
    if (!client || !month) return null;

    const monthKey = `${month.monthName} '${month.year.toString().slice(-2)}`;
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // 1-12

    // Determine if the month is in the past, current, or future
    const isPastMonth = month.year < currentYear ||
      (month.year === currentYear && month.month < currentMonth);
    const isFutureMonth = month.year > currentYear ||
      (month.year === currentYear && month.month > currentMonth);

    // Get the status from client.returns.months or default to 'not_filed'
let backendStatus = 'not_filed';

// 1️⃣ Highest Priority → Local updated state
if (client.status && client.status[monthKey]) {
  backendStatus = client.status[monthKey];
}

// 2️⃣ Backend structured GST status
else if (client.returns?.gst?.[month.year]?.[month.month]) {
  backendStatus = client.returns.gst[month.year][month.month].status || 'not_filed';
}

// 3️⃣ Older format fallback
else if (client.returns?.months) {
  const monthEntry = Object.entries(client.returns.months).find(([key, m]) => {
    const monthNum = parseInt(key, 10);
    return m && monthNum === month.month && client.returns.year === month.year;
  });

  if (monthEntry?.[1]?.status) {
    backendStatus = monthEntry[1].status;
  }
}

    // For future months, always show 'Not Started' and make non-editable
    if (isFutureMonth) {
      return (
        <View style={[
          styles.statusCell,
          {
            backgroundColor: '#F3F4F6',
            borderWidth: 1,
            borderColor: '#E5E7EB',
            borderRadius: 8,
            opacity: 0.7
          }
        ]}>
          <Text style={[styles.statusText, { color: '#6B7280' }]}>
            Not Started
          </Text>
        </View>
      );
    }

    // Determine the status to display - only 'filed' or 'not_filed'
    const getStatusConfig = (status) => {
      // First check if status is an object with a 'status' property
      const statusValue = status && typeof status === 'object' ? status.status : status;

      const isFiled = statusValue === 'filed' || statusValue === 'completed';

      const config = isFiled ? {
        color: '#10B981',
        label: 'Filed',
        icon: 'checkmark-circle',
        isCompleted: true
      } : {
        color: '#EF4444',
        label: 'Not Filed',
        icon: 'close-circle',
        isCompleted: false
      };

      return config;
    };


    // Use the backend status directly if available, otherwise default to 'not_filed'
    const statusToUse = backendStatus || 'not_filed';
    const statusConfig = getStatusConfig(statusToUse);
    const showCheckmark = statusConfig.isCompleted;

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
        onPress={() => handleStatusSelect(client._id, month, statusToUse)}
      >
        {/* Radio button indicator */}
        <View style={[
          styles.radioButton,
          {
            borderColor: statusConfig.color,
            backgroundColor: showCheckmark ? statusConfig.color : 'transparent'
          }
        ]}>
          {showCheckmark && (
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          )}
        </View>

        {/* Status text */}
        <Text style={[
          styles.statusText,
          {
            color: statusConfig.color,
            fontWeight: statusToUse !== 'not_started' ? '600' : '400',
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
  }, [])
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
        <View style={styles.gridContainer}>
          {/* Fixed Business Names Column */}
          <View style={styles.fixedColumn}>
            <View style={[styles.headerCell, { borderRightWidth: 1, borderRightColor: '#E5E7EB' }]}>
              <Text style={styles.headerText}>Business Name</Text>
            </View>
            <FlatList
              data={filteredClients}
              renderItem={({ item }) => (
                <View style={styles.clientNameCell}>
                  <Text style={styles.clientNameText} numberOfLines={1}>
                    {item.businessName || item.name || 'Unnamed Business'}
                  </Text>
                </View>
              )}
              keyExtractor={(item) => item._id}
              ListEmptyComponent={
                <View style={[styles.emptyContainer, { width: 200 }]}>
                  <Ionicons name="document-text-outline" size={32} color="#9CA3AF" />
                  <Text style={styles.emptyText}>
                    {loading ? 'Loading...' : 'No clients found'}
                  </Text>
                </View>
              }
            />
          </View>

          {/* Scrollable Months Section */}
          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={true}
            onLayout={() => {
              // Auto-scroll to current month
              const currentIndex = months.findIndex((m) => m.isCurrent);
              if (currentIndex !== -1 && scrollViewRef.current) {
                const scrollPosition = currentIndex * 100; // 100 = width of each month cell
                scrollViewRef.current.scrollTo({
                  x: scrollPosition,
                  animated: true,
                });
              }
            }}
            style={styles.scrollableSection}
          >
            <View>
              {/* Header Row */}
              <View style={styles.headerRow}>
                {months.map((month, index) => (
                  <View key={`month-header-${month.key}-${index}`} style={styles.monthHeaderCell}>
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
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                      {loading ? 'Loading clients...' : 'No clients found'}
                    </Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <View style={styles.clientRow}>
                    {months.map((month) => (
                      <View key={`${item._id}-${month.key}`} style={styles.statusCell}>
                        {renderStatusCell(item, month)}
                      </View>
                    ))}
                  </View>
                )}
                keyExtractor={(item) => item._id}
              />
            </View>
          </ScrollView>
        </View>
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

            <View style={styles.confirmationDetailRow}>
              <Ionicons name="cash" size={18} color="#6B7280" />
              <Text style={styles.confirmationDetailLabel}>Fee:</Text>

              <TextInput
                value={String(fee)}
                keyboardType="numeric"
                onChangeText={(v) => setFee(Number(v))}
                style={{
                  borderWidth: 1,
                  borderColor: '#D1D5DB',
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  height: 32,
                  width: 100
                }}
              />
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

  // Grid Container
  gridContainer: {
    flex: 1,
    flexDirection: 'row',
  },

  // Fixed Column (Business Names)
  fixedColumn: {
    width: 200,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    backgroundColor: '#FAFBFC',
  },

  // Scrollable Section (Months)
  scrollableSection: {
    flex: 1,
  },

  // Loading & Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    fontFamily: 'System',
    lineHeight: 20,
    marginTop: 8,
  },

  // Status Grid
  statusSection: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Header Row
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F8FAFC',
    minHeight: 60,
  },
  headerCell: {
    width: '100%',
    padding: 16,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    height: 60,
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
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  clientNameCell: {
    width: '100%',
    padding: 16,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FAFBFC',
    minHeight: 70,
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
