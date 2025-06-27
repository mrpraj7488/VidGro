const express = require('express');
const Joi = require('joi');
const database = require('../config/database');
const { authenticate, validateRequest } = require('../middleware/auth');
const router = express.Router();

// Validation schemas
const applyReferralSchema = Joi.object({
    referral_code: Joi.string().pattern(/^VIDGRO\d+$/).required()
});

// Get user's referral code and stats
router.get('/my', authenticate, async (req, res) => {
    try {
        // Generate referral code
        const referralCode = `VIDGRO${req.user.id.toString().padStart(3, '0')}`;

        // Get referral stats
        const stats = await database.get(`
            SELECT 
                COUNT(*) as total_referrals,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_referrals,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_referrals,
                SUM(CASE WHEN status = 'completed' THEN bonus_coins ELSE 0 END) as total_earned
            FROM referrals 
            WHERE referrer_id = ?
        `, [req.user.id]);

        // Get recent referrals
        const recentReferrals = await database.all(`
            SELECT r.*, u.email as referred_email
            FROM referrals r
            JOIN users u ON r.referred_id = u.id
            WHERE r.referrer_id = ?
            ORDER BY r.created_at DESC
            LIMIT 10
        `, [req.user.id]);

        // Get monthly stats
        const monthlyStats = await database.get(`
            SELECT 
                COUNT(*) as this_month_referrals,
                SUM(CASE WHEN status = 'completed' THEN bonus_coins ELSE 0 END) as this_month_earned
            FROM referrals 
            WHERE referrer_id = ? AND created_at > datetime('now', 'start of month')
        `, [req.user.id]);

        res.json({
            success: true,
            data: {
                referral_code: referralCode,
                stats: {
                    total_referrals: stats.total_referrals || 0,
                    completed_referrals: stats.completed_referrals || 0,
                    pending_referrals: stats.pending_referrals || 0,
                    total_earned: stats.total_earned || 0,
                    this_month_referrals: monthlyStats.this_month_referrals || 0,
                    this_month_earned: monthlyStats.this_month_earned || 0
                },
                recent_referrals: recentReferrals
            }
        });
    } catch (error) {
        console.error('Get referral data error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to get referral data' 
        });
    }
});

// Apply referral code during registration
router.post('/apply', authenticate, validateRequest(applyReferralSchema), async (req, res) => {
    try {
        const { referral_code } = req.body;

        // Check if user already used a referral code
        const existingReferral = await database.get(`
            SELECT * FROM referrals WHERE referred_id = ?
        `, [req.user.id]);

        if (existingReferral) {
            return res.status(400).json({ 
                success: false,
                error: 'You have already used a referral code' 
            });
        }

        // Extract referrer ID from code (format: VIDGRO001, VIDGRO002, etc.)
        const codeMatch = referral_code.match(/^VIDGRO(\d+)$/);
        if (!codeMatch) {
            return res.status(400).json({ 
                success: false,
                error: 'Invalid referral code format' 
            });
        }

        const referrerId = parseInt(codeMatch[1]);

        // Check if referrer exists and is not the same user
        const referrer = await database.get('SELECT * FROM users WHERE id = ?', [referrerId]);
        if (!referrer) {
            return res.status(400).json({ 
                success: false,
                error: 'Invalid referral code' 
            });
        }

        if (referrerId === req.user.id) {
            return res.status(400).json({ 
                success: false,
                error: 'Cannot use your own referral code' 
            });
        }

        // Create referral record
        await database.run(`
            INSERT INTO referrals (referrer_id, referred_id, referral_code, status)
            VALUES (?, ?, ?, 'pending')
        `, [referrerId, req.user.id, referral_code]);

        res.json({ 
            success: true,
            message: 'Referral code applied successfully. Complete your first video to activate the bonus!' 
        });
    } catch (error) {
        console.error('Apply referral error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to apply referral code' 
        });
    }
});

// Complete referral (called when referred user completes first video)
router.post('/complete', authenticate, async (req, res) => {
    try {
        // Check if user has a pending referral
        const referral = await database.get(`
            SELECT * FROM referrals 
            WHERE referred_id = ? AND status = 'pending'
        `, [req.user.id]);

        if (!referral) {
            return res.json({ 
                success: true,
                message: 'No pending referral to complete' 
            });
        }

        // Check if user has completed at least one video
        const completedVideo = await database.get(`
            SELECT * FROM watch_sessions 
            WHERE user_id = ? AND completed = 1
        `, [req.user.id]);

        if (!completedVideo) {
            return res.status(400).json({ 
                success: false,
                error: 'Must complete at least one video to activate referral bonus' 
            });
        }

        const bonusCoins = 500;

        // Begin transaction
        await database.run('BEGIN TRANSACTION');

        try {
            // Mark referral as completed
            await database.run(`
                UPDATE referrals 
                SET status = 'completed', completed_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [referral.id]);

            // Give bonus coins to both users
            await database.run(`
                UPDATE users 
                SET coin_balance = coin_balance + ?, updated_at = CURRENT_TIMESTAMP
                WHERE id IN (?, ?)
            `, [bonusCoins, referral.referrer_id, referral.referred_id]);

            // Record transactions for both users
            await database.run(`
                INSERT INTO coin_transactions (user_id, transaction_type, amount, description, reference_id)
                VALUES 
                (?, 'earned', ?, 'Referral bonus (referrer)', ?),
                (?, 'earned', ?, 'Referral bonus (referred)', ?)
            `, [
                referral.referrer_id, bonusCoins, 'Referred new user', referral.id,
                referral.referred_id, bonusCoins, 'Used referral code', referral.id
            ]);

            await database.run('COMMIT');

            res.json({
                success: true,
                message: 'Referral completed successfully! Both users received bonus coins.',
                data: {
                    bonus_coins: bonusCoins
                }
            });
        } catch (error) {
            await database.run('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Complete referral error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to complete referral' 
        });
    }
});

// Claim pending referral rewards (informational endpoint)
router.post('/claim', authenticate, async (req, res) => {
    try {
        // Get completed referrals
        const completedReferrals = await database.all(`
            SELECT * FROM referrals 
            WHERE referrer_id = ? AND status = 'completed'
        `, [req.user.id]);

        if (completedReferrals.length === 0) {
            return res.status(400).json({ 
                success: false,
                error: 'No referral rewards to claim' 
            });
        }

        const totalReward = completedReferrals.reduce((sum, ref) => sum + ref.bonus_coins, 0);

        res.json({
            success: true,
            message: 'Referral rewards information',
            data: {
                completed_referrals: completedReferrals.length,
                total_reward: totalReward,
                note: 'Rewards are automatically added when referrals complete their first video'
            }
        });
    } catch (error) {
        console.error('Claim referral rewards error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to get referral rewards information' 
        });
    }
});

module.exports = router;