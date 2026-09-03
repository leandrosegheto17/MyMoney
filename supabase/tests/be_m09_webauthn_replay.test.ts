// BE-M-09 — Teste automatizado da mitigação de replay de challenge WebAuthn
// (`BLOCKERS.md` Bloqueio 006, veredito do CTO "mitigar agora").
//
// Prova, ponta a ponta, contra as Edge Functions REAIS em produção
// (`webauthn-register`, `webauthn-authenticate`):
//
//   (i)  a segunda tentativa de "verify" com a MESMA dupla challenge+assertion
//        válida é rejeitada (HTTP 409 "challenge_replayed") — em AMBOS os
//        endpoints;
//   (ii) o fluxo legítimo (challenge usado uma única vez) continua
//        funcionando sem regressão — registro conclui com sucesso (200) e a
//        credencial recém-registrada consegue se autenticar (200) com um
//        challenge novo e distinto.
//
// Como as duas Edge Functions verificam a assinatura WebAuthn de verdade
// (`verifyRegistrationResponse`/`verifyAuthenticationResponse`,
// `@simplewebauthn/server`), este arquivo implementa um autenticador virtual
// mínimo (ECDSA P-256, formato de atestação "none" — o mesmo que
// `webauthn-register` usa) inteiramente com Web Crypto + um encoder CBOR
// mínimo escrito à mão (só as poucas estruturas fixas de que este teste
// precisa — não é um encoder CBOR genérico). Nenhuma biblioteca de terceiros
// de "virtual authenticator" é usada.
//
// Requisitos de execução (nenhum valor secreto fica hardcoded no arquivo,
// DIR-30): variáveis de ambiente SUPABASE_URL (opcional, tem default público
// — mesma URL já publicada em API-CONTRACT.yaml), SUPABASE_ANON_KEY,
// SUPABASE_SERVICE_ROLE_KEY.
//
//   deno test --allow-net --allow-env supabase/tests/be_m09_webauthn_replay.test.ts
//
// Efeito colateral em produção: cria e remove um usuário de teste descartável
// (via allow-list temporária de BE-M-12 + Auth Admin API), sem tocar em
// nenhum dado real do stakeholder — teardown roda em `finally`, com
// verificação de "nenhum resíduo" ao final (mesmo padrão dos testes SQL desta
// tarefa).

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "https://xrcxbzrglndetrrhavhc.supabase.co";
// Valor real confirmado em BLOCKERS.md Bloqueio 005 (achado do Backend ao
// inspecionar o secret WEBAUTHN_ORIGIN já configurado) — não é um segredo em
// si (é a origem pública do front-end), mas fica sobrescrevível por env var
// caso o secret mude no futuro.
const WEBAUTHN_TEST_ORIGIN = Deno.env.get("WEBAUTHN_ORIGIN_FOR_TEST") ?? "https://mymoney-lsm.vercel.app";

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(
      `Variável de ambiente obrigatória ausente: ${name}. Rode com ` +
        `--allow-env e exporte ${name} antes de executar este teste.`,
    );
  }
  return value;
}

const ANON_KEY = requireEnv("SUPABASE_ANON_KEY");
const SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

// ---------------------------------------------------------------------------
// base64url
// ---------------------------------------------------------------------------
function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concatBytes(...chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  // `.slice()` normaliza para `Uint8Array<ArrayBuffer>` (mesmo idioma já
  // usado em supabase/functions/webauthn-register/index.ts) — um
  // `Uint8Array` resultante de `.slice()`/concatenação type-checa como o
  // `ArrayBufferLike` mais amplo sob as typings DOM recentes do TS.
  return new Uint8Array(await crypto.subtle.digest("SHA-256", bytes.slice()));
}

// ---------------------------------------------------------------------------
// CBOR — encoder mínimo (só cabeçalhos de major type pequenos, o suficiente
// para os inteiros/tamanhos usados aqui: nenhuma estrutura deste teste passa
// de 65535 bytes).
// ---------------------------------------------------------------------------
function cborHead(majorType: number, value: number): Uint8Array {
  const mt = majorType << 5;
  if (value < 24) return new Uint8Array([mt | value]);
  if (value < 256) return new Uint8Array([mt | 24, value]);
  if (value < 65536) return new Uint8Array([mt | 25, (value >> 8) & 0xff, value & 0xff]);
  throw new Error("cborHead: valor fora do range suportado por este encoder mínimo");
}

