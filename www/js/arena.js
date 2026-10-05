// Arena layout (all numbers are canvas pixels)
const ARENA = {
  W: 480,
  H: 640,
  centerX: 240,
  riverTop: 305,
  riverBottom: 335,
  lanes: [110, 370],    // x of the two lanes and bridges
  bridgeHalf: 14,       // how far from the lane center units can walk on a bridge
  kingY: 88,            // enemy barn; the player's is mirrored (H - kingY)
  siloY: 140,           // enemy silos; the player's are mirrored (H - siloY)
  playerZoneTop: 345,   // the player can drop cards below this line
};

// ---------- Theme colors ----------

// The two grass greens of each arena (very close, so the checker stays soft)
const FARM_GRASS = ['#88c85a', '#8dcc5f'];
const FOREST_GRASS = ['#4b8a52', '#4f8f56'];   // darker, cooler forest floor

// River colors: muddy bank, shallow water at the edges, deep water in the middle, ripple lines
const FARM_WATER = { bank: '#8a6238', shallow: '#74c6ee', deep: '#3f97d4', ripple: 'rgba(255,255,255,0.5)' };
const FOREST_WATER = { bank: '#5c4631', shallow: '#4ea3b0', deep: '#24708a', ripple: 'rgba(255,255,255,0.35)' };

// ---------- Helpers ----------

// Shared helper: start a path with an ellipse (call fill / stroke after)
function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

// Fills many circles ([x, y, r] each) as ONE shape,
// so overlapping see-through shadows don't get darker where they overlap
function fillCircles(g, circles, color) {
  g.fillStyle = color;
  g.beginPath();
  circles.forEach(([x, y, r]) => {
    g.moveTo(x + r, y);
    g.arc(x, y, r, 0, Math.PI * 2);
  });
  g.fill();
}

// Checkered grass between (x1, y1) and (x2, y2). Also used to fill the space around the arena.
// colors = [base green, checker green], e.g. FARM_GRASS or FOREST_GRASS
function drawGrass(g, x1, y1, x2, y2, colors = FARM_GRASS) {
  const tile = 20;
  g.fillStyle = colors[0];
  g.fillRect(x1, y1, x2 - x1, y2 - y1);
  g.fillStyle = colors[1];
  for (let y = Math.floor(y1 / tile) * tile; y < y2; y += tile) {
    for (let x = Math.floor(x1 / tile) * tile; x < x2; x += tile) {
      if (((x + y) / tile) % 2 === 0) g.fillRect(x, y, tile, tile);
    }
  }
}

// Makes an empty offscreen canvas the size of the arena.
// res = pixels per arena unit (higher = sharper); we can still draw in arena units.
function createArenaCanvas(res) {
  const c = document.createElement('canvas');
  c.width = Math.round(ARENA.W * res);
  c.height = Math.round(ARENA.H * res);
  c.getContext('2d').scale(res, res);
  return c;
}

// ---------- The two arenas ----------

// Draws the static farm background once into an offscreen canvas.
// Kept deliberately clean: grass, dirt paths, river, bridges, fence and two hay bales.
// res = pixels per arena unit (higher = sharper)
function buildFarmArena(res = 1) {
  const c = createArenaCanvas(res);
  const g = c.getContext('2d');

  drawGrass(g, 0, 0, ARENA.W, ARENA.H);
  drawPaths(g);
  drawRiver(g);
  drawLilyPads(g);
  ARENA.lanes.forEach(lx => drawBridge(g, lx));
  drawHayBales(g);
  drawFences(g);
  return c;
}

// Draws the static forest background. Exactly the same layout as the farm
// (paths, river, bridges, border), only the look is different.
// Calm like the farm: decorations only at the edges, the lanes stay empty.
function buildForestArena(res = 1) {
  const c = createArenaCanvas(res);
  const g = c.getContext('2d');

  drawGrass(g, 0, 0, ARENA.W, ARENA.H, FOREST_GRASS);
  drawPaths(g, '#8a6844', '#b8946a');       // packed-earth forest trail
  drawRiver(g, FOREST_WATER);
  drawStones(g);
  ARENA.lanes.forEach(lx => drawLogBridge(g, lx));
  drawMushroomCluster(g, ARENA.centerX, 294);   // where the farm has its hay bales
  drawMushroomCluster(g, ARENA.centerX, 356);
  drawHedges(g);
  drawForestCorners(g);
  return c;
}

// ---------- Ground ----------

