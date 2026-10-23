/**
 * TravelAid logo: a location-pin mark with a safety dot, plus the wordmark.
 * Pure inline SVG, no image files or icon library needed.
 */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <rect width="48" height="48" rx="12" fill="#315744" />
      <path
        d="M24 10.5c-6.4 0-11.5 5-11.5 11.3 0 8 9.9 16.1 10.9 16.9.35.28.85.28 1.2 0 1-.8 10.9-8.9 10.9-16.9C35.5 15.5 30.4 10.5 24 10.5z"
        fill="#FAFAF6"
      />
      <circle cx="24" cy="21.8" r="4.4" fill="#315744" />
      <circle cx="24" cy="21.8" r="2" fill="#F3E8B2" />
    </svg>
  );
}

export function Logo({ showWordmark = true, size = 32 }: { showWordmark?: boolean; size?: number }) {
  return (
    <span className="logo">
      <LogoMark size={size} />
      {showWordmark && (
        <span className="logo__word">
          Travel<span>Aid</span>
        </span>
      )}
    </span>
  );
}