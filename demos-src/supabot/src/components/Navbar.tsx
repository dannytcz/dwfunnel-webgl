import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, ArrowRight, Menu, X } from "lucide-react";

const NAV_LINKS = ["Home", "Features", "Company", "Pricing"] as const;

const easeOut = [0.16, 1, 0.3, 1] as const;

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <motion.header
        className="fixed top-[30px] left-0 right-0 z-50 flex justify-center px-4 pointer-events-none"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: easeOut }}
      >
        <nav className="w-full max-w-[1280px] h-12 rounded-[16px] pointer-events-auto transition-all duration-300">
          <div className="flex items-center justify-between gap-8 px-6 py-2 w-full h-full">
            <a
              href="#"
              className="font-fustat font-extrabold text-[22px] tracking-tight text-black flex items-center gap-2"
              aria-label="SupaBot home"
            >
              <Bot className="w-6 h-6 text-[#0084FF]" aria-hidden="true" />
              SupaBot.
            </a>

            <ul className="hidden md:flex items-center gap-8 list-none m-0 p-0">
              {NAV_LINKS.map((label) => (
                <li key={label}>
                  <a
                    href={`#${label.toLowerCase()}`}
                    className="text-[14px] font-medium text-black/60 hover:text-black transition-colors"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-3">
              <a
                href="#try"
                className="group h-9 px-5 rounded-[12px] bg-black/5 hover:bg-black/10 border border-black/10 text-[14px] font-semibold flex items-center gap-2 text-black transition-all hover:shadow-md"
              >
                Get Started
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </a>

              <button
                type="button"
                className="md:hidden h-9 w-9 rounded-[12px] bg-black/5 border border-black/10 flex items-center justify-center text-black"
                aria-label={open ? "Close menu" : "Open menu"}
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
              >
                {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </nav>
      </motion.header>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-[60] bg-black/20 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="fixed top-0 right-0 z-[70] h-full w-[260px] bg-white/95 backdrop-blur-[40px] border-l border-black/10 md:hidden flex flex-col px-6 pt-24 gap-6"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
            >
              {NAV_LINKS.map((label) => (
                <a
                  key={label}
                  href={`#${label.toLowerCase()}`}
                  className="text-[16px] font-medium text-black/70 hover:text-black transition-colors"
                  onClick={() => setOpen(false)}
                >
                  {label}
                </a>
              ))}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
