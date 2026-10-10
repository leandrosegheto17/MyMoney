// Tipos do schema `api` (espelho de backend/supabase/schemas/api), no formato do `supabase gen types`.
// Ao criar ou alterar uma função ou view de `api`, atualize este arquivo junto.

export type Json = string | number | boolean | null | { [chave: string]: Json | undefined } | Json[];

export type Database = {
  api: {
    Tables: { [_ in never]: never };
    // Insert/Update permissivos: as views são somente leitura e os casos provam que a escrita é negada.
    Views: {
      categorias: {
        Row: { id: string; nome: string; tipo: string; escopo: string; variavel: boolean; arquivada: boolean };
        Insert: Partial<Record<string, unknown>>;
        Update: Partial<Record<string, unknown>>;
        Relationships: [];
      };
      contas: {
        Row: {
          id: string;
          nome: string;
          saldo_inicial_centavos: number;
          saldo_centavos: number;
          arquivada: boolean;
          pode_excluir: boolean;
        };
        Insert: Partial<Record<string, unknown>>;
        Update: Partial<Record<string, unknown>>;
        Relationships: [];
      };
      despesas_fixas: {
        Row: {
          id: string;
          descricao: string;
          categoria_id: string;
          categoria: string;
          valor_previsto_centavos: number;
          dia_vencimento: number;
          encerrada_em: string | null;
        };
        Insert: Partial<Record<string, unknown>>;
        Update: Partial<Record<string, unknown>>;
        Relationships: [];
      };
      formas_pagamento: {
        Row: {
          id: string;
          nome: string;
          tipo: string;
          conta: unknown;
          dia_vencimento: number | null;
          preferida: boolean;
          arquivada: boolean;
          pode_excluir: boolean;
          gasto_mes_centavos: number | null;
          comprometido_futuro_centavos: number | null;
        };
        Insert: Partial<Record<string, unknown>>;
        Update: Partial<Record<string, unknown>>;
        Relationships: [];
      };
      metas: {
        Row: {
          id: string;
          nome: string;
          escopo: string;
          alvo_centavos: number;
          guardado_centavos: number;
          falta_centavos: number;
          percentual: number;
          prazo: string | null;
          mensal_necessario_centavos: number | null;
          atingida: boolean;
          por_local: unknown;
        };
        Insert: Partial<Record<string, unknown>>;
        Update: Partial<Record<string, unknown>>;
        Relationships: [];
      };
    };
    Functions: {
      ajustar_saldo: {
        Args: { p_conta_id: string; p_saldo_real_centavos: number; p_simular?: boolean | null };
        Returns: number;
      };
      alterar_data_parcela: { Args: { p_parcela_id: string; p_data: string }; Returns: undefined };
      arquivar_categoria: { Args: { p_id: string }; Returns: undefined };
      arquivar_conta: { Args: { p_id: string }; Returns: undefined };
      arquivar_forma: { Args: { p_id: string }; Returns: undefined };
      contexto: { Args: never; Returns: unknown };
      dados_lancamento: { Args: never; Returns: unknown };
      definir_orcamento: {
        Args: { p_mes: string; p_categoria_id: string; p_valor_centavos?: number | null };
        Returns: undefined;
      };
      definir_preferida: { Args: { p_id: string; p_preferida?: boolean | null }; Returns: undefined };
      desfazer_pagamento: { Args: { p_ocorrencia_id: string }; Returns: undefined };
      editar_lancamento: {
        Args: {
          p_id: string;
          p_valor_total_centavos?: number | null;
          p_categoria_id?: string | null;
          p_descricao?: string | null;
          p_data?: string | null;
          p_forma_id?: string | null;
          p_num_parcelas?: number | null;
          p_confirmar_descarte?: boolean | null;
        };
        Returns: unknown;
      };
      encerrar_despesa_fixa: { Args: { p_id: string }; Returns: undefined };
      excluir_categoria: { Args: { p_id: string }; Returns: undefined };
      excluir_conta: { Args: { p_id: string }; Returns: undefined };
      excluir_forma: { Args: { p_id: string }; Returns: undefined };
      excluir_lancamento: { Args: { p_id: string }; Returns: undefined };
      inicializar_membro: { Args: never; Returns: undefined };
      lancamento: { Args: { p_id: string }; Returns: unknown };
      lancamentos_mes: {
        Args: {
          p_mes: string;
          p_escopo?: string | null;
          p_categoria_id?: string | null;
          p_forma_id?: string | null;
          p_variavel?: boolean | null;
        };
        Returns: unknown;
      };
      lancar_despesa: {
        Args: {
          p_id: string;
          p_valor_centavos: number;
          p_categoria_id: string;
          p_forma_id: string;
          p_parcelas?: number | null;
          p_data?: string | null;
          p_descricao?: string | null;
        };
        Returns: unknown;
      };
      lancar_receita: {
        Args: {
          p_id: string;
          p_valor_centavos: number;
          p_categoria_id: string;
          p_conta_id: string;
          p_data?: string | null;
          p_descricao?: string | null;
        };
        Returns: unknown;
      };
      locais_guardados: { Args: never; Returns: unknown };
      movimentar_meta: {
        Args: {
          p_id: string;
          p_meta_id: string;
          p_tipo: string;
          p_valor_centavos: number;
          p_local: string;
          p_data?: string | null;
          p_conta_id?: string | null;
        };
        Returns: string;
      };
      movimentos_meta: { Args: { p_meta_id: string }; Returns: unknown };
      ocorrencias_mes: { Args: { p_mes: string }; Returns: unknown };
      orcamento_mes: { Args: { p_mes?: string | null; p_escopo?: string | null }; Returns: unknown };
      pagar_ocorrencia: {
        Args: {
          p_id: string;
          p_ocorrencia_id: string;
          p_forma_id: string;
          p_valor_centavos?: number | null;
          p_data?: string | null;
        };
        Returns: unknown;
      };
      ping: { Args: never; Returns: number };
      registrar_pagamento_cartao: {
        Args: {
          p_id: string;
          p_forma_id: string;
          p_conta_id: string;
          p_valor_centavos: number;
          p_data?: string | null;
        };
        Returns: string;
      };
      resumo_mes: { Args: { p_mes?: string | null }; Returns: unknown };
      salvar_categoria: {
        Args: { p_id: string; p_nome: string; p_tipo: string; p_escopo: string; p_variavel?: boolean | null };
        Returns: string;
      };
      salvar_conta: {
        Args: { p_id: string; p_nome: string; p_saldo_inicial_centavos?: number | null };
        Returns: string;
      };
      salvar_despesa_fixa: {
        Args: {
          p_id: string;
          p_descricao: string;
          p_categoria_id: string;
          p_valor_previsto_centavos: number;
          p_dia_vencimento: number;
        };
        Returns: string;
      };
      salvar_forma: {
        Args: {
          p_id: string;
          p_nome: string;
          p_tipo: string;
          p_conta_id?: string | null;
          p_dia_vencimento?: number | null;
        };
        Returns: string;
      };
      salvar_meta: {
        Args: {
          p_id: string;
          p_nome: string;
          p_alvo_centavos: number;
          p_prazo?: string | null;
          p_escopo?: string | null;
        };
        Returns: string;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
