/**
 * TravelAid brand logo. Uses the exact artwork supplied by the client:
 *   /brand/travelaid-logo.png  full logo with wordmark and tagline
 *   /brand/travelaid-mark.png  symbol only (pin, helping hands, swoosh), airplane removed
 */
const FULL_SRC = '/brand/travelaid-logo.png';
const MARK_SRC = '/brand/travelaid-mark.png';

export function LogoMark({ size = 32 }: { size?: number }) {
  return <img className="logo__mark" src={MARK_SRC} width={size} height={size} alt="" aria-hidden="true" decoding="async" />;
}

/**
 * Full logo when `showWordmark` is true (sidebar), otherwise the symbol alone.
 * `size` sets the symbol size; the full logo scales to its container width.
 */
export function Logo({ showWordmark = true, size = 32 }: { showWordmark?: boolean; size?: number }) {
  if (!showWordmark) {
    return (
      <span className="logo">
        <LogoMark size={size} />
      </span>
    );
  }
  return (
    <span className="logo logo--full">
      <img className="logo__img" src={FULL_SRC} alt="TravelAid: Travel Safe. Always." decoding="async" />
    </span>
  );
}