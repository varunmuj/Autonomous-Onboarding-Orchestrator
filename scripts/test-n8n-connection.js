#!/usr/bin/env node

// Test script to verify n8n webhook connections
// Run with: node scripts/test-n8n-connection.js

require('dotenv').config({ path: '.env.local' });

async function testN8nConnection() {
  console.log('Testing n8n webhook connections...\n');

  const webhooks = {
    'Main Onboarding Webhook': process.env.N8N_WEBHOOK_URL,
    'Escalation Webhook': process.env.N8N_ESCALATION_WEBHOOK_URL,
    'Notification Webhook': process.env.N8N_NOTIFICATION_WEBHOOK_URL
  };

  const apiKey = process.env.N8N_API_KEY;
  const timeout = parseInt(process.env.N8N_TIMEOUT || '30000', 10);

  console.log('📋 Configuration Summary:');
  console.log(`⏱️  Timeout: ${timeout}ms`);
  console.log(`🔑 API Key: ${apiKey ? 'Configured' : 'Not configured'}`);
  console.log('');

  let hasValidWebhooks = false;

  for (const [name, url] of Object.entries(webhooks)) {
    console.log(`🔍 Testing ${name}:`);
    
    if (!url || url.includes('your-n8n-instance')) {
      console.log(`  ⚠️  Not configured (placeholder value)`);
      continue;
    }

    if (!url.startsWith('http')) {
      console.log(`  ❌ Invalid URL format: ${url}`);
      continue;
    }

    hasValidWebhooks = true;
    console.log(`  📍 URL: ${url}`);

    try {
      // Test webhook with a simple ping payload
      const testPayload = {
        test: true,
        timestamp: new Date().toISOString(),
        source: 'n8n-connection-test'
      };

      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Autonomous-Onboarding-Orchestrator/3.0.0'
      };

      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      console.log(`  🚀 Sending test request...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(testPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log(`  📊 Response: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        console.log(`  ✅ Webhook is reachable and responding`);
        
        // Try to read response body (if any)
        try {
          const responseText = await response.text();
          if (responseText) {
            console.log(`  📄 Response body: ${responseText.substring(0, 100)}${responseText.length > 100 ? '...' : ''}`);
          }
        } catch (bodyError) {
          // Ignore body read errors
        }
      } else {
        console.log(`  ⚠️  Webhook responded with error status`);
      }

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`  ⏰ Request timed out after ${timeout}ms`);
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        console.log(`  🔌 Connection failed: ${error.message}`);
      } else {
        console.log(`  ❌ Error: ${error.message}`);
      }
    }

    console.log('');
  }

  if (!hasValidWebhooks) {
    console.log('❌ No valid n8n webhooks configured.');
    console.log('\n💡 To configure n8n webhooks:');
    console.log('1. Set up your n8n instance (cloud or self-hosted)');
    console.log('2. Create workflows with webhook triggers');
    console.log('3. Copy the webhook URLs from n8n');
    console.log('4. Update your .env.local file with the actual URLs');
    console.log('\nExample webhook URLs:');
    console.log('- https://your-n8n-instance.com/webhook/onboarding');
    console.log('- https://your-n8n-instance.com/webhook/escalation');
    console.log('- https://your-n8n-instance.com/webhook/notification');
  } else {
    console.log('🎉 n8n connection test completed!');
    console.log('\n📝 Next steps:');
    console.log('- Ensure your n8n workflows are active');
    console.log('- Test the full onboarding flow');
    console.log('- Monitor n8n execution logs for any issues');
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n\n⏹️  Test interrupted by user');
  process.exit(0);
});

testN8nConnection().catch(error => {
  console.error('💥 Test script failed:', error.message);
  process.exit(1);
});