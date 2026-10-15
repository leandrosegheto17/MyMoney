// Entrada pela T01 real com os usuários do seed; o e-mail e a senha vêm do ambiente (backend/.env.example).
import { expect, type Page } from '@playwright/test';
import { lerEnvLocal } from '../../apoio/limpeza-local';
import { lerAmbienteIntegracao, type AmbienteIntegracao } from './ambiente';

export type Quem = 'A' | 'B' | 'semMembro';

/** Lê o ambiente e recusa host que não seja o Supabase local, antes de qualquer navegador. */
export function ambienteIntegracao(): AmbienteIntegracao {
  return lerAmbienteIntegracao(lerEnvLocal());
}

export function emailDe(quem: Quem, ambiente: AmbienteIntegracao = ambienteIntegracao()): string {
  return { A: ambiente.emailA, B: ambiente.emailB, semMembro: ambiente.emailSemMembro }[quem];
}

export async function entrarComo(page: Page, quem: Quem): Promise<void> {
  const ambiente = ambienteIntegracao();
  await page.goto('/entrar');
  await page.getByLabel('E-mail', { exact: true }).fill(emailDe(quem, ambiente));
  await page.getByLabel('Senha', { exact: true }).fill(ambiente.senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { level: 1 }).first()).not.toHaveText('Entrar');
}
