export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      access_policies: {
        Row: {
          compliance_percentage: number | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          last_evaluated: string | null
          name: string
          policy_config: Json | null
          policy_type: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          compliance_percentage?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_evaluated?: string | null
          name: string
          policy_config?: Json | null
          policy_type: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          compliance_percentage?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_evaluated?: string | null
          name?: string
          policy_config?: Json | null
          policy_type?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      access_rate_limits: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          identifier: string
          ip_address: unknown | null
          request_count: number | null
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          identifier: string
          ip_address?: unknown | null
          request_count?: number | null
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          identifier?: string
          ip_address?: unknown | null
          request_count?: number | null
          window_start?: string | null
        }
        Relationships: []
      }
      agent_client_chat: {
        Row: {
          attachments: Json | null
          client_id: string
          created_at: string
          id: string
          message: string
          message_type: string
          metadata: Json | null
          read_by_agent: boolean
          read_by_client: boolean
          review_id: string
          sender_type: string
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          client_id: string
          created_at?: string
          id?: string
          message: string
          message_type?: string
          metadata?: Json | null
          read_by_agent?: boolean
          read_by_client?: boolean
          review_id: string
          sender_type: string
          user_id: string
        }
        Update: {
          attachments?: Json | null
          client_id?: string
          created_at?: string
          id?: string
          message?: string
          message_type?: string
          metadata?: Json | null
          read_by_agent?: boolean
          read_by_client?: boolean
          review_id?: string
          sender_type?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_performance_metrics: {
        Row: {
          agent_id: string
          calls_made: number | null
          commission_earned: number | null
          conversion_rate: number | null
          created_at: string | null
          emails_sent: number | null
          id: string
          metric_date: string | null
          response_time_avg: unknown | null
          revenue_generated: number | null
          satisfaction_score: number | null
          target_achieved: boolean | null
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          calls_made?: number | null
          commission_earned?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          emails_sent?: number | null
          id?: string
          metric_date?: string | null
          response_time_avg?: unknown | null
          revenue_generated?: number | null
          satisfaction_score?: number | null
          target_achieved?: boolean | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          calls_made?: number | null
          commission_earned?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          emails_sent?: number | null
          id?: string
          metric_date?: string | null
          response_time_avg?: unknown | null
          revenue_generated?: number | null
          satisfaction_score?: number | null
          target_achieved?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      agent_performance_reports: {
        Row: {
          agent_id: string
          avg_response_time: unknown | null
          client_satisfaction_score: number | null
          conversion_rate: number | null
          created_at: string
          id: string
          performance_metrics: Json | null
          report_period_end: string
          report_period_start: string
          supervisor_id: string | null
          total_bookings: number | null
          total_clients: number | null
          total_commission: number | null
          total_revenue: number | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          avg_response_time?: unknown | null
          client_satisfaction_score?: number | null
          conversion_rate?: number | null
          created_at?: string
          id?: string
          performance_metrics?: Json | null
          report_period_end: string
          report_period_start: string
          supervisor_id?: string | null
          total_bookings?: number | null
          total_clients?: number | null
          total_commission?: number | null
          total_revenue?: number | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          avg_response_time?: unknown | null
          client_satisfaction_score?: number | null
          conversion_rate?: number | null
          created_at?: string
          id?: string
          performance_metrics?: Json | null
          report_period_end?: string
          report_period_start?: string
          supervisor_id?: string | null
          total_bookings?: number | null
          total_clients?: number | null
          total_commission?: number | null
          total_revenue?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_email_analytics: {
        Row: {
          action_type: string
          conversation_id: string | null
          id: string
          metadata: Json | null
          timestamp: string
          user_id: string
        }
        Insert: {
          action_type: string
          conversation_id?: string | null
          id?: string
          metadata?: Json | null
          timestamp?: string
          user_id: string
        }
        Update: {
          action_type?: string
          conversation_id?: string | null
          id?: string
          metadata?: Json | null
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_email_analytics_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_email_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_email_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_email_drafts: {
        Row: {
          bcc_emails: string[] | null
          body: string
          cc_emails: string[] | null
          conversation_id: string | null
          created_at: string
          email_type: string | null
          id: string
          metadata: Json | null
          recipient_emails: string[]
          status: string | null
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bcc_emails?: string[] | null
          body: string
          cc_emails?: string[] | null
          conversation_id?: string | null
          created_at?: string
          email_type?: string | null
          id?: string
          metadata?: Json | null
          recipient_emails: string[]
          status?: string | null
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bcc_emails?: string[] | null
          body?: string
          cc_emails?: string[] | null
          conversation_id?: string | null
          created_at?: string
          email_type?: string | null
          id?: string
          metadata?: Json | null
          recipient_emails?: string[]
          status?: string | null
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_email_drafts_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_email_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_email_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_email_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_email_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_email_suggestions: {
        Row: {
          accepted: boolean | null
          applied_at: string | null
          confidence_score: number | null
          created_at: string | null
          id: string
          improvement_reason: string | null
          metadata: Json | null
          original_content: string
          original_text: string | null
          suggested_text: string
          suggestion_type: string
          user_id: string
        }
        Insert: {
          accepted?: boolean | null
          applied_at?: string | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          improvement_reason?: string | null
          metadata?: Json | null
          original_content: string
          original_text?: string | null
          suggested_text: string
          suggestion_type: string
          user_id: string
        }
        Update: {
          accepted?: boolean | null
          applied_at?: string | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          improvement_reason?: string | null
          metadata?: Json | null
          original_content?: string
          original_text?: string | null
          suggested_text?: string
          suggestion_type?: string
          user_id?: string
        }
        Relationships: []
      }
      aircraft_models: {
        Row: {
          aliases: string[] | null
          category: string
          code: string
          created_at: string | null
          display_label: string
          family: string
          icon_url: string | null
          id: string
          manufacturer: string
          model: string
          updated_at: string | null
        }
        Insert: {
          aliases?: string[] | null
          category: string
          code: string
          created_at?: string | null
          display_label: string
          family: string
          icon_url?: string | null
          id?: string
          manufacturer: string
          model: string
          updated_at?: string | null
        }
        Update: {
          aliases?: string[] | null
          category?: string
          code?: string
          created_at?: string | null
          display_label?: string
          family?: string
          icon_url?: string | null
          id?: string
          manufacturer?: string
          model?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      airline_codes: {
        Row: {
          alliance: string | null
          country: string | null
          created_at: string | null
          iata_code: string
          icao_code: string | null
          id: string
          logo_url: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          alliance?: string | null
          country?: string | null
          created_at?: string | null
          iata_code: string
          icao_code?: string | null
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          alliance?: string | null
          country?: string | null
          created_at?: string | null
          iata_code?: string
          icao_code?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      airline_rbd_assignments: {
        Row: {
          airline_id: string
          booking_class_code: string
          booking_priority: number
          class_description: string | null
          created_at: string
          effective_from: string | null
          effective_until: string | null
          id: string
          is_active: boolean
          service_class: string
          updated_at: string
        }
        Insert: {
          airline_id: string
          booking_class_code: string
          booking_priority?: number
          class_description?: string | null
          created_at?: string
          effective_from?: string | null
          effective_until?: string | null
          id?: string
          is_active?: boolean
          service_class: string
          updated_at?: string
        }
        Update: {
          airline_id?: string
          booking_class_code?: string
          booking_priority?: number
          class_description?: string | null
          created_at?: string
          effective_from?: string | null
          effective_until?: string | null
          id?: string
          is_active?: boolean
          service_class?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_airline_rbd_assignments_airline_id"
            columns: ["airline_id"]
            isOneToOne: false
            referencedRelation: "airline_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      airline_rbd_templates: {
        Row: {
          airline_type: string
          created_at: string
          id: string
          is_default: boolean
          template_data: Json
          template_name: string
          updated_at: string
        }
        Insert: {
          airline_type?: string
          created_at?: string
          id?: string
          is_default?: boolean
          template_data?: Json
          template_name: string
          updated_at?: string
        }
        Update: {
          airline_type?: string
          created_at?: string
          id?: string
          is_default?: boolean
          template_data?: Json
          template_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      airport_codes: {
        Row: {
          city: string
          country: string
          created_at: string | null
          iata_code: string
          icao_code: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          priority: number
          timezone: string | null
        }
        Insert: {
          city: string
          country: string
          created_at?: string | null
          iata_code: string
          icao_code?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          priority?: number
          timezone?: string | null
        }
        Update: {
          city?: string
          country?: string
          created_at?: string | null
          iata_code?: string
          icao_code?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          priority?: number
          timezone?: string | null
        }
        Relationships: []
      }
      assets: {
        Row: {
          alt_text: string | null
          asset_category: string
          asset_source: string | null
          created_at: string
          external_url: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          is_public: boolean
          metadata: Json | null
          mime_type: string | null
          original_filename: string | null
          page_context: string | null
          tags: Json | null
          thumbnail_path: string | null
          updated_at: string
          usage_count: number
          user_id: string
        }
        Insert: {
          alt_text?: string | null
          asset_category?: string
          asset_source?: string | null
          created_at?: string
          external_url?: string | null
          file_name: string
          file_path: string
          file_size?: number
          file_type: string
          id?: string
          is_public?: boolean
          metadata?: Json | null
          mime_type?: string | null
          original_filename?: string | null
          page_context?: string | null
          tags?: Json | null
          thumbnail_path?: string | null
          updated_at?: string
          usage_count?: number
          user_id: string
        }
        Update: {
          alt_text?: string | null
          asset_category?: string
          asset_source?: string | null
          created_at?: string
          external_url?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          is_public?: boolean
          metadata?: Json | null
          mime_type?: string | null
          original_filename?: string | null
          page_context?: string | null
          tags?: Json | null
          thumbnail_path?: string | null
          updated_at?: string
          usage_count?: number
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          operation: string
          record_id: string | null
          session_id: string | null
          table_name: string
          timestamp: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          operation: string
          record_id?: string | null
          session_id?: string | null
          table_name: string
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          operation?: string
          record_id?: string | null
          session_id?: string | null
          table_name?: string
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      blocked_ips: {
        Row: {
          block_count: number
          blocked_at: string
          created_at: string
          expires_at: string
          id: string
          ip_address: unknown
          reason: string
          updated_at: string
        }
        Insert: {
          block_count?: number
          blocked_at?: string
          created_at?: string
          expires_at?: string
          id?: string
          ip_address: unknown
          reason?: string
          updated_at?: string
        }
        Update: {
          block_count?: number
          blocked_at?: string
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown
          reason?: string
          updated_at?: string
        }
        Relationships: []
      }
      booking_classes: {
        Row: {
          active: boolean | null
          airline_id: string | null
          booking_class_code: string
          booking_priority: number | null
          class_description: string | null
          created_at: string | null
          id: string
          service_class: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          airline_id?: string | null
          booking_class_code: string
          booking_priority?: number | null
          class_description?: string | null
          created_at?: string | null
          id?: string
          service_class: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          airline_id?: string | null
          booking_class_code?: string
          booking_priority?: number | null
          class_description?: string | null
          created_at?: string | null
          id?: string
          service_class?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_classes_airline_id_fkey"
            columns: ["airline_id"]
            isOneToOne: false
            referencedRelation: "airline_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_commissions: {
        Row: {
          agent_id: string
          base_commission_rate: number
          bonus_amount: number | null
          booking_id: string
          commission_amount: number
          created_at: string | null
          id: string
          payment_date: string | null
          payment_status: string | null
          total_commission: number
        }
        Insert: {
          agent_id: string
          base_commission_rate: number
          bonus_amount?: number | null
          booking_id: string
          commission_amount: number
          created_at?: string | null
          id?: string
          payment_date?: string | null
          payment_status?: string | null
          total_commission: number
        }
        Update: {
          agent_id?: string
          base_commission_rate?: number
          bonus_amount?: number | null
          booking_id?: string
          commission_amount?: number
          created_at?: string | null
          id?: string
          payment_date?: string | null
          payment_status?: string | null
          total_commission?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_commissions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          airline: string
          arrival_date: string
          booking_reference: string
          class: string
          client_id: string
          commission: number | null
          created_at: string | null
          departure_date: string
          flight_number: string | null
          id: string
          notes: string | null
          passengers: number | null
          payment_status: string | null
          pnr: string | null
          request_id: string | null
          return_arrival_date: string | null
          return_departure_date: string | null
          route: string
          status: string | null
          ticket_numbers: string[] | null
          total_price: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          airline: string
          arrival_date: string
          booking_reference: string
          class: string
          client_id: string
          commission?: number | null
          created_at?: string | null
          departure_date: string
          flight_number?: string | null
          id?: string
          notes?: string | null
          passengers?: number | null
          payment_status?: string | null
          pnr?: string | null
          request_id?: string | null
          return_arrival_date?: string | null
          return_departure_date?: string | null
          route: string
          status?: string | null
          ticket_numbers?: string[] | null
          total_price: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          airline?: string
          arrival_date?: string
          booking_reference?: string
          class?: string
          client_id?: string
          commission?: number | null
          created_at?: string | null
          departure_date?: string
          flight_number?: string | null
          id?: string
          notes?: string | null
          passengers?: number | null
          payment_status?: string | null
          pnr?: string | null
          request_id?: string | null
          return_arrival_date?: string | null
          return_departure_date?: string | null
          route?: string
          status?: string | null
          ticket_numbers?: string[] | null
          total_price?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      client_assignments: {
        Row: {
          agent_id: string
          assigned_at: string | null
          assigned_by: string
          assignment_reason: string | null
          client_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          assigned_at?: string | null
          assigned_by: string
          assignment_reason?: string | null
          client_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          assigned_at?: string | null
          assigned_by?: string
          assignment_reason?: string | null
          client_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_client_assignments_agent_id"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_client_assignments_assigned_by"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_client_assignments_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_encryption_keys: {
        Row: {
          client_id: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          key_fingerprint: string
          key_version: number
          rotation_reason: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_fingerprint: string
          key_version?: number
          rotation_reason?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_fingerprint?: string
          key_version?: number
          rotation_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_encryption_keys_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_intelligence: {
        Row: {
          avg_ticket_price: number | null
          booking_patterns: Json | null
          client_id: string
          created_at: string
          historical_spending: Json | null
          id: string
          last_analysis: string | null
          preferred_routes: Json | null
          price_sensitivity: string | null
          profit_potential: string | null
          risk_score: number | null
          seasonal_preferences: Json | null
          updated_at: string
          upselling_opportunities: Json | null
          user_id: string
        }
        Insert: {
          avg_ticket_price?: number | null
          booking_patterns?: Json | null
          client_id: string
          created_at?: string
          historical_spending?: Json | null
          id?: string
          last_analysis?: string | null
          preferred_routes?: Json | null
          price_sensitivity?: string | null
          profit_potential?: string | null
          risk_score?: number | null
          seasonal_preferences?: Json | null
          updated_at?: string
          upselling_opportunities?: Json | null
          user_id: string
        }
        Update: {
          avg_ticket_price?: number | null
          booking_patterns?: Json | null
          client_id?: string
          created_at?: string
          historical_spending?: Json | null
          id?: string
          last_analysis?: string | null
          preferred_routes?: Json | null
          price_sensitivity?: string | null
          profit_potential?: string | null
          risk_score?: number | null
          seasonal_preferences?: Json | null
          updated_at?: string
          upselling_opportunities?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      client_memories: {
        Row: {
          client_id: string
          communication_history: Json | null
          created_at: string
          id: string
          last_interaction: string | null
          last_updated: string
          memory_version: number | null
          opportunities: Json | null
          pain_points: Json | null
          preferences: Json | null
          relationship_summary: string
          user_id: string
        }
        Insert: {
          client_id: string
          communication_history?: Json | null
          created_at?: string
          id?: string
          last_interaction?: string | null
          last_updated?: string
          memory_version?: number | null
          opportunities?: Json | null
          pain_points?: Json | null
          preferences?: Json | null
          relationship_summary?: string
          user_id: string
        }
        Update: {
          client_id?: string
          communication_history?: Json | null
          created_at?: string
          id?: string
          last_interaction?: string | null
          last_updated?: string
          memory_version?: number | null
          opportunities?: Json | null
          pain_points?: Json | null
          preferences?: Json | null
          relationship_summary?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_memories_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_option_reviews: {
        Row: {
          client_id: string
          client_preferences: Json | null
          client_token: string
          created_at: string
          expires_at: string | null
          id: string
          quote_ids: string[]
          request_id: string
          responded_at: string | null
          review_status: string
          updated_at: string
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          client_id: string
          client_preferences?: Json | null
          client_token?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          quote_ids?: string[]
          request_id: string
          responded_at?: string | null
          review_status?: string
          updated_at?: string
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          client_id?: string
          client_preferences?: Json | null
          client_token?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          quote_ids?: string[]
          request_id?: string
          responded_at?: string | null
          review_status?: string
          updated_at?: string
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: []
      }
      client_satisfaction_scores: {
        Row: {
          agent_id: string
          client_id: string
          created_at: string | null
          feedback_text: string | null
          id: string
          interaction_type: string
          rating: number
        }
        Insert: {
          agent_id: string
          client_id: string
          created_at?: string | null
          feedback_text?: string | null
          id?: string
          interaction_type: string
          rating: number
        }
        Update: {
          agent_id?: string
          client_id?: string
          created_at?: string | null
          feedback_text?: string | null
          id?: string
          interaction_type?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_satisfaction_scores_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          access_restricted: boolean | null
          client_type: string | null
          company: string | null
          created_at: string | null
          data_classification: string | null
          date_of_birth: string | null
          email: string
          encrypted_passport_number: string | null
          encrypted_payment_info: Json | null
          encrypted_ssn: string | null
          first_name: string
          id: string
          last_name: string
          last_trip_date: string | null
          notes: string | null
          phone: string | null
          preferred_class: string | null
          total_bookings: number | null
          total_spent: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_restricted?: boolean | null
          client_type?: string | null
          company?: string | null
          created_at?: string | null
          data_classification?: string | null
          date_of_birth?: string | null
          email: string
          encrypted_passport_number?: string | null
          encrypted_payment_info?: Json | null
          encrypted_ssn?: string | null
          first_name: string
          id?: string
          last_name: string
          last_trip_date?: string | null
          notes?: string | null
          phone?: string | null
          preferred_class?: string | null
          total_bookings?: number | null
          total_spent?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_restricted?: boolean | null
          client_type?: string | null
          company?: string | null
          created_at?: string | null
          data_classification?: string | null
          date_of_birth?: string | null
          email?: string
          encrypted_passport_number?: string | null
          encrypted_payment_info?: Json | null
          encrypted_ssn?: string | null
          first_name?: string
          id?: string
          last_name?: string
          last_trip_date?: string | null
          notes?: string | null
          phone?: string | null
          preferred_class?: string | null
          total_bookings?: number | null
          total_spent?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      communication_archive: {
        Row: {
          archived_date: string
          client_id: string | null
          communication_type: string
          content_summary: string
          id: string
          metadata: Json | null
          original_content: Json | null
          original_date: string
          retention_expiry: string | null
          user_id: string
        }
        Insert: {
          archived_date?: string
          client_id?: string | null
          communication_type: string
          content_summary: string
          id?: string
          metadata?: Json | null
          original_content?: Json | null
          original_date: string
          retention_expiry?: string | null
          user_id: string
        }
        Update: {
          archived_date?: string
          client_id?: string | null
          communication_type?: string
          content_summary?: string
          id?: string
          metadata?: Json | null
          original_content?: Json | null
          original_date?: string
          retention_expiry?: string | null
          user_id?: string
        }
        Relationships: []
      }
      communication_logs: {
        Row: {
          agent_id: string
          client_id: string | null
          communication_type: string
          created_at: string | null
          duration_minutes: number | null
          id: string
          notes: string | null
          outcome: string | null
          response_time_minutes: number | null
          satisfaction_rating: number | null
        }
        Insert: {
          agent_id: string
          client_id?: string | null
          communication_type: string
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          outcome?: string | null
          response_time_minutes?: number | null
          satisfaction_rating?: number | null
        }
        Update: {
          agent_id?: string
          client_id?: string | null
          communication_type?: string
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          outcome?: string | null
          response_time_minutes?: number | null
          satisfaction_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_reports: {
        Row: {
          created_at: string | null
          generated_by: string
          id: string
          period_end: string
          period_start: string
          report_data: Json
          report_type: string
        }
        Insert: {
          created_at?: string | null
          generated_by: string
          id?: string
          period_end: string
          period_start: string
          report_data: Json
          report_type: string
        }
        Update: {
          created_at?: string | null
          generated_by?: string
          id?: string
          period_end?: string
          period_start?: string
          report_data?: Json
          report_type?: string
        }
        Relationships: []
      }
      credential_access_audit: {
        Row: {
          accessor_id: string
          action: string
          created_at: string
          details: Json | null
          id: string
          user_id: string
        }
        Insert: {
          accessor_id?: string
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id: string
        }
        Update: {
          accessor_id?: string
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      critical_audit_trail: {
        Row: {
          business_justification: string | null
          id: string
          integrity_hash: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          operation_type: string
          record_id: string | null
          risk_assessment: string
          session_id: string | null
          table_name: string
          timestamp: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          business_justification?: string | null
          id?: string
          integrity_hash: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          operation_type: string
          record_id?: string | null
          risk_assessment?: string
          session_id?: string | null
          table_name: string
          timestamp?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          business_justification?: string | null
          id?: string
          integrity_hash?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          operation_type?: string
          record_id?: string | null
          risk_assessment?: string
          session_id?: string | null
          table_name?: string
          timestamp?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      csp_violations: {
        Row: {
          created_at: string | null
          id: string
          ip_address: unknown | null
          user_agent: string | null
          user_id: string | null
          violation_data: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
          violation_data: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
          violation_data?: Json
        }
        Relationships: []
      }
      data_access_audit: {
        Row: {
          access_denied: boolean | null
          access_type: string
          accessed_record_id: string | null
          accessed_table: string
          approved_by: string | null
          business_justification: string | null
          data_classification: string | null
          denial_reason: string | null
          id: string
          ip_address: unknown | null
          risk_score: number | null
          session_id: string | null
          timestamp: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          access_denied?: boolean | null
          access_type: string
          accessed_record_id?: string | null
          accessed_table: string
          approved_by?: string | null
          business_justification?: string | null
          data_classification?: string | null
          denial_reason?: string | null
          id?: string
          ip_address?: unknown | null
          risk_score?: number | null
          session_id?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          access_denied?: boolean | null
          access_type?: string
          accessed_record_id?: string | null
          accessed_table?: string
          approved_by?: string | null
          business_justification?: string | null
          data_classification?: string | null
          denial_reason?: string | null
          id?: string
          ip_address?: unknown | null
          risk_score?: number | null
          session_id?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      data_export_requests: {
        Row: {
          admin_notes: string | null
          completed_at: string | null
          export_url: string | null
          id: string
          request_type: string
          requested_at: string
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          completed_at?: string | null
          export_url?: string | null
          id?: string
          request_type: string
          requested_at?: string
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          completed_at?: string | null
          export_url?: string | null
          id?: string
          request_type?: string
          requested_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      data_retention_policies: {
        Row: {
          auto_delete: boolean | null
          compliance_rule: string | null
          created_at: string
          id: string
          retention_period: unknown
          table_name: string
          updated_at: string
        }
        Insert: {
          auto_delete?: boolean | null
          compliance_rule?: string | null
          created_at?: string
          id?: string
          retention_period: unknown
          table_name: string
          updated_at?: string
        }
        Update: {
          auto_delete?: boolean | null
          compliance_rule?: string | null
          created_at?: string
          id?: string
          retention_period?: unknown
          table_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      device_fingerprints: {
        Row: {
          browser: string
          created_at: string | null
          device_hash: string
          device_type: string
          id: string
          is_verified: boolean | null
          language: string | null
          last_seen: string | null
          metadata: Json | null
          os: string
          risk_level: string | null
          screen_resolution: string | null
          timezone: string | null
          trust_score: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          browser: string
          created_at?: string | null
          device_hash: string
          device_type: string
          id?: string
          is_verified?: boolean | null
          language?: string | null
          last_seen?: string | null
          metadata?: Json | null
          os: string
          risk_level?: string | null
          screen_resolution?: string | null
          timezone?: string | null
          trust_score?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          browser?: string
          created_at?: string | null
          device_hash?: string
          device_type?: string
          id?: string
          is_verified?: boolean | null
          language?: string | null
          last_seen?: string | null
          metadata?: Json | null
          os?: string
          risk_level?: string | null
          screen_resolution?: string | null
          timezone?: string | null
          trust_score?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_ab_tests: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          ended_at: string | null
          id: string
          started_at: string | null
          status: string | null
          test_name: string
          user_id: string
          variant_a_clicks: number | null
          variant_a_opens: number | null
          variant_a_replies: number | null
          variant_a_sends: number | null
          variant_a_subject: string
          variant_b_clicks: number | null
          variant_b_opens: number | null
          variant_b_replies: number | null
          variant_b_sends: number | null
          variant_b_subject: string
          winner_variant: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          ended_at?: string | null
          id?: string
          started_at?: string | null
          status?: string | null
          test_name: string
          user_id: string
          variant_a_clicks?: number | null
          variant_a_opens?: number | null
          variant_a_replies?: number | null
          variant_a_sends?: number | null
          variant_a_subject: string
          variant_b_clicks?: number | null
          variant_b_opens?: number | null
          variant_b_replies?: number | null
          variant_b_sends?: number | null
          variant_b_subject: string
          winner_variant?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          ended_at?: string | null
          id?: string
          started_at?: string | null
          status?: string | null
          test_name?: string
          user_id?: string
          variant_a_clicks?: number | null
          variant_a_opens?: number | null
          variant_a_replies?: number | null
          variant_a_sends?: number | null
          variant_a_subject?: string
          variant_b_clicks?: number | null
          variant_b_opens?: number | null
          variant_b_replies?: number | null
          variant_b_sends?: number | null
          variant_b_subject?: string
          winner_variant?: string | null
        }
        Relationships: []
      }
      email_archives: {
        Row: {
          archived_date: string
          created_at: string
          folder_name: string
          id: string
          message_id: string
          original_data: Json
          sender_email: string
          subject: string
          thread_id: string | null
          user_id: string
        }
        Insert: {
          archived_date?: string
          created_at?: string
          folder_name?: string
          id?: string
          message_id: string
          original_data: Json
          sender_email: string
          subject: string
          thread_id?: string | null
          user_id: string
        }
        Update: {
          archived_date?: string
          created_at?: string
          folder_name?: string
          id?: string
          message_id?: string
          original_data?: Json
          sender_email?: string
          subject?: string
          thread_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_drafts: {
        Row: {
          attachments: Json | null
          bcc_emails: string[] | null
          body: string
          cc_emails: string[] | null
          client_id: string | null
          created_at: string | null
          email_type: string | null
          forward_from_message_id: string | null
          id: string
          metadata: Json | null
          recipient_emails: string[]
          reply_to_message_id: string | null
          request_id: string | null
          subject: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          bcc_emails?: string[] | null
          body?: string
          cc_emails?: string[] | null
          client_id?: string | null
          created_at?: string | null
          email_type?: string | null
          forward_from_message_id?: string | null
          id?: string
          metadata?: Json | null
          recipient_emails?: string[]
          reply_to_message_id?: string | null
          request_id?: string | null
          subject?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attachments?: Json | null
          bcc_emails?: string[] | null
          body?: string
          cc_emails?: string[] | null
          client_id?: string | null
          created_at?: string | null
          email_type?: string | null
          forward_from_message_id?: string | null
          id?: string
          metadata?: Json | null
          recipient_emails?: string[]
          reply_to_message_id?: string | null
          request_id?: string | null
          subject?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_exchanges: {
        Row: {
          attachments: Json | null
          bcc_emails: string[] | null
          body: string
          cc_emails: string[] | null
          client_id: string | null
          created_at: string
          data_classification: string | null
          direction: string
          email_type: string | null
          folder_name: string | null
          forwarded_from_message_id: string | null
          html_body: string | null
          id: string
          is_archived: boolean | null
          is_deleted: boolean | null
          is_draft: boolean | null
          is_read: boolean | null
          is_starred: boolean | null
          message_id: string | null
          metadata: Json | null
          received_at: string | null
          recipient_emails: string[]
          reply_to_message_id: string | null
          request_id: string | null
          sender_email: string
          status: string
          subject: string
          thread_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          bcc_emails?: string[] | null
          body: string
          cc_emails?: string[] | null
          client_id?: string | null
          created_at?: string
          data_classification?: string | null
          direction: string
          email_type?: string | null
          folder_name?: string | null
          forwarded_from_message_id?: string | null
          html_body?: string | null
          id?: string
          is_archived?: boolean | null
          is_deleted?: boolean | null
          is_draft?: boolean | null
          is_read?: boolean | null
          is_starred?: boolean | null
          message_id?: string | null
          metadata?: Json | null
          received_at?: string | null
          recipient_emails: string[]
          reply_to_message_id?: string | null
          request_id?: string | null
          sender_email: string
          status?: string
          subject: string
          thread_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attachments?: Json | null
          bcc_emails?: string[] | null
          body?: string
          cc_emails?: string[] | null
          client_id?: string | null
          created_at?: string
          data_classification?: string | null
          direction?: string
          email_type?: string | null
          folder_name?: string | null
          forwarded_from_message_id?: string | null
          html_body?: string | null
          id?: string
          is_archived?: boolean | null
          is_deleted?: boolean | null
          is_draft?: boolean | null
          is_read?: boolean | null
          is_starred?: boolean | null
          message_id?: string | null
          metadata?: Json | null
          received_at?: string | null
          recipient_emails?: string[]
          reply_to_message_id?: string | null
          request_id?: string | null
          sender_email?: string
          status?: string
          subject?: string
          thread_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_email_exchanges_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      email_performance_analytics: {
        Row: {
          ai_score: number | null
          bounced_at: string | null
          clicked_at: string | null
          conversion_value: number | null
          created_at: string | null
          email_id: string | null
          email_type: string
          engagement_score: number | null
          id: string
          metadata: Json | null
          opened_at: string | null
          recipient_email: string
          replied_at: string | null
          sent_at: string
          sentiment_score: number | null
          subject_line: string
          template_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_score?: number | null
          bounced_at?: string | null
          clicked_at?: string | null
          conversion_value?: number | null
          created_at?: string | null
          email_id?: string | null
          email_type?: string
          engagement_score?: number | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          recipient_email: string
          replied_at?: string | null
          sent_at?: string
          sentiment_score?: number | null
          subject_line: string
          template_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_score?: number | null
          bounced_at?: string | null
          clicked_at?: string | null
          conversion_value?: number | null
          created_at?: string | null
          email_id?: string | null
          email_type?: string
          engagement_score?: number | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          recipient_email?: string
          replied_at?: string | null
          sent_at?: string
          sentiment_score?: number | null
          subject_line?: string
          template_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_performance_analytics_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "email_exchanges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_performance_analytics_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sync_config: {
        Row: {
          created_at: string | null
          enable_full_mailbox_sync: boolean
          enable_historical_sync: boolean
          id: string
          last_full_sync_at: string | null
          max_emails_per_sync: number
          sync_days_back: number
          sync_frequency_minutes: number
          sync_preferences: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          enable_full_mailbox_sync?: boolean
          enable_historical_sync?: boolean
          id?: string
          last_full_sync_at?: string | null
          max_emails_per_sync?: number
          sync_days_back?: number
          sync_frequency_minutes?: number
          sync_preferences?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          enable_full_mailbox_sync?: boolean
          enable_historical_sync?: boolean
          id?: string
          last_full_sync_at?: string | null
          max_emails_per_sync?: number
          sync_days_back?: number
          sync_frequency_minutes?: number
          sync_preferences?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_sync_progress: {
        Row: {
          completed_at: string | null
          current_batch: number | null
          emails_processed: number | null
          emails_stored: number | null
          error_message: string | null
          id: string
          started_at: string | null
          status: string
          sync_metadata: Json | null
          sync_type: string
          total_batches_estimated: number | null
          total_emails_estimated: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          current_batch?: number | null
          emails_processed?: number | null
          emails_stored?: number | null
          error_message?: string | null
          id?: string
          started_at?: string | null
          status?: string
          sync_metadata?: Json | null
          sync_type: string
          total_batches_estimated?: number | null
          total_emails_estimated?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          current_batch?: number | null
          emails_processed?: number | null
          emails_stored?: number | null
          error_message?: string | null
          id?: string
          started_at?: string | null
          status?: string
          sync_metadata?: Json | null
          sync_type?: string
          total_batches_estimated?: number | null
          total_emails_estimated?: number | null
          user_id?: string
        }
        Relationships: []
      }
      email_sync_status: {
        Row: {
          created_at: string
          folder_name: string
          gmail_history_id: string | null
          id: string
          last_sync_at: string
          last_sync_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          folder_name: string
          gmail_history_id?: string | null
          id?: string
          last_sync_at?: string
          last_sync_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          folder_name?: string
          gmail_history_id?: string | null
          id?: string
          last_sync_at?: string
          last_sync_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body: string
          created_at: string | null
          email_type: string | null
          id: string
          is_active: boolean | null
          name: string
          subject: string
          updated_at: string | null
          usage_count: number | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          email_type?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          subject: string
          updated_at?: string | null
          usage_count?: number | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          email_type?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      emergency_access_log: {
        Row: {
          access_duration: unknown | null
          access_granted: boolean | null
          accessing_user_id: string
          authorized_by: string | null
          created_at: string | null
          emergency_type: string
          expires_at: string | null
          id: string
          justification: string
          revoked_at: string | null
          target_client_id: string
        }
        Insert: {
          access_duration?: unknown | null
          access_granted?: boolean | null
          accessing_user_id: string
          authorized_by?: string | null
          created_at?: string | null
          emergency_type: string
          expires_at?: string | null
          id?: string
          justification: string
          revoked_at?: string | null
          target_client_id: string
        }
        Update: {
          access_duration?: unknown | null
          access_granted?: boolean | null
          accessing_user_id?: string
          authorized_by?: string | null
          created_at?: string | null
          emergency_type?: string
          expires_at?: string | null
          id?: string
          justification?: string
          revoked_at?: string | null
          target_client_id?: string
        }
        Relationships: []
      }
      encryption_audit_log: {
        Row: {
          action: string
          client_id: string | null
          field_type: string
          id: string
          ip_address: unknown | null
          metadata: Json | null
          success: boolean | null
          timestamp: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          client_id?: string | null
          field_type: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          success?: boolean | null
          timestamp?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          client_id?: string | null
          field_type?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          success?: boolean | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      encryption_keys: {
        Row: {
          algorithm: string
          created_at: string
          expires_at: string | null
          id: string
          key_name: string
          key_version: number
          status: string
        }
        Insert: {
          algorithm?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          key_name: string
          key_version?: number
          status?: string
        }
        Update: {
          algorithm?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          key_name?: string
          key_version?: number
          status?: string
        }
        Relationships: []
      }
      excluded_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      flight_options: {
        Row: {
          best_value: boolean | null
          client_id: string | null
          created_at: string | null
          currency: string | null
          id: string
          parsed_segments: Json | null
          price_usd: number | null
          quote_id: string | null
          raw_pnr_text: string | null
          request_id: string | null
          route_label: string | null
          total_duration: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          best_value?: boolean | null
          client_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          parsed_segments?: Json | null
          price_usd?: number | null
          quote_id?: string | null
          raw_pnr_text?: string | null
          request_id?: string | null
          route_label?: string | null
          total_duration?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          best_value?: boolean | null
          client_id?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          parsed_segments?: Json | null
          price_usd?: number | null
          quote_id?: string | null
          raw_pnr_text?: string | null
          request_id?: string | null
          route_label?: string | null
          total_duration?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flight_options_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_options_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flight_options_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      flight_price_tracking: {
        Row: {
          airline: string | null
          booking_url: string | null
          class_type: string
          currency: string | null
          data_classification: string | null
          destination_code: string
          id: string
          is_available: boolean | null
          origin_code: string
          price: number
          route: string
          scraped_at: string
          source: string
          travel_date: string
        }
        Insert: {
          airline?: string | null
          booking_url?: string | null
          class_type: string
          currency?: string | null
          data_classification?: string | null
          destination_code: string
          id?: string
          is_available?: boolean | null
          origin_code: string
          price: number
          route: string
          scraped_at?: string
          source: string
          travel_date: string
        }
        Update: {
          airline?: string | null
          booking_url?: string | null
          class_type?: string
          currency?: string | null
          data_classification?: string | null
          destination_code?: string
          id?: string
          is_available?: boolean | null
          origin_code?: string
          price?: number
          route?: string
          scraped_at?: string
          source?: string
          travel_date?: string
        }
        Relationships: []
      }
      gdpr_consent: {
        Row: {
          consent_given: boolean
          consent_type: string
          consent_version: string
          id: string
          ip_address: unknown | null
          timestamp: string
          user_id: string
          withdrawal_timestamp: string | null
        }
        Insert: {
          consent_given: boolean
          consent_type: string
          consent_version: string
          id?: string
          ip_address?: unknown | null
          timestamp?: string
          user_id: string
          withdrawal_timestamp?: string | null
        }
        Update: {
          consent_given?: boolean
          consent_type?: string
          consent_version?: string
          id?: string
          ip_address?: unknown | null
          timestamp?: string
          user_id?: string
          withdrawal_timestamp?: string | null
        }
        Relationships: []
      }
      gmail_credentials: {
        Row: {
          access_token_encrypted: string | null
          created_at: string | null
          gmail_user_email: string
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          refresh_token_encrypted: string | null
          scope: string | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token_encrypted?: string | null
          created_at?: string | null
          gmail_user_email: string
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          refresh_token_encrypted?: string | null
          scope?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token_encrypted?: string | null
          created_at?: string | null
          gmail_user_email?: string
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          refresh_token_encrypted?: string | null
          scope?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      gmail_notifications: {
        Row: {
          created_at: string
          email_address: string
          history_id: string
          id: string
          notification_data: Json
          processed: boolean
          processed_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email_address: string
          history_id: string
          id?: string
          notification_data?: Json
          processed?: boolean
          processed_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email_address?: string
          history_id?: string
          id?: string
          notification_data?: Json
          processed?: boolean
          processed_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      memory_interactions: {
        Row: {
          ai_reasoning: string | null
          context: Json | null
          created_at: string
          id: string
          interaction_type: string
          memory_id: string
          memory_type: string
          user_id: string
        }
        Insert: {
          ai_reasoning?: string | null
          context?: Json | null
          created_at?: string
          id?: string
          interaction_type: string
          memory_id: string
          memory_type: string
          user_id: string
        }
        Update: {
          ai_reasoning?: string | null
          context?: Json | null
          created_at?: string
          id?: string
          interaction_type?: string
          memory_id?: string
          memory_type?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachments: Json | null
          call_duration: number | null
          contact_name: string | null
          content: string
          conversation_id: string | null
          created_at: string
          direction: string
          id: string
          message_id: string | null
          message_type: string
          metadata: Json | null
          phone_number: string
          read_status: boolean | null
          status: string
          thread_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attachments?: Json | null
          call_duration?: number | null
          contact_name?: string | null
          content: string
          conversation_id?: string | null
          created_at?: string
          direction: string
          id?: string
          message_id?: string | null
          message_type?: string
          metadata?: Json | null
          phone_number: string
          read_status?: boolean | null
          status?: string
          thread_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attachments?: Json | null
          call_duration?: number | null
          contact_name?: string | null
          content?: string
          conversation_id?: string | null
          created_at?: string
          direction?: string
          id?: string
          message_id?: string | null
          message_type?: string
          metadata?: Json | null
          phone_number?: string
          read_status?: boolean | null
          status?: string
          thread_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          id: string
          message: string
          priority: string | null
          read: boolean | null
          related_id: string | null
          related_type: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          message: string
          priority?: string | null
          read?: boolean | null
          related_id?: string | null
          related_type?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          message?: string
          priority?: string | null
          read?: boolean | null
          related_id?: string | null
          related_type?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      oauth_state_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          state_token: string
          used: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          state_token: string
          used?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          state_token?: string
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      option_feedback: {
        Row: {
          client_id: string
          comments: string | null
          convenience_rating: number | null
          created_at: string
          feedback_type: string
          id: string
          price_feedback: string | null
          quote_id: string
          rating: number | null
          review_id: string
          suggested_changes: Json | null
          user_id: string
        }
        Insert: {
          client_id: string
          comments?: string | null
          convenience_rating?: number | null
          created_at?: string
          feedback_type: string
          id?: string
          price_feedback?: string | null
          quote_id: string
          rating?: number | null
          review_id: string
          suggested_changes?: Json | null
          user_id: string
        }
        Update: {
          client_id?: string
          comments?: string | null
          convenience_rating?: number | null
          created_at?: string
          feedback_type?: string
          id?: string
          price_feedback?: string | null
          quote_id?: string
          rating?: number | null
          review_id?: string
          suggested_changes?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      option_reviews: {
        Row: {
          client_id: string
          client_token: string
          created_at: string
          id: string
          metadata: Json | null
          quote_ids: string[]
          request_id: string | null
          review_status: string
          token_expires_at: string | null
          token_used: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          client_token?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          quote_ids: string[]
          request_id?: string | null
          review_status?: string
          token_expires_at?: string | null
          token_used?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          client_token?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          quote_ids?: string[]
          request_id?: string | null
          review_status?: string
          token_expires_at?: string | null
          token_used?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      quotes: {
        Row: {
          adult_markup: number | null
          adult_net_price: number | null
          adult_price: number | null
          adults_count: number | null
          award_program: string | null
          child_markup: number | null
          child_net_price: number | null
          child_price: number | null
          children_count: number | null
          ck_fee_amount: number
          ck_fee_enabled: boolean
          client_id: string
          client_token: string | null
          content: string | null
          created_at: string
          detailed_passenger_breakdown: Json | null
          fare_type: string
          financial_sensitivity: string | null
          format: string | null
          id: string
          infant_markup: number | null
          infant_net_price: number | null
          infant_price: number | null
          infants_count: number | null
          is_hidden: boolean
          issuing_fee: number | null
          markup: number
          minimum_markup: number | null
          net_price: number
          notes: string | null
          number_of_bags: number | null
          number_of_points: number | null
          passenger_pricing: Json | null
          pseudo_city: string | null
          quote_type: string | null
          request_id: string
          route: string
          segments: Json
          status: string
          taxes: number | null
          total_price: number
          total_segments: number
          updated_at: string
          user_id: string
          valid_until: string | null
          weight_of_bags: number | null
        }
        Insert: {
          adult_markup?: number | null
          adult_net_price?: number | null
          adult_price?: number | null
          adults_count?: number | null
          award_program?: string | null
          child_markup?: number | null
          child_net_price?: number | null
          child_price?: number | null
          children_count?: number | null
          ck_fee_amount?: number
          ck_fee_enabled?: boolean
          client_id: string
          client_token?: string | null
          content?: string | null
          created_at?: string
          detailed_passenger_breakdown?: Json | null
          fare_type: string
          financial_sensitivity?: string | null
          format?: string | null
          id?: string
          infant_markup?: number | null
          infant_net_price?: number | null
          infant_price?: number | null
          infants_count?: number | null
          is_hidden?: boolean
          issuing_fee?: number | null
          markup?: number
          minimum_markup?: number | null
          net_price: number
          notes?: string | null
          number_of_bags?: number | null
          number_of_points?: number | null
          passenger_pricing?: Json | null
          pseudo_city?: string | null
          quote_type?: string | null
          request_id: string
          route: string
          segments: Json
          status?: string
          taxes?: number | null
          total_price: number
          total_segments: number
          updated_at?: string
          user_id: string
          valid_until?: string | null
          weight_of_bags?: number | null
        }
        Update: {
          adult_markup?: number | null
          adult_net_price?: number | null
          adult_price?: number | null
          adults_count?: number | null
          award_program?: string | null
          child_markup?: number | null
          child_net_price?: number | null
          child_price?: number | null
          children_count?: number | null
          ck_fee_amount?: number
          ck_fee_enabled?: boolean
          client_id?: string
          client_token?: string | null
          content?: string | null
          created_at?: string
          detailed_passenger_breakdown?: Json | null
          fare_type?: string
          financial_sensitivity?: string | null
          format?: string | null
          id?: string
          infant_markup?: number | null
          infant_net_price?: number | null
          infant_price?: number | null
          infants_count?: number | null
          is_hidden?: boolean
          issuing_fee?: number | null
          markup?: number
          minimum_markup?: number | null
          net_price?: number
          notes?: string | null
          number_of_bags?: number | null
          number_of_points?: number | null
          passenger_pricing?: Json | null
          pseudo_city?: string | null
          quote_type?: string | null
          request_id?: string
          route?: string
          segments?: Json
          status?: string
          taxes?: number | null
          total_price?: number
          total_segments?: number
          updated_at?: string
          user_id?: string
          valid_until?: string | null
          weight_of_bags?: number | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          identifier: string
          request_count: number | null
          window_start: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          identifier: string
          request_count?: number | null
          window_start?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          identifier?: string
          request_count?: number | null
          window_start?: string | null
        }
        Relationships: []
      }
      request_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          assigned_to: string
          created_at: string
          id: string
          notes: string | null
          request_id: string
          status: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          assigned_to: string
          created_at?: string
          id?: string
          notes?: string | null
          request_id: string
          status?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          assigned_to?: string
          created_at?: string
          id?: string
          notes?: string | null
          request_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_assignments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          adults_count: number | null
          assigned_to: string | null
          assignment_status: string | null
          budget_range: string | null
          children_count: number | null
          class_preference: string | null
          client_id: string
          created_at: string | null
          departure_date: string
          destination: string
          id: string
          infants_count: number | null
          notes: string | null
          origin: string
          passengers: number | null
          priority: string | null
          quoted_price: number | null
          request_type: string
          return_date: string | null
          segments: Json | null
          special_requirements: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          adults_count?: number | null
          assigned_to?: string | null
          assignment_status?: string | null
          budget_range?: string | null
          children_count?: number | null
          class_preference?: string | null
          client_id: string
          created_at?: string | null
          departure_date: string
          destination: string
          id?: string
          infants_count?: number | null
          notes?: string | null
          origin: string
          passengers?: number | null
          priority?: string | null
          quoted_price?: number | null
          request_type: string
          return_date?: string | null
          segments?: Json | null
          special_requirements?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          adults_count?: number | null
          assigned_to?: string | null
          assignment_status?: string | null
          budget_range?: string | null
          children_count?: number | null
          class_preference?: string | null
          client_id?: string
          created_at?: string | null
          departure_date?: string
          destination?: string
          id?: string
          infants_count?: number | null
          notes?: string | null
          origin?: string
          passengers?: number | null
          priority?: string | null
          quoted_price?: number | null
          request_type?: string
          return_date?: string | null
          segments?: Json | null
          special_requirements?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_memories: {
        Row: {
          client_id: string
          created_at: string
          id: string
          last_updated: string
          memory_version: number | null
          next_actions: Json | null
          objections_handled: Json | null
          opportunity_summary: string
          request_id: string | null
          stage: string
          success_probability: number | null
          timeline: Json | null
          user_id: string
          value_proposition: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          last_updated?: string
          memory_version?: number | null
          next_actions?: Json | null
          objections_handled?: Json | null
          opportunity_summary?: string
          request_id?: string | null
          stage?: string
          success_probability?: number | null
          timeline?: Json | null
          user_id: string
          value_proposition?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          last_updated?: string
          memory_version?: number | null
          next_actions?: Json | null
          objections_handled?: Json | null
          opportunity_summary?: string
          request_id?: string | null
          stage?: string
          success_probability?: number | null
          timeline?: Json | null
          user_id?: string
          value_proposition?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_memories_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_memories_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      security_alerts: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          auto_resolved: boolean | null
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          resolved_at: string | null
          severity: string
          title: string
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          auto_resolved?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          resolved_at?: string | null
          severity?: string
          title: string
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          auto_resolved?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          resolved_at?: string | null
          severity?: string
          title?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          details: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          resolved: boolean
          severity: string
          timestamp: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          resolved?: boolean
          severity?: string
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          resolved?: boolean
          severity?: string
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_monitoring: {
        Row: {
          client_id: string | null
          details: Json | null
          event_type: string
          id: string
          investigated_by: string | null
          investigation_notes: string | null
          ip_address: unknown | null
          requires_investigation: boolean | null
          resolved: boolean | null
          session_fingerprint: string | null
          severity: string
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          details?: Json | null
          event_type: string
          id?: string
          investigated_by?: string | null
          investigation_notes?: string | null
          ip_address?: unknown | null
          requires_investigation?: boolean | null
          resolved?: boolean | null
          session_fingerprint?: string | null
          severity?: string
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          investigated_by?: string | null
          investigation_notes?: string | null
          ip_address?: unknown | null
          requires_investigation?: boolean | null
          resolved?: boolean | null
          session_fingerprint?: string | null
          severity?: string
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_threat_analysis: {
        Row: {
          automated_response: string | null
          created_at: string
          id: string
          investigation_status: string
          resolution_notes: string | null
          resolved_at: string | null
          severity_score: number
          threat_indicators: Json
          threat_type: string
          user_id: string | null
        }
        Insert: {
          automated_response?: string | null
          created_at?: string
          id?: string
          investigation_status?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          severity_score?: number
          threat_indicators?: Json
          threat_type: string
          user_id?: string | null
        }
        Update: {
          automated_response?: string | null
          created_at?: string
          id?: string
          investigation_status?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          severity_score?: number
          threat_indicators?: Json
          threat_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      sensitive_data_access: {
        Row: {
          access_reason: string | null
          accessed_user_id: string | null
          client_id: string | null
          data_type: string
          id: string
          ip_address: unknown | null
          timestamp: string
          user_id: string
        }
        Insert: {
          access_reason?: string | null
          accessed_user_id?: string | null
          client_id?: string | null
          data_type: string
          id?: string
          ip_address?: unknown | null
          timestamp?: string
          user_id: string
        }
        Update: {
          access_reason?: string | null
          accessed_user_id?: string | null
          client_id?: string | null
          data_type?: string
          id?: string
          ip_address?: unknown | null
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      system_metrics: {
        Row: {
          id: string
          metric_data: Json | null
          metric_type: string
          metric_value: number
          recorded_at: string
        }
        Insert: {
          id?: string
          metric_data?: Json | null
          metric_type: string
          metric_value: number
          recorded_at?: string
        }
        Update: {
          id?: string
          metric_data?: Json | null
          metric_type?: string
          metric_value?: number
          recorded_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          joined_at: string
          role_in_team: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          joined_at?: string
          role_in_team?: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          joined_at?: string
          role_in_team?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_performance: {
        Row: {
          bookings_count: number | null
          conversion_rate: number | null
          created_at: string
          id: string
          period_end: string
          period_start: string
          profit: number | null
          supervisor_id: string | null
          team_member_id: string
          updated_at: string
        }
        Insert: {
          bookings_count?: number | null
          conversion_rate?: number | null
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          profit?: number | null
          supervisor_id?: string | null
          team_member_id: string
          updated_at?: string
        }
        Update: {
          bookings_count?: number | null
          conversion_rate?: number | null
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          profit?: number | null
          supervisor_id?: string | null
          team_member_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          manager_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          manager_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          manager_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_behavior_analytics: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          data_points: number | null
          id: string
          last_calculated: string | null
          metadata: Json | null
          metric_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          data_points?: number | null
          id?: string
          last_calculated?: string | null
          metadata?: Json | null
          metric_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          data_points?: number | null
          id?: string
          last_calculated?: string | null
          metadata?: Json | null
          metric_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_cabinets: {
        Row: {
          created_at: string | null
          id: string
          last_accessed: string | null
          preferences: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_accessed?: string | null
          preferences?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_accessed?: string | null
          preferences?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_memories: {
        Row: {
          created_at: string
          id: string
          interaction_patterns: Json | null
          key_preferences: Json | null
          last_updated: string
          memory_version: number | null
          summary: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interaction_patterns?: Json | null
          key_preferences?: Json | null
          last_updated?: string
          memory_version?: number | null
          summary?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interaction_patterns?: Json | null
          key_preferences?: Json | null
          last_updated?: string
          memory_version?: number | null
          summary?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          commission_rate: number | null
          company_logo_asset_id: string | null
          created_at: string | null
          currency: string | null
          date_format: string | null
          default_class: string | null
          email_notifications: boolean | null
          id: string
          language: string | null
          push_notifications: boolean | null
          sms_notifications: boolean | null
          theme: string | null
          timezone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          commission_rate?: number | null
          company_logo_asset_id?: string | null
          created_at?: string | null
          currency?: string | null
          date_format?: string | null
          default_class?: string | null
          email_notifications?: boolean | null
          id?: string
          language?: string | null
          push_notifications?: boolean | null
          sms_notifications?: boolean | null
          theme?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          commission_rate?: number | null
          company_logo_asset_id?: string | null
          created_at?: string | null
          currency?: string | null
          date_format?: string | null
          default_class?: string | null
          email_notifications?: boolean | null
          id?: string
          language?: string | null
          push_notifications?: boolean | null
          sms_notifications?: boolean | null
          theme?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_company_logo_asset_id_fkey"
            columns: ["company_logo_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"] | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"] | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"] | null
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: unknown | null
          is_active: boolean
          last_activity: string
          mfa_verified: boolean
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean
          last_activity?: string
          mfa_verified?: boolean
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          is_active?: boolean
          last_activity?: string
          mfa_verified?: boolean
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_access_with_audit: {
        Args: {
          p_justification: string
          p_record_id: string
          p_table_name: string
        }
        Returns: boolean
      }
      admin_can_access_with_audit: {
        Args: {
          justification: string
          target_table: string
          target_user_id: string
        }
        Returns: boolean
      }
      advanced_rate_limit_check: {
        Args:
          | {
              p_endpoint: string
              p_identifier: string
              p_ip_address?: string
              p_max_requests?: number
              p_window_minutes?: number
            }
          | {
              p_endpoint: string
              p_identifier: string
              p_ip_address?: unknown
              p_max_requests?: number
              p_window_minutes?: number
            }
          | {
              p_endpoint: string
              p_max_requests?: number
              p_user_id: string
              p_window_minutes?: number
            }
        Returns: boolean
      }
      anonymize_client_data: {
        Args: { p_client_id: string; p_reason?: string }
        Returns: boolean
      }
      archive_old_communications: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      archive_old_emails: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      assign_client_to_agent: {
        Args: {
          p_agent_id: string
          p_assignment_reason?: string
          p_client_id: string
        }
        Returns: undefined
      }
      assign_request_to_agent: {
        Args: { p_agent_id?: string; p_request_id: string }
        Returns: boolean
      }
      audit_client_access: {
        Args: {
          p_access_type: string
          p_client_id: string
          p_client_owner: string
        }
        Returns: undefined
      }
      automated_data_retention_cleanup: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      automated_security_cleanup: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      block_suspicious_ip: {
        Args: { p_block_duration?: unknown; p_ip_address: unknown }
        Returns: boolean
      }
      calculate_agent_performance: {
        Args: { p_agent_id: string; p_end_date: string; p_start_date: string }
        Returns: Json
      }
      calculate_passenger_totals: {
        Args: {
          p_adult_markup?: number
          p_adult_net_price?: number
          p_adults_count?: number
          p_child_markup?: number
          p_child_net_price?: number
          p_children_count?: number
          p_infant_markup?: number
          p_infant_net_price?: number
          p_infants_count?: number
        }
        Returns: Json
      }
      calculate_security_metrics: {
        Args: { p_time_window_hours?: number }
        Returns: Json
      }
      can_access_client: {
        Args: { p_accessing_user_id: string; p_client_user_id: string }
        Returns: boolean
      }
      can_access_client_data: {
        Args: { client_id: string }
        Returns: boolean
      }
      can_access_client_data_enhanced: {
        Args: { client_id?: string; target_user_id: string }
        Returns: boolean
      }
      can_access_client_data_secure: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      can_access_client_data_ultra_strict: {
        Args: { p_client_id: string; p_target_user_id: string }
        Returns: boolean
      }
      can_access_financial_data: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      can_access_gmail_credentials_enhanced: {
        Args: { p_target_user_id: string }
        Returns: boolean
      }
      can_access_gmail_integration: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      can_access_profile_ultra_strict: {
        Args: { profile_user_id: string }
        Returns: boolean
      }
      can_access_request: {
        Args: { assigned_to_id: string; request_user_id: string }
        Returns: boolean
      }
      can_access_satisfaction_scores: {
        Args: { target_agent_id: string; target_client_id: string }
        Returns: boolean
      }
      can_access_sensitive_client_fields: {
        Args: { target_client_id: string }
        Returns: boolean
      }
      can_manage_teams: {
        Args: { _user_id: string }
        Returns: boolean
      }
      can_modify_data: {
        Args: { _resource_user_id: string; _user_id: string }
        Returns: boolean
      }
      check_advanced_rate_limit: {
        Args: {
          p_endpoint: string
          p_identifier: string
          p_ip_address?: unknown
          p_max_requests?: number
          p_window_minutes?: number
        }
        Returns: boolean
      }
      check_edge_function_rate_limit: {
        Args: {
          p_function_name: string
          p_identifier: string
          p_max_requests?: number
          p_window_minutes?: number
        }
        Returns: boolean
      }
      check_enhanced_rate_limit: {
        Args: {
          p_max_requests?: number
          p_operation: string
          p_user_id?: string
          p_window_seconds?: number
        }
        Returns: boolean
      }
      check_rate_limit: {
        Args: {
          p_endpoint: string
          p_identifier: string
          p_max_requests?: number
          p_window_minutes?: number
        }
        Returns: boolean
      }
      classify_sensitive_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_blocked_ips: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_oauth_tokens: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_sessions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_oauth_state_tokens: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_conversations: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_security_events: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_audit_log: {
        Args: {
          p_new_values?: Json
          p_old_values?: Json
          p_operation: string
          p_record_id?: string
          p_table_name: string
        }
        Returns: undefined
      }
      create_notification: {
        Args: {
          p_action_url?: string
          p_message: string
          p_priority?: string
          p_related_id?: string
          p_related_type?: string
          p_title: string
          p_type?: string
          p_user_id: string
        }
        Returns: string
      }
      debug_gmail_credentials_state: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      decrypt_gmail_token: {
        Args: { encrypted_token: string }
        Returns: string
      }
      detect_security_anomalies: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      detect_security_threats: {
        Args: { p_user_id: string }
        Returns: Json
      }
      detect_session_anomaly: {
        Args:
          | {
              p_current_fingerprint: string
              p_ip_address?: string
              p_user_agent?: string
              p_user_id: string
            }
          | {
              p_current_fingerprint: string
              p_ip_address?: unknown
              p_user_agent?: string
              p_user_id: string
            }
          | {
              p_current_fingerprint?: string
              p_ip_address?: string
              p_user_agent?: string
            }
        Returns: Json
      }
      detect_suspicious_activity: {
        Args: {
          p_action_count: number
          p_time_window: unknown
          p_user_id: string
        }
        Returns: boolean
      }
      emergency_admin_access: {
        Args: {
          business_justification: string
          record_id: string
          supervisor_approval_code: string
          table_name: string
        }
        Returns: boolean
      }
      emergency_client_access: {
        Args:
          | {
              p_client_id: string
              p_incident_id?: string
              p_justification: string
            }
          | { p_client_id: string; p_justification: string }
        Returns: {
          email: string
          emergency_access_granted: boolean
          first_name: string
          id: string
          last_name: string
          phone: string
        }[]
      }
      emergency_client_access_with_approval: {
        Args: {
          p_approver_id: string
          p_client_id: string
          p_emergency_reason: string
          p_incident_reference?: string
        }
        Returns: Json
      }
      generate_compliance_report: {
        Args: {
          p_end_date?: string
          p_report_type?: string
          p_start_date?: string
        }
        Returns: Json
      }
      generate_device_fingerprint: {
        Args: {
          p_browser: string
          p_device_type: string
          p_language?: string
          p_metadata?: Json
          p_os: string
          p_screen_resolution?: string
          p_timezone?: string
          p_user_id: string
        }
        Returns: string
      }
      generate_oauth_state_token: {
        Args: Record<PropertyKey, never> | { p_user_id: string }
        Returns: string
      }
      generate_sample_dashboard_data: {
        Args: { p_agent_id: string }
        Returns: Json
      }
      generate_secure_client_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_airline_rbds: {
        Args: { airline_uuid: string }
        Returns: {
          booking_class_code: string
          booking_priority: number
          class_description: string
          created_at: string
          effective_from: string
          effective_until: string
          id: string
          is_active: boolean
          service_class: string
          updated_at: string
        }[]
      }
      get_airline_with_logo: {
        Args: { p_iata_code: string }
        Returns: {
          alliance: string
          country: string
          iata_code: string
          id: string
          logo_url: string
          name: string
        }[]
      }
      get_analytics_data: {
        Args:
          | { p_agent_id?: string; p_end_date?: string; p_start_date?: string }
          | {
              p_end_date: string
              p_start_date: string
              p_user_id: string
              p_user_role: string
            }
          | {
              p_end_date?: string
              p_start_date?: string
              p_user_id: string
              p_user_role?: string
            }
        Returns: Json
      }
      get_asset_by_url: {
        Args: { p_url: string }
        Returns: {
          asset_category: string
          file_name: string
          file_path: string
          id: string
          metadata: Json
          tags: Json
        }[]
      }
      get_cities_with_airports: {
        Args: Record<PropertyKey, never>
        Returns: {
          airport_count: number
          city: string
          country: string
        }[]
      }
      get_city_suggestions: {
        Args: { partial_name: string; suggestion_limit?: number }
        Returns: {
          airport_count: number
          city: string
          country: string
        }[]
      }
      get_client_access_audit: {
        Args: { limit_records?: number; offset_records?: number }
        Returns: {
          accessing_user_id: string
          accessing_user_name: string
          accessing_user_role: Database["public"]["Enums"]["app_role"]
          client_id: string
          event_timestamp: string
          event_type: string
          id: string
          justification: string
          severity: string
          target_user_id: string
        }[]
      }
      get_client_data_secure: {
        Args:
          | {
              p_business_justification?: string
              p_client_id: string
              p_fields?: string[]
            }
          | { p_client_id: string; p_include_sensitive?: boolean }
        Returns: Json
      }
      get_client_decrypted_preview: {
        Args: { p_client_id: string }
        Returns: {
          client_id: string
          data_classification: string
          has_encrypted_passport: boolean
          has_encrypted_payment: boolean
          has_encrypted_ssn: boolean
          last_sensitive_update: string
        }[]
      }
      get_client_sensitive: {
        Args: { p_client_id: string }
        Returns: {
          encrypted_passport_number: string
          encrypted_payment_info: Json
          encrypted_ssn: string
          id: string
        }[]
      }
      get_client_sensitive_data: {
        Args: { p_client_id: string }
        Returns: {
          encrypted_passport_number: string
          encrypted_payment_info: Json
          encrypted_ssn: string
          id: string
        }[]
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_dashboard_stats: {
        Args: {
          p_role?: Database["public"]["Enums"]["app_role"]
          p_user_id?: string
        }
        Returns: Json
      }
      get_encryption_status: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_gmail_integration_status: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_option_review_for_booking: {
        Args: { p_client_token: string }
        Returns: {
          client_id: string
          client_token: string
          created_at: string
          id: string
          metadata: Json
          quote_ids: string[]
          request_id: string
          review_status: string
          token_expires_at: string
          token_used: boolean
          updated_at: string
          user_id: string
        }[]
      }
      get_option_reviews_by_token: {
        Args: { p_client_token: string }
        Returns: {
          client_id: string
          client_token: string
          created_at: string
          id: string
          metadata: Json | null
          quote_ids: string[]
          request_id: string | null
          review_status: string
          token_expires_at: string | null
          token_used: boolean | null
          updated_at: string
          user_id: string
        }[]
      }
      get_request_details: {
        Args: { request_id: string }
        Returns: {
          adults_count: number
          assigned_to: string
          assignment_status: string
          budget_range: string
          children_count: number
          class_preference: string
          client_company: string
          client_email: string
          client_first_name: string
          client_id: string
          client_last_name: string
          client_phone: string
          client_preferred_class: string
          created_at: string
          departure_date: string
          destination: string
          id: string
          infants_count: number
          notes: string
          origin: string
          priority: string
          request_type: string
          return_date: string
          segments: Json
          special_requirements: string
          status: string
          updated_at: string
          user_id: string
        }[]
      }
      get_secure_client_view: {
        Args: Record<PropertyKey, never>
        Returns: {
          client_type: string
          company: string
          created_at: string
          data_classification: string
          date_of_birth: string
          email_masked: string
          first_name: string
          id: string
          last_name: string
          last_trip_date: string
          notes: string
          passport_status: string
          payment_status: string
          phone_masked: string
          preferred_class: string
          ssn_status: string
          total_bookings: number
          total_spent: number
          updated_at: string
          user_id: string
        }[]
      }
      get_security_dashboard: {
        Args: Record<PropertyKey, never>
        Returns: {
          auth_events_24h: number
          critical_events: number
          events_last_24h: number
          high_events: number
          last_security_event: string
          low_events: number
          medium_events: number
          unauthorized_attempts_24h: number
        }[]
      }
      get_security_dashboard_metrics: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_security_metrics: {
        Args: { time_period?: unknown }
        Returns: Json
      }
      get_security_status: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_system_health_status: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_user_requests: {
        Args: { target_user_id?: string }
        Returns: {
          adults_count: number
          assigned_to: string
          assignment_status: string
          children_count: number
          client_email: string
          client_first_name: string
          client_id: string
          client_last_name: string
          created_at: string
          departure_date: string
          destination_airport: string
          id: string
          infants_count: number
          origin_airport: string
          priority: string
          return_date: string
          status: string
          updated_at: string
          user_id: string
        }[]
      }
      get_user_teams: {
        Args: { _user_id: string }
        Returns: {
          team_id: string
        }[]
      }
      grant_emergency_access: {
        Args: {
          p_client_id: string
          p_duration?: unknown
          p_emergency_type?: string
          p_justification: string
        }
        Returns: string
      }
      handle_email_sync_status: {
        Args:
          | {
              p_folder_name: string
              p_gmail_history_id?: string
              p_last_sync_at: string
              p_last_sync_count?: number
              p_user_id: string
            }
          | {
              p_folder_name: string
              p_gmail_history_id?: string
              p_last_sync_count?: number
              p_user_id: string
            }
        Returns: undefined
      }
      has_admin_role: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      has_business_role: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      has_elevated_role: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      has_management_role: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      has_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: boolean
      }
      has_security_admin_role: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      health_check: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      is_authenticated_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_base64: {
        Args: { p_text: string }
        Returns: boolean
      }
      is_base64_flexible: {
        Args: { p_text: string }
        Returns: boolean
      }
      is_business_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_ip_blocked: {
        Args: { p_ip_address: unknown }
        Returns: boolean
      }
      is_team_manager: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      is_valid_token_format: {
        Args: { token_text: string }
        Returns: boolean
      }
      log_admin_data_access: {
        Args: {
          p_justification: string
          p_record_id: string
          p_table_name: string
          p_target_user_id?: string
        }
        Returns: boolean
      }
      log_client_access: {
        Args: {
          p_access_type: string
          p_business_justification?: string
          p_client_id: string
          p_fields_accessed?: string[]
        }
        Returns: undefined
      }
      log_client_data_access: {
        Args: {
          p_access_type: string
          p_client_id: string
          p_justification?: string
        }
        Returns: undefined
      }
      log_critical_access: {
        Args: {
          p_operation: string
          p_record_id?: string
          p_table_name: string
        }
        Returns: undefined
      }
      log_critical_data_access: {
        Args: {
          p_new_values?: Json
          p_old_values?: Json
          p_operation: string
          p_record_id: string
          p_table_name: string
        }
        Returns: undefined
      }
      log_data_access_audit: {
        Args: {
          p_access_type?: string
          p_classification?: string
          p_justification?: string
          p_record_id?: string
          p_table_name: string
        }
        Returns: undefined
      }
      log_failed_access_attempt: {
        Args: { p_attempted_user_id?: string; p_resource: string }
        Returns: undefined
      }
      log_gmail_credential_event: {
        Args: { p_details?: Json; p_event_type: string; p_user_id: string }
        Returns: undefined
      }
      log_security_event: {
        Args: { p_details?: Json; p_event_type: string; p_severity: string }
        Returns: undefined
      }
      log_security_event_safe: {
        Args: {
          p_details?: Json
          p_event_type: string
          p_severity?: string
          p_user_id?: string
        }
        Returns: undefined
      }
      log_security_monitoring: {
        Args: {
          p_client_id: string
          p_details?: Json
          p_event_type: string
          p_severity?: string
          p_user_id: string
        }
        Returns: undefined
      }
      log_sensitive_data_access: {
        Args: {
          p_accessed_user_id: string
          p_data_type: string
          p_justification?: string
        }
        Returns: undefined
      }
      mask_client_data: {
        Args: {
          p_client_data: Json
          p_user_role?: Database["public"]["Enums"]["app_role"]
        }
        Returns: Json
      }
      mask_sensitive_data: {
        Args: { p_data: Json } | { p_data: string; p_field_type?: string }
        Returns: Json
      }
      mask_sensitive_field: {
        Args: { field_type?: string; field_value: string }
        Returns: string
      }
      merge_cities: {
        Args: {
          source_cities: Json
          target_city: string
          target_country: string
        }
        Returns: number
      }
      migrate_existing_assets: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      monitor_sensitive_access: {
        Args: {
          p_access_type: string
          p_record_id?: string
          p_table_name: string
        }
        Returns: undefined
      }
      rotate_gmail_tokens: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      search_aircraft_models: {
        Args: { page_limit?: number; page_offset?: number; search_term: string }
        Returns: {
          aliases: string[]
          category: string
          code: string
          created_at: string
          display_label: string
          family: string
          icon_url: string
          id: string
          manufacturer: string
          model: string
          total_count: number
          updated_at: string
        }[]
      }
      search_airlines: {
        Args: { page_limit?: number; page_offset?: number; search_term: string }
        Returns: {
          alliance: string
          country: string
          created_at: string
          iata_code: string
          icao_code: string
          id: string
          logo_url: string
          name: string
          rbd_count: number
          total_count: number
        }[]
      }
      search_airports: {
        Args: { page_limit?: number; page_offset?: number; search_term: string }
        Returns: {
          city: string
          country: string
          created_at: string
          iata_code: string
          icao_code: string
          id: string
          latitude: number
          longitude: number
          name: string
          priority: number
          timezone: string
          total_count: number
        }[]
      }
      search_airports_grouped: {
        Args: { page_limit?: number; page_offset?: number; search_term: string }
        Returns: {
          city: string
          city_airport_count: number
          country: string
          created_at: string
          iata_code: string
          icao_code: string
          id: string
          latitude: number
          longitude: number
          name: string
          priority: number
          timezone: string
          total_count: number
        }[]
      }
      search_booking_classes: {
        Args: { page_limit?: number; page_offset?: number; search_term: string }
        Returns: {
          active: boolean
          airline_iata: string
          airline_id: string
          airline_name: string
          booking_class_code: string
          booking_priority: number
          class_description: string
          created_at: string
          id: string
          service_class: string
          total_count: number
          updated_at: string
        }[]
      }
      secure_communication_access: {
        Args:
          | { email_id: string }
          | { p_client_id?: string; p_operation?: string; p_user_id: string }
        Returns: boolean
      }
      secure_financial_data_access: {
        Args:
          | { booking_id: string }
          | {
              p_justification?: string
              p_operation: string
              p_record_id: string
              p_table_name: string
            }
        Returns: boolean
      }
      simple_log_event: {
        Args: {
          p_details?: Json
          p_event_type: string
          p_severity?: string
          p_user_id: string
        }
        Returns: undefined
      }
      simple_session_check: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      test_function_connectivity: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      test_gmail_oauth_setup: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      update_agent_performance_metrics: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_airline_logo: {
        Args: { p_airline_id: string; p_logo_url: string }
        Returns: undefined
      }
      update_behavior_analytics: {
        Args: {
          p_confidence_score: number
          p_data_points?: number
          p_metadata?: Json
          p_metric_name: string
          p_user_id: string
        }
        Returns: undefined
      }
      update_client_encrypted_field: {
        Args: { p_client_id: string; p_field_name: string; p_new_value: string }
        Returns: boolean
      }
      update_client_memory: {
        Args: {
          p_client_id: string
          p_interaction_summary: string
          p_pain_points?: Json
          p_preferences?: Json
          p_user_id: string
        }
        Returns: undefined
      }
      update_user_memory: {
        Args: {
          p_interaction_type?: string
          p_new_context: string
          p_user_id: string
        }
        Returns: undefined
      }
      validate_audit_integrity: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      validate_booking_access: {
        Args: { p_access_type?: string; p_booking_id: string }
        Returns: boolean
      }
      validate_business_hours_access: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      validate_communication_access: {
        Args: { p_communication_type?: string; p_user_id: string }
        Returns: boolean
      }
      validate_credential_access: {
        Args: { p_credential_type?: string; p_user_id: string }
        Returns: boolean
      }
      validate_data_classification_access: {
        Args: {
          p_data_classification: string
          p_required_role?: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      validate_encryption_format: {
        Args: { p_encrypted_data: string; p_field_name: string }
        Returns: boolean
      }
      validate_field_encryption: {
        Args: { encrypted_data: string; field_name: string }
        Returns: boolean
      }
      validate_financial_access: {
        Args: { p_access_type?: string; p_quote_id: string }
        Returns: boolean
      }
      validate_oauth_state_token: {
        Args: { p_state_token: string }
        Returns: string
      }
      validate_password_strength: {
        Args: { password: string }
        Returns: boolean
      }
      validate_pii_access: {
        Args: {
          p_client_id: string
          p_field_name: string
          p_justification?: string
        }
        Returns: boolean
      }
      validate_secure_session: {
        Args: { p_device_fingerprint: string; p_session_token: string }
        Returns: boolean
      }
      validate_security_isolation: {
        Args: Record<PropertyKey, never>
        Returns: {
          has_isolation: boolean
          policy_count: number
          security_status: string
          table_name: string
        }[]
      }
      validate_session_access: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      validate_session_security: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      verify_gmail_credentials: {
        Args: { p_user_id: string }
        Returns: Json
      }
      verify_security_configuration: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      zero_trust_client_access: {
        Args:
          | {
              p_client_id: string
              p_justification?: string
              p_operation: string
            }
          | { p_client_id: string; p_operation: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "manager"
        | "supervisor"
        | "gds_expert"
        | "agent"
        | "user"
      security_event_type:
        | "login_attempt"
        | "login_success"
        | "login_failure"
        | "logout"
        | "password_change"
        | "account_locked"
        | "account_unlocked"
        | "mfa_enabled"
        | "mfa_disabled"
        | "permission_granted"
        | "permission_denied"
        | "data_access"
        | "data_modification"
        | "data_deletion"
        | "export_request"
        | "api_key_created"
        | "api_key_revoked"
        | "session_expired"
        | "suspicious_activity"
        | "brute_force_attempt"
        | "rate_limit_exceeded"
        | "unauthorized_access_attempt"
        | "sensitive_data_access"
        | "encryption_failure"
        | "decryption_failure"
        | "backup_created"
        | "backup_restored"
        | "system_configuration_changed"
        | "user_role_changed"
        | "client_data_accessed"
        | "client_data_modified"
        | "communication_accessed"
        | "gmail_oauth_initiated"
        | "gmail_oauth_success"
        | "gmail_oauth_failure"
        | "email_sync_started"
        | "email_sync_completed"
        | "email_sync_failed"
        | "captcha_verified"
        | "captcha_failed"
        | "admin_action"
        | "emergency_access"
        | "gdpr_request"
        | "audit_log_accessed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "manager",
        "supervisor",
        "gds_expert",
        "agent",
        "user",
      ],
      security_event_type: [
        "login_attempt",
        "login_success",
        "login_failure",
        "logout",
        "password_change",
        "account_locked",
        "account_unlocked",
        "mfa_enabled",
        "mfa_disabled",
        "permission_granted",
        "permission_denied",
        "data_access",
        "data_modification",
        "data_deletion",
        "export_request",
        "api_key_created",
        "api_key_revoked",
        "session_expired",
        "suspicious_activity",
        "brute_force_attempt",
        "rate_limit_exceeded",
        "unauthorized_access_attempt",
        "sensitive_data_access",
        "encryption_failure",
        "decryption_failure",
        "backup_created",
        "backup_restored",
        "system_configuration_changed",
        "user_role_changed",
        "client_data_accessed",
        "client_data_modified",
        "communication_accessed",
        "gmail_oauth_initiated",
        "gmail_oauth_success",
        "gmail_oauth_failure",
        "email_sync_started",
        "email_sync_completed",
        "email_sync_failed",
        "captcha_verified",
        "captcha_failed",
        "admin_action",
        "emergency_access",
        "gdpr_request",
        "audit_log_accessed",
      ],
    },
  },
} as const
