(function () {
  const REGION_BUCKETS = {
    USA: new Set(['USA']),
    China: new Set(['CHN']),
    India: new Set(['IND']),
    Europe: new Set(['GBR', 'DEU', 'FRA', 'ESP', 'ITA', 'NLD', 'SWE', 'NOR', 'DNK', 'FIN', 'CHE', 'AUT', 'BEL', 'IRL', 'PRT', 'POL', 'RUS', 'UK']),
    LATAM: new Set(['ARG', 'BRA', 'CHL', 'COL', 'MEX', 'PER', 'URY', 'ECU', 'BOL', 'PRY', 'VEN', 'CRI', 'PAN', 'GTM', 'DOM']),
    SEA: new Set(['SGP', 'IDN', 'THA', 'VNM', 'PHL', 'MYS', 'KHM', 'MMR', 'LAO', 'BRN']),
    MENA: new Set(['ARE', 'SAU', 'QAT', 'KWT', 'BHR', 'EGY', 'MAR', 'ISR', 'JOR', 'OMN', 'TUR']),
    'Japan/Korea': new Set(['JPN', 'KOR']),
    'ANZ/Other': new Set(['AUS', 'NZL'])
  };
  const DEFAULT_PLAYBOOK_IDS = [
    'ride_hailing__marketplace',
    'ecommerce_horizontal__c2c_marketplace',
    'ecommerce_horizontal__fullstack_marketplace_logistics',
    'fintech_payments__api_payment_gateway',
    'ai_ml_platform__foundation_model_api',
    'cleantech__battery_gigafactory',
    'fintech_neobanking__commission_free_retail_brokerage',
    'fintech_neobanking__emerging_market_card_neobank',
    'auto_marketplace__fullstack_used_car_ecommerce',
    'fintech_payments__mpos_smb_card_acceptance'
  ];

  function byId(id) {
    return document.getElementById(id);
  }

  function getLogoToken(options, containerEl) {
    if (options && options.logoToken) return options.logoToken;
    if (containerEl && containerEl.dataset && containerEl.dataset.logoToken) return containerEl.dataset.logoToken;
    if (typeof window !== 'undefined' && window.IDEA_DIFFUSION_LOGO_DEV_TOKEN) return window.IDEA_DIFFUSION_LOGO_DEV_TOKEN;
    return '';
  }

  function logoUrl(domain, size, token) {
    if (!token || !domain) return '';
    return 'https://img.logo.dev/' + domain + '?token=' + token + '&size=' + (size || 64) + '&format=png';
  }

  function regionFromCountryCode(cc) {
    const code = String(cc || '').trim().toUpperCase();
    const names = Object.keys(REGION_BUCKETS);
    for (let i = 0; i < names.length; i += 1) {
      if (REGION_BUCKETS[names[i]].has(code)) return names[i];
    }
    return 'ANZ/Other';
  }

  function loadCsv(text) {
    const lines = text.trim().split(/\r?\n/);
    const headers = parseCsvLine(lines[0]);
    return lines.slice(1).map(function (line) {
      const values = parseCsvLine(line);
      const obj = {};
      headers.forEach(function (h, i) { obj[h] = values[i] || ''; });
      obj.y = Number(obj.y) || 0;
      return obj;
    });
  }

  function parseCsvLine(line) {
    const out = [];
    let cur = '';
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          quoted = !quoted;
        }
      } else if (ch === ',' && !quoted) {
        out.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  }

  async function fetchWorldPaths() {
    try {
      const topo = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json').then(function (r) { return r.json(); });
      const scale = topo.transform.scale;
      const translate = topo.transform.translate;
      const decoded = topo.arcs.map(function (arc) {
        let x = 0;
        let y = 0;
        return arc.map(function (step) {
          x += step[0];
          y += step[1];
          return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
        });
      });

      function ring(indices) {
        let coords = [];
        indices.forEach(function (idx) {
          let arc = idx >= 0 ? decoded[idx] : decoded[~idx].slice().reverse();
          if (coords.length) arc = arc.slice(1);
          coords = coords.concat(arc);
        });
        return coords;
      }

      const land = topo.objects.land;
      const geoms = land.type === 'GeometryCollection' ? land.geometries : [land];
      const paths = [];
      geoms.forEach(function (geom) {
        const polys = geom.type === 'Polygon' ? [geom.arcs] : (geom.type === 'MultiPolygon' ? geom.arcs : []);
        polys.forEach(function (polyArcs) {
          polyArcs.forEach(function (ringArcs) {
            const coords = ring(ringArcs);
            if (coords.length < 3) return;
            const minLat = Math.min.apply(null, coords.map(function (c) { return c[1]; }));
            if (minLat < -55) return;

            const segs = [[]];
            coords.forEach(function (c, i) {
              if (i > 0 && Math.abs(c[0] - coords[i - 1][0]) > 90) segs.push([]);
              segs[segs.length - 1].push(c);
            });

            segs.forEach(function (seg) {
              if (seg.length < 3) return;
              const d = seg.map(function (c, i) {
                const px = 4.015 * c[0] + 578.5;
                const py = -4.837 * c[1] + 451.6;
                return (i === 0 ? 'M' : 'L') + px.toFixed(1) + ',' + py.toFixed(1);
              }).join('') + 'Z';
              paths.push(d);
            });
          });
        });
      });
      return paths;
    } catch (e) {
      return [];
    }
  }

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async function renderMap(containerEl, dataBasePath, options) {
    if (!containerEl) return;
    const opts = options || {};
    const logoToken = getLogoToken(opts, containerEl);
    const showHeader = opts.showHeader !== false;

    const base = (dataBasePath || 'data/').replace(/\/?$/, '/');
    const data = await Promise.all([
      fetch(base + 'companies.csv').then(function (r) { return r.text(); }),
      fetch(base + 'families.json').then(function (r) { return r.json(); }),
      fetch(base + 'positions.json').then(function (r) { return r.json(); })
    ]);

    const companies = loadCsv(data[0]);
    const families = data[1];
    const positions = data[2];
    const worldPaths = await fetchWorldPaths();

    const familyEntries = Object.entries(families).sort(function (a, b) {
      return (b[1].count || 0) - (a[1].count || 0);
    });
    const familyById = {};
    familyEntries.forEach(function (entry) { familyById[entry[0]] = entry[1]; });

    function getDefaultFamilyEntries() {
      return DEFAULT_PLAYBOOK_IDS
        .filter(function (fid) { return !!familyById[fid]; })
        .map(function (fid) { return [fid, familyById[fid]]; });
    }

    const anchorNodes = familyEntries
      .filter(function (entry) { return Array.isArray(entry[1].anchorPos); })
      .map(function (entry) {
        return { fid: entry[0], fam: entry[1], x: entry[1].anchorPos[0], y: entry[1].anchorPos[1] };
      });

    const allCompanies = anchorNodes.map(function (a) {
      return {
        n: a.fam.an,
        cc: a.fam.acc,
        y: 0,
        r: 'anchor',
        rat: 'Original anchor company.',
        f: a.fid,
        d: a.fam.ad,
        _isAnchor: true
      };
    }).concat(companies).sort(function (a, b) {
      return a.n.localeCompare(b.n);
    });

    const companyCorridors = companies.map(function (c) {
      const sourceCC = (families[c.f] && families[c.f].acc) || '';
      const source = regionFromCountryCode(sourceCC);
      const target = regionFromCountryCode(c.cc);
      const pair = [source, target].sort();
      return {
        oneWayId: source + ' -> ' + target,
        twoWayId: pair[0] + ' <-> ' + pair[1],
        source: source,
        target: target
      };
    });

    function getCorridorEntries(mode) {
      const corridorCounts = {};
      companyCorridors.forEach(function (corr) {
        if (corr.source === corr.target) return;
        const key = mode === 'twoway' ? corr.twoWayId : corr.oneWayId;
        corridorCounts[key] = (corridorCounts[key] || 0) + 1;
      });
      return Object.entries(corridorCounts)
        .map(function (entry) { return { id: entry[0], count: entry[1] }; })
        .sort(function (a, b) { return b.count - a.count; });
    }

    containerEl.innerHTML =
      '<div class="map-area" id="map-area">' +
      (showHeader ? '<div class="map-header"><h2>Geo-Adaption of Businesses</h2></div>' : '') +
      '<button class="map-reset-btn" id="map-reset" style="display:none">Clear filter</button>' +
      '<svg id="map-svg" style="position:absolute;top:0;left:0;width:100%;height:100%"></svg>' +
      '<div id="map-logos" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none"></div>' +
      '<div id="map-tip" class="map-tip" style="display:none"></div>' +
      '</div>' +
      '<aside class="map-sidebar" id="map-sidebar">' +
      '<div id="sidebar-clear-wrap" style="margin-bottom:10px;display:none">' +
      '<button id="sidebar-clear-filter" style="width:100%;border:1px solid var(--border-light);background:var(--surface);color:var(--text-muted);border-radius:8px;padding:8px 10px;font-size:12px;cursor:pointer">Clear filter</button>' +
      '</div>' +
      '<div style="position:relative;margin-bottom:8px">' +
      '<div class="sidebar-label">Company</div>' +
      '<input id="company-search" class="sidebar-input" placeholder="Search companies..." />' +
      '<div class="sidebar-dropdown" id="company-dd" style="display:none"></div>' +
      '</div>' +
      '<div style="position:relative;margin-top:10px">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">' +
      '<div class="sidebar-label" style="margin:0">Corridor</div>' +
      '<div class="toggle-wrap" style="gap:4px;padding:2px">' +
      '<button class="toggle-btn active" id="corridor-mode-oneway" style="padding:4px 11px;line-height:1">→</button>' +
      '<button class="toggle-btn" id="corridor-mode-twoway" style="padding:4px 11px;line-height:1">↔</button>' +
      '</div>' +
      '</div>' +
      '<input id="corridor-search" class="sidebar-input" placeholder="e.g. USA -> China..." />' +
      '<div class="sidebar-dropdown" id="corridor-dd" style="display:none;max-height:260px"></div>' +
      '</div>' +
      '<div id="corridor-list" style="margin-top:8px"></div>' +
      '<div id="playbook-block">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">' +
      '<div class="sidebar-label" style="margin:0">Playbook Family</div>' +
      '<button id="toggle-fams" style="border:0;background:none;color:var(--text-muted);font-size:10px;cursor:pointer">Select All</button>' +
      '</div>' +
      '<div style="position:relative">' +
      '<input id="family-search" class="sidebar-input" placeholder="Search playbooks..." />' +
      '<div class="sidebar-dropdown" id="family-dd" style="display:none;max-height:340px"></div>' +
      '</div>' +
      '<div id="family-list" style="margin-top:8px"></div>' +
      '</div>' +
      '</aside>';

    const mapArea = byId('map-area');
    const svg = byId('map-svg');
    const logoLayer = byId('map-logos');
    const tip = byId('map-tip');
    const resetBtn = byId('map-reset');

    const companySearch = byId('company-search');
    const companyDD = byId('company-dd');
    const familySearch = byId('family-search');
    const familyDD = byId('family-dd');
    const familyList = byId('family-list');
    const toggleFams = byId('toggle-fams');
    const corridorSearch = byId('corridor-search');
    const corridorDD = byId('corridor-dd');
    const corridorList = byId('corridor-list');
    const corridorModeOneWay = byId('corridor-mode-oneway');
    const corridorModeTwoWay = byId('corridor-mode-twoway');
    const sidebarClearWrap = byId('sidebar-clear-wrap');
    const sidebarClearFilter = byId('sidebar-clear-filter');

    const state = {
      activeFamily: null,
      hovered: null,
      tipPos: { x: 0, y: 0 },
      search: '',
      famSearch: '',
      corridorSearch: '',
      activeCorridor: null,
      corridorMode: 'oneway',
      showAllFams: false,
      filterMode: null,
      companyFocused: false,
      familyFocused: false,
      corridorFocused: false
    };

    function visibleFamilies() {
      if (state.activeFamily) return new Set([state.activeFamily]);
      const q = state.famSearch.toLowerCase();
      let list = state.showAllFams ? familyEntries : getDefaultFamilyEntries();
      if (q) {
        list = familyEntries.filter(function (entry) {
          const fam = entry[1];
          return (fam.sl || '').toLowerCase().includes(q)
            || (fam.l || '').toLowerCase().includes(q)
            || (fam.an || '').toLowerCase().includes(q);
        });
      }
      return new Set(list.map(function (entry) { return entry[0]; }));
    }

    function visibleCompanyIndices() {
      const set = new Set();
      companies.forEach(function (c, i) {
        const corrId = state.corridorMode === 'twoway' ? companyCorridors[i].twoWayId : companyCorridors[i].oneWayId;
        if (state.activeCorridor && corrId !== state.activeCorridor) return;
        set.add(i);
      });
      return set;
    }

    function isActive() {
      return !!state.activeFamily || !!state.activeCorridor;
    }

    function getDims() {
      const rect = mapArea.getBoundingClientRect();
      const sidebarW = byId('map-sidebar').getBoundingClientRect().width;
      const mapW = Math.max(320, rect.width);
      const mapH = Math.max(300, rect.height);
      const sx = mapW / 1400;
      const sy = mapH / 650;
      const scale = Math.min(sx, sy);
      const ox = (mapW - 1400 * scale) / 2;
      const oy = (mapH - 650 * scale) / 2;
      return {
        mapW: mapW,
        mapH: mapH,
        sidebarW: sidebarW,
        scale: scale,
        tx: function (x) { return ox + x * scale; },
        ty: function (y) { return oy + y * scale; },
        ox: ox,
        oy: oy
      };
    }

    function arcPath(x1, y1, x2, y2, scale) {
      const mx = (x1 + x2) / 2;
      const my = Math.min(y1, y2) - Math.abs(x1 - x2) * 0.12 - 15 * scale;
      return 'M' + x1 + ',' + y1 + ' Q' + mx + ',' + my + ' ' + x2 + ',' + y2;
    }

    function hoveredDatum() {
      if (state.hovered === null) return null;
      if (state.hovered.type === 'company') return companies[state.hovered.i];
      const a = anchorNodes[state.hovered.i];
      if (!a) return null;
      return {
        n: a.fam.an,
        cc: a.fam.acc,
        y: 0,
        r: 'anchor',
        rat: 'Original anchor company — the business model that spawned this family of variants.',
        f: a.fid,
        d: a.fam.ad
      };
    }

    function updateSidebar() {
      const q = state.search.trim().toLowerCase();
      const searchResults = q ? allCompanies.filter(function (c) {
        return c.n.toLowerCase().includes(q);
      }).slice(0, 40) : [];
      const corridorEntries = getCorridorEntries(state.corridorMode);
      const corridorEntryMap = {};
      corridorEntries.forEach(function (entry) { corridorEntryMap[entry.id] = entry.count; });
      if (state.activeCorridor && !corridorEntryMap[state.activeCorridor]) {
        state.activeCorridor = null;
        if (state.filterMode === 'corridor') state.filterMode = null;
      }

      corridorModeOneWay.classList.toggle('active', state.corridorMode === 'oneway');
      corridorModeTwoWay.classList.toggle('active', state.corridorMode === 'twoway');
      corridorSearch.placeholder = state.corridorMode === 'twoway'
        ? 'e.g. USA <-> China...'
        : 'e.g. USA -> China...';

      companySearch.disabled = state.filterMode === 'legend' || state.filterMode === 'corridor';
      familySearch.disabled = state.filterMode === 'search' || state.filterMode === 'corridor';
      corridorSearch.disabled = state.filterMode === 'search' || state.filterMode === 'legend';
      toggleFams.style.display = isActive() ? 'none' : 'inline';
      toggleFams.textContent = state.showAllFams ? 'Top 10' : 'Select All';
      resetBtn.style.display = isActive() ? 'block' : 'none';
      sidebarClearWrap.style.display = isActive() ? 'block' : 'none';

      companyDD.style.display = (state.companyFocused && searchResults.length && state.filterMode !== 'legend' && state.filterMode !== 'corridor') ? 'block' : 'none';
      companyDD.innerHTML = searchResults.map(function (c, i) {
        return '<div class="sidebar-dropdown-item" data-idx="' + i + '">' +
          '<div style="width:16px;height:16px;border-radius:3px;background:' + (families[c.f].color || '#ccc') + ';display:flex;align-items:center;justify-content:center;color:#fff;font-size:9px;font-weight:700;position:relative;overflow:hidden;flex-shrink:0">' + esc(c.n.charAt(0).toUpperCase()) + '</div>' +
          '<span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(c.n) + '</span>' +
          (c._isAnchor ? '<span style="font-size:9px;color:#92400e;background:#fef3c7;border-radius:3px;padding:0 4px">ANCHOR</span>' : '') +
          '</div>';
      }).join('');

      companyDD.querySelectorAll('[data-idx]').forEach(function (el) {
        el.addEventListener('click', function () {
          const c = searchResults[Number(el.dataset.idx)];
          if (!c) return;
          state.activeFamily = c.f;
          state.activeCorridor = null;
          state.filterMode = 'search';
          state.search = c.n;
          companySearch.value = state.search;
          state.companyFocused = false;
          render();
        });
      });

      const qf = state.famSearch.toLowerCase();
      const familyFiltered = qf
        ? familyEntries.filter(function (entry) {
          const f = entry[1];
          return (f.sl || '').toLowerCase().includes(qf)
            || (f.an || '').toLowerCase().includes(qf)
            || (f.l || '').toLowerCase().includes(qf);
        })
        : familyEntries;

      familyDD.style.display = (state.familyFocused && state.filterMode !== 'search' && state.filterMode !== 'corridor') ? 'block' : 'none';
      familyDD.innerHTML = familyFiltered
        .sort(function (a, b) { return (a[1].sl || '').localeCompare(b[1].sl || ''); })
        .map(function (entry) {
          const fid = entry[0];
          const f = entry[1];
          return '<div class="sidebar-dropdown-item" data-fid="' + fid + '">' +
            '<div class="family-dot" style="background:' + f.color + '"></div>' +
            '<span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(f.sl || f.l || fid) + '</span>' +
            '<span class="family-count">(' + (f.count || 0) + ')</span>' +
            '</div>';
        }).join('');

      familyDD.querySelectorAll('[data-fid]').forEach(function (el) {
        el.addEventListener('click', function () {
          const fid = el.dataset.fid;
          state.activeFamily = fid;
          state.activeCorridor = null;
          state.filterMode = 'legend';
          state.famSearch = '';
          familySearch.value = '';
          state.familyFocused = false;
          render();
        });
      });

      if (state.activeFamily) {
        const f = families[state.activeFamily];
        familyList.innerHTML = '<div class="family-item active" data-fid="' + state.activeFamily + '">' +
          '<div class="family-dot" style="background:' + f.color + '"></div>' +
          '<span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="' + esc(f.l || '') + '">' + esc(f.sl || f.l || state.activeFamily) + '</span>' +
          '<span class="family-count">(' + (f.count || 0) + ')</span>' +
          '</div>';
      } else {
        const vis = state.showAllFams ? familyEntries : getDefaultFamilyEntries();
        familyList.innerHTML = vis
          .map(function (entry) {
            const fid = entry[0];
            const f = entry[1];
            return '<div class="family-item" data-fid="' + fid + '">' +
              '<div class="family-dot" style="background:' + f.color + '"></div>' +
              '<span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="' + esc(f.l || '') + '">' + esc(f.sl || f.l || fid) + '</span>' +
              '<span class="family-count">(' + (f.count || 0) + ')</span>' +
              '</div>';
          }).join('');
        familyList.querySelectorAll('[data-fid]').forEach(function (el) {
          el.addEventListener('click', function () {
            state.activeFamily = el.dataset.fid;
            state.activeCorridor = null;
            state.filterMode = 'legend';
            state.search = '';
            companySearch.value = '';
            render();
          });
        });
      }

      const cq = state.corridorSearch.toLowerCase();
      const corridorFiltered = cq
        ? corridorEntries.filter(function (entry) { return entry.id.toLowerCase().includes(cq); })
        : corridorEntries;

      corridorDD.style.display = (state.corridorFocused && state.filterMode !== 'search' && state.filterMode !== 'legend') ? 'block' : 'none';
      corridorDD.innerHTML = corridorFiltered.map(function (entry) {
        const label = state.corridorMode === 'twoway'
          ? '↔ ' + entry.id
          : '→ ' + entry.id;
        return '<div class="sidebar-dropdown-item" data-corr="' + esc(entry.id) + '">' +
          '<span style="flex:1">' + esc(label) + '</span>' +
          '<span class="family-count">(' + entry.count + ')</span>' +
          '</div>';
      }).join('');

      corridorDD.querySelectorAll('[data-corr]').forEach(function (el) {
        el.addEventListener('click', function () {
          state.activeCorridor = el.dataset.corr;
          state.activeFamily = null;
          state.filterMode = 'corridor';
          state.corridorSearch = state.activeCorridor;
          corridorSearch.value = state.activeCorridor;
          state.corridorFocused = false;
          render();
        });
      });
      corridorList.innerHTML = '';
    }

    function renderTip(dims) {
      const datum = hoveredDatum();
      if (!datum) {
        tip.style.display = 'none';
        return;
      }
      const badgeClass = datum.r === 'anchor' ? 'anchor' : (datum.r === 'variant' ? 'variant' : 'edge');
      const badgeLabel = datum.r === 'anchor' ? 'Anchor' : (datum.r === 'variant' ? 'Variant' : 'Edge Case');
      const tipLogo = logoToken
        ? '<img class="map-tip-logo" src="' + logoUrl(datum.d, 64, logoToken) + '" onerror="this.style.display=\'none\'" />'
        : '';
      tip.innerHTML =
        '<div class="map-tip-header">' +
        tipLogo +
        '<div><span class="map-tip-name">' + esc(datum.n) + '</span><span class="map-tip-badge ' + badgeClass + '">' + badgeLabel + '</span></div>' +
        '</div>' +
        '<div class="map-tip-meta">Founded <span>' + (datum.y || '—') + '</span> · <span>' + esc(datum.cc || '—') + '</span></div>' +
        '<div class="map-tip-family">' + esc((families[datum.f] && families[datum.f].sl) || '') + '</div>' +
        '<div class="map-tip-desc">' + esc(datum.rat || '') + '</div>';

      let x = state.tipPos.x + 16;
      let y = state.tipPos.y - 10;
      if (x + 340 > dims.mapW) x = state.tipPos.x - 356;
      if (y + 220 > dims.mapH) y = state.tipPos.y - 220;
      if (y < 10) y = 10;
      tip.style.left = x + 'px';
      tip.style.top = y + 'px';
      tip.style.display = 'block';
    }

    function renderMapVisuals() {
      const dims = getDims();
      const vis = visibleFamilies();
      const visCompanies = visibleCompanyIndices();
      const baseR = Math.max(5, 8 * dims.scale);

      svg.setAttribute('viewBox', '0 0 ' + dims.mapW + ' ' + dims.mapH);

      const world = '<g transform="translate(' + dims.ox + ',' + dims.oy + ') scale(' + dims.scale + ')">' +
        worldPaths.map(function (d) {
          return '<path d="' + d + '" fill="#e8e4dd" stroke="#d5d0c8" stroke-width="0.5" opacity="0.6"></path>';
        }).join('') +
        '</g>';

      const arcs = companies.map(function (c, i) {
        if (!vis.has(c.f) || !visCompanies.has(i)) return '';
        const ap = families[c.f] && families[c.f].anchorPos;
        if (!ap || !positions[i]) return '';
        const x1 = dims.tx(ap[0]);
        const y1 = dims.ty(ap[1]);
        const x2 = dims.tx(positions[i][0]);
        const y2 = dims.ty(positions[i][1]);
        if (Math.abs(x1 - x2) < 3 && Math.abs(y1 - y2) < 3) return '';
        return '<path d="' + arcPath(x1, y1, x2, y2, dims.scale) + '" fill="none" stroke="' + (families[c.f].color || '#999') + '" stroke-width="' + (isActive() ? 1 : 0.6) + '" opacity="' + (isActive() ? 0.35 : 0.12) + '"></path>';
      }).join('');

      let corridorAggregateArc = '';
      if (state.filterMode === 'corridor' && state.activeCorridor) {
        let sx = 0;
        let sy = 0;
        let txv = 0;
        let tyv = 0;
        let n = 0;
        companies.forEach(function (c, i) {
          if (!visCompanies.has(i) || !positions[i]) return;
          const ap = families[c.f] && families[c.f].anchorPos;
          if (!ap) return;
          sx += dims.tx(ap[0]);
          sy += dims.ty(ap[1]);
          txv += dims.tx(positions[i][0]);
          tyv += dims.ty(positions[i][1]);
          n += 1;
        });
        if (n > 0) {
          const ax = sx / n;
          const ay = sy / n;
          const bx = txv / n;
          const by = tyv / n;
          corridorAggregateArc =
            '<path d="' + arcPath(ax, ay, bx, by, dims.scale) + '" fill="none" stroke="#4a4a4a" stroke-width="7" opacity="0.09"></path>' +
            '<path d="' + arcPath(ax, ay, bx, by, dims.scale) + '" fill="none" stroke="#7a7a7a" stroke-width="2.2" opacity="0.24"></path>';
        }
      }

      const dimmed = isActive() ? companies.map(function (c, i) {
        if ((vis.has(c.f) && visCompanies.has(i)) || !positions[i]) return '';
        return '<circle cx="' + dims.tx(positions[i][0]) + '" cy="' + dims.ty(positions[i][1]) + '" r="' + (2 * dims.scale) + '" fill="#ccc" opacity="0.08"></circle>';
      }).join('') : '';

      const anchors = anchorNodes.map(function (a, i) {
        if (!vis.has(a.fid)) return '';
        const isH = state.hovered && state.hovered.type === 'anchor' && state.hovered.i === i;
        const r = isActive() ? (isH ? baseR * 1.4 + 3 : baseR * 1.4) : (isH ? baseR * 1.1 + 2 : baseR * 1.1);
        const cx = dims.tx(a.x);
        const cy = dims.ty(a.y);
        const color = a.fam.color || '#999';
        return '<g class="map-anchor" data-i="' + i + '">' +
          (isH ? '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r + 5) + '" fill="' + color + '" opacity="0.15"></circle>' : '') +
          '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="white" stroke="' + color + '" stroke-width="' + (isActive() ? 2.5 : 1.8) + '"></circle>' +
          (isActive() ? '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r + 3) + '" fill="none" stroke="' + color + '" stroke-width="1" stroke-dasharray="3,3" opacity="0.5"></circle>' : '') +
          '<text x="' + cx + '" y="' + cy + '" text-anchor="middle" dominant-baseline="central" font-size="' + Math.max(7, r * 0.9) + '" font-weight="700" fill="' + color + '">' + esc(a.fam.an.charAt(0).toUpperCase()) + '</text>' +
          (isActive() ? '<text x="' + cx + '" y="' + (cy + r + 12) + '" text-anchor="middle" font-size="' + Math.max(8, 10 * dims.scale) + '" font-weight="700" fill="#333">' + esc(a.fam.an) + '</text>' : '') +
          '</g>';
      }).join('');

      const activeFamilyCount = state.activeFamily
        ? companies.filter(function (x, i) { return x.f === state.activeFamily && visCompanies.has(i); }).length
        : 0;

      const nodes = companies.map(function (c, i) {
        if (!vis.has(c.f) || !visCompanies.has(i) || !positions[i]) return '';
        const isH = state.hovered && state.hovered.type === 'company' && state.hovered.i === i;
        const edge = c.r === 'edge_case';
        const r = isH ? baseR + 3 : (edge ? baseR * 0.75 : baseR);
        const cx = dims.tx(positions[i][0]);
        const cy = dims.ty(positions[i][1]);
        const color = (families[c.f] && families[c.f].color) || '#999';
        const showLbl = isH || (!!state.activeFamily && activeFamilyCount < 25);
        return '<g class="map-node" data-i="' + i + '">' +
          (isH ? '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r + 5) + '" fill="' + color + '" opacity="0.15"></circle>' : '') +
          '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="white" stroke="' + color + '" stroke-width="' + (edge ? 1 : 1.5) + '"></circle>' +
          '<text x="' + cx + '" y="' + cy + '" text-anchor="middle" dominant-baseline="central" font-size="' + Math.max(5, r * 0.85) + '" font-weight="600" fill="' + color + '" opacity="0.7">' + esc(c.n.charAt(0).toUpperCase()) + '</text>' +
          (showLbl ? '<text x="' + cx + '" y="' + (cy + r + 11) + '" text-anchor="middle" font-size="' + Math.max(7, 9 * dims.scale) + '" font-weight="500" fill="#555" stroke="rgba(245,243,239,0.8)" stroke-width="3" paint-order="stroke">' + esc(c.n) + '</text>' : '') +
          '</g>';
      }).join('');

      const arcLayer = state.filterMode === 'corridor' ? corridorAggregateArc : arcs;
      svg.innerHTML = world + arcLayer + dimmed + anchors + nodes;

      if (!logoToken) {
        logoLayer.innerHTML = '';
      } else {
        logoLayer.innerHTML =
          anchorNodes.map(function (a, i) {
            if (!vis.has(a.fid)) return '';
            const isH = state.hovered && state.hovered.type === 'anchor' && state.hovered.i === i;
            const r = isActive() ? (isH ? baseR * 1.4 + 3 : baseR * 1.4) : (isH ? baseR * 1.1 + 2 : baseR * 1.1);
            const lr = r - 2;
            const cx = dims.tx(a.x);
            const cy = dims.ty(a.y);
            return '<img src="' + logoUrl(a.fam.ad, 64, logoToken) + '" style="position:absolute;left:' + (cx - lr) + 'px;top:' + (cy - lr) + 'px;width:' + (lr * 2) + 'px;height:' + (lr * 2) + 'px;border-radius:50%;object-fit:contain;background:white" onerror="this.style.display=\'none\'" />';
          }).join('') +
          companies.map(function (c, i) {
            if (!vis.has(c.f) || !visCompanies.has(i) || !positions[i]) return '';
            const isH = state.hovered && state.hovered.type === 'company' && state.hovered.i === i;
            const edge = c.r === 'edge_case';
            const r = isH ? baseR + 3 : (edge ? baseR * 0.75 : baseR);
            const lr = r - 2;
            if (lr < 2) return '';
            const cx = dims.tx(positions[i][0]);
            const cy = dims.ty(positions[i][1]);
            return '<img src="' + logoUrl(c.d, 64, logoToken) + '" style="position:absolute;left:' + (cx - lr) + 'px;top:' + (cy - lr) + 'px;width:' + (lr * 2) + 'px;height:' + (lr * 2) + 'px;border-radius:50%;object-fit:contain;background:white" onerror="this.style.display=\'none\'" />';
          }).join('');
      }

      svg.querySelectorAll('.map-node').forEach(function (node) {
        const i = Number(node.dataset.i);
        function onMove(e) {
          const rect = svg.getBoundingClientRect();
          state.tipPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
          state.hovered = { type: 'company', i: i };
          renderTip(dims);
        }
        node.addEventListener('mouseenter', onMove);
        node.addEventListener('mousemove', onMove);
        node.addEventListener('mouseleave', function () {
          state.hovered = null;
          renderTip(dims);
        });
      });

      svg.querySelectorAll('.map-anchor').forEach(function (node) {
        const i = Number(node.dataset.i);
        node.addEventListener('mouseenter', function (e) {
          const rect = svg.getBoundingClientRect();
          state.tipPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
          state.hovered = { type: 'anchor', i: i };
          render();
        });
        node.addEventListener('mousemove', function (e) {
          const rect = svg.getBoundingClientRect();
          state.tipPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
          renderTip(dims);
        });
        node.addEventListener('mouseleave', function () {
          state.hovered = null;
          render();
        });
      });

      renderTip(dims);
    }

    function resetFilter() {
      state.activeFamily = null;
      state.activeCorridor = null;
      state.filterMode = null;
      state.search = '';
      state.famSearch = '';
      state.corridorSearch = '';
      companySearch.value = '';
      familySearch.value = '';
      corridorSearch.value = '';
      render();
    }

    function render() {
      updateSidebar();
      renderMapVisuals();
    }

    companySearch.addEventListener('input', function () {
      state.search = companySearch.value;
      if (!state.search && state.filterMode === 'search') {
        resetFilter();
        return;
      }
      updateSidebar();
    });
    companySearch.addEventListener('focus', function () {
      state.companyFocused = true;
      updateSidebar();
    });
    companySearch.addEventListener('blur', function () {
      setTimeout(function () {
        state.companyFocused = false;
        updateSidebar();
      }, 150);
    });

    familySearch.addEventListener('input', function () {
      state.famSearch = familySearch.value;
      updateSidebar();
    });
    familySearch.addEventListener('focus', function () {
      state.familyFocused = true;
      updateSidebar();
    });
    familySearch.addEventListener('blur', function () {
      setTimeout(function () {
        state.familyFocused = false;
        updateSidebar();
      }, 150);
    });

    corridorSearch.addEventListener('input', function () {
      state.corridorSearch = corridorSearch.value;
      if (!state.corridorSearch && state.filterMode === 'corridor') {
        resetFilter();
        return;
      }
      updateSidebar();
    });
    corridorSearch.addEventListener('focus', function () {
      state.corridorFocused = true;
      updateSidebar();
    });
    corridorSearch.addEventListener('blur', function () {
      setTimeout(function () {
        state.corridorFocused = false;
        updateSidebar();
      }, 150);
    });

    toggleFams.addEventListener('click', function () {
      state.showAllFams = !state.showAllFams;
      render();
    });

    corridorModeOneWay.addEventListener('click', function () {
      state.corridorMode = 'oneway';
      state.activeCorridor = null;
      state.corridorSearch = '';
      corridorSearch.value = '';
      if (state.filterMode === 'corridor') state.filterMode = null;
      render();
    });
    corridorModeTwoWay.addEventListener('click', function () {
      state.corridorMode = 'twoway';
      state.activeCorridor = null;
      state.corridorSearch = '';
      corridorSearch.value = '';
      if (state.filterMode === 'corridor') state.filterMode = null;
      render();
    });

    resetBtn.addEventListener('click', resetFilter);
    sidebarClearFilter.addEventListener('click', resetFilter);
    window.addEventListener('resize', renderMapVisuals);

    render();
  }

  window.renderMap = renderMap;
})();
