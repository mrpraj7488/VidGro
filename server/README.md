# VidGro Backend API

A comprehensive backend system for the VidGro video promotion and earning platform with Supabase and Firebase integration.

## 🚀 Features

- **Dual Authentication**: Firebase Authentication + Local fallback
- **Supabase Integration**: Production-ready PostgreSQL database
- **User Management**: Registration, login, JWT tokens, settings
- **Video Management**: YouTube API integration, video validation, metadata extraction
- **Promotion System**: Create, manage, and track video promotions
- **Coin Economy**: Earn, spend, purchase coins with transaction history
- **Ad Management**: Configurable ad frequency, rewarded ads, ad-free periods
- **Referral System**: Referral codes, bonus rewards, tracking
- **Analytics**: Comprehensive user and promotion analytics
- **Database**: Supabase (production) + SQLite (development fallback)

## 📋 Quick Start

### Prerequisites

- Node.js 16+ 
- npm or yarn
- Supabase account and project
- Firebase project (optional but recommended)

### Installation

1. Navigate to the server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Firebase Configuration
FIREBASE_API_KEY=your-firebase-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
```

5. Set up Supabase schema:
```bash
node scripts/setup-supabase.js
```

6. Start the server:
```bash
# Development
npm run dev

# Production
npm start
```

7. Seed the database with demo data (optional):
```bash
npm run seed
```

## 🔧 Configuration

### Environment Variables

Key environment variables to configure:

```env
# Server
PORT=3000
NODE_ENV=production
USE_SUPABASE=true

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Authentication
JWT_SECRET=your-secret-key
FIREBASE_API_KEY=your-firebase-api-key
FIREBASE_PROJECT_ID=your-project-id

# APIs
YOUTUBE_API_KEY=your-youtube-api-key
```

### Supabase Setup

1. **Create a Supabase Project**:
   - Go to [Supabase](https://supabase.com)
   - Create a new project
   - Note your project URL and keys

2. **Configure Environment Variables**:
   - Update `SUPABASE_URL` with your project URL
   - Update `SUPABASE_ANON_KEY` with your anon key
   - Update `SUPABASE_SERVICE_ROLE_KEY` with your service role key

3. **Run Schema Setup**:
   ```bash
   node scripts/setup-supabase.js
   ```

### Firebase Setup

1. **Create a Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create a new project
   - Enable Authentication with Email/Password

2. **Configure Environment Variables**:
   - Update Firebase configuration in `.env`
   - For production, set up service account key

3. **Optional Service Account** (Production):
   ```env
   FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
   ```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register with Firebase + Backend
- `POST /api/auth/login` - Login with Firebase + Backend
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/settings` - Update user settings
- `DELETE /api/auth/account` - Delete account
- `POST /api/auth/logout` - Logout

### Videos
- `GET /api/videos` - Get available videos for watching
- `GET /api/videos/:id` - Get video details
- `POST /api/videos/:id/start` - Start watching session
- `POST /api/videos/progress` - Update watch progress
- `POST /api/videos/complete` - Complete video and earn coins

### Promotions
- `POST /api/promotions` - Create video promotion
- `GET /api/promotions/my` - Get user's promotions
- `GET /api/promotions/:id` - Get promotion details
- `PATCH /api/promotions/:id/status` - Pause/resume promotion
- `DELETE /api/promotions/:id` - Delete promotion

### Coins
- `GET /api/coins/balance` - Get coin balance
- `GET /api/coins/transactions` - Get transaction history
- `GET /api/coins/packages` - Get available coin packages
- `POST /api/coins/purchase` - Purchase coins
- `POST /api/coins/free-coins` - Earn free coins by watching ads
- `POST /api/coins/stop-ads` - Stop ads for 6 hours

### Ads
- `GET /api/ads` - Get ad configuration
- `POST /api/ads/configure` - Configure ad settings
- `POST /api/ads/shown` - Record ad shown
- `GET /api/ads/stats` - Get ad statistics

### Referrals
- `GET /api/referrals/my` - Get referral code and stats
- `POST /api/referrals/apply` - Apply referral code
- `POST /api/referrals/complete` - Complete referral
- `POST /api/referrals/claim` - Claim referral rewards

