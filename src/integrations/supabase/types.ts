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
      attendances: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          declared_at: string
          rewarded: boolean
          teia_id: number
          user_id: string
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          declared_at?: string
          rewarded?: boolean
          teia_id: number
          user_id: string
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          declared_at?: string
          rewarded?: boolean
          teia_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendances_teia_id_fkey"
            columns: ["teia_id"]
            isOneToOne: false
            referencedRelation: "teias"
            referencedColumns: ["id"]
          },
        ]
      }
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
      curtidas: {
        Row: {
          created_at: string
          de: string
          para: string
          resposta: string
        }
        Insert: {
          created_at?: string
          de: string
          para: string
          resposta: string
        }
        Update: {
          created_at?: string
          de?: string
          para?: string
          resposta?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
          sticker: number | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
          sticker?: number | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
          sticker?: number | null
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
      invites: {
        Row: {
          code: string
          created_at: string
          owner_id: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          owner_id: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          owner_id?: string
          used_at?: string | null
          used_by?: string | null
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
      notifications: {
        Row: {
          actor_id: string | null
          body: string
          created_at: string
          id: string
          kind: string
          post_id: string | null
          read_at: string | null
          teia_id: number | null
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          body?: string
          created_at?: string
          id?: string
          kind: string
          post_id?: string | null
          read_at?: string | null
          teia_id?: number | null
          user_id: string
        }
        Update: {
          actor_id?: string | null
          body?: string
          created_at?: string
          id?: string
          kind?: string
          post_id?: string | null
          read_at?: string | null
          teia_id?: number | null
          user_id?: string
        }
        Relationships: []
      }
      pedidos_de_tribo: {
        Row: {
          created_at: string
          recado: string
          status: string
          teia_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          recado?: string
          status?: string
          teia_id: number
          user_id: string
        }
        Update: {
          created_at?: string
          recado?: string
          status?: string
          teia_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_de_tribo_teia_id_fkey"
            columns: ["teia_id"]
            isOneToOne: false
            referencedRelation: "teias"
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
          anonymous: boolean
          author_id: string
          body: string
          created_at: string
          expires_at: string | null
          id: string
          location: string
          secret: boolean
          status: string
          teia_id: number | null
        }
        Insert: {
          anonymous?: boolean
          author_id: string
          body: string
          created_at?: string
          expires_at?: string | null
          id?: string
          location?: string
          secret?: boolean
          status?: string
          teia_id?: number | null
        }
        Update: {
          anonymous?: boolean
          author_id?: string
          body?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          location?: string
          secret?: boolean
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
          avatar_x: number
          avatar_y: number
          background_path: string
          city: string
          cover_path: string
          cover_x: number
          cover_y: number
          created_at: string
          goals: string[]
          id: string
          instagram: string
          interests: string[]
          is_business: boolean
          is_test: boolean
          looking_for: string
          nickname: string
          person_verified: boolean
          places: string[]
          profile_mode: string
          show_counts: boolean
          updated_at: string
          visibility: Json
          wall_approval: boolean
        }
        Insert: {
          about?: string
          avatar_url?: string
          avatar_x?: number
          avatar_y?: number
          background_path?: string
          city?: string
          cover_path?: string
          cover_x?: number
          cover_y?: number
          created_at?: string
          goals?: string[]
          id: string
          instagram?: string
          interests?: string[]
          is_business?: boolean
          is_test?: boolean
          looking_for?: string
          nickname?: string
          person_verified?: boolean
          places?: string[]
          profile_mode?: string
          show_counts?: boolean
          updated_at?: string
          visibility?: Json
          wall_approval?: boolean
        }
        Update: {
          about?: string
          avatar_url?: string
          avatar_x?: number
          avatar_y?: number
          background_path?: string
          city?: string
          cover_path?: string
          cover_x?: number
          cover_y?: number
          created_at?: string
          goals?: string[]
          id?: string
          instagram?: string
          interests?: string[]
          is_business?: boolean
          is_test?: boolean
          looking_for?: string
          nickname?: string
          person_verified?: boolean
          places?: string[]
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
          city: string
          lat: number | null
          lng: number | null
          place_name: string
          until: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity: string
          area?: string
          city?: string
          lat?: number | null
          lng?: number | null
          place_name: string
          until: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity?: string
          area?: string
          city?: string
          lat?: number | null
          lng?: number | null
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
      saved_stickers: {
        Row: {
          caption: string
          favorite: boolean
          id: string
          path: string | null
          source: string
          sticker_id: number | null
          tags: string[]
          used_at: string
          user_id: string
        }
        Insert: {
          caption?: string
          favorite?: boolean
          id?: string
          path?: string | null
          source: string
          sticker_id?: number | null
          tags?: string[]
          used_at?: string
          user_id: string
        }
        Update: {
          caption?: string
          favorite?: boolean
          id?: string
          path?: string | null
          source?: string
          sticker_id?: number | null
          tags?: string[]
          used_at?: string
          user_id?: string
        }
        Relationships: []
      }
      selos: {
        Row: {
          created_at: string
          de: string
          dono: string
          selo: string
        }
        Insert: {
          created_at?: string
          de: string
          dono: string
          selo: string
        }
        Update: {
          created_at?: string
          de?: string
          dono?: string
          selo?: string
        }
        Relationships: []
      }
      star_accounts: {
        Row: {
          balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      star_ledger: {
        Row: {
          amount: number
          created_at: string
          id: string
          reason: string
          teia_id: number | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          reason: string
          teia_id?: number | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reason?: string
          teia_id?: number | null
          user_id?: string
        }
        Relationships: []
      }
      stories: {
        Row: {
          audience: string
          author_id: string
          caption: string
          created_at: string
          expires_at: string
          id: string
          kind: string
          path: string
        }
        Insert: {
          audience?: string
          author_id: string
          caption?: string
          created_at?: string
          expires_at?: string
          id?: string
          kind: string
          path: string
        }
        Update: {
          audience?: string
          author_id?: string
          caption?: string
          created_at?: string
          expires_at?: string
          id?: string
          kind?: string
          path?: string
        }
        Relationships: []
      }
      story_views: {
        Row: {
          seen_at: string
          story_id: string
          viewer_id: string
        }
        Insert: {
          seen_at?: string
          story_id: string
          viewer_id: string
        }
        Update: {
          seen_at?: string
          story_id?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
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
      teia_removals: {
        Row: {
          created_at: string
          reason: string
          removed_by: string
          teia_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          reason?: string
          removed_by: string
          teia_id: number
          user_id: string
        }
        Update: {
          created_at?: string
          reason?: string
          removed_by?: string
          teia_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teia_removals_teia_id_fkey"
            columns: ["teia_id"]
            isOneToOne: false
            referencedRelation: "teias"
            referencedColumns: ["id"]
          },
        ]
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
          about: string
          audience: string
          background_path: string
          capacity: number | null
          category: string | null
          city: string
          cover_path: string
          cover_x: number
          cover_y: number
          created_at: string
          created_by: string
          creator_nickname: string
          entrada: string
          goal: number | null
          id: number
          is_test: boolean
          kind: string
          mode: string
          name: string
          official: boolean
          place: string
          rule: string
          starts_at: string | null
          when_text: string
          who_posts: string
        }
        Insert: {
          about?: string
          audience?: string
          background_path?: string
          capacity?: number | null
          category?: string | null
          city?: string
          cover_path?: string
          cover_x?: number
          cover_y?: number
          created_at?: string
          created_by: string
          creator_nickname?: string
          entrada?: string
          goal?: number | null
          id?: never
          is_test?: boolean
          kind?: string
          mode?: string
          name: string
          official?: boolean
          place?: string
          rule?: string
          starts_at?: string | null
          when_text?: string
          who_posts?: string
        }
        Update: {
          about?: string
          audience?: string
          background_path?: string
          capacity?: number | null
          category?: string | null
          city?: string
          cover_path?: string
          cover_x?: number
          cover_y?: number
          created_at?: string
          created_by?: string
          creator_nickname?: string
          entrada?: string
          goal?: number | null
          id?: never
          is_test?: boolean
          kind?: string
          mode?: string
          name?: string
          official?: boolean
          place?: string
          rule?: string
          starts_at?: string | null
          when_text?: string
          who_posts?: string
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
      avisar: {
        Args: {
          _actor: string
          _body: string
          _kind: string
          _post: string
          _teia: number
          _user: string
        }
        Returns: undefined
      }
      avisos_nao_lidos: { Args: never; Returns: number }
      can_view_post: { Args: { _post: string }; Returns: boolean }
      can_view_story: {
        Args: { _audience: string; _author: string }
        Returns: boolean
      }
      confirmar_presenca: {
        Args: { _quem: string; _teia: number }
        Returns: string
      }
      creditar_estrela: {
        Args: { _amount: number; _reason: string; _teia: number; _user: string }
        Returns: undefined
      }
      estive_no_role: {
        Args: { _teia: number; _user: string }
        Returns: boolean
      }
      fila_de_moderacao: {
        Args: { _status?: string }
        Returns: {
          created_at: string
          denuncias_contra: number
          id: string
          note: string
          reason: string
          reporter: string
          reporter_id: string
          status: string
          target_nome: string
          target_teia: number
          target_user: string
          teia_nome: string
        }[]
      }
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
          about: string
          audience: string
          capacity: number
          category: string
          city: string
          cover_path: string
          created_at: string
          creator_nickname: string
          going_count: number
          i_am_creator: boolean
          i_am_going: boolean
          i_am_member: boolean
          i_can_post: boolean
          id: number
          kind: string
          member_count: number
          mode: string
          name: string
          official: boolean
          place: string
          rule: string
          starts_at: string
          when_text: string
          who_posts: string
        }[]
      }
      minhas_conversas: {
        Args: never
        Returns: {
          avatar_url: string
          nao_lidas: number
          nickname: string
          outro_id: string
          ultima: string
          ultima_em: string
          ultima_minha: boolean
          ultima_sticker: number
        }[]
      }
      minhas_estrelas: {
        Args: never
        Returns: {
          ganhas_semana: number
          presencas: number
          saldo: number
        }[]
      }
      moderar_post: {
        Args: { _post: string; _remover: boolean }
        Returns: boolean
      }
      nao_lidas: { Args: never; Returns: number }
      pagina_pessoal: {
        Args: { _user: string }
        Returns: {
          about: string
          avatar_url: string
          avatar_x: number
          avatar_y: number
          background_path: string
          city: string
          cover_path: string
          cover_x: number
          cover_y: number
          desde: string
          id: string
          instagram: string
          interests: string[]
          looking_for: string
          nickname: string
          person_verified: boolean
          places: string[]
          profile_mode: string
          tribos_em_comum: string[]
        }[]
      }
      pedidos_da_tribo: {
        Args: { _teia: number }
        Returns: {
          avatar_url: string
          city: string
          nickname: string
          quando: string
          recado: string
          user_id: string
        }[]
      }
      peso_dos_interesses: {
        Args: never
        Returns: {
          interesse: string
          peso: number
        }[]
      }
      pessoas_para_combinar: {
        Args: { _limite?: number }
        Returns: {
          about: string
          afinidade: number
          avatar_url: string
          avatar_x: number
          avatar_y: number
          background_path: string
          city: string
          cover_path: string
          cover_x: number
          cover_y: number
          em_comum: string[]
          goals: string[]
          interests: string[]
          ja_me_curtiu: boolean
          looking_for: string
          mesma_cidade: boolean
          nickname: string
          person_verified: boolean
          places: string[]
          selos_do_povo: string[]
          selos_em_comum: string[]
          tribos_em_comum: number
          user_id: string
        }[]
      }
      pode_declarar_presenca: {
        Args: { _teia: number; _user: string }
        Returns: boolean
      }
      pode_falar_na_tribo: {
        Args: { _teia: number; _user: string }
        Returns: boolean
      }
      pode_ganhar_estrela: { Args: { _user: string }; Returns: boolean }
      pode_selar: { Args: { _de: string; _dono: string }; Returns: boolean }
      presenca_do_anfitriao: { Args: { _teia: number }; Returns: string }
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
      pulso_da_nommi: {
        Args: never
        Returns: {
          encontros_marcados: number
          entraram_semana: number
          mensagens_semana: number
          pessoas: number
          roles_abertos: number
          tribos: number
        }[]
      }
      purge_expired_stories: { Args: never; Returns: number }
      quem_tem_curiosidade: { Args: never; Returns: number }
      radar_nearby: {
        Args: { _km?: number; _lat: number; _lng: number }
        Returns: {
          activity: string
          area: string
          avatar_url: string
          city: string
          km: number
          nickname: string
          place_name: string
          user_id: string
        }[]
      }
      responder_pedido: {
        Args: { _aceitar: boolean; _quem: string; _teia: number }
        Returns: string
      }
      responder_pessoa: {
        Args: { _para: string; _sim: boolean }
        Returns: string
      }
      resumo_da_moderacao: {
        Args: never
        Returns: {
          abertas: number
          analisadas: number
          arquivadas: number
          pessoas_denunciadas: number
        }[]
      }
      sao_amigos: { Args: { _a: string; _b: string }; Returns: boolean }
      segredos_da_tribo: {
        Args: { _teia: number }
        Returns: {
          anonymous: boolean
          author_id: string
          avatar_url: string
          body: string
          created_at: string
          expires_at: string
          id: string
          mine: boolean
          nickname: string
        }[]
      }
      selos_do_perfil: {
        Args: { _user: string }
        Returns: {
          eu_dei: boolean
          quantos: number
          selo: string
        }[]
      }
      spend_boost: { Args: never; Returns: string }
      spend_invite_boost: { Args: { _invite_ref: string }; Returns: number }
      teia_has_room: { Args: { _teia: number }; Returns: boolean }
      tribo_e_aberta: { Args: { _teia: number }; Returns: boolean }
      tribos_para_mim: {
        Args: { _limite?: number }
        Returns: {
          about: string
          category: string
          city: string
          em_comum: number
          goal: number
          i_am_member: boolean
          id: number
          member_count: number
          name: string
        }[]
      }
      usar_convite: { Args: { _code: string }; Returns: boolean }
      ve_contas_de_teste: { Args: never; Returns: boolean }
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
