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
      clients: {
        Row: {
          company: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string
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
          company?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email: string
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
          company?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string
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
          ck_fee_amount: number
          ck_fee_enabled: boolean
          client_id: string
          created_at: string
          fare_type: string
          id: string
          is_hidden: boolean
          markup: number
          net_price: number
          notes: string | null
          pseudo_city: string | null
          request_id: string
          route: string
          segments: Json
          status: string
          total_price: number
          total_segments: number
          updated_at: string
          user_id: string
          valid_until: string | null
        }
        Insert: {
          ck_fee_amount?: number
          ck_fee_enabled?: boolean
          client_id: string
          created_at?: string
          fare_type: string
          id?: string
          is_hidden?: boolean
          markup?: number
          net_price: number
          notes?: string | null
          pseudo_city?: string | null
          request_id: string
          route: string
          segments: Json
          status?: string
          total_price: number
          total_segments: number
          updated_at?: string
          user_id: string
          valid_until?: string | null
        }
        Update: {
          ck_fee_amount?: number
          ck_fee_enabled?: boolean
          client_id?: string
          created_at?: string
          fare_type?: string
          id?: string
          is_hidden?: boolean
          markup?: number
          net_price?: number
          notes?: string | null
          pseudo_city?: string | null
          request_id?: string
          route?: string
          segments?: Json
          status?: string
          total_price?: number
          total_segments?: number
          updated_at?: string
          user_id?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      requests: {
        Row: {
          budget_range: string | null
          class_preference: string | null
          client_id: string
          created_at: string | null
          departure_date: string
          destination: string
          id: string
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
          budget_range?: string | null
          class_preference?: string | null
          client_id: string
          created_at?: string | null
          departure_date: string
          destination: string
          id?: string
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
          budget_range?: string | null
          class_preference?: string | null
          client_id?: string
          created_at?: string | null
          departure_date?: string
          destination?: string
          id?: string
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
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
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
