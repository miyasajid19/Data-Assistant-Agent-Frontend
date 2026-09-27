import type { ChatThreadMeta } from "../types";

export function ChatHistory({
  threads,
  currentThreadId,
  onSelect,
  onNew,
  onDelete,
}: {
  threads: ChatThreadMeta[];
  currentThreadId: string | null;
  onSelect: (thread: ChatThreadMeta) => void;
  onNew: () => void;
  onDelete: (thread: ChatThreadMeta) => void;
}) {
  return (
    <div className="chat-history">
      <button className="new-chat-btn" onClick={onNew}>
        <span className="plus">＋</span>
        <span>New chat</span>
      </button>
      <div className="history-section-label">Recent</div>
      <div className="history-list">
        {threads.length === 0 && (
          <div className="history-empty">
            No chats yet. Upload a CSV to begin.
          </div>
        )}
        {threads.map((t) => (
          <div
            key={t.threadId}
            className={`history-item ${t.threadId === currentThreadId ? "active" : ""}`}
          >
            <button
              className="history-main"
              onClick={() => onSelect(t)}
              title={t.title}
            >
              <span className="history-icon" aria-hidden>
                💬
              </span>
              <span className="history-title">{t.title || "New chat"}</span>
            </button>
            <button
              className="history-delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(t);
              }}
              title="Delete chat"
              aria-label="Delete chat"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
