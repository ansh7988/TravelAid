/**
 * TravelAid brand logo: a navy location pin holding a red care cross, beside the wordmark.
 * Drawn inline so it stays crisp at any size and follows the navy theme.
 */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg className="logo__mark" width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <path
        d="M20 37.5s-12.5-10.6-12.5-21a12.5 12.5 0 0 1 25 0c0 10.4-12.5 21-12.5 21z"
        fill="#0a4595"
      />
      <circle cx="20" cy="16.5" r="8.2" fill="#fff" />
      <path d="M18.2 11.6h3.6v3.1h3.1v3.6h-3.1v3.1h-3.6v-3.1h-3.1v-3.6h3.1z" fill="#dc2626" />
    </svg>
  );
}

/**
 * Mark with the "TravelAid" wordmark when `showWordmark` is true, otherwise the mark alone.
 * `size` sets the mark size.
 */
export function Logo({ showWordmark = true, size = 36 }: { showWordmark?: boolean; size?: number }) {
  if (!showWordmark) {
    return (
      <span className="logo">
        <LogoMark size={size} />
      </span>
    );
  }
  return (
    <span className="logo logo--full" aria-label="TravelAid: Travel safe. Always." role="img">
      <LogoMark size={size} />
      <span className="logo__text" aria-hidden="true">
        <span className="logo__name">
          Travel<span className="logo__name-accent">Aid</span>
        </span>
        <span className="logo__tag">Travel safe. Always.</span>
      </span>
    </span>
  );
}
