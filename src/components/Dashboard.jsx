import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './Dashboard.css';

import InputPanel from './InputPanel';
import MetricsDisplay from './MetricsDisplay';

import DebtVsCycleTimeChart from './DebtVsCycleTimeChart';
import TDCoDIVsBurnRateChart from './TDCoDIVsBurnRateChart';
import FeatureDeliveryChart from './FeatureDeliveryChart';
import ScenarioComparisonChart from './ScenarioComparisonChart';

import DebtDynamicsChart from './DebtDynamicsChart';
import RADRMPolicyChart from './RADRMPolicyChart';
import NPVChart from './NPVChart';
import CausalChainDiagram from './CausalChainDiagram';
import MonteCarloChart from './MonteCarloChart';
import RADRMHeatmap from './RADRMHeatmap';
import SensitivityChart from './SensitivityChart';

import {
  getDefaultInputs,
  calculateAllMetrics,
  simulateTrajectory,
  solveRADRM,
} from '../utils/calculations';
import useAnimatedNumber from '../utils/useAnimatedNumber';

// ---------------------------------------------------------------------------
// Tiny formatters used in the hero KPI bar
// ---------------------------------------------------------------------------

const fmt$ = (v, k = false) => {
  if (!Number.isFinite(v)) return '–';
  if (k) {
    const abs = Math.abs(v);
    if (abs >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `$${(v / 1e3).toFixed(1)}k`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(v);
};
const pct = (v, d = 0) => `${(v * 100).toFixed(d)}%`;

// ---------------------------------------------------------------------------
// Hero KPI cell — one animated counter
// ---------------------------------------------------------------------------

const KPI = ({ label, value, sub, subTone, hero = false, format = (v) => v }) => {
  const animated = useAnimatedNumber(value);
  return (
    <div className={`kpi-cell ${hero ? 'hero' : ''}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{format(animated)}</div>
      {sub && <div className={`kpi-sub ${subTone || ''}`}>{sub}</div>}
    </div>
  );
};

// ---------------------------------------------------------------------------

const TAB_SECTIONS = [
  { id: 'engine',      label: 'Engineering' },
  { id: 'finance',     label: 'Financial Drag' },
  { id: 'radrm',       label: 'RADRM' },
  { id: 'mc',          label: 'Monte Carlo' },
  { id: 'causal',      label: 'Causal Chain' },
  { id: 'sensitivity', label: 'Sensitivity' },
];

const Dashboard = () => {
  const [inputs, setInputs] = useState(getDefaultInputs());
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [cursorActive, setCursorActive] = useState(false);
  const [activeTab, setActiveTab] = useState('engine');

  // --- Live metrics + NPV for the "Δ NPV if Remediate" tile -----------
  const metrics = useMemo(() => calculateAllMetrics(inputs), [inputs]);

  const npvNumbers = useMemo(() => {
    const cfg = {
      horizonWeeks: inputs.horizonWeeks,
      alpha: inputs.alpha,
      beta: inputs.beta,
      i: inputs.interestRate,
      delta: inputs.newDebtRate,
      gamma: inputs.remediationRate,
      V0: 1 / inputs.baselineCycleTime,
      B0: inputs.burnRate,
      revenuePerFeature: inputs.costOfDelay,
      n: inputs.featuresInPipeline,
      cremPerWeek: inputs.cremPerWeek,
      rAnnual: inputs.discountRate,
      pivotAnnual: inputs.pivotProb,
      R0: inputs.burnRate * inputs.runway * 4.345,
      D0: inputs.debtRatio,
      ct0: inputs.baselineCycleTime,
      theta: inputs.hazardTheta ?? 0.25,
    };
    const optimal = solveRADRM(cfg);
    const dev = simulateTrajectory(cfg, 'develop', null).cumProfit;
    const opt = simulateTrajectory(cfg, 'optimal', optimal).cumProfit;
    return { npvDevelop: dev, npvRemediate: opt };
  }, [inputs]);

  const npvGain = npvNumbers.npvRemediate - npvNumbers.npvDevelop;

  // --- Cursor glow ----------------------------------------------------
  useEffect(() => {
    const handleMouseMove = (e) =>
      setMousePosition({ x: e.clientX, y: e.clientY });
    const handleMouseOver = (e) => {
      const target = e.target;
      const interactive =
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.tagName === 'INPUT' ||
        target.classList.contains('clickable');
      setCursorActive(interactive);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseover', handleMouseOver);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, []);

  const handleInputChange = (field, value) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };
  const handleReset = () => setInputs(getDefaultInputs());

  // Severity tone for the hero KPI sub-line
  const ratio = metrics.tdCoDI / inputs.burnRate;
  const heroTone =
    ratio > 1 ? 'bad' : ratio > 0.3 ? 'warn' : 'good';
  const heroSub =
    ratio > 1
      ? `${pct(ratio)} of burn — exceeds operational spend`
      : ratio > 0.3
      ? `${pct(ratio)} of burn — material drag`
      : `${pct(ratio)} of burn — under control`;

  return (
    <motion.div
      className="dashboard-wrapper"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      <motion.div
        className={`dashboard-cursor-glow${cursorActive ? ' active' : ''}`}
        animate={{ x: mousePosition.x - 180, y: mousePosition.y - 180 }}
        transition={{ type: 'spring', damping: 40, stiffness: 200, mass: 0.5 }}
      />

      <div className="app">
        {/* ============== Header ============== */}
        <motion.header
          className="app-header"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="header-content">
            <div className="eyebrow">
              <span className="dot" />
              IEEE 2026 · Research Implementation
            </div>
            <h1>
              The price of technical debt,<br />
              measured in dollars per week.
            </h1>
            <p className="subtitle">
              An interactive implementation of the <strong>TD-CoDI</strong> and
              <strong> RADRM</strong> frameworks — converting engineering
              friction into survival-aware financial signal for early-stage
              SaaS startups.
            </p>
            <div className="badges">
              <span className="badge">TD-CoDI</span>
              <span className="badge">RADRM</span>
              <span className="badge">Causal Chain</span>
              <span className="badge">Dynamic Programming</span>
            </div>
          </div>
        </motion.header>

        {/* ============== Hero KPI Bar ============== */}
        <motion.div
          className="kpi-bar"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <KPI
            hero
            label="TD-CoDI (Eq. 14)"
            value={metrics.tdCoDI}
            format={(v) => fmt$(v, true)}
            sub={heroSub}
            subTone={heroTone}
          />
          <KPI
            label="Cycle Time (Eq. 5)"
            value={metrics.currentCycleTime}
            format={(v) => `${v.toFixed(2)} wks`}
            sub={`baseline ${metrics.baselineCycleTime.toFixed(2)} wks`}
          />
          <KPI
            label="Adj. Runway"
            value={metrics.adjustedRunwayMonths}
            format={(v) => `${v.toFixed(1)} mo`}
            sub={`−${metrics.runwayErosionMonths.toFixed(1)} mo erosion`}
            subTone="warn"
          />
          <KPI
            label="Δ NPV if Remediate"
            value={npvGain}
            format={(v) => (v >= 0 ? '+' : '') + fmt$(v, true)}
            sub={`vs. always-develop over ${inputs.horizonWeeks} wks`}
            subTone={npvGain > 0 ? 'good' : 'warn'}
          />
        </motion.div>

        {/* ============== Main grid ============== */}
        <main className="app-main">
          <motion.aside
            className="sidebar"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
          >
            <InputPanel
              inputs={inputs}
              onInputChange={handleInputChange}
              onReset={handleReset}
            />
          </motion.aside>

          <motion.section
            className="content"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
          >
            {/* ---- Full numerical readout ---- */}
            <MetricsDisplay
              metrics={metrics}
              inputs={inputs}
              npvDevelop={npvNumbers.npvDevelop}
              npvRemediate={npvNumbers.npvRemediate}
            />

            {/* ---- Tab nav for visualization sections ---- */}
            <div className="section">
              <div className="section-header">
                <span className="section-index">02 · Visual Analytics</span>
                <h2 className="section-title">Explore the model</h2>
                <span className="section-sub">
                  6 lenses · scrub the sidebar parameters to update live
                </span>
              </div>
              <div className="section-tabs" role="tablist">
                {TAB_SECTIONS.map((t) => (
                  <button
                    key={t.id}
                    role="tab"
                    aria-selected={activeTab === t.id}
                    className={activeTab === t.id ? 'active' : ''}
                    onClick={() => setActiveTab(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ---- Tab content ---- */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
              >
                {activeTab === 'engine' && (
                  <>
                    <DebtVsCycleTimeChart
                      baselineCycleTime={inputs.baselineCycleTime}
                      alpha={inputs.alpha}
                    />
                    <FeatureDeliveryChart
                      baselineCycleTime={inputs.baselineCycleTime}
                      currentCycleTime={metrics.currentCycleTime}
                      alpha={inputs.alpha}
                    />
                  </>
                )}
                {activeTab === 'finance' && (
                  <>
                    <TDCoDIVsBurnRateChart
                      tdCoDI={metrics.tdCoDI}
                      burnRate={metrics.burn}
                    />
                    <ScenarioComparisonChart
                      inputs={inputs}
                      calculateMetrics={calculateAllMetrics}
                    />
                  </>
                )}
                {activeTab === 'radrm' && (
                  <>
                    <DebtDynamicsChart inputs={inputs} />
                    <RADRMPolicyChart inputs={inputs} />
                    <RADRMHeatmap inputs={inputs} />
                    <NPVChart inputs={inputs} />
                  </>
                )}
                {activeTab === 'mc' && (
                  <MonteCarloChart inputs={inputs} />
                )}
                {activeTab === 'causal' && (
                  <CausalChainDiagram coefs={inputs.causalCoefs} />
                )}
                {activeTab === 'sensitivity' && (
                  <SensitivityChart inputs={inputs} />
                )}
              </motion.div>
            </AnimatePresence>

            <footer className="dashboard-footer">
              <h3>About this implementation</h3>
              <p>
                A faithful implementation of the framework in Gupta, Vaidya,
                Anish, Hebbar &amp; Manas (2026): <em>“Quantifying the
                Financial Impact of Technical Debt in Early-Stage Software
                Startups: A Cost-of-Delay Modeling Framework.”</em>
              </p>
              <p>
                <strong>Formulas wired in:</strong> Eq. 3 (debt dynamics) ·
                Eq. 4–5 (velocity / cycle time) · Eq. 7 (CoD) · Eq. 9 (burn
                amplification) · Eq. 12–13 (NPV variants) · Eq. 14 (TD-CoDI) ·
                Eq. 16–20 (RADRM threshold &amp; DP) · Eq. 21–22 (causal
                chain).
              </p>
              <div className="footer-meta">
                <span>Engineering metric → financial signal in $/week comparable to burn.</span>
                <span>RADRM solves the dev-vs-remediate decision under VC discounting and pivot risk.</span>
                <span>Causal chain is the falsifiable target for the empirical study (Section VI).</span>
              </div>
            </footer>
          </motion.section>
        </main>
      </div>
    </motion.div>
  );
};

export default Dashboard;
