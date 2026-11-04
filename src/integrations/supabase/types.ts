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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      alert_log: {
        Row: {
          id: number
          kind: string
          offer_id: string
          price: number
          sent_at: string
          user_id: string
        }
        Insert: {
          id?: number
          kind: string
          offer_id: string
          price: number
          sent_at?: string
          user_id: string
        }
        Update: {
          id?: number
          kind?: string
          offer_id?: string
          price?: number
          sent_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_log_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      gpus: {
        Row: {
          brand: string
          created_at: string
          id: string
          last_refreshed_at: string | null
          match_token: string
          name: string
          search_query: string
        }
        Insert: {
          brand: string
          created_at?: string
          id?: string
          last_refreshed_at?: string | null
          match_token: string
          name: string
          search_query: string
        }
        Update: {
          brand?: string
          created_at?: string
          id?: string
          last_refreshed_at?: string | null
          match_token?: string
          name?: string
          search_query?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          first_seen_at: string
          gpu_id: string
          id: string
          in_stock: boolean
          last_checked_at: string
          old_price: number | null
          price: number
          store: string
          title: string
          url: string
        }
        Insert: {
          first_seen_at?: string
          gpu_id: string
          id?: string
          in_stock?: boolean
          last_checked_at?: string
          old_price?: number | null
          price: number
          store: string
          title: string
          url: string
        }
        Update: {
          first_seen_at?: string
          gpu_id?: string
          id?: string
          in_stock?: boolean
          last_checked_at?: string
          old_price?: number | null
          price?: number
          store?: string
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_gpu_id_fkey"
            columns: ["gpu_id"]
            isOneToOne: false
            referencedRelation: "gpus"
            referencedColumns: ["id"]
          },
        ]
      }
      price_history: {
        Row: {
          gpu_id: string
          id: number
          in_stock: boolean
          offer_id: string
          price: number
          recorded_at: string
        }
        Insert: {
          gpu_id: string
          id?: number
          in_stock?: boolean
          offer_id: string
          price: number
          recorded_at?: string
        }
        Update: {
          gpu_id?: string
          id?: number
          in_stock?: boolean
          offer_id?: string
          price?: number
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_history_gpu_id_fkey"
            columns: ["gpu_id"]
            isOneToOne: false
            referencedRelation: "gpus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_history_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      scrape_batches: {
        Row: {
          error: string | null
          id: string
          ingested_at: string | null
          started_at: string
          status: string
          url_count: number
        }
        Insert: {
          error?: string | null
          id: string
          ingested_at?: string | null
          started_at?: string
          status?: string
          url_count?: number
        }
        Update: {
          error?: string | null
          id?: string
          ingested_at?: string | null
          started_at?: string
          status?: string
          url_count?: number
        }
        Relationships: []
      }
      scrape_jobs: {
        Row: {
          gpu_id: string
          started_at: string
          store: string
          url: string
        }
        Insert: {
          gpu_id: string
          started_at?: string
          store: string
          url: string
        }
        Update: {
          gpu_id?: string
          started_at?: string
          store?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "scrape_jobs_gpu_id_fkey"
            columns: ["gpu_id"]
            isOneToOne: false
            referencedRelation: "gpus"
            referencedColumns: ["id"]
          },
        ]
      }
      store_status: {
        Row: {
          last_attempt_at: string | null
          last_error: string | null
          last_success_at: string | null
          store: string
        }
        Insert: {
          last_attempt_at?: string | null
          last_error?: string | null
          last_success_at?: string | null
          store: string
        }
        Update: {
          last_attempt_at?: string | null
          last_error?: string | null
          last_success_at?: string | null
          store?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          brands: string[]
          budget_max: number | null
          daily_report: boolean
          drop_threshold: number
          email: string | null
          refresh_hours: number
          stores: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          brands?: string[]
          budget_max?: number | null
          daily_report?: boolean
          drop_threshold?: number
          email?: string | null
          refresh_hours?: number
          stores?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          brands?: string[]
          budget_max?: number | null
          daily_report?: boolean
          drop_threshold?: number
          email?: string | null
          refresh_hours?: number
          stores?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          created_at: string
          gpu_id: string
          id: string
          max_price: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          gpu_id: string
          id?: string
          max_price?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          gpu_id?: string
          id?: string
          max_price?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_gpu_id_fkey"
            columns: ["gpu_id"]
            isOneToOne: false
            referencedRelation: "gpus"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
