import { useId } from "react";

/** Canva's round mark: the teal-to-violet disc with a white C. Decorative; the button text says "Canva". */
export function CanvaLogo({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <defs>
        <linearGradient id={id} x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#00c4cc" />
          <stop offset=".55" stopColor="#5a32fa" />
          <stop offset="1" stopColor="#7d2ae8" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="12" fill={`url(#${id})`} />
      <path d="M15.6 9.1a4.4 4.4 0 1 0 0 5.8" fill="none" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" />
    </svg>
  );
}
