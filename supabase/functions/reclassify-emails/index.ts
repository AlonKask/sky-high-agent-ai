import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced Gmail folder classification helper (same as in unified-gmail-sync)
function classifyEmailByLabels(labelIds: string[], userEmail: string, fromHeader: string): { folder_name: string; direction: string } {
  const labels = labelIds || [];
  
  // Check for specific Gmail labels and classify accordingly
  if (labels.includes('SENT')) {
    return { folder_name: 'sent', direction: 'outbound' };
  }
  if (labels.includes('DRAFT')) {
    return { folder_name: 'drafts', direction: 'outbound' };
  }
  if (labels.includes('TRASH')) {
    return { folder_name: 'trash', direction: 'inbound' };
  }
  if (labels.includes('SPAM')) {
    return { folder_name: 'spam', direction: 'inbound' };
  }
  
  // Determine direction based on sender
  const isOutbound = fromHeader.toLowerCase().includes(userEmail.toLowerCase());
  const direction = isOutbound ? 'outbound' : 'inbound';
  
  // Default to inbox for most emails
  return { folder_name: 'inbox', direction };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log(`🔄 Email Reclassification: ${req.method} ${req.url}`);

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method === 'POST') {
      const { userId, userEmail, batchSize = 100 } = await req.json();
      
      if (!userId || !userEmail) {
        return Response.json(
          { success: false, error: 'userId and userEmail are required' },
          { status: 400, headers: corsHeaders }
        );
      }

      console.log(`🔄 Starting email reclassification for user: ${userEmail}`);

      // Get emails that need reclassification (missing folder_name or incorrectly classified)
      const { data: emails, error: fetchError } = await supabaseClient
        .from('email_exchanges')
        .select('id, message_id, sender_email, metadata, direction, folder_name')
        .eq('user_id', userId)
        .or('folder_name.is.null,folder_name.eq.inbox,direction.eq.inbound')
        .limit(batchSize);

      if (fetchError) {
        console.error('❌ Failed to fetch emails for reclassification:', fetchError);
        return Response.json(
          { success: false, error: fetchError.message },
          { status: 500, headers: corsHeaders }
        );
      }

      console.log(`📧 Found ${emails?.length || 0} emails to reclassify`);

      if (!emails || emails.length === 0) {
        return Response.json(
          { success: true, message: 'No emails need reclassification', processed: 0 },
          { headers: corsHeaders }
        );
      }

      const updates = [];
      let reclassifiedCount = 0;

      for (const email of emails) {
        try {
          const gmailLabels = email.metadata?.gmail_labels || [];
          const fromHeader = email.sender_email || '';
          
          // Reclassify using the same logic as the sync function
          const { folder_name, direction } = classifyEmailByLabels(gmailLabels, userEmail, fromHeader);
          
          // Only update if classification changed
          if (email.folder_name !== folder_name || email.direction !== direction) {
            updates.push({
              id: email.id,
              folder_name,
              direction,
              updated_at: new Date().toISOString()
            });
            reclassifiedCount++;
          }
        } catch (error) {
          console.warn(`⚠️ Failed to reclassify email ${email.id}:`, error);
        }
      }

      console.log(`🔄 Reclassifying ${updates.length} emails`);

      // Batch update emails
      if (updates.length > 0) {
        const { error: updateError } = await supabaseClient
          .from('email_exchanges')
          .upsert(updates);

        if (updateError) {
          console.error('❌ Failed to update email classifications:', updateError);
          return Response.json(
            { success: false, error: updateError.message },
            { status: 500, headers: corsHeaders }
          );
        }
      }

      // Update folder counts in sync status
      const folderCounts = updates.reduce((acc, update) => {
        acc[update.folder_name] = (acc[update.folder_name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      try {
        for (const [folderName, count] of Object.entries(folderCounts)) {
          await supabaseClient
            .from('email_sync_status')
            .upsert({
              user_id: userId,
              folder_name: folderName,
              last_sync_at: new Date().toISOString(),
              last_sync_count: count
            });
        }
      } catch (statusError) {
        console.warn('⚠️ Failed to update sync status after reclassification:', statusError);
      }

      console.log(`✅ Successfully reclassified ${reclassifiedCount} emails`);

      return Response.json({
        success: true,
        message: `Successfully reclassified ${reclassifiedCount} emails`,
        processed: reclassifiedCount,
        total_checked: emails.length,
        folder_distribution: folderCounts
      }, { headers: corsHeaders });
    }

    return Response.json(
      { success: false, error: 'Method not allowed' },
      { status: 405, headers: corsHeaders }
    );

  } catch (error) {
    console.error('❌ Email reclassification service error:', error);
    return Response.json(
      { success: false, error: 'Service temporarily unavailable' },
      { status: 500, headers: corsHeaders }
    );
  }
});