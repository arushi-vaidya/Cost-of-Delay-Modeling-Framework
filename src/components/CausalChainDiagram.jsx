import React from 'react';
import { causalChain } from '../utils/calculations';
import './CausalChainDiagram.css';

/**
 * Visualises the TD → CT → V → Defect → Churn → ARR causal chain
 * (paper Eq. 21) with per-edge path coefficients and the cumulative
 * product ∂ARR/∂TD = ∏ βᵢ (Eq. 22).
 */
const NODES = [
  { id: 'TD', label: 'Technical Debt', sub: 'D ∈ [0, 1]' },
  { id: 'CT', label: 'Cycle Time', sub: 'CT = CT₀ · e^(αD)' },
  { id: 'V', label: 'Feature Velocity', sub: 'V = V₀ · e^(−αD)' },
  { id: 'DEF', label: 'Defect Escape Rate', sub: 'production incidents' },
  { id: 'CH', label: 'Customer Churn', sub: 'gross MRR lost' },
  { id: 'ARR', label: 'ARR / NRR', sub: 'startup financial metric' },
];

const CausalChainDiagram = ({ coefs }) => {
  const { steps, total } = causalChain(coefs);
  const stepColor = (c) =>
    c >= 0
      ? `rgba(16, 185, 129, ${Math.min(1, 0.3 + Math.abs(c))})`
      : `rgba(231, 76, 60, ${Math.min(1, 0.3 + Math.abs(c))})`;

  return (
    <div className="chart-container">
      <h3>TD → SaaS Causal Chain (Eq. 21 – 22)</h3>
      <p className="chart-description">
        Each edge carries a path coefficient βᵢ. The total derivative
        ∂ARR/∂TD = ∏ βᵢ is the long-run elasticity of ARR with respect to
        debt.
      </p>

      <div className="causal-grid">
        {NODES.map((node, idx) => (
          <React.Fragment key={node.id}>
            <div className="causal-node">
              <div className="causal-node-label">{node.label}</div>
              <div className="causal-node-sub">{node.sub}</div>
            </div>
            {idx < NODES.length - 1 && (
              <div
                className="causal-edge"
                style={{
                  background: `linear-gradient(90deg, ${stepColor(
                    steps[idx].coef
                  )}, transparent)`,
                }}
              >
                <span className="causal-coef">
                  β{idx + 1} = {steps[idx].coef.toFixed(2)}
                </span>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="causal-total">
        <div className="causal-total-label">
          Total effect ∂ARR / ∂TD = ∏ βᵢ
        </div>
        <div
          className="causal-total-value"
          style={{ color: total < 0 ? '#F59E0B' : '#10B981' }}
        >
          {total >= 0 ? '+' : ''}
          {total.toFixed(4)}
        </div>
        <div className="causal-total-sub">
          {total < 0
            ? 'A 1-unit increase in TD reduces ARR by ' +
              Math.abs(total).toFixed(4) +
              ' units (consistent with the expected direction).'
            : 'Mediation signs do not all align — re-check coefficient directions.'}
        </div>
      </div>

      <div className="chart-insight">
        <strong>How to read it:</strong> green edges have a positive sign,
        red edges have a negative one. The product is what reaches ARR. If
        any edge is zero, the chain breaks; if signs disagree, mediation
        can be ambiguous. Use this as a falsifiability hook for the
        empirical study in Section VI.
      </div>
    </div>
  );
};

export default CausalChainDiagram;
