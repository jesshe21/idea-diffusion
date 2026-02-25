# Idea Diffusion GitHub Pages — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert the existing JSX + HTML visualizations into a static GitHub Pages site with individually embeddable charts for Substack.

**Architecture:** Zero-build static site. All plain HTML/CSS/JS served directly by GitHub Pages. React map component rewritten as vanilla JS. All data extracted into separate files fetched at runtime.

**Tech Stack:** Vanilla JS, SVG, D3 (TopoJSON only, for world map), CSS custom properties, logo.dev for company logos, GitHub Pages hosting.

---

## Source Files Reference

- JSX map component: `idea_diffusion_map_v2 (1).jsx`
  - Line 3: `const D = [...]` — 478 company records, keys: n, cc, y, r, rat, f, d
  - Line 4: `const F = {...}` — Family definitions, keys per family: l, an, acc, ad, sl
  - Line 5: `const P = [[x,y], ...]` — 478 position coordinate pairs
  - Line 6: `const AP = {...}` — Anchor positions per family ID
  - Line 7: `const FC = {...}` — Color hex strings per family ID
  - Line 8: `const TF = [...]` — Top families array [familyId, count] pairs
  - Lines 9-478: React component (App) with map rendering, sidebar, tooltips
- HTML charts: `diffusion-embed__1_.html` — 3 charts with inline data + full CSS

## Target Structure

```
idea-diffusion/
├── index.html
├── charts/
│   ├── map.html
│   ├── corridors.html
│   ├── archetypes.html
│   └── flips.html
├── data/
│   ├── companies.csv
│   ├── families.json
│   ├── positions.json
│   ├── corridors.json
│   ├── archetypes.json
│   └── flips.json
├── js/
│   ├── map.js
│   └── charts.js
├── css/
│   └── style.css
└── docs/plans/...
```

---

### Task 1: Extract Data Files

**Files:**
- Create: `data/companies.csv`
- Create: `data/families.json`
- Create: `data/positions.json`
- Create: `data/corridors.json`
- Create: `data/archetypes.json`
- Create: `data/flips.json`

**Step 1: Extract company data to CSV**

Parse `const D` from JSX line 3. Write CSV with columns: `n,cc,y,r,rat,f,d`

```bash
python3 -c "
import json, csv, sys
with open('idea_diffusion_map_v2 (1).jsx') as f:
    lines = f.readlines()
line = lines[2].strip()
data = json.loads(line[line.index('['):line.rindex(']')+1])
with open('data/companies.csv', 'w', newline='') as out:
    w = csv.DictWriter(out, fieldnames=['n','cc','y','r','rat','f','d'])
    w.writeheader()
    w.writerows(data)
print(f'Wrote {len(data)} records')
"
```

**Step 2: Extract families, positions, colors, anchor positions**

Parse lines 4-8 from JSX. Create:
- `data/families.json` — merged object: `{ familyId: { l, an, acc, ad, sl, color, anchorPos: [x,y], count } }`
  (combines F, FC, AP, TF into one file)
- `data/positions.json` — array of [x,y] pairs (the P array, 1:1 with companies.csv rows)

```bash
python3 -c "
import json
with open('idea_diffusion_map_v2 (1).jsx') as f:
    lines = f.readlines()

def parse_const(line, start_char):
    s = line.strip()
    idx = s.index(start_char)
    end = s.rindex('}' if start_char=='{' else ']') + 1
    return json.loads(s[idx:end])

F = parse_const(lines[3], '{')
P = parse_const(lines[4], '[')
AP = parse_const(lines[5], '{')
FC = parse_const(lines[6], '{')
TF = parse_const(lines[7], '[')

tf_map = {fid: cnt for fid, cnt in TF}

families = {}
for fid, fam in F.items():
    families[fid] = {**fam, 'color': FC.get(fid, '#999'), 'anchorPos': AP.get(fid), 'count': tf_map.get(fid, 0)}

with open('data/families.json', 'w') as f:
    json.dump(families, f, indent=2)

with open('data/positions.json', 'w') as f:
    json.dump(P, f)

print(f'Families: {len(families)}, Positions: {len(P)}')
"
```

**Step 3: Extract chart data**

From `diffusion-embed__1_.html`, extract the inline JS data arrays for corridors (line 711-722), archetypes (line 724-735), and flips (line 886-896).

