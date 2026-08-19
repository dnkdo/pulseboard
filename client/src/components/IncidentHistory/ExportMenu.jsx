import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './ExportMenu.module.css';

const FORMAT_OPTIONS = [
  { value: 'csv', label: 'Export as CSV' },
  { value: 'json', label: 'Export as JSON' },
];

// Presentational export trigger for the incident history view (PLB-105).
// Holds only its own open/closed menu state — which format is selected,
// whether a request is in flight, and any error message are owned by the
// parent (mirrors TimelineFilterBar's lifted-state pattern) so this
// component never needs to know about fetches, blobs, or filters.
export default function ExportMenu({ onSelect, isExporting = false, error = null }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    function handleOutsideClick(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        close();
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, close]);

  const handleTriggerClick = () => setIsOpen((prev) => !prev);

  const handleTriggerKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsOpen(true);
    }
  };

  const handleContainerKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  };

  const handleSelect = (format) => {
    close();
    onSelect(format);
  };

  return (
    <div
      className={styles.exportMenu}
      data-testid="export-menu"
      ref={containerRef}
      onKeyDown={handleContainerKeyDown}
    >
      <button
        type="button"
        data-testid="export-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        disabled={isExporting}
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
        className={styles.trigger}
      >
        {isExporting ? 'Exporting…' : 'Export'}
      </button>
      {isOpen && (
        <ul role="menu" aria-label="Export format" data-testid="export-menu-list" className={styles.menu}>
          {FORMAT_OPTIONS.map((option) => (
            <li role="none" key={option.value}>
              <button
                type="button"
                role="menuitem"
                data-testid={`export-menu-option-${option.value}`}
                onClick={() => handleSelect(option.value)}
                className={styles.menuItem}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <div role="alert" data-testid="export-menu-error" className={styles.error}>
          {error}
        </div>
      )}
    </div>
  );
}
