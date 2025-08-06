# AviaSales CRM - Files and Components Explainer

## Root Configuration Files

### **package.json**
- Defines project dependencies and scripts
- Key dependencies: React, TypeScript, Supabase, Shadcn/UI, TanStack Query
- Build scripts for development and production

### **vite.config.ts**
- Vite build configuration
- Path aliases (`@/` → `src/`)
- Plugin configuration for React SWC

### **tailwind.config.ts**
- Tailwind CSS configuration
- Custom color system integration
- Design token definitions
- Responsive breakpoints

### **index.html**
- Root HTML template
- Meta tags and basic structure

## Core Application Files

### **src/main.tsx**
- Application entry point
- React root mounting
- Global CSS imports

### **src/App.tsx**
- Main application component
- Router configuration with protected routes
- Provider hierarchy: QueryClient → Auth → Security → Sidebar
- Route definitions for all pages
- Special handling for public routes (`/auth`, `/options/*`)

### **src/index.css**
- Global styles and design system
- CSS custom properties (design tokens)
- Component utility classes
- Dark mode support
- Typography and spacing definitions

## Authentication and Security

### **src/hooks/useAuth.tsx**
- Authentication context provider
- Supabase Auth integration
- Session management
- Sign-out functionality with cleanup

### **src/hooks/useUserRole.tsx**
- User role management
- Role-based access control
- Fetches user roles from Supabase

### **src/components/SecurityProvider.tsx**
- Security context for the application
- Permission checking
- Security event logging
- Session validation

### **src/integrations/supabase/client.ts**
- Supabase client configuration
- Database connection setup
- Authentication persistence settings

### **src/lib/config.ts**
- Configuration constants
- API keys and service URLs
- Environment-specific settings

## Page Components

### **src/pages/Index.tsx**
- Dashboard homepage
- AI-powered email management interface
- System overview and statistics
- Entry point for main application features

### **src/pages/Auth.tsx**
- Authentication page
- Login and registration forms
- Supabase Auth integration
- Redirect handling

### **src/pages/Emails.tsx**
- Email management interface
- Gmail integration features
- Email list and filtering
- AI assistant integration

### **src/pages/Clients.tsx**
- Client management overview
- Client list with search and filtering
- GDPR compliance features
- Client statistics and insights

### **src/pages/ClientProfile.tsx**
- Individual client detailed view
- Communication history
- Booking history
- Client preferences and notes

### **src/pages/Bookings.tsx**
- Booking management interface
- Flight booking list
- Status tracking
- Commission calculations

### **src/pages/BookingDetail.tsx**
- Detailed booking information
- Itinerary display
- Payment and status management
- Modification history

### **src/pages/Requests.tsx**
- Travel request management
- Request processing workflow
- Status tracking
- Quote generation interface

### **src/pages/RequestDetail.tsx**
- Individual request processing
- Quote creation and management
- Client communication
- Option review system

### **src/pages/Calendar.tsx**
- Calendar view for bookings and schedules
- Visual timeline interface
- Booking management from calendar view

### **src/pages/Analytics.tsx**
- Business intelligence dashboard
- Revenue and performance analytics
- AI-powered insights
- Chart and graph visualizations

### **src/pages/Messages.tsx**
- Communication management
- SMS and call integration
- RingCentral API integration
- Message history and threading

### **src/pages/AgentStatistics.tsx**
- Individual agent performance metrics
- KPI tracking
- Revenue and commission reports
- Performance benchmarking

### **src/pages/OptionsReview.tsx**
- Client-facing option review interface
- Public access with token authentication
- Quote comparison and selection
- Feedback collection

### **src/pages/ViewOption.tsx**
- Detailed option view for clients
- Quote information display
- Booking action buttons
- Client decision interface

### **src/pages/NotFound.tsx**
- 404 error page
- Navigation back to main application

## Core Components

### **src/components/AppSidebar.tsx**
- Main navigation sidebar
- Route-based active states
- User profile display
- Navigation menu structure

### **src/components/Navigation.tsx**
- Navigation utilities and helpers
- Route management functions

