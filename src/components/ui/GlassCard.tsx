import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
  bordered?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  hoverEffect = false,
  bordered = true,
  ...props
}) => {
  return (
    <motion.div
      whileHover={
        hoverEffect
          ? {
              y: -4,
              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.06), 0 8px 10px -6px rgb(0 0 0 / 0.04)',
              transition: { duration: 0.2, ease: 'easeOut' },
            }
          : undefined
      }
      className={`rounded-2xl bg-white/90 backdrop-blur-md transition-colors ${
        bordered ? 'border border-slate-200/80 shadow-xs' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
};
