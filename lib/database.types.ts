export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity_events: {
        Row: {
          agent_id: string
          amount: number | null
          created_at: string
          customer_name: string
          description: string
          id: number
        }
        Insert: {
          agent_id: string
          amount?: number | null
          created_at?: string
          customer_name: string
          description: string
          id?: number
        }
        Update: {
          agent_id?: string
          amount?: number | null
          created_at?: string
          customer_name?: string
          description?: string
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_events_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_verifications: {
        Row: {
          answers: Json
          created_at: string
          crm_sync_error: string | null
          crm_synced_at: string | null
          current_step: number
          logo_path: string | null
          review_note: string | null
          reviewed_at: string | null
          status: Database["public"]["Enums"]["agent_verification_status"]
          submitted_at: string | null
          updated_at: string
          user_id: string
          zoho_module: string | null
          zoho_record_id: string | null
        }
        Insert: {
          answers?: Json
          created_at?: string
          crm_sync_error?: string | null
          crm_synced_at?: string | null
          current_step?: number
          logo_path?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["agent_verification_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id: string
          zoho_module?: string | null
          zoho_record_id?: string | null
        }
        Update: {
          answers?: Json
          created_at?: string
          crm_sync_error?: string | null
          crm_synced_at?: string | null
          current_step?: number
          logo_path?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["agent_verification_status"]
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
          zoho_module?: string | null
          zoho_record_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "agent_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          agent_id: string
          booked_at: string
          commission_rate: number
          created_at: string
          customer_id: number
          end_date: string
          id: number
          notes: string | null
          package_id: number
          start_date: string
          status: Database["public"]["Enums"]["booking_status"]
          total_amount: number
          travelers: number
          updated_at: string
        }
        Insert: {
          agent_id?: string
          booked_at?: string
          commission_rate: number
          created_at?: string
          customer_id: number
          end_date: string
          id?: number
          notes?: string | null
          package_id: number
          start_date: string
          status?: Database["public"]["Enums"]["booking_status"]
          total_amount: number
          travelers: number
          updated_at?: string
        }
        Update: {
          agent_id?: string
          booked_at?: string
          commission_rate?: number
          created_at?: string
          customer_id?: number
          end_date?: string
          id?: number
          notes?: string | null
          package_id?: number
          start_date?: string
          status?: Database["public"]["Enums"]["booking_status"]
          total_amount?: number
          travelers?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_destination: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_destination?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_destination?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      certificates: {
        Row: {
          code: string
          course_id: string
          course_title: string
          id: string
          issued_at: string
          recipient_name: string
          user_id: string
        }
        Insert: {
          code: string
          course_id: string
          course_title: string
          id?: string
          issued_at?: string
          recipient_name: string
          user_id: string
        }
        Update: {
          code?: string
          course_id?: string
          course_title?: string
          id?: string
          issued_at?: string
          recipient_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "agent_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          agent_id: string
          amount: number
          booking_id: number
          created_at: string
          earned_at: string
          id: number
          status: Database["public"]["Enums"]["commission_status"]
        }
        Insert: {
          agent_id: string
          amount: number
          booking_id: number
          created_at?: string
          earned_at?: string
          id?: number
          status?: Database["public"]["Enums"]["commission_status"]
        }
        Update: {
          agent_id?: string
          amount?: number
          booking_id?: number
          created_at?: string
          earned_at?: string
          id?: number
          status?: Database["public"]["Enums"]["commission_status"]
        }
        Relationships: [
          {
            foreignKeyName: "commissions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "booking_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      course_groups: {
        Row: {
          course_id: string
          group_id: string
        }
        Insert: {
          course_id: string
          group_id: string
        }
        Update: {
          course_id?: string
          group_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_groups_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category_id: string | null
          certificate_enabled: boolean
          cover_key: string | null
          created_at: string
          created_by: string | null
          description: string | null
          estimated_minutes: number | null
          featured: boolean
          id: string
          level: Database["public"]["Enums"]["course_level"]
          published_at: string | null
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["course_status"]
          subtitle: string | null
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["course_visibility"]
        }
        Insert: {
          category_id?: string | null
          certificate_enabled?: boolean
          cover_key?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_minutes?: number | null
          featured?: boolean
          id?: string
          level?: Database["public"]["Enums"]["course_level"]
          published_at?: string | null
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["course_status"]
          subtitle?: string | null
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["course_visibility"]
        }
        Update: {
          category_id?: string | null
          certificate_enabled?: boolean
          cover_key?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_minutes?: number | null
          featured?: boolean
          id?: string
          level?: Database["public"]["Enums"]["course_level"]
          published_at?: string | null
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["course_status"]
          subtitle?: string | null
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["course_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "courses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "agent_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_sync_records: {
        Row: {
          agent_id: string
          crm_id: string
          entity_type: Database["public"]["Enums"]["crm_entity"]
          id: number
          last_synced_at: string
          portal_id: number
          sync_status: Database["public"]["Enums"]["crm_sync_status"]
        }
        Insert: {
          agent_id: string
          crm_id?: string
          entity_type: Database["public"]["Enums"]["crm_entity"]
          id?: number
          last_synced_at?: string
          portal_id: number
          sync_status?: Database["public"]["Enums"]["crm_sync_status"]
        }
        Update: {
          agent_id?: string
          crm_id?: string
          entity_type?: Database["public"]["Enums"]["crm_entity"]
          id?: number
          last_synced_at?: string
          portal_id?: number
          sync_status?: Database["public"]["Enums"]["crm_sync_status"]
        }
        Relationships: [
          {
            foreignKeyName: "crm_sync_records_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_sync_records_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          agent_id: string
          country: string | null
          created_at: string
          email: string
          first_name: string
          id: number
          last_name: string
          notes: string | null
          phone: string | null
          stage: Database["public"]["Enums"]["customer_stage"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          agent_id?: string
          country?: string | null
          created_at?: string
          email: string
          first_name: string
          id?: number
          last_name: string
          notes?: string | null
          phone?: string | null
          stage?: Database["public"]["Enums"]["customer_stage"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          agent_id?: string
          country?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: number
          last_name?: string
          notes?: string | null
          phone?: string | null
          stage?: Database["public"]["Enums"]["customer_stage"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          enrolled_at: string
          id: string
          last_activity_at: string | null
          last_lesson_id: string | null
          progress_pct: number
          started_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          enrolled_at?: string
          id?: string
          last_activity_at?: string | null
          last_lesson_id?: string | null
          progress_pct?: number
          started_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          enrolled_at?: string
          id?: string
          last_activity_at?: string | null
          last_lesson_id?: string | null
          progress_pct?: number
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_last_lesson_id_fkey"
            columns: ["last_lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "agent_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          added_by: string | null
          created_at: string
          group_id: string
          joined_via: string
          user_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          group_id: string
          joined_via?: string
          user_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          group_id?: string
          joined_via?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "agent_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "agent_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          join_code: string
          join_enabled: boolean
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          join_code?: string
          join_enabled?: boolean
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          join_code?: string
          join_enabled?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "agent_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_events: {
        Row: {
          course_id: string | null
          created_at: string
          event: string
          id: number
          lesson_id: string | null
          payload: Json
          user_id: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          event: string
          id?: never
          lesson_id?: string | null
          payload?: Json
          user_id?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string
          event?: string
          id?: never
          lesson_id?: string | null
          payload?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_events_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "agent_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_time_daily: {
        Row: {
          course_id: string
          day: string
          seconds: number
          user_id: string
        }
        Insert: {
          course_id: string
          day?: string
          seconds?: number
          user_id: string
        }
        Update: {
          course_id?: string
          day?: string
          seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_time_daily_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_time_daily_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "agent_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_time_daily_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          course_id: string
          last_position_seconds: number
          lesson_id: string
          seconds_spent: number
          started_at: string
          status: Database["public"]["Enums"]["progress_status"]
          updated_at: string
          user_id: string
          watch_pct: number
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          last_position_seconds?: number
          lesson_id: string
          seconds_spent?: number
          started_at?: string
          status?: Database["public"]["Enums"]["progress_status"]
          updated_at?: string
          user_id: string
          watch_pct?: number
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          last_position_seconds?: number
          lesson_id?: string
          seconds_spent?: number
          started_at?: string
          status?: Database["public"]["Enums"]["progress_status"]
          updated_at?: string
          user_id?: string
          watch_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "agent_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          body: Json | null
          course_id: string
          created_at: string
          duration_seconds: number | null
          external_url: string | null
          file_key: string | null
          file_mime: string | null
          file_name: string | null
          file_size: number | null
          id: string
          is_required: boolean
          module_id: string
          poster_key: string | null
          required_completion_pct: number
          sort_order: number
          summary: string | null
          title: string
          type: Database["public"]["Enums"]["lesson_type"]
          updated_at: string
          video_key: string | null
        }
        Insert: {
          body?: Json | null
          course_id: string
          created_at?: string
          duration_seconds?: number | null
          external_url?: string | null
          file_key?: string | null
          file_mime?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          is_required?: boolean
          module_id: string
          poster_key?: string | null
          required_completion_pct?: number
          sort_order?: number
          summary?: string | null
          title: string
          type?: Database["public"]["Enums"]["lesson_type"]
          updated_at?: string
          video_key?: string | null
        }
        Update: {
          body?: Json | null
          course_id?: string
          created_at?: string
          duration_seconds?: number | null
          external_url?: string | null
          file_key?: string | null
          file_mime?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          is_required?: boolean
          module_id?: string
          poster_key?: string | null
          required_completion_pct?: number
          sort_order?: number
          summary?: string | null
          title?: string
          type?: Database["public"]["Enums"]["lesson_type"]
          updated_at?: string
          video_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      module_requirements: {
        Row: {
          module_id: string
          required_module_id: string
        }
        Insert: {
          module_id: string
          required_module_id: string
        }
        Update: {
          module_id?: string
          required_module_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_requirements_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_requirements_required_module_id_fkey"
            columns: ["required_module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          course_id: string
          cover_key: string | null
          created_at: string
          description: string | null
          id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          cover_key?: string | null
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          cover_key?: string | null
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          agent_id: string
          body: string | null
          created_at: string
          href: string | null
          id: number
          read_at: string | null
          title: string
        }
        Insert: {
          agent_id: string
          body?: string | null
          created_at?: string
          href?: string | null
          id?: number
          read_at?: string | null
          title: string
        }
        Update: {
          agent_id?: string
          body?: string | null
          created_at?: string
          href?: string | null
          id?: number
          read_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      package_reviews: {
        Row: {
          author_location: string | null
          author_name: string
          body: string
          created_at: string
          id: number
          package_id: number
          rating: number
          title: string
          traveled_on: string | null
          traveler_type: string | null
        }
        Insert: {
          author_location?: string | null
          author_name: string
          body: string
          created_at?: string
          id?: number
          package_id: number
          rating: number
          title: string
          traveled_on?: string | null
          traveler_type?: string | null
        }
        Update: {
          author_location?: string | null
          author_name?: string
          body?: string
          created_at?: string
          id?: number
          package_id?: number
          rating?: number
          title?: string
          traveled_on?: string | null
          traveler_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "package_reviews_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          commission_rate: number
          created_at: string
          description: string
          destination: string
          duration_days: number
          embedding: string | null
          featured_rank: number | null
          gallery: string[]
          highlights: string[]
          id: number
          image_url: string
          inclusions: string[]
          is_active: boolean
          is_featured: boolean
          itinerary: Json
          kid_friendly: boolean
          min_age: number | null
          name: string
          price_per_person: number
          rating: number
          review_count: number
          settings: Database["public"]["Enums"]["destination_setting"][]
          trip_types: Database["public"]["Enums"]["trip_type"][]
          updated_at: string
          what_to_bring: string[]
        }
        Insert: {
          commission_rate: number
          created_at?: string
          description: string
          destination: string
          duration_days: number
          embedding?: string | null
          featured_rank?: number | null
          gallery?: string[]
          highlights?: string[]
          id?: number
          image_url: string
          inclusions?: string[]
          is_active?: boolean
          is_featured?: boolean
          itinerary?: Json
          kid_friendly?: boolean
          min_age?: number | null
          name: string
          price_per_person: number
          rating?: number
          review_count?: number
          settings?: Database["public"]["Enums"]["destination_setting"][]
          trip_types?: Database["public"]["Enums"]["trip_type"][]
          updated_at?: string
          what_to_bring?: string[]
        }
        Update: {
          commission_rate?: number
          created_at?: string
          description?: string
          destination?: string
          duration_days?: number
          embedding?: string | null
          featured_rank?: number | null
          gallery?: string[]
          highlights?: string[]
          id?: number
          image_url?: string
          inclusions?: string[]
          is_active?: boolean
          is_featured?: boolean
          itinerary?: Json
          kid_friendly?: boolean
          min_age?: number | null
          name?: string
          price_per_person?: number
          rating?: number
          review_count?: number
          settings?: Database["public"]["Enums"]["destination_setting"][]
          trip_types?: Database["public"]["Enums"]["trip_type"][]
          updated_at?: string
          what_to_bring?: string[]
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          agent_id: string
          amount_cents: number
          booking_id: number | null
          created_at: string
          currency: string
          customer_email: string
          description: string
          id: string
          payment_url: string | null
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          agent_id?: string
          amount_cents: number
          booking_id?: number | null
          created_at?: string
          currency?: string
          customer_email: string
          description: string
          id?: string
          payment_url?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          agent_id?: string
          amount_cents?: number
          booking_id?: number | null
          created_at?: string
          currency?: string
          customer_email?: string
          description?: string
          id?: string
          payment_url?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company: string | null
          country: string | null
          created_at: string
          email: string
          first_name: string | null
          full_name: string | null
          id: string
          job_title: string | null
          last_name: string | null
          last_seen_at: string | null
          onboarded_at: string | null
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          full_name?: string | null
          id: string
          job_title?: string | null
          last_name?: string | null
          last_seen_at?: string | null
          onboarded_at?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          job_title?: string | null
          last_name?: string | null
          last_seen_at?: string | null
          onboarded_at?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answers: Json
          created_at: string
          id: string
          passed: boolean
          quiz_id: string
          score: number
          user_id: string
        }
        Insert: {
          answers: Json
          created_at?: string
          id?: string
          passed: boolean
          quiz_id: string
          score: number
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          passed?: boolean
          quiz_id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "agent_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct: Json
          explanation: string | null
          id: string
          options: Json
          prompt: string
          quiz_id: string
          sort_order: number
          type: Database["public"]["Enums"]["question_type"]
        }
        Insert: {
          correct?: Json
          explanation?: string | null
          id?: string
          options?: Json
          prompt: string
          quiz_id: string
          sort_order?: number
          type?: Database["public"]["Enums"]["question_type"]
        }
        Update: {
          correct?: Json
          explanation?: string | null
          id?: string
          options?: Json
          prompt?: string
          quiz_id?: string
          sort_order?: number
          type?: Database["public"]["Enums"]["question_type"]
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          id: string
          lesson_id: string
          max_attempts: number | null
          passing_score: number
          shuffle_questions: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_id: string
          max_attempts?: number | null
          passing_score?: number
          shuffle_questions?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: string
          max_attempts?: number | null
          passing_score?: number
          shuffle_questions?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: true
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          external_url: string | null
          file_key: string | null
          file_mime: string | null
          file_name: string | null
          file_size: number | null
          id: string
          lesson_id: string | null
          sort_order: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          external_url?: string | null
          file_key?: string | null
          file_mime?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          lesson_id?: string | null
          sort_order?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          external_url?: string | null
          file_key?: string | null
          file_mime?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          lesson_id?: string | null
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          agent_id: string
          category: Database["public"]["Enums"]["ticket_category"]
          created_at: string
          id: number
          message: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string
        }
        Insert: {
          agent_id?: string
          category?: Database["public"]["Enums"]["ticket_category"]
          created_at?: string
          id?: number
          message: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          category?: Database["public"]["Enums"]["ticket_category"]
          created_at?: string
          id?: number
          message?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      agent_summary: {
        Row: {
          avg_progress: number | null
          certificates: number | null
          company: string | null
          completed_courses: number | null
          country: string | null
          created_at: string | null
          email: string | null
          enrollments: number | null
          full_name: string | null
          id: string | null
          last_activity_at: string | null
          last_seen_at: string | null
          learning_seconds: number | null
          onboarded_at: string | null
          role: Database["public"]["Enums"]["app_role"] | null
        }
        Insert: {
          avg_progress?: never
          certificates?: never
          company?: string | null
          completed_courses?: never
          country?: string | null
          created_at?: string | null
          email?: string | null
          enrollments?: never
          full_name?: string | null
          id?: string | null
          last_activity_at?: never
          last_seen_at?: string | null
          learning_seconds?: never
          onboarded_at?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
        }
        Update: {
          avg_progress?: never
          certificates?: never
          company?: string | null
          completed_courses?: never
          country?: string | null
          created_at?: string | null
          email?: string | null
          enrollments?: never
          full_name?: string | null
          id?: string | null
          last_activity_at?: never
          last_seen_at?: string | null
          learning_seconds?: never
          onboarded_at?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
        }
        Relationships: []
      }
      booking_details: {
        Row: {
          agent_id: string | null
          booked_at: string | null
          commission_rate: number | null
          created_at: string | null
          customer_email: string | null
          customer_id: number | null
          customer_name: string | null
          destination: string | null
          end_date: string | null
          id: number | null
          notes: string | null
          package_id: number | null
          package_name: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["booking_status"] | null
          total_amount: number | null
          travelers: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_stats: {
        Row: {
          address: string | null
          agent_id: string | null
          country: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: number | null
          last_name: string | null
          notes: string | null
          phone: string | null
          stage: Database["public"]["Enums"]["customer_stage"] | null
          total_bookings: number | null
          total_spent: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_overview: { Args: { p_from: string; p_to: string }; Returns: Json }
      apply_verification_review: {
        Args: {
          p_email?: string
          p_note?: string
          p_status: Database["public"]["Enums"]["agent_verification_status"]
          p_zoho_module?: string
          p_zoho_record_id?: string
        }
        Returns: string
      }
      assert_lesson_available: {
        Args: { p_lesson: string }
        Returns: {
          body: Json | null
          course_id: string
          created_at: string
          duration_seconds: number | null
          external_url: string | null
          file_key: string | null
          file_mime: string | null
          file_name: string | null
          file_size: number | null
          id: string
          is_required: boolean
          module_id: string
          poster_key: string | null
          required_completion_pct: number
          sort_order: number
          summary: string | null
          title: string
          type: Database["public"]["Enums"]["lesson_type"]
          updated_at: string
          video_key: string | null
        }
        SetofOptions: {
          from: "*"
          to: "lessons"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assert_staff: { Args: never; Returns: undefined }
      can_access_course: { Args: { p_course: string }; Returns: boolean }
      complete_lesson: {
        Args: { p_lesson: string }
        Returns: {
          completed_at: string | null
          course_id: string
          last_position_seconds: number
          lesson_id: string
          seconds_spent: number
          started_at: string
          status: Database["public"]["Enums"]["progress_status"]
          updated_at: string
          user_id: string
          watch_pct: number
        }
        SetofOptions: {
          from: "*"
          to: "lesson_progress"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      course_funnel: { Args: { p_course: string }; Returns: Json }
      course_outline: {
        Args: { p_course: string }
        Returns: {
          completed: boolean
          missing_module_ids: string[]
          module_id: string
          unlocked: boolean
        }[]
      }
      current_app_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      enroll: {
        Args: { p_course: string }
        Returns: {
          completed_at: string | null
          course_id: string
          enrolled_at: string
          id: string
          last_activity_at: string | null
          last_lesson_id: string | null
          progress_pct: number
          started_at: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "enrollments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ensure_enrollment: {
        Args: { p_course: string; p_user: string }
        Returns: undefined
      }
      gen_certificate_code: { Args: never; Returns: string }
      gen_join_code: { Args: never; Returns: string }
      get_quiz: { Args: { p_lesson: string }; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      is_verified_agent: { Args: never; Returns: boolean }
      join_group: {
        Args: { p_code: string }
        Returns: {
          already_member: boolean
          group_id: string
          group_name: string
        }[]
      }
      lesson_available: { Args: { p_lesson: string }; Returns: boolean }
      log_event: {
        Args: {
          p_course?: string
          p_event: string
          p_lesson?: string
          p_payload?: Json
        }
        Returns: undefined
      }
      module_completed: {
        Args: { p_module: string; p_user: string }
        Returns: boolean
      }
      module_unlocked: {
        Args: { p_module: string; p_user: string }
        Returns: boolean
      }
      my_groups: {
        Args: never
        Returns: {
          description: string
          id: string
          joined_at: string
          name: string
        }[]
      }
      peek_group: {
        Args: { p_code: string }
        Returns: {
          description: string
          name: string
        }[]
      }
      portal_agent_standing: { Args: never; Returns: Json }
      portal_booking_funnel: {
        Args: never
        Returns: {
          stage: Database["public"]["Enums"]["customer_stage"]
          value: number
        }[]
      }
      portal_commission_analytics: { Args: never; Returns: Json }
      portal_dashboard: { Args: never; Returns: Json }
      portal_payments_dashboard: { Args: never; Returns: Json }
      portal_pct_change: {
        Args: { p_current: number; p_previous: number }
        Returns: number
      }
      portal_revenue_series: {
        Args: { p_range: string }
        Returns: {
          bookings: number
          bucket_end: string
          bucket_start: string
          revenue: number
        }[]
      }
      portal_seed_demo: { Args: { p_agent: string }; Returns: undefined }
      recompute_enrollment: {
        Args: { p_course: string; p_user: string }
        Returns: undefined
      }
      record_progress: {
        Args: {
          p_lesson: string
          p_position_seconds?: number
          p_seconds_delta?: number
          p_watch_pct?: number
        }
        Returns: {
          just_completed: boolean
          status: Database["public"]["Enums"]["progress_status"]
          watch_pct: number
        }[]
      }
      save_verification_draft: {
        Args: { p_answers: Json; p_logo_path?: string; p_step: number }
        Returns: {
          answers: Json
          created_at: string
          crm_sync_error: string | null
          crm_synced_at: string | null
          current_step: number
          logo_path: string | null
          review_note: string | null
          reviewed_at: string | null
          status: Database["public"]["Enums"]["agent_verification_status"]
          submitted_at: string | null
          updated_at: string
          user_id: string
          zoho_module: string | null
          zoho_record_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "agent_verifications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      start_lesson: {
        Args: { p_lesson: string }
        Returns: {
          completed_at: string | null
          course_id: string
          last_position_seconds: number
          lesson_id: string
          seconds_spent: number
          started_at: string
          status: Database["public"]["Enums"]["progress_status"]
          updated_at: string
          user_id: string
          watch_pct: number
        }
        SetofOptions: {
          from: "*"
          to: "lesson_progress"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_quiz: {
        Args: { p_answers: Json; p_lesson: string }
        Returns: Json
      }
      submit_verification: {
        Args: never
        Returns: {
          answers: Json
          created_at: string
          crm_sync_error: string | null
          crm_synced_at: string | null
          current_step: number
          logo_path: string | null
          review_note: string | null
          reviewed_at: string | null
          status: Database["public"]["Enums"]["agent_verification_status"]
          submitted_at: string | null
          updated_at: string
          user_id: string
          zoho_module: string | null
          zoho_record_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "agent_verifications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      verify_certificate: {
        Args: { p_code: string }
        Returns: {
          code: string
          course_slug: string
          course_title: string
          issued_at: string
          recipient_name: string
        }[]
      }
    }
    Enums: {
      agent_tier: "Bronze" | "Silver" | "Gold" | "Platinum"
      agent_verification_status:
        | "draft"
        | "submitted"
        | "changes_requested"
        | "approved"
        | "rejected"
      app_role: "agent" | "content_manager" | "admin"
      booking_status:
        | "pending"
        | "confirmed"
        | "active"
        | "traveling"
        | "completed"
        | "cancelled"
      commission_status: "pending" | "earned" | "paid"
      course_level: "foundation" | "advanced" | "specialist"
      course_status: "draft" | "published" | "archived"
      course_visibility: "public" | "groups"
      crm_entity: "customer" | "booking"
      crm_sync_status: "synced" | "failed" | "pending"
      customer_stage: "lead" | "inquiry" | "quoted" | "booked" | "traveled"
      destination_setting:
        | "beach"
        | "islands"
        | "mountains"
        | "city"
        | "rainforest"
        | "countryside"
        | "safari"
      lesson_type: "video" | "pdf" | "document" | "link" | "reading" | "quiz"
      payment_status:
        | "succeeded"
        | "processing"
        | "requires_payment_method"
        | "requires_confirmation"
        | "requires_action"
        | "canceled"
      progress_status: "not_started" | "in_progress" | "completed"
      question_type: "single" | "multiple" | "true_false"
      ticket_category:
        | "booking"
        | "payment"
        | "package"
        | "technical"
        | "account"
        | "other"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status: "open" | "in_progress" | "resolved" | "closed"
      trip_type:
        | "relaxation"
        | "honeymoon"
        | "family"
        | "adventure"
        | "cultural"
        | "wildlife"
        | "luxury"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      agent_tier: ["Bronze", "Silver", "Gold", "Platinum"],
      agent_verification_status: [
        "draft",
        "submitted",
        "changes_requested",
        "approved",
        "rejected",
      ],
      app_role: ["agent", "content_manager", "admin"],
      booking_status: [
        "pending",
        "confirmed",
        "active",
        "traveling",
        "completed",
        "cancelled",
      ],
      commission_status: ["pending", "earned", "paid"],
      course_level: ["foundation", "advanced", "specialist"],
      course_status: ["draft", "published", "archived"],
      course_visibility: ["public", "groups"],
      crm_entity: ["customer", "booking"],
      crm_sync_status: ["synced", "failed", "pending"],
      customer_stage: ["lead", "inquiry", "quoted", "booked", "traveled"],
      destination_setting: [
        "beach",
        "islands",
        "mountains",
        "city",
        "rainforest",
        "countryside",
        "safari",
      ],
      lesson_type: ["video", "pdf", "document", "link", "reading", "quiz"],
      payment_status: [
        "succeeded",
        "processing",
        "requires_payment_method",
        "requires_confirmation",
        "requires_action",
        "canceled",
      ],
      progress_status: ["not_started", "in_progress", "completed"],
      question_type: ["single", "multiple", "true_false"],
      ticket_category: [
        "booking",
        "payment",
        "package",
        "technical",
        "account",
        "other",
      ],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: ["open", "in_progress", "resolved", "closed"],
      trip_type: [
        "relaxation",
        "honeymoon",
        "family",
        "adventure",
        "cultural",
        "wildlife",
        "luxury",
      ],
    },
  },
} as const

