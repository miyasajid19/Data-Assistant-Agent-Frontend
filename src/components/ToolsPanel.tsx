import { useRef, useState } from "react";
import type { DatasetInfo, ToolCall } from "../types";
import { addFilesToSession, deleteDataset, renameDataset, replaceDataset } from "../api";

// Human-readable label for an artifact URL: pull the filename from the path
// and strip its numeric prefix (e.g. "538b166ac413/total_output_by_ajmal_level.png"
// -> "Total output by ajmal level"). Used for alt text + tooltip so users see a
// meaningful caption instead of "artifact 1" when an image renders.
function artifactLabel(url: string): string {
  try {
    const file = decodeURIComponent(url.split("/").pop() ?? "");
    const stem = file.replace(/\.png$/i, "");
    const slug = stem.replace(/^[a-z0-9]{6,}_/i, "");
    return slug.replace(/[_-]+/g, " ").trim() || stem || "chart";
  } catch {
    return "chart";
  }
}

export function ToolsPanel({
  datasets,
  activeDatasetId,
  onSelectDataset,
  tools,
  artifacts,
  busy,
  onArtifactClick,
  onAddFiles,
  onReplaceDataset,
  onRenameDataset,
  onDeleteDataset,
}: {
  datasets: DatasetInfo[];
  activeDatasetId: string | null;
  onSelectDataset: (id: string) => void;
  tools: ToolCall[];
  artifacts: string[];
  busy: boolean;
  onArtifactClick?: (url: string) => void;
  onAddFiles?: (files: File[]) => void | Promise<void>;
  onReplaceDataset?: (datasetId: string, file: File) => void | Promise<void>;
  onRenameDataset?: (datasetId: string, filename: string) => void | Promise<void>;
  onDeleteDataset?: (datasetId: string) => void | Promise<void>;
}) {
  const active = datasets.find((d) => d.id === activeDatasetId) ?? datasets[0] ?? null;
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const [pendingAction, setPendingAction] = useState<"replace" | "add" | null>(null);

  const triggerReplace = (dsId: string) => {
    setPendingAction("replace");
    if (replaceInputRef.current) {
      replaceInputRef.current.dataset.targetDs = dsId;
      replaceInputRef.current.click();
    }
  };

  const triggerAdd = () => {
    setPendingAction("add");
    addInputRef.current?.click();
  };

  return (
    <aside className="tools-panel">
      {datasets.length > 0 && (
        <section className="panel-section">
          <div className="panel-section-head">
            <h3 className="panel-title">
              <span>📊</span> Datasets
              <span className="badge">{datasets.length}</span>
            </h3>
          </div>
          <div className="dataset-tabs">
            {datasets.map((d) => (
              <button
                key={d.id}
                className={`dataset-tab ${d.id === active?.id ? "active" : ""}`}
                onClick={() => onSelectDataset(d.id)}
                title={d.filename}
              >
                <span className="tab-name">{d.filename}</span>
                <span className="tab-meta">
                  {d.rows.toLocaleString()} × {d.columns.length}
                </span>
              </button>
            ))}
          </div>
          {active && (
            <div className="dataset-meta">
              <span>{active.rows.toLocaleString()} rows</span>
              <span>{active.columns.length} cols</span>
              <span>{active.memory_mb} MB</span>
            </div>
          )}
          {active && (
            <div className="dataset-actions">
              <button
                className="ds-action-btn"
                onClick={() => triggerRename(active.id, active.filename)}
                title="Rename this dataset"
              >
                <span aria-hidden>✎</span> Rename
              </button>
              <button
                className="ds-action-btn"
                onClick={() => triggerReplace(active.id)}
                title="Replace file contents"
                disabled={busy}
              >
                <span aria-hidden>↻</span> Replace
              </button>
              <button
                className="ds-action-btn ds-action-danger"
                onClick={() => triggerDelete(active.id, active.filename)}
                title="Delete this dataset"
                disabled={busy || datasets.length <= 1}
              >
                <span aria-hidden>🗑</span> Delete
              </button>
            </div>
          )}
          {datasets.length > 0 && (
            <button
              className="ds-add-btn"
              onClick={triggerAdd}
              disabled={busy}
              title="Add another file to this session"
            >
              <span aria-hidden>＋</span> Add another file
            </button>
          )}
          {active && (
            <details className="panel-details" open>
              <summary>Schema of {active.filename}</summary>
              <ul className="columns">
                {active.columns.map((c) => (
                  <li key={c}>
                    <span className="col-name">{c}</span>
                    <span className="col-type">{active.dtypes[c] ?? ""}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}

      {/* Hidden file inputs triggered by action buttons */}
      <input
        ref={replaceInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          const dsId = e.target.dataset.targetDs;
          if (f && dsId && onReplaceDataset) onReplaceDataset(dsId, f);
          e.target.value = "";
          setPendingAction(null);
        }}
      />
      <input
        ref={addInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        multiple
        style={{ display: "none" }}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length && onAddFiles) onAddFiles(files);
          e.target.value = "";
          setPendingAction(null);
        }}
      />

      {tools.length > 0 && (
        <section className="panel-section">
          <h3 className="panel-title">
            <span>🔧</span> Tool calls
            <span className="badge">{tools.length}</span>
          </h3>
          <div className="tool-list">
            {tools.map((t, i) => (
              <details key={i} className="tool-card" open={!t.output}>
                <summary>
                  <span
                    className={`tool-status ${t.output ? "done" : "running"}`}
                  >
                    {t.output ? "✓" : busy ? "⏳" : "•"}
                  </span>
                  <span className="tool-name">{t.name}</span>
                </summary>
                {t.input && Object.keys(t.input).length > 0 && (
                  <>
                    <div className="tool-sub-label">input</div>
                    <pre className="tool-input">
                      {JSON.stringify(t.input, null, 2)}
                    </pre>
                  </>
                )}
                {t.output && (
                  <>
                    <div className="tool-sub-label">output</div>
                    <pre className="tool-output">
                      {t.output.length > 1200
                        ? t.output.slice(0, 1200) + "\n…(truncated)"
                        : t.output}
                    </pre>
                  </>
                )}
              </details>
            ))}
          </div>
        </section>
      )}

      {artifacts.length > 0 && (
        <section className="panel-section">
          <h3 className="panel-title">
            <span>🖼</span> Artifacts
            <span className="badge">{artifacts.length}</span>
          </h3>
          <div className="artifact-list">
            {artifacts.map((a, i) => {
              const label = artifactLabel(a);
              return (
                <button
                  key={i}
                  type="button"
                  className="artifact-thumb"
                  title={`${label} — click to enlarge`}
                  onClick={() => onArtifactClick?.(a)}
                >
                  <img
                    src={a}
                    alt={label}
                    loading="lazy"
                    onError={(e) => {
                      // The backend was reachable when this URL was emitted,
                      // but the browser couldn't fetch it (proxy down, stale
                      // cache, etc.). Show a clear broken state so the user
                      // knows the chart exists but isn't rendering, instead
                      // of a meaningless "artifact N" alt string.
                      const img = e.currentTarget;
                      img.style.visibility = "hidden";
                      const parent = img.parentElement;
                      if (parent && !parent.querySelector(".artifact-broken")) {
                        const note = document.createElement("div");
                        note.className = "artifact-broken";
                        note.textContent = "chart unavailable";
                        parent.appendChild(note);
                      }
                    }}
                  />
                </button>
              );
            })}
          </div>
        </section>
      )}

      {datasets.length === 0 && tools.length === 0 && artifacts.length === 0 && (
        <div className="panel-empty">
          <div className="panel-empty-text">
            Datasets, tool calls, and generated charts will appear here as the
            agent works.
          </div>
        </div>
      )}
    </aside>
  );

  function triggerRename(dsId: string, currentName: string) {
    const next = window.prompt("Rename dataset to:", currentName);
    if (!next || next === currentName || !onRenameDataset) return;
    onRenameDataset(dsId, next.trim());
  }
  function triggerDelete(dsId: string, filename: string) {
    const ok = window.confirm(`Delete "${filename}"? This cannot be undone.`);
    if (!ok || !onDeleteDataset) return;
    onDeleteDataset(dsId);
  }
}
