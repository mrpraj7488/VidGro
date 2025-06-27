const express = require('express');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const database = require('../config/database');
const { generateToken, authenticate, validateRequest, getUserByEmail, createUser } = require('../middleware/auth');
const { signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('firebase/auth');
const { clientAuth } = require('../config/firebase');
const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

// Register with Firebase Authentication
router.post('/register', validateRequest(registerSchema), async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user already exists in our database
        const existingUser = await getUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ 
                success: false,
                error: 'User already exists with this email' 
            });
        }

        let firebaseUser;
        let passwordHash;

        // Try to create user with Firebase
        if (clientAuth) {
            try {
                const userCredential = await createUserWithEmailAndPassword(clientAuth, email, password);
                firebaseUser = userCredential.user;
                passwordHash = 'firebase_auth'; // We don't store password when using Firebase
            } catch (firebaseError) {
                console.error('Firebase registration error:', firebaseError);
                // Fallback to local authentication
                passwordHash = await bcrypt.hash(password, 12);
            }
        } else {
            // Local authentication fallback
            passwordHash = await bcrypt.hash(password, 12);
        }

        // Create user in our database
        const userData = {
            email,
            password_hash: passwordHash,
            firebase_uid: firebaseUser?.uid || null,
            coin_balance: 1000
        };

        const result = await createUser(userData);
        const user = result.user;

        // Generate our own JWT token
        const token = generateToken(user.id);

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    coin_balance: user.coin_balance,
                    is_vip: user.is_vip,
                    created_at: user.created_at
                }
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Registration failed' 
        });
    }
});

// Login with Firebase Authentication
router.post('/login', validateRequest(loginSchema), async (req, res) => {
    try {
        const { email, password } = req.body;

        let user = await getUserByEmail(email);
        let firebaseToken = null;

        // Try Firebase authentication first
        if (clientAuth) {
            try {
                const userCredential = await signInWithEmailAndPassword(clientAuth, email, password);
                firebaseToken = await userCredential.user.getIdToken();
                
                // Create user if doesn't exist (Firebase SSO)
                if (!user) {
                    const userData = {
                        email,
                        password_hash: 'firebase_auth',
                        firebase_uid: userCredential.user.uid,
                        coin_balance: 1000
                    };
                    
                    const result = await createUser(userData);
                    user = result.user;
                }
            } catch (firebaseError) {
                console.error('Firebase login error:', firebaseError);
                // Continue with local authentication
            }
        }

        // If Firebase failed or not available, try local authentication
        if (!firebaseToken && user && user.password_hash !== 'firebase_auth') {
            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            if (!isValidPassword) {
                return res.status(401).json({ 
                    success: false,
                    error: 'Invalid email or password' 
                });
            }
        } else if (!firebaseToken && !user) {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid email or password' 
            });
        }

        // Generate our own JWT token
        const token = generateToken(user.id);

        // Update last login
        if (database.useSupabase) {
            await database.supabaseRun('users', 'update', 
                { updated_at: new Date().toISOString() }, 
                { id: user.id }
            );
        } else {
            await database.run('UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
        }

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                firebase_token: firebaseToken,
                user: {
                    id: user.id,
                    email: user.email,
                    coin_balance: user.coin_balance,
                    is_vip: user.is_vip,
                    vip_expires_at: user.vip_expires_at
                }
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Login failed' 
        });
    }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
    try {
        let settings;
        
        if (database.useSupabase) {
            settings = await database.supabaseGet('user_settings', { user_id: req.user.id });
        } else {
            settings = await database.get('SELECT * FROM user_settings WHERE user_id = ?', [req.user.id]);
        }

        res.json({
            success: true,
            data: {
                user: {
                    id: req.user.id,
                    email: req.user.email,
                    coin_balance: req.user.coin_balance,
                    is_vip: req.user.is_vip,
                    vip_expires_at: req.user.vip_expires_at,
                    created_at: req.user.created_at
                },
                settings
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to get user data' 
        });
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

        const updateData = {
            updated_at: new Date().toISOString()
        };

        // Only include fields that are provided
        if (notifications_enabled !== undefined) updateData.notifications_enabled = notifications_enabled;
        if (sound_enabled !== undefined) updateData.sound_enabled = sound_enabled;
        if (dark_mode !== undefined) updateData.dark_mode = dark_mode;
        if (auto_play !== undefined) updateData.auto_play = auto_play;
        if (ad_personalization !== undefined) updateData.ad_personalization = ad_personalization;
        if (language !== undefined) updateData.language = language;

        if (database.useSupabase) {
            await database.supabaseRun('user_settings', 'update', updateData, { user_id: req.user.id });
        } else {
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
        }

        res.json({ 
            success: true,
            message: 'Settings updated successfully' 
        });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to update settings' 
        });
    }
});

// Delete account
router.delete('/account', authenticate, async (req, res) => {
    try {
        if (database.useSupabase) {
            // Delete user data in order (foreign key constraints)
            await database.supabaseRun('user_settings', 'delete', {}, { user_id: req.user.id });
            await database.supabaseRun('watch_sessions', 'delete', {}, { user_id: req.user.id });
            await database.supabaseRun('ad_sessions', 'delete', {}, { user_id: req.user.id });
            await database.supabaseRun('coin_transactions', 'delete', {}, { user_id: req.user.id });
            await database.supabaseRun('referrals', 'delete', {}, { referrer_id: req.user.id });
            await database.supabaseRun('referrals', 'delete', {}, { referred_id: req.user.id });
            await database.supabaseRun('promoted_videos', 'delete', {}, { promoter_id: req.user.id });
            await database.supabaseRun('users', 'delete', {}, { id: req.user.id });
        } else {
            // Delete user data in order (foreign key constraints)
            await database.run('DELETE FROM user_settings WHERE user_id = ?', [req.user.id]);
            await database.run('DELETE FROM watch_sessions WHERE user_id = ?', [req.user.id]);
            await database.run('DELETE FROM ad_sessions WHERE user_id = ?', [req.user.id]);
            await database.run('DELETE FROM coin_transactions WHERE user_id = ?', [req.user.id]);
            await database.run('DELETE FROM referrals WHERE referrer_id = ? OR referred_id = ?', [req.user.id, req.user.id]);
            await database.run('DELETE FROM promoted_videos WHERE promoter_id = ?', [req.user.id]);
            await database.run('DELETE FROM users WHERE id = ?', [req.user.id]);
        }

        res.json({ 
            success: true,
            message: 'Account deleted successfully' 
        });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to delete account' 
        });
    }
});

// Logout
router.post('/logout', authenticate, async (req, res) => {
    try {
        // Log logout activity
        if (database.useSupabase) {
            await database.supabaseRun('users', 'update', 
                { updated_at: new Date().toISOString() }, 
                { id: req.user.id }
            );
        } else {
            await database.run('UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [req.user.id]);
        }
        
        res.json({ 
            success: true,
            message: 'Logout successful' 
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Logout failed' 
        });
    }
});

module.exports = router;