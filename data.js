/* ============================================================
   SAMPLE DATA for the DCC Collection CRM dashboard.
   Everything here is invented and generated relative to today's
   date, so overdue days always make sense. Replace this file with
   a Supabase loader that returns the same shape:
     { today, customers, invoices, payments, followups, targets }
   ============================================================ */
(function () {
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var rnd = mulberry32(2610);
  var pick = function (a) { return a[Math.floor(rnd() * a.length)]; };
  var between = function (a, b) { return a + rnd() * (b - a); };
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var addDays = function (d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; };

  // name, company, category, collector, credit days, city
  var RAW = [
    ['Zomato Hyperpure', 'Okhla', 'E-commerce', 'Abhay', 30, 'Ghevra'],
    ['Kiranakart', 'Okhla', 'Modern Trade', 'Abhay', 45, 'Gautam Budh Nagar'],
    ['Nature Basket', 'Okhla', 'Modern Trade', 'Abhay', 45, 'Defence Colony'],
    ['LOTS Wholesale', 'Okhla', 'Modern Trade', 'Abhay', 45, 'Akshardham'],
    ['INCS Traders', 'Okhla', 'General Trade', 'Supriya', 21, 'Lajpat Nagar'],
    ['Pick N Choose', 'Okhla', 'General Trade', 'Supriya', 30, 'Vasant Kunj'],
    ['Dragon Supermart', 'Okhla', 'General Trade', 'Supriya', 30, 'Saket'],
    ['Rajan Store', 'Okhla', 'General Trade', 'Supriya', 15, 'CR Park'],
    ['Big Bite Foods', 'Okhla', 'General Trade', 'Supriya', 15, 'Alaknanda'],
    ['Alaknanda Mart', 'Okhla', 'General Trade', 'Supriya', 21, 'Alaknanda'],
    ['Huelip Retail', 'Okhla', 'General Trade', 'Supriya', 21, 'Kalkaji'],
    ['Airport Services Kiosk', 'Okhla', 'General Trade', 'Supriya', 30, 'Mahipalpur'],
    ['Zomato Hyperpure Gurgaon', 'Gurgaon', 'E-commerce', 'Abhay', 30, 'Sector 37'],
    ['Big Bazaar Food Hall', 'Gurgaon', 'Modern Trade', 'Abhay', 45, 'Sector 29'],
    ['Kiranakart Gurgaon', 'Gurgaon', 'Modern Trade', 'Abhay', 45, 'Farukhnagar'],
    ['Nature Basket Gurgaon', 'Gurgaon', 'Modern Trade', 'Abhay', 45, 'DLF Phase 4'],
    ['Sheraton Hospitality', 'Gurgaon', 'General Trade', 'Supriya', 30, 'Sector 54'],
    ['Hearty Hub Pvt Ltd', 'Gurgaon', 'General Trade', 'Supriya', 30, 'Sector 49'],
    ['Snapstop Retail Pvt Ltd', 'Gurgaon', 'General Trade', 'Supriya', 21, 'Sohna Road'],
    ['Bhai Ji Foods', 'Gurgaon', 'General Trade', 'Supriya', 15, 'Sector 14'],
    ['New Modern Bazar', 'Gurgaon', 'General Trade', 'Supriya', 21, 'Sector 47'],
    ['Honey Money Top', 'Gurgaon', 'General Trade', 'Supriya', 15, 'Sector 63'],
    ['Sector 47 Fresh', 'Gurgaon', 'General Trade', 'Supriya', 21, 'Sector 47'],
    ['Farukhnagar Mart', 'Gurgaon', 'General Trade', 'Supriya', 15, 'Farukhnagar']
  ];
  var FIRST = ['Rakesh', 'Meena', 'Sanjay', 'Pooja', 'Imran', 'Deepak', 'Kavita', 'Naveen', 'Suresh', 'Anita'];
  var LAST = ['Verma', 'Gupta', 'Khanna', 'Sharma', 'Mehra', 'Arora', 'Bansal', 'Chopra'];

  var customers = RAW.map(function (r, i) {
    return {
      id: 'c' + (i + 1), name: r[0], company: r[1], category: r[2], collector: r[3],
      creditDays: r[4], city: r[5],
      contact: pick(FIRST) + ' ' + pick(LAST),
      phone: '98' + String(Math.floor(rnd() * 1e8)).padStart(8, '0')
    };
  });

  var usedNo = {};
  function invNo(company) {
    var n, s;
    do {
      n = company === 'Okhla' ? 2400 + Math.floor(rnd() * 1900) : 900 + Math.floor(rnd() * 1100);
      s = (company === 'Okhla' ? 'DOC/26-27/' : 'HR/26-27/') + n;
    } while (usedNo[s]);
    usedNo[s] = 1;
    return s;
  }

  var invoices = [];
  customers.forEach(function (c) {
    var n = c.category === 'General Trade' ? 4 + Math.floor(rnd() * 5) : 3 + Math.floor(rnd() * 4);
    for (var i = 0; i < n; i++) {
      var age = Math.floor(Math.pow(rnd(), 1.35) * 118) + 1;
      var date = addDays(today, -age);
      var amount = c.category === 'General Trade' ? between(12000, 70000)
        : c.category === 'Modern Trade' ? between(90000, 320000) : between(120000, 420000);
      amount = Math.round(amount / 10) * 10;
      var pending = rnd() < 0.12 ? Math.round(amount * between(0.3, 0.7) / 10) * 10 : amount;
      var missP = (c.company === 'Gurgaon' ? 0.15 : 0.08) * (c.category === 'General Trade' ? 1.2 : 0.7);
      var pod = age <= 2 ? 'transit' : (rnd() < missP ? 'missing' : 'ready');
      var grn = c.category === 'Modern Trade' ? (age >= 3 && rnd() < 0.25 ? 'pending' : 'received') : 'na';
      var po = c.category === 'General Trade' ? null : String(Math.floor(between(1000000, 9999999)));
      invoices.push({
        id: 'i' + invoices.length, cid: c.id, no: invNo(c.company),
        date: date, due: addDays(date, c.creditDays),
        amount: amount, pending: pending, pod: pod, grn: grn, po: po
      });
    }
  });

  // Follow-ups: customers with overdue invoices get a recent note and a promise date.
  var NOTES = [
    'Accounts says payment is in process, will release this week.',
    'Asked for the stamped receiving copy on WhatsApp.',
    'Cheque is ready, collection visit fixed.',
    'Short receipt on 2 cartons, credit note pending.',
    'Waiting for GRN before releasing payment.',
    'Contact not reachable, tried twice.',
    'Promised NEFT after month-end reconciliation.',
    'Disputes rate difference, rate card sent.'
  ];
  var PROMISE_CYCLE = [-4, 0, 2, -1, 0, 1, 3, 0, -2, 5];
  var followups = [];
  var cyc = 0;
  customers.forEach(function (c) {
    var hasOverdue = invoices.some(function (v) { return v.cid === c.id && v.due < today; });
    if (!hasOverdue && rnd() < 0.6) return;
    var count = 1 + Math.floor(rnd() * 3);
    for (var k = count; k >= 1; k--) {
      var daysAgo = k * 4 + Math.floor(rnd() * 3);
      var latest = (k === 1);
      var promise = null;
      if (latest && hasOverdue) { promise = addDays(today, PROMISE_CYCLE[cyc++ % PROMISE_CYCLE.length]); }
      followups.push({
        cid: c.id, date: addDays(today, -daysAgo), by: c.collector,
        note: pick(NOTES), promise: promise
      });
    }
  });

  // Payments received in the last 8 weeks, scaled to a believable share of target.
  var targets = { Supriya: 500000, Abhay: 700000 };
  var payments = [];
  customers.forEach(function (c) {
    var base = c.category === 'General Trade' ? 40000 : c.category === 'Modern Trade' ? 180000 : 260000;
    for (var w = 0; w < 8; w++) {
      if (rnd() < (c.category === 'General Trade' ? 0.55 : 0.5)) {
        var ago = w * 7 + Math.floor(rnd() * 7);
        payments.push({ cid: c.id, date: addDays(today, -ago), amount: between(0.3, 1.0) * base, weeksAgo: w });
      }
    }
  });
  ['Supriya', 'Abhay'].forEach(function (name) {
    var mine = payments.filter(function (p) {
      return customers.filter(function (c) { return c.id === p.cid; })[0].collector === name;
    });
    var raw = mine.reduce(function (s, p) { return s + p.amount; }, 0);
    var k = (targets[name] * 8 * 0.9) / raw;
    mine.forEach(function (p) { p.amount = Math.round(p.amount * k / 10) * 10; });
  });

  window.SAMPLE = {
    today: today, customers: customers, invoices: invoices, payments: payments,
    followups: followups, targets: targets
  };
})();
