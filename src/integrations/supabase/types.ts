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
      businesses: {
        Row: {
          active: boolean
          area: string
          capacity: string
          created_at: string
          hours: string
          id: string
          interests: string[]
          kind: string
          name: string
          note: string
          offer: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          area?: string
          capacity?: string
          created_at?: string
          hours?: string
          id?: string
          interests?: string[]
          kind?: string
          name: string
          note?: string
          offer?: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          area?: string
          capacity?: string
          created_at?: string
          hours?: string
          id?: string
          interests?: string[]
          kind?: string
          name?: string
          note?: string
          offer?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      credit_accounts: {
        Row: {
          balance: number
          boost_until: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          boost_until?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          boost_until?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_ledger: {
        Row: {
          actor_id: string | null
          amount: number
          created_at: string
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          amount: number
          created_at?: string
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          amount?: number
          created_at?: string
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      meetup_ideas: {
        Row: {
          bonus: string
          business_id: string
          created_at: string
          description: string
          id: string
          owner_id: string
          points: number
          status: string
          teia_size: string
          title: string
          welcoming: string
          when_text: string
        }
        Insert: {
          bonus?: string
          business_id: string
          created_at?: string
          description?: string
          id?: string
          owner_id: string
          points?: number
          status?: string
          teia_size?: string
          title: string
          welcoming?: string
          when_text?: string
        }
        Update: {
          bonus?: string
          business_id?: string
          created_at?: string
          description?: string
          id?: string
          owner_id?: string
          points?: number
          status?: string
          teia_size?: string
          title?: string
          welcoming?: string
          when_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetup_ideas_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          about: string
          city: string
          created_at: string
          id: string
          interests: string[]
          is_business: boolean
          nickname: string
          profile_mode: string
          updated_at: string
        }
        Insert: {
          about?: string
          city?: string
          created_at?: string
          id: string
          interests?: string[]
          is_business?: boolean
          nickname?: string
          profile_mode?: string
          updated_at?: string
        }
        Update: {
          about?: string
          city?: string
          created_at?: string
          id?: string
          interests?: string[]
          is_business?: boolean
          nickname?: string
          profile_mode?: string
          updated_at?: string
        }
        Relationships: []
      }
      radar_presence: {
        Row: {
          activity: string
          area: string
          place_name: string
          until: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity: string
          area?: string
          place_name: string
          until: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity?: string
          area?: string
          place_name?: string
          until?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      admin_adjust_credits: {
        Args: { _amount: number; _reason: string; _user_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      spend_boost: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
