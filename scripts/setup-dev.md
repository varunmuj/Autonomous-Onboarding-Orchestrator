# Development Setup Guide

## Quick Start (5 minutes)

### 1. Environment Configuration

Copy the `.env.local` file and update with your actual values:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# n8n Configuration (optional for basic testing)
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/onboarding
```

### 2. Database Setup

1. Create a new Supabase project at https://supabase.com
2. Go to the SQL Editor in your Supabase dashboard
3. Copy and paste the contents of `supabase/migrations.sql`
4. Run the migration to create all tables

### 3. Install and Run

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests (optional)
npm test
```

### 4. Test the Application

1. Open http://localhost:3000
2. Fill out the customer intake form with:
   - Customer name and contract date (required)
   - Add stakeholders with different roles
   - Add integrations (SIS, CRM, etc.)
3. Submit the form
4. Visit http://localhost:3000/dashboard to see the onboarding

### 5. API Testing

Test the health check endpoint:
```bash
curl http://localhost:3000/api/health
```

Test the dashboard API:
```bash
curl http://localhost:3000/api/dashboard
```

## Architecture Verification

The system demonstrates the key architectural principles:

1. **State-Driven Workflow**: All onboarding state is stored in Supabase
2. **Real-time Updates**: Dashboard updates automatically via Supabase subscriptions
3. **Property-Based Testing**: Run `npm run test:pbt` to see universal properties
4. **API Consistency**: All endpoints follow RESTful patterns with proper validation

## n8n Integration (Optional)

For full automation capabilities:

1. Set up an n8n instance (local or hosted)
2. Import the workflow from `n8n/onboarding_orchestrator.json`
3. Configure the webhook URL in your environment variables
4. Test the integration by creating a new onboarding

## Production Deployment

For production deployment:

1. Use the provided Dockerfile
2. Set production environment variables
3. Configure Coolify or your preferred deployment platform
4. Set up monitoring and health checks

## Troubleshooting

### Common Issues

1. **Supabase Connection Error**: Verify your URL and keys are correct
2. **CORS Issues**: Ensure your domain is added to Supabase allowed origins
3. **n8n Webhook Fails**: Check that the webhook URL is accessible and correct

### Development Tips

1. Use the browser dev tools to inspect real-time updates
2. Check the Supabase dashboard for data verification
3. Run property-based tests to verify system correctness
4. Use the health check endpoint to verify system status

## Next Steps

Once the basic system is running:

1. Explore the comprehensive dashboard features
2. Test the stakeholder and integration management APIs
3. Review the property-based tests to understand system guarantees
4. Set up n8n workflows for full automation
5. Customize the UI for your specific needs

The system is designed to be production-ready from day one, with comprehensive testing, monitoring, and operational visibility built in.