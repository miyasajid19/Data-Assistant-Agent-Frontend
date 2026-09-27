import type { DatasetInfo } from "../types";

export function DatasetPreview({
  dataset,
  onReset,
}: {
  dataset: DatasetInfo;
  onReset: () => void;
}) {
  return (
    <div className="dataset-preview">
      <div className="dataset-header">
        <div>
          <div className="dataset-id">{dataset.id}</div>
          <div className="dataset-filename" title={dataset.filename}>
            {dataset.filename}
          </div>
        </div>
        <button className="reset-btn" onClick={onReset}>
          Reset
        </button>
      </div>
      <div className="dataset-meta">
        <span>{dataset.rows.toLocaleString()} rows</span>
        <span>{dataset.columns.length} columns</span>
        <span>{dataset.memory_mb} MB</span>
      </div>
      <h3>Schema</h3>
      <ul className="columns">
        {dataset.columns.map((c) => (
          <li key={c}>
            <span className="col-name">{c}</span>
            <span className="col-type">{dataset.dtypes[c] ?? ""}</span>
          </li>
        ))}
      </ul>
      <h3>Preview (first 5 rows)</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {dataset.columns.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataset.preview.map((row, i) => (
              <tr key={i}>
                {dataset.columns.map((c) => (
                  <td key={c} title={String(row[c] ?? "")}>
                    {String(row[c] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
