import ComponentHealthGrid from '../components/ComponentHealthGrid.jsx';
import ActiveIncidentsList from '../components/ActiveIncidentsList.jsx';

export default function StatusPage() {
  return (
    <main>
      <section>
        <h2>Component Status</h2>
        <ComponentHealthGrid />
      </section>
      <section>
        <h2>Active Incidents</h2>
        <ActiveIncidentsList />
      </section>
    </main>
  );
}
