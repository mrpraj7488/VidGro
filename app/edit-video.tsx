import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
  Modal,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useVideoStore } from '@/store/videoStore';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Eye, Clock, Trash2, Play, Timer, ChevronDown, Check } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 480;

interface VideoData {
  id: string;
  youtube_url: string;
  title: string;
  views_count: number;
  target_views: number;
  coin_reward: number;
  coin_cost: number;
  status: 'active' | 'paused' | 'completed' | 'on_hold' | 'repromoted';
  created_at: string;
  updated_at: string;
  hold_until?: string;
  duration_seconds: number;
  video_views?: any[];
  repromoted_at?: string;
}

const VIEW_OPTIONS = [10, 25, 50, 100, 200, 500];
const DURATION_OPTIONS = [30, 45, 60, 90, 120];

interface DropdownProps {
  visible: boolean;
  onClose: () => void;
  options: number[];
  selectedValue: number;
  onSelect: (value: number) => void;
  label: string;
  suffix: string;
}

const SmoothDropdown: React.FC<DropdownProps> = ({
  visible,
  onClose,
  options,
  selectedValue,
  onSelect,
  label,
  suffix,
}) => {
  const handleSelect = (value: number) => {
    onSelect(value);
    onClose();
  };

  const renderItem = ({ item }: { item: number }) => (
    <TouchableOpacity
      style={[
        styles.dropdownItem,
        item === selectedValue && styles.selectedDropdownItem
      ]}
      onPress={() => handleSelect(item)}
    >
      <Text style={[
        styles.dropdownItemText,
        item === selectedValue && styles.selectedDropdownItemText
      ]}>
        {item} {suffix}
      </Text>
      {item === selectedValue && (
        <Check color="#3498DB" size={16} />
      )}
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.fullScreenModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{label}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={options}
            renderItem={renderItem}
            keyExtractor={(item) => item.toString()}
            style={styles.modalList}
            showsVerticalScrollIndicator={false}
            bounces={true}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export default function EditVideoScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const { clearQueue } = useVideoStore();
  const params = useLocalSearchParams();
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [holdTimer, setHoldTimer] = useState(0);
  const [showRepromoteOptions, setShowRepromoteOptions] = useState(false);
  const [selectedViews, setSelectedViews] = useState(50);
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [showViewsDropdown, setShowViewsDropdown] = useState(false);
  const [showDurationDropdown, setShowDurationDropdown] = useState(false);
  const [repromoting, setRepromoting] = useState(false);

  // Animation values
  const coinBounce = useSharedValue(1);

  useEffect(() => {
    if (params.videoData) {
      try {
        const video = JSON.parse(params.videoData as string);
        setVideoData(video);
        
        // Calculate hold timer if video is on hold
        if (video.status === 'on_hold') {
          const holdUntil = new Date(video.hold_until || video.created_at);
          holdUntil.setMinutes(holdUntil.getMinutes() + 10);
          const remainingMs = holdUntil.getTime() - new Date().getTime();
          setHoldTimer(Math.max(0, Math.floor(remainingMs / 1000)));
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error parsing video data:', error);
        router.back();
      }
    }
  }, [params.videoData]);

  // Update hold timer every second
  useEffect(() => {
    if (holdTimer > 0) {
      const interval = setInterval(() => {
        setHoldTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [holdTimer]);

  const getMinutesSinceCreation = () => {
    if (!videoData) return 0;
    const createdTime = new Date(videoData.created_at);
    const now = new Date();
    return Math.floor((now.getTime() - createdTime.getTime()) / (1000 * 60));
  };

  const getRefundInfo = () => {
    const minutesSinceCreation = getMinutesSinceCreation();
    const isWithin10Minutes = minutesSinceCreation <= 10;
    const refundPercentage = isWithin10Minutes ? 100 : 80;
    const refundAmount = Math.floor((videoData?.coin_cost || 0) * refundPercentage / 100);
    
    return { refundPercentage, refundAmount, isWithin10Minutes };
  };

  const handleDeleteVideo = async () => {
    if (!videoData || !user) return;

    const { refundPercentage, refundAmount, isWithin10Minutes } = getRefundInfo();
    
    const message = `Deleting now refunds ${refundPercentage}% coins (🪙${refundAmount}). Confirm?`;

    Alert.alert(
      'Delete Video',
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete the video
              const { error: deleteError } = await supabase
                .from('videos')
                .delete()
                .eq('id', videoData.id)
                .eq('user_id', user.id);

              if (deleteError) throw deleteError;

              // Process refund if there's an amount to refund
              if (refundAmount > 0) {
                const { error: refundError } = await supabase
                  .rpc('update_user_coins', {
                    user_uuid: user.id,
                    coin_amount: refundAmount,
                    transaction_type_param: 'admin_adjustment',
                    description_param: `Refund for deleted video: ${videoData.title} (${refundPercentage}%)`,
                    reference_uuid: videoData.id
                  });

                if (refundError) throw refundError;
              }

              // Refresh profile and clear queue
              await refreshProfile();
              clearQueue();

              // Animate coin update
              coinBounce.value = withSequence(
                withSpring(1.3, { damping: 15, stiffness: 150 }),
                withSpring(1, { damping: 15, stiffness: 150 })
              );

              Alert.alert('Success', `Video deleted and 🪙${refundAmount} coins refunded!`, [
                { text: 'OK', onPress: () => router.back() }
              ]);
            } catch (error) {
              console.error('Error deleting video:', error);
              Alert.alert('Error', 'Failed to delete video. Please try again.');
            }
          }
        }
      ]
    );
  };

  const calculateCoinCost = (views: number, duration: number) => {
    // Base cost calculation: views * duration factor
    const durationFactor = duration / 30; // 30 seconds as base
    return Math.ceil(views * durationFactor * 2); // 2 coins per view-duration unit
  };

  const handleRepromoteVideo = async () => {
    if (!videoData || !user || repromoting) return;

    setRepromoting(true);
    
    try {
      const coinCost = calculateCoinCost(selectedViews, selectedDuration);
      
      // Check if user has enough coins
      if ((profile?.coins || 0) < coinCost) {
        Alert.alert('Insufficient Coins', `You need 🪙${coinCost} coins to repromote this video.`);
        setRepromoting(false);
        return;
      }

      // Deduct coins for repromotion
      const { error: coinError } = await supabase
        .rpc('update_user_coins', {
          user_uuid: user.id,
          coin_amount: -coinCost,
          transaction_type_param: 'video_promotion',
          description_param: `Repromoted video: ${videoData.title}`,
          reference_uuid: videoData.id
        });

      if (coinError) throw coinError;

      // Clear existing views for this video
      const { error: clearViewsError } = await supabase
        .from('video_views')
        .delete()
        .eq('video_id', videoData.id);

      if (clearViewsError) throw clearViewsError;

      // Update video with new promotion settings - set to repromoted status
      const { error: updateError } = await supabase
        .from('videos')
        .update({
          views_count: 0,
          target_views: selectedViews,
          duration_seconds: selectedDuration,
          coin_cost: coinCost,
          status: 'repromoted', // Set status to repromoted
          updated_at: new Date().toISOString(),
          repromoted_at: new Date().toISOString(), // Track when it was repromoted
          hold_until: null // Clear any hold period
        })
        .eq('id', videoData.id)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Refresh profile and clear queue
      await refreshProfile();
      clearQueue();

      Alert.alert(
        'Success',
        `Video repromoted successfully! It's now active in the queue with ${selectedViews} target views.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error repromoting video:', error);
      Alert.alert('Error', 'Failed to repromote video. Please try again.');
    } finally {
      setRepromoting(false);
    }
  };

  const formatHoldTimer = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#2ECC71';
      case 'completed': return '#3498DB';
      case 'paused': return '#E74C3C';
      case 'on_hold': return '#F39C12';
      case 'repromoted': return '#9B59B6';
      default: return '#95A5A6';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'ACTIVE';
      case 'completed': return 'COMPLETED';
      case 'paused': return 'PAUSED';
      case 'on_hold': return 'PENDING';
      case 'repromoted': return 'REPROMOTED';
      default: return status.toUpperCase();
    }
  };

  const coinAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinBounce.value }],
  }));

  if (loading || !videoData) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading video details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#2C2C2C', '#3A3A3A']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {videoData.title}
        </Text>
        <Animated.View style={[styles.coinDisplay, coinAnimatedStyle]}>
          <Text style={styles.coinCount}>🪙{profile?.coins || 0}</Text>
        </Animated.View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Video Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(videoData.status) }]}>
              <Text style={styles.statusText}>{getStatusText(videoData.status)}</Text>
            </View>
            <Text style={styles.videoId}>ID: {videoData.youtube_url}</Text>
          </View>
          {videoData.status === 'repromoted' && videoData.repromoted_at && (
            <Text style={styles.repromoteInfo}>
              Repromoted on {new Date(videoData.repromoted_at).toLocaleDateString()}
            </Text>
          )}
        </View>

        {/* Pending Status Timeline */}
        {videoData.status === 'on_hold' && holdTimer > 0 && (
          <View style={styles.pendingCard}>
            <View style={styles.pendingHeader}>
              <Timer color="#F39C12" size={24} />
              <Text style={styles.pendingTitle}>Pending Status</Text>
            </View>
            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>{formatHoldTimer(holdTimer)} remaining</Text>
              <Text style={styles.timerSubtext}>Video will enter queue after hold period</Text>
            </View>
          </View>
        )}

        {/* Main Metrics */}
        <View style={styles.metricsSection}>
          <Text style={styles.sectionTitle}>Video Metrics</Text>
          
          <View style={styles.metricsGrid}>
            {/* Total Views */}
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Eye color="#3498DB" size={24} />
                <Text style={styles.metricLabel}>Total Views</Text>
              </View>
              <Text style={styles.metricValue}>
                {videoData.views_count}/{videoData.target_views}
              </Text>
            </View>

            {/* Watch Duration */}
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Clock color="#F39C12" size={24} />
                <Text style={styles.metricLabel}>Duration</Text>
              </View>
              <Text style={styles.metricValue}>
                {videoData.duration_seconds}s
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <Text style={styles.sectionTitle}>Actions</Text>

          {/* Delete Button */}
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]} 
            onPress={handleDeleteVideo}
          >
            <Trash2 color="white" size={20} />
            <View style={styles.actionContent}>
              <Text style={styles.actionButtonText}>Delete Video</Text>
              <Text style={styles.actionSubtext}>
                Refund: 🪙{getRefundInfo().refundAmount} ({getRefundInfo().refundPercentage}%)
              </Text>
            </View>
          </TouchableOpacity>

          {/* Repromote Section */}
          <View style={styles.repromoteSection}>
            <TouchableOpacity 
              style={styles.repromoteToggle}
              onPress={() => setShowRepromoteOptions(!showRepromoteOptions)}
            >
              <Text style={styles.repromoteLabel}>Repromote Video</Text>
              <ChevronDown 
                color="#333" 
                size={20} 
                style={[
                  styles.chevron,
                  showRepromoteOptions && styles.chevronRotated
                ]}
              />
            </TouchableOpacity>
            
            {showRepromoteOptions && (
              <View style={styles.repromoteOptions}>
                {/* Views Selection */}
                <View style={styles.optionGroup}>
                  <Text style={styles.optionLabel}>Target Views</Text>
                  <TouchableOpacity 
                    style={styles.dropdown}
                    onPress={() => setShowViewsDropdown(true)}
                  >
                    <Text style={styles.dropdownText}>{selectedViews} views</Text>
                    <ChevronDown color="#666" size={16} />
                  </TouchableOpacity>
                </View>

                {/* Duration Selection */}
                <View style={styles.optionGroup}>
                  <Text style={styles.optionLabel}>Watch Duration</Text>
                  <TouchableOpacity 
                    style={styles.dropdown}
                    onPress={() => setShowDurationDropdown(true)}
                  >
                    <Text style={styles.dropdownText}>{selectedDuration} seconds</Text>
                    <ChevronDown color="#666" size={16} />
                  </TouchableOpacity>
                </View>

                {/* Cost Display */}
                <View style={styles.costDisplay}>
                  <Text style={styles.costText}>
                    Cost: 🪙{calculateCoinCost(selectedViews, selectedDuration)}
                  </Text>
                </View>

                {/* Repromote Button */}
                <TouchableOpacity 
                  style={[
                    styles.actionButton, 
                    styles.repromoteButton,
                    repromoting && styles.buttonDisabled
                  ]} 
                  onPress={handleRepromoteVideo}
                  disabled={repromoting}
                >
                  <Play color="white" size={20} />
                  <View style={styles.actionContent}>
                    <Text style={styles.actionButtonText}>
                      {repromoting ? 'Repromoting...' : 'Repromote Now'}
                    </Text>
                    <Text style={styles.actionSubtext}>
                      Instantly active in queue
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Smooth Dropdowns */}
      <SmoothDropdown
        visible={showViewsDropdown}
        onClose={() => setShowViewsDropdown(false)}
        options={VIEW_OPTIONS}
        selectedValue={selectedViews}
        onSelect={setSelectedViews}
        label="Select Target Views"
        suffix="views"
      />

      <SmoothDropdown
        visible={showDurationDropdown}
        onClose={() => setShowDurationDropdown(false)}
        options={DURATION_OPTIONS}
        selectedValue={selectedDuration}
        onSelect={setSelectedDuration}
        label="Select Watch Duration"
        suffix="seconds"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  coinDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 143, 177, 0.2)',
    paddingHorizontal: isSmallScreen ? 10 : 12,
    paddingVertical: isSmallScreen ? 6 : 8,
    borderRadius: 20,
  },
  coinCount: {
    color: '#F48FB1',
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  statusCard: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 16,
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
    justifyContent: 'space-between',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  videoId: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  repromoteInfo: {
    fontSize: 12,
    color: '#9B59B6',
    marginTop: 8,
    fontStyle: 'italic',
  },
  pendingCard: {
    backgroundColor: '#FFF8E1',
    margin: 16,
    marginTop: 0,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F39C12',
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F57C00',
    marginLeft: 8,
  },
  timerContainer: {
    alignItems: 'center',
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F39C12',
    fontFamily: 'monospace',
  },
  timerSubtext: {
    fontSize: 12,
    color: '#F57C00',
    marginTop: 4,
  },
  metricsSection: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'white',
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
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  metricValue: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: 'bold',
    color: '#333',
  },
  actionSection: {
    margin: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  deleteButton: {
    backgroundColor: '#E74C3C',
  },
  repromoteButton: {
    backgroundColor: '#3498DB',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  actionContent: {
    marginLeft: 12,
    flex: 1,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  repromoteSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
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
  repromoteToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  repromoteLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  chevron: {
    transform: [{ rotate: '0deg' }],
  },
  chevronRotated: {
    transform: [{ rotate: '180deg' }],
  },
  repromoteOptions: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  optionGroup: {
    marginBottom: 16,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dropdownText: {
    fontSize: 14,
    color: '#333',
  },
  costDisplay: {
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  costText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3498DB',
  },
  // Modal Dropdown Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  fullScreenModal: {
    flex: 1,
    backgroundColor: '#FF4757',
    marginTop: Platform.OS === 'ios' ? 50 : 40,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalList: {
    flex: 1,
    backgroundColor: 'white',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  selectedDropdownItem: {
    backgroundColor: '#F0F8FF',
  },
  dropdownItemText: {
    fontSize: 18,
    color: '#333',
  },
  selectedDropdownItemText: {
    color: '#3498DB',
    fontWeight: '600',
  },
  },
});