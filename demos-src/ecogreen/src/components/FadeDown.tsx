import { motion, useInView } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { cn } from "../lib/utils";

type FadeDownProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
};

export function FadeDown({ children, delay = 0, className }: FadeDownProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });

  return (
    <motion.div
      ref={ref}
      className={cn(className)}
      initial={{ opacity: 0, y: -20 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
      transition={{ duration: 0.6, delay }}
    >
      {children}
    </motion.div>
  );
}
