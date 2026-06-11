import React from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import './MetricsDisplay.css';
import useAnimatedNumber from '../utils/useAnimatedNumber';

const fmt$ = (v) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(v ?? 0);

const fmtCompact$ = (v) => {
  if (!Number.isFinite(v)) return '–';
  const abs = Math.abs(v);
  if (abs >= 1e6) return `${v < 0 ? '-' : ''}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${v < 0 ? '-' : ''}$${(abs / 1e3).toFixed(1)}k`;
  return fmt$(v);
};

const fmtNum = (v, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : '–');
const fmtPct = (v, d = 0) =>
  Number.isFinite(v) ? `${(v * 100).toFixed(d)}%` : '–';

const AnimatedValue = ({ value, format }) => {
  const a = useAnimatedNumber(value);
  return <>{format(a)}</>;
};

const MetricCell = ({ label, eqRef, value, format, delta, tone, mono = true }) => (
  <motion.div
    className={`md-cell ${tone || ''}`}
    whileHover={{ y: -2 }}
    transition={{ type: 'spring', stiffness: 320, damping: 24 }}
  >
    <div className="md-cell-head">
      <span className="md-cell-label">{label}</span>
      {eqRef && <span className="md-cell-eq">{eqRef}</span>}
    </div>
    <div className={`md-cell-value ${mono ? 'mono' : ''}`}>
      <AnimatedValue value={value} format={format} />
    </div>
    {delta && <div className="md-cell-delta">{delta}</div>}
  </motion.div>
);

const MetricsDisplay = ({ metrics, inputs, npvDevelop, npvRemediate }) => {
  const debtVsBurnRatio = metrics.tdCoDI / inputs.burnRate;
  const isCritical = metrics.tdCoDI > inputs.burnRate;
  const isHigh = !isCritical && debtVsBurnRatio > 0.3;
  const chainTotal = metrics.chain.total;
  const remediate = metrics.recommendation === 'remediate';
  const npvGain = (npvRemediate ?? 0) - (npvDevelop ?? 0);

  return (
    <div className="metrics-display">
      <div className="section-header">
        <span className="section-index">01 · Snapshot</span>
        <h2 className="section-title">Live model state</h2>
        <span className="section-sub">
          Every parameter feeds these numbers in real time
        </span>
      </div>

      {/* ============ Recommendation strip ============ */}
      <div className="md-rec-row">
        <div className={`md-rec ${isCritical ? 'crit' : isHigh ? 'warn' : 'ok'}`}>
          <div className="md-rec-dot" />
          <div className="md-rec-content">
            <div className="md-rec-title">
              {isCritical
                ? 'Critical · debt drag exceeds burn'
                : isHigh
                ? 'Material · drag > 30% of burn'
                : 'Manageable · drag is small'}
            </div>
            <div className="md-rec-body">
              TD-CoDI is {fmtPct(debtVsBurnRatio)} of B₀ —{' '}
              <span className="mono">{fmt$(metrics.tdCoDI)}</span>{' '}
              vs. <span className="mono">{fmt$(inputs.burnRate)}</span>/wk
            </div>
          </div>
        </div>

        <div className={`md-rec ${remediate ? 'warn' : 'ok'}`}>
          <div className="md-rec-dot" />
          <div className="md-rec-content">
            <div className="md-rec-title">
              RADRM → {remediate ? 'REMEDIATE this week' : 'DEVELOP this week'}
            </div>
            <div className="md-rec-body">
              Threshold rule (Eq. 20):{' '}
              <code>i · D · CoD {remediate ? '>' : '≤'} C_opp · P(survive)</code>
            </div>
          </div>
        </div>
      </div>

      {/* ============ Secondary metric grid ============ */}
      <div className="md-grid">
        <MetricCell
          label="Velocity"
          eqRef="Eq. 4"
          value={metrics.velocity}
          format={(v) => `${v.toFixed(2)}`}
          delta={`baseline V₀ = ${fmtNum(metrics.baselineVelocity, 2)} feat/wk`}
        />
        <MetricCell
          label="Effective Burn"
          eqRef="Eq. 9"
          value={metrics.burn}
          format={(v) => fmtCompact$(v) + '/wk'}
          delta={`+${fmtPct(metrics.burn / metrics.burnBase - 1)} over B₀`}
        />
        <MetricCell
          label="Revenue Lost / Quarter"
          eqRef="Eq. 14"
          value={metrics.revenueLost.quarterly}
          format={fmtCompact$}
          delta={`${fmtCompact$(metrics.revenueLost.annual)} / year`}
          tone="bad"
        />
        <MetricCell
          label="Δ NPV Optimal vs Develop"
          eqRef="Eq. 13"
          value={npvGain}
          format={(v) => (v >= 0 ? '+' : '') + fmtCompact$(v)}
          delta={`survival-weighted over ${metrics.horizonWeeks} wks`}
          tone={npvGain > 0 ? 'good' : 'warn'}
        />
        <MetricCell
          label="∂ARR / ∂TD  (causal chain)"
          eqRef="Eq. 22"
          value={chainTotal}
          format={(v) => (v >= 0 ? '+' : '') + v.toFixed(3)}
          delta="product of path coefficients β₁…β₅"
          tone={chainTotal < 0 ? 'warn' : 'good'}
        />
        <MetricCell
          label="Cost of Delay / week"
          eqRef="Eq. 7"
          value={metrics.codWeekly}
          format={fmtCompact$}
          delta={`${inputs.featuresInPipeline} features × $${(inputs.costOfDelay/1000).toFixed(1)}k`}
        />
      </div>

      {/* ============ Formula card ============ */}
      <div className="md-formula">
        <div className="md-formula-head">
          <span className="md-formula-tag">Active formulas</span>
          <span className="md-formula-eq">
            Eq. 5 · {metrics.tdCoDIVariant === 'literal' ? '14 (literal)' : '14 (rate)'}
          </span>
        </div>
        <div className="md-formula-line">
          <span className="mono">CT = CT₀ · e^(αD)</span>
          <span className="md-arrow">→</span>
          {metrics.tdCoDIVariant === 'literal' ? (
            <span className="mono">TD-CoDI = (CT − CT₀) · (CoD/w) · n</span>
          ) : (
            <span className="mono">TD-CoDI = ((CT − CT₀)/CT) · CoD · n</span>
          )}
        </div>
        <div className="md-formula-vars">
          <span><span className="k">CT</span><span className="v mono">{fmtNum(metrics.currentCycleTime, 3)} wk</span></span>
          <span><span className="k">CT₀</span><span className="v mono">{fmtNum(metrics.baselineCycleTime, 3)} wk</span></span>
          <span><span className="k">α</span><span className="v mono">{inputs.alpha}</span></span>
          <span><span className="k">D</span><span className="v mono">{fmtPct(inputs.debtRatio)}</span></span>
          <span><span className="k">CoD</span><span className="v mono">{fmt$(inputs.costOfDelay)}</span></span>
          <span><span className="k">n</span><span className="v mono">{inputs.featuresInPipeline}</span></span>
          <span><span className="k">rate</span><span className="v mono">{fmtCompact$(metrics.tdCoDIRate)}/wk</span></span>
          <span><span className="k">literal</span><span className="v mono">{fmtCompact$(metrics.tdCoDILiteral)}/cycle</span></span>
        </div>
      </div>
    </div>
  );
};

export default MetricsDisplay;
