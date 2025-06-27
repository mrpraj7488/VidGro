const express = require('express');
const Joi = require('joi');
const database = require('../config/database');
const youtubeService = require('../config/youtube');
const { authenticate, validateRequest } = require('../middleware/auth');
const router = express.Router();

// Validation schemas
const createPromotionSchema = Joi.object({
    youtube_url: Joi.string().uri().required(),
    views_requested: Joi.number().integer().min(1).max(10000).required()
});

const updateStatusSchema = Joi.object({
    status: Joi.string().valid('active', 'paused').required()
});

// Create new video promotion
router.post('/', authenticate, validateRequest(createPromotionSchema), async (req, res) => {
    try {
        const { youtube_url, views_requested } = req.body;

        // Validate YouTube URL and get video metadata
        let videoData;
        try {
            videoData = await youtubeService.validateVideoUrl(youtube_url);
        } catch (error) {
            return res.status(400).json({ 
                success: false,
                error: `YouTube validation failed: ${error.message}` 
            });
        }

        // Calculate costs
        const costPerView = 1.2; // Base cost per view
        const coinReward = 0.8; // What viewers earn per view
        const totalCost = Math.ceil(videoData.duration * views_requested * costPerView);

        // Check if user has enough coins
        if (req.user.coin_balance < totalCost) {
            return res.status(400).json({ 
                success: false,
                error: 'Insufficient coins',
                data: {
                    required: totalCost,
                    available: req.user.coin_balance,
                    shortfall: totalCost - req.user.coin_balance
                }
            });
        }

        // Check if user already has this video promoted
        const existingPromotion = await database.get(`
            SELECT id FROM promoted_videos 
            WHERE promoter_id = ? AND youtube_video_id = ? AND status IN ('active', 'paused')
        `, [req.user.id, videoData.videoId]);

        if (existingPromotion) {
            return res.status(400).json({ 
                success: false,
                error: 'You already have an active promotion for this video' 
            });
        }

        // Begin transaction
        await database.run('BEGIN TRANSACTION');

        try {
            // Deduct coins from user
            await database.run(`
                UPDATE users 
                SET coin_balance = coin_balance - ?, updated_at = CURRENT_TIMESTAMP
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
                VALUES (?, 'spent', ?, ?, ?)
            `, [req.user.id, totalCost, `Video promotion: ${videoData.title}`, result.id]);

            await database.run('COMMIT');

            // Get created promotion
            const promotion = await database.get('SELECT * FROM promoted_videos WHERE id = ?', [result.id]);

            res.status(201).json({
                success: true,
                message: 'Video promotion created successfully',
                data: {
                    promotion: {
                        ...promotion,
                        embed_url: youtubeService.getEmbedUrl(videoData.videoId),
                        thumbnail_url: youtubeService.getThumbnailUrl(videoData.videoId),
                        watch_url: youtubeService.getWatchUrl(videoData.videoId)
                    },
                    cost_breakdown: {
                        total_cost: totalCost,
                        cost_per_view: costPerView,
                        coin_reward_per_view: coinReward,
                        video_duration: videoData.duration
                    }
                }
            });
        } catch (error) {
            await database.run('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Create promotion error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to create promotion' 
        });
    }
});

