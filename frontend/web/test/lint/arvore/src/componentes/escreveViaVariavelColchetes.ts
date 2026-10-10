declare const s: {
  from: (tabela: string) => { insert: (valor: object) => unknown };
};

const q = s['from']('t');
export const usa = q.insert({});
