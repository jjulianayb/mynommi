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
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: []
      }
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
      connections: {
        Row: {
          accepted_at: string | null
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
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
      credit_purchases: {
        Row: {
          amount_total: number | null
          created_at: string
          credits: number
          currency: string | null
          environment: string
          id: string
          price_id: string
          stripe_session_id: string
          user_id: string
        }
        Insert: {
          amount_total?: number | null
          created_at?: string
          credits: number
          currency?: string | null
          environment?: string
          id?: string
          price_id: string
          stripe_session_id: string
          user_id: string
        }
        Update: {
          amount_total?: number | null
          created_at?: string
          credits?: number
          currency?: string | null
          environment?: string
          id?: string
          price_id?: string
          stripe_session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          followed_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string
          followed_id: string
          follower_id: string
        }
        Update: {
          created_at?: string
          followed_id?: string
          follower_id?: string
        }
        Relationships: []
      }
      invite_boosts: {
        Row: {
          created_at: string
          id: string
          invite_ref: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_ref: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_ref?: string
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
      post_comments: {
        Row: {
          author: string
          author_id: string
          body: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          author?: string
          author_id: string
          body: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          author?: string
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_media: {
        Row: {
          id: string
          kind: string
          path: string
          position: number
          post_id: string
        }
        Insert: {
          id?: string
          kind: string
          path: string
          position?: number
          post_id: string
        }
        Update: {
          id?: string
          kind?: string
          path?: string
          position?: number
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string
          kind: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          kind?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          kind?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          location: string
          status: string
          teia_id: number | null
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          location?: string
          status?: string
          teia_id?: number | null
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          location?: string
          status?: string
          teia_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_teia_id_fkey"
            columns: ["teia_id"]
            isOneToOne: false
            referencedRelation: "teias"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          about: string
          avatar_url: string
          city: string
          created_at: string
          goals: string[]
          id: string
          interests: string[]
          is_business: boolean
          nickname: string
          profile_mode: string
          show_counts: boolean
          updated_at: string
          visibility: Json
          wall_approval: boolean
        }
        Insert: {
          about?: string
          avatar_url?: string
          city?: string
          created_at?: string
          goals?: string[]
          id: string
          interests?: string[]
          is_business?: boolean
          nickname?: string
          profile_mode?: string
          show_counts?: boolean
          updated_at?: string
          visibility?: Json
          wall_approval?: boolean
        }
        Update: {
          about?: string
          avatar_url?: string
          city?: string
          created_at?: string
          goals?: string[]
          id?: string
          interests?: string[]
          is_business?: boolean
          nickname?: string
          profile_mode?: string
          show_counts?: boolean
          updated_at?: string
          visibility?: Json
          wall_approval?: boolean
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
      reports: {
        Row: {
          created_at: string
          id: string
          note: string
          reason: string
          reporter_id: string
          status: string
          target_teia: number | null
          target_user: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string
          reason: string
          reporter_id: string
          status?: string
          target_teia?: number | null
          target_user?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          note?: string
          reason?: string
          reporter_id?: string
          status?: string
          target_teia?: number | null
          target_user?: string | null
        }
        Relationships: []
      }
      teia_members: {
        Row: {
          joined_at: string
          nickname: string
          teia_key: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          nickname?: string
          teia_key: string
          user_id: string
        }
        Update: {
          joined_at?: string
          nickname?: string
          teia_key?: string
          user_id?: string
        }
        Relationships: []
      }
      teia_messages: {
        Row: {
          author: string
          body: string | null
          created_at: string
          id: string
          sender_id: string
          sticker: number | null
          teia_key: string
        }
        Insert: {
          author?: string
          body?: string | null
          created_at?: string
          id?: string
          sender_id: string
          sticker?: number | null
          teia_key: string
        }
        Update: {
          author?: string
          body?: string | null
          created_at?: string
          id?: string
          sender_id?: string
          sticker?: number | null
          teia_key?: string
        }
        Relationships: []
      }
      teia_rsvps: {
        Row: {
          created_at: string
          teia_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          teia_id: number
          user_id: string
        }
        Update: {
          created_at?: string
          teia_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teia_rsvps_teia_id_fkey"
            columns: ["teia_id"]
            isOneToOne: false
            referencedRelation: "teias"
            referencedColumns: ["id"]
          },
        ]
      }
      teias: {
        Row: {
          capacity: number | null
          category: string | null
          city: string
          created_at: string
          created_by: string
          creator_nickname: string
          id: number
          kind: string
          mode: string
          name: string
          place: string
          starts_at: string | null
          when_text: string
        }
        Insert: {
          capacity?: number | null
          category?: string | null
          city?: string
          created_at?: string
          created_by: string
          creator_nickname?: string
          id?: never
          kind?: string
          mode?: string
          name: string
          place?: string
          starts_at?: string | null
          when_text?: string
        }
        Update: {
          capacity?: number | null
          category?: string | null
          city?: string
          created_at?: string
          created_by?: string
          creator_nickname?: string
          id?: never
          kind?: string
          mode?: string
          name?: string
          place?: string
          starts_at?: string | null
          when_text?: string
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
      wall_items: {
        Row: {
          author: string
          author_id: string
          body: string | null
          created_at: string
          id: string
          status: string
          sticker: number | null
          target_id: string
        }
        Insert: {
          author?: string
          author_id: string
          body?: string | null
          created_at?: string
          id?: string
          status?: string
          sticker?: number | null
          target_id: string
        }
        Update: {
          author?: string
          author_id?: string
          body?: string | null
          created_at?: string
          id?: string
          status?: string
          sticker?: number | null
          target_id?: string
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
      can_view_post: { Args: { _post: string }; Returns: boolean }
      grant_purchased_credits: {
        Args: {
          _amount: number
          _credits: number
          _currency: string
          _env: string
          _price_id: string
          _session_id: string
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_blocked_between: { Args: { _a: string; _b: string }; Returns: boolean }
      is_teia_creator: {
        Args: { _teia: number; _user: string }
        Returns: boolean
      }
      is_teia_member: {
        Args: { _teia: string; _user: string }
        Returns: boolean
      }
      list_teias: {
        Args: { _creator?: string; _id?: number }
        Returns: {
          capacity: number
          category: string
          city: string
          created_at: string
          creator_nickname: string
          going_count: number
          i_am_going: boolean
          id: number
          kind: string
          mode: string
          name: string
          place: string
          starts_at: string
          when_text: string
        }[]
      }
      profile_stats: {
        Args: { _user: string }
        Returns: {
          connections: number
          followers: number
          following: number
          posts: number
          teias: number
          visible: boolean
        }[]
      }
      spend_boost: { Args: never; Returns: string }
      spend_invite_boost: { Args: { _invite_ref: string }; Returns: number }
      teia_has_room: { Args: { _teia: number }; Returns: boolean }
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
