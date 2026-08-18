import StatusPageHeader from '../components/StatusPageHeader.jsx';
import StatusBanner from '../components/StatusBanner.jsx';
import ComponentHealthGrid from '../components/ComponentHealthGrid.jsx';
import ActiveIncidentsList from '../components/ActiveIncidentsList.jsx';
import PastIncidentsList from '../components/PastIncidentsList.jsx';

// Composes the public status page's five sections in DESIGN.md's fixed
// layout order (header -> banner -> component grid -> active incidents ->
// past incidents). Each data-driven section owns its own polling
// independently (see StatusBanner/ComponentHealthGrid/ActiveIncidentsList/
// PastIncidentsList); StatusPageHeader is static chrome. This component
// stays a thin layout shell with no data-fetching logic of its own.
export default function StatusPage() {
  return (
    <main>
      <StatusPageHeader />
      <section>
        <StatusBanner />
      </section>
      <section>
        <h2>Component Status</h2>
        <ComponentHealthGrid />
      </section>
      <section>
        <h2>Active Incidents</h2>
        <ActiveIncidentsList />
      </section>
      <section>
        <h3>Past Incidents</h3>
        <PastIncidentsList />
      </section>
    </main>
  );
}
