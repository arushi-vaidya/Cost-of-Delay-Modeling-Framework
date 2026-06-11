import React, { useState } from 'react';
import './InputPanel.css';

/**
 * Renders one numeric / slider input row.
 */
const Field = ({
  label,
  hint,
  value,
  onChange,
  type = 'number',
  min,
  max,
  step,
  unit,
  prefix,
  format,
  display,
}) => {
  const handle = (e) => onChange(parseFloat(e.target.value));
  return (
    <div className="input-group">
      <label>
        <span className="label-text">{label}</span>
        {hint && <span className="tooltip">{hint}</span>}
      </label>
      {type === 'range' ? (
        <div className="slider-container">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handle}
          />
          <span className="value-display">
            {display
              ? display(value)
              : format
              ? format(value)
              : value}
          </span>
        </div>
      ) : (
        <div className="input-with-unit">
          {prefix && <span className="unit-prefix">{prefix}</span>}
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handle}
          />
          {unit && <span className="unit">{unit}</span>}
        </div>
      )}
    </div>
  );
};

const Section = ({ title, subtitle, defaultOpen = true, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`input-section ${open ? 'open' : 'closed'}`}>
      <button
        type="button"
        className="section-toggle"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="section-chevron">{open ? '▾' : '▸'}</span>
        <span className="section-title-text">{title}</span>
      </button>
      {subtitle && open && <p className="section-sub">{subtitle}</p>}
      {open && <div className="section-body">{children}</div>}
    </div>
  );
};

