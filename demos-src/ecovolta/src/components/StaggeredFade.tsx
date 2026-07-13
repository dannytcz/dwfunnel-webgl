import { motion, useInView } from "framer-motion";
import { useRef } from "react";

type StaggeredFadeProps = {
  text: string;
  className?: string;
};

export function StaggeredFade({ text, className }: StaggeredFadeProps) {
  const ref = useRef<HTMLHeadingElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });

  return (
    <h1 ref={ref} className={className} aria-label={text}>
      {text.split("").map((char, i) => (
        <motion.span
          key={`${char}-${i}`}
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.3, delay: i * 0.03 }}
          style={{ display: char === " " ? "inline" : "inline-block" }}
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </h1>
  );
}
