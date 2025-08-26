-- Populate email_templates with professional default templates for SBC CRM
-- These templates cover key business scenarios with variable placeholders

INSERT INTO public.email_templates (user_id, name, subject, body, email_type, is_active, usage_count) VALUES
-- Use a system user ID (we'll use the first admin user or a default UUID)
(
  '00000000-0000-0000-0000-000000000000'::uuid,
  'Professional Quote Follow-up',
  'Your Business Class Travel Quote - {{ROUTE}} | Select Business Class',
  'Dear {{CLIENT_NAME}},

I hope this message finds you well. I wanted to personally follow up on the business class travel quote I prepared for your upcoming journey.

**Your Quote Summary:**
Route: {{ROUTE}}
Travel Dates: {{DEPARTURE_DATE}} - {{RETURN_DATE}}
Passengers: {{PASSENGER_COUNT}}
Quoted Price: {{TOTAL_PRICE}}

This exclusive rate is available for a limited time and includes:
✈️ Premium business class seating
🛡️ Full flexibility for changes
🎯 24/7 dedicated support
💼 Priority check-in & boarding

I''d be delighted to secure this exceptional rate for you. Simply reply to confirm or call me directly at {{AGENT_PHONE}}.

Best regards,
{{AGENT_NAME}}
Select Business Class
{{AGENT_EMAIL}}',
  'follow_up',
  true,
  0
),

(
  '00000000-0000-0000-0000-000000000000'::uuid,
  'Booking Confirmation - Premium',
  'CONFIRMED: Your Business Class Journey | Booking {{BOOKING_REF}}',
  'Dear {{CLIENT_NAME}},

🎉 Congratulations! Your business class reservation has been successfully confirmed.

**BOOKING CONFIRMATION**
Booking Reference: {{BOOKING_REF}}
PNR: {{PNR}}

**FLIGHT DETAILS**
{{FLIGHT_DETAILS}}

**IMPORTANT NOTES**
• E-tickets will be issued 24-48 hours prior to departure
• Please arrive at airport 3 hours before international flights
• Lounge access included with your business class ticket
• Seat selection available via airline website using your PNR

**NEXT STEPS**
1. Save this confirmation email
2. Check passport validity (6+ months remaining)
3. Review visa requirements if applicable
4. Complete online check-in 24 hours prior

Should you need any assistance, I''m here to help.

Safe travels!

{{AGENT_NAME}}
Select Business Class
Direct: {{AGENT_PHONE}} | {{AGENT_EMAIL}}',
  'confirmation',
  true,
  0
),

(
  '00000000-0000-0000-0000-000000000000'::uuid,
  'New Client Welcome',
  'Welcome to Select Business Class - Your Premium Travel Partner',
  'Dear {{CLIENT_NAME}},

Welcome to Select Business Class! I''m thrilled to be your dedicated travel consultant.

**About Our Service**
At Select Business Class, we specialize in premium business class travel, offering:
• Exclusive industry rates and upgrades
• Personalized service from experienced consultants  
• 24/7 support throughout your journey
• Flexible booking options with full ATOL protection

**Your Dedicated Consultant**
{{AGENT_NAME}}
Direct: {{AGENT_PHONE}}
Email: {{AGENT_EMAIL}}

I''m here to understand your travel preferences and ensure every journey exceeds your expectations. Whether you''re planning a business trip, family vacation, or special celebration, I''ll take care of every detail.

**Getting Started**
I''d love to learn about your upcoming travel plans. Simply reply to this email or call me directly to discuss your requirements.

Looking forward to creating exceptional travel experiences for you!

Warm regards,

{{AGENT_NAME}}
Select Business Class',
  'general',
  true,
  0
),

(
  '00000000-0000-0000-0000-000000000000'::uuid,
  'Urgent Booking Update',
  'URGENT: Important Update for Your Booking {{BOOKING_REF}}',
  'Dear {{CLIENT_NAME}},

I need to inform you of an important update regarding your upcoming travel booking.

**Booking Reference:** {{BOOKING_REF}}
**Original Flight:** {{ORIGINAL_FLIGHT}}
**Updated Status:** {{UPDATE_REASON}}

**IMMEDIATE ACTION REQUIRED:**
{{ACTION_REQUIRED}}

**Your Options:**
{{AVAILABLE_OPTIONS}}

**What Happens Next:**
I''m actively working to minimize any disruption to your travel plans. I will:
1. Monitor the situation continuously
2. Secure the best alternative options
3. Keep you updated every step of the way
4. Handle all rebooking at no additional cost

Please call me immediately at {{AGENT_PHONE}} or reply to this email. I''m available 24/7 to assist you.

Rest assured, I''ll resolve this swiftly and ensure your travel experience remains seamless.

Urgent regards,

{{AGENT_NAME}}
Select Business Class
Emergency Line: {{AGENT_PHONE}}',
  'booking_update',
  true,
  0
),

(
  '00000000-0000-0000-0000-000000000000'::uuid,
  'Quote Comparison - Premium Options',
  'Your Business Class Options: {{ROUTE}} | Multiple Airlines Available',
  'Dear {{CLIENT_NAME}},

I''ve carefully researched multiple options for your business class journey and found some exceptional choices.

**YOUR TRAVEL REQUIREMENTS**
Route: {{ROUTE}}
Departure: {{DEPARTURE_DATE}}
Return: {{RETURN_DATE}}
Passengers: {{PASSENGER_COUNT}}

**RECOMMENDED OPTIONS**

**Option 1: {{AIRLINE_1}}** - {{PRICE_1}}
✈️ {{FLIGHT_DETAILS_1}}
⭐ {{HIGHLIGHTS_1}}

**Option 2: {{AIRLINE_2}}** - {{PRICE_2}}
✈️ {{FLIGHT_DETAILS_2}}  
⭐ {{HIGHLIGHTS_2}}

**Option 3: {{AIRLINE_3}}** - {{PRICE_3}}
✈️ {{FLIGHT_DETAILS_3}}
⭐ {{HIGHLIGHTS_3}}

**MY RECOMMENDATION**
Based on your preferences, I recommend {{RECOMMENDED_OPTION}} because {{RECOMMENDATION_REASON}}.

All prices include:
• Full service business class
• Lounge access
• Priority services
• Flexible change options
• 24/7 support

Ready to secure your preferred option? These rates are subject to availability and may change.

Best regards,

{{AGENT_NAME}}
Select Business Class
{{AGENT_PHONE}} | {{AGENT_EMAIL}}',
  'quote',
  true,
  0
),

(
  '00000000-0000-0000-0000-000000000000'::uuid,
  'Post-Travel Thank You',
  'Thank You - How Was Your Business Class Experience?',
  'Dear {{CLIENT_NAME}},

I hope you''ve returned safely from your recent business class journey to {{DESTINATION}} and that everything exceeded your expectations!

**Your Recent Trip**
Booking: {{BOOKING_REF}}
Travel Dates: {{TRAVEL_DATES}}
Airlines: {{AIRLINES}}

I''d love to hear about your experience:
• How was the service onboard?
• Did everything go smoothly with check-in and transfers?
• Any feedback for future bookings?

**Your Next Journey**
Already planning your next trip? I''m here to help! Many of my clients book their next adventure while the travel excitement is still fresh.

**Exclusive Offers**
As a valued client, you have access to:
• Priority booking for flash sales
• Exclusive upgrade opportunities  
• Personalized travel recommendations
• Loyalty program management

Thank you for choosing Select Business Class. I look forward to planning your next extraordinary journey!

Warm regards,

{{AGENT_NAME}}
Your Personal Travel Consultant
{{AGENT_PHONE}} | {{AGENT_EMAIL}}

P.S. If you were delighted with your experience, I''d be honored if you could share a review or refer friends who appreciate premium travel.',
  'follow_up',
  true,
  0
);

-- Create system-wide templates (available to all users)
-- Update templates to be available system-wide by setting user_id to NULL where appropriate
UPDATE public.email_templates 
SET user_id = NULL 
WHERE user_id = '00000000-0000-0000-0000-000000000000'::uuid;