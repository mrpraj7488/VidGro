const express = require('express');
const database = require('../config/database');
const youtubeService = require('../config/youtube');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Get available videos for watching
router.get('/', authenticate, async (req, res) => {
    try {
        const { limit = 10, offset = 0 } = req.query;

        // Get videos that user hasn't completed recently
        const videos = await database.all(`
            SELECT pv.*, u.email as promoter_email
            FROM promoted_videos pv
            JOIN users u ON pv.promoter_id = u.id
            WHERE pv.status = 'active' 
            AND pv.views_completed < pv.views_requested
            AND pv.promoter_id != ?
            AND pv.id NOT IN (
                SELECT video_id FROM watch_sessions 
                WHERE user_id = ? AND completed = 1 
                AND timestamp > datetime('now', '-1 hour')
            )
            ORDER BY pv.created_at DESC
            LIMIT ? OFFSET ?
        `, [req.user.id, req.user.id, parseInt(limit), parseInt(offset)]);

        // Add embed URLs and thumbnails
        const videosWithMetadata = videos.map(video => ({
            ...video,
            embed_url: youtubeService.getEmbedUrl(video.youtube_video_id),
            thumbnail_url: youtubeService.getThumbnailUrl(video.youtube_video_id)
        }));

        res.json({
            videos: videosWithMetadata,
            total: videos.length
        });
    } catch (error) {
        console.error('Get videos error:', error);
        res.status(500).json({ error: 'Failed to get videos' });
    }
});

// Get single video details
router.get('/:id', authenticate, async (req, res) => {
    try {
        const video = await database.get(`
            SELECT pv.*, u.email as promoter_email
            FROM promoted_videos pv
            JOIN users u ON pv.promoter_id = u.id
            WHERE pv.id = ?
        `, [req.params.id]);

        if (!video) {
            return res.status(404).json({ error: 'Video not found' });
        }

        // Check if user has already watched this video recently
        const recentWatch = await database.get(`
            SELECT * FROM watch_sessions 
            WHERE user_id = ? AND video_id = ? AND completed = 1 
            AND timestamp > datetime('now', '-1 hour')
        `, [req.user.id, video.id]);

        res.json({
            ...video,
            embed_url: youtubeService.getEmbedUrl(video.youtube_video_id),
            thumbnail_url: youtubeService.getThumbnailUrl(video.youtube_video_id),
            recently_watched: !!recentWatch
        });
    } catch (error) {
        console.error('Get video error:', error);
        res.status(500).json({ error: 'Failed to get video' });
    }
});

// Start watching a video
router.post('/:id/start', authenticate, async (req, res) => {
    try {
        const video = await database.get('SELECT * FROM promoted_videos WHERE id = ? AND status = "active"', [req.params.id]);
        
        if (!video) {
            return res.status(404).json({ error: 'Video not found or not active' });
        }

        // Check if user has already watched this video recently
        const recentWatch = await database.get(`
            SELECT * FROM watch_sessions 
            WHERE user_id = ? AND video_id = ? AND completed = 1 
            AND timestamp > datetime('now', '-1 hour')
        `, [req.user.id, video.id]);

        if (recentWatch) {
            return res.status(400).json({ error: 'Video already watched recently' });
        }

        // Create watch session
        const result = await database.run(`
            INSERT INTO watch_sessions (user_id, video_id, watch_duration, completion_percentage)
            VALUES (?, ?, 0, 0)
        `, [req.user.id, video.id]);

        res.json({
            session_id: result.id,
            video: {
                ...video,
                embed_url: youtubeService.getEmbedUrl(video.youtube_video_id)
            }
        });
    } catch (error) {
        console.error('Start watch error:', error);
        res.status(500).json({ error: 'Failed to start watching' });
    }
});

// Update watch progress
router.post('/progress', authenticate, async (req, res) => {
    try {
        const { session_id, watch_duration, completion_percentage } = req.body;

        if (!session_id || watch_duration === undefined || completion_percentage === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Get watch session
        const session = await database.get(`
            SELECT ws.*, pv.duration, pv.coin_reward
            FROM watch_sessions ws
            JOIN promoted_videos pv ON ws.video_id = pv.id
            WHERE ws.id = ? AND ws.user_id = ?
        `, [session_id, req.user.id]);

        if (!session) {
            return res.status(404).json({ error: 'Watch session not found' });
        }

        // Update watch progress
        await database.run(`
            UPDATE watch_sessions 
            SET watch_duration = ?, completion_percentage = ?, timestamp = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [watch_duration, completion_percentage, session_id]);

        res.json({ message: 'Progress updated' });
    } catch (error) {
        console.error('Update progress error:', error);
        res.status(500).json({ error: 'Failed to update progress' });
    }
});

// Complete watching and earn coins
router.post('/complete', authenticate, async (req, res) => {
    try {
        const { session_id } = req.body;

        if (!session_id) {
            return res.status(400).json({ error: 'Session ID required' });
        }

        // Get watch session with video details
        const session = await database.get(`
            SELECT ws.*, pv.duration, pv.coin_reward, pv.id as video_id
            FROM watch_sessions ws
            JOIN promoted_videos pv ON ws.video_id = pv.id
            WHERE ws.id = ? AND ws.user_id = ? AND ws.completed = 0
        `, [session_id, req.user.id]);

        if (!session) {
            return res.status(404).json({ error: 'Watch session not found or already completed' });
        }

        // Check if user watched enough of the video (at least 80%)
        if (session.completion_percentage < 80) {
            return res.status(400).json({ error: 'Must watch at least 80% of the video to earn coins' });
        }

        const coinsEarned = Math.floor(session.coin_reward);

        // Begin transaction
        await database.run('BEGIN TRANSACTION');

        try {
            // Mark session as completed
            await database.run(`
                UPDATE watch_sessions 
                SET completed = 1, coins_earned = ?, timestamp = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [coinsEarned, session_id]);

            // Update user coin balance
            await database.run(`
                UPDATE users 
                SET coin_balance = coin_balance + ?
                WHERE id = ?
            `, [coinsEarned, req.user.id]);

            // Record coin transaction
            await database.run(`
                INSERT INTO coin_transactions (user_id, transaction_type, amount, description, reference_id)
                VALUES (?, 'earned', ?, 'Watched video', ?)
            `, [req.user.id, coinsEarned, session.video_id]);

            // Update video views completed
            await database.run(`
                UPDATE promoted_videos 
                SET views_completed = views_completed + 1
                WHERE id = ?
            `, [session.video_id]);

            // Check if video promotion is complete
            const video = await database.get('SELECT views_requested, views_completed FROM promoted_videos WHERE id = ?', [session.video_id]);
            if (video.views_completed >= video.views_requested) {
                await database.run('UPDATE promoted_videos SET status = "completed" WHERE id = ?', [session.video_id]);
            }

            await database.run('COMMIT');

            // Get updated user balance
            const user = await database.get('SELECT coin_balance FROM users WHERE id = ?', [req.user.id]);

            res.json({
                message: 'Video completed successfully',
                coins_earned: coinsEarned,
                new_balance: user.coin_balance
            });
        } catch (error) {
            await database.run('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Complete watch error:', error);
        res.status(500).json({ error: 'Failed to complete video' });
    }
});

module.exports = router;