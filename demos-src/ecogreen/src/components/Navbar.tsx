import { Globe } from "lucide-react";

const NAV_LINKS = [
  "Renewables",
  "Strategies",
  "Photovoltaic",
  "Wind Systems",
  "Packages",
];

export function Navbar() {
  return (
    <header className="relative z-10 flex items-center justify-between px-4 py-4 md:px-8 md:py-6">
      <div className="flex items-center gap-3 md:gap-4">
        <span className="text-lg font-semibold text-gray-900 md:text-xl">EcoGreen</span>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-full border border-black/10 px-2.5 py-1 text-xs text-gray-700 md:text-sm"
          aria-label="Language selector"
        >
          <Globe className="h-4 w-4" strokeWidth={1.75} />
          En
        </button>
      </div>

      <nav className="hidden items-center gap-8 lg:flex" aria-label="Primary">
        {NAV_LINKS.map((link) => (
          <a
            key={link}
            href="#"
            className="text-sm text-gray-700 transition-colors hover:text-gray-900"
          >
            {link}
          </a>
        ))}
      </nav>

      <div className="flex items-center gap-2 md:gap-3">
        <a
          href="#"
          className="hidden rounded-full border border-black/20 px-4 py-2 text-sm text-gray-800 transition-colors hover:border-black/35 sm:inline-flex md:px-6 md:py-2.5"
        >
          Sign In
        </a>
        <a
          href="#"
          className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 md:px-6 md:py-2.5"
        >
          Clean Energy
        </a>
      </div>
    </header>
  );
}
