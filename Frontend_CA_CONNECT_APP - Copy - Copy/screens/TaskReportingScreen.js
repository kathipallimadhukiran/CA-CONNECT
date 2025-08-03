import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  TextInput,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Sample task data
const sampleTasks = [
  {
    id: '1',
    title: 'Complete Project Documentation',
    description: 'Update all project documentation and create user guides',
    status: 'in-progress',
    priority: 'high',
    dueDate: '2024-01-15',
    assignedTo: 'John Doe',
    progress: 75
  },
  {
    id: '2',
    title: 'Review Code Changes',
    description: 'Review and approve pending code changes in the main branch',
    status: 'pending',
    priority: 'medium',
    dueDate: '2024-01-20',
    assignedTo: 'Jane Smith',
    progress: 0
  },
  {
    id: '3',
    title: 'Client Meeting Preparation',
    description: 'Prepare presentation and materials for client meeting',
    status: 'completed',
    priority: 'high',
    dueDate: '2024-01-10',
    assignedTo: 'Mike Johnson',
    progress: 100
  },
  {
    id: '4',
    title: 'Database Optimization',
    description: 'Optimize database queries and improve performance',
    status: 'in-progress',
    priority: 'low',
    dueDate: '2024-01-25',
    assignedTo: 'Sarah Wilson',
    progress: 45
  },
  {
    id: '5',
    title: 'Security Audit',
    description: 'Conduct security audit and fix vulnerabilities',
    status: 'pending',
    priority: 'high',
    dueDate: '2024-01-18',
    assignedTo: 'David Brown',
    progress: 0
  }
];

const TaskReportingScreen = () => {
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [tasks, setTasks] = useState(sampleTasks);

  const statusFilters = [
    { key: 'all', label: 'All', icon: 'list' },
    { key: 'pending', label: 'Pending', icon: 'time' },
    { key: 'in-progress', label: 'In Progress', icon: 'play' },
    { key: 'completed', label: 'Completed', icon: 'checkmark' }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FF9800';
      case 'in-progress': return '#2196F3';
      case 'completed': return '#4CAF50';
      default: return '#9E9E9E';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#F44336';
      case 'medium': return '#FF9800';
      case 'low': return '#4CAF50';
      default: return '#9E9E9E';
    }
  };

  const getPriorityLabel = (priority) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  const filteredTasks = tasks.filter(task => {
    const matchesStatus = selectedStatus === 'all' || task.status === selectedStatus;
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusStats = () => {
    const stats = {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      inProgress: tasks.filter(t => t.status === 'in-progress').length,
      completed: tasks.filter(t => t.status === 'completed').length
    };
    return stats;
  };

  const renderTaskCard = ({ item }) => (
    <View style={styles.taskCard}>
      <View style={styles.taskHeader}>
        <View style={styles.taskTitleContainer}>
          <Text style={styles.taskTitle}>{item.title}</Text>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
            <Text style={styles.priorityText}>{getPriorityLabel(item.priority)}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.replace('-', ' ').toUpperCase()}</Text>
        </View>
      </View>
      
      <Text style={styles.taskDescription}>{item.description}</Text>
      
      <View style={styles.taskDetails}>
        <View style={styles.taskDetail}>
          <Ionicons name="person" size={16} color="#666" />
          <Text style={styles.taskDetailText}>{item.assignedTo}</Text>
        </View>
        <View style={styles.taskDetail}>
          <Ionicons name="calendar" size={16} color="#666" />
          <Text style={styles.taskDetailText}>{item.dueDate}</Text>
        </View>
      </View>

      {item.status === 'in-progress' && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${item.progress}%`, backgroundColor: getStatusColor(item.status) }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>{item.progress}%</Text>
        </View>
      )}

      <View style={styles.taskActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="eye" size={20} color="#2196F3" />
          <Text style={styles.actionText}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="create" size={20} color="#FF9800" />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
          <Text style={styles.actionText}>Complete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const stats = getStatusStats();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a237e" translucent={true} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Task Status</Text>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total Tasks</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#FF9800' }]}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#2196F3' }]}>{stats.inProgress}</Text>
          <Text style={styles.statLabel}>In Progress</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#4CAF50' }]}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tasks..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#666"
          />
        </View>
      </View>

      {/* Status Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {statusFilters.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterButton,
                selectedStatus === filter.key && styles.filterButtonActive
              ]}
              onPress={() => setSelectedStatus(filter.key)}
            >
              <Ionicons 
                name={filter.icon} 
                size={16} 
                color={selectedStatus === filter.key ? '#fff' : '#666'} 
              />
              <Text style={[
                styles.filterText,
                selectedStatus === filter.key && styles.filterTextActive
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tasks List */}
      <FlatList
        data={filteredTasks}
        renderItem={renderTaskCard}
        keyExtractor={item => item.id}
        style={styles.tasksList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.tasksListContent}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1a237e',
    paddingTop: StatusBar.currentHeight + 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a237e',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  filtersContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  filterButtonActive: {
    backgroundColor: '#1a237e',
  },
  filterText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  tasksList: {
    flex: 1,
  },
  tasksListContent: {
    padding: 16,
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  taskTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  taskDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  taskDetails: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  taskDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  taskDetailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'bold',
  },
  taskActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
});

export default TaskReportingScreen;