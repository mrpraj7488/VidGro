import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Animated,
  Clipboard,
  RefreshControl,
  Alert
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, MessageCircle, Send, Phone, Mail, CircleHelp as HelpCircle, CircleAlert as AlertCircle, CreditCard, User, Video, Coins, MoveHorizontal as MoreHorizontal, ChevronDown, ChevronUp, Clock, CircleCheck as CheckCircle, Circle as XCircle, TriangleAlert as AlertTriangle, Star, Copy, Paperclip, X, FileText, Image, RefreshCw, MessageSquare, Check, History, ChevronRight, ArrowRight } from 'lucide-react-native';
import { getSupabase } from '@/lib/supabase';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import CustomAlert from '@/components/CustomAlert';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import FileUploadService from '@/services/FileUploadService';
import AnimatedComponent, { useSharedValue, useAnimatedStyle, withSpring, withSequence } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isTinyScreen = screenWidth < 350;
const isSmallScreen = screenWidth < 380;
const isTablet = screenWidth >= 768;

const AnimatedTouchableOpacity = AnimatedComponent.create(TouchableOpacity);

function ContactSupportScreen() {
  const { profile, user } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const supabase = getSupabase();
  const { showError, showInfo, alertProps, showAlert } = useCustomAlert();
  
  // State
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('medium');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [recentTickets, setRecentTickets] = useState([]);
  const [showRecentTickets, setShowRecentTickets] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [copiedTicketId, setCopiedTicketId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [realtimeSubscription, setRealtimeSubscription] = useState(null);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const refreshRotation = useRef(new Animated.Value(0)).current;
  const spinValue = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  // Reanimated values for interactive elements
  const submitButtonScale = useSharedValue(1);
  const categoryButtonScales = useRef(Array.from({ length: 6 }, () => useSharedValue(1))).current;
  const priorityButtonScales = useRef(Array.from({ length: 3 }, () => useSharedValue(1))).current;
  const copyButtonScale = useSharedValue(1);
  const refreshButtonScale = useSharedValue(1);

  const supportCategories = [
    { 
      id: 'technical', 
      title: 'Technical Issue', 
      icon: AlertCircle,
      color: '#FF6B6B',
      description: 'App crashes, bugs, errors',
      gradient: ['#FF6B6B', '#FF5252']
    },
    { 
      id: 'payment', 
      title: 'Payment', 
      icon: CreditCard,
      color: '#4ECDC4',
      description: 'Billing and transactions',
      gradient: ['#4ECDC4', '#26C6DA']
    },
    { 
      id: 'account', 
      title: 'Account', 
      icon: User,
      color: '#45B7D1',
      description: 'Login, profile, settings',
      gradient: ['#45B7D1', '#42A5F5']
    },
    { 
      id: 'video', 
      title: 'Videos', 
      icon: Video,
      color: '#96CEB4',
      description: 'Promotion errors',
      gradient: ['#96CEB4', '#81C784']
    },
    { 
      id: 'coins', 
      title: 'Coins', 
      icon: Coins,
      color: '#FFEAA7',
      description: 'Rewards and earnings',
      gradient: ['#FFEAA7', '#FFD54F']
    },
    { 
      id: 'other', 
      title: 'Other', 
      icon: MoreHorizontal,
      color: '#DDA0DD',
      description: 'General inquiries',
      gradient: ['#DDA0DD', '#CE93D8']
    },
  ];

  const priorityLevels = [
    { 
      id: 'low', 
      title: 'Low', 
      desc: 'General questions',
      color: '#10B981',
      bgColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)',
      gradient: ['#10B981', '#059669']
    },
    { 
      id: 'medium', 
      title: 'Medium', 
      desc: 'Account issues',
      color: '#F59E0B',
      bgColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.1)',
      gradient: ['#F59E0B', '#D97706']
    },
    { 
      id: 'high', 
      title: 'High', 
      desc: 'Technical problems',
      color: '#EF4444',
      bgColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
      gradient: ['#EF4444', '#DC2626']
    }
  ];

  // Setup real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    const subscription = supabase
      .channel('support_tickets_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
          filter: `reported_by=eq.${user.id}`
        },
        (payload) => {
          console.log('Ticket update:', payload);
          loadRecentTickets();
        }
      )
      .subscribe();

    setRealtimeSubscription(subscription);

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [user?.id]);

  // Load recent tickets
  useEffect(() => {
    loadRecentTickets();
    
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        delay: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadRecentTickets = async () => {
    if (!user?.id) {
      console.log('No user ID available');
      return;
    }
    
    setLoadingTickets(true);
    try {
      console.log('Fetching recent tickets for user:', user.id);
      
      const { data, error, status } = await supabase
        .from('support_tickets')
        .select('id')
        .eq('reported_by', user.id)
        .limit(1);
      
      if (status === 406 || (error && error.code === '42P01')) {
        console.log('Support tickets table does not exist or is not accessible');
        setRecentTickets([]);
        return;
      }
      
      const { data: tickets, error: fetchError } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('reported_by', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      console.log('Tickets fetch status:', status);
      
      if (fetchError) {
        console.error('Supabase error:', fetchError);
        setRecentTickets([]);
        return;
      }
      
      console.log('Fetched tickets:', tickets);
      setRecentTickets(tickets || []);
      
      if (!tickets || tickets.length === 0) {
        console.log('No tickets found for user');
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
      setRecentTickets([]);
      if (error.code !== '42P01') {
        showError('Error', 'Failed to load recent tickets. Please check your connection and try again.');
      }
    } finally {
      setLoadingTickets(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    Animated.loop(
      Animated.timing(refreshRotation, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ).start();

    await loadRecentTickets();
    
    setTimeout(() => {
      setRefreshing(false);
      refreshRotation.setValue(0);
    }, 500);
  }, []);

  const handlePickDocument = async () => {
    if (attachments.length >= 5) {
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf', 'text/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        
        if (file.size > 5 * 1024 * 1024) {
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

  const handleSubmitTicket = async () => {
    if (!selectedCategory || !subject || !message) {
      return;
    }

    if (!user?.id) {
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    submitButtonScale.value = withSequence(
      withSpring(0.95, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 400 })
    );

    setLoading(true);
    
    try {
      let attachmentData = [];
      if (attachments.length > 0) {
        try {
          await FileUploadService.ensureBucketExists();
          
          const tempTicketId = `temp_${Date.now()}`;
          
          const uploadedFiles = await FileUploadService.uploadMultipleFiles(
            attachments,
            tempTicketId,
            user.id
          );
          
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
          setLoading(false);
          return;
        }
      }

      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          title: subject,
          description: message,
          status: 'active',
          priority: selectedPriority,
          category: selectedCategory,
          reported_by: user.id,
          attachments: attachmentData
        })
        .select()
        .single();

      if (error) throw error;

      if (attachments.length > 0 && data?.id) {
        console.log('Ticket created with attachments:', data.id);
      }

      setSubject('');
      setMessage('');
      setSelectedCategory('');
      setSelectedPriority('medium');
      setAttachments([]);
      loadRecentTickets();
      
      router.push(`/ticket-detail?id=${data.id}`);
      
    } catch (error) {
      console.error('Submit error:', error);
      showError('Error', 'Failed to submit ticket. Please try again.');
    } finally {
      setLoading(false);
      setUploadingFile(false);
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'active': return <AlertCircle size={isTinyScreen ? 12 : 16} color="#3498DB" />;
      case 'pending': return <Clock size={isTinyScreen ? 12 : 16} color="#F39C12" />;
      case 'answered': return <MessageSquare size={isTinyScreen ? 12 : 16} color="#800080" />;
      case 'completed': return <CheckCircle size={isTinyScreen ? 12 : 16} color="#27AE60" />;
      case 'closed': return <XCircle size={isTinyScreen ? 12 : 16} color="#95A5A6" />;
      default: return <HelpCircle size={isTinyScreen ? 12 : 16} color="#95A5A6" />;
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'active': { bg: isDark ? '#2A4365' : '#EBF8FF', text: '#2563EB' },
      'pending': { bg: isDark ? '#4C2C17' : '#FEF3C7', text: '#D97706' },
      'answered': { bg: isDark ? '#1A4736' : '#D1FAE5', text: '#059669' },
      'completed': { bg: isDark ? '#3C2F5F' : '#F3E8FF', text: '#7C3AED' },
      'closed': { bg: isDark ? '#2D3748' : '#F3F4F6', text: '#6B7280' }
    };
    return colors[status] || colors.active;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'low': '#10B981',
      'medium': '#F59E0B',
      'high': '#EF4444'
    };
    return colors[priority] || colors.low;
  };

  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const copyTicketId = (ticketId) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    copyButtonScale.value = withSequence(
      withSpring(0.95, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 400 })
    );

    Clipboard.setString(ticketId.toString());
    setCopiedTicketId(ticketId);
    setTimeout(() => {
      setCopiedTicketId(null);
    }, 2000);
  };

  const navigateToTicketDetail = (ticket) => {
    router.push(`/ticket-detail?id=${ticket.id}`);
  };

  const handleManualRefresh = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    refreshButtonScale.value = withSequence(
      withSpring(0.95, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 400 })
    );

    Animated.timing(refreshRotation, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      refreshRotation.setValue(0);
    });
    
    await loadRecentTickets();
  };

  const handleCategoryPress = (category, index) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    categoryButtonScales[index].value = withSequence(
      withSpring(0.95, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 400 })
    );

    setSelectedCategory(category.id);
  };

  const handlePriorityPress = (priority, index) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    priorityButtonScales[index].value = withSequence(
      withSpring(0.95, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 400 })
    );

    setSelectedPriority(priority.id);
  };

  // Animated styles
  const submitButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: submitButtonScale.value }],
  }));

  const copyButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: copyButtonScale.value }],
  }));

  const refreshButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: refreshButtonScale.value }],
  }));

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <LinearGradient
        colors={isDark ? ['#4A90E2', '#6366F1'] : ['#800080', '#9932CC']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={isTinyScreen ? 20 : 24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isTinyScreen && styles.headerTitleSmall, { color: '#FFFFFF' }]}>
            Contact Support
          </Text>
          <MessageCircle size={isTinyScreen ? 20 : 24} color="#FFFFFF" />
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, isTablet && styles.scrollContentTablet]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={colors.primary}
            titleColor={colors.textSecondary}
          />
        }
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Subtitle */}
          <View style={styles.subtitleSection}>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              We're here to help! Select a category and describe your issue.
            </Text>
          </View>

          {/* Category Selection */}
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <LinearGradient
              colors={isDark ? ['rgba(74, 144, 226, 0.1)', 'rgba(74, 144, 226, 0.05)'] : ['rgba(128, 0, 128, 0.1)', 'rgba(128, 0, 128, 0.05)']}
              style={styles.sectionGradient}
            >
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Select Category <Text style={{ color: colors.error }}>*</Text>
                </Text>
              </View>
              <View style={[styles.categoriesGrid, isTablet && styles.categoriesGridTablet]}>
                {supportCategories.map((category, index) => {
                  const categoryButtonAnimatedStyle = useAnimatedStyle(() => ({
                    transform: [{ scale: categoryButtonScales[index].value }],
                  }));

                  return (
                    <AnimatedTouchableOpacity 
                      key={category.id} 
                      style={[
                        styles.categoryCard,
                        { 
                          backgroundColor: colors.card,
                          borderColor: selectedCategory === category.id ? category.color : colors.border,
                          borderWidth: selectedCategory === category.id ? 2 : 1
                        },
                        isTablet && styles.categoryCardTablet,
                        categoryButtonAnimatedStyle
                      ]}
                      onPress={() => handleCategoryPress(category, index)}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={selectedCategory === category.id ? category.gradient : ['transparent', 'transparent']}
                        style={styles.categoryGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <View style={[
                          styles.categoryIconContainer,
                          { backgroundColor: category.color + '20' }
                        ]}>
                          <category.icon size={isTinyScreen ? 16 : 20} color={category.color} />
                        </View>
                        <Text style={[
                          styles.categoryTitle,
                          { 
                            color: selectedCategory === category.id ? category.color : colors.text,
                            fontSize: isTinyScreen ? 13 : 15
                          }
                        ]}>
                          {category.title}
                        </Text>
                        <Text style={[
                          styles.categoryDesc,
                          { 
                            color: colors.textSecondary,
                            fontSize: isTinyScreen ? 10 : 12
                          }
                        ]}>
                          {category.description}
                        </Text>
                      </LinearGradient>
                    </AnimatedTouchableOpacity>
                  );
                })}
              </View>
            </LinearGradient>
          </View>

          {/* Priority Selection */}
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <LinearGradient
              colors={isDark ? ['rgba(245, 158, 11, 0.1)', 'rgba(245, 158, 11, 0.05)'] : ['rgba(245, 158, 11, 0.1)', 'rgba(245, 158, 11, 0.05)']}
              style={styles.sectionGradient}
            >
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Priority Level <Text style={{ color: colors.error }}>*</Text>
                </Text>
              </View>
              <View style={[styles.priorityContainer, isTablet && styles.priorityContainerTablet]}>
                {priorityLevels.map((priority, index) => {
                  const priorityButtonAnimatedStyle = useAnimatedStyle(() => ({
                    transform: [{ scale: priorityButtonScales[index].value }],
                  }));

                  return (
                    <AnimatedTouchableOpacity
                      key={priority.id}
                      style={[
                        styles.priorityButton,
                        { 
                          backgroundColor: colors.card,
                          borderColor: selectedPriority === priority.id ? priority.color : colors.border,
                          borderWidth: selectedPriority === priority.id ? 2 : 1
                        },
                        isTablet && styles.priorityButtonTablet,
                        priorityButtonAnimatedStyle
                      ]}
                      onPress={() => handlePriorityPress(priority, index)}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={selectedPriority === priority.id ? priority.gradient : ['transparent', 'transparent']}
                        style={styles.priorityGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Text style={[
                          styles.priorityTitle,
                          { 
                            color: selectedPriority === priority.id ? priority.color : colors.text,
                            fontSize: isTinyScreen ? 13 : 15
                          }
                        ]}>
                          {priority.title}
                        </Text>
                        <Text style={[
                          styles.priorityDesc,
                          { 
                            color: colors.textSecondary,
                            fontSize: isTinyScreen ? 10 : 12
                          }
                        ]}>
                          {priority.desc}
                        </Text>
                      </LinearGradient>
                    </AnimatedTouchableOpacity>
                  );
                })}
              </View>
            </LinearGradient>
          </View>

          {/* Subject Input */}
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <LinearGradient
              colors={isDark ? ['rgba(74, 144, 226, 0.1)', 'rgba(74, 144, 226, 0.05)'] : ['rgba(128, 0, 128, 0.1)', 'rgba(128, 0, 128, 0.05)']}
              style={styles.sectionGradient}
            >
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Subject <Text style={{ color: colors.error }}>*</Text>
                </Text>
              </View>
              <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Brief description of your issue"
                  placeholderTextColor={colors.textSecondary}
                  value={subject}
                  onChangeText={setSubject}
                  maxLength={100}
                  selectionColor={colors.primary}
                />
                <Text style={[styles.charCount, { color: colors.textSecondary }]}>
                  {subject.length}/100
                </Text>
              </View>
            </LinearGradient>
          </View>

          {/* Message Input */}
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <LinearGradient
              colors={isDark ? ['rgba(74, 144, 226, 0.1)', 'rgba(74, 144, 226, 0.05)'] : ['rgba(128, 0, 128, 0.1)', 'rgba(128, 0, 128, 0.05)']}
              style={styles.sectionGradient}
            >
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Detailed Message <Text style={{ color: colors.error }}>*</Text>
                </Text>
              </View>
              <View style={[styles.inputContainer, styles.messageContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.input, styles.messageInput, { color: colors.text }]}
                  placeholder="Describe your issue in detail..."
                  placeholderTextColor={colors.textSecondary}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  maxLength={1000}
                  selectionColor={colors.primary}
                />
                <View style={styles.messageBoxFooter}>
                  <AnimatedTouchableOpacity 
                    style={[styles.attachmentButton, { backgroundColor: colors.primary + '20', opacity: attachments.length >= 5 ? 0.6 : 1 }]}
                    onPress={handlePickDocument}
                    disabled={uploadingFile || attachments.length >= 5}
                  >
                    {uploadingFile ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Paperclip size={isTinyScreen ? 14 : 16} color={colors.primary} />
                    )}
                    {attachments.length > 0 && (
                      <View style={[styles.attachmentBadge, { backgroundColor: colors.primary }]}>
                        <Text style={styles.attachmentBadgeText}>{attachments.length}</Text>
                      </View>
                    )}
                  </AnimatedTouchableOpacity>
                  <Text style={[styles.charCount, { color: colors.textSecondary }]}>
                    {message.length}/1000
                  </Text>
                </View>
                {attachments.length > 0 && (
                  <View style={styles.compactAttachmentsList}>
                    {attachments.map((attachment, index) => (
                      <View key={attachment.name} style={[styles.compactAttachmentItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.compactAttachmentName, { color: colors.text }]} numberOfLines={1}>
                          {attachment.name}
                        </Text>
                        <TouchableOpacity 
                          style={[styles.compactRemoveButton, { backgroundColor: colors.error + '20' }]}
                          onPress={() => removeAttachment(index)}
                        >
                          <X size={isTinyScreen ? 12 : 14} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </LinearGradient>
          </View>

          {/* Submit Button */}
          <View style={styles.submitSection}>
            <AnimatedTouchableOpacity 
              style={[styles.submitButton, submitButtonAnimatedStyle, { opacity: (!selectedCategory || !subject || !message || loading) ? 0.6 : 1 }]}
              onPress={handleSubmitTicket}
              disabled={!selectedCategory || !subject || !message || loading}
            >
              <LinearGradient
                colors={(!selectedCategory || !subject || !message || loading) 
                  ? ['#A0AEC0', '#718096'] 
                  : isDark ? ['#4A90E2', '#6366F1'] : ['#800080', '#9932CC']}
                style={styles.submitButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Send size={isTinyScreen ? 16 : 20} color="#FFFFFF" />
                )}
                <Text style={[styles.submitButtonText, { fontSize: isTinyScreen ? 14 : 16 }]}>
                  {loading ? 'Submitting...' : 'Submit Ticket'}
                </Text>
              </LinearGradient>
            </AnimatedTouchableOpacity>
          </View>

          {/* Recent Tickets */}
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <LinearGradient
              colors={isDark ? ['rgba(0, 212, 255, 0.1)', 'rgba(0, 212, 255, 0.05)'] : ['rgba(128, 0, 128, 0.1)', 'rgba(128, 0, 128, 0.05)']}
              style={styles.sectionGradient}
            >
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <History size={isTinyScreen ? 16 : 20} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Recent Tickets
                  </Text>
                </View>
                <AnimatedTouchableOpacity 
                  style={[styles.refreshButton, { backgroundColor: colors.primary + '20' }, refreshButtonAnimatedStyle]}
                  onPress={handleManualRefresh}
                  disabled={refreshing}
                >
                  <Animated.View style={{ transform: [{ rotate: spinValue }] }}>
                    <RefreshCw size={isTinyScreen ? 12 : 16} color={colors.primary} />
                  </Animated.View>
                </AnimatedTouchableOpacity>
              </View>
              
              {loadingTickets ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                    Loading tickets...
                  </Text>
                </View>
              ) : recentTickets.length > 0 ? (
                <View style={styles.ticketsContainer}>
                  {recentTickets.slice(0, showRecentTickets ? recentTickets.length : 3).map((ticket) => {
                    const statusColors = getStatusColor(ticket.status);
                    return (
                      <TouchableOpacity 
                        key={ticket.id} 
                        style={[styles.ticketCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => navigateToTicketDetail(ticket)}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={[statusColors.bg + '80', 'transparent']}
                          style={styles.ticketGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <View style={styles.ticketHeader}>
                            <View style={styles.ticketIdContainer}>
                              <Text style={[styles.ticketIdLabel, { color: colors.textSecondary }]}>
                                TICKET #{ticket.id.slice(-6).toUpperCase()}
                              </Text>
                              <AnimatedTouchableOpacity 
                                style={[styles.copyButton, { backgroundColor: colors.primary + '20' }, copyButtonAnimatedStyle]}
                                onPress={() => copyTicketId(ticket.id)}
                              >
                                {copiedTicketId === ticket.id ? (
                                  <Check size={isTinyScreen ? 12 : 14} color={colors.success} />
                                ) : (
                                  <Copy size={isTinyScreen ? 12 : 14} color={colors.primary} />
                                )}
                              </AnimatedTouchableOpacity>
                              {copiedTicketId === ticket.id && (
                                <View style={[styles.copiedPopup, { backgroundColor: colors.success + '90' }]}>
                                  <Text style={styles.copiedPopupText}>Copied!</Text>
                                </View>
                              )}
                            </View>
                            <View style={[styles.statusBadge, { backgroundColor: statusColors.bg, borderColor: colors.border }]}>
                              {getStatusIcon(ticket.status)}
                              <Text style={[styles.statusText, { color: statusColors.text }]}>
                                {ticket.status}
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.ticketTitle, { color: colors.text }]} numberOfLines={2}>
                            {ticket.title}
                          </Text>
                          <Text style={[styles.ticketDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                            {ticket.description}
                          </Text>
                          <View style={styles.ticketFooter}>
                            <View style={[styles.categoryBadge, { backgroundColor: colors.primary + '20' }]}>
                              <Text style={[styles.categoryText, { color: colors.primary }]}>
                                {ticket.category}
                              </Text>
                            </View>
                            <View style={styles.ticketMeta}>
                              <Clock size={isTinyScreen ? 12 : 14} color={colors.textSecondary} />
                              <Text style={[styles.ticketDate, { color: colors.textSecondary }]}>
                                {formatRelativeTime(ticket.created_at)}
                              </Text>
                            </View>
                          </View>
                        </LinearGradient>
                      </TouchableOpacity>
                    );
                  })}
                  {recentTickets.length > 3 && (
                    <TouchableOpacity 
                      style={[styles.viewAllButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => setShowRecentTickets(!showRecentTickets)}
                    >
                      <Text style={[styles.viewAllText, { color: colors.primary }]}>
                        {showRecentTickets ? 'Show Less' : `View All ${recentTickets.length} Tickets`}
                      </Text>
                      {showRecentTickets ? (
                        <ChevronUp size={isTinyScreen ? 14 : 16} color={colors.primary} />
                      ) : (
                        <ChevronDown size={isTinyScreen ? 14 : 16} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View style={[styles.emptyTicketsContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <MessageCircle size={isTinyScreen ? 24 : 32} color={colors.textSecondary} />
                  <Text style={[styles.emptyTicketsText, { color: colors.textSecondary }]}>
                    No support tickets yet. Submit your first ticket above!
                  </Text>
                </View>
              )}
            </LinearGradient>
          </View>

          {/* Contact Info */}
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <LinearGradient
              colors={isDark ? ['rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0.05)'] : ['rgba(128, 0, 128, 0.1)', 'rgba(128, 0, 128, 0.05)']}
              style={styles.sectionGradient}
            >
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Quick Support
                </Text>
              </View>
              <View style={[styles.contactItems, isTablet && styles.contactItemsTablet]}>
                <View style={[styles.contactItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Mail size={isTinyScreen ? 16 : 20} color={colors.primary} />
                  <Text style={[styles.contactText, { color: colors.text }]}>
                    support@vidgro.com
                  </Text>
                </View>
                <View style={[styles.contactItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Phone size={isTinyScreen ? 16 : 20} color={colors.primary} />
                  <Text style={[styles.contactText, { color: colors.text }]}>
                    +1 (555) 123-4567
                  </Text>
                </View>
              </View>
              <View style={styles.responseTimeContainer}>
                <Clock size={isTinyScreen ? 12 : 14} color={colors.textSecondary} />
                <Text style={[styles.responseTime, { color: colors.textSecondary }]}>
                  Average response: 2-4 hours
                </Text>
              </View>
            </LinearGradient>
          </View>
        </Animated.View>
      </ScrollView>
      
      <CustomAlert {...alert部分

alertProps} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 40,
    paddingBottom: 10,
    paddingHorizontal: isTinyScreen ? 8 : 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: isTinyScreen ? 6 : 8,
    borderRadius: isTinyScreen ? 12 : 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: isTinyScreen ? 16 : 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerTitleSmall: {
    fontSize: 14,
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: isTinyScreen ? 8 : 12,
    paddingBottom: isTinyScreen ? 40 : 60,
  },
  scrollContentTablet: {
    paddingHorizontal: 20,
    maxWidth: 800,
    alignSelf: 'center',
  },
  subtitleSection: {
    paddingVertical: isTinyScreen ? 12 : 16,
    alignItems: 'center',
  },
  subtitle: {
    fontSize: isTinyScreen ? 12 : 14,
    lineHeight: isTinyScreen ? 16 : 20,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  section: {
    marginBottom: isTinyScreen ? 12 : 16,
    borderRadius: isTinyScreen ? 10 : 12,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.2 : 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  sectionGradient: {
    padding: isTinyScreen ? 10 : 12,
  },
  sectionHeader: {
    marginBottom: isTinyScreen ? 8 : 12,
  },
  sectionTitle: {
    fontSize: isTinyScreen ? 14 : 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.3,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isTinyScreen ? 6 : 8,
  },
  categoriesGridTablet: {
    gap: 12,
  },
  categoryCard: {
    width: isTablet ? '30%' : (isTinyScreen ? '47%' : '48%'),
    borderRadius: isTinyScreen ? 8 : 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  categoryCardTablet: {
    width: '31%',
  },
  categoryGradient: {
    padding: isTinyScreen ? 8 : 12,
    alignItems: 'center',
  },
  categoryIconContainer: {
    width: isTinyScreen ? 32 : 40,
    height: isTinyScreen ? 32 : 40,
    borderRadius: isTinyScreen ? 16 : 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: isTinyScreen ? 6 : 8,
  },
  categoryTitle: {
    fontSize: isTinyScreen ? 12 : 14,
    fontWeight: '700',
    marginBottom: isTinyScreen ? 4 : 6,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  categoryDesc: {
    fontSize: isTinyScreen ? 10 : 11,
    lineHeight: isTinyScreen ? 14 : 16,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  priorityContainer: {
    flexDirection: isTablet ? 'row' : 'column',
    gap: isTinyScreen ? 6 : 8,
  },
  priorityContainerTablet: {
    flexDirection: 'row',
    gap: 12,
  },
  priorityButton: {
    flex: isTablet ? 1 : 0,
    borderRadius: isTinyScreen ? 8 : 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  priorityButtonTablet: {
    minWidth: 100,
  },
  priorityGradient: {
    padding: isTinyScreen ? 10 : 12,
    alignItems: 'center',
  },
  priorityTitle: {
    fontSize: isTinyScreen ? 12 : 14,
    fontWeight: '700',
    marginBottom: isTinyScreen ? 4 : 6,
    letterSpacing: 0.3,
  },
  priorityDesc: {
    fontSize: isTinyScreen ? 10 : 11,
    lineHeight: isTinyScreen ? 14 : 16,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  inputContainer: {
    borderRadius: isTinyScreen ? 8 : 10,
    borderWidth: 1,
    padding: isTinyScreen ? 8 : 12,
    marginBottom: isTinyScreen ? 6 : 8,
  },
  input: {
    fontSize: isTinyScreen ? 12 : 14,
    color: colors.text,
    paddingVertical: isTinyScreen ? 8 : 10,
    paddingHorizontal: isTinyScreen ? 10 : 12,
  },
  messageContainer: {
    minHeight: isTinyScreen ? 100 : 120,
  },
  messageInput: {
    minHeight: isTinyScreen ? 80 : 100,
    textAlignVertical: 'top',
  },
  messageBoxFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: isTinyScreen ? 6 : 8,
  },
  attachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: isTinyScreen ? 6 : 8,
    borderRadius: isTinyScreen ? 8 : 10,
    gap: isTinyScreen ? 4 : 6,
  },
  attachmentBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  compactAttachmentsList: {
    marginTop: isTinyScreen ? 6 : 8,
    paddingTop: isTinyScreen ? 6 : 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  compactAttachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: isTinyScreen ? 6 : 8,
    borderRadius: isTinyScreen ? 6 : 8,
    borderWidth: 1,
    marginBottom: isTinyScreen ? 4 : 6,
  },
  compactAttachmentName: {
    flex: 1,
    fontSize: isTinyScreen ? 10 : 12,
    fontWeight: '500',
    marginRight: 8,
  },
  compactRemoveButton: {
    padding: isTinyScreen ? 4 : 6,
    borderRadius: isTinyScreen ? 6 : 8,
  },
  charCount: {
    fontSize: isTinyScreen ? 10 : 11,
    fontWeight: '500',
  },
  submitSection: {
    paddingHorizontal: isTinyScreen ? 8 : 12,
    marginBottom: isTinyScreen ? 16 : 20,
  },
  submitButton: {
    borderRadius: isTinyScreen ? 8 : 10,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.3 : 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isTinyScreen ? 12 : 16,
    gap: isTinyScreen ? 6 : 8,
  },
  submitButtonText: {
    fontSize: isTinyScreen ? 14 : 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isTinyScreen ? 6 : 8,
  },
  refreshButton: {
    padding: isTinyScreen ? 6 : 8,
    borderRadius: isTinyScreen ? 8 : 10,
  },
  ticketsContainer: {
    gap: isTinyScreen ? 8 : 12,
  },
  ticketCard: {
    borderRadius: isTinyScreen ? 8 : 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  ticketGradient: {
    padding: isTinyScreen ? 10 : 12,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: isTinyScreen ? 6 : 8,
  },
  ticketIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isTinyScreen ? 6 : 8,
    position: 'relative',
  },
  ticketIdLabel: {
    fontSize: isTinyScreen ? 10 : 11,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  copyButton: {
    padding: isTinyScreen ? 4 : 6,
    borderRadius: isTinyScreen ? 6 : 8,
  },
  copiedPopup: {
    position: 'absolute',
    top: isTinyScreen ? -24 : -28,
    padding: isTinyScreen ? 4 : 6,
    borderRadius: 6,
  },
  copiedPopupText: {
    fontSize: isTinyScreen ? 10 : 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isTinyScreen ? 6 : 8,
    paddingVertical: isTinyScreen ? 4 : 6,
    borderRadius: isTinyScreen ? 10 : 12,
    borderWidth: 1,
    gap: isTinyScreen ? 4 : 6,
  },
  statusText: {
    fontSize: isTinyScreen ? 10 : 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  ticketTitle: {
    fontSize: isTinyScreen ? 13 : 15,
    fontWeight: '700',
    lineHeight: isTinyScreen ? 18 : 20,
    marginBottom: isTinyScreen ? 6 : 8,
  },
  ticketDescription: {
    fontSize: isTinyScreen ? 11 : 13,
    lineHeight: isTinyScreen ? 16 : 18,
    fontWeight: '500',
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: isTinyScreen ? 6 : 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  categoryBadge: {
    paddingHorizontal: isTinyScreen ? 6 : 8,
    paddingVertical: isTinyScreen ? 4 : 6,
    borderRadius: isTinyScreen ? 8 : 10,
  },
  categoryText: {
    fontSize: isTinyScreen ? 10 : 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  ticketMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isTinyScreen ? 4 : 6,
  },
  ticketDate: {
    fontSize: isTinyScreen ? 10 : 11,
    fontWeight: '500',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: isTinyScreen ? 10 : 12,
    borderRadius: isTinyScreen ? 8 : 10,
    borderWidth: 1,
    gap: isTinyScreen ? 6 : 8,
  },
  viewAllText: {
    fontSize: isTinyScreen ? 12 : 14,
    fontWeight: '600',
  },
  emptyTicketsContainer: {
    alignItems: 'center',
    padding: isTinyScreen ? 12 : 16,
    borderRadius: isTinyScreen ? 8 : 10,
    borderWidth: 1,
  },
  emptyTicketsText: {
    fontSize: isTinyScreen ? 12 : 14,
    textAlign: 'center',
    lineHeight: isTinyScreen ? 16 : 20,
    fontWeight: '500',
  },
  contactItems: {
    gap: isTinyScreen ? 8 : 12,
  },
  contactItemsTablet: {
    flexDirection: 'row',
    gap: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: isTinyScreen ? 8 : 12,
    borderRadius: isTinyScreen ? 8 : 10,
    borderWidth: 1,
    gap: isTinyScreen ? 6 : 8,
  },
  contactText: {
    fontSize: isTinyScreen ? 12 : 14,
    fontWeight: '600',
  },
  responseTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: isTinyScreen ? 6 : 8,
    marginTop: isTinyScreen ? 8 : 12,
  },
  responseTime: {
    fontSize: isTinyScreen ? 10 : 12,
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: isTinyScreen ? 12 : 16,
    gap: isTinyScreen ? 6 : 8,
  },
  loadingText: {
    fontSize: isTinyScreen ? 12 : 14,
    fontWeight: '500',
  },
});

export default ContactSupportScreen;