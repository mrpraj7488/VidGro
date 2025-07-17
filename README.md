# VidGro - Watch & Earn Video Platform

## 1. PROJECT OVERVIEW

### Application Name
**VidGro - Watch And Earn**

### Description
VidGro is a comprehensive video promotion and monetization platform built with React Native and Expo. Users can earn virtual coins by watching videos and promote their own YouTube content by spending coins. The platform features a sophisticated 10-minute hold system for new video promotions, real-time analytics, VIP subscriptions, referral systems, and ad-free experiences.

### Technology Stack
- **Frontend**: React Native 0.79.1 with Expo SDK 53.0.0
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **State Management**: Zustand + React Context API
- **Navigation**: Expo Router 5.0.2
- **Authentication**: Supabase Auth
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Real-time Updates**: Supabase Realtime
- **Animations**: React Native Reanimated 3.17.4
- **UI Components**: Custom components with Lucide React Native icons
- **Styling**: StyleSheet.create (React Native)

### Architecture Pattern
**Component-based Architecture** with:
- Context API for global state management
- Zustand stores for specific feature state
- Custom hooks for business logic
- Service layer for API interactions
- Real-time data synchronization

### Project Type
**Cross-platform Mobile Application** (iOS, Android, Web) built with Expo managed workflow

## 2. COMPLETE TECH STACK ANALYSIS

### Frontend Technologies
- **Framework**: React Native 0.79.1 with Expo SDK 53.0.0
- **Router**: Expo Router 5.0.2 (file-based routing)
- **State Management**: 
  - Zustand 5.0.6 (video queue, ad-free state)
  - React Context API (authentication, global state)
- **UI Framework**: Custom components with React Native StyleSheet
- **Icons**: Lucide React Native 0.475.0
- **Animations**: React Native Reanimated 3.17.4
- **Gestures**: React Native Gesture Handler 2.24.0
- **Gradients**: Expo Linear Gradient 14.1.3
- **WebView**: React Native WebView 13.15.0
- **Storage**: AsyncStorage 2.2.0

### Backend Technologies
- **Database**: PostgreSQL (via Supabase)
- **Backend-as-a-Service**: Supabase 2.39.0
- **Authentication**: Supabase Auth (email/password)
- **Real-time**: Supabase Realtime subscriptions
- **Edge Functions**: Supabase Edge Functions (Deno runtime)
- **File Storage**: Supabase Storage (for future use)

### DevOps & Tools
- **Package Manager**: npm with legacy-peer-deps
- **Build Tool**: Expo CLI with Metro bundler
- **Development**: Expo Dev Client 5.2.4
- **Code Formatting**: Prettier 
- **TypeScript**: 5.8.3
- **Environment**: Expo environment variables
- **Deployment**: Expo Application Services (EAS)

### Database & Storage
- **Primary Database**: PostgreSQL with Supabase
- **ORM**: Supabase JavaScript client
- **Migrations**: SQL migration files
- **Real-time**: Supabase Realtime for live updates
- **Row Level Security**: Comprehensive RLS policies
- **Functions**: PostgreSQL stored procedures

## 3. PROJECT STRUCTURE

```
vidgro-watch-earn/
├── app/                           # Expo Router app directory
│   ├── (auth)/                   # Authentication routes group
│   │   ├── _layout.tsx          # Auth layout wrapper
│   │   ├── login.tsx            # Login screen
│   │   └── signup.tsx           # Signup screen
│   ├── (tabs)/                  # Main app tabs group
│   │   ├── _layout.tsx          # Tab navigation layout
│   │   ├── index.tsx            # Video viewing tab (main)
│   │   ├── promote.tsx          # Video promotion tab
│   │   ├── analytics.tsx        # Analytics dashboard
│   │   └── more.tsx             # More options tab
│   ├── _layout.tsx              # Root layout with auth provider
│   ├── index.tsx                # Splash screen
│   ├── +not-found.tsx          # 404 error screen
│   ├── become-vip.tsx           # VIP subscription screen
│   ├── buy-coins.tsx            # Coin purchase screen
│   ├── configure-ads.tsx        # Ad configuration screen
│   ├── contact-support.tsx      # Support contact form
│   ├── delete-account.tsx       # Account deletion flow
│   ├── edit-video.tsx           # Video editing interface
│   ├── languages.tsx            # Language selection
│   ├── privacy-policy.tsx       # Privacy policy display
│   ├── rate-us.tsx              # App rating interface
│   ├── refer-friend.tsx         # Referral system
│   └── terms.tsx                # Terms of service
├── components/                   # Reusable UI components
│   └── GlobalHeader.tsx         # Main navigation header
├── contexts/                     # React Context providers
│   └── AuthContext.tsx          # Authentication context
├── hooks/                        # Custom React hooks
│   └── useFrameworkReady.ts     # Framework initialization hook
├── lib/                          # Core libraries and configurations
│   └── supabase.ts              # Supabase client configuration
├── store/                        # Zustand state stores
│   ├── videoStore.ts            # Video queue management
│   └── adFreeStore.ts           # Ad-free session management
├── utils/                        # Utility functions
│   ├── ad-module.ts             # Ad platform compatibility
│   └── debug.ts                 # Development debugging tools
├── types/                        # TypeScript type definitions
│   └── env.d.ts                 # Environment variable types
├── supabase/                     # Database migrations and functions
│   └── migrations/              # SQL migration files
├── assets/                       # Static assets
│   └── images/                  # App icons and images
├── app.json                      # Expo configuration
├── package.json                  # Dependencies and scripts
├── tsconfig.json                # TypeScript configuration
├── metro.config.js              # Metro bundler configuration
├── babel.config.js              # Babel transpilation config
└── .prettierrc                  # Code formatting rules
```

## 4. DETAILED FEATURES LIST

### 4.1 User Authentication System
**Description**: Complete user registration and login system with profile management
**User Stories**:
- As a user, I can create an account with email and password
- As a user, I can log in to access my account
- As a user, I can view my profile information and coin balance

**Technical Implementation**:
- Supabase Auth with email/password authentication
- Automatic profile creation via database triggers
- Real-time profile synchronization
- Secure session management

**Components Involved**: `AuthContext.tsx`, `login.tsx`, `signup.tsx`, `GlobalHeader.tsx`

