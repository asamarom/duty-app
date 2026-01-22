export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_unit_assignments: {
        Row: {
          created_at: string
          id: string
          unit_id: string | null
          unit_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          unit_id?: string | null
          unit_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          unit_id?: string | null
          unit_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_unit_assignments_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          }
        ]
      }
      assignment_requests: {
        Row: {
          created_at: string
          equipment_id: string
          from_personnel_id: string | null
          from_unit_id: string | null
          from_unit_type: string
          id: string
          notes: string | null
          recipient_approved: boolean
          recipient_approved_at: string | null
          recipient_approved_by: string | null
          requested_at: string
          requested_by: string | null
          status: Database["public"]["Enums"]["assignment_request_status"]
          to_personnel_id: string | null
          to_unit_id: string | null
          to_unit_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          equipment_id: string
          from_personnel_id?: string | null
          from_unit_id?: string | null
          from_unit_type: string
          id?: string
          notes?: string | null
          recipient_approved?: boolean
          recipient_approved_at?: string | null
          recipient_approved_by?: string | null
          requested_at?: string
          requested_by?: string | null
          status?: Database["public"]["Enums"]["assignment_request_status"]
          to_personnel_id?: string | null
          to_unit_id?: string | null
          to_unit_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          equipment_id?: string
          from_personnel_id?: string | null
          from_unit_id?: string | null
          from_unit_type?: string
          id?: string
          notes?: string | null
          recipient_approved?: boolean
          recipient_approved_at?: string | null
          recipient_approved_by?: string | null
          requested_at?: string
          requested_by?: string | null
          status?: Database["public"]["Enums"]["assignment_request_status"]
          to_personnel_id?: string | null
          to_unit_id?: string | null
          to_unit_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_requests_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_requests_from_personnel_id_fkey"
            columns: ["from_personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_requests_from_unit_id_fkey"
            columns: ["from_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_requests_recipient_approved_by_fkey"
            columns: ["recipient_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_requests_to_personnel_id_fkey"
            columns: ["to_personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_requests_to_unit_id_fkey"
            columns: ["to_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          }
        ]
      }
      equipment: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          quantity: number
          serial_number: string | null
          status: Database["public"]["Enums"]["equipment_status"]
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          quantity?: number
          serial_number?: string | null
          status?: Database["public"]["Enums"]["equipment_status"]
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          quantity?: number
          serial_number?: string | null
          status?: Database["public"]["Enums"]["equipment_status"]
          updated_at?: string
        }
        Relationships: []
      }
      equipment_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          created_at: string
          equipment_id: string
          id: string
          notes: string | null
          personnel_id: string | null
          quantity: number
          returned_at: string | null
          unit_id: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          equipment_id: string
          id?: string
          notes?: string | null
          personnel_id?: string | null
          quantity?: number
          returned_at?: string | null
          unit_id?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          equipment_id?: string
          id?: string
          notes?: string | null
          personnel_id?: string | null
          quantity?: number
          returned_at?: string | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_assignments_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assignments_personnel_id_fkey"
            columns: ["personnel_id"]
            isOneToOne: false
            referencedRelation: "personnel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assignments_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          }
        ]
      }
      personnel: {
        Row: {
          created_at: string
          driver_licenses: string[] | null
          duty_position: string | null
          email: string | null
          first_name: string
          id: string
          is_signature_approved: boolean
          last_name: string
          local_address: string | null
          location_status: Database["public"]["Enums"]["location_status"]
          phone: string | null
          profile_image: string | null
          rank: string
          readiness_status: Database["public"]["Enums"]["readiness_status"]
          service_number: string
          skills: string[] | null
          unit_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          driver_licenses?: string[] | null
          duty_position?: string | null
          email?: string | null
          first_name: string
          id?: string
          is_signature_approved?: boolean
          last_name: string
          local_address?: string | null
          location_status?: Database["public"]["Enums"]["location_status"]
          phone?: string | null
          profile_image?: string | null
          rank: string
          readiness_status?: Database["public"]["Enums"]["readiness_status"]
          service_number: string
          skills?: string[] | null
          unit_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          driver_licenses?: string[] | null
          duty_position?: string | null
          email?: string | null
          first_name?: string
          id?: string
          is_signature_approved?: boolean
          last_name?: string
          local_address?: string | null
          location_status?: Database["public"]["Enums"]["location_status"]
          phone?: string | null
          profile_image?: string | null
          rank?: string
          readiness_status?: Database["public"]["Enums"]["readiness_status"]
          service_number?: string
          skills?: string[] | null
          unit_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personnel_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          }
        ]
      }
      signup_requests: {
        Row: {
          created_at: string
          decline_reason: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          requested_unit_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          service_number: string
          status: Database["public"]["Enums"]["signup_request_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decline_reason?: string | null
          email: string
          full_name: string
          id?: string
          phone?: string | null
          requested_unit_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          service_number: string
          status?: Database["public"]["Enums"]["signup_request_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          decline_reason?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          requested_unit_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          service_number?: string
          status?: Database["public"]["Enums"]["signup_request_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signup_requests_requested_unit_id_fkey"
            columns: ["requested_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          }
        ]
      }
      units: {
        Row: {
          created_at: string
          designation: string | null
          id: string
          leader_id: string | null
          name: string
          parent_id: string | null
          status: Database["public"]["Enums"]["unit_status"]
          unit_type: Database["public"]["Enums"]["unit_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          designation?: string | null
          id?: string
          leader_id?: string | null
          name: string
          parent_id?: string | null
          status?: Database["public"]["Enums"]["unit_status"]
          unit_type: Database["public"]["Enums"]["unit_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          designation?: string | null
          id?: string
          leader_id?: string | null
          name?: string
          parent_id?: string | null
          status?: Database["public"]["Enums"]["unit_status"]
          unit_type?: Database["public"]["Enums"]["unit_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          }
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      can_manage_unit: {
        Args: { p_user_id: string; p_unit_id: string }
        Returns: boolean
      }
      get_unit_ancestors: {
        Args: { p_unit_id: string }
        Returns: string[]
      }
      get_unit_battalion: {
        Args: { p_unit_id: string }
        Returns: string
      }
      get_unit_descendants: {
        Args: { p_unit_id: string }
        Returns: string[]
      }
      get_user_unit_id: {
        Args: { p_user_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      initiate_transfer: {
        Args: {
          p_equipment_id: string
          p_to_unit_id?: string
          p_to_personnel_id?: string
          p_notes?: string
        }
        Returns: string
      }
      is_approved_user: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      is_valid_transfer_target: {
        Args: {
          p_from_unit_id: string
          p_from_personnel_id: string
          p_to_unit_id: string
          p_to_personnel_id: string
        }
        Returns: boolean
      }
      process_transfer: {
        Args: {
          p_request_id: string
          p_action: string
          p_notes?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "leader" | "user"
      assignment_request_status: "pending" | "approved" | "rejected"
      equipment_status:
        | "serviceable"
        | "unserviceable"
        | "in_maintenance"
        | "missing"
        | "pending_transfer"
      location_status:
        | "home"
        | "on_duty"
        | "off_duty"
        | "active_mission"
        | "leave"
        | "tdy"
      readiness_status: "ready" | "warning" | "critical"
      signup_request_status: "pending" | "approved" | "declined"
      unit_status: "active" | "inactive" | "deployed"
      unit_type: "battalion" | "company" | "platoon"
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
      app_role: ["admin", "leader", "user"],
      assignment_request_status: ["pending", "approved", "rejected"],
      equipment_status: [
        "serviceable",
        "unserviceable",
        "in_maintenance",
        "missing",
        "pending_transfer",
      ],
      location_status: [
        "home",
        "on_duty",
        "off_duty",
        "active_mission",
        "leave",
        "tdy",
      ],
      readiness_status: ["ready", "warning", "critical"],
      signup_request_status: ["pending", "approved", "declined"],
      unit_status: ["active", "inactive", "deployed"],
      unit_type: ["battalion", "company", "platoon"],
    },
  },
} as const

// Convenience types for the new unified units table
export type Unit = Tables<"units">
export type UnitInsert = TablesInsert<"units">
export type UnitUpdate = TablesUpdate<"units">
export type UnitType = Enums<"unit_type">
