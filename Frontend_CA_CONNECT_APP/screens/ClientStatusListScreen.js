import React, { useState, useEffect, useCallback } from 'react';
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
  FlatList,
  TextInput
} from 'react-native';
import { API_BASE_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { authService } from '../services/auth';
import ClientCard from '../components/ClientCard';

const screenWidth = Dimensions.get('window').width;

const ClientStatusListScreen = () => {
  const navigation = useNavigation();
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, composition, regular, gst
  const [sortType, setSortType] = useState('pending'); // pending, non-pending, name
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);

  // Helper function to calculate pending files for a client
  const calculatePendingFiles = async (client) => {
    try {
      // Fetch return data for this client using the correct endpoint
      const response = await fetch(`${API_BASE_URL}/returns?clientId=${client._id}&gstNumber=${client.gstNumber}&year=2025`);
      const result = await response.json();

      if (!result.success) {
        return 0;
      }

      const returnData = result.data;
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth(); // 0-indexed (Jan=0, Dec=11)
      const currentDay = currentDate.getDate();
      const currentYear = currentDate.getFullYear();

      // Calculate pending files from April 2025 onwards
      // Only count months that have passed their filing deadline
      const startYear = 2025;
      const startMonth = 3; // April (0-indexed)

      let pendingCount = 0;

      // Loop through all months from April 2025 to December 2025 (only past months)
      let year = startYear;
      let month = startMonth;

      while (year < 2026 || (year === 2025 && month <= 11)) { // Only go up to Dec 2025

        // Calculate deadline for this month's return (20th of following month)
        let deadlineMonth, deadlineYear;

        if (month === 11) { // December return due in January next year
          deadlineMonth = 0;
          deadlineYear = year + 1;
        } else if (month === 10) { // November return due in December same year
          deadlineMonth = 11;
          deadlineYear = year;
        } else {
          deadlineMonth = month + 1;
          deadlineYear = year;
        }

        // Check if deadline has passed
        if (currentYear > deadlineYear ||
          (currentYear === deadlineYear && currentMonth > deadlineMonth) ||
          (currentYear === deadlineYear && currentMonth === deadlineMonth && currentDay > 20)) {

          // Get return data for this month from the returnData structure
          let monthData = null;
          if (returnData && returnData.months && returnData.months[month + 1]) {
            monthData = returnData.months[month + 1];
          }

          // For the simplified API structure, check the single status field
          // A month is completed only if status is 'filed' or 'not-applicable'
          const isCompleted = monthData &&
            (monthData.status === 'filed' || monthData.status === 'not-applicable');

          // Count as pending only if not completed
          if (!isCompleted) {
            pendingCount++;
          }
        }

        // Move to next month
        if (month === 11) {
          month = 0;
          year++;
        } else {
          month++;
        }
      }

      return pendingCount;
    } catch (error) {
      console.error('Error calculating pending files:', error);
      return 0;
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadClients();
    }, [])
  );

  const loadClients = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const { email } = await authService.getStoredCredentials();

      const res = await fetch(
        `${API_BASE_URL}/clients?page=1&limit=100&caUserName=${email}`,
        {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }
      );

      if (!res.ok) {
        throw new Error('Failed to load clients');
      }

      const data = await res.json();
      const clientList = data.clients || [];
      setClients(clientList);
      setFilteredClients(clientList);
    } catch (error) {
      console.error('Error loading clients:', error);
      Alert.alert('Error', 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadClients(true);
    setRefreshing(false);
  };

  const applyFiltersAndSort = useCallback(async () => {
    let filtered = [...clients];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(client =>
        client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.address?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(client => {
        switch (filterType) {
          case 'composition':
            return client.gstType === 'composition';
          case 'regular':
            return client.gstType === 'regular';
          case 'gst':
            return client.gstType === 'gst';
          default:
            return true;
        }
      });
    }

    // Apply sorting - handle async calculatePendingFiles
    if (sortType === 'pending' || sortType === 'non-pending') {
      // Calculate pending files for all clients
      const clientsWithPendingCount = await Promise.all(
        filtered.map(async (client) => {
          const pendingCount = await calculatePendingFiles(client);
          return { ...client, pendingCount };
        })
      );

      // Sort based on pending count
      clientsWithPendingCount.sort((a, b) => {
        if (sortType === 'pending') {
          return b.pendingCount - a.pendingCount;
        } else {
          return a.pendingCount - b.pendingCount;
        }
      });

      setFilteredClients(clientsWithPendingCount);
    } else {
      // For other sorting types, sort synchronously
      filtered.sort((a, b) => {
        switch (sortType) {
          case 'name':
            return a.name?.localeCompare(b.name) || 0;
          default:
            return 0;
        }
      });

      setFilteredClients(filtered);
    }
  }, [clients, searchQuery, filterType, sortType]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [applyFiltersAndSort]);

  const renderClientItem = ({ item }) => (
    <ClientCard
      client={item}
      navigation={navigation}
      onPress={() =>
        navigation.navigate('ClientDetails', {
          clientId: item._id,
          clientName: item.name,
          client: item
        })
      }
    />
  );

  const FilterModal = () => (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Filter by Type</Text>
          <TouchableOpacity onPress={() => setShowFilterModal(false)}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>
        {['all', 'composition', 'regular', 'gst'].map(type => (
          <TouchableOpacity
            key={type}
            style={[
              styles.filterOption,
              filterType === type && styles.selectedOption
            ]}
            onPress={() => {
              setFilterType(type);
              setShowFilterModal(false);
            }}
          >
            <Text style={[
              styles.filterOptionText,
              filterType === type && styles.selectedOptionText
            ]}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const SortModal = () => (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Sort by</Text>
          <TouchableOpacity onPress={() => setShowSortModal(false)}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>
        {[
          { key: 'pending', label: 'Pending Files (High to Low)' },
          { key: 'non-pending', label: 'Pending Files (Low to High)' },
          { key: 'name', label: 'Name (A to Z)' }
        ].map(sort => (
          <TouchableOpacity
            key={sort.key}
            style={[
              styles.filterOption,
              sortType === sort.key && styles.selectedOption
            ]}
            onPress={() => {
              setSortType(sort.key);
              setShowSortModal(false);
            }}
          >
            <Text style={[
              styles.filterOptionText,
              sortType === sort.key && styles.selectedOptionText
            ]}>
              {sort.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>


      {/* Search and Filter Bar */}
      <View style={styles.searchFilterContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search clients..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons name="filter" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setShowSortModal(true)}
        >
          <Ionicons name="swap-vertical" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Active Filters Display */}
      <View style={styles.activeFilters}>
        {filterType !== 'all' && (
          <View style={styles.activeFilter}>
            <Text style={styles.activeFilterText}>
              Type: {filterType}
            </Text>
            <TouchableOpacity onPress={() => setFilterType('all')}>
              <Ionicons name="close-circle" size={16} color="#666" />
            </TouchableOpacity>
          </View>
        )}
        {sortType !== 'pending' && (
          <View style={styles.activeFilter}>
            <Text style={styles.activeFilterText}>
              Sorted: {sortType}
            </Text>
            <TouchableOpacity onPress={() => setSortType('pending')}>
              <Ionicons name="close-circle" size={16} color="#666" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Client List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading clients...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredClients}
          renderItem={renderClientItem}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="folder-open" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No clients found</Text>
              <Text style={styles.emptySubtext}>
                Try adjusting your filters or search query
              </Text>
            </View>
          }
        />
      )}

      {/* Modals */}
      {showFilterModal && <FilterModal />}
      {showSortModal && <SortModal />}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    backgroundColor: '#1a237e',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff'
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)'
  },
  searchFilterContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 10
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333'
  },
  filterButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  sortButton: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 15,
    paddingVertical: 8,
    gap: 8
  },
  activeFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    gap: 5
  },
  activeFilterText: {
    fontSize: 12,
    color: '#1976d2'
  },
  listContainer: {
    padding: 15
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    fontSize: 16,
    color: '#666'
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 10
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: screenWidth * 0.8,
    maxWidth: 300
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333'
  },
  filterOption: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 5
  },
  selectedOption: {
    backgroundColor: '#e3f2fd'
  },
  filterOptionText: {
    fontSize: 16,
    color: '#333'
  },
  selectedOptionText: {
    color: '#1976d2',
    fontWeight: '600'
  }
});

export default ClientStatusListScreen;