### 4.2 Video Viewing & Coin Earning System
**Description**: Core functionality for watching videos and earning coins
**User Stories**:
- As a user, I can watch videos to earn coins
- As a user, I can see my coin balance update in real-time
- As a user, I cannot watch my own promoted videos
- As a user, I cannot watch the same video twice

**Technical Implementation**:
- YouTube video embedding with WebView
- Precise timing validation (95% completion threshold)
- Real-time coin balance updates
- Video queue management with Zustand
- Automatic video progression

**API Endpoints**:
- `award_coins_for_video_completion()` - Awards coins for completed videos
- `can_user_earn_coins_from_video()` - Validates earning eligibility
- `get_next_video_for_user_enhanced()` - Fetches video queue

**Components Involved**: `index.tsx` (main tab), `videoStore.ts`, `AuthContext.tsx`

### 4.3 Video Promotion System
**Description**: Allows users to promote their YouTube videos using coins
**User Stories**:
- As a user, I can promote my YouTube videos by spending coins
- As a user, I can set target views and watch duration
- As a user, I can see my promoted videos go through a 10-minute hold period
- As a user, I can track promotion progress in real-time

**Technical Implementation**:
- 10-minute hold system for new promotions
- Automatic video status transitions (on_hold → active → completed)
- Real-time analytics and progress tracking
- Coin cost calculation based on views and duration

**API Endpoints**:
- `create_video_with_hold()` - Creates new video promotion
- `release_videos_from_hold()` - Releases videos from hold status
- `get_video_analytics_realtime_v2()` - Real-time video analytics

**Components Involved**: `promote.tsx`, `edit-video.tsx`, `analytics.tsx`

### 4.4 Real-time Analytics Dashboard
**Description**: Comprehensive analytics for promoted videos and earnings
**User Stories**:
- As a user, I can view detailed analytics for my promoted videos
- As a user, I can see real-time view counts and progress
- As a user, I can track my total earnings and spending
- As a user, I can view my recent activity history

**Technical Implementation**:
- Real-time data synchronization with Supabase
- Comprehensive metrics calculation
- Activity filtering and categorization
- Auto-refresh mechanisms

**Components Involved**: `analytics.tsx`, `AuthContext.tsx`

### 4.5 VIP Subscription System
**Description**: Premium subscription offering ad-free experience and discounts
**User Stories**:
- As a user, I can subscribe to VIP for premium benefits
- As a VIP user, I get 10% off all video promotions
- As a VIP user, I have an ad-free experience
- As a VIP user, I get priority customer support

**Technical Implementation**:
- Subscription management with expiration tracking
- Automatic benefit application
- VIP status validation
- Payment integration ready

**Components Involved**: `become-vip.tsx`, `more.tsx`, `AuthContext.tsx`

### 4.6 Coin Purchase System
**Description**: In-app purchase system for buying virtual coins
**User Stories**:
- As a user, I can purchase coin packages
- As a user, I can see different package options with bonuses
- As a user, I can complete secure transactions

**Technical Implementation**:
- Multiple coin package tiers
- Bonus coin calculations
- Secure payment processing integration
- Transaction history tracking

**Components Involved**: `buy-coins.tsx`, `AuthContext.tsx`

### 4.7 Ad-Free Experience System
**Description**: Configurable ad-free periods through watching ads or VIP
**User Stories**:
- As a user, I can watch ads to earn ad-free time
- As a user, I can configure my ad experience
- As a user, I can see my remaining ad-free time

**Technical Implementation**:
- Ad watching requirements and rewards
- Timer-based ad-free sessions
- Platform-specific ad integration
- State persistence across app sessions

**Components Involved**: `configure-ads.tsx`, `adFreeStore.ts`, `more.tsx`

### 4.8 Referral System
**Description**: User referral program with coin rewards
**User Stories**:
- As a user, I can refer friends and earn coins
- As a user, I can share my referral code
- As a referred user, I get bonus coins when joining

**Technical Implementation**:
- Unique referral code generation
- Referral tracking and validation
- Automatic reward distribution
- Social sharing integration

**Components Involved**: `refer-friend.tsx`, `AuthContext.tsx`

### 4.9 Support & Help System
**Description**: Comprehensive user support and help system
**User Stories**:
- As a user, I can contact support for help
- As a user, I can view FAQ and help documentation
- As a user, I can rate the app and provide feedback

**Technical Implementation**:
- Contact form with categorization
- FAQ system with expandable sections
- Rating system with coin rewards
- Support ticket management

**Components Involved**: `contact-support.tsx`, `rate-us.tsx`

### 4.10 Account Management
**Description**: Complete account management and settings
**User Stories**:
- As a user, I can manage my account settings
- As a user, I can change my language preferences
- As a user, I can delete my account if needed

**Technical Implementation**:
- Profile management
- Language localization support
- Secure account deletion process
- Data export capabilities

**Components Involved**: `languages.tsx`, `delete-account.tsx`, `privacy-policy.tsx`, `terms.tsx`

## 5. DATABASE SCHEMA

### 5.1 Core Tables

#### profiles
```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  username text UNIQUE NOT NULL,
  coins integer DEFAULT 100 NOT NULL CHECK (coins >= 0),
  is_vip boolean DEFAULT false NOT NULL,
  vip_expires_at timestamptz,
  referral_code text UNIQUE NOT NULL,
  referred_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
```

#### videos
```sql
CREATE TABLE videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  youtube_url text NOT NULL,
  title text NOT NULL,
  description text DEFAULT '' NOT NULL,
  duration_seconds integer NOT NULL CHECK (duration_seconds >= 10 AND duration_seconds <= 600),
  coin_cost integer NOT NULL CHECK (coin_cost > 0),
  coin_reward integer NOT NULL CHECK (coin_reward > 0),
  views_count integer DEFAULT 0 NOT NULL CHECK (views_count >= 0),
  target_views integer NOT NULL CHECK (target_views > 0 AND target_views <= 1000),
  status text DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'paused', 'completed', 'on_hold', 'repromoted')),
  hold_until timestamptz,
  total_watch_time integer DEFAULT 0,
  engagement_rate decimal(5,2) DEFAULT 0.0,
  completion_rate decimal(5,2) DEFAULT 0.0,
  average_watch_time decimal(8,2) DEFAULT 0.0,
  repromoted_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
```