/** Inteiro CBOR (major type 0 para >=0, major type 1 para negativo — só os
 *  valores pequenos usados na chave COSE EC2: 1, 2, 3, -7, -1, -2, -3). */
function cborInt(n: number): Uint8Array {
  return n >= 0 ? cborHead(0, n) : cborHead(1, -n - 1);
}

function cborBytes(bytes: Uint8Array): Uint8Array {
  return concatBytes(cborHead(2, bytes.length), bytes);
}

function cborTextString(text: string): Uint8Array {
  const bytes = new TextEncoder().encode(text);
  return concatBytes(cborHead(3, bytes.length), bytes);
}

function cborMapHead(pairCount: number): Uint8Array {
  return cborHead(5, pairCount);
}

// ---------------------------------------------------------------------------
// DER — assinatura ECDSA. Web Crypto retorna r||s (IEEE P1363, 32+32 bytes
// para P-256); WebAuthn/@simplewebauthn/server espera ASN.1 DER
// (SEQUENCE { INTEGER r, INTEGER s }).
// ---------------------------------------------------------------------------
function derEncodeUnsignedInteger(bytes: Uint8Array): Uint8Array {
  let i = 0;
  while (i < bytes.length - 1 && bytes[i] === 0) i++;
  let trimmed = bytes.slice(i);
  if (trimmed[0] & 0x80) {
    const withLeadingZero = new Uint8Array(trimmed.length + 1);
    withLeadingZero.set(trimmed, 1);
    trimmed = withLeadingZero;
  }
  return concatBytes(new Uint8Array([0x02, trimmed.length]), trimmed);
}

function derEncodeEcdsaSignature(rawSignature: Uint8Array): Uint8Array {
  const half = rawSignature.length / 2;
  const r = derEncodeUnsignedInteger(rawSignature.slice(0, half));
  const s = derEncodeUnsignedInteger(rawSignature.slice(half));
  const body = concatBytes(r, s);
  if (body.length >= 128) throw new Error("derEncodeEcdsaSignature: corpo grande demais para este encoder mínimo");
  return concatBytes(new Uint8Array([0x30, body.length]), body);
}

// ---------------------------------------------------------------------------
// Autenticador virtual (ECDSA P-256, attestation "none").
// ---------------------------------------------------------------------------
interface VirtualCredential {
  credentialId: Uint8Array;
  keyPair: CryptoKeyPair;
  signCount: number;
}

async function createVirtualCredential(): Promise<VirtualCredential> {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  ) as CryptoKeyPair;
  const credentialId = crypto.getRandomValues(new Uint8Array(32));
  return { credentialId, keyPair, signCount: 0 };
}

async function coseEncodeEc2PublicKey(publicKey: CryptoKey): Promise<Uint8Array> {
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", publicKey)); // 0x04 || X(32) || Y(32)
  const x = raw.slice(1, 33);
  const y = raw.slice(33, 65);
  return concatBytes(
    cborMapHead(5),
    cborInt(1), cborInt(2), // kty: EC2
    cborInt(3), cborInt(-7), // alg: ES256
    cborInt(-1), cborInt(1), // crv: P-256
    cborInt(-2), cborBytes(x),
    cborInt(-3), cborBytes(y),
  );
}

async function buildRegistrationAuthenticatorData(rpId: string, cred: VirtualCredential): Promise<Uint8Array> {
  const rpIdHash = await sha256(new TextEncoder().encode(rpId));
  const flags = new Uint8Array([0x45]); // UP(0x01) + UV(0x04) + AT(0x40)
  const counter = new Uint8Array(4); // signCount = 0 no registro
  const aaguid = new Uint8Array(16); // zero — autenticador virtual, sem AAGUID real
  const credIdLen = new Uint8Array([(cred.credentialId.length >> 8) & 0xff, cred.credentialId.length & 0xff]);
  const coseKey = await coseEncodeEc2PublicKey(cred.keyPair.publicKey);
  return concatBytes(rpIdHash, flags, counter, aaguid, credIdLen, cred.credentialId, coseKey);
}

function buildAssertionAuthenticatorData(rpIdHash: Uint8Array, signCount: number): Uint8Array {
  const flags = new Uint8Array([0x05]); // UP(0x01) + UV(0x04), sem AT/ED
  const counter = new Uint8Array(4);
  new DataView(counter.buffer).setUint32(0, signCount, false);
  return concatBytes(rpIdHash, flags, counter);
}

