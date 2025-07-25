# AviaSales CRM - Project Analysis

## Overview
AviaSales CRM is a comprehensive Customer Relationship Management system specifically designed for travel agencies and flight booking professionals. Built with React, TypeScript, and Supabase, the application provides AI-powered email management, client relationship tracking, booking management, and advanced analytics.

## Architecture

### Technology Stack
- **Frontend**: React 18.3.1 with TypeScript
- **UI Framework**: Shadcn/UI components with Radix UI primitives
- **Styling**: Tailwind CSS with custom design system
- **State Management**: TanStack React Query for server state, React Context for local state
- **Routing**: React Router DOM
- **Backend**: Supabase (PostgreSQL database, Authentication, Edge Functions)
- **Build Tool**: Vite
- **Additional Libraries**: 
  - Date manipulation: date-fns, date-fns-tz
  - Charts: Recharts
  - Form handling: React Hook Form with Zod validation
  - Notifications: Sonner

### Application Structure
```
src/
├── components/          # Reusable UI components
├── pages/              # Route-level components
├── hooks/              # Custom React hooks
├── integrations/       # External service integrations
├── lib/                # Utility functions and configurations
├── utils/              # Helper functions
└── index.css           # Global styles and design tokens
```

## Pages and Their Purposes

### 1. **Index** (`/`)
- **Purpose**: Dashboard overview with AI-powered email management
- **Features**: Email statistics, AI assistant integration, system overview
- **Components Used**: Dashboard cards, AI chat interface

### 2. **Authentication** (`/auth`)
- **Purpose**: User login and registration
- **Features**: Supabase authentication integration
- **Security**: Protected routes, session management

### 3. **Emails** (`/emails`)
- **Purpose**: Comprehensive email management system
- **Features**: 
  - Gmail integration with OAuth
  - AI-powered email analysis and drafting
  - Email categorization and filtering
  - Automated email synchronization
- **Components**: EmailManager, AIEmailAssistant, EmailAnalysisViewer

### 4. **Clients** (`/clients`)
- **Purpose**: Client relationship management
- **Features**: 
  - Client profiles with detailed information
  - Communication history tracking
  - GDPR compliance features
  - Client intelligence and analytics
- **Components**: ClientManager, ClientProfile

### 5. **Client Profile** (`/clients/:id`)
- **Purpose**: Detailed view of individual client
- **Features**: 
  - Complete client information
  - Booking history
  - Communication timeline
  - Preference tracking

### 6. **Bookings** (`/bookings`)
- **Purpose**: Flight booking management
- **Features**: 
  - Booking creation and modification
  - Payment status tracking
  - Commission calculations
  - Integration with Sabre GDS
- **Components**: BookingManager, BookingDetail

### 7. **Booking Detail** (`/bookings/:id`)
- **Purpose**: Detailed booking information
- **Features**: 
  - Complete itinerary details
  - Passenger information
  - Payment and commission tracking
  - Modification history

### 8. **Requests** (`/requests`)
- **Purpose**: Travel request management
- **Features**: 
  - Client travel requests
  - Quote generation
  - Request status tracking
- **Components**: RequestManager, RequestDetail

### 9. **Request Detail** (`/requests/:id`)
- **Purpose**: Detailed request processing
- **Features**: 
  - Request information display
  - Quote creation and management
  - Client communication
  - Option review system

### 10. **Calendar** (`/calendar`)
- **Purpose**: Schedule and booking calendar view
- **Features**: 
  - Visual calendar interface
  - Booking timeline
  - Schedule management

### 11. **Analytics** (`/analytics`)
- **Purpose**: Business intelligence and reporting
- **Features**: 
  - Revenue analytics
  - Performance metrics
  - Client behavior analysis
  - AI-powered insights

### 12. **Messages** (`/messages`)
- **Purpose**: Communication management
- **Features**: 
  - RingCentral integration
  - SMS and call management
  - Communication history

### 13. **Agent Statistics** (`/agent-statistics`)
- **Purpose**: Individual agent performance tracking
- **Features**: 
  - Performance KPIs
  - Revenue tracking
  - Client satisfaction metrics
  - Conversion rates

### 14. **Options Review** (`/options/:token`)
- **Purpose**: Client-facing option review interface
- **Features**: 
  - Public access with token authentication
  - Client feedback collection
  - Option comparison

