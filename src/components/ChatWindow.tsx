import { useEffect, useRef, useState } from "react";
import { createEmptySession, streamChat } from "../api";
import type {
  ChatMessage,
  CrossDatasetJoin,
  DatasetOverview,
  ToolCall,
} from "../types";
import { MessageBubble } from "./MessageBubble";
import { OverviewMessage } from "./OverviewMessage";
import { PlanMessage } from "./PlanMessage";
import { PlanViewer, type PhaseState } from "./PlanViewer";
import { PaperclipIcon, SendArrowIcon } from "./icons";

const THREAD_STATE_KEY = (tid: string) => `daa-thread-state-${tid}`;

type PhaseName = "plan" | "act" | "observe" | "respond";

const EMPTY_PHASES: Record<PhaseName, PhaseState> = {
  plan: "pending",
  act: "pending",
  observe: "pending",
  respond: "pending",
};

export function ChatWindow({
  sessionId,
  threadId,
  datasetLabel,
  overview,
  crossDatasetJoins,
  suggestedQuestions,
  onTitleUpdate,
  onToolsUpdate,
  onArtifactsUpdate,
  onBusyChange,
  onUpload,
  uploading,
  onChartClick,
  onSessionCreated,
}: {
  sessionId: string | null;
  threadId: string;
  datasetLabel?: string;
  overview?: DatasetOverview[];
  crossDatasetJoins?: CrossDatasetJoin[];
  suggestedQuestions?: string[];
  onTitleUpdate: (text: string) => void;
  onToolsUpdate: (tools: ToolCall[]) => void;
  onArtifactsUpdate: (artifacts: string[]) => void;
  onBusyChange: (busy: boolean) => void;
  onUpload?: (files: File[]) => void | Promise<void>;
  uploading?: boolean;
  onChartClick?: (url: string) => void;
  onSessionCreated?: (sessionId: string) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [phases, setPhases] = useState<Record<PhaseName, PhaseState>>(EMPTY_PHASES);
  const [dragOver, setDragOver] = useState(false);
  const [plan, setPlan] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restore messages + plan from localStorage whenever the active thread changes.
  useEffect(() => {
    if (!threadId) return;
    try {
      const raw = localStorage.getItem(THREAD_STATE_KEY(threadId));
      if (raw) {
        const parsed = JSON.parse(raw) as {
          messages?: ChatMessage[];
          plan?: string[];
        };
        setMessages(parsed.messages ?? []);
        setPlan(parsed.plan ?? []);
        return;
      }
    } catch {
      /* ignore corrupted cache */
    }
    setMessages([]);
    setPlan([]);
  }, [threadId]);

  // Persist messages + plan whenever they change (debounced via microtask).
  useEffect(() => {
    if (!threadId) return;
    try {
      localStorage.setItem(
        THREAD_STATE_KEY(threadId),
        JSON.stringify({ messages, plan }),
      );
    } catch {
      /* quota or serialization issue — ignore */
    }
  }, [threadId, messages, plan]);

  useEffect(() => {
    onBusyChange(busy);
  }, [busy, onBusyChange]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, plan]);

  const hasDataset = !!datasetLabel;

  const send = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || busy) return;
    if (!textOverride) setInput("");

    setBusy(true);
    setPhases(EMPTY_PHASES);
    setPlan([]); // clear previous plan
    onToolsUpdate([]);
    onArtifactsUpdate([]);

    setMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      { role: "assistant", content: "", streaming: true },
    ]);
    onTitleUpdate(text);

    // Auto-bootstrap an empty session for chat-without-data so the user can
    // talk to the LLM without first uploading a CSV. The parent adopts the
    // new id via onSessionCreated; subsequent messages reuse it.
    let activeSessionId = sessionId;
    if (!activeSessionId) {
      try {
        const { session_id } = await createEmptySession();
        activeSessionId = session_id;
        onSessionCreated?.(session_id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setBusy(false);
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last && last.role === "assistant") {
            copy[copy.length - 1] = {
              ...last,
              content:
                `Couldn't start a chat session: ${msg}. ` +
                "Is the backend running on :8000?",
              streaming: false,
            };
          }
          return copy;
        });
        return;
      }
    }

    let content = "";
    const tools: ToolCall[] = [];
    const artifacts: string[] = [];
    // Map of normalized chart-title (or slugified-title) -> artifact URL.
    // Built from `chart_title:` lines in plot_* tool output so the renderer
    // can recover the real URL when the LLM emits a bare filename in markdown
    // (e.g. `[Chart](Number%20of%20Matches.png)` instead of
    // `![Chart](/artifacts/{sid}/number_of_matches.png)`).
    const chartTitleToUrl: Record<string, string> = {};

    try {
      await streamChat(activeSessionId, threadId, text, (e) => {
        if (e.type === "phase") {
          const node = e.data.node as PhaseName;
          setPhases((prev) => {
            const next = { ...prev };
            const idx = ["plan", "act", "observe", "respond"].indexOf(node);
            (["plan", "act", "observe", "respond"] as PhaseName[]).forEach(
              (p, i) => {
                if (i < idx) next[p] = "done";
                else if (i === idx) next[p] = "current";
                else next[p] = "pending";
              },
            );
            return next;
          });
        } else if (e.type === "plan") {
          setPlan(e.data.steps ?? []);
        } else if (e.type === "token") {
          content += e.data.content;
        } else if (e.type === "tool_call") {
          tools.push({ name: e.data.name, input: e.data.input });
          onToolsUpdate([...tools]);
        } else if (e.type === "tool_result") {
          const last = tools[tools.length - 1];
          if (last) last.output = e.data.output;
          let latestUrl: string | null = null;
          for (const line of (e.data.output || "").split("\n")) {
            const titleMatch = line.match(/^chart_title:\s*(.+)$/);
            if (titleMatch) {
              if (latestUrl) {
                const t = titleMatch[1].trim();
                chartTitleToUrl[normalizeChartKey(t)] = latestUrl;
                chartTitleToUrl[normalizeChartKey(slugifyTitle(t))] = latestUrl;
              }
              continue;
            }
            const m = line.match(/(\/artifacts\/[^\s)]+\.png)/);
            if (m) {
              artifacts.push(m[1]);
              latestUrl = m[1];
            }
          }
          onToolsUpdate([...tools]);
          if (artifacts.length > 0) onArtifactsUpdate([...artifacts]);
        } else if (e.type === "error") {
          setMessages((prev) => [
            ...prev,
            { role: "error", content: e.data.message },
          ]);
        }
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last && last.role === "assistant") {
            copy[copy.length - 1] = {
              ...last,
              content: prepareAssistantContent(
                content,
                artifacts,
                activeSessionId,
                chartTitleToUrl,
              ),
              streaming: true,
            };
          }
          return copy;
        });
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [...prev, { role: "error", content: msg }]);
    } finally {
      setPhases((prev) => {
        const next = { ...prev };
        (Object.keys(next) as PhaseName[]).forEach((k) => {
          if (next[k] === "current") next[k] = "done";
        });
        return next;
      });
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last && last.role === "assistant") {
          copy[copy.length - 1] = {
            ...last,
            content: prepareAssistantContent(
              content,
              artifacts,
              activeSessionId,
              chartTitleToUrl,
            ),
            streaming: false,
          };
        }
        return copy;
      });
      setBusy(false);
    }
  };

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList?.length || !onUpload) return;
    const files = Array.from(fileList).filter((f) =>
      /\.(csv|xlsx|xls)$/i.test(f.name),
    );
    if (files.length === 0) return;
    onUpload(files);
  };

  return (
    <div
      className={`chat ${dragOver ? "chat-drag" : ""}`}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setDragOver(true);
        }
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      {dragOver && (
        <div className="drop-overlay">
          <div className="drop-overlay-card">
            <PaperclipIcon size={40} className="drop-overlay-icon" />
            <div className="drop-overlay-title">Drop to upload</div>
            <div className="drop-overlay-sub">CSV, XLSX, or XLS</div>
          </div>
        </div>
      )}

      {hasDataset && (
        <div className="chat-header">
          <div className="chat-header-filename" title={datasetLabel}>
            <span className="dot" />
            {datasetLabel}
          </div>
        </div>
      )}

      <div className="messages" ref={scrollRef}>
        {/* Welcome card only when this thread is truly empty — never on a
            thread that already has prior messages in localStorage. Showing
            it for an existing thread is confusing ("why are you asking me
            to upload? I already did"). */}
        {!hasDataset && messages.length === 0 && (
          <WelcomeEmpty
            onPickFiles={() => fileInputRef.current?.click()}
            uploading={!!uploading}
            onPickSuggestion={(q) => send(q)}
          />
        )}
        {overview && overview.length > 0 && (
          <OverviewMessage
            overviews={overview}
            crossDatasetJoins={crossDatasetJoins}
            suggestedQuestions={suggestedQuestions}
            onAsk={(q) => send(q)}
          />
        )}
        {plan.length > 0 && (
          <PlanMessage
            plan={plan}
            toolResultsCount={0}
            busy={busy && phases.act === "current"}
          />
        )}
        {busy && plan.length === 0 && <PlanViewer phases={phases} tools={[]} busy={busy} />}
        {messages.map((m, i) => (
          <MessageBubble key={i} msg={m} onChartClick={onChartClick} />
        ))}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        multiple
        style={{ display: "none" }}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <div className="input-bar">
        <button
          className="input-attach"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy || uploading}
          title="Upload CSV or Excel"
          aria-label="Upload file"
        >
          {uploading ? <span className="btn-spinner" /> : <PaperclipIcon size={20} />}
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={
            busy
              ? "Agent is working…"
              : hasDataset
                ? `Ask anything about ${datasetLabel}…`
                : "Ask anything — or upload a CSV to analyze data…"
          }
          disabled={busy}
        />
        <button
          className="input-send"
          onClick={() => send()}
          disabled={busy || !input.trim()}
          aria-label="Send message"
        >
          {busy ? <span className="btn-spinner" /> : <SendArrowIcon size={16} />}
        </button>
      </div>
    </div>
  );
}

