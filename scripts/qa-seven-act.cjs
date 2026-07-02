// QA checklist for seven act refactor
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "cinema.html"), "utf8");
const css = fs.readFileSync(path.join(root, "assets/css/cinema.css"), "utf8");
const jsFiles = [
  "assets/js/cinema-app.js",
  "assets/js/hero-pin.js",
  "assets/js/machine-pin.js",
  "assets/js/motion-ui.js",
  "assets/js/sections.js",
].map((f) => fs.readFileSync(path.join(root, f), "utf8"));

const all = html + css + jsFiles.join("\n");

console.log("=== PLACEHOLDER grep ===");
const lines = all.split("\n");
lines.forEach((line, i) => {
  if (line.includes("PLACEHOLDER")) {
    const file =
      i < html.split("\n").length
        ? "cinema.html"
        : jsFiles.findIndex(() => false);
    console.log(`  ${line.trim().slice(0, 100)}`);
  }
});
html.split("\n").forEach((line, i) => {
  if (line.includes("PLACEHOLDER")) console.log(`  cinema.html:${i + 1}: ${line.trim()}`);
});

console.log("\n=== Em/en dash in cinema.html visible text (excluding comments) ===");
const visible = html.replace(/<!--[\s\S]*?-->/g, "");
const dashMatches = visible.match(/[—–]/g);
console.log("  count:", dashMatches ? dashMatches.length : 0);

console.log("\n=== CTA labels ===");
const mapCount = (html.match(/Map My Funnel/g) || []).length;
const sendCount = (html.match(/Send Me My Funnel Plan/g) || []).length;
const waCount = (html.match(/Message On WhatsApp/g) || []).length;
console.log(`  Map My Funnel: ${mapCount}`);
console.log(`  Message On WhatsApp: ${waCount}`);
console.log(`  Send Me My Funnel Plan (should be 0): ${sendCount}`);

console.log("\n=== Stats in HTML (no-JS fallback) ===");
["47", "120+", "0.9s"].forEach((s) => {
  console.log(`  ${s}: ${html.includes(s) ? "OK" : "MISSING"}`);
});

console.log("\n=== Daphne Wong mentions ===");
const daphne = (html.match(/Daphne Wong/g) || []).length;
console.log(`  count: ${daphne} (expect 1)`);

console.log("\n=== Roman numerals i/ii/iii ===");
const roman = html.match(/\b(i{1,3}|iv|v)\./gi);
console.log("  count:", roman ? roman.length : 0);
