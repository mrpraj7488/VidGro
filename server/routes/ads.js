const express = require('express');
const Joi = require('joi');
const database = require('../config/database');
const { authenticate, validateRequest } = require('../middleware/auth');
const router = express.Router();

// Validation schemas
const configureSchema = Joi.object({
    ad_frequency: Joi.number().integer().min(1).max(10).optional()
});

const adShownSchema = Joi.object({
    ad_type: Joi.string().valid('interstitial', 'rewarded', 'banner').default('interstitial')
});

// Get ad configuration for user
router.get('/', authenticate, async (req, res) => {
    try {
        const user = await database.get(`
            SELECT ad_frequency, last_ad_shown, stop_ads_until, is_vip
            FROM users WHERE id = ?
        `, [req.user.id]);

        const settings = await database.get(`
            SELECT ad_personalization FROM user_settings WHERE user_id = ?
        `, [req.user.id]);

        // Check if ads should be shown
        const now = new Date();
        const adsStoppedUntil = user.stop_ads_until ? new Date(user.stop_ads_until) : null;
        const shouldShowAds = !user.is_vip && (!adsStoppedUntil || now > adsStoppedUntil);

        // Get recent watch count to determine if ad should be shown
        const recentWatches = await database.get(`
            SELECT COUNT(*) as count FROM watch_sessions 
            WHERE user_id = ? AND completed = 1 
            AND timestamp > COALESCE(?, datetime('now', '-1 day'))
        `, [req.user.id, user.last_ad_shown]);

        const shouldShowAdNow = shouldShowAds && (recentWatches.count >= user.ad_frequency);

        res.json({
            success: true,
            data: {
                should_show_ads: shouldShowAds,
                should_show_ad_now: shouldShowAdNow,
                ad_frequency: user.ad_frequency,
                videos_until_next_ad: shouldShowAds ? Math.max(0, user.ad_frequency - recentWatches.count) : 0,
                ads_stopped_until: user.stop_ads_until,
                is_vip: user.is_vip,
                ad_personalization: settings?.ad_personalization || true
            }
        });
    } catch (error) {
        console.error('Get ads config error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to get ad configuration' 
        });
    }
});

// Configure ad settings
router.post('/configure', authenticate, validateRequest(configureSchema), async (req, res) => {
    try {
        const { ad_frequency } = req.body;

        await database.run(`
            UPDATE users 
            SET ad_frequency = COALESCE(?, ad_frequency), updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [ad_frequency, req.user.id]);

        res.json({ 
            success: true,
            message: 'Ad settings updated successfully' 
        });
    } catch (error) {
        console.error('Configure ads error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to configure ads' 
        });
    }
});

// Record ad shown
router.post('/shown', authenticate, validateRequest(adShownSchema), async (req, res) => {
    try {
        const { ad_type } = req.body;

        await database.run(`
            UPDATE users 
            SET last_ad_shown = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [req.user.id]);

        // Record ad session
        await database.run(`
            INSERT INTO ad_sessions (user_id, ad_type, coins_earned, duration)
            VALUES (?, ?, 0, 30)
        `, [req.user.id, ad_type]);

        res.json({ 
            success: true,
            message: 'Ad shown recorded' 
        });
    } catch (error) {
        console.error('Record ad shown error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to record ad shown' 
        });
    }
});

// Get ad statistics
router.get('/stats', authenticate, async (req, res) => {
    try {
        const stats = await database.get(`
            SELECT 
                COUNT(*) as total_ads_watched,
                SUM(coins_earned) as total_coins_from_ads,
                AVG(duration) as avg_ad_duration
            FROM ad_sessions 
            WHERE user_id = ?
        `, [req.user.id]);

        const recentAds = await database.get(`
            SELECT COUNT(*) as ads_this_week
            FROM ad_sessions 
            WHERE user_id = ? AND timestamp > datetime('now', '-7 days')
        `, [req.user.id]);

        const adTypes = await database.all(`
            SELECT ad_type, COUNT(*) as count
            FROM ad_sessions 
            WHERE user_id = ?
            GROUP BY ad_type
        `, [req.user.id]);

        res.json({
            success: true,
            data: {
                total_ads_watched: stats.total_ads_watched || 0,
                total_coins_from_ads: stats.total_coins_from_ads || 0,
                avg_ad_duration: Math.round(stats.avg_ad_duration || 0),
                ads_this_week: recentAds.ads_this_week || 0,
                ad_types: adTypes
            }
        });
    } catch (error) {
        console.error('Get ad stats error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to get ad statistics' 
        });
    }
});

module.exports = router;