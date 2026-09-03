// _shared/email.ts — envio de e-mail transacional, isolado do provedor.
//
// Único ponto de contato com a API HTTP de e-mail transacional do projeto.
// Motivo do isolamento (ver CLAUDE.md/tarefa F1-BE-13): o provedor "Resend"
// ainda não teve validação final do CTO (SDD.md §4/§10.1 nota, F1-DEVOPS-07)
// — qualquer chamador (hoje só a Edge Function `auth-email-mfa`) depende
// apenas de `sendEmail(to, subject, html)`, nunca da API do Resend
// diretamente. Trocar de provedor no futuro significa reescrever só este
// arquivo.
//
// Segredos lidos via `Deno.env.get` (nunca hardcoded/commitados), setados
// com `supabase secrets set RESEND_API_KEY=... EMAIL_FROM=...`.

const RESEND_API_URL = "https://api.resend.com/emails";

// Timeout explícito para a chamada ao provedor externo (ver skill
// arquitetura-serverless: "toda chamada a provedor externo precisa de
// timeout definido" e CLAUDE.md sobre timeout/fallback em Edge Functions).
// Não é o RNF de latência de áudio (<3s) — e-mail tem orçamento próprio,
// mas ainda assim não pode deixar a function pendurada indefinidamente.
const SEND_TIMEOUT_MS = 8_000;

const DEFAULT_FROM = "MyMoney <no-reply@mymoney.app>";

/** Erro de envio de e-mail — nunca inclui o conteúdo do e-mail na mensagem. */
export class EmailSendError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "EmailSendError";
  }
}

/**
 * Envia um e-mail transacional via Resend. Lança `EmailSendError` em caso de
 * timeout, falha de rede ou resposta de erro do provedor — o chamador decide
 * como responder ao client (nunca deixar a exceção não tratada).
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    throw new EmailSendError("RESEND_API_KEY não configurada");
  }
  const from = Deno.env.get("EMAIL_FROM") ?? DEFAULT_FROM;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
      signal: controller.signal,
    });

    if (!response.ok) {
      // Corpo de erro do provedor pode conter detalhes úteis para debug,
      // mas nunca contém o conteúdo do e-mail que enviamos (o código de
      // MFA) — seguro de logar via a mensagem da exceção.
      const bodyText = await response.text().catch(() => "");
      throw new EmailSendError(
        `provedor de e-mail respondeu ${response.status}: ${
          bodyText.slice(0, 200)
        }`,
      );
    }
  } catch (err) {
    if (err instanceof EmailSendError) {
      throw err;
    }
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new EmailSendError(
        `timeout ao enviar e-mail após ${SEND_TIMEOUT_MS}ms`,
      );
    }
    throw new EmailSendError(
      `falha ao enviar e-mail: ${
        err instanceof Error ? err.message : String(err)
      }`,
      { cause: err },
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
