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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_user_notes: {
        Row: {
          created_at: string
          id: string
          note_text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note_text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note_text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_credits: {
        Row: {
          daily_limit: number
          daily_usage: number
          id: string
          total_usage: number
          updated_at: string | null
          usage_date: string
          user_id: string
        }
        Insert: {
          daily_limit?: number
          daily_usage?: number
          id?: string
          total_usage?: number
          updated_at?: string | null
          usage_date?: string
          user_id: string
        }
        Update: {
          daily_limit?: number
          daily_usage?: number
          id?: string
          total_usage?: number
          updated_at?: string | null
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_usage_logs: {
        Row: {
          action_type: string
          created_at: string
          id: string
          metadata: Json | null
          resume_id: string | null
          section: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          resume_id?: string | null
          section?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          resume_id?: string | null
          section?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_ai_usage_logs_resume"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          category: string
          created_at: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action: string
          category: string
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          category?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      bug_reports: {
        Row: {
          active_feature: string | null
          additional_context: string | null
          app_version: string | null
          component_stack: string | null
          created_at: string | null
          error_category: string | null
          error_message: string
          error_stack: string | null
          id: string
          recent_errors: Json | null
          route: string | null
          screen: string | null
          session_id: string | null
          status: string | null
          user_agent: string | null
          user_email: string
          user_id: string
        }
        Insert: {
          active_feature?: string | null
          additional_context?: string | null
          app_version?: string | null
          component_stack?: string | null
          created_at?: string | null
          error_category?: string | null
          error_message: string
          error_stack?: string | null
          id?: string
          recent_errors?: Json | null
          route?: string | null
          screen?: string | null
          session_id?: string | null
          status?: string | null
          user_agent?: string | null
          user_email: string
          user_id: string
        }
        Update: {
          active_feature?: string | null
          additional_context?: string | null
          app_version?: string | null
          component_stack?: string | null
          created_at?: string | null
          error_category?: string | null
          error_message?: string
          error_stack?: string | null
          id?: string
          recent_errors?: Json | null
          route?: string | null
          screen?: string | null
          session_id?: string | null
          status?: string | null
          user_agent?: string | null
          user_email?: string
          user_id?: string
        }
        Relationships: []
      }
      career_assessments: {
        Row: {
          completed_milestones: Json
          created_at: string | null
          id: string
          quiz_answers: Json
          result: Json
          resume_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_milestones?: Json
          created_at?: string | null
          id?: string
          quiz_answers?: Json
          result?: Json
          resume_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_milestones?: Json
          created_at?: string | null
          id?: string
          quiz_answers?: Json
          result?: Json
          resume_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_career_assessments_resume"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_inquiries: {
        Row: {
          app_version: string | null
          created_at: string | null
          id: string
          message: string
          route: string | null
          status: string | null
          subject: string
          user_agent: string | null
          user_email: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string | null
          id?: string
          message: string
          route?: string | null
          status?: string | null
          subject: string
          user_agent?: string | null
          user_email: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          created_at?: string | null
          id?: string
          message?: string
          route?: string | null
          status?: string | null
          subject?: string
          user_agent?: string | null
          user_email?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_requests: {
        Row: {
          created_at: string | null
          email: string
          id: string
          ip_address: string | null
          message: string
          metadata: Json | null
          subject: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          ip_address?: string | null
          message: string
          metadata?: Json | null
          subject?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          ip_address?: string | null
          message?: string
          metadata?: Json | null
          subject?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          id: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          coupon_id: string
          id?: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          coupon_id?: string
          id?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      cover_letters: {
        Row: {
          company: string | null
          content: string
          created_at: string | null
          id: string
          job_title: string
          resume_id: string | null
          template_style: string | null
          title: string | null
          tone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company?: string | null
          content: string
          created_at?: string | null
          id?: string
          job_title: string
          resume_id?: string | null
          template_style?: string | null
          title?: string | null
          tone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company?: string | null
          content?: string
          created_at?: string | null
          id?: string
          job_title?: string
          resume_id?: string | null
          template_style?: string | null
          title?: string | null
          tone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_cover_letters_resume"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          type: Database["public"]["Enums"]["credit_type_enum"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          type: Database["public"]["Enums"]["credit_type_enum"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          type?: Database["public"]["Enums"]["credit_type_enum"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number
          plan_days: number | null
          plan_override: string | null
          target_plan: string | null
          uses_count: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_type: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number
          plan_days?: number | null
          plan_override?: string | null
          target_plan?: string | null
          uses_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number
          plan_days?: number | null
          plan_override?: string | null
          target_plan?: string | null
          uses_count?: number
        }
        Relationships: []
      }
      feature_requests: {
        Row: {
          app_version: string | null
          created_at: string | null
          feature_description: string
          feature_title: string
          id: string
          route: string | null
          status: string | null
          user_agent: string | null
          user_email: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string | null
          feature_description: string
          feature_title: string
          id?: string
          route?: string | null
          status?: string | null
          user_agent?: string | null
          user_email: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          created_at?: string | null
          feature_description?: string
          feature_title?: string
          id?: string
          route?: string | null
          status?: string | null
          user_agent?: string | null
          user_email?: string
          user_id?: string
        }
        Relationships: []
      }
      interview_sessions: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          id: string
          improvements: Json | null
          interview_type: string | null
          job_description: string | null
          job_title: string | null
          messages: Json | null
          overall_score: number | null
          resume_id: string | null
          strengths: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          improvements?: Json | null
          interview_type?: string | null
          job_description?: string | null
          job_title?: string | null
          messages?: Json | null
          overall_score?: number | null
          resume_id?: string | null
          strengths?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          improvements?: Json | null
          interview_type?: string | null
          job_description?: string | null
          job_title?: string | null
          messages?: Json | null
          overall_score?: number | null
          resume_id?: string | null
          strengths?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_interview_sessions_resume"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          applied_at: string | null
          company: string
          cover_letter_id: string | null
          created_at: string | null
          deadline: string | null
          id: string
          job_id: string | null
          job_title: string
          notes: string | null
          remind_at: string | null
          resume_id: string | null
          status: string
          updated_at: string | null
          url: string | null
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          company: string
          cover_letter_id?: string | null
          created_at?: string | null
          deadline?: string | null
          id?: string
          job_id?: string | null
          job_title: string
          notes?: string | null
          remind_at?: string | null
          resume_id?: string | null
          status?: string
          updated_at?: string | null
          url?: string | null
          user_id: string
        }
        Update: {
          applied_at?: string | null
          company?: string
          cover_letter_id?: string | null
          created_at?: string | null
          deadline?: string | null
          id?: string
          job_id?: string | null
          job_title?: string
          notes?: string | null
          remind_at?: string | null
          resume_id?: string | null
          status?: string
          updated_at?: string | null
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_job_applications_resume"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_cover_letter_id_fkey"
            columns: ["cover_letter_id"]
            isOneToOne: false
            referencedRelation: "cover_letters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          company: string
          company_logo: string | null
          created_at: string
          description: string
          id: string
          is_saved: boolean
          job_type: string
          location: string
          posted_date: string
          requirements: string
          salary_range: string | null
          source_url: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company: string
          company_logo?: string | null
          created_at?: string
          description?: string
          id?: string
          is_saved?: boolean
          job_type?: string
          location?: string
          posted_date?: string
          requirements?: string
          salary_range?: string | null
          source_url?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string
          company_logo?: string | null
          created_at?: string
          description?: string
          id?: string
          is_saved?: boolean
          job_type?: string
          location?: string
          posted_date?: string
          requirements?: string
          salary_range?: string | null
          source_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          deleted_at: string | null
          email: string
          full_name: string
          id: string
          is_deleted: boolean | null
          metadata: Json | null
          status: string
          subject: string
          type: Database["public"]["Enums"]["message_type_enum"]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          deleted_at?: string | null
          email: string
          full_name: string
          id?: string
          is_deleted?: boolean | null
          metadata?: Json | null
          status?: string
          subject: string
          type?: Database["public"]["Enums"]["message_type_enum"]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          deleted_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_deleted?: boolean | null
          metadata?: Json | null
          status?: string
          subject?: string
          type?: Database["public"]["Enums"]["message_type_enum"]
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      portfolio_history: {
        Row: {
          created_at: string | null
          id: string
          portfolio_data: Json
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          portfolio_data: Json
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          portfolio_data?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      portfolio_settings: {
        Row: {
          accent_color: string | null
          created_at: string | null
          enabled: boolean | null
          extras: Json | null
          font: string | null
          id: string
          layout: string | null
          meta_description: string | null
          meta_title: string | null
          resume_id: string | null
          sections: Json | null
          style: string | null
          sync_mode: string | null
          theme: Database["public"]["Enums"]["theme_enum"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accent_color?: string | null
          created_at?: string | null
          enabled?: boolean | null
          extras?: Json | null
          font?: string | null
          id?: string
          layout?: string | null
          meta_description?: string | null
          meta_title?: string | null
          resume_id?: string | null
          sections?: Json | null
          style?: string | null
          sync_mode?: string | null
          theme?: Database["public"]["Enums"]["theme_enum"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accent_color?: string | null
          created_at?: string | null
          enabled?: boolean | null
          extras?: Json | null
          font?: string | null
          id?: string
          layout?: string | null
          meta_description?: string | null
          meta_title?: string | null
          resume_id?: string | null
          sections?: Json | null
          style?: string | null
          sync_mode?: string | null
          theme?: Database["public"]["Enums"]["theme_enum"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      portfolio_visits: {
        Row: {
          city: string | null
          country: string | null
          id: string
          referrer: string | null
          sections_viewed: Json
          short_link_id: string | null
          time_spent_seconds: number | null
          username: string
          visited_at: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          id?: string
          referrer?: string | null
          sections_viewed?: Json
          short_link_id?: string | null
          time_spent_seconds?: number | null
          username: string
          visited_at?: string
        }
        Update: {
          city?: string | null
          country?: string | null
          id?: string
          referrer?: string | null
          sections_viewed?: Json
          short_link_id?: string | null
          time_spent_seconds?: number | null
          username?: string
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_visits_short_link_id_fkey"
            columns: ["short_link_id"]
            isOneToOne: false
            referencedRelation: "short_links"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: string
          availability_headline: string | null
          avatar_url: string | null
          career_level: Database["public"]["Enums"]["career_level_enum"] | null
          contact_email: string | null
          created_at: string | null
          deleted_at: string | null
          digest_enabled: boolean | null
          full_name: string | null
          github_last_synced: string | null
          github_projects_cache: Json | null
          github_url: string | null
          hired_at: string | null
          id: string
          industry: Database["public"]["Enums"]["industry_enum"] | null
          is_deleted: boolean | null
          is_suspended: boolean
          job_title: string | null
          last_active_at: string | null
          last_login_date: string | null
          linkedin_url: string | null
          location: string | null
          login_streak: number | null
          onboarding_completed: boolean | null
          open_to_work: boolean | null
          phone_number: string | null
          portfolio_accent_color: string | null
          portfolio_bio: string | null
          portfolio_enabled: boolean | null
          portfolio_extras: Json | null
          portfolio_font: string | null
          portfolio_layout: string | null
          portfolio_meta_description: string | null
          portfolio_meta_title: string | null
          portfolio_resume_id: string | null
          portfolio_sections: Json | null
          portfolio_style: string | null
          portfolio_sync_mode: string | null
          portfolio_theme: string | null
          profile_completed: boolean | null
          suspension_reason: string | null
          twitter_url: string | null
          updated_at: string | null
          user_id: string
          username: string | null
          views: number | null
          website_url: string | null
        }
        Insert: {
          account_type?: string
          availability_headline?: string | null
          avatar_url?: string | null
          career_level?: Database["public"]["Enums"]["career_level_enum"] | null
          contact_email?: string | null
          created_at?: string | null
          deleted_at?: string | null
          digest_enabled?: boolean | null
          full_name?: string | null
          github_last_synced?: string | null
          github_projects_cache?: Json | null
          github_url?: string | null
          hired_at?: string | null
          id?: string
          industry?: Database["public"]["Enums"]["industry_enum"] | null
          is_deleted?: boolean | null
          is_suspended?: boolean
          job_title?: string | null
          last_active_at?: string | null
          last_login_date?: string | null
          linkedin_url?: string | null
          location?: string | null
          login_streak?: number | null
          onboarding_completed?: boolean | null
          open_to_work?: boolean | null
          phone_number?: string | null
          portfolio_accent_color?: string | null
          portfolio_bio?: string | null
          portfolio_enabled?: boolean | null
          portfolio_extras?: Json | null
          portfolio_font?: string | null
          portfolio_layout?: string | null
          portfolio_meta_description?: string | null
          portfolio_meta_title?: string | null
          portfolio_resume_id?: string | null
          portfolio_sections?: Json | null
          portfolio_style?: string | null
          portfolio_sync_mode?: string | null
          portfolio_theme?: string | null
          profile_completed?: boolean | null
          suspension_reason?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          user_id: string
          username?: string | null
          views?: number | null
          website_url?: string | null
        }
        Update: {
          account_type?: string
          availability_headline?: string | null
          avatar_url?: string | null
          career_level?: Database["public"]["Enums"]["career_level_enum"] | null
          contact_email?: string | null
          created_at?: string | null
          deleted_at?: string | null
          digest_enabled?: boolean | null
          full_name?: string | null
          github_last_synced?: string | null
          github_projects_cache?: Json | null
          github_url?: string | null
          hired_at?: string | null
          id?: string
          industry?: Database["public"]["Enums"]["industry_enum"] | null
          is_deleted?: boolean | null
          is_suspended?: boolean
          job_title?: string | null
          last_active_at?: string | null
          last_login_date?: string | null
          linkedin_url?: string | null
          location?: string | null
          login_streak?: number | null
          onboarding_completed?: boolean | null
          open_to_work?: boolean | null
          phone_number?: string | null
          portfolio_accent_color?: string | null
          portfolio_bio?: string | null
          portfolio_enabled?: boolean | null
          portfolio_extras?: Json | null
          portfolio_font?: string | null
          portfolio_layout?: string | null
          portfolio_meta_description?: string | null
          portfolio_meta_title?: string | null
          portfolio_resume_id?: string | null
          portfolio_sections?: Json | null
          portfolio_style?: string | null
          portfolio_sync_mode?: string | null
          portfolio_theme?: string | null
          profile_completed?: boolean | null
          suspension_reason?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          user_id?: string
          username?: string | null
          views?: number | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_portfolio_resume_id_fkey"
            columns: ["portfolio_resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      resignation_letters: {
        Row: {
          additions: Json | null
          checklist_progress: Json | null
          company: string | null
          content: string
          created_at: string | null
          id: string
          last_working_day: string | null
          notice_period: string | null
          position: string | null
          reason: string | null
          recipient_name: string | null
          template_style: string | null
          title: string | null
          tone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          additions?: Json | null
          checklist_progress?: Json | null
          company?: string | null
          content: string
          created_at?: string | null
          id?: string
          last_working_day?: string | null
          notice_period?: string | null
          position?: string | null
          reason?: string | null
          recipient_name?: string | null
          template_style?: string | null
          title?: string | null
          tone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          additions?: Json | null
          checklist_progress?: Json | null
          company?: string | null
          content?: string
          created_at?: string | null
          id?: string
          last_working_day?: string | null
          notice_period?: string | null
          position?: string | null
          reason?: string | null
          recipient_name?: string | null
          template_style?: string | null
          title?: string | null
          tone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      resume_certifications: {
        Row: {
          created_at: string | null
          expiry_date: string | null
          id: string
          issue_date: string | null
          issuer: string | null
          name: string
          resume_id: string
          updated_at: string | null
          url: string | null
        }
        Insert: {
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuer?: string | null
          name: string
          resume_id: string
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuer?: string | null
          name?: string
          resume_id?: string
          updated_at?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resume_certifications_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      resume_educations: {
        Row: {
          created_at: string | null
          degree: string | null
          description: string | null
          end_date: string | null
          field_of_study: string | null
          id: string
          is_current: boolean | null
          location: string | null
          resume_id: string
          school: string
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          degree?: string | null
          description?: string | null
          end_date?: string | null
          field_of_study?: string | null
          id?: string
          is_current?: boolean | null
          location?: string | null
          resume_id: string
          school: string
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          degree?: string | null
          description?: string | null
          end_date?: string | null
          field_of_study?: string | null
          id?: string
          is_current?: boolean | null
          location?: string | null
          resume_id?: string
          school?: string
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resume_educations_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      resume_experiences: {
        Row: {
          company: string
          created_at: string | null
          description: string | null
          end_date: string | null
          highlights: string[] | null
          id: string
          is_current: boolean | null
          location: string | null
          position: string
          resume_id: string
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          company: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          highlights?: string[] | null
          id?: string
          is_current?: boolean | null
          location?: string | null
          position: string
          resume_id: string
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          company?: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          highlights?: string[] | null
          id?: string
          is_current?: boolean | null
          location?: string | null
          position?: string
          resume_id?: string
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resume_experiences_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      resume_shares: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          password: string | null
          resume_id: string
          token: string
          user_id: string
          view_count: number
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          password?: string | null
          resume_id: string
          token: string
          user_id: string
          view_count?: number
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          password?: string | null
          resume_id?: string
          token?: string
          user_id?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_resume_shares_resume"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      resume_skills: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          level: string | null
          name: string
          resume_id: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          level?: string | null
          name: string
          resume_id: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          level?: string | null
          name?: string
          resume_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resume_skills_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      resume_versions: {
        Row: {
          change_summary: string | null
          created_at: string | null
          id: string
          resume_id: string
          snapshot: Json
          user_id: string
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          created_at?: string | null
          id?: string
          resume_id: string
          snapshot: Json
          user_id: string
          version_number?: number
        }
        Update: {
          change_summary?: string | null
          created_at?: string | null
          id?: string
          resume_id?: string
          snapshot?: Json
          user_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_resume_versions_resume"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      resumes: {
        Row: {
          awards: Json | null
          certifications: Json | null
          contact_info: Json
          created_at: string | null
          customization: Json | null
          deleted_at: string | null
          education: Json | null
          experience: Json | null
          hobbies: Json | null
          id: string
          is_deleted: boolean | null
          is_primary: boolean | null
          job_match_score: number | null
          job_url: string | null
          languages: Json | null
          parent_resume_id: string | null
          projects: Json | null
          publications: Json | null
          references: Json | null
          skills: Json | null
          summary: string | null
          target_company: string | null
          target_job_title: string | null
          template_id: string | null
          title: string
          updated_at: string | null
          user_id: string
          volunteering: Json | null
        }
        Insert: {
          awards?: Json | null
          certifications?: Json | null
          contact_info?: Json
          created_at?: string | null
          customization?: Json | null
          deleted_at?: string | null
          education?: Json | null
          experience?: Json | null
          hobbies?: Json | null
          id?: string
          is_deleted?: boolean | null
          is_primary?: boolean | null
          job_match_score?: number | null
          job_url?: string | null
          languages?: Json | null
          parent_resume_id?: string | null
          projects?: Json | null
          publications?: Json | null
          references?: Json | null
          skills?: Json | null
          summary?: string | null
          target_company?: string | null
          target_job_title?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string | null
          user_id: string
          volunteering?: Json | null
        }
        Update: {
          awards?: Json | null
          certifications?: Json | null
          contact_info?: Json
          created_at?: string | null
          customization?: Json | null
          deleted_at?: string | null
          education?: Json | null
          experience?: Json | null
          hobbies?: Json | null
          id?: string
          is_deleted?: boolean | null
          is_primary?: boolean | null
          job_match_score?: number | null
          job_url?: string | null
          languages?: Json | null
          parent_resume_id?: string | null
          projects?: Json | null
          publications?: Json | null
          references?: Json | null
          skills?: Json | null
          summary?: string | null
          target_company?: string | null
          target_job_title?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          volunteering?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "resumes_parent_resume_id_fkey"
            columns: ["parent_resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      rpc_rate_limits: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          ip_address: string
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          ip_address: string
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          ip_address?: string
        }
        Relationships: []
      }
      share_comments: {
        Row: {
          author_name: string
          content: string
          created_at: string
          id: string
          is_resolved: boolean
          section: string | null
          share_id: string
        }
        Insert: {
          author_name: string
          content: string
          created_at?: string
          id?: string
          is_resolved?: boolean
          section?: string | null
          share_id: string
        }
        Update: {
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          is_resolved?: boolean
          section?: string | null
          share_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_share_comments_share"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "resume_shares"
            referencedColumns: ["id"]
          },
        ]
      }
      short_links: {
        Row: {
          click_count: number
          created_at: string
          id: string
          label: string
          owner_user_id: string
          portfolio_username: string | null
          target_url: string | null
        }
        Insert: {
          click_count?: number
          created_at?: string
          id: string
          label?: string
          owner_user_id: string
          portfolio_username?: string | null
          target_url?: string | null
        }
        Update: {
          click_count?: number
          created_at?: string
          id?: string
          label?: string
          owner_user_id?: string
          portfolio_username?: string | null
          target_url?: string | null
        }
        Relationships: []
      }
      social_links: {
        Row: {
          created_at: string | null
          id: string
          platform_key: string
          updated_at: string | null
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          platform_key: string
          updated_at?: string | null
          url: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          platform_key?: string
          updated_at?: string | null
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      store_screenshots: {
        Row: {
          created_at: string
          headline: string
          id: string
          image_url: string
          name: string
        }
        Insert: {
          created_at?: string
          headline: string
          id?: string
          image_url: string
          name: string
        }
        Update: {
          created_at?: string
          headline?: string
          id?: string
          image_url?: string
          name?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          ai_credits_monthly: number | null
          ai_credits_topup: number | null
          coupon_code: string | null
          coupon_discount_percent: number | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_name: string
          plan_updated_at: string | null
          plan_updated_by: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_expires_at: string | null
          trial_plan: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_credits_monthly?: number | null
          ai_credits_topup?: number | null
          coupon_code?: string | null
          coupon_discount_percent?: number | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_name?: string
          plan_updated_at?: string | null
          plan_updated_by?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_expires_at?: string | null
          trial_plan?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_credits_monthly?: number | null
          ai_credits_topup?: number | null
          coupon_code?: string | null
          coupon_discount_percent?: number | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_name?: string
          plan_updated_at?: string | null
          plan_updated_by?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_expires_at?: string | null
          trial_plan?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      tailor_history: {
        Row: {
          applied_sections: Json | null
          company: string | null
          created_at: string | null
          id: string
          job_description: string | null
          job_title: string
          resume_id: string | null
          score_after: number | null
          score_before: number | null
          tailor_result: Json
          user_id: string
        }
        Insert: {
          applied_sections?: Json | null
          company?: string | null
          created_at?: string | null
          id?: string
          job_description?: string | null
          job_title: string
          resume_id?: string | null
          score_after?: number | null
          score_before?: number | null
          tailor_result?: Json
          user_id: string
        }
        Update: {
          applied_sections?: Json | null
          company?: string | null
          created_at?: string | null
          id?: string
          job_description?: string | null
          job_title?: string
          resume_id?: string | null
          score_after?: number | null
          score_before?: number | null
          tailor_result?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tailor_history_resume"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_pool_profiles: {
        Row: {
          availability: string | null
          created_at: string | null
          experience_level: string | null
          full_name: string | null
          headline: string | null
          id: string
          last_viewed_at: string | null
          location: string | null
          opted_in: boolean | null
          opted_in_at: string | null
          profile_slug: string | null
          remote_ok: boolean | null
          resume_text: string | null
          skills: string[] | null
          updated_at: string | null
          user_id: string
          view_count: number | null
        }
        Insert: {
          availability?: string | null
          created_at?: string | null
          experience_level?: string | null
          full_name?: string | null
          headline?: string | null
          id?: string
          last_viewed_at?: string | null
          location?: string | null
          opted_in?: boolean | null
          opted_in_at?: string | null
          profile_slug?: string | null
          remote_ok?: boolean | null
          resume_text?: string | null
          skills?: string[] | null
          updated_at?: string | null
          user_id: string
          view_count?: number | null
        }
        Update: {
          availability?: string | null
          created_at?: string | null
          experience_level?: string | null
          full_name?: string | null
          headline?: string | null
          id?: string
          last_viewed_at?: string | null
          location?: string | null
          opted_in?: boolean | null
          opted_in_at?: string | null
          profile_slug?: string | null
          remote_ok?: boolean | null
          resume_text?: string | null
          skills?: string[] | null
          updated_at?: string | null
          user_id?: string
          view_count?: number | null
        }
        Relationships: []
      }
      talent_pool_views: {
        Row: {
          id: string
          profile_id: string
          viewed_at: string | null
          viewer_company_id: string | null
        }
        Insert: {
          id?: string
          profile_id: string
          viewed_at?: string | null
          viewer_company_id?: string | null
        }
        Update: {
          id?: string
          profile_id?: string
          viewed_at?: string | null
          viewer_company_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "talent_pool_views_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "talent_pool_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      token_exchanges: {
        Row: {
          created_at: string
          error_code: string | null
          id: string
          kinde_sub: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          id?: string
          kinde_sub: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_code?: string | null
          id?: string
          kinde_sub?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_api_keys: {
        Row: {
          base_url: string | null
          created_at: string
          encrypted_key: string
          id: string
          key_tier: string
          model: string | null
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          base_url?: string | null
          created_at?: string
          encrypted_key: string
          id?: string
          key_tier?: string
          model?: string | null
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          base_url?: string | null
          created_at?: string
          encrypted_key?: string
          id?: string
          key_tier?: string
          model?: string | null
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_gamification: {
        Row: {
          created_at: string | null
          hired_at: string | null
          id: string
          last_active_at: string | null
          last_login_date: string | null
          login_streak: number | null
          updated_at: string | null
          user_id: string
          views: number | null
        }
        Insert: {
          created_at?: string | null
          hired_at?: string | null
          id?: string
          last_active_at?: string | null
          last_login_date?: string | null
          login_streak?: number | null
          updated_at?: string | null
          user_id: string
          views?: number | null
        }
        Update: {
          created_at?: string | null
          hired_at?: string | null
          id?: string
          last_active_at?: string | null
          last_login_date?: string | null
          login_streak?: number | null
          updated_at?: string | null
          user_id?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_gamification_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          ai_provider: string | null
          biometric_enabled: boolean | null
          biometric_timeout: number | null
          default_template: string | null
          id: string
          onboarding_flags: Json | null
          pdf_defaults: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_provider?: string | null
          biometric_enabled?: boolean | null
          biometric_timeout?: number | null
          default_template?: string | null
          id?: string
          onboarding_flags?: Json | null
          pdf_defaults?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_provider?: string | null
          biometric_enabled?: boolean | null
          biometric_timeout?: number | null
          default_template?: string | null
          id?: string
          onboarding_flags?: Json | null
          pdf_defaults?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wisehire_applications: {
        Row: {
          applicant_email: string
          applicant_name: string
          applicant_user_id: string
          applied_at: string | null
          candidate_id: string | null
          cover_note: string | null
          created_at: string | null
          id: string
          resume_text: string | null
          role_id: string
          status: string | null
        }
        Insert: {
          applicant_email: string
          applicant_name: string
          applicant_user_id: string
          applied_at?: string | null
          candidate_id?: string | null
          cover_note?: string | null
          created_at?: string | null
          id?: string
          resume_text?: string | null
          role_id: string
          status?: string | null
        }
        Update: {
          applicant_email?: string
          applicant_name?: string
          applicant_user_id?: string
          applied_at?: string | null
          candidate_id?: string | null
          cover_note?: string | null
          created_at?: string | null
          id?: string
          resume_text?: string | null
          role_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wisehire_applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "wisehire_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wisehire_applications_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "wisehire_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      wisehire_bulk_screen_jobs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          owner_id: string
          results: Json | null
          resume_count: number
          role_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          owner_id: string
          results?: Json | null
          resume_count?: number
          role_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          owner_id?: string
          results?: Json | null
          resume_count?: number
          role_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "wisehire_bulk_screen_jobs_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "wisehire_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      wisehire_mask_sessions: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          results: Json
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          results?: Json
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          results?: Json
        }
        Relationships: []
      }
      wisehire_candidate_briefs: {
        Row: {
          ai_model_used: string | null
          candidate_id: string
          concerns: string[] | null
          created_at: string
          employment_notes: string | null
          id: string
          interview_questions: string[] | null
          is_byok: boolean
          match_score: number | null
          owner_id: string
          role_id: string | null
          share_token: string
          share_token_active: boolean
          strengths: string[] | null
        }
        Insert: {
          ai_model_used?: string | null
          candidate_id: string
          concerns?: string[] | null
          created_at?: string
          employment_notes?: string | null
          id?: string
          interview_questions?: string[] | null
          is_byok?: boolean
          match_score?: number | null
          owner_id: string
          role_id?: string | null
          share_token?: string
          share_token_active?: boolean
          strengths?: string[] | null
        }
        Update: {
          ai_model_used?: string | null
          candidate_id?: string
          concerns?: string[] | null
          created_at?: string
          employment_notes?: string | null
          id?: string
          interview_questions?: string[] | null
          is_byok?: boolean
          match_score?: number | null
          owner_id?: string
          role_id?: string | null
          share_token?: string
          share_token_active?: boolean
          strengths?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "wisehire_candidate_briefs_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "wisehire_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wisehire_candidate_briefs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wisehire_candidate_briefs_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "wisehire_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      wisehire_candidate_notes: {
        Row: {
          author_id: string
          body: string
          candidate_id: string
          created_at: string | null
          id: string
          owner_id: string
          pinned: boolean | null
          tag: string | null
        }
        Insert: {
          author_id: string
          body: string
          candidate_id: string
          created_at?: string | null
          id?: string
          owner_id: string
          pinned?: boolean | null
          tag?: string | null
        }
        Update: {
          author_id?: string
          body?: string
          candidate_id?: string
          created_at?: string | null
          id?: string
          owner_id?: string
          pinned?: boolean | null
          tag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wisehire_candidate_notes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "wisehire_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      wisehire_candidates: {
        Row: {
          client_id: string | null
          created_at: string
          email: string | null
          id: string
          is_deleted: boolean
          name: string
          notes: string | null
          owner_id: string
          pipeline_stage: string
          resume_pdf_path: string | null
          resume_text: string | null
          role_id: string | null
          source: string | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_deleted?: boolean
          name: string
          notes?: string | null
          owner_id: string
          pipeline_stage?: string
          resume_pdf_path?: string | null
          resume_text?: string | null
          role_id?: string | null
          source?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_deleted?: boolean
          name?: string
          notes?: string | null
          owner_id?: string
          pipeline_stage?: string
          resume_pdf_path?: string | null
          resume_text?: string | null
          role_id?: string | null
          source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wisehire_candidates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "wisehire_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wisehire_candidates_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wisehire_candidates_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "wisehire_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      wisehire_clients: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          created_at: string | null
          id: string
          is_deleted: boolean | null
          name: string
          notes: string | null
          owner_id: string
          updated_at: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          name: string
          notes?: string | null
          owner_id: string
          updated_at?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          name?: string
          notes?: string | null
          owner_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      wisehire_companies: {
        Row: {
          created_at: string
          id: string
          monthly_volume: string | null
          name: string
          onboarding_completed: boolean
          owner_id: string
          role_types: string[] | null
          size: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          monthly_volume?: string | null
          name: string
          onboarding_completed?: boolean
          owner_id: string
          role_types?: string[] | null
          size: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          monthly_volume?: string | null
          name?: string
          onboarding_completed?: boolean
          owner_id?: string
          role_types?: string[] | null
          size?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wisehire_companies_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wisehire_invites: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          is_revoked: boolean
          recipient_email: string
          token: string
          token_signature: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          is_revoked?: boolean
          recipient_email: string
          token: string
          token_signature: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          is_revoked?: boolean
          recipient_email?: string
          token?: string
          token_signature?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wisehire_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wisehire_outreach_emails: {
        Row: {
          body: string
          candidate_id: string
          created_at: string | null
          id: string
          owner_id: string
          resend_message_id: string | null
          status: string | null
          subject: string
          to_email: string
        }
        Insert: {
          body: string
          candidate_id: string
          created_at?: string | null
          id?: string
          owner_id: string
          resend_message_id?: string | null
          status?: string | null
          subject: string
          to_email: string
        }
        Update: {
          body?: string
          candidate_id?: string
          created_at?: string | null
          id?: string
          owner_id?: string
          resend_message_id?: string | null
          status?: string | null
          subject?: string
          to_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "wisehire_outreach_emails_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "wisehire_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      wisehire_pipeline_events: {
        Row: {
          candidate_id: string
          from_stage: string | null
          id: string
          moved_at: string
          moved_by: string | null
          owner_id: string
          to_stage: string
        }
        Insert: {
          candidate_id: string
          from_stage?: string | null
          id?: string
          moved_at?: string
          moved_by?: string | null
          owner_id: string
          to_stage: string
        }
        Update: {
          candidate_id?: string
          from_stage?: string | null
          id?: string
          moved_at?: string
          moved_by?: string | null
          owner_id?: string
          to_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "wisehire_pipeline_events_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "wisehire_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wisehire_pipeline_events_moved_by_fkey"
            columns: ["moved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wisehire_pipeline_events_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wisehire_roles: {
        Row: {
          client_id: string | null
          company_id: string
          created_at: string
          employment_type: string | null
          id: string
          is_deleted: boolean
          jd_text: string | null
          location: string | null
          owner_id: string
          published: boolean | null
          remote_ok: boolean | null
          salary_max: number | null
          salary_min: number | null
          slug: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          company_id: string
          created_at?: string
          employment_type?: string | null
          id?: string
          is_deleted?: boolean
          jd_text?: string | null
          location?: string | null
          owner_id: string
          published?: boolean | null
          remote_ok?: boolean | null
          salary_max?: number | null
          salary_min?: number | null
          slug?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          company_id?: string
          created_at?: string
          employment_type?: string | null
          id?: string
          is_deleted?: boolean
          jd_text?: string | null
          location?: string | null
          owner_id?: string
          published?: boolean | null
          remote_ok?: boolean | null
          salary_max?: number | null
          salary_min?: number | null
          slug?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wisehire_roles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "wisehire_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wisehire_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "wisehire_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wisehire_roles_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wisehire_saved_searches: {
        Row: {
          created_at: string | null
          filters: Json
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string | null
          filters?: Json
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string | null
          filters?: Json
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      wisehire_scorecard_templates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          owner_id: string
          questions: Json
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          owner_id: string
          questions?: Json
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          owner_id?: string
          questions?: Json
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      wisehire_scorecards: {
        Row: {
          brief_id: string | null
          candidate_id: string
          created_at: string
          id: string
          notes: string[]
          overall_score: number | null
          owner_id: string
          questions: string[]
          ratings: number[]
          share_token: string
          share_token_active: boolean
          submitted_at: string | null
        }
        Insert: {
          brief_id?: string | null
          candidate_id: string
          created_at?: string
          id?: string
          notes?: string[]
          overall_score?: number | null
          owner_id: string
          questions?: string[]
          ratings?: number[]
          share_token?: string
          share_token_active?: boolean
          submitted_at?: string | null
        }
        Update: {
          brief_id?: string | null
          candidate_id?: string
          created_at?: string
          id?: string
          notes?: string[]
          overall_score?: number | null
          owner_id?: string
          questions?: string[]
          ratings?: number[]
          share_token?: string
          share_token_active?: boolean
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wisehire_scorecards_brief_id_fkey"
            columns: ["brief_id"]
            isOneToOne: false
            referencedRelation: "wisehire_candidate_briefs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wisehire_scorecards_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "wisehire_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      wisehire_waitlist: {
        Row: {
          company_name: string
          company_size: string
          email: string
          id: string
          invited_at: string | null
          name: string
          notes: string | null
          submitted_at: string
        }
        Insert: {
          company_name: string
          company_size: string
          email: string
          id?: string
          invited_at?: string | null
          name: string
          notes?: string | null
          submitted_at?: string
        }
        Update: {
          company_name?: string
          company_size?: string
          email?: string
          id?: string
          invited_at?: string | null
          name?: string
          notes?: string | null
          submitted_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      user_api_keys_safe: {
        Row: {
          created_at: string | null
          id: string | null
          key_tier: string | null
          provider: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          key_tier?: string | null
          provider?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          key_tier?: string | null
          provider?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_share_comment: {
        Args: {
          p_author_name: string
          p_content: string
          p_section?: string
          p_share_token: string
        }
        Returns: Json
      }
      admin_grant_trial: {
        Args: { p_days: number; p_target_user_id: string; p_trial_plan: string }
        Returns: Json
      }
      admin_revoke_trial: { Args: { p_target_user_id: string }; Returns: Json }
      admin_set_credits: {
        Args: {
          p_bonus_credits?: number
          p_daily_limit?: number
          p_target_user_id: string
        }
        Returns: Json
      }
      admin_set_user_plan: {
        Args: {
          p_new_plan: string
          p_target_user_id: string
          p_updated_by?: string
        }
        Returns: Json
      }
      admin_suspend_user: {
        Args: {
          p_reason?: string
          p_suspend: boolean
          p_target_user_id: string
        }
        Returns: Json
      }
      atomic_attempt_and_deduct_credit: {
        Args: { p_amount?: number; p_plan_limit: number; p_user_id: string }
        Returns: Json
      }
      check_email_rate_limit: { Args: { client_ip: string }; Returns: boolean }
      check_username_available: {
        Args: { p_user_id: string; p_username: string }
        Returns: boolean
      }
      cleanup_stale_data: { Args: never; Returns: undefined }
      deduct_ai_credits: {
        Args: { amount_to_deduct: number; usage_description: string }
        Returns: Json
      }
      get_all_users_admin: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: Json
      }
      get_all_users_admin_v2: {
        Args: {
          p_filter_plan?: string
          p_filter_status?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_sort?: string
        }
        Returns: Json
      }
      get_app_settings: { Args: never; Returns: Json }
      get_clerk_user_id: { Args: never; Returns: string }
      get_my_plan: { Args: never; Returns: Json }
      get_portfolio_active_status: {
        Args: { p_username: string }
        Returns: string
      }
      get_portfolio_analytics: { Args: { p_username: string }; Returns: Json }
      get_public_portfolio: { Args: { p_username: string }; Returns: Json }
      get_share_comments: { Args: { p_share_token: string }; Returns: Json }
      get_shared_resume:
        | { Args: { share_token: string }; Returns: Json }
        | {
            Args: { password_attempt?: string; share_token: string }
            Returns: Json
          }
      get_user_api_key_info: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          key_tier: string
          provider: string
          updated_at: string
        }[]
      }
      hash_share_password: { Args: { raw_password: string }; Returns: string }
      increment_ai_usage: { Args: { p_user_id: string }; Returns: undefined }
      increment_portfolio_views: {
        Args: { p_username: string }
        Returns: undefined
      }
      increment_share_view_count: {
        Args: { share_token: string }
        Returns: undefined
      }
      increment_short_link_clicks: {
        Args: { p_id: string }
        Returns: undefined
      }
      record_portfolio_visit: {
        Args: {
          p_city?: string
          p_country?: string
          p_referrer?: string
          p_sections_viewed?: Json
          p_short_link_id?: string
          p_time_spent_seconds?: number
          p_username: string
        }
        Returns: undefined
      }
      redeem_coupon: {
        Args: { p_code: string; p_user_id: string }
        Returns: Json
      }
      resolve_short_link: { Args: { p_link_id: string }; Returns: Json }
      restore_resume: { Args: { p_resume_id: string }; Returns: undefined }
      safe_uid: { Args: never; Returns: string }
      soft_delete_resume: { Args: { p_resume_id: string }; Returns: undefined }
      soft_delete_resumes: { Args: { p_resume_ids: string[] }; Returns: number }
      upsert_ai_credits_limit: {
        Args: { p_daily_limit: number; p_usage_date: string; p_user_id: string }
        Returns: undefined
      }
      verify_share_password: {
        Args: { hashed_password: string; raw_password: string }
        Returns: boolean
      }
      wisehire_activate_early_access: {
        Args: {
          p_code: string
          p_company_name?: string
          p_company_size?: string
          p_full_name?: string
          p_now?: string
          p_user_id: string
        }
        Returns: {
          error_code: string
          plan_override: string
          success: boolean
        }[]
      }
      wisehire_redeem_early_access_code: {
        Args: { p_code: string }
        Returns: {
          error_code: string
          plan_days: number
          plan_override: string
          success: boolean
        }[]
      }
    }
    Enums: {
      career_level_enum: "Entry" | "Mid" | "Senior" | "Lead" | "Executive"
      credit_type_enum: "grant" | "purchase" | "usage" | "refund"
      industry_enum:
        | "Technology"
        | "Healthcare"
        | "Finance"
        | "Education"
        | "Manufacturing"
        | "Retail"
        | "Other"
      message_type_enum: "inquiry" | "request" | "system" | "support"
      theme_enum: "modern" | "neo" | "minimal" | "classic" | "glass" | "dark"
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
      career_level_enum: ["Entry", "Mid", "Senior", "Lead", "Executive"],
      credit_type_enum: ["grant", "purchase", "usage", "refund"],
      industry_enum: [
        "Technology",
        "Healthcare",
        "Finance",
        "Education",
        "Manufacturing",
        "Retail",
        "Other",
      ],
      message_type_enum: ["inquiry", "request", "system", "support"],
      theme_enum: ["modern", "neo", "minimal", "classic", "glass", "dark"],
    },
  },
} as const