function prepareAssistantContent(
  raw: string,
  artifacts: string[] = [],
  sessionId?: string | null,
  chartTitleToUrl: Record<string, string> = {},
): string {
  if (!raw) return raw;

  // 0) Defense in depth: rewrite any /artifacts/<sid>/... URLs in the LLM's
  //    raw text to use the current session_id. The LLM sometimes hallucinates
  //    a session id; if we don't rewrite, the image 404s and the user thinks
  //    nothing was saved. Only fires if the URL's session id differs from
  //    ours, so we never silently corrupt a real cross-session reference.
  if (sessionId) {
    let s0 = raw.replace(
      /\/artifacts\/([A-Za-z0-9_-]+)\//g,
      (match, sid) => (sid === sessionId ? match : `/artifacts/${sessionId}/`),
    );
    if (s0 !== raw) {
      // Rewrite succeeded — continue with the rewritten text.
      raw = s0;
    }
  }

  // 1) Strip a leading raw-JSON plan block, e.g. {"plan": [...]} — the user
  //    already sees the plan in the dedicated card above the message.
  let s = raw.replace(
    /^\s*\{\s*"plan"\s*:\s*\[[\s\S]*?\}\s*/i,
    "",
  ).trimStart();

  // 2) Strip any lone top-level JSON object/array on its own first line
  //    (defensive — catches `{"foo": ...}` that the LLM might echo).
  s = s.replace(/^\s*[\{\[][\s\S]*?[\}\]]\s*/m, (m) =>
    // only strip if the match looks like a JSON block (no markdown preamble)
    /^\s*[\{\[]\s*"/.test(m) || /^\s*[\{\[]\s*'/.test(m) ? "" : m,
  );

  // 3) Ensure every /artifacts/*.png URL is wrapped in markdown image syntax
  //    so formatInline's chart replacement fires — even if the LLM wrote a
  //    bare URL or a stray <img> tag that got escaped.
  s = s.replace(
    /(?<!\]\()(?<!\!\[)(?<!src=["'])(?<!href=["'])(\/artifacts\/[^\s)<>]+\.png)/g,
    (_m, url) => `![chart](${url})`,
  );

  // 4) Map filename references back to full URLs. The LLM often writes things
  //    like "See: output_vs_sajid.png" or "[link](chart.png)" without the
  //    /artifacts/<sid>/ prefix. Walk the artifacts list and replace any
  //    filename mention with the full URL inside a markdown image so the
  //    chart actually renders.
  for (const url of artifacts) {
    const filename = url.split("/").pop();
    if (!filename || filename.length < 4) continue;
    const escaped = filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Match the filename as a standalone token, not part of a larger path
    // or word. Require non-word chars (or start of string) before, and
    // non-word chars (or end) after.
    const regex = new RegExp(
      `(^|[^\\w/])${escaped}(?=$|[^\\w])`,
      "g",
    );
    s = s.replace(regex, (match, prefix) => `${prefix}![chart](${url})`);
  }

  // 5) Resolve any markdown images whose caption matches a known chart title,
  //    or whose URL's filename slugifies to a known slug — including URLs
  //    that already start with /artifacts/. The LLM frequently writes e.g.
  //      ![Toss Decision: Bat vs Field](Toss%20Decision_%20Bat%20vs%20Field.png)
  //    or ![Number of Matches Per Season](/artifacts/<sid>/Number%20of%20Matches.png)
  //    — wrong filename or wrong filename even after the sid is fixed. The
  //    real file on disk is /artifacts/<sid>/<slugified_title>.png. Use the
  //    title -> URL map (populated from plot_* tool output's chart_title:
  //    line) to redirect every such broken image to the real URL.
  if (Object.keys(chartTitleToUrl).length > 0 || artifacts.length > 0) {
    s = s.replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      (match, caption, fileUrl) => {
        const decoded = safeDecode(fileUrl).replace(/[?#].*$/, "");
        // Filename-slug match (Title-Cased -> slugified).
        const fileSlug = slugifyTitle(decoded.replace(/\.png$/i, ""));
        if (fileSlug && chartTitleToUrl[fileSlug]) {
          return `![${caption}](${chartTitleToUrl[fileSlug]})`;
        }
        // Caption-title match (case-insensitive, punctuation-tolerant).
        if (caption) {
          const capKey = normalizeChartKey(caption);
          if (chartTitleToUrl[capKey]) {
            return `![${caption}](${chartTitleToUrl[capKey]})`;
          }
          const capSlug = slugifyTitle(caption);
          if (chartTitleToUrl[capSlug]) {
            return `![${caption}](${chartTitleToUrl[capSlug]})`;
          }
        }
        // Last resort: slug match against any artifact URL's filename,
        // even if no title map entry was built (older backend output).
        for (const art of artifacts) {
          const artSlug = (art.split("/").pop() ?? "").replace(/\.png$/i, "");
          if (artSlug && artSlug === fileSlug) {
            return `![${caption}](${art})`;
          }
        }
        return match;
      },
    );
  }

  return s;
}

// Normalize a chart title for the lookup key: lowercase, drop punctuation,
// collapse whitespace into underscores.
function normalizeChartKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// Mirror of the backend _slugify: non-word chars -> underscores, lowercase.
function slugifyTitle(s: string): string {
  const cleaned = s.replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
  return cleaned.toLowerCase();
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function WelcomeEmpty({
  onPickFiles,
  uploading,
  onPickSuggestion,
}: {
  onPickFiles: () => void;
  uploading: boolean;
  onPickSuggestion: (q: string) => void;
}) {
  const suggestions = [
    "Hi! What can you help me with?",
    "Explain what a CSV file is.",
    "Help me write a SQL query for top customers by revenue.",
  ];
  return (
    <div className="welcome-empty">
      <div className="welcome-avatar">✦</div>
      <h2 className="welcome-title">Hey! I'm your data assistant.</h2>
      <p className="welcome-sub">
        Ask me anything — I'll chat, brainstorm, draft, summarize, explain code.
        When you're ready to dig into a CSV or Excel, click the paperclip below
        and I'll switch into data-analysis mode (with plans, tools, and charts).
      </p>
      <div className="welcome-suggestions">
        {suggestions.map((q) => (
          <button
            key={q}
            type="button"
            className="welcome-chip"
            onClick={() => onPickSuggestion(q)}
          >
            {q}
          </button>
        ))}
      </div>
      <button
        className="welcome-upload-btn"
        onClick={onPickFiles}
        disabled={uploading}
      >
        {uploading ? (
          <>
            <span className="btn-spinner" /> Uploading…
          </>
        ) : (
          <>
            <PaperclipIcon size={18} />
            <span>Upload CSV or Excel</span>
          </>
        )}
      </button>
      <div className="welcome-divider">
        <span>or drop a file anywhere</span>
      </div>
    </div>
  );
}