### **src/components/ErrorBoundary.tsx**
- React error boundary
- Error catching and display
- Graceful error handling

## Email Management Components

### **src/components/EmailManager.tsx**
- Core email management interface
- Email list display and filtering
- Integration with Gmail API
- Email categorization and organization

### **src/components/AIEmailAssistant.tsx**
- AI-powered email assistance
- Email drafting and analysis
- Natural language processing
- Context-aware suggestions

### **src/components/EmailAnalysisViewer.tsx**
- Email analysis results display
- AI insights and recommendations
- Sentiment analysis visualization

### **src/components/EmailContentProcessor.tsx**
- Email content processing logic
- Text extraction and parsing
- Metadata generation

### **src/components/EmailSelectionActions.tsx**
- Bulk email operations
- Selection management
- Action buttons for email operations

### **src/components/EmailTemplateEditor.tsx**
- Email template creation and editing
- Template management system
- Variable insertion and formatting

### **src/components/EnhancedEmailCard.tsx**
- Individual email display component
- Rich email visualization
- Interaction controls

### **src/components/ExpandableEmailCard.tsx**
- Collapsible email display
- Detailed view toggle
- Space-efficient email browsing

### **src/components/AIReplyGenerator.tsx**
- AI-powered email reply generation
- Context-aware response suggestions
- Template-based responses

### **src/components/SalesEmailComposer.tsx**
- Sales-focused email composition
- CRM integration
- Lead nurturing templates

### **src/components/UnifiedEmailBuilder.tsx**
- Comprehensive email building interface
- Rich text editing
- Template integration

### **src/components/ManualGmailFix.tsx**
- Gmail integration troubleshooting
- Manual sync options
- Error recovery interface

## Client Management Components

### **src/components/ClientManager.tsx**
- Client database management
- CRUD operations for clients
- Search and filtering capabilities
- Export and import functions

### **src/components/AgentProfile.tsx**
- Agent profile management
- Performance tracking
- Settings and preferences

### **src/components/GDPRCompliance.tsx**
- GDPR compliance features
- Data export and deletion
- Consent management
- Privacy controls

## Booking and Travel Components

### **src/components/BookingManager.tsx**
- Flight booking interface
- Sabre GDS integration
- Booking creation and modification
- Payment processing

### **src/components/RequestManager.tsx**
- Travel request processing
- Request intake forms
- Status management
- Quote generation

### **src/components/SabreOptionManager.tsx**
- Sabre system integration
- Flight option management
- Pricing calculations
- Availability checking

### **src/components/SabreCommandTemplates.tsx**
- Sabre command template system
- GDS command generation
- Template management

### **src/components/QuoteCard.tsx**
- Individual quote display
- Pricing information
- Comparison features

### **src/components/SegmentCard.tsx**
- Flight segment visualization
- Itinerary display
- Timing and routing information

### **src/components/FlightPriceComparison.tsx**
- Price comparison interface
- Multiple option analysis
- Best value recommendations

### **src/components/AirportAutocomplete.tsx**
- Airport code search and selection
- IATA code integration
- Smart suggestions

### **src/components/ClientBookingForm.tsx**
- Client-facing booking form
- Passenger information collection
- Booking confirmation

## AI and Analytics Components

### **src/components/AIAssistantChat.tsx**
- AI chat interface
- Context-aware assistance
- Natural language interaction
- Task automation

### **src/components/AIInsights.tsx**
- AI-generated business insights
- Data analysis visualization
- Recommendation engine

### **src/components/AILeadScoring.tsx**
- Lead scoring algorithm
- Prospect qualification
- Sales pipeline optimization

### **src/components/Dashboard.tsx**
- Main dashboard interface
- Key metrics display
- Quick action buttons

### **src/components/EnhancedDashboard.tsx**
- Advanced dashboard features
- Customizable widgets
- Real-time data updates

## Utility Components

### **src/components/LoadingSpinner.tsx**
- Loading state indicator
- Consistent loading UI
- Accessible loading states

