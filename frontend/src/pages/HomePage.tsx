import { Card } from "../components/base/Card";

/**
 * Espaço reservado da rota inicial — a tela real (Dashboard, S-DASH-01) é `FE-M-10`,
 * dependente do contrato de `BE-M-07` ainda não publicado. Este placeholder só
 * comprova que o roteamento (FE-M-00) e o app shell (header + `OfflineSyncBadge`,
 * `ToastProvider`) estão funcionando de ponta a ponta.
 */
export function HomePage() {
  return (
    <Card>
      <h1 className="text-xl font-semibold text-neutral-900">MyMoney</h1>
      <p className="mt-2 text-sm text-neutral-600">
        App shell configurado. As telas de domínio (Dashboard, Lançamentos, Contas etc.) chegam nas
        próximas tarefas de Frontend, à medida que os contratos de API forem publicados pelo Backend.
      </p>
    </Card>
  );
}
