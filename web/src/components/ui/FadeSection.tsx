import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

type FadeSectionProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export function FadeSection({ children, className = '', delay = 0 }: FadeSectionProps) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
