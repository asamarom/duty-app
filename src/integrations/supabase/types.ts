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
      admin_unit_assignments: {
        Row: {
          battalion_id: string | null
          created_at: string
          id: string
          platoon_id: string | null
          squad_id: string | null
          unit_type: string
          user_id: string
        }
        Insert: {
          battalion_id?: string | null
          created_at?: string
          id?: string
          platoon_id?: string | null
          squad_id?: string | null
          unit_type: string
          user_id: string
        }
        Update: {
          battalion_id?: string | null
          created_at?: string
          id?: string
          platoon_id?: string | null
          squad_id?: string | null
          unit_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_unit_assignments_battalion_id_fkey"
            columns: ["battalion_id"]
            isOneToOne: false
            referencedRelation: "battalions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_unit_assignments_platoon_id_fkey"
            columns: ["platoon_id"]
            isOneToOne: false
            referencedRelation: "platoons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_unit_assignments_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      battalions: {
        Row: {
          commander_id: string | null
          created_at: string
          designation: string | null
          id: string
          name: string
          status: Database["public"]["Enums"]["unit_status"]
          updated_at: string
        }
        Insert: {
          commander_id?: string | null
          created_at?: string
          designation?: string | null
          id?: string
          name: string
          status?: Database["public"]["Enums"]["unit_status"]
          updated_at?: string
        }
        Update: {
          commander_id?: string | null
          created_at?: string
          designation?: string | null
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["unit_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "battalions_commander_id_fkey"
            columns: ["commander_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          category: string | null
          created_at: string
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
          battalion_id: string | null
          created_at: string
          equipment_id: string
          id: string
          notes: string | null
          personnel_id: string | null
          platoon_id: string | null
          returned_at: string | null
          squad_id: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          battalion_id?: string | null
          created_at?: string
          equipment_id: string
          id?: string
          notes?: string | null
          personnel_id?: string | null
          platoon_id?: string | null
          returned_at?: string | null
          squad_id?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          battalion_id?: string | null
          created_at?: string
          equipment_id?: string
          id?: string
          notes?: string | null
          personnel_id?: string | null
          platoon_id?: string | null
          returned_at?: string | null
          squad_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_assignments_battalion_id_fkey"
            columns: ["battalion_id"]
            isOneToOne: false
            referencedRelation: "battalions"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "equipment_assignments_platoon_id_fkey"
            columns: ["platoon_id"]
            isOneToOne: false
            referencedRelation: "platoons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assignments_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      personnel: {
        Row: {
          battalion_id: string | null
          created_at: string
          driver_licenses: string[] | null
          duty_position: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          local_address: string | null
          location_status: Database["public"]["Enums"]["location_status"]
          phone: string | null
          platoon_id: string | null
          profile_image: string | null
          rank: string
          readiness_status: Database["public"]["Enums"]["readiness_status"]
          service_number: string
          skills: string[] | null
          squad_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          battalion_id?: string | null
          created_at?: string
          driver_licenses?: string[] | null
          duty_position?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          local_address?: string | null
          location_status?: Database["public"]["Enums"]["location_status"]
          phone?: string | null
          platoon_id?: string | null
          profile_image?: string | null
          rank: string
          readiness_status?: Database["public"]["Enums"]["readiness_status"]
          service_number: string
          skills?: string[] | null
          squad_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          battalion_id?: string | null
          created_at?: string
          driver_licenses?: string[] | null
          duty_position?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          local_address?: string | null
          location_status?: Database["public"]["Enums"]["location_status"]
          phone?: string | null
          platoon_id?: string | null
          profile_image?: string | null
          rank?: string
          readiness_status?: Database["public"]["Enums"]["readiness_status"]
          service_number?: string
          skills?: string[] | null
          squad_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personnel_battalion_id_fkey"
            columns: ["battalion_id"]
            isOneToOne: false
            referencedRelation: "battalions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_platoon_id_fkey"
            columns: ["platoon_id"]
            isOneToOne: false
            referencedRelation: "platoons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnel_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      platoons: {
        Row: {
          battalion_id: string
          created_at: string
          designation: string | null
          id: string
          leader_id: string | null
          name: string
          status: Database["public"]["Enums"]["unit_status"]
          updated_at: string
        }
        Insert: {
          battalion_id: string
          created_at?: string
          designation?: string | null
          id?: string
          leader_id?: string | null
          name: string
          status?: Database["public"]["Enums"]["unit_status"]
          updated_at?: string
        }
        Update: {
          battalion_id?: string
          created_at?: string
          designation?: string | null
          id?: string
          leader_id?: string | null
          name?: string
          status?: Database["public"]["Enums"]["unit_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platoons_battalion_id_fkey"
            columns: ["battalion_id"]
            isOneToOne: false
            referencedRelation: "battalions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platoons_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      signup_requests: {
        Row: {
          created_at: string
          decline_reason: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          requested_battalion_id: string | null
          requested_platoon_id: string | null
          requested_squad_id: string | null
          requested_unit_type: string
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
          requested_battalion_id?: string | null
          requested_platoon_id?: string | null
          requested_squad_id?: string | null
          requested_unit_type: string
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
          requested_battalion_id?: string | null
          requested_platoon_id?: string | null
          requested_squad_id?: string | null
          requested_unit_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          service_number?: string
          status?: Database["public"]["Enums"]["signup_request_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signup_requests_requested_battalion_id_fkey"
            columns: ["requested_battalion_id"]
            isOneToOne: false
            referencedRelation: "battalions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signup_requests_requested_platoon_id_fkey"
            columns: ["requested_platoon_id"]
            isOneToOne: false
            referencedRelation: "platoons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signup_requests_requested_squad_id_fkey"
            columns: ["requested_squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      squads: {
        Row: {
          created_at: string
          designation: string | null
          id: string
          leader_id: string | null
          name: string
          platoon_id: string
          status: Database["public"]["Enums"]["unit_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          designation?: string | null
          id?: string
          leader_id?: string | null
          name: string
          platoon_id: string
          status?: Database["public"]["Enums"]["unit_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          designation?: string | null
          id?: string
          leader_id?: string | null
          name?: string
          platoon_id?: string
          status?: Database["public"]["Enums"]["unit_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "squads_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squads_platoon_id_fkey"
            columns: ["platoon_id"]
            isOneToOne: false
            referencedRelation: "platoons"
            referencedColumns: ["id"]
          },
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
      can_admin_manage_unit: {
        Args: {
          _admin_user_id: string
          _battalion_id: string
          _platoon_id: string
          _squad_id: string
          _unit_type: string
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
    }
    Enums: {
      app_role: "admin" | "leader" | "user"
      equipment_status:
        | "serviceable"
        | "unserviceable"
        | "in_maintenance"
        | "missing"
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
      equipment_status: [
        "serviceable",
        "unserviceable",
        "in_maintenance",
        "missing",
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
    },
  },
} as const
