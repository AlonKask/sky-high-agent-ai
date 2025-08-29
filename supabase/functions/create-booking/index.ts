import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BookingRequest {
  quote_id: string;
  client_id: string;
  passengers: Array<{
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    nationality: string;
    passportNumber?: string;
    passportExpiry?: string;
  }>;
  contact_details: {
    email: string;
    phone: string;
    emergencyContact?: string;
    emergencyPhone?: string;
  };
  payment_details: {
    cardholderName: string;
    billingAddress: string;
    city: string;
    zipCode: string;
    country: string;
  };
  selected_protection: string;
  selected_flexible: string;
  final_price: number;
  protection_cost: number;
  flexible_cost: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    const bookingData: BookingRequest = await req.json();

    // Get quote details
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', bookingData.quote_id)
      .single();

    if (quoteError || !quote) {
      throw new Error('Quote not found');
    }

    // Get client details
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', bookingData.client_id)
      .single();

    if (clientError || !client) {
      throw new Error('Client not found');
    }

    // Generate booking reference
    const bookingRef = 'SBC' + Date.now().toString().slice(-8) + Math.random().toString(36).substr(2, 3).toUpperCase();

    // Extract departure and arrival dates from quote segments
    let departureDate = new Date();
    let arrivalDate = new Date();
    
    if (quote.segments && Array.isArray(quote.segments) && quote.segments.length > 0) {
      const firstSegment = quote.segments[0];
      const lastSegment = quote.segments[quote.segments.length - 1];
      
      if (firstSegment.departure_time) {
        departureDate = new Date(firstSegment.departure_time);
      }
      if (lastSegment.arrival_time) {
        arrivalDate = new Date(lastSegment.arrival_time);
      }
    }

    // Create booking record
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        user_id: quote.user_id,
        client_id: bookingData.client_id,
        request_id: quote.request_id,
        booking_reference: bookingRef,
        airline: quote.segments?.[0]?.airline || 'Multiple',
        flight_number: quote.segments?.[0]?.flight_number || '',
        route: quote.route,
        departure_date: departureDate.toISOString(),
        arrival_date: arrivalDate.toISOString(),
        passengers: bookingData.passengers.length,
        class: quote.fare_type || 'business',
        total_price: bookingData.final_price,
        status: 'confirmed',
        payment_status: 'manual',
        notes: JSON.stringify({
          passengers: bookingData.passengers,
          contact_details: bookingData.contact_details,
          payment_details: {
            cardholderName: bookingData.payment_details.cardholderName,
            billingAddress: bookingData.payment_details.billingAddress,
            city: bookingData.payment_details.city,
            zipCode: bookingData.payment_details.zipCode,
            country: bookingData.payment_details.country
          },
          protection: bookingData.selected_protection,
          protection_cost: bookingData.protection_cost,
          flexible: bookingData.selected_flexible,
          flexible_cost: bookingData.flexible_cost
        })
      })
      .select()
      .single();

    if (bookingError) {
      console.error('Booking creation error:', bookingError);
      throw new Error('Failed to create booking');
    }

    // Update option review status to 'booked'
    await supabase
      .from('option_reviews')
      .update({ review_status: 'booked' })
      .eq('quote_ids', `{${bookingData.quote_id}}`);

    // Send confirmation email to client
    const clientEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #333; margin: 0;">Booking Confirmed!</h1>
        </div>
        
        <div style="padding: 20px;">
          <p>Dear ${client.first_name} ${client.last_name},</p>
          
          <p>Thank you for your booking! Your flight reservation has been confirmed.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3 style="margin-top: 0;">Booking Details</h3>
            <p><strong>Booking Reference:</strong> ${bookingRef}</p>
            <p><strong>Route:</strong> ${quote.route}</p>
            <p><strong>Passengers:</strong> ${bookingData.passengers.length}</p>
            <p><strong>Total Amount:</strong> $${bookingData.final_price.toFixed(2)}</p>
          </div>
          
          <h3>Passenger Information</h3>
          ${bookingData.passengers.map(p => `
            <p><strong>${p.firstName} ${p.lastName}</strong><br>
            DOB: ${p.dateOfBirth} | Gender: ${p.gender} | Nationality: ${p.nationality}</p>
          `).join('')}
          
          <div style="background-color: #fff3cd; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #ffc107;">
            <h4 style="margin-top: 0;">Payment Processing</h4>
            <p>Your payment will be processed manually. Our team will contact you within 24 hours with payment instructions.</p>
          </div>
          
          <p>If you have any questions, please don't hesitate to contact us.</p>
          
          <p>Best regards,<br>Select Business Class Team</p>
        </div>
      </div>
    `;

    await resend.emails.send({
      from: 'Select Business Class <bookings@selectbusinessclass.com>',
      to: [client.email],
      subject: `Booking Confirmation - ${bookingRef}`,
      html: clientEmailHtml,
    });

    // Send notification email to agent
    const { data: agent } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', quote.user_id)
      .single();

    if (agent?.email) {
      const agentEmailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px;">
            <h1 style="color: #333; margin: 0;">New Booking Created</h1>
          </div>
          
          <div style="padding: 20px;">
            <p>A new booking has been created:</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p><strong>Booking Reference:</strong> ${bookingRef}</p>
              <p><strong>Client:</strong> ${client.first_name} ${client.last_name} (${client.email})</p>
              <p><strong>Route:</strong> ${quote.route}</p>
              <p><strong>Passengers:</strong> ${bookingData.passengers.length}</p>
              <p><strong>Total Amount:</strong> $${bookingData.final_price.toFixed(2)}</p>
              <p><strong>Status:</strong> Payment Pending (Manual Processing)</p>
            </div>
            
            <p>Please process the payment and issue tickets accordingly.</p>
            
            <p><a href="${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovable.app') || 'https://app.selectbusinessclass.com'}/bookings/${booking.id}" 
               style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
               View Booking Details
            </a></p>
          </div>
        </div>
      `;

      await resend.emails.send({
        from: 'SBC System <system@selectbusinessclass.com>',
        to: [agent.email],
        subject: `New Booking - ${bookingRef}`,
        html: agentEmailHtml,
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        booking_id: booking.id,
        booking_reference: bookingRef 
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        } 
      }
    );

  } catch (error: any) {
    console.error('Error creating booking:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to create booking' 
      }),
      { 
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        } 
      }
    );
  }
});