# VidGro Backend API

A comprehensive backend system for the VidGro video promotion and earning platform.

## Features

- **User Authentication**: Registration, login, JWT tokens, Firebase integration
- **Video Management**: YouTube API integration, video validation, metadata extraction
- **Promotion System**: Create, manage, and track video promotions
- **Coin Economy**: Earn, spend, purchase coins with transaction history
- **Ad Management**: Configurable ad frequency, rewarded ads, ad-free periods
- **Referral System**: Referral codes, bonus rewards, tracking
- **Analytics**: Comprehensive user and promotion analytics
- **Database**: SQLite for development, easily migrable to PostgreSQL

## Quick Start

### Prerequisites

- Node.js 16+ 
- npm or yarn

### Installation

1. Clone and navigate to the server directory:
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

4. Update the `.env` file with your configuration

5. Start the server:
```bash
# Development
npm run dev

# Production
npm start
```

6. Seed the database with demo data:
```bash
npm run seed
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
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

## Database Schema

### Users
- User accounts with email/password authentication
- Coin balance and VIP status tracking
- Ad preferences and settings

### Promoted Videos
- YouTube video promotions with metadata
- View tracking and completion status
- Cost and reward calculations

### Watch Sessions
- Individual video watching sessions
- Progress tracking and completion status
- Coin earning records

### Transactions
- Complete coin transaction history
- Earning, spending, and purchase records
- Reference tracking for related activities

## Configuration

### Environment Variables

Key environment variables to configure:

```env
PORT=3000
JWT_SECRET=your-secret-key
YOUTUBE_API_KEY=AIzaSyBJ0Tu-2JFectz7e7ieMEJ7Pl8Yh0o8Kg8
FRONTEND_URL=http://localhost:8081
```

### YouTube API Integration

The system uses YouTube Data API v3 for:
- Video URL validation
- Metadata extraction (title, duration, thumbnail)
- Embed URL generation
- Public video verification

### Firebase Authentication

Configured for Firebase Auth integration:
- Token verification
- User management
- Secure authentication flow

## Demo Accounts

After running `npm run seed`, these demo accounts are available:

1. **demo@vidgro.com** / demo123 - Regular user (2000 coins)
2. **vip@vidgro.com** / vip123 - VIP user (5000 coins)  
3. **promoter@vidgro.com** / promoter123 - Promoter (10000 coins)

## Security Features

- JWT token authentication
- Password hashing with bcrypt
- Input validation and sanitization
- CORS configuration
- Rate limiting ready
- SQL injection prevention

## Development

### Database Management

```bash
# View database schema
sqlite3 data/vidgro.db ".schema"

# Query users
sqlite3 data/vidgro.db "SELECT * FROM users;"

# Reset database
rm data/vidgro.db && npm run seed
```

### Testing

```bash
# Run tests
npm test

# Test specific endpoint
curl -X GET http://localhost:3000/health
```

## Production Deployment

1. Set `NODE_ENV=production`
2. Use strong JWT secret
3. Configure proper CORS origins
4. Set up SSL/HTTPS
5. Use PostgreSQL for production database
6. Configure proper logging
7. Set up monitoring and alerts

## API Response Format

All API responses follow this format:

```json
{
  "success": true,
  "data": {},
  "message": "Success message",
  "error": null
}
```

Error responses:
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Rate Limiting

API endpoints are rate limited to prevent abuse:
- 100 requests per 15 minutes per IP
- Configurable via environment variables
- Different limits for different endpoint types

## Monitoring

Health check endpoint available at `/health`:

```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

## Support

For issues and questions:
1. Check the API documentation
2. Review error logs
3. Test with demo accounts
4. Verify environment configuration