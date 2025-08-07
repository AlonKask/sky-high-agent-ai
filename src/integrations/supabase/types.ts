export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
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
      clients: {
        Row: {
          client_type: string | null
          company: string | null
          created_at: string | null
          data_classification: string | null
          date_of_birth: string | null
          email: string
          encrypted_passport_number: string | null
          encrypted_payment_info: Json | null
          encrypted_ssn: string | null
          encryption_key_id: string | null
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
          client_type?: string | null
          company?: string | null
          created_at?: string | null
          data_classification?: string | null
          date_of_birth?: string | null
          email: string
          encrypted_passport_number?: string | null
          encrypted_payment_info?: Json | null
          encrypted_ssn?: string | null
          encryption_key_id?: string | null
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
          client_type?: string | null
          company?: string | null
          created_at?: string | null
          data_classification?: string | null
          date_of_birth?: string | null
          email?: string
          encrypted_passport_number?: string | null
          encrypted_payment_info?: Json | null
          encrypted_ssn?: string | null
          encryption_key_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "clients_encryption_key_id_fkey"
            columns: ["encryption_key_id"]
            isOneToOne: false
            referencedRelation: "encryption_keys"
            referencedColumns: ["id"]
          },
        ]
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
      email_exchanges: {
        Row: {
          attachments: Json | null
          bcc_emails: string[] | null
          body: string
          cc_emails: string[] | null
          client_id: string | null
          created_at: string
          direction: string
          email_type: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          received_at: string | null
          recipient_emails: string[]
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
          direction: string
          email_type?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          received_at?: string | null
          recipient_emails: string[]
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
          direction?: string
          email_type?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          received_at?: string | null
          recipient_emails?: string[]
          request_id?: string | null
          sender_email?: string
          status?: string
          subject?: string
          thread_id?: string | null
          updated_at?: string
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
          access_token: string
          created_at: string | null
          gmail_user_email: string
          id: string
          refresh_token: string | null
          scope: string | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          gmail_user_email: string
          id?: string
          refresh_token?: string | null
          scope?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          gmail_user_email?: string
          id?: string
          refresh_token?: string | null
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
          adult_net_price: number | null
          adult_price: number | null
          adults_count: number | null
          award_program: string | null
          child_net_price: number | null
          child_price: number | null
          children_count: number | null
          ck_fee_amount: number
          ck_fee_enabled: boolean
          client_id: string
          client_token: string | null
          content: string | null
          created_at: string
          fare_type: string
          format: string | null
          id: string
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
          adult_net_price?: number | null
          adult_price?: number | null
          adults_count?: number | null
          award_program?: string | null
          child_net_price?: number | null
          child_price?: number | null
          children_count?: number | null
          ck_fee_amount?: number
          ck_fee_enabled?: boolean
          client_id: string
          client_token?: string | null
          content?: string | null
          created_at?: string
          fare_type: string
          format?: string | null
          id?: string
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
          adult_net_price?: number | null
          adult_price?: number | null
          adults_count?: number | null
          award_program?: string | null
          child_net_price?: number | null
          child_price?: number | null
          children_count?: number | null
          ck_fee_amount?: number
          ck_fee_enabled?: boolean
          client_id?: string
          client_token?: string | null
          content?: string | null
          created_at?: string
          fare_type?: string
          format?: string | null
          id?: string
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
          created_at: string | null
          currency: string | null
          date_format: string | null
          default_class: string | null
          email_notifications: boolean | null
          gmail_access_token: string | null
          gmail_refresh_token: string | null
          gmail_token_expiry: string | null
          gmail_user_email: string | null
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
          created_at?: string | null
          currency?: string | null
          date_format?: string | null
          default_class?: string | null
          email_notifications?: boolean | null
          gmail_access_token?: string | null
          gmail_refresh_token?: string | null
          gmail_token_expiry?: string | null
          gmail_user_email?: string | null
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
          created_at?: string | null
          currency?: string | null
          date_format?: string | null
          default_class?: string | null
          email_notifications?: boolean | null
          gmail_access_token?: string | null
          gmail_refresh_token?: string | null
          gmail_token_expiry?: string | null
          gmail_user_email?: string | null
          id?: string
          language?: string | null
          push_notifications?: boolean | null
          sms_notifications?: boolean | null
          theme?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      archive_old_communications: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      archive_old_emails: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      can_manage_teams: {
        Args: { _user_id: string }
        Returns: boolean
      }
      can_modify_data: {
        Args: { _user_id: string; _resource_user_id: string }
        Returns: boolean
      }
      cleanup_old_conversations: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_audit_log: {
        Args: {
          p_table_name: string
          p_operation: string
          p_record_id?: string
          p_old_values?: Json
          p_new_values?: Json
        }
        Returns: undefined
      }
      create_notification: {
        Args: {
          p_user_id: string
          p_title: string
          p_message: string
          p_type?: string
          p_priority?: string
          p_action_url?: string
          p_related_id?: string
          p_related_type?: string
        }
        Returns: string
      }
      get_airline_rbds: {
        Args: { airline_uuid: string }
        Returns: {
          id: string
          booking_class_code: string
          service_class: string
          class_description: string
          booking_priority: number
          is_active: boolean
          effective_from: string
          effective_until: string
          created_at: string
          updated_at: string
        }[]
      }
      get_cities_with_airports: {
        Args: Record<PropertyKey, never>
        Returns: {
          city: string
          country: string
          airport_count: number
        }[]
      }
      get_city_suggestions: {
        Args: { partial_name: string; suggestion_limit?: number }
        Returns: {
          city: string
          country: string
          airport_count: number
        }[]
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_teams: {
        Args: { _user_id: string }
        Returns: {
          team_id: string
        }[]
      }
      handle_email_sync_status: {
        Args: {
          p_user_id: string
          p_folder_name: string
          p_last_sync_at: string
          p_last_sync_count: number
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      health_check: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      is_team_manager: {
        Args: { _user_id: string; _team_id: string }
        Returns: boolean
      }
      log_security_event: {
        Args: {
          p_event_type: string
          p_severity: string
          p_details?: Json
          p_user_id?: string
        }
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
      search_airlines: {
        Args: { search_term: string; page_limit?: number; page_offset?: number }
        Returns: {
          id: string
          iata_code: string
          icao_code: string
          name: string
          country: string
          alliance: string
          logo_url: string
          created_at: string
          rbd_count: number
          total_count: number
        }[]
      }
      search_airports: {
        Args: { search_term: string; page_limit?: number; page_offset?: number }
        Returns: {
          id: string
          iata_code: string
          icao_code: string
          name: string
          city: string
          country: string
          latitude: number
          longitude: number
          timezone: string
          priority: number
          created_at: string
          total_count: number
        }[]
      }
      search_airports_grouped: {
        Args: { search_term: string; page_limit?: number; page_offset?: number }
        Returns: {
          id: string
          iata_code: string
          icao_code: string
          name: string
          city: string
          country: string
          latitude: number
          longitude: number
          timezone: string
          priority: number
          created_at: string
          city_airport_count: number
          total_count: number
        }[]
      }
      search_booking_classes: {
        Args: { search_term: string; page_limit?: number; page_offset?: number }
        Returns: {
          id: string
          booking_class_code: string
          service_class: string
          class_description: string
          booking_priority: number
          active: boolean
          airline_id: string
          airline_name: string
          airline_iata: string
          created_at: string
          updated_at: string
          total_count: number
        }[]
      }
      update_client_memory: {
        Args: {
          p_user_id: string
          p_client_id: string
          p_interaction_summary: string
          p_preferences?: Json
          p_pain_points?: Json
        }
        Returns: undefined
      }
      update_user_memory: {
        Args: {
          p_user_id: string
          p_new_context: string
          p_interaction_type?: string
        }
        Returns: undefined
      }
      validate_password_strength: {
        Args: { password: string }
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
    },
  },
} as const
