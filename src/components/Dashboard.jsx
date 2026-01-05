import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Dashboard.css';
import InputPanel from './InputPanel';
import MetricsDisplay from './MetricsDisplay';
import DebtVsCycleTimeChart from './DebtVsCycleTimeChart';
import TDCoDIVsBurnRateChart from './TDCoDIVsBurnRateChart';
import FeatureDeliveryChart from './FeatureDeliveryChart';
import ScenarioComparisonChart from './ScenarioComparisonChart';
import { getDefaultInputs, calculateAllMetrics } from '../utils/calculations';

const Dashboard = () => {
  const [inputs, setInputs] = useState(getDefaultInputs());
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [cursorActive, setCursorActive] = useState(false);
  const metrics = calculateAllMetrics(inputs);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    const handleMouseOver = (e) => {
      const target = e.target;
      if (
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.classList.contains('clickable') ||
        target.classList.contains('input-slider') ||
        target.classList.contains('recharts-bar-rectangle')
      ) {
        setCursorActive(true);
      } else {
        setCursorActive(false);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseover', handleMouseOver);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, []);

  const handleInputChange = (field, value) => {
    setInputs((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <motion.div
      className="dashboard-wrapper"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      <motion.div
        className={`dashboard-cursor-glow${cursorActive ? ' active' : ''}`}
        animate={{
          x: mousePosition.x - 160,
          y: mousePosition.y - 160,
        }}
        transition={{
          type: 'spring',
          damping: 40,
          stiffness: 200,
          mass: 0.5,
        }}
      />

      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <h1>Technical Debt Cost-of-Delay Index (TD-CoDI)</h1>
            <p className="subtitle">
              Quantifying the Financial Impact of Technical Debt in Early-Stage SaaS Startups
            </p>
            <div className="badges">
              <span className="badge">Research Prototype</span>
              <span className="badge">IEEE Paper Implementation</span>
            </div>
          </div>
        </header>

        <main className="app-main">
          <aside className="sidebar">
            <InputPanel inputs={inputs} onInputChange={handleInputChange} />
          </aside>

          <section className="content">
            <MetricsDisplay metrics={metrics} inputs={inputs} />

            <div className="visualizations">
              <h2 className="section-title">Visual Analytics</h2>

              <DebtVsCycleTimeChart
                baselineCycleTime={inputs.baselineCycleTime}
                alpha={inputs.alpha}
              />

              <TDCoDIVsBurnRateChart tdCoDI={metrics.tdCoDI} burnRate={inputs.burnRate} />

              <FeatureDeliveryChart
                baselineCycleTime={inputs.baselineCycleTime}
                currentCycleTime={metrics.currentCycleTime}
                alpha={inputs.alpha}
              />

              <ScenarioComparisonChart inputs={inputs} calculateMetrics={calculateAllMetrics} />
            </div>

            <footer className="dashboard-footer">
              <h3>About This Dashboard</h3>
              <p>
                This dashboard implements the <strong>Technical Debt Cost-of-Delay Index (TD-CoDI)</strong>,
                a novel metric for quantifying the financial impact of technical debt in early-stage SaaS startups.
              </p>
              <p>
                <strong>Core Formula:</strong> TD-CoDI = (CT - CT₀) × (CoD/w) × n
              </p>
              <p>
                Where cycle time grows exponentially with debt: CT = CT₀ × e^(αD)
              </p>
              <div className="footer-meta">
                <span>🎯 Target Audience: Academic reviewers, startup founders, CTOs, investors</span>
                <span>📊 Purpose: Decision-support analytics for technical debt management</span>
                <span>⚠️ Note: This is a research prototype with mocked data</span>
              </div>
            </footer>
          </section>
        </main>
      </div>
    </motion.div>
  );
};

export default Dashboard;
