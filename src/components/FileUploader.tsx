import { useCallback, useRef, useState } from "react";
import { uploadFiles } from "../api";
import type { CrossDatasetJoin, DatasetInfo, DatasetOverview } from "../types";

export function FileUploader({
  onUploaded,
}: {
  onUploaded: (
    sessionId: string,
    datasets: DatasetInfo[],
    overviews?: DatasetOverview[],
    joins?: CrossDatasetJoin[],
  ) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files).filter((f) =>
        /\.(csv|xlsx|xls)$/i.test(f.name),
      );
      if (arr.length === 0) {
        setError("Please select CSV or Excel (.csv / .xlsx / .xls) files.");
        return;
      }
      setBusy(true);
      setError(null);
      try {
        const res = await uploadFiles(arr);
        onUploaded(
          res.session_id,
          res.datasets,
          res.overviews ?? [],
          res.cross_dataset_joins ?? [],
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [onUploaded],
  );

  return (
    <div className="uploader">
      <p className="hint-text">
        Upload one or more CSV or Excel files. The agent will profile them and
        answer natural-language questions — including cross-dataset joins.
      </p>
      <label
        className={`drop ${busy ? "busy" : ""} ${dragOver ? "drag" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) {
            handleFiles(e.dataTransfer.files);
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          multiple
          disabled={busy}
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files);
            // reset so the same files can be re-selected later
            e.target.value = "";
          }}
        />
        <span className="drop-icon">⤴</span>
        <span className="drop-label">
          {busy ? "Uploading…" : "Click or drop files here"}
        </span>
        <span className="drop-sub">.csv, .xlsx, .xls — multiple files supported</span>
      </label>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
