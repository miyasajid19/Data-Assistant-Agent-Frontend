# Data Assistant Agent — Frontend

Vite + React 18 + TypeScript chat UI for the Data Assistant Agent.

## Stack

- React 18, TypeScript 5
- Vite 5 dev server + build
- react-router-dom for `/` and `/chat/:threadId`
- Plain CSS (no UI framework)
- SSE streaming via native `fetch` + `ReadableStream`

## Layout

```
frontend/
├── index.html
├── vite.config.ts             # /artifacts and /api proxies for dev
├── package.json
└── src/
    ├── main.tsx               # BrowserRouter root
    ├── App.tsx                # Routes: / and /chat/:threadId
    ├── api.ts                 # Backend client (SSE chat, file CRUD)
    ├── types.ts               # Shared TS types matching backend SSE events
    ├── styles.css             # Single stylesheet
    ├── components/
    │   ├── ChatWindow.tsx     # Center pane — messages + input bar + plan pin
    │   ├── ChatHistory.tsx    # Left rail — past sessions (localStorage)
    │   ├── ToolsPanel.tsx     # Right rail — per-dataset tabs, schema, tool cards
    │   ├── MessageBubble.tsx
    │   ├── PlanMessage.tsx    # Plan card inside a chat message
    │   ├── PlanViewer.tsx     # Standalone plan display
    │   ├── OverviewMessage.tsx # Auto-EDA summary card
    │   ├── DatasetPreview.tsx
    │   ├── FileUploader.tsx   # Paperclip + drag-drop
    │   ├── ImageLightbox.tsx  # Click-to-zoom for charts
    │   ├── markdown.tsx       # Block parser (headings, tables, images)
    │   └── icons.tsx
    └── pages/
        └── Landing.tsx        # Marketing page at `/`
```

## Run

```bash
npm install
npm run dev          # http://localhost:5173, proxies /api and /artifacts to :8000
```

For production:

```bash
npm run build        # type-check + bundle into dist/
npm run preview      # serve the built bundle
```

## Routes

- `/` — Landing page with feature overview and "Start chat" button.
- `/chat/:threadId?` — Main app. `threadId` is stored in the URL so refreshing keeps you in the same conversation.

## SSE event handling

`src/api.ts → streamChat()` opens a `POST /chat` and reads the SSE stream. Each `event:` line maps to a typed UI update:

| Event | Where it renders |
|-------|------------------|
| `phase` | Tools panel header / activity indicator |
| `plan` | Plan card above the input bar |
| `token` | Streamed into the current assistant message bubble |
| `tool_call` | Live "calling tool X" card in the tools panel |
| `tool_result` | Tool card flips to success/error |
| `done` | Finalize the message, hide streaming cursor |
| `error` | Red error toast |

## Image rewriting

The backend's plot tools return URLs like `/artifacts/<session_id>/<slug>.png`. The LLM sometimes loses the `/artifacts/<session_id>/` prefix when echoing the URL in the final answer. `ChatWindow.tsx → prepareAssistantContent()` tracks every chart title emitted by tools and rewrites bare filenames back to the correct URL.

## Charts and downloads

Charts render as `<img>` tags with the artifact URL. Click to open the lightbox (`ImageLightbox.tsx`); right-click or the download button saves the PNG. The download helper (`download.ts`) uses a `Blob` to avoid opening a new tab.

## Development

```bash
npm run typecheck    # tsc --noEmit
npm run build        # full check + production bundle
```