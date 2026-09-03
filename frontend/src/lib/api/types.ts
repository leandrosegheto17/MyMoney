/**
 * Tipos espelhando 1:1 os schemas de `API-CONTRACT.yaml` v0.6.0 (`components.schemas`).
 * Nenhum tipo aqui deve divergir do contrato publicado pelo Backend sem atualizar
 * também a referência de versão no comentário do módulo que o usa.
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
