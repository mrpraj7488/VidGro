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
import { Plus, DollarSign, Clock, Eye, Target } from 'lucide-react-native';
import { useUserStore } from '@/stores/userStore';
import { useVideoStore } from '@/stores/videoStore';
import Header from '@/components/Header';

export default function PromoteScreen() {
  const { coins, spendCoins } = useUserStore();
  const { addVideo, getUserPromotions } = useVideoStore();
  const [videoUrl, setVideoUrl] = useState('');
  const [videoDuration, setVideoDuration] = useState('');
  const [viewsGoal, setViewsGoal] = useState('');
  
  const userPromotions = getUserPromotions();

  const calculateCost = (duration: number, views: number) => {
    // Base cost: 1 coin per second per view + 20% platform fee
    return Math.ceil(duration * views * 1.2);
  };

  const calculateEarning = (duration: number) => {
    // Users earn slightly less than what promoter pays per view
    return Math.ceil(duration * 0.8);
  };

  const handlePromoteVideo = () => {
    const duration = parseInt(videoDuration);
    const views = parseInt(viewsGoal);
    
    if (!videoUrl.trim()) {
      Alert.alert('Error', 'Please enter a YouTube video URL');
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
          onPress: () => {
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
          <Eye size={16} color="#6B7280" />
          <Text style={styles.statText}>{promotion.views || 0} views</Text>
        </View>
        <View style={styles.statItem}>
          <DollarSign size={16} color="#00FF00" />
          <Text style={styles.statText}>{promotion.coinReward}/view</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Video Promote" />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Promote New Video */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Plus size={24} color="#FF0000" />
            <Text style={styles.sectionTitle}>Promote New Video</Text>
          </View>
          
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>YouTube Video Link</Text>
              <TextInput
                style={styles.textInput}
                placeholder="https://youtube.com/watch?v=..."
                value={videoUrl}
                onChangeText={setVideoUrl}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputContainer, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Video Length (seconds)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="10-300"
                  value={videoDuration}
                  onChangeText={setVideoDuration}
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.inputContainer, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.inputLabel}>Views Goal</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="1-10000"
                  value={viewsGoal}
                  onChangeText={setViewsGoal}
                  keyboardType="numeric"
                />
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
                      Total Cost: {calculateCost(parseInt(videoDuration), parseInt(viewsGoal))} coins
                    </Text>
                  </View>
                  <Text style={styles.earningText}>
                    Viewers earn: {calculateEarning(parseInt(videoDuration))} coins per view
                  </Text>
                </LinearGradient>
              </View>
            )}

            <TouchableOpacity 
              style={[styles.promoteButton, (!videoUrl || !videoDuration || !viewsGoal) && styles.disabledButton]}
              onPress={handlePromoteVideo}
              disabled={!videoUrl || !videoDuration || !viewsGoal}
            >
              <LinearGradient
                colors={(!videoUrl || !videoDuration || !viewsGoal) ? ['#D1D5DB', '#9CA3AF'] : ['#FF0000', '#DC143C']}
                style={styles.buttonGradient}
              >
                <Text style={styles.promoteButtonText}>Promote Video</Text>
              </LinearGradient>
            </TouchableOpacity>
          </div>
        </View>

        {/* Active Promotions */}
        <View style={styles.section}>
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
              <Text style={styles.noPromotionsText}>No active promotions</Text>
              <Text style={styles.noPromotionsSubtext}>
                Start promoting videos to see them here
              </Text>
            </View>
          )}
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Roboto-Bold',
    color: '#000000',
  },
  form: {
    gap: 20,
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
    color: '#000000',
  },
  textInput: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
    backgroundColor: '#F9FAFB',
    color: '#000000',
  },
  costPreview: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  costGradient: {
    padding: 16,
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
    borderRadius: 25,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
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
    backgroundColor: '#F8FAFC',
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
    fontSize: 16,
    fontFamily: 'Roboto-Bold',
    color: '#000000',
  },
  statusBadge: {
    backgroundColor: '#00FF00',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
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
    fontFamily: 'Roboto-Medium',
    color: '#6B7280',
  },
  noPromotions: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noPromotionsText: {
    fontSize: 18,
    fontFamily: 'Roboto-Bold',
    color: '#000000',
    marginBottom: 8,
  },
  noPromotionsSubtext: {
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
});