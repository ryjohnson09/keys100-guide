// Everything except the stop list. Each item can carry `on`: space-separated tags.
//   race:  100 | 50 | 50k      role: runner | crew      team: solo | team
// Within each group, an item shows when the reader's choice is listed (or when
// that group isn't mentioned at all). A reader who picks "both" sees every item in that group.

window.RACES = {
  "100": { name: "100 mile", short: "100 MI", startMM: 99.8, page: "100.html", limit: 32, start: "05:30", goalH: 24,
    startPlace: "Key Largo Community Park", startTime: "5:15–6:30am waves" },
  "50":  { name: "50 mile", short: "50 MI", startMM: 50, page: "50.html", limit: 20, start: "09:00", goalH: 11,
    startPlace: "Marathon Garden Club", startTime: "9:00am waves" },
  "50k": { name: "50K", short: "50K", startMM: 31, page: "50k.html", limit: 12, start: "12:00", goalH: 6,
    startPlace: "Lower Keys Chamber, Big Pine Key", startTime: "12:00pm waves" },
};

window.CUTOFFS = [
  { mm: 50, place: "Marathon Garden Club", time: "11:00pm Sat", hour: 23 },
  { mm: 39.9, place: "West end of Seven Mile Bridge", time: "2:00am Sun", hour: 26 },
  { mm: 24.9, place: "Summerland Key", time: "7:00am Sun", hour: 31 },
];

// ---------------------------------------------------------------- race weekend
// view: "overview" | { mm, zoom } | { latlng, zoom } | "cutoffs"
window.WEEKEND = [
  { view: "overview", kicker: "Before race week", title: "Watch the orientation video",
    html: `<p>There's <strong>no live orientation</strong>. The online video is <strong>required</strong> for every runner, crew member and team driver.</p>
      <div class="callout red"><b>Everyone is equally responsible.</b> Runners answer for their crew's actions, and crews answer for their runner's.</div>` },

  { on: "100", view: { mm: 99.9, zoom: 15 }, kicker: "Friday, May 15 · Key Largo", title: "Packet pick-up",
    html: `<ul class="timeline">
      <li><time>3:00–8:00pm</time><span>Under the tiki hut behind the Holiday Inn, Key Largo. <b>Required for 100-milers and 100-mile teams.</b></span></li>
      <li><time>4:00–5:30pm</time><span><b>Experts Clinic</b> inside the Holiday Inn. Highly recommended for first-timers. Also livestreamed on Facebook.</span></li></ul>` },
  { on: "50 50k", view: { mm: 99.9, zoom: 15 }, kicker: "Friday, May 15 · Key Largo · optional", title: "Early pick-up & Experts Clinic",
    html: `<p>You can pick up your packet here Friday 3:00–8:00pm, <em>or</em> on Saturday at your own start.</p>
      <p class="muted">Experts Clinic, 4:00–5:30pm at the Holiday Inn, is also livestreamed on Facebook.</p>` },

  { on: "100", view: { mm: 99.8, zoom: 16 }, kicker: "Saturday, May 16 · Key Largo Community Park", title: "Your start",
    html: `<ul class="timeline">
      <li><time>4:30am</time><span>Park bathrooms open.</span></li>
      <li><time>5:10am</time><span>Announcements &amp; anthem.</span></li>
      <li><time>5:15am</time><span>First of three elite waves.</span></li>
      <li><time>5:30am</time><span>Corral #1, then a group every five minutes.</span></li></ul>
      <div class="callout amber" data-on="runner"><b>Dark start:</b> before 6:00am wear front &amp; rear blinking lights; a headlamp is strongly urged. Off after 6:15am.</div>` },

  { on: "50", view: { mm: 50, zoom: 15 }, kicker: "Saturday · Marathon Garden Club · MM 50", title: "Your start",
    html: `<ul class="timeline">
      <li><time>7:15–8:45am</time><span><b>Drive-by</b> pick-up at St. Columba Episcopal Church, behind the Garden Club (451 52nd St, Gulf).</span></li>
      <li><time>8:45am</time><span>Q&amp;A with the race director.</span></li>
      <li><time>9:00am</time><span>First wave, then every 5 minutes.</span></li></ul>
      <div class="callout red" data-on="crew"><b>Park ONLY in the Winn‑Dixie lot</b> across US‑1, past the light. Not Publix or CVS, and not the Garden Club. Walk across at the crosswalk.</div>` },

  { on: "50k", view: { mm: 31, zoom: 15 }, kicker: "Saturday · Lower Keys Chamber · MM 31", title: "Your start",
    html: `<ul class="timeline">
      <li><time>10:30–11:50am</time><span>Pick-up &amp; check-in.</span></li>
      <li><time>11:45am</time><span>Q&amp;A with the race director.</span></li>
      <li><time>12:00pm</time><span>First wave, then every 5 minutes.</span></li></ul>
      <p class="muted" data-on="crew">Don't block access or park in front of the Chamber building. Bathrooms are outside, left of the entrance.</p>` },

  { view: "cutoffs", kicker: "The clock", title: "Time limits", html: null /* built by app */ },

  { view: { mm: 0, zoom: 16 }, kicker: "Higgs Beach · Key West", title: "The finish",
    html: `<ul class="timeline">
      <li><time>Sat 3–4pm</time><span>Finish opens. Food &amp; drinks for finishers and <em>registered</em> crew.</span></li>
      <li><time>Sun 3–4pm</time><span>Closes 32h after the last starter.</span></li></ul>
      <p class="muted" data-on="crew">Park near the finish. Meet your runner at White St (blinking light) to run the last 250 yards together.</p>
      <p class="muted">Friends &amp; family who aren't registered crew: start and finish only. No driving the course.</p>` },

  { view: { latlng: [24.5536, -81.7985], zoom: 14 }, kicker: "Sunday, May 17 · Key West", title: "Awards & after-party",
    html: (s) => `<ul class="timeline">
      <li><time>${s.race === "100" ? "12:00pm" : "11:00am"}</time><span>Your awards (${s.race === "100" ? "100 mile" : "50 mile &amp; 50K"}). Live music from 10:30am.</span></li>
      <li><time>4:00–7:00pm</time><span>After-party at "The Alamo" (formerly Smokin' Tuna), 4 Charles St.</span></li></ul>
      <p class="muted">Leaving early? Check whether you won before you leave the finish. Awards can be picked up there.</p>` },
];

