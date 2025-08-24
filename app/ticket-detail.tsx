import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Alert,
  Animated
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Send, Paperclip, X, ArrowLeft, Shield, User as UserIcon, FileText, Image as ImageIcon, Download, Check, RefreshCw, CircleAlert as AlertCircle, Clock, MessageSquare, CircleCheck as CheckCircle, Circle as XCircle } from 'lucide-react-native';
import { getSupabase } from '@/lib/supabase';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import CustomAlert from '@/components/CustomAlert';
import * as DocumentPicker from 'expo-document-picker';
import FileUploadService from '@/services/FileUploadService';
import * as Haptics from 'expo-haptics';
import ReanimatedAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');
const isTinyScreen = screenWidth < 350;
const isSmallScreen = screenWidth < 380;
const isTablet = screenWidth >= 768;

const AnimatedTouchableOpacity = ReanimatedAnimated.createAnimatedComponent(TouchableOpacity);

export default function TicketDetailScreen() {
  const { profile, user } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const supabase = getSupabase();
  const { showError, showSuccess, showInfo, alertProps, showAlert } = useCustomAlert();
  const scrollViewRef = useRef(null);

  // State
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [realtimeSubscription, setRealtimeSubscription] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Animation values for interactive elements
  const sendButtonScale = useSharedValue(1);
  const attachButtonScale = useSharedValue(1);
  const refreshButtonScale = useSharedValue(1);
  const downloadButtonScale = useSharedValue(1);

  // Load ticket data
  useEffect(() => {
    if (params.id) {
      loadTicketData();
      setupRealtimeSubscription();
      
      // Animate on mount
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }

    return () => {
      if (realtimeSubscription) {
        supabase.removeChannel(realtimeSubscription);
      }
    };
  }, [params.id]);

  const setupRealtimeSubscription = () => {
    if (!params.id || !user?.id) return;

    const subscription = supabase
      .channel(`ticket_${params.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_tickets',
          filter: `id=eq.${params.id}`
        },
        (payload) => {
          console.log('Ticket updated:', payload);
          loadTicketData();
        }
      )
      .subscribe();

    setRealtimeSubscription(subscription);
  };

  const loadTicketData = async () => {
    if (!params.id) return;

    setLoading(true);
    try {
      // Load ticket
      const { data: ticketData, error: ticketError } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', params.id)
        .single();

      if (ticketError) throw ticketError;
      setTicket(ticketData);

      // Load conversation
      const { data: conversationData, error: conversationError } = await supabase
        .rpc('get_ticket_conversation', { p_ticket_id: params.id });

      if (conversationError) throw conversationError;
      
      // Format messages
      const formattedMessages = conversationData || [];
      
      // Add initial message
      if (ticketData) {
        formattedMessages.unshift({
          id: 'initial',
          user_id: ticketData.reported_by,
          message: ticketData.description,
          is_admin: false,
          created_at: ticketData.created_at,
          attachments: ticketData.attachments || []
        });
      }

      setMessages(formattedMessages);
      
      // Mark as read
      if (ticketData && !ticketData.is_read) {
        await supabase
          .from('support_tickets')
          .update({ is_read: true })
          .eq('id', params.id);
      }

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);

    } catch (error) {
      console.error('Error loading ticket:', error);
      showError('Error', 'Failed to load ticket details');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    refreshButtonScale.value = withSequence(
      withSpring(0.9, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 400 })
    );

    setRefreshing(true);
    await loadTicketData();
    setRefreshing(false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && attachments.length === 0) return;
    if (!user?.id || !params.id) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    sendButtonScale.value = withSequence(
      withSpring(0.9, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 400 })
    );

    setSending(true);
    try {
      // Upload attachments if any
      let attachmentData = [];
      if (attachments.length > 0) {
        try {
          // Ensure storage bucket exists
          await FileUploadService.ensureBucketExists();
          
          // Upload files to ticket folder
          const uploadedFiles = await FileUploadService.uploadMultipleFiles(
            attachments,
            params.id as string,
            user.id
          );
          
          // Format attachment data with URLs
          attachmentData = uploadedFiles.map(file => ({
            name: file.name,
            size: file.size,
            type: file.type,
            url: file.url,
            path: file.path,
            uploaded_at: new Date().toISOString()
          }));
        } catch (uploadError) {
          console.error('File upload error:', uploadError);
          showError('Upload Failed', 'Failed to upload attachments. Please try again.');
          setSending(false);
          return;
        }
      }

      // Add message
      const { data, error } = await supabase.rpc('add_ticket_message', {
        p_ticket_id: params.id,
        p_user_id: user.id,
        p_message: newMessage.trim(),
        p_is_admin: false,
        p_attachments: attachmentData
      });

      if (error) throw error;

      // Clear input
      setNewMessage('');
      setAttachments([]);

      // Reload conversation
      await loadTicketData();

      showSuccess('Message Sent', 'Your message has been sent successfully');

    } catch (error) {
      console.error('Error sending message:', error);
      showError('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handlePickDocument = async () => {
    if (attachments.length >= 3) {
      showError('Limit Reached', 'You can only attach up to 3 files per message');
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    attachButtonScale.value = withSequence(
      withSpring(0.9, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 400 })
    );

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf', 'text/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        
        // Check file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          showError('File Too Large', 'File size must be less than 5MB');
          return;
        }

        setAttachments([...attachments, {
          name: file.name,
          size: file.size,
          uri: file.uri,
          mimeType: file.mimeType || 'application/octet-stream'
        }]);
      }
    } catch (error) {
      console.error('Document picker error:', error);
    }
  };

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getStatusIcon = (status) => {
    const iconSize = isTinyScreen ? 16 : isSmallScreen ? 18 : 20;
    switch(status) {
      case 'active': return <AlertCircle size={iconSize} color="#3498DB" />;
      case 'pending': return <Clock size={iconSize} color="#F39C12" />;
      case 'answered': return <MessageSquare size={iconSize} color="#800080" />;
      case 'completed': return <CheckCircle size={iconSize} color="#27AE60" />;
      case 'closed': return <XCircle size={iconSize} color="#95A5A6" />;
      default: return <AlertCircle size={iconSize} color="#95A5A6" />;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return '#3498DB';
      case 'pending': return '#F39C12';
      case 'answered': return '#800080';
      case 'completed': return '#27AE60';
      case 'closed': return '#95A5A6';
      default: return '#95A5A6';
    }
  };

  const handleDownloadAttachment = async (attachment) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    downloadButtonScale.value = withSequence(
      withSpring(0.9, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 400 })
    );

    if (attachment.url) {
      const downloadUrl = await FileUploadService.getDownloadUrl(attachment.path);
      if (downloadUrl) {
        showInfo('Opening File', `Opening ${attachment.name}...`);
      }
    }
  };

  const renderMessage = ({ item, index }) => {
    const isAdmin = item.is_admin;
    const isCurrentUser = !isAdmin;
    const messageTime = new Date(item.created_at);
    const timeString = messageTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'You';

    const downloadAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: downloadButtonScale.value }],
    }));

    return (
      <Animated.View 
        style={[
          styles.messageWrapper,
          isCurrentUser ? styles.userMessageWrapper : styles.adminMessageWrapper,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        {/* Avatar for admin messages - LEFT SIDE */}
        {isAdmin && (
          <View style={[
            styles.avatar, 
            { 
              backgroundColor: isDark ? colors.primary : '#075E54',
              width: isTinyScreen ? 28 : isSmallScreen ? 32 : 36,
              height: isTinyScreen ? 28 : isSmallScreen ? 32 : 36,
              borderRadius: isTinyScreen ? 14 : isSmallScreen ? 16 : 18,
              marginRight: isTinyScreen ? 6 : 8
            }
          ]}>
            <Shield size={isTinyScreen ? 12 : isSmallScreen ? 14 : 16} color="white" />
          </View>
        )}
        
        <View style={[styles.messageContent, { maxWidth: isTablet ? '60%' : '75%' }]}>
          {/* Sender name label */}
          <Text style={[
            styles.senderLabel,
            {
              fontSize: isTinyScreen ? 10 : isSmallScreen ? 11 : 12,
              color: isAdmin ? (isDark ? colors.primary : '#075E54') : (isDark ? colors.accent : '#128C7E'),
              marginBottom: isTinyScreen ? 2 : 4,
              marginLeft: isAdmin ? (isTinyScreen ? 8 : 12) : 0,
              marginRight: isCurrentUser ? (isTinyScreen ? 8 : 12) : 0,
              textAlign: isCurrentUser ? 'right' : 'left'
            }
          ]}>
            {isAdmin ? 'Support Team' : userName}
          </Text>
          
          {/* Message bubble with gradient */}
          <LinearGradient
            colors={
              isCurrentUser 
                ? isDark 
                  ? ['rgba(74, 144, 226, 0.15)', 'rgba(74, 144, 226, 0.08)']
                  : ['rgba(128, 0, 128, 0.12)', 'rgba(128, 0, 128, 0.06)']
                : isDark
                  ? ['rgba(45, 55, 72, 0.8)', 'rgba(45, 55, 72, 0.6)']
                  : ['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']
            }
            style={[
              styles.messageBubble,
              isCurrentUser ? styles.userBubble : styles.adminBubble,
              { 
                maxWidth: isTablet ? screenWidth * 0.6 : screenWidth * 0.75,
                borderWidth: 1,
                borderColor: isDark ? colors.border : 'rgba(0, 0, 0, 0.08)',
                paddingHorizontal: isTinyScreen ? 10 : isSmallScreen ? 12 : 14,
                paddingVertical: isTinyScreen ? 8 : isSmallScreen ? 10 : 12
              }
            ]}
          >
            {/* Message text */}
            <Text style={[
              styles.messageText, 
              { 
                color: colors.text,
                fontSize: isTinyScreen ? 13 : isSmallScreen ? 14 : 15,
                lineHeight: isTinyScreen ? 18 : isSmallScreen ? 20 : 22
              }
            ]}>
              {item.message}
            </Text>

            {/* Attachments */}
            {item.attachments && item.attachments.length > 0 && (
              <View style={[styles.messageAttachments, { marginTop: isTinyScreen ? 6 : 8 }]}>
                {item.attachments.map((attachment: any, idx: number) => (
                  <AnimatedTouchableOpacity 
                    key={idx} 
                    style={[
                      styles.attachmentChip,
                      { 
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
                        paddingHorizontal: isTinyScreen ? 6 : 8,
                        paddingVertical: isTinyScreen ? 4 : 6,
                        borderRadius: isTinyScreen ? 8 : 10
                      },
                      downloadAnimatedStyle
                    ]}
                    onPress={() => handleDownloadAttachment(attachment)}
                  >
                    {attachment.type?.includes('image') ? (
                      <ImageIcon size={isTinyScreen ? 10 : 12} color={colors.primary} />
                    ) : (
                      <FileText size={isTinyScreen ? 10 : 12} color={colors.primary} />
                    )}
                    <Text 
                      style={[
                        styles.attachmentName, 
                        { 
                          color: colors.text,
                          fontSize: isTinyScreen ? 10 : 11,
                          maxWidth: isTinyScreen ? 80 : 100
                        }
                      ]} 
                      numberOfLines={1}
                    >
                      {attachment.name}
                    </Text>
                    <Download size={isTinyScreen ? 8 : 10} color={colors.primary} />
                  </AnimatedTouchableOpacity>
                ))}
              </View>
            )}

            {/* Time and status */}
            <View style={[styles.messageFooter, { marginTop: isTinyScreen ? 4 : 6 }]}>
              <Text style={[
                styles.messageTime, 
                { 
                  color: colors.textSecondary,
                  fontSize: isTinyScreen ? 9 : 10
                }
              ]}>
                {timeString}
              </Text>
              {isCurrentUser && (
                <Text style={[
                  styles.messageStatus,
                  {
                    fontSize: isTinyScreen ? 9 : 10,
                    color: item.sent === false ? colors.error : colors.success,
                    marginLeft: isTinyScreen ? 4 : 6
                  }
                ]}>
                  {item.sent === false ? 'Not sent' : 'Sent'}
                </Text>
              )}
            </View>
          </LinearGradient>
        </View>
        
        {/* Avatar for user messages - RIGHT SIDE */}
        {isCurrentUser && (
          <View style={[
            styles.avatar, 
            { 
              backgroundColor: isDark ? colors.accent : '#128C7E',
              width: isTinyScreen ? 28 : isSmallScreen ? 32 : 36,
              height: isTinyScreen ? 28 : isSmallScreen ? 32 : 36,
              borderRadius: isTinyScreen ? 14 : isSmallScreen ? 16 : 18,
              marginLeft: isTinyScreen ? 6 : 8
            }
          ]}>
            <Text style={[
              styles.avatarText,
              { 
                fontSize: isTinyScreen ? 12 : isSmallScreen ? 13 : 14,
                fontWeight: 'bold',
                color: 'white'
              }
            ]}>
              {userName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </Animated.View>
    );
  };

  const refreshAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: refreshButtonScale.value }],
  }));

  const sendAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendButtonScale.value }],
  }));

  const attachAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: attachButtonScale.value }],
  }));

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={isDark ? [colors.headerBackground, colors.surface] : ['#800080', '#9932CC']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft size={isTinyScreen ? 20 : 24} color="white" />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { fontSize: isTinyScreen ? 16 : isSmallScreen ? 18 : 20 }]}>
              Loading...
            </Text>
            <View style={{ width: isTinyScreen ? 32 : 40 }} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text, fontSize: isTinyScreen ? 14 : 16 }]}>
            Loading ticket details...
          </Text>
        </View>
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={isDark ? [colors.headerBackground, colors.surface] : ['#800080', '#9932CC']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ArrowLeft size={isTinyScreen ? 20 : 24} color="white" />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { fontSize: isTinyScreen ? 16 : isSmallScreen ? 18 : 20 }]}>
              Ticket Not Found
            </Text>
            <View style={{ width: isTinyScreen ? 32 : 40 }} />
          </View>
        </LinearGradient>
        <View style={styles.errorContainer}>
          <XCircle size={isTinyScreen ? 40 : 48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.text, fontSize: isTinyScreen ? 14 : 16 }]}>
            Ticket not found
          </Text>
        </View>
      </View>
    );
  }

  const isTicketClosed = ticket.status === 'closed' || ticket.status === 'completed';

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Enhanced Header with Gradient */}
      <LinearGradient
        colors={isDark ? [colors.headerBackground, colors.surface] : ['#800080', '#9932CC']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={isTinyScreen ? 20 : 24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={[
              styles.headerTitle, 
              { fontSize: isTinyScreen ? 14 : isSmallScreen ? 16 : 18 }
            ]} numberOfLines={1}>
              #{ticket.id.slice(0, 8)}
            </Text>
            <View style={[
              styles.statusBadge, 
              { 
                backgroundColor: getStatusColor(ticket.status) + (isDark ? '40' : '30'),
                paddingHorizontal: isTinyScreen ? 6 : 8,
                paddingVertical: isTinyScreen ? 2 : 4,
                borderRadius: isTinyScreen ? 8 : 10
              }
            ]}>
              {getStatusIcon(ticket.status)}
              <Text style={[
                styles.statusText, 
                { 
                  color: getStatusColor(ticket.status),
                  fontSize: isTinyScreen ? 8 : isSmallScreen ? 9 : 10
                }
              ]}>
                {ticket.status.toUpperCase()}
              </Text>
            </View>
          </View>
          <AnimatedTouchableOpacity 
            style={[styles.refreshButton, refreshAnimatedStyle]}
            onPress={onRefresh}
          >
            <RefreshCw size={isTinyScreen ? 16 : 18} color="white" />
          </AnimatedTouchableOpacity>
        </View>
      </LinearGradient>

      {/* Ticket Info Card */}
      <View style={[
        styles.ticketInfoCard, 
        { 
          backgroundColor: colors.surface,
          marginHorizontal: isTinyScreen ? 8 : isSmallScreen ? 12 : 16,
          marginTop: isTinyScreen ? 8 : 12,
          borderRadius: isTinyScreen ? 12 : 16,
          padding: isTinyScreen ? 12 : isSmallScreen ? 16 : 20
        }
      ]}>
        <LinearGradient
          colors={isDark ? ['rgba(74, 144, 226, 0.1)', 'rgba(74, 144, 226, 0.05)'] : ['rgba(128, 0, 128, 0.08)', 'rgba(128, 0, 128, 0.03)']}
          style={styles.ticketInfoGradient}
        >
          <Text style={[
            styles.ticketTitle, 
            { 
              color: colors.text,
              fontSize: isTinyScreen ? 14 : isSmallScreen ? 16 : 18,
              lineHeight: isTinyScreen ? 18 : isSmallScreen ? 22 : 24
            }
          ]}>
            {ticket.title}
          </Text>
          <View style={[
            styles.ticketMeta,
            isTablet ? styles.ticketMetaTablet : styles.ticketMetaMobile
          ]}>
            <View style={styles.metaItem}>
              <Text style={[
                styles.metaLabel, 
                { 
                  color: colors.textSecondary,
                  fontSize: isTinyScreen ? 10 : 11
                }
              ]}>
                Category
              </Text>
              <Text style={[
                styles.metaValue, 
                { 
                  color: colors.text,
                  fontSize: isTinyScreen ? 11 : 12
                }
              ]}>
                {ticket.category}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={[
                styles.metaLabel, 
                { 
                  color: colors.textSecondary,
                  fontSize: isTinyScreen ? 10 : 11
                }
              ]}>
                Priority
              </Text>
              <Text style={[
                styles.metaValue, 
                { 
                  color: colors.text,
                  fontSize: isTinyScreen ? 11 : 12
                }
              ]}>
                {ticket.priority}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Messages Container with Chat Background */}
      <View style={[
        styles.chatContainer, 
        { 
          backgroundColor: isDark ? 'rgba(26, 32, 44, 0.6)' : 'rgba(229, 221, 213, 0.8)',
          marginHorizontal: isTinyScreen ? 8 : isSmallScreen ? 12 : 16,
          marginTop: isTinyScreen ? 8 : 12,
          borderRadius: isTinyScreen ? 12 : 16,
          flex: 1
        }
      ]}>
        <FlatList
          ref={scrollViewRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id || Math.random().toString()}
          contentContainerStyle={[
            styles.messagesContainer,
            { 
              paddingHorizontal: isTinyScreen ? 8 : isSmallScreen ? 12 : 16,
              paddingVertical: isTinyScreen ? 12 : 16,
              paddingBottom: isTinyScreen ? 40 : isTablet ? 60 : 50
            }
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          ItemSeparatorComponent={() => <View style={{ height: isTinyScreen ? 6 : 8 }} />}
        />
      </View>

      {/* Input Area Card */}
      {!isTicketClosed && (
        <View style={[
          styles.inputAreaCard, 
          { 
            backgroundColor: colors.surface,
            marginHorizontal: isTinyScreen ? 8 : isSmallScreen ? 12 : 16,
            marginBottom: isTinyScreen ? 8 : 12,
            borderRadius: isTinyScreen ? 12 : 16,
            padding: isTinyScreen ? 8 : isSmallScreen ? 12 : 16
          }
        ]}>
          <LinearGradient
            colors={isDark ? ['rgba(74, 144, 226, 0.08)', 'rgba(74, 144, 226, 0.03)'] : ['rgba(128, 0, 128, 0.06)', 'rgba(128, 0, 128, 0.02)']}
            style={styles.inputAreaGradient}
          >
            {/* Attachments Preview */}
            {attachments.length > 0 && (
              <ScrollView 
                horizontal 
                style={[styles.attachmentsPreview, { marginBottom: isTinyScreen ? 6 : 8 }]}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 16 }}
              >
                {attachments.map((attachment, index) => (
                  <View key={index} style={[
                    styles.attachmentPreview, 
                    { 
                      backgroundColor: isDark ? 'rgba(74, 144, 226, 0.15)' : 'rgba(128, 0, 128, 0.1)',
                      borderColor: isDark ? 'rgba(74, 144, 226, 0.3)' : 'rgba(128, 0, 128, 0.2)',
                      paddingHorizontal: isTinyScreen ? 8 : 10,
                      paddingVertical: isTinyScreen ? 6 : 8,
                      borderRadius: isTinyScreen ? 12 : 16,
                      marginRight: isTinyScreen ? 6 : 8
                    }
                  ]}>
                    <FileText size={isTinyScreen ? 12 : 14} color={colors.primary} />
                    <Text style={[
                      styles.attachmentPreviewName, 
                      { 
                        color: colors.text,
                        fontSize: isTinyScreen ? 10 : 11,
                        maxWidth: isTinyScreen ? 80 : 100
                      }
                    ]} numberOfLines={1}>
                      {attachment.name}
                    </Text>
                    <TouchableOpacity 
                      onPress={() => removeAttachment(index)}
                      style={styles.removeAttachment}
                    >
                      <X size={isTinyScreen ? 12 : 14} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
            
            {/* Input Row */}
            <View style={[styles.inputRow, { gap: isTinyScreen ? 6 : 8 }]}>
              <AnimatedTouchableOpacity 
                style={[
                  styles.attachButton,
                  { 
                    backgroundColor: isDark ? 'rgba(74, 144, 226, 0.2)' : 'rgba(128, 0, 128, 0.15)',
                    opacity: attachments.length >= 3 ? 0.5 : 1,
                    width: isTinyScreen ? 36 : 40,
                    height: isTinyScreen ? 36 : 40,
                    borderRadius: isTinyScreen ? 18 : 20
                  },
                  attachAnimatedStyle
                ]}
                onPress={handlePickDocument}
                disabled={attachments.length >= 3}
              >
                <Paperclip 
                  size={isTinyScreen ? 16 : 18} 
                  color={attachments.length >= 3 
                    ? colors.textSecondary
                    : colors.primary
                  } 
                />
              </AnimatedTouchableOpacity>
              
              <View style={[
                styles.messageInputContainer,
                { 
                  backgroundColor: colors.inputBackground,
                  borderColor: colors.border,
                  borderRadius: isTinyScreen ? 18 : 20,
                  minHeight: isTinyScreen ? 36 : 40,
                  maxHeight: isTinyScreen ? 80 : 100
                }
              ]}>
                <TextInput
                  style={[
                    styles.messageInput, 
                    { 
                      color: colors.text,
                      fontSize: isTinyScreen ? 13 : 14,
                      paddingHorizontal: isTinyScreen ? 12 : 16,
                      paddingVertical: Platform.OS === 'ios' ? (isTinyScreen ? 8 : 10) : (isTinyScreen ? 6 : 8)
                    }
                  ]}
                  placeholder="Type your message..."
                  placeholderTextColor={colors.textSecondary}
                  value={newMessage}
                  onChangeText={setNewMessage}
                  multiline
                  maxLength={500}
                />
              </View>
              
              <AnimatedTouchableOpacity 
                style={[
                  styles.sendButton, 
                  { 
                    backgroundColor: (!newMessage.trim() && attachments.length === 0) || sending 
                      ? colors.border
                      : colors.primary,
                    width: isTinyScreen ? 36 : 40,
                    height: isTinyScreen ? 36 : 40,
                    borderRadius: isTinyScreen ? 18 : 20
                  },
                  sendAnimatedStyle
                ]}
                onPress={handleSendMessage}
                disabled={(!newMessage.trim() && attachments.length === 0) || sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Send size={isTinyScreen ? 14 : 16} color="white" />
                )}
              </AnimatedTouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      )}

      {/* Closed Ticket Notice Card */}
      {isTicketClosed && (
        <View style={[
          styles.closedNoticeCard, 
          { 
            backgroundColor: colors.surface,
            marginHorizontal: isTinyScreen ? 8 : isSmallScreen ? 12 : 16,
            marginBottom: isTinyScreen ? 8 : 12,
            borderRadius: isTinyScreen ? 12 : 16,
            padding: isTinyScreen ? 12 : 16
          }
        ]}>
          <LinearGradient
            colors={[getStatusColor(ticket.status) + '15', getStatusColor(ticket.status) + '08']}
            style={styles.closedNoticeGradient}
          >
            <View style={styles.closedNoticeContent}>
              <CheckCircle size={isTinyScreen ? 18 : 20} color={getStatusColor(ticket.status)} />
              <Text style={[
                styles.closedNoticeText, 
                { 
                  color: colors.text,
                  fontSize: isTinyScreen ? 13 : 14
                }
              ]}>
                This ticket has been {ticket.status}
              </Text>
            </View>
          </LinearGradient>
        </View>
      )}

      <CustomAlert {...alertProps} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + (isTinyScreen ? 12 : 16) : (isTinyScreen ? 40 : 50),
    paddingBottom: isTinyScreen ? 10 : isSmallScreen ? 12 : 16,
    paddingHorizontal: isTinyScreen ? 12 : isSmallScreen ? 16 : 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: isTinyScreen ? 36 : isSmallScreen ? 40 : 44,
  },
  backButton: {
    padding: isTinyScreen ? 4 : 6,
    width: isTinyScreen ? 32 : 36,
    height: isTinyScreen ? 32 : 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: isTinyScreen ? 16 : 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: isTablet ? 'row' : 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: isTablet ? 12 : (isTinyScreen ? 4 : 6),
  },
  headerTitle: {
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isTinyScreen ? 3 : 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  statusText: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  refreshButton: {
    padding: isTinyScreen ? 6 : 8,
    width: isTinyScreen ? 32 : 36,
    height: isTinyScreen ? 32 : 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: isTinyScreen ? 16 : 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: isTinyScreen ? 8 : 12,
  },
  loadingText: {
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: isTinyScreen ? 12 : 16,
    paddingHorizontal: 20,
  },
  errorText: {
    textAlign: 'center',
    fontWeight: '500',
  },
  ticketInfoCard: {
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 3px 8px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  ticketInfoGradient: {
    padding: 0,
  },
  ticketTitle: {
    fontWeight: '600',
    marginBottom: isTinyScreen ? 8 : 12,
    letterSpacing: 0.3,
  },
  ticketMeta: {
    gap: isTinyScreen ? 8 : 12,
  },
  ticketMetaMobile: {
    flexDirection: 'column',
  },
  ticketMetaTablet: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metaItem: {
    alignItems: isTablet ? 'center' : 'flex-start',
  },
  metaLabel: {
    fontWeight: '500',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  chatContainer: {
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  messagesContainer: {
    flexGrow: 1,
  },
  messageWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: isTinyScreen ? 8 : 12,
  },
  adminMessageWrapper: {
    justifyContent: 'flex-start',
  },
  userMessageWrapper: {
    justifyContent: 'flex-end',
  },
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  avatarText: {
    fontWeight: 'bold',
    color: 'white',
  },
  messageContent: {
    position: 'relative',
  },
  senderLabel: {
    fontWeight: '600',
  },
  messageBubble: {
    borderRadius: isTinyScreen ? 14 : 16,
    position: 'relative',
    minWidth: isTinyScreen ? 60 : 80,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  userBubble: {
    borderTopRightRadius: isTinyScreen ? 4 : 6,
    marginRight: isTinyScreen ? 6 : 8,
  },
  adminBubble: {
    borderTopLeftRadius: isTinyScreen ? 4 : 6,
    marginLeft: isTinyScreen ? 6 : 8,
  },
  messageText: {
    letterSpacing: 0.3,
  },
  messageAttachments: {
    gap: isTinyScreen ? 4 : 6,
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isTinyScreen ? 4 : 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  attachmentName: {
    flex: 1,
    fontWeight: '500',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  messageTime: {
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  messageStatus: {
    fontStyle: 'italic',
    fontWeight: '500',
  },
  inputAreaCard: {
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  inputAreaGradient: {
    padding: 0,
  },
  attachmentsPreview: {
    maxHeight: isTinyScreen ? 35 : 40,
  },
  attachmentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    gap: isTinyScreen ? 4 : 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  attachmentPreviewName: {
    fontWeight: '500',
  },
  removeAttachment: {
    padding: isTinyScreen ? 2 : 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  attachButton: {
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  messageInputContainer: {
    flex: 1,
    borderWidth: 1,
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  messageInput: {
    textAlignVertical: 'center',
  },
  sendButton: {
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 3px 8px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  closedNoticeCard: {
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  closedNoticeGradient: {
    padding: 0,
  },
  closedNoticeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: isTinyScreen ? 6 : 8,
  },
  closedNoticeText: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});