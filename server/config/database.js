const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        this.db = null;
        this.init();
    }

    init() {
        const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../data/vidgro.db');
        
        // Ensure data directory exists
        const dataDir = path.dirname(dbPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        this.db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('❌ Error opening database:', err);
            } else {
                console.log('✅ Connected to SQLite database');
                this.createTables();
            }
        });

        // Enable foreign keys
        this.db.run('PRAGMA foreign_keys = ON');
    }

    createTables() {
        const schema = `
            -- Users table
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                coin_balance INTEGER DEFAULT 1000,
                is_vip BOOLEAN DEFAULT FALSE,
                vip_expires_at DATETIME NULL,
                ad_frequency INTEGER DEFAULT 3,
                last_ad_shown DATETIME NULL,
                stop_ads_until DATETIME NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            -- Promoted Videos table
            CREATE TABLE IF NOT EXISTS promoted_videos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                promoter_id INTEGER NOT NULL,
                youtube_url TEXT NOT NULL,
                youtube_video_id TEXT NOT NULL,
                title TEXT NOT NULL,
                duration INTEGER NOT NULL,
                views_requested INTEGER NOT NULL,
                views_completed INTEGER DEFAULT 0,
                cost_per_view REAL DEFAULT 1.2,
                total_cost REAL NOT NULL,
                coin_reward REAL DEFAULT 0.8,
                status TEXT DEFAULT 'active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (promoter_id) REFERENCES users(id)
            );

            -- Watch Sessions table
            CREATE TABLE IF NOT EXISTS watch_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                video_id INTEGER NOT NULL,
                watch_duration INTEGER NOT NULL,
                completion_percentage REAL NOT NULL,
                coins_earned REAL DEFAULT 0,
                completed BOOLEAN DEFAULT FALSE,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (video_id) REFERENCES promoted_videos(id)
            );

            -- Ad Sessions table
            CREATE TABLE IF NOT EXISTS ad_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                ad_type TEXT NOT NULL,
                coins_earned INTEGER DEFAULT 0,
                duration INTEGER DEFAULT 30,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            -- Coin Transactions table
            CREATE TABLE IF NOT EXISTS coin_transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                transaction_type TEXT NOT NULL,
                amount INTEGER NOT NULL,
                description TEXT,
                reference_id INTEGER NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            -- User Settings table
            CREATE TABLE IF NOT EXISTS user_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER UNIQUE NOT NULL,
                notifications_enabled BOOLEAN DEFAULT TRUE,
                sound_enabled BOOLEAN DEFAULT TRUE,
                dark_mode BOOLEAN DEFAULT FALSE,
                auto_play BOOLEAN DEFAULT TRUE,
                ad_personalization BOOLEAN DEFAULT TRUE,
                language TEXT DEFAULT 'en',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            -- Referrals table
            CREATE TABLE IF NOT EXISTS referrals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                referrer_id INTEGER NOT NULL,
                referred_id INTEGER NOT NULL,
                referral_code TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                bonus_coins INTEGER DEFAULT 500,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME NULL,
                FOREIGN KEY (referrer_id) REFERENCES users(id),
                FOREIGN KEY (referred_id) REFERENCES users(id)
            );

            -- Indexes for better performance
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_promoted_videos_promoter ON promoted_videos(promoter_id);
            CREATE INDEX IF NOT EXISTS idx_promoted_videos_status ON promoted_videos(status);
            CREATE INDEX IF NOT EXISTS idx_watch_sessions_user ON watch_sessions(user_id);
            CREATE INDEX IF NOT EXISTS idx_watch_sessions_video ON watch_sessions(video_id);
            CREATE INDEX IF NOT EXISTS idx_coin_transactions_user ON coin_transactions(user_id);
            CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
        `;
        
        this.db.exec(schema, (err) => {
            if (err) {
                console.error('❌ Error creating tables:', err);
            } else {
                console.log('✅ Database tables created successfully');
            }
        });
    }

    getDb() {
        return this.db;
    }

    // Promisify database operations
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    close() {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
}

module.exports = new Database();