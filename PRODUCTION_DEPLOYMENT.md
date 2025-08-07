# Production Deployment Guide

## Overview
This guide provides the steps to deploy your application to production at `https://selectbc.online` after fixing the configuration issues.

## Pre-Deployment Checklist

### 1. Update Environment Variables
Edit `.env.production` with your actual values:
```bash
# Replace with your actual Supabase project details
VITE_SUPABASE_URL=https://your-actual-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key

# Replace with your actual Google OAuth client ID
VITE_GOOGLE_CLIENT_ID=your-actual-google-client-id

# App URLs (already set)
VITE_APP_URL=https://selectbc.online
VITE_API_URL=https://your-actual-project-ref.supabase.co/functions/v1
```

### 2. SSL Certificate Setup
Place your SSL certificates in the `ssl/` directory:
```bash
ssl/
├── cert.pem    # Your SSL certificate
└── key.pem     # Your private key
```

For Let's Encrypt certificates, you can use:
```bash
# Install certbot
sudo apt install certbot

# Generate certificate
sudo certbot certonly --standalone -d selectbc.online -d www.selectbc.online

# Copy to ssl directory
sudo cp /etc/letsencrypt/live/selectbc.online/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/selectbc.online/privkey.pem ssl/key.pem
```

### 3. Supabase Configuration
In your Supabase dashboard:

1. **Authentication > URL Configuration**:
   - Site URL: `https://selectbc.online`
   - Redirect URLs: 
     - `https://selectbc.online`
     - `https://www.selectbc.online`

2. **Google OAuth Setup** (if using):
   - Update authorized origins in Google Cloud Console
   - Add `https://selectbc.online` to authorized domains

### 4. Update Security Headers (if needed)
If using a different Supabase project, update the CSP in both:
- `nginx.conf` line 14
- `src/utils/securityHeaders.ts` lines 14 and 38

Replace `https://ekrwjfdypqzequovmvjn.supabase.co` with your project URL.

## Deployment Steps

### Option 1: Docker Deployment
```bash
# 1. Build and run with docker-compose
docker-compose up -d --build

# 2. Check logs
docker-compose logs -f
```

### Option 2: Manual Build and Deploy
```bash
# 1. Install dependencies
npm install

# 2. Build with production environment
npm run build

# 3. Deploy dist/ folder to your hosting service
# (Upload to your server, S3, Netlify, etc.)
```

## Post-Deployment Verification

### 1. Test Basic Functionality
- Visit `https://selectbc.online`
- Verify login page loads (no blank screen)
- Check browser console for errors

### 2. Test Authentication
- Try logging in with email/password
- Try Google OAuth (if configured)
- Verify redirects work correctly

### 3. Check Security
- Verify HTTPS certificate is valid
- Check CSP headers in browser dev tools
- Test API calls to Supabase

### 4. Monitor Logs
- Check Nginx access/error logs
- Monitor Supabase Edge Function logs
- Watch for any runtime errors

## Troubleshooting

### Blank White Screen
- Check browser console for CSP violations
- Verify Supabase URL/key in network requests
- Ensure SSL certificate is valid

### Authentication Issues
- Verify Supabase Site URL and Redirect URLs
- Check Google OAuth configuration
- Confirm environment variables are loaded

### API Errors
- Check Supabase project connectivity
- Verify Edge Functions are deployed
- Monitor Supabase logs for errors

## Security Notes
- Keep `.env.production` secure and never commit it
- Regularly update SSL certificates
- Monitor security headers and CSP policies
- Review Supabase RLS policies

## Support
If issues persist after following this guide:
1. Check browser developer tools console
2. Review Supabase project logs
3. Verify all environment variables are set correctly
4. Ensure DNS is pointing to the correct server