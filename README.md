# Data Assistant Agent — Frontend

React + Vite + TypeScript chat UI for the Data Assistant Agent. Drop a CSV/Excel
into the sidebar, ask a question in plain English, and watch a streamed
**plan → act → observe → respond** loop execute real pandas code and render
real charts in real time.

Built for the **Techvruk AI Agentic Systems Contest**.

---

## 1. Problem / Task Chosen

The contest asks for an AI agentic system that demonstrates **reasoning,
planning, tool use, and execution** rather than a one-shot LLM reply.

> **Chosen task** — *Data Assistant Agent.*
> Given a **CSV / Excel dataset** and a **natural-language question**,
> autonomously **plan**, **act** with tools (pandas, plotting, file I/O),
> **observe** results, and **respond** with a coherent answer that cites
> the chart(s) it generated.

The frontend's job is to make that agent loop **legible and inspectable** for
the user:

- Streaming every phase of the loop as a typed SSE event so the user can
  watch the agent think in real time, instead of waiting for a single blob
  of text.
- Pinning the plan above the input bar so the user knows what the agent
  intends to do before it does it.
- Showing live tool-call cards in the right rail so the user can see *which*
  pandas / plotting tool was called and *what* it returned.
- Inlining the rendered chart PNGs in the assistant's reply, with
  click-to-zoom and right-click-to-download.
- Surviving page refresh — `threadId` is part of the URL (`/chat/:threadId`)
  and per-thread messages + plan are persisted to `localStorage`.

---

## 2. System Architecture & Workflow

### 2.1 Component tree

```
main.tsx
└── <BrowserRouter>
    └── App.tsx
        └── <Routes>
            ├── "/"           → Landing.tsx              (marketing page)
            ├── "/chat"       → ChatRoute                (fresh threadId on first msg)
            ├── "/chat/:tid"  → ChatRoute                (deep link; restores from localStorage)
            └── "*"           → Navigate to "/"

ChatRoute                                (the single source of truth for chat-shell state)
├── <aside className="left-rail">
│   └── ChatHistory.tsx                  (threads from localStorage; new chat; delete)
├── <button className="rail-toggle-left">
├── <main className="center">
│   └── ChatWindow.tsx
│       ├── drag-overlay                 (drag-drop CSV onto the window)
│       ├── chat-header                  (active dataset filename dot)
│       ├── .messages
│       │   ├── WelcomeEmpty             (only when no dataset + empty thread)
│       │   ├── OverviewMessage.tsx      (per-dataset auto-EDA: stats + charts + suggestions)
│       │   ├── PlanViewer.tsx           (phase bar + tool timeline while busy)
│       │   └── MessageBubble.tsx[]      (user | assistant | error | plan)
│       │       └── PlanMessage.tsx      (when msg.name === "plan")
│       ├── .plan-pin                    (PlanMessage pinned above input)
│       └── .input-bar                   (paperclip + text + send)
├── <button className="rail-toggle-right">
├── <aside className="right-rail">
│   └── ToolsPanel.tsx
│       ├── Datasets section             (tabs, rename, replace, delete, add another)
│       ├── Tool calls section           (live cards; flip to ✓ / ✗ when tool_result arrives)
│       └── Artifacts section            (thumbnail strip of generated charts)
└── ImageLightbox.tsx                    (modal zoom; Esc / arrows; download)
```

### 2.2 Data flow on a chat turn

```
 user types "Are higher discounts associated with lower profit?"
                          │
                          ▼
 ChatWindow.submit()
   └─► api.streamChat({ session_id, thread_id, message })
          └─► fetch(POST /chat, { method:"POST", body:JSON })
                └─► response.body.getReader()        ← Vite proxies to :8000
                      └─► SSE frame parser
                            ├─ phase      → ToolsPanel header / phase bar
                            ├─ plan       → pin PlanMessage above input
                            ├─ token      → append to streaming assistant bubble
                            ├─ tool_call  → push new ToolCall card
                            ├─ tool_result → last card flips + artifact URL harvested
                            ├─ done       → finalize message, hide streaming cursor
                            └─ error      → red role:"error" bubble

 On done:
   └─► ChatWindow persists messages + plan to localStorage[daa-thread-state-<threadId>]
```

### 2.3 Image rewriting heuristic

The LLM sometimes drops the `/artifacts/<session_id>/` prefix when echoing a
chart URL in its final answer. `ChatWindow.prepareAssistantContent()`
tracks every chart title emitted by the `tool_result` events and rewrites
bare filenames (`discount_vs_profit.png`) back to the correct absolute URL
(`/artifacts/<sid>/discount_vs_profit.png`). Without this, every chart in the
reply would render as a broken image.

