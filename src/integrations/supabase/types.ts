export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      bank_accounts: {
        Row: {
          account_type: string
          balance: number | null
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          account_type: string
          balance?: number | null
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          account_type?: string
          balance?: number | null
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      bank_transactions: {
        Row: {
          amount: number
          bank_account_id: string
          category: string | null
          created_at: string | null
          description: string
          id: string
          reference_id: string | null
          reference_type: string | null
          transaction_date: string
          transaction_type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          bank_account_id: string
          category?: string | null
          created_at?: string | null
          description: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          transaction_date?: string
          transaction_type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string
          category?: string | null
          created_at?: string | null
          description?: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          transaction_date?: string
          transaction_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      collaborators: {
        Row: {
          created_at: string
          created_by: string
          email: string
          id: string
          name: string
          phone: string | null
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          email: string
          id?: string
          name: string
          phone?: string | null
          role?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          role?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_expenses: {
        Row: {
          category: string
          created_at: string
          created_by: string
          description: string
          expense_bank_account: string | null
          expense_date: string | null
          id: string
          notes: string | null
          quantity: number
          receipt_url: string | null
          supplier: string | null
          total_price: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by: string
          description: string
          expense_bank_account?: string | null
          expense_date?: string | null
          id?: string
          notes?: string | null
          quantity?: number
          receipt_url?: string | null
          supplier?: string | null
          total_price?: number
          unit_price?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          description?: string
          expense_bank_account?: string | null
          expense_date?: string | null
          id?: string
          notes?: string | null
          quantity?: number
          receipt_url?: string | null
          supplier?: string | null
          total_price?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          address: string | null
          cnpj: string | null
          company_name: string
          created_at: string
          email: string | null
          id: string
          phone: string | null
          tagline: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          cnpj?: string | null
          company_name?: string
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
          tagline?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          cnpj?: string | null
          company_name?: string
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
          tagline?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      equipment: {
        Row: {
          available: number
          category: string
          created_at: string
          description: string | null
          id: string
          name: string
          price_per_day: number
          rented: number
          status: string
          total_stock: number
          updated_at: string
        }
        Insert: {
          available?: number
          category: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price_per_day?: number
          rented?: number
          status?: string
          total_stock?: number
          updated_at?: string
        }
        Update: {
          available?: number
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price_per_day?: number
          rented?: number
          status?: string
          total_stock?: number
          updated_at?: string
        }
        Relationships: []
      }
      event_collaborators: {
        Row: {
          assigned_by: string
          collaborator_email: string
          collaborator_name: string
          created_at: string
          event_id: string
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          assigned_by: string
          collaborator_email: string
          collaborator_name: string
          created_at?: string
          event_id: string
          id?: string
          role?: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string
          collaborator_email?: string
          collaborator_name?: string
          created_at?: string
          event_id?: string
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_collaborators_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_equipment: {
        Row: {
          assigned_by: string
          created_at: string
          description: string | null
          equipment_name: string
          event_id: string
          id: string
          quantity: number
          status: string
          updated_at: string
        }
        Insert: {
          assigned_by: string
          created_at?: string
          description?: string | null
          equipment_name: string
          event_id: string
          id?: string
          quantity?: number
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string
          created_at?: string
          description?: string | null
          equipment_name?: string
          event_id?: string
          id?: string
          quantity?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_equipment_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_expenses: {
        Row: {
          category: string
          created_at: string
          created_by: string
          description: string
          event_id: string
          expense_bank_account: string | null
          expense_date: string | null
          id: string
          notes: string | null
          quantity: number
          receipt_url: string | null
          supplier: string | null
          total_price: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by: string
          description: string
          event_id: string
          expense_bank_account?: string | null
          expense_date?: string | null
          id?: string
          notes?: string | null
          quantity?: number
          receipt_url?: string | null
          supplier?: string | null
          total_price: number
          unit_price: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          description?: string
          event_id?: string
          expense_bank_account?: string | null
          expense_date?: string | null
          id?: string
          notes?: string | null
          quantity?: number
          receipt_url?: string | null
          supplier?: string | null
          total_price?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_credentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_expenses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          client_email: string | null
          client_name: string
          client_phone: string | null
          created_at: string
          created_by: string
          description: string | null
          event_date: string
          event_time: string | null
          id: string
          is_paid: boolean | null
          location: string | null
          name: string
          payment_amount: number | null
          payment_bank_account: string | null
          payment_date: string | null
          payment_type: string | null
          profit_margin: number | null
          setup_start_date: string | null
          status: string
          total_budget: number | null
          total_expenses: number | null
          updated_at: string
        }
        Insert: {
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          event_date: string
          event_time?: string | null
          id?: string
          is_paid?: boolean | null
          location?: string | null
          name: string
          payment_amount?: number | null
          payment_bank_account?: string | null
          payment_date?: string | null
          payment_type?: string | null
          profit_margin?: number | null
          setup_start_date?: string | null
          status?: string
          total_budget?: number | null
          total_expenses?: number | null
          updated_at?: string
        }
        Update: {
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          event_date?: string
          event_time?: string | null
          id?: string
          is_paid?: boolean | null
          location?: string | null
          name?: string
          payment_amount?: number | null
          payment_bank_account?: string | null
          payment_date?: string | null
          payment_type?: string | null
          profit_margin?: number | null
          setup_start_date?: string | null
          status?: string
          total_budget?: number | null
          total_expenses?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_credentials"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_records: {
        Row: {
          completed_date: string | null
          cost: number | null
          created_at: string
          created_by: string
          description: string
          equipment_id: string
          equipment_name: string
          id: string
          maintenance_type: string
          priority: string
          problem_description: string | null
          quantity: number
          scheduled_date: string
          solution_description: string | null
          status: string
          technician_contact: string | null
          technician_name: string | null
          updated_at: string
        }
        Insert: {
          completed_date?: string | null
          cost?: number | null
          created_at?: string
          created_by: string
          description: string
          equipment_id: string
          equipment_name: string
          id?: string
          maintenance_type: string
          priority?: string
          problem_description?: string | null
          quantity?: number
          scheduled_date: string
          solution_description?: string | null
          status?: string
          technician_contact?: string | null
          technician_name?: string | null
          updated_at?: string
        }
        Update: {
          completed_date?: string | null
          cost?: number | null
          created_at?: string
          created_by?: string
          description?: string
          equipment_id?: string
          equipment_name?: string
          id?: string
          maintenance_type?: string
          priority?: string
          problem_description?: string | null
          quantity?: number
          scheduled_date?: string
          solution_description?: string | null
          status?: string
          technician_contact?: string | null
          technician_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          can_edit: boolean
          can_view: boolean
          created_at: string
          id: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          permission_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credentials: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_login: string | null
          name: string
          password_hash: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_login?: string | null
          name: string
          password_hash: string
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_login?: string | null
          name?: string
          password_hash?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
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
          role: Database["public"]["Enums"]["app_role"]
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
      user_theme_preferences: {
        Row: {
          color_scheme: string
          created_at: string | null
          custom_colors: Json | null
          id: string
          theme: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color_scheme?: string
          created_at?: string | null
          custom_colors?: Json | null
          id?: string
          theme?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color_scheme?: string
          created_at?: string | null
          custom_colors?: Json | null
          id?: string
          theme?: string
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
      authenticate_user: {
        Args: { p_username: string; p_password: string }
        Returns: {
          user_id: string
          username: string
          name: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      calculate_account_balance: {
        Args: { account_name_param: string }
        Returns: number
      }
      calculate_balance_from_transactions: {
        Args: { account_id_param: string }
        Returns: number
      }
      force_recalculate_equipment_stock: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      force_sync_all_balances: {
        Args: Record<PropertyKey, never>
        Returns: {
          account_name: string
          old_balance: number
          new_balance: number
          income_total: number
          expense_total: number
        }[]
      }
      get_account_statement: {
        Args: { account_name_param: string }
        Returns: {
          transaction_date: string
          description: string
          amount: number
          transaction_type: string
          category: string
          running_balance: number
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_permission: {
        Args: {
          _user_id: string
          _permission_name: string
          _access_type?: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      manual_update_bank_balances: {
        Args: Record<PropertyKey, never>
        Returns: {
          account_name: string
          old_balance: number
          new_balance: number
        }[]
      }
      promote_user_to_admin: {
        Args: { user_email: string }
        Returns: undefined
      }
      sync_bank_transactions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_account_balances_from_statements: {
        Args: Record<PropertyKey, never>
        Returns: {
          account_name: string
          old_balance: number
          new_balance: number
          transaction_count: number
        }[]
      }
      update_all_account_balances_from_transactions: {
        Args: Record<PropertyKey, never>
        Returns: {
          account_name: string
          old_balance: number
          new_balance: number
          total_income: number
          total_expenses: number
          transaction_count: number
        }[]
      }
      update_bank_account_balances: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_single_account_balance: {
        Args: { account_name_param: string }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "funcionario" | "financeiro" | "deposito"
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
      app_role: ["admin", "funcionario", "financeiro", "deposito"],
    },
  },
} as const