function buildClientDataJSON(type: "webauthn.create" | "webauthn.get", challenge: string, origin: string): Uint8Array {
  const json = JSON.stringify({ type, challenge, origin, crossOrigin: false });
  return new TextEncoder().encode(json);
}

async function buildAttestationResponse(
  rpId: string,
  cred: VirtualCredential,
  challenge: string,
  origin: string,
) {
  const clientDataJSON = buildClientDataJSON("webauthn.create", challenge, origin);
  const authData = await buildRegistrationAuthenticatorData(rpId, cred);
  const attestationObject = concatBytes(
    cborMapHead(3),
    cborTextString("fmt"), cborTextString("none"),
    cborTextString("attStmt"), cborMapHead(0),
    cborTextString("authData"), cborBytes(authData),
  );
  const idB64 = base64UrlEncode(cred.credentialId);
  return {
    id: idB64,
    rawId: idB64,
    response: {
      clientDataJSON: base64UrlEncode(clientDataJSON),
      attestationObject: base64UrlEncode(attestationObject),
      transports: ["internal"],
    },
    authenticatorAttachment: "platform",
    clientExtensionResults: {},
    type: "public-key",
  };
}

async function buildAssertionResponse(
  rpId: string,
  cred: VirtualCredential,
  challenge: string,
  origin: string,
  userId: string,
) {
  const clientDataJSON = buildClientDataJSON("webauthn.get", challenge, origin);
  const clientDataHash = await sha256(clientDataJSON);
  const rpIdHash = await sha256(new TextEncoder().encode(rpId));
  cred.signCount += 1;
  const authData = buildAssertionAuthenticatorData(rpIdHash, cred.signCount);
  const signedData = concatBytes(authData, clientDataHash);
  const rawSignature = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, cred.keyPair.privateKey, signedData.slice()),
  );
  const derSignature = derEncodeEcdsaSignature(rawSignature);
  const idB64 = base64UrlEncode(cred.credentialId);
  return {
    id: idB64,
    rawId: idB64,
    response: {
      clientDataJSON: base64UrlEncode(clientDataJSON),
      authenticatorData: base64UrlEncode(authData),
      signature: base64UrlEncode(derSignature),
      userHandle: base64UrlEncode(new TextEncoder().encode(userId)),
    },
    authenticatorAttachment: "platform",
    clientExtensionResults: {},
    type: "public-key",
  };
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------
async function callFunction(
  name: "webauthn-register" | "webauthn-authenticate",
  jwt: string,
  body: unknown,
): Promise<{ status: number; json: Record<string, unknown> | null }> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
      apikey: ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function restRequest(path: string, init: RequestInit): Promise<Response> {
  return await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      ...(init.headers ?? {}),
    },
  });
}

// ---------------------------------------------------------------------------
// Setup / teardown — usuário de teste descartável (allow-list temporária,
// BE-M-12 + Auth Admin API), sem tocar no dado real do stakeholder.
// ---------------------------------------------------------------------------
interface TestUser {
  id: string;
  email: string;
  accessToken: string;
}

async function createTestUser(): Promise<TestUser> {
  const email = `be-m09-webauthn-replay-${crypto.randomUUID()}@mymoney.invalid`;
  const password = `Test-${crypto.randomUUID()}-Aa1!`;

  const allowListRes = await restRequest("/rest/v1/allowed_signup_emails", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ email, note: "BE-M-09 — teste automatizado de replay (descartável)" }),
  });
  if (!allowListRes.ok) {
    throw new Error(`Falha ao inserir e-mail de teste na allow-list: HTTP ${allowListRes.status} ${await allowListRes.text()}`);
  }

  const signupRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY },
    body: JSON.stringify({ email, password }),
  });
  const signupBody = await signupRes.json();
  if (!signupRes.ok || !signupBody.access_token || !signupBody.user?.id) {
    throw new Error(`Falha no signup do usuário de teste: HTTP ${signupRes.status} ${JSON.stringify(signupBody)}`);
  }

  return { id: signupBody.user.id, email, accessToken: signupBody.access_token };
}

