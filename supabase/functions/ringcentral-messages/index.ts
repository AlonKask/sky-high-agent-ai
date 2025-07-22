import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RingCentralConfig {
  clientId: string;
  clientSecret: string;
  jwtToken: string;
  server: string;
}

interface SendMessageRequest {
  to: string;
  text: string;
  from?: string;
}

interface Message {
  id: string;
  direction: string;
  from: { phoneNumber: string; name?: string };
  to: [{ phoneNumber: string; name?: string }];
  subject: string;
  creationTime: string;
  readStatus: string;
  conversationId: string;
  type: string;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

class RingCentralAPI {
  private config: RingCentralConfig;
  private accessToken: string | null = null;

  constructor() {
    this.config = {
      clientId: Deno.env.get("RINGCENTRAL_CLIENT_ID")!,
      clientSecret: Deno.env.get("RINGCENTRAL_CLIENT_SECRET")!,
      jwtToken: Deno.env.get("RINGCENTRAL_JWT_TOKEN")!,
      server: "https://platform.ringcentral.com", // Production server
    };
  }

  async authenticate(): Promise<void> {
    const response = await fetch(`${this.config.server}/restapi/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${this.config.clientId}:${this.config.clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: this.config.jwtToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Authentication failed: ${error}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    console.log("RingCentral authentication successful");
  }

  async sendMessage(request: SendMessageRequest): Promise<any> {
    if (!this.accessToken) {
      await this.authenticate();
    }

    const messageData = {
      from: { phoneNumber: request.from || "+1XXXXXXXXXX" }, // Default from number
      to: [{ phoneNumber: request.to }],
      text: request.text,
    };

    const response = await fetch(
      `${this.config.server}/restapi/v1.0/account/~/extension/~/sms`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify(messageData),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Send message failed: ${error}`);
    }

    return await response.json();
  }

  async getMessages(dateFrom?: string): Promise<Message[]> {
    if (!this.accessToken) {
      await this.authenticate();
    }

    const params = new URLSearchParams({
      messageType: "SMS",
      readStatus: "All",
      perPage: "100",
    });

    if (dateFrom) {
      params.append("dateFrom", dateFrom);
    }

    const response = await fetch(
      `${this.config.server}/restapi/v1.0/account/~/extension/~/message-store?${params}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Get messages failed: ${error}`);
    }

    const data = await response.json();
    return data.records || [];
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();
    const api = new RingCentralAPI();

    // Get user from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    switch (action) {
      case "send": {
        const { to, text, from } = params;
        console.log(`Sending message to ${to}: ${text}`);
        
        const result = await api.sendMessage({ to, text, from });
        
        // Store in database
        await supabase.from("messages").insert({
          user_id: user.id,
          message_id: result.id?.toString(),
          direction: "outbound",
          phone_number: to,
          content: text,
          message_type: "SMS",
          status: "sent",
          conversation_id: result.conversationId,
          metadata: result,
        });

        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      case "sync": {
        console.log("Syncing messages from RingCentral");
        
        // Get last sync time from database
        const { data: lastSync } = await supabase
          .from("messages")
          .select("created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);

        const dateFrom = lastSync?.[0]?.created_at || 
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // Last 7 days

        const messages = await api.getMessages(dateFrom);
        console.log(`Found ${messages.length} messages to sync`);

        // Store messages in database
        for (const message of messages) {
          const phoneNumber = message.direction === "Inbound" 
            ? message.from.phoneNumber 
            : message.to[0].phoneNumber;

          await supabase.from("messages").upsert({
            user_id: user.id,
            message_id: message.id,
            direction: message.direction.toLowerCase(),
            phone_number: phoneNumber,
            contact_name: message.direction === "Inbound" 
              ? message.from.name 
              : message.to[0].name,
            content: message.subject,
            message_type: message.type,
            status: "received",
            read_status: message.readStatus === "Read",
            conversation_id: message.conversationId,
            metadata: message,
            created_at: message.creationTime,
          }, {
            onConflict: "message_id",
            ignoreDuplicates: true,
          });
        }

        return new Response(JSON.stringify({ synced: messages.length }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      case "getConversations": {
        console.log("Getting conversations from database");
        
        const { data: conversations, error } = await supabase
          .from("messages")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Group by phone number/conversation
        const groupedConversations = conversations.reduce((acc: any, message: any) => {
          const key = message.phone_number;
          if (!acc[key]) {
            acc[key] = {
              phone_number: key,
              contact_name: message.contact_name || key,
              messages: [],
              last_message: null,
              unread_count: 0,
            };
          }
          
          acc[key].messages.push(message);
          if (!acc[key].last_message || new Date(message.created_at) > new Date(acc[key].last_message.created_at)) {
            acc[key].last_message = message;
          }
          
          if (!message.read_status && message.direction === "inbound") {
            acc[key].unread_count++;
          }
          
          return acc;
        }, {});

        return new Response(JSON.stringify(Object.values(groupedConversations)), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      case "markAsRead": {
        const { messageIds } = params;
        console.log(`Marking messages as read: ${messageIds}`);
        
        const { error } = await supabase
          .from("messages")
          .update({ read_status: true })
          .eq("user_id", user.id)
          .in("id", messageIds);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: any) {
    console.error("Error in RingCentral function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);