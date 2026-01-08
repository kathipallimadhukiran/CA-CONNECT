import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';
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
import { Picker } from '@react-native-picker/picker';


// Response interceptor
axios.interceptors.response.use(
  response => response,
  error => Promise.reject(error)
);

const { width, height } = Dimensions.get('window');

const getCurrentFY = () => {
  const today = new Date();
  return today.getMonth() + 1 < 4
    ? today.getFullYear() - 1
    : today.getFullYear();
};

const getMonthsForFY = (fy) => {
  const monthNames = [
    'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
    'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'
  ];

  return monthNames.map((name, index) => {
    const monthNumber = index < 9 ? index + 4 : index - 8; // Apr=4 ... Mar=3
    const year = index < 9 ? fy : fy + 1; // First 9 months (Apr-Dec) are in the current FY, next 3 (Jan-Mar) in next year
    const displayYear = monthNumber <= 3 ? fy + 1 : fy; // For display purposes

    const today = new Date();
    const isCurrent =
      fy === getCurrentFY() &&
      today.getFullYear() === year &&
      today.getMonth() + 1 === monthNumber;

    return {
      key: `${name}-${fy}-${index}`,
      monthName: name,
      month: monthNumber,
      year: year,
      displayName: name,
      fullYear: displayYear, // This is what's shown in the header
      isCurrent,
    };
  });
};



const STATUS_OPTIONS = [
  { id: 'filed', label: 'File', color: '#10B981', icon: 'checkmark-circle' },
  { id: 'not_filed', label: 'Not File', color: '#EF4444', icon: 'close-circle' }
];
const formatGstTypeLabel = (client) => {
  if (client.gstType === 'composition') {
    return 'Composition (Quarterly)';
  }

  if (client.gstType === 'iff') {
    return client.frequency === '3'
      ? ' IFF (Quarterly)'
      : 'IFF (Monthly)';
  }

  return ' Regular';
};
const getFinancialYears = (count = 5) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // If before April, current FY started last year
  const startFY = currentMonth < 4 ? currentYear - 1 : currentYear;

  return Array.from({ length: count }, (_, i) => {
    const fyStart = startFY - i;
    return {
      label: `FY ${fyStart}-${String(fyStart + 1).slice(-2)}`,
      value: fyStart,
    };
  });
};

