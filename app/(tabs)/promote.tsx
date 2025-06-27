import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, DollarSign, Clock, Eye, Target, Youtube, TrendingUp } from 'lucide-react-native';
import { useUserStore } from '@/stores/userStore';
import { useVideoStore } from '@/stores/videoStore';
import promotionService from '@/services/promotionService';
import Header from '@/components/Header';

export default function PromoteScreen() {
  const { coins, spendCoins } = useUserStore();
  const { addVideo, getUserPromotions } = useVideoStore();
  const [videoUrl, setVideoUrl] = useState('');
  const [videoDuration, setVideoDuration] = useState('');
  const [viewsGoal, setViewsGoal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const userPromotions = getUserPromotions();

  const calculateCost = (duration: number, views: number) => {
    // Base cost: 1.2 coins per second per view
    return Math.ceil(duration * views * 1.2);
  };

  const calculateEarning = (duration: number) => {
    // Users earn 0.8 coins per second watched
    return Math.ceil(duration * 0.8);
  };

  const validateYouTubeUrl = (url: string): boolean => {
    const regex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/;
    return regex.test(url);
  };

  const handlePromoteVideo = async () => {
    const duration = parseInt(videoDuration);
    const views = parseInt(viewsGoal);
    
    if (!videoUrl.trim()) {
      Alert.alert('Error', 'Please enter a YouTube video URL');
      return;
    }

    if (!validateYouTubeUrl(videoUrl)) {
      Alert.alert('Error', 'Please enter a valid YouTube URL');
      return;
    }
    
    if (!duration || duration < 10 || duration > 300) {
      Alert.alert('Error', 'Video duration must be between 10 and 300 seconds');
      return;
    }

    if (!views || views < 1 || views > 10000) {
      Alert.alert('Error', 'Views goal must be between 1 and 10,000');
      return;
    }
    
    const cost = calculateCost(duration, views);
    
    if (coins < cost) {
      Alert.alert('Insufficient Coins', `You need ${cost} coins to promote this video. You have ${coins} coins.`);
      return;
    }
    
    Alert.alert(
      'Confirm Promotion',
      `Promote video for ${duration} seconds with ${views} views goal?\n\nTotal Cost: ${cost} coins\nViewers will earn: ${calculateEarning(duration)} coins per view`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Promote', 
          onPress: () => createPromotion(cost, duration, views)
        }
      ]
    );
  };

  const createPromotion = async (cost: number, duration: number, views: number) => {
    setIsLoading(true);
    try {
      const response = await promotionService.createPromotion({
        youtube_url: videoUrl,
        duration: duration,
        views_requested: views
      });

      if (response.success) {
        spendCoins(cost);
        addVideo({
          url: videoUrl,
          duration: duration,
          coinReward: calculateEarning(duration),
          promoterId: 'current-user',
          createdAt: new Date(),
        });
        
        setVideoUrl('');
        setVideoDuration('');
        setViewsGoal('');
        
        Alert.alert('Success!', 'Your video has been added to the promotion queue! 🎉');
      } else {
        Alert.alert('Error', 'Failed to create promotion. Please try again.');
      }
    } catch (error: any) {
      console.error('Promotion creation error:', error);
      Alert.alert('Error', error.message || 'Failed to create promotion');
    } finally {
      setIsLoading(false);
    }
  };

  const renderPromotionCard = (promotion: any, index: number) => (
    <View key={index} style={styles.promotionCard}>
      <LinearGradient
        colors={['#FFFFFF', '#F8FAFC']}
        style={styles.promotionGradient}
      >
        <View style={styles.promotionHeader}>
          <View style={styles.promotionTitleContainer}>
            <Youtube size={20} color="#FF0000" />
            <Text style={styles.promotionTitle}>Video #{index + 1}</Text>
          </View>
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
            <Eye size={16} color="#6B7280" />
            <Text style={styles.statText}>{promotion.views || 0} views</Text>
          </View>
          <View style={styles.statItem}>
            <DollarSign size={16} color="#10B981" />
            <Text style={styles.statText}>{promotion.coinReward}/view</Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min((promotion.views || 0) / 100 * 100, 100)}%` }]} />
          </View>
          <Text style={styles.progressText}>{promotion.views || 0}/100 views</Text>
        </View>
      </LinearGradient>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Video Promote" />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Promote New Video */}
        <View style={styles.section}>
          <LinearGradient
            colors={['#FFFFFF', '#F8FAFC']}
            style={styles.sectionGradient}
          >
            <View style={styles.sectionHeader}>
              <Plus size={24} color="#FF0000" />
              <Text style={styles.sectionTitle}>Promote New Video</Text>
            </View>
            
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>YouTube Video Link</Text>
                <View style={styles.inputWrapper}>
                  <Youtube size={20} color="#FF0000" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="https://youtube.com/watch?v=..."
                    value={videoUrl}
                    onChangeText={setVideoUrl}
                    autoCapitalize="none"
                    keyboardType="url"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputContainer, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Video Length (seconds)</Text>
                  <View style={styles.inputWrapper}>
                    <Clock size={20} color="#6B7280" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="10-300"
                      value={videoDuration}
                      onChangeText={setVideoDuration}
                      keyboardType="numeric"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>

                <View style={[styles.inputContainer, { flex: 1, marginLeft: 12 }]}>
                  <Text style={styles.inputLabel}>Views Goal</Text>
                  <View style={styles.inputWrapper}>
                    <TrendingUp size={20} color="#6B7280" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="1-10000"
                      value={viewsGoal}
                      onChangeText={setViewsGoal}
                      keyboardType="numeric"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>
              </View>

              {videoDuration && viewsGoal && parseInt(videoDuration) >= 10 && parseInt(viewsGoal) >= 1 && (
                <View style={styles.costPreview}>
                  <LinearGradient
                    colors={['#FFA500', '#FF8C00']}
                    style={styles.costGradient}
                  >
                    <View style={styles.costRow}>
                      <DollarSign size={20} color="#FFFFFF" />
                      <Text style={styles.costText}>
                        Total Cost: {String(calculateCost(parseInt(videoDuration), parseInt(viewsGoal)))} coins
                      </Text>
                    </View>
                    <Text style={styles.earningText}>
                      Viewers earn: {String(calculateEarning(parseInt(videoDuration)))} coins per view
                    </Text>
                  </LinearGradient>
                </View>
              )}

              <TouchableOpacity 
                style={[
                  styles.promoteButton, 
                  (!videoUrl || !videoDuration || !viewsGoal || isLoading) && styles.disabledButton
                ]}
                onPress={handlePromoteVideo}
                disabled={!videoUrl || !videoDuration || !viewsGoal || isLoading}
              >
                <LinearGradient
                  colors={(!videoUrl || !videoDuration || !viewsGoal || isLoading) ? 
                    ['#D1D5DB', '#9CA3AF'] : ['#FF0000', '#DC143C']}
                  style={styles.buttonGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.promoteButtonText}>Promote Video</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Active Promotions */}
        <View style={styles.section}>
          <LinearGradient
            colors={['#FFFFFF', '#F8FAFC']}
            style={styles.sectionGradient}
          >
            <View style={styles.sectionHeader}>
              <Target size={24} color="#1E90FF" />
              <Text style={styles.sectionTitle}>Active Promotions</Text>
            </View>

            {userPromotions.length > 0 ? (
              <View style={styles.promotionsList}>
                {userPromotions.map(renderPromotionCard)}
              </View>
            ) : (
              <View style={styles.noPromotions}>
                <View style={styles.noPromotionsIcon}>
                  <Target size={48} color="#D1D5DB" />
                </View>
                <Text style={styles.noPromotionsText}>No active promotions</Text>
                <Text style={styles.noPromotionsSubtext}>
                  Start promoting videos to see them here
                </Text>
              </View>
            )}
          </LinearGradient>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  content: {
    flex: 1,
  },
  section: {
    margin: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  sectionGradient: {
    padding: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: 'Roboto-Bold',
    color: '#000000',
  },
  form: {
    gap: 24,
  },
  inputContainer: {
    gap: 8,
  },
  inputRow: {
    flexDirection: 'row',
  },
  inputLabel: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
    color: '#000000',
  },
  costPreview: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  costGradient: {
    padding: 20,
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  costText: {
    fontSize: 18,
    fontFamily: 'Roboto-Bold',
    color: '#FFFFFF',
  },
  earningText: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  promoteButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  promoteButtonText: {
    fontSize: 18,
    fontFamily: 'Roboto-Bold',
    color: '#FFFFFF',
  },
  promotionsList: {
    gap: 16,
  },
  promotionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  promotionGradient: {
    padding: 20,
  },
  promotionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  promotionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  promotionTitle: {
    fontSize: 18,
    fontFamily: 'Roboto-Bold',
    color: '#000000',
  },
  statusBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Roboto-Bold',
    color: '#FFFFFF',
  },
  promotionUrl: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  promotionStats: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    color: '#6B7280',
  },
  progressContainer: {
    gap: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'Roboto-Medium',
    color: '#6B7280',
    textAlign: 'right',
  },
  noPromotions: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noPromotionsIcon: {
    marginBottom: 16,
  },
  noPromotionsText: {
    fontSize: 20,
    fontFamily: 'Roboto-Bold',
    color: '#374151',
    marginBottom: 8,
  },
  noPromotionsSubtext: {
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
});