// ---------------------------------------------------------------- course sections
window.CHAPTERS = [
  { id: "c1", from: 100, to: 90, title: "Key Largo", sub: "Lights, the median path & the first crossings",
    alerts: [
      ["amber", "Starting before 6:00am: front & rear blinking lights. Off after 6:15am.", "runner"],
      ["info", "0.2 mi in, cross US‑1 with the Deputy to the median bike path (3 mi), then back to the OCEAN side at MM 96.5.", "runner"],
      ["info", "First meet-up: MM 97.6, 2.2 miles in."],
      ["info", "MM 95.1 is a team-only exchange.", "team"],
      ["info", "MM 94.7 is for solo crews only (J&M Scaffolding).", "solo"],
      ["amber", "MM 91.5: park in the lot, never a driveway or the shoulder. Cross at the light.", "crew"],
      ["info", "Pacers may join from MM 90.1, Coral Shores High School.", "solo"],
    ] },
  { id: "c2", from: 90, to: 84, title: "Plantation Key", sub: "Service road & the Snake Creek drawbridge",
    alerts: [
      ["amber", "On the service road, run on the LEFT facing traffic, not in the right-side bike lane.", "runner"],
      ["red", "Snake Creek drawbridge (MM 85.7): gates down or lights flashing = STOP until it reopens. Violation = DQ."],
      ["red", "Don't go onto Hog Heaven property looking for a bathroom.", "crew"],
    ] },
  { id: "c3", from: 84, to: 77.2, title: "Islamorada", sub: "Runners and vehicles split up",
    alerts: [
      ["red", "NEW: at MM 83, vehicles stay on the main road all the way to MM 80.2. Don't turn at Green Turtle Inn.", "crew"],
      ["amber", "At MM 83, take the service road on the left, not the main highway.", "runner"],
      ["info", "The only crew stop here is MM 80.2, past Midway Café. Crews cross with the Sheriff."],
      ["red", "Robbie's Marina (MM 77.3) is off limits, entrance road included.", "crew"],
    ] },
  { id: "c4", from: 77.2, to: 68, title: "Lower Matecumbe & Channel 5", sub: "Bay side, then the first big bridge",
    alerts: [
      ["info", "MM 77.0: cross to the BAY side with the Deputy and stay there 5.2 miles.", "runner"],
      ["amber", "MM 74.9 timing has no staff. Make sure the sensor picks you up."],
      ["info", "Before Channel 5, park at Channel 2 or at the foot of Channel 5.", "solo"],
      ["info", "Team exchange is on the far side of Channel 5 (MM 70.8).", "team"],
      ["red", "Sea Bird Marina (MM 69.5): entering the property = IMMEDIATE DQ."],
      ["amber", "Layton Kwik Stop (MM 68.1) gets crowded. Meet your runner, then leave.", "crew"],
    ] },
  { id: "c5", from: 68, to: 58.5, title: "Long Key to Duck Key", sub: "Flooding path, long bridge, Cable Park",
    alerts: [
      ["amber", "MM 67.4: the bike path floods. Step to the shoulder only while it's under water.", "runner"],
      ["red", "The Long Key Bridge lots are NOT meet-ups.", "crew"],
      ["info", "Three Duck Key options: 61.5, 61.2, 60.8."],
      ["amber", "MM 59.0: park on the rough BAY-side service road (U-turn at Dorset Dr, face north). Stay out of Keys Cable Park.", "crew"],
    ] },
  { id: "c6", from: 58.5, to: 49.9, title: "Hell's Tunnel to Marathon", sub: "Halfway & the first cutoff",
    alerts: [
      ["info", "MM 58.3: cross at Guava Dr into “Hell's Tunnel”. Stay on the BAY side 11 miles.", "runner"],
      ["info", "Kyle Ave (MM 57.4) is a team-only exchange.", "team"],
      ["info", "MM 55.4 is for solo crews only.", "solo"],
      ["red", "CUTOFF: leave Marathon Garden Club (MM 50) before 11:00pm.", "100"],
      ["amber", "Leaving MM 50 after 4:30pm? Runners must wear or carry night gear for Seven Mile Bridge.", "100"],
    ] },
  { id: "c7", from: 49.9, to: 39.5, title: "Seven Mile Bridge", sub: "Seven miles with no help at all",
    alerts: [
      ["red", "No support of any kind on a bridge. A runner who has to be picked up on the bridge is DQ'd.", "100 50"],
      ["info", "Your last crew stop before the bridge is MM 46.9.", "100 runner"],
      ["amber", "Isla Bella Marketplace (46.9) holds 6 vehicles. Meet your runner, LEAVE, and wait about an hour in Marathon before you drive over.", "100 crew"],
      ["info", "Water-only stop at MM 47.1. Your crew meets you on the far side.", "50 solo"],
      ["info", "Last exchange: Courtyard Hotel, MM 48 (8.1 mi to the next).", "50 team"],
      ["amber", "Stay in Marathon until your runner's expected time across, then drive over.", "50 crew"],
      ["red", "Far side: park on the BAY side only. Meet your runner only PAST the Veterans Park driveway.", "crew"],
      ["info", "Here only, all of your crew may cross to meet you, with the Sheriff.", "crew"],
      ["amber", "On the far side, keep moving until you're past the Veterans Park driveway.", "runner"],
      ["red", "CUTOFF: leave the MM 40 timing station before 2:00am.", "100"],
      ["info", "50-mile pacers may join after the bridge.", "50 solo"],
    ] },
  { id: "c8", from: 39.5, to: 30, title: "Bahia Honda & Big Pine", sub: "Big bridges and Key deer",
    alerts: [
      ["red", "Don't stop at the Bahia Honda State Park entrance. Meet on the far side (MM 35.2).", "100 50 crew"],
      ["info", "No crew until the far side of Bahia Honda Bridge (MM 35.2).", "100 50 runner"],
      ["amber", "Big Pine Key is protected Key deer habitat. Obey the speed limit.", "crew"],
      ["info", "Your race starts at MM 31. First meet-up is MM 28.4.", "50k"],
      ["info", "Tom Thumb (MM 30.4) is open all night.", "100"],
    ] },
  { id: "c9", from: 30, to: 23.2, title: "Torch Keys & Summerland", sub: "The last cutoff",
    alerts: [
      ["amber", "MM 28.4: use the dirt area off Barry Ave. Never the US‑1 shoulder.", "crew"],
      ["red", "CUTOFF: leave the Summerland Key timing station (MM 24.9) before 7:00am.", "100"],
      ["info", "Pacers may join from Kemp Channel (MM 23.7).", "50k solo"],
    ] },
  { id: "c10", from: 23.2, to: 13, title: "Cudjoe to Saddlebunch", sub: "Which stop is open depends on the time",
    alerts: [
      ["red", "Cudjoe: 4:30pm Sat to 7:00am Sun, meet at “Morning Joint” (22.8). At all other times, the Sheriff lot (21.0)."],
      ["amber", "Pedestrian bridges open: Bow, Park, Saddle Bunch #2–5. Closed: Lower Sugarloaf (15.6).", "runner"],
      ["info", "Sugarloaf Lodge (16.9): park at the far end and keep quiet at night.", "crew"],
    ] },
  { id: "c11", from: 13, to: 3.85, title: "Big Coppitt to Stock Island", sub: "NAS overpass & crossing under US‑1",
    alerts: [
      ["amber", "Naval Air Station (MM 8.1): stay on the sidewalk below the overpass.", "runner"],
      ["amber", "MM 8.1: take the NAS exit, loop under the highway, park northbound on the right shoulder.", "crew"],
      ["info", "MM 6.1: go UNDER US‑1 to the BAY-side bike path.", "runner"],
      ["amber", "Key Haven (MM 5.0): gravel area only, never the gas station lot.", "crew"],
    ] },
  { id: "c12", from: 3.85, to: -1, title: "Key West", sub: "The last 3.8 miles",
    alerts: [
      ["info", "At the “T” light, turn LEFT and cross with the light to the S. Roosevelt sidewalk. Ignore MM signs from here.", "runner"],
      ["red", "Martello Tower East (MM 2.1) is the LAST place to meet or exchange."],
      ["info", "Crew can join the runner at White St (blinking light) for the final 250 yards."],
    ] },
];

