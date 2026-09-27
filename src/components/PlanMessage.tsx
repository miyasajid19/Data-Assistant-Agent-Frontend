import type { ParsedPlanStep } from "../types";

export function parsePlanSteps(plan: string[]): ParsedPlanStep[] {
  return plan.map((raw) => {
    // Match "<tool_name>(<args...>)" at the start of the step.
    const m = raw.match(/^(\w+)\((.*)\)$/s);
    if (!m) return { raw, toolName: null, args: null };
    return { raw, toolName: m[1], args: m[2] };
  });
}

export function PlanMessage({
  plan,
  toolResultsCount,
  busy,
}: {
  plan: string[];
  toolResultsCount: number;
  busy: boolean;
}) {
  const steps = parsePlanSteps(plan);

  return (
    <div className="bubble-row assistant-row">
      <div className="bubble assistant plan-bubble">
        <div className="bubble-avatar plan-avatar" aria-hidden>
          📋
        </div>
        <div className="bubble-body">
          <div className="plan-header">
            <span className="plan-title">Plan</span>
            <span className="plan-meta">
              {steps.length} step{steps.length === 1 ? "" : "s"}
              {toolResultsCount > 0 && (
                <>
                  <span className="plan-meta-dot">·</span>
                  <span className="plan-meta-progress">
                    {toolResultsCount}/{steps.length} done
                  </span>
                </>
              )}
            </span>
          </div>
          <ol className="plan-steps">
            {steps.map((step, i) => {
              const isDone = i < toolResultsCount;
              const isCurrent = i === toolResultsCount && busy;
              const status = isDone ? "done" : isCurrent ? "current" : "pending";
              return (
                <li key={i} className={`plan-step plan-step-${status}`}>
                  <span className="step-marker">
                    {isDone ? "✓" : isCurrent ? (
                      <span className="step-spinner" />
                    ) : (
                      <span className="step-num">{i + 1}</span>
                    )}
                  </span>
                  <span className="step-body">
                    {step.toolName ? (
                      <>
                        <span className="step-tool">{step.toolName}</span>
                        {step.args && (
                          <span className="step-args">
                            (<span className="step-args-text">{step.args}</span>)
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="step-text">{step.raw}</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