### Analytics
- `GET /api/analytics/dashboard` - Get analytics dashboard
- `GET /api/analytics/watch-history` - Get watch history
- `GET /api/analytics/promotions` - Get promotion analytics
- `GET /api/analytics/earnings` - Get earning trends

## 🗄️ Database Architecture

### Supabase (Production)
- **PostgreSQL** with Row Level Security (RLS)
- **Real-time subscriptions** for live updates
- **Built-in authentication** integration
- **Automatic backups** and scaling

### SQLite (Development Fallback)
- **Local development** when Supabase is not available
- **Same schema** as Supabase for consistency
- **Automatic migration** to Supabase in production

### Key Tables

- **users**: User accounts with Firebase integration
- **promoted_videos**: YouTube video promotions
- **watch_sessions**: Video watching progress and completion
- **coin_transactions**: Complete transaction history
- **user_settings**: User preferences and settings
- **referrals**: Referral system tracking

## 🔒 Security Features

### Authentication
- **Firebase Authentication** for secure user management
- **JWT tokens** for API access
- **Dual authentication** (Firebase + local fallback)

### Database Security
- **Row Level Security (RLS)** on all tables
- **Service role** for server operations
- **Anon key** for client operations
- **Foreign key constraints** for data integrity

### API Security
- **Rate limiting** to prevent abuse
- **Input validation** with Joi schemas
- **CORS configuration** for cross-origin requests
- **Helmet** for security headers

## 👥 Demo Accounts

After running the seed script, these demo accounts are available:

1. **demo@vidgro.com** / demo123 - Regular user (2000 coins)
2. **vip@vidgro.com** / vip123 - VIP user (5000 coins)  
3. **promoter@vidgro.com** / promoter123 - Promoter (10000 coins)

## 🛠️ Development

### Database Management

```bash
# Set up Supabase schema
node scripts/setup-supabase.js

# Seed demo data
npm run seed

# Check Supabase connection
node -e "require('./config/supabase').testConnection()"
```

### Testing

```bash
# Run tests
npm test

# Test specific endpoint
curl -X GET http://localhost:3000/health

# Test authentication
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@vidgro.com","password":"demo123"}'
```

### Environment Switching

```bash
# Use Supabase (production)
export USE_SUPABASE=true
npm start

# Use SQLite (development)
export USE_SUPABASE=false
npm run dev
```

## 🚀 Production Deployment

### Supabase Configuration
1. Set up production Supabase project
2. Configure environment variables
3. Run schema setup script
4. Enable RLS policies

### Firebase Configuration
1. Set up Firebase project
2. Configure authentication methods
3. Set up service account (optional)
4. Update environment variables

### Server Deployment
1. Set `NODE_ENV=production`
2. Set `USE_SUPABASE=true`
3. Configure proper CORS origins
4. Set up SSL/HTTPS
5. Configure monitoring and logging

### Environment Variables (Production)
```env
NODE_ENV=production
USE_SUPABASE=true
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
JWT_SECRET=your-strong-secret
```

## 📊 API Response Format

All API responses follow this format:

```json
{
  "success": true,
  "data": {},
  "message": "Success message"
}
```

Error responses:
```json
{
  "success": false,
  "error": "Error message"
}
```

## 🔄 Migration Guide

### From SQLite to Supabase

1. **Export SQLite data**:
   ```bash
   sqlite3 data/vidgro.db .dump > backup.sql
   ```

2. **Set up Supabase**:
   ```bash
   node scripts/setup-supabase.js
   ```

3. **Update environment**:
   ```env
   USE_SUPABASE=true
   ```

4. **Migrate data** (manual process based on your needs)

### From Local to Production

1. **Set up production Supabase project**
2. **Configure Firebase for production**
3. **Update environment variables**
4. **Deploy server with production settings**

## 🏥 Monitoring

### Health Check
```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "environment": "production"
}
```

### Database Connection
```bash
# Test Supabase connection
node -e "require('./config/supabase').testConnection()"

# Test Firebase connection
node -e "require('./config/firebase')"
```

## 📞 Support

For issues and questions:
1. Check the API documentation
2. Review error logs
3. Test with demo accounts
4. Verify environment configuration
5. Check Supabase and Firebase dashboards

## 🔗 Useful Links

- [Supabase Documentation](https://supabase.com/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [YouTube Data API](https://developers.google.com/youtube/v3)
- [Express.js Documentation](https://expressjs.com/)