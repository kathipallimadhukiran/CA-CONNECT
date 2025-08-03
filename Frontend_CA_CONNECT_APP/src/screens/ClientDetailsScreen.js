import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import Button from '../components/Button';

// Mock data
const MOCK_CLIENT = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+919876543210',
  address: '123 Business St, Mumbai, India',
  gstNumber: '22AAAAA0000A1Z5',
  panNumber: 'ABCDE1234F',
  files: [
    { id: 'f1', name: 'ITR 2023-24.pdf', status: 'pending' },
    { id: 'f2', name: 'GST Return March 2023.pdf', status: 'approved' },
  ],
  payments: [
    { id: 'p1', amount: 15000, date: '2023-07-10', mode: 'bank_transfer', reference: 'TXN123456' },
  ],
  tasks: [
    { id: 't1', title: 'File ITR 2022-23', status: 'pending', priority: 'high' },
  ],
};

const ClientDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [client, setClient] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClient();
  }, []);

  const loadClient = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setClient(MOCK_CLIENT);
    } catch (error) {
      console.error('Error loading client:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadClient();
  };

  const handleCall = () => {
    const url = `tel:${client.phone}`;
    Linking.openURL(url).catch(err => console.error('Error:', err));
  };

  const handleEmail = () => {
    const url = `mailto:${client.email}`;
    Linking.openURL(url).catch(err => console.error('Error:', err));
  };

  const renderDetailsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <InfoRow icon="call-outline" label="Phone" value={client.phone} onPress={handleCall} />
        <InfoRow icon="mail-outline" label="Email" value={client.email} onPress={handleEmail} />
        <InfoRow icon="location-outline" label="Address" value={client.address} />
      </View>
      
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Tax Information</Text>
        <InfoRow icon="card-outline" label="GST Number" value={client.gstNumber} />
        <InfoRow icon="document-text-outline" label="PAN Number" value={client.panNumber} />
      </View>
      
      <View style={styles.statsContainer}>
        <StatCard value={client.files?.length || 0} label="Files" />
        <StatCard 
          value={`₹${client.payments?.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}`} 
          label="Total Paid" 
        />
        <StatCard 
          value={client.tasks?.filter(t => t.status === 'pending').length || 0} 
          label="Pending Tasks" 
        />
      </View>
    </View>
  );

  const renderFilesTab = () => (
    <View style={styles.tabContent}>
      {client.files?.length > 0 ? (
        client.files.map(file => (
          <FileCard key={file.id} file={file} />
        ))
      ) : (
        <EmptyState 
          icon="folder-open-outline" 
          title="No files found" 
          subtitle="Upload files to get started" 
        />
      )}
      <Button
        title="Upload File"
        icon="cloud-upload-outline"
        onPress={() => {}}
        style={styles.uploadButton}
      />
    </View>
  );

  const renderPaymentsTab = () => (
    <View style={styles.tabContent}>
      {client.payments?.length > 0 ? (
        client.payments.map(payment => (
          <PaymentCard key={payment.id} payment={payment} />
        ))
      ) : (
        <EmptyState 
          icon="wallet-outline" 
          title="No payments found" 
          subtitle="Record payments to track history" 
        />
      )}
      <Button
        title="Record Payment"
        icon="add-circle-outline"
        onPress={() => {}}
        style={styles.recordPaymentButton}
      />
    </View>
  );

  const renderTasksTab = () => (
    <View style={styles.tabContent}>
      {client.tasks?.length > 0 ? (
        client.tasks.map(task => (
          <TaskCard key={task.id} task={task} />
        ))
      ) : (
        <EmptyState 
          icon="checkmark-done-outline" 
          title="No tasks found" 
          subtitle="Create tasks to track work" 
        />
      )}
      <Button
        title="Add Task"
        icon="add-circle-outline"
        onPress={() => {}}
        style={styles.addTaskButton}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!client) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.mediumGray} />
        <Text style={styles.errorText}>Client not found</Text>
        <Button
          title="Go Back"
          onPress={() => navigation.goBack()}
          style={styles.goBackButton}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.clientName} numberOfLines={1}>{client.name}</Text>
          <Text style={styles.clientCompany} numberOfLines={1}>
            {client.company || 'Individual'}
          </Text>
        </View>
        
        <TouchableOpacity onPress={() => {}} style={styles.editButton}>
          <Ionicons name="pencil-outline" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
          />
        }
      >
        <View style={styles.tabBar}>
          <TabButton 
            icon="information-circle-outline" 
            label="Details" 
            active={activeTab === 'details'}
            onPress={() => setActiveTab('details')}
          />
          <TabButton 
            icon="document-text-outline" 
            label="Files" 
            active={activeTab === 'files'}
            onPress={() => setActiveTab('files')}
          />
          <TabButton 
            icon="wallet-outline" 
            label="Payments" 
            active={activeTab === 'payments'}
            onPress={() => setActiveTab('payments')}
          />
          <TabButton 
            icon="checkmark-done-outline" 
            label="Tasks" 
            active={activeTab === 'tasks'}
            onPress={() => setActiveTab('tasks')}
          />
        </View>
        
        {activeTab === 'details' && renderDetailsTab()}
        {activeTab === 'files' && renderFilesTab()}
        {activeTab === 'payments' && renderPaymentsTab()}
        {activeTab === 'tasks' && renderTasksTab()}
      </ScrollView>
    </View>
  );
};

