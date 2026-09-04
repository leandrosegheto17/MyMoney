import { useEffect, useState } from "react";
import { Alert, Button, Card, ConfirmationDialog, EmptyState, Modal, Skeleton } from "../../components/base";
import { Input } from "../../components/base";
import { useToast } from "../../components/base/Toast";
import { CurrencyInput } from "../../components/domain/CurrencyInput";
import { GoalProgressBar } from "../../components/domain/GoalProgressBar";
import {
  createContribution,
  createGoal,
  deleteContribution,
  getGoalsProgress,
  listContributions,
  listGoals,
} from "../../lib/api/goals";
import { ApiError } from "../../lib/api/errors";
import { formatCentsToBRL } from "../../lib/currency";
import { todayDateOnly } from "../../lib/date";
import type { Contribution, Goal, GoalProgressItem, NewGoal } from "../../lib/api/types";

type FormState = { name: string; targetAmountCents: number; targetDate: string };
const EMPTY_FORM: FormState = { name: "", targetAmountCents: 0, targetDate: "" };

/** S-GOAL-01/02/03/04 (FE-F2-06) — UX-SPEC.md Padrão A + `GoalProgressBar` + lista de aportes. */
export function GoalsPage() {
  const { showToast } = useToast();
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [progress, setProgress] = useState<GoalProgressItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<{ name?: string; amount?: string }>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [contributions, setContributions] = useState<Contribution[] | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isContributionFormOpen, setIsContributionFormOpen] = useState(false);
  const [contributionAmountCents, setContributionAmountCents] = useState(0);
  const [contributionError, setContributionError] = useState<string | null>(null);
  const [isSavingContribution, setIsSavingContribution] = useState(false);
  const [deleteContributionTarget, setDeleteContributionTarget] = useState<Contribution | null>(null);
  const [isDeletingContribution, setIsDeletingContribution] = useState(false);

  async function load() {
    setLoadError(null);
    try {
      const [goalList, progressList] = await Promise.all([listGoals(), getGoalsProgress()]);
      setGoals(goalList);
      setProgress(progressList);
    } catch (cause) {
      setLoadError(cause instanceof ApiError ? cause.message : "Não foi possível carregar as metas.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function loadDetail(goalId: string) {
    setDetailError(null);
    try {
      const [contributionList, progressList] = await Promise.all([listContributions(goalId), getGoalsProgress()]);
      setContributions(contributionList);
      setProgress(progressList);
    } catch (cause) {
      setDetailError(cause instanceof ApiError ? cause.message : "Não foi possível carregar os aportes.");
    }
  }

  function openNewForm() {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setSaveError(null);
    setIsFormOpen(true);
  }

  async function handleSubmit() {
    const nextErrors: typeof formErrors = {};
    if (!form.name.trim()) nextErrors.name = "Informe um nome para a meta.";
    if (form.targetAmountCents <= 0) nextErrors.amount = "Informe um valor-alvo maior que zero.";
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      const payload: NewGoal = { name: form.name.trim(), target_amount_cents: form.targetAmountCents, target_date: form.targetDate || undefined };
      await createGoal(payload);
      setIsFormOpen(false);
      showToast("Meta criada");
      await load();
    } catch (cause) {
      setSaveError(cause instanceof ApiError ? cause.message : "Não foi possível criar a meta.");
    } finally {
      setIsSaving(false);
    }
  }

  function openDetail(goalId: string) {
    setSelectedGoalId(goalId);
    setContributions(null);
    void loadDetail(goalId);
  }

  function openContributionForm() {
    setContributionAmountCents(0);
    setContributionError(null);
    setIsContributionFormOpen(true);
  }

  async function handleSaveContribution() {
    if (!selectedGoalId) return;
    if (contributionAmountCents <= 0) {
      setContributionError("Informe um valor maior que zero.");
      return;
    }
    setIsSavingContribution(true);
    setContributionError(null);
    try {
      await createContribution({ goal_id: selectedGoalId, amount_cents: contributionAmountCents, contribution_date: todayDateOnly() });
      setIsContributionFormOpen(false);
      showToast("Aporte registrado");
      await loadDetail(selectedGoalId);
    } catch (cause) {
      setContributionError(cause instanceof ApiError ? cause.message : "Não foi possível registrar o aporte.");
    } finally {
      setIsSavingContribution(false);
    }
  }

  async function confirmDeleteContribution() {
    if (!deleteContributionTarget || !selectedGoalId) return;
    setIsDeletingContribution(true);
    try {
      await deleteContribution(deleteContributionTarget.id);
      setDeleteContributionTarget(null);
      showToast("Aporte removido");
      await loadDetail(selectedGoalId);
    } catch (cause) {
      showToast(cause instanceof ApiError ? cause.message : "Não foi possível remover o aporte.", "danger");
    } finally {
      setIsDeletingContribution(false);
    }
  }

  const selectedGoal = goals?.find((g) => g.id === selectedGoalId) ?? null;
  const selectedProgress = progress.find((p) => p.goal_id === selectedGoalId) ?? null;

  if (selectedGoal) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => setSelectedGoalId(null)}>
            ← Voltar
          </Button>
          <h1 className="text-xl font-semibold text-neutral-900">{selectedGoal.name}</h1>
        </div>

        <Card>
          {selectedProgress ? (
            <GoalProgressBar
              label={selectedGoal.name}
              currentAmountCents={selectedProgress.current_amount_cents}
              targetAmountCents={selectedProgress.target_amount_cents}
              pctProgress={selectedProgress.pct_progress}
              targetDate={selectedProgress.target_date}
            />
          ) : (
            <Skeleton lines={2} aria-label="Carregando progresso" />
          )}
        </Card>

        <div className="flex justify-end">
          <Button onClick={openContributionForm}>+ Registrar aporte</Button>
        </div>

        {detailError && <Alert variant="danger">{detailError}</Alert>}
        {!contributions && !detailError && <Skeleton lines={3} aria-label="Carregando aportes" />}
        {contributions && contributions.length === 0 && <EmptyState title="Nenhum aporte registrado ainda" />}
        {contributions && contributions.length > 0 && (
          <ul className="flex flex-col gap-2">
            {contributions.map((contribution) => (
              <li key={contribution.id}>
                <Card className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-neutral-800">{formatCentsToBRL(contribution.amount_cents)}</p>
                    <p className="text-xs text-neutral-500">{new Date(`${contribution.contribution_date}T00:00:00`).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <Button variant="ghost" onClick={() => setDeleteContributionTarget(contribution)}>
                    Remover
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        )}

        <Modal isOpen={isContributionFormOpen} onClose={() => setIsContributionFormOpen(false)} title="Registrar aporte">
          <div className="flex flex-col gap-4">
            {contributionError && <Alert variant="danger">{contributionError}</Alert>}
            <CurrencyInput label="Valor do aporte" required valueCents={contributionAmountCents} onValueChange={setContributionAmountCents} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setIsContributionFormOpen(false)} disabled={isSavingContribution}>
                Cancelar
              </Button>
              <Button onClick={() => void handleSaveContribution()} loading={isSavingContribution}>
                Salvar
              </Button>
            </div>
          </div>
        </Modal>

        <ConfirmationDialog
          isOpen={deleteContributionTarget !== null}
          onClose={() => setDeleteContributionTarget(null)}
          onConfirm={() => void confirmDeleteContribution()}
          title="Remover aporte"
          description="Tem certeza que deseja remover este aporte? O progresso da meta será recalculado imediatamente."
          confirmLabel="Remover"
          isConfirming={isDeletingContribution}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Metas</h1>
        <Button onClick={openNewForm}>+ Nova meta</Button>
      </div>

      {loadError && <Alert variant="danger">{loadError}</Alert>}
      {!goals && !loadError && <Skeleton lines={4} aria-label="Carregando metas" />}
      {goals && goals.length === 0 && <EmptyState title="Nenhuma meta cadastrada ainda" action={<Button onClick={openNewForm}>Cadastrar</Button>} />}

      {goals && goals.length > 0 && (
        <ul className="flex flex-col gap-3">
          {goals.map((goal) => {
            const goalProgress = progress.find((p) => p.goal_id === goal.id);
            return (
              <li key={goal.id}>
                <button type="button" onClick={() => openDetail(goal.id)} className="w-full text-left focus-visible:outline-2 focus-visible:outline-primary">
                  <Card>
                    <GoalProgressBar
                      label={goal.name}
                      currentAmountCents={goalProgress?.current_amount_cents ?? 0}
                      targetAmountCents={goal.target_amount_cents}
                      pctProgress={goalProgress?.pct_progress ?? 0}
                      targetDate={goal.target_date}
                    />
                  </Card>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Nova meta">
        <div className="flex flex-col gap-4">
          {saveError && <Alert variant="danger">{saveError}</Alert>}
          <Input label="Nome" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} error={formErrors.name} />
          <CurrencyInput label="Valor-alvo" required valueCents={form.targetAmountCents} onValueChange={(cents) => setForm({ ...form, targetAmountCents: cents })} error={formErrors.amount} />
          <Input label="Prazo (opcional)" type="date" value={form.targetDate} onChange={(event) => setForm({ ...form, targetDate: event.target.value })} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsFormOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSubmit()} loading={isSaving}>
              Salvar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
