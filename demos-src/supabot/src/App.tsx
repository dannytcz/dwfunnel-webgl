import Navbar from "./components/Navbar";
import HeroCopy from "./components/HeroCopy";
import HeroCompanion from "./components/HeroCompanion";

export default function App() {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-white">
      <div
        className="pointer-events-none absolute -top-24 left-[10%] w-[420px] h-[420px] rounded-full bg-[#60B1FF]/20 blur-[120px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-[20%] right-[5%] w-[380px] h-[380px] rounded-full bg-[#319AFF]/20 blur-[100px]"
        aria-hidden="true"
      />

      <Navbar />

      <main className="relative w-full max-w-[1280px] mx-auto px-6 sm:px-12 lg:px-20 pt-[80px] md:pt-[80px]">
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 min-h-[calc(100vh-80px)] items-center pb-16">
          <div className="lg:col-span-5">
            <HeroCopy />
          </div>
          <div className="lg:col-span-7">
            <HeroCompanion />
          </div>
        </section>
      </main>
    </div>
  );
}
