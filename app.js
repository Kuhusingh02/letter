/* ============================================================
   A Letter Forward — by AmberMind
   Flow: write → Amber reflects → seal → sealed.
   Vanilla JS, no build, no backend.
   ============================================================ */
(function () {
  "use strict";

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const prefersReduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Backend: Supabase edge function that stores the letter for scheduled delivery.
  // The anon key is a public, publishable key — safe to ship in the browser.
  const API = {
    url: "https://giwtvsalstlbyzjlvtbk.supabase.co/functions/v1/seal-letter",
    anon: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdpd3R2c2Fsc3RsYnl6amx2dGJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU4MjMzNjgsImV4cCI6MjA0MTM5OTM2OH0.Wp8GB64f0xgNP8UKYwyfhHpsDHLc3IktPRPwqeE7Kto",
  };

  const els = {
    letter:   $("[data-letter]"),
    count:    $("[data-count]"),
    date:     $("[data-date]"),
    docDate:  $("[data-doc-date]"),
    sheet:    $("[data-sheet]"),
    reflect:  $("[data-reflect]"),
    email:    $("[data-email]"),
    emailErr: $("[data-email-error]"),
    sealForm: $("[data-seal-form]"),
    sealBtn:  $("[data-action='seal']"),
    envelope: $("[data-envelope]"),
    reflectBy: $("[data-reflect-by]"),
    sealedWrap: $(".sealed"),
    toast:    $("[data-toast]"),
    mute:     $("[data-mute]"),
    arrivePretty: $("[data-arrive-pretty]"),
    sealedEmail:  $("[data-sealed-email]"),
    sealedDate:   $("[data-sealed-date]"),
  };

  const state = { letter: "", arrive: null };

  /* ---------------- toast ---------------- */
  let toastTimer = null;
  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add("is-shown");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove("is-shown"), 2600);
  }

  /* ---------------- share ---------------- */
  async function shareApp() {
    const url = location.origin + location.pathname;
    const data = {
      title: "A Letter Forward",
      text: "Write a letter to your future self — it lands in your inbox in six months. Made a friend's day yet?",
      url,
    };
    try {
      if (navigator.share) { await navigator.share(data); return; }
      await navigator.clipboard.writeText(url);
      toast("Link copied — go make their day 💌");
    } catch (_) {
      // user dismissed the share sheet, or clipboard blocked — stay quiet
    }
  }

  /* ---------------- screens ---------------- */
  function show(name) {
    $$(".screen").forEach((s) => s.classList.toggle("is-active", s.dataset.screen === name));
    window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" });
  }

  /* ---------------- dates ---------------- */
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const FULL   = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

  function parseISO(s) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  function pretty(d) { return `${FULL[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; }

  function initDates() {
    const now = new Date();
    const six = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate());
    els.date.value = iso(six);
    els.date.min   = iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
    els.docDate.textContent = `${MONTHS[now.getMonth()]} · ${now.getFullYear()}`;
    state.arrive = six;
  }

  els.date.addEventListener("change", () => {
    state.arrive = els.date.value ? parseISO(els.date.value) : state.arrive;
  });

  /* ---------------- word counter ---------------- */
  function words(t) { return (t.trim().match(/\S+/g) || []).length; }
  els.letter.addEventListener("input", () => {
    els.count.textContent = words(els.letter.value);
  });

  /* ============================================================
     Typewriter sound (WebAudio, synthesized — no assets)
     ============================================================ */
  let audioCtx = null, muted = localStorage.getItem("lf-muted") === "1";
  els.mute.setAttribute("aria-pressed", String(!muted));

  function ctx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function clack() {
    if (muted) return;
    const c = ctx(), t = c.currentTime;
    const len = Math.floor(c.sampleRate * 0.03);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
    const src = c.createBufferSource(); src.buffer = buf;
    const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1750; bp.Q.value = 0.9;
    const g = c.createGain(); g.gain.value = 0.07;
    src.connect(bp).connect(g).connect(c.destination);
    src.start(t);
  }

  function ding() {
    if (muted) return;
    const c = ctx(), t = c.currentTime;
    const o = c.createOscillator(); o.type = "sine"; o.frequency.value = 1280;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + 0.3);
  }

  /* low, soft press for the wax stamp */
  function thud() {
    if (muted) return;
    const c = ctx(), t = c.currentTime;
    const o = c.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(210, t);
    o.frequency.exponentialRampToValueAtTime(88, t + 0.18);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.13, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + 0.34);
    // muffled "crack" of the wax
    const len = Math.floor(c.sampleRate * 0.05);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const src = c.createBufferSource(); src.buffer = buf;
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 850;
    const g2 = c.createGain(); g2.gain.value = 0.08;
    src.connect(lp).connect(g2).connect(c.destination); src.start(t);
  }

  const PRINTABLE = /^.$/u;
  els.letter.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      ding();
      if (!prefersReduced) {
        els.sheet.classList.remove("is-return");
        void els.sheet.offsetWidth;      // restart animation
        els.sheet.classList.add("is-return");
      }
    } else if (e.key === "Backspace" || PRINTABLE.test(e.key)) {
      clack();
    }
  });
  els.sheet.addEventListener("animationend", () => els.sheet.classList.remove("is-return"));

  els.mute.addEventListener("click", () => {
    muted = !muted;
    els.mute.setAttribute("aria-pressed", String(!muted));
    localStorage.setItem("lf-muted", muted ? "1" : "0");
    if (!muted) ding();
  });

  /* ============================================================
     Amber's reflection — reads the letter, answers in one line
     ============================================================ */
  const THEMES = [
    { key: "pride", rx: /\b(proud|grew|grow(th|n)?|better|stronger|accomplish\w*|achiev\w*|progress|overcame|overcome|healed?|survived|made it|figured? out|learn\w*)\b/i, lines: [
      "I hope future-you reads this and feels proud of how far you've come.",
      "Whatever you were reaching for when you wrote this — I hope you're holding it now.",
      "The growth you were hoping for rarely announces itself. I hope, looking back, you can see it clearly." ] },
    { key: "fear", rx: /\b(scared|afraid|anxious|anxiety|worr(y|ied)|nervous|fear\w*|uncertain|unsure|lost|overwhelm\w*|doubt\w*|stuck|hard|difficult|struggl\w*)\b/i, lines: [
      "Whatever you were afraid of that day — I hope it turned out softer than you feared.",
      "The version of you reading this made it through. That was never guaranteed, and you did it anyway.",
      "You were carrying something heavy when you wrote this. I hope your arms feel lighter now." ] },
    { key: "love", rx: /\b(love|loved|him|her|them|partner|boyfriend|girlfriend|husband|wife|marriage|married|relationship|heart|together|family|friend\w*|kids?|children|mom|dad)\b/i, lines: [
      "I hope the people you were thinking of are still close, and that you told them so.",
      "Whatever your heart was full of that day — I hope it's still there when you read this.",
      "The people who matter have a way of staying. I hope yours did." ] },
    { key: "work", rx: /\b(job|work\w*|career|promotion|business|startup|start-up|launch\w*|quit|boss|money|save|savings|goal\w*|project|company|interview|apply\w*|study\w*|exam|degree|school)\b/i, lines: [
      "I hope the thing you were building is further along than you dared to expect.",
      "Six months of small, unglamorous days got you here. I hope future-you remembers that.",
      "The work you were putting in quietly — I hope it's started to show." ] },
    { key: "health", rx: /\b(health\w*|body|weight|gym|run(ning)?|sleep|rest|sober|therapy|heal\w*|calm|peace|energy|tired|burn(t|ed)? out|breathe?)\b/i, lines: [
      "I hope you were gentler with your body and your mind than you'd planned to be.",
      "The care you were trying to give yourself — I hope it stuck.",
      "You were trying to feel more like yourself. I hope you've gotten closer." ] },
  ];

  const DEFAULT_LINES = [
    "Six months ago you took a quiet moment to write to yourself. I hope it finds you well.",
    "Whatever today looks like, someone earlier believed you'd get here. They were right.",
    "You wrote this not knowing how things would go. I hope the not-knowing was worth it.",
  ];

  function reflectionFor(text) {
    let best = null, top = 0;
    for (const th of THEMES) {
      const hits = (text.match(new RegExp(th.rx.source, "gi")) || []).length;
      if (hits > top) { top = hits; best = th; }
    }
    const pool = best ? best.lines : DEFAULT_LINES;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  let typeTimer = null;
  function typeOut(node, str, onDone) {
    clearTimeout(typeTimer);
    node.textContent = "";
    node.classList.remove("is-done");
    if (prefersReduced) {
      node.textContent = str; node.classList.add("is-done");
      if (onDone) onDone();
      return;
    }
    let i = 0;
    (function step() {
      node.textContent = str.slice(0, i);
      if (i <= str.length) {
        if (str[i - 1] && str[i - 1] !== " ") clack();
        i++;
        typeTimer = setTimeout(step, 34 + Math.random() * 40);
      } else {
        node.classList.add("is-done");
        if (onDone) onDone();
      }
    })();
  }

  /* ============================================================
     Flow wiring
     ============================================================ */
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const act = btn.dataset.action;

    if (act === "to-reflect") {
      state.letter = els.letter.value.trim();
      if (words(state.letter) < 3) {
        els.letter.focus();
        els.letter.placeholder = "Even a few words is enough — start with “Dear future me…”";
        if (!prefersReduced) { els.sheet.classList.add("is-return"); }
        return;
      }
      state.reflection = reflectionFor(state.letter);
      els.reflectBy.classList.remove("is-shown");
      show("reflect");
      typeOut(els.reflect, state.reflection, () => {
        setTimeout(() => els.reflectBy.classList.add("is-shown"), 260);
      });
    }

    if (act === "back-write")   show("write");
    if (act === "back-reflect") show("reflect");
    if (act === "share")        shareApp();

    if (act === "to-seal") {
      els.arrivePretty.textContent = pretty(state.arrive);
      show("seal");
      setTimeout(() => els.email.focus(), 400);
    }

    if (act === "write-another") {
      els.letter.value = "";
      els.count.textContent = "0";
      els.email.value = "";
      els.envelope.classList.remove("is-sealing");
      els.sealedWrap.classList.remove("is-revealed");
      els.reflectBy.classList.remove("is-shown");
      initDates();
      show("write");
      setTimeout(() => els.letter.focus(), 400);
    }
  });

  /* seal submit → store the letter for real delivery, then play the seal */
  let sealing = false;
  const EMAIL_ERR = "That doesn't look like an email — mind checking?";
  els.sealForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (sealing) return;
    const email = els.email.value.trim();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!ok) {
      els.emailErr.textContent = EMAIL_ERR;
      els.email.parentElement.classList.add("is-invalid");
      els.emailErr.hidden = false;
      els.email.focus();
      return;
    }
    els.email.parentElement.classList.remove("is-invalid");
    els.emailErr.hidden = true;

    // send it to the backend, which schedules delivery on the arrival date
    sealing = true;
    const btnHtml = els.sealBtn.innerHTML;
    els.sealBtn.disabled = true;
    els.sealBtn.textContent = "Sealing…";

    let stored = false;
    try {
      const res = await fetch(API.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": API.anon,
          "Authorization": "Bearer " + API.anon,
        },
        body: JSON.stringify({
          email,
          body: state.letter,
          reflection: state.reflection || null,
          arrive_date: iso(state.arrive),
        }),
      });
      stored = res.ok;
    } catch (_) { stored = false; }

    // local backup regardless, so a network blip never loses the letter
    try {
      const box = JSON.parse(localStorage.getItem("lf-letters") || "[]");
      box.push({ email, arrive: iso(state.arrive), body: state.letter, stored, sealedAt: iso(new Date()) });
      localStorage.setItem("lf-letters", JSON.stringify(box));
    } catch (_) {}

    els.sealBtn.disabled = false;
    els.sealBtn.innerHTML = btnHtml;
    sealing = false;

    if (!stored) {
      els.emailErr.textContent = "Couldn't seal it just now — check your connection and try again.";
      els.email.parentElement.classList.add("is-invalid");
      els.emailErr.hidden = false;
      return;
    }

    els.sealedEmail.textContent = email;
    els.sealedDate.textContent = pretty(state.arrive);
    show("sealed");

    // orchestrate the sealing: envelope glides in → wax stamps → text reveals
    els.sealedWrap.classList.remove("is-revealed");
    els.envelope.classList.remove("is-sealing");
    void els.envelope.offsetWidth;              // flush the removal so the animation restarts
    els.envelope.classList.add("is-sealing");
    if (prefersReduced) {
      els.sealedWrap.classList.add("is-revealed");
    } else {
      setTimeout(thud, 900);                                     // the press
      setTimeout(() => els.sealedWrap.classList.add("is-revealed"), 1150);
    }
  });

  els.email.addEventListener("input", () => {
    els.email.parentElement.classList.remove("is-invalid");
    els.emailErr.hidden = true;
  });

  /* ---------------- boot ---------------- */
  initDates();
  setTimeout(() => els.letter.focus(), 500);
})();
