const MACHINE_PIN_VH = 200; // Phase 3.6: shortened from 300vh

export function initMachinePin({ machineScrubber, reducedMotion }) {
  const pin = document.getElementById("machine-pin");
  const canvas = document.getElementById("machine-canvas");
  const components = Array.from(document.querySelectorAll(".machine-component"));
  const frameCount = machineScrubber.urls.length;

  canvas?.classList.add("is-active");

  return window.ScrollTrigger.create({
    trigger: pin,
    start: "top top",
    end: `+=${MACHINE_PIN_VH}%`,
    pin: true,
    scrub: reducedMotion ? false : 0.15,
    anticipatePin: 1,
    onToggle: (self) => {
      if (self.isActive) {
        if (machineScrubber._released) {
          machineScrubber.reload().then(() => machineScrubber.resumeTicker());
        } else {
          machineScrubber.resumeTicker();
        }
      } else {
        machineScrubber.pauseTicker();
      }
    },
    onUpdate: (self) => {
      const p = self.progress;
      const frame = Math.round(p * (frameCount - 1));
      machineScrubber.setTargetFrame(frame);
      machineScrubber.setFx({ scale: 1 + p * 0.04, offsetY: -p * 12, offsetX: 0 });

      // Three reveals evenly across the pin.
      const idx = Math.min(2, Math.floor(p * 3));
      components.forEach((el, i) => {
        el.classList.toggle("is-active", i === idx);
        el.style.opacity = i === idx ? "1" : "0.55";
        el.style.transform = i === idx ? "scale(1)" : "scale(0.96)";
      });

      const numeral = components[idx]?.querySelector(".machine-component__numeral");
      if (numeral && !reducedMotion) {
        const scale = 0.8 + (p * 3 - idx) * 0.2;
        numeral.style.transform = `scale(${Math.min(1, Math.max(0.8, scale))})`;
        numeral.style.opacity = String(Math.min(1, 0.5 + (p * 3 - idx)));
      }
    },
  });
}
