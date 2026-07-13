const LOGOS = [
  "Retool",
  "remote",
  "ARC",
  "Raycast",
  "runway",
  "ramp",
  "HEX",
  "Vercel",
  "descript",
];

export function LogoMarquee() {
  const track = [...LOGOS, ...LOGOS];

  return (
    <div className="relative z-10 overflow-hidden pb-6 md:pb-8">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-cream to-transparent md:w-32" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-cream to-transparent md:w-32" />

      <div className="flex w-max animate-scroll-fast gap-8 md:animate-scroll md:gap-16">
        {track.map((name, i) => (
          <span
            key={`${name}-${i}`}
            className="whitespace-nowrap text-base font-medium text-gray-400 md:text-xl"
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
