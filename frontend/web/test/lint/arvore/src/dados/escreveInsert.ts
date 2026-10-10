declare const supabase: {
  from: (tabela: string) => { insert: (valor: object) => unknown };
};

export const usa = supabase.from('x').insert({});
