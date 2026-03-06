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
          error_message: string
          error_stack: string | null
          id: string
          recent_errors: Json | null
          route: string | null
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
          error_message: string
          error_stack?: string | null
          id?: string
          recent_errors?: Json | null
          route?: string | null
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
          error_message?: string
          error_stack?: string | null
          id?: string
          recent_errors?: Json | null
          route?: string | null
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
          availability_headline: string | null
          avatar_url: string | null
          career_level: string | null
          contact_email: string | null
          created_at: string | null
          digest_enabled: boolean | null
          full_name: string | null
          github_last_synced: string | null
          github_projects_cache: Json | null
          github_url: string | null
          hired_at: string | null
          id: string
          industry: string | null
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
          twitter_url: string | null
          updated_at: string | null
          user_id: string
          username: string | null
          views: number | null
          website_url: string | null
        }
        Insert: {
          availability_headline?: string | null
          avatar_url?: string | null
          career_level?: string | null
          contact_email?: string | null
          created_at?: string | null
          digest_enabled?: boolean | null
          full_name?: string | null
          github_last_synced?: string | null
          github_projects_cache?: Json | null
          github_url?: string | null
          hired_at?: string | null
          id?: string
          industry?: string | null
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
          twitter_url?: string | null
          updated_at?: string | null
          user_id: string
          username?: string | null
          views?: number | null
          website_url?: string | null
        }
        Update: {
          availability_headline?: string | null
          avatar_url?: string | null
          career_level?: string | null
          contact_email?: string | null
          created_at?: string | null
          digest_enabled?: boolean | null
          full_name?: string | null
          github_last_synced?: string | null
          github_projects_cache?: Json | null
          github_url?: string | null
          hired_at?: string | null
          id?: string
          industry?: string | null
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
          is_primary: boolean | null
          job_match_score: number | null
          job_url: string | null
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
          is_primary?: boolean | null
          job_match_score?: number | null
          job_url?: string | null
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
          is_primary?: boolean | null
          job_match_score?: number | null
          job_url?: string | null
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
      check_username_available: {
        Args: { p_user_id: string; p_username: string }
        Returns: boolean
      }
      cleanup_stale_data: { Args: never; Returns: undefined }
      get_clerk_user_id: { Args: never; Returns: string }
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
      resolve_short_link: { Args: { p_link_id: string }; Returns: Json }
      verify_share_password: {
        Args: { hashed_password: string; raw_password: string }
        Returns: boolean
      }
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
    Enums: {},
  },
} as const