### 2.4 State ownership

| Component | Owns | Notes |
|---|---|---|
| `App.tsx → ChatRoute` | `sessionId`, `threadId`, `datasets`, `activeDatasetId`, `overview[]`, `crossDatasetJoins[]`, `suggestedQuestions[]`, `threads[]`, `lightbox*`, `historyOpen`, `toolsOpen`, `tools[]`, `artifacts[]`, `busy`, `uploading` | Top-level shell state. |
| `ChatWindow.tsx` | `messages`, `input`, `busy`, `phases`, `dragOver`, `plan` | Per-thread; mirrored to `localStorage`. |
| `ToolsPanel.tsx` | rename prompt + delete confirm | Local UI. |
| `MessageBubble.tsx` | lightbox open/closed for inline images | Uses parent callback. |
| `localStorage["daa-threads-v1"]` | `ChatThreadMeta[]` | Survives refresh, cleared by `Delete thread`. |
| `localStorage["daa-thread-state-<threadId>"]` | `{messages, plan}` | Restored on mount. |

### 2.5 Routing & deep linking

- **`/`** — marketing landing page with hero, capabilities bento, and the 4-step loop.
- **`/chat`** — chat shell without a committed `threadId`; a fresh `crypto.randomUUID()` is minted client-side and the URL is promoted to `/chat/<threadId>` on the first user message.
- **`/chat/:threadId`** — chat shell for that thread. On mount, `GET /sessions/{sessionId}` confirms the backend still has the session; if not (backend restart), it auto-`POST /sessions` and rewrites the thread's `sessionId`.
- **`*`** — redirects to `/`.

The Vite dev server's `/chat` proxy uses a `bypass` rule so refreshing on
`/chat/<id>` returns `index.html` and lets the SPA take over, instead of
hitting the FastAPI server with an HTML-accepting GET.

### 2.6 End-to-end system diagram

```
   ┌──────────────┐   POST /upload   ┌─────────────────┐
   │  Drag-drop / │ ───────────────► │  Vite dev proxy │
   │  Paperclip   │                 │  (port 5173)    │
   └──────────────┘                 └────────┬────────┘
                                              │
                                              ▼
                                  ┌─────────────────────┐
                                  │   FastAPI backend   │
                                  │   (port 8000)       │
                                  │  /upload /chat /…   │
                                  └─────────┬───────────┘
                                            │
                                            ▼
                                  ┌─────────────────────┐
                                  │   LangGraph agent   │
                                  │   plan→act→observe  │
                                  │        →respond     │
                                  └─────────┬───────────┘
                                            │ SSE frames
                                            ▼
   ┌────────────────────────────────────────────────────┐
   │                  Browser / React UI                │
   │  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
   │  │ ChatHistory │  │  ChatWindow  │  │ ToolsPanel │  │
   │  │  (left)     │  │   (center)   │  │  (right)   │  │
   │  └─────────────┘  └──────────────┘  └────────────┘  │
   └────────────────────────────────────────────────────┘
```

---

## 3. Setup / Run Instructions

### 3.1 Prerequisites

| Requirement | Notes |
|---|---|
| **Node.js 20+** | Vite 5 requirement. |
| **Backend running** | The Vite dev server proxies `/chat`, `/upload`, `/sessions`, `/health`, `/artifacts` to `http://localhost:8000`. See `../backend/README.md`. |

### 3.2 Install & run

```bash
cd frontend
npm install
npm run dev                              # http://localhost:5173
```

Open <http://localhost:5173>, drag-drop `../data/sample_superstore.csv` into
the sidebar, and start chatting.

### 3.3 Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server (port 5173) with HMR. |
| `npm run build` | `tsc` type-check, then bundle into `dist/` for production. |
| `npm run preview` | Serve the production bundle locally. |
| `npm run typecheck` | `tsc --noEmit` — type-check only. |

### 3.4 Configuration

The frontend has **no env vars**. `src/api.ts` sets `BASE = ""` so every
request goes to the same origin (Vite proxies it to the backend).

To change the backend URL, edit `vite.config.ts`:

```ts
// vite.config.ts (excerpt)
server: {
  port: 5173,
  proxy: {
    "/chat":      { target: "http://localhost:8000", … },
    "/upload":    { target: "http://localhost:8000", … },
    "/sessions":  { target: "http://localhost:8000", … },
    "/health":    { target: "http://localhost:8000", … },
    "/artifacts": { target: "http://localhost:8000", … },
  },
},
```

Change `localhost:8000` (in both `server` and `preview` blocks) to point
elsewhere.

### 3.5 Production build

```bash
npm run build       # outputs dist/
npm run preview     # serves dist/ + same proxies
# or: any static host (nginx, Vercel, GitHub Pages, …)
```