### **src/components/NotificationCenter.tsx**
- In-app notification system
- Toast notifications
- Alert management

### **src/components/RoleSelector.tsx**
- User role selection interface
- Permission management
- Role-based access controls

### **src/components/RequestInformation.tsx**
- Information display component
- Request details formatting
- Data presentation utilities

### **src/components/InlineEditField.tsx**
- Inline editing functionality
- Form field components
- Real-time data updates

## UI Components (src/components/ui/)

### Core Shadcn/UI Components
- **button.tsx**: Button component with variants
- **card.tsx**: Card layouts and containers
- **input.tsx**: Form input fields
- **dialog.tsx**: Modal dialogs and overlays
- **table.tsx**: Data table components
- **form.tsx**: Form handling and validation
- **select.tsx**: Dropdown selection components
- **badge.tsx**: Status badges and labels
- **alert.tsx**: Alert and notification components
- **tabs.tsx**: Tab navigation components
- **sidebar.tsx**: Sidebar layout components

### Advanced UI Components
- **calendar.tsx**: Date picker and calendar
- **chart.tsx**: Data visualization components
- **carousel.tsx**: Image and content carousels
- **command.tsx**: Command palette interface
- **toast.tsx**: Toast notification system
- **tooltip.tsx**: Hover information displays
- **progress.tsx**: Progress indicators
- **slider.tsx**: Range and value sliders

## Utility Functions

### **src/utils/sabreParser.ts**
- Sabre GDS response parsing
- Flight data extraction
- Price calculation utilities
- Segment processing

### **src/utils/emailSync.ts**
- Email synchronization logic
- Gmail API integration
- Error handling and retry logic
- Batch processing functions

### **src/utils/emailTemplateGenerator.ts**
- Dynamic email template generation
- Variable substitution
- Template customization

### **src/utils/emailVariableParser.ts**
- Email variable parsing and processing
- Dynamic content insertion
- Template variable management

### **src/utils/aiAssistantApi.ts**
- AI assistant API integration
- Natural language processing
- Context management

### **src/utils/security.ts**
- Security utility functions
- Data encryption helpers
- Access control utilities

### **src/utils/performance.ts**
- Performance monitoring
- Optimization utilities
- Metrics collection

### **src/utils/logger.ts**
- Logging functionality
- Error tracking
- Debug utilities

### **src/utils/notifications.ts**
- Notification management
- Toast configuration
- Alert systems

### **src/utils/seo.ts**
- SEO optimization utilities
- Meta tag management
- Search engine optimization

### **src/utils/TravelSiteIntegration.ts**
- Travel site API integrations
- Price comparison services
- External booking systems

## Custom Hooks

### **src/hooks/use-mobile.tsx**
- Mobile device detection
- Responsive behavior hooks
- Touch interaction handling

### **src/hooks/use-toast.ts**
- Toast notification management
- Alert system integration
- User feedback handling

### **src/hooks/useGmailIntegration.tsx**
- Gmail API integration hooks
- OAuth flow management
- Email synchronization state

## Edge Functions (Supabase)

### AI and Machine Learning Functions

#### **supabase/functions/advanced-ai-assistant/index.ts**
- Comprehensive AI assistant
- Context-aware responses
- Business intelligence queries
- Natural language processing
- Integration with OpenAI API

#### **supabase/functions/ai-lead-analysis/index.ts**
- Lead scoring and analysis
- Prospect qualification
- Sales pipeline optimization
- AI-powered insights generation

#### **supabase/functions/advanced-email-analysis/index.ts**
- Email content analysis
- Sentiment detection
- Key information extraction
- AI-powered categorization

### Email Integration Functions

#### **supabase/functions/gmail-integration/index.ts**
- Gmail API integration
- OAuth flow handling
- Email fetching and parsing
- Metadata extraction

#### **supabase/functions/gmail-oauth/index.ts**
- Gmail OAuth authentication
- Token management
- Refresh token handling
- Authorization flow

#### **supabase/functions/enhanced-email-sync/index.ts**
- Advanced email synchronization
- Incremental updates
- Error handling and retry logic
- Batch processing

