import StatusPage from './status-page/StatusPage.jsx';
import StatCardsDashboard from './dashboard';
import IncidentList from './dashboard/incidentList.js';

function App() {
  return (
    <div className="flex flex-col p-4">
      <h1>Pulseboard</h1>
      <StatCardsDashboard />
      <IncidentList />
      <StatusPage />
    </div>
  );
}

export default App;
