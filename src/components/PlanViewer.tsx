import type { ToolCall } from "../types";

// Phases of the LangGraph state machine, in order.
const PHASES = ["plan", "act", "observe", "respond"] as const;
type PhaseName = (typeof PHASES)[number];

export type PhaseState = "pending" | "current" | "done";

export function PlanViewer({
  phases,
  tools,
  busy,
}: {
  phases: Record<PhaseName, PhaseState>;
  tools: ToolCall[];
  busy: boolean;
}) {
  return (
    <div className="plan-viewer">
      <div className="phase-bar">
        {PHASES.map((p, i) => {
          const state = phases[p];
          return (
            <div key={p} className={`phase phase-${state}`}>
              <span className="phase-dot">
                {state === "done" && <span className="check">✓</span>}
                {state === "current" && <span className="spinner" />}
              </span>
              <span className="phase-name">{p}</span>
              {i < PHASES.length - 1 && <span className="phase-line" />}
            </div>
          );
        })}
      </div>
      {tools.length > 0 && (
        <details className="tool-timeline" open>
          <summary>
            <span className="tool-count">{tools.length}</span> tool
            call{tools.length === 1 ? "" : "s"}
          </summary>
          <div className="tool-list">
            {tools.map((t, i) => (
              <div key={i} className={`tool-row ${t.output ? "done" : "running"}`}>
                <span className="tool-icon">
                  {t.output ? "✓" : <span className="mini-spinner" />}
                </span>
                <span className="tool-name">{t.name}</span>
                {t.input && Object.keys(t.input).length > 0 && (
                  <span className="tool-input-preview">
                    {summarizeArgs(t.input)}
                  </span>
                )}
              </div>
            ))}
            {busy && tools.every((t) => t.output) && (
              <div className="tool-row running">
                <span className="tool-icon">
                  <span className="mini-spinner" />
                </span>
                <span className="tool-name">thinking…</span>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
}

function summarizeArgs(input: Record<string, unknown>): string {
  const entries = Object.entries(input).filter(([_, v]) => v !== "" && v != null);
  if (entries.length === 0) return "";
  return entries
    .slice(0, 3)
    .map(([k, v]) => {
      const s = typeof v === "string" ? v : JSON.stringify(v);
      return `${k}=${s.length > 30 ? s.slice(0, 30) + "…" : s}`;
    })
    .join(" · ");
}
