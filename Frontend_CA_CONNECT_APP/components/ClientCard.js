import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../config';

const ClientCard = ({ client, onPress, navigation }) => {
  const [returnData, setReturnData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch return data for this client
  useEffect(() => {
    const fetchReturnData = async () => {
      try {
        setLoading(true);
        // Use the correct endpoint that returns raw month data
        const response = await fetch(`${API_BASE_URL}/returns?clientId=${client._id}&gstNumber=${client.gstNumber}&year=2025`);
        const result = await response.json();

        if (result.success) {
          setReturnData(result.data);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching return data:', error);
        setLoading(false);
      }
    };

    if (client._id && client.gstNumber) {
      fetchReturnData();
    }
  }, [client._id, client.gstNumber]);

  const calculatePendingFiles = () => {
    if (loading || !returnData) return 0;

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

      // Check if deadline has passed (as of Jan 11, 2026)
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
  };

  const getPendingMonthsText = () => {
    if (loading || !returnData) return 'Loading...';

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth(); // 0-indexed (Jan=0, Dec=11)
    const currentDay = currentDate.getDate();
    const currentYear = currentDate.getFullYear();

    // Calculate pending files from April 2025 onwards
    // Only count months that have passed their filing deadline
    const startYear = 2025;
    const startMonth = 3; // April (0-indexed)

    const pendingMonthsByYear = {};
    const pendingDetails = [];

    // Loop through all months from April 2025 to December 2025 (only past months)
    let year = startYear;
    let month = startMonth;

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

        // For simplified API structure, check single status field
        // A month is completed only if status is 'filed' or 'not-applicable'
        const isCompleted = monthData &&
          (monthData.status === 'filed' || monthData.status === 'not-applicable');

        // Count as pending only if not completed
        if (!isCompleted) {
          const status = monthData?.status || 'pending';
          const monthName = monthNames[month];

          // Create detailed pending information based on GSTR-1 and GSTR-3B status
          let detailText = `${monthName} ${year}`;

          if (monthData.gstr1 && monthData.gstr3b) {
            // Regular GST - both GSTR-1 and GSTR-3B present
            const gstr1Status = monthData.gstr1.status;
            const gstr3bStatus = monthData.gstr3b.status;

            if (gstr1Status === 'pending' && gstr3bStatus === 'pending') {
              detailText += ' (GSTR1 & GSTR3B: pending)';
            } else if (gstr1Status === 'not_filed' && gstr3bStatus === 'not_filed') {
              detailText += ' (GSTR1 & GSTR3B: not filed)';
            } else if (gstr1Status === 'pending' && gstr3bStatus === 'not_filed') {
              detailText += ' (GSTR1: pending, GSTR3B: not filed)';
            } else if (gstr1Status === 'not_filed' && gstr3bStatus === 'pending') {
              detailText += ' (GSTR1: not filed, GSTR3B: pending)';
            } else if (gstr1Status === 'filed' && gstr3bStatus !== 'filed') {
              detailText += ` (GSTR1: filed, GSTR3B: ${gstr3bStatus})`;
            } else if (gstr1Status !== 'filed' && gstr3bStatus === 'filed') {
              detailText += ` (GSTR1: ${gstr1Status}, GSTR3B: filed)`;
            } else {
              detailText += ` (GSTR1: ${gstr1Status}, GSTR3B: ${gstr3bStatus})`;
            }
          } else if (monthData.gstr1 && !monthData.gstr3b) {
            // Composition/ISF - only GSTR-1 present
            const gstr1Status = monthData.gstr1.status;
            detailText += ` (GSTR1: ${gstr1Status})`;
          } else if (!monthData.gstr1 && monthData.gstr3b) {
            // Edge case - only GSTR-3B present
            const gstr3bStatus = monthData.gstr3b.status;
            detailText += ` (GSTR3B: ${gstr3bStatus})`;
          } else {
            // Fallback to legacy status
            if (status === 'pending') {
              detailText += ' (pending)';
            } else if (status === 'not_filed') {
              detailText += ' (not filed)';
            }
          }

          pendingDetails.push(detailText);

          // Determine financial year for this month
          let financialYear;
          if (month >= 3) { // April to December
            financialYear = `${year}-${(year + 1).toString().slice(-2)}`;
          } else { // January to March
            financialYear = `${year - 1}-${year.toString().slice(-2)}`;
          }

          if (!pendingMonthsByYear[financialYear]) {
            pendingMonthsByYear[financialYear] = [];
          }
          pendingMonthsByYear[financialYear].push(monthName);
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

    const totalMonths = Object.values(pendingMonthsByYear).reduce((sum, months) => sum + months.length, 0);

    if (totalMonths === 0) return 'No pending files';

    // Create detailed status text
    if (totalMonths <= 3) {
      // Show detailed breakdown for fewer months
      return `${totalMonths} pending: ${pendingDetails.join(', ')}`;
    } else {
      // Show summary for many months
      const yearGroups = Object.entries(pendingMonthsByYear)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([year, months]) => {
          if (months.length > 6) {
            return `${year}: ${months.length} months`;
          }
          return `${year}: ${months.join(', ')}`;
        });

      const displayText = yearGroups.join(' | ');
      if (displayText.length > 50) {
        return `${totalMonths} months pending across ${Object.keys(pendingMonthsByYear).length} financial year${Object.keys(pendingMonthsByYear).length > 1 ? 's' : ''}`;
      }
      return displayText;
    }
  };

  const getPendingColor = () => {
    const pendingFiles = calculatePendingFiles();
    if (pendingFiles === 0) return '#10B981'; // Green
    if (pendingFiles <= 2) return '#F59E0B'; // Yellow
    return '#EF4444'; // Red
  };

  const getGstTypeColor = () => {
    switch (client.gstType?.toLowerCase()) {
      case 'composition':
        return '#8B5CF6'; // Purple
      case 'regular':
        return '#3B82F6'; // Blue
      case 'gst':
        return '#10B981'; // Green
      default:
        return '#6B7280'; // Gray
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Left side - Client Info */}
      <View style={styles.leftSection}>
        <View style={styles.clientHeader}>
          <View style={styles.clientInfo}>
            <Text style={styles.clientName} numberOfLines={1}>
              {client.name}
            </Text>
            <Text style={styles.clientAddress} numberOfLines={1}>
              {client.address}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.callButton}
            onPress={(e) => {
              e.stopPropagation();
              if (client.phoneNumber) {
                Linking.openURL(`tel:${client.phoneNumber}`);
              }
            }}
          >
            <Ionicons name="call-outline" size={18} color="#2563EB" />
          </TouchableOpacity>
        </View>

        {/* GST Type Badge */}
        <View style={styles.badgeContainer}>
          <View style={[styles.gstBadge, { backgroundColor: getGstTypeColor() }]}>
            <Text style={styles.gstBadgeText}>
              {client.gstType?.toUpperCase() || 'UNKNOWN'}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              // View client details
              onPress();
            }}
          >
            <Ionicons name="person-outline" size={16} color="#6B7280" />
            <Text style={styles.actionButtonText}>Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              if (client.phoneNumber) {
                Linking.openURL(`tel:${client.phoneNumber}`);
              }
            }}
          >
            <Ionicons name="call-outline" size={16} color="#2563EB" />
            <Text style={styles.actionButtonText}>Call</Text>
          </TouchableOpacity>

        

          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              // Navigate to update screen for this client
              navigation.navigate('ClientUpdate', {
                clientId: client._id,
                clientName: client.name,
                client: client
              });
            }}
          >
            <Ionicons name="create-outline" size={16} color="#F59E0B" />
            <Text style={styles.actionButtonText}>Update</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Right side - Statistics */}
      <View style={styles.rightSection}>
        <View style={styles.statContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Pending Files</Text>
            <Text style={[styles.statValue, { color: getPendingColor() }]}>
              {calculatePendingFiles()}
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Status</Text>
            <Text style={[styles.statusText, { color: getPendingColor() }]}>
              {getPendingMonthsText()}
            </Text>
          </View>
        </View>

        {/* Financial Summary */}
        <View style={styles.financialSummary}>
          <View style={styles.financialItem}>
            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
            <Text style={styles.financialText}>
              Paid: ₹{Number(client.totalPaid || 0).toLocaleString()}
            </Text>
          </View>
          <View style={styles.financialItem}>
            <Ionicons name="alert-circle" size={14} color="#EF4444" />
            <Text style={styles.financialText}>
              Due: ₹{Number(client.totalOutstanding || 0).toLocaleString()}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  leftSection: {
    flex: 1,
    marginRight: 15
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  clientInfo: {
    flex: 1
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2
  },
  clientAddress: {
    fontSize: 13,
    color: '#6B7280'
  },
  callButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    padding: 6,
    marginLeft: 8
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  gstBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  gstBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff'
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 4
  },
  actionButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 50
  },
  actionButtonText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#374151',
    marginTop: 2
  },
  rightSection: {
    width: 140,
    alignItems: 'flex-end'
  },
  statContainer: {
    alignItems: 'flex-end',
    marginBottom: 8
  },
  statItem: {
    alignItems: 'flex-end',
    marginBottom: 2
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 1
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500'
  },
  financialSummary: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8
  },
  financialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3
  },
  financialText: {
    fontSize: 10,
    color: '#374151',
    marginLeft: 4
  },
  monthlyStats: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 8,
    width: '100%'
  },
  monthlyStatsTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
    textAlign: 'center'
  },
  monthlyStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  monthlyStatItem: {
    alignItems: 'center',
    flex: 1
  },
  monthlyStatValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e40af'
  },
  monthlyStatLabel: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 1
  }
});

export default ClientCard;