const getFYStatus = (client, fy) => {
  const monthsInFY = [
    4, 5, 6, 7, 8, 9, 10, 11, 12, // Apr–Dec
    1, 2, 3                // Jan–Mar
  ];

  let allFiled = true;

  for (const m of monthsInFY) {
    const year = m <= 3 ? fy + 1 : fy;
    const status =
      client.returns?.gst?.[year]?.[m]?.status || 'not_filed';

    if (status !== 'filed') {
      allFiled = false;
      break;
    }
  }

  return allFiled ? 'Filed' : 'Pending';
};


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
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  // Handle screen orientation changes
  useEffect(() => {
    // Allow all orientations
    ScreenOrientation.unlockAsync();

    // Update dimensions on orientation change
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });

    // Cleanup
    return () => {
      subscription?.remove();
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);
  const [refreshing, setRefreshing] = useState(false);
  const [clients, setClients] = useState([]);
  const currentYear = new Date().getFullYear();
  const [filteredClients, setFilteredClients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const scrollViewRef = useRef(null);
  const [fee, setFee] = useState(0);
  const [gstType, setGstType] = useState('monthly');
  const financialYears = getFinancialYears(5);
  const [selectedFY, setSelectedFY] = useState(financialYears[0].value);

  const months = getMonthsForFY(selectedFY);


  // Update filtered clients when clients or search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredClients(clients);
    } else {
      const filtered = clients.filter(client =>
        client.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
  useEffect(() => {
    console.log("Filtered Clients:", filteredClients);
  }, [filteredClients]);

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
          year: selectedFY,
          caUserName,
          ...(searchQuery.trim() && { search: searchQuery.trim() }),
        },
      });

      const data = res.data?.data || [];

      const mappedClients = data.map(item => ({
        _id: item.client._id,

        businessName: item.client.businessName || item.client.address || item.client.name,
        phone: item.client.phone || item.client.phoneNumber,
        email: item.client.email,
        gstNumber: item.gstNumber,

        gstType: (item.client.gstType || 'regular').toLowerCase(),

        frequency:
          item.client.gstType?.toLowerCase() === 'composition'
            ? '3'
            : item.client.frequency || '1',


        returns: {
          gst: {
            [item.year]: Object.fromEntries(
              Object.entries(item.months).map(([m, v]) => [
                m, // 👈 KEEP STRING
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
  }, [searchQuery, selectedFY]);



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

    // If client has GST type 'iff', show GST type selection
    if (client?.gstType === 'iff') {
      setGstType(client.frequency === '3' ? 'quarterly' : 'monthly');
      setShowConfirmation(true);
    }
    else {
      setShowConfirmation(true);
    }

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

    const client = clients.find(c => c._id === selectedClient);
    if (!client) {
      Alert.alert('Error', 'Client not found');
      return;
    }

    // If GST type is 'iff' and quarterly is selected, verify it's a quarter-end month
    if (client.gstType === 'iff' && gstType === 'quarterly') {
      const quarterEndMonths = [3, 6, 9, 12];
      if (!quarterEndMonths.includes(selectedMonth.month)) {
        Alert.alert('Error', 'Quarterly filing is only allowed for quarter-end months (Mar, Jun, Sep, Dec)');
        return;
      }
    }

    setLoading(true);

    try {
      const backendStatus = tempStatus === 'filed' ? 'filed' : 'not_filed';
      const displayMonthName = `${selectedMonth.monthName} ${selectedMonth.year}`;

      // Update local state first for immediate feedback
      setClients(prevClients => {
        const updated = prevClients.map(c => {
          if (c._id === selectedClient) {
            const updatedClient = { ...c };

            if (!updatedClient.returns) updatedClient.returns = { gst: {} };
            if (!updatedClient.returns.gst) updatedClient.returns.gst = {};
            if (!updatedClient.returns.gst[selectedMonth.year]) {
              updatedClient.returns.gst[selectedMonth.year] = {};
            }

            updatedClient.returns.gst[selectedMonth.year][String(selectedMonth.month)] = {
              status: backendStatus
            };


            return updatedClient;
          }
          return c;
        });

        // 🔥 IMPORTANT: sync filteredClients
        setFilteredClients(updated);

        return updated;
      });


      // Prepare update data
      const updateData = {
        clientId: selectedClient,
        month: selectedMonth.monthName,
        monthNumber: selectedMonth.month,
        year: selectedMonth.year,
        status: backendStatus,
        gstNumber: client.gstNumber,
        fee: fee,
        totalOutstanding: client.totalOutstanding || 0,
        gstType: client.gstType === 'iff' ? gstType : 'regular'
      };

      if (client.gstType === 'iff' && client.frequency === '3') {
        updateData.quarterlyFiling = true;
      }

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
      fetchClients(); // Refetch to ensure UI is in sync with server
      Alert.alert('Error', error.response?.data?.message || 'Failed to update status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStatusCell = (client, month) => {
    if (!client || !month) return null;

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    const isCurrentFY = selectedFY === getCurrentFY();

    const isFutureMonth =
      month.year > currentYear ||
      (month.year === currentYear && month.month > currentMonth);

    // ✅ ONLY current FY should show "Not Started"
    if (isCurrentFY && isFutureMonth) {
      return (
        <View style={styles.statusCell}>
          <Text style={{ color: '#6B7280', fontSize: 11 }}>
            Not Started
          </Text>
        </View>
      );
    }

    // 🔒 IFF / Composition quarterly rule
    if (
      (client.gstType === 'iff' || client.gstType === 'composition') &&
      client.frequency === '3' &&
      ![3, 6, 9, 12].includes(month.month)
    ) {
      return (
        <View style={[styles.statusCell, { opacity: 0.5 }]}>
          <Text style={{ fontSize: 11, color: '#9CA3AF' }}>—</Text>
        </View>
      );
    }

    // 📌 DB status resolution (NO DATA = NOT FILED)
    let backendStatus = 'not_filed';

    const monthKey = String(month.month);

    if (client.returns?.gst?.[month.year]?.[monthKey]) {
      backendStatus =
        client.returns.gst[month.year][monthKey].status || 'not_filed';
    }


    const isFiled = backendStatus === 'filed';

    const statusColor = isFiled ? '#10B981' : '#EF4444';
    const statusLabel = isFiled ? 'Filed' : 'Not Filed';

    return (
      <TouchableOpacity
        style={[
          styles.statusCell,
          {
            backgroundColor: `${statusColor}15`,
            borderColor: statusColor,
            borderWidth: 1,
            borderRadius: 8,
          },
        ]}
        onPress={() =>
          handleStatusSelect(client._id, month, backendStatus)
        }
      >
        <View
          style={[
            styles.radioButton,
            {
              borderColor: statusColor,
              backgroundColor: isFiled ? statusColor : 'transparent',
            },
          ]}
        >
          {isFiled && (
            <Ionicons name="checkmark" size={14} color="#fff" />
          )}
        </View>

        <Text
          style={{
            fontSize: 11,
            fontWeight: '600',
            color: statusColor,
          }}
        >
          {statusLabel}
        </Text>
      </TouchableOpacity>
    );
  };




  useEffect(() => {
    fetchClients();
  }, [selectedFY, searchQuery]);



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
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
    >

      {/* Financial Year */}
      <View style={{ marginHorizontal: 16, marginTop: 12 }}>
        <Text style={{ fontSize: 13, color: '#374151', marginBottom: 6 }}>
          Financial Year
        </Text>

        <View
          style={{
            borderWidth: 1,
            borderColor: '#E5E7EB',
            borderRadius: 8,
            paddingHorizontal: 12,
          }}
        >
       <Picker
  selectedValue={selectedFY}
  onValueChange={(value) => setSelectedFY(value)}
  style={{ color: '#111827' }}   // 👈 ADD THIS
>

            {financialYears.map((fy) => (
              <Picker.Item
                key={fy.value}
                label={fy.label}
                value={fy.value}
              />
            ))}
          </Picker>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6B7280" />
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

          {/* Fixed Column */}
          <View style={styles.fixedColumn}>
            <View style={styles.headerCell}>
              <Text style={styles.headerText}>Business Name</Text>
            </View>

            <FlatList
              data={filteredClients}
              scrollEnabled={false}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <View style={styles.clientNameCell}>
                  <Text style={styles.clientNameText} numberOfLines={1}>
                    {item.businessName || 'Unnamed Business'}
                  </Text>
                  <Text style={styles.gstTypeText}>
                    {formatGstTypeLabel(item)}
                  </Text>
                </View>
              )}
            />
          </View>

          {/* Horizontal Months */}
          <ScrollView
            horizontal
            ref={scrollViewRef}
            style={styles.scrollableSection}
            showsHorizontalScrollIndicator
          >
            <View>

              {/* Month Header */}
              <View style={styles.headerRow}>
                {months.map((month) => (
                  <View key={month.key} style={styles.monthHeaderCell}>
                    <Text style={styles.monthHeaderText}>
                      {month.displayName}
                    </Text>
                    <Text style={styles.monthYearText}>
                      {month.fullYear}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Client Rows */}
              <FlatList
                data={filteredClients}
                scrollEnabled={false}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <View style={styles.clientRow}>
                    {months.map((month) => (
                      <View key={`${item._id}-${month.key}`}>
                        {renderStatusCell(item, month)}
                      </View>
                    ))}
                  </View>
                )}
              />

            </View>
          </ScrollView>
        </View>
      </View>

     {/* Status Update Modal */}
      
      <Modal
  visible={statusModalVisible}
  transparent
  animationType="slide"
  onRequestClose={() => setStatusModalVisible(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.statusModalContainer}>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >

        {/* Header */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Update Return Status</Text>
          <TouchableOpacity
            onPress={() => setStatusModalVisible(false)}
            style={styles.modalCloseButton}
          >
            <Ionicons name="close" size={22} />
          </TouchableOpacity>
        </View>

        {/* Client + Month Info */}
        <View style={styles.modalInfoContainer}>
          <Text style={styles.modalInfoText}>
            <Text style={styles.modalInfoLabel}>Client: </Text>
            {clients.find(c => c._id === selectedClient)?.businessName || '—'}
          </Text>
          <Text style={styles.modalInfoText}>
            <Text style={styles.modalInfoLabel}>Month: </Text>
            {selectedMonth
              ? `${selectedMonth.displayName} ${selectedMonth.fullYear}`
              : '—'}
          </Text>
        </View>

        {/* Status Options */}
        {STATUS_OPTIONS.map(option => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.statusOption,
              selectedStatus === option.id && {
                borderColor: option.color,
                backgroundColor: `${option.color}15`,
              },
            ]}
            onPress={() => setSelectedStatus(option.id)}
          >
            <Ionicons name={option.icon} size={20} color={option.color} />
            <Text style={styles.statusOptionText}>{option.label}</Text>
          </TouchableOpacity>
        ))}

        {/* Footer */}
        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={[styles.modalButton, styles.cancelButton]}
            onPress={() => setStatusModalVisible(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modalButton, styles.submitButton]}
            disabled={!selectedStatus}
            onPress={() => handleStatusUpdate(selectedStatus)}
          >
            <Text style={styles.submitButtonText}>Update</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  </View>
</Modal>



      {/* Confirmation Dialog */}
    <Modal
  visible={showConfirmation}
  transparent
  animationType="fade"
  onRequestClose={() => setShowConfirmation(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.confirmationContainer}>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >

        <Text style={styles.confirmationTitle}>
          Confirm Status Update
        </Text>

        {/* GST Type */}
        {clients.find(c => c._id === selectedClient)?.gstType === 'iff' && (
          <View style={styles.gstTypeContainer}>
            ...
          </View>
        )}

        {/* Fee */}
        <View style={styles.confirmationDetailRow}>
          <Ionicons name="cash" size={18} />
          <TextInput
            value={String(fee)}
            keyboardType="numeric"
            onChangeText={(v) => setFee(Number(v))}
            style={styles.feeInput}
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
          >
            <Text style={styles.submitButtonText}>Confirm</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  </View>
</Modal>


    </ScrollView>
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
  gstTypeText: {
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'System',
    fontWeight: '600',
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
 flexGrow: 1,
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
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    minHeight: 60,
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
statusModalContainer: {
  width: '90%',
  padding: 10,
  maxHeight: '100%',
  backgroundColor: '#FFF',
  borderRadius: 16,
},

confirmationContainer: {
  width: '92%',
  padding: 10,
  maxHeight: '100%',
  backgroundColor: '#FFF',
  borderRadius: 16,
},

feeInput: {
  borderWidth: 1,
  borderColor: '#D1D5DB',
  borderRadius: 6,
  paddingHorizontal: 10,
  height: 36,
  width: 120,
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
