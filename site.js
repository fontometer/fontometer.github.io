/* גופנומטר, the site: the light switch, the contact address, and the demo that plays
   a real result from the program. Everything works without it; this only adds motion. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (calm) root.classList.add("calm");
  const replay = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const fmt = (n) => n.toLocaleString("en-US");

  /* ---------- lights ---------- */
  const themeBtn = $("#theme");
  function paintTheme() {
    const dark = root.dataset.theme === "dark";
    const label = dark ? "מצב בהיר" : "מצב כהה";
    themeBtn.setAttribute("aria-pressed", dark);
    themeBtn.title = label;
    themeBtn.setAttribute("aria-label", label);
    $('meta[name="theme-color"]').content = dark ? "#161615" : "#F2F2EF";
  }
  paintTheme();
  themeBtn.addEventListener("click", () => {
    const flip = () => {
      root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
      paintTheme();
      try { localStorage.setItem("fontometer.theme", root.dataset.theme); } catch (e) { /* private mode */ }
    };
    if (!document.startViewTransition || calm) return flip();
    // the new lighting spreads in a circle from the switch
    const r = themeBtn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    root.style.setProperty("--fx", x + "px");
    root.style.setProperty("--fy", y + "px");
    root.style.setProperty("--fr", Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + "px");
    root.classList.add("flipping");
    document.startViewTransition(flip).finished.finally(() => root.classList.remove("flipping"));
  });

  /* ---------- the address: put together here, so it is not lying around in the page for collectors ---------- */
  const addr = ["hacker4960", "gmail.com"].join("@");
  const fine = matchMedia("(pointer: fine)").matches;     // a mouse: copy it; a phone: open the mail app
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      const t = Object.assign(document.createElement("textarea"), { value: text });
      document.body.append(t); t.select();
      const ok = document.execCommand("copy"); t.remove(); return ok;
    }
  }
  $$("a.mail").forEach((a) => {
    a.href = "mailto:" + addr;
    if (a.hasAttribute("data-show")) { a.textContent = addr; a.dir = "ltr"; }
    if (!fine) return;
    a.title = "לחיצה מעתיקה את הכתובת";
    a.addEventListener("click", async (e) => {
      e.preventDefault();
      if (a.classList.contains("copied") || !(await copy(addr))) return;
      const was = a.textContent, dir = a.dir;
      a.dir = "rtl";
      a.textContent = "הועתקה! הדביקו במייל";
      a.classList.add("copied");
      setTimeout(() => { a.textContent = was; a.dir = dir; a.classList.remove("copied"); }, 1800);
    });
  });

  /* ---------- the marker strokes run when they come into view ---------- */
  const seen = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add(e.target.matches(".hl") ? "on" : "in");
    seen.unobserve(e.target);
  }), { threshold: 0.6 });
  $$(".hl[data-swipe], .steps li").forEach((el) => seen.observe(el));

  /* ---------- the demo ---------- */
  const app = $("#demoApp");
  if (!app) return;
  const el = {
    res: $("#demoRes"), kicker: $("#demoKicker"), name: $("#demoName"), style: $("#demoStyle"), file: $("#demoFile"),
    score: $("#demoScore"), meter: $("#demoMeter"), track: $("#demoTrack"), stage: $("#demoStage"),
    typed: $("#demoTyped"), note: $("#demoNote"), viewer: $("#demoViewer"), font: $("#demoFont"), diff: $("#demoDiff"),
    list: $("#demoList"), seg: $("#demoSeg"), compare: $("#demoCompare"), again: $("#demoAgain"),
  };
  const gauges = [$("#barGauge"), $("#appGauge")];
  let data = {
    text: "מה הפונט הזה?", library: 1288,
    rows: $$(".row", el.list).map((r) => ({
      family: $(".row-name b", r).textContent, style: $(".row-name small", r).textContent,
      score: parseFloat($(".row-score", r).textContent), file: "",
    })),
    names: ["David", "Miriam", "Narkisim", "Arial", "Heebo", "Rubik", "Segoe UI", "Frank Ruhl Libre"],
  };
  data.rows[0].file = el.file.textContent;
  fetch("img/demo/demo.json").then((r) => r.json()).then((d) => {
    data = d;
    $$(".lib-count").forEach((n) => { n.textContent = fmt(d.library); });
  }).catch(() => { /* the numbers written in the page stand */ });

  // the wipe: drag the line, or use the arrows
  function setPos(p) {
    p = Math.min(1, Math.max(0, p));
    el.viewer.style.setProperty("--pos", p);
    el.viewer.setAttribute("aria-valuenow", Math.round(p * 100));
  }
  const posAt = (e) => { const r = el.viewer.getBoundingClientRect(); return (e.clientX - r.left) / r.width; };
  el.viewer.addEventListener("pointerdown", (e) => {
    if (el.viewer.dataset.mode !== "wipe") return;
    stopSweep();
    el.viewer.setPointerCapture(e.pointerId);
    el.viewer.classList.add("dragging");
    setPos(posAt(e));
  });
  el.viewer.addEventListener("pointermove", (e) => { if (el.viewer.classList.contains("dragging")) setPos(posAt(e)); });
  const release = () => el.viewer.classList.remove("dragging");
  el.viewer.addEventListener("pointerup", release);
  el.viewer.addEventListener("pointercancel", release);
  el.viewer.addEventListener("keydown", (e) => {
    const d = { ArrowLeft: -0.05, ArrowRight: 0.05 }[e.key];
    if (!d) return;
    e.preventDefault(); stopSweep();
    setPos(parseFloat(getComputedStyle(el.viewer).getPropertyValue("--pos")) + d);
  });
  let sweepRun = 0;
  const stopSweep = () => { sweepRun++; };
  async function sweep() {               // shows what the line is for: across and back to the middle
    if (calm) return;
    const run = ++sweepRun;
    const go = async (from, to, ms) => {
      const t0 = performance.now();
      while (run === sweepRun) {
        const k = Math.min(1, (performance.now() - t0) / ms), ease = k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
        setPos(from + (to - from) * ease);
        if (k === 1) return true;
        await new Promise(requestAnimationFrame);
      }
      return false;
    };
    await wait(500);
    (await go(.5, .9, 650)) && (await go(.9, .12, 900)) && (await go(.12, .5, 600));
  }
  el.seg.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    $$("button", el.seg).forEach((x) => x.classList.toggle("on", x === b));
    el.viewer.dataset.mode = b.dataset.mode;
    el.compare.classList.toggle("diff", b.dataset.mode === "diff");
  });

  // the score counts up, as in the program
  let countRun = 0;
  function countTo(to) {
    const run = ++countRun, from = calm ? to : 0, t0 = performance.now();
    const step = (now) => {
      if (run !== countRun) return;
      const k = Math.min(1, (now - t0) / 700);
      el.score.textContent = (from + (to - from) * (1 - (1 - k) ** 3)).toFixed(1);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function select(i, intro) {
    const r = data.rows[i];
    if (!r) return;
    const certain = i === 0 && data.verdict !== "similar";
    el.kicker.textContent = certain ? "זיהוי ודאי" : `מועמד ${i + 1}`;
    el.kicker.className = "kicker" + (certain ? " sure" : "");
    el.name.textContent = r.family;
    replay(el.name, "land");
    el.style.textContent = r.style;
    el.file.textContent = r.file || "";
    countTo(r.score);
    el.meter.style.setProperty("--v", (r.score / 100).toFixed(3));
    el.res.classList.toggle("certain", certain);
    el.res.classList.remove("slam");
    if (certain && intro && !calm) {
      replay(el.res, "slam");
      setTimeout(() => gauges.forEach((g) => g && replay(g, "flick")), 620);
    }
    el.font.src = `img/demo/font-${i + 1}.png`;
    el.diff.src = `img/demo/diff-${i + 1}.png`;
    $$(".row", el.list).forEach((row, k) => row.setAttribute("aria-selected", k === i));
    if (intro) sweep();
  }
  el.list.addEventListener("click", (e) => { const row = e.target.closest(".row"); if (row) select(+row.dataset.i - 1, false); });
  el.list.addEventListener("keydown", (e) => {
    const row = e.target.closest(".row");
    if (!row) return;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(+row.dataset.i - 1, false); }
    const d = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (d) { e.preventDefault(); const next = row.parentElement.children[+row.dataset.i - 1 + d]; if (next) { next.focus(); select(+next.dataset.i - 1, false); } }
  });
  // the images of the other candidates are small: have them ready before anyone clicks
  data.rows.forEach((_, i) => { new Image().src = `img/demo/font-${i + 1}.png`; new Image().src = `img/demo/diff-${i + 1}.png`; });

  /* the play: paste, type, search, land */
  let playing = 0;
  const busy = (on) => [app, ...gauges.map((g) => g && g.parentElement)].forEach((n) => n && n.classList.toggle("busy", on));
  async function play() {
    const run = ++playing;
    const live = () => run === playing;
    stopSweep();
    app.classList.remove("pasted", "reveal");
    app.classList.add("waiting");
    el.typed.textContent = "";
    el.typed.classList.add("caret");
    el.note.style.visibility = "hidden";
    $$(".shot-empty kbd", app).forEach((k) => k.classList.remove("down"));
    await wait(700); if (!live()) return;
    for (const k of $$(".shot-empty kbd", app)) { k.classList.add("down"); await wait(130); }
    await wait(220); if (!live()) return;
    $$(".shot-empty kbd", app).forEach((k) => k.classList.remove("down"));
    app.classList.add("pasted");
    await wait(650);
    for (const ch of data.text) {       // typed, a letter at a time
      if (!live()) return;
      el.typed.textContent += ch;
      await wait(ch === " " ? 120 : 65 + Math.random() * 50);
    }
    el.typed.classList.remove("caret");
    await wait(350); if (!live()) return;

    // searching: names roll past while the stages go by
    app.classList.remove("waiting");
    app.classList.add("rolling");
    busy(true);
    el.res.classList.remove("certain", "slam");
    el.kicker.textContent = "מחפש";
    el.kicker.className = "kicker";
    const stages = ["מחפש את האותיות בתמונה…", `מסנן ${fmt(data.library)} פונטים…`,
      "מחקה את הטקסט בפונטים המובילים ומודד כל אחד…", "מדייק את המובילים…"];
    let k = 0;
    const names = data.names && data.names.length ? data.names : ["…"];
    const roll = setInterval(() => { el.name.textContent = names[k++ % names.length]; replay(el.name, "tick"); }, 95);
    for (let s = 0; s < stages.length; s++) {
      el.stage.textContent = stages[s];
      el.track.parentElement.style.setProperty("--p", (s + 1) / stages.length);
      el.track.style.transform = `scaleX(${(s + 1) / stages.length})`;
      await wait(s === 1 ? 900 : 700);
      if (!live()) { clearInterval(roll); return; }
    }
    clearInterval(roll);
    busy(false);
    app.classList.remove("rolling");
    el.track.style.transform = "";
    el.note.style.visibility = "";
    replay(app, "reveal");
    select(0, true);
  }
  el.again.addEventListener("click", () => {
    $$("button", el.seg)[0].click();
    play();
  });

  // plays once, the first time it is well in view
  if (!calm && "IntersectionObserver" in window) {
    const watch = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { watch.disconnect(); play(); }
    }, { threshold: 0.45 });
    watch.observe(app);
    // until then it waits, empty, like the program before a paste
    app.classList.remove("pasted");
    app.classList.add("waiting");
    el.typed.textContent = "";
  }
})();
