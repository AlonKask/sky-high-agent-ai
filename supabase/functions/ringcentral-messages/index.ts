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

interface RingCentralMessage {
  id: string;
  uri: string;
  direction: string;
  type: string;
  from: { phoneNumber: string; name?: string };
  to: Array<{ phoneNumber: string; name?: string }>;
  subject: string;
  creationTime: string;
  readStatus: string;
  conversationId: string;
  lastModifiedTime: string;
}

interface RingCentralCall {
  id: string;
  direction: string;
  from: { phoneNumber: string; name?: string };
  to: { phoneNumber: string; name?: string };
  startTime: string;
  duration: number;
  result: string;
  telephonyStatus: string;
  type: string;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

class RingCentralAPI {
  private config: RingCentralConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.config = {
      clientId: Deno.env.get("RINGCENTRAL_CLIENT_ID")!,
      clientSecret: Deno.env.get("RINGCENTRAL_CLIENT_SECRET")!,
      jwtToken: Deno.env.get("RINGCENTRAL_JWT_TOKEN")!,
      server: "https://platform.ringcentral.com", // Production server
    };

    console.log("RingCentral config initialized:", {
      clientId: this.config.clientId ? "✓" : "✗",
      clientSecret: this.config.clientSecret ? "✓" : "✗",
      jwtToken: this.config.jwtToken ? "✓" : "✗",
    });
  }

  async authenticate(): Promise<void> {
    console.log("Attempting RingCentral authentication...");
    
    try {
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

      const responseText = await response.text();
      console.log("Auth response status:", response.status);
      console.log("Auth response:", responseText.substring(0, 200));

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status} - ${responseText}`);
      }

      const data = JSON.parse(responseText);
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000);
      console.log("RingCentral authentication successful, token expires in:", data.expires_in, "seconds");
    } catch (error) {
      console.error("Authentication error:", error);
      throw error;
    }
  }

  async ensureAuth(): Promise<void> {
    if (!this.accessToken || Date.now() >= this.tokenExpiry - 60000) {
      await this.authenticate();
    }
  }

  async sendMessage(request: SendMessageRequest): Promise<any> {
    await this.ensureAuth();

    const messageData = {
      from: { phoneNumber: request.from || "+1XXXXXXXXXX" }, // Default from number
      to: [{ phoneNumber: request.to }],
      text: request.text,
    };

    console.log("Sending message:", messageData);

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

    const responseText = await response.text();
    console.log("Send message response:", response.status, responseText.substring(0, 200));

    if (!response.ok) {
      throw new Error(`Send message failed: ${response.status} - ${responseText}`);
    }

    return JSON.parse(responseText);
  }

  async getMessages(dateFrom?: string, dateTo?: string, perPage: number = 1000): Promise<RingCentralMessage[]> {
    await this.ensureAuth();

    const params = new URLSearchParams({
      messageType: ["SMS", "MMS"],
      readStatus: "All",
      perPage: perPage.toString(),
    });

    if (dateFrom) {
      params.append("dateFrom", dateFrom);
    }
    if (dateTo) {
      params.append("dateTo", dateTo);
    }

    console.log("Fetching messages with params:", params.toString());

    const response = await fetch(
      `${this.config.server}/restapi/v1.0/account/~/extension/~/message-store?${params}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    const responseText = await response.text();
    console.log("Get messages response:", response.status, responseText.substring(0, 200));

    if (!response.ok) {
      throw new Error(`Get messages failed: ${response.status} - ${responseText}`);
    }

    const data = JSON.parse(responseText);
    console.log("Retrieved", data.records?.length || 0, "messages");
    return data.records || [];
  }

