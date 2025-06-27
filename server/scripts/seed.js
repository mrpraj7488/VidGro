const database = require('../config/database');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
    try {
        console.log('🌱 Starting database seeding...');

        // Create demo users
        const demoUsers = [
            {
                email: 'demo@vidgro.com',
                password: 'demo123',
                coin_balance: 2000,
                is_vip: false
            },
            {
                email: 'vip@vidgro.com',
                password: 'vip123',
                coin_balance: 5000,
                is_vip: true
            },
            {
                email: 'promoter@vidgro.com',
                password: 'promoter123',
                coin_balance: 10000,
                is_vip: false
            }
        ];

        const userIds = [];

        for (const user of demoUsers) {
            const hashedPassword = await bcrypt.hash(user.password, 12);
            
            const result = await database.run(`
                INSERT OR IGNORE INTO users (email, password_hash, coin_balance, is_vip)
                VALUES (?, ?, ?, ?)
            `, [user.email, hashedPassword, user.coin_balance, user.is_vip]);

            if (result.changes > 0) {
                userIds.push(result.id);
                
                // Create user settings
                await database.run(`
                    INSERT INTO user_settings (user_id) VALUES (?)
                `, [result.id]);

                console.log(`✅ Created user: ${user.email}`);
            } else {
                // Get existing user ID
                const existingUser = await database.get('SELECT id FROM users WHERE email = ?', [user.email]);
                userIds.push(existingUser.id);
                console.log(`ℹ️  User already exists: ${user.email}`);
            }
        }

        // Create demo promoted videos
        const demoVideos = [
            {
                promoter_id: userIds[2] || 3, // promoter@vidgro.com
                youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                youtube_video_id: 'dQw4w9WgXcQ',
                title: 'Rick Astley - Never Gonna Give You Up (Official Video)',
                duration: 213,
                views_requested: 100,
                views_completed: 25,
                cost_per_view: 1.2,
                total_cost: 25560,
                coin_reward: 0.8
            },
            {
                promoter_id: userIds[2] || 3,
                youtube_url: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
                youtube_video_id: '9bZkp7q19f0',
                title: 'PSY - GANGNAM STYLE (강남스타일) M/V',
                duration: 252,
                views_requested: 50,
                views_completed: 12,
                cost_per_view: 1.2,
                total_cost: 15120,
                coin_reward: 0.8
            },
            {
                promoter_id: userIds[2] || 3,
                youtube_url: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
                youtube_video_id: 'kJQP7kiw5Fk',
                title: 'Luis Fonsi - Despacito ft. Daddy Yankee',
                duration: 282,
                views_requested: 75,
                views_completed: 8,
                cost_per_view: 1.2,
                total_cost: 25380,
                coin_reward: 0.8
            }
        ];

        for (const video of demoVideos) {
            const result = await database.run(`
                INSERT OR IGNORE INTO promoted_videos (
                    promoter_id, youtube_url, youtube_video_id, title, duration,
                    views_requested, views_completed, cost_per_view, total_cost, coin_reward
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                video.promoter_id, video.youtube_url, video.youtube_video_id,
                video.title, video.duration, video.views_requested,
                video.views_completed, video.cost_per_view, video.total_cost, video.coin_reward
            ]);

            if (result.changes > 0) {
                console.log(`✅ Created video promotion: ${video.title}`);
            }
        }

        // Create demo watch sessions
        const demoSessions = [
            {
                user_id: userIds[0] || 1, // demo@vidgro.com
                video_id: 1,
                watch_duration: 213,
                completion_percentage: 100,
                coins_earned: 170,
                completed: 1
            },
            {
                user_id: userIds[0] || 1,
                video_id: 2,
                watch_duration: 200,
                completion_percentage: 79,
                coins_earned: 0,
                completed: 0
            },
            {
                user_id: userIds[1] || 2, // vip@vidgro.com
                video_id: 1,
                watch_duration: 213,
                completion_percentage: 100,
                coins_earned: 170,
                completed: 1
            }
        ];

        for (const session of demoSessions) {
            const result = await database.run(`
                INSERT OR IGNORE INTO watch_sessions (
                    user_id, video_id, watch_duration, completion_percentage,
                    coins_earned, completed
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
                session.user_id, session.video_id, session.watch_duration,
                session.completion_percentage, session.coins_earned, session.completed
            ]);

            if (result.changes > 0) {
                console.log(`✅ Created watch session for user ${session.user_id}`);
            }
        }

        // Create demo coin transactions
        const demoTransactions = [
            {
                user_id: userIds[0] || 1,
                transaction_type: 'earned',
                amount: 170,
                description: 'Watched video: Rick Astley - Never Gonna Give You Up'
            },
            {
                user_id: userIds[1] || 2,
                transaction_type: 'earned',
                amount: 170,
                description: 'Watched video: Rick Astley - Never Gonna Give You Up'
            },
            {
                user_id: userIds[2] || 3,
                transaction_type: 'spent',
                amount: 25560,
                description: 'Video promotion: Rick Astley - Never Gonna Give You Up'
            },
            {
                user_id: userIds[0] || 1,
                transaction_type: 'earned',
                amount: 350,
                description: 'Watched rewarded advertisement'
            },
            {
                user_id: userIds[1] || 2,
                transaction_type: 'purchased',
                amount: 500,
                description: 'Purchased medium package ($3.99)'
            }
        ];

        for (const transaction of demoTransactions) {
            const result = await database.run(`
                INSERT OR IGNORE INTO coin_transactions (
                    user_id, transaction_type, amount, description
                ) VALUES (?, ?, ?, ?)
            `, [
                transaction.user_id, transaction.transaction_type,
                transaction.amount, transaction.description
            ]);

            if (result.changes > 0) {
                console.log(`✅ Created transaction: ${transaction.description}`);
            }
        }

        // Create demo referrals
        const demoReferrals = [
            {
                referrer_id: userIds[1] || 2, // vip@vidgro.com refers demo@vidgro.com
                referred_id: userIds[0] || 1,
                referral_code: 'VIDGRO002',
                status: 'completed'
            }
        ];

        for (const referral of demoReferrals) {
            const result = await database.run(`
                INSERT OR IGNORE INTO referrals (
                    referrer_id, referred_id, referral_code, status, completed_at
                ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            `, [
                referral.referrer_id, referral.referred_id,
                referral.referral_code, referral.status
            ]);

            if (result.changes > 0) {
                console.log(`✅ Created referral: ${referral.referral_code}`);
            }
        }

        console.log('\n🎉 Database seeding completed successfully!');
        console.log('\n📋 Demo accounts created:');
        console.log('1. demo@vidgro.com / demo123 (Regular user with 2000 coins)');
        console.log('2. vip@vidgro.com / vip123 (VIP user with 5000 coins)');
        console.log('3. promoter@vidgro.com / promoter123 (Promoter with 10000 coins)');
        console.log('\n🔗 API Base URL: http://localhost:3000/api');
        console.log('📖 Health Check: http://localhost:3000/health');

    } catch (error) {
        console.error('❌ Error seeding database:', error);
        throw error;
    }
}

// Run seeding if called directly
if (require.main === module) {
    seedDatabase().then(() => {
        console.log('\n✅ Seeding completed successfully');
        process.exit(0);
    }).catch((error) => {
        console.error('\n❌ Seeding failed:', error);
        process.exit(1);
    });
}

module.exports = seedDatabase;