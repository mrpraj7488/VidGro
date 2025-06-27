const express = require('express');
const Joi = require('joi');
const database = require('../config/database');
const { authenticate, validateRequest } = require('../middleware/auth');
const router = express.Router();

// Validation schemas
const purchaseSchema = Joi.object({
    package_id: Joi.string().valid('small', 'medium', 'large', 'mega').required(),
    payment_method: Joi.string().optional()
});

const freeCoinsSchema = Joi.object({
    ad_type: Joi.string().valid('rewarded', 'interstitial').default('rewarded')
});

// Get coin balance
router.get('/balance', authenticate, async (req, res) => {
    try {
        const user = await database.get('SELECT coin_balance FROM users WHERE id = ?', [req.user.id]);
        
        res.json({ 
            success: true,
            data: {
                balance: user.coin_balance
            }
        });
    } catch (error) {
        console.error('Get balance error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to get balance' 
        });
    }
});

// Get coin transaction history
router.get('/transactions', authenticate, async (req, res) => {
    try {
        const { limit = 50, offset = 0, type } = req.query;

        let whereClause = 'WHERE user_id = ?';
        let params = [req.user.id];

        if (type && ['earned', 'spent', 'purchased', 'bonus'].includes(type)) {
            whereClause += ' AND transaction_type = ?';
            params.push(type);
        }

        const transactions = await database.all(`
            SELECT * FROM coin_transactions 
            ${whereClause}
            ORDER BY timestamp DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), parseInt(offset)]);

        // Get total count
        const totalResult = await database.get(`
            SELECT COUNT(*) as total FROM coin_transactions ${whereClause}
        `, params);

        // Get summary stats
        const stats = await database.get(`
            SELECT 
                SUM(CASE WHEN transaction_type = 'earned' THEN amount ELSE 0 END) as total_earned,
                SUM(CASE WHEN transaction_type = 'spent' THEN amount ELSE 0 END) as total_spent,
                SUM(CASE WHEN transaction_type = 'purchased' THEN amount ELSE 0 END) as total_purchased
            FROM coin_transactions 
            WHERE user_id = ?
        `, [req.user.id]);

        res.json({ 
            success: true,
            data: {
                transactions,
                pagination: {
                    total: totalResult.total,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    has_more: (parseInt(offset) + transactions.length) < totalResult.total
                },
                stats: {
                    total_earned: stats.total_earned || 0,
                    total_spent: stats.total_spent || 0,
                    total_purchased: stats.total_purchased || 0
                }
            }
        });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to get transactions' 
        });
    }
});

// Buy coins (simulate purchase)
router.post('/purchase', authenticate, validateRequest(purchaseSchema), async (req, res) => {
    try {
        const { package_id, payment_method = 'credit_card' } = req.body;

        // Define coin packages
        const packages = {
            'small': { coins: 100, price: 0.99, popular: false },
            'medium': { coins: 500, price: 3.99, popular: true },
            'large': { coins: 1000, price: 6.99, popular: false },
            'mega': { coins: 2500, price: 14.99, popular: false }
        };

        const selectedPackage = packages[package_id];

        // In a real app, you would process the payment here
        // For demo purposes, we'll just add the coins

        // Begin transaction
        await database.run('BEGIN TRANSACTION');

        try {
            // Add coins to user balance
            await database.run(`
                UPDATE users 
                SET coin_balance = coin_balance + ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [selectedPackage.coins, req.user.id]);

            // Record transaction
            await database.run(`
                INSERT INTO coin_transactions (user_id, transaction_type, amount, description)
                VALUES (?, 'purchased', ?, ?)
            `, [req.user.id, selectedPackage.coins, `Purchased ${package_id} package ($${selectedPackage.price})`]);

            await database.run('COMMIT');

            // Get updated balance
            const user = await database.get('SELECT coin_balance FROM users WHERE id = ?', [req.user.id]);

            res.json({
                success: true,
                message: 'Coins purchased successfully',
                data: {
                    coins_added: selectedPackage.coins,
                    new_balance: user.coin_balance,
                    package: {
                        id: package_id,
                        coins: selectedPackage.coins,
                        price: selectedPackage.price
                    }
                }
            });
        } catch (error) {
            await database.run('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Purchase coins error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to purchase coins' 
        });
    }
});

