# Idea Diffusion — GitHub Pages Site Design

## Goal

Host an interactive data visualization site on GitHub Pages for the "Copy Paste, Make Trillions" Substack post. Each chart must be individually embeddable via iframe.

## Structure

```
idea-diffusion/
├── index.html                 ← Full scrollable page (map → corridors → archetypes → flips)
├── charts/
│   ├── map.html               ← Embed-ready interactive map
│   ├── corridors.html         ← Embed-ready corridors chart
│   ├── archetypes.html        ← Embed-ready archetypes chart
│   └── flips.html             ← Embed-ready role reversals chart
├── data/
│   ├── companies.csv          ← Map company data (extracted now, replaced later with new CSV)
│   ├── families.json          ← Playbook family definitions + colors
│   ├── positions.json         ← Map coordinates (company + anchor positions)
│   ├── corridors.json         ← Corridor chart data
│   ├── archetypes.json        ← Archetype chart data
│   └── flips.json             ← Role reversals chart data
├── js/
│   ├── map.js                 ← Vanilla JS interactive map (converted from React JSX)
│   └── charts.js              ← Corridors + archetypes + flips renderers
└── css/
    └── style.css              ← Shared editorial styles (Barlow + JetBrains Mono, warm cream palette)
```

## Pages

### index.html
Single continuous scroll page. Sections in order:
1. Interactive world map (full viewport height)
2. Corridors chart ("Where Ideas Travel")
3. Archetypes chart ("What Gets Copied")
4. Role Reversals chart ("When the Student Beats the Teacher")

Uses the editorial style from the existing HTML file throughout.

### charts/*.html (embed pages)
Each is a minimal standalone HTML page that loads shared CSS, its own data file, and relevant JS. Designed for Substack iframe embedding. Same styling as main page.

## Data Separation

Each visualization owns its own data file, all fetched at runtime via `fetch()`:
- **Map**: `companies.csv` (CSV format, swap-ready for user's new data), `families.json`, `positions.json`
- **Corridors**: `corridors.json`
- **Archetypes**: `archetypes.json`
- **Flips**: `flips.json`

## Map Conversion (React → Vanilla JS)

The React JSX component is rewritten as plain HTML/JS/SVG:
- Same SVG rendering with TopoJSON world map from CDN
- All interactivity preserved: hover tooltips, sidebar search/filter by company and playbook family, family selection, arc animations, logo overlays (logo.dev)
- No build step, no framework dependencies

## Visual Style

Carried over from existing HTML file:
- Fonts: Barlow (body), JetBrains Mono (data/labels), Georgia (headings)
- Palette: warm cream background (#FAFAF8), blue/coral/green/purple/amber accents
- Subtle entrance animations, hover states, responsive breakpoints
- Mobile: bottom-sheet tooltips, stacked layouts

## Hosting

- GitHub repo: `idea-diffusion` (to be created)
- GitHub Pages enabled on main branch
- No build step — static files served directly

## Substack Embedding

```html
<iframe src="https://<user>.github.io/idea-diffusion/charts/corridors.html"
        width="100%" height="500" frameborder="0"></iframe>
```
