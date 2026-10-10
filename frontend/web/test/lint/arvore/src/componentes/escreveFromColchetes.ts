declare const s: {
  from: (tabela: string) => { insert: (valor: object) => unknown };
};

export const usa = s['from']('t').insert({});
