const { supabase } = require('../config/supabase');

async function setupSupabaseSchema() {
    try {
        console.log('🚀 Setting up Supabase schema...');

        // Create users table
        const { error: usersError } = await supabase.rpc('exec_sql', {
            sql: `
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    firebase_uid TEXT UNIQUE,
                    coin_balance INTEGER DEFAULT 1000,
                    is_vip BOOLEAN DEFAULT FALSE,
                    vip_expires_at TIMESTAMPTZ NULL,
                    ad_frequency INTEGER DEFAULT 3,
                    last_ad_shown TIMESTAMPTZ NULL,
                    stop_ads_until TIMESTAMPTZ NULL,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                );
            `
        });

        if (usersError) {
            console.error('Error creating users table:', usersError);
        } else {
            console.log('✅ Users table created');
        }

        // Create promoted_videos table
        const { error: videosError } = await supabase.rpc('exec_sql', {
            sql: `
                CREATE TABLE IF NOT EXISTS promoted_videos (
                    id SERIAL PRIMARY KEY,
                    promoter_id INTEGER NOT NULL REFERENCES users(id),
                    youtube_url TEXT NOT NULL,
                    youtube_video_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    duration INTEGER NOT NULL,
                    views_requested INTEGER NOT NULL,
                    views_completed INTEGER DEFAULT 0,
                    cost_per_view DECIMAL DEFAULT 1.2,
                    total_cost DECIMAL NOT NULL,
                    coin_reward DECIMAL DEFAULT 0.8,
                    status TEXT DEFAULT 'active',
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                );
            `
        });

        if (videosError) {
            console.error('Error creating promoted_videos table:', videosError);
        } else {
            console.log('✅ Promoted videos table created');
        }

        // Create watch_sessions table
        const { error: sessionsError } = await supabase.rpc('exec_sql', {
            sql: `
                CREATE TABLE IF NOT EXISTS watch_sessions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    video_id INTEGER NOT NULL REFERENCES promoted_videos(id),
                    watch_duration INTEGER NOT NULL,
                    completion_percentage DECIMAL NOT NULL,
                    coins_earned DECIMAL DEFAULT 0,
                    completed BOOLEAN DEFAULT FALSE,
                    timestamp TIMESTAMPTZ DEFAULT NOW()
                );
            `
        });

        if (sessionsError) {
            console.error('Error creating watch_sessions table:', sessionsError);
        } else {
            console.log('✅ Watch sessions table created');
        }

        // Create other tables...
        const tables = [
            {
                name: 'ad_sessions',
                sql: `
                    CREATE TABLE IF NOT EXISTS ad_sessions (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL REFERENCES users(id),
                        ad_type TEXT NOT NULL,
                        coins_earned INTEGER DEFAULT 0,
                        duration INTEGER DEFAULT 30,
                        timestamp TIMESTAMPTZ DEFAULT NOW()
                    );
                `
            },
            {
                name: 'coin_transactions',
                sql: `
                    CREATE TABLE IF NOT EXISTS coin_transactions (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL REFERENCES users(id),
                        transaction_type TEXT NOT NULL,
                        amount INTEGER NOT NULL,
                        description TEXT,
                        reference_id INTEGER NULL,
                        timestamp TIMESTAMPTZ DEFAULT NOW()
                    );
                `
            },
            {
                name: 'user_settings',
                sql: `
                    CREATE TABLE IF NOT EXISTS user_settings (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
                        notifications_enabled BOOLEAN DEFAULT TRUE,
                        sound_enabled BOOLEAN DEFAULT TRUE,
                        dark_mode BOOLEAN DEFAULT FALSE,
                        auto_play BOOLEAN DEFAULT TRUE,
                        ad_personalization BOOLEAN DEFAULT TRUE,
                        language TEXT DEFAULT 'en',
                        created_at TIMESTAMPTZ DEFAULT NOW(),
                        updated_at TIMESTAMPTZ DEFAULT NOW()
                    );
                `
            },
            {
                name: 'referrals',
                sql: `
                    CREATE TABLE IF NOT EXISTS referrals (
                        id SERIAL PRIMARY KEY,
                        referrer_id INTEGER NOT NULL REFERENCES users(id),
                        referred_id INTEGER NOT NULL REFERENCES users(id),
                        referral_code TEXT NOT NULL,
                        status TEXT DEFAULT 'pending',
                        bonus_coins INTEGER DEFAULT 500,
                        created_at TIMESTAMPTZ DEFAULT NOW(),
                        completed_at TIMESTAMPTZ NULL
                    );
                `
            }
        ];

        for (const table of tables) {
            const { error } = await supabase.rpc('exec_sql', { sql: table.sql });
            if (error) {
                console.error(`Error creating ${table.name} table:`, error);
            } else {
                console.log(`✅ ${table.name} table created`);
            }
        }

        // Create indexes
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);',
            'CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);',
            'CREATE INDEX IF NOT EXISTS idx_promoted_videos_promoter ON promoted_videos(promoter_id);',
            'CREATE INDEX IF NOT EXISTS idx_promoted_videos_status ON promoted_videos(status);',
            'CREATE INDEX IF NOT EXISTS idx_watch_sessions_user ON watch_sessions(user_id);',
            'CREATE INDEX IF NOT EXISTS idx_watch_sessions_video ON watch_sessions(video_id);',
            'CREATE INDEX IF NOT EXISTS idx_coin_transactions_user ON coin_transactions(user_id);',
            'CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);'
        ];

        for (const indexSql of indexes) {
            const { error } = await supabase.rpc('exec_sql', { sql: indexSql });
            if (error) {
                console.error('Error creating index:', error);
            }
        }

        console.log('✅ Indexes created');

        // Enable Row Level Security
        const rlsTables = ['users', 'promoted_videos', 'watch_sessions', 'ad_sessions', 'coin_transactions', 'user_settings', 'referrals'];
        
        for (const table of rlsTables) {
            const { error } = await supabase.rpc('exec_sql', {
                sql: `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`
            });
            if (error) {
                console.error(`Error enabling RLS for ${table}:`, error);
            }
        }

        console.log('✅ Row Level Security enabled');

        // Create basic RLS policies
        const policies = [
            {
                table: 'users',
                policy: `
                    CREATE POLICY "Users can read own data" ON users
                    FOR SELECT USING (auth.uid()::text = firebase_uid OR id = current_setting('app.current_user_id')::integer);
                `
            },
            {
                table: 'user_settings',
                policy: `
                    CREATE POLICY "Users can manage own settings" ON user_settings
                    FOR ALL USING (user_id = current_setting('app.current_user_id')::integer);
                `
            }
        ];

        for (const policy of policies) {
            const { error } = await supabase.rpc('exec_sql', { sql: policy.policy });
            if (error && !error.message.includes('already exists')) {
                console.error(`Error creating policy for ${policy.table}:`, error);
            }
        }

        console.log('✅ Basic RLS policies created');
        console.log('🎉 Supabase schema setup completed!');

    } catch (error) {
        console.error('❌ Error setting up Supabase schema:', error);
        throw error;
    }
}

// Run setup if called directly
if (require.main === module) {
    setupSupabaseSchema().then(() => {
        console.log('\n✅ Supabase setup completed successfully');
        process.exit(0);
    }).catch((error) => {
        console.error('\n❌ Supabase setup failed:', error);
        process.exit(1);
    });
}

module.exports = setupSupabaseSchema;