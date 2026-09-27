// Inline SVG icons used throughout the chat UI.
// Using inline SVGs (not emoji) so they stay sharp at any size and inherit
// the surrounding text color via `fill="currentColor"`.

export function PaperclipIcon({
  size = 20,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 792 792"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M544.5,99v495c0,82.021-66.479,148.5-148.5,148.5S247.5,676.021,247.5,594V148.5c0-54.673,44.327-99,99-99
        s99,44.327,99,99V594c0,27.349-22.176,49.5-49.5,49.5c-27.349,0-49.5-22.151-49.5-49.5V198H297v396c0,54.673,44.327,99,99,99
        s99-44.327,99-99V148.5C495,66.479,428.521,0,346.5,0S198,66.479,198,148.5v470.25C210.202,716.389,295.045,792,396,792
        s185.798-75.611,198-173.25V99H544.5z" />
    </svg>
  );
}

export function SendArrowIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 8L14 8M14 8L8 2M14 8L8 14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// --- Landing-page feature icons ---

export function SparkleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0l1.7 4.3L14 6l-4.3 1.7L8 12l-1.7-4.3L2 6l4.3-1.7L8 0zm5 9l.85 2.15L16 12l-2.15.85L13 15l-.85-2.15L10 12l2.15-.85L13 9zM3 11l.6 1.4L5 13l-1.4.6L3 15l-.6-1.4L1 13l1.4-.6L3 11z" />
    </svg>
  );
}

export function UploadIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4v12m0-12l-4 4m4-4l4 4M5 18h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChartIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 20V10m6 10V4m6 16v-7M2 20h20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PlanIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6h16M4 12h10M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="18" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}

export function HistoryIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ShieldIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3l8 3v5c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
