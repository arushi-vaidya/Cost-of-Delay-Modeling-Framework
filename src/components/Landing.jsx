import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import './Landing.css';

const Landing = ({ onEnter }) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll();

  const smoothMouseX = useSpring(0, { damping: 50, stiffness: 100 });
  const smoothMouseY = useSpring(0, { damping: 50, stiffness: 100 });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.92]);
  const heroBlur = useTransform(scrollYProgress, [0, 0.15], [0, 10]);
  
  const layer1Y = useTransform(scrollYProgress, [0, 1], [0, -800]);
  const layer2Y = useTransform(scrollYProgress, [0, 1], [0, -1200]);
  const layer3Y = useTransform(scrollYProgress, [0, 1], [0, -400]);
  const layer4Y = useTransform(scrollYProgress, [0, 1], [0, -600]);
  
  const gridOpacity = useTransform(scrollYProgress, [0, 0.1, 0.3], [0, 0.15, 0]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMousePosition({ x: e.clientX, y: e.clientY });
      smoothMouseX.set(x);
      smoothMouseY.set(y);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [smoothMouseX, smoothMouseY]);

  return (
    <motion.div
      className="landing-immersive"
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 1.2, ease: [0.6, 0.05, 0.01, 0.9] }}
    >
      <motion.div
        className="cursor-field"
        style={{
          x: mousePosition.x - 300,
          y: mousePosition.y - 300,
        }}
      />

      <motion.div
        className="cursor-accent"
        style={{
          x: mousePosition.x - 150,
          y: mousePosition.y - 150,
        }}
      />

      <div className="noise-overlay" />
      <motion.div className="grid-overlay" style={{ opacity: gridOpacity }} />

      <motion.div
        className="hero-canvas"
        style={{
          opacity: heroOpacity,
          scale: heroScale,
          filter: useTransform(heroBlur, (v) => `blur(${v}px)`),
        }}
      >
        <motion.div
          className="hero-text-stack"
          style={{
            x: useTransform(smoothMouseX, [-1, 1], [-30, 30]),
            y: useTransform(smoothMouseY, [-1, 1], [-30, 30]),
          }}
        >
          <motion.h1
            className="hero-word hero-word-1"
            initial={{ opacity: 0, x: -120, rotateX: -90 }}
            animate={{ opacity: 1, x: 0, rotateX: 0 }}
            transition={{ duration: 1.2, delay: 0.3, ease: [0.6, 0.05, 0.01, 0.9] }}
          >
            Technical
          </motion.h1>
          <motion.h1
            className="hero-word hero-word-2"
            initial={{ opacity: 0, x: 120, rotateX: 90 }}
            animate={{ opacity: 1, x: 0, rotateX: 0 }}
            transition={{ duration: 1.2, delay: 0.6, ease: [0.6, 0.05, 0.01, 0.9] }}
          >
            Debt
          </motion.h1>
          <motion.h1
            className="hero-word hero-word-3"
            initial={{ opacity: 0, y: 80, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.9, ease: [0.6, 0.05, 0.01, 0.9] }}
          >
            Has a Cost
          </motion.h1>
        </motion.div>

        <motion.div
          className="hero-particles"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2, delay: 1.5 }}
        >
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="particle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -20, 0],
                opacity: [0.2, 0.6, 0.2],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </motion.div>
      </motion.div>



      {/* SEAMLESS, EVENLY SPACED LAYERS */}
      <motion.div className="scroll-layers" style={{ y: layer1Y }}>
        <div className="phrase-layer phrase-layer-1">
          <motion.div
            className="phrase-container"
            style={{
              opacity: useTransform(scrollYProgress, [0.01, 0.035, 0.07], [0, 1, 0]),
              x: useTransform(scrollYProgress, [0.01, 0.07], [20, -10]),
            }}
          >
            <p className="floating-phrase">Not in code quality</p>
            <div className="phrase-line" />
          </motion.div>
        </div>
      </motion.div>

      <motion.div className="scroll-layers" style={{ y: layer2Y }}>
        <div className="phrase-layer phrase-layer-2">
          <motion.div
            className="phrase-container phrase-right"
            style={{
              opacity: useTransform(scrollYProgress, [0.06, 0.10, 0.14], [0, 1, 0]),
              x: useTransform(scrollYProgress, [0.06, 0.14], [-20, 10]),
            }}
          >
            <p className="floating-phrase">But in delayed revenue</p>
            <div className="phrase-line" />
          </motion.div>
        </div>
      </motion.div>

      <motion.div className="scroll-layers" style={{ y: layer3Y }}>
        <div className="phrase-layer phrase-layer-3">
          <motion.div
            className="phrase-container-large phrase-center"
            style={{
              opacity: useTransform(scrollYProgress, [0.12, 0.16, 0.20], [0, 1, 0]),
              scale: useTransform(scrollYProgress, [0.12, 0.16], [0.9, 1]),
            }}
          >
            <p className="floating-phrase-large">Delay compounds</p>
            <motion.div
              className="phrase-accent"
              style={{
                scaleX: useTransform(scrollYProgress, [0.12, 0.18], [0, 1]),
              }}
            />
          </motion.div>
        </div>
      </motion.div>

      <motion.div className="scroll-layers" style={{ y: layer4Y }}>
        <div className="phrase-layer phrase-layer-4">
          <motion.div
            className="philosophy-section"
            style={{
              opacity: useTransform(scrollYProgress, [0.17, 0.21, 0.25], [0, 1, 0.6]),
            }}
          >
            <motion.div
              className="philosophy-line"
              style={{
                scaleX: useTransform(scrollYProgress, [0.17, 0.23], [0, 1]),
              }}
            />
            <p className="philosophy-text">
              Early-stage teams <em>tolerate</em> technical debt.
            </p>
            <p className="philosophy-text-sub">
              Shipping fast matters more than perfect architecture.
            </p>
            <p className="philosophy-text-emphasis">
              That's <span>rational</span>.
            </p>
          </motion.div>
        </div>
      </motion.div>

      <motion.div className="scroll-layers" style={{ y: layer1Y }}>
        <div className="phrase-layer phrase-layer-5">
          <motion.div
            className="insight-block"
            style={{
              opacity: useTransform(scrollYProgress, [0.22, 0.26, 0.30], [0, 1, 0.5]),
              x: useTransform(scrollYProgress, [0.22, 0.30], [-10, 5]),
            }}
          >
            <div className="insight-number">001</div>
            <p className="insight-text">
              Every week of delay doesn't just postpone value— it <strong>erases</strong> compounding opportunity.<br/>
              Technical debt grows <strong>exponentially</strong>. Cycle time increases. Feature velocity drops.
            </p>
          </motion.div>
        </div>
      </motion.div>

      <motion.div className="scroll-layers" style={{ y: layer2Y }}>
        <div className="phrase-layer phrase-layer-6">
          <motion.div
            className="framework-reveal"
            style={{
              opacity: useTransform(scrollYProgress, [0.27, 0.32, 0.37], [0, 1, 0.7]),
              scale: useTransform(scrollYProgress, [0.27, 0.32], [0.9, 1]),
            }}
          >
            <div className="framework-label">The Framework</div>
            <h2 className="framework-title">TD-CoDI</h2>
            <p className="framework-subtitle">Technical Debt Cost-of-Delay Index</p>
            <motion.div
              className="framework-line"
              style={{
                scaleX: useTransform(scrollYProgress, [0.28, 0.36], [0, 1]),
              }}
            />
            <p className="framework-description">
              A quantitative model that converts engineering inefficiencies into <span className="highlight">weekly dollar loss</span>.
            </p>
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        className="final-layer"
        style={{
          opacity: useTransform(scrollYProgress, [0.33, 0.45], [0, 1]),
        }}
      >
        <motion.div
          className="final-content"
          style={{
            y: useTransform(scrollYProgress, [0.33, 0.45], [100, 0]),
          }}
        >
          <motion.div
            className="final-metrics"
            style={{
              opacity: useTransform(scrollYProgress, [0.35, 0.47], [0, 1]),
            }}
          >
            <div className="metric-item">
              <div className="metric-label">Exponential</div>
              <div className="metric-value">Debt Growth</div>
            </div>
            <div className="metric-divider" />
            <div className="metric-item">
              <div className="metric-label">Real-time</div>
              <div className="metric-value">Cost Analysis</div>
            </div>
            <div className="metric-divider" />
            <div className="metric-item">
              <div className="metric-label">Data-driven</div>
              <div className="metric-value">Decisions</div>
            </div>
          </motion.div>

          <motion.p
            className="final-statement"
            style={{
              opacity: useTransform(scrollYProgress, [0.37, 0.49], [0, 1]),
            }}
          >
            Make debt decisions
          </motion.p>
          <motion.p
            className="final-statement-sub"
            style={{
              opacity: useTransform(scrollYProgress, [0.39, 0.51], [0, 1]),
            }}
          >
            with economic clarity
          </motion.p>
          <motion.div
            className="button-wrapper"
            style={{
              opacity: useTransform(scrollYProgress, [0.41, 0.53], [0, 1]),
            }}
          >
            <motion.button
              className="enter-button"
              onClick={onEnter}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="button-text">Enter Analysis</span>
              <motion.div
                className="button-glow"
                initial={{ opacity: 0, scale: 0 }}
                whileHover={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
              />
              <div className="button-border" />
            </motion.button>
          </motion.div>
        </motion.div>
      </motion.div>

      <div className="scroll-indicator">
        <motion.div
          className="scroll-line"
          style={{
            scaleY: scrollYProgress,
          }}
        />
      </div>
    </motion.div>
  );
};

export default Landing;