#### video_views
```sql
CREATE TABLE video_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid REFERENCES videos(id) ON DELETE CASCADE NOT NULL,
  viewer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  watched_duration integer NOT NULL CHECK (watched_duration >= 0),
  completed boolean DEFAULT false NOT NULL,
  coins_earned integer DEFAULT 0 NOT NULL CHECK (coins_earned >= 0),
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(video_id, viewer_id)
);
```

#### coin_transactions
```sql
CREATE TABLE coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount integer NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('video_watch', 'video_promotion', 'purchase', 'referral_bonus', 'admin_adjustment', 'vip_purchase', 'ad_stop_purchase')),
  description text NOT NULL,
  reference_id uuid,
  created_at timestamptz DEFAULT now() NOT NULL
);
```

#### user_settings
```sql
CREATE TABLE user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  ad_frequency integer DEFAULT 5 NOT NULL CHECK (ad_frequency >= 1 AND ad_frequency <= 20),
  auto_play boolean DEFAULT true NOT NULL,
  notifications_enabled boolean DEFAULT true NOT NULL,
  language text DEFAULT 'en' NOT NULL,
  ad_stop_expires_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);
```

### 5.2 Key Relationships
- **profiles** ↔ **videos**: One-to-many (user can promote multiple videos)
- **profiles** ↔ **video_views**: One-to-many (user can watch multiple videos)
- **videos** ↔ **video_views**: One-to-many (video can be watched by multiple users)
- **profiles** ↔ **coin_transactions**: One-to-many (user has multiple transactions)
- **profiles** ↔ **user_settings**: One-to-one (user has one settings record)
- **profiles** ↔ **profiles**: Self-referencing (referral system)

### 5.3 Indexes for Performance
```sql
-- Critical indexes for query performance
CREATE INDEX idx_videos_queue_management ON videos(status, views_count, target_views, updated_at, created_at) WHERE status = 'active';
CREATE INDEX idx_video_views_realtime ON video_views(video_id, viewer_id, completed, coins_earned, created_at);
CREATE INDEX idx_coin_transactions_user_type ON coin_transactions(user_id, transaction_type, created_at);
CREATE INDEX idx_profiles_coins_update ON profiles(id, coins, updated_at);
```

## 6. API DOCUMENTATION

### 6.1 Authentication Endpoints

#### Sign Up
```typescript
// Supabase Auth API
const { data, error } = await supabase.auth.signUp({
  email: string,
  password: string,
  options: {
    data: { username: string }
  }
});
```

#### Sign In
```typescript
const { error } = await supabase.auth.signInWithPassword({
  email: string,
  password: string
});
```

### 6.2 Video Management Functions

#### Award Coins for Video Completion
```sql
award_coins_for_video_completion(
  user_uuid uuid,
  video_uuid uuid,
  watch_duration integer
) RETURNS json
```
**Purpose**: Awards coins when user completes watching a video
**Returns**: Success status, coins earned, balance updates

#### Create Video with Hold
```sql
create_video_with_hold(
  user_uuid uuid,
  youtube_url_param text,
  title_param text,
  description_param text,
  duration_seconds_param integer,
  coin_cost_param integer,
  coin_reward_param integer,
  target_views_param integer
) RETURNS uuid
```
**Purpose**: Creates new video promotion with 10-minute hold period

#### Get Next Video for User
```sql
get_next_video_for_user_enhanced(user_uuid uuid)
RETURNS TABLE(
  video_id uuid,
  youtube_url text,
  title text,
  duration_seconds integer,
  coin_reward integer
)
```
**Purpose**: Fetches next available videos for user to watch

### 6.3 Analytics Functions

#### Get Video Analytics (Real-time)
```sql
get_video_analytics_realtime_v2(
  video_uuid uuid,
  user_uuid uuid
) RETURNS json
```
**Purpose**: Returns real-time analytics for a specific video

#### Get User Analytics Summary
```sql
get_user_analytics_summary(user_uuid uuid)
RETURNS TABLE(
  total_videos_promoted integer,
  total_coins_earned integer,
  total_coins_spent integer,
  total_views_received integer,
  total_watch_time integer,
  average_engagement_rate decimal(5,2),
  active_videos integer,
  completed_videos integer,
  on_hold_videos integer
)
```

### 6.4 Coin Management Functions

#### Update User Coins
```sql
update_user_coins(
  user_uuid uuid,
  coin_amount integer,
  transaction_type_param text,
  description_param text,
  reference_uuid uuid DEFAULT NULL
) RETURNS boolean
```
**Purpose**: Safely updates user coin balance with transaction logging

#### Calculate Coins by Duration
```sql
calculate_coins_by_duration_v2(duration_seconds integer) RETURNS integer
```
**Purpose**: Calculates coin rewards based on video duration
**Mapping**:
- 540s+ = 200 coins
- 480s+ = 150 coins
- 420s+ = 130 coins
- 360s+ = 100 coins
- 300s+ = 90 coins
- 240s+ = 70 coins
- 180s+ = 55 coins
- 150s+ = 50 coins
- 120s+ = 45 coins
- 90s+ = 35 coins
- 60s+ = 25 coins
- 45s+ = 15 coins
- 35s+ = 10 coins

### 6.5 System Functions

#### Release Videos from Hold
```sql
release_videos_from_hold() RETURNS integer
```
**Purpose**: Automatically releases videos from 10-minute hold period

#### Check Video Completion Status
```sql
check_video_completion_status(video_uuid uuid) RETURNS json
```
**Purpose**: Checks if video should be skipped due to completion

## 7. AUTHENTICATION & AUTHORIZATION

### 7.1 Authentication Method
- **Primary**: Email and password authentication via Supabase Auth
- **Session Management**: Automatic token refresh and persistence
- **Email Confirmation**: Disabled for immediate account activation
- **Password Requirements**: Minimum 6 characters

### 7.2 User Roles and Permissions
- **Regular User**: Can watch videos, promote content, earn coins
- **VIP User**: Additional benefits (ad-free, discounts, priority support)
- **System**: Automated processes (hold release, analytics updates)

### 7.3 Row Level Security (RLS) Policies