```bash
# corridors.json
python3 -c "
import json
corridors = [
  {'from':'China','to':'US','code':'CHN ↔ USA','f1':'🇨🇳','f2':'🇺🇸','count':23.4,'value':43.2},
  {'from':'India','to':'US','code':'IND ↔ USA','f1':'🇮🇳','f2':'🇺🇸','count':4.6,'value':6.1},
  {'from':'Singapore','to':'US','code':'SGP ↔ USA','f1':'🇸🇬','f2':'🇺🇸','count':8.0,'value':5.9},
  {'from':'UK','to':'US','code':'GBR ↔ USA','f1':'🇬🇧','f2':'🇺🇸','count':5.3,'value':5.2},
  {'from':'Argentina','to':'US','code':'ARG ↔ USA','f1':'🇦🇷','f2':'🇺🇸','count':0.5,'value':4.5},
  {'from':'Canada','to':'China','code':'CAN ↔ CHN','f1':'🇨🇦','f2':'🇨🇳','count':0.7,'value':4.1},
  {'from':'China','to':'Singapore','code':'CHN ↔ SGP','f1':'🇨🇳','f2':'🇸🇬','count':1.6,'value':4.0},
  {'from':'Germany','to':'US','code':'DEU ↔ USA','f1':'🇩🇪','f2':'🇺🇸','count':4.0,'value':3.6},
  {'from':'S. Korea','to':'US','code':'KOR ↔ USA','f1':'🇰🇷','f2':'🇺🇸','count':4.0,'value':2.9},
  {'from':'China','to':'India','code':'CHN ↔ IND','f1':'🇨🇳','f2':'🇮🇳','count':2.6,'value':2.8}
]
with open('data/corridors.json','w') as f: json.dump(corridors,f,indent=2,ensure_ascii=False)
"

# archetypes.json
python3 -c "
import json
archetypes = [
  {'name':'Fullstack Marketplace + Logistics','cat':'E-Commerce','n':14,'val':629378,'pct':22.2,'c':'ecom'},
  {'name':'C2C Marketplace','cat':'E-Commerce','n':18,'val':484663,'pct':17.1,'c':'ecom'},
  {'name':'AI Accelerator Chip','cat':'AI / ML Platform','n':9,'val':131340,'pct':4.6,'c':'ai'},
  {'name':'QR / Mobile Wallet','cat':'Fintech — Payments','n':19,'val':122575,'pct':4.3,'c':'fin'},
  {'name':'Payments Superapp + Lending','cat':'Fintech — Lending','n':21,'val':118695,'pct':4.2,'c':'fin'},
  {'name':'Online Payment Platform','cat':'Fintech — Payments','n':2,'val':100800,'pct':3.6,'c':'fin'},
  {'name':'Premium DTC EV','cat':'Cleantech','n':20,'val':98631,'pct':3.5,'c':'clean'},
  {'name':'Daily Deals','cat':'E-Commerce','n':2,'val':84400,'pct':3.0,'c':'ecom'},
  {'name':'Ride-Hailing Marketplace','cat':'Ride-Hailing','n':13,'val':80421,'pct':2.8,'c':'ride'},
  {'name':'Foundation Model API','cat':'AI / ML Platform','n':9,'val':79392,'pct':2.8,'c':'ai'}
]
with open('data/archetypes.json','w') as f: json.dump(archetypes,f,indent=2,ensure_ascii=False)
"

# flips.json
python3 -c "
import json
flips = [
  {'source':'eBay','sVal':37240,'variant':'Alibaba','vVal':354830,'delta':317590},
  {'source':'Groupon','sVal':555,'variant':'Meituan','vVal':84400,'delta':83845},
  {'source':'eBay','sVal':37240,'variant':'MercadoLibre','vVal':100800,'delta':63560},
  {'source':'Zopa','sVal':1030,'variant':'SoFi','vVal':26160,'delta':25130},
  {'source':'Instagram','sVal':1010,'variant':'Xiaohongshu','vVal':17000,'delta':15990},
  {'source':'Klarna','sVal':6830,'variant':'Affirm','vVal':16600,'delta':9770},
  {'source':'Ada','sVal':1200,'variant':'Sierra AI','vVal':10000,'delta':8800},
  {'source':'Shield AI','sVal':5300,'variant':'Helsing AI','vVal':13779,'delta':8479},
  {'source':'Gilt','sVal':250,'variant':'Vipshop','vVal':8570,'delta':8320}
]
with open('data/flips.json','w') as f: json.dump(flips,f,indent=2,ensure_ascii=False)
"
```

**Step 4: Verify all data files exist and have content**

```bash
ls -la data/
wc -l data/companies.csv
python3 -c "import json; print(len(json.load(open('data/families.json'))))"
```

**Step 5: Commit**

```bash
git add data/
git commit -m "feat: extract all visualization data into separate files"
```

---

### Task 2: Create Shared CSS

**Files:**
- Create: `css/style.css`

**Step 1: Extract styles from HTML file**

Take the full `<style>` block from `diffusion-embed__1_.html` (lines 9-642). Add map-specific styles for the sidebar, SVG map, and tooltip that match the editorial aesthetic.

