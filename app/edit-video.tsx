import React, { useState, useEffect, useRef } from 'react';
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
  StatusBar,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useVideoStore } from '../store/videoStore';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Eye, Clock, Trash2, Play, Timer, ChevronDown, Check, MoveVertical as MoreVertical, CreditCard as Edit3 } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 480;
const isVerySmallScreen = screenWidth < 360;

interface VideoData {
  id?: string;
  video_id?: string;
  youtube_url?: string;
  title: string;
  views_count: number;
  target_views: number;
  coin_reward?: number;
  coin_cost: number;
  status: 'active' | 'paused' | 'completed' | 'on_hold' | 'repromoted';
  created_at: string;
  updated_at?: string;
  hold_until?: string;
  duration_seconds?: number;
  repromoted_at?: string;
  total_watch_time?: number;
  completion_rate?: number;
  completed?: boolean;
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
  colors: any;
}

const SmoothDropdown: React.FC<DropdownProps> = ({
  visible,
  onClose,
  options,
  selectedValue,
  onSelect,
  label,
  suffix,
  colors,
}) => {
  const handleSelect = (value: number) => {
    onSelect(value);
    onClose();
  };

  const handleBackdropPress = () => {
    onClose();
  };

  const renderItem = ({ item }: { item: number }) => (
    <Pressable
      style={[
        styles.dropdownItem,
        { borderBottomColor: colors.border },
        item === selectedValue && styles.selectedDropdownItem
      ]}
      onPress={() => handleSelect(item)}
      android_ripple={{ color: '#E3F2FD' }}
    >
      <Text style={[
        styles.dropdownItemText,
        { color: colors.text },
        item === selectedValue && styles.selectedDropdownItemText
      ]}>
        {item} {suffix}
      </Text>
      {item === selectedValue && (
        <Check color={colors.primary} size={16} />
      )}
    </Pressable>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={styles.modalOverlay}
        onPress={handleBackdropPress}
      >
        <Pressable 
          style={[styles.fullScreenModal, { backgroundColor: colors.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.modalHeader, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.modalTitle, { color: 'white' }]}>{label}</Text>
            <Pressable 
              onPress={onClose} 
              style={styles.closeButton}
              android_ripple={{ color: 'rgba(255,255,255,0.3)', borderless: true }}
            >
              <Text style={[styles.closeButtonText, { color: 'white' }]}>✕</Text>
            </Pressable>
          </View>
          <FlatList
            data={options}
            renderItem={renderItem}
            keyExtractor={(item) => item.toString()}
            style={styles.modalList}
            showsVerticalScrollIndicator={false}
            bounces={true}
            contentContainerStyle={styles.modalListContent}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default function EditVideoScreen() {
  const { user, refreshProfile } = useAuth();
  const { colors, isDark } = useTheme();
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
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Animation values
  const coinBounce = useSharedValue(1);

  // Format engagement duration from seconds to readable format
  const formatEngagementTime = (seconds: number): string => {
    if (!seconds || seconds === 0) return '0s';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  };

  useEffect(() => {
    if (params.videoId && user && user.id) {
      fetchVideoData();
    } else if (params.videoData) {
      try {
        const video = JSON.parse(params.videoData as string);
        setVideoData(video);
        
        // Calculate hold timer if video is on hold
        if (video.status === 'on_hold') {
          let holdUntilTime: Date;
          
          if (video.hold_until) {
            // Use the exact hold_until timestamp from database
            holdUntilTime = new Date(video.hold_until);
          } else {
            // Fallback: calculate exactly 10 minutes from creation
            holdUntilTime = new Date(video.created_at);
            holdUntilTime.setMinutes(holdUntilTime.getMinutes() + 10);
          }
          
          const remainingMs = holdUntilTime.getTime() - new Date().getTime();
          setHoldTimer(Math.max(0, Math.floor(remainingMs / 1000)));
        }
        
        setLoading(false);
        setupRealTimeUpdates(video);
      } catch (error) {
        console.error('Error parsing video data:', error);
        router.back();
      }
    }
  }, [params.videoData, params.videoId, user]);

  const fetchVideoData = async () => {
    if (!params.videoId || !user || !user.id) return;

    try {
      // Enhanced query to get engagement metrics with new schema
      const { data, error } = await supabase
        .from('videos')
        .select(`
          *,
          total_watch_time
        `)
        .eq('id', params.videoId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching video:', error);
        Alert.alert('Error', 'Failed to load video data');
        router.back();
        return;
      }

      if (!data) {
        Alert.alert('Error', 'Video not found');
        router.back();
        return;
      }

      // Calculate completion rate from current data
      const videoWithCompletion = {
        ...data,
        completion_rate: data.target_views > 0 
          ? Math.round((data.views_count / data.target_views) * 100)
          : 0
      };
      setVideoData(videoWithCompletion);
      
      // Calculate hold timer if video is on hold
      if (videoWithCompletion.status === 'on_hold') {
        let holdUntilTime: Date;
        
        if (videoWithCompletion.hold_until) {
          holdUntilTime = new Date(videoWithCompletion.hold_until);
        } else {
          holdUntilTime = new Date(videoWithCompletion.created_at);
          holdUntilTime.setMinutes(holdUntilTime.getMinutes() + 10);
        }
        
        const remainingMs = holdUntilTime.getTime() - new Date().getTime();
        setHoldTimer(Math.max(0, Math.floor(remainingMs / 1000)));
      }
      
      setupRealTimeUpdates(videoWithCompletion);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const setupRealTimeUpdates = (video: VideoData) => {
    const videoId = video.id || video.video_id;
    if (!video || !videoId) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(async () => {
      if (!video || !videoId) return;
      try {
        const { data: freshData, error: statusError } = await supabase
          .from('videos')
          .select(`
            *,
            total_watch_time
          `)
          .eq('id', videoId)
          .single();

        if (!statusError && freshData) {
          const updatedVideo = {
            ...freshData,
            completion_rate: freshData.target_views > 0 
              ? Math.round((freshData.views_count / freshData.target_views) * 100)
              : 0
          };
          
          // Debug logging for real-time updates
          console.log('🔄 Real-time update:', {
            coin_cost: freshData.coin_cost,
            coin_reward: freshData.coin_reward,
            views_count: freshData.views_count,
            status: freshData.status
          });
          setVideoData(prev => prev ? {
            ...prev,
            views_count: updatedVideo.views_count,
            status: updatedVideo.status,
            hold_until: updatedVideo.hold_until,
            updated_at: updatedVideo.updated_at,
            total_watch_time: updatedVideo.total_watch_time,
            completion_rate: updatedVideo.completion_rate,
            completed: updatedVideo.completed,
            coin_cost: updatedVideo.coin_cost,
            coin_reward: updatedVideo.coin_reward,
            target_views: updatedVideo.target_views,
            duration_seconds: updatedVideo.duration_seconds
          } : null);
                     if (updatedVideo.status === 'on_hold' && updatedVideo.hold_until) {
             const holdUntilTime = new Date(updatedVideo.hold_until);
             if (holdUntilTime.getTime() <= new Date().getTime()) {
               await supabase
                 .from('videos')
                 .update({ status: 'active', hold_until: null })
                 .eq('id', videoId);
             }
           } else if (updatedVideo.status === 'active') {
             setHoldTimer(0);
           }
        } else if (statusError && statusError.code === 'PGRST116') {
          // Video no longer exists, clear interval
          if (intervalRef.current) clearInterval(intervalRef.current);
        } else {
          console.error('Error in real-time update:', statusError);
        }
      } catch (error) {
        console.error('Error refreshing video data:', error);
      }
    }, 2000);
  };

  // Update hold timer every second
  useEffect(() => {
    if (holdTimer > 0) {
      const interval = setInterval(() => {
        setHoldTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            // Handle timer completion
            setTimeout(() => {
              // Refresh the video data to get updated status
              if (videoData) {
                console.log('📊 Hold period completed for video:', videoData.youtube_url);
                // Refresh video data
                setVideoData(prev => prev ? { ...prev, status: 'active' } : null);
              }
            }, 100);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [holdTimer, videoData]);

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
    
    // Debug logging
    console.log('🔍 Debug Refund Info:', {
      videoData: videoData,
      coin_cost: videoData?.coin_cost,
      minutesSinceCreation,
      refundPercentage
    });
    
    const refundAmount = Math.floor((videoData?.coin_cost || 0) * refundPercentage / 100);
    
    return { refundPercentage, refundAmount, isWithin10Minutes };
  };

  const handleDeleteVideo = async () => {
    if (!videoData || !user || !user.id) return;

    const minutesSinceCreation = getMinutesSinceCreation();
    const refundPercentage = minutesSinceCreation <= 10 ? 100 : 80;
    const refundAmount = Math.floor(videoData.coin_cost * (refundPercentage / 100));
    
    const message = `Deleting now refunds ${refundPercentage}% coins (🪙${refundAmount}). This action cannot be undone. Confirm?`;

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
                             // Debug logging
               console.log('🗑️ Attempting to delete video:', {
                 videoId: videoData.id || videoData.video_id,
                 userId: user.id,
                 videoData: videoData
               });
               
               // Use the new delete function with proper refund handling
               const { data: deleteResult, error: deleteError } = await supabase
                 .rpc('delete_video_with_refund', {
                   video_uuid: videoData.id || videoData.video_id,
                   user_uuid: user.id
                 });

              console.log('🗑️ Delete result:', { deleteResult, deleteError });

              if (deleteError) {
                throw new Error(deleteError.message);
              }

              if (!deleteResult?.success) {
                throw new Error(deleteResult?.error || 'Failed to delete video');
              }

              // Refresh profile and clear queue
              await refreshProfile();
              clearQueue();

              // Animate coin update
              coinBounce.value = withSequence(
                withSpring(1.3, { damping: 15, stiffness: 150 }),
                withSpring(1, { damping: 15, stiffness: 150 })
              );

              Alert.alert(
                'Success', 
                deleteResult.message || `Video deleted and 🪙${deleteResult.refund_amount} coins refunded! New balance: 🪙${deleteResult.new_balance}`, 
                [
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

  // Force analytics refresh when navigating back
  const handleNavigateBack = () => {
    // Clear any cached data
    clearQueue();
    router.back();
  };

  const calculateCoinCost = (views: number, duration: number) => {
    // Updated cost calculation to match promote tab logic
    return Math.ceil((views * duration) / 50 * 8);
  };

  const calculateCoinReward = (duration: number) => {
    // Use the same reward calculation logic as promote tab
    if (duration >= 540) return 200;
    if (duration >= 480) return 150;
    if (duration >= 420) return 130;
    if (duration >= 360) return 100;
    if (duration >= 300) return 90;
    if (duration >= 240) return 70;
    if (duration >= 180) return 55;
    if (duration >= 150) return 50;
    if (duration >= 120) return 45;
    if (duration >= 90) return 35;
    if (duration >= 60) return 25;
    if (duration >= 45) return 15;
    if (duration >= 30) return 10;
    return 5;
  };

  const handleRepromoteVideo = async () => {
    if (!videoData || !user || !user.id || repromoting) return;

    // Check if video has completed its criteria before allowing repromote
    if (videoData.status === 'active' && videoData.views_count < videoData.target_views) {
      Alert.alert(
        'Cannot Repromote',
        'This video is still active and hasn\'t reached its target views yet. Please wait for it to complete or pause it first.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (videoData.status === 'on_hold') {
      Alert.alert(
        'Cannot Repromote',
        'This video is currently on hold. Please wait for the hold period to complete.',
        [{ text: 'OK' }]
      );
      return;
    }
    setRepromoting(true);
    
    try {
      const coinCost = calculateCoinCost(selectedViews, selectedDuration);
      const coinReward = calculateCoinReward(selectedDuration);
      
             // Use the repromote function from the current schema
       const result = await supabase.rpc('repromote_video', {
         video_uuid: videoData.id || videoData.video_id,
         user_uuid: user.id,
         additional_coin_cost: coinCost
       });

      if (result.error) {
        throw new Error(result.error.message);
      }

      if (!result.data?.success) {
        Alert.alert('Insufficient Coins', result.data?.error || `You need 🪙${coinCost} coins to repromote this video.`);
        setRepromoting(false);
        return;
      }

      // Refresh profile and clear queue
      await refreshProfile();
      clearQueue();

      Alert.alert(
        'Success',
        `Video repromoted successfully! It's now active in the queue with ${selectedViews} target views and ${coinReward} coin reward per view. New balance: 🪙${result.data.new_user_balance}`,
        [{ text: 'OK', onPress: handleNavigateBack }]
      );
    } catch (error) {
      console.error('Error repromoting video:', error);
      Alert.alert('Error', 'Failed to repromote video. Please try again.');
    } finally {
      setRepromoting(false);
    }
  };

  // Check if video can be repromoted
  const canRepromote = () => {
    if (!videoData) return false;
    
    // Allow repromote only for completed, paused, or repromoted videos
    return ['completed', 'paused', 'repromoted'].includes(videoData.status);
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

  if (loading || !videoData) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading video details...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: '#800080' }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={handleNavigateBack}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: 'white' }]}>Edit Video</Text>
          <Edit3 size={24} color="white" />
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Video Status */}
        <View style={[styles.statusCard, { backgroundColor: colors.surface }]}>
          <View style={styles.statusHeader}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(videoData.status) }]}>
              <Text style={[styles.statusText, { color: 'white' }]}>{getStatusText(videoData.status)}</Text>
            </View>
            <Text style={[styles.videoId, { color: colors.textSecondary }]} numberOfLines={1}>ID: {videoData.title}</Text>
          </View>
        </View>

        {/* Pending Status Timeline */}
        {videoData.status === 'on_hold' && holdTimer > 0 && (
          <View style={[styles.pendingCard, { backgroundColor: colors.warning + '20' }]}>
            <View style={styles.pendingHeader}>
              <Timer color="#F39C12" size={24} />
              <Text style={[styles.pendingTitle, { color: colors.warning }]}>Pending Status</Text>
            </View>
            <View style={styles.timerContainer}>
              <Text style={[styles.timerText, { color: colors.warning }]}>{formatHoldTimer(holdTimer)} remaining</Text>
              <Text style={[styles.timerSubtext, { color: colors.warning }]}>Video will enter queue after hold period</Text>
            </View>
          </View>
        )}

        {/* Main Metrics */}
        <View style={styles.metricsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Video Metrics</Text>
          
          <View style={styles.metricsGrid}>
            {/* Total Views */}
            <View style={[styles.metricCard, { backgroundColor: colors.surface }]}>
              <View style={styles.metricHeaderCentered}>
                <Eye color="#3498DB" size={isSmallScreen ? 22 : 28} />
                <Text style={[styles.metricLabelResponsive, { color: colors.text }]}>Total Views</Text>
              </View>
              <Text style={[styles.metricValueResponsive, { color: colors.text }]}>
                {videoData.views_count}/{videoData.target_views}
              </Text>
            </View>

            {/* Received Watch Time */}
            <View style={[styles.metricCard, { backgroundColor: colors.surface }]}>
              <View style={styles.metricHeaderCentered}>
                <Clock color="#F39C12" size={isSmallScreen ? 22 : 28} />
                <Text style={[styles.metricLabelResponsive, { color: colors.text }]}>Received Watch Time</Text>
              </View>
              <Text style={[styles.metricValueResponsive, { color: colors.text }]}>
                {formatEngagementTime(videoData.total_watch_time || 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Actions</Text>

          {/* Delete Button */}
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton, { backgroundColor: colors.error }]} 
            onPress={handleDeleteVideo}
          >
            <Trash2 color="white" size={20} />
            <View style={styles.actionContent}>
              <Text style={[styles.actionButtonText, { color: 'white' }]}>Delete Video</Text>
              <Text style={[styles.actionSubtext, { color: 'rgba(255, 255, 255, 0.8)' }]}>
                Refund: 🪙{getRefundInfo().refundAmount} ({getRefundInfo().refundPercentage}%)
              </Text>
            </View>
          </TouchableOpacity>

          {/* Repromote Section */}
          <View style={[styles.repromoteSection, { backgroundColor: colors.surface }]}>
            <Pressable 
              style={styles.repromoteToggle}
              onPress={() => setShowRepromoteOptions(!showRepromoteOptions)}
              android_ripple={{ color: '#F5F5F5' }}
            >
              <Text style={[styles.repromoteLabel, { color: colors.text }]}>Repromote Video</Text>
              <ChevronDown 
                color={colors.text} 
                size={20} 
                style={[
                  styles.chevron,
                  showRepromoteOptions && styles.chevronRotated
                ]}
              />
            </Pressable>
            
            {showRepromoteOptions && (
              <View style={styles.repromoteOptions}>
                {!canRepromote() && (
                  <View style={[styles.repromoteDisabledNotice, { backgroundColor: colors.warning + '20' }]}>
                    <Text style={[styles.disabledNoticeText, { color: colors.warning }]}>
                      Repromote is only available for completed, paused, or previously repromoted videos.
                    </Text>
                  </View>
                )}
                
                {/* Views Selection */}
                <View style={styles.optionGroup}>
                  <Text style={[styles.optionLabel, { color: colors.text }]}>Target Views</Text>
                  <Pressable 
                    style={[
                      styles.dropdown,
                      { backgroundColor: colors.inputBackground, borderColor: colors.border },
                      !canRepromote() && styles.dropdownDisabled
                    ]}
                    onPress={() => setShowViewsDropdown(true)}
                    disabled={!canRepromote()}
                    android_ripple={{ color: '#F0F0F0' }}
                  >
                    <Text style={[
                      styles.dropdownText,
                      { color: colors.text },
                      !canRepromote() && styles.dropdownTextDisabled
                    ]}>
                      {selectedViews} views
                    </Text>
                    <ChevronDown 
                      color={canRepromote() ? colors.textSecondary : colors.border} 
                      size={16} 
                    />
                  </Pressable>
                </View>

                {/* Duration Selection */}
                <View style={styles.optionGroup}>
                  <Text style={[styles.optionLabel, { color: colors.text }]}>Watch Duration</Text>
                  <Pressable 
                    style={[
                      styles.dropdown,
                      { backgroundColor: colors.inputBackground, borderColor: colors.border },
                      !canRepromote() && styles.dropdownDisabled
                    ]}
                    onPress={() => setShowDurationDropdown(true)}
                    disabled={!canRepromote()}
                    android_ripple={{ color: '#F0F0F0' }}
                  >
                    <Text style={[
                      styles.dropdownText,
                      { color: colors.text },
                      !canRepromote() && styles.dropdownTextDisabled
                    ]}>
                      {selectedDuration} seconds
                    </Text>
                    <ChevronDown 
                      color={canRepromote() ? colors.textSecondary : colors.border} 
                      size={16} 
                    />
                  </Pressable>
                </View>

                {/* Cost Display */}
                <View style={[styles.costDisplay, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.costText, { color: colors.primary }]}>
                    Cost: 🪙{calculateCoinCost(selectedViews, selectedDuration)} | Reward: 🪙{calculateCoinReward(selectedDuration)} per view
                  </Text>
                </View>

                {/* Repromote Button */}
                <Pressable 
                  style={[
                    styles.actionButton, 
                    styles.repromoteButton,
                    { backgroundColor: colors.primary },
                    (repromoting || !canRepromote()) && styles.buttonDisabled
                  ]} 
                  onPress={handleRepromoteVideo}
                  disabled={repromoting || !canRepromote()}
                  android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  <Play color="white" size={20} />
                  <View style={styles.actionContent}>
                    <Text style={[styles.actionButtonText, { color: 'white' }]}>
                      {repromoting ? 'Repromoting...' : 'Repromote Now'}
                    </Text>
                    <Text style={[styles.actionSubtext, { color: 'rgba(255, 255, 255, 0.8)' }]}>
                      {canRepromote() ? 'Instantly active in queue' : 'Not available for this video'}
                    </Text>
                  </View>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Dropdowns */}
      <SmoothDropdown
        visible={showViewsDropdown}
        onClose={() => setShowViewsDropdown(false)}
        options={VIEW_OPTIONS}
        selectedValue={selectedViews}
        onSelect={setSelectedViews}
        label="Select Target Views"
        suffix="views"
        colors={colors}
      />

      <SmoothDropdown
        visible={showDurationDropdown}
        onClose={() => setShowDurationDropdown(false)}
        options={DURATION_OPTIONS}
        selectedValue={selectedDuration}
        onSelect={setSelectedDuration}
        label="Select Duration (seconds)"
        suffix="seconds"
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  statusCard: {
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
  },
  videoId: {
    fontSize: 12,
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  pendingCard: {
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
    marginLeft: 8,
  },
  timerContainer: {
    alignItems: 'center',
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  timerSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  metricsSection: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
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
    marginLeft: 8,
  },
  metricValue: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: 'bold',
  },
  metricValueCentered: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  engagementLabel: {
    fontSize: 12,
    marginTop: 4,
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
  },
  repromoteButton: {
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
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionSubtext: {
    fontSize: 12,
  },
  repromoteSection: {
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
  },
  optionGroup: {
    marginBottom: 16,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
  },
  dropdownText: {
    fontSize: 14,
  },
  costDisplay: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  costText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal styles for smooth dropdown
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: isVerySmallScreen ? 10 : 20,
  },
  fullScreenModal: {
    borderRadius: 20,
    maxHeight: isSmallScreen ? '80%' : '70%',
    minHeight: isSmallScreen ? '50%' : '40%',
    width: '100%',
    maxWidth: isVerySmallScreen ? screenWidth - 20 : 400,
    ...Platform.select({
      android: {
        elevation: 10,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      web: {
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isVerySmallScreen ? 15 : 20,
    paddingVertical: isVerySmallScreen ? 12 : 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: isVerySmallScreen ? 16 : 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  closeButton: {
    padding: isVerySmallScreen ? 6 : 8,
    borderRadius: 20,
    minWidth: 32,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: isVerySmallScreen ? 18 : 20,
    fontWeight: 'bold',
  },
  modalList: {
    flex: 1,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  modalListContent: {
    paddingBottom: 20,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isVerySmallScreen ? 15 : 20,
    paddingVertical: isVerySmallScreen ? 12 : 16,
    borderBottomWidth: 1,
    minHeight: isVerySmallScreen ? 48 : 56,
  },
  selectedDropdownItem: {
    backgroundColor: 'rgba(157, 78, 221, 0.1)',
  },
  dropdownItemText: {
    fontSize: isVerySmallScreen ? 14 : 16,
    flex: 1,
  },
  selectedDropdownItemText: {
    color: '#9D4EDD',
    fontWeight: '600',
  },
  repromoteDisabledNotice: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  disabledNoticeText: {
    fontSize: isVerySmallScreen ? 12 : 13,
    lineHeight: 18,
  },
  dropdownDisabled: {
    opacity: 0.6,
  },
  dropdownTextDisabled: {
  },
  disabledText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  chevronDisabled: {
    opacity: 0.5,
  },
  metricHeaderCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  metricLabelResponsive: {
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
    marginLeft: 8,
    textAlign: 'center',
  },
  metricValueResponsive: {
    fontSize: isSmallScreen ? 22 : 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 2,
    letterSpacing: 0.5,
  },
});