// ---------------------------------------------------------------- rules
window.RULES = [
  { title: "Be seen", color: "var(--orange)", items: [
    ["", "Everyone (runners, crew, drivers) wears the race's reflective <strong>vest at all times</strong>."],
    ["", "<strong>Night (7:30pm–6:00am):</strong> outside the vehicle, blinking LEDs front <em>and</em> rear plus 360° reflective gear."],
    ["100", "Leaving MM 50 after <strong>4:30pm</strong>? Wear or carry night gear for Seven Mile Bridge."],
    ["crew", "Vehicle headlights on whenever driving, <strong>24 hours a day</strong>."],
  ] },
  { title: "Where to run", color: "var(--teal)", on: "runner", items: [
    ["", "On the shoulder: <strong>OCEAN side, facing traffic</strong>. Always."],
    ["", "Where the course says bike path or sidewalk, you <strong>must</strong> use it. Otherwise it counts as cutting the course."],
    ["", "Cross only where instructed. Go off course and you may have to go back to where you left it."],
    ["", "No noise-cancelling earbuds. Open-ear (e.g. Shokz) or one earbud: discouraged but allowed."],
  ] },
  { title: "Crossing US‑1", color: "var(--red)", items: [
    ["solo", "At most <strong>ONE crew member plus a pacer</strong> (or a 2nd crew member) may cross."],
    ["team", "Only the <strong>new runner plus ONE</strong> team member may cross."],
    ["", "Wait for traffic both ways. <strong>Never</strong> make traffic slow or stop. Zero tolerance."],
    ["100 50 crew", "<strong>Exception at MM 40:</strong> all crew may cross, only past the Veterans Park driveway, with the Sheriff."],
  ] },
  { title: "Meeting up", color: "var(--blue-l)", items: [
    ["", "Support only at <strong>listed meet-ups</strong>. You don't have to use every one."],
    ["solo", "Runner and crew are <strong>never more than one meet-up apart</strong>."],
    ["", "<strong>No support on bridges</strong>, and nothing handed from a moving vehicle."],
    ["solo", "Every solo runner needs a crew (or a shared one). Running solo = DQ and a ban."],
  ] },
  { title: "Your crew", color: "var(--purple-l)", on: "crew", items: [
    ["", "Registered crew/drivers only. <strong>No spectators</strong> in the vehicle."],
    ["solo", "Max <strong>4 crew</strong>. Minimum age 15. A minor's parent or guardian must be on the crew."],
    ["team", "Max <strong>2 registered drivers</strong>."],
    ["", "Up to 2 photographers, pre-approved and registered 3+ weeks out, riding in your vehicle."],
  ] },
  { title: "Pacers", color: "var(--magenta)", items: [
    ["100 solo", "Allowed after the first 10 miles, from <strong>MM 90.1</strong> (Coral Shores HS)."],
    ["50 solo", "Allowed after <strong>Seven Mile Bridge</strong>."],
    ["50k solo", "Allowed from <strong>MM 23.7</strong> (Kemp Channel)."],
    ["solo", "Beside or behind, never in front. One at a time. <strong>No muling</strong>: runners carry their own gear."],
    ["team", "Night only: one registered team member may pace the active runner. Never a non-team member."],
    ["", "No bikes, skates or boards. Ever."],
  ] },
  { title: "Your vehicle", color: "var(--sea)", on: "crew", items: [
    ["", "<strong>One vehicle</strong>: car, SUV, minivan or full-size passenger van. Max 240″ L × 81″ W × 96″ H."],
    ["", "No RVs, campers, trailers, cargo vans or limos. No pets."],
    ["", "Park <strong>fully off the road</strong>. Doors never open into traffic. Never block driveways or bike paths."],
    ["", "Get back up to speed when you pull out. No slow-rolling beside your runner."],
  ] },
  { title: "Your body, your power", color: "var(--amber)", on: "runner", items: [
    ["", "<strong>No IVs or oxygen</strong>, for any reason. Using either = DQ."],
    ["", "No poles, umbrellas, shade covers or cooling vests. <strong>Ice in a bandana or buff is fine.</strong>"],
    ["", "Bib on the front, always visible."],
    ["team", "Also wear the <strong>team bib with chip</strong> past every timing point."],
  ] },
  { title: "Team requirement", color: "var(--blue)", on: "team", items: [
    ["", "Teams with a member living within 50 miles of the course must provide a <strong>volunteer for 4+ hours</strong>, registered online by <strong>May 1</strong>. Otherwise the team can't win awards."],
  ] },
  { title: "Decorum", color: "var(--muted)", items: [
    ["", "Toilets only. Flagrant violations = DQ. <strong>Pack out your trash.</strong>"],
    ["", "Store bathrooms: <strong>buy something</strong>. Stay off private property."],
    ["", "Quiet early and at night. People live here."],
  ] },
];

window.CHECKLIST = [
  ["crew", "Bib number on all 4 sides of the vehicle", "12″ letters, contrasting color"],
  ["crew", "“CAUTION: RUNNERS ON ROAD” sign on the rear", "Provided at check-in"],
  ["crew", "Blue painter's tape", "For mounting signs"],
  ["", "Reflective race vest for everyone", "Issued at check-in, worn at all times"],
  ["", "Blinking LED lights, front & rear", "Night is 7:30pm–6:00am"],
  ["100 runner", "Headlamp for the pre-6:00am start", ""],
  ["runner", "Bib on the front", ""],
  ["team runner", "Team bib + chip belt", "Worn by the active runner at timing points"],
  ["runner", "Open-ear audio only (or none)", "No noise-cancelling earbuds"],
  ["crew", "Everyone in the vehicle is registered", ""],
  ["crew", "Vehicle within size limits, insured, licensed drivers", ""],
  ["", "Watched the orientation video", "Required for everyone"],
  ["crew", "Trash bags + cash/card for store bathrooms", "Suggested"],
  ["", "Ice & bandana/buff for cooling", "Suggested: allowed and encouraged"],
];
