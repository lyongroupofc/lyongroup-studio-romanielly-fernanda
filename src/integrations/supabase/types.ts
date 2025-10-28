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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agenda_config: {
        Row: {
          created_at: string | null
          data: string
          fechado: boolean | null
          horarios_bloqueados: string[] | null
          horarios_extras: string[] | null
          id: string
          observacoes: string | null
        }
        Insert: {
          created_at?: string | null
          data: string
          fechado?: boolean | null
          horarios_bloqueados?: string[] | null
          horarios_extras?: string[] | null
          id?: string
          observacoes?: string | null
        }
        Update: {
          created_at?: string | null
          data?: string
          fechado?: boolean | null
          horarios_bloqueados?: string[] | null
          horarios_extras?: string[] | null
          id?: string
          observacoes?: string | null
        }
        Relationships: []
      }
      agendamentos: {
        Row: {
          cliente_nome: string
          cliente_telefone: string
          created_at: string | null
          data: string
          horario: string
          id: string
          observacoes: string | null
          profissional_id: string | null
          profissional_nome: string | null
          servico_id: string | null
          servico_nome: string
          status: string | null
        }
        Insert: {
          cliente_nome: string
          cliente_telefone: string
          created_at?: string | null
          data: string
          horario: string
          id?: string
          observacoes?: string | null
          profissional_id?: string | null
          profissional_nome?: string | null
          servico_id?: string | null
          servico_nome: string
          status?: string | null
        }
        Update: {
          cliente_nome?: string
          cliente_telefone?: string
          created_at?: string | null
          data?: string
          horario?: string
          id?: string
          observacoes?: string | null
          profissional_id?: string | null
          profissional_nome?: string | null
          servico_id?: string | null
          servico_nome?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos: {
        Row: {
          agendamento_id: string | null
          cliente_nome: string
          created_at: string | null
          data: string
          id: string
          metodo_pagamento: string | null
          servico: string
          status: string | null
          valor: number
        }
        Insert: {
          agendamento_id?: string | null
          cliente_nome: string
          created_at?: string | null
          data: string
          id?: string
          metodo_pagamento?: string | null
          servico: string
          status?: string | null
          valor: number
        }
        Update: {
          agendamento_id?: string | null
          cliente_nome?: string
          created_at?: string | null
          data?: string
          id?: string
          metodo_pagamento?: string | null
          servico?: string
          status?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      profissionais: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          email: string | null
          especialidades: string[] | null
          id: string
          nome: string
          telefone: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          email?: string | null
          especialidades?: string[] | null
          id?: string
          nome: string
          telefone?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          email?: string | null
          especialidades?: string[] | null
          id?: string
          nome?: string
          telefone?: string | null
        }
        Relationships: []
      }
      servicos: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          duracao: number
          id: string
          nome: string
          preco: number
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          duracao: number
          id?: string
          nome: string
          preco: number
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          duracao?: number
          id?: string
          nome?: string
          preco?: number
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
