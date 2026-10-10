export type Contexto = {
  membro: { id: string; nome: string; email: string };
  outro_membro: { nome: string };
  /** Primeiro dia do mês corrente, `YYYY-MM-01`. */
  mes_corrente: string;
  /** Data de hoje, `YYYY-MM-DD`. */
  hoje: string;
};
