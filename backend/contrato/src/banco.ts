
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "api": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            "categorias": {
                  Row: {
                    "arquivada": boolean | null,"escopo": string | null,"id": string | null,"nome": string | null,"pode_excluir": boolean | null,"tipo": string | null,"variavel": boolean | null
                  }
                  ComputedFields: never
                  Insert: {
                           "arquivada"?: boolean | null,"escopo"?: string | null,"id"?: string | null,"nome"?: string | null,"pode_excluir"?: never,"tipo"?: string | null,"variavel"?: boolean | null
                         }
                        Update: {
                           "arquivada"?: boolean | null,"escopo"?: string | null,"id"?: string | null,"nome"?: string | null,"pode_excluir"?: never,"tipo"?: string | null,"variavel"?: boolean | null
                         }
                        Relationships: [
                    
                  ]
                },"contas": {
                  Row: {
                    "arquivada": boolean | null,"id": string | null,"nome": string | null,"pode_excluir": boolean | null,"saldo_centavos": number | null,"saldo_inicial_centavos": number | null
                  }
                  ComputedFields: never
                  Insert: {
                           "arquivada"?: boolean | null,"id"?: string | null,"nome"?: string | null,"pode_excluir"?: never,"saldo_centavos"?: never,"saldo_inicial_centavos"?: number | null
                         }
                        Update: {
                           "arquivada"?: boolean | null,"id"?: string | null,"nome"?: string | null,"pode_excluir"?: never,"saldo_centavos"?: never,"saldo_inicial_centavos"?: number | null
                         }
                        Relationships: [
                    
                  ]
                },"despesas_fixas": {
                  Row: {
                    "categoria": string | null,"categoria_id": string | null,"descricao": string | null,"dia_vencimento": number | null,"encerrada_em": string | null,"id": string | null,"valor_previsto_centavos": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"formas_pagamento": {
                  Row: {
                    "arquivada": boolean | null,"comprometido_futuro_centavos": number | null,"conta": Json | null,"dia_vencimento": number | null,"gasto_mes_centavos": number | null,"id": string | null,"nome": string | null,"pode_excluir": boolean | null,"preferida": boolean | null,"tipo": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"metas": {
                  Row: {
                    "alvo_centavos": number | null,"atingida": boolean | null,"escopo": string | null,"falta_centavos": number | null,"guardado_centavos": number | null,"id": string | null,"mensal_necessario_centavos": number | null,"nome": string | null,"percentual": number | null,"por_local": Json | null,"prazo": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "ajustar_saldo":
{ Args: { "p_conta_id": string,"p_saldo_real_centavos": number,"p_simular"?: boolean }; Returns: number
                           },
"alterar_data_parcela":
{ Args: { "p_data": string,"p_parcela_id": string }; Returns: undefined
                           },
"arquivar_categoria":
{ Args: { "p_id": string }; Returns: undefined
                           },
"arquivar_conta":
{ Args: { "p_id": string }; Returns: undefined
                           },
"arquivar_forma":
{ Args: { "p_id": string }; Returns: undefined
                           },
"contexto":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"copiar_orcamento":
{ Args: { "p_escopo": string,"p_mes": string }; Returns: number
                           },
"dados_lancamento":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"definir_orcamento":
{ Args: { "p_categoria_id": string,"p_mes": string,"p_valor_centavos"?: number }; Returns: undefined
                           },
"definir_preferida":
{ Args: { "p_id": string,"p_preferida"?: boolean }; Returns: undefined
                           },
"desfazer_pagamento":
{ Args: { "p_ocorrencia_id": string }; Returns: undefined
                           },
"editar_lancamento":
{ Args: { "p_categoria_id"?: string,"p_confirmar_descarte"?: boolean,"p_data"?: string,"p_descricao"?: string,"p_forma_id"?: string,"p_id": string,"p_num_parcelas"?: number,"p_valor_total_centavos"?: number }; Returns: Json
                           },
"encerrar_despesa_fixa":
{ Args: { "p_id": string }; Returns: undefined
                           },
"excluir_categoria":
{ Args: { "p_id": string }; Returns: undefined
                           },
"excluir_conta":
{ Args: { "p_id": string }; Returns: undefined
                           },
"excluir_forma":
{ Args: { "p_id": string }; Returns: undefined
                           },
"excluir_lancamento":
{ Args: { "p_id": string }; Returns: undefined
                           },
"inicializar_membro":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"lancamento":
{ Args: { "p_id": string }; Returns: Json
                           },
"lancamentos_mes":
{ Args: { "p_categoria_id"?: string,"p_escopo"?: string,"p_forma_id"?: string,"p_mes": string,"p_variavel"?: boolean }; Returns: Json
                           },
"lancar_despesa":
{ Args: { "p_categoria_id": string,"p_data"?: string,"p_descricao"?: string,"p_forma_id": string,"p_id": string,"p_parcelas"?: number,"p_valor_centavos": number }; Returns: Json
                           },
"lancar_receita":
{ Args: { "p_categoria_id": string,"p_conta_id": string,"p_data"?: string,"p_descricao"?: string,"p_id": string,"p_valor_centavos": number }; Returns: Json
                           },
"locais_guardados":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"movimentar_meta":
{ Args: { "p_conta_id"?: string,"p_data"?: string,"p_id": string,"p_local": string,"p_meta_id": string,"p_tipo": string,"p_valor_centavos": number }; Returns: string
                           },
"movimentos_meta":
{ Args: { "p_meta_id": string }; Returns: Json
                           },
"ocorrencias_mes":
{ Args: { "p_mes": string }; Returns: Json
                           },
"orcamento_mes":
{ Args: { "p_escopo"?: string,"p_mes"?: string }; Returns: Json
                           },
"pagar_ocorrencia":
{ Args: { "p_data"?: string,"p_forma_id": string,"p_id": string,"p_ocorrencia_id": string,"p_valor_centavos"?: number }; Returns: Json
                           },
"ping":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"registrar_pagamento_cartao":
{ Args: { "p_conta_id": string,"p_data"?: string,"p_forma_id": string,"p_id": string,"p_valor_centavos": number }; Returns: string
                           },
"resumo_mes":
{ Args: { "p_mes"?: string }; Returns: Json
                           },
"salvar_categoria":
{ Args: { "p_escopo": string,"p_id": string,"p_nome": string,"p_tipo": string,"p_variavel"?: boolean }; Returns: string
                           },
"salvar_conta":
{ Args: { "p_id": string,"p_nome": string,"p_saldo_inicial_centavos"?: number }; Returns: string
                           },
"salvar_despesa_fixa":
{ Args: { "p_categoria_id": string,"p_descricao": string,"p_dia_vencimento": number,"p_id": string,"p_valor_previsto_centavos": number }; Returns: string
                           },
"salvar_forma":
{ Args: { "p_conta_id"?: string,"p_dia_vencimento"?: number,"p_id": string,"p_nome": string,"p_tipo": string }; Returns: string
                           },
"salvar_meta":
{ Args: { "p_alvo_centavos": number,"p_escopo"?: string,"p_id": string,"p_nome": string,"p_prazo"?: string }; Returns: string
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "api": {
          Enums: {
            
          }
        }
} as const
