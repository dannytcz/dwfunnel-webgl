const MACHINE_PIN_VH = 300;

export function initMachinePin({ machineScrubber, reducedMotion }) {
  const pin = document.getElementById("machine-pin");
  const canvas = document.getElementById("machine-canvas");
  const components = Array.from(document.querySelectorAll(".machine-component"));
  const frameCount = machineScrubber.urls.length;

  canvas?.classList.add("is-active");

  window.ScrollTrigger.create({
    trigger: pin,
    start: "top top",
    end: `+=${MACHINE_PIN_VH}%`,
    pin: true,
    scrub: reducedMotion ? false : 0.15,
    anticipatePin: 1,
    onUpdate: (self) => {
      const p = self.progress;
      const frame = Math.round(p * (frameCount - 1));
      machineScrubber.setTargetFrame(frame);
      machineScrubber.setFx({ scale: 1 + p * 0.04, offsetY: -p * 12, offsetX: 0 });

      const idx = Math.min(2, Math.floor(p * 3));
      components.forEach((el, i) => {
        el.classList.toggle("is-active", i === idx);
        el.style.opacity = i < idx ? "0.4" : i === idx ? "1" : "0.4";
        if (i < idx) el.style.transform = "scale(0.96)";
        else if (i === idx) el.style.transform = "scale(1)";
        else el.style.transform = "scale(0.96)";
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
