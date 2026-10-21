/* Follow-ups view: promises, quiet customers and the full call log */
(function () {
  'use strict';
  var D = window.DCC, esc = D.esc, icon = D.icon, short = D.short, days = D.days, TODAY = D.TODAY;
  function vs() { return D.vs('followups', { tab: 'promises', q: '' }); }
  function build() {
    var st = vs(), q = (st.q || '').trim().toLowerCase(), rs = D.rollups();
    var promises = rs.filter(function (r) { return r.last && r.last.promise && r.overdue > 0; })
      .sort(function (a, b) { return a.last.promise - b.last.promise; });
    var quiet = rs.filter(function (r) { return r.overdue > 0 && (!r.last || days(r.last.date, TODAY) > 7); })
      .sort(function (a, b) { return b.overdue - a.overdue; });
    var ids = {}; D.scopedCustomers().forEach(function (c) { ids[c.id] = 1; });
    var log = D.S.followups.filter(function (f) { return ids[f.cid]; }).sort(function (a, b) { return b.date - a.date; });
    var match = function (name) { return !q || name.toLowerCase().indexOf(q) >= 0; };
    return {
      promises: promises.filter(function (r) { return match(r.c.name); }),
      quiet: quiet.filter(function (r) { return match(r.c.name); }),
      log: log.filter(function (f) { return match(D.custById[f.cid].name + ' ' + f.note); }),
      cnt: { promises: promises.length, quiet: quiet.length, log: log.length }
    };
  }
  function promiseItem(r) {
    var f = r.last;
    return '<button type="button" class="fu-item" data-open="' + r.c.id + '">' + D.avatar(r.c.collector) + '<div style="min-width:0"><div class="t">' + esc(r.c.name) + '</div><div class="s">' + esc(f.note) + '</div></div>' +
      '<div class="r">' + D.promiseChip(f) + '<span class="amt-s num">' + D.fmtDate(f.promise) + ' · ' + short(r.overdue) + ' overdue</span></div></button>';
  }
  function quietItem(r) {
    var txt = r.last ? 'Last spoke ' + days(r.last.date, TODAY) + ' d ago: ' + esc(r.last.note) : 'Nobody has logged a call yet.';
    return '<button type="button" class="fu-item" data-open="' + r.c.id + '">' + D.avatar(r.c.collector) + '<div style="min-width:0"><div class="t">' + esc(r.c.name) + '</div><div class="s">' + txt + '</div></div>' +
      '<div class="r">' + D.lateChip(r.oldest) + '<span class="amt-s num">' + short(r.overdue) + ' overdue</span></div></button>';
  }
  function logItem(f) {
    var c = D.custById[f.cid];
    return '<button type="button" class="fu-item" data-open="' + c.id + '">' + D.avatar(f.by) + '<div style="min-width:0"><div class="t">' + esc(c.name) + '</div><div class="s">' + esc(f.note) + '</div></div>' +
      '<div class="r"><span class="amt-s">' + D.fmtDateY(f.date) + '</span>' + (f.promise ? '<span class="chip info">Promise ' + D.fmtDate(f.promise) + '</span>' : '') + '</div></button>';
  }
  D.views.followups = {
    title: function () { return 'Follow-ups'; },
    sub: function () { return 'Who promised to pay, who has gone quiet, and everything that was logged.'; },
    reset: function () {},
    render: function () {
      var st = vs(), d = build();
      var tabs = [['promises', 'Promises to pay'], ['quiet', 'Gone quiet'], ['log', 'Call log']];
      var list = st.tab === 'promises' ? d.promises.map(promiseItem) : st.tab === 'quiet' ? d.quiet.map(quietItem) : d.log.slice(0, 40).map(logItem);
      var missed = d.promises.filter(function (r) { return days(TODAY, r.last.promise) < 0; }).length;
      var today = d.promises.filter(function (r) { return days(TODAY, r.last.promise) === 0; }).length;
      var hint = { promises: 'Oldest promise first. Missed ones are at the top.', quiet: 'Overdue customers nobody has called in more than 7 days.', log: 'Newest first. Open a customer to log a new call.' }[st.tab];
      return '<div class="kpis k4"><div class="kpi"><div class="kpi-h"><span class="kpi-ic bad">' + icon('alert') + '</span><span class="kpi-l">Missed promises</span></div><div class="kpi-v num bad">' + missed + '</div><div class="kpi-s">Promised date already gone</div></div>' +
        '<div class="kpi"><div class="kpi-h"><span class="kpi-ic warn">' + icon('calendar') + '</span><span class="kpi-l">Due today</span></div><div class="kpi-v num">' + today + '</div><div class="kpi-s">Confirm payment today</div></div>' +
        '<div class="kpi"><div class="kpi-h"><span class="kpi-ic info">' + icon('clock') + '</span><span class="kpi-l">Gone quiet</span></div><div class="kpi-v num">' + d.cnt.quiet + '</div><div class="kpi-s">Overdue, no call in 7+ days</div></div>' +
        '<div class="kpi"><div class="kpi-h"><span class="kpi-ic brand">' + icon('phone') + '</span><span class="kpi-l">Calls logged</span></div><div class="kpi-v num">' + d.cnt.log + '</div><div class="kpi-s">All time, in this view</div></div></div>' +
        '<section class="card page-card" aria-labelledby="h-f"><div class="card-h"><h2 id="h-f">' + icon('phone') + 'Follow-up board</h2></div>' +
        '<div class="tools">' + D.chipRow('tab', st.tab, tabs, d.cnt) + D.searchBox(st, 'Customer or note') + '</div><p class="hint">' + hint + '</p>' +
        '<div class="fu">' + (list.length ? list.join('') : '<div class="empty">Nothing here.</div>') + '</div></section>';
    },
    click: function (t) { var tab = t.closest('[data-tab]'); if (tab) { vs().tab = tab.getAttribute('data-tab'); D.render(); } }
  };
})();
