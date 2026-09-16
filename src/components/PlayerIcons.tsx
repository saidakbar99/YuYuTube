type IconProps = { className?: string };

export function PlayIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M7 4.5v15a.8.8 0 0 0 1.23.67l11.5-7.5a.8.8 0 0 0 0-1.34L8.23 3.83A.8.8 0 0 0 7 4.5Z" />
    </svg>
  );
}

export function PauseIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <rect x="5.5" y="4" width="4.5" height="16" rx="0.5" />
      <rect x="14" y="4" width="4.5" height="16" rx="0.5" />
    </svg>
  );
}

export function NextIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M5 5.4v13.2a1 1 0 0 0 1.55.83l9.2-6.6a1 1 0 0 0 0-1.66l-9.2-6.6A1 1 0 0 0 5 5.4Z" />
      <rect x="17.2" y="4.6" width="2.6" height="14.8" rx="1.3" />
    </svg>
  );
}

export function ExpandIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M4 9V4h5v2H6v3H4Zm11-5h5v5h-2V6h-3V4ZM4 15h2v3h3v2H4v-5Zm14 0h2v5h-5v-2h3v-3Z" />
    </svg>
  );
}

export function CollapseIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M9 4v3H6v2h5V4H9Zm6 0v5h5V7h-3V4h-2ZM6 15v2h3v3h2v-5H6Zm9 0v5h2v-3h3v-2h-5Z" />
    </svg>
  );
}

export function ChevronDownIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function HomeIcon({ className = "", filled = false }: IconProps & { filled?: boolean }) {
  return filled ? (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 3 3 10.5V21h6v-6h6v6h6V10.5L12 3Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round">
      <path d="M12 3.8 3.8 10.7V20.2h5.4v-6h5.6v6h5.4v-9.5L12 3.8Z" />
    </svg>
  );
}
