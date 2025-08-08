# VidGro - Watch & Earn Video Platform

A secure React Native Expo application that allows users to watch videos and earn virtual coins, while also enabling content creators to promote their YouTube videos through a coin-based system. Features runtime configuration management and advanced security measures.

## 🎯 App Overview

VidGro is a video monetization platform where users can:
- **Watch videos** and earn coins based on viewing duration
- **Promote YouTube videos** using coins to get more views
- **Purchase coin packages** through in-app purchases
- **Upgrade to VIP** for premium features and discounts
- **Refer friends** and earn bonus coins

## 🏗️ Architecture Overview

### Frontend Framework
- **React Native** with **Expo SDK 52.0.30**
- **Expo Router 4.0.17** for file-based navigation
- **TypeScript** for type safety
- **Zustand** for state management
- **React Native Reanimated** for smooth animations

### Backend & Database
- **Supabase** as the primary backend service
- **PostgreSQL** database with Row Level Security (RLS)
- **Runtime Configuration API** for secure, dynamic app configuration
- **Real-time subscriptions** for live updates
- **Edge functions** for serverless operations
- **Feature flags** for backend-controlled functionality

### Security & Configuration
- **Dynamic Runtime Config** - All sensitive values fetched from backend
- **Anti-Tamper Protection** - Root/jailbreak detection and app integrity checks
- **Ad Block Detection** - Monitors and responds to ad blocking attempts
- **Secure Caching** - Encrypted local config storage with TTL
- **Code Obfuscation** - Production builds use advanced JS obfuscation

## 📱 App Structure

### Navigation Architecture
```
app/
├── _layout.tsx                 # Root layout with providers
├── index.tsx                   # Splash screen
├── (auth)/                     # Authentication flow
│   ├── login.tsx
│   └── signup.tsx
├── (tabs)/                     # Main tab navigation
│   ├── index.tsx              # Video watching (View tab)
│   ├── promote.tsx            # Video promotion
│   ├── analytics.tsx          # User analytics
│   └── more.tsx               # Settings & features
└── [modal-screens]/           # Modal screens for various features
```

### Key Components
- **GlobalHeader**: Universal header with coin display and side menu
- **ThemeToggle**: Animated dark/light mode switcher
- **VideoPreview**: YouTube video validation and preview
- **Authentication**: Email/password based auth system

## 🗄️ Database Schema

### Core Tables

#### `profiles`
User profile information and coin balances
```sql
- id (uuid, primary key)
- email (text, unique)
- username (text, unique)
- coins (integer, default 1000)
- is_vip (boolean, default false)
- vip_expires_at (timestamptz, nullable)
- referral_code (text, unique)
- referred_by (uuid, foreign key)
- created_at (timestamptz)
- updated_at (timestamptz)
```

#### `videos`
Video promotion data and analytics
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key to profiles)
- youtube_url (text)
- title (text)
- duration_seconds (integer)
- target_views (integer)
- views_count (integer, default 0)
- coin_reward (integer)
- coin_cost (integer)
- status (enum: active, paused, completed, on_hold, repromoted)
- completed (boolean, default false)
- total_watch_time (integer, default 0)
- completion_rate (integer, default 0)
- hold_until (timestamptz, nullable)
- created_at (timestamptz)
- updated_at (timestamptz)
```

#### `coin_transactions`
Complete transaction history for coins
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key to profiles)
- amount (integer) -- positive for earnings, negative for spending
- transaction_type (text) -- video_promotion, purchase, referral_bonus, etc.
- description (text)
- reference_id (text, nullable) -- video_id, purchase_id, etc.
- metadata (jsonb, nullable) -- additional transaction data
- engagement_duration (integer, nullable) -- watch time for video earnings
- created_at (timestamptz)
```

#### `video_views`
Individual video view tracking
```sql
- id (uuid, primary key)
- video_id (uuid, foreign key to videos)
- viewer_id (uuid, foreign key to profiles)
- watch_duration (integer) -- seconds watched
- coins_earned (integer)
- fully_watched (boolean)
- created_at (timestamptz)
```

### Database Functions (PostgreSQL)

#### Video Queue Management
- **`get_video_queue_for_user(user_uuid)`**: Returns personalized video queue
- **`watch_video_and_earn_coins(user_uuid, video_uuid, watch_duration, video_fully_watched)`**: Processes video watching and coin rewards
- **`check_and_update_expired_holds()`**: Automatically activates videos after hold period

#### Video Promotion
- **`create_video_promotion(coin_cost_param, coin_reward_param, duration_seconds_param, target_views_param, title_param, user_uuid, youtube_url_param)`**: Creates new video promotion
- **`repromote_video(video_uuid, user_uuid, additional_coin_cost)`**: Repromotes completed videos
- **`delete_video_with_refund(video_uuid, user_uuid)`**: Deletes video with coin refund

