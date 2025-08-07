import React from 'react';

export interface FlightOption {
  id: string;
  route: string;
  total_price: number;
  fare_type: string;
  adults_count?: number;
  children_count?: number;
  infants_count?: number;
  quote_type: string;
  award_program?: string;
  number_of_points?: number;
  segments: any[];
  valid_until?: string;
}

interface ModernEmailTemplateProps {
  clientName: string;
  options: FlightOption[];
  reviewUrl?: string;
  companyInfo?: {
    name: string;
    phone: string;
    email: string;
    website: string;
  };
}

export const ModernEmailTemplate: React.FC<ModernEmailTemplateProps> = ({
  clientName,
  options,
  reviewUrl,
  companyInfo = {
    name: 'Select Business Class',
    phone: '+1 (555) 123-4567',
    email: 'booking@selectbusinessclass.com',
    website: 'selectbusinessclass.com'
  }
}) => {
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDuration = (segments: any[]): string => {
    if (!segments || segments.length === 0) return "Flight time available on booking";
    
    const totalMinutes = segments.reduce((total, segment) => {
      if (segment.duration) {
        const hours = parseInt(segment.duration.split('h')[0]) || 0;
        const minutes = parseInt(segment.duration.split('h')[1]?.replace('m', '')) || 0;
        return total + (hours * 60) + minutes;
      }
      return total;
    }, 0);
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  const getOptionIcon = (index: number): string => {
    const icons = ['✈️', '🌟', '⚡', '💎', '🎯', '🏆'];
    return icons[index % icons.length];
  };

  const getAirlineIcon = (segments: any[]): string => {
    if (!segments || segments.length === 0) return '✈️';
    const firstSegment = segments[0];
    // You could map airline codes to emojis here
    return '✈️';
  };

  return (
    <html>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Your Premium Flight Options</title>
        <style>{`
          /* Reset and base styles */
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1a1a1a;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 20px;
          }
          
          /* Container styles */
          .email-container {
            max-width: 700px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
          }
          
          /* Header styles */
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 60px 40px;
            text-align: center;
            position: relative;
            overflow: hidden;
          }
          
          .header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 100%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            transform: rotate(45deg);
          }
          
          .header-icon {
            font-size: 56px;
            margin-bottom: 20px;
            display: block;
            animation: float 3s ease-in-out infinite;
          }
          
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          
          .header h1 {
            font-size: 36px;
            font-weight: 700;
            margin-bottom: 16px;
            text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
          }
          
          .header p {
            font-size: 18px;
            opacity: 0.95;
            font-weight: 400;
          }
          
          /* Content area */
          .content {
            padding: 50px 40px;
          }
          
          .welcome-section {
            text-align: center;
            margin-bottom: 50px;
          }
          
          .welcome-section h2 {
            font-size: 28px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 16px;
          }
          
          .welcome-section p {
            font-size: 16px;
            color: #6b7280;
            line-height: 1.6;
          }
          
          /* Flight option cards */
          .option-card {
            margin-bottom: 35px;
            background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
            border: 1px solid #e5e7eb;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
          }
          
          .option-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.12);
          }
          
          .card-header {
            background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
            padding: 25px 30px;
            border-bottom: 1px solid #e5e7eb;
          }
          
          .option-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 8px 16px;
            border-radius: 50px;
            font-size: 14px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 16px;
          }
          
          .route-display {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 16px;
          }
          
          .route-info h3 {
            font-size: 24px;
            font-weight: 700;
            color: #1a1a1a;
            margin-bottom: 8px;
          }
          
          .route-meta {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 14px;
            color: #6b7280;
          }
          
          .price-display {
            text-align: right;
          }
          
          .price-amount {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 16px 24px;
            border-radius: 16px;
            font-size: 24px;
            font-weight: 700;
            box-shadow: 0 4px 20px rgba(16, 185, 129, 0.3);
            margin-bottom: 8px;
            display: inline-block;
          }
          
          .price-type {
            font-size: 12px;
            color: #6b7280;
            font-weight: 500;
          }
          
          /* Card body */
          .card-body {
            padding: 30px;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 20px;
            margin-bottom: 25px;
          }
          
          .info-item {
            background: rgba(102, 126, 234, 0.05);
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            border: 1px solid rgba(102, 126, 234, 0.1);
          }
          
          .info-icon {
            font-size: 24px;
            margin-bottom: 8px;
            display: block;
          }
          
          .info-label {
            font-size: 12px;
            color: #667eea;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }
          
          .info-value {
            font-size: 16px;
            color: #1a1a1a;
            font-weight: 600;
          }
          
          /* CTA section */
          .cta-section {
            background: linear-gradient(135deg, #e6fffa 0%, #f0fff4 100%);
            padding: 30px;
            border-radius: 16px;
            border-left: 4px solid #10b981;
            text-align: center;
            margin-top: 40px;
          }
          
          .cta-section h3 {
            color: #064e3b;
            font-size: 24px;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
          }
          
          .cta-section p {
            color: #065f46;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 25px;
          }
          
          .cta-buttons {
            display: flex;
            justify-content: center;
            gap: 16px;
            flex-wrap: wrap;
          }
          
          .cta-button {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 16px 28px;
            border-radius: 50px;
            text-decoration: none;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 4px 20px rgba(16, 185, 129, 0.3);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            display: inline-flex;
            align-items: center;
            gap: 8px;
          }
          
          .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
          }
          
          .cta-button.secondary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
          }
          
          /* Features section */
          .features-section {
            background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
            padding: 40px 30px;
            border-radius: 16px;
            margin-top: 40px;
            text-align: center;
          }
          
          .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 25px;
            margin-top: 25px;
          }
          
          .feature-item {
            text-align: center;
          }
          
          .feature-icon {
            font-size: 28px;
            margin-bottom: 8px;
            display: block;
          }
          
          .feature-text {
            font-size: 14px;
            color: #6b7280;
            font-weight: 500;
          }
          
          /* Footer */
          .footer {
            background: #1a1a1a;
            color: #d1d5db;
            padding: 40px 30px;
            text-align: center;
          }
          
          .footer h4 {
            color: white;
            font-size: 20px;
            margin-bottom: 16px;
          }
          
          .footer p {
            margin-bottom: 8px;
            font-size: 14px;
          }
          
          .contact-info {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #374151;
          }
          
          /* Mobile responsiveness */
          @media only screen and (max-width: 600px) {
            body { padding: 10px; }
            .email-container { border-radius: 12px; }
            .header, .content { padding: 30px 20px; }
            .card-header, .card-body { padding: 20px; }
            .route-display { flex-direction: column; align-items: flex-start; }
            .price-display { text-align: left; margin-top: 16px; }
            .info-grid { grid-template-columns: 1fr; }
            .cta-buttons { flex-direction: column; align-items: center; }
            .features-grid { grid-template-columns: repeat(2, 1fr); }
            .header h1 { font-size: 28px; }
            .route-info h3 { font-size: 20px; }
            .price-amount { font-size: 20px; padding: 12px 20px; }
          }
        `}</style>
      </head>
      <body>
        <div className="email-container">
          {/* Header */}
          <div className="header">
            <span className="header-icon">✈️</span>
            <h1>Your Premium Flight Options</h1>
            <p>Dear {clientName}, we've curated these exceptional travel options just for you</p>
          </div>

          {/* Content */}
          <div className="content">
            {/* Welcome Section */}
            <div className="welcome-section">
              <h2>Handpicked Travel Solutions</h2>
              <p>Each option has been carefully selected to match your preferences and deliver exceptional value for your business class travel needs.</p>
            </div>

            {/* Flight Options */}
            {options.map((option, index) => (
              <div key={option.id} className="option-card">
                <div className="card-header">
                  <div className="option-badge">
                    <span>{getOptionIcon(index)}</span>
                    <span>Option {index + 1}</span>
                  </div>
                  <div className="route-display">
                    <div className="route-info">
                      <h3>{option.route}</h3>
                      <div className="route-meta">
                        <span>{getAirlineIcon(option.segments)}</span>
                        <span>{option.fare_type || 'Premium'}</span>
                        <span>•</span>
                        <span>{option.quote_type === 'award' ? 'Award Ticket' : 'Revenue Ticket'}</span>
                      </div>
                    </div>
                    <div className="price-display">
                      <div className="price-amount">
                        {option.quote_type === 'award' && option.number_of_points 
                          ? `${option.number_of_points?.toLocaleString()} pts`
                          : formatPrice(option.total_price)
                        }
                      </div>
                      <div className="price-type">
                        {option.quote_type === 'award' ? 'Plus taxes & fees' : 'Per person'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card-body">
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="info-icon">⏱️</span>
                      <div className="info-label">Duration</div>
                      <div className="info-value">{formatDuration(option.segments)}</div>
                    </div>
                    <div className="info-item">
                      <span className="info-icon">👥</span>
                      <div className="info-label">Passengers</div>
                      <div className="info-value">
                        {option.adults_count || 1} Adult{(option.adults_count || 1) > 1 ? 's' : ''}
                        {option.children_count ? `, ${option.children_count} Child${option.children_count > 1 ? 'ren' : ''}` : ''}
                        {option.infants_count ? `, ${option.infants_count} Infant${option.infants_count > 1 ? 's' : ''}` : ''}
                      </div>
                    </div>
                    <div className="info-item">
                      <span className="info-icon">💎</span>
                      <div className="info-label">Class</div>
                      <div className="info-value">Business</div>
                    </div>
                    {option.valid_until && (
                      <div className="info-item">
                        <span className="info-icon">📅</span>
                        <div className="info-label">Valid Until</div>
                        <div className="info-value">{new Date(option.valid_until).toLocaleDateString()}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Call to Action */}
            <div className="cta-section">
              <h3>
                <span>🎯</span>
                Ready to Secure Your Journey?
              </h3>
              <p>
                Our travel specialists are standing by to finalize your booking and provide complete flight details including seat selections, meal preferences, and special accommodations.
              </p>
              <div className="cta-buttons">
                {reviewUrl && (
                  <a href={reviewUrl} className="cta-button">
                    <span>✈️</span>
                    Review & Book Options
                  </a>
                )}
                <a href={`tel:${companyInfo.phone}`} className="cta-button secondary">
                  <span>📞</span>
                  Call {companyInfo.phone}
                </a>
              </div>
            </div>

            {/* Features */}
            <div className="features-section">
              <h4>Why Choose {companyInfo.name}?</h4>
              <div className="features-grid">
                <div className="feature-item">
                  <span className="feature-icon">🔒</span>
                  <div className="feature-text">Secure Booking</div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">💼</span>
                  <div className="feature-text">Business Class Experts</div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🎯</span>
                  <div className="feature-text">Best Price Guarantee</div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">📞</span>
                  <div className="feature-text">24/7 Support</div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="footer">
            <h4>{companyInfo.name}</h4>
            <p>Thank you for choosing our premium travel services.</p>
            <p>We look forward to making your journey exceptional!</p>
            <div className="contact-info">
              <p>📞 {companyInfo.phone} | 📧 {companyInfo.email}</p>
              <p>🌐 {companyInfo.website}</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
};