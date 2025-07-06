import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Trash2, RefreshCw, Info, CheckCircle, AlertTriangle } from 'lucide-react-native';
import { CacheManager, DevCleanup } from '@/utils/cleanup';

interface CleanupManagerProps {
  onCleanupComplete?: () => void;
}

export default function CleanupManager({ onCleanupComplete }: CleanupManagerProps) {
  const [cacheInfo, setCacheInfo] = useState({ totalKeys: 0, cacheKeys: 0, size: '0 KB' });
  const [isLoading, setIsLoading] = useState(false);
  const [lastCleanup, setLastCleanup] = useState<Date | null>(null);

  useEffect(() => {
    loadCacheInfo();
  }, []);

  const loadCacheInfo = async () => {
    try {
      const info = await CacheManager.getCacheInfo();
      setCacheInfo(info);
    } catch (error) {
      console.error('Error loading cache info:', error);
    }
  };

  const handleFullCleanup = async () => {
    Alert.alert(
      'Full Cleanup',
      'This will clear all temporary caches and optimize the app. Your user data and settings will be preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clean Up',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await CacheManager.performFullCleanup();
              await loadCacheInfo();
              setLastCleanup(new Date());
              onCleanupComplete?.();
              
              Alert.alert('Success', 'Cleanup completed successfully!');
            } catch (error) {
              Alert.alert('Error', 'Failed to complete cleanup. Please try again.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDevReset = async () => {
    if (Platform.OS === 'web' && process.env.NODE_ENV !== 'development') {
      Alert.alert('Not Available', 'Development reset is only available in development mode.');
      return;
    }

    Alert.alert(
      'Development Reset',
      'This will reset the app to a clean state for testing. All caches and temporary data will be cleared.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await DevCleanup.resetAppState();
              await loadCacheInfo();
              setLastCleanup(new Date());
              
              Alert.alert('Success', 'App state reset successfully!');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset app state. Please try again.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const getCacheStatus = () => {
    const cacheCount = cacheInfo.cacheKeys;
    if (cacheCount === 0) return { status: 'clean', color: '#2ECC71', icon: CheckCircle };
    if (cacheCount < 10) return { status: 'good', color: '#FFA726', icon: Info };
    return { status: 'needs-cleanup', color: '#E74C3C', icon: AlertTriangle };
  };

  const status = getCacheStatus();
  const StatusIcon = status.icon;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>App Cleanup & Optimization</Text>
        <Text style={styles.subtitle}>Manage caches and optimize performance</Text>
      </View>

      {/* Cache Status */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <StatusIcon color={status.color} size={24} />
          <Text style={[styles.statusTitle, { color: status.color }]}>
            Cache Status: {status.status.replace('-', ' ').toUpperCase()}
          </Text>
        </View>
        
        <View style={styles.statusDetails}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Total Storage Keys:</Text>
            <Text style={styles.statusValue}>{cacheInfo.totalKeys}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Cache Keys:</Text>
            <Text style={styles.statusValue}>{cacheInfo.cacheKeys}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Estimated Size:</Text>
            <Text style={styles.statusValue}>{cacheInfo.size}</Text>
          </View>
          {lastCleanup && (
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Last Cleanup:</Text>
              <Text style={styles.statusValue}>
                {lastCleanup.toLocaleTimeString()}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Cleanup Actions */}
      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Cleanup Actions</Text>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryAction]}
          onPress={handleFullCleanup}
          disabled={isLoading}
        >
          <Trash2 color="white" size={20} />
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Full Cleanup</Text>
            <Text style={styles.actionDescription}>
              Clear all temporary caches and optimize app performance
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryAction]}
          onPress={loadCacheInfo}
          disabled={isLoading}
        >
          <RefreshCw color="#666" size={20} />
          <View style={styles.actionContent}>
            <Text style={[styles.actionTitle, { color: '#666' }]}>Refresh Info</Text>
            <Text style={styles.actionDescription}>
              Update cache information and status
            </Text>
          </View>
        </TouchableOpacity>

        {(Platform.OS === 'web' && process.env.NODE_ENV === 'development') && (
          <TouchableOpacity
            style={[styles.actionButton, styles.warningAction]}
            onPress={handleDevReset}
            disabled={isLoading}
          >
            <AlertTriangle color="#E74C3C" size={20} />
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: '#E74C3C' }]}>Development Reset</Text>
              <Text style={styles.actionDescription}>
                Reset app to clean state for testing (Dev only)
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Information */}
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>What gets cleaned?</Text>
        <View style={styles.infoList}>
          <Text style={styles.infoItem}>• Video validation cache</Text>
          <Text style={styles.infoItem}>• Temporary video queue data</Text>
          <Text style={styles.infoItem}>• Old user statistics</Text>
          <Text style={styles.infoItem}>• Development logs and debug data</Text>
          <Text style={styles.infoItem}>• Expired session data</Text>
        </View>
        
        <View style={styles.preservedSection}>
          <Text style={styles.preservedTitle}>Preserved data:</Text>
          <Text style={styles.preservedItem}>✓ User authentication tokens</Text>
          <Text style={styles.preservedItem}>✓ User profile and settings</Text>
          <Text style={styles.preservedItem}>✓ Coin balance and transactions</Text>
          <Text style={styles.preservedItem}>✓ Video promotion history</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  statusCard: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  statusDetails: {
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  actionsSection: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  primaryAction: {
    backgroundColor: '#FF4757',
  },
  secondaryAction: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  warningAction: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FED7D7',
  },
  actionContent: {
    marginLeft: 12,
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  infoSection: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
  },
  infoList: {
    marginBottom: 16,
  },
  infoItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  preservedSection: {
    backgroundColor: '#F0F8FF',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4A90E2',
  },
  preservedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
    marginBottom: 8,
  },
  preservedItem: {
    fontSize: 12,
    color: '#4A90E2',
    marginBottom: 2,
  },
});