Key additions for map section:
- `.map-section` — full viewport height container
- `.map-sidebar` — right sidebar (260px, matches existing HTML aesthetic)
- `.map-svg` — SVG container
- Map tooltip styling (reuse `.tip` pattern from charts)
- Search input styling matching the warm cream palette

The CSS variables (`:root` block) remain identical. No changes to existing chart styles.

**Step 2: Commit**

```bash
git add css/
git commit -m "feat: add shared stylesheet"
```

---

### Task 3: Create Chart Renderers (charts.js)

**Files:**
- Create: `js/charts.js`

**Step 1: Write charts.js**

Three functions that each fetch their own JSON data and render into a given container element. Port the rendering logic directly from `diffusion-embed__1_.html` (lines 709-941).

```javascript
// js/charts.js

// ── TOOLTIP (shared) ──
function initTooltip() { /* reuse tip logic from HTML */ }
function showTip(e, html) { /* ... */ }
function hideTip() { /* ... */ }

// ── CORRIDORS ──
async function renderCorridors(containerEl) {
  const corridors = await fetch('data/corridors.json').then(r => r.json());
  // ... exact same rendering logic from HTML lines 762-841
  // sortCorridors, renderCorridors inner, FLIP animation
}

// ── ARCHETYPES ──
async function renderArchetypes(containerEl) {
  const archetypes = await fetch('data/archetypes.json').then(r => r.json());
  // ... exact same rendering logic from HTML lines 844-878
}

// ── FLIPS ──
async function renderFlips(containerEl) {
  const flips = await fetch('data/flips.json').then(r => r.json());
  // ... exact same rendering logic from HTML lines 885-941
}
```

Data paths should be configurable (relative to page location — `charts/*.html` pages will need `../data/` prefix). Use a `basePath` parameter or detect from `document.currentScript`.

**Step 2: Commit**

```bash
git add js/charts.js
git commit -m "feat: add chart renderers with data fetching"
```

---

### Task 4: Convert React Map to Vanilla JS (map.js)

**Files:**
- Create: `js/map.js`

**Step 1: Write map.js**

Convert the React component (JSX lines 9-478) to vanilla JS. This is the largest task.

The React component uses:
- `useState` → plain variables + DOM updates
- `useEffect` for TopoJSON fetch → `fetch()` on load
- `useEffect` for window resize → `addEventListener('resize', ...)`
- `useMemo` for computed lists → compute once, recompute on filter change
- `useCallback` → plain functions
- JSX SVG rendering → `document.createElementNS` or innerHTML string building (matching the chart pattern)
- Conditional rendering → show/hide with display style or DOM manipulation

Structure:

```javascript
// js/map.js

async function renderMap(containerEl, dataBasePath) {
  // 1. Fetch data
  const [companiesRaw, families, positions] = await Promise.all([
    fetch(dataBasePath + 'companies.csv').then(r => r.text()),
    fetch(dataBasePath + 'families.json').then(r => r.json()),
    fetch(dataBasePath + 'positions.json').then(r => r.json())
  ]);
  const companies = parseCSV(companiesRaw);

  // 2. Derive data (replaces useMemo)
  // - Build allCompanies (anchors + variants)
  // - Build topFamilies from families.json count field
  // - Build familyColors from families.json color field

  // 3. Build DOM structure
  // - Map SVG area (flex: 1)
  // - Right sidebar (260px) with company search + playbook filter

  // 4. Fetch TopoJSON world map, render country paths
  // Same CDN URL + topology parsing as React version

  // 5. Render functions
  // - renderNodes() — company circles + anchor circles on SVG
  // - renderArcs() — curved paths from anchor to variant
  // - renderSidebar() — search input, family list, active filter
  // - renderLogos() — HTML img overlays positioned over SVG

  // 6. Event handlers
  // - handleHover(e, idx) — show tooltip, track mouse
  // - selectFamily(fid) — filter to one family
  // - selectCompanyFromSearch(c) — highlight company's family
  // - reset() — clear all filters
  // - resize handler — recalculate dimensions

  // 7. State management
  // Plain object: { activeFamily, hovered, search, filterMode, ... }
  // On state change, call relevant render functions
}

function parseCSV(text) {
  // Simple CSV parser for the companies data
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    // Handle commas in quoted fields (rationale text has commas)
    const values = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => obj[h] = values[i]);
    return obj;
  });
}
```

Key behaviors to preserve:
- SVG viewBox scales to container size, recalculates on resize
- `tx(x)` and `ty(y)` coordinate transforms with offset/scale
- `arcPath(x1,y1,x2,y2)` — quadratic bezier arcs between anchor and variant
- Hover: circle grows, glow effect, tooltip appears at cursor (mobile: bottom sheet)
- Logo overlay: HTML `<img>` positioned absolutely over SVG circles (logo.dev URLs)
- Sidebar: company search dropdown, playbook family list, active filter highlight
- FLIP: dimmed nodes when family is active, only active family arcs/nodes shown

