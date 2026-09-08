/**
 * Suporte a captura/preparo de imagem de recibo — `UX-SPEC.md` S-CAP-04
 * (`FE-F3-03`). Espelha as constantes/regras de validação reais de
 * `supabase/functions/receipt-ocr/lib.ts` (`BE-F3-01`, contrato já publicado
 * em `API-CONTRACT.yaml` 0.21.0) para dar feedback ao usuário **antes** do
 * envio (que é escopo de `FE-F3-04`) — cliente e servidor devem concordar
 * sobre MIME/tamanho aceitos, mas a validação real e definitiva sempre é a do
 * servidor (esta função nunca deve ser tratada como a fonte da verdade).
 *
 * Mesmo princípio de `speechRecognition.ts` (`FE-F3-01`): detecção de
 * capability + fallback gracioso, nunca um beco sem saída para o usuário.
 */

export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/** 8MB decodificado — mesmo limite de `receipt-ocr/lib.ts` (`MAX_IMAGE_BYTES`). */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export interface PreparedReceiptImage {
  /** Base64 padrão (não url-safe), sem o prefixo `data:...;base64,`. */
  base64: string;
  mimeType: string;
}

export type ImageValidationResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Detecção de suporte a câmera no navegador — só checa a existência da API
 * (`navigator.mediaDevices.getUserMedia`); a permissão em si só é conhecida ao
 * tentar abrir o stream (`negado` é um resultado distinto de `indisponível`,
 * mas ambos levam ao mesmo fallback: upload de arquivo).
 */
export function hasCameraCaptureSupport(): boolean {
  if (typeof navigator === "undefined") return false;
  return Boolean(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function");
}

/** Remove o prefixo `data:<mime>;base64,` de uma Data URL, retornando só o payload base64. */
export function dataUrlToBase64(dataUrl: string): string {
  const commaIndex = dataUrl.indexOf(",");
  return commaIndex === -1 ? dataUrl : dataUrl.slice(commaIndex + 1);
}

/**
 * Captura o frame atual de um `<video>` (stream de câmera) como Data URL —
 * isolada em função própria (em vez de inline no componente) para poder ser
 * substituída em teste (jsdom não implementa renderização real de vídeo/canvas).
 */
export function captureVideoFrame(video: HTMLVideoElement, mimeType: AllowedMimeType = "image/jpeg"): string {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Não foi possível capturar a imagem (canvas indisponível).");
  }
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(mimeType);
}

/** Lê um `File` (upload/galeria) como Data URL — via `FileReader`, assíncrono. */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Falha ao ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

/**
 * Valida MIME/tamanho de uma imagem já preparada (base64 + mimeType), espelho
 * client-side de `receipt-ocr/lib.ts` `validateImageInput` — evita gastar uma
 * chamada de rede para um arquivo que o servidor certamente vai rejeitar,
 * sem substituir a validação real do servidor.
 */
export function validatePreparedImage(image: PreparedReceiptImage): ImageValidationResult {
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(image.mimeType)) {
    return { ok: false, message: `Formato não suportado. Use um de: ${ALLOWED_MIME_TYPES.join(", ")}.` };
  }
  if (!image.base64) {
    return { ok: false, message: "Imagem vazia. Tente novamente." };
  }

  let decodedLength: number;
  try {
    decodedLength = atob(image.base64).length;
  } catch {
    return { ok: false, message: "Não foi possível processar a imagem. Tente novamente." };
  }

  if (decodedLength > MAX_IMAGE_BYTES) {
    return { ok: false, message: "Imagem muito grande (máx. 8MB). Tente outra foto ou reduza a qualidade." };
  }

  return { ok: true };
}