// Dirt paths: the two lanes, the cross paths and the barn driveways
// edge = darker border color, dirt = path color (the defaults are the farm's)
function drawPaths(g, edge = '#b98f55', dirt = '#dcb97e') {
  const [l, r] = ARENA.lanes;
  const cx = ARENA.centerX;
  const H = ARENA.H;
  const silo = ARENA.siloY;
  const king = ARENA.kingY;
  const parts = [
    [l - 13, silo, 26, H - 2 * silo], [r - 13, silo, 26, H - 2 * silo],   // the two lanes
    [l, silo - 12, r - l, 24], [l, H - silo - 12, r - l, 24],             // cross paths in front of the barns
    [cx - 12, king, 24, silo - king], [cx - 12, H - silo, 24, silo - king], // barn driveways
  ];
  // Darker edge first, then the dirt on top
  g.fillStyle = edge;
  parts.forEach(([x, y, w, h]) => g.fillRect(x - 2, y - 2, w + 4, h + 4));
  g.fillStyle = dirt;
  parts.forEach(([x, y, w, h]) => g.fillRect(x, y, w, h));
}

// ---------- River ----------

// The river band across the middle. look = FARM_WATER or FOREST_WATER
function drawRiver(g, look = FARM_WATER) {
  const W = ARENA.W;
  const top = ARENA.riverTop;
  const bot = ARENA.riverBottom;

  // Muddy banks
  g.fillStyle = look.bank;
  g.fillRect(0, top - 5, W, bot - top + 10);

  // Water, darker in the middle
  const grad = g.createLinearGradient(0, top, 0, bot);
  grad.addColorStop(0, look.shallow);
  grad.addColorStop(0.5, look.deep);
  grad.addColorStop(1, look.shallow);
  g.fillStyle = grad;
  g.fillRect(0, top, W, bot - top);

  // Ripples
  g.strokeStyle = look.ripple;
  g.lineWidth = 1.5;
  for (let x = 12; x < W; x += 40) {
    g.beginPath(); g.arc(x, top + 11, 6, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
    g.beginPath(); g.arc(x + 20, top + 23, 6, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
  }
}

// Farm river: three lily pads (kept away from the bridges), one with a flower
function drawLilyPads(g) {
  [[45, 316], [262, 322], [440, 318]].forEach(([x, y], i) => drawLilyPad(g, x, y, i === 1));
}

// A small round leaf with a notch cut out
function drawLilyPad(g, x, y, flower) {
  g.fillStyle = '#4f9e3a';
  g.beginPath();
  g.moveTo(x, y);
  g.arc(x, y, 5.5, 0.35, Math.PI * 2 - 0.1);
  g.closePath();
  g.fill();
  if (flower) {
    g.fillStyle = '#ff9ec4';
    ellipse(g, x - 1, y - 1, 2, 2); g.fill();
  }
}

// Forest river: three smooth stones peeking out of the water (away from the bridges)
function drawStones(g) {
  [[42, 320], [256, 318], [444, 321]].forEach(([x, y]) => {
    g.fillStyle = 'rgba(0,0,0,0.2)';
    ellipse(g, x + 1, y + 1.5, 5.5, 3.5); g.fill();
    g.fillStyle = '#8d979a';
    ellipse(g, x, y, 5.5, 3.5); g.fill();
    g.fillStyle = '#b4bec0';
    ellipse(g, x - 1.5, y - 1.2, 2.5, 1.4); g.fill();
  });
}

// Wooden bridge across the river at lane x = lx
function drawBridge(g, lx) {
  const w = 40;
  const top = ARENA.riverTop - 10;
  const h = ARENA.riverBottom - ARENA.riverTop + 20;

  // Shadow on the water
  g.fillStyle = 'rgba(0,0,0,0.2)';
  g.fillRect(lx - w / 2 + 3, top + 3, w, h);

  // Planks
  for (let i = 0; i * 6 < h; i++) {
    g.fillStyle = i % 2 ? '#bd8750' : '#ad7743';
    g.fillRect(lx - w / 2, top + i * 6, w, 6);
  }
  g.strokeStyle = '#7a5028';
  g.lineWidth = 1;
  for (let y = top + 6; y < top + h; y += 6) {
    g.beginPath(); g.moveTo(lx - w / 2, y); g.lineTo(lx + w / 2, y); g.stroke();
  }

  // Side rails with corner posts
  g.fillStyle = '#7a4a22';
  g.fillRect(lx - w / 2 - 4, top - 2, 5, h + 4);
  g.fillRect(lx + w / 2 - 1, top - 2, 5, h + 4);
  g.fillStyle = '#5a3515';
  [[-w / 2 - 5, -4], [w / 2 - 2, -4], [-w / 2 - 5, h - 3], [w / 2 - 2, h - 3]].forEach(([ox, oy]) => {
    g.fillRect(lx + ox, top + oy, 7, 7);
  });
}

// Forest bridge at lane x = lx: round logs lying side by side, tied with two ropes.
// Same size and place as the farm bridge.
function drawLogBridge(g, lx) {
  const w = 40;
  const top = ARENA.riverTop - 10;
  const h = ARENA.riverBottom - ARENA.riverTop + 20;
  const count = 7;              // number of logs
  const logH = h / count;       // thickness of one log
  const r = logH / 2;           // radius of a log's round end

  // Shadow on the water, then a dark backing that shows as thin gaps between the logs
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.fillRect(lx - w / 2 + 3, top + 3, w, h);
  g.fillStyle = '#4f3218';
  g.fillRect(lx - w / 2, top, w, h);

  for (let i = 0; i < count; i++) {
    const y = top + r + i * logH;   // middle of this log

    // Bark, with a light stripe on top so the log looks round
    g.fillStyle = i % 2 ? '#7a4f2b' : '#6e4626';
    g.fillRect(lx - w / 2, y - r + 0.5, w, logH - 1);
    g.fillStyle = 'rgba(255,255,255,0.15)';
    g.fillRect(lx - w / 2, y - r + 1.5, w, 1.5);

    // Round cut ends on both sides: light wood with a darker center
    [lx - w / 2, lx + w / 2].forEach(ex => {
      g.fillStyle = '#d6ae78';
      g.strokeStyle = '#4f3218';
      g.lineWidth = 1;
      ellipse(g, ex, y, r - 0.5, r - 0.5); g.fill(); g.stroke();
      g.fillStyle = '#a87c4c';
      ellipse(g, ex, y, 1.2, 1.2); g.fill();
    });
  }

  // Two ropes that tie the logs together
  g.strokeStyle = '#d9c08a';
  g.lineWidth = 1.5;
  [-11, 11].forEach(ox => {
    g.beginPath(); g.moveTo(lx + ox, top); g.lineTo(lx + ox, top + h); g.stroke();
  });
}

// ---------- Farm decorations ----------

// The only farm decoration: one hay bale on each river bank, in the middle
function drawHayBales(g) {
  drawHayBale(g, ARENA.centerX, 290);
  drawHayBale(g, ARENA.centerX, 352);
}

// A single square hay bale with a soft shadow and two binding strings
function drawHayBale(g, x, y) {
  g.fillStyle = 'rgba(0,0,0,0.2)';
  ellipse(g, x, y + 9, 14, 4); g.fill();
  g.fillStyle = '#ecc75a';
  g.strokeStyle = '#a8801f';
  g.lineWidth = 2;
  g.beginPath(); g.rect(x - 12, y - 8, 24, 16); g.fill(); g.stroke();
  g.beginPath();
  g.moveTo(x - 6, y - 8); g.lineTo(x - 6, y + 8);
  g.moveTo(x + 6, y - 8); g.lineTo(x + 6, y + 8);
  g.stroke();
}

// ---------- Fences (farm border) ----------

function drawFences(g) {
  const W = ARENA.W, H = ARENA.H;
  drawFenceH(g, 6, 0, W);
  drawFenceH(g, H - 8, 0, W);
  drawFenceV(g, 5, 0, ARENA.riverTop - 6);
  drawFenceV(g, 5, ARENA.riverBottom + 6, H);
  drawFenceV(g, W - 5, 0, ARENA.riverTop - 6);
  drawFenceV(g, W - 5, ARENA.riverBottom + 6, H);
}

function drawFenceH(g, y, x1, x2) {
  g.fillStyle = '#a8743f';
  g.fillRect(x1, y - 3, x2 - x1, 2.5);
  g.fillRect(x1, y + 2, x2 - x1, 2.5);
  for (let x = x1 + 4; x < x2; x += 24) {
    g.fillStyle = '#6b4423';
    g.fillRect(x, y - 6, 4, 12);
    g.fillStyle = '#8a5a2b';
    g.fillRect(x, y - 6, 4, 2);
  }
}

function drawFenceV(g, x, y1, y2) {
  g.fillStyle = '#a8743f';
  g.fillRect(x - 3, y1, 2.5, y2 - y1);
  g.fillRect(x + 1, y1, 2.5, y2 - y1);
  g.fillStyle = '#6b4423';
  for (let y = y1 + 4; y < y2; y += 24) g.fillRect(x - 5, y, 10, 4);
}

// ---------- Hedges (forest border) ----------

// Low hedges along the same edges as the farm fence (with a gap for the river)
function drawHedges(g) {
  const W = ARENA.W, H = ARENA.H;
  drawHedgeRow(g, 0, 5, W, 5);           // top
  drawHedgeRow(g, 0, H - 6, W, H - 6);   // bottom
  [4, W - 4].forEach(x => {
    drawHedgeRow(g, x, 0, x, ARENA.riverTop - 12);      // left / right side above the river
    drawHedgeRow(g, x, ARENA.riverBottom + 12, x, H);   // left / right side below the river
  });
}

// A straight row of small round bushes from (x1, y1) to (x2, y2)
function drawHedgeRow(g, x1, y1, x2, y2) {
  const count = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / 11));
  const bushes = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const r = 6 + (i % 3) * 0.8;   // slightly different sizes look more natural
    bushes.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, r]);
  }
  fillCircles(g, bushes.map(([x, y, r]) => [x + 1, y + 2, r]), 'rgba(0,0,0,0.18)');           // shadow
  fillCircles(g, bushes, '#2f6e3a');                                                            // leaves
  fillCircles(g, bushes.map(([x, y, r]) => [x - r * 0.25, y - r * 0.3, r * 0.5]), '#58a052');  // sunny top
}