  async getCallLog(dateFrom?: string, dateTo?: string, perPage: number = 1000): Promise<RingCentralCall[]> {
    await this.ensureAuth();

    const params = new URLSearchParams({
      type: "Voice",
      perPage: perPage.toString(),
    });

    if (dateFrom) {
      params.append("dateFrom", dateFrom);
    }
    if (dateTo) {
      params.append("dateTo", dateTo);
    }

    console.log("Fetching call log with params:", params.toString());

    const response = await fetch(
      `${this.config.server}/restapi/v1.0/account/~/extension/~/call-log?${params}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    const responseText = await response.text();
    console.log("Get call log response:", response.status, responseText.substring(0, 200));

    if (!response.ok) {
      throw new Error(`Get call log failed: ${response.status} - ${responseText}`);
    }

    const data = JSON.parse(responseText);
    console.log("Retrieved", data.records?.length || 0, "call records");
    return data.records || [];
  }
}

const handler = async (req: Request): Promise<Response> => {
  console.log("RingCentral function called with method:", req.method);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.text();
    console.log("Request body:", requestBody);
    
    const { action, ...params } = JSON.parse(requestBody);
    console.log("Action:", action, "Params:", params);
    
    const api = new RingCentralAPI();

    // Get user from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      throw new Error("Unauthorized");
    }

    console.log("User authenticated:", user.id);

    switch (action) {
      case "send": {
        const { to, text, from } = params;
        console.log(`Sending message to ${to}: ${text}`);
        
        const result = await api.sendMessage({ to, text, from });
        
        // Store in database
        const { error: insertError } = await supabase.from("messages").insert({
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

        if (insertError) {
          console.error("Error storing message:", insertError);
        }

        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      case "syncMessages": {
        console.log("Syncing messages from RingCentral");
        
        // Get last sync time from database
        const { data: lastSync } = await supabase
          .from("messages")
          .select("created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);

        const dateFrom = lastSync?.[0]?.created_at || 
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // Last 30 days

        const messages = await api.getMessages(dateFrom);
        console.log(`Found ${messages.length} messages to sync`);

        let syncedCount = 0;
        
        // Store messages in database
        for (const message of messages) {
          try {
            const phoneNumber = message.direction === "Inbound" 
              ? message.from.phoneNumber 
              : message.to[0]?.phoneNumber;

            if (!phoneNumber) continue;

            const { error } = await supabase.from("messages").upsert({
              user_id: user.id,
              message_id: message.id,
              direction: message.direction.toLowerCase(),
              phone_number: phoneNumber,
              contact_name: message.direction === "Inbound" 
                ? message.from.name 
                : message.to[0]?.name,
              content: message.subject,
              message_type: message.type,
              status: "received",
              read_status: message.readStatus === "Read",
              conversation_id: message.conversationId,
              metadata: message,
              created_at: message.creationTime,
              updated_at: message.lastModifiedTime,
            }, {
              onConflict: "message_id",
              ignoreDuplicates: false,
            });

            if (!error) {
              syncedCount++;
            } else {
              console.error("Error syncing message:", message.id, error);
            }
          } catch (error) {
            console.error("Error processing message:", message.id, error);
          }
        }

        console.log(`Successfully synced ${syncedCount} messages`);

        return new Response(JSON.stringify({ synced: syncedCount, total: messages.length }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      case "syncCalls": {
        console.log("Syncing call log from RingCentral");
        
        // Get last sync time for calls
        const { data: lastCallSync } = await supabase
          .from("messages")
          .select("created_at")
          .eq("user_id", user.id)
          .eq("message_type", "Call")
          .order("created_at", { ascending: false })
          .limit(1);

        const dateFrom = lastCallSync?.[0]?.created_at || 
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // Last 30 days

        const calls = await api.getCallLog(dateFrom);
        console.log(`Found ${calls.length} calls to sync`);

        let syncedCount = 0;
        
        // Store calls in database as messages
        for (const call of calls) {
          try {
            const phoneNumber = call.direction === "Inbound" 
              ? call.from.phoneNumber 
              : call.to.phoneNumber;

            if (!phoneNumber) continue;

            const callContent = `${call.direction} call - ${call.result} (${Math.floor(call.duration / 60)}:${(call.duration % 60).toString().padStart(2, '0')})`;

            const { error } = await supabase.from("messages").upsert({
              user_id: user.id,
              message_id: call.id,
              direction: call.direction.toLowerCase(),
              phone_number: phoneNumber,
              contact_name: call.direction === "Inbound" 
                ? call.from.name 
                : call.to.name,
              content: callContent,
              message_type: "Call",
              status: call.result.toLowerCase(),
              read_status: true,
              conversation_id: `call_${call.id}`,
              metadata: call,
              created_at: call.startTime,
            }, {
              onConflict: "message_id",
              ignoreDuplicates: false,
            });

            if (!error) {
              syncedCount++;
            } else {
              console.error("Error syncing call:", call.id, error);
            }
          } catch (error) {
            console.error("Error processing call:", call.id, error);
          }
        }

        console.log(`Successfully synced ${syncedCount} calls`);

        return new Response(JSON.stringify({ synced: syncedCount, total: calls.length }), {
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

        if (error) {
          console.error("Database error:", error);
          throw error;
        }

        console.log("Found", conversations?.length || 0, "total messages");

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

        const result = Object.values(groupedConversations);
        console.log("Returning", result.length, "conversations");

        return new Response(JSON.stringify(result), {
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

        if (error) {
          console.error("Error marking as read:", error);
          throw error;
        }

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