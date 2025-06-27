const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const database = require('../config/database');
const { generateToken, authenticate } = require('../middleware/auth');
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if user already exists
        const existingUser = await database.get('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const result = await database.run(
            'INSERT INTO users (email, password_hash) VALUES (?, ?)',
            [email, passwordHash]
        );

        // Create user settings
        await database.run(
            'INSERT INTO user_settings (user_id) VALUES (?)',
            [result.id]
        );

        // Generate token
        const token = generateToken(result.id);

        // Get user data
        const user = await database.get('SELECT id, email, coin_balance, is_vip FROM users WHERE id = ?', [result.id]);

        res.status(201).json({
            message: 'User created successfully',
            token,
            user
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const user = await database.get('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate token
        const token = generateToken(user.id);

        // Update last login
        await database.run('UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                coin_balance: user.coin_balance,
                is_vip: user.is_vip
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
    try {
        const user = await database.get(
            'SELECT id, email, coin_balance, is_vip, vip_expires_at, created_at FROM users WHERE id = ?',
            [req.user.id]
        );

        const settings = await database.get('SELECT * FROM user_settings WHERE user_id = ?', [req.user.id]);

        res.json({
            user,
            settings
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user data' });
    }
});

// Update user settings
router.put('/settings', authenticate, async (req, res) => {
    try {
        const {
            notifications_enabled,
            sound_enabled,
            dark_mode,
            auto_play,
            ad_personalization,
            language
        } = req.body;

        await database.run(`
            UPDATE user_settings SET
                notifications_enabled = COALESCE(?, notifications_enabled),
                sound_enabled = COALESCE(?, sound_enabled),
                dark_mode = COALESCE(?, dark_mode),
                auto_play = COALESCE(?, auto_play),
                ad_personalization = COALESCE(?, ad_personalization),
                language = COALESCE(?, language),
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        `, [notifications_enabled, sound_enabled, dark_mode, auto_play, ad_personalization, language, req.user.id]);

        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// Delete account
router.delete('/account', authenticate, async (req, res) => {
    try {
        // Delete user data in order (foreign key constraints)
        await database.run('DELETE FROM user_settings WHERE user_id = ?', [req.user.id]);
        await database.run('DELETE FROM watch_sessions WHERE user_id = ?', [req.user.id]);
        await database.run('DELETE FROM ad_sessions WHERE user_id = ?', [req.user.id]);
        await database.run('DELETE FROM coin_transactions WHERE user_id = ?', [req.user.id]);
        await database.run('DELETE FROM referrals WHERE referrer_id = ? OR referred_id = ?', [req.user.id, req.user.id]);
        await database.run('DELETE FROM promoted_videos WHERE promoter_id = ?', [req.user.id]);
        await database.run('DELETE FROM users WHERE id = ?', [req.user.id]);

        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ error: 'Failed to delete account' });
    }
});

// Logout (client-side token removal, but we can log it)
router.post('/logout', authenticate, async (req, res) => {
    try {
        // Log logout activity
        await database.run('UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [req.user.id]);
        
        res.json({ message: 'Logout successful' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed' });
    }
});

module.exports = router;