// Earn free coins by watching ads
router.post('/free-coins', authenticate, validateRequest(freeCoinsSchema), async (req, res) => {
    try {
        const { ad_type } = req.body;

        // Check if user has watched an ad recently (limit to once per hour)
        const recentAd = await database.get(`
            SELECT * FROM ad_sessions 
            WHERE user_id = ? AND timestamp > datetime('now', '-1 hour')
        `, [req.user.id]);

        if (recentAd) {
            const timeRemaining = new Date(recentAd.timestamp);
            timeRemaining.setHours(timeRemaining.getHours() + 1);
            
            return res.status(400).json({ 
                success: false,
                error: 'You can only watch one ad per hour',
                data: {
                    next_available: timeRemaining.toISOString()
                }
            });
        }

        // Random coins between 150-400
        const coinsEarned = Math.floor(Math.random() * 251) + 150;

        // Begin transaction
        await database.run('BEGIN TRANSACTION');

        try {
            // Add coins to user balance
            await database.run(`
                UPDATE users 
                SET coin_balance = coin_balance + ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [coinsEarned, req.user.id]);

            // Record ad session
            await database.run(`
                INSERT INTO ad_sessions (user_id, ad_type, coins_earned)
                VALUES (?, ?, ?)
            `, [req.user.id, ad_type, coinsEarned]);

            // Record coin transaction
            await database.run(`
                INSERT INTO coin_transactions (user_id, transaction_type, amount, description)
                VALUES (?, 'earned', ?, ?)
            `, [req.user.id, coinsEarned, `Watched ${ad_type} advertisement`]);

            await database.run('COMMIT');

            // Get updated balance
            const user = await database.get('SELECT coin_balance FROM users WHERE id = ?', [req.user.id]);

            res.json({
                success: true,
                message: 'Free coins earned successfully',
                data: {
                    coins_earned: coinsEarned,
                    new_balance: user.coin_balance,
                    ad_type
                }
            });
        } catch (error) {
            await database.run('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Free coins error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to earn free coins' 
        });
    }
});

// Stop ads for 6 hours (costs 50 coins)
router.post('/stop-ads', authenticate, async (req, res) => {
    try {
        const cost = 50;

        if (req.user.coin_balance < cost) {
            return res.status(400).json({ 
                success: false,
                error: 'Insufficient coins',
                data: {
                    required: cost,
                    available: req.user.coin_balance
                }
            });
        }

        // Begin transaction
        await database.run('BEGIN TRANSACTION');

        try {
            // Deduct coins
            await database.run(`
                UPDATE users 
                SET coin_balance = coin_balance - ?, 
                    stop_ads_until = datetime('now', '+6 hours'),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [cost, req.user.id]);

            // Record transaction
            await database.run(`
                INSERT INTO coin_transactions (user_id, transaction_type, amount, description)
                VALUES (?, 'spent', ?, 'Stop ads for 6 hours')
            `, [req.user.id, cost]);

            await database.run('COMMIT');

            // Get updated balance
            const user = await database.get('SELECT coin_balance, stop_ads_until FROM users WHERE id = ?', [req.user.id]);

            res.json({
                success: true,
                message: 'Ads stopped for 6 hours',
                data: {
                    new_balance: user.coin_balance,
                    ads_stopped_until: user.stop_ads_until,
                    cost
                }
            });
        } catch (error) {
            await database.run('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Stop ads error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to stop ads' 
        });
    }
});

// Get available coin packages
router.get('/packages', (req, res) => {
    const packages = [
        { id: 'small', coins: 100, price: 0.99, popular: false },
        { id: 'medium', coins: 500, price: 3.99, popular: true },
        { id: 'large', coins: 1000, price: 6.99, popular: false },
        { id: 'mega', coins: 2500, price: 14.99, popular: false }
    ];

    res.json({
        success: true,
        data: {
            packages
        }
    });
});

module.exports = router;