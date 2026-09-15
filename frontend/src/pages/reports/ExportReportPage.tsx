import { useEffect, useState } from "react";
import { Alert, Button, Card, DatePicker } from "../../components/base";
import { downloadExportedFile, exportReport } from "../../lib/api/reportExport";
import type { ReportExportFormat, ReportExportResult } from "../../lib/api/reportExport";
import { ApiError } from "../../lib/api/errors";
import { currentMonthRange } from "../../lib/date";

type ExportStatus = "idle" | "generating" | "ready" | "downloading" | "error";

const FORMAT_OPTIONS: Array<{ value: ReportExportFormat; label: string }> = [
  { value: "csv", label: "CSV" },
  { value: "pdf", label: "PDF" },
];

/**
 * S-REP-03 (`FE-F3-08`) — `UX-SPEC.md`: "Seleção de período + formato (CSV/PDF,
 * radio) + botão 'Exportar' → indicador de geração → download". Consome
 * `/report-export` real (`BE-F3-07`, já Concluída — contrato publicado, não
 * mock), então esta tarefa fecha como `Concluída`, nunca `Em andamento`
 * (nenhuma pendência de mock, DIR do Executor).
 */
export function ExportReportPage() {
  const defaultRange = currentMonthRange();
  const [startDate, setStartDate] = useState(defaultRange.from);
  const [endDate, setEndDate] = useState(defaultRange.to);
  const [format, setFormat] = useState<ReportExportFormat>("csv");
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [result, setResult] = useState<ReportExportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }
    function handleOffline() {
      setIsOnline(false);
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Qualquer alteração de período/formato depois de já ter gerado um arquivo descarta o
  // resultado anterior — evita que o usuário baixe, por engano, um arquivo de um período
  // diferente do que está selecionado agora na tela (decisão pequena de UX, não uma
  // reinterpretação do wireframe: S-REP-03 não cobre esse caso explicitamente).
  function resetResult() {
    if (status === "ready" || status === "error") {
      setStatus("idle");
      setResult(null);
      setErrorMessage(null);
    }
  }

  const isPeriodValid = startDate !== "" && endDate !== "" && startDate <= endDate;

  async function handleExport() {
    setStatus("generating");
    setErrorMessage(null);
    setResult(null);
    try {
      const exported = await exportReport({ startDate, endDate, format });
      setResult(exported);
      setStatus("ready");
    } catch (cause) {
      setErrorMessage(cause instanceof ApiError ? cause.message : "Não foi possível gerar a exportação.");
      setStatus("error");
    }
  }

  async function handleDownload() {
    if (!result) return;
    setStatus("downloading");
    setErrorMessage(null);
    try {
      await downloadExportedFile(result);
      setStatus("ready");
    } catch {
      setErrorMessage("Não foi possível baixar o arquivo gerado. Tente exportar novamente.");
      setStatus("error");
    }
  }

  const isGenerating = status === "generating";
  const isDownloading = status === "downloading";

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-neutral-900">Exportar relatório</h1>

      {!isOnline && (
        <Alert variant="warning">Sem conexão com a internet — a exportação exige conexão ativa, tente novamente quando estiver online.</Alert>
      )}

      <Card>
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <DatePicker
              label="De"
              value={startDate}
              onChange={(event) => {
                setStartDate(event.target.value);
                resetResult();
              }}
            />
            <DatePicker
              label="Até"
              value={endDate}
              onChange={(event) => {
                setEndDate(event.target.value);
                resetResult();
              }}
              error={startDate !== "" && endDate !== "" && startDate > endDate ? "O período final não pode ser anterior ao inicial." : undefined}
            />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-neutral-700">Formato</legend>
            <div className="flex gap-4">
              {FORMAT_OPTIONS.map((option) => (
                <label key={option.value} className="inline-flex min-h-11 items-center gap-2 text-sm text-neutral-800">
                  <input
                    type="radio"
                    name="report-export-format"
                    value={option.value}
                    checked={format === option.value}
                    onChange={() => {
                      setFormat(option.value);
                      resetResult();
                    }}
                    className="h-4 w-4 accent-primary focus-visible:outline-2 focus-visible:outline-primary"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <Button onClick={() => void handleExport()} disabled={!isPeriodValid || !isOnline} loading={isGenerating} loadingLabel="Gerando exportação">
              Exportar
            </Button>
          </div>

          <div role="status" aria-live="polite">
            {isGenerating && <p className="text-sm text-neutral-600">Gerando {format.toUpperCase()}...</p>}
          </div>

          {errorMessage && <Alert variant="danger">{errorMessage}</Alert>}

          {result && status !== "error" && (
            <Alert variant="success" title="Exportação pronta">
              <p>
                {result.total_rows} {result.total_rows === 1 ? "lançamento" : "lançamentos"} no período selecionado.
              </p>
              <div className="mt-2">
                <Button onClick={() => void handleDownload()} variant="secondary" loading={isDownloading} loadingLabel="Baixando arquivo">
                  Baixar arquivo
                </Button>
              </div>
            </Alert>
          )}
        </div>
      </Card>
    </div>
  );
}
