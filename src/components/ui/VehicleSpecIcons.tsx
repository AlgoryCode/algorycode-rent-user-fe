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

export function CalendarModelYearIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`shrink-0 ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 6V4m8 2V4M5 10h14M5 8a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V8z"
      />
    </svg>
  );
}

export function MapPinGarageIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`shrink-0 ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21s7-4.35 7-11a7 7 0 10-14 0c0 6.65 7 11 7 11z"
      />
      <circle cx="12" cy="10" r="2.25" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

export function FuelPumpIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`shrink-0 ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14 21V8a2 2 0 00-2-2H8v15M14 8h2a2 2 0 012 2v4.5a1.5 1.5 0 003 0V12M6 21h8M6 17h4"
      />
    </svg>
  );
}

export function ZapFuelElectricIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`shrink-0 ${className}`} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  );
}

export function GaugePowerIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`shrink-0 ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        d="M5 15a7 7 0 0114 0"
      />
      <path stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" d="M12 15V9l3 2" />
      <circle cx="12" cy="15" r="1.35" fill="currentColor" />
    </svg>
  );
}

export function LeafCo2Icon({ className = "" }: { className?: string }) {
  return (
    <svg className={`shrink-0 ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 20A7 7 0 0118 6c0 4-3 7-7 7-1 0-3-1-3-1s-1 2 1 4 2 4 2 4zM7 20c0-2 1-4 2-5"
      />
    </svg>
  );
}

export function CheckCircleSoftIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`shrink-0 ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.65" />
      <path
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 12l2.5 2.5L16 9"
      />
    </svg>
  );
}

export function XCircleSoftIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`shrink-0 ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.65" />
      <path stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" d="M9 9l6 6M15 9l-6 6" />
    </svg>
  );
}
