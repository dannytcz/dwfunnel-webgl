import { motion } from "framer-motion";
import { ChevronRight, Play } from "lucide-react";

const AVATARS = [
  "/assets/demos/supabot/avatar-1.webp",
  "/assets/demos/supabot/avatar-2.webp",
  "/assets/demos/supabot/avatar-3.webp",
  "/assets/demos/supabot/avatar-4.webp",
] as const;

const easeOut = [0.16, 1, 0.3, 1] as const;

export default function HeroCopy() {
  return (
    <motion.div
      className="flex flex-col justify-center items-start text-left max-w-[620px] lg:pr-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: easeOut, delay: 0.15 }}
    >
      <div className="group/avatars px-3 py-1.5 rounded-full bg-black/5 border border-black/5 flex items-center gap-3 w-fit shadow-sm">
        <div className="avatar-stack flex -space-x-2 select-none">
          {AVATARS.map((src) => (
            <img
              key={src}
              src={src}
              alt=""
              width={24}
              height={24}
              className="w-6 h-6 rounded-full border-[1.5px] border-white object-cover"
            />
          ))}
        </div>
        <p className="text-[12px] text-black/80 m-0 font-sans">
          Trusted by{" "}
          <span className="font-semibold text-[#171717]">10,000+ users</span>{" "}
          worldwide
        </p>
      </div>

      <h1 className="font-outfit font-black text-[36px] sm:text-[44px] lg:text-[60px] leading-[1.08] tracking-[-3px] mt-6 select-none text-black m-0">
        Your All in One
        <br />
        SupaBot.
      </h1>

      <p className="text-[18px] text-black/60 tracking-[-0.5px] leading-relaxed mt-5 max-w-[480px] m-0 font-sans">
        Ask questions, get answers, automate tasks, and boost your productivity
        with the power of AI.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-6">
        <motion.a
          href="#try"
          id="try"
          className="group cta-primary pl-6 pr-2 py-2 rounded-[16px] flex items-center gap-4 text-sm font-bold transition-all w-fit bg-[#0084FF] hover:bg-[#0074E0] text-white"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Try SupaBot.
          <span className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#0084FF] transition-transform duration-300 group-hover:translate-x-1">
            <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
          </span>
        </motion.a>

        <a href="#demo" className="flex items-center gap-2 group">
          <span className="w-9 h-9 rounded-full bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center border border-blue-100 transition-colors">
            <Play className="w-3.5 h-3.5 fill-[#0084FF] text-[#0084FF]" />
          </span>
          <span className="text-[14px] font-bold text-[#0084FF] group-hover:text-[#0074E0] transition-colors">
            Watch Demo
          </span>
        </a>
      </div>
    </motion.div>
  );
}