#### Profiles Table
```sql
-- Users can read own profile
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update own profile  
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Trigger can insert profiles (for user creation)
CREATE POLICY "Trigger can insert profiles" ON profiles
  FOR INSERT WITH CHECK (true);
```

#### Videos Table
```sql
-- Users can view active videos or own videos
CREATE POLICY "Users can view active videos" ON videos
  FOR SELECT USING (status = 'active' OR user_id = auth.uid());

-- Users can create videos
CREATE POLICY "Users can create videos" ON videos
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update own videos
CREATE POLICY "Users can update own videos" ON videos
  FOR UPDATE USING (user_id = auth.uid());
```

### 7.4 Protected Routes
- All routes in `(tabs)/` group require authentication
- Authentication routes `(auth)/` are public
- Automatic redirection based on auth state

### 7.5 Session Management
- Automatic token refresh
- Persistent sessions across app restarts
- Secure logout with state cleanup
- Real-time auth state synchronization

## 8. COMPONENT ARCHITECTURE

### 8.1 Core Components

#### AuthContext.tsx
**Purpose**: Global authentication state management
**Props**: None (Provider component)
**State**: 
- `user`: Current authenticated user
- `profile`: User profile data
- `loading`: Authentication loading state

**Methods**:
- `signIn(email, password)`: User login
- `signUp(email, password, username)`: User registration
- `signOut()`: User logout
- `refreshProfile()`: Refresh user profile data

#### GlobalHeader.tsx
**Purpose**: Main navigation header with menu and coin display
**Props**:
- `title`: Header title text
- `showCoinDisplay`: Whether to show coin balance
- `menuVisible`: Menu visibility state
- `setMenuVisible`: Menu visibility setter

**Features**:
- Hamburger menu with slide animation
- Real-time coin balance display
- User profile information
- Navigation menu items

#### VideoStore (Zustand)
**Purpose**: Video queue management and state
**State**:
- `videoQueue`: Array of available videos
- `currentVideoIndex`: Current video position
- `isLoading`: Loading state
- `blacklistedVideoIds`: Locally blacklisted videos

**Methods**:
- `fetchVideos(userId)`: Fetch video queue
- `getCurrentVideo()`: Get current video
- `moveToNextVideo()`: Progress to next video
- `handleVideoError()`: Handle video playback errors

#### AdFreeStore (Zustand)
**Purpose**: Ad-free session management
**State**:
- `isAdFreeActive`: Current ad-free status
- `adFreeExpiresAt`: Expiration timestamp
- `selectedOption`: Selected ad configuration

**Methods**:
- `startAdFreeSession()`: Start ad-free period
- `updateTimer()`: Update countdown timer
- `endAdFreeSession()`: End ad-free period

### 8.2 Screen Components

#### Main Tab (index.tsx)
**Purpose**: Primary video watching interface
**Features**:
- YouTube video embedding
- Coin earning system
- Video queue management
- Progress tracking
- Error handling

#### Promote Tab (promote.tsx)
**Purpose**: Video promotion interface
**Features**:
- YouTube URL validation
- Video metadata fetching
- Cost calculation
- Promotion creation
- Hold period explanation

#### Analytics Tab (analytics.tsx)
**Purpose**: Comprehensive analytics dashboard
**Features**:
- Real-time metrics display
- Video performance tracking
- Activity history
- Earnings summary
- Auto-refresh functionality

#### More Tab (more.tsx)
**Purpose**: Additional features and settings
**Features**:
- VIP subscription access
- Coin purchasing
- Ad configuration
- Support and help
- Account management

### 8.3 Utility Components

#### Custom Hooks
- `useFrameworkReady()`: Framework initialization
- `useAuth()`: Authentication context access
- `useFocusEffect()`: Screen focus handling

#### Animated Components
- Smooth transitions with React Native Reanimated
- Micro-interactions for better UX
- Loading states and progress indicators

## 9. STYLING APPROACH

### 9.1 CSS Methodology
- **React Native StyleSheet**: Primary styling method
- **Inline Styles**: For dynamic styling
- **Platform-specific Styles**: Using Platform.select()
- **Responsive Design**: Screen width-based breakpoints

### 9.2 Design System

#### Color Palette
```typescript
const colors = {
  primary: '#800080',      // Purple primary
  secondary: '#FF4757',    // Red secondary  
  accent: '#FFD700',       // Gold accent
  success: '#2ECC71',      // Green success
  warning: '#F39C12',      // Orange warning
  error: '#E74C3C',        // Red error
  background: '#F5F5F5',   // Light gray background
  surface: '#FFFFFF',      // White surface
  text: '#333333',         // Dark text
  textSecondary: '#666666' // Gray secondary text
};
```

#### Typography System
```typescript
const typography = {
  // Headers
  h1: { fontSize: 32, fontWeight: 'bold' },
  h2: { fontSize: 24, fontWeight: 'bold' },
  h3: { fontSize: 20, fontWeight: '600' },
  
  // Body text
  body: { fontSize: 16, lineHeight: 22 },
  bodySmall: { fontSize: 14, lineHeight: 20 },
  caption: { fontSize: 12, lineHeight: 16 },
  
  // Interactive
  button: { fontSize: 16, fontWeight: '600' },
  link: { fontSize: 14, fontWeight: '500' }
};
```

#### Spacing System
```typescript
const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48
};
```

### 9.3 Responsive Breakpoints
```typescript
const breakpoints = {
  isSmallScreen: screenWidth < 480,
  isVerySmallScreen: screenWidth < 375,
  isTablet: screenWidth >= 768,
  isDesktop: screenWidth >= 1024
};
```

### 9.4 Component Styling Patterns

#### Card Components
```typescript
const cardStyles = {
  backgroundColor: 'white',
  borderRadius: 16,
  padding: 20,
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
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    },
  }),
};
```

#### Button Components
```typescript
const buttonStyles = {
  primary: {
    backgroundColor: '#800080',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#800080',
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 12,
    alignItems: 'center',
  }
};
```

## 10. CONFIGURATION FILES