// ---------- Forest decorations ----------

// Only at the far edges (x < 40 or x > W - 40), never in the lanes:
// a pine in each corner and one small mushroom group on each side
function drawForestCorners(g) {
  const W = ARENA.W, H = ARENA.H;
  drawPine(g, 22, 44);
  drawPine(g, W - 22, 44);
  drawPine(g, 22, H - 20);
  drawPine(g, W - 22, H - 20);
  drawMushroomCluster(g, 24, 236);
  drawMushroomCluster(g, W - 24, H - 236);
}

// A small cute pine tree. (x, y) is the bottom of the trunk.
function drawPine(g, x, y) {
  // Shadow and trunk
  g.fillStyle = 'rgba(0,0,0,0.22)';
  ellipse(g, x + 2, y, 12, 4); g.fill();
  g.fillStyle = '#6b4423';
  g.fillRect(x - 2.5, y - 7, 5, 7);

  // Three layers of branches, biggest at the bottom: [bottom y, half width, height]
  [[y - 5, 12, 13], [y - 12, 9.5, 11], [y - 18, 7, 10]].forEach(([by, hw, th]) => {
    // Dark triangle
    g.fillStyle = '#2b6040';
    g.beginPath();
    g.moveTo(x, by - th); g.lineTo(x + hw, by); g.lineTo(x - hw, by); g.closePath();
    g.fill();
    // Lighter left half, as if the sun shines from the left
    g.fillStyle = '#3a7a4c';
    g.beginPath();
    g.moveTo(x, by - th); g.lineTo(x, by); g.lineTo(x - hw, by); g.closePath();
    g.fill();
    // Outline around the whole layer
    g.strokeStyle = '#1d4630';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(x, by - th); g.lineTo(x + hw, by); g.lineTo(x - hw, by); g.closePath();
    g.stroke();
  });
}

