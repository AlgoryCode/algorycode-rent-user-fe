/** Araç özet kartları için outline ikonlar (stroke, currentColor). */

export function SeatIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`shrink-0 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 5h8a2 2 0 012 2v5H6V7a2 2 0 012-2zM5 14h14a2 2 0 012 2v1a1 1 0 01-1 1H4a1 1 0 01-1-1v-1a2 2 0 012-2z"
      />
    </svg>
  );
}

export function EngineIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`shrink-0 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 11h2.5l1-2h9l1 2H20v4h-2.5V18h-11v-3H4v-4zM9 9V6h6v3M12 6V4"
      />
    </svg>
  );
}

/** Vites / şanzıman (6 ileri manuel şema). */
export function GearShiftIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`shrink-0 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M5 6.5h14M5 12h14M5 17.5h14M8 6.5v11M12 6.5v11M16 6.5v11"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="8" cy="6.5" r="1.35" fill="currentColor" />
      <path d="M18 20l2 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function LuggageIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`shrink-0 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 8V7a2 2 0 012-2h2a2 2 0 012 2v1M7 8h10a2 2 0 012 2v9a1 1 0 01-1 1H6a1 1 0 01-1-1v-9a2 2 0 012-2zM6 13h12"
      />
    </svg>
  );
}
