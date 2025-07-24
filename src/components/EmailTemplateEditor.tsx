import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmailVariableParser, EmailVariables } from '@/utils/emailVariableParser';
import { 
  Mail, 
  Send, 
  Eye, 
  Palette, 
  Wand2, 
  Copy,
  FileText,
  Plane,
  MapPin,
  Calendar,
  Users,
  Star,
  Heart,
  Briefcase,
  Crown,
  Clock
} from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
  category: 'business' | 'premium' | 'urgent' | 'comprehensive';
  subject: string;
  content: string;
  variables: string[];
  icon: React.ComponentType<any>;
  preview: string;
}

interface EmailTemplateEditorProps {
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
  clientName?: string;
  clientEmail?: string;
  quotes?: any[];
  onSend?: (emailData: { to: string; subject: string; body: string }) => void;
  onCancel?: () => void;
}

// Professional SBC email templates with structured layouts
const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'corporate',
    name: 'Corporate Professional',
    category: 'business',
    subject: 'Business Class Travel Quote - {{ROUTE_DESCRIPTION}} | Select Business Class',
    content: `<!DOCTYPE html>
<html>
<head>
    <style>
        .email-container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; }
        .header { background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 20px; text-align: center; }
        .logo { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
        .tagline { font-size: 14px; opacity: 0.9; }
        .content { padding: 30px 20px; }
        .greeting { font-size: 16px; margin-bottom: 20px; color: #374151; }
        .flight-card { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .route-header { font-size: 18px; font-weight: bold; color: #1f2937; margin-bottom: 15px; }
        .flight-details { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
        .detail-item { }
        .detail-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
        .detail-value { font-size: 14px; color: #374151; font-weight: 500; margin-top: 2px; }
        .pricing-section { background: #eff6ff; border: 1px solid #dbeafe; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .price-breakdown { display: grid; grid-template-columns: 1fr auto; gap: 10px; margin-bottom: 10px; }
        .price-label { color: #374151; }
        .price-value { font-weight: 600; color: #1f2937; }
        .total-price { border-top: 2px solid #3b82f6; padding-top: 15px; margin-top: 15px; font-size: 18px; font-weight: bold; color: #1e40af; }
        .cta-button { background: #3b82f6; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; display: inline-block; margin: 20px 0; font-weight: 600; }
        .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
        .agent-signature { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">SELECT BUSINESS CLASS</div>
            <div class="tagline">Premium Travel Solutions for Discerning Professionals</div>
        </div>
        
        <div class="content">
            <div class="greeting">Dear {{COMPANY_NAME}},</div>
            
            <p>Thank you for choosing Select Business Class for your travel needs. I'm pleased to present you with a carefully curated business class option that aligns with your requirements.</p>
            
            <div class="flight-card">
                <div class="route-header">✈️ {{ROUTE_DESCRIPTION}}</div>
                <div class="flight-details">
                    <div class="detail-item">
                        <div class="detail-label">Departure Date</div>
                        <div class="detail-value">{{TRAVEL_DATE_OUTBOUND}}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Service Class</div>
                        <div class="detail-value">{{FLIGHT_OUTBOUND_CLASS}}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Passengers</div>
                        <div class="detail-value">{{PASSENGER_TOTAL_COUNT}}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Flight Details</div>
                        <div class="detail-value">{{PRICING_FARE_TYPE}}</div>
                    </div>
                </div>
            </div>
            
            <div class="pricing-section">
                <h3 style="margin-top: 0; color: #1e40af;">Investment Summary</h3>
                <div class="price-breakdown">
                    <div class="price-label">Net Price ({{PASSENGER_TOTAL_COUNT}} passengers)</div>
                    <div class="price-value">{{PRICING_NET_PRICE}}</div>
                </div>
                <div class="price-breakdown">
                    <div class="price-label">Service & Markup</div>
                    <div class="price-value">{{PRICING_MARKUP}}</div>
                </div>
                <div class="price-breakdown total-price">
                    <div>Total Investment</div>
                    <div>{{PRICING_TOTAL_PRICE}}</div>
                </div>
            </div>
            
            <div style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin: 10px 0;">
                <div style="font-weight: bold; color: #1f2937; margin-bottom: 10px;">
                    {{FLIGHT_OUTBOUND_AIRLINE}} {{FLIGHT_OUTBOUND_NUMBER}}
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Departure</div>
                        <div style="font-weight: 500; color: #374151;">{{FLIGHT_OUTBOUND_DEPARTURE_AIRPORT}} at {{FLIGHT_OUTBOUND_DEPARTURE_TIME}}</div>
                        <div style="font-size: 12px; color: #6b7280;">{{TRAVEL_DATE_OUTBOUND}}</div>
                    </div>
                    <div>
                        <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Arrival</div>
                        <div style="font-weight: 500; color: #374151;">{{FLIGHT_OUTBOUND_ARRIVAL_AIRPORT}} at {{FLIGHT_OUTBOUND_ARRIVAL_TIME}}</div>
                        <div style="font-size: 12px; color: #6b7280;">Same day</div>
                    </div>
                </div>
                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e7eb;">
                    <span style="background: #eff6ff; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">
                        {{FLIGHT_OUTBOUND_CLASS}}
                    </span>
                </div>
            </div>
            
            <p>This premium business class experience includes priority check-in, lounge access, enhanced dining, and lie-flat seating for optimal comfort during your journey.</p>
            
            <a href="#" class="cta-button">Secure This Booking</a>
            
            <p><strong>Booking Validity:</strong> This quote is valid for 24 hours. Seats are subject to availability.</p>
            
            <div class="agent-signature">
                <p><strong>{agentName}</strong><br>
                Senior Travel Consultant<br>
                Select Business Class<br>
                📞 Direct Line: (555) 123-4567<br>
                ✉️ expert@selectbusinessclass.com</p>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>SELECT BUSINESS CLASS</strong> | Premium Travel Solutions<br>
            IATA Accredited | ATOL Protected | 24/7 Support Available</p>
        </div>
    </div>
</body>
</html>`,
    variables: ['clientName', 'route', 'departureDate', 'class', 'passengers', 'airline', 'basePrice', 'taxes', 'totalPrice', 'agentName', 'agentPhone', 'agentEmail'],
    icon: Briefcase,
    preview: 'Professional corporate template with structured layout and SBC branding'
  },
  {
    id: 'luxury',
    name: 'Luxury Premium',
    category: 'premium',
    subject: 'Exclusive First Class Experience - {route} | Select Business Class',
    content: `<!DOCTYPE html>
<html>
<head>
    <style>
        .email-container { font-family: 'Georgia', serif; max-width: 600px; margin: 0 auto; background: #ffffff; }
        .header { background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; padding: 30px 20px; text-align: center; }
        .logo { font-size: 28px; font-weight: bold; margin-bottom: 8px; letter-spacing: 2px; }
        .tagline { font-size: 16px; opacity: 0.95; font-style: italic; }
        .content { padding: 40px 30px; }
        .greeting { font-size: 18px; margin-bottom: 25px; color: #374151; }
        .luxury-card { background: linear-gradient(135deg, #faf7ff, #f3f4f6); border: 2px solid #e5e7eb; border-radius: 12px; padding: 30px; margin: 25px 0; position: relative; }
        .luxury-card::before { content: '✨'; position: absolute; top: 15px; right: 20px; font-size: 24px; }
        .route-header { font-size: 24px; font-weight: bold; color: #7c3aed; margin-bottom: 20px; text-align: center; }
        .experience-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
        .experience-item { text-align: center; padding: 15px; }
        .experience-icon { font-size: 24px; margin-bottom: 8px; }
        .experience-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; }
        .experience-value { font-size: 16px; color: #374151; font-weight: 600; margin-top: 5px; }
        .pricing-luxury { background: #f8fafc; border: 2px solid #7c3aed; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center; }
        .price-display { font-size: 32px; font-weight: bold; color: #7c3aed; margin: 15px 0; }
        .inclusions { background: #eff6ff; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .inclusion-list { list-style: none; padding: 0; }
        .inclusion-list li { padding: 5px 0; }
        .inclusion-list li::before { content: '🌟'; margin-right: 10px; }
        .cta-luxury { background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; padding: 15px 40px; border-radius: 8px; text-decoration: none; display: inline-block; margin: 25px 0; font-weight: 600; font-size: 16px; }
        .footer { background: #1f2937; color: white; padding: 25px; text-align: center; font-size: 12px; }
        .agent-signature { margin-top: 40px; padding-top: 25px; border-top: 2px solid #7c3aed; text-align: center; }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">SELECT BUSINESS CLASS</div>
            <div class="tagline">Curating Extraordinary Travel Experiences</div>
        </div>
        
        <div class="content">
            <div class="greeting">Dear {clientName},</div>
            
            <p>It is my distinct pleasure to present you with an exclusive luxury travel opportunity that exemplifies the pinnacle of aviation excellence.</p>
            
            <div class="luxury-card">
                <div class="route-header">{route}</div>
                <div class="experience-grid">
                    <div class="experience-item">
                        <div class="experience-icon">🗓️</div>
                        <div class="experience-label">Departure</div>
                        <div class="experience-value">{departureDate}</div>
                    </div>
                    <div class="experience-item">
                        <div class="experience-icon">👥</div>
                        <div class="experience-label">Guests</div>
                        <div class="experience-value">{passengers}</div>
                    </div>
                    <div class="experience-item">
                        <div class="experience-icon">✈️</div>
                        <div class="experience-label">Service Level</div>
                        <div class="experience-value">{class}</div>
                    </div>
                    <div class="experience-item">
                        <div class="experience-icon">🏆</div>
                        <div class="experience-label">Airline</div>
                        <div class="experience-value">{airline}</div>
                    </div>
                </div>
            </div>
            
            <div class="pricing-luxury">
                <h3 style="margin-top: 0; color: #7c3aed;">Exclusive Investment</h3>
                <div class="price-display">{totalPrice}</div>
                <p style="color: #6b7280; margin: 0;">Per journey, all-inclusive</p>
            </div>
            
            <div class="inclusions">
                <h4 style="color: #7c3aed; margin-top: 0;">Your Luxury Experience Includes:</h4>
                <ul class="inclusion-list">
                    <li>Private lounge access with premium dining</li>
                    <li>Priority boarding and expedited security</li>
                    <li>Fully-flat bed seating with premium linens</li>
                    <li>Michelin-inspired cuisine and sommelier-selected wines</li>
                    <li>Dedicated cabin service and amenity kit</li>
                    <li>Complimentary ground transportation coordination</li>
                </ul>
            </div>
            
            <center>
                <a href="#" class="cta-luxury">Reserve This Experience</a>
            </center>
            
            <p style="font-style: italic; color: #6b7280; text-align: center;">This exclusive offer is reserved for you for 48 hours.</p>
            
            <div class="agent-signature">
                <p><strong>{agentName}</strong><br>
                Principal Travel Curator<br>
                Select Business Class<br>
                🏆 Personal Service Line: {agentPhone}<br>
                📧 {agentEmail}</p>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>SELECT BUSINESS CLASS</strong><br>
            Where Luxury Meets Excellence | IATA Accredited | Concierge-Level Service</p>
        </div>
    </div>
</body>
</html>`,
    variables: ['clientName', 'route', 'departureDate', 'passengers', 'class', 'airline', 'totalPrice', 'agentName', 'agentPhone', 'agentEmail'],
    icon: Crown,
    preview: 'Sophisticated luxury template with premium inclusions and elegant design'
  },
  {
    id: 'urgent',
    name: 'Time-Sensitive',
    category: 'urgent',
    subject: '🚨 URGENT: Limited Seats Available - {route} | SBC',
    content: `<!DOCTYPE html>
<html>
<head>
    <style>
        .email-container { font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; }
        .urgent-header { background: linear-gradient(135deg, #dc2626, #ef4444); color: white; padding: 20px; text-align: center; position: relative; }
        .urgent-banner { background: #fef2f2; border: 2px solid #dc2626; color: #dc2626; padding: 10px; text-align: center; font-weight: bold; }
        .logo { font-size: 22px; font-weight: bold; margin-bottom: 5px; }
        .tagline { font-size: 14px; opacity: 0.9; }
        .content { padding: 25px 20px; }
        .alert-box { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
        .countdown { background: #dc2626; color: white; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
        .time-remaining { font-size: 24px; font-weight: bold; }
        .flight-urgent { background: #ffffff; border: 2px solid #dc2626; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .route-urgent { font-size: 20px; font-weight: bold; color: #dc2626; margin-bottom: 15px; text-align: center; }
        .urgent-details { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .urgent-item { text-align: center; }
        .urgent-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
        .urgent-value { font-size: 14px; color: #374151; font-weight: 600; margin-top: 2px; }
        .price-urgent { background: #dc2626; color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
        .price-big { font-size: 28px; font-weight: bold; }
        .savings { background: #10b981; color: white; padding: 8px 15px; border-radius: 20px; font-size: 12px; margin-top: 10px; display: inline-block; }
        .cta-urgent { background: #dc2626; color: white; padding: 15px 35px; border-radius: 6px; text-decoration: none; display: inline-block; margin: 20px 0; font-weight: bold; font-size: 16px; animation: pulse 2s infinite; }
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
        .footer { background: #374151; color: white; padding: 20px; text-align: center; font-size: 12px; }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="urgent-banner">
            ⚠️ TIME-SENSITIVE OPPORTUNITY - IMMEDIATE ACTION REQUIRED
        </div>
        
        <div class="urgent-header">
            <div class="logo">SELECT BUSINESS CLASS</div>
            <div class="tagline">Urgent Travel Solutions</div>
        </div>
        
        <div class="content">
            <div class="alert-box">
                <strong>🚨 URGENT NOTICE:</strong> {clientName}, we have secured limited seats for your requested route at an exceptional rate!
            </div>
            
            <div class="countdown">
                <div>Offer Expires In:</div>
                <div class="time-remaining">24 HOURS</div>
                <div style="font-size: 12px;">From time of this email</div>
            </div>
            
            <div class="flight-urgent">
                <div class="route-urgent">🔥 {route}</div>
                <div class="urgent-details">
                    <div class="urgent-item">
                        <div class="urgent-label">Departure</div>
                        <div class="urgent-value">{departureDate}</div>
                    </div>
                    <div class="urgent-item">
                        <div class="urgent-label">Class</div>
                        <div class="urgent-value">{class}</div>
                    </div>
                    <div class="urgent-item">
                        <div class="urgent-label">Passengers</div>
                        <div class="urgent-value">{passengers}</div>
                    </div>
                    <div class="urgent-item">
                        <div class="urgent-label">Seats Left</div>
                        <div class="urgent-value" style="color: #dc2626;">3 ONLY!</div>
                    </div>
                </div>
            </div>
            
            <div class="price-urgent">
                <div>SPECIAL RATE</div>
                <div class="price-big">{totalPrice}</div>
                <div class="savings">SAVE $1,200 vs. regular price!</div>
            </div>
            
            <div style="text-align: center;">
                <a href="#" class="cta-urgent">BOOK NOW - DON'T MISS OUT!</a>
            </div>
            
            <div class="alert-box">
                <strong>Why this rate is exceptional:</strong><br>
                • Last-minute airline inventory release<br>
                • Peak season pricing override<br>
                • Exclusive SBC partner rates<br>
                • No change fees included
            </div>
            
            <p style="text-align: center; color: #dc2626; font-weight: bold;">
                📞 URGENT BOOKING LINE: {agentPhone}<br>
                ⚡ Immediate response guaranteed
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p><strong>{agentName}</strong><br>
                Urgent Booking Specialist<br>
                Select Business Class<br>
                📱 Direct/WhatsApp: {agentPhone}<br>
                ✉️ Priority: {agentEmail}</p>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>SELECT BUSINESS CLASS</strong> | Time-Sensitive Travel Solutions<br>
            🚨 24/7 Urgent Booking Hotline Available</p>
        </div>
    </div>
</body>
</html>`,
    variables: ['clientName', 'route', 'departureDate', 'class', 'passengers', 'totalPrice', 'agentName', 'agentPhone', 'agentEmail'],
    icon: Clock,
    preview: 'High-impact urgent template with countdown timers and action-oriented design'
  },
  {
    id: 'detailed',
    name: 'Detailed Proposal',
    category: 'comprehensive',
    subject: 'Comprehensive Travel Proposal - {route} | Select Business Class',
    content: `<!DOCTYPE html>
<html>
<head>
    <style>
        .email-container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 700px; margin: 0 auto; background: #ffffff; }
        .header { background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 25px 20px; text-align: center; }
        .logo { font-size: 26px; font-weight: bold; margin-bottom: 8px; }
        .tagline { font-size: 15px; opacity: 0.95; }
        .content { padding: 30px 25px; }
        .proposal-header { text-align: center; margin-bottom: 30px; }
        .proposal-title { font-size: 24px; color: #059669; font-weight: bold; }
        .proposal-subtitle { color: #6b7280; margin-top: 5px; }
        .section { margin: 30px 0; }
        .section-title { font-size: 18px; color: #059669; font-weight: bold; margin-bottom: 15px; padding-bottom: 5px; border-bottom: 2px solid #10b981; }
        .itinerary-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 20px; margin: 15px 0; }
        .segment { border-bottom: 1px solid #d1fae5; padding-bottom: 15px; margin-bottom: 15px; }
        .segment:last-child { border-bottom: none; margin-bottom: 0; }
        .flight-row { display: grid; grid-template-columns: 1fr auto 1fr; gap: 20px; align-items: center; margin: 10px 0; }
        .airport { text-align: center; }
        .airport-code { font-size: 20px; font-weight: bold; color: #059669; }
        .airport-name { font-size: 12px; color: #6b7280; }
        .flight-arrow { text-align: center; color: #10b981; font-size: 18px; }
        .flight-info { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; font-size: 12px; margin-top: 10px; }
        .info-item { text-align: center; }
        .info-label { color: #6b7280; }
        .info-value { color: #374151; font-weight: 500; }
        .pricing-breakdown { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 25px; }
        .price-row { display: grid; grid-template-columns: 1fr auto; gap: 15px; margin: 8px 0; }
        .price-category { color: #374151; }
        .price-amount { font-weight: 600; color: #1e40af; }
        .total-section { border-top: 2px solid #059669; padding-top: 15px; margin-top: 15px; }
        .total-price { font-size: 22px; font-weight: bold; color: #059669; }
        .inclusions-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .inclusion-category { background: #f8fafc; padding: 15px; border-radius: 8px; }
        .inclusion-title { font-weight: bold; color: #059669; margin-bottom: 10px; }
        .inclusion-list { list-style: none; padding: 0; font-size: 14px; }
        .inclusion-list li { padding: 3px 0; }
        .inclusion-list li::before { content: '✓'; color: #10b981; font-weight: bold; margin-right: 8px; }
        .terms-section { background: #f9fafb; border-radius: 8px; padding: 20px; font-size: 13px; color: #4b5563; }
        .cta-detailed { background: #059669; color: white; padding: 15px 40px; border-radius: 8px; text-decoration: none; display: inline-block; margin: 25px 0; font-weight: 600; font-size: 16px; }
        .footer { background: #1f2937; color: white; padding: 25px; text-align: center; font-size: 12px; }
        .agent-signature { margin-top: 35px; padding-top: 25px; border-top: 2px solid #10b981; }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">SELECT BUSINESS CLASS</div>
            <div class="tagline">Comprehensive Travel Solutions & Expert Consultation</div>
        </div>
        
        <div class="content">
            <div class="proposal-header">
                <div class="proposal-title">Travel Proposal</div>
                <div class="proposal-subtitle">Prepared exclusively for {clientName}</div>
            </div>
            
            <div class="section">
                <div class="section-title">📋 Executive Summary</div>
                <p>Thank you for choosing Select Business Class for your upcoming journey. This comprehensive proposal outlines a carefully curated travel solution designed to meet your specific requirements while ensuring exceptional value and comfort.</p>
            </div>
            
            <div class="section">
                <div class="section-title">✈️ Flight Itinerary</div>
                <div class="itinerary-card">
                    <div class="segment">
                        <div class="flight-row">
                            <div class="airport">
                                <div class="airport-code">{originCode}</div>
                                <div class="airport-name">{originCity}</div>
                            </div>
                            <div class="flight-arrow">✈️</div>
                            <div class="airport">
                                <div class="airport-code">{destinationCode}</div>
                                <div class="airport-name">{destinationCity}</div>
                            </div>
                        </div>
                        <div class="flight-info">
                            <div class="info-item">
                                <div class="info-label">Departure</div>
                                <div class="info-value">{departureDate}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Airline</div>
                                <div class="info-value">{airline}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Class</div>
                                <div class="info-value">{class}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">💰 Investment Breakdown</div>
                <div class="pricing-breakdown">
                    <div class="price-row">
                        <div class="price-category">Base Airfare ({passengers} passengers)</div>
                        <div class="price-amount">{basePrice}</div>
                    </div>
                    <div class="price-row">
                        <div class="price-category">Taxes & Government Fees</div>
                        <div class="price-amount">{taxes}</div>
                    </div>
                    <div class="price-row">
                        <div class="price-category">Service & Processing</div>
                        <div class="price-amount">{serviceFee}</div>
                    </div>
                    <div class="price-row total-section">
                        <div class="price-category"><strong>Total Investment</strong></div>
                        <div class="total-price">{totalPrice}</div>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">🌟 Included Services & Benefits</div>
                <div class="inclusions-grid">
                    <div class="inclusion-category">
                        <div class="inclusion-title">Flight Benefits</div>
                        <ul class="inclusion-list">
                            <li>Priority check-in & boarding</li>
                            <li>Increased baggage allowance</li>
                            <li>Seat selection included</li>
                            <li>Complimentary meals & beverages</li>
                        </ul>
                    </div>
                    <div class="inclusion-category">
                        <div class="inclusion-title">SBC Services</div>
                        <ul class="inclusion-list">
                            <li>24/7 travel support</li>
                            <li>Flight change assistance</li>
                            <li>Travel insurance options</li>
                            <li>Dedicated account management</li>
                        </ul>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">📝 Terms & Conditions</div>
                <div class="terms-section">
                    <p><strong>Booking Validity:</strong> This proposal is valid for 72 hours from the time of issuance.</p>
                    <p><strong>Payment Terms:</strong> Full payment required within 24 hours of booking confirmation.</p>
                    <p><strong>Cancellation Policy:</strong> Airline cancellation terms apply. Optional travel insurance available for additional protection.</p>
                    <p><strong>Schedule Changes:</strong> Flight times are subject to airline schedule changes. We will notify you immediately of any modifications.</p>
                </div>
            </div>
            
            <div style="text-align: center;">
                <a href="#" class="cta-detailed">Proceed with This Proposal</a>
            </div>
            
            <div class="agent-signature">
                <p><strong>{agentName}</strong><br>
                Senior Travel Consultant<br>
                Select Business Class<br>
                📞 Direct Line: {agentPhone}<br>
                ✉️ Email: {agentEmail}<br>
                🌐 Expert in Business & First Class Travel</p>
                
                <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
                    "Your journey matters to us. Let's make it extraordinary."
                </p>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>SELECT BUSINESS CLASS</strong><br>
            IATA Accredited Travel Agency | ATOL Protected | ISO 9001 Certified<br>
            Serving discerning travelers worldwide since 2010</p>
        </div>
    </div>
</body>
</html>`,
    variables: ['clientName', 'originCode', 'originCity', 'destinationCode', 'destinationCity', 'departureDate', 'airline', 'class', 'passengers', 'basePrice', 'taxes', 'serviceFee', 'totalPrice', 'agentName', 'agentPhone', 'agentEmail'],
    icon: FileText,
    preview: 'Comprehensive proposal template with detailed breakdown and professional presentation'
  }
];

