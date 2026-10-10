declare const supabase: {
  schema: (nome: string) => { from: (tabela: string) => { delete: () => unknown } };
};

export const usa = supabase.schema('api').from('x').delete();
