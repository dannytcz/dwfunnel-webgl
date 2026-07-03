/**
 * Phase 5: Mobile Cinematic Lite.
 * Instead of scroll scrubbing, crossfade a few evenly spaced keyframes behind
 * the (static) text and CTAs. No pinning, no scrub, no custom cursor.
 * saveData / 2g / 3g get a single static poster only.
 */

function pickEven(urls, n) {
  if (!urls.length) return [];
  if (urls.length <= n) return urls.slice();
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(urls[Math.round((i * (urls.length - 1)) / (n - 1))]);
  }
  return out;
}

function crossfadeLayer(stage, urls) {
  if (!stage || urls.length < 2 || !window.gsap) return;
  const layer = document.createElement("div");
  layer.className = "cine-lite";
  layer.setAttribute("aria-hidden", "true");
  const imgs = urls.map((url, i) => {
    const img = new Image();
    img.className = "cine-lite__frame";
    img.decoding = "async";
    img.loading = i === 0 ? "eager" : "lazy";
    img.alt = "";
    img.src = url;
    layer.appendChild(img);
    return img;
  });
  // Insert behind the scrim if present, else prepend.
  const scrim = stage.querySelector(".hero__scrim, .machine__scrim");
  if (scrim) stage.insertBefore(layer, scrim);
  else stage.insertBefore(layer, stage.firstChild);

  window.gsap.set(imgs, { opacity: 0 });
  window.gsap.set(imgs[0], { opacity: 1 });

  const LOOP = 8;
  const step = LOOP / imgs.length;
  const tl = window.gsap.timeline({ repeat: -1 });
  for (let i = 1; i <= imgs.length; i++) {
    const cur = imgs[i % imgs.length];
    const prev = imgs[i - 1];
    const at = Math.max(0, i * step - 1.2);
    tl.to(cur, { opacity: 1, duration: 1.2, ease: "power1.inOut" }, at);
    tl.to(prev, { opacity: 0, duration: 1.2, ease: "power1.inOut" }, at);
  }
  return tl;
}

export function initMobileLite({ heroUrls = [], saveData = false }) {
  const heroPoster = document.getElementById("hero-poster");
  if (saveData) {
    heroPoster?.classList.remove("is-hidden");
    console.info("[mobile-lite] saveData/slow connection — static poster only");
    return () => {};
  }

  const heroStage = document.querySelector("#hero .hero__stage");
  const tls = [];
  // Machine is a static SVG schematic on mobile, so only the hero crossfades.
  const t1 = crossfadeLayer(heroStage, pickEven(heroUrls, 4));
  if (t1) tls.push(t1);
  if (heroPoster) heroPoster.classList.add("is-hidden");
  console.info("[mobile-lite] hero keyframe crossfade running (4)");

  return () => {
    tls.forEach((t) => t.kill());
    document.querySelectorAll(".cine-lite").forEach((el) => el.remove());
  };
}
