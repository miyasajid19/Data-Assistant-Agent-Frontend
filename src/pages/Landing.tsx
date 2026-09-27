import { useNavigate } from "react-router-dom";
import {
  SparkleIcon,
  UploadIcon,
  ChartIcon,
  ShieldIcon,
  PlanIcon,
  HistoryIcon,
} from "../components/icons";

type Feature = {
  icon: React.ReactNode;
  title: string;
  body: string;
};

const FEATURES: Feature[] = [
  {
    icon: <UploadIcon size={20} />,
    title: "Drop in any CSV",
    body:
      "Upload one or more tabular files and the agent auto-builds schemas, joins and suggested questions for you.",
  },
  {
    icon: <PlanIcon size={20} />,
    title: "Plan → Act → Observe",
    body:
      "Every request goes through an explicit plan you can inspect before tools run. Nothing executes in the dark.",
  },
  {
    icon: <ChartIcon size={20} />,
    title: "Charts that think",
    body:
      "Bar, line, scatter, histogram and heatmap renders from pandas — click any chart to expand and inspect the data.",
  },
  {
    icon: <HistoryIcon size={20} />,
    title: "Persistent threads",
    body:
      "Each conversation is its own thread tied to a dataset session — pick up where you left off, even after a refresh.",
  },
  {
    icon: <ShieldIcon size={20} />,
    title: "Sandboxed execution",
    body:
      "Tool calls run against in-memory dataframes with explicit signatures. The LLM never touches your filesystem directly.",
  },
  {
    icon: <SparkleIcon size={20} />,
    title: "Reasoned answers",
    body:
      "Final responses include the plan, the tool calls and the observed results — so you can trust the answer, not just read it.",
  },
];

export function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing">
      <div className="landing-bg" aria-hidden="true">
        <div className="landing-bg-grid" />
        <div className="landing-bg-glow landing-bg-glow-a" />
        <div className="landing-bg-glow landing-bg-glow-b" />
      </div>

      <header className="landing-nav">
        <div className="landing-brand">
          <span className="logo-dot" />
          <span className="landing-brand-name">Data Assistant</span>
        </div>
        <nav className="landing-nav-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <button
            className="landing-nav-cta"
            onClick={() => navigate("/chat")}
          >
            Open chat
          </button>
        </nav>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <span className="landing-eyebrow">
            <SparkleIcon size={14} /> Techvruk · 2026
          </span>
          <h1 className="landing-title">
            Talk to your data.<br />
            <span className="landing-title-accent">Get a reasoned answer.</span>
          </h1>
          <p className="landing-sub">
            Data Assistant Agent is an agentic analyst: upload a CSV, ask in
            plain English, and watch it plan, run pandas tools and explain the
            result — with charts you can click into.
          </p>
          <div className="landing-actions">
            <button
              className="landing-btn landing-btn-primary"
              onClick={() => navigate("/chat")}
            >
              Start chat
              <span className="landing-btn-arrow" aria-hidden="true">→</span>
            </button>
            <a className="landing-btn landing-btn-ghost" href="#features">
              See what it can do
            </a>
          </div>
          <div className="landing-stats">
            <div>
              <div className="landing-stat-num">9</div>
              <div className="landing-stat-lbl">Pandas / plot tools</div>
            </div>
            <div>
              <div className="landing-stat-num">4</div>
              <div className="landing-stat-lbl">Plan · Act · Observe · Respond</div>
            </div>
            <div>
              <div className="landing-stat-num">∞</div>
              <div className="landing-stat-lbl">Threads per dataset</div>
            </div>
          </div>
        </section>

        <section id="features" className="landing-features">
          <div className="landing-section-label">What's inside</div>
          <h2 className="landing-section-title">
            Built for honest, inspectable analytics
          </h2>
          <div className="landing-feature-grid">
            {FEATURES.map((f) => (
              <article key={f.title} className="landing-feature-card">
                <div className="landing-feature-icon">{f.icon}</div>
                <h3 className="landing-feature-title">{f.title}</h3>
                <p className="landing-feature-body">{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="landing-how">
          <div className="landing-section-label">How it works</div>
          <h2 className="landing-section-title">Four steps, every question</h2>
          <ol className="landing-steps">
            <li>
              <span className="landing-step-num">01</span>
              <div>
                <h4>Plan</h4>
                <p>
                  The agent reads your question + dataset schema and writes an
                  explicit plan — shown to you before any tool runs.
                </p>
              </div>
            </li>
            <li>
              <span className="landing-step-num">02</span>
              <div>
                <h4>Act</h4>
                <p>
                  It calls pandas / plotting tools against your data with strict
                  signatures — no hidden side effects, no surprise writes.
                </p>
              </div>
            </li>
            <li>
              <span className="landing-step-num">03</span>
              <div>
                <h4>Observe</h4>
                <p>
                  Each tool result is summarized back into the conversation, so
                  the agent can revise the plan if a step surprises it.
                </p>
              </div>
            </li>
            <li>
              <span className="landing-step-num">04</span>
              <div>
                <h4>Respond</h4>
                <p>
                  A final answer that cites the tools it used and the numbers it
                  found — plus charts you can expand.
                </p>
              </div>
            </li>
          </ol>
        </section>

        <section className="landing-cta">
          <div className="landing-cta-card">
            <h2>Ready to ask something?</h2>
            <p>
              Drop a CSV in the chat, or just type a question — the agent will
              tell you what it plans to do before it does it.
            </p>
            <button
              className="landing-btn landing-btn-primary landing-btn-lg"
              onClick={() => navigate("/chat")}
            >
              Start chat
              <span className="landing-btn-arrow" aria-hidden="true">→</span>
            </button>
          </div>
        </section>
      </main>

      <footer className="landing-foot">
        <span>Data Assistant Agent · MiniMax-M3 · LangGraph · FastAPI · React</span>
        <span>Built for Techvruk 2026</span>
      </footer>
    </div>
  );
}
