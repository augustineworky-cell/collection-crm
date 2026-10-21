/* Customers view: one sortable table of every customer in scope */
(function () {
  'use strict';
  var D = window.DCC, esc = D.esc, icon = D.icon, short = D.short, days = D.days, TODAY = D.TODAY;
  function vs() { return D.vs('customers', { f: 'all', q: '', sort: 'overdue', dir: 'desc' }); }
  var G = {
    name: function (r) { return r.c.name.toLowerCase(); },
    collector: function (r) { return r.c.collector; },
    pending: function (r) { return r.pending; },
    overdue: function (r) { return r.overdue; },
    oldest: function (r) { return r.oldest; },
    copies: function (r) { return r.podMissing; },
    last: function (r) { return r.last ? r.last.date.getTime() : 0; }
  };
  function data() {
    var st = vs(), q = (st.q || '').trim().toLowerCase();
    var all = D.scopedCustomers().map(D.rollup);
    var cnt = {
      all: all.length,
      overdue: all.filter(function (r) { return r.overdue > 0; }).length,
      clear: all.filter(function (r) { return r.pending === 0; }).length,
      quiet: all.filter(function (r) { return r.overdue > 0 && (!r.last || days(r.last.date, TODAY) > 7); }).length
    };
    var rows = all.filter(function (r) {
      if (st.f === 'overdue' && !(r.overdue > 0)) return false;
      if (st.f === 'clear' && r.pending !== 0) return false;
      if (st.f === 'quiet' && !(r.overdue > 0 && (!r.last || days(r.last.date, TODAY) > 7))) return false;
      if (q && (r.c.name + ' ' + r.c.city + ' ' + r.c.contact).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    return { rows: D.sortList(rows, G, st), cnt: cnt };
  }
  function row(r) {
    var c = r.c, last = r.last;
    return '<tr tabindex="0" data-open="' + c.id + '"><td><div class="tn">' + D.avatar(c.collector) + '<div><b>' + esc(c.name) + '</b><small>' + esc(c.city) + '</small></div></div></td>' +
      '<td>' + D.COMPANY_LABEL[c.company] + '</td><td>' + D.CAT_SHORT[c.category] + '</td><td>' + esc(c.collector) + '</td><td class="r num">Net ' + c.creditDays + '</td>' +
      '<td class="r num">' + short(r.pending) + '</td><td class="r num ' + (r.overdue ? 'bad' : '') + '">' + short(r.overdue) + '</td>' +
      '<td>' + (r.oldest ? D.lateChip(r.oldest) : '<span class="muted">None</span>') + '</td>' +
      '<td class="r num">' + (r.podMissing ? '<span class="chip warn">' + r.podMissing + '</span>' : '<span class="muted">0</span>') + '</td>' +
      '<td>' + (last ? D.fmtDate(last.date) + ' ' + D.promiseChip(last) : '<span class="muted">Never</span>') + '</td></tr>';
  }
  D.views.customers = {
    title: function () { return 'Customers'; },
    sub: function () { return 'Every customer with dues, who owns them, and when someone last spoke to them.'; },
    reset: function () {},
    render: function () {
      var st = vs(), d = data();
      var tp = d.rows.reduce(function (s, r) { return s + r.pending; }, 0), to = d.rows.reduce(function (s, r) { return s + r.overdue; }, 0);
      return '<section class="card page-card" aria-labelledby="h-c"><div class="card-h"><h2 id="h-c">' + icon('users') + 'All customers</h2><span class="count">' + d.rows.length + '</span></div>' +
        '<div class="tools">' + D.chipRow('f', st.f, [['all', 'All'], ['overdue', 'Has overdue'], ['quiet', 'No contact in 7+ days'], ['clear', 'All clear']], d.cnt) + D.searchBox(st, 'Name, city or contact') + '</div>' +
        '<div class="tbl-wrap"><table class="dt wide"><thead><tr>' + D.th('customers', 'name', 'Customer') + '<th>Company</th><th>Type</th>' + D.th('customers', 'collector', 'Collector') +
        '<th class="r">Credit</th>' + D.th('customers', 'pending', 'Pending', 'r') + D.th('customers', 'overdue', 'Overdue', 'r') + D.th('customers', 'oldest', 'Oldest') + D.th('customers', 'copies', 'Copies missing', 'r') + D.th('customers', 'last', 'Last follow-up') +
        '</tr></thead><tbody>' + (d.rows.length ? d.rows.map(row).join('') : '<tr><td colspan="10" class="empty">No customers match.</td></tr>') +
        '</tbody><tfoot><tr><td colspan="5">Total, ' + d.rows.length + ' customers</td><td class="r num">' + short(tp) + '</td><td class="r num">' + short(to) + '</td><td colspan="3"></td></tr></tfoot></table></div></section>';
    },
    click: function (t) {
      var f = t.closest('[data-f]'); if (f) { vs().f = f.getAttribute('data-f'); D.render(); }
    }
  };
})();
