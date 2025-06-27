import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Menu, DollarSign, Plus, ChartBar as BarChart3, Clock, Coins } from 'lucide-react-native';
import { useUserStore } from '@/stores/userStore';
import { useVideoStore } from '@/stores/videoStore';

export default function PromoteScreen() {
  const { coins, spendCoins } = useUserStore();
  const { addVideo, getUserPromotions } = useVideoStore();
  const [videoUrl, setVideoUrl] = useState('');
  const [videoDuration, setVideoDuration] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(false);
  
  const userPromotions = getUserPromotions();

  const calculateCost = (duration: number) => {
    // Base cost calculation: 1 coin per second + 20% platform fee
    return Math.ceil(duration * 1.2);
  };

  const calculateEarning = (duration: number) => {
    // Users earn slightly less than what promoter pays
    return Math.ceil(duration * 0.8);
  };

  const handlePromoteVideo = () => {
    const duration = parseInt(videoDuration);
    
    if (!videoUrl.trim()) {
      Alert.alert('Error', 'Please enter a YouTube video URL');
      return;
    }
    
    if (!duration || duration < 10 || duration > 300) {
      Alert.alert('Error', 'Video duration must be between 10 and 300 seconds');
      return;
    }
    
    const cost = calculateCost(duration);
    
    if (coins < cost) {
      Alert.alert('Insufficient Coins', `You need ${cost} coins to promote this video. You have ${coins} coins.`);
      return;
    }
    
    Alert.alert(
      'Confirm Promotion',
      `Promote video for ${duration} seconds?\n\nCost: ${cost} coins\nViewers will earn: ${calculateEarning(duration)} coins per view`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Promote', 
          onPress: () => {
            spendCoins(cost);
            addVideo({
              url: videoUrl,
              duration: duration,
              coinReward: calculateEarning(duration),
              promoterId: 'current-user', // In real app, this would be actual user ID
              createdAt: new Date(),
            });
            
            setVideoUrl('');
            setVideoDuration('');
            
            Alert.alert('Success!', 'Your video has been added to the promotion queue! 🎉');
          }
        }
      ]
    );
  };

  const renderPromotionCard = (promotion: any, index: number) => (
    <View key={index} style={styles.promotionCard}>
      <View style={styles.promotionHeader}>
        <Text style={styles.promotionTitle}>Video #{index + 1}</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>Active</Text>
        </View>
      </View>
      <Text style={styles.promotionUrl} numberOfLines={2}>{promotion.url}</Text>
      <View style={styles.promotionStats}>
        <View style={styles.statItem}>
          <Clock size={16} color="#6B7280" />
          <Text style={styles.statText}>{promotion.duration}s</Text>
        </View>
        <View style={styles.statItem}>
          <Coins size={16} color="#F59E0B" />
          <Text style={styles.statText}>{promotion.coinReward} per view</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#FDF2F8', '#FCE7F3', '#FBBF24']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuButton}>
            <Menu size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.title}>VidGro</Text>
          <View style={styles.coinContainer}>
            <Text style={styles.coinText}>{coins}</Text>
            <View style={styles.coinIcon}>
              <DollarSign size={20} color="#FFFFFF" />
            </View>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.promoteSection}>
            <View style={styles.sectionHeader}>
              <Plus size={24} color="#EF4444" />
              <Text style={styles.sectionTitle}>Promote New Video</Text>
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>YouTube Video URL</Text>
              <TextInput
                style={styles.textInput}
                placeholder="https://youtube.com/watch?v=..."
                value={videoUrl}
                onChangeText={setVideoUrl}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Video Duration (seconds)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter duration (10-300 seconds)"
                value={videoDuration}
                onChangeText={setVideoDuration}
                keyboardType="numeric"
              />
              {videoDuration && parseInt(videoDuration) >= 10 && (
                <View style={styles.costPreview}>
                  <Text style={styles.costText}>
                    Cost: {calculateCost(parseInt(videoDuration))} coins
                  </Text>
                  <Text style={styles.earningText}>
                    Viewers earn: {calculateEarning(parseInt(videoDuration))} coins
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity 
              style={[styles.promoteButton, (!videoUrl || !videoDuration) && styles.disabledButton]}
              onPress={handlePromoteVideo}
              disabled={!videoUrl || !videoDuration}
            >
              <Text style={styles.promoteButtonText}>Promote Video</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.analyticsSection}>
            <TouchableOpacity 
              style={styles.analyticsHeader}
              onPress={() => setShowAnalytics(!showAnalytics)}
            >
              <View style={styles.sectionHeader}>
                <BarChart3 size={24} color="#6366F1" />
                <Text style={styles.sectionTitle}>Analytics</Text>
              </View>
              <Text style={styles.toggleText}>{showAnalytics ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>

            {showAnalytics && (
              <View style={styles.analyticsContent}>
                <View style={styles.analyticsStats}>
                  <View style={styles.analyticsCard}>
                    <Text style={styles.analyticsNumber}>{userPromotions.length}</Text>
                    <Text style={styles.analyticsLabel}>Active Promotions</Text>
                  </View>
                  <View style={styles.analyticsCard}>
                    <Text style={styles.analyticsNumber}>
                      {userPromotions.reduce((sum, p) => sum + p.duration, 0)}s
                    </Text>
                    <Text style={styles.analyticsLabel}>Total Duration</Text>
                  </View>
                </View>

                {userPromotions.length > 0 ? (
                  <View style={styles.promotionsList}>
                    <Text style={styles.promotionsTitle}>Your Promotions</Text>
                    {userPromotions.map(renderPromotionCard)}
                  </View>
                ) : (
                  <View style={styles.noPromotions}>
                    <Text style={styles.noPromotionsText}>No active promotions</Text>
                    <Text style={styles.noPromotionsSubtext}>
                      Start promoting videos to see analytics here
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  menuButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  coinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coinText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  coinIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  promoteSection: {
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    backgroundColor: '#F9FAFB',
  },
  costPreview: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  costText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#059669',
    marginBottom: 4,
  },
  earningText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#065F46',
  },
  promoteButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#D1D5DB',
  },
  promoteButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  analyticsSection: {
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
  analyticsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6366F1',
  },
  analyticsContent: {
    marginTop: 20,
  },
  analyticsStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  analyticsCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  analyticsNumber: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#374151',
    marginBottom: 4,
  },
  analyticsLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    textAlign: 'center',
  },
  promotionsList: {
    gap: 12,
  },
  promotionsTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginBottom: 12,
  },
  promotionCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  promotionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  promotionTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  statusBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  promotionUrl: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 12,
  },
  promotionStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  noPromotions: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noPromotionsText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginBottom: 8,
  },
  noPromotionsSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
});