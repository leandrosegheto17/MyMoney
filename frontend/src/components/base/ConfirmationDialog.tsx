import type { ReactNode } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import type { ButtonVariant } from "./Button";

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  /** Explicação da consequência em uma frase (ex.: texto de RN-08 em S-ACC-04). */
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `destructive` para exclusão/ação irreversível; `primary` para confirmação sensível não-destrutiva (ex. reajuste de recorrência). */
  confirmVariant?: Extract<ButtonVariant, "primary" | "destructive">;
  isConfirming?: boolean;
}

/**
 * ConfirmationDialog — instância do Padrão B (UX-SPEC.md Seção 2.1): "modal
 * centralizado (desktop) / bottom sheet (mobile) com título direto, explicação de
 * consequência em uma frase, e dois botões de mesmo peso visual (nunca um botão
 * destrutivo pré-focado por padrão) — nunca uma única ação 'confirmar' implícita."
 *
 * Reaproveitado por `FE-F3-09` (fluxo de exclusão de conta) como base, conforme
 * `TASK.md` Seção 3.3.
 */
export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  confirmVariant = "destructive",
  isConfirming = false,
}: ConfirmationDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isConfirming}>
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} loading={isConfirming}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm text-neutral-700">{description}</div>
    </Modal>
  );
}
