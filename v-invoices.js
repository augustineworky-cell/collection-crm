/* Invoices view: every open invoice, sortable, with CSV copy */
(function () {
  'use strict';
  var D = window.DCC, esc = D.esc, icon = D.icon, rupee = D.rupee, days = D.days, TODAY = D.TODAY, LIMIT = 25;
  function vs() { return D.vs('invoices', { f: 'all', q: '', sort: 'late', dir: 'desc', expanded: false }); }
  var G = {
    no: function (v) { return v.no.toLowerCase(); },
    customer: function (v) { return D.custById[v.cid].name.toLowerCase(); },
    date: function (v) { return v.date.getTime(); },
    due: function (v) { return v.due.getTime(); },
    late: function (v) { return days(v.due, TODAY); },
    amount: function (v) { return v.amount; },
    pending: function (v) { return v.pending; }
  };
  function data() {
    var st = vs(), q = (st.q || '').trim().toLowerCase(), all = D.scopeInvoices();
    var is = {
      overdue: function (v) { return days(v.due, TODAY) > 0; },
      week: function (v) { var l = days(v.due, TODAY); return l <= 0 && l >= -7; },
      part: function (v) { return v.pending < v.amount; },
      pod: function (v) { return v.pod === 'missing'; }
    };
    var cnt = { all: all.length }; Object.keys(is).forEach(function (k) { cnt[k] = all.filter(is[k]).length; });
    var rows = all.filter(function (v) {
      if (st.f !== 'all' && !is[st.f](v)) return false;
      if (q && (v.no + ' ' + D.custById[v.cid].name + ' ' + (v.po || '')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    return { rows: D.sortList(rows, G, st), cnt: cnt };
  }
  function row(v) {
    var c = D.custById[v.cid], late = days(v.due, TODAY);
    return '<tr tabindex="0" data-open="' + c.id + '"><td class="mono">' + esc(v.no) + '</td><td><b>' + esc(c.name) + '</b><small>' + D.COMPANY_LABEL[c.company] + ' · ' + D.CAT_SHORT[c.category] + '</small></td>' +
      '<td>' + D.fmtDate(v.date) + '</td><td>' + D.fmtDate(v.due) + '</td><td>' + D.lateChip(late) + '</td>' +
      '<td class="r num">' + rupee(v.amount) + '</td><td class="r num"><b>' + rupee(v.pending) + '</b>' + (v.pending < v.amount ? '<small>part paid</small>' : '') + '</td>' +
      '<td>' + D.podChip(v.pod) + '</td></tr>';
  }
  D.views.invoices = {
    title: function () { return 'Invoices'; },
    sub: function () { return 'Open invoices from Tally with the proof status from the FMS next to each one.'; },
    reset: function () { vs().expanded = false; },
    render: function () {
      var st = vs(), d = data(), rows = st.expanded ? d.rows : d.rows.slice(0, LIMIT);
      var tp = d.rows.reduce(function (s, v) { return s + v.pending; }, 0);
      return '<section class="card page-card" aria-labelledby="h-i"><div class="card-h"><h2 id="h-i">' + icon('file') + 'Open invoices</h2><span class="count">' + d.rows.length + '</span>' +
        '<button type="button" class="btn ghost" id="csv">' + icon('copy', 'sm') + 'Copy as CSV</button></div>' +
        '<div class="tools">' + D.chipRow('f', st.f, [['all', 'All'], ['overdue', 'Overdue'], ['week', 'Due this week'], ['part', 'Part paid'], ['pod', 'Copy missing']], d.cnt) + D.searchBox(st, 'Invoice no., customer or PO') + '</div>' +
        '<div class="tbl-wrap"><table class="dt"><thead><tr>' + D.th('invoices', 'no', 'Invoice') + D.th('invoices', 'customer', 'Customer') + D.th('invoices', 'date', 'Billed') + D.th('invoices', 'due', 'Due') + D.th('invoices', 'late', 'Status') +
        D.th('invoices', 'amount', 'Amount', 'r') + D.th('invoices', 'pending', 'Pending', 'r') + '<th>Receiving copy</th></tr></thead><tbody>' +
        (rows.length ? rows.map(row).join('') : '<tr><td colspan="8" class="empty">No invoices match.</td></tr>') +
        '</tbody><tfoot><tr><td colspan="6">Total pending, ' + d.rows.length + ' invoices</td><td class="r num">' + rupee(tp) + '</td><td></td></tr></tfoot></table></div>' +
        (d.rows.length > LIMIT ? '<div class="more"><button type="button" id="more">' + (st.expanded ? 'Show first ' + LIMIT : 'Show all ' + d.rows.length + ' invoices') + '</button></div>' : '') + '</section>';
    },
    click: function (t) {
      var st = vs(), f = t.closest('[data-f]');
      if (f) { st.f = f.getAttribute('data-f'); st.expanded = false; D.render(); return; }
      if (t.closest('#more')) { st.expanded = !st.expanded; D.render(); return; }
      if (t.closest('#csv')) {
        var rows = [['Invoice', 'Customer', 'Company', 'Billed', 'Due', 'Days late', 'Amount', 'Pending', 'Receiving copy']];
        data().rows.forEach(function (v) {
          var c = D.custById[v.cid];
          rows.push([v.no, c.name, c.company, v.date.toISOString().slice(0, 10), v.due.toISOString().slice(0, 10), days(v.due, TODAY), v.amount, v.pending, v.pod]);
        });
        D.copyText(D.csv(rows), 'CSV copied. Paste it into Excel or Sheets.');
      }
    }
  };
})();