### 15. **View Option** (`/view-option/:token/:quoteId`)
- **Purpose**: Detailed option view for clients
- **Features**: 
  - Quote details
  - Pricing information
  - Booking actions

## Supabase Database Schema

### Core Tables

#### **profiles**
- **Purpose**: User profile information
- **Columns**: id, email, first_name, last_name, company, phone, avatar_url
- **Relationships**: Links to auth.users
- **RLS**: Users can only access their own profile

#### **clients**
- **Purpose**: Client information storage
- **Columns**: id, user_id, first_name, last_name, email, phone, company, date_of_birth, notes, total_bookings, total_spent, last_trip_date
- **Security Features**: Encrypted fields for sensitive data (passport, SSN, payment info)
- **RLS**: Users can only access their own clients

#### **bookings**
- **Purpose**: Flight booking records
- **Columns**: id, user_id, client_id, request_id, booking_reference, route, airline, departure_date, arrival_date, total_price, commission, status, pnr, ticket_numbers
- **Relationships**: Links to clients and requests
- **Triggers**: Updates client statistics automatically

#### **requests**
- **Purpose**: Travel request management
- **Columns**: id, user_id, client_id, request_type, origin, destination, departure_date, return_date, class_preference, budget_range, special_requirements, status
- **Features**: Supports multi-segment journeys via JSON

#### **quotes**
- **Purpose**: Price quotes for travel options
- **Columns**: id, user_id, client_id, request_id, route, segments, total_price, net_price, markup, fare_type, status, valid_until
- **Features**: Complex pricing structure with passenger counts, fees, and award programs

#### **email_exchanges**
- **Purpose**: Email communication tracking
- **Columns**: id, user_id, client_id, subject, body, sender_email, recipient_emails, direction, status, message_id, thread_id, attachments, metadata
- **Features**: Gmail integration, AI analysis capabilities

### Memory and Intelligence Tables

#### **client_memories**
- **Purpose**: AI-powered client relationship tracking
- **Columns**: id, user_id, client_id, relationship_summary, preferences, pain_points, opportunities, last_interaction
- **Features**: Versioned memory system, automatic updates via triggers

#### **client_intelligence**
- **Purpose**: Advanced client analytics
- **Columns**: id, user_id, client_id, booking_patterns, preferred_routes, price_sensitivity, profit_potential, seasonal_preferences, risk_score
- **Features**: AI-generated insights, machine learning predictions

#### **sales_memories**
- **Purpose**: Sales pipeline tracking
- **Columns**: id, user_id, client_id, request_id, opportunity_summary, stage, success_probability, value_proposition, next_actions, objections_handled

### Communication Tables

#### **messages**
- **Purpose**: SMS and call management
- **Columns**: id, user_id, phone_number, content, message_type, direction, status, call_duration, conversation_id
- **Integration**: RingCentral API

#### **ai_email_conversations**
- **Purpose**: AI-powered email conversation management
- **Columns**: id, user_id, title, created_at, updated_at
- **Relationships**: Links to ai_email_messages

#### **ai_email_messages**
- **Purpose**: Individual messages in AI conversations
- **Columns**: id, conversation_id, user_id, role, content, metadata
- **Features**: Supports system, user, and assistant roles

### Security and Compliance Tables

#### **audit_logs**
- **Purpose**: Security and compliance tracking
- **Columns**: id, user_id, table_name, operation, record_id, old_values, new_values, timestamp, ip_address
- **Access**: Admin-only visibility

#### **gdpr_consent**
- **Purpose**: GDPR compliance management
- **Columns**: id, user_id, consent_type, consent_given, consent_version, timestamp, withdrawal_timestamp
- **Features**: Tracks consent history and withdrawals

#### **encryption_keys**
- **Purpose**: Data encryption key management
- **Columns**: id, key_name, algorithm, key_version, status, expires_at
- **Security**: Admin-only access

### Notification and Analytics Tables

#### **notifications**
- **Purpose**: In-app notification system
- **Columns**: id, user_id, title, message, type, priority, read, action_url, related_id, related_type
- **Features**: Rich notifications with actions and priorities

#### **rate_limits**
- **Purpose**: API rate limiting
- **Columns**: id, identifier, endpoint, request_count, window_start
- **Features**: Prevents API abuse

## Major Functionalities and Implementation

### 1. **AI-Powered Email Management**
- **Files**: 
  - `src/components/AIEmailAssistant.tsx`
  - `src/components/EmailManager.tsx`
  - `src/utils/emailSync.ts`
  - `supabase/functions/gmail-integration/`
