/* Dashboard view */
(function () {
  'use strict';
  var D = window.DCC, S = D.S, TODAY = D.TODAY, esc = D.esc, icon = D.icon, short = D.short, rupee = D.rupee, days = D.days;
  function vs() { return D.vs('dashboard', { lf: 'all', q: '', expanded: false }); }

  function kpiHtml(invs, customers) {
    var out = 0, over = 0, overN = 0, wk = 0, wkN = 0, podN = 0, podAmt = 0;
    invs.forEach(function (v) {
      out += v.pending; var late = days(v.due, TODAY);
      if (late > 0) { over += v.pending; overN++; } else if (late >= -7) { wk += v.pending; wkN++; }
      if (v.pod === 'missing') { podN++; podAmt += v.pending; }
    });
    var mtd = D.scopePayments(customers).filter(function (p) {
      return p.date.getMonth() === TODAY.getMonth() && p.date.getFullYear() === TODAY.getFullYear() && p.date <= TODAY;
    }).reduce(function (s, p) { return s + p.amount; }, 0);
    var mtdTarget = D.weeklyTarget(customers) * (TODAY.getDate() / 7);
    var pct = mtdTarget ? Math.round(100 * mtd / mtdTarget) : 0, pctOver = out ? Math.round(100 * over / out) : 0;
    function tile(cls, ic, label, val, sub, vcls) {
      return '<div class="kpi"><div class="kpi-h"><span class="kpi-ic ' + cls + '">' + icon(ic) + '</span><span class="kpi-l">' + label + '</span></div>' +
        '<div class="kpi-v num ' + (vcls || '') + '">' + val + '</div><div class="kpi-s">' + sub + '</div></div>';
    }
    return tile('brand', 'wallet', 'Total outstanding', short(out), invs.length + ' open invoices') +
      tile('bad', 'alert', 'Overdue', short(over), pctOver + '% of outstanding, ' + overN + ' invoices', 'bad') +
      tile('warn', 'calendar', 'Due in next 7 days', short(wk), wkN + ' invoices coming up') +
      tile('good', 'trend', 'Collected this month', short(mtd), pct + '% of month-to-date target') +
      tile('warn', 'shield', 'Missing receiving copy', podN + ' invoices', short(podAmt) + ' cannot be shown to customers');
  }
  function nextStep(r) {
    var f = r.last; if (!f) return '<span class="next">No follow-up logged yet.</span>';
    var txt;
    if (f.promise) {
      var d = days(TODAY, f.promise), when = d === 0 ? 'today' : d < 0 ? Math.abs(d) + ' d ago (missed)' : 'in ' + d + ' d';
      txt = '<b>Promise ' + when + '.</b> ' + esc(f.note);
    } else txt = esc(f.note);
    return '<span class="next">' + txt + '</span>';
  }
  function ageChip(r) {
    if (r.oldest > 0) return D.lateChip(r.oldest);
    return '<span class="chip">' + (r.nextDue === null ? 'Not due' : 'Due in ' + r.nextDue + ' d') + '</span>';
  }
  function docChip(r) {
    return r.podMissing ? '<span class="chip warn">' + icon('alert', 'sm') + r.podMissing + ' copy missing</span>' : '<span class="chip good">' + icon('check', 'sm') + 'All copies ready</span>';
  }
  function rowHtml(r) {
    var c = r.c;
    return '<button type="button" class="row" data-open="' + c.id + '">' +
      '<div class="c1">' + D.avatar(c.collector, 'data-tip="Collector: ' + esc(c.collector) + '"') +
      '<div style="min-width:0"><div class="cname">' + esc(c.name) + '</div>' +
      '<div class="csub"><span>' + D.COMPANY_LABEL[c.company] + '</span><span>' + D.CAT_SHORT[c.category] + '</span><span>Net ' + c.creditDays + '</span></div></div></div>' +
      '<div class="c2" data-l="Overdue"><div class="amt num ' + (r.overdue ? 'bad' : '') + '">' + short(r.overdue) + '</div><div class="amt-s num">of ' + short(r.pending) + ' pending</div></div>' +
      '<div class="c3" data-l="Oldest bill">' + ageChip(r) + '</div><div class="c4" data-l="Documents">' + docChip(r) + '</div>' +
      '<div class="c5">' + nextStep(r) + '</div><div class="c6">' + icon('arrow') + '</div></button>';
  }
  function listHtml(rs) {
    var st = vs();
    var cnt = { all: rs.length, overdue: rs.filter(function (r) { return r.overdue > 0; }).length, week: rs.filter(function (r) { return r.dueWeek > 0; }).length, pod: rs.filter(function (r) { return r.podMissing > 0; }).length };
    var q = (st.q || '').trim().toLowerCase();
    var shown = rs.filter(function (r) {
      if (st.lf === 'overdue' && !(r.overdue > 0)) return false;
      if (st.lf === 'week' && !(r.dueWeek > 0)) return false;
      if (st.lf === 'pod' && !(r.podMissing > 0)) return false;
      if (q && r.c.name.toLowerCase().indexOf(q) < 0 && !r.inv.some(function (v) { return v.no.toLowerCase().indexOf(q) >= 0; })) return false;
      return true;
    }).sort(function (a, b) { return (b.overdue - a.overdue) || (b.pending - a.pending); });
    var LIMIT = 8, rows = st.expanded ? shown : shown.slice(0, LIMIT);
    return '<section class="card list-card" aria-labelledby="h-list"><div class="card-h"><h2 id="h-list">' + icon('phone') + 'Who to collect from today</h2><span class="count">' + shown.length + ' customers</span></div>' +
      '<div class="tools">' + D.chipRow('lf', st.lf, [['all', 'All'], ['overdue', 'Overdue'], ['week', 'Due this week'], ['pod', 'Copy missing']], cnt) + D.searchBox(st, 'Customer or invoice no.') + '</div>' +
      '<div class="lh"><div>Customer</div><div>Overdue</div><div>Oldest bill</div><div>Documents</div><div class="h5">Next step</div><div></div></div>' +
      (rows.length ? rows.map(rowHtml).join('') : '<div class="empty">No customers match these filters.</div>') +
      (shown.length > LIMIT ? '<div class="more"><button type="button" id="more">' + (st.expanded ? 'Show top ' + LIMIT : 'Show all ' + shown.length + ' customers') + '</button></div>' : '') + '</section>';
  }
  function ageingHtml(invs) {
    var B = [['Not yet due', 'var(--ag0)'], ['1 to 30 d', 'var(--ag1)'], ['31 to 60 d', 'var(--ag2)'], ['61 to 90 d', 'var(--ag3)'], ['Over 90 d', 'var(--ag4)']].map(function (b) { return { k: b[0], col: b[1], v: 0, n: 0 }; });
    invs.forEach(function (v) { var late = days(v.due, TODAY), i = late <= 0 ? 0 : late <= 30 ? 1 : late <= 60 ? 2 : late <= 90 ? 3 : 4; B[i].v += v.pending; B[i].n++; });
    var max = Math.max.apply(null, B.map(function (b) { return b.v; })) || 1;
    return '<section class="card" aria-labelledby="h-ag"><div class="card-h"><h2 id="h-ag">' + icon('clock') + 'Ageing of dues</h2></div><div class="card-b ag">' +
      B.map(function (b) {
        return '<div class="ag-row" data-tip="<b>' + b.k + '</b><br>' + rupee(b.v) + ' across ' + b.n + ' invoices"><span class="ag-l">' + b.k + '</span>' +
          '<span class="track"><span class="fill" style="display:block;width:' + (b.v / max * 100).toFixed(1) + '%;background:' + b.col + '"></span></span>' +
          '<span class="ag-v num">' + short(b.v) + '<small>' + b.n + '</small></span></div>';
      }).join('') + '</div></section>';
  }
  function podHtml(invs) {
    var miss = invs.filter(function (v) { return v.pod === 'missing'; }).sort(function (a, b) { return b.pending - a.pending; });
    var total = miss.reduce(function (s, v) { return s + v.pending; }, 0);
    var items = miss.slice(0, 5).map(function (v) {
      var c = D.custById[v.cid];
      return '<button type="button" class="pod-item" data-open="' + c.id + '"><div class="l"><div class="t mono">' + esc(v.no) + '</div><div class="s">' + esc(c.name) + ' · ' + c.company + ' store</div></div>' +
        '<div class="r"><div class="amt num" style="font-size:14px">' + short(v.pending) + '</div><div class="amt-s">billed ' + days(v.date, TODAY) + ' d ago</div></div></button>';
    }).join('');
    return '<section class="card" aria-labelledby="h-pod"><div class="card-h"><h2 id="h-pod">' + icon('shield') + 'Stamped copy not uploaded</h2><span class="count bad">' + miss.length + '</span></div>' +
      (items ? '<div class="pod-list">' + items + '</div><div class="pod-note">' + short(total) + ' is stuck behind these. <button type="button" class="link-btn" data-nav="copies">Open all in Receiving copies</button></div>'
        : '<div class="empty">Every delivered invoice has its stamped copy.</div>') + '</section>';
  }
  function trendHtml() {
    var data = D.weekData(D.scopedCustomers());
    var rows = data.map(function (d) { return '<tr><td>' + D.fmtDate(d.from) + ' to ' + D.fmtDate(d.to) + '</td><td class="num">' + rupee(d.v) + '</td><td class="num">' + rupee(d.t) + '</td><td class="num">' + Math.round(100 * d.v / (d.t || 1)) + '%</td></tr>'; }).join('');
    return '<section class="card" aria-labelledby="h-tr"><div class="card-h"><h2 id="h-tr">' + icon('chart') + 'Collections per week</h2></div>' +
      '<div class="legend"><span><i class="lg-bar"></i>Collected</span><span><i class="lg-line"></i>Weekly target</span></div><div class="chart" id="trend"></div>' +
      '<details class="tbl"><summary>View as table</summary><table><thead><tr><th>Week</th><th>Collected</th><th>Target</th><th>Hit</th></tr></thead><tbody>' + rows + '</tbody></table></details></section>';
  }
  function promisesHtml(rs) {
    var items = [];
    rs.forEach(function (r) { var f = r.last; if (!f || !f.promise || r.overdue <= 0) return; var d = days(TODAY, f.promise); if (d <= 3) items.push({ r: r, f: f, d: d }); });
    items.sort(function (a, b) { return (a.d < 0 ? -1 : 0) - (b.d < 0 ? -1 : 0) || a.d - b.d || b.r.overdue - a.r.overdue; });
    var html = items.slice(0, 6).map(function (it) {
      return '<button type="button" class="fu-item" data-open="' + it.r.c.id + '">' + D.avatar(it.r.c.collector) +
        '<div style="min-width:0"><div class="t">' + esc(it.r.c.name) + '</div><div class="s">' + esc(it.f.note) + '</div></div>' +
        '<div class="r">' + D.promiseChip(it.f) + '<span class="amt-s num">' + short(it.r.overdue) + ' overdue</span></div></button>';
    }).join('');
    var missed = items.filter(function (i) { return i.d < 0; }).length;
    return '<section class="card" aria-labelledby="h-pr"><div class="card-h"><h2 id="h-pr">' + icon('calendar') + 'Promises to pay</h2>' + (missed ? '<span class="count bad">' + missed + ' missed</span>' : '') + '</div>' +
      (html ? '<div class="fu">' + html + '</div>' : '<div class="empty">No promises due in the next 3 days.</div>') + '</section>';
  }
  function collectorsHtml() {
    var customers = D.scopedCustomers(true);
    var body = ['Supriya', 'Abhay'].map(function (name) {
      var mine = customers.filter(function (c) { return c.collector === name; });
      var rs = mine.map(D.rollup).filter(function (r) { return r.pending > 0; });
      var over = rs.reduce(function (s, r) { return s + r.overdue; }, 0);
      var mtd = D.scopePayments(mine).filter(function (p) { return p.date.getMonth() === TODAY.getMonth() && p.date <= TODAY; }).reduce(function (s, p) { return s + p.amount; }, 0);
      var allMine = S.customers.filter(function (c) { return c.collector === name; });
      var share = allMine.reduce(function (s, c) { return s + D.rollup(c).pending; }, 0), mineShare = mine.reduce(function (s, c) { return s + D.rollup(c).pending; }, 0);
      var tg = share ? S.targets[name] * (mineShare / share) * (TODAY.getDate() / 7) : 0;
      var pct = tg ? Math.min(100, Math.round(100 * mtd / tg)) : 0;
      var missed = rs.filter(function (r) { return r.last && r.last.promise && days(TODAY, r.last.promise) < 0; }).length;
      var today = rs.filter(function (r) { return r.last && r.last.promise && days(TODAY, r.last.promise) === 0; }).length;
      return '<div><div class="col-h">' + D.avatar(name) + '<div><b>' + name + '</b><span>' + mine.length + ' customers</span></div></div>' +
        '<div class="col-bar"><div class="track" data-tip="Collected ' + rupee(mtd) + ' against a month-to-date target of ' + rupee(tg) + '"><span class="fill" style="display:block;width:' + pct + '%"></span></div>' +
        '<div class="meta"><span class="num">' + short(mtd) + ' collected</span><span class="num">' + pct + '% of ' + short(tg) + '</span></div></div>' +
        '<div class="col-st"><span class="chip bad">' + short(over) + ' overdue</span>' + (today ? '<span class="chip warn">' + today + ' promise' + (today > 1 ? 's' : '') + ' today</span>' : '') + (missed ? '<span class="chip">' + missed + ' missed</span>' : '') + '</div></div>';
    }).join('');
    return '<section class="card" aria-labelledby="h-co"><div class="card-h"><h2 id="h-co">' + icon('users') + 'Collectors</h2></div><div class="col">' + body + '</div></section>';
  }

  D.views.dashboard = {
    title: function () {
      var h = new Date().getHours(), part = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
      return part + (D.state.collector === 'All' ? ', collections team' : ', ' + D.state.collector);
    },
    sub: function () { return TODAY.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + '. Okhla and Gurgaon, one view.'; },
    reset: function () { vs().expanded = false; },
    render: function () {
      var customers = D.scopedCustomers(), rs = D.rollups(), invs = D.scopeInvoices();
      return '<div class="kpis">' + kpiHtml(invs, customers) + '</div>' +
        '<div class="g g-b">' + listHtml(rs) + '<div class="stack">' + ageingHtml(invs) + podHtml(invs) + '</div></div>' +
        '<div class="g g-c">' + trendHtml() + promisesHtml(rs) + collectorsHtml() + '</div>';
    },
    after: function () {
      var host = D.$('trend'); if (!host) return;
      var data = D.weekData(D.scopedCustomers());
      D.barChart(host, {
        labels: data.map(function (d, i) { return i === data.length - 1 ? 'Last 7 d' : D.fmtDate(d.to); },),
        tipTitles: data.map(function (d) { return D.fmtDate(d.from) + ' to ' + D.fmtDate(d.to); }),
        series: [{ name: 'Collected', cls: 'bar-a', values: data.map(function (d) { return d.v; }) }],
        line: data[0].t, aria: 'Weekly collections against target for the last 8 weeks'
      });
    },
    click: function (t) {
      var st = vs(), lf = t.closest('[data-lf]');
      if (lf) { st.lf = lf.getAttribute('data-lf'); st.expanded = false; D.render(); return; }
      if (t.closest('#more')) { st.expanded = !st.expanded; D.render(); }
    }
  };
})();