### 10.1 package.json
```json
{
  "name": "vidgro-watch-earn",
  "main": "expo-router/entry",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "EXPO_NO_TELEMETRY=1 expo start --clear",
    "build:web": "expo export --platform web",
    "start": "EXPO_NO_TELEMETRY=1 expo start",
    "start:clear": "EXPO_NO_TELEMETRY=1 expo start --clear",
    "lint": "expo lint",
    "clean": "rm -rf node_modules .expo dist build .cache *.log *.tmp .DS_Store Thumbs.db && npm install",
    "deep-clean": "rm -rf node_modules .expo dist build .cache *.log *.tmp .DS_Store Thumbs.db package-lock.json && npm cache clean --force && npm install",
    "reset-metro": "npx expo start --clear",
    "reset-all": "npm run deep-clean && npm run reset-metro"
  },
  "dependencies": {
    "@expo/vector-icons": "^14.1.0",
    "@react-native-async-storage/async-storage": "^2.2.0",
    "@supabase/supabase-js": "^2.39.0",
    "expo": "^53.0.0",
    "expo-constants": "~17.1.3",
    "expo-dev-client": "^5.2.4",
    "expo-font": "~13.2.2",
    "expo-in-app-purchases": "^14.5.0",
    "expo-linear-gradient": "~14.1.3",
    "expo-linking": "~7.1.3",
    "expo-router": "~5.0.2",
    "expo-splash-screen": "~0.30.6",
    "expo-status-bar": "~2.2.2",
    "expo-web-browser": "~14.1.5",
    "lucide-react-native": "^0.475.0",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "react-native": "0.79.1",
    "react-native-gesture-handler": "~2.24.0",
    "react-native-reanimated": "~3.17.4",
    "react-native-safe-area-context": "5.3.0",
    "react-native-screens": "~4.10.0",
    "react-native-svg": "15.11.2",
    "react-native-url-polyfill": "^2.0.0",
    "react-native-web": "^0.20.0",
    "react-native-webview": "^13.15.0",
    "zustand": "^5.0.6"
  },
  "devDependencies": {
    "@babel/core": "^7.25.2",
    "@babel/plugin-transform-modules-commonjs": "^7.27.1",
    "@expo/metro-config": "^0.20.17",
    "@types/react": "~19.0.10",
    "babel-plugin-transform-import-meta": "^2.3.3",
    "metro-react-native-babel-transformer": "^0.77.0",
    "typescript": "~5.8.3"
  }
}
```

### 10.2 Environment Variables (.env structure)
```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AdMob Configuration (for mobile ads)
EXPO_PUBLIC_ADMOB_APP_ID=your_admob_app_id
EXPO_PUBLIC_ADMOB_BANNER_ID=your_banner_ad_unit_id
EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID=your_interstitial_ad_unit_id
EXPO_PUBLIC_ADMOB_REWARDED_ID=your_rewarded_ad_unit_id

# YouTube API (for video metadata)
EXPO_PUBLIC_YOUTUBE_API_KEY=your_youtube_api_key
```

### 10.3 app.json (Expo Configuration)
```json
{
  "expo": {
    "name": "VidGro - Watch And Earn",
    "slug": "vidgro-watch-earn",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "vidgro",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.vidgro.watchearn"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/icon.png",
        "backgroundColor": "#FF4757"
      },
      "package": "com.vidgro.watchearn"
    },
    "web": {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-font",
      "expo-web-browser",
      "expo-dev-client",
      [
        "expo-router",
        {
          "root": "./app"
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

### 10.4 TypeScript Configuration
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "skipLibCheck": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts",
    "types/env.d.ts"
  ],
  "exclude": [
    "node_modules",
    ".expo",
    "dist",
    "build",
    "web-build"
  ]
}
```

### 10.5 Metro Configuration
```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enhanced resolver configuration for import.meta handling
config.resolver.alias = {
  'crypto': 'react-native-crypto',
  'stream': 'readable-stream',
  'buffer': '@craftzdog/react-native-buffer',
  'util': 'util',
  'url': 'react-native-url-polyfill',
  'querystring': 'querystring-es3',
};

// Enhanced transformer configuration
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: true,
    inlineRequires: true,
    hermetic: false,
  },
});

config.resolver.platforms = ['ios', 'android', 'web'];
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs', 'ts', 'tsx'];
config.resolver.assetExts = [...config.resolver.assetExts, 'bin'];

module.exports = config;
```

### 10.6 Babel Configuration
```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      ['babel-plugin-transform-import-meta', {
        module: 'ES6'
      }],
      ['@babel/plugin-transform-modules-commonjs', {
        allowTopLevelThis: true,
        loose: true
      }]
    ],
  };
};
```

## 11. INSTALLATION & SETUP

### 11.1 Prerequisites
- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher
- **Expo CLI**: Latest version (`npm install -g @expo/cli`)
- **Git**: For version control
- **Supabase Account**: For backend services
- **Code Editor**: VS Code recommended with React Native extensions

### 11.2 Step-by-Step Installation

#### Step 1: Clone and Setup Project
```bash
# Create new Expo project
npx create-expo-app@latest VidGro --template blank-typescript

# Navigate to project directory
cd VidGro

# Install dependencies
npm install @expo/vector-icons@^14.1.0 \
  @react-native-async-storage/async-storage@^2.2.0 \
  @supabase/supabase-js@^2.39.0 \
  expo-constants@~17.1.3 \
  expo-dev-client@^5.2.4 \
  expo-font@~13.2.2 \
  expo-in-app-purchases@^14.5.0 \
  expo-linear-gradient@~14.1.3 \
  expo-linking@~7.1.3 \
  expo-router@~5.0.2 \
  expo-splash-screen@~0.30.6 \
  expo-status-bar@~2.2.2 \
  expo-web-browser@~14.1.5 \
  lucide-react-native@^0.475.0 \
  react-native-gesture-handler@~2.24.0 \
  react-native-reanimated@~3.17.4 \
  react-native-safe-area-context@5.3.0 \
  react-native-screens@~4.10.0 \
  react-native-svg@15.11.2 \
  react-native-url-polyfill@^2.0.0 \
  react-native-web@^0.20.0 \
  react-native-webview@^13.15.0 \
  zustand@^5.0.6

# Install dev dependencies
npm install --save-dev @babel/plugin-transform-modules-commonjs@^7.27.1 \
  babel-plugin-transform-import-meta@^2.3.3 \
  metro-react-native-babel-transformer@^0.77.0
```