- **Features**: 
  - Gmail OAuth integration
  - Automatic email synchronization
  - AI-powered email analysis and drafting
  - Intelligent email categorization

### 2. **Client Relationship Management**
- **Files**: 
  - `src/components/ClientManager.tsx`
  - `src/pages/ClientProfile.tsx`
  - Database functions: `update_client_memory()`
- **Features**: 
  - Comprehensive client profiles
  - Communication history tracking
  - AI-powered relationship insights
  - GDPR compliance features

### 3. **Booking and Quote Management**
- **Files**: 
  - `src/components/BookingManager.tsx`
  - `src/components/SabreOptionManager.tsx`
  - `src/utils/sabreParser.ts`
- **Features**: 
  - Sabre GDS integration
  - Complex pricing calculations
  - Multi-segment journey support
  - Commission tracking

### 4. **Request Processing System**
- **Files**: 
  - `src/components/RequestManager.tsx`
  - `src/pages/RequestDetail.tsx`
  - `src/components/UnifiedEmailBuilder.tsx`
- **Features**: 
  - Travel request intake
  - Automated quote generation
  - Client option review system
  - Email communication workflow

### 5. **Advanced Analytics**
- **Files**: 
  - `src/pages/Analytics.tsx`
  - `src/components/AIInsights.tsx`
  - `supabase/functions/ai-lead-analysis/`
- **Features**: 
  - Revenue and performance tracking
  - AI-powered business insights
  - Client behavior analysis
  - Predictive analytics

### 6. **Security and Compliance**
- **Files**: 
  - `src/components/SecurityProvider.tsx`
  - `src/components/GDPRCompliance.tsx`
  - `src/utils/security.ts`
- **Features**: 
  - Row-level security (RLS)
  - Data encryption
  - GDPR compliance
  - Audit logging

### 7. **Real-time Communication**
- **Files**: 
  - `src/pages/Messages.tsx`
  - `supabase/functions/ringcentral-messages/`
- **Features**: 
  - SMS integration via RingCentral
  - Call management
  - Communication history

### 8. **AI Assistant Integration**
- **Files**: 
  - `src/components/AIAssistantChat.tsx`
  - `supabase/functions/advanced-ai-assistant/`
- **Features**: 
  - Context-aware AI assistance
  - Natural language processing
  - Business intelligence queries
  - Automated task execution

## Edge Functions (Supabase)

### AI and Machine Learning
- `advanced-ai-assistant`: Comprehensive AI assistant with context awareness
- `ai-lead-analysis`: Lead scoring and analysis
- `advanced-email-analysis`: Email content analysis and insights

### Email Integration
- `gmail-integration`: Gmail OAuth and API integration
- `enhanced-email-sync`: Advanced email synchronization
- `auto-gmail-sync`: Automated email fetching
- `process-email-content`: Email processing and categorization

### Communication
- `ringcentral-messages`: SMS and call management
- `sales-email-composer`: AI-powered email composition
- `send-email`: Email sending via Resend API

### Data Management
- `gdpr-data-export`: GDPR compliance data export
- `secure-data-encryption`: Data encryption services

### Webhooks and Notifications
- `gmail-webhook`: Gmail push notification handling
- `create-notification`: Notification creation service

## Design System

### Color Palette
- **Primary**: Blue (#3B82F6) - Professional trust
- **Secondary**: Gray variants for neutrality
- **Success**: Green for positive actions
- **Warning**: Yellow/orange for alerts
- **Destructive**: Red for critical actions

### Design Tokens
- Custom CSS variables in `src/index.css`
- HSL color system for consistency
- Semantic color naming
- Dark mode support

### Component Architecture
- Shadcn/UI base components
- Custom variants for business-specific needs
- Consistent spacing and typography
- Responsive design patterns

## Security Features

### Authentication
- Supabase Auth integration
- Row-level security (RLS) on all tables
- Protected routes and components
- Session management

### Data Protection
- Field-level encryption for sensitive data
- GDPR compliance features
- Audit logging for all operations
- Rate limiting on API endpoints

### Access Control
- Role-based permissions (admin, moderator, user)
- User-scoped data access
- Secure edge function authentication
- API key management

This comprehensive CRM system demonstrates modern web application architecture with enterprise-grade features, security, and scalability built specifically for the travel industry.