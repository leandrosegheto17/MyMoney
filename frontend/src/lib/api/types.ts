/**
 * Tipos espelhando 1:1 os schemas de `API-CONTRACT.yaml` v0.17.0 (`components.schemas`,
 * MVP + Fase 2). Nenhum tipo aqui deve divergir do contrato publicado pelo Backend sem
 * atualizar também a referência de versão no comentário do módulo que o usa.
 */

export type AccountType = "checking" | "savings" | "wallet" | "investment";

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  currency: string;
  initial_balance_cents: number;
  current_balance_cents: number;
  color: string | null;
  icon: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type NewAccount = Pick<Account, "name" | "type" | "currency" | "initial_balance_cents"> &
  Partial<Pick<Account, "color" | "icon" | "is_active">>;

export type PaymentMethodType = "pix" | "debit_card" | "credit_card" | "boleto" | "cash";

export interface PaymentMethod {
  id: string;
  user_id: string;
  account_id: string | null;
  credit_card_id: string | null;
  type: PaymentMethodType;
  name: string;
  is_active: boolean;
  is_system_default: boolean;
  created_at: string;
  updated_at: string;
}

export type NewPaymentMethod = Pick<PaymentMethod, "type" | "name"> & Partial<Pick<PaymentMethod, "account_id" | "credit_card_id" | "is_active">>;

export type CategoryKind = "income" | "expense";

export interface Category {
  id: string;
  user_id: string | null;
  parent_category_id: string | null;
  name: string;
  icon: string | null;
  color: string | null;
  kind: CategoryKind;
  is_system_default: boolean;
  created_at: string;
  updated_at: string;
}

export type NewCategory = Pick<Category, "name" | "kind"> & Partial<Pick<Category, "parent_category_id" | "icon" | "color">>;

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  month: string;
  limit_cents: number;
  alert_threshold_pct: number;
  created_at: string;
  updated_at: string;
}

export type NewBudget = Pick<Budget, "category_id" | "month" | "limit_cents"> & Partial<Pick<Budget, "alert_threshold_pct">>;

export type TransactionKind = "income" | "expense" | "transfer";
export type TransactionStatus = "pending" | "cleared" | "reconciled";
export type TransactionSource = "manual" | "audio" | "ocr" | "import" | "openfinance";

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  destination_account_id: string | null;
  payment_method_id: string | null;
  category_id: string | null;
  kind: TransactionKind;
  amount_cents: number;
  description: string | null;
  transaction_date: string;
  status: TransactionStatus;
  source: TransactionSource;
  /** Fase 2 (BE-F2-02) — resolvido pelo servidor, readOnly. NULL se a forma de pagamento não é cartão. */
  card_invoice_id: string | null;
  /** Fase 2 (BE-F2-03) — resolvido pelo servidor, readOnly. Preenchido só em lançamento gerado por recorrência. */
  recurring_rule_id: string | null;
  /** Fase 2 (BE-F2-05) — resolvido pelo servidor, readOnly. Preenchido só em parcela gerada automaticamente. */
  installment_plan_id: string | null;
  /** Fase 2 (BE-F2-05) — resolvido pelo servidor, readOnly. 1-indexed. */
  installment_number: number | null;
  /** Fase 2 (BE-F2-06) — resolvido pelo servidor, readOnly. Preenchido só em lançamento "previsto" de conta fixa. */
  fixed_bill_id: string | null;
  created_at: string;
  updated_at: string;
}

export type NewTransaction = Pick<Transaction, "account_id" | "kind" | "amount_cents" | "transaction_date"> &
  Partial<Pick<Transaction, "destination_account_id" | "payment_method_id" | "category_id" | "description" | "source">>;

export interface MonthProvision {
  current_total_balance_cents: number;
  pending_income_cents: number;
  pending_expense_cents: number;
  /** @deprecated `API-CONTRACT.yaml`: double-counting confirmado, não usar no MVP. */
  provisioned_balance_cents: number;
}

export interface MonthlyCategorySummaryItem {
  category_id: string;
  category_name: string;
  kind: CategoryKind;
  total_cents: number;
}

export type BudgetAlertLevel = "none" | "warning" | "exceeded";

export interface BudgetStatusItem {
  budget_id: string;
  category_id: string;
  category_name: string;
  month: string;
  limit_cents: number;
  spent_cents: number;
  alert_threshold_pct: number;
  pct_spent: number;
  alert_level: BudgetAlertLevel;
}

// ============================================================================
// Fase 2 — Cartão & Fatura (BE-F2-01/02)
// ============================================================================

