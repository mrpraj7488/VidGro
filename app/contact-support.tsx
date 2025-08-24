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
import * as Haptics from 'expo-haptics';
import ReanimatedAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isTinyScreen = screenWidth < 350;
const isSmallScreen = screenWidth < 380;
const isTablet = screenWidth >= 768;

const AnimatedTouchableOpacity = ReanimatedAnimated.createAnimatedComponent(TouchableOpacity);

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
      description: 'App crashes, bugs, errors'
    },
    { 
      id: 'payment', 
      title: 'Payment', 
      icon: CreditCard,
      color: '#4ECDC4',
      description: 'Billing and transactions'
    },
    { 
      id: 'account', 
      title: 'Account', 
      icon: User,
      color: '#45B7D1',
      description: 'Login, profile, settings'
    },
    { 
      id: 'video', 
      title: 'Videos', 
      icon: Video,
      color: '#96CEB4',
      description: 'Promotion errors'
    },
    { 
      id: 'coins', 
      title: 'Coins', 
      icon: Coins,
      color: '#FFEAA7',
      description: 'Rewards and earnings'
    },
    { 
      id: 'other', 
      title: 'Other', 
      icon: MoreHorizontal,
      color: '#DDA0DD',
      description: 'General inquiries'
    },
  ];

  const priorityLevels = [
    { 
      id: 'low', 
      title: 'Low', 
      desc: 'General questions',
      color: '#10B981',
      bgColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)'
    },
    { 
      id: 'medium', 
      title: 'Medium', 
      desc: 'Account issues',
      color: '#F59E0B',
      bgColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)'
    },
    { 
      id: 'high', 
      title: 'High', 
      desc: 'Technical problems',
      color: '#EF4444',
      bgColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)'
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
      
      // If we get a 404, the table doesn't exist
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
      withSpring(0.9, { damping: 15, stiffness: 400 }),
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
      withSpring(0.9, { damping: 15, stiffness: 400 }),
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

  const handleCategoryPress = (categoryId: string, index: number) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    categoryButtonScales[index].value = withSequence(
      withSpring(0.95, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 400 })
    );

    setSelectedCategory(categoryId);
  };

  const handlePriorityPress = (priorityId: string, index: number) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    priorityButtonScales[index].value = withSequence(
      withSpring(0.95, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 400 })
    );

    setSelectedPriority(priorityId);
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
        colors={isDark ? [colors.headerBackground, colors.surface] : ['#800080', '#800080']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={isTinyScreen ? 20 : 24} color="white" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontSize: isTinyScreen ? 18 : 22 }]}>
            Contact Support
          </Text>
          <MessageCircle size={isTinyScreen ? 20 : 24} color="white" />
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={colors.primary}
            title="Refreshing..."
            titleColor={colors.textSecondary}
          />
        }
        contentContainerStyle={[styles.scrollContent, isTablet && styles.scrollContentTablet]}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            We're here to help! Select a category and describe your issue.
          </Text>
        </Animated.View>

        {/* Category Selection Card */}
        <Animated.View 
          style={[
            styles.section,
            { backgroundColor: colors.surface },
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <LinearGradient
            colors={isDark ? ['rgba(74, 144, 226, 0.08)', 'rgba(74, 144, 226, 0.03)'] : ['rgba(128, 0, 128, 0.08)', 'rgba(128, 0, 128, 0.03)']}
            style={styles.sectionGradient}
          >
            <View style={styles.sectionHeader}>
              <HelpCircle size={isTinyScreen ? 18 : 20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Select Category <Text style={{ color: colors.error }}>*</Text>
              </Text>
            </View>
            
            <View style={[styles.categoriesGrid, isTablet && styles.categoriesGridTablet]}>
              {supportCategories.map((category, index) => {
                const IconComponent = category.icon;
                const isSelected = selectedCategory === category.id;
                
                const categoryAnimatedStyle = useAnimatedStyle(() => ({
                  transform: [{ scale: categoryButtonScales[index].value }],
                }));

                return (
                  <AnimatedTouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryCard,
                      { 
                        backgroundColor: isSelected 
                          ? category.color + '20' 
                          : colors.surface,
                        borderColor: isSelected 
                          ? category.color 
                          : colors.border,
                        borderWidth: isSelected ? 2 : 1,
                      },
                      categoryAnimatedStyle
                    ]}
                    onPress={() => handleCategoryPress(category.id, index)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={[category.color + '15', category.color + '08']}
                      style={styles.categoryIconContainer}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <IconComponent size={isTinyScreen ? 18 : 22} color={category.color} />
                    </LinearGradient>
                    <View style={styles.categoryContent}>
                      <Text style={[
                        styles.categoryTitle,
                        { 
                          color: isSelected ? category.color : colors.text,
                          fontSize: isTinyScreen ? 12 : 14
                        }
                      ]}>
                        {category.title}
                      </Text>
                      <Text style={[
                        styles.categoryDesc, 
                        { 
                          color: colors.textSecondary,
                          fontSize: isTinyScreen ? 9 : 11
                        }
                      ]}>
                        {category.description}
                      </Text>
                    </View>
                  </AnimatedTouchableOpacity>
                );
              })}
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Priority Selection Card */}
        <Animated.View 
          style={[
            styles.section,
            { backgroundColor: colors.surface },
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <LinearGradient
            colors={isDark ? ['rgba(245, 158, 11, 0.08)', 'rgba(245, 158, 11, 0.03)'] : ['rgba(245, 158, 11, 0.08)', 'rgba(245, 158, 11, 0.03)']}
            style={styles.sectionGradient}
          >
            <View style={styles.sectionHeader}>
              <AlertTriangle size={isTinyScreen ? 18 : 20} color={colors.warning} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Priority Level <Text style={{ color: colors.error }}>*</Text>
              </Text>
            </View>
            
            <View style={[styles.priorityContainer, isTablet && styles.priorityContainerTablet]}>
              {priorityLevels.map((priority, index) => {
                const isSelected = selectedPriority === priority.id;
                
                const priorityAnimatedStyle = useAnimatedStyle(() => ({
                  transform: [{ scale: priorityButtonScales[index].value }],
                }));

                return (
                  <AnimatedTouchableOpacity
                    key={priority.id}
                    style={[
                      styles.priorityButton,
                      isSelected && styles.priorityButtonSelected,
                      {
                        backgroundColor: isSelected ? priority.bgColor : colors.surface,
                        borderColor: isSelected ? priority.color : colors.border,
                      },
                      priorityAnimatedStyle
                    ]}
                    onPress={() => handlePriorityPress(priority.id, index)}
                    activeOpacity={0.8}
                  >
                    {isSelected && (
                      <LinearGradient
                        colors={[priority.bgColor, priority.bgColor + '80']}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      />
                    )}
                    <Text style={[
                      styles.priorityText,
                      { 
                        color: isSelected ? priority.color : colors.text,
                        fontSize: isTinyScreen ? 12 : 14
                      }
                    ]}>
                      {priority.title}
                    </Text>
                    <Text style={[
                      styles.priorityDesc,
                      { 
                        color: colors.textSecondary,
                        fontSize: isTinyScreen ? 9 : 11
                      }
                    ]}>
                      {priority.desc}
                    </Text>
                  </AnimatedTouchableOpacity>
                );
              })}
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Subject Input Card */}
        <Animated.View 
          style={[
            styles.section,
            { backgroundColor: colors.surface },
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <LinearGradient
            colors={isDark ? ['rgba(0, 212, 255, 0.08)', 'rgba(0, 212, 255, 0.03)'] : ['rgba(128, 0, 128, 0.08)', 'rgba(128, 0, 128, 0.03)']}
            style={styles.sectionGradient}
          >
            <View style={styles.sectionHeader}>
              <FileText size={isTinyScreen ? 18 : 20} color={colors.accent} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Subject <Text style={{ color: colors.error }}>*</Text>
              </Text>
            </View>
            
            <View style={[styles.inputContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.text, fontSize: isTinyScreen ? 13 : 15 }]}
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
        </Animated.View>

        {/* Message Input Card */}
        <Animated.View 
          style={[
            styles.section,
            { backgroundColor: colors.surface },
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <LinearGradient
            colors={isDark ? ['rgba(16, 185, 129, 0.08)', 'rgba(16, 185, 129, 0.03)'] : ['rgba(16, 185, 129, 0.08)', 'rgba(16, 185, 129, 0.03)']}
            style={styles.sectionGradient}
          >
            <View style={styles.sectionHeader}>
              <MessageSquare size={isTinyScreen ? 18 : 20} color={colors.success} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Detailed Message <Text style={{ color: colors.error }}>*</Text>
              </Text>
            </View>
            
            <View style={[styles.inputContainer, styles.messageContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, styles.messageInput, { color: colors.text, fontSize: isTinyScreen ? 13 : 15 }]}
                placeholder="Describe your issue in detail..."
                placeholderTextColor={colors.textSecondary}
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={isTinyScreen ? 4 : 6}
                textAlignVertical="top"
                maxLength={1000}
                selectionColor={colors.primary}
              />
              
              {/* Attachment Button Inside Message Box */}
              <View style={styles.messageBoxFooter}>
                <TouchableOpacity 
                  style={[styles.attachmentIconButton, {
                    backgroundColor: colors.primary + '20',
                    opacity: attachments.length >= 5 ? 0.5 : 1,
                  }]}
                  onPress={handlePickDocument}
                  disabled={uploadingFile || attachments.length >= 5}
                >
                  {uploadingFile ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Paperclip size={isTinyScreen ? 16 : 18} color={colors.primary} />
                  )}
                  {attachments.length > 0 && (
                    <View style={[styles.attachmentBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.attachmentBadgeText}>{attachments.length}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                
                <Text style={[styles.charCount, { color: colors.textSecondary }]}>
                  {message.length}/1000
                </Text>
              </View>
              
              {/* Compact Attachment List */}
              {attachments.length > 0 && (
                <View style={[styles.compactAttachmentsList, { borderTopColor: colors.border }]}>
                  {attachments.map((attachment, index) => (
                    <View key={attachment.name} style={[styles.compactAttachmentItem, { backgroundColor: colors.primary + '10' }]}>
                      <Text style={[styles.compactAttachmentName, { color: colors.text }]} numberOfLines={1}>
                        {attachment.name}
                      </Text>
                      <TouchableOpacity 
                        style={[styles.compactRemoveButton, { backgroundColor: colors.error + '20' }]}
                        onPress={() => removeAttachment(index)}
                      >
                        <X size={10} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Submit Button */}
        <AnimatedTouchableOpacity
          style={[
            styles.submitButton,
            (!selectedCategory || !subject || !message || loading) && styles.submitButtonDisabled,
            submitButtonAnimatedStyle
          ]}
          onPress={handleSubmitTicket}
          disabled={!selectedCategory || !subject || !message || loading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={(!selectedCategory || !subject || !message || loading) 
              ? [colors.border, colors.border] 
              : isDark ? [colors.primary, colors.secondary] : ['#800080', '#800080']}
            style={styles.submitButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Send size={isTinyScreen ? 16 : 20} color="white" />
            )}
            <Text style={[styles.submitButtonText, { fontSize: isTinyScreen ? 14 : 16 }]}>
              {loading ? 'Submitting...' : 'Submit Ticket'}
            </Text>
          </LinearGradient>
        </AnimatedTouchableOpacity>

        {/* Recent Tickets Card */}
        <Animated.View 
          style={[
            styles.section,
            { backgroundColor: colors.surface },
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <LinearGradient
            colors={isDark ? ['rgba(157, 78, 221, 0.08)', 'rgba(157, 78, 221, 0.03)'] : ['rgba(157, 78, 221, 0.08)', 'rgba(157, 78, 221, 0.03)']}
            style={styles.sectionGradient}
          >
            <View style={styles.recentTicketsHeader}>
              <View style={styles.recentTicketsTitle}>
                <History size={isTinyScreen ? 18 : 20} color={colors.primary} />
                <Text style={[styles.recentTicketsTitleText, { color: colors.text, fontSize: isTinyScreen ? 16 : 18 }]}>
                  Recent Tickets
                </Text>
              </View>
              <AnimatedTouchableOpacity 
                style={[styles.refreshButton, { backgroundColor: colors.primary + '20' }, refreshButtonAnimatedStyle]}
                onPress={handleManualRefresh} 
                disabled={refreshing}
              >
                <Animated.View style={{ transform: [{ rotate: spinValue }] }}>
                  <RefreshCw size={isTinyScreen ? 14 : 16} color={colors.primary} />
                </Animated.View>
              </AnimatedTouchableOpacity>
            </View>
            
            {recentTickets.length > 0 ? (
              <View style={styles.ticketsContainer}>
                {recentTickets.slice(0, 3).map((ticket) => (
                  <TouchableOpacity
                    key={ticket.id}
                    style={[styles.ticketCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => navigateToTicketDetail(ticket)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.ticketCardHeader}>
                      <View style={styles.ticketIdSection}>
                        <View style={styles.ticketIdContainer}>
                          <Text style={[styles.ticketIdLabel, { color: colors.textSecondary }]}>
                            TICKET #{ticket.id.slice(-6).toUpperCase()}
                          </Text>
                          <AnimatedTouchableOpacity 
                            style={[styles.copyButton, { backgroundColor: colors.surface, borderColor: colors.border }, copyButtonAnimatedStyle]}
                            onPress={() => copyTicketId(ticket.id)}
                          >
                            {copiedTicketId === ticket.id ? (
                              <Check size={10} color={colors.success} />
                            ) : (
                              <Copy size={10} color={colors.primary} />
                            )}
                          </AnimatedTouchableOpacity>
                        </View>
                      </View>
                      
                      <View style={styles.statusPriorityContainer}>
                        <View style={[styles.statusBadge, { 
                          backgroundColor: getStatusColor(ticket.status).bg,
                          borderColor: colors.border,
                        }]}>
                          {getStatusIcon(ticket.status)}
                          <Text style={[styles.statusText, { 
                            color: getStatusColor(ticket.status).text,
                            fontSize: isTinyScreen ? 9 : 10
                          }]}>
                            {ticket.status}
                          </Text>
                        </View>
                        <View style={[styles.priorityIndicator, { 
                          backgroundColor: getPriorityColor(ticket.priority),
                        }]} />
                      </View>
                    </View>
                    
                    <Text style={[styles.ticketTitle, { color: colors.text, fontSize: isTinyScreen ? 13 : 15 }]} numberOfLines={2}>
                      {ticket.title}
                    </Text>
                    
                    {ticket.description && (
                      <Text style={[styles.ticketDescription, { color: colors.textSecondary, fontSize: isTinyScreen ? 11 : 13 }]} numberOfLines={2}>
                        {ticket.description}
                      </Text>
                    )}
                    
                    <View style={[styles.ticketFooter, { borderTopColor: colors.border }]}>
                      <View style={styles.ticketMeta}>
                        <View style={[styles.categoryBadge, { backgroundColor: colors.primary + '15' }]}>
                          <Text style={[styles.categoryText, { color: colors.primary, fontSize: isTinyScreen ? 9 : 10 }]}>
                            {ticket.category}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Clock size={10} color={colors.textSecondary} />
                          <Text style={[styles.ticketDate, { color: colors.textSecondary, fontSize: isTinyScreen ? 10 : 11 }]}>
                            {formatRelativeTime(ticket.created_at)}
                          </Text>
                        </View>
                      </View>
                      
                      <TouchableOpacity 
                        style={[styles.viewButton, { backgroundColor: colors.primary + '15' }]}
                        onPress={() => navigateToTicketDetail(ticket)}
                      >
                        <Text style={[styles.viewButtonText, { color: colors.primary, fontSize: isTinyScreen ? 10 : 11 }]}>View</Text>
                        <ChevronRight size={12} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
                
                {recentTickets.length > 3 && (
                  <TouchableOpacity 
                    style={[styles.viewAllButton, { borderColor: colors.border, backgroundColor: colors.card }]}
                    onPress={() => {/* Navigate to all tickets */}}
                  >
                    <MessageSquare size={isTinyScreen ? 16 : 18} color={colors.primary} />
                    <Text style={[styles.viewAllText, { color: colors.primary, fontSize: isTinyScreen ? 13 : 14 }]}>
                      View All {recentTickets.length} Tickets
                    </Text>
                    <ArrowRight size={isTinyScreen ? 14 : 16} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={[styles.emptyTicketsContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <MessageCircle size={isTinyScreen ? 28 : 32} color={colors.textSecondary} style={{ opacity: 0.5 }} />
                <Text style={[styles.emptyTicketsText, { color: colors.textSecondary, fontSize: isTinyScreen ? 12 : 14 }]}>
                  No support tickets yet.{"\n"}Submit your first ticket above to get started!
                </Text>
              </View>
            )}
          </LinearGradient>
        </Animated.View>
        
        {/* Contact Info Card */}
        <View style={[styles.contactCard, { backgroundColor: colors.surface }]}>
          <LinearGradient
            colors={isDark ? ['rgba(255, 215, 0, 0.08)', 'rgba(255, 215, 0, 0.03)'] : ['rgba(255, 215, 0, 0.08)', 'rgba(255, 215, 0, 0.03)']}
            style={styles.contactGradient}
          >
            <View style={styles.contactHeader}>
              <Star size={isTinyScreen ? 18 : 20} color={colors.accent} />
              <Text style={[styles.contactTitle, { color: colors.text, fontSize: isTinyScreen ? 16 : 18 }]}>
                Quick Support
              </Text>
            </View>
            
            <View style={styles.contactItems}>
              <View style={[styles.contactItem, { backgroundColor: colors.primary + '10' }]}>
                <Mail size={isTinyScreen ? 16 : 18} color={colors.primary} />
                <Text style={[styles.contactText, { color: colors.text, fontSize: isTinyScreen ? 12 : 14 }]}>
                  support@vidgro.com
                </Text>
              </View>
              
              <View style={[styles.contactItem, { backgroundColor: colors.primary + '10' }]}>
                <Phone size={isTinyScreen ? 16 : 18} color={colors.primary} />
                <Text style={[styles.contactText, { color: colors.text, fontSize: isTinyScreen ? 12 : 14 }]}>
                  +1 (555) 123-4567
                </Text>
              </View>
            </View>
            
            <View style={[styles.responseTimeContainer, { borderTopColor: colors.border }]}>
              <Clock size={isTinyScreen ? 12 : 14} color={colors.textSecondary} />
              <Text style={[styles.responseTime, { color: colors.textSecondary, fontSize: isTinyScreen ? 11 : 12 }]}>
                Average response: 2-4 hours
              </Text>
            </View>
          </LinearGradient>
        </View>
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
    paddingBottom: isTinyScreen ? 10 : 14,
    paddingHorizontal: isTinyScreen ? 16 : 20,
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
    height: isTinyScreen ? 36 : 44,
  },
  backButton: {
    padding: isTinyScreen ? 4 : 6,
    width: isTinyScreen ? 32 : 40,
    height: isTinyScreen ? 32 : 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: isTinyScreen ? 16 : 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerTitle: {
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: isTinyScreen ? 12 : 16,
    paddingVertical: isTinyScreen ? 16 : 20,
    paddingBottom: isTinyScreen ? 32 : 40,
  },
  scrollContentTablet: {
    paddingHorizontal: 40,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  subtitle: {
    fontSize: isTinyScreen ? 13 : 15,
    textAlign: 'center',
    marginBottom: isTinyScreen ? 20 : 24,
    lineHeight: isTinyScreen ? 18 : 22,
    fontWeight: '500',
    paddingHorizontal: isTinyScreen ? 8 : 12,
  },

  // Section Cards
  section: {
    marginBottom: isTinyScreen ? 16 : 20,
    borderRadius: isTinyScreen ? 16 : 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
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
    marginBottom: isTinyScreen ? 12 : 16,
    gap: isTinyScreen ? 6 : 8,
  },
  sectionTitle: {
    fontSize: isTinyScreen ? 14 : 16,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },

  // Category Grid
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isTinyScreen ? 8 : 10,
  },
  categoriesGridTablet: {
    gap: 12,
  },
  categoryCard: {
    width: isTinyScreen ? (screenWidth - 56) / 2 : (screenWidth - 60) / 2,
    padding: isTinyScreen ? 12 : 16,
    borderRadius: isTinyScreen ? 12 : 16,
    alignItems: 'center',
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
  categoryIconContainer: {
    width: isTinyScreen ? 36 : 44,
    height: isTinyScreen ? 36 : 44,
    borderRadius: isTinyScreen ? 18 : 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: isTinyScreen ? 8 : 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  categoryContent: {
    alignItems: 'center',
  },
  categoryTitle: {
    fontWeight: 'bold',
    marginBottom: isTinyScreen ? 2 : 4,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  categoryDesc: {
    textAlign: 'center',
    lineHeight: isTinyScreen ? 12 : 14,
    fontWeight: '500',
  },

  // Priority Selection
  priorityContainer: {
    flexDirection: 'row',
    gap: isTinyScreen ? 6 : 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  priorityContainerTablet: {
    gap: 12,
  },
  priorityButton: {
    flex: 1,
    minWidth: isTinyScreen ? 80 : 90,
    padding: isTinyScreen ? 12 : 16,
    borderRadius: isTinyScreen ? 12 : 16,
    alignItems: 'center',
    borderWidth: 2,
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
  priorityButtonSelected: {
    transform: [{ scale: 1.02 }],
  },
  priorityText: {
    fontWeight: 'bold',
    marginBottom: isTinyScreen ? 2 : 4,
    letterSpacing: 0.3,
  },
  priorityDesc: {
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: isTinyScreen ? 12 : 14,
  },

  // Input Components
  inputContainer: {
    borderRadius: isTinyScreen ? 12 : 14,
    borderWidth: 1,
    marginBottom: isTinyScreen ? 6 : 8,
    overflow: 'hidden',
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
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  input: {
    paddingHorizontal: isTinyScreen ? 12 : 16,
    paddingVertical: isTinyScreen ? 10 : 12,
    fontWeight: '500',
  },
  messageContainer: {
    minHeight: isTinyScreen ? 120 : 140,
    paddingBottom: isTinyScreen ? 6 : 8,
  },
  messageInput: {
    paddingTop: isTinyScreen ? 10 : 12,
    minHeight: isTinyScreen ? 100 : 120,
    textAlignVertical: 'top',
  },
  messageBoxFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: isTinyScreen ? 6 : 8,
    paddingHorizontal: 4,
  },
  attachmentIconButton: {
    position: 'relative',
    padding: isTinyScreen ? 6 : 8,
    borderRadius: isTinyScreen ? 16 : 20,
  },
  attachmentBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    borderRadius: 8,
    minWidth: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentBadgeText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  compactAttachmentsList: {
    marginTop: isTinyScreen ? 6 : 8,
    paddingTop: isTinyScreen ? 6 : 8,
    borderTopWidth: 1,
  },
  compactAttachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: isTinyScreen ? 3 : 4,
    paddingHorizontal: isTinyScreen ? 6 : 8,
    marginBottom: isTinyScreen ? 3 : 4,
    borderRadius: isTinyScreen ? 6 : 8,
  },
  compactAttachmentName: {
    flex: 1,
    fontSize: isTinyScreen ? 10 : 12,
    fontWeight: '500',
  },
  compactRemoveButton: {
    padding: isTinyScreen ? 3 : 4,
    borderRadius: isTinyScreen ? 8 : 10,
  },
  charCount: {
    fontSize: isTinyScreen ? 10 : 12,
    fontWeight: '500',
  },

  // Submit Button
  submitButton: {
    borderRadius: isTinyScreen ? 14 : 16,
    marginBottom: isTinyScreen ? 20 : 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isTinyScreen ? 14 : 16,
    gap: isTinyScreen ? 6 : 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  // Recent Tickets
  recentTicketsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: isTinyScreen ? 6 : 8,
    marginBottom: isTinyScreen ? 12 : 16,
  },
  recentTicketsTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isTinyScreen ? 6 : 8,
  },
  recentTicketsTitleText: {
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  refreshButton: {
    padding: isTinyScreen ? 6 : 8,
    borderRadius: isTinyScreen ? 16 : 20,
  },
  ticketsContainer: {
    gap: isTinyScreen ? 10 : 12,
  },
  ticketCard: {
    borderRadius: isTinyScreen ? 12 : 16,
    padding: isTinyScreen ? 14 : 18,
    marginBottom: isTinyScreen ? 10 : 12,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 3px 8px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  ticketCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: isTinyScreen ? 8 : 12,
  },
  ticketIdSection: {
    flex: 1,
  },
  ticketIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isTinyScreen ? 6 : 8,
    marginBottom: isTinyScreen ? 4 : 6,
  },
  ticketIdLabel: {
    fontSize: isTinyScreen ? 9 : 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  copyButton: {
    padding: isTinyScreen ? 4 : 6,
    borderRadius: isTinyScreen ? 4 : 6,
    borderWidth: 1,
  },
  statusPriorityContainer: {
    alignItems: 'flex-end',
    gap: isTinyScreen ? 6 : 8,
  },
  statusBadge: {
    paddingHorizontal: isTinyScreen ? 8 : 10,
    paddingVertical: isTinyScreen ? 4 : 6,
    borderRadius: isTinyScreen ? 12 : 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: isTinyScreen ? 3 : 4,
    borderWidth: 1,
  },
  statusText: {
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  priorityIndicator: {
    width: isTinyScreen ? 10 : 12,
    height: isTinyScreen ? 10 : 12,
    borderRadius: isTinyScreen ? 5 : 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  ticketTitle: {
    fontWeight: '600',
    lineHeight: isTinyScreen ? 18 : 20,
    marginBottom: isTinyScreen ? 6 : 8,
    letterSpacing: 0.2,
  },
  ticketDescription: {
    lineHeight: isTinyScreen ? 16 : 18,
    marginBottom: isTinyScreen ? 12 : 16,
    opacity: 0.8,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: isTinyScreen ? 8 : 12,
    borderTopWidth: 1,
  },
  ticketMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isTinyScreen ? 6 : 8,
  },
  categoryBadge: {
    paddingHorizontal: isTinyScreen ? 6 : 8,
    paddingVertical: isTinyScreen ? 3 : 4,
    borderRadius: isTinyScreen ? 8 : 10,
  },
  categoryText: {
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  ticketDate: {
    fontWeight: '500',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isTinyScreen ? 3 : 4,
    paddingHorizontal: isTinyScreen ? 8 : 10,
    paddingVertical: isTinyScreen ? 4 : 6,
    borderRadius: isTinyScreen ? 12 : 14,
  },
  viewButtonText: {
    fontWeight: '600',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: isTinyScreen ? 12 : 14,
    borderRadius: isTinyScreen ? 10 : 12,
    gap: isTinyScreen ? 6 : 8,
    marginTop: isTinyScreen ? 6 : 8,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  viewAllText: {
    fontWeight: '600',
  },
  emptyTicketsContainer: {
    alignItems: 'center',
    padding: isTinyScreen ? 24 : 32,
    borderRadius: isTinyScreen ? 12 : 16,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyTicketsText: {
    textAlign: 'center',
    marginTop: isTinyScreen ? 8 : 12,
    lineHeight: isTinyScreen ? 16 : 18,
    fontWeight: '500',
  },

  // Contact Card
  contactCard: {
    margin: isTinyScreen ? 0 : 0,
    marginBottom: isTinyScreen ? 16 : 20,
    borderRadius: isTinyScreen ? 16 : 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
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
  contactGradient: {
    padding: isTinyScreen ? 16 : 20,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: isTinyScreen ? 6 : 8,
    marginBottom: isTinyScreen ? 16 : 20,
  },
  contactTitle: {
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  contactItems: {
    gap: isTinyScreen ? 12 : 16,
    alignItems: 'center',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: isTinyScreen ? 8 : 10,
    paddingVertical: isTinyScreen ? 8 : 10,
    paddingHorizontal: isTinyScreen ? 12 : 16,
    width: '100%',
    borderRadius: isTinyScreen ? 8 : 10,
  },
  contactText: {
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  responseTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: isTinyScreen ? 6 : 8,
    marginTop: isTinyScreen ? 12 : 16,
    paddingTop: isTinyScreen ? 12 : 16,
    borderTopWidth: 1,
  },
  responseTime: {
    fontWeight: '500',
  },
});

export default ContactSupportScreen;