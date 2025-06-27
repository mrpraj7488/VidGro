const express = require('express');
const database = require('../config/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Get user analytics dashboard
router.get('/dashboard', authenticate, async (req, res) => {
    try {
        // Get basic user stats
        const userStats = await database.get(`
            SELECT 
                coin_balance,
                is_vip,
                created_at,
                (SELECT COUNT(*) FROM promoted_videos WHERE promoter_id = ?) as total_promotions
            FROM users WHERE id = ?
        `, [req.user.id, req.user.id]);

        // Get video watching stats
        const watchStats = await database.get(`
            SELECT 
                COUNT(*) as videos_watched,
                SUM(coins_earned) as total_earned,
                AVG(completion_percentage) as avg_completion,
                SUM(watch_duration) as total_watch_time
            FROM watch_sessions 
            WHERE user_id = ? AND completed = 1
        `, [req.user.id]);

        // Get promotion stats
        const promotionStats = await database.get(`
            SELECT 
                COUNT(*) as active_promotions,
                SUM(views_completed) as total_views,
                SUM(total_cost) as total_spent
            FROM promoted_videos 
            WHERE promoter_id = ? AND status = 'active'
        `, [req.user.id]);

        // Get recent activity (last 7 days)
        const recentActivity = await database.all(`
            SELECT 
                DATE(timestamp) as date,
                COUNT(*) as videos_watched,
                SUM(coins_earned) as coins_earned
            FROM watch_sessions 
            WHERE user_id = ? AND completed = 1 
            AND timestamp > datetime('now', '-7 days')
            GROUP BY DATE(timestamp)
            ORDER BY date DESC
        `, [req.user.id]);

        // Get top earning days
        const topEarningDays = await database.all(`
            SELECT 
                DATE(timestamp) as date,
                SUM(coins_earned) as daily_earnings
            FROM watch_sessions 
            WHERE user_id = ? AND completed = 1 
            AND timestamp > datetime('now', '-30 days')
            GROUP BY DATE(timestamp)
            ORDER BY daily_earnings DESC
            LIMIT 5
        `, [req.user.id]);

        // Get referral stats
        const referralStats = await database.get(`
            SELECT 
                COUNT(*) as total_referrals,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_referrals,
                SUM(CASE WHEN status = 'completed' THEN bonus_coins ELSE 0 END) as referral_earnings
            FROM referrals 
            WHERE referrer_id = ?
        `, [req.user.id]);

        res.json({
            success: true,
            data: {
                user_stats: {
                    ...userStats,
                    account_age_days: Math.floor((new Date() - new Date(userStats.created_at)) / (1000 * 60 * 60 * 24))
                },
                watch_stats: {
                    videos_watched: watchStats.videos_watched || 0,
                    total_earned: watchStats.total_earned || 0,
                    avg_completion: Math.round(watchStats.avg_completion || 0),
                    total_watch_time: Math.round(watchStats.total_watch_time || 0)
                },
                promotion_stats: {
                    active_promotions: promotionStats.active_promotions || 0,
                    total_views: promotionStats.total_views || 0,
                    total_spent: promotionStats.total_spent || 0
                },
                referral_stats: {
                    total_referrals: referralStats.total_referrals || 0,
                    completed_referrals: referralStats.completed_referrals || 0,
                    referral_earnings: referralStats.referral_earnings || 0
                },
                recent_activity: recentActivity,
                top_earning_days: topEarningDays
            }
        });
    } catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to get analytics' 
        });
    }
});

// Get detailed watch history
router.get('/watch-history', authenticate, async (req, res) => {
    try {
        const { limit = 50, offset = 0, days = 30 } = req.query;

        const watchHistory = await database.all(`
            SELECT 
                ws.*,
                pv.title,
                pv.youtube_url,
                pv.duration as video_duration,
                pv.youtube_video_id
            FROM watch_sessions ws
            JOIN promoted_videos pv ON ws.video_id = pv.id
            WHERE ws.user_id = ? 
            AND ws.timestamp > datetime('now', '-${parseInt(days)} days')
            ORDER BY ws.timestamp DESC
            LIMIT ? OFFSET ?
        `, [req.user.id, parseInt(limit), parseInt(offset)]);

        // Get total count
        const totalResult = await database.get(`
            SELECT COUNT(*) as total
            FROM watch_sessions ws
            JOIN promoted_videos pv ON ws.video_id = pv.id
            WHERE ws.user_id = ? 
            AND ws.timestamp > datetime('now', '-${parseInt(days)} days')
        `, [req.user.id]);

        res.json({ 
            success: true,
            data: {
                watch_history: watchHistory,
                pagination: {
                    total: totalResult.total,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    has_more: (parseInt(offset) + watchHistory.length) < totalResult.total
                }
            }
        });
    } catch (error) {
        console.error('Get watch history error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to get watch history' 
        });
    }
});

