import { useEffect, useRef, useState } from "react";
import { Zap } from "lucide-react";

const LIGHT_IMG = "/assets/demos/enermax/images/hero-light.webp";
const DARK_IMG = "/assets/demos/enermax/images/hero-dark.webp";

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const bgFrontRef = useRef<HTMLDivElement>(null);
  const bgBackRef = useRef<HTMLDivElement>(null);
  const animatingRef = useRef(false);

  const isDarkRef = useRef(isDark);
  isDarkRef.current = isDark;

  useEffect(() => {
    if (isDark) {
      document.body.classList.remove("light-theme");
    } else {
      document.body.classList.add("light-theme");
    }
  }, [isDark]);

  useEffect(() => {
    const darkUrl = `url(${DARK_IMG})`;
    if (bgFrontRef.current) bgFrontRef.current.style.backgroundImage = darkUrl;
    if (bgBackRef.current) bgBackRef.current.style.backgroundImage = darkUrl;
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shouldLoop =
      params.has("preview") || (params.has("embed") && !params.has("lightbox"));
    if (!shouldLoop) return;

    let onDark = true;
    let timer = 0;
    const LOOP_MS = 3800;
    const START_DELAY = 1600;

    const flip = () => {
      onDark = !onDark;
      toggleTheme(onDark);
      timer = window.setTimeout(flip, LOOP_MS);
    };

    timer = window.setTimeout(flip, START_DELAY);
    return () => window.clearTimeout(timer);
  }, []);

  function toggleTheme(toDark: boolean) {
    if (isDarkRef.current === toDark || animatingRef.current) return;

    const targetImg = toDark ? DARK_IMG : LIGHT_IMG;
    const bgFront = bgFrontRef.current;
    const bgBack = bgBackRef.current;
    if (!bgFront || !bgBack) return;

    animatingRef.current = true;
    bgBack.style.backgroundImage = `url(${targetImg})`;
    bgFront.classList.add("pull-down");

    window.setTimeout(() => {
      setIsDark(toDark);
      bgFront.style.backgroundImage = `url(${targetImg})`;

      window.setTimeout(() => {
        bgFront.classList.remove("pull-down");
        animatingRef.current = false;
      }, 30);
    }, 300);
  }

  return (
    <div className="hero">
      <div className="blur-overlay blur-overlay-top" />
      <div className="blur-overlay blur-overlay-bottom" />

      <div className="hero-bg-wrapper">
        <div ref={bgBackRef} className="hero-bg bg-back" />
        <div ref={bgFrontRef} className="hero-bg bg-front" />
      </div>

      <nav className="navbar">
        <div className="logo-container">
          <Zap className="logo" size={32} strokeWidth={2} />
          <span className="brand-name">Enermax</span>
        </div>

        <div className={`nav-links${menuOpen ? " active" : ""}`}>
          <a href="#">How It Works</a>
          <a href="#">Our Cases</a>
          <a href="#">About Us</a>
          <a href="#">Careers</a>
          <a href="#">Resources</a>
          <a href="#">Customers</a>
          <button type="button" className="cta-button drawer-cta">
            Get an Instant Quote
          </button>
        </div>

        <button type="button" className="cta-button nav-cta">
          Get an Instant Quote
        </button>

        <div
          className={`hamburger${menuOpen ? " active" : ""}`}
          onClick={() => setMenuOpen((open) => !open)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setMenuOpen((open) => !open);
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </div>
      </nav>

      <div className="hero-content">
        <h1 className="hero-title">
          $0 Electricity Bills
          <br />
          <span className="title-accent">for the next</span> 7 years
        </h1>

        <div className="theme-toggle">
          <div
            className="toggle-indicator"
            style={{
              transform: isDark
                ? "translateX(calc(100% + 4px))"
                : "translateX(0)",
            }}
          />
          <button
            type="button"
            className={`toggle-btn${!isDark ? " active" : ""}`}
            onClick={() => toggleTheme(false)}
          >
            <span className="label">Morning</span>
            <span className="subtext">$0 for Electricity</span>
          </button>
          <button
            type="button"
            className={`toggle-btn${isDark ? " active" : ""}`}
            onClick={() => toggleTheme(true)}
          >
            <span className="label">Night</span>
            <span className="subtext">$0 for Electricity</span>
          </button>
        </div>

        <p className="hero-footer">
          Forget the energy market, weather conditions and seasons; our Smart Controller
          guarantees you get no electricity bill for seven years.
        </p>
      </div>
    </div>
  );
}
