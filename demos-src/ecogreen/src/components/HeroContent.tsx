import {
  ArrowRight,
  Grid2X2,
  Leaf,
  MapPin,
  Play,
  PlusCircle,
  RefreshCw,
  Sparkles,
  Square,
} from "lucide-react";
import { FadeDown } from "./FadeDown";
import { StaggeredFade } from "./StaggeredFade";

const AVATAR_LEFT =
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260404_181959_c031059f-0b95-4099-89ca-105c74073dd7.png&w=1280&q=85";
const AVATAR_CENTER =
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260404_181856_0904710c-03e6-460d-86ac-9acc0958001f.png&w=1280&q=85";
const AVATAR_RIGHT =
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260404_182114_826e4e5d-c7c6-425f-a72b-0410be243f72.png&w=1280&q=85";

const DEPLOYMENT_ICONS = [RefreshCw, Square, PlusCircle, Grid2X2, Sparkles];

export function HeroContent() {
  return (
    <>
      <main className="relative z-10 flex flex-1 flex-col items-center px-4 pt-4 md:px-8 md:pt-8">
        <div className="rounded-full border border-black/20 px-3 py-1.5 text-xs text-gray-800 md:px-4 md:py-2 md:text-sm">
          <span className="hidden items-center gap-2 sm:inline-flex">
            <span aria-hidden="true">☀️</span>
            <span aria-hidden="true">→</span>
            <span aria-hidden="true">🌍</span>
            <span>Delivering power innovate</span>
            <span aria-hidden="true">→</span>
            <span aria-hidden="true">🌱</span>
          </span>
          <span className="sm:hidden">Power innovate</span>
        </div>

        <StaggeredFade
          text="Renewable Power For Tomorrow,"
          className="mb-0 mt-5 max-w-5xl text-center text-3xl font-normal leading-tight text-forest sm:mt-6 sm:text-4xl md:text-5xl lg:text-6xl"
        />
        <StaggeredFade
          text="Infinite Clean Solutions"
          className="mb-3 mt-1 max-w-5xl text-center text-3xl font-normal leading-tight text-forest sm:text-4xl md:mb-4 md:text-5xl lg:text-6xl"
        />

        <FadeDown delay={0.5}>
          <p className="mb-4 max-w-3xl text-center text-sm text-gray-600 md:mb-5 md:text-base lg:text-lg">
            Sustainable Energy Platform. Engineering, deploying, and servicing solar arrays for
            homes, businesses, and large-scale operations worldwide.
          </p>
        </FadeDown>

        <FadeDown delay={0.7} className="flex w-full max-w-xl flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <a
            href="#"
            className="inline-flex items-center justify-between gap-3 rounded-full bg-gradient-to-r from-[#3C684D] to-[#4A7144] px-4 py-2.5 text-sm font-medium text-white sm:justify-start md:px-5 md:py-3"
          >
            <span className="flex items-center gap-2">
              <Leaf className="h-4 w-4" strokeWidth={2} />
              Explore Options
            </span>
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full md:h-8 md:w-8"
              style={{ background: "linear-gradient(59deg, #567A5E 0%, #78A873 100%)" }}
            >
              <Play className="h-3.5 w-3.5 fill-white text-white" strokeWidth={0} />
            </span>
          </a>

          <a
            href="#"
            className="inline-flex items-center justify-between gap-3 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-gray-700 sm:justify-start md:px-5 md:py-3"
          >
            <span>Start Network</span>
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full md:h-8 md:w-8"
              style={{ background: "linear-gradient(59deg, #EEEEEE 0%, #CBCBCB 100%)" }}
            >
              <ArrowRight className="h-3.5 w-3.5 text-black" strokeWidth={2} />
            </span>
          </a>
        </FadeDown>
      </main>

      <div className="absolute bottom-24 left-8 z-10 hidden md:block">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
          <MapPin className="h-5 w-5 text-[#4A7C5A]" strokeWidth={2} />
        </div>
        <p className="mt-2 font-medium text-gray-900">4521 Sunvalley,</p>
        <p className="text-gray-600">Rd7, USA</p>
      </div>

      <div className="absolute bottom-20 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 md:bottom-24">
        <button
          type="button"
          className="liquid-glass flex h-9 w-9 items-center justify-center rounded-full md:h-10 md:w-10"
          aria-label="Play clean power system video"
        >
          <Play className="h-4 w-4 fill-white text-white" strokeWidth={0} />
        </button>
        <span className="text-xs font-medium text-white md:text-sm">Clean Power System</span>
      </div>

      <div className="absolute bottom-48 right-8 z-10 hidden lg:block">
        <div className="relative mb-3 h-16 w-28">
          <img
            src={AVATAR_LEFT}
            alt=""
            className="absolute left-0 top-1/2 z-0 h-10 w-10 -translate-y-1/2 rounded-full object-cover"
          />
          <img
            src={AVATAR_CENTER}
            alt=""
            className="absolute left-1/2 top-1/2 z-10 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white object-cover"
          />
          <img
            src={AVATAR_RIGHT}
            alt=""
            className="absolute right-0 top-1/2 z-0 h-10 w-10 -translate-y-1/2 rounded-full object-cover"
          />
        </div>
        <p className="mb-3 text-sm font-medium text-gray-900">+ 37k Deployments</p>
        <div className="flex items-center gap-3">
          {DEPLOYMENT_ICONS.map((Icon, i) => (
            <Icon key={i} className="h-5 w-5 text-black" strokeWidth={1.75} />
          ))}
        </div>
      </div>
    </>
  );
}