#### Analytics & Reporting
- **`get_user_comprehensive_analytics(user_uuid)`**: Complete user analytics
- **`get_user_videos_with_analytics(user_uuid)`**: User's videos with performance data
- **`get_user_recent_activity(user_uuid)`**: Recent coin transactions

#### User Management
- **`create_missing_profile(user_id, user_email, user_username)`**: Creates profile if missing after signup

## 🔄 Core Business Logic

### Video Watching Flow
1. **Queue Generation**: Algorithm selects videos based on user preferences and availability
2. **View Tracking**: Each video view is recorded with watch duration
3. **Coin Calculation**: Rewards calculated based on video duration:
   - 30s video = 10 coins
   - 60s video = 25 coins
   - 120s video = 45 coins
   - 540s+ video = 200 coins
4. **Real-time Updates**: Video metrics update in real-time via Supabase subscriptions

### Video Promotion System
1. **Cost Calculation**: `(target_views × duration_seconds) ÷ 50 × 8`
2. **VIP Discount**: 10% discount for VIP members
3. **Hold Period**: 10-minute hold before videos go live
4. **Status Management**: active → completed → repromoted cycle
5. **Refund System**: 100% refund within 10 minutes, 80% after

### Coin Economy
- **Starting Balance**: 1000 coins for new users
- **Earning Methods**:
  - Watching videos (duration-based rewards)
  - Purchasing coin packages
  - Referral bonuses (500 coins per referral)
  - Free ad rewards (100 coins per 30s ad)
- **Spending Methods**:
  - Video promotion costs
  - VIP membership purchases

## 🔐 Security Implementation

### Row Level Security (RLS)
All tables have RLS enabled with policies ensuring:
- Users can only access their own data
- Video views are properly attributed
- Coin transactions are secure and auditable

### Authentication
- **Supabase Auth** with email/password
- **No email confirmation** required for faster onboarding
- **Session management** with automatic token refresh
- **Secure logout** with proper cleanup

### Data Validation
- **Client-side validation** for immediate feedback
- **Server-side validation** in database functions
- **YouTube URL validation** with video ID extraction
- **Coin transaction integrity** checks

## 🎨 UI/UX Features

### Theme System
- **Dynamic theming** with light/dark modes
- **Gaming aesthetic** with deep blue color palette
- **Smooth animations** using React Native Reanimated
- **Haptic feedback** on supported platforms

### Responsive Design
- **Multi-screen support**: Tiny (320px), Small (350px), Regular (380px+), Tablet (768px+)
- **Adaptive layouts** for different screen sizes
- **Consistent spacing** using 8px grid system
- **Platform-specific optimizations**

### Animation System
- **Micro-interactions** for enhanced user experience
- **Loading states** with smooth transitions
- **Button feedback** with scale and haptic responses
- **Theme toggle** with 360° rotation and glow effects

## 🔌 Integrations

### YouTube Integration
- **Video validation** using YouTube IFrame API
- **Embeddability testing** to ensure videos can be promoted
- **Title auto-detection** via oEmbed API
- **Thumbnail generation** using YouTube's thumbnail service

### Payment Processing
- **React Native IAP** for iOS/Android in-app purchases
- **Web fallback** for browser-based testing
- **Secure transaction recording** with metadata
- **Refund handling** for video deletions

### Real-time Features
- **Supabase subscriptions** for live data updates
- **Video metrics** update in real-time
- **Coin balance** updates instantly
- **Queue management** with automatic refresh

## 📊 Analytics & Monitoring

### User Analytics
- Total videos promoted
- Coins earned and spent
- Video completion rates
- Watch time metrics
- Referral performance

### Video Analytics
- View counts and targets
- Completion percentages
- Engagement duration
- Cost per view analysis
- Status tracking

### Transaction Tracking
- Complete audit trail for all coin movements
- Purchase history with metadata
- Refund tracking
- Revenue analytics

## 🚀 Deployment & Environment

### Platform Support
- **iOS**: Native app with full feature support
- **Android**: Native app with full feature support
- **Web**: Browser-compatible with feature adaptations

### Environment Variables
The app now uses minimal environment variables for security:

```env
ENV=production
API_BASE_URL=https://admin.vidgro.com/api
```

All sensitive configuration (API keys, database URLs, AdMob IDs) is fetched dynamically from the backend at runtime.

### Runtime Configuration Flow
1. **App Launch**: Show secure loading screen
2. **Security Checks**: Validate device integrity and app signature
3. **Config Fetch**: Request runtime configuration from backend API
4. **Service Initialization**: Initialize Supabase, AdMob, and other services
5. **App Ready**: Render main application once all services are configured

### Backend API Requirements
The app requires a backend endpoint that provides runtime configuration:

```
GET https://admin.vidgro.com/api/client-runtime-config
```

See `docs/BACKEND_API_SPEC.md` for complete API specification.

### Build Configuration
- **Expo managed workflow** for simplified deployment
- **EAS Build** with production obfuscation
- **TypeScript** for type safety
- **Metro Obfuscator** for code protection
- **ESLint** for code quality
- **Prettier** for code formatting
- **Security validation** in build pipeline