For non-Vite hosts, build with `npm run build` and configure your reverse
proxy to forward `/api`, `/chat`, `/upload`, `/sessions`, `/artifacts` to the
backend — the SPA itself needs only the static `dist/` bundle.

---

## 4. API Client

`src/api.ts` exports seven async functions. None of them set the base URL;
they all hit the same-origin Vite proxy.

| Function | Method | Path | Used by |
|---|---|---|---|
| `createEmptySession()` | `POST` | `/sessions` | `ChatRoute` on first message without a session |
| `uploadFiles(files)` | `POST` (multipart) | `/upload` | `ChatRoute.handleUpload` |
| `addFilesToSession(sessionId, files)` | `POST` (multipart) | `/sessions/{id}/datasets` | "Add another file" |
| `replaceDataset(sessionId, dsId, file)` | `PUT` (multipart) | `/sessions/{id}/datasets/{ds}` | "Replace" action |
| `renameDataset(sessionId, dsId, filename)` | `PATCH` (JSON) | `/sessions/{id}/datasets/{ds}` | "Rename" prompt |
| `deleteDataset(sessionId, dsId)` | `DELETE` | `/sessions/{id}/datasets/{ds}` | "Delete" action |
| `streamChat({sessionId, threadId, message}, handlers)` | `POST` (SSE) | `/chat` | `ChatWindow.submit` |

### 4.1 SSE event → UI mapping

| Event | Where it renders |
|---|---|
| `phase` | `PlanViewer` phase bar (`pending` / `current` / `done`) |
| `plan` | Pinned `PlanMessage` card above the input bar |
| `token` | Appended to the in-progress assistant bubble; bubble re-renders every event |
| `tool_call` | New `ToolCall` card pushed to the right rail |
| `tool_result` | Last tool card flips to ✓ (with truncated output) and the artifact list grows |
| `done` | Streaming flag flipped off, message finalised |
| `error` | Red `role:"error"` bubble appended |

---

## 5. Project Layout

```
frontend/
├── index.html                          # Vite entry; #root + /src/main.tsx
├── vite.config.ts                      # port 5173 + dev-proxy to :8000
├── tsconfig.json / tsconfig.node.json  # strict TS, target ES2022
├── package.json                        # React 18, react-router-dom 6, Vite 5
└── src/
    ├── main.tsx                        # ReactDOM root + <BrowserRouter><App/></BrowserRouter>
    ├── App.tsx                         # <Routes> + ChatRoute (the chat shell)
    ├── api.ts                          # fetch + SSE parser (streamChat + 6 CRUD helpers)
    ├── types.ts                        # DatasetInfo, UploadResponse, ChatMessage, SSEEvent, …
    ├── download.ts                     # downloadFile(url, filename) — Blob-based save
    ├── styles.css                      # single stylesheet (Inter + JetBrains Mono)
    ├── components/
    │   ├── ChatWindow.tsx              # center pane: messages + input + plan pin + drag-drop
    │   ├── ChatHistory.tsx             # left rail: threads from localStorage
    │   ├── ToolsPanel.tsx              # right rail: datasets tabs + tool cards + artifacts
    │   ├── MessageBubble.tsx           # one chat message (user | assistant | error | plan)
    │   ├── PlanMessage.tsx             # plan card inside a message (step ✓/spinner/№)
    │   ├── PlanViewer.tsx              # standalone plan + phase bar (used while streaming)
    │   ├── OverviewMessage.tsx         # auto-EDA card: stat grid + overview charts + follow-ups
    │   ├── DatasetPreview.tsx          # standalone dataset preview card
    │   ├── FileUploader.tsx            # drop-zone (orphaned; ChatWindow has its own drag-drop)
    │   ├── ImageLightbox.tsx           # click-to-zoom modal (Esc / arrows / download)
    │   ├── markdown.tsx                # block parser + renderer + inline formatter
    │   └── icons.tsx                   # inline-SVG icons (Paperclip, Send, Sparkle, …)
    └── pages/
        └── Landing.tsx                 # marketing page at "/"
```

---

## 6. Sample Interaction

### 6.1 First-load experience (empty state)

When you open `/chat` with no uploaded dataset, you see the **WelcomeEmpty**
chip suggestions:

- *"Summarise the columns in this dataset"*
- *"Plot a histogram of any numeric column"*
- *"Find rows where a numeric column is more than 3σ from its mean"*

Drag-drop a CSV or click the paperclip to upload. On upload you'll see an
auto-EDA `OverviewMessage` with stat grids, top correlations, histograms,
missing-values bar, and follow-up question chips.

### 6.2 Question — "Total sales and profit by region, sorted by profit descending."

