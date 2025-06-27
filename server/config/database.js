const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { supabase } = require('./supabase');

class Database {
    constructor() {
        this.db = null;
        this.useSupabase = process.env.NODE_ENV === 'production' || process.env.USE_SUPABASE === 'true';
        
        if (this.useSupabase) {
            console.log('🚀 Using Supabase as primary database');
        } else {
            console.log('🔧 Using SQLite for development (fallback)');
            this.init();
        }
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
                console.error('❌ Error opening SQLite database:', err);
            } else {
                console.log('✅ Connected to SQLite database (fallback)');
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
                console.error('❌ Error creating SQLite tables:', err);
            } else {
                console.log('✅ SQLite tables created successfully (fallback)');
            }
        });
    }

    getDb() {
        return this.db;
    }

    // Supabase operations
    async supabaseRun(table, operation, data, conditions = {}) {
        try {
            let query = supabase.from(table);
            
            switch (operation) {
                case 'insert':
                    const { data: insertData, error: insertError } = await query.insert(data).select();
                    if (insertError) throw insertError;
                    return { id: insertData[0]?.id, changes: 1 };
                
                case 'update':
                    const { data: updateData, error: updateError } = await query
                        .update(data)
                        .match(conditions)
                        .select();
                    if (updateError) throw updateError;
                    return { changes: updateData.length };
                
                case 'delete':
                    const { data: deleteData, error: deleteError } = await query
                        .delete()
                        .match(conditions);
                    if (deleteError) throw deleteError;
                    return { changes: deleteData?.length || 0 };
                
                default:
                    throw new Error(`Unsupported operation: ${operation}`);
            }
        } catch (error) {
            console.error(`Supabase ${operation} error:`, error);
            throw error;
        }
    }

    async supabaseGet(table, conditions = {}, select = '*') {
        try {
            let query = supabase.from(table).select(select);
            
            Object.entries(conditions).forEach(([key, value]) => {
                query = query.eq(key, value);
            });
            
            const { data, error } = await query.single();
            if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
            return data;
        } catch (error) {
            console.error('Supabase get error:', error);
            throw error;
        }
    }

    async supabaseAll(table, conditions = {}, select = '*', limit = null, orderBy = null) {
        try {
            let query = supabase.from(table).select(select);
            
            Object.entries(conditions).forEach(([key, value]) => {
                query = query.eq(key, value);
            });
            
            if (orderBy) {
                query = query.order(orderBy.column, { ascending: orderBy.ascending !== false });
            }
            
            if (limit) {
                query = query.limit(limit);
            }
            
            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Supabase all error:', error);
            throw error;
        }
    }

    // Unified database operations that work with both Supabase and SQLite
    async run(sql, params = []) {
        if (this.useSupabase) {
            // For Supabase, we need to parse the SQL and convert to Supabase operations
            // This is a simplified approach - in production, you'd want more sophisticated SQL parsing
            throw new Error('Direct SQL not supported with Supabase. Use specific methods.');
        }
        
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

    async get(sql, params = []) {
        if (this.useSupabase) {
            throw new Error('Direct SQL not supported with Supabase. Use specific methods.');
        }
        
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

    async all(sql, params = []) {
        if (this.useSupabase) {
            throw new Error('Direct SQL not supported with Supabase. Use specific methods.');
        }
        
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

    async close() {
        if (this.db) {
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
}

module.exports = new Database();