#### **supabase/functions/auto-gmail-sync/index.ts**
- Automated email fetching
- Scheduled synchronization
- Background processing
- Status monitoring

#### **supabase/functions/fetch-gmail-emails/index.ts**
- Gmail email retrieval
- Message parsing
- Attachment handling
- Thread management

#### **supabase/functions/process-email-content/index.ts**
- Email content processing
- Text extraction
- Metadata generation
- Classification logic

#### **supabase/functions/process-selected-emails/index.ts**
- Bulk email processing
- Batch operations
- Selection handling
- Status updates

### Communication Functions

#### **supabase/functions/ringcentral-messages/index.ts**
- RingCentral API integration
- SMS sending and receiving
- Call management
- Communication history

#### **supabase/functions/sales-email-composer/index.ts**
- AI-powered email composition
- Sales template generation
- Personalization engine
- CRM integration

#### **supabase/functions/send-email/index.ts**
- Email sending via Resend API
- Template processing
- Delivery tracking
- Error handling

### Data Management Functions

#### **supabase/functions/gdpr-data-export/index.ts**
- GDPR compliance data export
- User data aggregation
- Privacy compliance
- Secure data transfer

#### **supabase/functions/secure-data-encryption/index.ts**
- Data encryption services
- Key management
- Secure storage
- Compliance features

### Utility Functions

#### **supabase/functions/create-notification/index.ts**
- Notification creation service
- User alert management
- System notifications
- Integration with notification center

#### **supabase/functions/gmail-webhook/index.ts**
- Gmail push notification handling
- Webhook processing
- Real-time updates
- Event management

#### **supabase/functions/option-review-chat/index.ts**
- Client option review chat
- Public interface support
- Feedback collection
- Review processing

#### **supabase/functions/process-option-feedback/index.ts**
- Option feedback processing
- Client response handling
- Data aggregation
- Analytics integration

#### **supabase/functions/scheduled-gmail-sync/index.ts**
- Scheduled email synchronization
- Cron job handling
- Background processing
- Status monitoring

#### **supabase/functions/sync-inbox/index.ts**
- Inbox synchronization
- Real-time updates
- Conflict resolution
- State management

### Shared Utilities

#### **supabase/functions/_shared/rate-limiter.ts**
- Rate limiting functionality
- API protection
- Request throttling
- Abuse prevention

## Data Files

### **src/data/airport-codes.csv**
- Airport code database
- IATA code listings
- Airport information
- Geographic data

## Configuration Files

### **supabase/config.toml**
- Supabase project configuration
- Edge function settings
- Environment variables
- Service configuration

## Key Interconnections

### Authentication Flow
1. `src/pages/Auth.tsx` → `src/hooks/useAuth.tsx` → Supabase Auth
2. `src/components/SecurityProvider.tsx` provides security context
3. All protected routes check authentication status

### Email Management Flow
1. `src/pages/Emails.tsx` → `src/components/EmailManager.tsx`
2. Gmail integration via `supabase/functions/gmail-integration/`
3. AI analysis through `supabase/functions/advanced-email-analysis/`
4. Synchronization via multiple edge functions

### Client Management Flow
1. `src/pages/Clients.tsx` → `src/components/ClientManager.tsx`
2. Individual profiles via `src/pages/ClientProfile.tsx`
3. GDPR compliance through `src/components/GDPRCompliance.tsx`
4. Data export via `supabase/functions/gdpr-data-export/`

### Booking Management Flow
1. `src/pages/Bookings.tsx` → `src/components/BookingManager.tsx`
2. Sabre integration via `src/components/SabreOptionManager.tsx`
3. Quote generation and management
4. Client review system through public routes

### AI Integration Flow
1. `src/components/AIAssistantChat.tsx` → `supabase/functions/advanced-ai-assistant/`
2. Context awareness through multiple data sources
3. Natural language processing via OpenAI API
4. Business intelligence integration

This file structure supports a comprehensive CRM system with clear separation of concerns, robust security, and scalable architecture suitable for enterprise travel agency operations.