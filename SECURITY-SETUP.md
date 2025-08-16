# 🔐 Security Setup Guide

This guide helps you securely configure your CRM application for public deployment.

## ⚠️ CRITICAL: Before Going Public

**NEVER commit the following to GitHub:**
- Real Supabase credentials
- Production API keys
- OAuth client secrets
- Database connection strings
- Bearer tokens

## 🚀 Quick Setup

1. **Copy Environment Template**
   ```bash
   cp .env.example .env
   ```

2. **Replace ALL placeholder values in `.env`**
   ```bash
   # ❌ NEVER use these placeholder values in production
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   
   # ✅ Replace with your actual credentials
   VITE_SUPABASE_URL=https://your-actual-project.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
   ```

3. **Configure Required Services**

### Supabase Configuration
```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

### Google OAuth Setup
```bash
VITE_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
```

### Cloudflare Turnstile (CAPTCHA)
```bash
VITE_TURNSTILE_SITE_KEY=YOUR_TURNSTILE_SITE_KEY
```

## 🛡️ Security Validation

The application automatically validates your configuration:

- ✅ **Critical**: Supabase URL and Anon Key
- ⚠️ **Warning**: Google Client ID and Turnstile keys
- 🔍 **Environment Detection**: Automatically detects dev/staging/production

## 🌐 Deployment Checklist

### Before Publishing to GitHub:
- [ ] All credentials moved to environment variables
- [ ] `.env` file added to `.gitignore` (already configured)
- [ ] Only placeholder values in `.env.example`
- [ ] No hardcoded credentials in source code
- [ ] Database policies properly configured

### For Production Deployment:
- [ ] Environment variables configured in deployment platform
- [ ] CORS origins properly set
- [ ] SSL/HTTPS enabled
- [ ] Rate limiting configured
- [ ] Monitoring and logging enabled

## 🔧 Environment-Specific Configuration

### Development
```bash
# Use test credentials for local development
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA  # Cloudflare test key
```

### Production
```bash
# Use real credentials (never commit these!)
VITE_TURNSTILE_SITE_KEY=0x4AAAAAABr-hIuawnDu2ms3  # Your real site key
```

## 🚨 Security Incidents

If credentials are accidentally committed:

1. **Immediately rotate all exposed credentials**
2. **Create new Supabase project if necessary**
3. **Update OAuth application settings**
4. **Review git history for sensitive data**
5. **Update all deployment environments**

## 📞 Support

For security questions or concerns:
- Check the application logs for configuration validation
- Review Supabase dashboard for authentication issues
- Verify OAuth settings in Google Cloud Console
- Test CAPTCHA functionality in browser developer tools

---

**Remember: Security is not optional. Take time to properly configure your environment.**