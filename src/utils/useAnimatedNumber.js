import { useEffect, useRef, useState } from 'react';

/**
 * Smoothly animates between previous and current numeric values using
 * requestAnimationFrame. Returns the interpolated value the caller renders.
 *
 * @param {number} value     target value
 * @param {object} options
 * @param {number} options.duration ms (default 600)
 * @param {(t:number)=>number} options.easing easing function on [0, 1]
 */
export default function useAnimatedNumber(
  value,
  { duration = 600, easing = (t) => 1 - Math.pow(1 - t, 3) } = {}
) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef(performance.now());
  const rafRef = useRef(0);

  useEffect(() => {
    fromRef.current = display;
    startRef.current = performance.now();

    const tick = (now) => {
      const t = Math.min(1, (now - startRef.current) / duration);
      const e = easing(t);
      const next = fromRef.current + (value - fromRef.current) * e;
      setDisplay(next);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return display;
}
