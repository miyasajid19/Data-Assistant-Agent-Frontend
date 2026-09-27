import { useNavigate } from "react-router-dom";
import {
  SparkleIcon,
  UploadIcon,
  ChartIcon,
  ShieldIcon,
  PlanIcon,
  HistoryIcon,
} from "../components/icons";

export function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing">
      <div className="landing-bg" aria-hidden="true">
        <div className="landing-bg-grid" />
      </div>

      <header className="landing-nav">
        <div className="landing-brand">
          <span className="landing-brand-name">Data Assistant</span>
        </div>
        <nav className="landing-nav-links">
          <a href="#capabilities">Capabilities</a>
          <a href="#loop">Loop</a>
          <button
            className="landing-nav-cta"
            onClick={() => navigate("/chat")}
          >
            Open chat
          </button>
        </nav>
      </header>

      <main className="landing-main">
        {/* ---- HERO ---- asymmetric: copy on the left, a live agent demo on the right */}
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <p className="landing-kicker">Techvruk 2026</p>
            <h1 className="landing-title">
              Talk to your data.<br />
              <em className="landing-title-em">Get a reasoned answer.</em>
            </h1>
            <p className="landing-sub">
              An agentic analyst for CSV and Excel. Drop a file, ask in plain
              English, watch it plan the work, run pandas and plotting tools,
              and answer with charts you can open and inspect.
            </p>
            <div className="landing-actions">
              <button
                className="landing-btn landing-btn-primary"
                onClick={() => navigate("/chat")}
              >
                Start chat
              </button>
              <a className="landing-btn landing-btn-ghost" href="#loop">
                See the loop
              </a>
            </div>
            <ul className="landing-meta">
              <li>
                <span className="landing-meta-num">9</span>
                <span className="landing-meta-lbl">pandas and plot tools</span>
              </li>
              <li>
                <span className="landing-meta-num">4</span>
                <span className="landing-meta-lbl">steps in the agent loop</span>
              </li>
              <li>
                <span className="landing-meta-num">∞</span>
                <span className="landing-meta-lbl">threads per session</span>
              </li>
            </ul>
          </div>

          {/* Live-feeling agent demo — a single composed card, not a marquee */}
          <aside className="landing-demo" aria-label="Example agent run">
            <div className="landing-demo-bar">
              <span className="landing-demo-dot" />
              <span className="landing-demo-dot" />
              <span className="landing-demo-dot" />
              <span className="landing-demo-title">agent run · matches.csv</span>
            </div>
            <div className="landing-demo-body">
              <div className="landing-demo-plan">
                <div className="landing-demo-plan-head">
                  <PlanIcon size={14} /> Plan
                </div>
                <ol>
                  <li>group rows by <code>Season</code></li>
                  <li>count rows and render a bar chart</li>
                </ol>
              </div>
              <div className="landing-demo-tools">
                <span className="landing-demo-tool"><span className="landing-demo-tool-k">tool</span> plot_bar</span>
                <span className="landing-demo-tool"><span className="landing-demo-tool-k">arg</span> x=Season</span>
                <span className="landing-demo-tool"><span className="landing-demo-tool-k">arg</span> agg=count</span>
              </div>
              <div className="landing-demo-chart" aria-hidden="true">
                <svg viewBox="0 0 280 110" preserveAspectRatio="none">
                  {[28, 42, 38, 56, 64, 58, 72, 85, 78].map((h, i) => (
                    <rect
                      key={i}
                      x={10 + i * 30}
                      y={100 - h}
                      width={20}
                      height={h}
                      rx={2}
                      fill="#9ee493"
                      fillOpacity={0.85 - i * 0.04}
                    />
                  ))}
                </svg>
                <div className="landing-demo-chart-cap">
                  Matches per season · 2008–2017
                </div>
              </div>
              <div className="landing-demo-msg landing-demo-msg-assistant">
                <SparkleIcon size={14} />
                <span>
                  <strong>2013 had the most matches</strong> (76). The series
                  trends up overall, with 2011–2013 the busiest stretch.
                </span>
              </div>
            </div>
          </aside>
        </section>

        {/* ---- CAPABILITIES ---- bento grid, mixed treatments, no identical cards */}
        <section id="capabilities" className="landing-capabilities">
          <h2 className="landing-section-title">
            Built for honest, inspectable analytics.
          </h2>

          <div className="landing-bento">
            {/* Big feature — CSV upload, with mock UI */}
            <article className="landing-bento-card landing-bento-hero">
              <div className="landing-bento-card-body">
                <div className="landing-bento-icon">
                  <UploadIcon size={18} />
                </div>
                <h3>Drop in a CSV — or several.</h3>
                <p>
                  Upload one file or many. The agent infers schemas, suggests
                  joins, and surfaces the questions that are worth asking
                  before you do.
                </p>
              </div>
              <div className="landing-bento-mock" aria-hidden="true">
                <div className="landing-mock-file">
                  <UploadIcon size={12} />
                  <span>matches.csv</span>
                  <span className="landing-mock-meta">1.2 MB · 756 rows</span>
                </div>
                <div className="landing-mock-file">
                  <UploadIcon size={12} />
                  <span>deliveries.csv</span>
                  <span className="landing-mock-meta">380 KB · 5,032 rows</span>
                </div>
                <div className="landing-mock-hint">
                  <SparkleIcon size={12} />
                  joinable on <code>match_id</code> · suggested questions ready
                </div>
              </div>
            </article>

            {/* Plan → Act → Observe */}
            <article className="landing-bento-card">
              <div className="landing-bento-icon"><PlanIcon size={18} /></div>
              <h3>An explicit plan, every time.</h3>
              <p>
                Before any tool runs, the agent writes what it's going to do.
                Nothing executes in the dark — you can read it, reject it, or
                guide it.
              </p>
            </article>

            {/* Charts that think */}
            <article className="landing-bento-card">
              <div className="landing-bento-icon"><ChartIcon size={18} /></div>
              <h3>Charts with citations.</h3>
              <p>
                Bar, line, scatter, histogram, heatmap, violin — every plot
                is rendered from pandas and tied to the row of output that
                produced it.
              </p>
            </article>

            {/* Sandbox */}
            <article className="landing-bento-card">
              <div className="landing-bento-icon"><ShieldIcon size={18} /></div>
              <h3>Sandboxed by signature.</h3>
              <p>
                Tools run against in-memory DataFrames with explicit argument
                schemas. The model never touches your filesystem.
              </p>
            </article>

            {/* Persistent threads */}
            <article className="landing-bento-card">
              <div className="landing-bento-icon"><HistoryIcon size={18} /></div>
              <h3>Threads that outlive the tab.</h3>
              <p>
                Each conversation lives in its own thread bound to a session —
                close the browser, reopen it, pick up where you left off.
              </p>
            </article>

            {/* Code snippet card — visual variety, not another paragraph */}
            <article className="landing-bento-card landing-bento-code">
              <div className="landing-bento-code-head">
                <span className="landing-bento-code-file">tools.py</span>
                <span className="landing-bento-code-tag">strict signature</span>
              </div>
              <pre><code>{`def plot_bar(
    df: pd.DataFrame,
    x: str,
    y: Optional[str] = None,
    agg: Literal["sum", "mean", "count"] = "sum",
) -> ChartArtifact:
    ...`}</code></pre>
              <p className="landing-bento-code-cap">
                No nested kwargs, no surprise writes — the LLM gets exactly
                this surface and nothing more.
              </p>
            </article>
          </div>
        </section>

        {/* ---- LOOP ---- four steps, kept as a sequence because it is one */}
        <section id="loop" className="landing-loop">
          <h2 className="landing-section-title">Four steps, every question.</h2>

          <ol className="landing-steps">
            <li>
              <span className="landing-step-num">01</span>
              <h4>Plan</h4>
              <p>
                The agent reads your question and the dataset's schema, then
                writes an explicit plan — shown to you before any tool runs.
              </p>
            </li>
            <li>
              <span className="landing-step-num">02</span>
              <h4>Act</h4>
              <p>
                It calls pandas and plotting tools against your data with
                strict signatures. No hidden side effects, no surprise writes.
              </p>
            </li>
            <li>
              <span className="landing-step-num">03</span>
              <h4>Observe</h4>
              <p>
                Each tool result is summarised back into the conversation, so
                the agent can revise the plan when a step surprises it.
              </p>
            </li>
            <li>
              <span className="landing-step-num">04</span>
              <h4>Respond</h4>
              <p>
                A final answer that cites the tools it used and the numbers it
                found — with charts you can open and inspect.
              </p>
            </li>
          </ol>
        </section>

        {/* ---- QUIET FOOTER-CTA ---- a single line, no gradient card ---- */}
        <section className="landing-end">
          <p>Drop a CSV in the chat — or just type a question.</p>
          <button
            className="landing-btn landing-btn-primary"
            onClick={() => navigate("/chat")}
          >
            Start chat
          </button>
        </section>
      </main>

      <footer className="landing-foot">
        <span>
          Data Assistant Agent — MiniMax-M3, LangGraph, FastAPI, React
        </span>
        <span>Built for Techvruk 2026</span>
      </footer>
    </div>
  );
}
