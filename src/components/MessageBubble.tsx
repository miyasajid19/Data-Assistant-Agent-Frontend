import { useEffect, useRef } from "react";
import type { ChatMessage } from "../types";
import { parseBlocks, renderBlocks } from "./markdown";
import { PlanMessage, parsePlanSteps } from "./PlanMessage";
import { downloadFile, filenameFromUrl } from "../download";

export function MessageBubble({
  msg,
  toolResultsCount = 0,
  busy = false,
  onChartClick,
}: {
  msg: ChatMessage;
  toolResultsCount?: number;
  busy?: boolean;
  onChartClick?: (url: string) => void;
}) {
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = bubbleRef.current;
    if (!root) return;

    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Download button: trigger a programmatic blob download — never open
      // a new tab, regardless of the server's Content-Disposition header.
      const dlLink = target.closest(".chart-download") as HTMLAnchorElement | null;
      if (dlLink) {
        e.preventDefault();
        const url = dlLink.getAttribute("href");
        if (url) downloadFile(url, filenameFromUrl(url));
        return;
      }

      // Image / span click: open lightbox.
      const wrap = target.closest(".chart-wrap") as HTMLElement | null;
      if (!wrap || !onChartClick) return;
      e.preventDefault();
      const url = wrap.getAttribute("data-chart-url");
      if (url) onChartClick(url);
    };
    root.addEventListener("click", handler);
    return () => root.removeEventListener("click", handler);
  }, [onChartClick, msg.content]);

  if (msg.role === "user") {
    return (
      <div className="bubble-row user-row">
        <div className="bubble user">
          <div className="bubble-content">{msg.content}</div>
        </div>
      </div>
    );
  }
  if (msg.role === "error") {
    return (
      <div className="bubble-row assistant-row">
        <div className="bubble error">
          <div className="bubble-content">{msg.content}</div>
        </div>
      </div>
    );
  }

  // Plan message — render as a dedicated card.
  if (msg.name === "plan") {
    const plan = extractPlanSteps(msg.content);
    if (plan.length > 0) {
      return (
        <PlanMessage plan={plan} toolResultsCount={toolResultsCount} busy={busy} />
      );
    }
  }

  const blocks = msg.content ? parseBlocks(msg.content) : [];
  const hasChart = /\/artifacts\/[^\s)]+\.png/.test(msg.content);
  return (
    <div className="bubble-row assistant-row">
      <div className={`bubble assistant ${hasChart ? "has-chart" : ""}`}>
        <div className="bubble-avatar" aria-hidden>
          ›
        </div>
        <div className="bubble-body" ref={bubbleRef}>
          {msg.content ? (
            <div className="bubble-content">{renderBlocks(blocks)}</div>
          ) : msg.streaming ? (
            <div className="thinking">
              <span className="thinking-dot" />
              <span className="thinking-dot" />
              <span className="thinking-dot" />
            </div>
          ) : null}
          {msg.streaming && msg.content && <span className="cursor">▍</span>}
        </div>
      </div>
    </div>
  );
}

function extractPlanSteps(content: string): string[] {
  const lines = content.split("\n");
  const steps: string[] = [];
  for (const line of lines) {
    const m = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (m) {
      steps.push(m[1].trim());
    }
  }
  return steps;
}
