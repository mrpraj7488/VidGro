const express = require('express');
const database = require('../config/database');
const youtubeService = require('../config/youtube');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Create new video promotion
router.post('/', authenticate, async (req, res) => {
    try {
        const { youtube_url, views_requested } = req.body;

        if (!youtube_url || !views_requested) {
            return res.status(400).json({ error: 'YouTube URL and views requested are required' });
        }

        if (views_requested < 1 || views_requested > 10000) {
            return res.status(400).json({ error: 'Views requested must be between 1 and 10,000' });
        }

        // Validate YouTube URL and get video metadata
        let videoData;
        try {
            videoData = await youtubeService.validateVideoUrl(youtube_url);
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }

        // Check video duration limits (10 seconds to 5 minutes)
        if (videoData.duration < 10 || videoData.duration > 300) {
            return res.status(400).json({ error: 'Video duration must be between 10 seconds and 5 minutes' });
        }

        // Calculate costs
        const costPerView = 1.2; // Base cost per view
        const coinReward = 0.8; // What viewers earn per view
        const totalCost = Math.ceil(videoData.duration * views_requested * costPerView);

        // Check if user has enough coins
        if (req.user.coin_balance < totalCost) {
            return res.status(400).json({ 
                error: 'Insufficient coins',
                required: totalCost,
                available: req.user.coin_balance
            });
        }

        // Begin transaction
        await database.run('BEGIN TRANSACTION');

        try {
            // Deduct coins from user
            await database.run(`
                UPDATE users 
                SET coin_balance = coin_balance - ?
                WHERE id = ?
            `, [totalCost, req.user.id]);

            // Create promotion
            const result = await database.run(`
                INSERT INTO promoted_videos (
                    promoter_id, youtube_url, youtube_video_id, title, duration,
                    views_requested, cost_per_view, total_cost, coin_reward
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                req.user.id,
                youtube_url,
                videoData.videoId,
                videoData.title,
                videoData.duration,
                views_requested,
                costPerView,
                totalCost,
                coinReward
            ]);

            // Record coin transaction
            await database.run(`
                INSERT INTO coin_transactions (user_id, transaction_type, amount, description, reference_id)
                VALUES (?, 'spent', ?, 'Video promotion', ?)
            `, [req.user.id, totalCost, result.id]);

            await database.run('COMMIT');

            // Get created promotion
            const promotion = await database.get('SELECT * FROM promoted_videos WHERE id = ?', [result.id]);

            res.status(201).json({
                message: 'Video promotion created successfully',
                promotion: {
                    ...promotion,
                    embed_url: youtubeService.getEmbedUrl(videoData.videoId),
                    thumbnail_url: youtubeService.getThumbnailUrl(videoData.videoId)
                }
            });
        } catch (error) {
            await database.run('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Create promotion error:', error);
        res.status(500).json({ error: 'Failed to create promotion' });
    }
});

// Get user's promotions
router.get('/my', authenticate, async (req, res) => {
    try {
        const { status, limit = 20, offset = 0 } = req.query;

        let whereClause = 'WHERE promoter_id = ?';
        let params = [req.user.id];

        if (status) {
            whereClause += ' AND status = ?';
            params.push(status);
        }

        const promotions = await database.all(`
            SELECT * FROM promoted_videos 
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), parseInt(offset)]);

        // Add metadata
        const promotionsWithMetadata = promotions.map(promotion => ({
            ...promotion,
            embed_url: youtubeService.getEmbedUrl(promotion.youtube_video_id),
            thumbnail_url: youtubeService.getThumbnailUrl(promotion.youtube_video_id),
            completion_rate: promotion.views_requested > 0 ? 
                (promotion.views_completed / promotion.views_requested * 100).toFixed(1) : 0
        }));

        res.json({
            promotions: promotionsWithMetadata,
            total: promotions.length
        });
    } catch (error) {
        console.error('Get promotions error:', error);
        res.status(500).json({ error: 'Failed to get promotions' });
    }
});

// Get promotion details
router.get('/:id', authenticate, async (req, res) => {
    try {
        const promotion = await database.get(`
            SELECT pv.*, u.email as promoter_email
            FROM promoted_videos pv
            JOIN users u ON pv.promoter_id = u.id
            WHERE pv.id = ?
        `, [req.params.id]);

        if (!promotion) {
            return res.status(404).json({ error: 'Promotion not found' });
        }

        // Get watch sessions for this promotion
        const watchSessions = await database.all(`
            SELECT ws.*, u.email as viewer_email
            FROM watch_sessions ws
            JOIN users u ON ws.user_id = u.id
            WHERE ws.video_id = ?
            ORDER BY ws.timestamp DESC
        `, [req.params.id]);

        res.json({
            promotion: {
                ...promotion,
                embed_url: youtubeService.getEmbedUrl(promotion.youtube_video_id),
                thumbnail_url: youtubeService.getThumbnailUrl(promotion.youtube_video_id),
                completion_rate: promotion.views_requested > 0 ? 
                    (promotion.views_completed / promotion.views_requested * 100).toFixed(1) : 0
            },
            watch_sessions: watchSessions
        });
    } catch (error) {
        console.error('Get promotion details error:', error);
        res.status(500).json({ error: 'Failed to get promotion details' });
    }
});

// Pause/Resume promotion
router.patch('/:id/status', authenticate, async (req, res) => {
    try {
        const { status } = req.body;

        if (!['active', 'paused'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Must be "active" or "paused"' });
        }

        // Check if user owns this promotion
        const promotion = await database.get('SELECT * FROM promoted_videos WHERE id = ? AND promoter_id = ?', [req.params.id, req.user.id]);
        
        if (!promotion) {
            return res.status(404).json({ error: 'Promotion not found' });
        }

        if (promotion.status === 'completed') {
            return res.status(400).json({ error: 'Cannot modify completed promotion' });
        }

        await database.run('UPDATE promoted_videos SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, req.params.id]);

        res.json({ message: `Promotion ${status} successfully` });
    } catch (error) {
        console.error('Update promotion status error:', error);
        res.status(500).json({ error: 'Failed to update promotion status' });
    }
});

// Delete promotion (only if no views completed)
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const promotion = await database.get('SELECT * FROM promoted_videos WHERE id = ? AND promoter_id = ?', [req.params.id, req.user.id]);
        
        if (!promotion) {
            return res.status(404).json({ error: 'Promotion not found' });
        }

        if (promotion.views_completed > 0) {
            return res.status(400).json({ error: 'Cannot delete promotion with completed views' });
        }

        // Begin transaction
        await database.run('BEGIN TRANSACTION');

        try {
            // Refund coins
            await database.run(`
                UPDATE users 
                SET coin_balance = coin_balance + ?
                WHERE id = ?
            `, [promotion.total_cost, req.user.id]);

            // Record refund transaction
            await database.run(`
                INSERT INTO coin_transactions (user_id, transaction_type, amount, description, reference_id)
                VALUES (?, 'earned', ?, 'Promotion refund', ?)
            `, [req.user.id, promotion.total_cost, promotion.id]);

            // Delete promotion
            await database.run('DELETE FROM promoted_videos WHERE id = ?', [req.params.id]);

            await database.run('COMMIT');

            res.json({ message: 'Promotion deleted and coins refunded' });
        } catch (error) {
            await database.run('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Delete promotion error:', error);
        res.status(500).json({ error: 'Failed to delete promotion' });
    }
});

module.exports = router;