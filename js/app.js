(function () {
  "use strict";

  // ================================================================ state
  const store = {
    get(k, d) { try { const v = localStorage.getItem("k100:" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("k100:" + k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
  };
  const RACE_KEY = document.body.dataset.race;
  const R = window.RACES[RACE_KEY];
  const params = new URLSearchParams(location.search);
  const saved = store.get("prefs", null);
  const pick = (k, ok) => { const v = params.get(k) || (saved && saved[k]); return ok.includes(v) ? v : "all"; };
  const S = { race: RACE_KEY, role: pick("role", ["runner", "crew", "all"]), team: pick("team", ["solo", "team", "all"]) };
  const firstVisit = !params.has("role") && !saved;
  const lastPos = store.get("pos-" + RACE_KEY, null); // read before anything overwrites it
  store.set("prefs", { race: S.race, role: S.role, team: S.team });

  const ROLE_TXT = { runner: "Runner", crew: "Crew", all: "Runner + crew" };
  const TEAM_TXT = { solo: "Solo runner", team: "Relay team", all: "Solo + team" };

  // tag matcher: groups race / role / team; a group only constrains when present
  const G = { race: ["100", "50", "50k"], role: ["runner", "crew"], team: ["solo", "team"] };
  function fits(on) {
    if (!on) return true;
    const t = on.split(/\s+/);
    for (const g of Object.keys(G)) {
      const mine = t.filter((x) => G[g].includes(x));
      if (!mine.length) continue;
      if (g !== "race" && S[g] === "all") continue;
      if (!mine.includes(S[g])) return false;
    }
    return true;
  }
  const locTags = (l) => [l.on || "", l.kind === "team" ? "team" : "", l.kind === "indiv" ? "solo" : ""].join(" ").trim();
  const START = R.startMM;
  const inRace = (mm) => mm <= START + 0.01;
  const runnerOnly = S.role === "runner";

  // drop 100-mile-only sentences on the shorter races
  const strip100 = (t) => (S.race === "100" || !t ? t : t.replace(/100[- ]mile cutoff:[^.]*\.\s*/gi, "").replace(/Leaving (MM 50 )?after 4:30pm\?[^.]*\.\s*/g, "").replace(/Pacers may join[^.]*\(100 mile\)\.\s*/g, "").trim());
  const OVERRIDE = {
    "50": { mm: 50, kind: "start", title: "50-mile start — Marathon Garden Club",
      text: "50-milers do NOT park here. Park in the Winn‑Dixie lot only, just north of the traffic light on the OCEAN side, and walk across at the light. No exceptions.", rtext: "" },
    "50k": { mm: 31, kind: "start", title: "50K start — Lower Keys Chamber of Commerce", rtext: "" },
  };
  // stable per-location keys for saved/shared plans: the mile marker, plus _1, _2… for repeats
  const seenMM = {};
  window.LOCATIONS.forEach((l) => { const k = String(l.mm); seenMM[k] = (seenMM[k] || 0) + 1; l.key = seenMM[k] > 1 ? `${k}_${seenMM[k] - 1}` : k; });
  const LOC = window.LOCATIONS.filter((l) => inRace(l.mm) && fits(locTags(l))).map((l) => {
    const o = Object.assign({}, l, { text: strip100(l.text), rtext: strip100(l.rtext) });
    const ov = OVERRIDE[S.race];
    if (ov && l.mm === ov.mm && (l.kind === "timing" || l.kind === "meet")) Object.assign(o, ov, { mm: l.mm });
    return o;
  });
  LOC.forEach((l, i) => (l.id = i));
  const LOCBYKEY = {}; LOC.forEach((l) => { if (!LOCBYKEY[l.key]) LOCBYKEY[l.key] = l; });
  const pickable = (l) => l.meet && l.kind !== "start" && l.kind !== "finish" && l.mm < START - 0.05;

  // ---- your own plan: picked crew stops + notes, saved per race on this device, shareable by link
  const MYKEY = "myplan-" + S.race;
  const my = Object.assign({ stops: {}, notes: "" }, store.get(MYKEY, {}));
  const saveMy = () => store.set(MYKEY, my);
  const isPicked = (k) => !!(my.stops[k] && my.stops[k].on);
  const noteOf = (k) => (my.stops[k] && my.stops[k].note) || "";
  const pickedLocs = () => LOC.filter((l) => pickable(l) && isPicked(l.key));
  // ---- distance to the next meet-up (and the next stop in your plan); MM ≈ miles to the finish
  const meetStops = LOC.filter(pickable).sort((a, b) => b.mm - a.mm);
  const nextMeet = (mm) => meetStops.find((l) => l.mm < mm - 0.05) || null;
  const nextPlanned = (mm) => meetStops.find((l) => l.mm < mm - 0.05 && isPicked(l.key)) || null;
  const mi = (v) => `${Math.max(0, v).toFixed(1)} mi`;
  const hasNext = (l) => pickable(l) || l.kind === "start" || l.kind === "timing";
  function nextTxt(mm, withPlan) {
    const n = nextMeet(mm);
    let h = n ? `Next meet-up <b>${mi(mm - n.mm)}</b> · MM ${n.label}` : `Finish in <b>${mi(mm)}</b>`;
    if (withPlan && pickedLocs().length) {
      const p = nextPlanned(mm);
      if (p !== n) h += p ? ` · <span class="nx-plan">next in our plan <b>${mi(mm - p.mm)}</b> · MM ${p.label}</span>` : ` · <span class="nx-plan">no more plan stops</span>`;
      else if (p) h = `Next meet-up <span class="nx-plan">(in our plan)</span> <b>${mi(mm - n.mm)}</b> · MM ${n.label}`;
    }
    return h;
  }
  const nextLine = (l) => (hasNext(l) ? `<div class="n nx" data-nx="${l.mm}">→ ${nextTxt(l.mm, true)}</div>` : "");
  const refreshNext = () => document.querySelectorAll(".nx[data-nx]").forEach((el) => (el.innerHTML = "→ " + nextTxt(+el.dataset.nx, true)));
  const sharedCode = location.hash.startsWith("#plan=") ? location.hash.slice(6) : null;
  if (sharedCode) history.replaceState(null, "", location.pathname + location.search);
  const CH = window.CHAPTERS.filter((c) => c.to < START - 0.5).map((c) => Object.assign({}, c, { from: Math.min(c.from, START) }));
  LOC.forEach((l) => (l.chapter = (CH.find((c) => l.mm <= c.from + 0.01 && l.mm > c.to) || {}).id));

  const isDesktop = () => window.matchMedia("(min-width: 900px)").matches;
  const topbarH = () => document.querySelector(".topbar").offsetHeight;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  // drop inline [data-on] bits that don't apply
  function prune(html) {
    const t = document.createElement("template");
    t.innerHTML = html;
    t.content.querySelectorAll("[data-on]").forEach((el) => { if (!fits(el.dataset.on)) el.remove(); });
    return t.innerHTML;
  }

  // ================================================================ geometry
  const ROUTE = window.ROUTE, ANCH = window.MM_ANCHORS;
  function mmToDist(mm) {
    if (mm <= ANCH[0][0]) return ANCH[0][1];
    for (let i = 1; i < ANCH.length; i++) {
      const [m1, d1] = ANCH[i - 1], [m2, d2] = ANCH[i];
      if (mm <= m2) return d1 + (d2 - d1) * (mm - m1) / (m2 - m1);
    }
    return ANCH[ANCH.length - 1][1];
  }
  function distToLatLng(d) {
    let lo = 0, hi = ROUTE.length - 1;
    if (d >= ROUTE[0][2]) return [ROUTE[0][0], ROUTE[0][1]];
    if (d <= ROUTE[hi][2]) return [ROUTE[hi][0], ROUTE[hi][1]];
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (ROUTE[mid][2] > d) lo = mid; else hi = mid; }
    const a = ROUTE[lo], b = ROUTE[hi], t = (a[2] - d) / (a[2] - b[2] || 1);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  }
  const mmLatLng = (mm) => distToLatLng(mmToDist(mm));
  // verified waypoints carry their own coordinates (ll); everything else is placed by mile marker
  const locLL = (l) => l.ll || mmLatLng(l.mm);
  function segment(fromMM, toMM) {
    const dFrom = mmToDist(Math.min(fromMM, 99.8)), dTo = mmToDist(Math.max(toMM, 0));
    const pts = [distToLatLng(dFrom)];
    for (const p of ROUTE) if (p[2] < dFrom && p[2] > dTo) pts.push([p[0], p[1]]);
    pts.push(distToLatLng(dTo));
    return pts;
  }

  // ================================================================ render page
  const main = document.getElementById("guide");
  const fmtMM = (v) => (v < 0 ? "Finish" : v === 3.85 ? "3.8" : v === 99.8 ? "100" : String(Math.round(v)));

  const meetCount = (() => { const xs = [];
    LOC.filter((l) => l.meet && l.kind !== "start" && l.kind !== "finish" && l.mm < START - 0.05)
      .forEach((l) => { if (!xs.some((m) => Math.abs(m - l.mm) <= 0.05)) xs.push(l.mm); });
    return xs.length; })();
  const meetLbl = S.team === "team" ? "meet-ups & exchanges" : "crew meet-ups";
  const meetBox = [String(meetCount), meetLbl, S.role === "runner" ? "Where your crew can meet you" : "Each has directions in the Course section"];
  // [big value, label, detail]
  const STATS = {
    "100": [["5:15am", "Sat start", "Key Largo, waves until 6:30"], ["32h", "time limit", "Counted from when you cross the start"],
      ["3", "interim cutoffs", "First: leave MM 50 by 11pm Sat"], ["42", "islands", "Linked by bridges, Key Largo to Key West"]],
    "50": [["9am", "Sat start", "Marathon Garden Club"], ["20h", "time limit", "No interim cutoffs"],
      ["7 mi", "Seven Mile Bridge", "Starts about 3 miles in"], meetBox],
    "50k": [["Noon", "Sat start", "Lower Keys Chamber, Big Pine Key"], ["12h", "time limit", "No interim cutoffs"],
      ["7:30pm", "night rules start", "LED lights front and rear until 6am"], meetBox],
  };
  const LEDE = {
    "100": "100 miles of Overseas Highway, from Key Largo to Higgs Beach in Key West.",
    "50": "50 miles from Marathon to Higgs Beach in Key West, starting with Seven Mile Bridge.",
    "50k": "31 miles from Big Pine Key to Higgs Beach in Key West.",
  };

  function heroStep() {
    return `<div class="step hero" data-view="overview" data-hud="${R.name} · ${ROLE_TXT[S.role]} · ${TEAM_TXT[S.team]}">
      <div class="card card-hero">
        <p class="eyebrow">Your KEYS100 guide</p>
        <h1>KEYS100<br><span>${R.name}</span></h1>
        <div class="who-chips"><span class="chip-lg">${ROLE_TXT[S.role]}</span><span class="chip-lg">${TEAM_TXT[S.team]}</span><button class="chip-edit" data-open-setup>Change</button></div>
        <p class="lede">${LEDE[S.race]} This page only shows what applies to you. Scroll, and the map follows the course.</p>
        <dl class="stats">${STATS[S.race].map(([a, b, c]) => `<div><dt>${a}</dt><dd><b>${b}</b>${c ? `<small>${c}</small>` : ""}</dd></div>`).join("")}</dl>
        <p class="fine">From the official 2026 KEYS100 Race Guide (updated 04.22.2026). Check the official guide for changes. Mile markers count <strong>down</strong> to Key West. The <strong>OCEAN</strong> is on your left and the <strong>BAY</strong> on your right.</p>
        <div class="scroll-cue" aria-hidden="true">Scroll <span>↓</span></div>
      </div></div>`;
  }

  function clockHtml() {
    const s = S.race;
    let h = `<div class="limits one"><div><b>${R.limit}h</b><span>${R.name} time limit</span></div></div>`;
    if (s === "100") {
      const START_H = 5, END_H = 38, span = END_H - START_H, pct = (x) => ((x - START_H) / span) * 100;
      h += `<p>Three cutoffs apply <strong>no matter when you started</strong>. Leave each timing station before:</p>
        <div class="clock"><div class="clock-track">
          <div class="clock-night" style="left:${pct(19.5)}%;width:${pct(30) - pct(19.5)}%"></div>
          ${window.CUTOFFS.map((c) => `<div class="clock-cut" style="left:${pct(c.hour)}%"></div>`).join("")}
        </div>
        <div class="clock-ends">${[[5, "Sat 5am"], [12, "noon"], [19.5, "7:30pm"], [30, "6am"], [38, "Sun 2pm"]].map(([x, t]) => `<span style="left:${pct(x)}%">${t}</span>`).join("")}</div>
        <ol class="cut-list">${window.CUTOFFS.map((c) => `<li><b>${c.time}</b><span>MM ${c.mm}, ${c.place}</span></li>`).join("")}</ol></div>`;
    } else {
      h += `<p>No interim cutoffs. You have ${R.limit} hours from when you cross the start line.</p>`;
    }
    h += `<div class="callout amber"><b>Night = 7:30pm to 6:00am.</b> Outside the vehicle: blinking LEDs front &amp; rear plus 360° reflective gear.</div>
      <p class="muted">Miss ${s === "100" ? "a cutoff or " : ""}the limit and you're DNF: hand your bib to a marshal and remove race markings from the vehicle.</p>`;
    return h;
  }

  const val = (x) => (typeof x === "function" ? x(S) : x);
  function glanceStep(list) {
    const rows = list.map((w, i) => `<li><button type="button" class="glance-row" data-goto-wk="${i}"><time>${val(w.when)}</time><span>${val(w.glance)}</span><i aria-hidden="true">›</i></button></li>`).join("");
    return `<div class="step" data-view="overview" data-hud="Race weekend"><div class="card"><p class="kicker">May 15–17 · ${R.name}</p><h2>Race weekend at a glance</h2>
      <ul class="timeline glance">${rows}</ul><p class="muted">Tap a row for details, or keep scrolling.</p></div></div>`;
  }
  function weekendStep(w, i) {
    const v = w.view;
    let attrs = "";
    if (v === "overview") attrs = 'data-view="overview"';
    else if (v === "cutoffs") attrs = 'data-view="cutoffs"';
    else if (v.mm != null) attrs = `data-mm="${v.mm}" data-zoom="${v.zoom}"`;
    else attrs = `data-latlng="${v.latlng.join(",")}" data-zoom="${v.zoom}"`;
    const body = v === "cutoffs" ? clockHtml() : typeof w.html === "function" ? w.html(S) : w.html;
    const pins = (w.pins || []).filter(Boolean);
    if (pins.length) attrs += ` data-pins='${esc(JSON.stringify(pins)).replace(/'/g, "&#39;")}'`;
    const venues = showNav && pins.length ? `<div class="venue-nav"><p class="venue-nav-h">Directions</p>${pins.map((p) => `<div class="venue-nav-item"><b>${esc(p.label.split(" · ").pop())}</b>${navHtml(p.ll, false, true)}</div>`).join("")}</div>` : "";
    return `<div class="step" data-wk="${i}" ${attrs}><div class="card"><p class="kicker">${w.kicker}</p><h2>${w.title}</h2>${prune(body)}${venues}</div></div>`;
  }

  function rulesPanel() {
    const cards = window.RULES.filter((c) => fits(c.on)).map((c) => {
      const items = c.items.filter(([on]) => fits(on));
      if (!items.length) return "";
      return `<article class="rule"><h3><i class="dot" style="background:${c.color}"></i>${c.title}</h3><ul>${items.map(([, t]) => `<li>${t}</li>`).join("")}</ul></article>`;
    }).join("");
    const checks = window.CHECKLIST.map((c, i) => [c, i]).filter(([c]) => fits(c[0]));
    const checked = store.get("checks", {});
    return `<section class="panel" id="rules"><div class="panel-inner">
      <p class="eyebrow dark">Rules for you</p>
      <h2 class="panel-title">What gets you penalized</h2>
      <p class="panel-lede">Marshals ride the whole course. Penalties go on the runner, even when it's the crew that broke the rule.</p>
      <div class="penalty">
        <div class="pen-step"><span class="bib">/</span><b>1st</b><small>Warning: a slash on the bib</small></div>
        <div class="pen-arrow">→</div>
        <div class="pen-step"><span class="bib">X</span><b>2nd</b><small>Becomes an X, plus a <strong>1-hour</strong> penalty</small></div>
        <div class="pen-arrow">→</div>
        <div class="pen-step dq"><span class="bib">DQ</span><b>3rd</b><small>Disqualified. Major violations can mean an immediate DQ.</small></div>
      </div>
      <div class="rule-grid">${cards}</div>
      <div class="checklist-wrap">
        <div><h3 class="sub-title">Your checklist</h3><p class="muted">Tap to tick. Saved on this device.</p></div>
        <ul class="checklist" id="checklist">${checks.map(([[, t, s], i]) => `<li><label><input type="checkbox" data-i="${i}" ${checked[i] ? "checked" : ""}><span>${t}${s ? `<small>${s}</small>` : ""}</span></label></li>`).join("")}</ul>
      </div></div></section>`;
  }

  const ALERT_TAG = { red: "CRITICAL", amber: "HEADS UP", info: "KNOW" };
  const MINOR = new Set(["note", "bath", "land"]);
  const chipsFor = (l) => (l.t ? '<span class="chip wc">WC</span>' : "") +
    (l.kind === "team" || (l.on || "").includes("team") ? '<span class="chip team">TEAM</span>' : "") +
    (l.kind === "indiv" || (l.on || "").includes("solo") ? '<span class="chip indiv">SOLO CREW</span>' : "");
  const detailFor = (l) => (runnerOnly ? l.rtext || "" : l.text);

  // ---- "get me there" buttons for crews: Google Maps, Waze, copy coordinates
  const showNav = S.role !== "runner";
  const NAV_KINDS = new Set(["meet", "team", "indiv", "m50", "m100", "start", "finish"]);
  const navigable = (l) => showNav && (NAV_KINDS.has(l.kind) || (l.kind === "timing" && l.meet) || l.nav);
  const fmtLL = (ll) => `${(+ll[0]).toFixed(6)}, ${(+ll[1]).toFixed(6)}`;
  function navHtml(ll, approx, compact) {
    const q = `${(+ll[0]).toFixed(6)},${(+ll[1]).toFixed(6)}`;
    return `<div class="nav-row${compact ? " compact" : ""}">
      <a class="nav-btn gmaps" href="https://www.google.com/maps/dir/?api=1&amp;destination=${q}&amp;travelmode=driving" target="_blank" rel="noopener">Google Maps</a>
      <a class="nav-btn waze" href="https://waze.com/ul?ll=${q}&amp;navigate=yes" target="_blank" rel="noopener">Waze</a>
      <button type="button" class="nav-btn copy" data-copy="${fmtLL(ll)}" aria-label="Copy coordinates ${fmtLL(ll)}">Copy</button>
      ${approx ? '<span class="nav-approx" title="Placed by mile marker, not verified on the map">approx.</span>' : ""}</div>`;
  }
  const locNav = (l, compact) => (navigable(l) ? navHtml(locLL(l), !l.ll, compact) : "");

  function mineHtml(l) {
    if (!pickable(l)) return "";
    const on = isPicked(l.key), note = noteOf(l.key);
    return `<div class="mine" data-key="${l.key}"><button type="button" class="pick-btn${on ? " on" : ""}" data-pick="${l.key}" aria-pressed="${on}">${on ? "★ In our plan" : "☆ Add to plan"}</button>${note ? "" : `<button type="button" class="note-add" data-note-open="${l.key}">+ Note</button>`}<textarea class="my-note" data-note="${l.key}" rows="2" placeholder="Our plan here: shoes, ice, 2 bottles…" aria-label="Note for MM ${l.label}"${note ? "" : " hidden"}>${esc(note)}</textarea></div>`;
  }
  function stopLi(l) {
    const d = detailFor(l);
    return `<li class="stop k-${l.kind} ${MINOR.has(l.kind) ? "minor" : ""}${isPicked(l.key) ? " picked" : ""}" data-id="${l.id}" tabindex="0">
      <span class="mm">${l.label}</span>
      <div><div class="t">${l.title}${chipsFor(l)}</div>${d ? `<div class="d">${d}</div>` : ""}${nextLine(l)}${locNav(l, true)}${mineHtml(l)}</div></li>`;
  }

  function courseSection() {
    const legend = [["meet", "Meet-up"], S.team !== "solo" && ["team", "Team exchange"], S.team !== "team" && ["indiv", "Solo crew only"],
      ["timing", "Timing"], ["warn", "Caution"], S.role !== "crew" && ["cross", "You cross"]].filter(Boolean);
    const intro = `<div class="step" data-view="overview" data-hud="The course">
      <div class="card card-intro"><p class="kicker">Mile by mile</p><h2>Your course</h2>
      <p>${CH.length} sections from ${R.startPlace} to Key West. Each one starts with what can get you penalized, then lists its stops.</p>
      <div class="legend">${legend.map(([k, t]) => `<span><i class="lg ${k}"></i>${t}</span>`).join("")}</div>
      <p>Tap <b>☆ Add to plan</b> on the meet-ups you'll use and add notes. The planner and map pick them up, and you can share the plan with your ${S.role === "runner" ? "crew" : "runner and crew"}.</p>
      <p class="muted">Most pins are matched to the actual place. Pins marked "approx." are placed by mile marker. On the ground, follow the written directions.</p></div></div>`;
    const chapters = CH.map((c, i) => {
      const alerts = c.alerts.filter((a) => fits(a[2]));
      const items = LOC.filter((l) => l.chapter === c.id && l.kind !== "land").sort((a, b) => b.mm - a.mm);
      const meets = items.filter((l) => l.meet).length;
      return `<div class="step chapter" data-chapter="${c.id}"><div class="card">
        <div class="ch-head"><span class="ch-num">${String(i + 1).padStart(2, "0")} / ${CH.length}</span><span class="ch-range">MM ${fmtMM(c.from)} → ${fmtMM(c.to)}</span></div>
        <h2>${c.title}</h2><p class="ch-sub">${c.sub}</p>
        ${alerts.length ? `<ul class="alerts">${alerts.map(([lvl, txt]) => `<li class="${lvl}"><span class="tag ${lvl}">${ALERT_TAG[lvl]}</span><span>${txt}</span></li>`).join("")}</ul>` : ""}
        ${items.length ? `<details class="stops-list"${isDesktop() ? " open" : ""}><summary>${meets} meet-up${meets === 1 ? "" : "s"} · ${items.length} stops &amp; notes</summary>
          <ul class="stop-items">${items.map(stopLi).join("")}</ul></details>` : ""}
      </div></div>`;
    }).join("");
    return `<section class="story" id="course">${intro}${chapters}</section>`;
  }

  function plannerPanel() {
    return `<section class="panel" id="planner"><div class="panel-inner">
      <p class="eyebrow dark">Planner</p>
      <h2 class="panel-title">Every stop, with an ETA</h2>
      <p class="panel-lede">Enter a start time, a goal finish and your average time at each crew stop to get arrival times and the moving pace each stretch needs${S.race === "100" ? ", with night and cutoffs flagged" : ""}. Most runners slow down late, so build in a buffer.</p>
      <form class="planner" id="plannerForm" onsubmit="return false">
        <label>Start time (Sat)<input type="time" id="pStart" /></label>
        <label>Goal finish<span class="hhmm"><input type="number" id="pHours" min="3" max="${R.limit}" aria-label="hours" />h
          <input type="number" id="pMins" min="0" max="59" step="5" aria-label="minutes" />m</span></label>
        <label>Avg min per crew stop<span class="hhmm"><input type="number" id="pStop" min="0" max="60" step="1" inputmode="numeric" aria-label="average minutes per crew stop" />min</span></label>
        <label>Pacing<select id="pFade"><option value="0">Even pace</option><option value="0.15">Some slow-down (+15%)</option><option value="0.3">Big slow-down (+30%)</option></select></label>
      </form>
      <div class="myplan" id="myPlan">
        <div class="myplan-head"><h3 class="sub-title">Your crew plan</h3><span class="myplan-count" id="myCount"></span></div>
        <p class="muted">Tap ☆ on a meet-up (in this table or the Course section) to add it, then add notes. Saved on this device. Share it so your runner and crew all have the same plan, with these ETA settings.</p>
        <label class="myplan-notes">General notes<textarea id="myNotes" rows="3" placeholder="Phone numbers, who drives when, gear in which bag…"></textarea></label>
        <div class="myplan-actions"><button type="button" class="btn" id="shareBtn">Share plan</button><button type="button" class="btn ghost" id="copyPlanBtn">Copy as text</button><button type="button" class="btn ghost" id="clearPlanBtn">Clear</button></div>
      </div>
      <div class="plan-summary" id="planSummary"></div>
      <div class="table-tools">
        <div class="seg" role="group" aria-label="Rows"><button data-rows="mine">Our plan</button><button data-rows="meet">Meet-ups</button><button data-rows="all">Everything</button></div>
        <input type="search" id="tSearch" placeholder="Search: bathrooms, timing, Publix…" aria-label="Search stops" />
      </div>
      <div class="table-wrap"><table class="stops" id="stopsTable"><thead><tr><th>MM</th><th title="Distance and time to the next meet-up, or to the next stop in your plan">Next</th><th>ETA</th><th title="Average pace needed over the stretch since the row above">Pace</th><th>Location</th></tr></thead><tbody></tbody></table></div>
    </div></section>`;
  }

  main.innerHTML = `<section class="story" id="weekend">${heroStep()}${(() => { const wk = window.WEEKEND.filter((w) => fits(w.on)); return glanceStep(wk) + wk.map(weekendStep).join(""); })()}</section>
    ${rulesPanel()}${courseSection()}${plannerPanel()}
    <footer class="footer"><p><strong>Unofficial companion</strong> to the 2026 KEYS100 Race Guide by Ultra Sports, LLC. The official guide and race marshals have the final word. Vehicle questions: <a href="mailto:Marshal@ultrasportsllc.com">Marshal@ultrasportsllc.com</a>.</p>
    <p class="muted">Imagery © Esri &amp; contributors · Road geometry © OpenStreetMap contributors (OSRM).</p></footer>`;

  // ================================================================ setup dialog
  const dlg = document.createElement("dialog");
  dlg.className = "setup";
  dlg.innerHTML = `<form method="dialog" class="setup-form">
      <h2>Build your guide</h2>
      <p class="muted">Pick what applies to you. Anything else stays hidden.</p>
      ${setupFields(S)}
      <div class="setup-actions">${firstVisit ? "" : '<button value="cancel" class="btn ghost">Cancel</button>'}<button value="go" class="btn">Show my guide</button></div>
    </form>`;
  document.body.appendChild(dlg);
  function setupFields(cur) {
    const grp = (name, label, opts) => `<fieldset><legend>${label}</legend><div class="opts">${opts.map(([v, t, sub]) =>
      `<label class="opt"><input type="radio" name="${name}" value="${v}" ${cur[name] === v ? "checked" : ""}><span><b>${t}</b>${sub ? `<small>${sub}</small>` : ""}</span></label>`).join("")}</div></fieldset>`;
    return grp("race", "Race", [["100", "100 mile", "Key Largo start"], ["50", "50 mile", "Marathon start"], ["50k", "50K", "Big Pine start"]]) +
      grp("role", "I am", [["runner", "Runner", ""], ["crew", "Crew / driver", ""], ["all", "Both", "show everything"]]) +
      grp("team", "Racing as", [["solo", "Solo runner", "with a crew"], ["team", "Relay team", ""], ["all", "Both", ""]]);
  }
  dlg.addEventListener("close", () => {
    if (dlg.returnValue !== "go") return;
    const f = new FormData(dlg.querySelector("form"));
    const race = f.get("race"), role = f.get("role"), team = f.get("team");
    store.set("prefs", { race, role, team });
    location.href = `${window.RACES[race].page}?role=${role}&team=${team}`;
  });
  dlg.addEventListener("cancel", (e) => { if (firstVisit) e.preventDefault(); });
  document.addEventListener("click", (e) => { if (e.target.closest("[data-open-setup]")) dlg.showModal(); });
  const pb = document.getElementById("prefsBtn");
  pb.innerHTML = `<b>${R.short}</b><span>${ROLE_TXT[S.role]} · ${TEAM_TXT[S.team]}</span><i aria-hidden="true">✎</i>`;
  if (firstVisit) setTimeout(() => dlg.showModal(), 300);

  // ================================================================ map
  const map = L.map("map", {
    zoomControl: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false,
    keyboard: false, touchZoom: false, dragging: !L.Browser.mobile, tap: false, zoomSnap: 0.25,
  });
  const esri = "https://server.arcgisonline.com/ArcGIS/rest/services/";
  const satellite = L.layerGroup([
    L.tileLayer(esri + "World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Imagery © Esri, Maxar, Earthstar Geographics" }),
    L.tileLayer(esri + "Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, opacity: 0.55 }),
    L.tileLayer(esri + "Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19 }),
  ]).addTo(map);
  const streets = L.tileLayer(esri + "World_Street_Map/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Map © Esri, HERE, Garmin, OpenStreetMap contributors" });
  // simple Satellite | Map switch (remembered on this device)
  const BASES = { sat: satellite, map: streets };
  let base = store.get("base", "sat") === "map" ? "map" : "sat";
  const BaseToggle = L.Control.extend({
    options: { position: "topright" },
    onAdd() {
      const d = L.DomUtil.create("div", "leaflet-control base-toggle");
      d.setAttribute("role", "group"); d.setAttribute("aria-label", "Map style");
      d.innerHTML = '<button type="button" data-base="sat">Satellite</button><button type="button" data-base="map">Map</button>';
      L.DomEvent.disableClickPropagation(d);
      d.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) setBase(b.dataset.base); });
      return d;
    },
  });
  const baseCtl = new BaseToggle().addTo(map);
  function setBase(k) {
    base = k; store.set("base", k);
    Object.entries(BASES).forEach(([key, layer]) => { if (key === k) layer.addTo(map); else map.removeLayer(layer); });
    baseCtl.getContainer().querySelectorAll("button").forEach((b) => {
      b.classList.toggle("on", b.dataset.base === k); b.setAttribute("aria-pressed", b.dataset.base === k);
    });
  }
  setBase(base);

  const fullLine = ROUTE.map((p) => [p[0], p[1]]);
  const raceLine = segment(START, 0);
  const raceBounds = L.latLngBounds(raceLine);
  map.fitBounds(raceBounds, { padding: [40, 40] }); // initial view before layers are added; refined at init
  L.polyline(fullLine, { color: "#ffffff", weight: 2, opacity: 0.35, dashArray: "4 6", interactive: false }).addTo(map);
  L.polyline(raceLine, { color: "#06182a", weight: 8, opacity: 0.45, interactive: false }).addTo(map);
  L.polyline(raceLine, { color: "#ffffff", weight: 3.5, opacity: 0.95, interactive: false }).addTo(map);
  const progressLine = L.polyline([], { color: "#f7941d", weight: 5, interactive: false }).addTo(map);
  const segLine = L.polyline([], { color: "#ffd400", weight: 7, interactive: false }).addTo(map);

  [90, 80, 70, 60, 50, 40, 30, 20, 10, 5].filter((m) => m < START - 1).forEach((m) => {
    L.marker(mmLatLng(m), { interactive: false, keyboard: false,
      icon: L.divIcon({ className: "", html: `<div class="mm-tick">${m}</div>`, iconSize: [30, 20], iconAnchor: [15, 30] }) }).addTo(map);
  });
  const endIcon = (txt, anchor) => L.divIcon({ className: "", html: `<div class="end-label">${txt}</div>`, iconSize: null, iconAnchor: anchor });
  L.marker(mmLatLng(START), { interactive: false, icon: endIcon(`${R.short} START`, S.race === "100" ? [-12, 12] : [50, 44]) }).addTo(map);
  L.marker(mmLatLng(0), { interactive: false, icon: endIcon("FINISH", [70, -14]) }).addTo(map);

  const STYLE = {
    start: [7, "#00a99d", "#fff"], finish: [7, "#00a99d", "#fff"], meet: [6, "#00a99d", "#fff"],
    team: [6, "#3f63d8", "#fff"], indiv: [6, "#a640b8", "#fff"], m50: [6, "#f7941d", "#fff"], m100: [6, "#f7941d", "#fff"],
    timing: [7, "#ffd400", "#0f2233"], warn: [5, "#d62839", "#fff"], cross: [4, "#ffffff", "#0f2233"],
  };
  const DETAIL = new Set(["warn", "cross"]);
  const markerLayer = L.layerGroup().addTo(map), detailLayer = L.layerGroup();
  const popupHtml = (l) => { const d = detailFor(l); return `<div class="pop-mm">MM ${l.label}</div><div class="pop-title">${l.title}</div>${d ? `<div>${d}</div>` : ""}${hasNext(l) ? `<div class="pop-next">→ ${nextTxt(l.mm, false)}</div>` : ""}${l.ll ? "" : '<div class="pop-next">Pin approx. (placed by mile marker)</div>'}${locNav(l)}`; };
  LOC.forEach((l) => {
    const s = STYLE[l.kind];
    if (!s) return;
    l.baseR = s[0]; l.baseColor = s[2];
    l.marker = L.circleMarker(locLL(l), { radius: s[0], color: s[2], weight: 2, fillColor: s[1], fillOpacity: 1 })
      .bindPopup(popupHtml(l), { maxWidth: 290, autoPanPaddingTopLeft: [20, topbarH() + 10] });
    (DETAIL.has(l.kind) ? detailLayer : markerLayer).addLayer(l.marker);
  });
  let emphasized = null;
  function emphasize(chId) {
    emphasized = chId;
    const far = map.getZoom() < 10.5;
    LOC.forEach((l) => {
      if (!l.marker) return;
      const on = !chId || l.chapter === chId;
      const pk = pickable(l) && isPicked(l.key);
      l.marker.setStyle({ fillOpacity: on ? 1 : 0.45, opacity: on ? 1 : 0.45, weight: pk ? (far ? 2.5 : 3.5) : far ? 1 : 2, color: pk ? "#f7941d" : l.baseColor });
      l.marker.setRadius((far ? Math.max(2.5, l.baseR - 3) : chId && on ? l.baseR + 2 : l.baseR) + (pk ? 1.5 : 0));
      if (pk) l.marker.bringToFront();
    });
  }
  // Defer to the next tick: during the very first setView, zoomend fires before the SVG renderer has
  // bounds, and touching circle markers then makes Leaflet throw (seen on wide screens, where the
  // 50 mile / 50K course opens at zoom >= 11).
  map.on("zoomend", () => setTimeout(() => {
    emphasize(emphasized);
    if (map.getZoom() >= 11) detailLayer.addTo(map); else detailLayer.remove();
  }, 0));

  const venueLayer = L.layerGroup().addTo(map);
  function showVenues(pins) {
    venueLayer.clearLayers();
    map.getContainer().classList.toggle("has-venues", pins.length > 0);
    pins.forEach((p, i) => { const m = L.marker(p.ll, {
      keyboard: false, riseOnHover: true, zIndexOffset: 2000 - i * 100, // first label stays on top
      icon: L.divIcon({ className: "", iconSize: null, iconAnchor: [11, 30],
        html: `<div class="venue-pin${i % 2 ? " alt" : ""}"><span class="vp-dot" aria-hidden="true"></span><span class="vp-lbl">${esc(p.label)}</span></div>` }),
    }).addTo(venueLayer);
      m.bindPopup(`<div class="pop-title">${esc(p.label)}</div>${showNav ? navHtml(p.ll, false) : ""}`, { maxWidth: 290 }); });
  }
  const cutLayer = L.layerGroup();
  if (S.race === "100") window.CUTOFFS.forEach((c, i) => {
    L.marker(mmLatLng(c.mm), { interactive: false, icon: L.divIcon({ className: "", iconSize: null, iconAnchor: [0, i === 0 ? -14 : 60],
      html: `<div class="cut-label"><b>${c.time}</b>MM ${c.mm} · ${c.place}</div>` }) }).addTo(cutLayer);
  });

  // ================================================================ camera
  function padding() {
    const top = topbarH() + 24;
    if (isDesktop()) {
      const card = document.querySelector(".step.active .card") || document.querySelector(".card");
      const right = card ? card.getBoundingClientRect().right : 520;
      return { paddingTopLeft: [Math.min(right + 90, window.innerWidth * 0.6), top + 20], paddingBottomRight: [80, 50] };
    }
    return { paddingTopLeft: [24, top], paddingBottomRight: [24, Math.round(window.innerHeight * 0.42)] };
  }
  const flyBounds = (b, maxZoom) => map.flyToBounds(b, Object.assign({ duration: 1.1, maxZoom: maxZoom || 14 }, padding()));
  function flyPoint(latlng, zoom) {
    const p = padding(), size = map.getSize();
    const dx = (p.paddingTopLeft[0] + size.x - p.paddingBottomRight[0]) / 2 - size.x / 2;
    const dy = (p.paddingTopLeft[1] + size.y - p.paddingBottomRight[1]) / 2 - size.y / 2;
    map.flyTo(map.unproject(map.project(latlng, zoom).subtract([dx, dy]), zoom), zoom, { duration: 1.1 });
  }

  // ================================================================ HUD + steps
  const hudLabel = document.getElementById("hudLabel"), hudFill = document.getElementById("hudFill");
  const setHud = (html, frac) => { hudLabel.innerHTML = html; hudFill.style.width = Math.max(0, Math.min(1, frac)) * 100 + "%"; };
  const done = (mm) => (START - Math.max(mm, 0)) / START;

  let activeStep = null;
  let exploring = false;
  function activate(step) {
    if (exploring || step === activeStep) return;
    if (activeStep) activeStep.classList.remove("active");
    activeStep = step;
    step.classList.add("active");
    savePos(step);
    const ds = step.dataset;
    cutLayer.remove(); progressLine.setLatLngs([]); segLine.setLatLngs([]); emphasize(null);
    const pins = ds.pins ? JSON.parse(ds.pins) : [];
    const kick = ((step.querySelector(".kicker") || {}).textContent || "").split("·")[0].trim().toUpperCase();
    showVenues(pins);
    const title = (step.querySelector("h2") || {}).textContent || "";
    if (ds.chapter) {
      const c = CH.find((x) => x.id === ds.chapter);
      const seg = segment(c.from, c.to);
      segLine.setLatLngs(seg); progressLine.setLatLngs(segment(START, c.to)); emphasize(c.id);
      flyBounds(L.latLngBounds(seg), 14);
      setHud(`<b>MM ${fmtMM(c.from)} → ${fmtMM(c.to)}</b>${c.title}`, done(c.to));
    } else if (ds.view === "cutoffs") {
      if (S.race === "100") { cutLayer.addTo(map); flyBounds(L.latLngBounds(segment(52, 22)), 11); } else flyBounds(raceBounds, 11);
      setHud(`<b>CLOCK</b>${title}`, 0);
    } else if (ds.view === "overview") {
      flyBounds(raceBounds, 11);
      setHud(`<b>${R.short}</b>${esc(ds.hud || title)}`, 0);
    } else if (ds.mm) {
      flyPoint(mmLatLng(+ds.mm), +ds.zoom || 14);
      setHud(`<b>MM ${ds.mm}</b>${title}`, 0);
    } else if (pins.length > 1) {
      flyBounds(L.latLngBounds(pins.map((p) => p.ll)).pad(0.35), +ds.zoom || 16);
      setHud(`<b>${esc(kick)}</b>${esc(title)}`, 0);
    } else if (ds.latlng) {
      flyPoint(ds.latlng.split(",").map(Number), +ds.zoom || 14);
      setHud(`<b>${esc(kick)}</b>${esc(title)}`, 0);
    }
  }
  const steps = Array.from(document.querySelectorAll(".step"));
  const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && activate(e.target)), { rootMargin: "-50% 0px -50% 0px" });
  steps.forEach((s) => io.observe(s));
  const panelIo = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    if (activeStep) { activeStep.classList.remove("active"); activeStep = null; }
    setHud(e.target.id === "rules" ? "<b>RULES</b>For you" : "<b>PLANNER</b>Every stop, with an ETA", e.target.id === "rules" ? 0 : 1);
    if (!exploring && booted) {
      history.replaceState(null, "", location.pathname + location.search + "#" + e.target.id);
      store.set("pos-" + S.race, { panel: e.target.id, label: e.target.id === "rules" ? "Rules" : "Planner", t: Date.now() });
    }
  }), { rootMargin: "-50% 0px -50% 0px" });
  document.querySelectorAll(".panel").forEach((p) => panelIo.observe(p));

  main.addEventListener("click", (e) => {
    if (e.target.closest(".nav-row, .mine")) return; // directions / copy / plan controls
    const li = e.target.closest(".stop");
    if (!li) return;
    const l = LOC[+li.dataset.id];
    setExplore(true, true);
    map.flyTo(locLL(l), 15, { duration: 1.1 });
    if (l.marker) setTimeout(() => { detailLayer.addTo(map); l.marker.openPopup(); }, 1150);
  });
  main.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.classList.contains("stop")) e.target.click(); });

  // ================================================================ copy coordinates
  const toast = document.createElement("div");
  toast.className = "copy-toast"; toast.setAttribute("role", "status");
  document.body.appendChild(toast);
  let toastT = null;
  function say(msg) {
    toast.textContent = msg; toast.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove("show"), 2200);
  }
  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); return true; } catch (e) { /* fall back below */ }
    try {
      const ta = document.createElement("textarea");
      ta.value = t; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;opacity:0;top:0;left:0";
      document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, t.length);
      const ok = document.execCommand("copy"); ta.remove(); return ok;
    } catch (e) { return false; }
  }
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-copy]");
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const t = b.dataset.copy;
    if (await copyText(t)) { say(`Copied ${t}: paste it into Google Maps or Waze`); b.classList.add("done"); setTimeout(() => b.classList.remove("done"), 1500); }
    else say(`Couldn't copy. Coordinates: ${t}`);
  });

  // ================================================================ explore mode
  // Hides the story and hands the map to the reader: drag, pinch, wheel, double-click.
  const HANDLERS = ["dragging", "touchZoom", "scrollWheelZoom", "doubleClickZoom", "boxZoom", "keyboard"];
  const exploreBtn = document.createElement("button");
  exploreBtn.className = "explore-btn";
  exploreBtn.type = "button";
  document.body.appendChild(exploreBtn);
  const tip = document.createElement("div");
  tip.className = "explore-tip";
  tip.textContent = L.Browser.mobile ? "Drag to move · pinch to zoom · tap a dot for details" : "Drag to move · scroll to zoom · click a dot for details";
  document.body.appendChild(tip);
  const setBtn = () => {
    exploreBtn.innerHTML = exploring ? "<span aria-hidden=\"true\">←</span> Back to guide" : "<span aria-hidden=\"true\">⤢</span> Explore map";
    exploreBtn.setAttribute("aria-pressed", exploring);
  };
  function setExplore(on, quiet) {
    if (on === exploring) return;
    exploring = on;
    document.documentElement.classList.toggle("exploring", on);
    document.body.classList.toggle("exploring", on);
    setBtn();
    if (on) {
      HANDLERS.forEach((h) => map[h] && map[h].enable());
      detailLayer.addTo(map);
      emphasize(null);
      map.closePopup();
      setHud("<b>MAP</b>Exploring: drag &amp; zoom freely", hudFill.style.width ? parseFloat(hudFill.style.width) / 100 : 0);
      if (!quiet) tip.classList.add("show");
      setTimeout(() => tip.classList.remove("show"), 3200);
    } else {
      HANDLERS.forEach((h) => map[h] && map[h].disable());
      if (!L.Browser.mobile) map.dragging.enable(); // desktop keeps simple dragging in story mode
      map.closePopup();
      tip.classList.remove("show");
      if (map.getZoom() < 11) detailLayer.remove();
      // return to whatever step sits in the middle of the screen
      const mid = window.innerHeight / 2;
      const cur = steps.find((s) => { const r = s.getBoundingClientRect(); return r.top <= mid && r.bottom >= mid; });
      if (activeStep) activeStep.classList.remove("active");
      activeStep = null;
      if (cur) activate(cur); else flyBounds(raceBounds, 11);
    }
  }
  exploreBtn.addEventListener("click", () => setExplore(!exploring));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && exploring) setExplore(false); });
  setBtn();

  // ================================================================ position memory + jump
  // The current section goes in the URL hash (#c8, #rules) so reopening a closed tab or sharing the link lands there.
  let booted = false; // don't touch the URL/position until any #hash has been honoured
  function savePos(step) {
    if (!booted) return;
    const ds = step.dataset;
    const idx = steps.indexOf(step);
    let hash = "", label = (step.querySelector("h1, h2") || {}).textContent || "";
    if (ds.chapter) {
      const c = CH.find((x) => x.id === ds.chapter);
      hash = "#" + c.id;
      label = `MM ${fmtMM(c.from)} → ${fmtMM(c.to)} · ${c.title}`;
    }
    history.replaceState(null, "", location.pathname + location.search + hash);
    if (idx > 0) store.set("pos-" + S.race, { idx, chapter: ds.chapter || null, label, t: Date.now() });
  }

  let hideResume = () => {};
  function scrollToStep(step) {
    hideResume();
    const card = step.querySelector(".card");
    const top = card.getBoundingClientRect().top + window.scrollY - topbarH() - 16;
    window.scrollTo({ top: Math.max(0, top), behavior: "instant" });
  }
  function scrollToPanel(id) {
    hideResume();
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - topbarH(), behavior: "instant" });
  }
  function leaveExplore() { if (exploring) setExplore(false); }

  function nearestStop(mm, items) {
    let best = null, bestScore = Infinity;
    items.forEach((l) => {
      const score = Math.abs(l.mm - mm) + (l.meet || l.kind === "timing" ? 0 : 0.3);
      if (score < bestScore) { bestScore = score; best = l; }
    });
    return best;
  }
  function jumpToMM(mm, id) {
    leaveExplore();
    mm = Math.max(0, Math.min(START, mm));
    const c = CH.find((x) => mm <= x.from + 0.01 && mm > x.to) || CH[0];
    const step = document.querySelector(`[data-chapter="${c.id}"]`);
    scrollToStep(step);
    const d = step.querySelector("details");
    if (!d) return;
    d.open = true;
    const items = LOC.filter((l) => l.chapter === c.id && l.kind !== "land");
    const target = id != null ? LOC[id] : nearestStop(mm, items);
    const li = target && d.querySelector(`.stop[data-id="${target.id}"]`);
    if (!li) return;
    const box = d.querySelector(".stop-items");
    box.scrollTop = Math.max(0, li.offsetTop - 8);
    const r = li.getBoundingClientRect();
    if (r.bottom > window.innerHeight - 20) window.scrollBy({ top: r.bottom - window.innerHeight + 90, behavior: "instant" });
    li.classList.remove("flash"); void li.offsetWidth; li.classList.add("flash");
    if (isDesktop() && target.marker) setTimeout(() => target.marker.openPopup(), 1300);
  }

  // ---- jump sheet
  const jdlg = document.createElement("dialog");
  jdlg.className = "jump-dlg";
  jdlg.innerHTML = `<div class="jump-form">
      <div class="jump-head"><h2>Jump to</h2><button type="button" class="jump-x" aria-label="Close">×</button></div>
      <div class="jump-search">
        <input id="jumpQ" type="search" enterkeyhint="go" autocomplete="off" placeholder="Mile marker (35) or place (Publix)" aria-label="Mile marker or place" />
        <button type="button" class="btn" id="jumpGo">Go</button>
      </div>
      <ul class="jump-results" id="jumpResults"></ul>
      <p class="jump-label">Course sections</p>
      <div class="jump-grid">${CH.map((c) => `<button type="button" data-jc="${c.id}"><b>MM ${fmtMM(c.from)} → ${fmtMM(c.to)}</b><span>${c.title}</span></button>`).join("")}</div>
      <p class="jump-label">Also</p>
      <div class="jump-links">
        <button type="button" data-jp="top">Top</button><button type="button" data-jp="weekend">Race weekend</button>
        <button type="button" data-jp="rules">Rules</button><button type="button" data-jp="planner">Planner &amp; ETAs</button>
      </div></div>`;
  document.body.appendChild(jdlg);
  const jq = jdlg.querySelector("#jumpQ"), jres = jdlg.querySelector("#jumpResults");
  let jumpHits = [];
  const parseMM = (v) => { const m = v.trim().toLowerCase().replace(/^mm\s*/, "").replace(/^mile\s*/, ""); return /^\d+(\.\d+)?$/.test(m) ? parseFloat(m) : null; };
  function renderJump() {
    const v = jq.value, mm = parseMM(v);
    jumpHits = [];
    if (mm != null) {
      const cm = Math.max(0, Math.min(START, mm));
      const c = CH.find((x) => cm <= x.from + 0.01 && cm > x.to) || CH[0];
      const near = nearestStop(cm, LOC.filter((l) => l.chapter === c.id && l.kind !== "land"));
      jumpHits.push({ mm: cm, id: near ? near.id : null, html: `<b>MM ${cm}</b><span>${c.title}${near ? ` · nearest: ${near.title}` : ""}</span><small>→ ${mm > START ? `Your race starts at MM ${fmtMM(START)}` : nextTxt(cm, true)}</small>` });
    } else if (v.trim().length >= 2) {
      const q = v.trim().toLowerCase();
      LOC.filter((l) => l.kind !== "land" && (l.title + " " + l.text + (l.t ? " bathroom toilet wc" : "")).toLowerCase().includes(q))
        .slice(0, 8).forEach((l) => jumpHits.push({ mm: l.mm, id: l.id, html: `<b>MM ${l.label}</b><span>${l.title}</span>` }));
      if (!jumpHits.length) jres.innerHTML = `<li class="none">Nothing matches "${esc(v.trim())}"</li>`;
    }
    if (jumpHits.length) jres.innerHTML = jumpHits.map((h, i) => `<li><button type="button" data-hit="${i}">${h.html}</button></li>`).join("");
    else if (!v.trim()) jres.innerHTML = "";
  }
  const closeJump = () => jdlg.close();
  function openJump() {
    leaveExplore();
    jq.value = ""; renderJump();
    jdlg.showModal();
    if (isDesktop()) jq.focus();
  }
  jq.addEventListener("input", renderJump);
  jq.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); jdlg.querySelector("#jumpGo").click(); } });
  jdlg.addEventListener("click", (e) => {
    if (e.target === jdlg || e.target.closest(".jump-x")) return closeJump();
    const go = e.target.closest("#jumpGo"), hit = e.target.closest("[data-hit]"), jc = e.target.closest("[data-jc]"), jp = e.target.closest("[data-jp]");
    if (go) { const h = jumpHits[0]; if (h) { closeJump(); jumpToMM(h.mm, h.id); } return; }
    if (hit) { const h = jumpHits[+hit.dataset.hit]; closeJump(); jumpToMM(h.mm, h.id); return; }
    if (jc) { closeJump(); scrollToStep(document.querySelector(`[data-chapter="${jc.dataset.jc}"]`)); return; }
    if (jp) {
      closeJump();
      const t = jp.dataset.jp;
      if (t === "top") window.scrollTo({ top: 0, behavior: "instant" });
      else if (t === "weekend") scrollToStep(steps[1]);
      else scrollToPanel(t);
    }
  });

  // open from the HUD (now a button), the top-bar nav, or the "j" key
  const hud = document.querySelector(".hud");
  hud.setAttribute("role", "button"); hud.tabIndex = 0; hud.setAttribute("aria-label", "Jump to a mile marker or section");
  hud.insertAdjacentHTML("beforeend", '<span class="hud-jump">Jump <i aria-hidden="true">▾</i></span>');
  hud.addEventListener("click", openJump);
  hud.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openJump(); } });
  document.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "j" && !e.metaKey && !e.ctrlKey && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName) && !document.querySelector("dialog[open]")) { e.preventDefault(); openJump(); }
  });
  document.querySelectorAll(".jump a").forEach((a) => a.addEventListener("click", (e) => {
    e.preventDefault(); leaveExplore();
    const id = a.getAttribute("href").slice(1);
    if (id === "weekend") scrollToStep(steps[1]); else if (id === "course") scrollToStep(document.querySelector("#course .step")); else scrollToPanel(id);
  }));

  main.addEventListener("click", (e) => {
    const g = e.target.closest("[data-goto-wk]");
    if (g) scrollToStep(document.querySelector(`[data-wk="${g.dataset.gotoWk}"]`));
  });

  // ---- arriving: honour #c8 / #mm-35 / #rules, otherwise offer to resume
  function restoreFromHash() {
    const h = decodeURIComponent(location.hash.slice(1));
    if (!h) return false;
    const mmMatch = h.match(/^mm-?(\d+(?:\.\d+)?)$/i);
    if (mmMatch) { jumpToMM(parseFloat(mmMatch[1])); return true; }
    const step = document.querySelector(`[data-chapter="${h}"]`);
    if (step) { scrollToStep(step); return true; }
    if (h === "rules" || h === "planner") { scrollToPanel(h); return true; }
    if (h === "weekend") { scrollToStep(steps[1]); return true; }
    if (h === "course") { scrollToStep(document.querySelector("#course .step")); return true; }
    return false;
  }
  function offerResume() {
    if (!lastPos || firstVisit || window.scrollY > 100) return;
    if (!lastPos.panel && !(lastPos.idx > 0)) return;
    const t = document.createElement("div");
    t.className = "resume";
    t.innerHTML = `<div><small>Pick up where you left off?</small><b>${esc(lastPos.label || "")}</b></div>
      <button type="button" class="btn">Go</button><button type="button" class="resume-x" aria-label="Dismiss">×</button>`;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add("show"));
    const startY = window.scrollY;
    const onScroll = () => { if (Math.abs(window.scrollY - startY) > 400) hide(); };
    const hide = () => { hideResume = () => {}; window.removeEventListener("scroll", onScroll); t.classList.remove("show"); setTimeout(() => t.remove(), 300); };
    hideResume = hide;
    window.addEventListener("scroll", onScroll, { passive: true });
    t.querySelector(".btn").addEventListener("click", () => {
      hide();
      if (lastPos.panel) scrollToPanel(lastPos.panel);
      else if (lastPos.chapter && document.querySelector(`[data-chapter="${lastPos.chapter}"]`)) scrollToStep(document.querySelector(`[data-chapter="${lastPos.chapter}"]`));
      else if (steps[lastPos.idx]) scrollToStep(steps[lastPos.idx]);
    });
    t.querySelector(".resume-x").addEventListener("click", hide);
    setTimeout(hide, 15000);
  }

  // ================================================================ checklist
  const checked = store.get("checks", {});
  document.getElementById("checklist").addEventListener("change", (e) => { checked[e.target.dataset.i] = e.target.checked; store.set("checks", checked); });

  // ================================================================ planner
  const $ = (id) => document.getElementById(id);
  const plan = Object.assign({ start: R.start, h: R.goalH, m: 0, stop: 3, fade: "0.15", rows: "meet" }, store.get("plan-" + S.race, {}));
  $("pStart").value = plan.start; $("pHours").value = plan.h; $("pMins").value = plan.m; $("pFade").value = plan.fade; $("pStop").value = plan.stop;

  function fmtClock(a) {
    a = Math.round(a);
    const day = ["Sat", "Sun", "Mon"][Math.floor(a / 1440)] || "";
    const mod = ((a % 1440) + 1440) % 1440;
    let h = Math.floor(mod / 60); const m = mod % 60, ap = h >= 12 ? "pm" : "am"; h = h % 12 || 12;
    return `${day} ${h}:${String(m).padStart(2, "0")}${ap}`;
  }
  const fmtDur = (m) => { m = Math.round(m); return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`; };
  const isNight = (a) => { const mod = a % 1440; return mod >= 19.5 * 60 || mod < 6 * 60; };

  let lastPlan = null;
  function renderPlanner() {
    const [sh, sm] = (plan.start || R.start).split(":").map(Number);
    const startAbs = sh * 60 + sm;
    const total = Math.max(60, (+plan.h || 0) * 60 + (+plan.m || 0));
    // Pace drifts linearly slower: pace(x) = a·(1 + c·x) min/mile, x = miles covered.
    // c is chosen so the 2nd half averages (1 + f)× the 1st half; a so the total hits the goal.
    const f = +plan.fade, D = START;
    // crew stops: every meet-up in this view between start and finish, at the average dwell time
    const spm = Math.max(0, Math.min(60, +plan.stop || 0));
    const stopXs = [], picks = pickedLocs(), usingPicks = picks.length > 0;
    (usingPicks ? picks : LOC.filter(pickable))
      .map((l) => D - l.mm).sort((p, q) => p - q)
      .forEach((x) => { if (!stopXs.length || x - stopXs[stopXs.length - 1] > 0.05) stopXs.push(x); });
    const stopTotal = stopXs.length * spm;
    const moving = Math.max(total - stopTotal, D * 4);           // never faster than 4 min/mi
    const stopsBefore = (x) => stopXs.filter((s) => s < x - 0.05).length;
    const isStopAt = (x) => stopXs.some((s) => Math.abs(s - x) <= 0.05);
    const c = (4 * f) / (D * (2 - f));
    const a = moving / (D * (1 + (c * D) / 2));
    const elapsed = (x) => a * x + (a * c * x * x) / 2;
    const paceAt = (x) => a * (1 + c * x);
    // arrival = moving time + every stop already made; leaving adds this stop's dwell
    const etaAt = (mm) => { const x = Math.max(0, D - mm); return startAbs + elapsed(x) + stopsBefore(x) * spm; };
    const leaveAt = (mm) => { const x = Math.max(0, D - mm); return etaAt(mm) + (isStopAt(x) ? spm : 0); };
    const fmtPace = (m) => { const t = Math.round(m * 60); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`; };

    const finishAbs = etaAt(0), finishDur = finishAbs - startAbs;   // equals the goal unless the stops don't fit
    const pills = [`<span class="pill${finishDur > total + 1 ? " bad" : ""}">Finish ≈ <b>${fmtClock(finishAbs)}</b>${finishDur > total + 1 ? ` (${fmtDur(finishDur)}, slower than goal)` : ""}</span>`,
      `<span class="pill">${spm ? "Moving pace" : "Avg pace"} <b>${fmtPace(moving / D)}</b>/mi${f ? ` · starts ${fmtPace(paceAt(0))} → ends ${fmtPace(paceAt(D))}` : ""}</span>`,
      ...(spm ? [total - stopTotal < D * 4
        ? `<span class="pill bad">${stopXs.length} stops × ${spm} min doesn't fit in the goal time</span>`
        : `<span class="pill">⏱ ${stopXs.length} ${usingPicks ? "planned" : "crew"} stops × ${spm} min = <b>${fmtDur(stopTotal)}</b> stopped${usingPicks ? "" : " (every meet-up: pick yours with ☆)"}</span>`] : []),
      finishDur <= R.limit * 60 ? `<span class="pill good">Within the ${R.limit}h limit</span>` : `<span class="pill bad">Over the ${R.limit}h limit</span>`];
    let nf = null, nt = null;
    for (let mm = D; mm >= 0; mm -= 0.1) { const a = etaAt(mm); if (a >= 1170 && a < 1800) { if (nf === null) nf = mm; nt = mm; } }
    if (nf !== null) pills.push(`<span class="pill">☾ Saturday night ≈ MM ${nf.toFixed(0)} → ${nt <= 0.2 ? "finish" : nt.toFixed(0)}</span>`);
    if (S.race === "100") {
      const bad = window.CUTOFFS.filter((c) => leaveAt(c.mm) > c.hour * 60);
      pills.push(bad.length ? `<span class="pill bad">Misses ${bad.length} cutoff${bad.length > 1 ? "s" : ""}</span>` : `<span class="pill good">Makes all 3 cutoffs</span>`);
      if (leaveAt(50) > 16.5 * 60) pills.push(`<span class="pill">Leaves MM 50 after 4:30pm: night gear</span>`);
    }
    $("planSummary").innerHTML = pills.join("");

    const q = $("tSearch").value.trim().toLowerCase();
    const cut = {}; if (S.race === "100") window.CUTOFFS.forEach((c) => (cut[c.mm] = c));
    lastPlan = { etaAt, leaveAt, startAbs, spm, total };
    const rows = LOC.filter((l) => {
      if (plan.rows === "mine" && !((pickable(l) && isPicked(l.key)) || l.kind === "start" || l.kind === "finish" || (l.kind === "timing" && cut[l.mm]))) return false;
      if (plan.rows === "meet" && !(l.meet || l.kind === "finish" || l.kind === "timing" || l.kind === "start")) return false;
      if (q && !(l.title + " " + l.text + " " + l.label + (l.t ? " bathroom toilet wc" : "") + " " + l.kind).toLowerCase().includes(q)) return false;
      return true;
    });
    let prevX = null;
    $("stopsTable").querySelector("tbody").innerHTML = rows.length ? rows.map((l) => {
      const a = etaAt(l.mm), c = l.kind === "timing" && cut[l.mm], d = detailFor(l);
      const x = Math.max(0, D - l.mm);
      const legPace = prevX === null || x - prevX < 0.05 ? null : (elapsed(x) - elapsed(prevX)) / (x - prevX);
      if (prevX === null || x - prevX >= 0.05) prevX = x;
      const paceTxt = legPace ? `${fmtPace(legPace)}<small>/mi</small>` : (x < 0.05 ? '<small>start</small>' : '<small>same spot</small>');
      const lv = leaveAt(l.mm);
      // next stop: in your plan when this row is in it (or is the start), otherwise the next meet-up
      let nxHtml = "", nxM = "";
      if (hasNext(l)) {
        const inPlan = usingPicks && ((pickable(l) && isPicked(l.key)) || l.kind === "start");
        const t = inPlan ? nextPlanned(l.mm) : nextMeet(l.mm), tmm = t ? t.mm : 0;
        const dur = etaAt(tmm) - lv, d = mi(l.mm - tmm), what = t ? `MM ${t.label}` : "finish";
        nxHtml = `<b>${d}</b><small>${fmtDur(dur).replace(/^0h/, "")}${/^0h/.test(fmtDur(dur)) ? " min" : ""} · ${inPlan ? "plan → " : ""}${what}</small>`;
        nxM = `<div class="n nx-m">→ ${inPlan ? "Next in our plan" : "Next meet-up"} <b>${d}</b> · ${what} · ${fmtDur(dur).replace(/^0h/, "")}${/^0h/.test(fmtDur(dur)) ? " min" : ""}</div>`;
      }
      const cutHtml = c ? (c.hour * 60 - lv >= 0 ? `<div class="cutflag ok">LEAVE BY ${c.time.toUpperCase()} · ${fmtDur(c.hour * 60 - lv)} spare</div>` : `<div class="cutflag bad">LEAVES AFTER THE ${c.time.toUpperCase()} CUTOFF</div>`) : "";
      const [day, time] = fmtClock(a).split(" ");
      return `<tr class="k-${l.kind} ${MINOR.has(l.kind) || l.kind === "warn" || l.kind === "cross" ? "minor" : ""} ${c ? "cut-row" : ""}${pickable(l) && isPicked(l.key) ? " picked" : ""}">
        <td><span class="mm">${l.label}</span></td><td class="nxt">${nxHtml}</td>
        <td><div class="eta ${isNight(a) ? "night" : ""}">${time}<small>${day} · +${fmtDur(a - startAbs)}</small>${spm && lv > a ? `<small class="leave">leave ${fmtClock(lv).split(" ")[1]}</small>` : ""}<small class="pace-m">${legPace ? `${fmtPace(legPace)}/mi pace` : ""}</small></div></td>
        <td class="pace">${paceTxt}</td>
        <td><div class="t">${l.title}${chipsFor(l)}</div>${d ? `<div class="d">${d}</div>` : ""}${cutHtml}${nxM}${locNav(l, true)}${mineHtml(l)}</td></tr>`;
    }).join("") : `<tr><td colspan="5" class="empty">${plan.rows === "mine" ? "No stops in your plan yet. Switch to Meet-ups and tap ☆ Add to plan." : "No stops match."}</td></tr>`;
    $("myCount").textContent = usingPicks ? `${picks.length} stop${picks.length === 1 ? "" : "s"} picked` : "No stops picked yet";
    queueShare();
  }
  function readPlanner() {
    Object.assign(plan, { start: $("pStart").value, h: $("pHours").value, m: $("pMins").value, fade: $("pFade").value, stop: $("pStop").value });
    store.set("plan-" + S.race, plan); renderPlanner();
  }
  $("plannerForm").addEventListener("input", readPlanner);
  $("plannerForm").addEventListener("change", readPlanner);
  $("tSearch").addEventListener("input", renderPlanner);
  const segBtns = document.querySelectorAll(".table-tools .seg button");
  const syncSeg = () => segBtns.forEach((x) => x.classList.toggle("on", x.dataset.rows === plan.rows));
  document.querySelector(".table-tools .seg").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    plan.rows = b.dataset.rows; store.set("plan-" + S.race, plan); syncSeg(); renderPlanner();
  });

  // ================================================================ your plan: pick, note, share
  const plainText = (h) => { const d = document.createElement("div"); d.innerHTML = h; return d.textContent.replace(/\s+/g, " ").trim(); };
  function syncMine() {
    document.querySelectorAll(".mine").forEach((m) => {
      const l = LOCBYKEY[m.dataset.key]; if (!l) return;
      if (m.contains(document.activeElement)) { const on = isPicked(l.key), b = m.querySelector(".pick-btn"); b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); b.textContent = on ? "★ In our plan" : "☆ Add to plan"; }
      else m.outerHTML = mineHtml(l);
    });
    document.querySelectorAll(".stop[data-id]").forEach((li) => { const l = LOC[+li.dataset.id]; li.classList.toggle("picked", pickable(l) && isPicked(l.key)); });
    refreshNext();
    emphasize(emphasized);
  }
  function planChanged() { saveMy(); syncMine(); renderPlanner(); }
  document.addEventListener("click", (e) => {
    const p = e.target.closest("[data-pick]");
    if (p) {
      e.stopPropagation();
      const k = p.dataset.pick, st = my.stops[k] || (my.stops[k] = {});
      st.on = !st.on; if (!st.on) delete st.on; if (!st.on && !st.note) delete my.stops[k];
      planChanged();
      if (isPicked(k)) say(`MM ${LOCBYKEY[k].label} added to your plan`);
      return;
    }
    const n = e.target.closest("[data-note-open]");
    if (n) {
      e.stopPropagation();
      const m = n.closest(".mine"), ta = m.querySelector("textarea");
      n.remove(); ta.hidden = false; ta.focus();
    }
  });
  let noteT = null;
  document.addEventListener("input", (e) => {
    const ta = e.target.closest("textarea[data-note]");
    if (!ta) return;
    const k = ta.dataset.note, st = my.stops[k] || (my.stops[k] = {});
    st.note = ta.value; if (!st.note) delete st.note; if (!st.on && !st.note) delete my.stops[k];
    saveMy();
    document.querySelectorAll(`textarea[data-note="${k}"]`).forEach((t) => { if (t !== ta) { t.value = ta.value; t.hidden = false; } });
    clearTimeout(noteT); noteT = setTimeout(queueShare, 400);
  });
  $("myNotes").value = my.notes || "";
  $("myNotes").addEventListener("input", (e) => { my.notes = e.target.value; saveMy(); clearTimeout(noteT); noteT = setTimeout(queueShare, 400); });

  // share links carry the plan in the #hash, so it never reaches a server
  const b64u = (u8) => { let t = ""; u8.forEach((b) => (t += String.fromCharCode(b))); return btoa(t).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
  const unb64u = (t) => Uint8Array.from(atob(t.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  async function packPlan() {
    const data = { v: 1, r: S.race, s: Object.entries(my.stops).map(([k, v]) => (v.note ? [k, v.on ? 1 : 0, v.note] : [k, v.on ? 1 : 0])),
      n: my.notes || "", p: { start: plan.start, h: plan.h, m: plan.m, stop: plan.stop, fade: plan.fade } };
    const json = JSON.stringify(data);
    try {
      if (window.CompressionStream) {
        const cs = new Blob([json]).stream().pipeThrough(new CompressionStream("deflate-raw"));
        return "z" + b64u(new Uint8Array(await new Response(cs).arrayBuffer()));
      }
    } catch (e) { /* plain below */ }
    return "j" + b64u(new TextEncoder().encode(json));
  }
  async function unpackPlan(code) {
    const u8 = unb64u(code.slice(1));
    const json = code[0] === "z"
      ? await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).text()
      : new TextDecoder().decode(u8);
    return JSON.parse(json);
  }
  // build the link ahead of time: phones only allow share/copy right inside the tap
  let shareUrl = null, shareT = null;
  function queueShare() { clearTimeout(shareT); shareT = setTimeout(async () => { shareUrl = location.origin + location.pathname + "#plan=" + (await packPlan()); }, 150); }
  $("shareBtn").addEventListener("click", async () => {
    const url = shareUrl || location.origin + location.pathname + "#plan=" + (await packPlan());
    const title = `Our KEYS100 ${R.name} plan`;
    if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      try { await navigator.share({ title, text: `${title}. Open to load it into your guide:`, url }); return; } catch (e) { if (e.name === "AbortError") return; }
    }
    if (await copyText(url)) say("Link copied. Text or email it to your crew.");
    else window.prompt("Copy this link and send it to your crew:", url);
  });
  function planText() {
    const lp = lastPlan, out = [`KEYS100 ${R.name}: our plan`];
    if (lp) out.push(`Start ${fmtClock(lp.startAbs).split(" ")[1]} Sat · goal ${fmtDur(lp.total)} · ${lp.spm} min per stop`);
    if (my.notes) out.push("", my.notes.trim());
    const picks = pickedLocs();
    out.push("", picks.length ? "Stops:" : "No stops picked yet.");
    picks.forEach((l) => {
      out.push(`MM ${l.label}${lp ? ` · ${fmtClock(lp.etaAt(l.mm))}` : ""} · ${plainText(l.title)}`);
      if (noteOf(l.key)) out.push(`   → ${noteOf(l.key)}`);
      if (showNav) out.push(`   ${fmtLL(locLL(l))}`);
    });
    if (shareUrl) out.push("", "Open in the guide: " + shareUrl);
    return out.join("\n");
  }
  $("copyPlanBtn").addEventListener("click", async () => {
    const t = planText();
    if (await copyText(t)) say("Plan copied as text. Paste it into a note or message.");
    else window.prompt("Copy your plan:", t);
  });
  $("clearPlanBtn").addEventListener("click", () => {
    if (!window.confirm("Clear your picked stops and notes on this device?")) return;
    my.stops = {}; my.notes = ""; $("myNotes").value = ""; planChanged(); say("Plan cleared");
  });

  // opening a shared link: load it, asking first if it would replace a different plan
  const askDlg = document.createElement("dialog");
  askDlg.className = "setup ask";
  document.body.appendChild(askDlg);
  function askReplace(n) {
    askDlg.innerHTML = `<form method="dialog" class="setup-form"><h2>Load the shared plan?</h2>
      <p>This link has a plan with <b>${n} stop${n === 1 ? "" : "s"}</b>. Loading it replaces the plan already saved on this device.</p>
      <div class="setup-actions"><button value="keep" class="btn ghost">Keep mine</button><button value="load" class="btn">Load shared plan</button></div></form>`;
    return new Promise((res) => { askDlg.addEventListener("close", () => res(askDlg.returnValue === "load"), { once: true }); askDlg.showModal(); });
  }
  async function importPlan(code) {
    let d;
    try { d = await unpackPlan(code); } catch (e) { say("That plan link looks broken. Ask for a fresh one."); return; }
    const inc = {};
    (d.s || []).forEach(([k, on, note]) => { const v = {}; if (on) v.on = true; if (note) v.note = note; if (on || note) inc[k] = v; });
    const n = Object.values(inc).filter((v) => v.on).length;
    const norm = (o) => JSON.stringify(Object.keys(o).sort().map((k) => [k, !!o[k].on, o[k].note || ""]));
    const mine = Object.keys(my.stops).length || (my.notes || "").trim();
    const same = norm(inc) === norm(my.stops) && (d.n || "") === (my.notes || "");
    if (mine && !same && !(await askReplace(n))) { say("Kept your plan"); return; }
    my.stops = inc; my.notes = d.n || ""; $("myNotes").value = my.notes;
    if (d.p) {
      Object.assign(plan, d.p); store.set("plan-" + S.race, plan);
      $("pStart").value = plan.start; $("pHours").value = plan.h; $("pMins").value = plan.m; $("pFade").value = plan.fade; $("pStop").value = plan.stop;
    }
    plan.rows = "mine"; store.set("plan-" + S.race, plan); syncSeg();
    planChanged();
    scrollToPanel("planner");
    say(`Plan loaded: ${n} stop${n === 1 ? "" : "s"}`);
  }

  // ================================================================ init
  syncSeg();
  renderPlanner();
  map.fitBounds(raceBounds, padding());
  activate(steps[0]);
  if ("scrollRestoration" in history && location.hash) history.scrollRestoration = "manual";
  setTimeout(() => {
    if (sharedCode) importPlan(sharedCode);
    else if (!restoreFromHash()) offerResume();
    booted = true;
  }, 60);
  window.addEventListener("resize", () => map.invalidateSize());
})();
