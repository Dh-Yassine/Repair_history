import { useEffect, useState } from 'react';
import { motion, animate } from 'framer-motion';
import { formatNumber } from '../../lib/format';

export default function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(0, value, {
      duration: 1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return controls.stop;
  }, [value]);

  const text =
    decimals > 0
      ? formatNumber(display, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
      : formatNumber(Math.round(display));
  return <motion.span className="mono">{text}</motion.span>;
}
