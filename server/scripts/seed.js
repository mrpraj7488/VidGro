const database = require('../config/database');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
    try {
        console.log('Starting database seeding...');

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

        for (const user of demoUsers) {
            const hashedPassword = await bcrypt.hash(user.password, 10);
            
            const result = await database.run(`
                INSERT OR IGNORE INTO users (email, password_hash, coin_balance, is_vip)
                VALUES (?, ?, ?, ?)
            `, [user.email, hashedPassword, user.coin_balance, user.is_vip]);

            if (result.changes > 0) {
                // Create user settings
                await database.run(`
                    INSERT INTO user_settings (user_id) VALUES (?)
                `, [result.id]);

                console.log(`Created user: ${user.email}`);
            }
        }

        // Create demo promoted videos
        const demoVideos = [
            {
                promoter_id: 3, // promoter@vidgro.com
                youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                youtube_video_id: 'dQw4w9WgXcQ',
                title: 'Rick Astley - Never Gonna Give You Up',
                duration: 213,
                views_requested: 100,
                views_completed: 25,
                cost_per_view: 1.2,
                total_cost: 25560,
                coin_reward: 0.8
            },
            {
                promoter_id: 3,
                youtube_url: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
                youtube_video_id: '9bZkp7q19f0',
                title: 'PSY - GANGNAM STYLE',
                duration: 252,
                views_requested: 50,
                views_completed: 12,
                cost_per_view: 1.2,
                total_cost: 15120,
                coin_reward: 0.8
            }
        ];

        for (const video of demoVideos) {
            await database.run(`
                INSERT OR IGNORE INTO promoted_videos (
                    promoter_id, youtube_url, youtube_video_id, title, duration,
                    views_requested, views_completed, cost_per_view, total_cost, coin_reward
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                video.promoter_id, video.youtube_url, video.youtube_video_id,
                video.title, video.duration, video.views_requested,
                video.views_completed, video.cost_per_view, video.total_cost, video.coin_reward
            ]);
        }

        // Create demo watch sessions
        const demoSessions = [
            {
                user_id: 1, // demo@vidgro.com
                video_id: 1,
                watch_duration: 213,
                completion_percentage: 100,
                coins_earned: 170,
                completed: 1
            },
            {
                user_id: 1,
                video_id: 2,
                watch_duration: 200,
                completion_percentage: 79,
                coins_earned: 0,
                completed: 0
            },
            {
                user_id: 2, // vip@vidgro.com
                video_id: 1,
                watch_duration: 213,
                completion_percentage: 100,
                coins_earned: 170,
                completed: 1
            }
        ];

        for (const session of demoSessions) {
            await database.run(`
                INSERT OR IGNORE INTO watch_sessions (
                    user_id, video_id, watch_duration, completion_percentage,
                    coins_earned, completed
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
                session.user_id, session.video_id, session.watch_duration,
                session.completion_percentage, session.coins_earned, session.completed
            ]);
        }

        // Create demo coin transactions
        const demoTransactions = [
            {
                user_id: 1,
                transaction_type: 'earned',
                amount: 170,
                description: 'Watched video: Rick Astley - Never Gonna Give You Up'
            },
            {
                user_id: 2,
                transaction_type: 'earned',
                amount: 170,
                description: 'Watched video: Rick Astley - Never Gonna Give You Up'
            },
            {
                user_id: 3,
                transaction_type: 'spent',
                amount: 25560,
                description: 'Video promotion: Rick Astley - Never Gonna Give You Up'
            }
        ];

        for (const transaction of demoTransactions) {
            await database.run(`
                INSERT OR IGNORE INTO coin_transactions (
                    user_id, transaction_type, amount, description
                ) VALUES (?, ?, ?, ?)
            `, [
                transaction.user_id, transaction.transaction_type,
                transaction.amount, transaction.description
            ]);
        }

        console.log('Database seeding completed successfully!');
        console.log('\nDemo accounts created:');
        console.log('1. demo@vidgro.com / demo123 (Regular user with 2000 coins)');
        console.log('2. vip@vidgro.com / vip123 (VIP user with 5000 coins)');
        console.log('3. promoter@vidgro.com / promoter123 (Promoter with 10000 coins)');

    } catch (error) {
        console.error('Error seeding database:', error);
    }
}

// Run seeding if called directly
if (require.main === module) {
    seedDatabase().then(() => {
        process.exit(0);
    }).catch((error) => {
        console.error('Seeding failed:', error);
        process.exit(1);
    });
}

module.exports = seedDatabase;