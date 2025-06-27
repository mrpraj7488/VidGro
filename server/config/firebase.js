const admin = require('firebase-admin');
const { initializeApp } = require('firebase/app');
const { getAuth } = require('firebase/auth');

// Firebase configuration
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || "AIzaSyAvBivevwxb9LsQPW3c2FJL-nIvHe0LLGc",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "vidpromo-77d67.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "vidpromo-77d67",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "vidpromo-77d67.firebasestorage.app",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "831714555684",
    appId: process.env.FIREBASE_APP_ID || "1:831714555684:web:4ad0b62b8159d3c529e5b1",
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || "G-NMH0VQBNTH"
};

// Initialize Firebase Client SDK
let clientAuth;
try {
    const app = initializeApp(firebaseConfig);
    clientAuth = getAuth(app);
    console.log('✅ Firebase Client SDK initialized');
} catch (error) {
    console.log('⚠️ Firebase Client SDK initialization failed:', error.message);
}

// Initialize Firebase Admin SDK
let adminAuth;
if (!admin.apps.length) {
    try {
        // Try to initialize with service account (production)
        if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: firebaseConfig.projectId
            });
        } else {
            // Fallback to application default credentials (development)
            admin.initializeApp({
                credential: admin.credential.applicationDefault(),
                projectId: firebaseConfig.projectId
            });
        }
        adminAuth = admin.auth();
        console.log('✅ Firebase Admin SDK initialized');
    } catch (error) {
        console.log('⚠️ Firebase Admin SDK initialization failed:', error.message);
        console.log('📝 Using mock authentication for development');
    }
}

// Verify Firebase ID token
const verifyToken = async (idToken) => {
    try {
        if (adminAuth) {
            const decodedToken = await adminAuth.verifyIdToken(idToken);
            return decodedToken;
        } else {
            // Mock verification for development
            return mockVerifyToken(idToken);
        }
    } catch (error) {
        throw new Error('Invalid Firebase token');
    }
};

// Mock verification for development
const mockVerifyToken = async (idToken) => {
    // Simple mock verification for development
    if (idToken && idToken.startsWith('mock_')) {
        return {
            uid: idToken.replace('mock_', ''),
            email: `${idToken.replace('mock_', '')}@example.com`
        };
    }
    throw new Error('Invalid mock token');
};

// Create custom token for user
const createCustomToken = async (uid) => {
    try {
        if (adminAuth) {
            return await adminAuth.createCustomToken(uid);
        } else {
            // Return mock token for development
            return `mock_${uid}`;
        }
    } catch (error) {
        throw new Error('Failed to create custom token');
    }
};

module.exports = {
    firebaseConfig,
    clientAuth,
    adminAuth,
    verifyToken,
    createCustomToken
};