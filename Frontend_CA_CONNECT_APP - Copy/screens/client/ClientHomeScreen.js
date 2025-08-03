import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const ClientHomeScreen = () => {
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome, Client</Text>
        <Text style={styles.subtitleText}>Here's your overview</Text>
      </View>

      {/* Payment Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Payment Status</Text>
        <View style={styles.paymentInfo}>
          <Text style={styles.amount}>₹15,000</Text>
          <Text style={styles.paymentLabel}>Outstanding Amount</Text>
          <Text style={styles.dueDate}>Due: 25 Jan 2024</Text>
        </View>
        <TouchableOpacity style={styles.viewDetailsButton}>
          <Text style={styles.viewDetailsText}>View Details</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Files */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent Files</Text>
        <View style={styles.fileItem}>
          <Ionicons name="document-text" size={20} color="#2563EB" />
          <View style={styles.fileInfo}>
            <Text style={styles.fileName}>Tax Return 2023-24</Text>
            <Text style={styles.fileDate}>Uploaded 2 days ago</Text>
          </View>
        </View>
        <View style={styles.fileItem}>
          <Ionicons name="document-text" size={20} color="#2563EB" />
          <View style={styles.fileInfo}>
            <Text style={styles.fileName}>GST Return - Dec 2023</Text>
            <Text style={styles.fileDate}>Uploaded 1 week ago</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.viewAllButton}>
          <Text style={styles.viewAllText}>View All Files</Text>
        </TouchableOpacity>
      </View>

      {/* Pending Approvals */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Pending Approvals</Text>
        <View style={styles.approvalItem}>
          <Ionicons name="document-text" size={20} color="#F59E0B" />
          <View style={styles.approvalInfo}>
            <Text style={styles.approvalName}>Invoice - Jan 2024</Text>
            <Text style={styles.approvalDate}>Waiting for your approval</Text>
          </View>
          <View style={styles.approvalButtons}>
            <TouchableOpacity style={[styles.approvalButton, styles.approveButton]}>
              <Text style={styles.approveButtonText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.approvalButton, styles.rejectButton]}>
              <Text style={styles.rejectButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Monthly Statistics */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Monthly Statistics</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Files</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>8</Text>
            <Text style={styles.statLabel}>Payments</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.viewReportButton}>
          <Text style={styles.viewReportText}>View Detailed Report</Text>
        </TouchableOpacity>
              </View>
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937'
  },
  subtitleText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2
  },
  card: {
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
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 15
  },
  paymentInfo: {
    alignItems: 'center',
    marginBottom: 15
  },
  amount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#EF4444'
  },
  paymentLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 5
  },
  dueDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2
  },
  viewDetailsButton: {
    backgroundColor: '#10B981',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center'
  },
  viewDetailsText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600'
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  fileInfo: {
    flex: 1,
    marginLeft: 12
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937'
  },
  fileDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2
  },
  viewAllButton: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#2563EB',
    borderRadius: 6,
    alignItems: 'center'
  },
  viewAllText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600'
  },
  approvalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10
  },
  approvalInfo: {
    flex: 1,
    marginLeft: 12
  },
  approvalName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937'
  },
  approvalDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2
  },
  approvalButtons: {
    flexDirection: 'row',
    gap: 8
  },
  approvalButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4
  },
  approveButton: {
    backgroundColor: '#10B981'
  },
  rejectButton: {
    backgroundColor: '#EF4444'
  },
  approveButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600'
  },
  rejectButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600'
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15
  },
  statItem: {
    alignItems: 'center'
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563EB'
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4
  },
  viewReportButton: {
    backgroundColor: '#F59E0B',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center'
  },
  viewReportText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600'
  }
});

export default ClientHomeScreen; 