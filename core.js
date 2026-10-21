/* DCC Collection CRM: shared core. Helpers, filters, customer drawer,
   charts, router. Each page lives in its own v-*.js file and registers
   itself on DCC.views. Data comes from window.SAMPLE (see data.js). */
(function () {
  'use strict';
  var S = window.SAMPLE, TODAY = S.today, DAY = 864e5;
  var D = window.DCC = {
    S: S, TODAY: TODAY, views: {}, order: ['dashboard', 'customers', 'invoices', 'copies', 'followups', 'reports'],
    state: { view: 'dashboard', collector: 'All', company: 'All', category: 'All', v: {} },
    COMPANY_LABEL: { Okhla: 'Okhla (D)', Gurgaon: 'Gurgaon (G)' },
    CAT_SHORT: { 'General Trade': 'GT', 'Modern Trade': 'MT', 'E-commerce': 'E-com' },
    custById: {}
  };
  S.customers.forEach(function (c) { D.custById[c.id] = c; });
  var $ = D.$ = function (id) { return document.getElementById(id); };

  /* ---------- formatting ---------- */
  D.esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  D.icon = function (name, cls) { return '<svg class="ic' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#i-' + name + '"/></svg>'; };
  D.rupee = function (n) { return '₹' + Math.round(n).toLocaleString('en-IN'); };
  D.short = function (n) {
    var a = Math.abs(n);
    if (a >= 1e7) return '₹' + (n / 1e7).toFixed(2) + ' Cr';
    if (a >= 1e5) return '₹' + (n / 1e5).toFixed(1) + ' L';
    if (a >= 1e3) return '₹' + (n / 1e3).toFixed(1) + 'K';
    return '₹' + Math.round(n);
  };
  D.days = function (from, to) { return Math.round((to - from) / DAY); };
  D.fmtDate = function (d) { return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); };
  D.fmtDateY = function (d) { return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); };
  D.initials = function (n) { return n.split(' ').map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase(); };
  D.avatarCls = function (name) { return name === 'Supriya' ? 'av-s' : 'av-a'; };
  D.avatar = function (name, extra) { return '<span class="avatar ' + D.avatarCls(name) + '" ' + (extra || '') + '>' + D.initials(name) + '</span>'; };
  D.vs = function (name, defaults) {
    if (!D.state.v[name]) D.state.v[name] = defaults || {};
    return D.state.v[name];
  };

  /* ---------- scope and rollups ---------- */
  D.scopedCustomers = function (ignoreCollector) {
    var st = D.state;
    return S.customers.filter(function (c) {
      return (ignoreCollector || st.collector === 'All' || c.collector === st.collector) &&
        (st.company === 'All' || c.company === st.company) &&
        (st.category === 'All' || c.category === st.category);
    });
  };
  D.followupsFor = function (cid) {
    return S.followups.filter(function (f) { return f.cid === cid; }).sort(function (a, b) { return b.date - a.date; });
  };
  D.rollup = function (c) {
    var inv = S.invoices.filter(function (v) { return v.cid === c.id && v.pending > 0; });
    var r = { c: c, inv: inv, pending: 0, overdue: 0, oldest: 0, overdueCount: 0, podMissing: 0, dueWeek: 0, nextDue: null };
    inv.forEach(function (v) {
      r.pending += v.pending;
      var late = D.days(v.due, TODAY);
      if (late > 0) { r.overdue += v.pending; r.overdueCount++; if (late > r.oldest) r.oldest = late; }
      else if (late >= -7) { r.dueWeek += v.pending; }
      if (late <= 0 && (r.nextDue === null || -late < r.nextDue)) r.nextDue = -late;
      if (v.pod === 'missing') r.podMissing++;
    });
    var fu = D.followupsFor(c.id);
    r.last = fu[0] || null;
    return r;
  };
  D.rollups = function () { return D.scopedCustomers().map(D.rollup).filter(function (r) { return r.pending > 0; }); };
  D.scopeInvoices = function () {
    var ids = {}; D.scopedCustomers().forEach(function (c) { ids[c.id] = 1; });
    return S.invoices.filter(function (v) { return ids[v.cid] && v.pending > 0; });
  };
  D.scopePayments = function (customers) {
    var ids = {}; (customers || D.scopedCustomers()).forEach(function (c) { ids[c.id] = 1; });
    return S.payments.filter(function (p) { return ids[p.cid]; });
  };
  D.weeklyTarget = function (customers) {
    var total = 0, list = customers || D.scopedCustomers();
    ['Supriya', 'Abhay'].forEach(function (name) {
      var all = S.customers.filter(function (c) { return c.collector === name; });
      var mine = list.filter(function (c) { return c.collector === name; });
      var sum = function (l) { return l.reduce(function (s, c) { return s + D.rollup(c).pending; }, 0); };
      var denom = sum(all);
      if (denom > 0) total += S.targets[name] * (sum(mine) / denom);
    });
    return total;
  };
  D.weekData = function (customers) {
    var pay = D.scopePayments(customers), tgt = D.weeklyTarget(customers), out = [];
    for (var w = 7; w >= 0; w--) {
      var from = new Date(TODAY.getTime() - (w * 7 + 6) * DAY), to = new Date(TODAY.getTime() - w * 7 * DAY);
      var tot = pay.filter(function (p) { return p.weeksAgo === w; }).reduce(function (s, p) { return s + p.amount; }, 0);
      out.push({ from: from, to: to, v: tot, t: tgt });
    }
    return out;
  };

  /* ---------- shared bits of markup ---------- */
  D.lateChip = function (late) {
    if (late > 60) return '<span class="chip bad2">' + late + ' d late</span>';
    if (late > 30) return '<span class="chip bad">' + late + ' d late</span>';
    if (late > 0) return '<span class="chip warn">' + late + ' d late</span>';
    return '<span class="chip">' + (late === 0 ? 'Due today' : 'Due in ' + (-late) + ' d') + '</span>';
  };
  D.promiseChip = function (f) {
    if (!f || !f.promise) return '';
    var d = D.days(TODAY, f.promise);
    if (d < 0) return '<span class="chip bad">Missed ' + Math.abs(d) + ' d ago</span>';
    if (d === 0) return '<span class="chip warn">Today</span>';
    return '<span class="chip info">In ' + d + ' d</span>';
  };
  D.podChip = function (pod) {
    if (pod === 'ready') return '<span class="chip good">' + D.icon('check', 'sm') + 'Copy ready</span>';
    if (pod === 'missing') return '<span class="chip warn">' + D.icon('alert', 'sm') + 'Copy missing</span>';
    return '<span class="chip info">' + D.icon('clock', 'sm') + 'Copy in transit</span>';
  };
  D.th = function (view, key, label, cls) {
    var vs = D.vs(view), on = vs.sort === key;
    return '<th class="' + (cls || '') + '"' + (on ? ' aria-sort="' + (vs.dir === 'asc' ? 'ascending' : 'descending') + '"' : '') + '>' +
      '<button type="button" data-sort="' + key + '">' + label + '<span class="sortic">' + (on ? (vs.dir === 'asc' ? '▲' : '▼') : '⇅') + '</span></button></th>';
  };
  D.sortList = function (list, getters, vs) {
    var g = getters[vs.sort]; if (!g) return list;
    var dir = vs.dir === 'asc' ? 1 : -1;
    return list.slice().sort(function (a, b) {
      var x = g(a), y = g(b);
      if (typeof x === 'string') return dir * x.localeCompare(y);
      return dir * (x - y);
    });
  };
  D.searchBox = function (vs, ph) {
    return '<label class="search"><span class="sr">Search</span>' + D.icon('search') + '<input id="q" type="search" placeholder="' + D.esc(ph) + '" value="' + D.esc(vs.q || '') + '" autocomplete="off"></label>';
  };
  D.chipRow = function (attr, cur, opts, counts) {
    return '<div class="fchips">' + opts.map(function (o) {
      return '<button type="button" data-' + attr + '="' + o[0] + '" aria-pressed="' + (cur === o[0]) + '">' + o[1] + (counts ? '<b>' + counts[o[0]] + '</b>' : '') + '</button>';
    }).join('') + '</div>';
  };
  D.csv = function (rows) {
    return rows.map(function (r) {
      return r.map(function (c) { var s = String(c); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',');
    }).join('\n');
  };

  /* ---------- tooltip, toast, copy ---------- */
  var tip = $('tip');
  document.addEventListener('pointermove', function (e) {
    var el = e.target.closest ? e.target.closest('[data-tip]') : null;
    if (!el) { tip.hidden = true; return; }
    tip.innerHTML = el.getAttribute('data-tip'); tip.hidden = false;
    var w = tip.offsetWidth, h = tip.offsetHeight;
    var x = Math.min(e.clientX + 14, window.innerWidth - w - 8), y = e.clientY + 16;
    if (y + h > window.innerHeight - 8) y = e.clientY - h - 12;
    tip.style.left = Math.max(8, x) + 'px'; tip.style.top = Math.max(8, y) + 'px';
  });
  document.addEventListener('pointerleave', function () { tip.hidden = true; }, true);
  var toastTimer;
  D.toast = function (msg) {
    var t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 3600);
  };
  D.copyText = function (text, okMsg) {
    var fail = function () { D.toast('Copy was blocked here. Select the text and copy it by hand.'); };
    try { navigator.clipboard.writeText(text).then(function () { D.toast(okMsg || 'Copied.'); }, fail); } catch (err) { fail(); }
  };

  /* ---------- garland ---------- */
  var GARLAND = ['#ef4444', '#fbbf24', '#22c55e', '#60a5fa', '#f472b6', '#fb923c'];
  function drawLights() {
    var host = $('lights'); var w = host.clientWidth || 800; var swag = w < 600 ? 90 : 130; var h = 34;
    var n = Math.ceil(w / swag); var d = 'M0 4', bulbs = '', idx = 0;
    for (var i = 0; i < n; i++) {
      var x0 = i * swag, x1 = x0 + swag, cx = x0 + swag / 2, cy = 26;
      d += ' Q' + cx + ' ' + cy + ' ' + x1 + ' 4';
      for (var k = 1; k <= 3; k++) {
        var t = k / 4, mt = 1 - t;
        var bx = mt * mt * x0 + 2 * mt * t * cx + t * t * x1;
        var by = mt * mt * 4 + 2 * mt * t * cy + t * t * 4;
        var col = GARLAND[idx % GARLAND.length];
        bulbs += '<g class="bulb" style="animation-delay:' + ((idx * 0.37) % 2.6).toFixed(2) + 's;color:' + col + '">' +
          '<rect x="' + (bx - 2.5) + '" y="' + by + '" width="5" height="4" rx="1" fill="var(--cord)"/>' +
          '<ellipse cx="' + bx + '" cy="' + (by + 9) + '" rx="4" ry="5.5" fill="currentColor" style="filter:drop-shadow(0 0 4px currentColor)"/></g>';
        idx++;
      }
    }
    host.innerHTML = '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true">' +
      '<path d="' + d + '" fill="none" stroke="var(--cord)" stroke-width="1.6"/>' + bulbs + '</svg>';
  }

  /* ---------- bar chart (single or grouped series, optional target line) ---------- */
  function niceMax(v) {
    var steps = [1e5, 2e5, 2.5e5, 5e5, 1e6, 2e6, 2.5e6, 5e6], unit = steps[steps.length - 1];
    for (var i = 0; i < steps.length; i++) { if (v / steps[i] <= 4) { unit = steps[i]; break; } }
    return { step: unit, max: Math.ceil(v / unit) * unit };
  }
  function barPath(x, y, w, h, r) {
    r = Math.min(r, h, w / 2);
    return 'M' + x + ' ' + (y + h) + 'L' + x + ' ' + (y + r) + 'Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y +
      'L' + (x + w - r) + ' ' + y + 'Q' + (x + w) + ' ' + y + ' ' + (x + w) + ' ' + (y + r) + 'L' + (x + w) + ' ' + (y + h) + 'Z';
  }
  /* o = { labels:[], tipTitles:[], series:[{name, cls, values:[]}], line:number|null, aria } */
  D.barChart = function (host, o) {
    if (!host) return;
    var W = host.clientWidth || 480, H = o.height || 230, m = { l: 46, r: 10, t: 14, b: 28 };
    var iw = W - m.l - m.r, ih = H - m.t - m.b, n = o.labels.length, ns = o.series.length;
    var maxv = o.line || 0;
    o.series.forEach(function (s) { s.values.forEach(function (v) { if (v > maxv) maxv = v; }); });
    var nm = niceMax(maxv * 1.08 || 1), max = nm.max;
    var gw = iw / n, gap = 2, barW = Math.min(34, (gw * 0.66 - gap * (ns - 1)) / ns);
    var y = function (v) { return m.t + ih - (v / max) * ih; };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + D.esc(o.aria || 'Bar chart') + '">';
    for (var v = 0; v <= max + 1; v += nm.step) {
      s += '<line class="grid" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + y(v) + '" y2="' + y(v) + '"/>' +
        '<text x="' + (m.l - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + (v === 0 ? '0' : (v / 1e5) + ' L') + '</text>';
    }
    var skip = gw < 46 ? 2 : 1;
    for (var i = 0; i < n; i++) {
      var cx = m.l + gw * i + gw / 2, total = ns * barW + (ns - 1) * gap, x0 = cx - total / 2;
      var tipHtml = '<b>' + o.tipTitles[i] + '</b>' + o.series.map(function (se) { return '<br>' + D.esc(se.name) + ': ' + D.rupee(se.values[i]); }).join('') +
        (o.line ? '<br>Target: ' + D.rupee(o.line) : '');
      o.series.forEach(function (se, k) {
        var h = (se.values[i] / max) * ih;
        s += '<path class="bar ' + se.cls + '" d="' + barPath(x0 + k * (barW + gap), y(se.values[i]), barW, h, 4) + '"/>';
      });
      if ((n - 1 - i) % skip === 0) s += '<text x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle">' + o.labels[i] + '</text>';
      s += '<rect x="' + (cx - gw / 2) + '" y="' + m.t + '" width="' + gw + '" height="' + ih + '" fill="transparent" data-tip="' + D.esc(tipHtml) + '"/>';
    }
    if (o.line) s += '<line class="tgt" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + y(o.line) + '" y2="' + y(o.line) + '"/>';
    host.innerHTML = s + '</svg>';
  };

  /* ---------- customer drawer ---------- */
  var lastTrigger = null;
  function docBtn(kind, st, label, cid) {
    var ic = st === 'ready' ? 'check' : st === 'missing' ? 'alert' : st === 'transit' ? 'clock' : '';
    var txt = { ready: label, missing: label + ' missing', transit: label + ' in transit', pending: label + ' pending', na: label + ' n/a' }[st];
    var cls = st === 'pending' ? 'missing' : st;
    var live = st !== 'na';
    return (live ? '<button type="button" class="doc ' + cls + '" data-doc="' + kind + '" data-st="' + st + '" data-cid="' + cid + '">' : '<span class="doc">') +
      (ic ? D.icon(ic, 'sm') : '') + D.esc(txt) + (live ? '</button>' : '</span>');
  }
  function drawerHtml(cid) {
    var c = D.custById[cid], r = D.rollup(c);
    var inv = r.inv.slice().sort(function (a, b) { return a.due - b.due; });
    var fu = D.followupsFor(cid);
    var invHtml = inv.map(function (v) {
      var late = D.days(v.due, TODAY);
      var part = v.pending < v.amount ? ' <span class="chip info">Part paid</span>' : '';
      return '<div class="inv"><div class="inv-top"><span class="inv-no mono">' + D.esc(v.no) + '</span><span class="amt num">' + D.rupee(v.pending) + '</span></div>' +
        '<div class="inv-sub"><span>Billed ' + D.fmtDate(v.date) + '</span><span>Due ' + D.fmtDate(v.due) + '</span>' + D.lateChip(late) + part + '</div>' +
        '<div class="docs">' + docBtn('Invoice', 'ready', 'Invoice', cid) + docBtn('POD', v.pod, 'Receiving copy', cid) +
        (v.po ? docBtn('PO', 'ready', 'PO ' + v.po, cid) : docBtn('PO', 'na', 'PO', cid)) +
        (v.grn === 'na' ? '' : docBtn('GRN', v.grn === 'received' ? 'ready' : 'pending', 'GRN', cid)) + '</div></div>';
    }).join('');
    var tl = fu.length ? fu.map(function (f) {
      var p = f.promise ? '<span class="chip ' + (D.days(TODAY, f.promise) < 0 ? 'bad' : 'info') + '">Promise ' + D.fmtDate(f.promise) + '</span>' : '';
      return '<div class="tl-item"><div class="m"><span>' + D.fmtDateY(f.date) + ' · ' + D.esc(f.by) + '</span>' + p + '</div>' + D.esc(f.note) + '</div>';
    }).join('') : '<div class="tl-item">No follow-ups yet.</div>';
    var min = TODAY.getFullYear() + '-' + String(TODAY.getMonth() + 1).padStart(2, '0') + '-' + String(TODAY.getDate()).padStart(2, '0');
    return '<div class="d-head"><div class="d-top"><div style="min-width:0"><h2 id="d-title">' + D.esc(c.name) + '</h2>' +
      '<div class="d-chips"><span class="chip">' + D.COMPANY_LABEL[c.company] + '</span><span class="chip">' + D.esc(c.category) + '</span><span class="chip">Net ' + c.creditDays + ' days</span></div></div>' +
      '<button type="button" class="icon-btn" id="d-close" aria-label="Close">' + D.icon('x') + '</button></div></div>' +
      '<div class="d-body"><div class="d-meta">' +
      '<div><span class="k">Collector</span>' + D.avatar(c.collector, 'style="width:26px;height:26px;font-size:10px"') + '<b>' + D.esc(c.collector) + '</b></div>' +
      '<div><span class="k">Contact</span><span>' + D.esc(c.contact) + '</span><span class="mono num">' + c.phone + '</span><button type="button" class="copy" data-copy="' + c.phone + '">' + D.icon('copy', 'sm') + 'Copy</button></div>' +
      '<div><span class="k">Location</span><span>' + D.esc(c.city) + '</span></div></div>' +
      '<div class="d-stats"><div class="d-stat"><div class="k">Pending</div><div class="v num">' + D.short(r.pending) + '</div></div>' +
      '<div class="d-stat"><div class="k">Overdue</div><div class="v num" style="color:' + (r.overdue ? 'var(--bad)' : 'inherit') + '">' + D.short(r.overdue) + '</div></div>' +
      '<div class="d-stat"><div class="k">Oldest</div><div class="v num">' + (r.oldest ? r.oldest + ' d' : 'None') + '</div></div></div>' +
      '<div class="d-sec"><h3>' + D.icon('file', 'sm') + 'Open invoices (' + inv.length + ')</h3>' + (invHtml || '<div class="tl-item">Nothing pending.</div>') + '</div>' +
      '<div class="d-sec"><h3>' + D.icon('phone', 'sm') + 'Follow-ups</h3><div class="tl" id="d-tl">' + tl + '</div></div>' +
      '<form class="form" id="fu-form" data-cid="' + cid + '"><h3 style="font-size:13px">Log a follow-up</h3>' +
      '<label for="fu-note">What happened<textarea id="fu-note" required placeholder="Spoke to accounts, they will pay after GRN."></textarea></label>' +
      '<label for="fu-promise">Promise to pay by (optional)<input id="fu-promise" type="date" min="' + min + '"></label>' +
      '<button class="btn" type="submit">Save follow-up</button></form></div>';
  }
  D.openDrawer = function (cid, trigger) {
    lastTrigger = trigger || lastTrigger;
    var d = $('drawer'); d.innerHTML = drawerHtml(cid); d.hidden = false; $('dscrim').hidden = false;
    d.setAttribute('aria-labelledby', 'd-title'); document.body.style.overflow = 'hidden';
    $('d-close').focus();
  };
  D.closeDrawer = function () {
    $('drawer').hidden = true; $('dscrim').hidden = true; document.body.style.overflow = '';
    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus();
  };
  D.addFollowup = function (cid, note, promiseStr) {
    var promise = null;
    if (promiseStr) { var p = promiseStr.split('-'); promise = new Date(+p[0], +p[1] - 1, +p[2]); }
    S.followups.push({ cid: cid, date: new Date(TODAY), by: D.custById[cid].collector, note: note, promise: promise });
  };

  /* ---------- page shell, router ---------- */
  function segHtml(key, opts) {
    return '<div class="seg" role="group">' + opts.map(function (o) {
      return '<button type="button" data-seg="' + key + '" data-v="' + D.esc(o[0]) + '" aria-pressed="' + (D.state[key] === o[0]) + '">' + D.esc(o[1]) + '</button>';
    }).join('') + '</div>';
  }
  function xmasDays() {
    var y = TODAY.getFullYear(), x = new Date(y, 11, 25);
    if (x < TODAY) x = new Date(y + 1, 11, 25);
    return D.days(TODAY, x);
  }
  D.render = function () {
    var view = D.views[D.state.view];
    var active = document.activeElement && document.activeElement.id;
    $('greet').textContent = view.title();
    $('today').textContent = view.sub();
    $('xmas').textContent = xmasDays() + ' days to Christmas';
    $('filters').innerHTML =
      '<div class="fgroup"><span class="flabel">Collector</span>' + segHtml('collector', [['All', 'All'], ['Supriya', 'Supriya'], ['Abhay', 'Abhay']]) + '</div>' +
      '<div class="fgroup"><span class="flabel">Company</span>' + segHtml('company', [['All', 'Both'], ['Okhla', 'Okhla (D)'], ['Gurgaon', 'Gurgaon (G)']]) + '</div>' +
      '<div class="fgroup"><span class="flabel">Customer type</span>' + segHtml('category', [['All', 'All'], ['General Trade', 'GT'], ['Modern Trade', 'MT'], ['E-commerce', 'E-com']]) + '</div>';
    $('view').innerHTML = view.render();
    Array.prototype.forEach.call(document.querySelectorAll('[data-nav]'), function (b) {
      if (b.getAttribute('data-nav') === D.state.view) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    if (view.after) view.after();
    if (active === 'q') { var q = $('q'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }
  };
  D.go = function (name, noPush) {
    if (!D.views[name]) name = 'dashboard';
    D.state.view = name; D.render(); window.scrollTo(0, 0);
    $('side').classList.remove('open'); $('scrim').hidden = true;
    if (!noPush) { try { history.pushState(null, '', '#' + name); } catch (err) { /* ignore */ } }
  };

  /* ---------- events ---------- */
  function currentView() { return D.views[D.state.view]; }
  document.addEventListener('click', function (e) {
    var t = e.target;
    var seg = t.closest('[data-seg]');
    if (seg) { D.state[seg.getAttribute('data-seg')] = seg.getAttribute('data-v'); (currentView().reset || function () {})(); D.render(); return; }
    var nav = t.closest('[data-nav]');
    if (nav) { if (!$('drawer').hidden) D.closeDrawer(); D.go(nav.getAttribute('data-nav')); return; }
    var op = t.closest('[data-open]');
    if (op) { D.openDrawer(op.getAttribute('data-open'), op); return; }
    if (t.closest('#d-close') || t.closest('#dscrim')) { D.closeDrawer(); return; }
    var sort = t.closest('[data-sort]');
    if (sort) {
      var vs = D.vs(D.state.view), key = sort.getAttribute('data-sort');
      if (vs.sort === key) vs.dir = vs.dir === 'asc' ? 'desc' : 'asc'; else { vs.sort = key; vs.dir = key === 'name' || key === 'no' || key === 'customer' ? 'asc' : 'desc'; }
      D.render(); return;
    }
    var doc = t.closest('[data-doc]');
    if (doc) {
      var kind = doc.getAttribute('data-doc'), st = doc.getAttribute('data-st');
      D.toast(st === 'missing' ? 'Sample only: in the live CRM this pings the store team to upload the stamped copy.'
        : st === 'transit' ? 'Delivered within the last 2 days. The stamped copy is not due yet.'
        : st === 'pending' ? 'Sample only: GRN is still awaited from the customer.'
        : 'Sample only: in the live CRM this opens the ' + kind + ' file so you can share it.');
      return;
    }
    var cp = t.closest('[data-copy]');
    if (cp) { D.copyText(cp.getAttribute('data-copy'), 'Number copied.'); return; }
    if (t.closest('#menu')) { $('side').classList.add('open'); $('scrim').hidden = false; return; }
    if (t.closest('#side-close') || t.closest('#scrim')) { $('side').classList.remove('open'); $('scrim').hidden = true; return; }
    if (t.closest('#theme')) {
      var root = document.documentElement;
      var dark = root.getAttribute('data-theme') ? root.getAttribute('data-theme') === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
      var next = dark ? 'light' : 'dark'; root.setAttribute('data-theme', next);
      try { localStorage.setItem('dcc-theme', next); } catch (err) { /* storage unavailable */ }
      return;
    }
    var v = currentView(); if (v.click) v.click(t, e);
  });
  document.addEventListener('input', function (e) {
    var v = currentView(), vs = D.vs(D.state.view);
    if (e.target.id === 'q') { vs.q = e.target.value; vs.limit = null; vs.expanded = false; D.render(); return; }
    if (v.input) v.input(e.target, e);
  });
  document.addEventListener('submit', function (e) {
    var f = e.target.closest('#fu-form');
    if (f) {
      e.preventDefault();
      var cid = f.getAttribute('data-cid'), note = $('fu-note').value.trim(); if (!note) return;
      D.addFollowup(cid, note, $('fu-promise').value);
      D.openDrawer(cid); D.render(); D.toast('Follow-up saved on this page. The live CRM will store it in Supabase.');
      return;
    }
    var v = currentView(); if (v.submit) v.submit(e.target, e);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if (!$('drawer').hidden) D.closeDrawer(); else { $('side').classList.remove('open'); $('scrim').hidden = true; } return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('tr[data-open]')) { e.preventDefault(); D.openDrawer(e.target.getAttribute('data-open'), e.target); }
  });
  var rz;
  window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { drawLights(); var v = currentView(); if (v && v.after) v.after(); }, 120); });
  window.addEventListener('popstate', function () { D.go((location.hash || '').slice(1), true); });

  D.start = function () {
    try { var saved = localStorage.getItem('dcc-theme'); if (saved) document.documentElement.setAttribute('data-theme', saved); } catch (err) { /* ignore */ }
    var first = (location.hash || '').slice(1);
    D.state.view = D.views[first] ? first : 'dashboard';
    D.render(); drawLights();
  };
})();
