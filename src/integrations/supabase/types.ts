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
      profiles: {
        Row: {
          board: string | null
          class_level: string | null
          created_at: string | null
          district: string | null
          full_name: string | null
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
          full_name?: string | null
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
          full_name?: string | null
          medium?: string | null
          state?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          chapter: string
          correct_index: number
          created_at: string | null
          created_by: string | null
          difficulty: number | null
          explanation: Json | null
          id: number
          language: string | null
          options: Json
          source: string | null
          status: string | null
          stem: string
          subject: string
          tags: string[] | null
          topic: string | null
        }
        Insert: {
          chapter: string
          correct_index: number
          created_at?: string | null
          created_by?: string | null
          difficulty?: number | null
          explanation?: Json | null
          id?: number
          language?: string | null
          options: Json
          source?: string | null
          status?: string | null
          stem: string
          subject: string
          tags?: string[] | null
          topic?: string | null
        }
        Update: {
          chapter?: string
          correct_index?: number
          created_at?: string | null
          created_by?: string | null
          difficulty?: number | null
          explanation?: Json | null
          id?: number
          language?: string | null
          options?: Json
          source?: string | null
          status?: string | null
          stem?: string
          subject?: string
          tags?: string[] | null
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
      leaderboard_daily_public: {
        Row: {
          day: string | null
          points: number | null
          rank: number | null
        }
        Relationships: []
      }
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