#### Step 2: Configure Project Structure
```bash
# Create directory structure
mkdir -p app/{auth,tabs} components contexts hooks lib store utils types supabase/migrations assets/images

# Create required files
touch app/_layout.tsx app/index.tsx app/+not-found.tsx
touch app/auth/_layout.tsx app/auth/login.tsx app/auth/signup.tsx
touch app/tabs/_layout.tsx app/tabs/index.tsx app/tabs/promote.tsx app/tabs/analytics.tsx app/tabs/more.tsx
touch components/GlobalHeader.tsx
touch contexts/AuthContext.tsx
touch hooks/useFrameworkReady.ts
touch lib/supabase.ts
touch store/videoStore.ts store/adFreeStore.ts
touch utils/ad-module.ts utils/debug.ts
touch types/env.d.ts
```

#### Step 3: Supabase Setup
```bash
# Create Supabase project at https://supabase.com
# Note down your project URL and anon key

# Create .env file
cat > .env << EOF
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
EXPO_PUBLIC_ADMOB_APP_ID=your_admob_app_id
EXPO_PUBLIC_ADMOB_BANNER_ID=your_banner_ad_unit_id
EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID=your_interstitial_ad_unit_id
EXPO_PUBLIC_ADMOB_REWARDED_ID=your_rewarded_ad_unit_id
EXPO_PUBLIC_YOUTUBE_API_KEY=your_youtube_api_key
EOF
```

### 11.3 Database Setup

#### Step 1: Run Database Migrations
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the migration files in order:
   - `20250715093823_throbbing_oasis.sql` (Main database setup)
   - `20250716175755_rustic_shrine.sql` (Email confirmation removal)
   - `20250716180239_light_resonance.sql` (Email confirmation disable)
   - `20250716211959_plain_villa.sql` (Video completion fixes)
   - `20250717120019_crimson_morning.sql` (Coin rewards fixes)
   - `20250717121302_fancy_crystal.sql` (Timing precision fixes)
   - `20250717122300_light_block.sql` (Final timing corrections)

#### Step 2: Verify Database Setup
```sql
-- Check if all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'videos', 'video_views', 'coin_transactions', 'user_settings');

-- Check if functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%video%' OR routine_name LIKE '%coin%';
```

### 11.4 Environment Configuration

#### Step 1: Configure app.json
Update your `app.json` with the provided configuration

#### Step 2: Configure TypeScript
Update `tsconfig.json` with the provided configuration

#### Step 3: Configure Metro
Update `metro.config.js` with the provided configuration

#### Step 4: Configure Babel
Update `babel.config.js` with the provided configuration

### 11.5 Development Server Setup
```bash
# Start development server
npm run dev

# For clean start (clears cache)
npm run start:clear

# For web development
npm run build:web
```

## 12. DEPLOYMENT GUIDE

### 12.1 Production Build Process

#### Step 1: Prepare for Production
```bash
# Clean project
npm run clean

# Install dependencies
npm install

# Update app version in app.json
# Update environment variables for production
```

#### Step 2: Build for Different Platforms

##### Web Deployment
```bash
# Build for web
npm run build:web

# Deploy to hosting service (Netlify, Vercel, etc.)
# Upload dist folder contents
```

##### Mobile App Deployment
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Submit to app stores
eas submit --platform ios
eas submit --platform android
```

### 12.2 Environment Setup

#### Production Environment Variables
```bash
# Production .env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key

# Production AdMob IDs
EXPO_PUBLIC_ADMOB_APP_ID=ca-app-pub-your-actual-id
EXPO_PUBLIC_ADMOB_BANNER_ID=ca-app-pub-your-actual-banner-id
EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID=ca-app-pub-your-actual-interstitial-id
EXPO_PUBLIC_ADMOB_REWARDED_ID=ca-app-pub-your-actual-rewarded-id

# Production YouTube API
EXPO_PUBLIC_YOUTUBE_API_KEY=your_production_youtube_api_key
```

### 12.3 Database Migration for Production
1. Create production Supabase project
2. Run all migration files in order
3. Configure production environment variables
4. Test all functionality in production environment

### 12.4 Server Configuration
- **Supabase**: Automatically handles server configuration
- **Edge Functions**: Deploy via Supabase CLI (if using custom functions)
- **CDN**: Configure for static assets
- **SSL**: Automatically handled by hosting providers

## 13. TESTING STRATEGY

### 13.1 Testing Frameworks
- **Unit Testing**: Jest (built into Expo)
- **Component Testing**: React Native Testing Library
- **E2E Testing**: Detox (for mobile) or Playwright (for web)
- **API Testing**: Supabase built-in testing tools

### 13.2 Test File Structure
```
__tests__/
├── components/
│   ├── GlobalHeader.test.tsx
│   └── AuthContext.test.tsx
├── screens/
│   ├── Login.test.tsx
│   └── VideoViewing.test.tsx
├── stores/
│   ├── videoStore.test.ts
│   └── adFreeStore.test.ts
├── utils/
│   └── helpers.test.ts
└── integration/
    ├── auth-flow.test.ts
    └── video-promotion.test.ts
```

### 13.3 Testing Commands
```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- GlobalHeader.test.tsx
```

### 13.4 Key Test Scenarios
- User authentication flow
- Video watching and coin earning
- Video promotion creation
- Real-time data updates
- Error handling and edge cases
- Cross-platform compatibility

## 14. PERFORMANCE OPTIMIZATIONS

### 14.1 Code Splitting Strategies
- **Route-based Splitting**: Automatic with Expo Router
- **Component Lazy Loading**: React.lazy() for heavy components
- **Dynamic Imports**: For optional features

### 14.2 Lazy Loading Implementation
```typescript
// Lazy load heavy screens
const AnalyticsScreen = React.lazy(() => import('./analytics'));
const PromoteScreen = React.lazy(() => import('./promote'));

