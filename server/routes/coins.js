const express = require('express');
const database = require('../config/database');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Get coin balance
router.get('/balance', authenticate, async (req, res) => {
    try {
        const user = await database.get('SELECT coin_balance FROM users WHERE id = ?', [req.user.id]);
        res.json({ balance: user.coin_balance });
    } catch (error) {
        console.error('Get balance error:', error);
        res.status(500).json({ error: 'Failed to get balance' });
    }
});

// Get coin transaction history
router.get('/transactions', authenticate, async (req, res) => {
    try {
        const { limit = 50, offset = 0, type } = req.query;

        let whereClause = 'WHERE user_id = ?';
        let params = [req.user.id];

        if (type) {
            whereClause += ' AND transaction_type = ?';
            params.push(type);
        }

        const transactions = await database.all(`
            SELECT * FROM coin_transactions 
            ${whereClause}
            ORDER BY timestamp DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), parseInt(offset)]);

        res.json({ transactions });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ error: 'Failed to get transactions' });
    }
});

// Buy coins (simulate purchase)
router.post('/purchase', authenticate, async (req, res) => {
    try {
        const { package_id, payment_method } = req.body;

        // Define coin packages
        const packages = {
            'small': { coins: 100, price: 0.99 },
            'medium': { coins: 500, price: 3.99 },
            'large': { coins: 1000, price: 6.99 },
            'mega': { coins: 2500, price: 14.99 }
        };

        const selectedPackage = packages[package_id];
        if (!selectedPackage) {
            return res.status(400).json({ error: 'Invalid package' });
        }

        // In a real app, you would process the payment here
        // For demo purposes, we'll just add the coins

        // Begin transaction
        await database.run('BEGIN TRANSACTION');

        try {
            // Add coins to user balance
            await database.run(`
                UPDATE users 
                SET coin_balance = coin_balance + ?
                WHERE id = ?
            `, [selectedPackage.coins, req.user.id]);

            // Record transaction
            await database.run(`
                INSERT INTO coin_transactions (user_id, transaction_type, amount, description)
                VALUES (?, 'purchased', ?, ?)
            `, [req.user.id, selectedPackage.coins, `Purchased ${package_id} package`]);

            await database.run('COMMIT');

            // Get updated balance
            const user = await database.get('SELECT coin_balance FROM users WHERE id = ?', [req.user.id]);

            res.json({
                message: 'Coins purchased successfully',
                coins_added: selectedPackage.coins,
                new_balance: user.coin_balance
            });
        } catch (error) {
            await database.run('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Purchase coins error:', error);
        res.status(500).json({ error: 'Failed to purchase coins' });
    }
});

// Earn free coins by watching ads
router.post('/free-coins', authenticate, async (req, res) => {
    try {
        const { ad_type = 'rewarded' } = req.body;

        // Check if user has watched an ad recently (limit to once per hour)
        const recentAd = await database.get(`
            SELECT * FROM ad_sessions 
            WHERE user_id = ? AND timestamp > datetime('now', '-1 hour')
        `, [req.user.id]);

        if (recentAd) {
            return res.status(400).json({ error: 'You can only watch one ad per hour' });
        }

        // Random coins between 150-400
        const coinsEarned = Math.floor(Math.random() * 251) + 150;

        // Begin transaction
        await database.run('BEGIN TRANSACTION');

        try {
            // Add coins to user balance
            await database.run(`
                UPDATE users 
                SET coin_balance = coin_balance + ?
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
                VALUES (?, 'earned', ?, 'Watched advertisement')
            `, [req.user.id, coinsEarned]);

            await database.run('COMMIT');

            // Get updated balance
            const user = await database.get('SELECT coin_balance FROM users WHERE id = ?', [req.user.id]);

            res.json({
                message: 'Free coins earned successfully',
                coins_earned: coinsEarned,
                new_balance: user.coin_balance
            });
        } catch (error) {
            await database.run('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Free coins error:', error);
        res.status(500).json({ error: 'Failed to earn free coins' });
    }
});

// Stop ads for 6 hours (costs 50 coins)
router.post('/stop-ads', authenticate, async (req, res) => {
    try {
        const cost = 50;

        if (req.user.coin_balance < cost) {
            return res.status(400).json({ error: 'Insufficient coins' });
        }

        // Begin transaction
        await database.run('BEGIN TRANSACTION');

        try {
            // Deduct coins
            await database.run(`
                UPDATE users 
                SET coin_balance = coin_balance - ?, stop_ads_until = datetime('now', '+6 hours')
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
                message: 'Ads stopped for 6 hours',
                new_balance: user.coin_balance,
                ads_stopped_until: user.stop_ads_until
            });
        } catch (error) {
            await database.run('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Stop ads error:', error);
        res.status(500).json({ error: 'Failed to stop ads' });
    }
});

module.exports = router;