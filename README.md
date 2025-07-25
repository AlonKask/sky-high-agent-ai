# AviaSales CRM System

A comprehensive travel agency CRM system built with React, TypeScript, and Supabase, featuring advanced AI capabilities, security monitoring, and production-ready deployment.

## 🚀 Features

### Core CRM Features
- **Client Management**: Complete client database with contact information, preferences, and travel history
- **Booking Management**: Flight booking system with real-time pricing and availability
- **Quote Generation**: Automated quote creation with markup calculations and client-specific pricing
- **Email Integration**: Gmail integration with AI-powered email analysis and response generation
- **Communication Tracking**: Comprehensive communication history and analytics

### AI-Powered Features
- **AI Email Assistant**: Intelligent email classification, response generation, and sentiment analysis
- **Lead Scoring**: Automated lead qualification and priority scoring
- **Client Intelligence**: Behavioral analysis, preference learning, and upselling opportunities
- **Sales Insights**: Performance analytics and conversion tracking

### Security & Compliance
- **Row Level Security (RLS)**: Database-level access control
- **Audit Logging**: Comprehensive activity tracking and compliance reporting
- **Data Encryption**: Client-side and server-side encryption for sensitive data
- **GDPR Compliance**: Data portability, deletion rights, and consent management
- **Security Monitoring**: Real-time threat detection and incident response

### Production Features
- **Performance Monitoring**: Real-time application performance tracking
- **Error Tracking**: Automated error detection and reporting
- **Health Checks**: System health monitoring and alerting
- **CI/CD Pipeline**: Automated testing, security scanning, and deployment
- **Docker Support**: Containerized deployment with Nginx and security headers

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and optimized builds
- **Tailwind CSS** with custom design system
- **Radix UI** components for accessibility
- **React Router** for navigation
- **React Query** for data fetching and caching

### Backend & Database
- **Supabase** for database, authentication, and real-time features
- **PostgreSQL** with Row Level Security
- **Edge Functions** for serverless API endpoints
- **Real-time subscriptions** for live updates

### AI & Integrations
- **OpenAI API** for AI-powered features
- **Gmail API** for email integration
- **RingCentral** for communication management
- **Flight data APIs** for real-time pricing

### DevOps & Security
- **GitHub Actions** for CI/CD
- **Docker** for containerization
- **Nginx** for reverse proxy and security
- **SSL/TLS** encryption
- **Security headers** and CSP

## 🚦 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Git
- Docker (optional)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd aviasales-crm
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Open http://localhost:8080 in your browser

### Production Deployment

1. **Configure secrets in GitHub**
   - `SUPABASE_PROJECT_REF`
   - `SUPABASE_ACCESS_TOKEN`
   - `SUPABASE_DB_PASSWORD`

2. **Configure Supabase secrets**
   - `OPENAI_API_KEY`
   - `GOOGLE_CLIENT_SECRET`
   - `RINGCENTRAL_CLIENT_SECRET`
   - `RESEND_API_KEY`

3. **Deploy**
   ```bash
   git push origin main
   ```

## 📁 Project Structure

```
├── src/
│   ├── components/          # Reusable UI components
│   ├── pages/              # Application pages
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions
│   ├── integrations/       # External service integrations
│   └── lib/                # Configuration and setup
├── supabase/
│   ├── functions/          # Edge Functions
│   ├── migrations/         # Database migrations
│   └── config.toml         # Supabase configuration
├── .github/
│   └── workflows/          # CI/CD pipelines
├── docker-compose.yml      # Docker configuration
├── Dockerfile             # Container definition
└── nginx.conf             # Nginx configuration
```

## 🔒 Security Features

### Database Security
- Row Level Security (RLS) on all tables
- Audit logging for all data changes
- Encrypted storage for sensitive data
- Regular security scans and updates

### Application Security
- Content Security Policy (CSP)
- HTTPS enforcement
- XSS and CSRF protection
- Rate limiting on API endpoints
- Input validation and sanitization

### Authentication & Authorization
- JWT-based authentication
- Role-based access control
- Session management
- Multi-factor authentication support

## 📊 Monitoring & Analytics

### Performance Monitoring
- Core Web Vitals tracking
- Application performance metrics
- Database query performance
- Real-time error tracking

### Security Monitoring
- Failed authentication attempts
- Suspicious activity detection
- Data access logging
- Compliance reporting

### Business Analytics
- User engagement metrics
- Conversion tracking
- Revenue analytics
- Customer behavior insights

## 🧪 Testing

```bash
# Run type checking
npm run type-check

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Security audit
npm run security:audit
```

## 📚 Documentation

- [Security Guide](./SECURITY.md) - Comprehensive security documentation
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment instructions
- [API Documentation](./docs/api.md) - API endpoints and usage
- [Component Library](./docs/components.md) - UI component documentation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the docs/ directory
- **Issues**: Create an issue on GitHub
- **Security**: See SECURITY.md for security-related concerns
- **Email**: support@aviasales-crm.com

## 🗓️ Roadmap

### Q1 2025
- [ ] Mobile application
- [ ] Advanced AI features
- [ ] Integration with more travel APIs
- [ ] Enhanced reporting dashboard

### Q2 2025
- [ ] Multi-language support
- [ ] Advanced workflow automation
- [ ] Custom branding options
- [ ] Enterprise features

---

Built with ❤️ by the AviaSales CRM Team
