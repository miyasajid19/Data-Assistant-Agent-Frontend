// Shared TypeScript types for the Data Assistant Agent frontend.

export interface DatasetInfo {
  id: string;
  filename: string;
  rows: number;
  columns: string[];
  dtypes: Record<string, string>;
  preview: Record<string, string>[];
  memory_mb: number;
}

export interface UploadResponse {
  session_id: string;
  datasets: DatasetInfo[];
  overviews?: DatasetOverview[];
  combined_summary?: string;
  cross_dataset_joins?: CrossDatasetJoin[];
  suggested_questions?: string[];
}

export interface GeneratedChart {
  title: string;
  url: string;
  kind: "histogram" | "bar" | "correlation_heatmap" | "missing_values" | "scatter";
  description: string;
}

export interface DatasetOverview {
  dataset_id: string;
  filename: string;
  shape: number[];
  numeric_columns: string[];
  categorical_columns: string[];
  datetime_columns: string[];
  null_counts: Record<string, number>;
  duplicate_rows: number;
  top_correlations: { a: string; b: string; corr: number }[];
  charts: GeneratedChart[];
  summary: string;
  potential_joins?: CrossDatasetJoin[];
}

export interface CrossDatasetJoin {
  left_dataset: string;
  left_column: string;
  right_dataset: string;
  right_column: string;
  kind: "numeric" | "categorical" | "date";
}

export type ToolCall = {
  name: string;
  input?: Record<string, unknown>;
  output?: string;
};

export type ChatMessage =
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content: string;
      tools?: ToolCall[];
      streaming?: boolean;
      name?: string;   // e.g. "plan" — set by the backend planner node
    }
  | { role: "error"; content: string };

export interface ParsedPlanStep {
  raw: string;            // original "execute_pandas(...)" string
  toolName: string | null;
  args: string | null;     // raw argument list text
}

export type SSEEvent =
  | { type: "phase"; data: { node: string } }
  | { type: "plan"; data: { steps: string[] } }
  | { type: "token"; data: { content: string } }
  | { type: "tool_call"; data: { name: string; input: Record<string, unknown> } }
  | { type: "tool_result"; data: { name: string; output: string } }
  | { type: "done"; data: Record<string, never> }
  | { type: "error"; data: { message: string } };

// Persisted chat-history entry. Each chat is a "thread" (its own message
// history) within a "session" (the dataset context). Multiple threads can
// share the same session (multiple chats on the same data).
export interface ChatThreadMeta {
  threadId: string;
  sessionId: string;
  title: string;
  createdAt: number;
  datasetFilename?: string;
}
