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
  Clipboard,
  RefreshControl,
  Alert
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, MessageCircle, Send, Phone, Mail, CircleHelp as HelpCircle, CircleAlert as AlertCircle, CreditCard, User, Video, Coins, MoveHorizontal as MoreHorizontal, ChevronDown, ChevronUp, Clock, CircleCheck as CheckCircle, CircleX as XCircle, TriangleAlert as AlertTriangle, Star, Copy, Paperclip, X, FileText, Image, RefreshCw, MessageSquare, Check, History, ChevronRight, ArrowRight } from 'lucide-react-native';
import { getSupabase } from '@/lib/supabase';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import CustomAlert from '@/components/CustomAlert';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import FileUploadService from '@/services/FileUploadService';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isTinyScreen = screenWidth < 350;
const isSmallScreen = screenWidth < 380;
const isTablet = screenWidth >= 768;

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

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
  const categoryButtonScales = useRef(supportCategories.map(() => useSharedValue(1))).current;
  const priorityButtonScales = useRef(priorityLevels.map(() => useSharedValue(1))).current;
  const copyButtonScales = useRef([]).current; // We'll push to this for each ticket
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
      case 'active': return <AlertCircle size={isTinyScreen ? 14 : 16} color="#3498DB" />;
      case 'pending': return <Clock size={isTinyScreen ? 14 : 16} color="#F39C12" />;
      case 'answered': return <MessageSquare size={isTinyScreen ? 14 : 16} color="#800080" />;
      case 'completed': return <CheckCircle size={isTinyScreen ? 14 : 16} color="#27AE60" />;
      case 'closed': return <XCircle size={isTinyScreen ? 14 : 16} color="#95A5A6" />;
      default: return <HelpCircle size={isTinyScreen ? 14 : 16} color="#95A5A6" />;
    }
  };

  const getStatusColor = (status) => {
    const baseColors = {
      'active': { bg: '#EBF8FF', text: '#2563EB' },
      'pending': { bg: '#FEF3C7', text: '#D97706' },
      'answered': { bg: '#D1FAE5', text: '#059669' },
      'completed': { bg: '#F3E8FF', text: '#7C3AED' },
      'closed': { bg: '#F3F4F6', text: '#6B7280' }
    };
    const colors = baseColors[status] || baseColors.active;
    return isDark ? {
      bg: `rgba(${hexToRgb(colors.bg)}, 0.2)`,
      text: lighten(colors.text, 0.3) // For better contrast in dark mode
    } : colors;
  };

  // Helper functions for color adjustment
  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 0, 0';
  }

  function lighten(hex, amount) {
    let color = hex.replace('#', '');
    let r = parseInt(color.substr(0,2), 16);
    let g = parseInt(color.substr(2,2), 16);
    let b = parseInt(color.substr(4,2), 16);
    r = Math.min(255, r + (255 - r) * amount);
    g = Math.min(255, g + (255 - g) * amount);
    b = Math.min(255, b + (255 - b) * amount);
    return `#${Math.floor(r).toString(16).padStart(2, '0')}${Math.floor(g).toString(16).padStart(2, '0')}${Math.floor(b).toString(16).padStart(2, '0')}`;
  }

  const getPriorityColor = (priority) => {
    const colors = {
      'low': '#10B981',
      'medium': '#F59E0B',
      'high': '#EF4444'
    };
    let color = colors[priority] || colors.low;
    return isDark ? lighten(color, 0.2) : color; // Adjust for dark mode contrast
  };

  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const copyTicketId = (ticketId, index) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (!copyButtonScales[index]) copyButtonScales[index] = useSharedValue(1);
    copyButtonScales[index].value = withSequence(
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
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
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

  const handleCategoryPress = (id, index) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    categoryButtonScales[index].value = withSequence(
      withSpring(0.95, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 400 })
    );

    setSelectedCategory(id);
  };

  const handlePriorityPress = (id, index) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    priorityButtonScales[index].value = withSequence(
      withSpring(0.95, { damping: 15, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 400 })
    );

    setSelectedPriority(id);
  };

  // Animated styles
  const submitButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: submitButtonScale.value }],
  }));

  const refreshButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: refreshButtonScale.value }],
  }));

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={isDark ? ['#1E293B', '#334155'] : ['#800080', '#800080']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={isSmallScreen ? 20 : 24} color="white" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontSize: isSmallScreen ? 20 : 22 }]}>Contact Support</Text>
          <View style={{ width: isSmallScreen ? 20 : 24 }} /> 
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, isTablet && styles.scrollContentTablet]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Subtitle */}
        <Animated.View style={[styles.subtitleSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: isSmallScreen ? 14 : 16, lineHeight: isSmallScreen ? 20 : 24 }]}>
            We're here to help! Select a category and describe your issue.
          </Text>
        </Animated.View>

        {/* Category Selection */}
        <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ scale: scaleAnim }], backgroundColor: colors.surface }]}>
          <LinearGradient
            colors={isDark ? ['rgba(74, 144, 226, 0.1)', 'transparent'] : ['rgba(128, 0, 128, 0.1)', 'transparent']}
            style={styles.sectionGradient}
          >
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: isSmallScreen ? 16 : 18 }]}>Select Category *</Text>
            <View style={[styles.categoriesGrid, isTablet && { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }]}>
              {supportCategories.map((category, index) => {
                const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: categoryButtonScales[index].value }] }));
                return (
                  <AnimatedTouchableOpacity
                    key={category.id}
                    style={[styles.categoryCard, animatedStyle, { backgroundColor: colors.surface, borderColor: selectedCategory === category.id ? category.color : colors.border }]}
                    onPress={() => handleCategoryPress(category.id, index)}
                  >
                    <LinearGradient colors={category.gradient} style={styles.categoryIconContainer}>
                      <category.icon size={isSmallScreen ? 20 : 24} color={isDark ? lighten(category.color, 0.2) : category.color} />
                    </LinearGradient>
                    <Text style={[styles.categoryTitle, { color: colors.text, fontSize: isSmallScreen ? 14 : 16 }]}>{category.title}</Text>
                    <Text style={[styles.categoryDesc, { color: colors.textSecondary, fontSize: isSmallScreen ? 12 : 14 }]}>{category.description}</Text>
                  </AnimatedTouchableOpacity>
                );
              })}
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Priority Selection */}
        <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }], backgroundColor: colors.surface }]}>
          <LinearGradient
            colors={isDark ? ['rgba(245, 158, 11, 0.1)', 'transparent'] : ['rgba(245, 158, 11, 0.1)', 'transparent']}
            style={styles.sectionGradient}
          >
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: isSmallScreen ? 16 : 18 }]}>Priority Level *</Text>
            <View style={[styles.priorityContainer, isTablet && { flexDirection: 'row', justifyContent: 'space-around' }]}>
              {priorityLevels.map((priority, index) => {
                const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: priorityButtonScales[index].value }] }));
                return (
                  <AnimatedTouchableOpacity
                    key={priority.id}
                    style={[styles.priorityButton, animatedStyle, { backgroundColor: colors.surface, borderColor: selectedPriority === priority.id ? priority.color : colors.border }]}
                    onPress={() => handlePriorityPress(priority.id, index)}
                  >
                    <LinearGradient colors={priority.gradient} style={styles.priorityIconContainer}>
                      <AlertTriangle size={isSmallScreen ? 20 : 24} color={isDark ? lighten(priority.color, 0.2) : priority.color} />
                    </LinearGradient>
                    <Text style={[styles.priorityTitle, { color: colors.text, fontSize: isSmallScreen ? 14 : 16 }]}>{priority.title}</Text>
                    <Text style={[styles.priorityDesc, { color: colors.textSecondary, fontSize: isSmallScreen ? 12 : 14 }]}>{priority.desc}</Text>
                  </AnimatedTouchableOpacity>
                );
              })}
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Subject Input */}
        <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }], backgroundColor: colors.surface }]}>
          <LinearGradient
            colors={isDark ? ['rgba(74, 144, 226, 0.1)', 'transparent'] : ['rgba(128, 0, 128, 0.1)', 'transparent']}
            style={styles.sectionGradient}
          >
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: isSmallScreen ? 16 : 18 }]}>Subject *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#2D3748' : '#F7FAFC', borderColor: colors.border, color: colors.text, fontSize: isSmallScreen ? 14 : 16 }]}
              placeholder="Brief description of your issue"
              placeholderTextColor={colors.textSecondary}
              value={subject}
              onChangeText={setSubject}
              maxLength={100}
            />
          </LinearGradient>
        </Animated.View>

        {/* Message Input */}
        <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }], backgroundColor: colors.surface }]}>
          <LinearGradient
            colors={isDark ? ['rgba(74, 144, 226, 0.1)', 'transparent'] : ['rgba(128, 0, 128, 0.1)', 'transparent']}
            style={styles.sectionGradient}
          >
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: isSmallScreen ? 16 : 18 }]}>Detailed Message *</Text>
            <TextInput
              style={[styles.messageInput, { backgroundColor: isDark ? '#2D3748' : '#F7FAFC', borderColor: colors.border, color: colors.text, fontSize: isSmallScreen ? 14 : 16 }]}
              placeholder="Describe your issue in detail..."
              placeholderTextColor={colors.textSecondary}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={isSmallScreen ? 4 : 6}
              maxLength={1000}
            />
            <View style={styles.messageBoxFooter}>
              <TouchableOpacity style={styles.attachmentIconButton} onPress={handlePickDocument} disabled={attachments.length >= 5 || uploadingFile}>
                {uploadingFile ? <ActivityIndicator size="small" color={colors.primary} /> : <Paperclip size={isSmallScreen ? 16 : 18} color={colors.primary} />}
                {attachments.length > 0 && (
                  <View style={styles.attachmentBadge}>
                    <Text style={styles.attachmentBadgeText}>{attachments.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <Text style={[styles.charCount, { color: colors.textSecondary }]}>{message.length}/1000</Text>
            </View>
            {attachments.length > 0 && (
              <View style={styles.compactAttachmentsList}>
                {attachments.map((attachment, index) => (
                  <View key={index} style={styles.compactAttachmentItem}>
                    <Text style={styles.compactAttachmentName} numberOfLines={1}>{attachment.name}</Text>
                    <TouchableOpacity style={styles.compactRemoveButton} onPress={() => removeAttachment(index)}>
                      <X size={12} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </LinearGradient>
        </Animated.View>

        {/* Submit Button */}
        <AnimatedTouchableOpacity
          style={[styles.submitButton, submitButtonAnimatedStyle]}
          onPress={handleSubmitTicket}
          disabled={loading || !selectedCategory || !subject || !message}
        >
          <LinearGradient
            colors={isDark ? ['#4A90E2', '#6366F1'] : ['#800080', '#800080']}
            style={styles.submitButtonGradient}
          >
            {loading ? <ActivityIndicator color="white" /> : <Send size={isSmallScreen ? 18 : 20} color="white" />}
            <Text style={[styles.submitButtonText, { fontSize: isSmallScreen ? 14 : 16 }]}>{loading ? 'Submitting...' : 'Submit Ticket'}</Text>
          </LinearGradient>
        </AnimatedTouchableOpacity>

        {/* Recent Tickets */}
        <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }], backgroundColor: colors.surface }]}>
          <LinearGradient
            colors={isDark ? ['rgba(74, 144, 226, 0.1)', 'transparent'] : ['rgba(128, 0, 128, 0.1)', 'transparent']}
            style={styles.sectionGradient}
          >
            <View style={styles.sectionHeader}>
              <History size={isSmallScreen ? 18 : 20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text, fontSize: isSmallScreen ? 16 : 18 }]}>Recent Tickets</Text>
              <AnimatedTouchableOpacity style={[styles.refreshButton, refreshButtonAnimatedStyle]} onPress={handleManualRefresh}>
                <Animated.View style={{ transform: [{ rotate: spinValue }] }}>
                  <RefreshCw size={isSmallScreen ? 16 : 18} color={colors.primary} />
                </Animated.View>
              </AnimatedTouchableOpacity>
            </View>
            {loadingTickets ? (
              <ActivityIndicator size="large" color={colors.primary} style={styles.loadingIndicator} />
            ) : recentTickets.length > 0 ? (
              recentTickets.map((ticket, index) => {
                const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: copyButtonScales[index]?.value || 1 }] }));
                return (
                  <TouchableOpacity key={ticket.id} style={styles.ticketCard} onPress={() => navigateToTicketDetail(ticket)}>
                    <Text style={styles.ticketTitle}>{ticket.title}</Text>
                    <Text style={styles.ticketDescription}>{ticket.description}</Text>
                    <View style={styles.ticketFooter}>
                      {getStatusIcon(ticket.status)}
                      <Text style={styles.ticketDate}>{formatRelativeTime(ticket.created_at)}</Text>
                      <AnimatedTouchableOpacity style={animatedStyle} onPress={() => copyTicketId(ticket.id, index)}>
                        <Copy size={isSmallScreen ? 16 : 18} color={colors.primary} />
                      </AnimatedTouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: isSmallScreen ? 14 : 16 }]}>No recent tickets</Text>
            )}
          </LinearGradient>
        </Animated.View>

        {/* Contact Info */}
        <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }], backgroundColor: colors.surface }]}>
          <LinearGradient
            colors={isDark ? ['rgba(74, 144, 226, 0.1)', 'transparent'] : ['rgba(128, 0, 128, 0.1)', 'transparent']}
            style={styles.sectionGradient}
          >
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: isSmallScreen ? 16 : 18 }]}>Contact Us</Text>
            <View style={styles.contactInfo}>
              <Phone size={isSmallScreen ? 18 : 20} color={colors.primary} />
              <Text style={[styles.contactText, { color: colors.text, fontSize: isSmallScreen ? 14 : 16 }]}>+1 (555) 123-4567</Text>
            </View>
            <View style={styles.contactInfo}>
              <Mail size={isSmallScreen ? 18 : 20} color={colors.primary} />
              <Text style={[styles.contactText, { color: colors.text, fontSize: isSmallScreen ? 14 : 16 }]}>support@vidgro.com</Text>
            </View>
          </LinearGradient>
        </Animated.View>
      </ScrollView>

      <CustomAlert {...alertProps} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent', // Let theme handle
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 10,
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: isSmallScreen ? 12 : 16,
    paddingBottom: 40,
  },
  scrollContentTablet: {
    paddingHorizontal: 32,
  },
  subtitleSection: {
    marginBottom: 16,
  },
  subtitle: {
    textAlign: 'center',
  },
  section: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectionGradient: {
    padding: isSmallScreen ? 12 : 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: isTablet ? '32%' : isSmallScreen ? '48%' : '49%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryIconContainer: {
    padding: 8,
    borderRadius: 50,
    marginBottom: 8,
  },
  categoryTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  categoryDesc: {
    textAlign: 'center',
    fontSize: 12,
  },
  priorityContainer: {
    flexDirection: isTablet ? 'row' : 'column',
    gap: 12,
  },
  priorityButton: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  priorityIconContainer: {
    padding: 8,
    borderRadius: 50,
    marginBottom: 8,
  },
  priorityTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  priorityDesc: {
    textAlign: 'center',
    fontSize: 12,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  messageInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    height: isSmallScreen ? 120 : 150,
  },
  messageBoxFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  attachmentIconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  attachmentBadge: {
    backgroundColor: 'red',
    borderRadius: 10,
    paddingHorizontal: 6,
    marginLeft: 4,
  },
  attachmentBadgeText: {
    color: 'white',
    fontSize: 10,
  },
  compactAttachmentsList: {
    marginTop: 8,
  },
  compactAttachmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  compactAttachmentName: {
    flex: 1,
    fontSize: 12,
  },
  compactRemoveButton: {
    padding: 4,
  },
  charCount: {
    fontSize: 12,
  },
  submitButton: {
    borderRadius: 16,
    marginBottom: 16,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loadingIndicator: {
    marginVertical: 20,
  },
  ticketCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: 'white', // Adjust based on theme
  },
  ticketTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  ticketDescription: {
    marginBottom: 8,
  },
  ticketFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ticketDate: {
    fontSize: 12,
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 20,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  contactText: {
    fontWeight: 'bold',
  },
});

export default ContactSupportScreen;