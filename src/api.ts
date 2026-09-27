// API client for the Data Assistant Agent backend.
// Vite proxies /upload, /chat, /sessions, /health, /artifacts to localhost:8000.

import type { DatasetInfo, SSEEvent, UploadResponse } from "./types";

const BASE = "";

export async function createEmptySession(): Promise<{ session_id: string }> {
  const res = await fetch(`${BASE}/sessions`, { method: "POST" });
  if (!res.ok) {
    throw new Error(
      `Create session failed: ${res.status} ${await res.text()}`,
    );
  }
  return res.json();
}

export async function uploadFiles(files: File[]): Promise<UploadResponse> {
  const form = new FormData();
  for (const f of files) form.append("files", f);
  const res = await fetch(`${BASE}/upload`, { method: "POST", body: form });
  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function addFilesToSession(
  sessionId: string,
  files: File[],
): Promise<UploadResponse> {
  const form = new FormData();
  for (const f of files) form.append("files", f);
  const res = await fetch(`${BASE}/sessions/${sessionId}/datasets`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    throw new Error(`Add files failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function replaceDataset(
  sessionId: string,
  datasetId: string,
  file: File,
): Promise<DatasetInfo> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(
    `${BASE}/sessions/${sessionId}/datasets/${datasetId}`,
    { method: "PUT", body: form },
  );
  if (!res.ok) {
    throw new Error(`Replace failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function renameDataset(
  sessionId: string,
  datasetId: string,
  filename: string,
): Promise<DatasetInfo> {
  const res = await fetch(
    `${BASE}/sessions/${sessionId}/datasets/${datasetId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename }),
    },
  );
  if (!res.ok) {
    throw new Error(`Rename failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function deleteDataset(
  sessionId: string,
  datasetId: string,
): Promise<{ deleted: string; remaining: number }> {
  const res = await fetch(
    `${BASE}/sessions/${sessionId}/datasets/${datasetId}`,
    { method: "DELETE" },
  );
  if (!res.ok) {
    throw new Error(`Delete failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function streamChat(
  sessionId: string,
  threadId: string,
  message: string,
  onEvent: (e: SSEEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, thread_id: threadId, message }),
    signal,
  });
  if (!res.ok || !res.body) {
    throw new Error(`Chat failed: ${res.status} ${await res.text()}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    // SSE frames are separated by blank lines.
    let idx: number;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const frame = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const parsed = parseSSEFrame(frame);
      if (parsed) onEvent(parsed);
    }
  }
}

function parseSSEFrame(frame: string): SSEEvent | null {
  let event = "message";
  let dataStr = "";
  for (const line of frame.split("\n")) {
    if (line.startsWith("event: ")) event = line.slice(7).trim();
    else if (line.startsWith("data: ")) dataStr += line.slice(6);
  }
  let data: unknown = {};
  if (dataStr.trim()) {
    try {
      data = JSON.parse(dataStr);
    } catch {
      data = { raw: dataStr };
    }
  }
  return { type: event, data: data } as SSEEvent;
}
