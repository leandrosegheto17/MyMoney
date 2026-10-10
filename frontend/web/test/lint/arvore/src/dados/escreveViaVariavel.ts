declare const supabase: {
  from: (tabela: string) => { insert: (valor: object) => unknown };
};

const q = supabase.from('x');
export const usa = q.insert({});
