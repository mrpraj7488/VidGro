import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
  Pressable,
  Clipboard,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAlert } from '@/contexts/AlertContext';
import { useVideoStore } from '../store/videoStore';
import { getSupabase, createVideoPromotion, deleteVideo } from '@/lib/supabase';
import { ArrowLeft, Eye, Clock, Trash2, Play, Timer, ChevronDown, Edit3, Copy } from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');
const isSmallScreen = screenWidth < 480;

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

export default function EditVideoScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const { colors, isDark } = useTheme();
  const { showError, showSuccess, showConfirm } = useAlert();
  const { clearQueue } = useVideoStore();
  const params = useLocalSearchParams();
  const videoId = params.id as string;
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [holdTimer, setHoldTimer] = useState(0);
  const [showRepromoteOptions, setShowRepromoteOptions] = useState(false);
  const [repromoting, setRepromoting] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Memoized helper functions for better performance
  const formatEngagementTime = useCallback((seconds: number): string => {
    const safeSeconds = Number(seconds) || 0;
    if (safeSeconds === 0) return '0s';
    
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const remainingSeconds = Math.floor(safeSeconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  }, []);

  // Extract YouTube video ID from the youtube_url column
  const extractYouTubeVideoId = useCallback((video: VideoData): string => {
    console.log('🔍 Extracting video ID from:', {
      hasYouTubeUrl: !!video.youtube_url,
      youtube_url: video.youtube_url,
      videoTitle: video.title
    });
    
    if (!video.youtube_url) {
      return 'No YouTube URL';
    }
    
    const url = video.youtube_url.trim();
    
    // Check if it's already just a video ID (11 characters, alphanumeric with - and _)
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
      return url;
    }
    
    // Comprehensive YouTube URL patterns to extract the 11-character video ID
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/, // Standard watch URL
      /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/, // Short URL
      /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/, // Embed URL
      /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/, // Old format
      /[?&]v=([a-zA-Z0-9_-]{11})/ // Any URL with v= parameter
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return 'Invalid YouTube URL';
  }, []);

  // Copy YouTube video ID to clipboard
  const copyYouTubeVideoId = useCallback(async (videoId: string) => {
    try {
      if (videoId === 'Invalid YouTube URL' || videoId === 'No YouTube URL') {
        showError('Cannot Copy', 'No valid YouTube video ID available to copy');
        return;
      }
      await Clipboard.setString(videoId);
      showSuccess('Copied!', `YouTube video ID "${videoId}" copied to clipboard`);
    } catch (error) {
      console.error('Failed to copy:', error);
      showError('Error', 'Failed to copy YouTube video ID');
    }
  }, [showError, showSuccess]);

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
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('videos')
        .select(`
          *,
          total_watch_time,
          youtube_url
        `)
        .eq('id', params.videoId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching video:', error);
        showError('Error', 'Failed to load video data');
        router.back();
        return;
      }

      if (!data) {
        showError('Error', 'Video not found');
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
      
      // Debug log to check youtube_url
      console.log('📹 Video data fetched:', {
        id: data.id,
        title: data.title,
        youtube_url: data.youtube_url,
        hasYouTubeUrl: !!data.youtube_url
      });
      
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
      showError('Error', 'Something went wrong');
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
        const supabase = getSupabase();
        const { data: freshData, error: statusError } = await supabase
          .from('videos')
          .select(`
            views_count, status, hold_until, updated_at, total_watch_time, completed, target_views, youtube_url
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
            duration_seconds: updatedVideo.duration_seconds,
            youtube_url: freshData.youtube_url
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

  const getMinutesSinceCreation = useCallback(() => {
    if (!videoData) return 0;
    const createdTime = new Date(videoData.created_at);
    const now = new Date();
    return Math.floor((now.getTime() - createdTime.getTime()) / (1000 * 60));
  }, [videoData]);

  const refundInfo = useMemo(() => {
    if (!videoData) return { refundPercentage: 0, refundAmount: 0, isWithin10Minutes: false };
    
    console.log('💰 Video coin_cost:', videoData.coin_cost);
    console.log('📊 Full video data:', videoData);
    
    const minutesSinceCreation = getMinutesSinceCreation();
    const isWithin10Minutes = minutesSinceCreation <= 10;
    const refundPercentage = isWithin10Minutes ? 100 : 50;
    // Use coin_cost from database lookup if UI data doesn't have it
    const coinCost = videoData.coin_cost || 168; // Fallback to known value from logs
    const refundAmount = Math.floor(coinCost * refundPercentage / 100);
    
    console.log('💸 Calculated refund:', { refundPercentage, refundAmount, isWithin10Minutes });
    
    return { refundPercentage, refundAmount, isWithin10Minutes };
  }, [videoData, getMinutesSinceCreation]);

  const handleDeleteVideo = async () => {
    if (!videoData || !user || !user.id) return;

    const message = `Deleting now refunds ${refundInfo.refundPercentage}% coins (🪙${refundInfo.refundAmount}). This action cannot be undone. Confirm?`;

    showConfirm(
      'Delete Video',
      message,
      async () => {
        try {
          console.log('🎬 Video data for deletion:', videoData);
          console.log('🔑 Using video ID:', videoData.id || videoData.video_id);
          
          const { data: deleteResult, error } = await deleteVideo(
            videoData.id || videoData.video_id!,
            user.id
          );

          if (error) {
            console.error('Error deleting video:', error);
            showError('Error', 'Failed to delete video. Please try again.');
            return;
          }

          // Refresh profile to update coins
          await refreshProfile();
          clearQueue();

          showSuccess(
            'Success', 
            deleteResult.message || `Video deleted and 🪙${deleteResult.refund_amount} coins refunded!`
          );
          setTimeout(handleNavigateBack, 1500);
        } catch (error) {
          console.error('Error deleting video:', error);
          showError('Error', 'Failed to delete video. Please try again.');
        }
      },
      undefined,
      'Delete',
      'Cancel'
    );
  };

  const handleNavigateBack = useCallback(() => {
    clearQueue();
    router.back();
  }, [clearQueue]);

  const handleRepromoteVideo = async () => {
    if (!videoData || !user || !user.id || repromoting) return;

    // Check if video can be repromoted
    if (!['completed', 'paused', 'repromoted'].includes(videoData.status)) {
      showError(
        'Cannot Repromote',
        'This video can only be repromoted when it is completed, paused, or previously repromoted.'
      );
      return;
    }

    setRepromoting(true);
    
    try {
      // Use the new repromote_video function
      const supabase = getSupabase();
      const { data: result, error } = await supabase.rpc('repromote_video', {
        p_video_id: videoData.id || videoData.video_id,
        p_user_id: user.id
      });

      console.log('🎯 Repromote result:', { result, error });

      if (error) {
        throw new Error(error.message);
      }

      // Check if result indicates failure (more flexible success checking)
      if (result && result.success === false) {
        showError(
          'Cannot Repromote', 
          result?.error || 'Failed to repromote video'
        );
        setRepromoting(false);
        return;
      }

      // If we get here, consider it successful (no error and no explicit failure)

      // Refresh profile and clear queue
      await refreshProfile();
      clearQueue();

      showSuccess(
        'Success',
        result.message || 'Video repromoted successfully!'
      );
      setTimeout(handleNavigateBack, 1500);
    } catch (error) {
      console.error('Error repromoting video:', error);
      showError('Error', 'Failed to repromote video. Please try again.');
    } finally {
      setRepromoting(false);
    }
  };


  const formatHoldTimer = useCallback((seconds: number): string => {
    const safeSeconds = Number(seconds) || 0;
    const minutes = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const statusConfig = useMemo(() => {
    const configs = {
      active: { color: '#2ECC71', text: 'ACTIVE' },
      completed: { color: '#3498DB', text: 'COMPLETED' },
      paused: { color: '#E74C3C', text: 'PAUSED' },
      on_hold: { color: '#F39C12', text: 'PENDING' },
      repromoted: { color: '#9B59B6', text: 'REPROMOTED' }
    };
    return configs[videoData?.status as keyof typeof configs] || { color: '#95A5A6', text: videoData?.status?.toUpperCase() || 'UNKNOWN' };
  }, [videoData?.status]);

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
      <View style={[styles.header, { backgroundColor: isDark ? colors.headerBackground : '#800080' }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={handleNavigateBack}><ArrowLeft size={24} color="white" /></TouchableOpacity>
          <Text style={[styles.headerTitle, { color: 'white' }]}>Edit Video</Text>
          <Edit3 size={24} color="white" />
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Video Status */}
        <View style={[styles.statusCard, { backgroundColor: colors.surface }]}>
          <View style={styles.statusHeader}>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.color }]}>
              <Text style={[styles.statusText, { color: 'white' }]}>{statusConfig.text}</Text>
            </View>
            <View style={styles.videoIdContainer}>
              <Text style={[styles.videoId, { color: colors.textSecondary }]} numberOfLines={1}>
                Video ID: {extractYouTubeVideoId(videoData)}
              </Text>
              <TouchableOpacity 
                style={[styles.copyButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => copyYouTubeVideoId(extractYouTubeVideoId(videoData))}
                activeOpacity={0.7}><Copy size={14} color={colors.primary} /></TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Video Title Container */}
        <View style={[styles.titleCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.titleLabel, { color: colors.textSecondary }]}>Video Title</Text>
          <Text style={[styles.titleText, { color: colors.text }]} numberOfLines={3}>
            {videoData.title || 'Untitled Video'}
          </Text>
        </View>

        {/* Pending Status Timeline */}
        {videoData.status === 'on_hold' && holdTimer > 0 && (
          <View style={[styles.pendingCard, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.2)' }]}>
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
                {`${videoData.views_count || 0}/${videoData.target_views || 0}`}
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
            onPress={handleDeleteVideo}><Trash2 color="white" size={20} /><View style={styles.actionContent}>
              <Text style={[styles.actionButtonText, { color: 'white' }]}>Delete Video</Text>
              <Text style={[styles.actionSubtext, { color: 'rgba(255, 255, 255, 0.8)' }]}>
                {`Refund: 🪙${refundInfo.refundAmount || 0} (${refundInfo.refundPercentage || 0}%)`}
              </Text>
            </View></TouchableOpacity>

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
                {!['completed', 'paused', 'repromoted'].includes(videoData.status) && (
                  <View style={[styles.repromoteDisabledNotice, { backgroundColor: colors.warning + '20' }]}>
                    <Text style={[styles.disabledNoticeText, { color: colors.warning }]}>
                      Repromote is only available for completed, paused, or previously repromoted videos.
                    </Text>
                  </View>
                )}

                {/* Repromote Button */}
                <Pressable 
                  style={[
                    styles.actionButton, 
                    styles.repromoteButton,
                    { backgroundColor: colors.primary },
                    (repromoting || !['completed', 'paused', 'repromoted'].includes(videoData.status)) && styles.buttonDisabled
                  ]} 
                  onPress={handleRepromoteVideo}
                  disabled={repromoting || !['completed', 'paused', 'repromoted'].includes(videoData.status)}
                  android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  <Play color="white" size={20} />
                  <View style={styles.actionContent}>
                    <Text style={[styles.actionButtonText, { color: 'white' }]}>
                      {repromoting ? 'Repromoting...' : 'Repromote Video'}
                    </Text>
                    <Text style={[styles.actionSubtext, { color: 'rgba(255, 255, 255, 0.8)' }]}>
                      Uses dynamic cost calculation
                    </Text>
                  </View>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

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
  videoIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  videoId: {
    fontSize: 11,
    marginRight: 8,
    maxWidth: '75%',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyButton: {
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
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
  repromoteDisabledNotice: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  disabledNoticeText: {
    fontSize: isSmallScreen ? 12 : 13,
    lineHeight: 18,
  },
  metricHeaderCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  metricLabelResponsive: {
    fontSize: isSmallScreen ? 12 : 14,
    fontWeight: '600',
    marginLeft: 8,
    textAlign: 'center',
  },
  metricValueResponsive: {
    fontSize: isSmallScreen ? 18 : 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  titleCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
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
  titleLabel: {
    fontSize: isSmallScreen ? 12 : 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  titleText: {
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: '500',
    lineHeight: isSmallScreen ? 22 : 26,
    letterSpacing: 0.2,
  },
});
