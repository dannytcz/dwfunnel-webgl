import { motion } from "framer-motion";
import { PenLine, FileText, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const easeOut = [0.16, 1, 0.3, 1] as const;

type FloatBadgeProps = {
  className: string;
  icon: LucideIcon;
  iconClass: string;
  title: string;
  subtitle: string;
  delay: number;
  floatY: number;
  floatX: number;
  duration: number;
  hoverRotate: number;
  shadowClass: string;
  strokeWidth?: number;
};

function FloatBadge({
  className,
  icon: Icon,
  iconClass,
  title,
  subtitle,
  delay,
  floatY,
  floatX,
  duration,
  hoverRotate,
  shadowClass,
  strokeWidth = 2,
}: FloatBadgeProps) {
  return (
    <motion.div
      className={`absolute ${className}`}
      initial={{ opacity: 0, scale: 0.85, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", damping: 20, stiffness: 100, delay }}
    >
      <motion.div
        className={`liquid-glass-card px-5 py-3 rounded-[20px] flex items-center gap-3 pointer-events-auto ${shadowClass}`}
        animate={{
          y: [0, -floatY, 0],
          x: [0, floatX, 0],
        }}
        transition={{
          duration,
          ease: "easeInOut",
          repeat: Infinity,
        }}
        whileHover={{ scale: 1.05, rotate: hoverRotate }}
      >
        <span
          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${iconClass}`}
        >
          <Icon className="w-4 h-4 text-white" strokeWidth={strokeWidth} />
        </span>
        <span className="flex flex-col text-left leading-tight">
          <span className="text-[13px] font-black text-neutral-900 tracking-tight font-sans">
            {title}
          </span>
          <span className="text-[10px] font-semibold text-neutral-500 mt-0.5 font-sans">
            {subtitle}
          </span>
        </span>
      </motion.div>
    </motion.div>
  );
}

function OrbitRings() {
  return (
    <svg
      className="absolute w-[620px] h-[620px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-[52%] -z-10 opacity-35 pointer-events-none"
      viewBox="0 0 620 620"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="310"
        cy="310"
        r="280"
        stroke="url(#orbitGrad)"
        strokeWidth="1"
        strokeDasharray="6 10"
      />
      <circle
        cx="310"
        cy="310"
        r="220"
        stroke="url(#orbitGrad)"
        strokeWidth="1"
        strokeDasharray="4 8"
        opacity="0.8"
      />
      <circle
        cx="310"
        cy="310"
        r="160"
        stroke="url(#orbitGrad)"
        strokeWidth="1"
        strokeDasharray="2 6"
        opacity="0.6"
      />
      <defs>
        <linearGradient id="orbitGrad" x1="0" y1="0" x2="620" y2="620">
          <stop stopColor="#60B1FF" />
          <stop offset="1" stopColor="#319AFF" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function HeroCompanion() {
  return (
    <motion.div
      className="relative w-full flex items-center justify-center lg:justify-end py-10 pointer-events-none"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: easeOut, delay: 0.25 }}
      id="demo"
    >
      <div
        className="absolute top-[30%] left-[20%] w-[420px] h-[420px] bg-sky-400/15 rounded-full blur-[110px] -z-10 animate-pulse"
        style={{ animationDuration: "7s" }}
        aria-hidden="true"
      />
      <OrbitRings />

      <div className="relative w-full max-w-[600px]">
        <video
          className="hero-video w-full h-auto rounded-[24px] select-none block"
          poster="/assets/demos/supabot/hero-robo-poster.webp"
          autoPlay
          loop
          muted
          playsInline
          controls={false}
        >
          <source
            src="/assets/demos/supabot/hero-robo.webm"
            type="video/webm"
          />
          <source
            src="/assets/demos/supabot/hero-robo.mp4"
            type="video/mp4"
          />
        </video>

        <FloatBadge
          className="top-[18%] -right-4 sm:-right-10 md:-right-14"
          icon={PenLine}
          iconClass="bg-gradient-to-br from-[#0084FF] to-[#0066CC] shadow-[0_4px_12px_rgba(0,132,255,0.3)]"
          title="Write an email"
          subtitle="for meeting"
          delay={0.6}
          floatY={8}
          floatX={2}
          duration={5}
          hoverRotate={1}
          shadowClass="shadow-[0_12px_32px_-4px_rgba(0,132,255,0.12)]"
        />

        <FloatBadge
          className="top-[48%] -left-6 sm:-left-12 md:-left-16"
          icon={FileText}
          iconClass="bg-gradient-to-br from-[#10B981] to-[#059669] shadow-[0_4px_12px_rgba(16,185,129,0.3)]"
          title="Summarize"
          subtitle="this document"
          delay={0.8}
          floatY={-8}
          floatX={-2}
          duration={5.5}
          hoverRotate={-1}
          shadowClass="shadow-[0_12px_32px_-4px_rgba(16,185,129,0.12)]"
        />

        <FloatBadge
          className="bottom-[18%] -right-4 sm:-right-8 md:-right-12"
          icon={Check}
          iconClass="bg-gradient-to-br from-[#9333EA] to-[#7E22CE] shadow-[0_4px_12px_rgba(147,51,234,0.3)]"
          title="Create a to-do list"
          subtitle="for today"
          delay={1.0}
          floatY={10}
          floatX={-1}
          duration={4.8}
          hoverRotate={1.5}
          shadowClass="shadow-[0_12px_32px_-4px_rgba(147,51,234,0.12)]"
          strokeWidth={3}
        />
      </div>
    </motion.div>
  );
}
