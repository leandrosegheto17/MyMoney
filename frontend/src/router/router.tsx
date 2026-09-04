import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "../layout/AppLayout";
import { HomePage } from "../pages/HomePage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { AuthProvider } from "../lib/auth/AuthContext";
import { AuthGate } from "../lib/auth/AuthGate";
import { OnboardingGate } from "../lib/onboarding/OnboardingGate";
import { FirstAccountPage } from "../pages/onboarding/FirstAccountPage";
import { TaxonomyReviewPage } from "../pages/onboarding/TaxonomyReviewPage";
import { AccountsPage } from "../pages/accounts/AccountsPage";
import { PaymentMethodsPage } from "../pages/paymentMethods/PaymentMethodsPage";
import { CategoriesPage } from "../pages/categories/CategoriesPage";
import { TransactionsPage } from "../pages/transactions/TransactionsPage";
import { DashboardPage } from "../pages/dashboard/DashboardPage";
import { BudgetPage } from "../pages/budget/BudgetPage";
import { SettingsPage } from "../pages/settings/SettingsPage";
import { CreditCardsPage } from "../pages/creditCards/CreditCardsPage";
import { InstallmentsPage } from "../pages/installments/InstallmentsPage";
import { RecurringPage } from "../pages/recurring/RecurringPage";
import { FixedBillsPage } from "../pages/fixedBills/FixedBillsPage";
import { GoalsPage } from "../pages/goals/GoalsPage";
import { IncomeExpenseReportPage } from "../pages/reports/IncomeExpenseReportPage";

/**
 * FE-M-00 (fundação) + FE-M-04/05 em diante: `AuthProvider`/`AuthGate` decidem qual
 * tela de sessão mostrar (login/MFA/setup PIN/desbloqueio) antes de qualquer rota
 * autenticada renderizar (UX-FL-10). `OnboardingGate` (UX-FL-11) garante que o usuário
 * não alcance o app sem ao menos 1 conta cadastrada (RF-MVP-01 é pré-requisito
 * estrutural) — roda depois do `AuthGate`, nunca antes (onboarding é conteúdo
 * autenticado, exige sessão + desbloqueio já concluídos).
 */
export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    ),
    children: [
      {
        element: <OnboardingGate />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { index: true, element: <DashboardPage /> },
              { path: "lancamentos", element: <TransactionsPage /> },
              { path: "contas", element: <AccountsPage /> },
              { path: "formas-pagamento", element: <PaymentMethodsPage /> },
              { path: "categorias", element: <CategoriesPage /> },
              { path: "orcamento", element: <BudgetPage /> },
              { path: "cartoes", element: <CreditCardsPage /> },
              { path: "parcelamentos", element: <InstallmentsPage /> },
              { path: "recorrencias", element: <RecurringPage /> },
              { path: "contas-fixas", element: <FixedBillsPage /> },
              { path: "metas", element: <GoalsPage /> },
              { path: "relatorios/entradas-saidas", element: <IncomeExpenseReportPage /> },
              { path: "configuracoes", element: <SettingsPage /> },
              { path: "home", element: <HomePage /> },
              { path: "*", element: <NotFoundPage /> },
            ],
          },
        ],
      },
      { path: "onboarding/conta", element: <FirstAccountPage /> },
      { path: "onboarding/categorias", element: <TaxonomyReviewPage /> },
    ],
  },
]);
