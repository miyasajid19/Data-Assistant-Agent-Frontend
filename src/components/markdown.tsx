// Lightweight markdown renderer for the agent's chat output.
// Handles: headings (##, ###), fenced code, tables (GFM), bullet/ordered lists,
// paragraphs, **bold**, *italic*, `inline code`, [text](url), and /artifacts/*.png
// images (rendered as charts with a download button).

export type Block =
  | { kind: "heading"; level: 2 | 3; text: string }
  | { kind: "code"; lang?: string; content: string }
  | { kind: "table"; headers: string[]; rows: string[][] }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "paragraph"; text: string }
  | { kind: "hr" };

const HEADING_RE = /^(#{2,3})\s+(.*)$/;
const CODE_FENCE_RE = /^```([^\n]*)$/;
const UL_ITEM_RE = /^\s*[-*+]\s+(.*)$/;
const OL_ITEM_RE = /^\s*\d+\.\s+(.*)$/;
const TABLE_SEP_RE = /^\s*\|?\s*:?[-]{3,}:?\s*(\|\s*:?[-]{3,}:?\s*)+\|?\s*$/;

export function parseBlocks(text: string): Block[] {
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Skip blank lines between blocks
    if (line.trim() === "") { i++; continue; }

    // Horizontal rule
    if (/^\s*---+\s*$/.test(line)) {
      blocks.push({ kind: "hr" });
      i++;
      continue;
    }

    // Fenced code block
    const fence = line.match(CODE_FENCE_RE);
    if (fence) {
      const lang = fence[1].trim();
      const body: string[] = [];
      i++;
      while (i < lines.length && !CODE_FENCE_RE.test(lines[i])) {
        body.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push({ kind: "code", lang, content: body.join("\n") });
      continue;
    }

    // Heading
    const h = line.match(HEADING_RE);
    if (h) {
      const level = h[1].length as 2 | 3;
      blocks.push({ kind: "heading", level, text: h[2] });
      i++;
      continue;
    }

    // Table — header line containing |, followed by separator line
    if (line.includes("|") && i + 1 < lines.length && TABLE_SEP_RE.test(lines[i + 1] ?? "")) {
      const headers = parseTableRow(line);
      i += 2; // skip header + separator
      const rows: string[][] = [];
      while (
        i < lines.length &&
        lines[i].trim() !== "" &&
        lines[i].includes("|")
      ) {
        rows.push(parseTableRow(lines[i]));
        i++;
      }
      blocks.push({ kind: "table", headers, rows });
      continue;
    }

    // Unordered list
    if (UL_ITEM_RE.test(line)) {
      const items: string[] = [];
      while (i < lines.length && UL_ITEM_RE.test(lines[i])) {
        items.push(lines[i].replace(UL_ITEM_RE, "$1"));
        i++;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }

    // Ordered list
    if (OL_ITEM_RE.test(line)) {
      const items: string[] = [];
      while (i < lines.length && OL_ITEM_RE.test(lines[i])) {
        items.push(lines[i].replace(OL_ITEM_RE, "$1"));
        i++;
      }
      blocks.push({ kind: "ol", items });
      continue;
    }

    // Paragraph — gather consecutive non-empty lines that don't start a new block
    const paraLines = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !HEADING_RE.test(lines[i]) &&
      !CODE_FENCE_RE.test(lines[i]) &&
      !UL_ITEM_RE.test(lines[i]) &&
      !OL_ITEM_RE.test(lines[i]) &&
      !TABLE_SEP_RE.test(lines[i]) &&
      !/^\s*---+\s*$/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }

    // Detect a space-aligned ASCII table (pandas' print(df) output) and
    // upgrade it to a GFM table so the user sees proper formatting.
    const asciiTable = parseAsciiTable(paraLines);
    if (asciiTable) {
      blocks.push({
        kind: "table",
        headers: asciiTable.headers,
        rows: asciiTable.rows,
      });
    } else {
      blocks.push({ kind: "paragraph", text: paraLines.join(" ") });
    }
  }
  return blocks;
}

// Detect pandas-style space-aligned tables like:
//
//   Name    Age   Sex
//   sajid   22    male
//   aisha   30    female
//
// Returns the parsed table, or null if the lines don't look tabular.
function parseAsciiTable(
  lines: string[],
): { headers: string[]; rows: string[][] } | null {
  if (lines.length < 3) return null;

  // Tokenize each line by 2+ spaces or tabs.
  const tokenized = lines.map((l) =>
    l
      .replace(/\t/g, "  ")
      .split(/\s{2,}/)
      .map((t) => t.trim())
      .filter(Boolean),
  );

  // Need at least 2 columns per line.
  if (tokenized.some((toks) => toks.length < 2)) return null;

  // All lines should have the same column count (or off-by-one if the last
  // column is wide and gets re-merged).
  const counts = new Set(tokenized.map((t) => t.length));
  if (counts.size > 2) return null;

  const target = [...counts].sort((a, b) => b - a)[0];
  const normalized = tokenized.map((toks) => {
    if (toks.length === target) return toks;
    // Merge last two columns to match target
    return [...toks.slice(0, -2), toks.slice(-2).join("  ")];
  });
  if (!normalized.every((t) => t.length === target)) return null;

  // Filter out any line that's all dashes (separator row from pandas)
  const allDashes = /^[-:\s]+$/;
  const dataLines = normalized.filter((t) => !allDashes.test(t.join(" ")));
  if (dataLines.length < 2) return null;

  return {
    headers: dataLines[0],
    rows: dataLines.slice(1),
  };
}

function parseTableRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

export function renderBlocks(blocks: Block[]): JSX.Element {
  return <>{blocks.map((b, i) => renderBlock(b, i))}</>;
}

function renderBlock(b: Block, key: number): JSX.Element {
  switch (b.kind) {
    case "heading":
      return b.level === 2 ? (
        <h2 key={key}>{b.text}</h2>
      ) : (
        <h3 key={key}>{b.text}</h3>
      );
    case "code":
      return (
        <pre key={key}>
          <code>{b.content}</code>
        </pre>
      );
    case "table":
      return (
        <div key={key} className="md-table-wrap">
          <table className="md-table">
            <thead>
              <tr>
                {b.headers.map((h, i) => (
                  <th key={i} dangerouslySetInnerHTML={{ __html: formatInline(h) }} />
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      dangerouslySetInnerHTML={{ __html: formatInline(cell) }}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "ul":
      return (
        <ul key={key} className="md-ul">
          {b.items.map((it, i) => (
            <li
              key={i}
              dangerouslySetInnerHTML={{ __html: formatInline(it) }}
            />
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={key} className="md-ol">
          {b.items.map((it, i) => (
            <li
              key={i}
              dangerouslySetInnerHTML={{ __html: formatInline(it) }}
            />
          ))}
        </ol>
      );
    case "paragraph":
      return (
        <div
          key={key}
          className="md-paragraph"
          dangerouslySetInnerHTML={{ __html: formatInline(b.text) }}
        />
      );
    case "hr":
      return <hr key={key} className="md-hr" />;
  }
}

// Inline formatting: bold, italic, code, links, chart images.
export function formatInline(text: string): string {
  let s = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Markdown image syntax: ![caption](/artifacts/...png) → chart-wrap
  s = s.replace(
    /!\[([^\]]*)\]\((\/artifacts\/[^\s)]+\.png)\)/g,
    (_, caption, url) =>
      `<span class="chart-wrap" data-chart-url="${url}" data-chart-caption="${(caption || "").replace(/"/g, "&quot;")}"><img src="${url}" alt="${caption || "chart"}" class="chart-img" /><a class="chart-download" href="${url}" download title="Download chart">⤓</a>${caption ? `<span class="chart-caption">${caption}</span>` : ""}</span>`,
  );

  // Markdown link [text](url) — render with rel=noopener for safety
  s = s.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_, label, url) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`,
  );

  // Bare /artifacts/*.png URLs (no markdown wrapper). The lookbehinds ensure
  // we don't re-match URLs that the markdown-image regex above already wrapped
  // (URLs sitting inside data-chart-url="…" / src="…" / href="…" attributes
  // would otherwise create nested chart-wraps that leak HTML into the message).
  s = s.replace(
    /(?<!\]\()(?<!\!\[)(?<!=["'])(?<!src=["'])(?<!href=["'])(?<!data-chart-url=["'])(?<!data-chart-caption=["'])(\/artifacts\/[^\s)<>]+\.png)/g,
    (_, url) =>
      `<span class="chart-wrap" data-chart-url="${url}"><img src="${url}" alt="chart" class="chart-img" /><a class="chart-download" href="${url}" download title="Download chart">⤓</a></span>`,
  );

  // Inline code first so we don't process markdown inside it
  s = s.replace(
    /`([^`]+)`/g,
    (_, code) => `<code>${code}</code>`,
  );

  // Bold then italic (must be careful with asterisks)
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>");

  return s;
}
