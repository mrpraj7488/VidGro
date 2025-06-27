const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'your-supabase-anon-key';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-supabase-service-role-key';

// Create Supabase client with service role key for server-side operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Create Supabase client with anon key for user operations
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

// Test connection
const testConnection = async () => {
    try {
        const { data, error } = await supabase.from('users').select('count').limit(1);
        if (error) {
            console.log('⚠️ Supabase connection test failed:', error.message);
            console.log('📝 Make sure to set up your Supabase project and update environment variables');
            return false;
        }
        console.log('✅ Supabase connection successful');
        return true;
    } catch (error) {
        console.log('⚠️ Supabase connection error:', error.message);
        return false;
    }
};

// Initialize connection test
testConnection();

module.exports = {
    supabase,
    supabaseAnon,
    testConnection
};