## 🔧 Development Setup

### Prerequisites
- Node.js 18+
- Expo CLI
- EAS CLI for production builds
- Supabase account
- Backend API for runtime configuration
- YouTube Data API access (for enhanced features)

### Installation
```bash
# Clone the repository
git clone <repository-url>

# Install dependencies
npm install

# Start development server
npm run dev

# Build production version with obfuscation
eas build --platform all --profile production-obfuscated
```

### Backend Setup
1. Implement runtime configuration API endpoint
2. Set up feature flag management system
3. Configure security policies and validation rules
4. Set up monitoring and analytics for config requests

### Database Setup  
1. Create Supabase project
2. Run migrations in `/supabase/migrations/`
3. Configure runtime API to serve database credentials
4. Enable RLS policies

## 📈 Scalability Considerations

### Performance Optimizations
- **Lazy loading** for video content
- **Pagination** for large datasets
- **Caching** for frequently accessed data
- **Optimistic updates** for better UX

### Database Optimization
- **Indexed queries** for fast lookups
- **Efficient joins** in analytics functions
- **Batch operations** for bulk updates
- **Connection pooling** via Supabase

### Monitoring
- **Error tracking** with comprehensive logging
- **Performance metrics** for key operations
- **User behavior analytics** for optimization
- **Real-time monitoring** of critical functions

## 🛡️ Security Best Practices

### Data Protection
- **Runtime Configuration** - No sensitive data in app bundle
- **Dynamic Key Management** - API keys rotated without app updates
- **Device Integrity Checks** - Root/jailbreak detection
- **App Signature Validation** - Prevents modified app usage
- **Ad Block Detection** - Monitors advertising system integrity
- **Encrypted connections** (SSL/TLS)
- **Secure token storage** using AsyncStorage
- **Input sanitization** for all user inputs
- **SQL injection prevention** via parameterized queries
- **Code Obfuscation** - Production builds are heavily obfuscated

### Privacy Compliance
- **GDPR compliance** with data export/deletion
- **Privacy policy** implementation
- **User consent** management
- **Data minimization** principles

## 🔮 Future Enhancements

### Planned Features
- **Enhanced Security** - Certificate pinning and request signing
- **Advanced Obfuscation** - Runtime code encryption
- **Biometric Authentication** - Fingerprint/Face ID support
- **Fraud Detection** - ML-based anomaly detection
- **Push notifications** for video completion
- **Social features** with user interactions
- **Advanced analytics** with charts and graphs
- **Content moderation** tools
- **Multi-language support**

### Technical Improvements
- **Zero-Trust Architecture** - All requests validated and signed
- **Runtime Code Protection** - Dynamic code loading and validation
- **Advanced Monitoring** - Real-time security event tracking
- **Offline support** for core features
- **Background processing** for video queue
- **Advanced caching** strategies
- **Performance monitoring** dashboard

## 📞 Support & Maintenance

### Error Handling
- **Graceful degradation** for network issues
- **User-friendly error messages**
- **Automatic retry mechanisms**
- **Comprehensive logging** for debugging

### Monitoring & Alerts
- **Real-time error tracking**
- **Performance monitoring**
- **Database health checks**
- **User activity monitoring**

## 🏆 Key Achievements

- **Enterprise-grade security** with runtime configuration management
- **Zero sensitive data** in client application bundle
- **Dynamic feature control** without app store updates
- **Advanced anti-tamper protection** and integrity validation
- **Production-ready obfuscation** for code protection
- **Seamless user experience** with smooth animations
- **Robust coin economy** with secure transactions
- **Real-time updates** for engaging user experience
- **Scalable architecture** ready for growth
- **Cross-platform compatibility** with platform-specific optimizations
- **Professional UI/UX** with gaming aesthetic
- **Comprehensive analytics** for data-driven decisions

## 🔐 Security Architecture

### Configuration Security
- **Backend-Controlled**: All sensitive configuration served from secure backend
- **Encrypted Transit**: All config requests use HTTPS with certificate validation
- **Local Encryption**: Cached configuration encrypted with device-specific keys
- **Integrity Validation**: Config responses validated with HMAC signatures
- **TTL Management**: Automatic config refresh with configurable time-to-live

### Runtime Protection
- **Device Validation**: Root/jailbreak detection with configurable policies
- **App Integrity**: Signature validation and tamper detection
- **Emulator Detection**: Identifies and optionally blocks emulator usage
- **Debug Protection**: Prevents debugging and reverse engineering attempts
- **Ad Block Monitoring**: Detects and responds to ad blocking software

### Code Protection
- **Advanced Obfuscation**: Production builds use metro-obfuscator
- **Dead Code Elimination**: Removes debug code and console statements
- **Symbol Mangling**: Obfuscates function and variable names
- **Control Flow Flattening**: Makes code analysis more difficult
- **String Encryption**: Encrypts sensitive strings in the bundle

---

**VidGro** - Empowering creators through innovative video monetization 🎬💰