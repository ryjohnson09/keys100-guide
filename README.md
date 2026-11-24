# KEYS100 Runner & Crew Guide

An unofficial, scroll-through companion to the KEYS100 ultramarathon race guide (Key Largo → Key West).
Pick your race (100 mile / 50 mile / 50K), your role (runner / crew) and solo vs relay team, and the guide
shows only the course notes, meet-ups, cutoffs and rules that apply to you.

Built from the official 2026 KEYS100 Race Guide (updated 04.22.2026). The official guide and race marshals
always have the final word.

## Files
- `index.html`: setup page
- `100.html`, `50.html`, `50k.html`: the guide for each distance
- `js/data.js`: every stop from the meet-up tables
- `js/content.js`: race weekend, section alerts, rules and checklist (tagged by race / role / team)
- `js/route.js`: course line along US‑1 (OpenStreetMap data via OSRM)
- `js/app.js`: rendering, map and scrolling

To update for a new year, edit `js/data.js` and `js/content.js`.

Map imagery © Esri & contributors. Road geometry © OpenStreetMap contributors.

## How pins are placed (audit, Nov 2026)
- **Verified pins (55):** each named place in the guide (businesses, streets, bridges, parks) was looked up in OpenStreetMap
  within a few miles of its stated mile marker. A pin moved to the real spot only when the match sat close to the course
  (within ~60 m for street crossings, ~350 m for businesses and lots) **and** agreed with the guide's mile marker to within
  0.75 MM. Those pins carry `ll: [lat, lng]` in `js/data.js`.
- **Everything else** is placed by mile marker, using a calibration (`MM_ANCHORS` in `js/route.js`) built from
  OpenStreetMap mile-marker posts, Overseas Highway street addresses that encode the MM (e.g. 97600 = MM 97.6), bridge
  ends, and exact turns in Key West. Those popups say "Pin approx."
- The course line now starts at Key Largo Community Park (St Croix Pl → Laguna Ave → US‑1).
- Not verified (no reliable map match), still placed by mile marker: MM 95.1 team exchange, 82.2 Wendy's,
  81.9 Hurricane Monument, 81.4 Green Turtle Inn, 68.1 Kwik Stop, 67.4 flooding path, 60.8 far end of Duck Key,
  59.0 across from Keys Cable Park, 52.7 Beall's, 36.4 Bahia Honda entrance, 26.2 Niles Channel, 22.8 Morning Joint, 8.1 Naval Air Station, 4.0 College Road light.
