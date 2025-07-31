import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log(`🔄 Demo Email Sync Request: ${req.method} ${req.url}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }
    
    const payload = JSON.parse(atob(parts[1]));
    const userId = payload.sub;
    
    if (!userId) {
      throw new Error('No user ID in token');
    }

    const body = await req.json();
    const { userEmail } = body;

    console.log(`🔄 Starting demo sync for user: ${userEmail}`);

    // Create some demo emails to simulate Gmail sync
    const demoEmails = [
      {
        message_id: `demo-${Date.now()}-1`,
        user_id: userId,
        subject: 'Welcome to our travel service!',
        sender_email: 'welcome@travelservice.com',
        recipient_emails: [userEmail],
        cc_emails: [],
        bcc_emails: [],
        body: '<h1>Welcome!</h1><p>Thank you for choosing our premium travel service. We are excited to help you plan your next business class adventure.</p>',
        direction: 'inbound',
        email_type: 'welcome',
        status: 'delivered',
        received_at: new Date().toISOString(),
        metadata: {
          isRead: false,
          priority: 'normal',
          gmail_labels: ['INBOX'],
          demo: true
        },
        attachments: []
      },
      {
        message_id: `demo-${Date.now()}-2`,
        user_id: userId,
        subject: 'Flight Quote Request - London to Tokyo',
        sender_email: 'client@businesstravel.com',
        recipient_emails: [userEmail],
        cc_emails: [],
        bcc_emails: [],
        body: '<p>Hello,</p><p>I would like to request a quote for business class flights from London to Tokyo for next month. Please include options for:</p><ul><li>Flexible dates</li><li>Premium airlines</li><li>Direct flights preferred</li></ul><p>Thank you!</p>',
        direction: 'inbound',
        email_type: 'quote_request',
        status: 'delivered',
        received_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        metadata: {
          isRead: false,
          priority: 'high',
          gmail_labels: ['INBOX'],
          demo: true
        },
        attachments: []
      },
      {
        message_id: `demo-${Date.now()}-3`,
        user_id: userId,
        subject: 'Re: Flight Quote Request - London to Tokyo',
        sender_email: userEmail,
        recipient_emails: ['client@businesstravel.com'],
        cc_emails: [],
        bcc_emails: [],
        body: '<p>Dear Client,</p><p>Thank you for your inquiry. I have found excellent business class options for your London to Tokyo trip:</p><p><strong>Option 1:</strong> British Airways - Direct flight<br/>Departure: 11:00 AM<br/>Price: £3,200</p><p><strong>Option 2:</strong> Japan Airlines - Direct flight<br/>Departure: 1:00 PM<br/>Price: £2,950</p><p>Both options include full flexibility and premium service. Would you like me to hold one of these for you?</p><p>Best regards</p>',
        direction: 'outbound',
        email_type: 'quote_response',
        status: 'sent',
        received_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
        metadata: {
          isRead: true,
          priority: 'normal',
          gmail_labels: ['SENT'],
          demo: true
        },
        attachments: []
      }
    ];

    let stored = 0;
    const errors = [];

    // Insert demo emails into database
    for (const email of demoEmails) {
      try {
        // Check if email already exists
        const { data: existing } = await supabaseClient
          .from('email_exchanges')
          .select('id')
          .eq('message_id', email.message_id)
          .eq('user_id', userId)
          .single();

        if (!existing) {
          const { error } = await supabaseClient
            .from('email_exchanges')
            .insert(email);

          if (error) {
            console.error(`Error inserting demo email:`, error);
            errors.push(error.message);
          } else {
            stored++;
            console.log(`✅ Stored demo email: ${email.subject}`);
          }
        } else {
          console.log(`📧 Demo email already exists: ${email.subject}`);
        }
      } catch (error) {
        console.error(`Error processing demo email:`, error);
        errors.push(error.message);
      }
    }

    // Update sync status
    try {
      await supabaseClient
        .from('email_sync_status')
        .upsert({
          user_id: userId,
          folder_name: 'inbox',
          last_sync_at: new Date().toISOString(),
          last_sync_count: stored,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,folder_name'
        });
    } catch (error) {
      console.error('Error updating sync status:', error);
    }

    console.log(`✅ Demo sync completed: ${stored} emails stored, ${errors.length} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        stored,
        errors: errors.length > 0 ? errors : undefined,
        message: `Demo sync completed - ${stored} emails added`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Demo sync error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});