// Get promotion analytics
router.get('/promotions', authenticate, async (req, res) => {
    try {
        const promotions = await database.all(`
            SELECT 
                pv.*,
                COUNT(ws.id) as total_sessions,
                AVG(ws.completion_percentage) as avg_completion,
                SUM(CASE WHEN ws.completed = 1 THEN 1 ELSE 0 END) as completed_views,
                SUM(ws.coins_earned) as total_coins_paid
            FROM promoted_videos pv
            LEFT JOIN watch_sessions ws ON pv.id = ws.video_id
            WHERE pv.promoter_id = ?
            GROUP BY pv.id
            ORDER BY pv.created_at DESC
        `, [req.user.id]);

        // Calculate performance metrics
        const promotionsWithMetrics = promotions.map(promo => ({
            ...promo,
            completion_rate: promo.views_requested > 0 ? 
                ((promo.views_completed / promo.views_requested) * 100).toFixed(1) : '0.0',
            avg_completion: Math.round(promo.avg_completion || 0),
            cost_per_completed_view: promo.views_completed > 0 ? 
                (promo.total_cost / promo.views_completed).toFixed(2) : '0.00',
            roi: promo.total_cost > 0 ? 
                (((promo.views_completed * promo.coin_reward) / promo.total_cost) * 100).toFixed(1) : '0.0'
        }));

        res.json({ 
            success: true,
            data: {
                promotions: promotionsWithMetrics
            }
        });
    } catch (error) {
        console.error('Get promotion analytics error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to get promotion analytics' 
        });
    }
});

// Get earning trends
router.get('/earnings', authenticate, async (req, res) => {
    try {
        const { period = 'week' } = req.query;

        let dateFormat, dateRange;
        switch (period) {
            case 'week':
                dateFormat = '%Y-%m-%d';
                dateRange = '-7 days';
                break;
            case 'month':
                dateFormat = '%Y-%m-%d';
                dateRange = '-30 days';
                break;
            case 'year':
                dateFormat = '%Y-%m';
                dateRange = '-365 days';
                break;
            default:
                dateFormat = '%Y-%m-%d';
                dateRange = '-7 days';
        }

        const earnings = await database.all(`
            SELECT 
                strftime('${dateFormat}', timestamp) as period,
                SUM(CASE WHEN transaction_type = 'earned' THEN amount ELSE 0 END) as earned,
                SUM(CASE WHEN transaction_type = 'spent' THEN amount ELSE 0 END) as spent,
                COUNT(CASE WHEN transaction_type = 'earned' THEN 1 END) as earning_transactions,
                COUNT(CASE WHEN transaction_type = 'spent' THEN 1 END) as spending_transactions
            FROM coin_transactions 
            WHERE user_id = ? 
            AND timestamp > datetime('now', '${dateRange}')
            GROUP BY strftime('${dateFormat}', timestamp)
            ORDER BY period DESC
        `, [req.user.id]);

        // Get breakdown by source
        const earningsBySource = await database.all(`
            SELECT 
                CASE 
                    WHEN description LIKE 'Watched video%' THEN 'Video Watching'
                    WHEN description LIKE 'Watched%advertisement%' THEN 'Advertisements'
                    WHEN description LIKE 'Referral bonus%' THEN 'Referrals'
                    WHEN description LIKE 'Purchased%' THEN 'Purchases'
                    ELSE 'Other'
                END as source,
                SUM(amount) as total,
                COUNT(*) as count
            FROM coin_transactions 
            WHERE user_id = ? AND transaction_type = 'earned'
            AND timestamp > datetime('now', '${dateRange}')
            GROUP BY source
            ORDER BY total DESC
        `, [req.user.id]);

        res.json({ 
            success: true,
            data: {
                earnings,
                earnings_by_source: earningsBySource,
                period
            }
        });
    } catch (error) {
        console.error('Get earnings trends error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to get earnings trends' 
        });
    }
});

module.exports = router;