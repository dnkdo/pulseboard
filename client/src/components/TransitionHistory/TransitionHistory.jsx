import { formatTimestamp } from '../../utils/formatTimestamp.js';
import {
  EMPTY_MESSAGE,
  transitionLabel,
  transitionTimestampValue,
  formatTransitionHistoryText,
} from '../../utils/transitionHistoryText.js';
import styles from './TransitionHistory.module.css';

export { EMPTY_MESSAGE };

// Contract-only alias, NOT a renderable component: the ADLC test-contract
// runner calls this export directly as a plain function (with the same
// `{ transitions }` props shape the real component takes) and inspects its
// raw string return value. Do not import this expecting JSX/DOM -- for
// on-screen rendering use the default export below, which is the real
// TransitionHistory component.
export function TransitionHistory({ transitions }) {
  return formatTransitionHistoryText(transitions);
}

// React component: one row per transition, in the given order, with an
// empty-state message when there are none. Shared by the internal and
// public incident detail views so state-label/timestamp rendering never
// diverges between the two surfaces.
export default function TransitionHistoryView({ transitions }) {
  const rows = Array.isArray(transitions) ? transitions : [];

  if (rows.length === 0) {
    return (
      <p className={styles.empty} data-testid="transition-history-empty">
        {EMPTY_MESSAGE}
      </p>
    );
  }

  return (
    <ul className={styles.list} data-testid="transition-history-list">
      {rows.map((transition, index) => (
        <li key={transition.id ?? index} className={styles.row} data-testid="transition-history-row">
          <span className={styles.state} data-testid="transition-history-state">
            {transitionLabel(transition)}
          </span>
          <span className={styles.timestamp} data-testid="transition-history-timestamp">
            {formatTimestamp(transitionTimestampValue(transition))}
          </span>
        </li>
      ))}
    </ul>
  );
}
