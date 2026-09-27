import { useEffect } from "react";
import { downloadFile, filenameFromUrl } from "../download";

export interface LightboxImage {
  url: string;
  caption?: string;
}

export function ImageLightbox({
  images,
  index,
  onClose,
  onIndexChange,
}: {
  images: LightboxImage[];
  index: number;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && images.length > 1) {
        onIndexChange((index - 1 + images.length) % images.length);
      } else if (e.key === "ArrowRight" && images.length > 1) {
        onIndexChange((index + 1) % images.length);
      }
    };
    document.addEventListener("keydown", handler);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = prevOverflow;
    };
  }, [index, images.length, onClose, onIndexChange]);

  if (images.length === 0) return null;
  const current = images[index] ?? images[0];
  if (!current) return null;

  const goPrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onIndexChange((index - 1 + images.length) % images.length);
  };
  const goNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onIndexChange((index + 1) % images.length);
  };

  const filename = filenameFromUrl(current.url);

  return (
    <div
      className="lightbox"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
    >
      <div className="lightbox-toolbar" onClick={(e) => e.stopPropagation()}>
        <button
          className="lightbox-btn lightbox-close"
          onClick={onClose}
          aria-label="Close"
          title="Close (Esc)"
        >
          ✕
        </button>
        <div className="lightbox-counter">
          {images.length > 1 ? `${index + 1} of ${images.length}` : ""}
        </div>
        <button
          className="lightbox-btn lightbox-download"
          onClick={(e) => {
            e.stopPropagation();
            downloadFile(current.url, filename);
          }}
          aria-label="Download"
          title="Download"
        >
          ⤓
        </button>
      </div>

      {images.length > 1 && (
        <>
          <button
            className="lightbox-nav lightbox-prev"
            onClick={goPrev}
            aria-label="Previous image"
            title="Previous (←)"
          >
            ‹
          </button>
          <button
            className="lightbox-nav lightbox-next"
            onClick={goNext}
            aria-label="Next image"
            title="Next (→)"
          >
            ›
          </button>
        </>
      )}

      <div
        className="lightbox-stage"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={current.url}
          alt={current.caption || ""}
          className="lightbox-image"
          draggable={false}
        />
      </div>

      {current.caption && (
        <div
          className="lightbox-caption"
          onClick={(e) => e.stopPropagation()}
        >
          {current.caption}
        </div>
      )}
    </div>
  );
}
