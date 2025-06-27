const express = require('express');
const database = require('../config/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

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
            should_show_ads: shouldShowAds,
            should_show_ad_now: shouldShowAdNow,
            ad_frequency: user.ad_frequency,
            videos_until_next_ad: shouldShowAds ? Math.max(0, user.ad_frequency - recentWatches.count) : 0,
            ads_stopped_until: user.stop_ads_until,
            is_vip: user.is_vip,
            ad_personalization: settings.ad_personalization
        });
    } catch (error) {
        console.error('Get ads config error:', error);
        res.status(500).json({ error: 'Failed to get ad configuration' });
    }
});

// Configure ad settings
router.post('/configure', authenticate, async (req, res) => {
    try {
        const { ad_frequency } = req.body;

        if (ad_frequency && (ad_frequency < 1 || ad_frequency > 10)) {
            return res.status(400).json({ error: 'Ad frequency must be between 1 and 10' });
        }

        await database.run(`
            UPDATE users 
            SET ad_frequency = COALESCE(?, ad_frequency)
            WHERE id = ?
        `, [ad_frequency, req.user.id]);

        res.json({ message: 'Ad settings updated successfully' });
    } catch (error) {
        console.error('Configure ads error:', error);
        res.status(500).json({ error: 'Failed to configure ads' });
    }
});

// Record ad shown
router.post('/shown', authenticate, async (req, res) => {
    try {
        const { ad_type = 'interstitial' } = req.body;

        await database.run(`
            UPDATE users 
            SET last_ad_shown = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [req.user.id]);

        // Record ad session
        await database.run(`
            INSERT INTO ad_sessions (user_id, ad_type, coins_earned, duration)
            VALUES (?, ?, 0, 30)
        `, [req.user.id, ad_type]);

        res.json({ message: 'Ad shown recorded' });
    } catch (error) {
        console.error('Record ad shown error:', error);
        res.status(500).json({ error: 'Failed to record ad shown' });
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

        res.json({
            ...stats,
            ...recentAds,
            total_coins_from_ads: stats.total_coins_from_ads || 0,
            avg_ad_duration: Math.round(stats.avg_ad_duration || 0)
        });
    } catch (error) {
        console.error('Get ad stats error:', error);
        res.status(500).json({ error: 'Failed to get ad statistics' });
    }
});

module.exports = router;