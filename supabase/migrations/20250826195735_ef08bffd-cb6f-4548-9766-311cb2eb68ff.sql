-- Fix: Use first available user ID or create system templates with proper user assignment
-- First, get the first user ID to use as template owner, or create system templates accessible to all

WITH first_user AS (
  SELECT id FROM auth.users LIMIT 1
),
system_user_id AS (
  SELECT COALESCE((SELECT id FROM first_user), gen_random_uuid()) as id
)
INSERT INTO public.email_templates (user_id, name, subject, body, email_type, is_active, usage_count) 
SELECT 
  (SELECT id FROM system_user_id),
  template_name,
  template_subject,
  template_body,
  template_type,
  true,
  0
FROM (VALUES
  ('Professional Quote Follow-up', 
   'Your Business Class Travel Quote - {{ROUTE}} | Select Business Class',
   E'Dear {{CLIENT_NAME}},\n\nI hope this message finds you well. I wanted to personally follow up on the business class travel quote I prepared for your upcoming journey.\n\n**Your Quote Summary:**\nRoute: {{ROUTE}}\nTravel Dates: {{DEPARTURE_DATE}} - {{RETURN_DATE}}\nPassengers: {{PASSENGER_COUNT}}\nQuoted Price: {{TOTAL_PRICE}}\n\nThis exclusive rate is available for a limited time and includes:\n✈️ Premium business class seating\n🛡️ Full flexibility for changes\n🎯 24/7 dedicated support\n💼 Priority check-in & boarding\n\nI\'d be delighted to secure this exceptional rate for you. Simply reply to confirm or call me directly at {{AGENT_PHONE}}.\n\nBest regards,\n{{AGENT_NAME}}\nSelect Business Class\n{{AGENT_EMAIL}}',
   'follow_up'),
   
  ('Booking Confirmation - Premium',
   'CONFIRMED: Your Business Class Journey | Booking {{BOOKING_REF}}',
   E'Dear {{CLIENT_NAME}},\n\n🎉 Congratulations! Your business class reservation has been successfully confirmed.\n\n**BOOKING CONFIRMATION**\nBooking Reference: {{BOOKING_REF}}\nPNR: {{PNR}}\n\n**FLIGHT DETAILS**\n{{FLIGHT_DETAILS}}\n\n**IMPORTANT NOTES**\n• E-tickets will be issued 24-48 hours prior to departure\n• Please arrive at airport 3 hours before international flights\n• Lounge access included with your business class ticket\n• Seat selection available via airline website using your PNR\n\n**NEXT STEPS**\n1. Save this confirmation email\n2. Check passport validity (6+ months remaining)\n3. Review visa requirements if applicable\n4. Complete online check-in 24 hours prior\n\nShould you need any assistance, I\'m here to help.\n\nSafe travels!\n\n{{AGENT_NAME}}\nSelect Business Class\nDirect: {{AGENT_PHONE}} | {{AGENT_EMAIL}}',
   'confirmation'),
   
  ('New Client Welcome',
   'Welcome to Select Business Class - Your Premium Travel Partner',
   E'Dear {{CLIENT_NAME}},\n\nWelcome to Select Business Class! I\'m thrilled to be your dedicated travel consultant.\n\n**About Our Service**\nAt Select Business Class, we specialize in premium business class travel, offering:\n• Exclusive industry rates and upgrades\n• Personalized service from experienced consultants\n• 24/7 support throughout your journey\n• Flexible booking options with full ATOL protection\n\n**Your Dedicated Consultant**\n{{AGENT_NAME}}\nDirect: {{AGENT_PHONE}}\nEmail: {{AGENT_EMAIL}}\n\nI\'m here to understand your travel preferences and ensure every journey exceeds your expectations. Whether you\'re planning a business trip, family vacation, or special celebration, I\'ll take care of every detail.\n\n**Getting Started**\nI\'d love to learn about your upcoming travel plans. Simply reply to this email or call me directly to discuss your requirements.\n\nLooking forward to creating exceptional travel experiences for you!\n\nWarm regards,\n\n{{AGENT_NAME}}\nSelect Business Class',
   'general'),
   
  ('Quote Comparison - Premium Options',
   'Your Business Class Options: {{ROUTE}} | Multiple Airlines Available', 
   E'Dear {{CLIENT_NAME}},\n\nI\'ve carefully researched multiple options for your business class journey and found some exceptional choices.\n\n**YOUR TRAVEL REQUIREMENTS**\nRoute: {{ROUTE}}\nDeparture: {{DEPARTURE_DATE}}\nReturn: {{RETURN_DATE}}\nPassengers: {{PASSENGER_COUNT}}\n\n**RECOMMENDED OPTIONS**\n\n**Option 1: {{AIRLINE_1}}** - {{PRICE_1}}\n✈️ {{FLIGHT_DETAILS_1}}\n⭐ {{HIGHLIGHTS_1}}\n\n**Option 2: {{AIRLINE_2}}** - {{PRICE_2}}\n✈️ {{FLIGHT_DETAILS_2}}\n⭐ {{HIGHLIGHTS_2}}\n\n**Option 3: {{AIRLINE_3}}** - {{PRICE_3}}\n✈️ {{FLIGHT_DETAILS_3}}\n⭐ {{HIGHLIGHTS_3}}\n\n**MY RECOMMENDATION**\nBased on your preferences, I recommend {{RECOMMENDED_OPTION}} because {{RECOMMENDATION_REASON}}.\n\nAll prices include:\n• Full service business class\n• Lounge access\n• Priority services\n• Flexible change options\n• 24/7 support\n\nReady to secure your preferred option? These rates are subject to availability and may change.\n\nBest regards,\n\n{{AGENT_NAME}}\nSelect Business Class\n{{AGENT_PHONE}} | {{AGENT_EMAIL}}',
   'quote'),
   
  ('Urgent Booking Update',
   'URGENT: Important Update for Your Booking {{BOOKING_REF}}',
   E'Dear {{CLIENT_NAME}},\n\nI need to inform you of an important update regarding your upcoming travel booking.\n\n**Booking Reference:** {{BOOKING_REF}}\n**Original Flight:** {{ORIGINAL_FLIGHT}}\n**Updated Status:** {{UPDATE_REASON}}\n\n**IMMEDIATE ACTION REQUIRED:**\n{{ACTION_REQUIRED}}\n\n**Your Options:**\n{{AVAILABLE_OPTIONS}}\n\n**What Happens Next:**\nI\'m actively working to minimize any disruption to your travel plans. I will:\n1. Monitor the situation continuously\n2. Secure the best alternative options\n3. Keep you updated every step of the way\n4. Handle all rebooking at no additional cost\n\nPlease call me immediately at {{AGENT_PHONE}} or reply to this email. I\'m available 24/7 to assist you.\n\nRest assured, I\'ll resolve this swiftly and ensure your travel experience remains seamless.\n\nUrgent regards,\n\n{{AGENT_NAME}}\nSelect Business Class\nEmergency Line: {{AGENT_PHONE}}',
   'booking_update')
) AS templates(template_name, template_subject, template_body, template_type);