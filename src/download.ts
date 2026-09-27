// Shared helpers for client-side image handling.

/**
 * Download a file by fetching it as a blob and triggering a save dialog.
 *
 * Works regardless of the server's Content-Disposition header — we use the
 * fetched bytes directly, so it never opens a new tab.
 */
export async function downloadFile(
  url: string,
  filename?: string,
): Promise<void> {
  try {
    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download =
      filename || url.split("/").pop() || "download";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revoke after a tick so the browser has time to start the download.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch (err) {
    console.error("Download failed:", err);
    // Fall back to opening the URL in the same tab (no new tab)
    window.location.href = url;
  }
}

/** Extract a sensible filename from a /artifacts/<sid>/<slug>.png URL. */
export function filenameFromUrl(url: string): string {
  try {
    const parts = new URL(url, window.location.href).pathname.split("/");
    return parts[parts.length - 1] || "image.png";
  } catch {
    return url.split("/").pop() || "image.png";
  }
}