// Get user's promotions
router.get('/my', authenticate, async (req, res) => {
    try {
        const { status, limit = 20, offset = 0 } = req.query;

        let whereClause = 'WHERE promoter_id = ?';
        let params = [req.user.id];

        if (status && ['active', 'paused', 'completed'].includes(status)) {
            whereClause += ' AND status = ?';
            params.push(status);
        }

        const promotions = await database.all(`
            SELECT * FROM promoted_videos 
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, parseInt(limit), parseInt(offset)]);

        // Get total count
        const totalResult = await database.get(`
            SELECT COUNT(*) as total FROM promoted_videos ${whereClause}
        `, params);

        // Add metadata
        const promotionsWithMetadata = promotions.map(promotion => ({
            ...promotion,
            embed_url: youtubeService.getEmbedUrl(promotion.youtube_video_id),
            thumbnail_url: youtubeService.getThumbnailUrl(promotion.youtube_video_id),
            watch_url: youtubeService.getWatchUrl(promotion.youtube_video_id),
            completion_rate: promotion.views_requested > 0 ? 
                ((promotion.views_completed / promotion.views_requested) * 100).toFixed(1) : '0.0',
            remaining_views: Math.max(0, promotion.views_requested - promotion.views_completed)
        }));

        res.json({
            success: true,
            data: {
                promotions: promotionsWithMetadata,
                pagination: {
                    total: totalResult.total,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    has_more: (parseInt(offset) + promotions.length) < totalResult.total
                }
            }
        });
    } catch (error) {
        console.error('Get promotions error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to get promotions' 
        });
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
            return res.status(404).json({ 
                success: false,
                error: 'Promotion not found' 
            });
        }

        // Check if user owns this promotion or is admin
        if (promotion.promoter_id !== req.user.id) {
            return res.status(403).json({ 
                success: false,
                error: 'Access denied' 
            });
        }

        // Get watch sessions for this promotion
        const watchSessions = await database.all(`
            SELECT ws.*, u.email as viewer_email
            FROM watch_sessions ws
            JOIN users u ON ws.user_id = u.id
            WHERE ws.video_id = ?
            ORDER BY ws.timestamp DESC
            LIMIT 50
        `, [req.params.id]);

        // Get analytics
        const analytics = await database.get(`
            SELECT 
                COUNT(*) as total_sessions,
                COUNT(CASE WHEN completed = 1 THEN 1 END) as completed_sessions,
                AVG(completion_percentage) as avg_completion,
                SUM(coins_earned) as total_coins_paid
            FROM watch_sessions 
            WHERE video_id = ?
        `, [req.params.id]);

        res.json({
            success: true,
            data: {
                promotion: {
                    ...promotion,
                    embed_url: youtubeService.getEmbedUrl(promotion.youtube_video_id),
                    thumbnail_url: youtubeService.getThumbnailUrl(promotion.youtube_video_id),
                    watch_url: youtubeService.getWatchUrl(promotion.youtube_video_id),
                    completion_rate: promotion.views_requested > 0 ? 
                        ((promotion.views_completed / promotion.views_requested) * 100).toFixed(1) : '0.0'
                },
                analytics: {
                    ...analytics,
                    avg_completion: Math.round(analytics.avg_completion || 0),
                    total_coins_paid: analytics.total_coins_paid || 0
                },
                recent_sessions: watchSessions
            }
        });
    } catch (error) {
        console.error('Get promotion details error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to get promotion details' 
        });
    }
});

// Pause/Resume promotion
router.patch('/:id/status', authenticate, validateRequest(updateStatusSchema), async (req, res) => {
    try {
        const { status } = req.body;

        // Check if user owns this promotion
        const promotion = await database.get('SELECT * FROM promoted_videos WHERE id = ? AND promoter_id = ?', [req.params.id, req.user.id]);
        
        if (!promotion) {
            return res.status(404).json({ 
                success: false,
                error: 'Promotion not found' 
            });
        }

        if (promotion.status === 'completed') {
            return res.status(400).json({ 
                success: false,
                error: 'Cannot modify completed promotion' 
            });
        }

        await database.run('UPDATE promoted_videos SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, req.params.id]);

        res.json({ 
            success: true,
            message: `Promotion ${status} successfully` 
        });
    } catch (error) {
        console.error('Update promotion status error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to update promotion status' 
        });
    }
});

// Delete promotion (only if no views completed)
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const promotion = await database.get('SELECT * FROM promoted_videos WHERE id = ? AND promoter_id = ?', [req.params.id, req.user.id]);
        
        if (!promotion) {
            return res.status(404).json({ 
                success: false,
                error: 'Promotion not found' 
            });
        }

        if (promotion.views_completed > 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Cannot delete promotion with completed views' 
            });
        }

        // Begin transaction
        await database.run('BEGIN TRANSACTION');

        try {
            // Refund coins
            await database.run(`
                UPDATE users 
                SET coin_balance = coin_balance + ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [promotion.total_cost, req.user.id]);

            // Record refund transaction
            await database.run(`
                INSERT INTO coin_transactions (user_id, transaction_type, amount, description, reference_id)
                VALUES (?, 'earned', ?, ?, ?)
            `, [req.user.id, promotion.total_cost, `Promotion refund: ${promotion.title}`, promotion.id]);

            // Delete any incomplete watch sessions
            await database.run('DELETE FROM watch_sessions WHERE video_id = ? AND completed = 0', [req.params.id]);

            // Delete promotion
            await database.run('DELETE FROM promoted_videos WHERE id = ?', [req.params.id]);

            await database.run('COMMIT');

            res.json({ 
                success: true,
                message: 'Promotion deleted and coins refunded' 
            });
        } catch (error) {
            await database.run('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Delete promotion error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to delete promotion' 
        });
    }
});

module.exports = router;