const VARIABLE_SUGGESTIONS = {
  clientName: 'Client\'s first name',
  agentName: 'Your name',
  agencyName: 'Your travel agency name',
  quoteDetails: 'Travel quote information',
  expiryDate: 'Quote expiration date',
  destination: 'Travel destination',
  travelDates: 'Travel dates',
  totalPrice: 'Total price',
  savings: 'Amount saved'
};

export function EmailTemplateEditor({
  initialTo = '',
  initialSubject = '',
  initialBody = '',
  clientName = '',
  clientEmail = '',
  quotes = [],
  onSend,
  onCancel
}: EmailTemplateEditorProps) {
  const [emailData, setEmailData] = useState({
    to: initialTo || clientEmail,
    subject: initialSubject,
    body: initialBody
  });
  
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Generate email variables using the new parser
  const [emailVariables, setEmailVariables] = useState<EmailVariables>(() => {
    if (quotes && quotes.length > 0) {
      return EmailVariableParser.parseQuoteToVariables(quotes[0], clientName);
    }
    return EmailVariableParser.parseQuoteToVariables({
      segments: [],
      total_price: 0
    }, clientName);
  });

  // Legacy variables for backward compatibility with existing templates
  const [variables, setVariables] = useState(() => {
    const vars = emailVariables;
    return {
      clientName: vars.COMPANY_NAME || clientName || 'Valued Client',
      agentName: vars.AGENT_NAME,
      agencyName: vars.COMPANY_NAME,
      route: vars.ROUTE_DESCRIPTION,
      departure: vars.FLIGHT_OUTBOUND_DEPARTURE_AIRPORT,
      arrival: vars.FLIGHT_OUTBOUND_ARRIVAL_AIRPORT,
      departureDate: vars.TRAVEL_DATE_OUTBOUND,
      returnDate: vars.TRAVEL_DATE_RETURN || '',
      totalPrice: vars.PRICING_TOTAL_PRICE,
      netPrice: vars.PRICING_NET_PRICE,
      markup: vars.PRICING_MARKUP,
      cabinClass: vars.FLIGHT_OUTBOUND_CLASS,
      fareType: vars.PRICING_FARE_TYPE,
      passengers: vars.PASSENGER_TOTAL_COUNT,
      flightDetails: generateFlightDetailsHTML(quotes?.[0]?.segments || []),
      savings: '500',
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
    };
  });

  // Generate flight details HTML from segments
  const generateFlightDetailsHTML = (segments: any[]) => {
    return segments.map((segment: any, index: number) => `
      <div style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin: 10px 0;">
        <div style="font-weight: bold; color: #1f2937; margin-bottom: 10px;">
          ${emailVariables.FLIGHT_OUTBOUND_AIRLINE} ${segment.flightNumber}
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div>
            <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Departure</div>
            <div style="font-weight: 500; color: #374151;">${segment.departureAirport} at ${emailVariables.FLIGHT_OUTBOUND_DEPARTURE_TIME}</div>
            <div style="font-size: 12px; color: #6b7280;">${emailVariables.TRAVEL_DATE_OUTBOUND}</div>
          </div>
          <div>
            <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Arrival</div>
            <div style="font-weight: 500; color: #374151;">${segment.arrivalAirport} at ${emailVariables.FLIGHT_OUTBOUND_ARRIVAL_TIME}</div>
            <div style="font-size: 12px; color: #6b7280;">${segment.arrivalDayOffset > 0 ? '+' + segment.arrivalDayOffset + ' day' : 'Same day'}</div>
          </div>
        </div>
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e5e7eb;">
          <span style="background: #eff6ff; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">
            ${emailVariables.FLIGHT_OUTBOUND_CLASS}
          </span>
        </div>
      </div>
    `).join('');
  };

  // Update variables when quotes change
  useEffect(() => {
    if (quotes && quotes.length > 0) {
      const newEmailVariables = EmailVariableParser.parseQuoteToVariables(quotes[0], clientName);
      setEmailVariables(newEmailVariables);
      
      // Update legacy variables
      setVariables({
        clientName: newEmailVariables.COMPANY_NAME || clientName || 'Valued Client',
        agentName: newEmailVariables.AGENT_NAME,
        agencyName: newEmailVariables.COMPANY_NAME,
        route: newEmailVariables.ROUTE_DESCRIPTION,
        departure: newEmailVariables.FLIGHT_OUTBOUND_DEPARTURE_AIRPORT,
        arrival: newEmailVariables.FLIGHT_OUTBOUND_ARRIVAL_AIRPORT,
        departureDate: newEmailVariables.TRAVEL_DATE_OUTBOUND,
        returnDate: newEmailVariables.TRAVEL_DATE_RETURN || '',
        totalPrice: newEmailVariables.PRICING_TOTAL_PRICE,
        netPrice: newEmailVariables.PRICING_NET_PRICE,
        markup: newEmailVariables.PRICING_MARKUP,
        cabinClass: newEmailVariables.FLIGHT_OUTBOUND_CLASS,
        fareType: newEmailVariables.PRICING_FARE_TYPE,
        passengers: newEmailVariables.PASSENGER_TOTAL_COUNT,
        flightDetails: generateFlightDetailsHTML(quotes[0]?.segments || []),
        savings: '500',
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
      });
    }
  }, [quotes, clientName]);

  const applyTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    let processedContent = template.content;
    let processedSubject = template.subject;

    // Replace variables in template - first try new EmailVariableParser variables, then legacy
    processedContent = EmailVariableParser.replaceVariablesInContent(processedContent, emailVariables);
    processedSubject = EmailVariableParser.replaceVariablesInContent(processedSubject, emailVariables);
    
    // Then replace legacy variables for backward compatibility
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      processedContent = processedContent.replace(new RegExp(placeholder, 'g'), value);
      processedSubject = processedSubject.replace(new RegExp(placeholder, 'g'), value);
    });

    setEmailData({
      ...emailData,
      subject: processedSubject,
      body: processedContent
    });
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'business': return 'bg-blue-100 text-blue-800';
      case 'premium': return 'bg-purple-100 text-purple-800';
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'comprehensive': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleVariableChange = (key: string, value: string) => {
    setVariables(prev => ({ ...prev, [key]: value }));
    
    // Re-apply template if one is selected
    if (selectedTemplate) {
      let processedContent = selectedTemplate.content;
      let processedSubject = selectedTemplate.subject;
      
      const updatedVariables = { ...variables, [key]: value };
      Object.entries(updatedVariables).forEach(([varKey, varValue]) => {
        const placeholder = `{${varKey}}`;
        processedContent = processedContent.replace(new RegExp(placeholder, 'g'), varValue);
        processedSubject = processedSubject.replace(new RegExp(placeholder, 'g'), varValue);
      });

      setEmailData(prev => ({
        ...prev,
        subject: processedSubject,
        body: processedContent
      }));
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="h-full flex flex-col space-y-6 overflow-hidden">
      <Tabs defaultValue="templates" className="w-full flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="compose" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Compose
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4 flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {EMAIL_TEMPLATES.map((template) => (
              <Card 
                key={template.id} 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedTemplate?.id === template.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => applyTemplate(template)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <template.icon className="h-4 w-4" />
                      {template.name}
                    </CardTitle>
                    <Badge className={getCategoryColor(template.category)}>
                      {template.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{template.preview}</p>
                  <p className="text-xs font-medium text-primary">
                    Subject: {template.subject.replace(/\{.*?\}/g, '...')}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedTemplate && (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Customize Template Variables
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedTemplate.variables.map((variable) => (
                  <div key={variable} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      {VARIABLE_SUGGESTIONS[variable as keyof typeof VARIABLE_SUGGESTIONS] || variable}
                    </Label>
                    <Input
                      value={variables[variable as keyof typeof variables] || ''}
                      onChange={(e) => handleVariableChange(variable, e.target.value)}
                      placeholder={`Enter ${variable}...`}
                      className="text-sm"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="compose" className="space-y-4 flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>To</Label>
              <Select value={emailData.to} onValueChange={(value) => setEmailData(prev => ({ ...prev, to: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select email address" />
                </SelectTrigger>
                <SelectContent>
                  {clientEmail && <SelectItem value={clientEmail}>{clientEmail}</SelectItem>}
                  {initialTo && initialTo !== clientEmail && (
                    <SelectItem value={initialTo}>{initialTo}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <div className="flex gap-2">
                <Input
                  value={emailData.subject}
                  onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Enter email subject..."
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(emailData.subject)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Email Content</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(emailData.body)}
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
            </div>
            <Textarea
              value={emailData.body}
              onChange={(e) => setEmailData(prev => ({ ...prev, body: e.target.value }))}
              rows={16}
              className="font-mono text-sm resize-none"
              placeholder="Compose your email content here..."
            />
          </div>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4 flex-1 overflow-y-auto">
          <Card>
            <CardHeader className="bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">From: Your Travel Agency</p>
                  <p className="text-sm text-muted-foreground">To: {emailData.to}</p>
                  <p className="text-sm text-muted-foreground">Subject: {emailData.subject}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Plane className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Travel Email</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Email Client Preview Wrapper */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                {/* Email Client Header */}
                <div className="bg-white border-b border-gray-200 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <div className="text-sm text-gray-600">Email Preview</div>
                  </div>
                </div>
                
                {/* Email Content Area */}
                <div className="bg-white">
                  {emailData.body.includes('<!DOCTYPE html>') ? (
                    // Render HTML templates
                    <div className="max-h-96 overflow-y-auto">
                      <iframe
                        srcDoc={emailData.body}
                        style={{ 
                          width: '100%', 
                          height: '600px', 
                          border: 'none',
                          backgroundColor: 'white'
                        }}
                        title="Email Preview"
                        sandbox="allow-same-origin"
                      />
                    </div>
                  ) : (
                    // Fallback for plain text emails
                    <div className="p-6">
                      <div 
                        className="whitespace-pre-wrap text-sm leading-relaxed"
                        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                      >
                        {emailData.body}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Separator className="flex-shrink-0" />

      <div className="flex gap-3 justify-end flex-shrink-0">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={() => onSend?.(emailData)}
          disabled={!emailData.to || !emailData.subject || !emailData.body}
          className="bg-primary hover:bg-primary/90"
        >
          <Send className="h-4 w-4 mr-2" />
          Send Email
        </Button>
      </div>
    </div>
  );
}