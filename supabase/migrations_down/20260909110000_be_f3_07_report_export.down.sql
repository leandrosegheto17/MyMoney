-- Rollback manual de 20260909110000_be_f3_07_report_export.sql
-- Aplicar apenas via decisão explícita: supabase db query --linked --file <este arquivo>
-- Nota: NÃO remove o bucket `exports` nem seus objetos (pode conter exports
-- de usuário ainda dentro da janela de retenção de 24h, ADR-011) — decisão
-- deliberada de rollback conservador, mesmo espírito de rollback down já
-- adotado neste projeto (nunca destrói dado de usuário silenciosamente). Se
-- o bucket precisar ser removido de fato, isso é uma decisão operacional
-- separada, fora deste rollback automático.

drop policy if exists "exports_insert_own" on storage.objects;
drop policy if exists "exports_select_own" on storage.objects;
drop function if exists public.get_report_export_rows(date, date);
