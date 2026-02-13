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
            foreignKeyName: "ai_usage_logs_resume_id_fkey"
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
          title?: string | null
          tone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cover_letters_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "interview_sessions_resume_id_fkey"
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
          {
            foreignKeyName: "job_applications_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
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
      profiles: {
        Row: {
          avatar_url: string | null
          career_level: string | null
          created_at: string | null
          full_name: string | null
          id: string
          industry: string | null
          job_title: string | null
          linkedin_url: string | null
          location: string | null
          onboarding_completed: boolean | null
          profile_completed: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          career_level?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          industry?: string | null
          job_title?: string | null
          linkedin_url?: string | null
          location?: string | null
          onboarding_completed?: boolean | null
          profile_completed?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          career_level?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          industry?: string | null
          job_title?: string | null
          linkedin_url?: string | null
          location?: string | null
          onboarding_completed?: boolean | null
          profile_completed?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
            foreignKeyName: "resume_shares_resume_id_fkey"
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
            foreignKeyName: "resume_versions_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      resumes: {
        Row: {
          certifications: Json | null
          contact_info: Json
          created_at: string | null
          education: Json | null
          experience: Json | null
          id: string
          is_primary: boolean | null
          is_public: boolean
          job_match_score: number | null
          parent_resume_id: string | null
          skills: Json | null
          summary: string | null
          target_company: string | null
          target_job_title: string | null
          template_id: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          certifications?: Json | null
          contact_info?: Json
          created_at?: string | null
          education?: Json | null
          experience?: Json | null
          id?: string
          is_primary?: boolean | null
          is_public?: boolean
          job_match_score?: number | null
          parent_resume_id?: string | null
          skills?: Json | null
          summary?: string | null
          target_company?: string | null
          target_job_title?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          certifications?: Json | null
          contact_info?: Json
          created_at?: string | null
          education?: Json | null
          experience?: Json | null
          id?: string
          is_primary?: boolean | null
          is_public?: boolean
          job_match_score?: number | null
          parent_resume_id?: string | null
          skills?: Json | null
          summary?: string | null
          target_company?: string | null
          target_job_title?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
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
            foreignKeyName: "tailor_history_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_shared_resume:
        | { Args: { share_token: string }; Returns: Json }
        | {
            Args: { password_attempt?: string; share_token: string }
            Returns: Json
          }
      increment_ai_usage: { Args: { p_user_id: string }; Returns: undefined }
      increment_share_view_count: {
        Args: { share_token: string }
        Returns: undefined
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