// Lazy load with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <AnalyticsScreen />
</Suspense>
```

### 14.3 Caching Strategies
- **Video Queue Caching**: 5-minute cache with Zustand persistence
- **Profile Data Caching**: Real-time updates with local caching
- **Image Caching**: Expo Image with automatic caching
- **API Response Caching**: Supabase built-in caching

### 14.4 Bundle Optimization
- **Tree Shaking**: Automatic with Metro bundler
- **Asset Optimization**: Compressed images and icons
- **Code Minification**: Production builds automatically minified
- **Unused Code Elimination**: ESLint rules for unused imports

### 14.5 Memory Management
- **Component Cleanup**: useEffect cleanup functions
- **Event Listener Removal**: Proper cleanup in useEffect
- **Store Cleanup**: Clear stores on logout
- **Image Memory**: Optimized image loading and caching

## 15. SECURITY MEASURES

### 15.1 Input Validation
- **Email Validation**: Regex pattern validation
- **Password Strength**: Minimum 6 characters requirement
- **URL Validation**: YouTube URL format validation
- **Numeric Input**: Range validation for coins and views

### 15.2 Database Security
- **Row Level Security (RLS)**: Comprehensive policies on all tables
- **SQL Injection Prevention**: Parameterized queries via Supabase
- **Data Sanitization**: Automatic with Supabase client
- **Access Control**: User-based data access restrictions

### 15.3 Authentication Security
- **Secure Session Management**: JWT tokens with automatic refresh
- **Password Hashing**: Handled by Supabase Auth
- **Session Timeout**: Automatic token expiration
- **Secure Storage**: Encrypted local storage for tokens

### 15.4 API Security
- **Rate Limiting**: Supabase built-in rate limiting
- **CORS Configuration**: Proper origin restrictions
- **API Key Protection**: Environment variable storage
- **Request Validation**: Server-side validation for all requests

### 15.5 Data Protection
- **Encryption at Rest**: Supabase automatic encryption
- **Encryption in Transit**: HTTPS/TLS for all communications
- **Personal Data Protection**: GDPR-compliant data handling
- **Data Minimization**: Only collect necessary user data

## 16. THIRD-PARTY INTEGRATIONS

### 16.1 Supabase Integration
- **Authentication**: Complete auth system
- **Database**: PostgreSQL with real-time subscriptions
- **Storage**: File storage capabilities
- **Edge Functions**: Serverless function execution

### 16.2 YouTube Integration
- **Video Embedding**: WebView-based video player
- **Metadata Fetching**: YouTube Data API v3
- **URL Validation**: YouTube URL format checking
- **Video Information**: Title, duration, thumbnail extraction

### 16.3 Payment Integration (Ready)
- **In-App Purchases**: Expo In-App Purchases configured
- **Payment Processing**: Ready for App Store/Google Play
- **Subscription Management**: VIP subscription system
- **Transaction Tracking**: Complete transaction history

### 16.4 Analytics Integration (Ready)
- **User Analytics**: Built-in analytics system
- **Performance Tracking**: Real-time performance metrics
- **Error Tracking**: Comprehensive error logging
- **Usage Statistics**: Detailed usage analytics

### 16.5 Ad Integration
- **AdMob**: Google AdMob integration ready
- **Rewarded Ads**: Coin earning through ad watching
- **Banner Ads**: Display advertising capabilities
- **Interstitial Ads**: Full-screen ad experiences

## 17. TROUBLESHOOTING GUIDE

### 17.1 Common Issues and Solutions

#### Authentication Issues
**Problem**: User signup fails with "profiles table not found"
**Solution**: 
1. Verify database migrations are run in correct order
2. Check Supabase project URL and keys
3. Ensure RLS policies are properly configured

**Problem**: User login successful but profile data not loading
**Solution**:
1. Check network connectivity
2. Verify Supabase client configuration
3. Check browser console for API errors

#### Video Playback Issues
**Problem**: Videos not loading or playing
**Solution**:
1. Verify YouTube URL format
2. Check internet connectivity
3. Ensure WebView permissions are granted
4. Verify video is not restricted/private

**Problem**: Coins not awarded after watching video
**Solution**:
1. Check watch duration meets requirements (95% completion)
2. Verify user hasn't already watched the video
3. Check database function logs in Supabase
4. Ensure video status is 'active'

#### Performance Issues
**Problem**: App running slowly or freezing
**Solution**:
1. Clear app cache: `npm run start:clear`
2. Restart Metro bundler
3. Check for memory leaks in components
4. Optimize image sizes and formats

#### Database Issues
**Problem**: Real-time updates not working
**Solution**:
1. Check Supabase realtime configuration
2. Verify RLS policies allow subscriptions
3. Check network connectivity
4. Restart Supabase client connection

### 17.2 Error Codes and Meanings

#### Authentication Errors
- `SIGNUP_DISABLED`: Email confirmation disabled, check auth settings
- `INVALID_CREDENTIALS`: Wrong email/password combination
- `USER_NOT_FOUND`: User doesn't exist in database
- `EMAIL_NOT_CONFIRMED`: Email confirmation required (should be disabled)

#### Video Errors
- `VIDEO_NOT_FOUND`: Video ID doesn't exist in database
- `ALREADY_WATCHED`: User has already watched this video
- `INSUFFICIENT_WATCH_TIME`: User didn't watch enough of the video
- `VIDEO_COMPLETED`: Video has reached its target views

#### Coin Transaction Errors
- `INSUFFICIENT_COINS`: User doesn't have enough coins
- `INVALID_AMOUNT`: Coin amount is invalid or negative
- `TRANSACTION_FAILED`: Database transaction failed

### 17.3 Debugging Tips

#### Enable Debug Logging
```typescript
// In lib/supabase.ts, add:
if (process.env?.NODE_ENV === 'development') {
  console.log('🔧 Debug mode enabled');
}
```

#### Check Supabase Logs
1. Go to Supabase Dashboard
2. Navigate to Logs section
3. Filter by API, Auth, or Database logs
4. Look for error messages and stack traces

#### Monitor Network Requests
1. Open browser developer tools
2. Go to Network tab
3. Filter by XHR/Fetch requests
4. Check for failed requests and error responses

#### Database Query Debugging
```sql
-- Check user profile
SELECT * FROM profiles WHERE id = 'user-uuid';

-- Check video status
SELECT * FROM videos WHERE status = 'active' LIMIT 10;

