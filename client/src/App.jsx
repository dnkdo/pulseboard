import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/index.jsx';

function App() {
  return (
    <div className="flex flex-col p-4">
      <h1>Pulseboard</h1>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </div>
  );
}

export default App;