**Step 2: Commit**

```bash
git add js/map.js
git commit -m "feat: add vanilla JS interactive map (converted from React)"
```

---

### Task 5: Create Embeddable Chart Pages

**Files:**
- Create: `charts/map.html`
- Create: `charts/corridors.html`
- Create: `charts/archetypes.html`
- Create: `charts/flips.html`

**Step 1: Create each embed page**

Each page is a minimal standalone HTML file:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Corridors — Idea Diffusion</title>
  <link href="https://fonts.googleapis.com/css2?family=Barlow:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../css/style.css">
</head>
<body>
  <div id="tip" class="tip"></div>
  <div class="embed-chart" id="chart-corridors">
    <!-- chart label, title, desc, controls, list container -->
  </div>
  <script src="../js/charts.js"></script>
  <script>renderCorridors(document.getElementById('chart-corridors'), '../data/');</script>
</body>
</html>
```

The map embed page loads `../js/map.js` instead and calls `renderMap()`.

Each page uses `../data/` as the data base path since they're in the `charts/` subdirectory.

**Step 2: Commit**

```bash
git add charts/
git commit -m "feat: add embeddable chart pages"
```

---

### Task 6: Create Main Index Page

**Files:**
- Create: `index.html`

**Step 1: Write index.html**

Single scrollable page combining all 4 visualizations:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="theme-color" content="#FAFAF8">
  <title>Copy Paste, Make Trillions — Data Explorer</title>
  <link href="https://fonts.googleapis.com/css2?family=Barlow:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <!-- Page header -->
  <div class="embed-chart" style="text-align:center; padding-top:32px;">
    <h1 class="page-title">Copy Paste, Make Trillions</h1>
    <p class="page-sub">An interactive look at how borrowed ideas become billion-dollar companies.</p>
  </div>

  <!-- Section 1: Interactive Map (full viewport height) -->
  <div id="map-container" class="map-section"></div>

  <div class="sep"></div>

  <!-- Section 2: Corridors -->
  <div class="embed-chart" id="chart-corridors">
    <!-- chart label, title, desc, controls, container -->
  </div>

  <div class="sep"></div>

  <!-- Section 3: Archetypes -->
  <div class="embed-chart" id="chart-archetypes">
    <!-- chart label, title, desc, container -->
  </div>

  <div class="sep"></div>

  <!-- Section 4: Role Reversals -->
  <div class="embed-chart" id="chart-flips">
    <!-- chart label, title, desc, header, container -->
  </div>

  <!-- Footer -->
  <div class="embed-chart" style="text-align:center; padding:16px; opacity:0.5; font-size:12px; color:var(--text-muted);">
    DCM Ventures
  </div>

  <script src="js/map.js"></script>
  <script src="js/charts.js"></script>
  <script>
    renderMap(document.getElementById('map-container'), 'data/');
    renderCorridors(document.getElementById('chart-corridors'), 'data/');
    renderArchetypes(document.getElementById('chart-archetypes'), 'data/');
    renderFlips(document.getElementById('chart-flips'), 'data/');
  </script>
</body>
</html>
```

Data base path is `data/` (relative to root).

**Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add main index page with all visualizations"
```

---

### Task 7: Create GitHub Repo and Enable Pages

**Step 1: Create repo**

```bash
gh repo create idea-diffusion --public --source=. --push
```

**Step 2: Enable GitHub Pages**

```bash
gh api repos/jesshe21/idea-diffusion/pages -X POST -f build_type=workflow -f source.branch=main -f source.path=/
```

Or if using simple Pages (no Actions):
```bash
gh api repos/jesshe21/idea-diffusion/pages -X POST --input - <<< '{"source":{"branch":"main","path":"/"}}'
```

**Step 3: Verify deployment**

```bash
gh api repos/jesshe21/idea-diffusion/pages --jq '.html_url'
```

Expected: `https://jesshe21.github.io/idea-diffusion/`

**Step 4: Commit any remaining files, push**

```bash
git push origin main
```

---

### Task 8: Test and Verify

**Step 1: Local test**

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000` — verify:
- Map renders with all nodes, arcs, tooltips, sidebar filtering
- Scroll down to corridors, archetypes, flips — all render correctly
- Open `http://localhost:8000/charts/corridors.html` — renders standalone

**Step 2: Test embed pages**

Open each `charts/*.html` individually, verify they work as standalone pages.

**Step 3: Test GitHub Pages URL**

After deployment, verify `https://jesshe21.github.io/idea-diffusion/` loads correctly.

**Step 4: Test Substack embed**

Create a test iframe to verify embedding works:
```html
<iframe src="https://jesshe21.github.io/idea-diffusion/charts/corridors.html"
        width="100%" height="500" frameborder="0"></iframe>
```
