/**
 * DW Funnel branded boot loader for concept demos.
 * Skips ?embed=1 / ?preview=1 so Selected Work capture stays clean.
 * Injects itself as soon as the script runs (prefer <head>).
 */
(function () {
  try {
    var q = new URLSearchParams(location.search);
    if (q.has("embed") || q.has("preview")) return;
  } catch (e) {}

  if (window.__DWF_BOOT__) return;
  window.__DWF_BOOT__ = true;

  var css =
    "#dwf-boot{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;" +
    "background:#050505;color:#e8dfd2;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;" +
    "letter-spacing:.14em;text-transform:uppercase;transition:opacity .55s cubic-bezier(.22,1,.36,1),visibility .55s}" +
    "#dwf-boot.is-done{opacity:0;visibility:hidden;pointer-events:none}" +
    "#dwf-boot .dwf-boot__panel{width:min(320px,calc(100vw - 48px));text-align:left}" +
    "#dwf-boot .dwf-boot__brand{margin:0 0 16px;font-size:.72rem;font-weight:600;color:#e8dfd2}" +
    "#dwf-boot .dwf-boot__brand span{color:#f2a84a}" +
    "#dwf-boot .dwf-boot__track{height:1px;background:rgba(232,223,210,.16);overflow:hidden}" +
    "#dwf-boot .dwf-boot__fill{height:100%;width:0;background:linear-gradient(90deg,#c9442d,#f2a84a);" +
    "box-shadow:0 0 16px rgba(201,68,45,.45);transition:width .12s linear}" +
    "#dwf-boot .dwf-boot__row{display:flex;justify-content:space-between;gap:1rem;margin-top:14px;" +
    "font-size:.62rem;color:rgba(232,223,210,.55)}" +
    "#dwf-boot .dwf-boot__pct{color:#e8dfd2}" +
    "html.dwf-booting,html.dwf-booting body{overflow:hidden!important}" +
    "html.dwf-booting #loader:not(#dwf-boot),html.dwf-booting .loader:not(#dwf-boot)," +
    "html.dwf-booted #loader:not(#dwf-boot),html.dwf-booted .loader:not(#dwf-boot){display:none!important}";

  var style = document.createElement("style");
  style.id = "dwf-boot-style";
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);

  document.documentElement.classList.add("dwf-booting");

  var root = document.createElement("div");
  root.id = "dwf-boot";
  root.setAttribute("aria-live", "polite");
  root.setAttribute("aria-busy", "true");
  root.innerHTML =
    '<div class="dwf-boot__panel">' +
    '<p class="dwf-boot__brand">DW <span>Funnel</span></p>' +
    '<div class="dwf-boot__track"><div class="dwf-boot__fill" id="dwf-boot-fill"></div></div>' +
    '<div class="dwf-boot__row"><span>Preparing concept</span><span class="dwf-boot__pct" id="dwf-boot-pct">0%</span></div>' +
    "</div>";

  function mount() {
    if (!root.parentNode) {
      (document.body || document.documentElement).appendChild(root);
    }
  }
  mount();
  if (!document.body) {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  }

  var fill = root.querySelector("#dwf-boot-fill");
  var pct = root.querySelector("#dwf-boot-pct");
  var progress = 0;
  var loaded = document.readyState === "complete";
  var minMs = 900;
  var maxMs = 3200;
  var started = performance.now();
  var done = false;

  function setProgress(p) {
    progress = Math.max(progress, Math.min(1, p));
    var v = Math.round(progress * 100);
    if (fill) fill.style.width = v + "%";
    if (pct) pct.textContent = v + "%";
  }

  function tick() {
    if (done) return;
    var elapsed = performance.now() - started;
    var soft = Math.min(0.86, elapsed / 1400);
    if (loaded) soft = Math.max(soft, 0.92);
    setProgress(soft);
    if (loaded && elapsed >= minMs) {
      finish();
      return;
    }
    if (elapsed >= maxMs) {
      finish();
      return;
    }
    requestAnimationFrame(tick);
  }

  function finish() {
    if (done) return;
    done = true;
    setProgress(1);
    root.setAttribute("aria-busy", "false");
    root.classList.add("is-done");
    document.documentElement.classList.remove("dwf-booting");
    document.documentElement.classList.add("dwf-booted");

    // Help demos that gate reveal behind a native loader
    try {
      document.body && document.body.classList.add("ready");
      document.querySelectorAll(".ready-only").forEach(function (el) {
        el.classList.add(el.classList.contains("line-reveal") ? "revealed" : "ready-reveal");
      });
      var native = document.getElementById("loader");
      if (native && native !== root) {
        native.classList.add("exit", "is-done");
        native.setAttribute("aria-busy", "false");
      }
    } catch (e) {}

    window.dispatchEvent(new CustomEvent("dwf:ready"));
    setTimeout(function () {
      try {
        root.remove();
        style.remove();
      } catch (e) {}
    }, 700);
  }

  function onLoaded() {
    loaded = true;
  }
  if (document.readyState === "complete") onLoaded();
  else window.addEventListener("load", onLoaded, { once: true });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      setProgress(Math.max(progress, 0.55));
    }).catch(function () {});
  }

  requestAnimationFrame(tick);
})();
