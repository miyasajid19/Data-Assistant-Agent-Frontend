import type { CrossDatasetJoin, DatasetOverview, GeneratedChart } from "../types";

export function OverviewMessage({
  overviews,
  combinedSummary,
  crossDatasetJoins,
  suggestedQuestions,
  onAsk,
}: {
  overviews: DatasetOverview[];
  combinedSummary?: string;
  crossDatasetJoins?: CrossDatasetJoin[];
  suggestedQuestions?: string[];
  onAsk?: (question: string) => void;
}) {
  if (!overviews?.length) return null;

  return (
    <div className="bubble-row assistant-row">
      <div className="bubble assistant overview-bubble has-chart">
        <div className="bubble-avatar overview-avatar" aria-hidden>📊</div>
        <div className="bubble-body">
          <div className="overview-header">
            <div className="overview-title">Hi! Here's what I found in your data</div>
            <div className="overview-sub">
              I auto-profiled your file and generated charts. Scroll through, or try
              one of the questions below.
            </div>
          </div>

          {combinedSummary && (
            <div className="overview-summary">
              {formatMarkdown(combinedSummary)}
            </div>
          )}

          {overviews.length > 1 && crossDatasetJoins && crossDatasetJoins.length > 0 && (
            <section className="overview-section">
              <h4>Cross-dataset joins detected</h4>
              <div className="join-list">
                {uniqJoins(crossDatasetJoins).map((j, i) => (
                  <span key={i} className="join-chip" title={`${j.kind} join key`}>
                    <code>{j.left_dataset}.{j.left_column}</code>
                    <span className="join-arrow">↔</span>
                    <code>{j.right_dataset}.{j.right_column}</code>
                    <span className={`join-kind kind-${j.kind}`}>{j.kind}</span>
                  </span>
                ))}
              </div>
              <div className="overview-hint">
                Ask: <em>"Join these on that column and show total profit per X"</em>
              </div>
            </section>
          )}

          {overviews.map((ov, idx) => (
            <DatasetOverviewPanel key={ov.dataset_id} overview={ov} />
          ))}

          {suggestedQuestions && suggestedQuestions.length > 0 && (
            <section className="overview-section overview-followups">
              <h4>Try asking…</h4>
              <div className="followup-chips">
                {suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    className="followup-chip"
                    onClick={() => onAsk?.(q)}
                  >
                    <span className="followup-icon">✦</span>
                    {q}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function DatasetOverviewPanel({ overview }: { overview: DatasetOverview }) {
  const { charts } = overview;
  const corrChart = charts.find((c) => c.kind === "correlation_heatmap");
  const missingChart = charts.find((c) => c.kind === "missing_values");
  const histograms = charts.filter((c) => c.kind === "histogram");
  const bars = charts.filter((c) => c.kind === "bar");

  return (
    <section className="overview-section">
      <h4>
        <span className="dataset-icon">📄</span> {overview.filename}
        <span className="overview-meta-inline">
          {overview.shape[0].toLocaleString()} rows × {overview.shape[1]} cols
        </span>
      </h4>

      <div className="stat-grid">
        <Stat label="Numeric" value={overview.numeric_columns.length} />
        <Stat label="Categorical" value={overview.categorical_columns.length} />
        <Stat label="Date-like" value={overview.datetime_columns.length} />
        <Stat
          label="Cols w/ nulls"
          value={Object.keys(overview.null_counts).length}
        />
        <Stat label="Duplicate rows" value={overview.duplicate_rows.toLocaleString()} />
        <Stat
          label="Strongest |r|"
          value={
            overview.top_correlations[0]
              ? Math.abs(overview.top_correlations[0].corr).toFixed(2)
              : "—"
          }
        />
      </div>

      {overview.top_correlations.length > 0 && (
        <div className="corr-list">
          <div className="corr-list-title">Top correlations</div>
          {overview.top_correlations.slice(0, 5).map((c, i) => (
            <div key={i} className="corr-item">
              <code>{c.a}</code>
              <span className="corr-arrow">↔</span>
              <code>{c.b}</code>
              <span
                className="corr-bar"
                style={{
                  width: `${Math.min(80, Math.abs(c.corr) * 80)}px`,
                  background: c.corr >= 0 ? "#3fb950" : "#f85149",
                }}
              />
              <span className={`corr-val ${c.corr >= 0 ? "pos" : "neg"}`}>
                {c.corr >= 0 ? "+" : ""}
                {c.corr.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}

      {corrChart && <ChartBlock chart={corrChart} />}

      {missingChart && (
        <ChartBlock chart={missingChart} caption="Where the data is missing" />
      )}

      {histograms.length > 0 && (
        <ChartGrid
          charts={histograms}
          title="Numeric distributions"
          kindLabel="histogram"
        />
      )}
      {bars.length > 0 && (
        <ChartGrid charts={bars} title="Categorical top values" kindLabel="bar" />
      )}
    </section>
  );
}

function ChartBlock({ chart, caption }: { chart: GeneratedChart; caption?: string }) {
  return (
    <div className="chart-block">
      <div className="chart-wrap">
        <img src={chart.url} alt={chart.description} className="chart-img" />
        <a className="chart-download" href={chart.url} download title="Download chart">⤓</a>
        {caption && <div className="chart-caption">{caption}</div>}
      </div>
    </div>
  );
}

function ChartGrid({
  charts,
  title,
  kindLabel,
}: {
  charts: GeneratedChart[];
  title: string;
  kindLabel: string;
}) {
  return (
    <div className="chart-grid-section">
      <div className="chart-grid-title">
        {title} <span className="count">({charts.length})</span>
      </div>
      <div className="chart-grid">
        {charts.map((c) => (
          <div key={c.url} className="chart-card">
            <div className="chart-wrap">
              <img src={c.url} alt={c.description} className="chart-img" />
              <a className="chart-download" href={c.url} download title="Download">⤓</a>
            </div>
            <div className="chart-card-caption">
              <span className={`chart-kind kind-${c.kind}`}>{kindLabel}</span>
              <span className="chart-card-title">{c.title}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function uniqJoins(joins: CrossDatasetJoin[]): CrossDatasetJoin[] {
  const seen = new Set<string>();
  const out: CrossDatasetJoin[] = [];
  for (const j of joins) {
    const key = `${j.left_dataset}.${j.left_column}|${j.right_dataset}.${j.right_column}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(j);
  }
  return out;
}

// Minimal markdown (bold only) — overview summary is short prose.
function formatMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    }
    return <span key={i}>{p}</span>;
  });
}
