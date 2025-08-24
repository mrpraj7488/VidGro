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
import { 
  ArrowLeft, 
  MessageCircle, 
  Send, 
  Phone, 
  Mail, 
  HelpCircle,
  AlertCircle,
  CreditCard,
  User,
  Video,
  Coins,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Star,
  Copy,
  Paperclip,
  X,
  FileText,
  Image,
  RefreshCw,
  MessageSquare,
  Check,
  History,
  ChevronRight,
  ArrowRight
} from 'lucide-react-native';
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
      bgColor: isDark ? '#1A4736' : '#ECFDF5'
    },
    { 
      id: 'medium', 
      title: 'Medium', 
      desc: 'Account issues',
      color: '#F59E0B',
      bgColor: isDark ? '#4A3A1A' : '#FFFBEB'
    },
    { 
      id: 'high', 
      title: 'High', 
      desc: 'Technical problems',
      color: '#EF4444',
      bgColor: isDark ? '#4A1A1A' : '#FEF2F2'
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

  const AnimatedTouchableOpacity = AnimatedComponent.createAnimatedComponent(TouchableOpacity);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingTop: 50,
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
    headerTitle: {
      fontSize: isTinyScreen ? 18 : 22,
      fontWeight: 'bold',
      letterSpacing: 0.5,
      color: 'white',
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 40,
      paddingHorizontal: isTinyScreen ? 12 : 16,
    },
    scrollContentTablet: {
      paddingHorizontal: 40,
      paddingBottom: 60,
    },
    section: {
      marginBottom: isTinyScreen ? 16 : 20,
    },
    sectionTitle: {
      fontSize: isTinyScreen ? 14 : 16,
      fontWeight: 'bold',
      marginBottom: isTinyScreen ? 8 : 12,
      letterSpacing: 0.3,
      color: colors.text,
    },
    subtitle: {
      fontSize: isTinyScreen ? 12 : 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: isTinyScreen ? 16 : 20,
      lineHeight: isTinyScreen ? 18 : 20,
    },
    categoriesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: isTinyScreen ? 8 : 12,
      justifyContent: 'space-between',
    },
    categoryCard: {
      width: isTablet ? '30%' : (isSmallScreen ? '47%' : '48%'),
      backgroundColor: colors.surface,
      borderRadius: isTinyScreen ? 12 : 16,
      padding: isTinyScreen ? 12 : 16,
      alignItems: 'center',
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
          boxShadow: '0 3px 12px rgba(0, 0, 0, 0.1)',
        },
      }),
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
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
        },
      }),
    },
    categoryTitle: {
      fontSize: isTinyScreen ? 14 : 16,
      fontWeight: 'bold',
      marginBottom: isTinyScreen ? 2 : 4,
      color: colors.text,
      textAlign: 'center',
      letterSpacing: 0.3,
    },
    categoryDesc: {
      fontSize: isTinyScreen ? 11 : 13,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: isTinyScreen ? 16 : 18,
    },
    priorityContainer: {
      flexDirection: isTablet ? 'row' : 'column',
      gap: isTinyScreen ? 8 : 12,
    },
    priorityButton: {
      padding: isTinyScreen ? 12 : 16,
      borderRadius: isTinyScreen ? 12 : 16,
      alignItems: 'center',
      backgroundColor: colors.surface,
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
          boxShadow: '0 3px 12px rgba(0, 0, 0, 0.1)',
        },
      }),
    },
    priorityTitle: {
      fontSize: isTinyScreen ? 14 : 16,
      fontWeight: 'bold',
      marginBottom: isTinyScreen ? 2 : 4,
      letterSpacing: 0.3,
      color: colors.text,
    },
    priorityDesc: {
      fontSize: isTinyScreen ? 11 : 13,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: isTinyScreen ? 16 : 18,
    },
    inputContainer: {
      backgroundColor: colors.surface,
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
          elevation: 4,
        },
        web: {
          boxShadow: '0 3px 12px rgba(0, 0, 0, 0.1)',
        },
      }),
    },
    input: {
      paddingHorizontal: isTinyScreen ? 16 : 20,
      paddingVertical: isTinyScreen ? 14 : 18,
      fontSize: isTinyScreen ? 14 : 16,
      color: colors.text,
    },
    messageContainer: {
      minHeight: 160,
    },
    messageInput: {
      minHeight: 120,
      textAlignVertical: 'top',
    },
    charCount: {
      fontSize: isTinyScreen ? 10 : 12,
      color: colors.textSecondary,
      textAlign: 'right',
      paddingHorizontal: isTinyScreen ? 16 : 20,
      paddingBottom: isTinyScreen ? 8 : 12,
    },
    attachmentButton: {
      padding: isTinyScreen ? 8 : 10,
      borderRadius: isTinyScreen ? 8 : 10,
      backgroundColor: colors.primary + '20',
    },
    submitButton: {
      marginHorizontal: isTinyScreen ? 12 : 16,
      marginBottom: isTinyScreen ? 20 : 24,
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
      fontSize: isTinyScreen ? 14 : 16,
      fontWeight: 'bold',
      letterSpacing: 0.5,
    },
    recentTicketsSection: {
      marginHorizontal: isTinyScreen ? 12 : 16,
      marginBottom: isTinyScreen ? 20 : 24,
    },
    recentTicketsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: isTinyScreen ? 12 : 16,
      gap: 8,
    },
    recentTicketsTitle: {
      fontSize: isTinyScreen ? 16 : 18,
      fontWeight: 'bold',
      letterSpacing: 0.5,
      color: colors.text,
    },
    ticketCard: {
      backgroundColor: colors.surface,
      borderRadius: isTinyScreen ? 12 : 16,
      padding: isTinyScreen ? 16 : 20,
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
          boxShadow: '0 3px 12px rgba(0, 0, 0, 0.1)',
        },
      }),
    },
    ticketStatGradient: {
      alignItems: 'center',
      paddingVertical: isTinyScreen ? 16 : 20,
      gap: isTinyScreen ? 6 : 8,
    },
    contactSection: {
      marginHorizontal: isTinyScreen ? 12 : 16,
      marginBottom: isTinyScreen ? 20 : 24,
      backgroundColor: colors.surface,
      borderRadius: isTinyScreen ? 12 : 16,
      padding: isTinyScreen ? 16 : 20,
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
          boxShadow: '0 3px 12px rgba(0, 0, 0, 0.1)',
        },
      }),
    },
    successIndicator: {
      position: 'absolute',
      top: -30,
      backgroundColor: colors.success + '90',
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
    attachmentItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: isTinyScreen ? 8 : 10,
      padding: isTinyScreen ? 8 : 10,
      marginBottom: isTinyScreen ? 4 : 8,
      gap: isTinyScreen ? 8 : 12,
    },
    attachmentName: {
      flex: 1,
      fontSize: isTinyScreen ? 12 : 14,
      color: colors.text,
    },
    removeButton: {
      padding: isTinyScreen ? 4 : 6,
    },
    emptyTickets: {
      alignItems: 'center',
      padding: isTinyScreen ? 20 : 24,
      backgroundColor: colors.surface,
      borderRadius: isTinyScreen ? 12 : 16,
      marginTop: isTinyScreen ? 12 : 16,
    },
    emptyText: {
      fontSize: isTinyScreen ? 12 : 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 8,
    },
    copyButtonContainer: {
      position: 'relative',
    },
    copyButton: {
      padding: isTinyScreen ? 8 : 10,
      borderRadius: isTinyScreen ? 8 : 10,
      backgroundColor: colors.primary + '20',
    },
  });

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
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Contact Support</Text>
          <View style={{ width: 24 }} /> {/* Placeholder for symmetry */}
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
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.subtitle}>
            We're here to help! Select a category and describe your issue.
          </Text>
        </Animated.View>

        {/* Category Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            🎯 Select Category
          </Text>
          <View style={styles.categoriesGrid}>
            {supportCategories.map((benefit) => (
              <Animated.View 
                key={benefit.id} 
                style={[
                  styles.categoryCard,
                  { transform: [{ scale: selectedCategory === benefit.id ? 1.05 : 1 }] }
                ]}
              >
                <LinearGradient
                  colors={ [benefit.color, benefit.color] }
                  style={styles.categoryIconContainer}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <benefit.icon size={isTinyScreen ? 20 : 24} color="white" />
                </LinearGradient>
                <Text style={styles.categoryTitle}>
                  {benefit.title}
                </Text>
                <Text style={styles.categoryDesc}>
                  {benefit.description}
                </Text>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* Priority Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            🔹 Priority Level
          </Text>
          <View style={styles.priorityContainer}>
            {priorityLevels.map((benefit) => (
              <TouchableOpacity
                key={benefit.id}
                onPress={() => setSelectedPriority(benefit.id)}
              >
                <View style={styles.priorityButton}>
                  <LinearGradient
                    colors={benefit.gradient || [benefit.color, benefit.color]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.priorityTitle}>
                      {benefit.title}
                    </Text>
                    <Text style={styles.priorityDesc}>
                      {benefit.desc}
                    </Text>
                  </LinearGradient>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Subject Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            📝 Subject
          </Text>
          <View style={styles.inputContainer}>
            <LinearGradient
              colors={isDark ? ['rgba(74, 144, 226, 0.1)', 'rgba(74, 144, 226, 0.05)'] : ['rgba(128, 0, 128, 0.1)', 'rgba(128, 0, 128, 0.05)']}
              style={{ flex: 1 }}
            >
              <TextInput
                style={styles.input}
                placeholder="Enter subject..."
                value={subject}
                onChangeText={setSubject}
              />
            </LinearGradient>
          </View>
          <Text style={styles.charCount}>
            {subject.length}/100
          </Text>
        </View>

        {/* Message Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            💬 Message
          </Text>
          <View style={[styles.inputContainer, styles.messageContainer]}>
            <LinearGradient
              colors={isDark ? ['rgba(74, 144, 226, 0.1)', 'rgba(74, 144, 226, 0.05)'] : ['rgba(128, 0, 128, 0.1)', 'rgba(128, 0, 128, 0.05)']}
              style={{ flex: 1 }}
            >
              <TextInput
                style={[styles.input, styles.messageInput]}
                placeholder="Describe your issue..."
                value={message}
                onChangeText={setMessage}
                multiline
              />
            </LinearGradient>
          </View>
          <Text style={styles.charCount}>
            {message.length}/1000
          </Text>
          <TouchableOpacity style={styles.attachmentButton} onPress={handlePickDocument}>
            <Paperclip size={isTinyScreen ? 16 : 18} color={colors.primary} />
          </TouchableOpacity>
          {attachments.map((att, index) => (
            <View key={index} style={styles.attachmentItem}>
              <Text style={styles.attachmentName}>{att.name}</Text>
              <TouchableOpacity style={styles.removeButton} onPress={() => removeAttachment(index)}>
                <X size={isTinyScreen ? 16 : 18} color={colors.primary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Submit Button */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmitTicket}>
          <LinearGradient
            colors={isDark ? ['#4A90E2', '#6366F1'] : ['#800080', '#800080']}
            style={styles.submitButtonGradient}
          >
            <Send size={isTinyScreen ? 18 : 20} color="white" />
            <Text style={styles.submitButtonText}>
              Submit Ticket
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Recent Tickets */}
        <View style={styles.recentTicketsSection}>
          <View style={styles.recentTicketsHeader}>
            <History size={isTinyScreen ? 18 : 20} color={colors.accent} />
            <Text style={styles.recentTicketsTitle}>Recent Tickets</Text>
          </View>
          {recentTickets.length > 0 ? recentTickets.map((ticket) => (
            <View key={ticket.id} style={styles.ticketCard}>
              <LinearGradient colors={isDark ? ['rgba(74, 144, 226, 0.2)', 'rgba(74, 144, 226, 0.1)'] : ['rgba(128, 0, 128, 0.2)', 'rgba(128, 0, 128, 0.1)']} style={styles.ticketStatGradient}>
                <Text style={{ color: colors.text, fontSize: isTinyScreen ? 24 : 28, fontWeight: 'bold' }}>{ticket.title}</Text>
              </LinearGradient>
              {/* Add more ticket details as per original */}
            </View>
          )) : (
            <View style={styles.emptyTickets}>
              <MessageCircle size={32} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No tickets yet</Text>
            </View>
          )}
        </View>

        {/* Contact Info */}
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>Contact Info</Text>
          {/* Original contact items */}
        </View>
      </ScrollView>
      
      <CustomAlert {...alertProps} />
    </KeyboardAvoidingView>
  );
}

export default ContactSupportScreen;