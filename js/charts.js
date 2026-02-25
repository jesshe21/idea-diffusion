(function () {
  const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  function getTip() {
    return document.getElementById('tip');
  }

  function showTip(event, html) {
    const tip = getTip();
    if (!tip) return;
    tip.innerHTML = html;
    tip.classList.add('show');
    if (!isMobile && event) {
      tip.style.left = Math.min(event.clientX + 14, window.innerWidth - 260) + 'px';
      tip.style.top = event.clientY - 8 + 'px';
    }
  }

  function hideTip() {
    const tip = getTip();
    if (tip) tip.classList.remove('show');
  }

  document.addEventListener('mousemove', function (e) {
    const tip = getTip();
    if (!tip || isMobile || !tip.classList.contains('show')) return;
    tip.style.left = Math.min(e.clientX + 14, window.innerWidth - 260) + 'px';
    tip.style.top = e.clientY - 8 + 'px';
  });

  document.addEventListener('click', function (e) {
    const tip = getTip();
    if (!tip || !isMobile || !tip.classList.contains('show')) return;
    if (!e.target.closest('.c-row, .a-row, .f-row')) hideTip();
  });

  function resolve(basePath, file) {
    return (basePath || 'data/').replace(/\/?$/, '/') + file;
  }

  function fmtMoney(v) {
    return v >= 1000
      ? '$' + (v / 1000).toFixed(1).replace(/\.0$/, '') + 'B'
      : '$' + v + 'M';
  }

  function parseCSVLine(line) {
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

  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    const headers = parseCSVLine(lines[0]);
    return lines.slice(1).map(function (line) {
      const vals = parseCSVLine(line);
      const row = {};
      headers.forEach(function (h, i) { row[h] = vals[i] || ''; });
      return row;
    });
  }

  async function renderCorridors(containerEl, basePath) {
    if (!containerEl) return;
    const data = await fetch(resolve(basePath, 'corridors.json')).then(function (r) { return r.json(); });
    const list = containerEl.querySelector('#corridor-list');
    const toggleButtons = containerEl.querySelectorAll('.toggle-btn');
    if (!list) return;

    let curSort = 'count';
    let initialized = false;

    function render() {
      const sorted = data.slice().sort(function (a, b) { return b[curSort] - a[curSort]; });
      const barColor = curSort === 'value' ? 'value-bar' : 'count-bar';
      const maxVal = Math.max.apply(null, sorted.map(function (c) { return c[curSort]; }));

      const oldPositions = {};
      if (initialized) {
        list.querySelectorAll('.c-row').forEach(function (row) {
          oldPositions[row.dataset.code] = row.getBoundingClientRect();
        });
      }

      list.innerHTML = sorted.map(function (c, i) {
        const nameDisplay = c.from + ' ↔ ' + c.to;
        const pct = (c[curSort] / maxVal) * 100;
        return (
          '<div class="c-row ' +
          (i === 0 ? 'top-row ' : '') +
          (initialized ? 'no-entrance' : '') +
          '" data-code="' + c.code + '" ' +
          (!initialized ? 'style="animation-delay:' + i * 35 + 'ms"' : '') +
          '>' +
          '<div class="c-label">' +
          '<div class="c-flags">' + c.f1 + '<i class="arrow-icon">↔</i>' + c.f2 + '</div>' +
          '<div class="c-names"><span class="primary">' + nameDisplay + '</span></div>' +
          '</div>' +
          '<div class="c-bars"><div class="c-bar-track"><div class="c-bar-fill ' + barColor + '" data-w="' + pct + '"></div></div></div>' +
          '<div class="c-val">' + c[curSort].toFixed(1) + '%</div>' +
          '</div>'
        );
      }).join('');

      list.querySelectorAll('.c-row').forEach(function (row) {
        const code = row.dataset.code;
        const c = data.find(function (x) { return x.code === code; });
        row.addEventListener('mouseenter', function (e) {
          showTip(e,
            '<div class="tip-title">' + c.f1 + ' ↔ ' + c.f2 + ' ' + c.from + ' ↔ ' + c.to + '</div>' +
            '<div class="tip-row"><span>% of Companies</span><span>' + c.count + '%</span></div>' +
            '<div class="tip-row"><span>% of Value</span><span>' + c.value + '%</span></div>' +
            '<div class="tip-row"><span>Value / Count</span><span>' + (c.value / c.count).toFixed(1) + '×</span></div>'
          );
        });
        row.addEventListener('mouseleave', hideTip);
      });

      requestAnimationFrame(function () {
        list.querySelectorAll('.c-bar-fill').forEach(function (bar) {
          bar.style.width = bar.dataset.w + '%';
        });

        if (initialized && Object.keys(oldPositions).length) {
          list.querySelectorAll('.c-row').forEach(function (row) {
            const oldRect = oldPositions[row.dataset.code];
            if (!oldRect) return;
            const newRect = row.getBoundingClientRect();
            const deltaY = oldRect.top - newRect.top;
            if (Math.abs(deltaY) < 1) return;
            row.style.transform = 'translateY(' + deltaY + 'px)';
            row.style.transition = 'none';
            requestAnimationFrame(function () {
              row.style.transition = 'transform 0.45s cubic-bezier(0.25, 1, 0.5, 1)';
              row.style.transform = 'translateY(0)';
            });
          });
        }
        initialized = true;
      });
    }

    toggleButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        curSort = btn.dataset.sort;
        toggleButtons.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        render();
      });
    });

    render();
  }

  async function renderArchetypes(containerEl, basePath) {
    if (!containerEl) return;
    const data = await fetch(resolve(basePath, 'archetypes.json')).then(function (r) { return r.json(); });
    const list = containerEl.querySelector('#arch-list');
    if (!list || !data.length) return;
    const max = data[0].val;

    list.innerHTML = data.map(function (a, i) {
      return (
        '<div class="a-row" style="animation-delay:' + i * 45 + 'ms">' +
        '<div class="a-bg bg-' + a.c + '" data-w="' + (a.val / max) * 100 + '"></div>' +
        '<div class="a-content">' +
        '<div class="a-name"><span class="a-rank">#' + (i + 1) + '</span><span class="clr-' + a.c + '">' + a.name + '</span><span class="a-cat">' + a.cat + '</span></div>' +
        '<div class="a-pill">' + a.n + ' variants</div>' +
        '<div class="a-stat"><span class="a-stat-label">Value</span>$' + (a.val / 1000).toFixed(0) + 'B</div>' +
        '<div class="a-pct">' + a.pct + '%</div>' +
        '</div>' +
        '</div>'
      );
    }).join('');

    list.querySelectorAll('.a-row').forEach(function (row, i) {
      const a = data[i];
      row.addEventListener('mouseenter', function (e) {
        showTip(e,
          '<div class="tip-title">' + a.name + '</div>' +
          '<div class="tip-row"><span>Category</span><span>' + a.cat + '</span></div>' +
          '<div class="tip-row"><span>Variants</span><span>' + a.n + ' companies</span></div>' +
          '<div class="tip-row"><span>Total Value</span><span>$' + (a.val / 1000).toFixed(0) + 'B</span></div>' +
          '<div class="tip-row"><span>% of Total</span><span>' + a.pct + '%</span></div>'
        );
      });
      row.addEventListener('mouseleave', hideTip);
    });

    requestAnimationFrame(function () {
      list.querySelectorAll('.a-bg').forEach(function (b) {
        b.style.width = b.dataset.w + '%';
      });
    });
  }

  async function renderFlips(containerEl, basePath) {
    if (!containerEl) return;
    const data = await fetch(resolve(basePath, 'flips.json')).then(function (r) { return r.json(); });
    const list = containerEl.querySelector('#flip-list');
    if (!list || !data.length) return;

    const headerEl = list.querySelector('.f-header');
    const header = headerEl ? headerEl.outerHTML : '';
    const maxDelta = Math.max.apply(null, data.map(function (f) { return f.delta; }));

    list.innerHTML = header + data.map(function (f, i) {
      const mult = (f.vVal / f.sVal).toFixed(0);
      return (
        '<div class="f-row" style="animation-delay:' + i * 45 + 'ms">' +
        '<div class="f-source"><span class="f-company">' + f.source + '</span><span class="f-val">' + fmtMoney(f.sVal) + '</span></div>' +
        '<div class="f-arrow-block">→</div>' +
        '<div class="f-variant"><span class="f-company">' + f.variant + '</span><span class="f-val">' + fmtMoney(f.vVal) + '</span></div>' +
        '<div class="f-delta-bar-track"><div class="f-delta-bar-fill" data-w="' + (f.delta / maxDelta) * 100 + '"></div></div>' +
        '<div class="f-delta"><div class="f-delta-val">+' + fmtMoney(f.delta) + '</div><div class="f-delta-mult">' + mult + '×</div></div>' +
        '</div>'
      );
    }).join('');

    list.querySelectorAll('.f-row').forEach(function (row, i) {
      const f = data[i];
      const mult = (f.vVal / f.sVal).toFixed(0);
      row.addEventListener('mouseenter', function (e) {
        showTip(e,
          '<div class="tip-title">' + f.source + ' → ' + f.variant + '</div>' +
          '<div class="tip-row"><span>Source Valuation</span><span>' + fmtMoney(f.sVal) + '</span></div>' +
          '<div class="tip-row"><span>Variant Valuation</span><span>' + fmtMoney(f.vVal) + '</span></div>' +
          '<div class="tip-row"><span>Delta</span><span>+' + fmtMoney(f.delta) + '</span></div>' +
          '<div class="tip-row"><span>Multiple</span><span>' + mult + '×</span></div>'
        );
      });
      row.addEventListener('mouseleave', hideTip);
    });

    requestAnimationFrame(function () {
      list.querySelectorAll('.f-delta-bar-fill').forEach(function (b) {
        b.style.width = b.dataset.w + '%';
      });
    });
  }

  async function renderLagDistribution(containerEl, basePath) {
    if (!containerEl) return;
    const summaryEl = containerEl.querySelector('#lag-summary');
    const svg = containerEl.querySelector('#lag-chart-svg');
    if (!svg) return;
    if (summaryEl) summaryEl.innerHTML = '<div class="lag-stat"><span>Status</span><strong>Loading...</strong></div>';
    svg.innerHTML = '<text x="24" y="36" fill="#8A8780" font-size="13">Loading lag distribution...</text>';

    try {
      const raw = await Promise.all([
        fetch(resolve(basePath, 'companies.csv')).then(function (r) {
          if (!r.ok) throw new Error('Failed to load companies.csv (' + r.status + ')');
          return r.text();
        }),
        fetch(resolve(basePath, 'families.json')).then(function (r) {
          if (!r.ok) throw new Error('Failed to load families.json (' + r.status + ')');
          return r.json();
        })
      ]);
      const companies = parseCSV(raw[0]);
      const companiesWithCountry = companies.filter(function (c) {
        return String(c.cc || '').trim() !== '';
      });
      const missingCountry = companies.length - companiesWithCountry.length;
      const families = raw[1];

      const lags = [];
      let missingAnchorYear = 0;
      let missingVariantYear = 0;
      let negativeLag = 0;

      companiesWithCountry.forEach(function (c) {
        const fam = families[c.f];
        const anchorYear = fam ? Number(fam.anchorYear) : NaN;
        const variantYear = Number(c.y);
        if (!Number.isFinite(variantYear)) {
          missingVariantYear += 1;
          return;
        }
        if (!Number.isFinite(anchorYear)) {
          missingAnchorYear += 1;
          return;
        }
        const lag = variantYear - anchorYear;
        if (lag < 0) {
          negativeLag += 1;
          return;
        }
        lags.push(lag);
      });

      const totalPairs = companiesWithCountry.length;
      const includedPairs = lags.length;
      if (summaryEl) {
        summaryEl.innerHTML =
          '<div class="lag-stat"><span>Included Pairs</span><strong>' + includedPairs + '</strong></div>' +
          '<div class="lag-stat"><span>Missing Country Dropped</span><strong>' + missingCountry + '</strong></div>' +
          '<div class="lag-stat"><span>Missing Anchor Year</span><strong>' + missingAnchorYear + '</strong></div>' +
          '<div class="lag-stat"><span>Missing Variant Year</span><strong>' + missingVariantYear + '</strong></div>' +
          '<div class="lag-stat"><span>Negative Lag Dropped</span><strong>' + negativeLag + '</strong></div>' +
          '<div class="lag-stat"><span>Total Pairs</span><strong>' + totalPairs + '</strong></div>';
      }
      if (!includedPairs) {
        svg.innerHTML = '<text x="24" y="36" fill="#8A8780" font-size="13">No valid lag pairs available.</text>';
        return;
      }

      const maxLag = Math.max.apply(null, lags.map(function (v) { return Math.ceil(v); }));
      const minX = 0;
      const maxX = Math.max(10, maxLag);
      const binWidth = 1;
      const bins = Array.from({ length: maxX + 1 }, function (_, i) {
        return { x0: i, x1: i + binWidth, count: 0 };
      });
      lags.forEach(function (v) {
        const idx = Math.min(maxX, Math.max(0, Math.floor(v)));
        bins[idx].count += 1;
      });
      bins.forEach(function (b) { b.prob = b.count / includedPairs; });

      const bandwidth = 2.2;
      function gaussian(u) {
        return Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI);
      }
      function density(x) {
        let sum = 0;
        for (let i = 0; i < lags.length; i += 1) {
          sum += gaussian((x - lags[i]) / bandwidth);
        }
        return sum / (lags.length * bandwidth);
      }
      const sampleStep = 0.25;
      const curve = [];
      for (let x = minX; x <= maxX; x += sampleStep) {
        curve.push({ x: x, y: density(x) });
      }

      const width = Math.max(640, containerEl.clientWidth - 4);
      const height = 360;
      const m = { top: 16, right: 20, bottom: 44, left: 52 };
      const iw = width - m.left - m.right;
      const ih = height - m.top - m.bottom;

      const yMax = Math.max(
        Math.max.apply(null, bins.map(function (b) { return b.prob; })),
        Math.max.apply(null, curve.map(function (p) { return p.y; }))
      ) * 1.15;

      function sx(x) { return m.left + ((x - minX) / (maxX - minX)) * iw; }
      function sy(y) { return m.top + ih - (y / yMax) * ih; }

      const xTickStep = maxX > 40 ? 10 : 5;
      const xTicks = [];
      for (let t = 0; t <= maxX; t += xTickStep) xTicks.push(t);
      const yTicks = 4;

      const bars = bins.map(function (b) {
        const x = sx(b.x0);
        const w = Math.max(1, sx(b.x1) - x - 1);
        const y = sy(b.prob);
        const h = Math.max(0, m.top + ih - y);
        return '<rect class="lag-bar" data-x="' + b.x0 + '" data-p="' + b.prob + '" x="' + x.toFixed(2) + '" y="' + y.toFixed(2) + '" width="' + w.toFixed(2) + '" height="' + h.toFixed(2) + '"></rect>';
      }).join('');

      const linePath = curve.map(function (p, i) {
        return (i ? 'L' : 'M') + sx(p.x).toFixed(2) + ',' + sy(p.y).toFixed(2);
      }).join(' ');

      const xGrid = xTicks.map(function (t) {
        const x = sx(t).toFixed(2);
        return '<line class="lag-grid" x1="' + x + '" y1="' + m.top + '" x2="' + x + '" y2="' + (m.top + ih) + '"></line>' +
          '<text class="lag-axis-text" x="' + x + '" y="' + (m.top + ih + 18) + '" text-anchor="middle">' + t + '</text>';
      }).join('');
      const yGrid = Array.from({ length: yTicks + 1 }, function (_, i) { return i; }).map(function (i) {
        const v = (yMax * i) / yTicks;
        const y = sy(v).toFixed(2);
        return '<line class="lag-grid" x1="' + m.left + '" y1="' + y + '" x2="' + (m.left + iw) + '" y2="' + y + '"></line>' +
          '<text class="lag-axis-text" x="' + (m.left - 10) + '" y="' + (Number(y) + 4) + '" text-anchor="end">' + (v * 100).toFixed(1) + '%</text>';
      }).join('');

      svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
      svg.innerHTML =
        '<g>' + xGrid + yGrid + '</g>' +
        '<line class="lag-axis" x1="' + m.left + '" y1="' + (m.top + ih) + '" x2="' + (m.left + iw) + '" y2="' + (m.top + ih) + '"></line>' +
        '<line class="lag-axis" x1="' + m.left + '" y1="' + m.top + '" x2="' + m.left + '" y2="' + (m.top + ih) + '"></line>' +
        '<g class="lag-bars">' + bars + '</g>' +
        '<path class="lag-line" d="' + linePath + '"></path>' +
        '<text class="lag-axis-label" x="' + (m.left + iw / 2) + '" y="' + (height - 8) + '" text-anchor="middle">Time Lag n (Years)</text>' +
        '<text class="lag-axis-label" transform="translate(14 ' + (m.top + ih / 2) + ') rotate(-90)" text-anchor="middle">Probability Distribution</text>';

      svg.querySelectorAll('.lag-bar').forEach(function (bar) {
        bar.addEventListener('mouseenter', function (e) {
          const x0 = Number(bar.dataset.x);
          const p = Number(bar.dataset.p);
          showTip(e,
            '<div class="tip-title">Lag ' + x0 + ' to ' + (x0 + 1) + ' years</div>' +
            '<div class="tip-row"><span>Probability</span><span>' + (p * 100).toFixed(2) + '%</span></div>'
          );
        });
        bar.addEventListener('mouseleave', hideTip);
      });
    } catch (err) {
      if (summaryEl) summaryEl.innerHTML = '<div class="lag-stat"><span>Status</span><strong>Error</strong></div>';
      svg.innerHTML = '<text x="24" y="36" fill="#B14A2F" font-size="13">Lag chart failed to render: ' + String(err.message || err) + '</text>';
      console.error('renderLagDistribution failed', err);
    }
  }

  window.renderCorridors = renderCorridors;
  window.renderArchetypes = renderArchetypes;
  window.renderFlips = renderFlips;
  window.renderLagDistribution = renderLagDistribution;
})();
