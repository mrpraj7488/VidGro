const jwt = require('jsonwebtoken');
const { verifyToken } = require('../config/firebase');
const database = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// Verify JWT token
const verifyJWT = (token) => {
    return jwt.verify(token, JWT_SECRET);
};

// Authentication middleware
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);
        
        try {
            // Try JWT first (for our own tokens)
            const decoded = verifyJWT(token);
            const user = await database.get('SELECT * FROM users WHERE id = ?', [decoded.userId]);
            
            if (!user) {
                return res.status(401).json({ error: 'User not found' });
            }

            req.user = user;
            next();
        } catch (jwtError) {
            // If JWT fails, try Firebase token
            try {
                const decodedToken = await verifyToken(token);
                const user = await database.get('SELECT * FROM users WHERE email = ?', [decodedToken.email]);
                
                if (!user) {
                    return res.status(401).json({ error: 'User not found' });
                }

                req.user = user;
                next();
            } catch (firebaseError) {
                return res.status(401).json({ error: 'Invalid token' });
            }
        }
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
};

// Check if user is VIP
const requireVIP = (req, res, next) => {
    if (!req.user.is_vip || (req.user.vip_expires_at && new Date(req.user.vip_expires_at) < new Date())) {
        return res.status(403).json({ error: 'VIP membership required' });
    }
    next();
};

module.exports = {
    authenticate,
    requireVIP,
    generateToken,
    verifyJWT
};