const admin = require('firebase-admin');

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAvBivevwxb9LsQPW3c2FJL-nIvHe0LLGc",
    authDomain: "vidpromo-77d67.firebaseapp.com",
    projectId: "vidpromo-77d67",
    storageBucket: "vidpromo-77d67.firebasestorage.app",
    messagingSenderId: "831714555684",
    appId: "1:831714555684:web:4ad0b62b8159d3c529e5b1",
    measurementId: "G-NMH0VQBNTH"
};

// Initialize Firebase Admin SDK
// Note: In production, use service account key file
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: firebaseConfig.projectId
    });
}

const auth = admin.auth();

// Verify Firebase ID token
const verifyToken = async (idToken) => {
    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        return decodedToken;
    } catch (error) {
        throw new Error('Invalid token');
    }
};

module.exports = {
    firebaseConfig,
    auth,
    verifyToken
};