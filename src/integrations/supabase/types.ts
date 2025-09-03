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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      ai_tasks: {
        Row: {
          created_at: string | null
          created_by: string | null
          error: string | null
          id: string
          locale: string | null
          payload: Json | null
          question_id: number | null
          result: Json | null
          status: Database["public"]["Enums"]["ai_task_status"] | null
          task_type: Database["public"]["Enums"]["ai_task_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          error?: string | null
          id?: string
          locale?: string | null
          payload?: Json | null
          question_id?: number | null
          result?: Json | null
          status?: Database["public"]["Enums"]["ai_task_status"] | null
          task_type: Database["public"]["Enums"]["ai_task_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          error?: string | null
          id?: string
          locale?: string | null
          payload?: Json | null
          question_id?: number | null
          result?: Json | null
          status?: Database["public"]["Enums"]["ai_task_status"] | null
          task_type?: Database["public"]["Enums"]["ai_task_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_tasks_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "admin_questions_missing_answer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "admin_questions_missing_explanation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "admin_questions_missing_hi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tasks_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      attempts: {
        Row: {
          id: string
          score: number | null
          started_at: string | null
          submitted_at: string | null
          summary: Json | null
          test_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          score?: number | null
          started_at?: string | null
          submitted_at?: string | null
          summary?: Json | null
          test_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          score?: number | null
          started_at?: string | null
          submitted_at?: string | null
          summary?: Json | null
          test_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_attempts_test_id"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      gamification: {
        Row: {
          badges: string[] | null
          last_active_date: string | null
          points: number | null
          streak_days: number | null
          user_id: string
        }
        Insert: {
          badges?: string[] | null
          last_active_date?: string | null
          points?: number | null
          streak_days?: number | null
          user_id: string
        }
        Update: {
          badges?: string[] | null
          last_active_date?: string | null
          points?: number | null
          streak_days?: number | null
          user_id?: string
        }
        Relationships: []
      }
      items_attempted: {
        Row: {
          attempt_id: string
          correct: boolean | null
          id: number
          question_id: number
          selected_index: number
          time_ms: number | null
        }
        Insert: {
          attempt_id: string
          correct?: boolean | null
          id?: number
          question_id: number
          selected_index: number
          time_ms?: number | null
        }
        Update: {
          attempt_id?: string
          correct?: boolean | null
          id?: number
          question_id?: number
          selected_index?: number
          time_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_items_attempted_attempt_id"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_attempted_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_attempted_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "admin_questions_missing_answer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_attempted_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "admin_questions_missing_explanation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_attempted_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "admin_questions_missing_hi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_attempted_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_daily: {
        Row: {
          day: string
          points: number | null
          user_id: string
        }
        Insert: {
          day: string
          points?: number | null
          user_id: string
        }
        Update: {
          day?: string
          points?: number | null
          user_id?: string
        }
        Relationships: []
      }
      print_packages: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          omr_pdf_url: string
          paper_pdf_url: string
          qr_payload: Json
          test_id: string
          version: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          omr_pdf_url: string
          paper_pdf_url: string
          qr_payload: Json
          test_id: string
          version?: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          omr_pdf_url?: string
          paper_pdf_url?: string
          qr_payload?: Json
          test_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "print_packages_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      print_uploads: {
        Row: {
          attempt_id: string | null
          created_at: string | null
          detected: Json | null
          error: string | null
          id: string
          status: string
          test_id: string
          updated_at: string | null
          upload_urls: Json
          user_id: string
        }
        Insert: {
          attempt_id?: string | null
          created_at?: string | null
          detected?: Json | null
          error?: string | null
          id?: string
          status?: string
          test_id: string
          updated_at?: string | null
          upload_urls: Json
          user_id: string
        }
        Update: {
          attempt_id?: string | null
          created_at?: string | null
          detected?: Json | null
          error?: string | null
          id?: string
          status?: string
          test_id?: string
          updated_at?: string | null
          upload_urls?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "print_uploads_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "print_uploads_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          board: string | null
          class_level: string | null
          created_at: string | null
          district: string | null
          exam_arrival_buffer_mins: number | null
          exam_center_address: string | null
          exam_city: string | null
          exam_date: string | null
          exam_lat: number | null
          exam_lng: number | null
          full_name: string | null
          home_address: string | null
          home_lat: number | null
          home_lng: number | null
          is_admin: boolean | null
          language: string | null
          medium: string | null
          state: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          board?: string | null
          class_level?: string | null
          created_at?: string | null
          district?: string | null
          exam_arrival_buffer_mins?: number | null
          exam_center_address?: string | null
          exam_city?: string | null
          exam_date?: string | null
          exam_lat?: number | null
          exam_lng?: number | null
          full_name?: string | null
          home_address?: string | null
          home_lat?: number | null
          home_lng?: number | null
          is_admin?: boolean | null
          language?: string | null
          medium?: string | null
          state?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          board?: string | null
          class_level?: string | null
          created_at?: string | null
          district?: string | null
          exam_arrival_buffer_mins?: number | null
          exam_center_address?: string | null
          exam_city?: string | null
          exam_date?: string | null
          exam_lat?: number | null
          exam_lng?: number | null
          full_name?: string | null
          home_address?: string | null
          home_lat?: number | null
          home_lng?: number | null
          is_admin?: boolean | null
          language?: string | null
          medium?: string | null
          state?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      question_localizations: {
        Row: {
          created_at: string | null
          created_by: string | null
          explanation: Json | null
          id: string
          language: string
          options: Json
          question_id: number
          stem: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          explanation?: Json | null
          id?: string
          language: string
          options: Json
          question_id: number
          stem: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          explanation?: Json | null
          id?: string
          language?: string
          options?: Json
          question_id?: number
          stem?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_localizations_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "admin_questions_missing_answer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_localizations_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "admin_questions_missing_explanation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_localizations_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "admin_questions_missing_hi"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_localizations_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          ai_flags: Json | null
          bloom_level: string | null
          chapter: string
          correct_index: number | null
          created_at: string | null
          created_by: string | null
          difficulty: number | null
          difficulty_ai: number | null
          explanation: Json | null
          id: number
          language: string | null
          options: Json
          reviewed_at: string | null
          reviewed_by: string | null
          source: string | null
          status: string | null
          stem: string
          subject: string
          tags: string[] | null
          topic: string | null
          updated_at: string | null
        }
        Insert: {
          ai_flags?: Json | null
          bloom_level?: string | null
          chapter: string
          correct_index?: number | null
          created_at?: string | null
          created_by?: string | null
          difficulty?: number | null
          difficulty_ai?: number | null
          explanation?: Json | null
          id?: number
          language?: string | null
          options: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          status?: string | null
          stem: string
          subject: string
          tags?: string[] | null
          topic?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_flags?: Json | null
          bloom_level?: string | null
          chapter?: string
          correct_index?: number | null
          created_at?: string | null
          created_by?: string | null
          difficulty?: number | null
          difficulty_ai?: number | null
          explanation?: Json | null
          id?: number
          language?: string | null
          options?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string | null
          status?: string | null
          stem?: string
          subject?: string
          tags?: string[] | null
          topic?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      staging_questions: {
        Row: {
          chapter: string | null
          correctIndex: number | null
          difficulty: number | null
          explanationText: string | null
          language: string | null
          optionA: string | null
          optionB: string | null
          optionC: string | null
          optionD: string | null
          source: string | null
          status: string | null
          stem: string | null
          subject: string | null
          tags: string | null
          topic: string | null
        }
        Insert: {
          chapter?: string | null
          correctIndex?: number | null
          difficulty?: number | null
          explanationText?: string | null
          language?: string | null
          optionA?: string | null
          optionB?: string | null
          optionC?: string | null
          optionD?: string | null
          source?: string | null
          status?: string | null
          stem?: string | null
          subject?: string | null
          tags?: string | null
          topic?: string | null
        }
        Update: {
          chapter?: string | null
          correctIndex?: number | null
          difficulty?: number | null
          explanationText?: string | null
          language?: string | null
          optionA?: string | null
          optionB?: string | null
          optionC?: string | null
          optionD?: string | null
          source?: string | null
          status?: string | null
          stem?: string | null
          subject?: string | null
          tags?: string | null
          topic?: string | null
        }
        Relationships: []
      }
      tests: {
        Row: {
          config: Json
          created_at: string | null
          duration_sec: number
          id: string
          mode: string
          owner_id: string | null
          total_marks: number | null
          visibility: string | null
        }
        Insert: {
          config: Json
          created_at?: string | null
          duration_sec: number
          id?: string
          mode: string
          owner_id?: string | null
          total_marks?: number | null
          visibility?: string | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          duration_sec?: number
          id?: string
          mode?: string
          owner_id?: string | null
          total_marks?: number | null
          visibility?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      admin_questions_missing_answer: {
        Row: {
          chapter: string | null
          created_at: string | null
          difficulty: number | null
          id: number | null
          language: string | null
          options: Json | null
          source: string | null
          stem: string | null
          subject: string | null
        }
        Insert: {
          chapter?: string | null
          created_at?: string | null
          difficulty?: number | null
          id?: number | null
          language?: string | null
          options?: Json | null
          source?: string | null
          stem?: string | null
          subject?: string | null
        }
        Update: {
          chapter?: string | null
          created_at?: string | null
          difficulty?: number | null
          id?: number | null
          language?: string | null
          options?: Json | null
          source?: string | null
          stem?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      admin_questions_missing_explanation: {
        Row: {
          chapter: string | null
          correct_index: number | null
          difficulty: number | null
          id: number | null
          options: Json | null
          stem: string | null
          subject: string | null
        }
        Insert: {
          chapter?: string | null
          correct_index?: number | null
          difficulty?: number | null
          id?: number | null
          options?: Json | null
          stem?: string | null
          subject?: string | null
        }
        Update: {
          chapter?: string | null
          correct_index?: number | null
          difficulty?: number | null
          id?: number | null
          options?: Json | null
          stem?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      admin_questions_missing_hi: {
        Row: {
          chapter: string | null
          id: number | null
          stem: string | null
          subject: string | null
        }
        Relationships: []
      }
      leaderboard_daily_public: {
        Row: {
          day: string | null
          points: number | null
          rank: number | null
        }
        Relationships: []
      }
      v_examday_context: {
        Row: {
          buffer_mins: number | null
          exam_center_address: string | null
          exam_city: string | null
          exam_date: string | null
          exam_lat: number | null
          exam_lng: number | null
          full_name: string | null
          home_address: string | null
          home_lat: number | null
          home_lng: number | null
          user_id: string | null
        }
        Insert: {
          buffer_mins?: never
          exam_center_address?: string | null
          exam_city?: string | null
          exam_date?: string | null
          exam_lat?: number | null
          exam_lng?: number | null
          full_name?: string | null
          home_address?: string | null
          home_lat?: number | null
          home_lng?: number | null
          user_id?: string | null
        }
        Update: {
          buffer_mins?: never
          exam_center_address?: string | null
          exam_city?: string | null
          exam_date?: string | null
          exam_lat?: number | null
          exam_lng?: number | null
          full_name?: string | null
          home_address?: string | null
          home_lat?: number | null
          home_lng?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      ai_apply_result: {
        Args: { p_result: Json; p_task_id: string }
        Returns: undefined
      }
      ai_dequeue: {
        Args: { p_batch?: number }
        Returns: {
          created_at: string | null
          created_by: string | null
          error: string | null
          id: string
          locale: string | null
          payload: Json | null
          question_id: number | null
          result: Json | null
          status: Database["public"]["Enums"]["ai_task_status"] | null
          task_type: Database["public"]["Enums"]["ai_task_type"]
          updated_at: string | null
        }[]
      }
      ai_enqueue: {
        Args: {
          p_locale?: string
          p_payload?: Json
          p_question_id: number
          p_task_type: Database["public"]["Enums"]["ai_task_type"]
        }
        Returns: string
      }
      ai_mark_error: {
        Args: { p_error: string; p_task_id: string }
        Returns: undefined
      }
      get_available_question_count: {
        Args: {
          chapters?: string[]
          max_diff?: number
          min_diff?: number
          subjects?: string[]
        }
        Returns: number
      }
      get_distinct_chapters: {
        Args: { subjects: string[] }
        Returns: {
          chapter: string
        }[]
      }
      get_distinct_subjects: {
        Args: Record<PropertyKey, never>
        Returns: {
          subject: string
        }[]
      }
      get_user_email: {
        Args: { user_uuid: string }
        Returns: string
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      unaccent: {
        Args: { "": string }
        Returns: string
      }
      unaccent_init: {
        Args: { "": unknown }
        Returns: unknown
      }
    }
    Enums: {
      ai_task_status: "queued" | "processing" | "done" | "error"
      ai_task_type:
        | "explain"
        | "difficulty"
        | "tags"
        | "bloom"
        | "translate"
        | "qc"
        | "summary"
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
      ai_task_status: ["queued", "processing", "done", "error"],
      ai_task_type: [
        "explain",
        "difficulty",
        "tags",
        "bloom",
        "translate",
        "qc",
        "summary",
      ],
    },
  },
} as const
