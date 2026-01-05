import React from 'react';
import './InputPanel.css';

const InputPanel = ({ inputs, onInputChange }) => {
  const handleChange = (field, value) => {
    onInputChange(field, parseFloat(value));
  };

  return (
    <div className="input-panel">
      <h2>Input Parameters</h2>
      <p className="section-description">
        Configure technical debt and business parameters for your startup
      </p>

      <div className="input-group">
        <label>
          <span className="label-text">Technical Debt Ratio (D)</span>
          <span className="tooltip">% of codebase affected by technical debt</span>
        </label>
        <div className="slider-container">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={inputs.debtRatio}
            onChange={(e) => handleChange('debtRatio', e.target.value)}
          />
          <span className="value-display">{(inputs.debtRatio * 100).toFixed(0)}%</span>
        </div>
      </div>

      <div className="input-group">
        <label>
          <span className="label-text">Baseline Cycle Time (CT₀)</span>
          <span className="tooltip">Days to complete a feature with zero debt</span>
        </label>
        <div className="input-with-unit">
          <input
            type="number"
            min="1"
            max="30"
            value={inputs.baselineCycleTime}
            onChange={(e) => handleChange('baselineCycleTime', e.target.value)}
          />
          <span className="unit">days</span>
        </div>
      </div>

      <div className="input-group">
        <label>
          <span className="label-text">Cost of Delay per Feature (CoD)</span>
          <span className="tooltip">Lost revenue per feature per week of delay</span>
        </label>
        <div className="input-with-unit">
          <span className="unit-prefix">$</span>
          <input
            type="number"
            min="1000"
            max="100000"
            step="1000"
            value={inputs.costOfDelay}
            onChange={(e) => handleChange('costOfDelay', e.target.value)}
          />
        </div>
      </div>

      <div className="input-group">
        <label>
          <span className="label-text">Features in Pipeline (n)</span>
          <span className="tooltip">Active features waiting to be delivered</span>
        </label>
        <input
          type="number"
          min="1"
          max="50"
          value={inputs.featuresInPipeline}
          onChange={(e) => handleChange('featuresInPipeline', e.target.value)}
        />
      </div>

      <div className="input-group">
        <label>
          <span className="label-text">Current Burn Rate</span>
          <span className="tooltip">Weekly operational costs</span>
        </label>
        <div className="input-with-unit">
          <span className="unit-prefix">$</span>
          <input
            type="number"
            min="1000"
            max="200000"
            step="1000"
            value={inputs.burnRate}
            onChange={(e) => handleChange('burnRate', e.target.value)}
          />
          <span className="unit">/week</span>
        </div>
      </div>

      <div className="input-group">
        <label>
          <span className="label-text">Current Runway</span>
          <span className="tooltip">Months until cash runs out at current burn rate</span>
        </label>
        <div className="input-with-unit">
          <input
            type="number"
            min="1"
            max="36"
            value={inputs.runway}
            onChange={(e) => handleChange('runway', e.target.value)}
          />
          <span className="unit">months</span>
        </div>
      </div>

      <div className="input-group">
        <label>
          <span className="label-text">Debt Sensitivity (α)</span>
          <span className="tooltip">How quickly cycle time increases with debt (typically 2-4)</span>
        </label>
        <input
          type="number"
          min="1"
          max="10"
          step="0.1"
          value={inputs.alpha}
          onChange={(e) => handleChange('alpha', e.target.value)}
        />
      </div>
    </div>
  );
};

export default InputPanel;
