import React, { useEffect, useState, useCallback } from 'react';
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
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import axios from "axios";
import { API_BASE_URL } from '../../config';

const STATUS_ICONS = {
  pending: { icon: 'hourglass-outline', color: '#F59E0B', label: 'Pending' },
  clear: { icon: 'checkmark-circle-outline', color: '#10B981', label: 'All Clear' },
  overdue: { icon: 'alert-circle-outline', color: '#EF4444', label: 'Overdue' },
};

const SORT_OPTIONS = [
  { id: 'name', label: 'Name (A-Z)', icon: 'text' },
  { id: 'name-desc', label: 'Name (Z-A)', icon: 'text' },
  { id: 'status', label: 'Status', icon: 'flag' },
  { id: 'pending', label: 'Pending Files', icon: 'document' },
  { id: 'outstanding', label: 'Outstanding Amount', icon: 'card' },
];

const FILTER_OPTIONS = [
  { id: 'all', label: 'All Clients', icon: 'people' },
  { id: 'gst-regular', label: 'Regular GST', icon: 'card' },
  { id: 'gst-composite', label: 'Composite GST', icon: 'calculator' },
  { id: 'gst-iff', label: 'IFF GST', icon: 'receipt' },
];

const getStatus = (pendingFiles) => {
  const count = Number(pendingFiles) || 0;
  if (count === 0) return 'clear';
  if (count > 0 && count <= 3) return 'pending';
  if (count > 3) return 'overdue';
  return 'pending';
};

const ClientListScreen = () => {
  const navigation = useNavigation();
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedSort, setSelectedSort] = useState('name');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/clients`, {
        params: { 
          page: 1, 
          limit: 50,
          // Don't send empty search to backend
          ...(search.trim() && { search: search.trim() })
        },
      });
      setClients(res.data.clients || []);
    } catch (e) {
      console.error("Error fetching clients:", e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      fetchClients();
    }, [fetchClients])
  );

  useEffect(() => {
    let filtered = [...clients];

    // Apply search filter (case-insensitive)
    if (search.trim()) {
      const searchTerm = search.trim().toLowerCase();
      filtered = filtered.filter(client => 
        (client.name?.toLowerCase().includes(searchTerm)) ||
        (client.businessType?.toLowerCase().includes(searchTerm)) ||
        (client.gstNumber?.toLowerCase().includes(searchTerm))
      );
    }

    // Apply GST type filter
    if (selectedFilter !== 'all' && selectedFilter.startsWith('gst-')) {
      const gstType = selectedFilter.replace('gst-', '');
      filtered = filtered.filter(client => 
        client.gstType?.toLowerCase() === gstType.toLowerCase()
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (selectedSort) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'name-desc':
          return (b.name || '').localeCompare(a.name || '');
        case 'status': {
          const statusA = getStatus(a.pendingFiles || 0);
          const statusB = getStatus(b.pendingFiles || 0);
          return statusA.localeCompare(statusB);
        }
        case 'pending':
          return (b.pendingFiles || 0) - (a.pendingFiles || 0);
        case 'outstanding':
          return (b.totalOutstanding || 0) - (a.totalOutstanding || 0);
        default:
          return 0;
      }
    });

    setFilteredClients(filtered);
  }, [clients, selectedFilter, selectedSort, search]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchClients();
    setRefreshing(false);
  };

  const renderClient = ({ item }) => {
    const status = getStatus(item.pendingFiles);
    const { icon, color, label } = STATUS_ICONS[status];

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate('ClientDetails', { clientId: item._id })}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View>
            <Text style={styles.clientName}>{item.name}</Text>
            <Text style={styles.clientAddress}>{item.address}</Text>
            <Text style={styles.businessType}>{item.businessType}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Ionicons name={icon} size={20} color={color} />
            <Text style={[styles.statusText, { color }]}>{label}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          {item.gstType && (
            <View style={[styles.gstTypeBadge, { backgroundColor: '#2563EB' }]}>
              <Text style={styles.gstTypeText}>{item.gstType.toUpperCase()}</Text>
            </View>
          )}
          {item.totalOutstanding > 0 && (
            <View style={[styles.gstTypeBadge, { backgroundColor: '#EF4444' }]}>
              <Text style={styles.gstTypeText}>₹{item.totalOutstanding}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search clients..."
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity onPress={() => setShowFilterModal(true)} style={styles.filterBtn}>
          <Ionicons name="filter-outline" size={22} color="#2563EB" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowSortModal(true)} style={styles.filterBtn}>
          <MaterialIcons name="sort" size={22} color="#2563EB" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} />
      ) : filteredClients.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={80} color="#9CA3AF" style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>No Clients Found</Text>
          <Text style={styles.emptySubtitle}>You don't have any clients yet. Add your first client to get started.</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => navigation.navigate('AddClient')}
          >
            <Ionicons name="add" size={24} color="white" />
            <Text style={styles.addButtonText}>Add Client</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredClients}
          keyExtractor={(item) => item._id}
          renderItem={renderClient}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      {/* Sort Modal */}
      <Modal visible={showSortModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sort By</Text>
            {SORT_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.modalOption,
                  selectedSort === option.id && styles.modalOptionSelected,
                ]}
                onPress={() => {
                  setSelectedSort(option.id);
                  setShowSortModal(false);
                }}
              >
                <MaterialIcons name={option.icon} size={20} color="#2563EB" />
                <Text
                  style={[
                    styles.modalOptionText,
                    selectedSort === option.id && styles.modalOptionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowSortModal(false)} style={styles.modalCancel}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={showFilterModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filter By</Text>
            {FILTER_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.modalOption,
                  selectedFilter === option.id && styles.modalOptionSelected,
                ]}
                onPress={() => {
                  setSelectedFilter(option.id);
                  setShowFilterModal(false);
                }}
              >
                <Ionicons name={option.icon} size={20} color="#2563EB" />
                <Text
                  style={[
                    styles.modalOptionText,
                    selectedFilter === option.id && styles.modalOptionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowFilterModal(false)} style={styles.modalCancel}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('Home', { screen: 'AddClient' })}
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F9FAFB',
    position: 'relative',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: '#2563EB',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 16, color: '#1F2937', paddingVertical: 4 },
  filterBtn: { marginLeft: 8, padding: 4, borderRadius: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  clientName: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  clientAddress: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  businessType: { fontSize: 12, color: '#10B981', marginTop: 2, fontWeight: '500' },
  statusText: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.6,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center',
  },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 24, width: '85%', maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#2563EB', marginBottom: 16, textAlign: 'center' },
  modalOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, marginBottom: 8 },
  modalOptionSelected: { backgroundColor: '#EFF6FF' },
  modalOptionText: { fontSize: 16, color: '#6B7280', marginLeft: 12 },
  modalOptionTextSelected: { color: '#2563EB', fontWeight: '500' },
  modalCancel: { marginTop: 16, paddingVertical: 12, alignItems: 'center' },
  modalCancelText: { color: '#EF4444', fontSize: 16, fontWeight: '500' },
  gstTypeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginRight: 8 },
  gstTypeText: { fontSize: 10, color: '#fff', fontWeight: '600' },
});

export default ClientListScreen;
