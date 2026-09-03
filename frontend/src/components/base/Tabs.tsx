import { useId, useState } from "react";
import type { ReactNode } from "react";

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
  /** Badge/indicador opcional ao lado do rótulo (ex.: aberta/fechada em S-CARD-03). */
  suffix?: ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  defaultTabId?: string;
  /** Controlado externamente (opcional) — se omitido, o componente gerencia o próprio estado. */
  activeTabId?: string;
  onChange?: (tabId: string) => void;
  label: string;
}

/**
 * Tabs — UX-SPEC.md Seção 3.2, usado em S-CARD-03 (`InvoiceTimeline`).
 * Implementa o padrão ARIA APG de abas: `role="tablist"`/`tab`/`tabpanel`, roving
 * tabindex, navegação por setas ←/→ (Home/End para primeira/última), foco visível
 * herdado do anel global — WCAG 2.1 AA (DIR-15).
 */
export function Tabs({ tabs, defaultTabId, activeTabId, onChange, label }: TabsProps) {
  const baseId = useId();
  const [internalActive, setInternalActive] = useState(defaultTabId ?? tabs[0]?.id);
  const active = activeTabId ?? internalActive;

  function select(tabId: string) {
    setInternalActive(tabId);
    onChange?.(tabId);
  }

  function handleKeyDown(event: React.KeyboardEvent, index: number) {
    const enabledTabs = tabs;
    if (enabledTabs.length === 0) return;
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % enabledTabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (index - 1 + enabledTabs.length) % enabledTabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = enabledTabs.length - 1;

    if (nextIndex !== null) {
      event.preventDefault();
      const nextTab = enabledTabs[nextIndex];
      select(nextTab.id);
      document.getElementById(`${baseId}-tab-${nextTab.id}`)?.focus();
    }
  }

  const activeTab = tabs.find((tab) => tab.id === active);

  return (
    <div>
      <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto border-b border-neutral-200">
        {tabs.map((tab, index) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              id={`${baseId}-tab-${tab.id}`}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => select(tab.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={[
                "flex min-h-11 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium",
                "focus-visible:outline-2 focus-visible:outline-primary",
                isActive ? "border-primary text-primary" : "border-transparent text-neutral-500 hover:text-neutral-700",
              ].join(" ")}
            >
              {tab.label}
              {tab.suffix}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${baseId}-panel-${tab.id}`}
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={tab.id !== active}
          tabIndex={0}
          className="pt-4"
        >
          {tab.id === activeTab?.id ? tab.content : null}
        </div>
      ))}
    </div>
  );
}
