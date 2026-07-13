import { Instagram, Send } from "lucide-react";
import { LogoRed } from "./LogoRed";
import { LogoWhite } from "./LogoWhite";

const HERO_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260511_213626_db1bde2b-521c-4b22-91f3-35c072eb8771.mp4";
const HERO_POSTER = "/assets/demos/arcfield/hero.webp";

const NAV_LINKS = ["WORK", "PRICING"];

const STAT_CARDS: [string, string][] = [
  ["74%", "Campaign lift"],
  ["89%", "Client retention"],
];

export function Hero() {
  return (
    <div
      className="relative w-full min-h-screen overflow-hidden"
      style={{ backgroundColor: "#e02b10" }}
    >
      <img
        src={HERO_POSTER}
        alt=""
        className="absolute inset-0 z-0 h-full w-full object-cover"
        aria-hidden="true"
        fetchPriority="high"
      />
      <video
        className="absolute inset-0 z-[1] h-full w-full object-cover"
        src={HERO_VIDEO}
        poster={HERO_POSTER}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      />

      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-[0.05]"
        aria-hidden="true"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-28deg, #fff 0, #fff 1px, transparent 1px, transparent 52px)",
        }}
      />

      <nav className="absolute left-0 right-0 top-0 z-30 flex items-center justify-between gap-2 px-4 py-4 sm:px-6 md:px-10 md:py-5">
        <div className="flex items-center gap-3 sm:gap-6">
          <LogoWhite />
          <div className="hidden items-center gap-2 sm:flex">
            <button
              type="button"
              className="rounded-full bg-white px-5 py-2 text-xs text-black"
              style={{ fontFamily: "Inter, sans-serif", fontWeight: 700 }}
            >
              HOME
            </button>
            {NAV_LINKS.map((label) => (
              <button
                key={label}
                type="button"
                className="rounded-full border border-white/60 px-5 py-2 text-xs text-white transition-all hover:border-white"
                style={{ fontFamily: "Inter, sans-serif", fontWeight: 400 }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            className="text-white transition-opacity hover:opacity-70"
            aria-label="Instagram"
          >
            <Instagram size={18} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            className="hidden text-white transition-opacity hover:opacity-70 sm:block"
            aria-label="Send message"
          >
            <Send size={16} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            className="whitespace-nowrap rounded-full border border-white px-3 py-2 text-xs text-white transition-all hover:bg-white hover:text-red-600 sm:px-5"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            Book a Call
          </button>
        </div>
      </nav>

      <div className="relative z-20 flex min-h-screen flex-col px-4 sm:px-6 md:px-10">
        <div className="h-[72px] shrink-0" />

        <div
          className="mx-auto flex flex-1 flex-col gap-10 py-8 md:flex-row md:items-center md:justify-between md:gap-32 md:py-0"
          style={{ maxWidth: "1100px", width: "100%" }}
        >
          <div className="max-w-[260px]">
            <p
              className="mb-2 text-[13px] uppercase leading-snug tracking-[0.22em] text-white"
              style={{ fontFamily: "Inter, sans-serif", fontWeight: 700 }}
            >
              GROWTH
              <br />
              COLLECTIVE
            </p>
            <p
              className="text-[13px] leading-relaxed text-white"
              style={{ fontFamily: "Inter, sans-serif", opacity: 0.8 }}
            >
              Conversion-first brand systems
              <br />
              for teams that ship without slowing down
            </p>
          </div>

          <div className="max-w-[260px] text-left">
            <div className="mb-2 flex justify-start">
              <LogoRed />
            </div>
            <p
              className="mb-3 text-[14px] leading-relaxed text-white"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Arcfield is the command center for modern agencies. Track momentum, tune budgets,
              steer campaigns, surface wins, and keep clients confident every week.
            </p>
            <p
              className="text-[13px] leading-loose text-white"
              style={{ fontFamily: "Inter, sans-serif", opacity: 0.7 }}
            >
              Funnels Retention Spend
              <br />
              Attribution Channels Lift
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-8 pb-8 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
          <div className="min-w-0 flex-1">
            <h1
              className="mb-6 select-none text-white md:mb-10"
              style={{
                fontFamily: "Geist, sans-serif",
                fontWeight: 600,
                fontSize: "clamp(56px, 13vw, 155px)",
                letterSpacing: "-0.04em",
                lineHeight: 0.78,
                width: "fit-content",
              }}
            >
              Growth
              <br />
              Studio
            </h1>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              <p
                className="text-[14px] leading-relaxed text-white"
                style={{ fontFamily: "Inter, sans-serif", minWidth: "160px" }}
              >
                Bold work only. We build
                <br />
                brands people remember.
              </p>
              <button
                type="button"
                className="w-full rounded-full bg-white text-black shadow-lg transition-all hover:bg-gray-100 active:scale-95 sm:w-auto"
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 600,
                  fontSize: "15px",
                  whiteSpace: "nowrap",
                  padding: "24px 60px",
                }}
              >
                start a project
              </button>
            </div>
          </div>

          <div className="flex gap-4 sm:gap-6">
            {STAT_CARDS.map(([value, label]) => (
              <div
                key={label}
                className="flex flex-1 flex-col items-start justify-between rounded-2xl px-5 py-5 text-left sm:px-6 lg:flex-initial"
                style={{
                  minWidth: "150px",
                  minHeight: "150px",
                  background: "rgba(255,255,255,0.92)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <p
                  className="leading-none"
                  style={{
                    fontFamily: "Britanica-Black, sans-serif",
                    fontSize: "clamp(2rem, 6vw, 2.6rem)",
                    color: "#111",
                  }}
                >
                  {value}
                </p>
                <p
                  className="mt-auto text-[12px]"
                  style={{ fontFamily: "Inter, sans-serif", color: "#888" }}
                >
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
