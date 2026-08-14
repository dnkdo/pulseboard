import { useEffect, useState } from 'react';
import { buildIncidentTimeline } from '../../lib/timeline.js';
import { getSeverityColor } from './severityColors.js';
import {
  timelineContainerStyle,
  timelineHeaderStyle,
  timelineRowStyle,
  severityMarkerStyle,
  timelineRowTitleStyle,
  timelineRowMetaStyle,
  timelineEmptyStyle,
} from './Timeline.styles.js';

function formatTimestamp(raw) {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }
  return date.toLocaleString();
}

// Renders the incident timeline, severity-color-coded per entry via
// getSeverityColor and chronologically ordered via buildIncidentTimeline.
//
// When `incidents` is passed, the component is purely presentational (easy
// to unit test). When omitted, it polls GET /api/incidents itself — same
// injectable-fetchImpl / explicit loading-error-state shape as Chip.jsx's
// useIncidentStatus, so real dashboard usage doesn't need a separate data
// layer wired up first.
export function Timeline({ incidents, fetchImpl = fetch }) {
  const controlled = incidents !== undefined;
  const [state, setState] = useState({
    data: controlled ? incidents : null,
    loading: !controlled,
    error: null,
  });

  useEffect(() => {
    if (controlled) {
      setState({ data: incidents, loading: false, error: null });
      return undefined;
    }

    let cancelled = false;

    async function loadIncidents() {
      try {
        const response = await fetchImpl('/api/incidents');
        if (!response.ok) {
          throw new Error(`Timeline: failed to fetch incidents (status ${response.status})`);
        }
        const body = await response.json();
        if (!cancelled) {
          setState({ data: body, loading: false, error: null });
        }
      } catch (error) {
        if (!cancelled) {
          setState((prev) => ({ ...prev, loading: false, error }));
        }
      }
    }

    loadIncidents();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlled, incidents, fetchImpl]);

  if (state.loading) {
    return (
      <div data-testid="timeline-loading" style={timelineEmptyStyle}>
        Loading timeline…
      </div>
    );
  }

  if (state.error) {
    return (
      <div data-testid="timeline-error" style={timelineEmptyStyle}>
        Unable to load incident timeline
      </div>
    );
  }

  const sorted = buildIncidentTimeline(state.data ?? []);

  if (sorted.length === 0) {
    return (
      <div data-testid="timeline-empty" style={timelineEmptyStyle}>
        No incidents to display
      </div>
    );
  }

  return (
    <div data-testid="timeline" style={timelineContainerStyle}>
      <div style={timelineHeaderStyle}>Incident Timeline</div>
      {sorted.map((incident, index) => {
        const color = getSeverityColor(incident.severity);
        const timestamp = incident.created_at ?? incident.createdAt;
        return (
          <div
            key={incident.id ?? index}
            data-testid="timeline-entry"
            data-severity={incident.severity}
            style={timelineRowStyle(index)}
          >
            <span data-testid="timeline-marker" style={severityMarkerStyle(color)} />
            <div>
              <div style={timelineRowTitleStyle}>{incident.title ?? 'Untitled incident'}</div>
              <div style={timelineRowMetaStyle}>{formatTimestamp(timestamp)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default Timeline;