export interface CreditCard {
  id: string;
  user_id: string;
  name: string;
  limit_cents: number;
  closing_day: number;
  due_day: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type NewCreditCard = Pick<CreditCard, "name" | "limit_cents" | "closing_day" | "due_day"> & Partial<Pick<CreditCard, "is_active">>;

export type InvoiceStatus = "aberta" | "fechada";

export interface Invoice {
  id: string;
  user_id: string;
  credit_card_id: string;
  competencia: string;
  status: InvoiceStatus;
  created_at: string;
  updated_at: string;
}

export interface CreditCardAvailableLimitItem {
  credit_card_id: string;
  name: string;
  limit_cents: number;
  committed_cents: number;
  available_cents: number;
}

// ============================================================================
// Fase 2 — Recorrência & Parcelamento (BE-F2-03/04/05)
// ============================================================================

export interface RecurringTemplate {
  id: string;
  user_id: string;
  description: string;
  /** Valor ORIGINAL, imutável após a criação (BE-F2-04) — reajuste via `RecurringTemplateAdjustment`. */
  amount_cents: number;
  category_id: string;
  account_id: string;
  payment_method_id: string;
  day_of_month: number;
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export type NewRecurringTemplate = Pick<
  RecurringTemplate,
  "description" | "amount_cents" | "category_id" | "account_id" | "payment_method_id" | "day_of_month" | "start_date"
> &
  Partial<Pick<RecurringTemplate, "end_date">>;

export interface RecurringTemplateAdjustment {
  id: string;
  user_id: string;
  recurring_template_id: string;
  /** Sempre o 1º dia do mês; mínimo o mês corrente (RN-02, nunca retroativo). */
  effective_from: string;
  amount_cents: number;
  created_at: string;
}

export type NewRecurringTemplateAdjustment = Pick<RecurringTemplateAdjustment, "recurring_template_id" | "effective_from" | "amount_cents">;

export interface InstallmentPurchase {
  id: string;
  user_id: string;
  description: string;
  total_amount_cents: number;
  installments_count: number;
  category_id: string;
  account_id: string;
  /** Deve referenciar uma forma de pagamento `type=credit_card`. */
  payment_method_id: string;
  purchase_date: string;
  created_at: string;
  updated_at: string;
}

export type NewInstallmentPurchase = Pick<
  InstallmentPurchase,
  "description" | "total_amount_cents" | "installments_count" | "category_id" | "account_id" | "payment_method_id" | "purchase_date"
>;

export interface InstallmentPurchaseProgress {
  installment_purchase_id: string;
  description: string;
  installments_count: number;
  generated_count: number;
  remaining_count: number;
}

// ============================================================================
// Fase 2 — Contas Fixas (BE-F2-06/07)
// ============================================================================

export interface FixedBill {
  id: string;
  user_id: string;
  description: string;
  amount_cents: number;
  category_id: string;
  account_id: string;
  payment_method_id: string;
  due_day: number;
  /** RN-05 — dias corridos de antecedência do aviso de vencimento (default 3). */
  alert_days_before: number;
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export type NewFixedBill = Pick<FixedBill, "description" | "amount_cents" | "category_id" | "account_id" | "payment_method_id" | "due_day" | "start_date"> &
  Partial<Pick<FixedBill, "alert_days_before" | "end_date">>;

export interface FixedBillStatusItem {
  fixed_bill_id: string;
  description: string;
  amount_cents: number;
  due_day: number;
  current_transaction_id: string | null;
  current_due_date: string | null;
  current_status: TransactionStatus | null;
  /** Derivado pelo servidor (`status=pending` + data no passado) — nunca recalculado no client (DIR-06). */
  is_overdue: boolean;
}

// ============================================================================
// Fase 2 — Metas (BE-F2-08)
// ============================================================================

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  target_amount_cents: number;
  target_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type NewGoal = Pick<Goal, "name" | "target_amount_cents"> & Partial<Pick<Goal, "target_date" | "is_active">>;

export interface Contribution {
  id: string;
  goal_id: string;
  user_id: string;
  amount_cents: number;
  contribution_date: string;
  created_at: string;
}

export type NewContribution = Pick<Contribution, "goal_id" | "amount_cents"> & Partial<Pick<Contribution, "contribution_date">>;

export interface GoalProgressItem {
  goal_id: string;
  name: string;
  target_amount_cents: number;
  target_date: string | null;
  is_active: boolean;
  current_amount_cents: number;
  /** Arredondado a 2 casas decimais; sem teto em 100 (meta pode ser superada). */
  pct_progress: number;
}

// ============================================================================
// Fase 2 — Notificações & Push (BE-F2-09)
// ============================================================================

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
  user_agent: string | null;
  created_at: string;
}

export type NewPushSubscription = Pick<PushSubscription, "endpoint" | "p256dh" | "auth_key"> & Partial<Pick<PushSubscription, "user_agent">>;

export type NotificationType = "budget_alert" | "fixed_bill_due";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  message: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  read_at: string | null;
  created_at: string;
}

// ============================================================================
// Fase 2 — Relatórios (BE-F2-10)
// ============================================================================

export interface IncomeExpenseReportItem {
  /** Sempre o 1º dia do mês. */
  month: string;
  income_cents: number;
  expense_cents: number;
}
