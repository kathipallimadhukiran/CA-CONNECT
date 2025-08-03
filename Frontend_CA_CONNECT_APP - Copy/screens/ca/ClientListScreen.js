import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Linking, Modal } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { clientService } from '../../services/client';

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
  if (pendingFiles > 0 && pendingFiles <= 3) return 'pending';
  if (pendingFiles === 0) return 'clear';
  if (pendingFiles > 3) return 'overdue';
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
      const res = await clientService.getClients(1, 50, search);
      setClients(res.clients);
      applyFiltersAndSort(res.clients);
    } catch (e) {
      // handle error
    }
    setLoading(false);
  }, [search]);

  const applyFiltersAndSort = (clientList) => {
    let filtered = [...clientList];

    // Apply filter - only GST type filtering now
    if (selectedFilter !== 'all') {
      if (selectedFilter.startsWith('gst-')) {
        // GST type filtering
        const gstType = selectedFilter.replace('gst-', '');
        filtered = filtered.filter(client => client.gstType === gstType);
      }
    }

    // Apply sort
    switch (selectedSort) {
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        filtered.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'status':
        filtered.sort((a, b) => getStatus(a.pendingFiles).localeCompare(getStatus(b.pendingFiles)));
        break;
      case 'pending':
        filtered.sort((a, b) => (b.pendingFiles || 0) - (a.pendingFiles || 0));
        break;
      case 'outstanding':
        filtered.sort((a, b) => (b.totalOutstanding || 0) - (a.totalOutstanding || 0));
        break;
    }

    setFilteredClients(filtered);
  };

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    applyFiltersAndSort(clients);
  }, [selectedSort, selectedFilter, clients]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchClients();
    setRefreshing(false);
  };

  const renderClient = ({ item }) => {
    const status = getStatus(item.pendingFiles);
    const statusIcon = STATUS_ICONS[status];
    
    const getGstTypeColor = (gstType) => {
      switch (gstType) {
        case 'composite': return '#F59E0B';
        case 'iff': return '#8B5CF6';
        default: return '#10B981';
      }
    };

    const getGstTypeLabel = (gstType) => {
      switch (gstType) {
        case 'composite': return 'Composite';
        case 'iff': return 'IFF';
        default: return 'Regular';
      }
    };

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ClientDetails', { clientId: item.id, clientName: item.name })}
        activeOpacity={0.8}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="person-circle" size={40} color="#2563EB" style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.clientName}>{item.name}</Text>
            <Text style={styles.clientAddress}>{item.address}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <View style={[styles.gstTypeBadge, { backgroundColor: getGstTypeColor(item.gstType) }]}>
                <Text style={styles.gstTypeText}>{getGstTypeLabel(item.gstType)}</Text>
              </View>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={e => {
                  e.stopPropagation();
                  if (item.phoneNumber) {
                    Linking.openURL(`tel:${item.phoneNumber}`);
                  }
                }}
              >
                <Ionicons name="call-outline" size={22} color="#2563EB" />
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name={statusIcon.icon} size={18} color={statusIcon.color} />
              <Text style={[styles.statusText, { color: statusIcon.color }]}>  {status === 'pending' ? `${item.pendingFiles} Pending` : status === 'clear' ? 'All Clear' : `${item.pendingFiles} Overdue`}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSortModal = () => (
    <Modal visible={showSortModal} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Sort By</Text>
          {SORT_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.id}
              style={[styles.modalOption, selectedSort === option.id && styles.modalOptionSelected]}
              onPress={() => {
                setSelectedSort(option.id);
                setShowSortModal(false);
              }}
            >
              <Ionicons name={option.icon} size={20} color={selectedSort === option.id ? '#2563EB' : '#6B7280'} />
              <Text style={[styles.modalOptionText, selectedSort === option.id && styles.modalOptionTextSelected]}>
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
  );

  const renderFilterModal = () => (
    <Modal visible={showFilterModal} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Filter By</Text>
          {FILTER_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.id}
              style={[styles.modalOption, selectedFilter === option.id && styles.modalOptionSelected]}
              onPress={() => {
                setSelectedFilter(option.id);
                setShowFilterModal(false);
              }}
            >
              <Ionicons name={option.icon} size={20} color={selectedFilter === option.id ? '#2563EB' : '#6B7280'} />
              <Text style={[styles.modalOptionText, selectedFilter === option.id && styles.modalOptionTextSelected]}>
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
  );

  return (
    <View style={styles.container}>
      {/* Search/Filter/Sort Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#6B7280" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search clients..."
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          onSubmitEditing={fetchClients}
        />
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilterModal(true)}>
          <MaterialIcons name="filter-list" size={22} color="#2563EB" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowSortModal(true)}>
          <MaterialIcons name="sort" size={22} color="#2563EB" />
        </TouchableOpacity>
      </View>

      {/* Active Filters Display */}
      {(selectedFilter !== 'all' || selectedSort !== 'name') && (
        <View style={styles.activeFilters}>
          <Text style={styles.activeFiltersText}>
            {FILTER_OPTIONS.find(f => f.id === selectedFilter)?.label} • 
            {SORT_OPTIONS.find(s => s.id === selectedSort)?.label}
          </Text>
          <TouchableOpacity onPress={() => {
            setSelectedFilter('all');
            setSelectedSort('name');
          }}>
            <Text style={styles.clearFiltersText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Client List */}
      {loading ? (
        <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredClients}
          keyExtractor={item => item.id}
          renderItem={renderClient}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={<Text style={styles.emptyText}>No clients found.</Text>}
        />
      )}

      {renderSortModal()}
      {renderFilterModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 4,
  },
  filterBtn: {
    marginLeft: 8,
    padding: 4,
    borderRadius: 4,
  },
  activeFilters: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
  },
  activeFiltersText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '500',
  },
  clearFiltersText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
  },
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
  clientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  clientAddress: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  businessType: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 2,
    fontWeight: '500',
  },
  iconBtn: {
    marginLeft: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 40,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '85%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  modalOptionSelected: {
    backgroundColor: '#EFF6FF',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 12,
  },
  modalOptionTextSelected: {
    color: '#2563EB',
    fontWeight: '500',
  },
  modalCancel: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '500',
  },
  gstTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  gstTypeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
});

export default ClientListScreen; 