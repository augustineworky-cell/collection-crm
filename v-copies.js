/* Receiving copies view: the proof the collectors are waiting for */
(function () {
  'use strict';
  var D = window.DCC, esc = D.esc, icon = D.icon, short = D.short, days = D.days, TODAY = D.TODAY;
  function vs() { return D.vs('copies', { tab: 'missing', q: '' }); }
  function tabOf(v) { return v.pod === 'missing' ? 'missing' : v.pod === 'transit' ? 'transit' : v.grn === 'pending' ? 'grn' : 'ready'; }
  function item(v) {
    var c = D.custById[v.cid], age = days(v.date, TODAY);
    var what = v.pod === 'missing' ? 'Delivered, stamped copy not uploaded' : v.pod === 'transit' ? 'Delivered in the last 2 days' : v.grn === 'pending' ? 'GRN awaited from customer' : 'Copy on file';
    return '<button type="button" class="pod-item wide" data-open="' + c.id + '"><div class="l"><div class="t mono">' + esc(v.no) + '</div><div class="s">' + esc(c.name) + ' · ' + D.COMPANY_LABEL[c.company] + '</div><div class="s">' + what + '</div></div>' +
      '<div class="r"><div class="amt num" style="font-size:14px">' + short(v.pending) + '</div><div class="amt-s">billed ' + age + ' d ago</div>' + (days(v.due, TODAY) > 0 ? '<span class="chip bad">Overdue</span>' : '') + '</div></button>';
  }
  function visible() {
    var st = vs(), q = (st.q || '').trim().toLowerCase();
    var all = D.scopeInvoices(), cnt = { missing: 0, transit: 0, grn: 0, ready: 0 }, amt = { missing: 0, transit: 0, grn: 0, ready: 0 };
    all.forEach(function (v) { var k = tabOf(v); cnt[k]++; amt[k] += v.pending; });
    var rows = all.filter(function (v) { return tabOf(v) === st.tab && (!q || (v.no + ' ' + D.custById[v.cid].name).toLowerCase().indexOf(q) >= 0); })
      .sort(function (a, b) { return a.date - b.date; });
    return { all: all, cnt: cnt, amt: amt, rows: rows };
  }
  function byStore(all) {
    var rows = ['Okhla', 'Gurgaon'].map(function (co) {
      var mine = all.filter(function (v) { return D.custById[v.cid].company === co && (v.pod === 'missing' || v.pod === 'ready'); });
      var miss = mine.filter(function (v) { return v.pod === 'missing'; }).length, pct = mine.length ? Math.round(100 * (mine.length - miss) / mine.length) : 100;
      return '<div class="ag-row" data-tip="<b>' + D.COMPANY_LABEL[co] + '</b><br>' + miss + ' of ' + mine.length + ' delivered invoices have no copy"><span class="ag-l">' + D.COMPANY_LABEL[co] + '</span>' +
        '<span class="track"><span class="fill" style="display:block;width:' + pct + '%;background:var(--good)"></span></span><span class="ag-v num">' + pct + '%<small>' + miss + ' missing</small></span></div>';
    }).join('');
    return '<section class="card" aria-labelledby="h-st"><div class="card-h"><h2 id="h-st">' + icon('check') + 'Upload rate by store</h2></div><div class="card-b ag">' + rows + '<p class="note">Share of delivered invoices that already have the stamped copy. The store team fills this in the FMS.</p></div></section>';
  }
  D.views.copies = {
    title: function () { return 'Receiving copies'; },
    sub: function () { return 'Stamped copies and GRNs. No copy means the collector has nothing to show the customer.'; },
    reset: function () {},
    render: function () {
      var st = vs(), d = visible();
      var tabs = [['missing', 'Copy missing'], ['transit', 'In transit'], ['grn', 'GRN pending'], ['ready', 'Ready']];
      function tile(cls, ic, label, k, sub) {
        return '<div class="kpi"><div class="kpi-h"><span class="kpi-ic ' + cls + '">' + icon(ic) + '</span><span class="kpi-l">' + label + '</span></div><div class="kpi-v num">' + d.cnt[k] + '</div><div class="kpi-s">' + short(d.amt[k]) + sub + '</div></div>';
      }
      var chase = d.rows.map(function (v) { var c = D.custById[v.cid]; return v.no + ' | ' + c.name + ' | ' + c.company + ' | ' + D.rupee(v.pending); }).join('\n');
      return '<div class="kpis k4">' + tile('bad', 'alert', 'Copy missing', 'missing', ' blocked') + tile('info', 'clock', 'In transit', 'transit', ' not due yet') +
        tile('warn', 'file', 'GRN pending', 'grn', ' awaiting customer') + tile('good', 'check', 'Ready to show', 'ready', ' with proof') + '</div>' +
        '<div class="g g-b"><section class="card page-card" aria-labelledby="h-p"><div class="card-h"><h2 id="h-p">' + icon('shield') + 'Invoices by proof status</h2><span class="count' + (st.tab === 'missing' ? ' bad' : '') + '">' + d.rows.length + '</span>' +
        '<button type="button" class="btn ghost" id="chase" data-text="' + esc(chase) + '"' + (d.rows.length ? '' : ' disabled') + '>' + icon('copy', 'sm') + 'Copy list for store team</button></div>' +
        '<div class="tools">' + D.chipRow('tab', st.tab, tabs, d.cnt) + D.searchBox(st, 'Invoice no. or customer') + '</div>' +
        '<div class="pod-list">' + (d.rows.length ? d.rows.slice(0, 40).map(item).join('') : '<div class="empty">Nothing here.</div>') + '</div></section>' +
        '<div class="stack">' + byStore(d.all) + '</div></div>';
    },
    click: function (t) {
      var tab = t.closest('[data-tab]'); if (tab) { vs().tab = tab.getAttribute('data-tab'); D.render(); return; }
      var ch = t.closest('#chase'); if (ch) D.copyText(ch.getAttribute('data-text'), 'List copied. Send it to the store team.');
    }
  };
})();
