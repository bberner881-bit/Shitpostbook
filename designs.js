/* The 40 designs of the web edition + the composer that turns a slogan into a page.
   A page is 850 x 1100 units (8.5 x 11). compose(design, measure) returns a flat list of items
   in draw order; fillable items carry an index `i` so the app can store fills per design. */
(function () {
  const W = 850, H = 1100;
  const FRAME = { x: 40, y: 40, w: 770, h: 1020, rx: 18 };
  const INNER = { x: FRAME.x + 4, y: FRAME.y + 4, w: FRAME.w - 8, h: FRAME.h - 8 };

  const MOODS = {
    1: { name: 'Gentle eye-roll', blurb: 'Rude enough to smirk at. Safe for the fridge.', color: '#a7f3d0' },
    2: { name: 'Mild sarcasm', blurb: 'A swear or two, said with love.', color: '#fde68a' },
    3: { name: 'Properly annoyed', blurb: 'The day earned it. Colour hard.', color: '#fdba74' },
    4: { name: 'Full meltdown', blurb: 'Big outlines for big feelings.', color: '#fb7185' },
    5: { name: 'The nuclear option', blurb: 'Nothing left to give. Press firmly.', color: '#c084fc' },
  };

  // Which doodles live with which vibe. big = main scatter, small = gap filler.
  const THEMES = {
    garden:   { big: ['daisy', 'flower5', 'mushroom', 'leaf', 'tulip', 'rose', 'fourLeaf'], small: ['dot', 'dotRing', 'sparkle4', 'leaf', 'teardrop', 'spiral'] },
    mushroom: { big: ['mushroom', 'toadstool', 'fern', 'leaf', 'snail', 'dotRing'], small: ['dot', 'dotRing', 'spiral', 'leaf', 'sparkle4'] },
    skull:    { big: ['skull', 'bone', 'heart', 'brokenHeart', 'bolt', 'flame', 'eye'], small: ['star', 'sparkle4', 'dot', 'dotRing', 'zigzag'] },
    checker:  { big: ['star', 'bolt', 'diamond', 'heart', 'sparkle', 'eye', 'pill'], small: ['dot', 'sparkle4', 'zigzag', 'dotRing'] },
    lake:     { big: ['pine', 'mountain', 'fish', 'canoe', 'wave', 'cloud', 'moon', 'sun'], small: ['star', 'dot', 'wave', 'drop', 'sparkle4'] },
    river:    { big: ['wave', 'fish', 'canoe', 'drop', 'cloud', 'leaf', 'pine'], small: ['drop', 'dot', 'squiggle', 'dotRing', 'wave'] },
    sloth:    { big: ['sloth', 'leaf', 'monstera', 'fern', 'zzz', 'moon', 'coffee'], small: ['dot', 'leaf', 'zzz', 'sparkle4', 'star'] },
    cosmic:   { big: ['star', 'moon', 'planet', 'sparkle', 'bolt', 'bomb', 'eye'], small: ['sparkle4', 'dot', 'star', 'dotRing'] },
    tropical: { big: ['monstera', 'fern', 'flower5', 'lotus', 'butterfly', 'bee', 'sun'], small: ['leaf', 'dot', 'sparkle4', 'spiral', 'dotRing'] },
    bakery:   { big: ['cupcake', 'donut', 'heart', 'sparkle', 'flower5', 'star'], small: ['dot', 'dotRing', 'sparkle4', 'heart', 'squiggle'] },
    desert:   { big: ['cactus', 'sun', 'mountain', 'skull', 'diamond', 'snail'], small: ['dot', 'sparkle4', 'zigzag', 'star', 'dotRing'] },
    boozy:    { big: ['wine', 'beer', 'pizza', 'coffee', 'heart', 'pill', 'donut'], small: ['dot', 'dotRing', 'sparkle4', 'squiggle', 'star'] },
    storm:    { big: ['cloud', 'bolt', 'drop', 'flame', 'bomb', 'moon', 'skull'], small: ['drop', 'dot', 'zigzag', 'sparkle4', 'star'] },
    yoga:     { big: ['lotus', 'leaf', 'sun', 'moon', 'eye', 'spiral', 'daisy'], small: ['dot', 'dotRing', 'sparkle4', 'teardrop', 'spiral'] },
    rude:     { big: ['middleFinger', 'flame', 'bolt', 'skull', 'heart', 'eye', 'bomb'], small: ['star', 'dot', 'sparkle4', 'zigzag', 'dotRing'] },
    paisley:  { big: ['paisley', 'teardrop', 'daisy', 'eye', 'rose', 'lotus'], small: ['dot', 'dotRing', 'spiral', 'sparkle4', 'teardrop'] },
    bugs:     { big: ['butterfly', 'bee', 'snail', 'daisy', 'flower5', 'mushroom', 'leaf'], small: ['dot', 'leaf', 'sparkle4', 'dotRing', 'spiral'] },
  };
  // Motifs that should stay roughly upright
  const UPRIGHT = new Set(['mushroom', 'toadstool', 'skull', 'cupcake', 'cactus', 'pine', 'wine', 'coffee', 'beer', 'sloth', 'canoe', 'mountain',
    'moon', 'middleFinger', 'bomb', 'flame', 'zzz', 'pizza', 'tulip', 'lotus', 'snail', 'bee', 'butterfly', 'drop', 'fish', 'cloud', 'donut', 'planet', 'eye', 'fern', 'rose']);

  // The Filthy Lineup, web edition. New shelf, new insults.
  // t: lines split by |, f: font, th: theme, m: mood 1-5, bg: background, b: letter bounce 0-1.5
  const D = [
    ['NOT TODAY,|FUCKERS', 'Luckiest Guy', 'garden', 3, 'rays'],
    ['FRESH OUT|OF FUCKS', 'Titan One', 'mushroom', 3, 'none'],
    ['BLESS YOUR|DUMB HEART', 'Chewy', 'garden', 1, 'rings'],
    ['WELL,|SHIT.', 'Bangers', 'storm', 1, 'none', 0.6],
    ["FUCK THIS,|I'M NAPPING", 'Lilita One', 'sloth', 2, 'bubbles'],
    ['NOPE.|NOT HAPPENING.', 'Bungee', 'checker', 1, 'checker', 0.4],
    ['EAT A BAG|OF DICKS', 'Alfa Slab One', 'rude', 4, 'rays'],
    ['SHITSTORM|SURVIVOR', 'Titan One', 'storm', 3, 'stripes'],
    ['GO FUCK|A CACTUS', 'Luckiest Guy', 'desert', 4, 'rays'],
    ["WORLD'S|OKAYEST|HUMAN", 'Lilita One', 'cosmic', 1, 'rings'],
    ['LATE AND|UNBOTHERED', 'Chewy', 'sloth', 1, 'none'],
    ['OH, FUCK|RIGHT OFF', 'Bangers', 'paisley', 3, 'rays'],
    ['DUMPSTER FIRE|DELUXE', 'Alfa Slab One', 'storm', 3, 'stripes'],
    ['ASSCLOWN|SEASON', 'Bungee', 'checker', 3, 'checker', 0.4],
    ['FUCKITY|BYE', 'Luckiest Guy', 'garden', 2, 'bubbles'],
    ['DOUCHE|CANOE', 'Titan One', 'river', 2, 'none'],
    ['UP SHIT CREEK,|NO PADDLE', 'Lilita One', 'river', 2, 'stripes'],
    ['GONE|FUCKING|FISHING', 'Alfa Slab One', 'lake', 2, 'rings'],
    ['SLOW DOWN,|ASSHOLE', 'Chewy', 'sloth', 2, 'none'],
    ['TWAT|WAFFLE', 'Luckiest Guy', 'bakery', 3, 'rays'],
    ["FUCKIN'|FABULOUS", 'Titan One', 'tropical', 2, 'bubbles'],
    ['HOT MESS|EXPRESS', 'Bangers', 'boozy', 1, 'stripes'],
    ['COCK|WOMBLE', 'Lilita One', 'bugs', 3, 'none'],
    ['THUNDER|CUNT', 'Alfa Slab One', 'storm', 5, 'rays'],
    ['ABSOLUTE|FUCKING|UNIT', 'Bungee', 'checker', 3, 'checker', 0.4],
    ['FUCK|EVERYONE|TODAY', 'Luckiest Guy', 'skull', 5, 'rays'],
    ['SHIT|HAPPENS', 'Chewy', 'mushroom', 1, 'bubbles'],
    ['WINE NOT,|BITCH', 'Titan One', 'boozy', 2, 'rings'],
    ['FUCK|NUGGET', 'Lilita One', 'bakery', 3, 'none'],
    ['CRUSTY|FUCK TRUMPET', 'Bangers', 'rude', 4, 'stripes'],
    ['SWEET MOTHER|OF FUCK', 'Alfa Slab One', 'paisley', 3, 'rays'],
    ['BITCH,|PLEASE', 'Luckiest Guy', 'tropical', 1, 'bubbles'],
    ['MONDAY CAN|SUCK IT', 'Titan One', 'boozy', 2, 'checker', 0.5],
    ['PROFESSIONAL|SHIT|DISTURBER', 'Bungee', 'skull', 3, 'none', 0.4],
    ['NAMASTE|THE FUCK|AWAY', 'Chewy', 'yoga', 2, 'rings'],
    ["FUCK IT,|I'M BLOOMING", 'Lilita One', 'garden', 2, 'rays'],
    ['SHITFACED|AND THRIVING', 'Bangers', 'boozy', 3, 'bubbles'],
    ["KARMA'S A BITCH|AND SO AM I", 'Alfa Slab One', 'cosmic', 2, 'stripes'],
    ['DIE MAD|ABOUT IT', 'Luckiest Guy', 'skull', 4, 'checker', 0.6],
    ['FUCK|EVERYTHING', 'Titan One', 'cosmic', 5, 'rays'],
  ];
  const DESIGNS = D.map((d, i) => ({
    id: i + 1, t: d[0], f: d[1], th: d[2], m: d[3], bg: d[4], b: d[5] == null ? 1 : d[5],
    name: d[0].replace(/\|/g, ' '), seed: 1000 + i * 7919,
  }));
  const FONTS = [...new Set(DESIGNS.map(d => d.f))];

  // ------------------------------------------------------------------ helpers
  const f1 = (n) => Math.round(n * 10) / 10;
  function shuffle(arr, rng) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function circleHitsRect(cx, cy, r, R) {
    const nx = Math.max(R.x, Math.min(cx, R.x + R.w)), ny = Math.max(R.y, Math.min(cy, R.y + R.h));
    const dx = cx - nx, dy = cy - ny; return dx * dx + dy * dy < r * r;
  }
  function polygon(pts) { return 'M' + pts.map(p => f1(p[0]) + ',' + f1(p[1])).join('L') + 'Z'; }

  // ------------------------------------------------------------------ compose
  // measure(ch, font) -> { w, asc } at font-size 100
  function compose(design, measure) {
    const rng = window.motifRng(design.seed);
    const items = []; let ri = 0;
    const region = (shape, t, df) => { const it = { s: shape, t, i: ri++, df: df || '#ffffff' }; items.push(it); return it; };
    const decor = (shape, t, df) => { items.push({ s: shape, t, df: df || null }); };

    // 1. the paper inside the frame (fillable, so the whole background can be coloured)
    region({ k: 'rect', x: FRAME.x, y: FRAME.y, w: FRAME.w, h: FRAME.h, rx: FRAME.rx, sw: 1.7, fill: true });

    // 2. letters first so we know what to avoid
    const lines = design.t.split('|');
    const AW = 640, TRACK = 5;
    const metr = lines.map(line => {
      const chars = [...line];
      const ws = chars.map(ch => ch === ' ' ? 28 : measure(ch, design.f).w);
      const w100 = ws.reduce((a, b) => a + b, 0) + TRACK * (chars.length - 1);
      return { chars, ws, w100, asc: measure('H', design.f).asc };
    });
    let sizes = metr.map(m => Math.max(64, Math.min(240, AW * 100 / m.w100)));
    // keep neighbouring lines from being wildly different, then fit the block height
    if (sizes.length > 1) {
      const maxS = Math.max(...sizes), minS = Math.min(...sizes);
      if (maxS > minS * 1.9) sizes = sizes.map(s => Math.min(s, minS * 1.9));
    }
    const gap = 0.16;
    let blockH = sizes.reduce((a, s) => a + s * (1 + gap), 0) - sizes[sizes.length - 1] * gap;
    const maxBlock = 720;
    if (blockH > maxBlock) { const k = maxBlock / blockH; sizes = sizes.map(s => s * k); blockH = maxBlock; }
    const cy = H * 0.5;
    let y = cy - blockH / 2;
    const avoid = [];
    const letters = [];
    metr.forEach((m, li) => {
      const size = sizes[li], k = size / 100;
      const asc = m.asc * k;
      const lineW = m.w100 * k;
      let x = (W - lineW) / 2;
      const baseline = y + asc;
      m.chars.forEach((ch, ci) => {
        const w = m.ws[ci] * k;
        if (ch !== ' ') {
          const rot = (rng() * 2 - 1) * 7 * design.b;
          const dy = (rng() * 2 - 1) * size * 0.035 * design.b;
          letters.push({ k: 'text', ch, x: f1(x), y: f1(baseline + dy), size: f1(size), font: design.f, rot: f1(rot), w: f1(w), fill: true, sw: 1 });
        }
        x += w + TRACK * k;
      });
      avoid.push({ x: (W - lineW) / 2 - 16, y: y - 16, w: lineW + 32, h: asc + size * 0.12 + 28 });
      y += size * (1 + gap);
    });
    const block = { x: Math.min(...avoid.map(a => a.x)), y: avoid[0].y, w: 0, h: 0 };
    block.w = Math.max(...avoid.map(a => a.x + a.w)) - block.x; block.h = (avoid[avoid.length - 1].y + avoid[avoid.length - 1].h) - block.y;
    const bcx = block.x + block.w / 2, bcy = block.y + block.h / 2;

    // 3. background pattern, clipped to the frame
    const clip = { k: 'clip', x: INNER.x, y: INNER.y, w: INNER.w, h: INNER.h, rx: FRAME.rx - 3 };
    let scatterArea = { x: INNER.x + 18, y: INNER.y + 18, w: INNER.w - 36, h: INNER.h - 36 };
    if (design.bg === 'rays') {
      const n = 20, R = 1500, a0 = rng() * Math.PI;
      for (let i = 0; i < n; i++) {
        const a1 = a0 + i * 2 * Math.PI / n, a2 = a0 + (i + 1) * 2 * Math.PI / n;
        region({ k: 'path', fill: true, sw: 0.9, clip, d: polygon([[bcx, bcy], [bcx + Math.cos(a1) * R, bcy + Math.sin(a1) * R], [bcx + Math.cos(a2) * R, bcy + Math.sin(a2) * R]]) }, null, i % 2 ? '#ffffff' : '#f3f3f3');
      }
    } else if (design.bg === 'stripes') {
      const bw = 78, n = Math.ceil((W + H) / bw) + 2, off = rng() * bw;
      for (let i = -1; i < n; i++) {
        const x0 = i * bw - H + off;
        region({ k: 'path', fill: true, sw: 0.9, clip, d: polygon([[x0, H + 50], [x0 + H + 50, -50], [x0 + H + 50 + bw, -50], [x0 + bw, H + 50]]) }, null, i % 2 ? '#ffffff' : '#f3f3f3');
      }
    } else if (design.bg === 'checker') {
      const tile = 46, cols = Math.floor(INNER.w / tile), rows = Math.floor(INNER.h / tile);
      const tw = INNER.w / cols, th = INNER.h / rows;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        if (r > 0 && r < rows - 1 && c > 0 && c < cols - 1) continue; // only the outer ring
        region({ k: 'rect', x: f1(INNER.x + c * tw), y: f1(INNER.y + r * th), w: f1(tw), h: f1(th), rx: 0, fill: true, sw: 0.8 }, null, (r + c) % 2 ? '#1a1a1a' : '#ffffff');
      }
      scatterArea = { x: INNER.x + tw + 14, y: INNER.y + th + 14, w: INNER.w - 2 * tw - 28, h: INNER.h - 2 * th - 28 };
    } else if (design.bg === 'rings') {
      const r0 = Math.max(block.w, block.h) * 0.42 + 40;
      for (let r = r0; r < 1300; r += 58) decor({ k: 'circle', cx: bcx, cy: bcy, r, fill: false, sw: 0.8, clip });
    } else if (design.bg === 'bubbles') {
      for (let i = 0; i < 16; i++) {
        const r = 40 + rng() * 110;
        decor({ k: 'circle', cx: f1(INNER.x + rng() * INNER.w), cy: f1(INNER.y + rng() * INNER.h), r: f1(r), fill: false, sw: 0.8, clip });
      }
    }

    // 4. scatter the doodles around the words
    const theme = THEMES[design.th] || THEMES.garden;
    const placed = [];
    const tiers = [
      { names: theme.big, smin: 0.95, smax: 1.35, max: 14, tries: 500 },
      { names: theme.big, smin: 0.55, smax: 0.8, max: 24, tries: 900 },
      { names: theme.small, smin: 0.24, smax: 0.42, max: 64, tries: 1600 },
    ];
    const placedMotifs = [];
    tiers.forEach((tier, ti) => {
      let order = shuffle(tier.names, rng), oi = 0, count = 0;
      for (let t = 0; t < tier.tries && count < tier.max; t++) {
        const name = oi < order.length ? order[oi] : order[Math.floor(rng() * order.length)];
        const motif = window.MOTIFS.make(name, rng);
        const s = tier.smin + rng() * (tier.smax - tier.smin);
        const r = motif.R * s;
        const x = scatterArea.x + r * 0.6 + rng() * (scatterArea.w - r * 1.2);
        const y = scatterArea.y + r * 0.6 + rng() * (scatterArea.h - r * 1.2);
        if (avoid.some(a => circleHitsRect(x, y, r * 0.86, a))) continue;
        if (placed.some(p => { const dx = p.x - x, dy = p.y - y; return Math.sqrt(dx * dx + dy * dy) < (p.r + r) * 0.9; })) continue;
        const rot = UPRIGHT.has(name) ? (rng() * 2 - 1) * 16 : rng() * 360;
        placed.push({ x, y, r });
        placedMotifs.push({ motif, t: { x: f1(x), y: f1(y), s: f1(s * 100) / 100, rot: f1(rot) }, tier: ti });
        oi++; count++;
      }
    });
    // big first so the small ones sit on top of any overlap
    placedMotifs.sort((a, b) => a.tier - b.tier);
    placedMotifs.forEach(pm => pm.motif.shapes.forEach(sh => {
      if (sh.fill) region(Object.assign({}, sh, { clip }), pm.t); else decor(Object.assign({}, sh, { clip }), pm.t);
    }));
    // tiny ink dots in the gaps
    let dots = 0;
    for (let t = 0; t < 1500 && dots < 70; t++) {
      const r = 3 + rng() * 4;
      const x = scatterArea.x + rng() * scatterArea.w, y = scatterArea.y + rng() * scatterArea.h;
      if (avoid.some(a => circleHitsRect(x, y, r + 6, a))) continue;
      if (placed.some(p => { const dx = p.x - x, dy = p.y - y; return Math.sqrt(dx * dx + dy * dy) < p.r + r + 8; })) continue;
      decor({ k: 'circle', cx: f1(x), cy: f1(y), r: f1(r), fill: false, ink: true }, null, '#1a1a1a');
      placed.push({ x, y, r });
      dots++;
    }

    // 5. letters on top
    letters.forEach(l => region(l, null));

    return { W, H, frame: FRAME, items, regions: ri, block };
  }

  window.DESIGNS = DESIGNS;
  window.MOODS = MOODS;
  window.DESIGN_FONTS = FONTS;
  window.composeDesign = compose;
  window.PAGE = { W, H, FRAME };
})();
