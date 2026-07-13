/**
 * DW Funnel branded boot loader + provenance mark for concept demos.
 * Boot UI skips ?embed=1 / ?preview=1 so Studio Bench captures stay clean.
 * Provenance (credit badge, meta, comment) always applies.
 */
(function () {
  var YEAR = "2026";
  var CREDIT = "Built by DW Funnel · © " + YEAR;
  var embed = false;
  try {
    var q = new URLSearchParams(location.search);
    embed = q.has("embed") || q.has("preview");
  } catch (e) {}

  function ensureMeta(name, content) {
    var el = document.querySelector('meta[name="' + name + '"]');
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("name", name);
      (document.head || document.documentElement).appendChild(el);
    }
    el.setAttribute("content", content);
  }

  function applyProvenance() {
    try {
      ensureMeta("author", "DW Funnel");
      ensureMeta("copyright", "© " + YEAR + " DW Funnel. Concept demo. All rights reserved.");
      ensureMeta("application-name", "DW Funnel Concept");

      if (!document.getElementById("dwf-provenance-comment")) {
        var c = document.createComment(
          " Concept demo by DW Funnel (dwfunnel.com). © " +
            YEAR +
            " DW Funnel. Not a free template. "
        );
        // Marker node so we do not duplicate on HMR-like reloads
        var marker = document.createElement("meta");
        marker.id = "dwf-provenance-comment";
        marker.name = "dwf-provenance";
        marker.content = "1";
        (document.head || document.documentElement).appendChild(marker);
        (document.head || document.documentElement).insertBefore(
          c,
          (document.head || document.documentElement).firstChild
        );
      }

      var style = document.getElementById("dwf-credit-style");
      if (!style) {
        style = document.createElement("style");
        style.id = "dwf-credit-style";
        style.textContent =
          "html.is-embed .dwf-credit,html.is-embed .studio-badge{display:none!important}" +
          ".dwf-credit,.studio-badge{z-index:9999}";
        (document.head || document.documentElement).appendChild(style);
      }

      var badges = document.querySelectorAll(".dwf-credit, .studio-badge");
      if (badges.length) {
        badges.forEach(function (b) {
          if (b.querySelector("strong")) {
            b.querySelector("strong").textContent = CREDIT;
          } else {
            b.textContent = CREDIT;
          }
          b.setAttribute("href", b.getAttribute("href") || "/");
          b.setAttribute("title", "Concept by DW Funnel · © " + YEAR);
        });
      } else if (!embed) {
        var a = document.createElement("a");
        a.className = "dwf-credit";
        a.href = "/";
        a.title = "Concept by DW Funnel · © " + YEAR;
        a.textContent = CREDIT;
        a.style.cssText =
          "position:fixed;right:14px;bottom:12px;z-index:9999;" +
          "font:600 10px/1.2 system-ui,sans-serif;letter-spacing:.05em;color:#fff;" +
          "text-decoration:none;background:rgba(0,0,0,.45);padding:8px 12px;" +
          "border:1px solid rgba(255,255,255,.18);backdrop-filter:blur(8px);" +
          "border-radius:999px";
        (document.body || document.documentElement).appendChild(a);
      }
    } catch (err) {}
  }

  function whenReady(fn) {
    if (document.body) fn();
    else document.addEventListener("DOMContentLoaded", fn, { once: true });
  }
  whenReady(applyProvenance);
  // Re-apply after late React mounts (e.g. Sable)
  setTimeout(function () {
    whenReady(applyProvenance);
  }, 1200);

  if (embed) return;

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

    whenReady(applyProvenance);
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
    document.fonts.ready
      .then(function () {
        setProgress(Math.max(progress, 0.55));
      })
      .catch(function () {});
  }

  requestAnimationFrame(tick);
})();
