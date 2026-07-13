import { HeroContent } from "./components/HeroContent";
import { LogoMarquee } from "./components/LogoMarquee";
import { Navbar } from "./components/Navbar";

const HERO_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260402_161801_19c1f902-b569-4d42-87b0-4de571a14399.mp4";
const HERO_POSTER = "/assets/demos/ecogreen/hero.webp";

export default function App() {
  return (
    <div className="relative h-screen overflow-hidden bg-cream text-gray-900">
      <img
        src={HERO_POSTER}
        alt=""
        className="fixed inset-0 z-0 h-full w-full object-cover"
        aria-hidden="true"
        fetchPriority="high"
      />
      <video
        className="fixed inset-0 z-[1] h-full w-full object-cover"
        src={HERO_VIDEO}
        poster={HERO_POSTER}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-cream/35" aria-hidden="true" />

      <div
        className="pointer-events-none absolute inset-0 z-[2] opacity-[0.04]"
        aria-hidden="true"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-24deg, #31463B 0, #31463B 1px, transparent 1px, transparent 48px)",
        }}
      />

      <div className="relative z-10 flex h-full flex-col">
        <Navbar />
        <HeroContent />
        <LogoMarquee />
      </div>
    </div>
  );
}
