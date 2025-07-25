# AviaSales CRM - Production Deployment Guide

## ✅ Production Ready Status
**This application is now fully configured and ready for production deployment!**

## Overview
This guide covers deploying the AviaSales CRM system to production with full security, backend services, and monitoring.

## Prerequisites

### 1. Supabase Production Project
- Create a new Supabase project for production
- Note down the Project Reference ID
- Generate service role key for deployments

### 2. Domain & SSL
- Register your custom domain
- Configure DNS to point to your hosting provider
- SSL will be automatically provisioned

### 3. Required API Keys
Ensure you have the following API keys ready:
- OpenAI API Key (for AI assistance features)
- Google OAuth Credentials (for Gmail integration)
- RingCentral API Keys (for messaging)
- Resend API Key (for email notifications)

## Step 1: Environment Configuration

### GitHub Secrets
Configure the following secrets in your GitHub repository:

```
SUPABASE_PROJECT_REF=your-production-project-ref
SUPABASE_ACCESS_TOKEN=your-supabase-access-token
SUPABASE_DB_PASSWORD=your-database-password
```

### Supabase Secrets
Configure these secrets in your Supabase project:

```bash
# Required for AI features
OPENAI_API_KEY=sk-...

# Gmail integration
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Messaging system
RINGCENTRAL_CLIENT_ID=...
RINGCENTRAL_CLIENT_SECRET=...
RINGCENTRAL_JWT_TOKEN=...

# Email notifications
RESEND_API_KEY=re_...

# Database and service keys
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_DB_URL=postgresql://...
```

## Step 2: Database Setup

### Run Migrations
```bash
# Connect to your production Supabase project
npx supabase link --project-ref your-production-project-ref

# Apply all migrations
npx supabase db push

# Deploy edge functions
npx supabase functions deploy
```

### Security Configuration
1. Enable Row Level Security on all tables
2. Configure proper authentication settings
3. Set up audit logging
4. Enable leaked password protection
5. Configure proper session timeouts

## Step 3: Frontend Deployment

### Build Configuration
```bash
# Install dependencies
npm ci

# Build for production
npm run build
```

### Environment Variables
Create `.env.production` with:
```env
VITE_SUPABASE_URL=https://your-production-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_APP_URL=https://yourdomain.com
```

## Step 4: Security Hardening

### Content Security Policy
The app includes strict CSP headers. Update for your domain:
```typescript
// In utils/security.ts
const csp = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://yourdomain.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://your-project-ref.supabase.co;
`;
```

### CORS Configuration
Update CORS settings in edge functions:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://yourdomain.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

## Step 5: Monitoring & Maintenance

### Application Monitoring
- Supabase dashboard for database monitoring
- Edge function logs for API monitoring
- Custom analytics for user behavior

### Backup Strategy
- Automatic daily database backups (Supabase Pro)
- Point-in-time recovery available
- Weekly backup verification

### Security Monitoring
- Real-time security event logging
- Failed authentication attempt monitoring
- Suspicious activity alerts

## Step 6: Domain Configuration

### DNS Setup
Point your domain to your hosting provider:
```
A Record: @ -> Your hosting provider IP
CNAME: www -> Your hosting provider domain
```

### SSL Certificate
SSL certificates are automatically provisioned and renewed.

## Step 7: Post-Deployment Verification

### Health Checks
1. Test user authentication flow
2. Verify email integration works
3. Test AI assistant functionality
4. Confirm data synchronization
5. Validate security headers

### Performance Testing
1. Page load times under 3 seconds
2. API response times under 500ms
3. Database query optimization
4. CDN performance verification

## Step 8: Maintenance Schedule

### Weekly Tasks
- Review error logs
- Check performance metrics
- Validate security events
- Update documentation

### Monthly Tasks
- Security audit
- Performance optimization
- Dependency updates
- Backup verification

### Quarterly Tasks
- Penetration testing
- Security policy review
- Disaster recovery testing
- Compliance verification

## Troubleshooting

### Common Issues
1. **CORS Errors**: Check edge function CORS configuration
2. **Authentication Failures**: Verify OAuth credentials
3. **Database Connection**: Check RLS policies and connection strings
4. **Email Integration**: Validate API keys and permissions

### Support Resources
- Supabase Documentation: https://supabase.com/docs
- Project Issues: Create GitHub issue with logs
- Security Concerns: security@yourdomain.com

## Security Compliance

This deployment includes:
- GDPR compliance features
- SOC 2 compatible logging
- Industry-standard encryption
- Regular security audits
- Automated vulnerability scanning

## Performance Optimization

- Edge function caching
- Database connection pooling
- Static asset CDN
- Image optimization
- Code splitting and lazy loading

---

For technical support or deployment assistance, contact your development team or create an issue in the project repository.