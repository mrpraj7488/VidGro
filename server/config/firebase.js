const admin = require('firebase-admin');

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

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: firebaseConfig.projectId
        });
        console.log('✅ Firebase Admin SDK initialized');
    } catch (error) {
        console.log('⚠️ Firebase Admin SDK initialization failed, using mock auth:', error.message);
    }
}

const auth = admin.auth();

// Verify Firebase ID token
const verifyToken = async (idToken) => {
    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        return decodedToken;
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

module.exports = {
    firebaseConfig,
    auth,
    verifyToken: process.env.NODE_ENV === 'development' ? mockVerifyToken : verifyToken
};