-- Check recent transactions
SELECT * FROM coin_transactions WHERE user_id = 'user-uuid' ORDER BY created_at DESC LIMIT 10;
```

## 18. FUTURE ENHANCEMENTS

### 18.1 Planned Features
- **Social Features**: Friend system, leaderboards, social sharing
- **Advanced Analytics**: Detailed performance metrics, A/B testing
- **Content Moderation**: Automated content filtering, reporting system
- **Gamification**: Achievements, badges, daily challenges
- **Multi-language Support**: Full internationalization
- **Push Notifications**: Real-time notifications for earnings and updates
- **Advanced Video Features**: Video categories, trending videos, recommendations
- **Monetization**: Revenue sharing, creator programs, premium content

### 18.2 Technical Debt
- **Code Splitting**: Implement more granular code splitting
- **Testing Coverage**: Increase test coverage to 90%+
- **Performance Monitoring**: Add comprehensive performance tracking
- **Error Boundary**: Implement global error boundaries
- **Accessibility**: Improve accessibility compliance
- **SEO Optimization**: Enhance web SEO capabilities

### 18.3 Scalability Considerations
- **Database Optimization**: Query optimization, indexing improvements
- **Caching Layer**: Redis implementation for high-traffic scenarios
- **CDN Integration**: Global content delivery network
- **Microservices**: Break down into smaller, focused services
- **Load Balancing**: Implement load balancing for high availability
- **Auto-scaling**: Automatic resource scaling based on demand

## 19. DEVELOPER NOTES

### 19.1 Code Conventions
- **File Naming**: PascalCase for components, camelCase for utilities
- **Component Structure**: Props interface, component function, styles
- **Import Order**: React imports, third-party, local imports
- **TypeScript**: Strict mode enabled, explicit typing preferred
- **Comments**: JSDoc for functions, inline for complex logic

### 19.2 Git Workflow
- **Branch Naming**: `feature/feature-name`, `bugfix/issue-description`
- **Commit Messages**: Conventional commits format
- **Pull Requests**: Required for all changes to main branch
- **Code Review**: Minimum one reviewer required
- **Testing**: All tests must pass before merge

### 19.3 Code Review Process
1. **Automated Checks**: ESLint, TypeScript compilation, tests
2. **Manual Review**: Code quality, architecture, security
3. **Testing**: Functional testing on multiple devices
4. **Documentation**: Update documentation for new features
5. **Deployment**: Staged deployment with rollback capability

### 19.4 Documentation Standards
- **README**: Keep updated with all changes
- **Code Comments**: Explain complex business logic
- **API Documentation**: Document all functions and endpoints
- **Change Log**: Maintain detailed change log
- **Architecture Decisions**: Document major architectural choices

## 20. RECREATION CHECKLIST

### Phase 1: Environment Setup
- [ ] Install Node.js 18+ and npm
- [ ] Install Expo CLI globally
- [ ] Create Supabase account and project
- [ ] Set up development environment (VS Code + extensions)
- [ ] Configure Git repository

### Phase 2: Project Initialization
- [ ] Create new Expo project with TypeScript template
- [ ] Install all required dependencies (see package.json)
- [ ] Configure project structure (folders and files)
- [ ] Set up environment variables (.env file)
- [ ] Configure app.json with project settings

### Phase 3: Database Setup
- [ ] Create Supabase project
- [ ] Run database migrations in correct order
- [ ] Verify all tables and functions are created
- [ ] Test database connectivity
- [ ] Configure Row Level Security policies

### Phase 4: Core Configuration
- [ ] Configure TypeScript (tsconfig.json)
- [ ] Configure Metro bundler (metro.config.js)
- [ ] Configure Babel (babel.config.js)
- [ ] Set up Prettier formatting (.prettierrc)
- [ ] Configure Supabase client (lib/supabase.ts)

### Phase 5: Authentication System
- [ ] Create AuthContext with all methods
- [ ] Implement login screen with validation
- [ ] Implement signup screen with validation
- [ ] Create authentication layout wrapper
- [ ] Test user registration and login flow

### Phase 6: Core Components
- [ ] Create GlobalHeader with menu and coin display
- [ ] Implement navigation with Expo Router
- [ ] Create tab layout with proper icons
- [ ] Set up state management with Zustand
- [ ] Implement error boundaries and loading states

### Phase 7: Video System
- [ ] Create video store with queue management
- [ ] Implement video viewing interface
- [ ] Add YouTube video embedding
- [ ] Create coin earning system
- [ ] Implement video promotion interface

### Phase 8: Analytics & Features
- [ ] Create analytics dashboard
- [ ] Implement real-time data updates
- [ ] Add VIP subscription system
- [ ] Create coin purchase interface
- [ ] Implement ad-free configuration

### Phase 9: Additional Features
- [ ] Add referral system
- [ ] Create support and help screens
- [ ] Implement account management
- [ ] Add language selection
- [ ] Create privacy policy and terms screens

### Phase 10: Testing & Optimization
- [ ] Write unit tests for core functions
- [ ] Test on multiple devices and platforms
- [ ] Optimize performance and bundle size
- [ ] Test all user flows end-to-end
- [ ] Verify security measures

### Phase 11: Deployment Preparation
- [ ] Configure production environment variables
- [ ] Set up production Supabase project
- [ ] Test production build process
- [ ] Configure app store metadata
- [ ] Prepare deployment scripts

### Phase 12: Final Deployment
- [ ] Build production versions for all platforms
- [ ] Deploy web version to hosting service
- [ ] Submit mobile apps to app stores
- [ ] Monitor deployment and fix any issues
- [ ] Document deployment process

---

## CRITICAL SUCCESS FACTORS

1. **Database First**: Ensure database is properly set up before building frontend
2. **Environment Variables**: Double-check all environment variables are correct
3. **Authentication Flow**: Test authentication thoroughly before adding features
4. **Real-time Updates**: Verify Supabase real-time subscriptions work correctly
5. **Cross-platform Testing**: Test on iOS, Android, and web platforms
6. **Performance**: Monitor performance throughout development
7. **Security**: Implement and test all security measures
8. **User Experience**: Focus on smooth, intuitive user experience
9. **Error Handling**: Implement comprehensive error handling
10. **Documentation**: Keep documentation updated throughout development

This comprehensive README provides everything needed to recreate the VidGro application from scratch. Follow the checklist systematically, and refer to the detailed sections for implementation guidance. The application represents a sophisticated video monetization platform with real-time features, comprehensive analytics, and a robust backend infrastructure.