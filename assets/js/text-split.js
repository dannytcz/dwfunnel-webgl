/** Two-level headline split: word wrappers, char spans inside. */
export function splitHeadlineWords(el) {
  if (!el || el.dataset.split === "1") return;
  const text = el.textContent.trim();
  el.textContent = "";
  el.dataset.split = "1";
  const words = text.split(/\s+/).filter(Boolean);
  words.forEach((word, wi) => {
    if (wi > 0) el.appendChild(document.createTextNode(" "));
    const wordSpan = document.createElement("span");
    wordSpan.className = "word";
    wordSpan.style.display = "inline-block";
    wordSpan.style.whiteSpace = "nowrap";
    for (const ch of word) {
      const charSpan = document.createElement("span");
      charSpan.className = "char";
      charSpan.textContent = ch;
      wordSpan.appendChild(charSpan);
    }
    el.appendChild(wordSpan);
  });
}

/** Line split with word-safe inner structure for animated line reveals. */
export function splitLinesWords(el) {
  if (!el || el.dataset.split) return;
  const text = el.textContent.trim();
  el.dataset.split = "1";
  el.innerHTML = "";
  const parts = text.split(". ").filter(Boolean);
  parts.forEach((part, i) => {
    const line = document.createElement("span");
    line.className = "line";
    line.style.display = "block";
    const inner = document.createElement("span");
    inner.className = "line-inner";
    inner.style.display = "block";
    const sentence = part + (i < parts.length - 1 ? "." : "");
    const words = sentence.split(/\s+/).filter(Boolean);
    words.forEach((word, wi) => {
      if (wi > 0) inner.appendChild(document.createTextNode(" "));
      const wordSpan = document.createElement("span");
      wordSpan.className = "word";
      wordSpan.style.display = "inline-block";
      wordSpan.style.whiteSpace = "nowrap";
      wordSpan.textContent = word;
      inner.appendChild(wordSpan);
    });
    line.appendChild(inner);
    el.appendChild(line);
  });
}
