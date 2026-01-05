import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import './App.css';
import Landing from './components/Landing';
import Dashboard from './components/Dashboard';

function App() {
  const [showDashboard, setShowDashboard] = useState(false);

  return (
    <AnimatePresence mode="wait">
      {!showDashboard ? (
        <Landing key="landing" onEnter={() => setShowDashboard(true)} />
      ) : (
        <Dashboard key="dashboard" />
      )}
    </AnimatePresence>
  );
}

export default App;
