/**
 * DW Funnel branded boot loader + provenance for concept demos.
 * Studio Bench lightbox (?embed=1&lightbox=1): branded boot, rem scale, credit visible.
 * Capture (?preview=1): no boot UI. Provenance always applies.
 */
(function () {
  var YEAR = String(new Date().getFullYear());
  var CREDIT = "Built by DW Funnel · © " + YEAR;
  var embed = false;
  var lightbox = false;
  var preview = false;
  try {
    var q = new URLSearchParams(location.search);
    preview = q.has("preview");
    embed = q.has("embed") || preview;
    lightbox = q.has("lightbox");
  } catch (e) {}

  if (lightbox) window.__DWF_LIGHTBOX__ = true;

  function demoSlug() {
    var m = location.pathname.match(/\/demos\/([^/.]+)/);
    return m ? m[1] : "";
  }

  var LIGHTBOX_NO_SCROLL = { kanevoss: 1, elyra: 1 };
  var LIGHTBOX_PAGE_SCROLL = { newshift: 1 };
  var LIGHTBOX_CINEMATIC = { unwritten: 1, reverie: 1 };
  var LIGHTBOX_CINEMATIC_HALF = 10000;
  var LIGHTBOX_SCROLL_OPTS = {
    aurelia: { cycle: 50400 },
    auren: { startDelay: 8000 },
    alzer: { startDelayAfterIntro: 4000 },
    thebrew: { heroOnly: true },
  };

  function notifyParent(type) {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: type, href: location.href }, "*");
      }
    } catch (err) {}
  }

  function setupEmbedShell() {
    if (!embed) return;
    var html = document.documentElement;
    html.classList.add("is-embed");
    if (lightbox) html.classList.add("is-lightbox");
    var m = location.pathname.match(/\/demos\/([^/.]+)/);
    if (m) html.setAttribute("data-dwf-demo", m[1]);

    if (!document.getElementById("dwf-embed-css")) {
      var link = document.createElement("link");
      link.id = "dwf-embed-css";
      link.rel = "stylesheet";
      link.href = "/assets/css/dwf-embed.css?v=15";
      (document.head || html).appendChild(link);
    }
  }
  setupEmbedShell();

  function setupCinematicLightbox() {
    if (!lightbox || preview) return;
    var demo = demoSlug();
    if (!LIGHTBOX_CINEMATIC[demo]) return;
    if (document.getElementById("dwf-embed-autoscroll")) return;
    window.__DWF_AUTOSCROLL__ = true;

    var HALF = LIGHTBOX_CINEMATIC_HALF;
    var CYCLE = HALF * 2;
    var startedAt = 0;

    function setProgress(p) {
      window.__DWF_CINEMATIC_P__ = p;
      window.dispatchEvent(new CustomEvent("dwf:cinematic", { detail: { p: p } }));
    }

    function tick(now) {
      if (!startedAt) startedAt = now;
      var t = (now - startedAt) % CYCLE;
      var p = t < HALF ? t / HALF : 1 - (t - HALF) / HALF;
      setProgress(p);
      window.requestAnimationFrame(tick);
    }

    function start() {
      window.requestAnimationFrame(tick);
    }

    if (document.readyState === "complete") window.setTimeout(start, 2200);
    else window.addEventListener("load", function () { window.setTimeout(start, 2200); }, { once: true });
  }

  function setupLightboxAutoscroll() {
    if (!lightbox || preview) return;
    var demo = demoSlug();
    if (LIGHTBOX_NO_SCROLL[demo] || LIGHTBOX_PAGE_SCROLL[demo] || LIGHTBOX_CINEMATIC[demo]) return;
    if (document.getElementById("dwf-embed-autoscroll")) return;
    window.__DWF_AUTOSCROLL__ = true;

    var opts = LIGHTBOX_SCROLL_OPTS[demo] || {};
    var scrollCap = 1;
    var CYCLE = opts.cycle || 42000;
    var startedAt = 0;
    var lastNow = 0;
    var currentY = 0;
    var maxY = 0;
    var lastMaxCheck = 0;

    function refreshMax(now) {
      if (now - lastMaxCheck < 350) return;
      lastMaxCheck = now;
      if (opts.heroOnly) {
        var hero = document.querySelector(".hero") || document.getElementById("home");
        maxY = hero ? Math.max(0, hero.offsetHeight - window.innerHeight) : 0;
      } else {
        maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      }
    }

    function setScrollY(y) {
      var lenis = window.__dwfLenis || window.lenis;
      if (lenis && typeof lenis.scrollTo === "function") {
        lenis.scrollTo(y, { immediate: true, force: true, lock: true });
      } else {
        document.documentElement.scrollTop = y;
        document.body.scrollTop = y;
      }
      if (window.ScrollTrigger && typeof window.ScrollTrigger.update === "function") {
        window.ScrollTrigger.update();
      }
    }

    function tick(now) {
      if (!startedAt) {
        startedAt = now;
        lastNow = now;
      }
      refreshMax(now);
      if (maxY < 8) {
        window.requestAnimationFrame(tick);
        return;
      }
      var dt = Math.min(48, Math.max(8, now - lastNow));
      lastNow = now;
      var t = ((now - startedAt) % CYCLE) / CYCLE;
      var wave = (1 - Math.cos(t * Math.PI * 2)) / 2;
      var targetY = wave * maxY * scrollCap;
      var alpha = 1 - Math.exp(-2.4 * dt / 1000);
      currentY += (targetY - currentY) * alpha;
      setScrollY(currentY);
      window.requestAnimationFrame(tick);
    }

    function start() {
      window.requestAnimationFrame(tick);
    }

    function scheduleStart() {
      var delay = opts.startDelay || 2200;
      if (opts.startDelayAfterIntro) {
        var started = false;
        function go() {
          if (started) return;
          started = true;
          window.setTimeout(start, opts.startDelayAfterIntro);
        }
        if (window.__DWF_LIGHTBOX_SCROLL_READY__) go();
        else window.addEventListener("dwf:scroll-ready", go, { once: true });
        window.setTimeout(go, 18000);
        return;
      }
      window.setTimeout(start, delay);
    }

    if (document.readyState === "complete") scheduleStart();
    else window.addEventListener("load", scheduleStart, { once: true });
  }
  setupCinematicLightbox();
  setupLightboxAutoscroll();

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
          ".dwf-credit,.studio-badge,.studio-badge strong{z-index:2147482000;font-size:0.75rem;line-height:1.2}";
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
          if (embed && lightbox) {
            b.setAttribute("target", "_parent");
            b.setAttribute("rel", "noopener");
          }
        });
      } else if (!preview) {
        var a = document.createElement("a");
        a.className = "dwf-credit";
        a.href = "/";
        a.title = "Concept by DW Funnel · © " + YEAR;
        a.textContent = CREDIT;
        if (embed && lightbox) {
          a.target = "_parent";
          a.rel = "noopener";
        }
        a.style.cssText =
          "position:fixed;right:0.875rem;bottom:0.75rem;z-index:2147482000;" +
          "font:600 0.75rem/1.2 system-ui,sans-serif;letter-spacing:.05em;color:#fff;" +
          "text-decoration:none;background:rgba(0,0,0,.45);padding:0.6rem 0.9rem;" +
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
  setTimeout(function () {
    whenReady(applyProvenance);
  }, 1200);
  setTimeout(function () {
    whenReady(applyProvenance);
  }, 2800);

  var runBoot = !preview && (!embed || lightbox);
  if (!runBoot) return;

  if (window.__DWF_BOOT__) return;
  window.__DWF_BOOT__ = true;

  notifyParent("dwf:booting");

  var css =
    "#dwf-boot{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;" +
    "background:#050505;color:#e8dfd2;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;" +
    "letter-spacing:.14em;text-transform:uppercase;transition:opacity .55s cubic-bezier(.22,1,.36,1),visibility .55s}" +
    "#dwf-boot.is-done{opacity:0;visibility:hidden;pointer-events:none}" +
    "#dwf-boot .dwf-boot__panel{width:min(20rem,calc(100vw - 3rem));text-align:left}" +
    "#dwf-boot .dwf-boot__brand{margin:0 0 1rem;font-size:.72rem;font-weight:600;color:#e8dfd2}" +
    "#dwf-boot .dwf-boot__brand span{color:#f2a84a}" +
    "#dwf-boot .dwf-boot__track{height:1px;background:rgba(232,223,210,.16);overflow:hidden}" +
    "#dwf-boot .dwf-boot__fill{height:100%;width:0;background:linear-gradient(90deg,#c9442d,#f2a84a);" +
    "box-shadow:0 0 16px rgba(201,68,45,.45);transition:width .12s linear}" +
    "#dwf-boot .dwf-boot__row{display:flex;justify-content:space-between;gap:1rem;margin-top:.875rem;" +
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
    '<div class="dwf-boot__row"><span id="dwf-boot-status">Opening studio</span><span class="dwf-boot__pct" id="dwf-boot-pct">0%</span></div>' +
    "</div>";

  var BOOT_STAGES = [
    [0.4, "Opening studio"],
    [0.75, "Setting the stage"],
    [0.99, "Cueing motion"],
    [1, "Almost ready"],
  ];
  var BOOT_WAITING = [
    "Almost ready",
    "Finishing touches",
    "Polishing frames",
    "Syncing motion",
    "Opening now",
  ];

  function bootStatusLabel(p) {
    var clamped = Math.max(0, Math.min(1, p));
    for (var i = 0; i < BOOT_STAGES.length; i++) {
      if (clamped <= BOOT_STAGES[i][0]) return BOOT_STAGES[i][1];
    }
    return BOOT_STAGES[BOOT_STAGES.length - 1][1];
  }

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
  var status = root.querySelector("#dwf-boot-status");
  var progress = 0;
  var loaded = document.readyState === "complete";
  var minMs = lightbox ? 1100 : 900;
  var maxMs = lightbox ? 4500 : 3200;
  var started = performance.now();
  var done = false;
  var rotateTimer = null;
  var waitingTick = 0;

  function stopWaitingRotate() {
    if (!rotateTimer) return;
    clearInterval(rotateTimer);
    rotateTimer = null;
  }

  function startWaitingRotate() {
    if (rotateTimer) return;
    waitingTick = 0;
    if (status) status.textContent = BOOT_WAITING[0];
    rotateTimer = setInterval(function () {
      waitingTick += 1;
      if (status) status.textContent = BOOT_WAITING[waitingTick % BOOT_WAITING.length];
    }, 1200);
  }

  function setProgress(p) {
    progress = Math.max(progress, Math.min(1, p));
    var v = Math.round(progress * 100);
    if (fill) fill.style.width = v + "%";
    if (pct) pct.textContent = v + "%";
    if (progress >= 0.99) {
      startWaitingRotate();
    } else {
      stopWaitingRotate();
      waitingTick = 0;
      if (status) status.textContent = bootStatusLabel(progress);
    }
    notifyParent("dwf:progress");
  }

  function tick() {
    if (done) return;
    var elapsed = performance.now() - started;
    var soft = Math.min(0.99, elapsed / 1400);
    if (loaded) soft = Math.max(soft, 0.99);
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
    stopWaitingRotate();
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
    notifyParent("dwf:ready");
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