async function deleteTestUser(user: TestUser): Promise<void> {
  // Remove o usuário via Auth Admin API — cascade (ON DELETE CASCADE já
  // confirmado em AUDITORIA-BE-M-00.md Seção 1) limpa profiles/
  // webauthn_credentials/webauthn_challenges/email_mfa_challenges
  // automaticamente. Nenhum dado real do stakeholder é tocado (usuário criado
  // por este próprio teste, id conhecido).
  await restRequest(`/auth/v1/admin/users/${user.id}`, { method: "DELETE" });
  await restRequest(`/rest/v1/allowed_signup_emails?email=eq.${encodeURIComponent(user.email)}`, { method: "DELETE" });
}

async function countResidualRows(userId: string): Promise<{ credentials: number; challenges: number }> {
  const [credRes, chalRes] = await Promise.all([
    restRequest(`/rest/v1/webauthn_credentials?user_id=eq.${userId}&select=id`, {
      headers: { Prefer: "count=exact" },
    }),
    restRequest(`/rest/v1/webauthn_challenges?user_id=eq.${userId}&select=id`, {
      headers: { Prefer: "count=exact" },
    }),
  ]);
  const credentials = Number(credRes.headers.get("content-range")?.split("/")[1] ?? "0");
  const challenges = Number(chalRes.headers.get("content-range")?.split("/")[1] ?? "0");
  return { credentials, challenges };
}

