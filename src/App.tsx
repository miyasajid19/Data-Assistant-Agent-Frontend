import { useCallback, useEffect, useState } from "react";
import {
  Route,
  Routes,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { ChatHistory } from "./components/ChatHistory";
import { ChatWindow } from "./components/ChatWindow";
import { ToolsPanel } from "./components/ToolsPanel";
import { ImageLightbox, type LightboxImage } from "./components/ImageLightbox";
import { Landing } from "./pages/Landing";
import {
  uploadFiles,
  addFilesToSession,
  replaceDataset,
  renameDataset,
  deleteDataset,
} from "./api";
import type {
  ChatThreadMeta,
  CrossDatasetJoin,
  DatasetInfo,
  DatasetOverview,
  ToolCall,
} from "./types";

const STORAGE_KEY = "daa-threads-v1";

function loadThreads(): ChatThreadMeta[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveThreads(s: ChatThreadMeta[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function newThreadId(): string {
  // crypto.randomUUID is available in all modern browsers.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `t-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function ChatRoute() {
  // URL: /chat (no thread yet)  →  /chat/:threadId (once a query fires or a thread is opened)
  const { threadId: routeThreadId } = useParams<{ threadId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string>(routeThreadId ?? newThreadId());
  const [datasets, setDatasets] = useState<DatasetInfo[]>([]);
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(null);
  const [overview, setOverview] = useState<DatasetOverview[]>([]);
  const [crossDatasetJoins, setCrossDatasetJoins] = useState<CrossDatasetJoin[]>([]);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [threads, setThreads] = useState<ChatThreadMeta[]>(loadThreads);

  // ---- URL <-> state sync ----
  // When the route param changes (back/forward, sidebar click, paste in URL),
  // adopt it as the active thread. Clear session — the restoration effect
  // below will re-fetch if we have a matching thread in localStorage.
  useEffect(() => {
    if (routeThreadId && routeThreadId !== threadId) {
      setThreadId(routeThreadId);
      setSessionId(null);
      setTools([]);
      setArtifacts([]);
      setActiveDatasetId(null);
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeThreadId]);

  // Restore the backend session when a thread is loaded by URL (deep link /
  // reload). Looks up the thread metadata in localStorage, pings the
  // backend to confirm the session is still alive, and — if the session
  // has been lost (e.g. backend restart, since sessions are in-memory) —
  // auto-creates a new session and adopts it. We deliberately do NOT
  // delete the thread: the user's local message history is still in
  // localStorage and stays visible; only the backend session needs
  // respawning so the chat is usable again.
  useEffect(() => {
    if (!routeThreadId || sessionId) return;
    const t = threads.find((x) => x.threadId === routeThreadId);
    if (!t) return;
    let cancelled = false;
    (async () => {
      // 1. Try to re-attach to the original session.
      let alive = false;
      try {
        const res = await fetch(`/sessions/${t.sessionId}`);
        if (!cancelled && res.ok) alive = true;
      } catch {
        /* network error — fall through to respawn */
      }
      if (cancelled) return;
      if (alive) {
        setSessionId(t.sessionId);
        return;
      }
      // 2. Session is gone — auto-create a new empty session and adopt it,
      //    rewriting the thread entry's sessionId so subsequent sends reuse it.
      try {
        const res = await fetch("/sessions", { method: "POST" });
        if (cancelled || !res.ok) return;
        const { session_id } = (await res.json()) as { session_id: string };
        if (cancelled) return;
        setSessionId(session_id);
        setThreads((prev) =>
          prev.map((x) =>
            x.threadId === routeThreadId ? { ...x, sessionId: session_id } : x,
          ),
        );
      } catch {
        /* ignore — the user will see "Start chat" on first send and
           ChatWindow's own auto-bootstrap will create a session then. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [routeThreadId, threads, sessionId]);

  // Lightbox state — populated by scanning the messages DOM when a chart is clicked.
  const [lightboxImages, setLightboxImages] = useState<LightboxImage[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const handleChartClick = useCallback((clickedUrl: string) => {
    // Walk the visible chat area and collect every chart-wrap. This works for
    // charts in the overview, in assistant messages, and across all rendered
    // turns — the click handler doesn't need to know about its context.
    const container = document.querySelector(".messages");
    if (!container) return;
    const wraps = container.querySelectorAll(".chart-wrap");
    const all: LightboxImage[] = [];
    wraps.forEach((wrap) => {
      const el = wrap as HTMLElement;
      const url = el.getAttribute("data-chart-url");
      if (!url) return;
      const caption = el.getAttribute("data-chart-caption") || undefined;
      // De-dupe by URL while preserving order
      if (!all.some((x) => x.url === url)) {
        all.push({ url, caption });
      }
    });
    const idx = all.findIndex((x) => x.url === clickedUrl);
    if (idx < 0) return;
    setLightboxImages(all);
    setLightboxIndex(idx);
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => setLightboxOpen(false), []);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [toolsOpen, setToolsOpen] = useState(true);
  const [tools, setTools] = useState<ToolCall[]>([]);
  const [artifacts, setArtifacts] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    saveThreads(threads);
  }, [threads]);

  const resetToUpload = useCallback(() => {
    if (sessionId) fetch(`/sessions/${sessionId}`, { method: "DELETE" }).catch(() => {});
    setSessionId(null);
    setThreadId(newThreadId());
    setDatasets([]);
    setActiveDatasetId(null);
    setOverview([]);
    setCrossDatasetJoins([]);
    setSuggestedQuestions([]);
    setTools([]);
    setArtifacts([]);
    setBusy(false);
  }, [sessionId]);

  const onUploaded = useCallback(
    async (sid: string, dsList: DatasetInfo[], overviews?: DatasetOverview[], joins?: CrossDatasetJoin[], followups?: string[]) => {
      const newTid = newThreadId();
      setSessionId(sid);
      setThreadId(newTid);
      setDatasets(dsList);
      setActiveDatasetId(dsList[0]?.id ?? null);
      setOverview(overviews ?? []);
      setCrossDatasetJoins(joins ?? []);
      setSuggestedQuestions(followups ?? []);
      setTools([]);
      setArtifacts([]);
      setBusy(false);

      const title = dsList.map((d) => d.filename).join(" + ");
      setThreads((prev) => {
        const entry: ChatThreadMeta = {
          threadId: newTid,
          sessionId: sid,
          title,
          createdAt: Date.now(),
          datasetFilename: dsList.map((d) => d.filename).join(", "),
        };
        return [entry, ...prev];
      });
    },
    [],
  );

  const handleUpload = useCallback(
    async (files: File[]) => {
      if (files.length === 0 || uploading) return;
      setUploading(true);
      try {
        const res = sessionId
          ? await addFilesToSession(sessionId, files)
          : await uploadFiles(files);
        await onUploaded(
          res.session_id,
          res.datasets,
          res.overviews ?? [],
          res.cross_dataset_joins ?? [],
          res.suggested_questions ?? [],
        );
      } catch (e) {
        console.error("Upload failed:", e);
        alert(e instanceof Error ? e.message : String(e));
      } finally {
        setUploading(false);
      }
    },
    [onUploaded, uploading, sessionId],
  );

  // ChatWindow calls this when it auto-creates a session for the first
  // chat-without-data message. Adopt the new id, register a thread entry
  // (so it appears in the sidebar), and let /chat/:id URL promotion handle
  // itself — onUserMessage will navigate after the query fires.
  const handleSessionCreated = useCallback(
    (sid: string) => {
      setSessionId(sid);
      setDatasets((prev) => (prev.length === 0 ? prev : []));
      setThreads((prev) => {
        if (prev.some((t) => t.threadId === threadId)) return prev;
        const entry: ChatThreadMeta = {
          threadId,
          sessionId: sid,
          title: "",
          createdAt: Date.now(),
          datasetFilename: "",
        };
        return [entry, ...prev];
      });
    },
    [threadId],
  );

  // ----- Dataset CRUD handlers -----
  const handleReplaceDataset = useCallback(
    async (datasetId: string, file: File) => {
      if (!sessionId) return;
      try {
        const info = await replaceDataset(sessionId, datasetId, file);
        setDatasets((prev) => prev.map((d) => (d.id === datasetId ? info : d)));
        // Reset chat-side caches that depend on the dataset.
        setOverview([]);
        setTools([]);
        setArtifacts([]);
        setCrossDatasetJoins([]);
        setSuggestedQuestions([]);
        setActiveDatasetId(datasetId);
      } catch (e) {
        alert(e instanceof Error ? e.message : String(e));
      }
    },
    [sessionId],
  );

  const handleRenameDataset = useCallback(
    async (datasetId: string, filename: string) => {
      if (!sessionId) return;
      try {
        const info = await renameDataset(sessionId, datasetId, filename);
        setDatasets((prev) => prev.map((d) => (d.id === datasetId ? info : d)));
      } catch (e) {
        alert(e instanceof Error ? e.message : String(e));
      }
    },
    [sessionId],
  );

  const handleDeleteDataset = useCallback(
    async (datasetId: string) => {
      if (!sessionId) return;
      try {
        const res = await deleteDataset(sessionId, datasetId);
        setDatasets((prev) => prev.filter((d) => d.id !== datasetId));
        setOverview([]);
        setTools([]);
        setArtifacts([]);
        setActiveDatasetId((cur) => (cur === datasetId ? null : cur));
        if (res.remaining === 0) {
          // Last dataset gone — clear chat-side artifacts and reset.
          setCrossDatasetJoins([]);
          setSuggestedQuestions([]);
        }
      } catch (e) {
        alert(e instanceof Error ? e.message : String(e));
      }
    },
    [sessionId],
  );

  const onNewChat = useCallback(() => {
    // Stay in the same session if one is active; just open a new thread.
    setThreadId(newThreadId());
    setTools([]);
    setArtifacts([]);
    setBusy(false);
    // Drop the id from the URL — we're on a fresh, un-committed thread.
    navigate("/chat");
  }, [navigate]);

  const onSelectThread = useCallback(
    async (thread: ChatThreadMeta) => {
      // Adopt the thread in state immediately so the chat shell re-renders
      // against the new threadId (which makes ChatWindow pull messages +
      // plan from localStorage right away, without waiting on the network).
      setThreadId(thread.threadId);
      setTools([]);
      setArtifacts([]);
      setActiveDatasetId(null);
      if (location.pathname !== `/chat/${thread.threadId}`) {
        navigate(`/chat/${thread.threadId}`);
      }

      // Now try to re-attach the backend session. If it's gone (backend
      // restart, sessions are in-memory), auto-create a new session and
      // rewrite the thread entry — never delete the thread, since the
      // local message history is still valuable.
      let alive = false;
      try {
        const res = await fetch(`/sessions/${thread.sessionId}`);
        if (res.ok) alive = true;
      } catch {
        /* fall through to respawn */
      }
      if (alive) {
        setSessionId(thread.sessionId);
        return;
      }
      try {
        const res = await fetch("/sessions", { method: "POST" });
        if (!res.ok) return;
        const { session_id } = (await res.json()) as { session_id: string };
        setSessionId(session_id);
        setThreads((prev) =>
          prev.map((t) =>
            t.threadId === thread.threadId ? { ...t, sessionId: session_id } : t,
          ),
        );
      } catch {
        /* ignore — ChatWindow's auto-bootstrap covers this on first send */
      }
    },
    [location.pathname, navigate],
  );

  const onDeleteThread = useCallback(
    (thread: ChatThreadMeta) => {
      try {
        localStorage.removeItem(`daa-thread-state-${thread.threadId}`);
      } catch {
        /* ignore */
      }
      setThreads((prev) => {
        const remaining = prev.filter((t) => t.threadId !== thread.threadId);
        const stillHas = remaining.some((t) => t.sessionId === thread.sessionId);
        if (!stillHas) {
          fetch(`/sessions/${thread.sessionId}`, { method: "DELETE" }).catch(() => {});
        }
        if (thread.threadId === threadId) {
          setThreadId(newThreadId());
          setTools([]);
          setArtifacts([]);
        }
        return remaining;
      });
    },
    [threadId],
  );

  const onUserMessage = useCallback(
    (text: string) => {
      if (!sessionId || !threadId) return;
      const trimmed = text.trim().slice(0, 40);
      setThreads((prev) => {
        const idx = prev.findIndex((t) => t.threadId === threadId);
        if (idx < 0) return prev;
        const copy = [...prev];
        const cur = copy[idx];
        const isDefault = cur.title === "" || cur.title === cur.datasetFilename;
        if (isDefault) copy[idx] = { ...cur, title: trimmed };
        return copy;
      });
      // First query commits the thread — promote /chat to /chat/:id.
      const target = `/chat/${threadId}`;
      if (location.pathname !== target) navigate(target);
    },
    [sessionId, threadId, location.pathname, navigate],
  );

  const datasetLabel =
    datasets.length === 0
      ? undefined
      : datasets.length === 1
        ? datasets[0].filename
        : `${datasets.length} files: ${datasets.map((d) => d.filename).join(", ")}`;

  return (
    <div
      className={`app ${historyOpen ? "" : "left-collapsed"} ${toolsOpen ? "" : "right-collapsed"}`}
    >
      <aside className="left-rail">
        <div className="left-rail-inner">
          <div className="brand">
            <span className="logo-dot" />
            <span className="brand-name">Data Assistant</span>
          </div>
          <ChatHistory
            threads={threads}
            currentThreadId={threadId}
            onSelect={onSelectThread}
            onNew={onNewChat}
            onDelete={onDeleteThread}
          />
        </div>
      </aside>

      <button
        className="rail-toggle rail-toggle-left"
        onClick={() => setHistoryOpen((v) => !v)}
        title={historyOpen ? "Hide history" : "Show history"}
        aria-label="Toggle history"
      >
        {historyOpen ? "‹" : "›"}
      </button>

      <main className="center">
        <ChatWindow
          sessionId={sessionId}
          threadId={threadId}
          datasetLabel={datasetLabel}
          overview={overview}
          crossDatasetJoins={crossDatasetJoins}
          suggestedQuestions={suggestedQuestions}
          onTitleUpdate={onUserMessage}
          onToolsUpdate={setTools}
          onArtifactsUpdate={setArtifacts}
          onBusyChange={setBusy}
          onUpload={handleUpload}
          uploading={uploading}
          onChartClick={handleChartClick}
          onSessionCreated={handleSessionCreated}
        />
      </main>

      <button
        className="rail-toggle rail-toggle-right"
        onClick={() => setToolsOpen((v) => !v)}
        title={toolsOpen ? "Hide tools" : "Show tools"}
        aria-label="Toggle tools panel"
      >
        {toolsOpen ? "›" : "‹"}
      </button>

      <aside className="right-rail">
        <ToolsPanel
          datasets={datasets}
          activeDatasetId={activeDatasetId}
          onSelectDataset={setActiveDatasetId}
          tools={tools}
          artifacts={artifacts}
          busy={busy}
          onArtifactClick={handleChartClick}
          onAddFiles={handleUpload}
          onReplaceDataset={handleReplaceDataset}
          onRenameDataset={handleRenameDataset}
          onDeleteDataset={handleDeleteDataset}
        />
      </aside>

      {lightboxOpen && lightboxImages.length > 0 && (
        <ImageLightbox
          images={lightboxImages}
          index={lightboxIndex}
          onClose={closeLightbox}
          onIndexChange={setLightboxIndex}
        />
      )}
    </div>
  );
}

// ----- Top-level router shell -----
// `/`              → Landing page (project intro + Start Chat CTA)
// `/chat`          → Chat workspace with a fresh thread (id not yet committed)
// `/chat/:threadId`→ Chat workspace for a specific thread
// `*`              → Catch-all redirect to /

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/chat" element={<ChatRoute />} />
      <Route path="/chat/:threadId" element={<ChatRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
