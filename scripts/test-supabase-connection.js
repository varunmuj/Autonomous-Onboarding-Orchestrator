#!/usr/bin/env node

// Test script to verify Supabase connection
// Run with: node scripts/test-supabase-connection.js

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testConnection() {
  console.log('Testing Supabase connection...\n');

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing environment variables:');
    if (!supabaseUrl) console.error('  - NEXT_PUBLIC_SUPABASE_URL');
    if (!supabaseKey) console.error('  - NEXT_PUBLIC_SUPABASE_ANON_KEY');
    console.error('\nPlease update your .env.local file with your Supabase credentials.');
    process.exit(1);
  }

  if (supabaseUrl.includes('your-project-ref') || supabaseKey.includes('your_actual')) {
    console.error('❌ Please replace placeholder values in .env.local with your actual Supabase credentials.');
    process.exit(1);
  }

  console.log('✅ Environment variables found');
  console.log(`📍 Supabase URL: ${supabaseUrl}`);
  console.log(`🔑 Anon Key: ${supabaseKey.substring(0, 20)}...`);

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Test basic connection
    console.log('\n🔍 Testing database connection...');
    const { data, error } = await supabase.from('customers').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Database connection failed:', error.message);
      
      if (error.message.includes('relation "customers" does not exist')) {
        console.error('\n💡 The "customers" table doesn\'t exist yet.');
        console.error('   Please run the SQL migration in your Supabase dashboard:');
        console.error('   1. Go to SQL Editor in your Supabase dashboard');
        console.error('   2. Copy and paste the contents of supabase/migrations.sql');
        console.error('   3. Click Run to execute the migration');
      }
      
      process.exit(1);
    }

    console.log('✅ Database connection successful!');
    console.log(`📊 Customers table exists (${data?.length || 0} records)`);

    // Test other tables
    const tables = ['onboardings', 'onboarding_tasks', 'stakeholders', 'integrations', 'events_audit'];
    
    for (const table of tables) {
      try {
        const { error: tableError } = await supabase.from(table).select('count', { count: 'exact', head: true });
        if (tableError) {
          console.log(`❌ Table "${table}" not found`);
        } else {
          console.log(`✅ Table "${table}" exists`);
        }
      } catch (err) {
        console.log(`❌ Table "${table}" check failed`);
      }
    }

    console.log('\n🎉 Supabase connection test completed successfully!');
    console.log('\nYour project is ready to use Supabase. You can now:');
    console.log('- Start your development server: npm run dev');
    console.log('- View your data in the Supabase dashboard');
    console.log('- Begin using the onboarding orchestrator features');

  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    process.exit(1);
  }
}

testConnection();