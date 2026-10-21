/* Falling snow over the page and a twinkling tree in the sidebar.
   Adapted from the DISPATCH project's snowfall.js: same bokeh flakes,
   crystal flakes, layered pine tree and coloured lights. Changes: the tree
   stands in the sidebar so it never covers data, snow turns blue-grey on
   light pages so it shows, and it holds still for reduced-motion users. */
(function () {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:60';
  document.body.appendChild(cv);
  var ctx = cv.getContext('2d');
  var W = 0, H = 0, flakes = [];
  var tree = document.getElementById('tree');
  var tctx = tree ? tree.getContext('2d') : null;
  var lights = [], TW = 170, TH = 220;
  var LIGHT_COLORS = ['#fef08a', '#ef4444', '#3b82f6', '#10b981', '#f472b6'];

  function isDark() {
    var t = document.documentElement.getAttribute('data-theme');
    return t ? t === 'dark' : (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  }

  function Flake(initial) { this.reset(initial); }
  Flake.prototype.reset = function (initial) {
    this.x = Math.random() * W;
    this.y = initial ? Math.random() * H : -30;
    this.fg = Math.random() < 0.3;
    if (this.fg) {
      this.size = Math.random() * 7 + 9; this.vy = Math.random() * 0.7 + 0.5;
      this.op = Math.random() * 0.3 + 0.6; this.rot = Math.random() * 6.28; this.vr = (Math.random() - 0.5) * 0.015;
    } else {
      this.size = Math.random() * 8 + 5; this.vy = Math.random() * 0.5 + 0.2;
      this.op = Math.random() * 0.3 + 0.2; this.rot = 0; this.vr = 0;
    }
    this.sw = Math.random() * 0.02 + 0.005; this.amp = Math.random() * 0.5 + 0.2; this.ph = Math.random() * 6.28;
  };
  Flake.prototype.step = function () {
    this.y += this.vy; this.ph += this.sw; this.x += Math.sin(this.ph) * this.amp; this.rot += this.vr;
    if (this.y > H + 40) this.reset(false);
  };
  Flake.prototype.draw = function (rgb) {
    ctx.save(); ctx.translate(this.x, this.y);
    if (this.fg) {
      ctx.rotate(this.rot);
      ctx.strokeStyle = 'rgba(' + rgb + ',' + this.op + ')'; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, 6.283); ctx.fill();
      for (var i = 0; i < 6; i++) {
        ctx.rotate(Math.PI / 3);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, this.size);
        [0.4, 0.7].forEach(function (p, _i, _a) {
          var y = this.size * p, b = this.size * 0.35 * (1 - p * 0.3);
          ctx.moveTo(0, y); ctx.lineTo(-b, y + b * 0.8); ctx.moveTo(0, y); ctx.lineTo(b, y + b * 0.8);
        }, this);
        ctx.stroke();
      }
    } else {
      var g = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
      g.addColorStop(0, 'rgba(' + rgb + ',' + this.op + ')');
      g.addColorStop(0.45, 'rgba(' + rgb + ',' + this.op * 0.4 + ')');
      g.addColorStop(1, 'rgba(' + rgb + ',0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, this.size, 0, 6.283); ctx.fill();
    }
    ctx.restore();
  };

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = Math.round(Math.min(60, Math.max(22, W / 24)));
    while (flakes.length < n) flakes.push(new Flake(true));
    flakes.length = n;
    if (tree) {
      TW = tree.clientWidth || 170; TH = tree.clientHeight || 220;
      tree.width = TW * dpr; tree.height = TH * dpr; tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initLights(TW, TH);
    }
  }

  function initLights(tw, th) {
    lights = [];
    var cx = tw / 2, base = th - 18, h = th - 44;
    for (var i = 0; i < 38; i++) {
      var r = Math.random() * 0.88 + 0.05;
      var maxR = (1 - Math.pow(r, 0.85)) * (tw * 0.42);
      if (maxR < 4) continue;
      lights.push({
        x: cx + (Math.random() * 2 - 1) * maxR * 0.78, y: base - r * h,
        c: LIGHT_COLORS[Math.floor(Math.random() * LIGHT_COLORS.length)],
        ph: Math.random() * 6.28, sp: Math.random() * 0.04 + 0.02
      });
    }
  }

  function drawTree(tw, th) {
    tctx.clearRect(0, 0, tw, th);
    var cx = tw / 2, base = th - 18, h = th - 44;
    tctx.fillStyle = '#3a2314'; tctx.fillRect(cx - 7, base - 6, 14, 20);
    var tiers = 6;
    for (var i = tiers; i >= 1; i--) {
      var tierH = (i / tiers) * h, py = base - tierH + 16;
      var maxW = (1 - (tierH / h) * 0.8) * tw * 0.62;
      tctx.save();
      tctx.fillStyle = i % 2 === 0 ? '#065f46' : '#07714f';
      tctx.strokeStyle = '#34d399'; tctx.lineWidth = 1;
      tctx.beginPath(); tctx.moveTo(cx - maxW / 2, py);
      tctx.quadraticCurveTo(cx, py - 6, cx + maxW / 2, py);
      tctx.lineTo(cx, py - (h / tiers) * 1.45); tctx.closePath(); tctx.fill(); tctx.stroke();
      tctx.fillStyle = 'rgba(240,249,255,.8)';
      tctx.beginPath(); tctx.ellipse(cx, py - 2, maxW * 0.36, 2.6, 0, 0, 6.283); tctx.fill();
      tctx.restore();
    }
    // star
    tctx.save(); tctx.translate(cx, base - h + 6);
    tctx.fillStyle = '#fde68a'; tctx.shadowColor = '#f59e0b'; tctx.shadowBlur = 14;
    tctx.beginPath();
    for (var k = 0; k < 5; k++) {
      tctx.lineTo(Math.cos((18 + k * 72) * Math.PI / 180) * 11, -Math.sin((18 + k * 72) * Math.PI / 180) * 11);
      tctx.lineTo(Math.cos((54 + k * 72) * Math.PI / 180) * 5, -Math.sin((54 + k * 72) * Math.PI / 180) * 5);
    }
    tctx.closePath(); tctx.fill(); tctx.restore();
    lights.forEach(function (l) {
      if (!reduce) l.ph += l.sp;
      var o = (Math.sin(l.ph) + 1) / 2 * 0.75 + 0.25;
      tctx.save(); tctx.globalAlpha = o; tctx.fillStyle = l.c; tctx.shadowColor = l.c; tctx.shadowBlur = 8 * o;
      tctx.beginPath(); tctx.arc(l.x, l.y, 2.4, 0, 6.283); tctx.fill(); tctx.restore();
    });
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);
    var rgb = isDark() ? '255,255,255' : '104,138,178';
    for (var i = 0; i < flakes.length; i++) { if (!reduce) flakes[i].step(); flakes[i].draw(rgb); }
    if (tctx && tree.clientWidth) drawTree(TW, TH);
    if (!reduce) requestAnimationFrame(frame);
  }

  window.addEventListener('resize', function () { resize(); if (reduce) frame(); });
  resize();
  frame();
})();
