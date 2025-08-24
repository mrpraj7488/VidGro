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

const AnimatedTouchableOpacity = AnimatedComponent.createAnimatedComponent(TouchableOpacity);

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
      
      // First, try to fetch a single ticket to check if the table exists
      const { data, error, status } = await supabase
        .from('support_tickets')
        .select('id')
        .eq('reported_by', user.id)
        .limit(1);
      
      // If we get a 406, the table doesn't exist
      if (status === 406 || (error && error.code === '42P01')) {
        console.log('Support tickets table does not exist or is not accessible');
        setRecentTickets([]);
        return;
      }
      
      // Now fetch the actual tickets we want to display
      const { data: tickets, error: fetchError } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('reported_by', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      console.log('Tickets fetch status:', status);
      
      if (fetchError) {
        console.error('Supabase error:', fetchError);
        // Don't throw here, just show an empty state
        setRecentTickets([]);
        return;
      }
      
      console.log('Fetched tickets:', tickets);
      setRecentTickets(tickets || []);
      
      // If no tickets, show a helpful message
      if (!tickets || tickets.length === 0) {
        console.log('No tickets found for user');
      }
    } catch (error: any) {
      console.error('Error loading tickets:', error);
      setRecentTickets([]);
      // Only show error if it's not a 404 (table doesn't exist)
      if (error.code !== '42P01') { // 42P01 is the code for "relation does not exist"
        showError('Error', 'Failed to load recent tickets. Please check your connection and try again.');
      }
    } finally {
      setLoadingTickets(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    // Animate refresh icon
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
      return; // Silently prevent adding more files
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf', 'text/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        
        // Check file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          return; // Silently reject large files
        }

        // Add to attachments
        setAttachments([...attachments, {
          name: file.name,
          size: file.size,
          uri: file.uri,
          mimeType: file.mimeType || 'application/octet-stream'
        }]);
      }
    } catch (error) {
      console.error('Document picker error:', error);
      // Silently handle error
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
      return; // Form validation handled by UI state
    }

    if (!user?.id) {
      return; // Auth handled elsewhere
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
      // Upload attachments if any
      let attachmentData = [];
      if (attachments.length > 0) {
        try {
          // Ensure storage bucket exists
          await FileUploadService.ensureBucketExists();
          
          // Generate temporary ticket ID for file organization
          const tempTicketId = `temp_${Date.now()}`;
          
          // Upload files
          const uploadedFiles = await FileUploadService.uploadMultipleFiles(
            attachments,
            tempTicketId,
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

      // Move uploaded files to correct ticket folder if needed
      if (attachments.length > 0 && data?.id) {
        // Files are already uploaded with correct structure
        console.log('Ticket created with attachments:', data.id);
      }

      // Reset form and reload tickets seamlessly
      setSubject('');
      setMessage('');
      setSelectedCategory('');
      setSelectedPriority('medium');
      setAttachments([]);
      loadRecentTickets();
      
      // Navigate to ticket detail automatically
      router.push(`/ticket-detail?id=${data.id}`);
      
    } catch (error) {
      console.error('Submit error:', error);
      // Only show error for critical failures
      showError('Error', 'Failed to submit ticket. Please try again.');
    } finally {
      setLoading(false);
      setUploadingFile(false);
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'active': return <AlertCircle size={16} color="#3498DB" />;
      case 'pending': return <Clock size={16} color="#F39C12" />;
      case 'answered': return <MessageSquare size={16} color="#800080" />;
      case 'completed': return <CheckCircle size={16} color="#27AE60" />;
      case 'closed': return <XCircle size={16} color="#95A5A6" />;
      default: return <HelpCircle size={16} color="#95A5A6" />;
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
    // Seamless refresh without popup
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
      {/* Enhanced Header */}
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
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isTinyScreen && styles.headerTitleSmall]}>
            Contact Support
          </Text>
          <MessageCircle size={24} color="white" />
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
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <LinearGradient
              colors={isDark ? ['rgba(74, 144, 226, 0.1)', 'rgba(74, 144, 226, 0.05)'] : ['rgba(128, 0, 128, 0.1)', 'rgba(128, 0, 128, 0.05)']}
              style={styles.sectionGradient}
            >
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  🎯 Select Category
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
                          backgroundColor: selectedCategory === category.id 
                            ? category.color + '20' 
                            : colors.card,
                          borderColor: selectedCategory === category.id 
                            ? category.color 
                            : colors.border,
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
                          <category.icon size={isTinyScreen ? 20 : 24} color={category.color} />
                        </View>
                        <Text style={[
                          styles.categoryTitle,
                          { 
                            color: selectedCategory === category.id ? category.color : colors.text,
                            fontSize: isTinyScreen ? 14 : 16
                          }
                        ]}>
                          {category.title}
                        </Text>
                        <Text style={[
                          styles.categoryDesc,
                          { 
                            color: selectedCategory === category.id ? category.color : colors.textSecondary,
                            fontSize: isTinyScreen ? 11 : 13
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
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <LinearGradient
              colors={isDark ? ['rgba(245, 158, 11, 0.1)', 'rgba(245, 158, 11, 0.05)'] : ['rgba(245, 158, 11, 0.1)', 'rgba(245, 158, 11, 0.05)']}
              style={styles.sectionGradient}
            >
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  🔹 Priority Level
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
                          backgroundColor: selectedPriority === priority.id 
                            ? priority.bgColor 
                            : colors.card,
                          borderColor: selectedPriority === priority.id 
                            ? priority.color 
                            : colors.border,
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
                            fontSize: isTinyScreen ? 14 : 16
                          }
                        ]}>
                          {priority.title}
                        </Text>
                        <Text style={[
                          styles.priorityDesc,
                          { 
                            color: selectedPriority === priority.id ? priority.color : colors.textSecondary,
                            fontSize: isTinyScreen ? 11 : 13
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
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <LinearGradient
              colors={isDark ? ['rgba(74, 144, 226, 0.1)', 'rgba(74, 144, 226, 0.05)'] : ['rgba(128, 0, 128, 0.1)', 'rgba(128, 0, 128, 0.05)']}
              style={styles.sectionGradient}
            >
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  📝 Subject
                </Text>
              </View>
              <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Enter subject..."
                  placeholderTextColor={colors.textSecondary}
                  value={subject}
                  onChangeText={setSubject}
                  maxLength={100}
                />
              </View>
              <Text style={[styles.charCount, { color: colors.textSecondary }]}>
                {subject.length}/100
              </Text>
            </LinearGradient>
          </View>

          {/* Message Input */}
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <LinearGradient
              colors={isDark ? ['rgba(74, 144, 226, 0.1)', 'rgba(74, 144, 226, 0.05)'] : ['rgba(128, 0, 128, 0.1)', 'rgba(128, 0, 128, 0.05)']}
              style={styles.sectionGradient}
            >
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  💬 Message
                </Text>
              </View>
              <View style={[styles.inputContainer, styles.messageContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.input, styles.messageInput, { color: colors.text }]}
                  placeholder="Describe your issue..."
                  placeholderTextColor={colors.textSecondary}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  maxLength={1000}
                  textAlignVertical="top"
                />
              </View>
              <View style={styles.messageFooter}>
                <Text style={[styles.charCount, { color: colors.textSecondary }]}>
                  {message.length}/1000
                </Text>
                <TouchableOpacity 
                  style={[styles.attachmentButton, { backgroundColor: colors.primary + '20' }]} 
                  onPress={handlePickDocument}
                  disabled={attachments.length >= 5}
                >
                  <Paperclip size={isTinyScreen ? 16 : 18} color={colors.primary} />
                  <Text style={[styles.attachmentButtonText, { color: colors.primary }]}>
                    Attach ({attachments.length}/5)
                  </Text>
                </TouchableOpacity>
              </View>
              
              {/* Attachments Preview */}
              {attachments.length > 0 && (
                <View style={styles.attachmentsContainer}>
                  {attachments.map((att, index) => (
                    <View key={index} style={[styles.attachmentItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <FileText size={isTinyScreen ? 14 : 16} color={colors.primary} />
                      <Text style={[styles.attachmentName, { color: colors.text }]} numberOfLines={1}>
                        {att.name}
                      </Text>
                      <Text style={[styles.attachmentSize, { color: colors.textSecondary }]}>
                        {formatFileSize(att.size)}
                      </Text>
                      <TouchableOpacity 
                        style={styles.removeButton} 
                        onPress={() => removeAttachment(index)}
                      >
                        <X size={isTinyScreen ? 16 : 18} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </LinearGradient>
          </View>

          {/* Submit Button */}
          <View style={styles.submitSection}>
            <AnimatedTouchableOpacity 
              style={[
                styles.submitButton, 
                (!selectedCategory || !subject || !message || loading) && styles.buttonDisabled,
                submitButtonAnimatedStyle
              ]} 
              onPress={handleSubmitTicket}
              disabled={!selectedCategory || !subject || !message || loading}
            >
              <LinearGradient
                colors={(!selectedCategory || !subject || !message || loading) 
                  ? ['#808080', '#808080'] 
                  : isDark 
                    ? ['#4A90E2', '#6366F1'] 
                    : ['#800080', '#9932CC']
                }
                style={styles.submitButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Send size={isTinyScreen ? 18 : 20} color="white" />
                )}
                <Text style={[styles.submitButtonText, { fontSize: isTinyScreen ? 14 : 16 }]}>
                  {loading ? 'Submitting...' : 'Submit Ticket'}
                </Text>
              </LinearGradient>
            </AnimatedTouchableOpacity>
          </View>

          {/* Recent Tickets */}
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <LinearGradient
              colors={isDark ? ['rgba(0, 212, 255, 0.1)', 'rgba(0, 212, 255, 0.05)'] : ['rgba(0, 212, 255, 0.1)', 'rgba(0, 212, 255, 0.05)']}
              style={styles.sectionGradient}
            >
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <History size={isTinyScreen ? 18 : 20} color={colors.accent} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Tickets</Text>
                </View>
                <AnimatedTouchableOpacity 
                  style={[styles.refreshButton, { backgroundColor: colors.primary + '20' }, refreshButtonAnimatedStyle]}
                  onPress={handleManualRefresh}
                >
                  <Animated.View style={{ transform: [{ rotate: spinValue }] }}>
                    <RefreshCw size={isTinyScreen ? 16 : 18} color={colors.primary} />
                  </Animated.View>
                </AnimatedTouchableOpacity>
              </View>
              
              {loadingTickets ? (
                <View style={styles.loadingTickets}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.loadingTicketsText, { color: colors.textSecondary }]}>
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
                          colors={[statusColors.bg, 'transparent']}
                          style={styles.ticketGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <View style={styles.ticketHeader}>
                            <View style={styles.ticketTitleRow}>
                              <Text style={[styles.ticketTitle, { color: colors.text }]} numberOfLines={1}>
                                {ticket.title}
                              </Text>
                              <View style={styles.ticketActions}>
                                <View style={styles.copyButtonContainer}>
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
                                    <View style={[styles.successIndicator, { backgroundColor: colors.success + '90' }]}>
                                      <Text style={styles.successText}>Copied!</Text>
                                    </View>
                                  )}
                                </View>
                                <ChevronRight size={isTinyScreen ? 16 : 18} color={colors.textSecondary} />
                              </View>
                            </View>
                            <View style={styles.ticketMeta}>
                              <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                                {getStatusIcon(ticket.status)}
                                <Text style={[styles.statusText, { color: statusColors.text }]}>
                                  {ticket.status.toUpperCase()}
                                </Text>
                              </View>
                              <Text style={[styles.ticketDate, { color: colors.textSecondary }]}>
                                {formatRelativeTime(ticket.created_at)}
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.ticketDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                            {ticket.description}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    );
                  })}
                  
                  {recentTickets.length > 3 && (
                    <TouchableOpacity
                      style={[styles.viewMoreButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => setShowRecentTickets(!showRecentTickets)}
                    >
                      <Text style={[styles.viewMoreText, { color: colors.primary }]}>
                        {showRecentTickets 
                          ? 'Show Less' 
                          : `View ${recentTickets.length - 3} More Tickets`
                        }
                      </Text>
                      {showRecentTickets ? (
                        <ChevronUp size={16} color={colors.primary} />
                      ) : (
                        <ChevronDown size={16} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View style={styles.emptyTickets}>
                  <MessageCircle size={isTinyScreen ? 32 : 40} color={colors.textSecondary} />
                  <Text style={[styles.emptyTicketsTitle, { color: colors.text }]}>No tickets yet</Text>
                  <Text style={[styles.emptyTicketsText, { color: colors.textSecondary }]}>
                    Your support tickets will appear here
                  </Text>
                </View>
              )}
            </LinearGradient>
          </View>

          {/* Contact Info */}
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <LinearGradient
              colors={isDark ? ['rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0.05)'] : ['rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0.05)']}
              style={styles.sectionGradient}
            >
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  📞 Other Ways to Reach Us
                </Text>
              </View>
              
              <View style={[styles.contactGrid, isTablet && styles.contactGridTablet]}>
                <View style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.contactIconContainer, { backgroundColor: '#4ECDC4' + '20' }]}>
                    <Mail size={isTinyScreen ? 20 : 24} color="#4ECDC4" />
                  </View>
                  <Text style={[styles.contactTitle, { color: colors.text }]}>Email</Text>
                  <Text style={[styles.contactText, { color: colors.textSecondary }]}>
                    support@vidgro.com
                  </Text>
                  <Text style={[styles.contactSubtext, { color: colors.textSecondary }]}>
                    24-48 hour response
                  </Text>
                </View>

                <View style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.contactIconContainer, { backgroundColor: '#45B7D1' + '20' }]}>
                    <Phone size={isTinyScreen ? 20 : 24} color="#45B7D1" />
                  </View>
                  <Text style={[styles.contactTitle, { color: colors.text }]}>Phone</Text>
                  <Text style={[styles.contactText, { color: colors.textSecondary }]}>
                    +1 (555) 123-4567
                  </Text>
                  <Text style={[styles.contactSubtext, { color: colors.textSecondary }]}>
                    Mon-Fri 9AM-6PM EST
                  </Text>
                </View>
              </View>

              <View style={[styles.helpSection, { backgroundColor: colors.success + '15' }]}>
                <View style={styles.helpHeader}>
                  <HelpCircle size={isTinyScreen ? 18 : 20} color={colors.success} />
                  <Text style={[styles.helpTitle, { color: colors.success }]}>
                    💡 Quick Help
                  </Text>
                </View>
                <Text style={[styles.helpText, { color: colors.success }]}>
                  • Check our FAQ section first for instant answers
                  {'\n'}• Include screenshots for visual issues
                  {'\n'}• Mention your device model and app version
                  {'\n'}• VIP members get priority support
                </Text>
              </View>
            </LinearGradient>
          </View>
        </Animated.View>
      </ScrollView>
      
      <CustomAlert {...alertProps} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    color: 'white',
  },
  headerTitleSmall: {
    fontSize: 18,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  scrollContentTablet: {
    paddingHorizontal: 40,
    paddingBottom: 60,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  subtitleSection: {
    paddingHorizontal: isTinyScreen ? 16 : 20,
    paddingVertical: isTinyScreen ? 16 : 20,
  },
  subtitle: {
    fontSize: isTinyScreen ? 14 : 16,
    textAlign: 'center',
    lineHeight: isTinyScreen ? 20 : 24,
    letterSpacing: 0.3,
  },
  section: {
    marginHorizontal: isTinyScreen ? 12 : 16,
    marginBottom: isTinyScreen ? 16 : 20,
    borderRadius: isTinyScreen ? 16 : 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  sectionGradient: {
    padding: isTinyScreen ? 16 : 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: isTinyScreen ? 12 : 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: isTinyScreen ? 16 : 18,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  refreshButton: {
    padding: isTinyScreen ? 6 : 8,
    borderRadius: isTinyScreen ? 12 : 14,
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

  // Categories Grid
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isTinyScreen ? 8 : 12,
  },
  categoriesGridTablet: {
    gap: 16,
  },
  categoryCard: {
    width: isTablet ? '30%' : (isTinyScreen ? '47%' : '48%'),
    borderRadius: isTinyScreen ? 12 : 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 3px 8px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  categoryCardTablet: {
    width: '30%',
  },
  categoryGradient: {
    padding: isTinyScreen ? 12 : 16,
    alignItems: 'center',
    minHeight: isTinyScreen ? 100 : 120,
    justifyContent: 'center',
  },
  categoryIconContainer: {
    width: isTinyScreen ? 40 : 48,
    height: isTinyScreen ? 40 : 48,
    borderRadius: isTinyScreen ? 20 : 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: isTinyScreen ? 8 : 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  categoryTitle: {
    fontWeight: 'bold',
    marginBottom: isTinyScreen ? 4 : 6,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  categoryDesc: {
    textAlign: 'center',
    lineHeight: isTinyScreen ? 16 : 18,
    fontWeight: '500',
  },

  // Priority Selection
  priorityContainer: {
    gap: isTinyScreen ? 8 : 12,
  },
  priorityContainerTablet: {
    flexDirection: 'row',
    gap: 16,
  },
  priorityButton: {
    borderRadius: isTinyScreen ? 12 : 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 3px 8px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  priorityButtonTablet: {
    flex: 1,
  },
  priorityGradient: {
    padding: isTinyScreen ? 16 : 20,
    alignItems: 'center',
  },
  priorityTitle: {
    fontWeight: 'bold',
    marginBottom: isTinyScreen ? 4 : 6,
    letterSpacing: 0.3,
  },
  priorityDesc: {
    textAlign: 'center',
    lineHeight: isTinyScreen ? 16 : 18,
    fontWeight: '500',
  },

  // Input Sections
  inputContainer: {
    borderRadius: isTinyScreen ? 12 : 16,
    borderWidth: 1,
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
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  input: {
    paddingHorizontal: isTinyScreen ? 16 : 20,
    paddingVertical: isTinyScreen ? 14 : 18,
    fontSize: isTinyScreen ? 14 : 16,
  },
  messageContainer: {
    minHeight: isTinyScreen ? 120 : 140,
  },
  messageInput: {
    minHeight: isTinyScreen ? 100 : 120,
    textAlignVertical: 'top',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: isTinyScreen ? 8 : 12,
  },
  charCount: {
    fontSize: isTinyScreen ? 11 : 12,
    fontWeight: '500',
  },
  attachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isTinyScreen ? 12 : 16,
    paddingVertical: isTinyScreen ? 8 : 10,
    borderRadius: isTinyScreen ? 12 : 14,
    gap: isTinyScreen ? 6 : 8,
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
  attachmentButtonText: {
    fontSize: isTinyScreen ? 12 : 14,
    fontWeight: '600',
  },
  attachmentsContainer: {
    marginTop: isTinyScreen ? 12 : 16,
    gap: isTinyScreen ? 8 : 10,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: isTinyScreen ? 8 : 10,
    padding: isTinyScreen ? 10 : 12,
    borderWidth: 1,
    gap: isTinyScreen ? 8 : 10,
  },
  attachmentName: {
    flex: 1,
    fontSize: isTinyScreen ? 12 : 14,
    fontWeight: '500',
  },
  attachmentSize: {
    fontSize: isTinyScreen ? 10 : 11,
    fontWeight: '500',
  },
  removeButton: {
    padding: isTinyScreen ? 4 : 6,
    borderRadius: isTinyScreen ? 6 : 8,
  },

  // Submit Button
  submitSection: {
    paddingHorizontal: isTinyScreen ? 12 : 16,
    marginBottom: isTinyScreen ? 20 : 24,
  },
  submitButton: {
    borderRadius: isTinyScreen ? 12 : 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.3)',
      },
    }),
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isTinyScreen ? 14 : 18,
    gap: isTinyScreen ? 8 : 10,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // Recent Tickets
  loadingTickets: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isTinyScreen ? 20 : 24,
    gap: 8,
  },
  loadingTicketsText: {
    fontSize: isTinyScreen ? 14 : 16,
    fontWeight: '500',
  },
  ticketsContainer: {
    gap: isTinyScreen ? 12 : 16,
  },
  ticketCard: {
    borderRadius: isTinyScreen ? 12 : 16,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 3px 8px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  ticketGradient: {
    padding: isTinyScreen ? 14 : 18,
  },
  ticketHeader: {
    marginBottom: isTinyScreen ? 8 : 12,
  },
  ticketTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: isTinyScreen ? 6 : 8,
  },
  ticketTitle: {
    fontSize: isTinyScreen ? 14 : 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 12,
    letterSpacing: 0.3,
  },
  ticketActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  copyButtonContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  copyButton: {
    padding: isTinyScreen ? 6 : 8,
    borderRadius: isTinyScreen ? 8 : 10,
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
  successIndicator: {
    position: 'absolute',
    top: -30,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  successText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  ticketMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isTinyScreen ? 8 : 10,
    paddingVertical: isTinyScreen ? 4 : 6,
    borderRadius: isTinyScreen ? 12 : 16,
    gap: 4,
  },
  statusText: {
    fontSize: isTinyScreen ? 10 : 11,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  ticketDate: {
    fontSize: isTinyScreen ? 11 : 12,
    fontWeight: '500',
  },
  ticketDescription: {
    fontSize: isTinyScreen ? 12 : 14,
    lineHeight: isTinyScreen ? 16 : 20,
    fontWeight: '500',
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isTinyScreen ? 12 : 16,
    borderRadius: isTinyScreen ? 12 : 16,
    borderWidth: 1,
    gap: 8,
    marginTop: isTinyScreen ? 8 : 12,
  },
  viewMoreText: {
    fontSize: isTinyScreen ? 14 : 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  emptyTickets: {
    alignItems: 'center',
    paddingVertical: isTinyScreen ? 24 : 32,
    gap: isTinyScreen ? 8 : 12,
  },
  emptyTicketsTitle: {
    fontSize: isTinyScreen ? 16 : 18,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  emptyTicketsText: {
    fontSize: isTinyScreen ? 12 : 14,
    textAlign: 'center',
    lineHeight: isTinyScreen ? 16 : 20,
    fontWeight: '500',
  },

  // Contact Info
  contactGrid: {
    gap: isTinyScreen ? 12 : 16,
    marginBottom: isTinyScreen ? 16 : 20,
  },
  contactGridTablet: {
    flexDirection: 'row',
    gap: 20,
  },
  contactCard: {
    borderRadius: isTinyScreen ? 12 : 16,
    padding: isTinyScreen ? 16 : 20,
    alignItems: 'center',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 3px 8px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  contactIconContainer: {
    width: isTinyScreen ? 48 : 56,
    height: isTinyScreen ? 48 : 56,
    borderRadius: isTinyScreen ? 24 : 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: isTinyScreen ? 12 : 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  contactTitle: {
    fontSize: isTinyScreen ? 16 : 18,
    fontWeight: 'bold',
    marginBottom: isTinyScreen ? 4 : 6,
    letterSpacing: 0.3,
  },
  contactText: {
    fontSize: isTinyScreen ? 13 : 14,
    fontWeight: '600',
    marginBottom: isTinyScreen ? 4 : 6,
    textAlign: 'center',
  },
  contactSubtext: {
    fontSize: isTinyScreen ? 11 : 12,
    textAlign: 'center',
    fontWeight: '500',
  },

  // Help Section
  helpSection: {
    borderRadius: isTinyScreen ? 12 : 16,
    padding: isTinyScreen ? 16 : 20,
  },
  helpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: isTinyScreen ? 8 : 12,
    gap: 8,
  },
  helpTitle: {
    fontSize: isTinyScreen ? 14 : 16,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  helpText: {
    fontSize: isTinyScreen ? 12 : 14,
    lineHeight: isTinyScreen ? 18 : 22,
    fontWeight: '500',
  },
});

export default ContactSupportScreen;