const InputPanel = ({ inputs, onInputChange, onReset }) => {
  const set = (field) => (value) => onInputChange(field, value);

  const setCoef = (idx) => (value) => {
    const next = [...inputs.causalCoefs];
    next[idx] = value;
    onInputChange('causalCoefs', next);
  };

  return (
    <div className="input-panel">
      <div className="input-panel-header">
        <h2>Model Parameters</h2>
        {onReset && (
          <button className="reset-btn" onClick={onReset} type="button">
            Reset
          </button>
        )}
      </div>
      <p className="section-description">
        Every variable from the paper, exposed. All times are in weeks.
      </p>

      {/* ----------------------------------------------------------- */}
      <Section
        title="Technical Debt Dynamics"
        subtitle="Eq. 3 – 5: growth, sensitivity and remediation"
      >
        <Field
          label="Current Debt Ratio (D)"
          hint="% of codebase carrying remediation cost"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={inputs.debtRatio}
          onChange={set('debtRatio')}
          display={(v) => `${(v * 100).toFixed(0)}%`}
        />
        <Field
          label="Debt Sensitivity (α)"
          hint="Exponent in CT = CT₀ · e^(αD). Practitioners report 2 – 4."
          type="range"
          min={0.5}
          max={6}
          step={0.1}
          value={inputs.alpha}
          onChange={set('alpha')}
          display={(v) => v.toFixed(1)}
        />
        <Field
          label="Burn Amplification (β)"
          hint="In B(t) = B₀(1 + βD). Higher β = debt makes ops costlier."
          type="range"
          min={0}
          max={2}
          step={0.05}
          value={inputs.beta}
          onChange={set('beta')}
          display={(v) => v.toFixed(2)}
        />
        <Field
          label="Debt Interest (i)"
          hint="Weekly growth on existing debt (deferred maintenance)"
          type="range"
          min={0}
          max={0.05}
          step={0.001}
          value={inputs.interestRate}
          onChange={set('interestRate')}
          display={(v) => `${(v * 100).toFixed(2)}%/wk`}
        />
        <Field
          label="New Debt per Dev Week (δ)"
          hint="Debt added per week of feature work"
          type="range"
          min={0}
          max={0.02}
          step={0.0005}
          value={inputs.newDebtRate}
          onChange={set('newDebtRate')}
          display={(v) => `${(v * 100).toFixed(2)}%`}
        />
        <Field
          label="Remediation Rate (γ)"
          hint="Debt cleared per remediation week"
          type="range"
          min={0.005}
          max={0.1}
          step={0.001}
          value={inputs.remediationRate}
          onChange={set('remediationRate')}
          display={(v) => `${(v * 100).toFixed(1)}%`}
        />
      </Section>

      {/* ----------------------------------------------------------- */}
      <Section title="Engineering Baseline" subtitle="Eq. 4: V₀ and CT₀">
        <Field
          label="Baseline Cycle Time (CT₀)"
          hint="Weeks to ship one feature with zero debt"
          min={0.1}
          max={6}
          step={0.1}
          unit="weeks"
          value={inputs.baselineCycleTime}
          onChange={set('baselineCycleTime')}
        />
        <Field
          label="Features in Pipeline (n)"
          hint="Active features whose delivery is being delayed"
          min={1}
          max={50}
          step={1}
          value={inputs.featuresInPipeline}
          onChange={set('featuresInPipeline')}
        />
      </Section>

      {/* ----------------------------------------------------------- */}
      <Section
        title="Financials"
        subtitle="Eq. 7, 9, 14: CoD, burn, opportunity cost"
      >
        <Field
          label="Cost of Delay / feature (CoD)"
          hint="Expected revenue lost per feature for one week of delay"
          prefix="$"
          min={500}
          max={50000}
          step={500}
          value={inputs.costOfDelay}
          onChange={set('costOfDelay')}
          unit="/wk"
        />
        <Field
          label="Baseline Burn (B₀)"
          hint="Weekly operational expense at zero debt"
          prefix="$"
          min={1000}
          max={200000}
          step={1000}
          value={inputs.burnRate}
          onChange={set('burnRate')}
          unit="/wk"
        />
        <Field
          label="Remediation Cost (Cᵣₑₘ)"
          hint="Weekly $ spent during remediation periods"
          prefix="$"
          min={1000}
          max={150000}
          step={1000}
          value={inputs.cremPerWeek}
          onChange={set('cremPerWeek')}
          unit="/wk"
        />
        <Field
          label="Current Runway"
          hint="Months at the current burn (sets R₀)"
          min={1}
          max={36}
          step={1}
          unit="months"
          value={inputs.runway}
          onChange={set('runway')}
        />
      </Section>

      {/* ----------------------------------------------------------- */}
      <Section
        title="Investor / Survival"
        subtitle="Eq. 13, 20: VC discount + pivot risk"
        defaultOpen={false}
      >
        <Field
          label="VC Discount Rate (r_d)"
          hint="Annual; VC range is 50 – 70%"
          type="range"
          min={0.1}
          max={0.9}
          step={0.01}
          value={inputs.discountRate}
          onChange={set('discountRate')}
          display={(v) => `${(v * 100).toFixed(0)}%/yr`}
        />
        <Field
          label="Annual Pivot Probability"
          hint="60 – 80% pre-Series A per the paper"
          type="range"
          min={0}
          max={0.95}
          step={0.01}
          value={inputs.pivotProb}
          onChange={set('pivotProb')}
          display={(v) => `${(v * 100).toFixed(0)}%`}
        />
        <Field
          label="Planning Horizon"
          hint="Weeks used by RADRM dynamic programming"
          min={12}
          max={156}
          step={1}
          unit="weeks"
          value={inputs.horizonWeeks}
          onChange={set('horizonWeeks')}
        />
      </Section>

      {/* ----------------------------------------------------------- */}
      <Section
        title="Causal Chain (Eq. 21)"
        subtitle="TD → CT → V → Defect → Churn → ARR"
        defaultOpen={false}
      >
        {[
          ['β₁ TD → Cycle Time', 0, 0, 1],
          ['β₂ CT → Velocity', 1, -1, 0],
          ['β₃ V → Defect Rate', 2, -1, 0],
          ['β₄ Defect → Churn', 3, 0, 1],
          ['β₅ Churn → NRR/ARR', 4, -1, 0],
        ].map(([label, idx, min, max]) => (
          <Field
            key={idx}
            label={label}
            type="range"
            min={min}
            max={max}
            step={0.05}
            value={inputs.causalCoefs[idx]}
            onChange={setCoef(idx)}
            display={(v) => v.toFixed(2)}
          />
        ))}
      </Section>

      {/* ----------------------------------------------------------- */}
      <Section
        title="Model Variant & Monte Carlo"
        subtitle="Eq. 14 form, Cox hazard θ, MC samples"
        defaultOpen={false}
      >
        <div className="input-group">
          <label>
            <span className="label-text">TD-CoDI form (Eq. 14)</span>
            <span className="tooltip">
              <em>rate</em>: ((CT−CT₀)/CT)·CoD·n in $/wk, comparable to burn.
              <em> literal</em>: (CT−CT₀)·(CoD/w)·n in $/pipeline-cycle.
            </span>
          </label>
          <div
            className="scenario-toggle"
            style={{ display: 'flex', width: '100%', margin: 0 }}
          >
            {['rate', 'literal'].map((v) => (
              <button
                key={v}
                type="button"
                className={inputs.tdCoDIVariant === v ? 'active' : ''}
                onClick={() => onInputChange('tdCoDIVariant', v)}
                style={{ flex: 1 }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <Field
          label="Hazard protectiveness (θ)"
          hint="Cox hazard λ = λ₀·exp(−θ·runway). Higher θ = runway is more protective."
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={inputs.hazardTheta ?? 0.25}
          onChange={set('hazardTheta')}
          display={(v) => v.toFixed(2)}
        />

        <Field
          label="Monte Carlo samples (N)"
          hint="Number of stochastic forward paths for the fan chart"
          min={50}
          max={2000}
          step={50}
          value={inputs.mcSamples ?? 500}
          onChange={set('mcSamples')}
        />
      </Section>
    </div>
  );
};

export default InputPanel;
