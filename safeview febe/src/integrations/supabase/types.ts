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
      alert_logs: {
        Row: {
          action: string
          actor: string | null
          created_at: string
          id: string
          metadata: Json | null
          notes: string | null
          threat_id: string | null
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          threat_id?: string | null
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          threat_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_logs_threat_id_fkey"
            columns: ["threat_id"]
            isOneToOne: false
            referencedRelation: "threats"
            referencedColumns: ["id"]
          },
        ]
      }
      cctv_devices: {
        Row: {
          blocked_attacks: number | null
          created_at: string
          device_type: string
          firmware_version: string | null
          id: string
          ip_address: string
          last_seen: string | null
          location: string | null
          mac_address: string | null
          manufacturer: string | null
          name: string
          status: string
          threat_level: string | null
          total_packets: number | null
          updated_at: string
        }
        Insert: {
          blocked_attacks?: number | null
          created_at?: string
          device_type: string
          firmware_version?: string | null
          id?: string
          ip_address: string
          last_seen?: string | null
          location?: string | null
          mac_address?: string | null
          manufacturer?: string | null
          name: string
          status?: string
          threat_level?: string | null
          total_packets?: number | null
          updated_at?: string
        }
        Update: {
          blocked_attacks?: number | null
          created_at?: string
          device_type?: string
          firmware_version?: string | null
          id?: string
          ip_address?: string
          last_seen?: string | null
          location?: string | null
          mac_address?: string | null
          manufacturer?: string | null
          name?: string
          status?: string
          threat_level?: string | null
          total_packets?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      ml_model_status: {
        Row: {
          accuracy: number
          id: string
          is_active: boolean
          last_trained: string | null
          model_name: string
          model_version: string
          threats_detected: number | null
          total_predictions: number | null
          updated_at: string
        }
        Insert: {
          accuracy: number
          id?: string
          is_active?: boolean
          last_trained?: string | null
          model_name: string
          model_version: string
          threats_detected?: number | null
          total_predictions?: number | null
          updated_at?: string
        }
        Update: {
          accuracy?: number
          id?: string
          is_active?: boolean
          last_trained?: string | null
          model_name?: string
          model_version?: string
          threats_detected?: number | null
          total_predictions?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      network_packets: {
        Row: {
          created_at: string
          destination_ip: string
          destination_port: number
          flags: string | null
          id: string
          packet_size: number
          payload_preview: string | null
          protocol: string
          source_ip: string
          source_port: number
          timestamp: string
        }
        Insert: {
          created_at?: string
          destination_ip: string
          destination_port: number
          flags?: string | null
          id?: string
          packet_size: number
          payload_preview?: string | null
          protocol: string
          source_ip: string
          source_port: number
          timestamp?: string
        }
        Update: {
          created_at?: string
          destination_ip?: string
          destination_port?: number
          flags?: string | null
          id?: string
          packet_size?: number
          payload_preview?: string | null
          protocol?: string
          source_ip?: string
          source_port?: number
          timestamp?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      threats: {
        Row: {
          action_taken: string | null
          confidence: number
          created_at: string
          description: string | null
          id: string
          is_blocked: boolean | null
          ml_model_version: string | null
          packet_id: string | null
          severity: string
          source_ip: string
          status: string
          target_device: string | null
          threat_type: string
          timestamp: string
          updated_at: string
        }
        Insert: {
          action_taken?: string | null
          confidence: number
          created_at?: string
          description?: string | null
          id?: string
          is_blocked?: boolean | null
          ml_model_version?: string | null
          packet_id?: string | null
          severity: string
          source_ip: string
          status?: string
          target_device?: string | null
          threat_type: string
          timestamp?: string
          updated_at?: string
        }
        Update: {
          action_taken?: string | null
          confidence?: number
          created_at?: string
          description?: string | null
          id?: string
          is_blocked?: boolean | null
          ml_model_version?: string | null
          packet_id?: string | null
          severity?: string
          source_ip?: string
          status?: string
          target_device?: string | null
          threat_type?: string
          timestamp?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "threats_packet_id_fkey"
            columns: ["packet_id"]
            isOneToOne: false
            referencedRelation: "network_packets"
            referencedColumns: ["id"]
          },
        ]
      }
      traffic_stats: {
        Row: {
          bandwidth_mbps: number | null
          blocked_packets: number
          id: string
          safe_packets: number
          suspicious_packets: number
          timestamp: string
          total_packets: number
        }
        Insert: {
          bandwidth_mbps?: number | null
          blocked_packets?: number
          id?: string
          safe_packets?: number
          suspicious_packets?: number
          timestamp?: string
          total_packets?: number
        }
        Update: {
          bandwidth_mbps?: number | null
          blocked_packets?: number
          id?: string
          safe_packets?: number
          suspicious_packets?: number
          timestamp?: string
          total_packets?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
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