// ---------------------------------------------------------------------------
// Teste principal.
// ---------------------------------------------------------------------------
Deno.test("BE-M-09 — mitigação de replay de challenge WebAuthn (Bloqueio 006)", async (t) => {
  const user = await createTestUser();
  let rpId = "";
  let residualAfterCleanup = { credentials: -1, challenges: -1 };

  try {
    let cred: VirtualCredential;

    await t.step("webauthn-register: fluxo legítimo (challenge usado uma única vez) registra com sucesso", async () => {
      const optionsRes = await callFunction("webauthn-register", user.accessToken, { action: "generate-options" });
      if (optionsRes.status !== 200) {
        throw new Error(`generate-options (register) falhou: HTTP ${optionsRes.status} ${JSON.stringify(optionsRes.json)}`);
      }
      const options = (optionsRes.json as Record<string, unknown>).options as Record<string, unknown>;
      rpId = (options.rp as Record<string, unknown>).id as string;
      const challenge = options.challenge as string;

      cred = await createVirtualCredential();
      const attestationResponse = await buildAttestationResponse(rpId, cred, challenge, WEBAUTHN_TEST_ORIGIN);

      const verifyRes = await callFunction("webauthn-register", user.accessToken, {
        action: "verify",
        attestationResponse,
        deviceLabel: "be-m09-virtual-authenticator",
      });

      if (verifyRes.status !== 200 || (verifyRes.json as Record<string, unknown>)?.success !== true) {
        throw new Error(
          `Fluxo legítimo de registro deveria retornar 200/success — obteve HTTP ${verifyRes.status}: ` +
            JSON.stringify(verifyRes.json),
        );
      }
    });

    await t.step("webauthn-register: replay da MESMA dupla challenge+assertion é rejeitado (409)", async () => {
      const optionsRes = await callFunction("webauthn-register", user.accessToken, { action: "generate-options" });
      const options = (optionsRes.json as Record<string, unknown>).options as Record<string, unknown>;
      const challenge = options.challenge as string;

      const replayCred = await createVirtualCredential();
      const attestationResponse = await buildAttestationResponse(rpId, replayCred, challenge, WEBAUTHN_TEST_ORIGIN);

      const firstAttempt = await callFunction("webauthn-register", user.accessToken, {
        action: "verify",
        attestationResponse,
      });
      if (firstAttempt.status !== 200) {
        throw new Error(`Primeira verificação (antes do replay) deveria ser 200 — obteve ${firstAttempt.status}: ${JSON.stringify(firstAttempt.json)}`);
      }

      // Reenvio EXATO do mesmo corpo (mesma dupla challenge+assertion) —
      // deve ser rejeitado por consumo único do challenge, ANTES de a lib
      // sequer tentar validar a assinatura de novo.
      const replayAttempt = await callFunction("webauthn-register", user.accessToken, {
        action: "verify",
        attestationResponse,
      });

      if (replayAttempt.status !== 409 || (replayAttempt.json as Record<string, unknown>)?.error !== "challenge_replayed") {
        throw new Error(
          `Replay deveria ser rejeitado com 409 "challenge_replayed" — obteve HTTP ${replayAttempt.status}: ` +
            JSON.stringify(replayAttempt.json),
        );
      }
    });

    await t.step("webauthn-authenticate: fluxo legítimo (challenge usado uma única vez) autentica com sucesso", async () => {
      const optionsRes = await callFunction("webauthn-authenticate", user.accessToken, { action: "generate-options" });
      if (optionsRes.status !== 200) {
        throw new Error(`generate-options (authenticate) falhou: HTTP ${optionsRes.status} ${JSON.stringify(optionsRes.json)}`);
      }
      const options = (optionsRes.json as Record<string, unknown>).options as Record<string, unknown>;
      const challenge = options.challenge as string;

      const assertionResponse = await buildAssertionResponse(rpId, cred, challenge, WEBAUTHN_TEST_ORIGIN, user.id);

      const verifyRes = await callFunction("webauthn-authenticate", user.accessToken, {
        action: "verify",
        assertionResponse,
      });

      if (verifyRes.status !== 200 || (verifyRes.json as Record<string, unknown>)?.success !== true) {
        throw new Error(
          `Fluxo legítimo de autenticação deveria retornar 200/success — obteve HTTP ${verifyRes.status}: ` +
            JSON.stringify(verifyRes.json),
        );
      }
    });

    await t.step("webauthn-authenticate: replay da MESMA dupla challenge+assertion é rejeitado (409)", async () => {
      const optionsRes = await callFunction("webauthn-authenticate", user.accessToken, { action: "generate-options" });
      const options = (optionsRes.json as Record<string, unknown>).options as Record<string, unknown>;
      const challenge = options.challenge as string;

      const assertionResponse = await buildAssertionResponse(rpId, cred, challenge, WEBAUTHN_TEST_ORIGIN, user.id);

      const firstAttempt = await callFunction("webauthn-authenticate", user.accessToken, {
        action: "verify",
        assertionResponse,
      });
      if (firstAttempt.status !== 200) {
        throw new Error(`Primeira verificação (antes do replay) deveria ser 200 — obteve ${firstAttempt.status}: ${JSON.stringify(firstAttempt.json)}`);
      }

      const replayAttempt = await callFunction("webauthn-authenticate", user.accessToken, {
        action: "verify",
        assertionResponse,
      });

      if (replayAttempt.status !== 409 || (replayAttempt.json as Record<string, unknown>)?.error !== "challenge_replayed") {
        throw new Error(
          `Replay deveria ser rejeitado com 409 "challenge_replayed" — obteve HTTP ${replayAttempt.status}: ` +
            JSON.stringify(replayAttempt.json),
        );
      }
    });

    await t.step("regressão: uma NOVA cerimônia legítima (challenge distinto) continua funcionando após os replays rejeitados", async () => {
      const optionsRes = await callFunction("webauthn-authenticate", user.accessToken, { action: "generate-options" });
      const options = (optionsRes.json as Record<string, unknown>).options as Record<string, unknown>;
      const challenge = options.challenge as string;

      const assertionResponse = await buildAssertionResponse(rpId, cred, challenge, WEBAUTHN_TEST_ORIGIN, user.id);
      const verifyRes = await callFunction("webauthn-authenticate", user.accessToken, {
        action: "verify",
        assertionResponse,
      });

      if (verifyRes.status !== 200 || (verifyRes.json as Record<string, unknown>)?.success !== true) {
        throw new Error(
          `Nova cerimônia legítima (challenge distinto) deveria continuar funcionando (200) — obteve HTTP ${verifyRes.status}: ` +
            JSON.stringify(verifyRes.json),
        );
      }
    });
  } finally {
    await deleteTestUser(user);
    residualAfterCleanup = await countResidualRows(user.id);
  }

  // Fora do `finally` de propósito (no-unsafe-finally, deno lint) — um throw
  // dentro de `finally` mascararia uma falha real do bloco `try` acima.
  if (residualAfterCleanup.credentials !== 0 || residualAfterCleanup.challenges !== 0) {
    throw new Error(
      `Resíduo de teste não removido pelo cascade de exclusão do usuário: ` +
        `${residualAfterCleanup.credentials} webauthn_credentials, ${residualAfterCleanup.challenges} webauthn_challenges`,
    );
  }
});
