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

  async function renderCorridors(containerEl, basePath) {
    if (!containerEl) return;
    const data = await fetch(resolve(basePath, 'corridors.json')).then(function (r) { return r.json(); });
    const list = containerEl.querySelector('#corridor-list');
    const toggleButtons = containerEl.querySelectorAll('.toggle-btn');
    if (!list) return;

    let curSort = 'value';
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

  window.renderCorridors = renderCorridors;
  window.renderArchetypes = renderArchetypes;
  window.renderFlips = renderFlips;
})();