// Three little mushrooms growing together. (x, y) is the ground in the middle.
function drawMushroomCluster(g, x, y) {
  g.fillStyle = 'rgba(0,0,0,0.2)';
  ellipse(g, x, y + 1, 13, 3.5); g.fill();
  // Back to front, so the front ones overlap the back ones
  drawMushroom(g, x - 3, y - 1, 1);
  drawMushroom(g, x + 6, y + 1, 0.7);
  drawMushroom(g, x - 8, y + 2, 0.6);
}

// One red mushroom with white dots. (x, y) = bottom of the stem, s = size
function drawMushroom(g, x, y, s) {
  // Stem
  g.fillStyle = '#f4ead2';
  g.strokeStyle = '#b89f78';
  g.lineWidth = 1;
  g.beginPath(); g.rect(x - 2 * s, y - 6 * s, 4 * s, 6 * s); g.fill(); g.stroke();

  // Cap: the top half of an ellipse
  g.fillStyle = '#d9483b';
  g.strokeStyle = '#8e2a22';
  g.beginPath();
  g.ellipse(x, y - 6 * s, 6 * s, 5 * s, 0, Math.PI, 0);
  g.closePath();
  g.fill(); g.stroke();

  // White dots
  g.fillStyle = '#fff';
  ellipse(g, x - 2.5 * s, y - 8 * s, 1.2 * s, 1.1 * s); g.fill();
  ellipse(g, x + 2 * s, y - 9.5 * s, 1 * s, 0.9 * s); g.fill();
}