```
1. User types the question in the input bar and presses Enter.
2. ChatWindow calls streamChat({ session_id, thread_id, message }, handlers).
3. UI updates as the SSE frames arrive:

   ┌─ PlanViewer (phase bar) ────────────────────────────┐
   │ plan ✓ → act ● → observe ○ → respond ○             │
   └─────────────────────────────────────────────────────┘
   ┌─ ToolsPanel (right rail) ───────────────────────────┐
   │ ● profile_dataset(ds_a1b2c3)         running…      │
   └─────────────────────────────────────────────────────┘
   ┌─ PlanMessage (pinned) ──────────────────────────────┐
   │ Plan:                                              │
   │ 1. ✓ profile_dataset                               │
   │ 2. ● execute_pandas (groupby Region, sum Sales/Profit)
   │ 3. ○ format the answer                             │
   └─────────────────────────────────────────────────────┘
   ┌─ Assistant bubble (streaming) ──────────────────────┐
   │ **Sales & profit by region (sorted by profit)**    │
   │                                                     │
   │ | Region  |    Sales |   Profit |                   │
   │ |---------|---------:|---------:|                   │
   │ | West    | 78,412.55 | 9,884.10 |                  │
   │ | East    | 71,022.18 | 8,755.42 |                  │
   │ | Central | 67,580.40 | 7,991.66 |                  │
   │ | South   | 65,210.02 | 7,210.55 |                  │
   │                                                     │
   │ The West region leads on both revenue and profit…  │
   └─────────────────────────────────────────────────────┘

4. On `done`, ChatWindow persists `{messages, plan}` to
   `localStorage["daa-thread-state-<threadId>"]` and clears the streaming cursor.
5. Refreshing the page replays the same conversation from localStorage.
```

### 6.3 Question — "Are higher discounts associated with lower profit? Show me a scatter."

```
User → "Are higher discounts associated with lower profit? Show me a scatter."

Tools invoked:
  profile_dataset(ds_a1b2c3)
  execute_pandas(ds_a1b2c3, "df[['Discount','Profit']].corr()")
  plot_scatter(ds_a1b2c3, x="Discount", y="Profit", title="Discount vs Profit")

Assistant bubble renders:
  Yes — discount and profit are negatively correlated (Pearson r ≈ -0.42 in
  this sample). Orders at 0% discount average +$58 profit; orders at ≥ 50%
  discount average -$76.

  ![Discount vs Profit scatter](/artifacts/<sid>/discount_vs_profit.png)

  → Click the image: ImageLightbox opens. Esc / arrow keys to navigate.
  → Right-click the image (or the download button): save PNG via Blob download
    (no new tab opened).
```

### 6.4 Question — "Which region had the highest profit margin, and how has it changed month over month?"

```
This is a multi-step investigative question — the planner produces:

Plan:
  1. execute_pandas: groupby Region, compute profit_margin = profit/sales, sort
  2. execute_pandas: set Order Date index, resample by month, compute margin
  3. plot_bar: x=Month, y=margin
  4. respond

Tools invoked (in order):
  execute_pandas(ds_a1b2c3, "df.assign(margin=df.Profit/df.Sales).groupby('Region')['margin'].mean().sort_values(ascending=False)")
    → Region
      East      0.142
      West      0.126
      Central   0.118
      South     0.111
  execute_pandas(ds_a1b2c3, "df.assign(margin=df.Profit/df.Sales).set_index('Order Date').resample('M')['margin'].mean()")
    → (12 monthly rows)
  plot_bar(ds_a1b2c3, x=month, y=margin, title="Monthly profit margin")

Final assistant message:
  The East region leads on profit margin (~14.2%), with West a close second
  (~12.6%). Margin oscillates month-to-month but shows no strong trend in
  the 2022–2023 sample; Feb–Mar 2023 had the highest monthly margin (East-heavy mix).

  ![Monthly profit margin](/artifacts/<sid>/monthly_margin.png)
```

---

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Page loads but every request 404s | Backend not running on :8000 | `cd ../backend && python main.py serve` |
| `drag-drop` doesn't accept file | Wrong extension | The drop overlay only highlights for `.csv` / `.xlsx` / `.xls` |
| Charts in reply render as broken images | Backend `/artifacts/...` 404 — session was deleted on the server | Re-upload; `prepareAssistantContent()` rewrites URLs based on live tool results, so re-running the same question fixes them |
| Refreshing `/chat/<id>` shows 404 from backend | Backend restarted; in-memory session is gone | The app auto-creates a new session and rewrites the thread; upload files again |
| Streaming cursor stuck | SSE connection dropped mid-response | Send another message; the previous message is finalised when `done` arrives |

---

## 8. License

MIT.
