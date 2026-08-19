import { Routes, Route } from 'react-router-dom';
import StatusPage from '../status-page/StatusPage.jsx';
import StatCardsDashboard from '../dashboard';
import IncidentList from '../dashboard/incidentList.js';
import TimelineContainer from '../components/timeline/TimelineContainer.jsx';
import IncidentDetailPage from '../pages/IncidentDetailPage.jsx';

// Internal dashboard shell at "/" — stat cards + incident list (unchanged
// from the pre-routing App.jsx layout) plus the filterable incident timeline
// (PLB-101) that owns its own severity/date-range filter state and refetches
// GET /api/incidents server-side as filters change.
function Dashboard() {
  return (
    <>
      <StatCardsDashboard />
      <IncidentList />
      <TimelineContainer />
    </>
  );
}

// The public status page lives at its own route, "/status" (PLB-78), so it
// can be linked to and loaded directly instead of always being bundled with
// the internal dashboard. Neither route sits behind an auth guard — this
// app has no authentication layer at all yet — so "/status" is reachable
// with zero cookies/tokens by construction, not because of route-specific
// exemption logic.
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/status" element={<StatusPage />} />
      <Route path="/incidents/:incidentId" element={<IncidentDetailPage />} />
    </Routes>
  );
}
