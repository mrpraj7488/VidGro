import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Trash2, RefreshCw } from 'lucide-react-native';
import { useUserStore } from '@/stores/userStore';
import { useVideoStore } from '@/stores/videoStore';

export default function CacheManager() {
  const { clearCache: clearUserCache } = useUserStore();
  const { clearCache: clearVideoCache } = useVideoStore();

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will reset all app data including coins, videos watched, and promotions. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearUserCache();
            clearVideoCache();
            Alert.alert('Success', 'Cache cleared successfully!');
          }
        }
      ]
    );
  };

  const handleRefreshData = () => {
    Alert.alert(
      'Refresh Data',
      'This will reload the app data from defaults.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Refresh',
          onPress: () => {
            clearVideoCache();
            Alert.alert('Success', 'Data refreshed successfully!');
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cache Management</Text>
      
      <TouchableOpacity style={styles.button} onPress={handleRefreshData}>
        <RefreshCw size={20} color="#FFFFFF" />
        <Text style={styles.buttonText}>Refresh Data</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={handleClearCache}>
        <Trash2 size={20} color="#FFFFFF" />
        <Text style={styles.buttonText}>Clear All Cache</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Roboto-Bold',
    color: '#000000',
    marginBottom: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E90FF',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  dangerButton: {
    backgroundColor: '#FF0000',
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#FFFFFF',
  },
});