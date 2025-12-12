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
          atendido: boolean | null
          bot_conversa_id: string | null
          cliente_id: string | null
          cliente_nome: string
          cliente_telefone: string
          confirmado_cliente: boolean | null
          created_at: string | null
          data: string
          desconto_aplicado: number | null
          horario: string
          id: string
          instancia: string | null
          observacoes: string | null
          origem: string | null
          profissional_id: string | null
          profissional_nome: string | null
          promocao_id: string | null
          servico_id: string | null
          servico_nome: string
          status: string | null
          status_pagamento: string | null
        }
        Insert: {
          atendido?: boolean | null
          bot_conversa_id?: string | null
          cliente_id?: string | null
          cliente_nome: string
          cliente_telefone: string
          confirmado_cliente?: boolean | null
          created_at?: string | null
          data: string
          desconto_aplicado?: number | null
          horario: string
          id?: string
          instancia?: string | null
          observacoes?: string | null
          origem?: string | null
          profissional_id?: string | null
          profissional_nome?: string | null
          promocao_id?: string | null
          servico_id?: string | null
          servico_nome: string
          status?: string | null
          status_pagamento?: string | null
        }
        Update: {
          atendido?: boolean | null
          bot_conversa_id?: string | null
          cliente_id?: string | null
          cliente_nome?: string
          cliente_telefone?: string
          confirmado_cliente?: boolean | null
          created_at?: string | null
          data?: string
          desconto_aplicado?: number | null
          horario?: string
          id?: string
          instancia?: string | null
          observacoes?: string | null
          origem?: string | null
          profissional_id?: string | null
          profissional_nome?: string | null
          promocao_id?: string | null
          servico_id?: string | null
          servico_nome?: string
          status?: string | null
          status_pagamento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_bot_conversa_id_fkey"
            columns: ["bot_conversa_id"]
            isOneToOne: false
            referencedRelation: "bot_conversas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_promocao_id_fkey"
            columns: ["promocao_id"]
            isOneToOne: false
            referencedRelation: "promocoes"
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
      agendamentos_auditoria: {
        Row: {
          agendamento_id: string | null
          created_at: string
          dados_antes: Json | null
          dados_depois: Json | null
          id: string
          origem: string | null
          tipo_evento: string
          usuario_responsavel: string | null
        }
        Insert: {
          agendamento_id?: string | null
          created_at?: string
          dados_antes?: Json | null
          dados_depois?: Json | null
          id?: string
          origem?: string | null
          tipo_evento: string
          usuario_responsavel?: string | null
        }
        Update: {
          agendamento_id?: string | null
          created_at?: string
          dados_antes?: Json | null
          dados_depois?: Json | null
          id?: string
          origem?: string | null
          tipo_evento?: string
          usuario_responsavel?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_auditoria_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_config: {
        Row: {
          chave: string
          id: string
          updated_at: string | null
          valor: Json
        }
        Insert: {
          chave: string
          id?: string
          updated_at?: string | null
          valor?: Json
        }
        Update: {
          chave?: string
          id?: string
          updated_at?: string | null
          valor?: Json
        }
        Relationships: []
      }
      bot_conversas: {
        Row: {
          bot_ativo: boolean
          cliente_nome: string | null
          contexto: Json | null
          created_at: string | null
          id: string
          instancia: string | null
          telefone: string
          ultimo_contato: string | null
        }
        Insert: {
          bot_ativo?: boolean
          cliente_nome?: string | null
          contexto?: Json | null
          created_at?: string | null
          id?: string
          instancia?: string | null
          telefone: string
          ultimo_contato?: string | null
        }
        Update: {
          bot_ativo?: boolean
          cliente_nome?: string | null
          contexto?: Json | null
          created_at?: string | null
          id?: string
          instancia?: string | null
          telefone?: string
          ultimo_contato?: string | null
        }
        Relationships: []
      }
      bot_mensagens: {
        Row: {
          conteudo: string
          conversa_id: string | null
          id: string
          telefone: string
          timestamp: string | null
          tipo: string
        }
        Insert: {
          conteudo: string
          conversa_id?: string | null
          id?: string
          telefone: string
          timestamp?: string | null
          tipo: string
        }
        Update: {
          conteudo?: string
          conversa_id?: string | null
          id?: string
          telefone?: string
          timestamp?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_mensagens_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "bot_conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_numeros_bloqueados: {
        Row: {
          created_at: string | null
          id: string
          motivo: string | null
          numero: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          motivo?: string | null
          numero: string
        }
        Update: {
          created_at?: string | null
          id?: string
          motivo?: string | null
          numero?: string
        }
        Relationships: []
      }
      bot_sessao: {
        Row: {
          created_at: string | null
          dados_sessao: Json | null
          id: string
          qr_code: string | null
          status: string
          ultima_atividade: string | null
        }
        Insert: {
          created_at?: string | null
          dados_sessao?: Json | null
          id?: string
          qr_code?: string | null
          status?: string
          ultima_atividade?: string | null
        }
        Update: {
          created_at?: string | null
          dados_sessao?: Json | null
          id?: string
          qr_code?: string | null
          status?: string
          ultima_atividade?: string | null
        }
        Relationships: []
      }
      cliente_fidelidade: {
        Row: {
          cliente_id: string | null
          created_at: string | null
          id: string
          nivel: string | null
          pontos_acumulados: number | null
          total_gasto: number | null
          total_servicos: number | null
          ultimo_servico: string | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string | null
          id?: string
          nivel?: string | null
          pontos_acumulados?: number | null
          total_gasto?: number | null
          total_servicos?: number | null
          ultimo_servico?: string | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string | null
          id?: string
          nivel?: string | null
          pontos_acumulados?: number | null
          total_gasto?: number | null
          total_servicos?: number | null
          ultimo_servico?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_fidelidade_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: true
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          created_at: string | null
          data_nascimento: string | null
          email: string | null
          id: string
          nome: string
          telefone: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_nascimento?: string | null
          email?: string | null
          id?: string
          nome: string
          telefone: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_nascimento?: string | null
          email?: string | null
          id?: string
          nome?: string
          telefone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      comissoes_pagas: {
        Row: {
          created_at: string | null
          id: string
          percentual_aplicado: number
          periodo_fim: string
          periodo_inicio: string
          profissional_id: string | null
          profissional_nome: string
          valor_comissao: number
          valor_total_servicos: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          percentual_aplicado: number
          periodo_fim: string
          periodo_inicio: string
          profissional_id?: string | null
          profissional_nome: string
          valor_comissao: number
          valor_total_servicos: number
        }
        Update: {
          created_at?: string | null
          id?: string
          percentual_aplicado?: number
          periodo_fim?: string
          periodo_inicio?: string
          profissional_id?: string | null
          profissional_nome?: string
          valor_comissao?: number
          valor_total_servicos?: number
        }
        Relationships: [
          {
            foreignKeyName: "comissoes_pagas_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais"
            referencedColumns: ["id"]
          },
        ]
      }
      despesas: {
        Row: {
          categoria: string | null
          comprovante_url: string | null
          created_at: string | null
          data: string
          descricao: string
          id: string
          metodo_pagamento: string | null
          valor: number
        }
        Insert: {
          categoria?: string | null
          comprovante_url?: string | null
          created_at?: string | null
          data: string
          descricao: string
          id?: string
          metodo_pagamento?: string | null
          valor: number
        }
        Update: {
          categoria?: string | null
          comprovante_url?: string | null
          created_at?: string | null
          data?: string
          descricao?: string
          id?: string
          metodo_pagamento?: string | null
          valor?: number
        }
        Relationships: []
      }
      fluxos_automaticos: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          dias_apos_evento: number | null
          hora_envio: string | null
          id: string
          mensagem_template: string
          tipo: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          dias_apos_evento?: number | null
          hora_envio?: string | null
          id?: string
          mensagem_template: string
          tipo: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          dias_apos_evento?: number | null
          hora_envio?: string | null
          id?: string
          mensagem_template?: string
          tipo?: string
        }
        Relationships: []
      }
      lembretes_enviados: {
        Row: {
          agendamento_id: string | null
          cliente_nome: string
          cliente_telefone: string
          created_at: string | null
          data_envio: string | null
          id: string
          servico_nome: string | null
          tipo_lembrete: string
        }
        Insert: {
          agendamento_id?: string | null
          cliente_nome: string
          cliente_telefone: string
          created_at?: string | null
          data_envio?: string | null
          id?: string
          servico_nome?: string | null
          tipo_lembrete: string
        }
        Update: {
          agendamento_id?: string | null
          cliente_nome?: string
          cliente_telefone?: string
          created_at?: string | null
          data_envio?: string | null
          id?: string
          servico_nome?: string | null
          tipo_lembrete?: string
        }
        Relationships: [
          {
            foreignKeyName: "lembretes_enviados_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens_agendadas: {
        Row: {
          cliente_id: string | null
          created_at: string | null
          data_envio: string
          fluxo_id: string | null
          id: string
          status: string | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string | null
          data_envio: string
          fluxo_id?: string | null
          id?: string
          status?: string | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string | null
          data_envio?: string
          fluxo_id?: string | null
          id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_agendadas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_agendadas_fluxo_id_fkey"
            columns: ["fluxo_id"]
            isOneToOne: false
            referencedRelation: "fluxos_automaticos"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes_estoque: {
        Row: {
          created_at: string | null
          id: string
          motivo: string | null
          produto_id: string | null
          quantidade: number
          tipo: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          motivo?: string | null
          produto_id?: string | null
          quantidade: number
          tipo: string
        }
        Update: {
          created_at?: string | null
          id?: string
          motivo?: string | null
          produto_id?: string | null
          quantidade?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
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
      produtos: {
        Row: {
          categoria: string | null
          created_at: string | null
          descricao: string | null
          fornecedor: string | null
          id: string
          nome: string
          preco_custo: number | null
          preco_venda: number | null
          quantidade_atual: number | null
          quantidade_minima: number | null
        }
        Insert: {
          categoria?: string | null
          created_at?: string | null
          descricao?: string | null
          fornecedor?: string | null
          id?: string
          nome: string
          preco_custo?: number | null
          preco_venda?: number | null
          quantidade_atual?: number | null
          quantidade_minima?: number | null
        }
        Update: {
          categoria?: string | null
          created_at?: string | null
          descricao?: string | null
          fornecedor?: string | null
          id?: string
          nome?: string
          preco_custo?: number | null
          preco_venda?: number | null
          quantidade_atual?: number | null
          quantidade_minima?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          nome: string
          telefone: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          nome: string
          telefone?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          nome?: string
          telefone?: string | null
        }
        Relationships: []
      }
      profissionais: {
        Row: {
          ativo: boolean | null
          comissao_percentual: number | null
          created_at: string | null
          email: string | null
          especialidades: string[] | null
          id: string
          nome: string
          telefone: string | null
        }
        Insert: {
          ativo?: boolean | null
          comissao_percentual?: number | null
          created_at?: string | null
          email?: string | null
          especialidades?: string[] | null
          id?: string
          nome: string
          telefone?: string | null
        }
        Update: {
          ativo?: boolean | null
          comissao_percentual?: number | null
          created_at?: string | null
          email?: string | null
          especialidades?: string[] | null
          id?: string
          nome?: string
          telefone?: string | null
        }
        Relationships: []
      }
      promocoes: {
        Row: {
          ativa: boolean | null
          created_at: string | null
          data_fim: string
          data_inicio: string
          desconto_porcentagem: number | null
          desconto_valor: number | null
          descricao: string | null
          id: string
          motivo: string | null
          nome: string
        }
        Insert: {
          ativa?: boolean | null
          created_at?: string | null
          data_fim: string
          data_inicio: string
          desconto_porcentagem?: number | null
          desconto_valor?: number | null
          descricao?: string | null
          id?: string
          motivo?: string | null
          nome: string
        }
        Update: {
          ativa?: boolean | null
          created_at?: string | null
          data_fim?: string
          data_inicio?: string
          desconto_porcentagem?: number | null
          desconto_valor?: number | null
          descricao?: string | null
          id?: string
          motivo?: string | null
          nome?: string
        }
        Relationships: []
      }
      regras_fidelidade: {
        Row: {
          created_at: string | null
          desconto_resgate: number | null
          id: string
          pontos_por_real: number | null
          pontos_resgate: number | null
        }
        Insert: {
          created_at?: string | null
          desconto_resgate?: number | null
          id?: string
          pontos_por_real?: number | null
          pontos_resgate?: number | null
        }
        Update: {
          created_at?: string | null
          desconto_resgate?: number | null
          id?: string
          pontos_por_real?: number | null
          pontos_resgate?: number | null
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
      sistema_logs: {
        Row: {
          created_at: string | null
          detalhes: Json | null
          id: string
          mensagem: string
          severidade: string
          tipo: string
        }
        Insert: {
          created_at?: string | null
          detalhes?: Json | null
          id?: string
          mensagem: string
          severidade: string
          tipo: string
        }
        Update: {
          created_at?: string | null
          detalhes?: Json | null
          id?: string
          mensagem?: string
          severidade?: string
          tipo?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      uso_ia: {
        Row: {
          created_at: string | null
          custo_estimado: number | null
          data: string
          gemini_erro: number | null
          gemini_sucesso: number | null
          id: string
          lovable_erro: number | null
          lovable_sucesso: number | null
          total_requisicoes: number | null
        }
        Insert: {
          created_at?: string | null
          custo_estimado?: number | null
          data: string
          gemini_erro?: number | null
          gemini_sucesso?: number | null
          id?: string
          lovable_erro?: number | null
          lovable_sucesso?: number | null
          total_requisicoes?: number | null
        }
        Update: {
          created_at?: string | null
          custo_estimado?: number | null
          data?: string
          gemini_erro?: number | null
          gemini_sucesso?: number | null
          id?: string
          lovable_erro?: number | null
          lovable_sucesso?: number | null
          total_requisicoes?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "profissional"
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
      app_role: ["super_admin", "admin", "profissional"],
    },
  },
} as const