// Reusable Components
const InfoRow = ({ icon, label, value, onPress }) => (
  <TouchableOpacity style={styles.infoRow} onPress={onPress} disabled={!onPress}>
    <Ionicons name={icon} size={20} color={COLORS.primary} style={styles.infoIcon} />
    <View style={styles.infoTextContainer}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1} ellipsizeMode="tail">
        {value || 'Not provided'}
      </Text>
    </View>
    {onPress && <Ionicons name="chevron-forward" size={20} color={COLORS.mediumGray} />}
  </TouchableOpacity>
);

const StatCard = ({ value, label }) => (
  <View style={styles.statCard}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const FileCard = ({ file }) => (
  <View style={styles.fileCard}>
    <Ionicons name="document-text-outline" size={24} color={COLORS.primary} />
    <View style={styles.fileInfo}>
      <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
      <Text style={styles.fileMeta}>{file.status}</Text>
    </View>
    <Ionicons name="ellipsis-vertical" size={20} color={COLORS.mediumGray} />
  </View>
);

const PaymentCard = ({ payment }) => (
  <View style={styles.paymentCard}>
    <View style={styles.paymentIconContainer}>
      <Ionicons name="cash-outline" size={24} color={COLORS.primary} />
    </View>
    <View style={styles.paymentInfo}>
      <View style={styles.paymentHeader}>
        <Text style={styles.paymentAmount}>₹{payment.amount.toLocaleString()}</Text>
        <Text style={styles.paymentDate}>{payment.date}</Text>
      </View>
      <Text style={styles.paymentMode}>
        {payment.mode === 'bank_transfer' ? 'Bank Transfer' : 
         payment.mode === 'cheque' ? 'Cheque' : 'Cash'}
      </Text>
    </View>
  </View>
);

const TaskCard = ({ task }) => (
  <View style={styles.taskCard}>
    <View style={styles.taskStatusIndicator}>
      <View style={[
        styles.taskStatusDot,
        task.status === 'completed' ? styles.taskStatusCompleted :
        task.status === 'in-progress' ? styles.taskStatusInProgress :
        styles.taskStatusPending
      ]} />
    </View>
    <View style={styles.taskInfo}>
      <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
      <View style={styles.taskFooter}>
        <View style={[
          styles.taskPriorityBadge,
          task.priority === 'high' ? styles.priorityHigh :
          task.priority === 'medium' ? styles.priorityMedium :
          styles.priorityLow
        ]}>
          <Text style={styles.taskPriorityText}>{task.priority}</Text>
        </View>
      </View>
    </View>
  </View>
);

const TabButton = ({ icon, label, active, onPress }) => (
  <TouchableOpacity
    style={[styles.tab, active && styles.activeTab]}
    onPress={onPress}
  >
    <Ionicons 
      name={icon} 
      size={20} 
      color={active ? COLORS.primary : COLORS.mediumGray} 
    />
    <Text style={[styles.tabText, { color: active ? COLORS.primary : COLORS.mediumGray }]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const EmptyState = ({ icon, title, subtitle }) => (
  <View style={styles.emptyState}>
    <Ionicons name={icon} size={48} color={COLORS.lightGray} />
    <Text style={styles.emptyStateText}>{title}</Text>
    <Text style={styles.emptyStateSubtext}>{subtitle}</Text>
  </View>
);

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.lightGray },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SIZES.padding * 2, backgroundColor: COLORS.white },
  errorText: { ...FONTS.h4, color: COLORS.darkGray, marginVertical: SIZES.padding },
  goBackButton: { width: '100%', maxWidth: 200 },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.padding,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.darkGray,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: { elevation: 2 },
    }),
  },
  backButton: { padding: 8, marginRight: 8 },
  headerTitleContainer: { flex: 1, marginLeft: 8 },
  clientName: { ...FONTS.h3, color: COLORS.darkGray, fontWeight: '600' },
  clientCompany: { ...FONTS.body4, color: COLORS.mediumGray, marginTop: 2 },
  editButton: { padding: 8, marginLeft: 8 },
  
  // Tabs
  tabBar: { flexDirection: 'row', backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SIZES.base * 1.5, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: COLORS.primary },
  tabText: { ...FONTS.body4, marginLeft: 4, fontWeight: '500' },
  
  // Content
  scrollView: { flex: 1 },
  tabContent: { padding: SIZES.padding },
  
  // Details Tab
  infoSection: { backgroundColor: COLORS.white, borderRadius: SIZES.radius, padding: SIZES.padding, marginBottom: SIZES.padding },
  sectionTitle: { ...FONTS.h4, color: COLORS.primary, marginBottom: SIZES.padding, fontWeight: '600' },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SIZES.base },
  infoIcon: { marginRight: 12 },
  infoTextContainer: { flex: 1 },
  infoLabel: { ...FONTS.body5, color: COLORS.mediumGray },
  infoValue: { ...FONTS.body3, color: COLORS.darkGray, marginTop: 2 },
  
  // Stats
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SIZES.padding },
  statCard: { backgroundColor: COLORS.white, borderRadius: SIZES.radius, padding: SIZES.padding, flex: 1, marginHorizontal: 4, alignItems: 'center' },
  statValue: { ...FONTS.h3, color: COLORS.primary, fontWeight: '600' },
  statLabel: { ...FONTS.body5, color: COLORS.mediumGray, marginTop: 4 },
  
  // File Card
  fileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderRadius: SIZES.radius, padding: SIZES.padding, marginBottom: SIZES.base },
  fileInfo: { flex: 1, marginLeft: SIZES.base },
  fileName: { ...FONTS.body3, color: COLORS.darkGray },
  fileMeta: { ...FONTS.body5, color: COLORS.mediumGray, marginTop: 2 },
  
  // Payment Card
  paymentCard: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: SIZES.radius, padding: SIZES.padding, marginBottom: SIZES.base },
  paymentIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(26, 35, 126, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: SIZES.base },
  paymentInfo: { flex: 1 },
  paymentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  paymentAmount: { ...FONTS.h4, color: COLORS.primary },
  paymentDate: { ...FONTS.body5, color: COLORS.mediumGray },
  paymentMode: { ...FONTS.body4, color: COLORS.darkGray, marginTop: 4 },
  
  // Task Card
  taskCard: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: SIZES.radius, padding: SIZES.padding, marginBottom: SIZES.base },
  taskStatusIndicator: { width: 24, alignItems: 'center', marginRight: SIZES.base },
  taskStatusDot: { width: 12, height: 12, borderRadius: 6 },
  taskStatusPending: { backgroundColor: COLORS.warning },
  taskStatusInProgress: { backgroundColor: COLORS.info },
  taskStatusCompleted: { backgroundColor: COLORS.success },
  taskInfo: { flex: 1 },
  taskTitle: { ...FONTS.body3, color: COLORS.darkGray },
  taskFooter: { flexDirection: 'row', marginTop: SIZES.base / 2, alignItems: 'center' },
  taskPriorityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginRight: 8 },
  priorityHigh: { backgroundColor: 'rgba(244, 67, 54, 0.1)' },
  priorityMedium: { backgroundColor: 'rgba(255, 152, 0, 0.1)' },
  priorityLow: { backgroundColor: 'rgba(33, 150, 243, 0.1)' },
  taskPriorityText: { ...FONTS.body5, textTransform: 'capitalize' },
  
  // Buttons
  uploadButton: { marginTop: SIZES.base },
  recordPaymentButton: { marginTop: SIZES.base },
  addTaskButton: { marginTop: SIZES.base },
  
  // Empty State
  emptyState: { alignItems: 'center', padding: SIZES.padding * 2 },
  emptyStateText: { ...FONTS.h4, color: COLORS.darkGray, marginTop: SIZES.padding },
  emptyStateSubtext: { ...FONTS.body4, color: COLORS.mediumGray, marginTop: 4, textAlign: 'center' },
});

export default ClientDetailsScreen;
