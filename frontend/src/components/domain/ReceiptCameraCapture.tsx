import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Camera, Upload, X } from "lucide-react";
import { Alert } from "../base/Alert";
import { Button } from "../base/Button";
import {
  captureVideoFrame,
  dataUrlToBase64,
  hasCameraCaptureSupport,
  readFileAsDataUrl,
  validatePreparedImage,
} from "../../lib/receiptImage";
import type { PreparedReceiptImage } from "../../lib/receiptImage";

export interface ReceiptCameraCaptureProps {
  /** Chamado com a imagem já preparada (base64 + mimeType) após "Usar esta foto" passar na validação de tamanho/MIME. */
  onConfirm: (image: PreparedReceiptImage) => void;
  onCancel: () => void;
}

type CameraState = "checking" | "streaming" | "unavailable";

interface PreviewImage {
  dataUrl: string;
  mimeType: string;
}

const FILE_INPUT_ID = "receipt-camera-capture-file-input";

/**
 * `ReceiptCameraCapture` — `UX-SPEC.md` S-CAP-04 / `UX-FL-04` (`FE-F3-03`).
 * Viewfinder de câmera com moldura-guia + upload de arquivo **sempre visível**
 * (não só depois de um erro, Seção 4.2) + pré-visualização antes de confirmar.
 *
 * Estados de câmera: `checking` (aguardando resposta de `getUserMedia`),
 * `streaming` (permissão concedida, vídeo ao vivo) e `unavailable` (API não
 * suportada pelo navegador OU permissão negada OU qualquer outra falha ao
 * abrir o stream — tratados da mesma forma porque o resultado prático para o
 * usuário é idêntico: usar o upload de arquivo). Nenhum desses estados jamais
 * esconde ou desabilita a opção de upload — ela é renderizada incondicionalmente,
 * lado a lado com o viewfinder quando ele existe (S-CAP-04: "relevante em
 * desktop, onde câmera pode não existir").
 *
 * Escopo desta tarefa termina na pré-visualização: o envio da imagem preparada
 * para `/receipt-ocr` (`BE-F3-01`) e o fluxo de rascunho de confirmação
 * (`DraftReviewBanner`) são responsabilidade de `FE-F3-04`, ainda não iniciada.
 */
export function ReceiptCameraCapture({ onConfirm, onCancel }: ReceiptCameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<CameraState>(
    hasCameraCaptureSupport() ? "checking" : "unavailable",
  );
  const [preview, setPreview] = useState<PreviewImage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasCameraCaptureSupport()) {
      setCameraState("unavailable");
      return;
    }

    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraState("streaming");
      })
      .catch(() => {
        // Permissão negada (ou qualquer outra falha) nunca bloqueia o usuário
        // — cai para o upload de arquivo (S-CAP-04, Seção 4.2 UX-SPEC).
        if (!cancelled) setCameraState("unavailable");
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function handleCapture() {
    if (!videoRef.current) return;
    try {
      const dataUrl = captureVideoFrame(videoRef.current, "image/jpeg");
      setError(null);
      setPreview({ dataUrl, mimeType: "image/jpeg" });
    } catch {
      setError("Não foi possível capturar a foto. Tente novamente ou selecione um arquivo.");
    }
  }

  async function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Permite selecionar o mesmo arquivo novamente depois de um "Tirar novamente".
    event.target.value = "";
    if (!file) return;

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setError(null);
      setPreview({ dataUrl, mimeType: file.type || "image/jpeg" });
    } catch {
      setError("Não foi possível ler o arquivo selecionado. Tente novamente.");
    }
  }

  function handleRetake() {
    setPreview(null);
    setError(null);
  }

  function handleUsePhoto() {
    if (!preview) return;
    const image: PreparedReceiptImage = { base64: dataUrlToBase64(preview.dataUrl), mimeType: preview.mimeType };
    const validation = validatePreparedImage(image);
    if (!validation.ok) {
      setError(validation.message);
      return;
    }
    stopStream();
    onConfirm(image);
  }

  function handleCancel() {
    stopStream();
    onCancel();
  }

  if (preview) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-neutral-700">Confira se o recibo está legível antes de continuar.</p>
        <img
          src={preview.dataUrl}
          alt="Pré-visualização do recibo capturado"
          className="max-h-80 w-full rounded-md border border-neutral-200 object-contain"
        />
        {error && (
          <Alert variant="danger" title="Não foi possível usar esta imagem">
            {error}
          </Alert>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={handleRetake}>
            Tirar novamente
          </Button>
          <Button variant="primary" onClick={handleUsePhoto}>
            Usar esta foto
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {cameraState === "streaming" && (
        <div className="relative overflow-hidden rounded-md bg-neutral-900">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption -- stream ao vivo decorativo, guia textual abaixo já descreve a ação esperada */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            aria-hidden="true"
            className="aspect-[3/4] w-full object-cover"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-6 rounded-md border-2 border-dashed border-white/80"
          />
          <p className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-xs font-medium text-white">
            Posicione o recibo dentro da moldura
          </p>
        </div>
      )}

      {cameraState === "checking" && (
        <p role="status" className="text-sm text-neutral-500">
          Preparando câmera...
        </p>
      )}

      {cameraState === "unavailable" && (
        <Alert variant="info" title="Câmera indisponível">
          Não foi possível acessar a câmera neste dispositivo (permissão negada ou recurso indisponível nesta
          plataforma). Você pode selecionar uma foto do arquivo/galeria abaixo — o lançamento não fica bloqueado.
        </Alert>
      )}

      {error && (
        <Alert variant="danger" title="Não foi possível capturar a imagem">
          {error}
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {cameraState === "streaming" && (
          <Button variant="primary" onClick={handleCapture}>
            <Camera size={16} aria-hidden />
            Capturar foto
          </Button>
        )}

        <label
          htmlFor={FILE_INPUT_ID}
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-primary bg-white px-4 py-2 text-sm font-medium text-primary hover:bg-neutral-50 focus-within:outline-2 focus-within:outline-primary"
        >
          <Upload size={16} aria-hidden />
          Selecionar arquivo
        </label>
        <input
          id={FILE_INPUT_ID}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            void handleFileSelected(event);
          }}
        />
      </div>

      <div className="flex justify-end">
        <Button variant="ghost" onClick={handleCancel}>
          <X size={16} aria-hidden />
          Cancelar
        </Button>
      </div>
    </div>
  );
}
