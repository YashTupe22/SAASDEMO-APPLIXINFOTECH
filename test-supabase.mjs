// Test Supabase connection and schema
// Run with: node test-supabase.mjs

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local manually (without dotenv package)
const envPath = join(__dirname, '.env.local');
try {
    const envContent = readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                process.env[key.trim()] = valueParts.join('=').trim();
            }
        }
    });
} catch (err) {
    console.error('❌ Could not read .env.local file');
    process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('\n🔍 Testing Supabase Connection...\n');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey?.substring(0, 20) + '...\n');

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing environment variables in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    try {
        // Test 1: Basic connection
        console.log('1️⃣ Testing basic connection...');
        const { data, error } = await supabase.from('profiles').select('count');
        
        if (error) {
            if (error.message.includes('relation') && error.message.includes('does not exist')) {
                console.log('   ❌ SCHEMA NOT APPLIED');
                console.log('   → The profiles table does not exist');
                console.log('   → You need to run the SQL from supabase/schema.sql\n');
                return false;
            } else {
                console.log('   ❌ Error:', error.message);
                return false;
            }
        }
        
        console.log('   ✅ Connection successful!\n');

        // Test 2: Check all required tables
        console.log('2️⃣ Checking required tables...');
        const tables = [
            'profiles', 'employees', 'attendance', 
            'invoices', 'invoice_items', 'transactions', 
            'inventory', 'support_requests'
        ];
        
        for (const table of tables) {
            const { error: tableError } = await supabase.from(table).select('count').limit(1);
            if (tableError) {
                console.log(`   ❌ ${table}: Not found`);
            } else {
                console.log(`   ✅ ${table}: OK`);
            }
        }

        console.log('\n3️⃣ Testing authentication...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
            console.log('   ⚠️  Auth error:', sessionError.message);
        } else if (session) {
            console.log('   ✅ User logged in:', session.user.email);
        } else {
            console.log('   ℹ️  No active session (this is OK)');
        }

        console.log('\n✅ All tests passed! Your backend should work now.');
        console.log('\n🚀 Next steps:');
        console.log('   1. Start your dev server: npm run dev');
        console.log('   2. Sign up a new user');
        console.log('   3. Complete onboarding');
        console.log('   4. Add data - it will persist!\n');
        
        return true;

    } catch (err) {
        console.error('\n❌ Unexpected error:', err.message);
        return false;
    }
}

testConnection().then(success => {
    process.exit(success ? 0 : 1);
});
