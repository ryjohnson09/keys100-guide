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
