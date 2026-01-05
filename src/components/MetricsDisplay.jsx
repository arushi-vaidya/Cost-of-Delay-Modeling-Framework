import React from 'react';
import './MetricsDisplay.css';

const MetricsDisplay = ({ metrics, inputs }) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value, decimals = 1) => {
    return value.toFixed(decimals);
  };

  // Calculate comparison metrics
  const debtVsBurnRatio = (metrics.tdCoDI / inputs.burnRate) * 100;
  const isDebtHigherThanBurn = metrics.tdCoDI > inputs.burnRate;

  return (
    <div className="metrics-display">
      <h2>Computed Metrics</h2>
      <p className="section-description">
        Financial impact of technical debt on your startup
      </p>

      {/* Primary Metric - TD-CoDI */}
      <div className="metric-card primary">
        <div className="metric-header">
          <h3>TD-CoDI</h3>
          <span className="metric-subtitle">Technical Debt Cost-of-Delay Index</span>
        </div>
        <div className="metric-value-large">{formatCurrency(metrics.tdCoDI)}</div>
        <div className="metric-unit">per week</div>
        <div className="metric-explanation">
          This is how much revenue delay costs you weekly due to technical debt
        </div>
      </div>

      {/* Key Insight */}
      <div className={`insight-card ${isDebtHigherThanBurn ? 'warning' : 'positive'}`}>
        <div className="insight-icon">{isDebtHigherThanBurn ? '⚠️' : '✓'}</div>
        <div className="insight-content">
          <strong>
            {isDebtHigherThanBurn
              ? 'CRITICAL: Technical debt costs MORE than your burn rate'
              : 'Technical debt is below burn rate'}
          </strong>
          <p>
            TD-CoDI is {formatNumber(debtVsBurnRatio, 0)}% of your burn rate (
            {formatCurrency(metrics.tdCoDI)} vs {formatCurrency(inputs.burnRate)}/week)
          </p>
        </div>
      </div>

      {/* Grid of Secondary Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Current Cycle Time</div>
          <div className="metric-value">{formatNumber(metrics.currentCycleTime)} days</div>
          <div className="metric-delta">
            {formatNumber(((metrics.currentCycleTime / inputs.baselineCycleTime - 1) * 100), 0)}% 
            slower than baseline
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Feature Velocity</div>
          <div className="metric-value">
            {formatNumber(metrics.featureVelocity, 2)} features/week
          </div>
          <div className="metric-delta">
            Baseline: {formatNumber(7 / inputs.baselineCycleTime, 2)} features/week
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Revenue Lost (1 Week)</div>
          <div className="metric-value">{formatCurrency(metrics.revenueLost.weekly)}</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Revenue Lost (1 Month)</div>
          <div className="metric-value">{formatCurrency(metrics.revenueLost.monthly)}</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Revenue Lost (1 Quarter)</div>
          <div className="metric-value">{formatCurrency(metrics.revenueLost.quarterly)}</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Runway Erosion</div>
          <div className="metric-value">{formatNumber(metrics.runwayErosion, 2)} months</div>
          <div className="metric-delta">
            New runway: {formatNumber(metrics.adjustedRunway, 1)} months
          </div>
        </div>
      </div>

      {/* Formula Reference */}
      <div className="formula-card">
        <h4>Formula Used</h4>
        <div className="formula">
          TD-CoDI = (CT - CT₀) × (CoD/w) × n
        </div>
        <div className="formula-breakdown">
          <div>CT = {formatNumber(metrics.currentCycleTime)} days (current cycle time)</div>
          <div>CT₀ = {inputs.baselineCycleTime} days (baseline)</div>
          <div>CoD = {formatCurrency(inputs.costOfDelay)} (cost per feature)</div>
          <div>w = {formatNumber(metrics.currentCycleTime / 7, 2)} weeks per cycle</div>
          <div>n = {inputs.featuresInPipeline} features</div>
        </div>
      </div>
    </div>
  );
};

export default MetricsDisplay;
