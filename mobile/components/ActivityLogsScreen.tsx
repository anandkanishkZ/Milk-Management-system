import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { ActivityLog } from '@/types';
import { 
  Activity, 
  Search, 
  Filter, 
  Clock, 
  User, 
  Plus, 
  Edit, 
  Trash2,
  DollarSign,
  FileText,
  Settings,
  Eye,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  TrendingUp,
  BarChart3,
  Users
} from 'lucide-react-native';
import { formatDisplayDate, getTodayString } from '@/utils/date';

export default function ActivityLogsScreen() {
  const { 
    getActivityLogs, 
    getActivityStats, 
    logActivity,
    refreshData 
  } = useData();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [limit, setLimit] = useState(50);

  const activityStats = useMemo(() => getActivityStats(), [getActivityLogs]);
  
  const filteredLogs = useMemo(() => {
    const logs = getActivityLogs(limit, searchQuery);
    if (filterType === 'all') return logs;
    return logs.filter(log => log.entityType === filterType || log.action.includes(filterType));
  }, [searchQuery, filterType, limit, getActivityLogs]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    await logActivity({
      action: 'report_viewed',
      entityType: 'view',
      description: 'Activity logs refreshed'
    });
    setRefreshing(false);
  };



  const getActivityIcon = (action: string, entityType: string) => {
    switch (entityType) {
      case 'customer':
        if (action.includes('added')) return <Plus size={16} color="#16a34a" />;
        if (action.includes('updated')) return <Edit size={16} color="#2563eb" />;
        if (action.includes('deleted')) return <Trash2 size={16} color="#dc2626" />;
        if (action.includes('activated')) return <CheckCircle size={16} color="#16a34a" />;
        if (action.includes('deactivated')) return <XCircle size={16} color="#f59e0b" />;
        return <User size={16} color="#6b7280" />;
      
      case 'daily_entry':
        return <Calendar size={16} color="#7c3aed" />;
      
      case 'payment':
        return <DollarSign size={16} color="#059669" />;
      
      case 'system':
        if (action.includes('exported')) return <Download size={16} color="#2563eb" />;
        if (action.includes('cleared')) return <AlertTriangle size={16} color="#dc2626" />;
        if (action.includes('opened')) return <Activity size={16} color="#16a34a" />;
        return <Settings size={16} color="#6b7280" />;
      
      case 'view':
        return <Eye size={16} color="#6b7280" />;
      
      default:
        return <FileText size={16} color="#6b7280" />;
    }
  };

  const getActivityColor = (entityType: string, action: string) => {
    if (action.includes('deleted') || action.includes('cleared')) return '#fee2e2';
    if (action.includes('added') || action.includes('activated')) return '#dcfce7';
    if (action.includes('updated')) return '#dbeafe';
    if (action.includes('payment')) return '#ecfccb';
    return '#f3f4f6';
  };

  const getExactTime = (timestamp: string) => {
    const time = new Date(timestamp);
    return time.toLocaleTimeString('en-US', {
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getExactDate = (timestamp: string) => {
    const time = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (time.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (time.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return time.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: time.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const renderActivityItem = (log: ActivityLog) => (
    <View key={log.id} style={[
      styles.activityItem,
      { backgroundColor: getActivityColor(log.entityType, log.action) }
    ]}>
      <View style={styles.activityHeader}>
        <View style={styles.activityIcon}>
          {getActivityIcon(log.action, log.entityType)}
        </View>
        <View style={styles.activityContent}>
          <Text style={styles.activityDescription}>{log.description}</Text>
          <View style={styles.activityMeta}>
            <View style={styles.timeContainer}>
              <Clock size={12} color="#6b7280" />
              <Text style={styles.activityTime}>{getExactTime(log.timestamp)}</Text>
              <Text style={styles.activityDate}>{getExactDate(log.timestamp)}</Text>
            </View>
            <Text style={styles.activityType}>
              {log.entityType.replace('_', ' ')}
            </Text>
          </View>
        </View>
      </View>
      
      {log.metadata && Object.keys(log.metadata).length > 0 && (
        <View style={styles.activityMetadata}>
          {Object.entries(log.metadata).slice(0, 3).map(([key, value]) => (
            <Text key={key} style={styles.metadataItem}>
              {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </Text>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Activity size={24} color="#fff" />
          <Text style={styles.headerTitle}>Activity Logs</Text>
          <Text style={styles.headerSubtitle}>Permanent audit trail</Text>
        </View>
      </View>

      {/* Stats Section */}
      <View style={styles.statsSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Activity size={20} color="#2563eb" />
              <Text style={styles.statValue}>{activityStats.totalActivities}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            
            <View style={styles.statCard}>
              <Clock size={20} color="#16a34a" />
              <Text style={styles.statValue}>{activityStats.todayActivities}</Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>
            
            <View style={styles.statCard}>
              <Calendar size={20} color="#7c3aed" />
              <Text style={styles.statValue}>{activityStats.weekActivities}</Text>
              <Text style={styles.statLabel}>This Week</Text>
            </View>
            
            <View style={styles.statCard}>
              <TrendingUp size={20} color="#f59e0b" />
              <Text style={styles.statValue}>{activityStats.monthActivities}</Text>
              <Text style={styles.statLabel}>This Month</Text>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Search and Filter */}
      <View style={styles.controlsSection}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search activities..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {['all', 'customer', 'daily_entry', 'payment', 'system', 'view'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterChip,
                filterType === type && styles.filterChipActive
              ]}
              onPress={() => setFilterType(type)}
            >
              <Text style={[
                styles.filterChipText,
                filterType === type && styles.filterChipTextActive
              ]}>
                {type === 'all' ? 'All' : type.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Activity List */}
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredLogs.length === 0 ? (
          <View style={styles.emptyState}>
            <Activity size={48} color="#d1d5db" />
            <Text style={styles.emptyStateText}>No activities found</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery ? 'Try adjusting your search terms' : 'Activities will appear here as you use the app'}
            </Text>
          </View>
        ) : (
          <>
            {filteredLogs.map(renderActivityItem)}
            
            {filteredLogs.length === limit && (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={() => setLimit(prev => prev + 50)}
              >
                <RefreshCw size={16} color="#2563eb" />
                <Text style={styles.loadMoreText}>Load More</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      {/* Most Active Types */}
      {Object.keys(activityStats.activityByType).length > 0 && (
        <View style={styles.bottomStats}>
          <Text style={styles.bottomStatsTitle}>Most Active</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.typeStatsContainer}>
              {Object.entries(activityStats.activityByType)
                .sort(([,a], [,b]) => (b as number) - (a as number))
                .slice(0, 5)
                .map(([type, count]) => (
                  <View key={type} style={styles.typeStatItem}>
                    <Text style={styles.typeStatCount}>{count as number}</Text>
                    <Text style={styles.typeStatLabel}>{type.replace('_', ' ')}</Text>
                  </View>
                ))}
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#2563eb',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#dbeafe',
    marginTop: 2,
  },
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1d4ed8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsSection: {
    backgroundColor: '#fff',
    paddingVertical: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 16,
  },
  statCard: {
    alignItems: 'center',
    minWidth: 80,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  controlsSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  filterContainer: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    textTransform: 'capitalize',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  activityItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activityContent: {
    flex: 1,
  },
  activityDescription: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 6,
    lineHeight: 20,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  activityDate: {
    fontSize: 11,
    color: '#9ca3af',
  },
  activityType: {
    fontSize: 12,
    color: '#64748b',
    textTransform: 'capitalize',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activityMetadata: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  metadataItem: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563eb',
  },
  bottomStats: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  bottomStatsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
    paddingHorizontal: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  typeStatsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 16,
  },
  typeStatItem: {
    alignItems: 'center',
    minWidth: 60,
  },
  typeStatCount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2563eb',
    marginBottom: 4,
  },
  typeStatLabel: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
    textTransform: 'capitalize',
  },
});