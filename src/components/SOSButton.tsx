import { Link } from 'react-router-dom';
import { EMERGENCY_NUMBER, telLink } from '../services/links';

/**
 * Always available. Pure links: no JavaScript, auth, maps or network needed to call 112.
 * - Header (`compact`): just "SOS".
 * - Home: "SOS" with a small "Emergency Centre" line beneath, plus a separate Call 112 link.
 */
export function SOSButton({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`sos ${compact ? 'sos--compact' : ''}`}>
      <Link to="/emergency" className="sos__main" aria-label="SOS: open the Emergency Centre">
        <span className="sos__label">SOS</span>
        {!compact && <span className="sos__sub">Emergency Centre</span>}
      </Link>
      {!compact && (
        <a className="sos__call" href={telLink(EMERGENCY_NUMBER)}>
          Call {EMERGENCY_NUMBER}
        </a>
      )}
    </div>
  );
}