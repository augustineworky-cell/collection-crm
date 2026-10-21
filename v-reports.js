/* Reports view: ageing by collector, weekly collections by collector, heat table, top overdue */
(function () {
  'use strict';
  var D = window.DCC, esc = D.esc, icon = D.icon, short = D.short, rupee = D.rupee, days = D.days, TODAY = D.TODAY;
  var BUCKETS = ['Not due', '1-30 d', '31-60 d', '61-90 d', '90+ d'];
  function bucket(v) { var l = days(v.due, TODAY); return l <= 0 ? 0 : l <= 30 ? 1 : l <= 60 ? 2 : l <= 90 ? 3 : 4; }
  function ageBy(fn, keys) {
    var out = {}; keys.forEach(function (k) { out[k] = [0, 0, 0, 0, 0]; });
    D.scopeInvoices().forEach(function (v) { var k = fn(D.custById[v.cid]); if (out[k]) out[k][bucket(v)] += v.pending; });
    return out;
  }
  function heat() {
    var cats = ['General Trade', 'Modern Trade', 'E-commerce'], rows = [];
    ['Okhla', 'Gurgaon'].forEach(function (co) {
      cats.forEach(function (cat) {
        var b = [0, 0, 0, 0, 0];
        D.scopeInvoices().forEach(function (v) { var c = D.custById[v.cid]; if (c.company === co && c.category === cat) b[bucket(v)] += v.pending; });
        rows.push({ label: D.COMPANY_LABEL[co] + ' · ' + D.CAT_SHORT[cat], b: b, tot: b.reduce(function (s, x) { return s + x; }, 0) });
      });
    });
    var max = Math.max.apply(null, rows.map(function (r) { return Math.max.apply(null, r.b); })) || 1;
    var body = rows.filter(function (r) { return r.tot > 0; }).map(function (r) {
      return '<tr><th scope="row">' + r.label + '</th>' + r.b.map(function (x, i) {
        return '<td class="heat num" style="--h:' + Math.round(100 * x / max) + '%;--hc:var(--ag' + i + ')">' + (x ? short(x) : '-') + '</td>';
      }).join('') + '<td class="r num"><b>' + short(r.tot) + '</b></td></tr>';
    }).join('');
    return '<section class="card" aria-labelledby="h-hm"><div class="card-h"><h2 id="h-hm">' + icon('dashboard') + 'Ageing by company and customer type</h2></div>' +
      '<div class="tbl-wrap"><table class="dt heat-t"><thead><tr><th></th>' + BUCKETS.map(function (b) { return '<th class="r">' + b + '</th>'; }).join('') + '<th class="r">Total</th></tr></thead><tbody>' +
      (body || '<tr><td colspan="7" class="empty">No dues in this view.</td></tr>') + '</tbody></table></div></section>';
  }
  function topOverdue() {
    var rs = D.rollups().filter(function (r) { return r.overdue > 0; }).sort(function (a, b) { return b.overdue - a.overdue; }).slice(0, 8);
    var max = rs.length ? rs[0].overdue : 1;
    return '<section class="card" aria-labelledby="h-top"><div class="card-h"><h2 id="h-top">' + icon('alert') + 'Top overdue customers</h2></div><div class="card-b ag">' +
      (rs.map(function (r) {
        return '<button type="button" class="ag-row link" data-open="' + r.c.id + '" data-tip="<b>' + esc(r.c.name) + '</b><br>' + rupee(r.overdue) + ' overdue, oldest ' + r.oldest + ' d"><span class="ag-l">' + esc(r.c.name) + '</span>' +
          '<span class="track"><span class="fill" style="display:block;width:' + (r.overdue / max * 100).toFixed(1) + '%;background:var(--bad)"></span></span><span class="ag-v num">' + short(r.overdue) + '<small>' + r.oldest + ' d</small></span></button>';
      }).join('') || '<div class="empty">No overdue customers.</div>') + '</div></section>';
  }
  function efficiency() {
    var rows = ['Supriya', 'Abhay'].map(function (name) {
      var mine = D.scopedCustomers(true).filter(function (c) { return c.collector === name; });
      var rs = mine.map(D.rollup), pend = rs.reduce(function (s, r) { return s + r.pending; }, 0), over = rs.reduce(function (s, r) { return s + r.overdue; }, 0);
      var coll = D.scopePayments(mine).reduce(function (s, p) { return s + p.amount; }, 0) / 8;
      var fu = D.S.followups.filter(function (f) { return f.by === name && days(f.date, TODAY) <= 14; }).length;
      return '<tr><th scope="row">' + D.avatar(name) + ' ' + name + '</th><td class="r num">' + mine.length + '</td><td class="r num">' + short(pend) + '</td><td class="r num bad">' + short(over) + '</td><td class="r num">' + short(coll) + '</td><td class="r num">' + fu + '</td></tr>';
    }).join('');
    return '<section class="card" aria-labelledby="h-ef"><div class="card-h"><h2 id="h-ef">' + icon('users') + 'Collector summary</h2></div><div class="tbl-wrap"><table class="dt"><thead><tr><th></th><th class="r">Customers</th><th class="r">Pending</th><th class="r">Overdue</th><th class="r">Avg per week</th><th class="r">Calls, 14 d</th></tr></thead><tbody>' + rows + '</tbody></table></div></section>';
  }
  D.views.reports = {
    title: function () { return 'Reports'; },
    sub: function () { return 'Ageing, weekly collections and the biggest overdue accounts. Filters above apply.'; },
    reset: function () {},
    render: function () {
      return '<div class="g g-2">' +
        '<section class="card" aria-labelledby="h-ag2"><div class="card-h"><h2 id="h-ag2">' + icon('clock') + 'Ageing by collector</h2></div><div class="legend"><span><i class="lg-bar"></i>Supriya</span><span><i class="lg-bar b"></i>Abhay</span></div><div class="chart" id="r-age"></div></section>' +
        '<section class="card" aria-labelledby="h-wk2"><div class="card-h"><h2 id="h-wk2">' + icon('chart') + 'Weekly collections by collector</h2></div><div class="legend"><span><i class="lg-bar"></i>Supriya</span><span><i class="lg-bar b"></i>Abhay</span></div><div class="chart" id="r-wk"></div></section></div>' +
        '<div class="g g-2">' + heat() + topOverdue() + '</div><div class="g">' + efficiency() + '</div>';
    },
    after: function () {
      var a = ageBy(function (c) { return c.collector; }, ['Supriya', 'Abhay']);
      D.barChart(D.$('r-age'), {
        labels: BUCKETS, tipTitles: BUCKETS, aria: 'Dues by ageing bucket for each collector',
        series: [{ name: 'Supriya', cls: 'bar-a', values: a.Supriya }, { name: 'Abhay', cls: 'bar-b', values: a.Abhay }]
      });
      var cs = D.scopedCustomers(), data = {};
      ['Supriya', 'Abhay'].forEach(function (n) { data[n] = D.weekData(cs.filter(function (c) { return c.collector === n; })); });
      var wk = data.Supriya;
      D.barChart(D.$('r-wk'), {
        labels: wk.map(function (d, i) { return i === wk.length - 1 ? 'Last 7 d' : D.fmtDate(d.to); }),
        tipTitles: wk.map(function (d) { return D.fmtDate(d.from) + ' to ' + D.fmtDate(d.to); }), aria: 'Weekly collections for each collector',
        series: [{ name: 'Supriya', cls: 'bar-a', values: data.Supriya.map(function (d) { return d.v; }) }, { name: 'Abhay', cls: 'bar-b', values: data.Abhay.map(function (d) { return d.v; }) }]
      });
    }
  };
})();
