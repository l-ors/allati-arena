// Canvas drawing for animals, buildings, spells, towers and HUD bits
const PLAYER = 1;   // bottom side
const ENEMY = -1;   // top side
const TEAM_COLORS = { 1: '#3b82f6', '-1': '#e04848' };

// Colors for each bird type
const BIRD_STYLES = {
  chicken: { body: '#fffaf0', wing: '#ece1cc', tail: '#f3ead8', outline: '#8a7a6a', bigComb: false },
  hen:     { body: '#c9824a', wing: '#a8612f', tail: '#8a4a22', outline: '#5a3515', bigComb: false },
  rooster: { body: '#e0873a', wing: '#b5541f', tail: '#1f5a3a', outline: '#5a2a10', bigComb: true },
};

// Side-view bird. (x, y) = feet position.
// o = { kind, scale, facing (1 right / -1 left), time, team (or null), moving, peck, lift }
function drawBird(ctx, x, y, o) {
  const st = BIRD_STYLES[o.kind || 'chicken'];
  const s = o.scale || 1;
  const step = o.moving ? Math.sin(o.time * 20) : 0;
  const bob = o.moving ? Math.abs(step) * 1.2 : 0;
  const lift = o.lift || 0;   // "röppenés": how high the bird is off the ground

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * (o.facing || 1), s);

  // Shadow + team ring (stay on the ground)
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ellipse(ctx, 0, 0, 8, 3); ctx.fill();
  if (o.team) {
    ctx.strokeStyle = TEAM_COLORS[o.team];
    ctx.lineWidth = 2;
    ellipse(ctx, 0, 0, 9.5, 3.8); ctx.stroke();
  }

  ctx.translate(0, -lift);

  // Legs
  ctx.strokeStyle = '#e8912d';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-2, -5); ctx.lineTo(-2 + step * 2, 0);
  ctx.moveTo(2, -5); ctx.lineTo(2 - step * 2, 0);
  ctx.stroke();

  ctx.translate(0, -bob);
  ctx.strokeStyle = st.outline;
  ctx.lineWidth = 1;

  // Tail: rooster gets long curved feathers, others a small triangle
  ctx.fillStyle = st.tail;
  if (o.kind === 'rooster') {
    [-0.9, -0.5, -0.1].forEach((angle, i) => {
      ctx.fillStyle = i === 1 ? '#2d2d6b' : st.tail;
      ctx.beginPath();
      ctx.ellipse(-8, -14, 3, 9, angle, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    });
  } else {
    ctx.beginPath();
    ctx.moveTo(-5, -9); ctx.lineTo(-11, -17); ctx.lineTo(-8, -8); ctx.closePath();
    ctx.fill(); ctx.stroke();
  }

  // Body
  ctx.fillStyle = st.body;
  ellipse(ctx, 0, -9, 8, 6); ctx.fill(); ctx.stroke();

  // Wing (flaps while lifted)
  ctx.fillStyle = st.wing;
  if (lift > 0) {
    ctx.beginPath();
    ctx.ellipse(-2, -14, 3, 7, -0.6 + Math.sin(o.time * 40) * 0.5, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  } else {
    ellipse(ctx, -1, -9, 4.5, 3); ctx.fill();
  }

  // Head (dips forward when pecking / throwing)
  const hx = 6 + (o.peck ? 3 : 0);
  const hy = -15 + (o.peck ? 5 : 0);
  ctx.fillStyle = st.body;
  ellipse(ctx, hx, hy, 4, 4); ctx.fill(); ctx.stroke();

  // Comb + wattle
  ctx.fillStyle = '#e0352b';
  const r = st.bigComb ? 2.3 : 1.6;
  ellipse(ctx, hx - 1.5, hy - 4, r, r); ctx.fill();
  ellipse(ctx, hx + 1, hy - 4.5, r, r); ctx.fill();
  if (st.bigComb) { ellipse(ctx, hx - 3.8, hy - 3, r, r); ctx.fill(); }
  ellipse(ctx, hx + 3, hy + 3, 1.2, st.bigComb ? 2.6 : 1.8); ctx.fill();

  // Beak
  ctx.fillStyle = '#f2a33a';
  ctx.beginPath();
  ctx.moveTo(hx + 3.5, hy - 1); ctx.lineTo(hx + 7.5, hy + 0.5); ctx.lineTo(hx + 3.5, hy + 1.5);
  ctx.closePath(); ctx.fill();

  // Eye
  ctx.fillStyle = '#222';
  ellipse(ctx, hx + 1.2, hy - 1, 0.9, 0.9); ctx.fill();

  ctx.restore();
}

// Draws any unit based on its card's "draw" type
function drawUnit(ctx, u, time) {
  const s = CARDS[u.cardId].unit;
  if (s.draw === 'bee') {
    drawBee(ctx, u.x, u.y, { facing: u.facing, time: time + u.anim, team: u.team, hover: 16 });
  } else if (s.draw === 'hive') {
    drawHive(ctx, u.x, u.y, { scale: s.drawScale, team: u.team });
  } else if (s.draw === 'wheatfield') {
    // growth: how close the next feed is (0 = just made one, 1 = the next one is ready)
    drawWheatField(ctx, u.x, u.y, {
      scale: s.drawScale,
      team: u.team,
      growth: u.produceEvery ? 1 - u.produceTimer / u.produceEvery : 0,
      time,
    });
  } else if (s.draw === 'goose') {
    drawGoose(ctx, u.x, u.y, { scale: s.drawScale, facing: u.facing, time: time + u.anim, team: u.team, hover: 18, attack: u.peck > 0 });
  } else if (s.draw === 'snake') {
    drawSnake(ctx, u.x, u.y, { scale: s.drawScale, facing: u.facing, time: time + u.anim, team: u.team, moving: u.moving, attack: u.peck > 0 });
  } else if (s.draw === 'frog') {
    drawFrog(ctx, u.x, u.y, { scale: s.drawScale, facing: u.facing, time: time + u.anim, team: u.team, moving: u.moving, attack: u.peck > 0, lift: u.lift || 0 });
  } else if (s.draw === 'cheetah') {
    drawCheetah(ctx, u.x, u.y, { scale: s.drawScale, facing: u.facing, time: time + u.anim, team: u.team, moving: u.moving, attack: u.peck > 0, sprinting: u.sprinting });
  } else if (s.draw === 'eel') {
    drawEel(ctx, u.x, u.y, { scale: s.drawScale, facing: u.facing, time: time + u.anim, team: u.team });
  } else if (s.draw === 'armadillo') {
    drawArmadillo(ctx, u.x, u.y, { scale: s.drawScale, facing: u.facing, time: time + u.anim, team: u.team, moving: u.moving, shellActive: (u.hp <= u.maxHp * 0.5) });
  } else if (s.draw === 'falcon') {
    drawFalcon(ctx, u.x, u.y, { scale: s.drawScale, facing: u.facing, time: time + u.anim, team: u.team, diving: u.diving });
  } else if (s.draw === 'badger') {
    drawBadger(ctx, u.x, u.y, { scale: s.drawScale, facing: u.facing, time: time + u.anim, team: u.team, moving: u.moving, attack: u.peck > 0, raging: (u.hp <= u.maxHp * 0.5) });
  } else if (s.draw === 'gorilla') {
    drawGorilla(ctx, u.x, u.y, { scale: s.drawScale, facing: u.facing, time: time + u.anim, team: u.team, moving: u.moving, attack: u.peck > 0 });
  } else if (QUAD_STYLES[s.draw]) {
    drawQuadruped(ctx, u.x, u.y, {
      kind: s.draw,
      scale: s.drawScale,
      facing: u.facing,
      time: time + u.anim,
      team: u.team,
      moving: u.moving,
      attack: u.peck > 0,
      charging: u.charging,
      lift: u.lift || 0,
    });
  } else {
    drawBird(ctx, u.x, u.y, {
      kind: s.draw,
      scale: s.drawScale,
      facing: u.facing,
      time: time + u.anim,
      team: u.team,
      moving: u.moving,
      peck: u.peck > 0,
      lift: u.jump > 0 ? Math.sin((u.jump / JUMP_TIME) * Math.PI) * 14 : 0,
    });
  }

  // Draw Stun effect if unit is stunned
  if (u.stunTimer > 0) {
    drawStunnedEffect(ctx, u.x, u.y - (s.hpBarY || 24 * s.drawScale) - 8, time);
  }

  const barY = s.hpBarY || 24 * s.drawScale;
  if (u.hp < u.maxHp) drawHpBar(ctx, u.x, u.y - barY, s.radius > 10 ? 26 : 16, u.hp / u.maxHp, TEAM_COLORS[u.team]);
}

// Four-legged farm animals: chubby side-view body, big front-facing head.
// The newer animals use some extra (optional) style keys. The older ones leave them out,
// so they look exactly the same as before:
//   size          makes the whole animal smaller / bigger (the rabbit is small)
//   legH, legW    leg length and thickness (the horse has longer legs)
//   feet, feetH   colored hooves or paws at the bottom of the legs
//   bodyW, bodyH  body size
//   headX, headY, headW, headH, eyeY   head position and size
//   chest         light patch on the front of the body
//   face          'muzzle' (cattle), 'button' (pigs), 'fox', 'bunny', 'dog', 'horse', 'goat'
//   mane, blaze, collar, beard, hop (the rabbit hops instead of walking)
const QUAD_STYLES = {
  cow:       { body: '#fffaf0', outline: '#5a4a3a', snout: '#f7b8b0', spots: true, horns: 'small', ears: 'side', tail: 'straight' },
  bull:      { body: '#9a5a32', outline: '#4a2a14', snout: '#e8c09a', horns: 'big', ears: 'side', tail: 'straight' },
  piglet:    { body: '#f7b8c4', outline: '#a0566a', snout: '#f39aad', ears: 'pointy', tail: 'curly', blush: true },
  mangalica: { body: '#ecd9b0', outline: '#8a6a3a', snout: '#7a5a55', ears: 'pointy', tail: 'curly', woolly: true },
  fox: {
    body: '#f09a52', outline: '#8a4a1e', snout: '#fffaf0', nose: '#3a2a22', face: 'fox',
    ears: 'fox', earInner: '#fff1dc', earTip: '#5a3a2a', tail: 'bushy', tailTip: '#fffaf0',
    chest: '#fffaf0', feet: '#6a4430', feetH: 3,
  },
  rabbit: {
    size: 0.85, body: '#e4d8c8', outline: '#8a7866', snout: '#fffaf0', nose: '#f39aad', face: 'bunny',
    ears: 'tall', earInner: '#f7c3cd', tail: 'puff', tailColor: '#fffaf0', chest: '#fffaf0', blush: true,
    legH: 6, bodyW: 10, bodyH: 7, headX: 8.5, headY: -17, headW: 6.2, headH: 5.8, hop: true,
  },
  horse: {
    body: '#a86a3e', outline: '#4a2a14', snout: '#dcb48e', face: 'horse', mane: '#4a2e1e', blaze: '#fffaf0',
    ears: 'horse', earInner: '#7a4a2e', tail: 'long', legH: 10, legW: 3.6, bodyW: 14, feet: '#3a2a20', feetH: 2,
    headX: 13, headY: -18, headW: 6, headH: 7, eyeY: -2.5,
  },
  dog: {
    body: '#d9a066', outline: '#6a4020', snout: '#f5e2c4', nose: '#2a1e1a', face: 'dog',
    ears: 'floppy', earColor: '#9a5e30', tail: 'wag', chest: '#f5e2c4', feet: '#fffaf0', feetH: 2, collar: '#e0564a',
  },
  goat: {
    body: '#f4f1ea', outline: '#7a7066', snout: '#ecdcd4', face: 'goat', horns: 'goat', hornColor: '#a89878',
    ears: 'goat', tail: 'short', beard: '#ddd4c4', feet: '#8a8078', feetH: 1.6,
  },
};

// (x, y) = feet position.
// o = { kind, scale, facing, time, team, moving, attack (headbutt / bite), charging, lift (jump height in pixels) }
function drawQuadruped(ctx, x, y, o) {
  const st = QUAD_STYLES[o.kind];
  const s = (o.scale || 1) * (st.size || 1);
  // The rabbit hops with all four feet together, the others step with pairs of legs
  const step = o.moving && !st.hop ? Math.sin(o.time * (o.charging ? 22 : 11)) : 0;
  const hop = o.moving && st.hop ? Math.abs(Math.sin(o.time * 4)) * 20 : 0;
  const lift = (o.lift || 0) / s + hop;

  const legH = st.legH || 7;
  const legW = st.legW || 4;
  const bw = st.bodyW || 13;
  const bh = st.bodyH || 8;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * (o.facing || 1), s);

  // Shadow + team ring stay on the ground (the shadow gets smaller while jumping)
  const shadow = Math.max(0.5, 1 - lift / 40);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ellipse(ctx, 0, 0, 14 * shadow, 4 * shadow); ctx.fill();
  if (o.team) {
    ctx.strokeStyle = TEAM_COLORS[o.team];
    ctx.lineWidth = 2;
    ellipse(ctx, 0, 0, 16, 5.5); ctx.stroke();
  }

  // Jumping / hopping lifts the whole animal
  ctx.translate(0, -lift);

  ctx.strokeStyle = st.outline;
  ctx.lineWidth = 1;

  // Four stubby legs, pairs lift in turn while walking
  const spread = bw / 13;
  [[-8, step], [-3, -step], [4, -step], [9, step]].forEach(([lx, phase]) => {
    const up = Math.max(0, phase) * 2;
    const left = lx * spread - legW / 2;
    ctx.fillStyle = st.body;
    ctx.fillRect(left, -legH - up, legW, legH);
    if (st.feet) {
      ctx.fillStyle = st.feet;
      ctx.fillRect(left, -st.feetH - up, legW, st.feetH);
    }
    ctx.strokeRect(left, -legH - up, legW, legH);
  });

  // Walking bob. Longer / shorter legs move the upper body up / down,
  // so from here on the body center is always at (0, -11).
  ctx.translate(0, -Math.abs(step) + (11 - (legH - 4) - bh));

  drawQuadTail(ctx, st, bw, o.time);

  // Body (woolly = fluffy bumps around the edge)
  ctx.fillStyle = st.body;
  if (st.woolly) {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      ellipse(ctx, Math.cos(a) * 12, -11 + Math.sin(a) * 7, 3.2, 3.2); ctx.fill(); ctx.stroke();
    }
    ellipse(ctx, 0, -11, 13, 8); ctx.fill();
  } else {
    ellipse(ctx, 0, -11, bw, bh); ctx.fill();
    if (st.chest) {
      // Light patch on the chest, kept inside the body
      ctx.save();
      ctx.clip();
      ctx.fillStyle = st.chest;
      ellipse(ctx, bw - 4, -8, 4, 4.5); ctx.fill();
      ctx.restore();
      ellipse(ctx, 0, -11, bw, bh);
    }
    ctx.stroke();
  }
  if (st.spots) {
    ctx.fillStyle = '#3a302a';
    ellipse(ctx, -5, -13, 4, 3); ctx.fill();
    ellipse(ctx, 4, -8, 2.5, 2); ctx.fill();
  }

  // Head position: bumps forward on a headbutt, dips while charging
  const hx = (st.headX || 11) + (o.attack ? 3 : 0);
  const hy = (st.headY || -16) + (o.charging ? 2 : 0);
  const hw = st.headW || 7;
  const hh = st.headH || 6.5;

  // Horse mane: dark fluffy bumps along the top of the neck
  if (st.mane) {
    ctx.fillStyle = st.mane;
    [[-9, 0], [-6.5, -2.5], [-4, -4.5]].forEach(([mx, my]) => {
      ellipse(ctx, hx + mx, hy + my, 2.6, 2.6); ctx.fill(); ctx.stroke();
    });
  }

  // Horns (behind the head)
  if (st.horns === 'goat') {
    // Small goat horns that curve backwards
    ctx.strokeStyle = st.hornColor;
    ctx.lineCap = 'round';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    [-1, 1].forEach(side => {
      ctx.moveTo(hx + side * 2.4, hy - 5);
      ctx.quadraticCurveTo(hx + side * 2.6, hy - 11.5, hx + side * 6.5, hy - 10);
    });
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.strokeStyle = st.outline;
    ctx.lineWidth = 1;
  } else if (st.horns) {
    const big = st.horns === 'big';
    ctx.strokeStyle = '#efe3c0';
    ctx.lineCap = 'round';
    ctx.lineWidth = big ? 2.6 : 2;
    ctx.beginPath();
    if (big) {
      ctx.moveTo(hx - 4, hy - 4); ctx.quadraticCurveTo(hx - 9, hy - 5, hx - 10, hy - 11);
      ctx.moveTo(hx + 4, hy - 4); ctx.quadraticCurveTo(hx + 9, hy - 5, hx + 10, hy - 11);
    } else {
      ctx.moveTo(hx - 3, hy - 5); ctx.lineTo(hx - 4.5, hy - 9);
      ctx.moveTo(hx + 3, hy - 5); ctx.lineTo(hx + 4.5, hy - 9);
    }
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.strokeStyle = st.outline;
    ctx.lineWidth = 1;
  }

  // Ears: floppy side ears (cow, bull) or pointy ears on top (pigs)
  ctx.fillStyle = st.body;
  if (st.ears === 'side') {
    ctx.beginPath(); ctx.ellipse(hx - 7.5, hy - 2, 3.2, 1.7, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(hx + 7.5, hy - 2, 3.2, 1.7, -0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else if (st.ears === 'goat') {
    // Long goat ears drooping to the sides
    [-1, 1].forEach(side => {
      ctx.beginPath(); ctx.ellipse(hx + side * 7.8, hy - 1, 3.6, 1.6, side * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });
  } else if (st.ears === 'tall') {
    // Long bunny ears standing up, pink inside
    [-1, 1].forEach(side => {
      ctx.fillStyle = st.body;
      ctx.beginPath(); ctx.ellipse(hx + side * 2.6, hy - 9, 2.2, 6, side * 0.15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = st.earInner;
      ctx.beginPath(); ctx.ellipse(hx + side * 2.6, hy - 9.5, 1.1, 4.2, side * 0.15, 0, Math.PI * 2); ctx.fill();
    });
  } else if (st.ears === 'fox') {
    // Big pointy fox ears: light inside, dark tips
    [-1, 1].forEach(side => {
      ctx.fillStyle = st.body;
      triangle(ctx, hx + side * 5.8, hy - 10, hx + side * 6.8, hy - 1.5, hx + side * 1.2, hy - 5.5); ctx.fill();
      ctx.fillStyle = st.earInner;
      triangle(ctx, hx + side * 5.3, hy - 8, hx + side * 5.8, hy - 3.4, hx + side * 2.7, hy - 5.6); ctx.fill();
      ctx.fillStyle = st.earTip;
      triangle(ctx, hx + side * 5.8, hy - 10, hx + side * 6.2, hy - 6.8, hx + side * 4.1, hy - 8.3); ctx.fill();
      triangle(ctx, hx + side * 5.8, hy - 10, hx + side * 6.8, hy - 1.5, hx + side * 1.2, hy - 5.5); ctx.stroke();
    });
  } else if (st.ears === 'horse') {
    // Small upright horse ears
    [-1, 1].forEach(side => {
      ctx.fillStyle = st.body;
      triangle(ctx, hx + side * 5, hy - 10.5, hx + side * 5.8, hy - 3.5, hx + side * 1.8, hy - 6.5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = st.earInner;
      triangle(ctx, hx + side * 4.6, hy - 8.8, hx + side * 5.1, hy - 5, hx + side * 2.9, hy - 6.6); ctx.fill();
    });
  } else if (st.ears !== 'floppy') {
    [-1, 1].forEach(side => {
      ctx.beginPath();
      ctx.moveTo(hx + side * 6, hy - 2); ctx.lineTo(hx + side * 7, hy - 9); ctx.lineTo(hx + side * 1.5, hy - 6);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    });
  }

  // Dog collar with a little golden tag (under the chin)
  if (st.collar) {
    ctx.fillStyle = st.collar;
    ellipse(ctx, hx - 0.5, hy + 6, 5.5, 1.8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f2c94c';
    ellipse(ctx, hx, hy + 8, 1.2, 1.2); ctx.fill(); ctx.stroke();
  }

  // Head
  ctx.fillStyle = st.body;
  ellipse(ctx, hx, hy, hw, hh); ctx.fill(); ctx.stroke();
  if (st.face === 'fox') {
    // White fox cheeks, kept inside the head
    ctx.save();
    ctx.clip();
    ctx.fillStyle = st.snout;
    ellipse(ctx, hx - 3.5, hy + 3.8, 4.2, 3.4); ctx.fill();
    ellipse(ctx, hx + 3.5, hy + 3.8, 4.2, 3.4); ctx.fill();
    ctx.restore();
    ellipse(ctx, hx, hy, hw, hh); ctx.stroke();
  }
  if (st.woolly) {
    ellipse(ctx, hx - 2, hy - 6, 2.5, 2); ctx.fill(); ctx.stroke();
    ellipse(ctx, hx + 2, hy - 6.5, 2.5, 2); ctx.fill(); ctx.stroke();
  }
  if (st.blaze) {
    // White stripe down the horse's forehead
    ctx.fillStyle = st.blaze;
    ellipse(ctx, hx, hy - 2.5, 1.1, 3); ctx.fill();
  }
  if (st.mane) {
    // Little tuft of mane between the ears
    ctx.fillStyle = st.mane;
    ellipse(ctx, hx - 1.3, hy - hh + 0.6, 2.1, 1.7); ctx.fill(); ctx.stroke();
    ellipse(ctx, hx + 1.3, hy - hh + 0.4, 2.1, 1.7); ctx.fill(); ctx.stroke();
  }
  if (st.ears === 'floppy') {
    // Floppy dog ears hanging over the sides of the head
    ctx.fillStyle = st.earColor;
    [-1, 1].forEach(side => {
      ctx.beginPath(); ctx.ellipse(hx + side * 6.3, hy - 0.5, 2.3, 4.6, -side * 0.35, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });
  }
  if (st.beard) {
    // Little goat beard hanging from the chin (the muzzle covers its top)
    ctx.fillStyle = st.beard;
    ctx.beginPath();
    ctx.moveTo(hx - 2.2, hy + 4.5);
    ctx.quadraticCurveTo(hx - 1.5, hy + 9.5, hx + 0.3, hy + 11.5);
    ctx.quadraticCurveTo(hx + 1.5, hy + 8.5, hx + 2.2, hy + 4.5);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }

  // Two eyes with a little shine
  const ey = hy + (st.eyeY || -1.5);
  [-2.6, 2.6].forEach(ex => {
    ctx.fillStyle = '#222';
    ellipse(ctx, hx + ex, ey, 1.2, 1.3); ctx.fill();
    ctx.fillStyle = '#fff';
    ellipse(ctx, hx + ex + 0.4, ey - 0.5, 0.4, 0.4); ctx.fill();
  });

  // Rosy cheeks
  if (st.blush) {
    ctx.fillStyle = 'rgba(240,110,140,0.45)';
    ellipse(ctx, hx - 4.5, hy + 1.5, 1.6, 1); ctx.fill();
    ellipse(ctx, hx + 4.5, hy + 1.5, 1.6, 1); ctx.fill();
  }

  // Snout: wide muzzle for cattle, round button nose for pigs, and so on
  const face = st.face || (st.ears === 'side' ? 'muzzle' : 'button');
  ctx.fillStyle = st.snout;
  if (face === 'muzzle') {
    ellipse(ctx, hx, hy + 3.5, 5, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = st.outline;
    ellipse(ctx, hx - 1.8, hy + 3.5, 0.8, 0.8); ctx.fill();
    ellipse(ctx, hx + 1.8, hy + 3.5, 0.8, 0.8); ctx.fill();
  } else if (face === 'button') {
    ellipse(ctx, hx, hy + 2.8, 3.5, 2.6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5a2a2a';
    ellipse(ctx, hx - 1.2, hy + 2.8, 0.6, 1); ctx.fill();
    ellipse(ctx, hx + 1.2, hy + 2.8, 0.6, 1); ctx.fill();
  } else if (face === 'horse') {
    // Long, soft horse muzzle
    ellipse(ctx, hx, hy + 4.8, 4.5, 3.3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = st.outline;
    ellipse(ctx, hx - 1.7, hy + 5, 0.7, 0.9); ctx.fill();
    ellipse(ctx, hx + 1.7, hy + 5, 0.7, 0.9); ctx.fill();
  } else if (face === 'goat') {
    ellipse(ctx, hx, hy + 3.5, 3.6, 2.5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = st.outline;
    ellipse(ctx, hx - 1.2, hy + 3.3, 0.6, 0.7); ctx.fill();
    ellipse(ctx, hx + 1.2, hy + 3.3, 0.6, 0.7); ctx.fill();
  } else if (face === 'bunny') {
    // Two fluffy cheeks and a little pink nose
    ellipse(ctx, hx - 1.5, hy + 2.8, 1.9, 1.5); ctx.fill(); ctx.stroke();
    ellipse(ctx, hx + 1.5, hy + 2.8, 1.9, 1.5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = st.nose;
    triangle(ctx, hx - 1.1, hy + 1.2, hx + 1.1, hy + 1.2, hx, hy + 2.3); ctx.fill();
  } else {
    // Fox and dog: dark nose with a small smile (the dog has a light muzzle)
    if (face === 'dog') { ellipse(ctx, hx, hy + 3.2, 3.8, 2.8); ctx.fill(); ctx.stroke(); }
    const ny = hy + (face === 'dog' ? 1.9 : 2.2);
    ctx.fillStyle = st.nose;
    ellipse(ctx, hx, ny, 1.5, 1.05); ctx.fill();
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(hx, ny + 0.8); ctx.lineTo(hx, ny + 1.6);
    ctx.moveTo(hx - 1.5, ny + 1.8);
    ctx.quadraticCurveTo(hx - 0.7, ny + 2.6, hx, ny + 1.6);
    ctx.quadraticCurveTo(hx + 0.7, ny + 2.6, hx + 1.5, ny + 1.8);
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  ctx.restore();
}

// Tail of a four-legged animal (drawn behind the body). bw = half body width.
function drawQuadTail(ctx, st, bw, time) {
  const back = -bw;   // x of the back end of the body
  if (st.tail === 'bushy') {
    // Big fluffy fox tail with a white tip, gently swaying
    ctx.save();
    ctx.translate(back + 2, -12);
    ctx.rotate(0.5 + Math.sin(time * 3) * 0.08);
    ctx.fillStyle = st.body;
    ellipse(ctx, -6.5, 0, 7.5, 3.8); ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = st.tailTip;
    ctx.fillRect(-15, -5, 4.5, 10);
    ctx.restore();
    ellipse(ctx, -6.5, 0, 7.5, 3.8); ctx.stroke();
    ctx.restore();
  } else if (st.tail === 'puff') {
    // Round cotton tail
    ctx.fillStyle = st.tailColor;
    ellipse(ctx, back - 0.5, -12.5, 3.3, 3.3); ctx.fill(); ctx.stroke();
  } else if (st.tail === 'long') {
    // Long flowing horse tail
    const sway = Math.sin(time * 4) * 1.2;
    ctx.fillStyle = st.mane;
    ctx.beginPath();
    ctx.moveTo(back + 1, -15.5);
    ctx.quadraticCurveTo(back - 7, -15, back - 5 + sway, -3);
    ctx.quadraticCurveTo(back - 2.5, -8, back + 1.5, -10.5);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (st.tail === 'wag') {
    // Short dog tail pointing up, always wagging
    ctx.save();
    ctx.translate(back + 1.5, -14);
    ctx.rotate(0.9 + Math.sin(time * 12) * 0.3);
    ctx.fillStyle = st.body;
    ellipse(ctx, -3.5, 0, 4, 1.8); ctx.fill(); ctx.stroke();
    ctx.restore();
  } else if (st.tail === 'short') {
    // Little goat tail sticking up
    ctx.fillStyle = st.body;
    ctx.beginPath(); ctx.ellipse(back + 0.5, -16.5, 1.6, 3, -0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else {
    ctx.beginPath();
    if (st.tail === 'curly') ctx.arc(-14, -12, 2.2, 0, Math.PI * 1.6);
    else { ctx.moveTo(-12, -12); ctx.quadraticCurveTo(-17, -11, -16, -6); }
    ctx.stroke();
  }
}

// Starts a closed triangle path (fill / stroke it afterwards)
function triangle(ctx, x1, y1, x2, y2, x3, y3) {
  ctx.beginPath();
  ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3);
  ctx.closePath();
}

// Flying white goose. (x, y) = spot on the ground below it.
// o = { scale, facing, time, team, hover (flying height in pixels, 0 = no shadow), attack (neck thrusts forward) }
function drawGoose(ctx, x, y, o) {
  const s = o.scale || 1;
  const hover = o.hover || 0;
  const white = '#fffaf2';
  const outline = '#8a8078';
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * (o.facing || 1), s);

  // Shadow + team ring on the ground, then fly up (bobbing gently)
  if (hover > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ellipse(ctx, 0, 0, 9, 3); ctx.fill();
    if (o.team) {
      ctx.strokeStyle = TEAM_COLORS[o.team];
      ctx.lineWidth = 2;
      ellipse(ctx, 0, 0, 11, 4); ctx.stroke();
    }
    ctx.translate(0, -hover / s + Math.sin(o.time * 3) * 1.5);
  }

  const flap = 0.2 + 0.8 * Math.sin(o.time * 9);   // 1 = wings up, below 0 = wings down
  const a = o.attack ? 1 : 0;                        // neck thrust while throwing an egg
  const hx = 11 + a * 3.5;
  const hy = -19 + a * 3;

  ctx.strokeStyle = outline;
  ctx.lineWidth = 1;

  // Far wing (behind the body)
  drawGooseWing(ctx, 2, -13, flap, '#ddd6cb');

  // Orange legs with little webbed feet
  ctx.strokeStyle = '#e8912d';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-1, -4); ctx.lineTo(-2.5, -1);
  ctx.moveTo(2, -4); ctx.lineTo(0.5, -1);
  ctx.stroke();
  ctx.fillStyle = '#f2a33a';
  ellipse(ctx, -3.2, -0.8, 1.8, 0.9); ctx.fill();
  ellipse(ctx, -0.2, -0.8, 1.8, 0.9); ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1;

  // Tail
  ctx.fillStyle = '#efe9df';
  ctx.beginPath();
  ctx.moveTo(-7, -11);
  ctx.quadraticCurveTo(-12, -13, -13, -10.5);
  ctx.quadraticCurveTo(-11, -8, -7.5, -7);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Long neck: a thick outline line with a thinner white line on top
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(4, -11);
  ctx.quadraticCurveTo(6.5 + a * 3, -18 + a * 5, hx - 1, hy + 1);
  ctx.lineWidth = 5.5; ctx.stroke();
  ctx.strokeStyle = white;
  ctx.lineWidth = 3.5; ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1;

  // Chubby body
  ctx.fillStyle = white;
  ellipse(ctx, 0, -9, 9, 6); ctx.fill(); ctx.stroke();

  // Head
  ellipse(ctx, hx, hy, 3.8, 3.4); ctx.fill(); ctx.stroke();

  // Orange beak (opens a little when throwing)
  ctx.fillStyle = '#f2a33a';
  if (a) {
    triangle(ctx, hx + 2.8, hy - 1.4, hx + 7.5, hy - 0.6, hx + 2.8, hy + 0.4); ctx.fill();
    triangle(ctx, hx + 2.8, hy + 0.8, hx + 6.5, hy + 2.4, hx + 2.8, hy + 1.8); ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(hx + 2.8, hy - 1.4);
    ctx.quadraticCurveTo(hx + 7.5, hy - 0.8, hx + 7.4, hy + 0.6);
    ctx.lineTo(hx + 2.8, hy + 1.6);
    ctx.closePath(); ctx.fill();
  }

  // Eye with a little shine
  ctx.fillStyle = '#222';
  ellipse(ctx, hx + 1.2, hy - 1, 1, 1); ctx.fill();
  ctx.fillStyle = '#fff';
  ellipse(ctx, hx + 1.5, hy - 1.4, 0.35, 0.35); ctx.fill();

  // Near wing (in front of the body)
  drawGooseWing(ctx, -0.5, -11.5, flap, '#f3eee6');

  ctx.restore();
}

// One goose wing from the shoulder (x, y). flap: 1 = up, 0 = flat, negative = down.
function drawGooseWing(ctx, x, y, flap, color) {
  const f = flap;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + 4, y);
  ctx.quadraticCurveTo(x + 3, y - 12 * f, x - 6, y - 13 * f);       // front edge up to the wing tip
  ctx.quadraticCurveTo(x - 9.5, y - 12 * f, x - 8, y - 8.5 * f);    // three round feather tips
  ctx.quadraticCurveTo(x - 10.5, y - 7 * f, x - 8.5, y - 4.5 * f);
  ctx.quadraticCurveTo(x - 10.5, y - 2 * f, x - 7, y);
  ctx.closePath(); ctx.fill(); ctx.stroke();
}

// Bee. (x, y) = spot on the ground below it; hover = flying height (0 = no shadow)
function drawBee(ctx, x, y, o) {
  const s = o.scale || 1;
  const hover = o.hover || 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * (o.facing || 1), s);

  // Shadow + team ring on the ground
  if (hover > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ellipse(ctx, 0, 0, 4, 1.5); ctx.fill();
    if (o.team) {
      ctx.strokeStyle = TEAM_COLORS[o.team];
      ctx.lineWidth = 1.5;
      ellipse(ctx, 0, 0, 5.5, 2.2); ctx.stroke();
    }
    ctx.translate(0, -hover + Math.sin(o.time * 6) * 2);
  }

  // Buzzing wings
  const flap = Math.abs(Math.sin(o.time * 50));
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.strokeStyle = 'rgba(80,80,120,0.6)';
  ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.ellipse(-1, -4, 2.5, 1 + flap * 3, -0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(2, -4, 2.5, 1 + flap * 3, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // Striped body
  ctx.fillStyle = '#ffc93c';
  ctx.strokeStyle = '#3a2a10';
  ctx.lineWidth = 0.8;
  ellipse(ctx, 0, 0, 5, 3.5); ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#2a1a08';
  ctx.fillRect(-2.5, -4, 1.4, 8);
  ctx.fillRect(0.3, -4, 1.4, 8);
  ctx.restore();
  ellipse(ctx, 0, 0, 5, 3.5); ctx.stroke();

  // Stinger + head
  ctx.fillStyle = '#2a1a08';
  ctx.beginPath(); ctx.moveTo(-5, -0.8); ctx.lineTo(-7.5, 0); ctx.lineTo(-5, 0.8); ctx.closePath(); ctx.fill();
  ellipse(ctx, 5, -0.5, 2.3, 2.3); ctx.fill();
  ctx.fillStyle = '#fff';
  ellipse(ctx, 5.8, -1.2, 0.7, 0.7); ctx.fill();

  ctx.restore();
}

// Straw beehive (skep). (x, y) = ground position
function drawHive(ctx, x, y, o) {
  const s = o.scale || 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);

  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ellipse(ctx, 0, 0, 12, 4); ctx.fill();
  if (o.team) {
    ctx.strokeStyle = TEAM_COLORS[o.team];
    ctx.lineWidth = 2;
    ellipse(ctx, 0, 0, 13, 5); ctx.stroke();
  }

  // Wooden stand
  ctx.fillStyle = '#7a4a22';
  ctx.fillRect(-11, -4, 22, 4);

  // Straw dome
  ctx.fillStyle = '#e3b04b';
  ctx.strokeStyle = '#9a6a1a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-10, -4);
  ctx.bezierCurveTo(-11, -22, 11, -22, 10, -4);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // Straw bands
  [[-8, 9.5], [-12, 8], [-16, 5]].forEach(([by, w]) => {
    ctx.beginPath(); ctx.moveTo(-w, by); ctx.quadraticCurveTo(0, by + 2, w, by); ctx.stroke();
  });

  // Entrance hole
  ctx.fillStyle = '#3a2210';
  ellipse(ctx, 0, -6, 3, 2.2); ctx.fill();

  ctx.restore();
}

// Mixes two '#rrggbb' colors: t = 0 gives a, t = 1 gives b, in between a blend of the two
function mixColor(a, b, t) {
  const ca = parseInt(a.slice(1), 16);
  const cb = parseInt(b.slice(1), 16);
  const mix = shift => Math.round(((ca >> shift) & 255) * (1 - t) + ((cb >> shift) & 255) * t);
  return `rgb(${mix(16)},${mix(8)},${mix(0)})`;
}

// Wheat field building: a small square of tilled soil with three rows of wheat, seen a little from above.
// (x, y) = middle of the patch on the ground.
// o = { scale, team (null = no team border, for card portraits), growth, time }
// growth 0..1 = how close the next feed is: the wheat grows taller and turns golden as it gets to 1.
function drawWheatField(ctx, x, y, o) {
  const s = o.scale || 1;
  const g = Math.max(0, Math.min(1, o.growth || 0));
  const time = o.time || 0;

  // The back edge is a bit narrower than the front edge: that gives the "seen from above" look
  const backY = -6, frontY = 5;     // back and front edge of the soil
  const backW = 13, frontW = 15;    // half widths
  const side = 3;                   // height of the soil's front side

  // Traces the patch outline, grown by m pixels on every side, down to "bottom"
  const patch = (m, bottom) => {
    ctx.beginPath();
    ctx.moveTo(-backW - m, backY - m);
    ctx.lineTo(backW + m, backY - m);
    ctx.lineTo(frontW + m, bottom + m);
    ctx.lineTo(-frontW - m, bottom + m);
    ctx.closePath();
  };

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.lineJoin = 'round';

  // Shadow + team border stay on the ground around the patch
  ctx.save();
  ctx.translate(1, 2);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  patch(0.5, frontY + side); ctx.fill();
  ctx.restore();
  if (o.team) {
    ctx.strokeStyle = TEAM_COLORS[o.team];
    ctx.lineWidth = 2;
    patch(3, frontY + side); ctx.stroke();
  }

  // Soil: darker front side, then the top
  ctx.strokeStyle = '#5a3a1a';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#7a4f28';
  ctx.beginPath(); ctx.rect(-frontW, frontY, frontW * 2, side); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#a8703c';
  patch(0, frontY); ctx.fill(); ctx.stroke();

  // Three rows of wheat, the back row first so the front rows overlap it
  for (let row = 0; row < 3; row++) {
    const depth = (row + 0.5) / 3;                        // 0 = back edge, 1 = front edge
    const ry = backY + (frontY - backY) * depth;          // y of this row
    const half = backW + (frontW - backW) * depth - 2.5;  // half width of this row
    const near = 0.85 + 0.15 * depth;                     // rows further back look a bit smaller

    // Little ridge of soil along the row
    ctx.strokeStyle = '#8a5a2e';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-half, ry + 0.8); ctx.lineTo(half, ry + 0.8); ctx.stroke();

    for (let i = 0; i < 5; i++) {
      const sx = -half + i * half / 2;
      const vary = 0.85 + 0.3 * (((i * 7 + row * 3) % 5) / 4);   // not all stalks are the same height
      const tall = (3 + g * 7) * near * vary;
      const sway = Math.sin(time * 2.2 + i * 0.9 + row * 1.7) * (0.3 + g * 0.6);
      drawWheatStalk(ctx, sx, ry, tall, sway, g);
    }
  }

  // A little twinkle when the next feed is almost ready
  if (g > 0.85) {
    const a = (g - 0.85) / 0.15;
    const r = 2.6 * a * (0.75 + 0.25 * Math.sin(time * 9));
    ctx.fillStyle = `rgba(255,255,240,${0.9 * a})`;
    ctx.beginPath();
    ctx.moveTo(10, -17 - r);
    ctx.quadraticCurveTo(10, -17, 10 + r, -17);
    ctx.quadraticCurveTo(10, -17, 10, -17 + r);
    ctx.quadraticCurveTo(10, -17, 10 - r, -17);
    ctx.quadraticCurveTo(10, -17, 10, -17 - r);
    ctx.fill();
  }

  ctx.restore();
}

// One wheat stalk of the wheat field. (x, y) = where it comes out of the soil.
// tall = height, sway = how far the tip leans sideways, g = growth 0..1 (green -> golden)
function drawWheatStalk(ctx, x, y, tall, sway, g) {
  const tipX = x + sway;
  const tipY = y - tall;

  // Stem
  ctx.strokeStyle = mixColor('#5f9e3a', '#c99a2e', g);
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x, y - tall * 0.5, tipX, tipY);
  ctx.stroke();

  // Small leaf halfway up
  ctx.fillStyle = mixColor('#76b84a', '#d9b04a', g);
  ctx.beginPath(); ctx.ellipse(x + 1.1, y - tall * 0.4, 1.4, 0.6, -0.6, 0, Math.PI * 2); ctx.fill();

  // The ear of wheat shows up after a while and grows plump and golden
  if (g > 0.2) {
    const e = (g - 0.2) / 0.8;
    ctx.fillStyle = mixColor('#b5d65a', '#f2c94c', g);
    ctx.strokeStyle = mixColor('#6a8a2a', '#9a7414', g);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.ellipse(tipX, tipY - 1.6 * e, 0.8 + 0.6 * e, 1 + 1.6 * e, sway * 0.15, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  }
}

// Golden ear of wheat, the same as the feed icon. (x, y) = bottom of the stem, s = size (1 = about 20 px tall)
function drawWheatEar(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * 0.35, s * 0.35);   // drawn in the icon's own 64-unit space, 0 = bottom of the stem
  ctx.strokeStyle = '#7a5a10';
  ctx.lineCap = 'round';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -48); ctx.stroke();
  ctx.fillStyle = '#ffcf4a';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(0, -50, 4.5, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  [-39, -27, -15].forEach(ky => {
    [-1, 1].forEach(side => {
      ctx.beginPath(); ctx.ellipse(side * 8, ky, 4.5, 7, side * 0.61, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });
  });
  ctx.restore();
}

// ---------- New Animal Renderers ----------

function drawStunnedEffect(ctx, x, y, time) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#fed330';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 3; i++) {
    const a = time * 7 + (i * Math.PI * 2) / 3;
    const sx = Math.cos(a) * 9;
    const sy = Math.sin(a) * 3.5;
    ctx.beginPath();
    ctx.moveTo(sx - 3, sy); ctx.lineTo(sx + 3, sy);
    ctx.moveTo(sx, sy - 3); ctx.lineTo(sx, sy + 3);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSnake(ctx, x, y, o) {
  const s = o.scale || 1;
  const time = o.time || 0;
  const moving = o.moving;
  const facing = o.facing || 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * facing, s);

  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ellipse(ctx, 0, 0, 15, 4); ctx.fill();
  if (o.team) {
    ctx.strokeStyle = TEAM_COLORS[o.team];
    ctx.lineWidth = 2;
    ellipse(ctx, 0, 0, 16.5, 5); ctx.stroke();
  }

  const segments = 6;
  const waveFreq = moving ? 12 : 4;
  const waveAmp = moving ? 4.5 : 2;

  for (let i = segments; i >= 0; i--) {
    const t = i / segments;
    const segX = -17 * t + 7;
    const segY = -3 + Math.sin(time * waveFreq - i * 0.85) * waveAmp * (1 - t * 0.35);
    const radius = 3.5 + (1 - t) * 2.8;

    ctx.fillStyle = i % 2 === 0 ? '#27ae60' : '#2ecc71';
    ctx.strokeStyle = '#1e824c';
    ctx.lineWidth = 1;
    ellipse(ctx, segX, segY, radius, radius * 0.85);
    ctx.fill(); ctx.stroke();

    if (i > 0 && i < segments) {
      ctx.fillStyle = '#f1c40f';
      ellipse(ctx, segX, segY - 1, radius * 0.45, radius * 0.3);
      ctx.fill();
    }
  }

  const headX = 9;
  const headY = -4 + Math.sin(time * waveFreq) * 1.5;
  ctx.fillStyle = '#2ecc71';
  ctx.strokeStyle = '#1e824c';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(headX, headY, 6, 4.5, 0.15, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();

  ctx.fillStyle = '#f39c12';
  ellipse(ctx, headX + 1.5, headY - 1.5, 1.8, 1.8); ctx.fill();
  ctx.fillStyle = '#111';
  ellipse(ctx, headX + 2, headY - 1.5, 0.6, 1.5); ctx.fill();

  const tongueFlick = Math.sin(time * 16) > 0.2;
  if (tongueFlick || o.attack) {
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(headX + 5, headY + 0.5);
    ctx.lineTo(headX + 11, headY + 0.5);
    ctx.lineTo(headX + 13, headY - 1.5);
    ctx.moveTo(headX + 11, headY + 0.5);
    ctx.lineTo(headX + 13, headY + 2.5);
    ctx.stroke();
  }

  if (o.attack) {
    ctx.fillStyle = '#2ed573';
    ellipse(ctx, headX + 7, headY + 3, 1.6, 2.2); ctx.fill();
  }
  ctx.restore();
}

function drawFrog(ctx, x, y, o) {
  const s = o.scale || 1;
  const time = o.time || 0;
  const moving = o.moving;
  const facing = o.facing || 1;
  const lift = o.lift || 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * facing, s);

  const shadowScale = Math.max(0.4, 1 - lift / 30);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ellipse(ctx, 0, 0, 11 * shadowScale, 4.5 * shadowScale); ctx.fill();
  if (o.team) {
    ctx.strokeStyle = TEAM_COLORS[o.team];
    ctx.lineWidth = 2;
    ellipse(ctx, 0, 0, 13, 5); ctx.stroke();
  }

  ctx.translate(0, -lift);

  ctx.strokeStyle = '#27ae60';
  ctx.fillStyle = '#2ecc71';
  ctx.lineWidth = 1.2;

  if (lift > 2 || moving) {
    ctx.beginPath();
    ctx.moveTo(-4, -6); ctx.lineTo(-12, -2); ctx.lineTo(-15, 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(4, -6); ctx.lineTo(10, 0); ctx.lineTo(12, 4);
    ctx.stroke();
  } else {
    ellipse(ctx, -7, -4, 4, 3); ctx.fill(); ctx.stroke();
    ellipse(ctx, 7, -4, 4, 3); ctx.fill(); ctx.stroke();
    ellipse(ctx, -4, -1, 2.5, 1.5); ctx.fill();
    ellipse(ctx, 3, -1, 2.5, 1.5); ctx.fill();
  }

  ctx.fillStyle = '#2ecc71';
  ctx.strokeStyle = '#218c74';
  ellipse(ctx, 0, -8, 9, 7); ctx.fill(); ctx.stroke();

  const breath = Math.sin(time * 5) * 1.5;
  ctx.fillStyle = '#f8efba';
  ellipse(ctx, 3, -6, 5 + breath * 0.5, 4.5 + breath * 0.5); ctx.fill();

  ctx.fillStyle = '#2ecc71';
  ctx.strokeStyle = '#218c74';
  ellipse(ctx, -4, -15, 3.5, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fffa65';
  ellipse(ctx, -3.5, -15, 2.4, 2.8); ctx.fill();
  ctx.fillStyle = '#111';
  ellipse(ctx, -3, -15, 1.2, 2.2); ctx.fill();

  ctx.fillStyle = '#2ecc71';
  ctx.strokeStyle = '#218c74';
  ellipse(ctx, 4, -15, 3.5, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fffa65';
  ellipse(ctx, 4.5, -15, 2.4, 2.8); ctx.fill();
  ctx.fillStyle = '#111';
  ellipse(ctx, 5, -15, 1.2, 2.2); ctx.fill();

  ctx.strokeStyle = '#218c74';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-6, -8); ctx.quadraticCurveTo(2, -4, 8, -8); ctx.stroke();

  if (o.attack) {
    ctx.strokeStyle = '#ff6b81';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(7, -6); ctx.lineTo(24, -8); ctx.stroke();
    ctx.fillStyle = '#ff4757';
    ellipse(ctx, 25, -8, 3, 2.5); ctx.fill();
  }
  ctx.restore();
}

function drawCheetah(ctx, x, y, o) {
  const s = o.scale || 1;
  const time = o.time || 0;
  const moving = o.moving;
  const facing = o.facing || 1;
  const sprinting = o.sprinting || o.charging;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * facing, s);

  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ellipse(ctx, 0, 0, 16, 5); ctx.fill();
  if (o.team) {
    ctx.strokeStyle = TEAM_COLORS[o.team];
    ctx.lineWidth = 2;
    ellipse(ctx, 0, 0, 18, 6); ctx.stroke();
  }

  if (sprinting) {
    ctx.strokeStyle = 'rgba(243, 156, 18, 0.4)';
    ctx.lineWidth = 2;
    [-6, 0, 6].forEach(offset => {
      ctx.beginPath();
      ctx.moveTo(-22, -10 + offset); ctx.lineTo(-12, -10 + offset);
      ctx.stroke();
    });
  }

  const runSpeed = sprinting ? 24 : 12;
  const step = moving ? Math.sin(time * runSpeed) : 0;

  ctx.strokeStyle = '#b35400';
  ctx.lineWidth = 1.2;
  ctx.fillStyle = '#f39c12';

  ctx.fillRect(-12, -11 + step * 4, 3.2, 11 - step * 4);
  ctx.strokeRect(-12, -11 + step * 4, 3.2, 11 - step * 4);
  ctx.fillRect(-7, -11 - step * 4, 3.2, 11 + step * 4);
  ctx.strokeRect(-7, -11 - step * 4, 3.2, 11 + step * 4);

  ctx.fillRect(5, -11 - step * 4, 3.2, 11 + step * 4);
  ctx.strokeRect(5, -11 - step * 4, 3.2, 11 + step * 4);
  ctx.fillRect(10, -11 + step * 4, 3.2, 11 - step * 4);
  ctx.strokeRect(10, -11 + step * 4, 3.2, 11 - step * 4);

  const bob = moving ? Math.abs(step) * 1.5 : 0;
  ctx.translate(0, -bob);

  ctx.fillStyle = '#f39c12';
  ctx.strokeStyle = '#b35400';
  ellipse(ctx, 0, -14, 15, 7.5); ctx.fill(); ctx.stroke();

  ctx.fillStyle = '#fffdfa';
  ellipse(ctx, 4, -12, 6, 4.5); ctx.fill();

  ctx.fillStyle = '#2c3e50';
  [[-8, -16], [-5, -13], [-2, -16], [1, -13], [-6, -15], [3, -15]].forEach(([sx, sy]) => {
    ellipse(ctx, sx, sy, 1.2, 1.2); ctx.fill();
  });

  const tailWag = Math.sin(time * 8) * 4;
  ctx.strokeStyle = '#f39c12';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-14, -16);
  ctx.quadraticCurveTo(-22, -22 + tailWag, -25, -16 + tailWag);
  ctx.stroke();
  ctx.fillStyle = '#fffdfa';
  ellipse(ctx, -25, -16 + tailWag, 2, 2); ctx.fill();

  const headX = 14 + (o.attack ? 3 : 0);
  const headY = -18;
  ctx.fillStyle = '#f39c12';
  ctx.strokeStyle = '#b35400';
  ctx.lineWidth = 1;
  ellipse(ctx, headX, headY, 6, 5.5); ctx.fill(); ctx.stroke();

  ctx.fillStyle = '#2c3e50';
  ellipse(ctx, headX - 3, headY - 5, 2.5, 2.5); ctx.fill();
  ctx.fillStyle = '#f39c12';
  ellipse(ctx, headX + 1, headY - 5.5, 2.5, 2.5); ctx.fill();

  ctx.fillStyle = '#fffdfa';
  ellipse(ctx, headX + 3.5, headY + 1.5, 3.2, 2.5); ctx.fill();
  ctx.fillStyle = '#2c3e50';
  ellipse(ctx, headX + 5.8, headY + 0.8, 1.2, 0.9); ctx.fill();

  ctx.fillStyle = '#f1c40f';
  ellipse(ctx, headX + 2, headY - 1.2, 1.6, 1.6); ctx.fill();
  ctx.fillStyle = '#111';
  ellipse(ctx, headX + 2.4, headY - 1.2, 0.7, 1.4); ctx.fill();

  ctx.strokeStyle = '#2c3e50';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(headX + 1.5, headY - 0.5);
  ctx.lineTo(headX + 4.5, headY + 2.5);
  ctx.stroke();

  ctx.restore();
}

function drawEel(ctx, x, y, o) {
  const s = o.scale || 1;
  const time = o.time || 0;
  const facing = o.facing || 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * facing, s);

  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ellipse(ctx, 0, 0, 16, 4.5); ctx.fill();
  if (o.team) {
    ctx.strokeStyle = TEAM_COLORS[o.team];
    ctx.lineWidth = 2;
    ellipse(ctx, 0, 0, 17, 5.5); ctx.stroke();
  }

  const hover = Math.sin(time * 4) * 3;
  ctx.translate(0, -10 + hover);

  const segments = 7;
  ctx.shadowColor = '#00d2d3';
  ctx.shadowBlur = 8;

  for (let i = segments; i >= 0; i--) {
    const t = i / segments;
    const segX = -18 * t + 8;
    const segY = Math.sin(time * 8 - i * 0.8) * 3.5;
    const r = 4.2 * (1 - t * 0.45);

    ctx.fillStyle = i % 2 === 0 ? '#1b1464' : '#0984e3';
    ctx.strokeStyle = '#00cec9';
    ctx.lineWidth = 1;
    ellipse(ctx, segX, segY, r, r * 0.85); ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#fed330';
    ellipse(ctx, segX, segY + r * 0.4, r * 0.6, r * 0.3); ctx.fill();
  }

  const headX = 9;
  const headY = Math.sin(time * 8) * 1.5;
  ctx.fillStyle = '#1b1464';
  ctx.strokeStyle = '#00cec9';
  ellipse(ctx, headX, headY, 6, 4.5); ctx.fill(); ctx.stroke();

  ctx.fillStyle = '#00ffff';
  ellipse(ctx, headX + 2, headY - 1.2, 1.8, 1.8); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ellipse(ctx, headX + 2.2, headY - 1.2, 0.8, 0.8); ctx.fill();

  ctx.shadowBlur = 0;

  ctx.strokeStyle = '#00ffff';
  ctx.lineWidth = 1.4;
  for (let sp = 0; sp < 3; sp++) {
    const angle = (time * 6 + sp * 2.1) % (Math.PI * 2);
    const dist = 9 + Math.sin(time * 12 + sp) * 4;
    const px = Math.cos(angle) * dist;
    const py = Math.sin(angle) * dist;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + 3, py - 3);
    ctx.lineTo(px + 1, py - 6);
    ctx.stroke();
  }
  ctx.restore();
}

function drawArmadillo(ctx, x, y, o) {
  const s = o.scale || 1;
  const time = o.time || 0;
  const moving = o.moving;
  const facing = o.facing || 1;
  const shellActive = o.shellActive;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * facing, s);

  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ellipse(ctx, 0, 0, 14, 5); ctx.fill();
  if (o.team) {
    ctx.strokeStyle = TEAM_COLORS[o.team];
    ctx.lineWidth = 2;
    ellipse(ctx, 0, 0, 16, 6); ctx.stroke();
  }

  if (shellActive) {
    ctx.translate(0, -9);
    ctx.strokeStyle = 'rgba(243, 156, 18, 0.75)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 3]);
    ellipse(ctx, 0, 0, 13, 13); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#a0522d';
    ctx.strokeStyle = '#5a2d0c';
    ctx.lineWidth = 1.5;
    ellipse(ctx, 0, 0, 10, 10); ctx.fill(); ctx.stroke();

    for (let b = -6; b <= 6; b += 3) {
      ctx.beginPath();
      ctx.arc(0, 0, 9.5, (b - 2) * 0.2, (b + 2) * 0.2 + Math.PI);
      ctx.strokeStyle = '#d35400';
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  const step = moving ? Math.sin(time * 12) : 0;
  ctx.strokeStyle = '#5a2d0c';
  ctx.fillStyle = '#d35400';
  ctx.lineWidth = 1;

  [[-7, step], [-3, -step], [4, -step], [8, step]].forEach(([lx, phase]) => {
    const up = Math.max(0, phase) * 2;
    ctx.fillRect(lx - 2, -6 - up, 3.5, 6);
    ctx.strokeRect(lx - 2, -6 - up, 3.5, 6);
  });

  ctx.fillStyle = '#cd6133';
  ctx.strokeStyle = '#5a2d0c';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, -8, 12, Math.PI, 0);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  ctx.strokeStyle = '#873600';
  ctx.lineWidth = 1.2;
  for (let bx = -8; bx <= 8; bx += 3.5) {
    ctx.beginPath();
    ctx.moveTo(bx, -8); ctx.lineTo(bx, -18);
    ctx.stroke();
  }

  const headX = 11;
  const headY = -8;
  ctx.fillStyle = '#e59866';
  ctx.strokeStyle = '#5a2d0c';
  ctx.beginPath();
  ctx.moveTo(headX - 2, headY - 4);
  ctx.lineTo(headX + 7, headY + 1);
  ctx.lineTo(headX - 2, headY + 3);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  ctx.fillStyle = '#111';
  ellipse(ctx, headX + 1, headY - 1, 1, 1); ctx.fill();
  ctx.fillStyle = '#e59866';
  ellipse(ctx, headX - 2, headY - 5, 1.8, 3); ctx.fill(); ctx.stroke();

  ctx.strokeStyle = '#873600';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-11, -8); ctx.lineTo(-18, -4); ctx.stroke();

  ctx.restore();
}

function drawFalcon(ctx, x, y, o) {
  const s = o.scale || 1;
  const time = o.time || 0;
  const facing = o.facing || 1;
  const lift = o.lift !== undefined ? o.lift : 22;
  const diving = o.diving;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * facing, s);

  const shadowScale = Math.max(0.3, 1 - lift / 40);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ellipse(ctx, 0, 0, 14 * shadowScale, 4.5 * shadowScale); ctx.fill();
  if (o.team) {
    ctx.strokeStyle = TEAM_COLORS[o.team];
    ctx.lineWidth = 2;
    ellipse(ctx, 0, 0, 16, 5.5); ctx.stroke();
  }

  ctx.translate(0, -lift);

  const flap = Math.sin(time * 16);
  ctx.fillStyle = '#4b382a';
  ctx.strokeStyle = '#2d1e12';
  ctx.lineWidth = 1;

  if (diving) {
    ctx.beginPath();
    ctx.moveTo(0, -10); ctx.lineTo(-14, -4); ctx.lineTo(6, -8);
    ctx.fill(); ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.ellipse(-2, -14, 5, 14, -0.4 + flap * 0.5, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  }

  ctx.fillStyle = '#6e5440';
  ellipse(ctx, 0, -10, 10, 6.5); ctx.fill(); ctx.stroke();

  ctx.fillStyle = '#ecf0f1';
  ellipse(ctx, 3, -8, 5, 4); ctx.fill();
  ctx.strokeStyle = '#4b382a';
  ctx.lineWidth = 0.8;
  for (let c = -2; c <= 4; c += 2) {
    ctx.beginPath(); ctx.moveTo(c, -10); ctx.lineTo(c + 2, -6); ctx.stroke();
  }

  ctx.fillStyle = '#4b382a';
  ctx.beginPath();
  ctx.moveTo(-9, -10); ctx.lineTo(-18, -13); ctx.lineTo(-17, -7); ctx.closePath();
  ctx.fill(); ctx.stroke();

  const headX = 8;
  const headY = -14;
  ctx.fillStyle = '#4b382a';
  ctx.strokeStyle = '#2d1e12';
  ellipse(ctx, headX, headY, 5, 4.5); ctx.fill(); ctx.stroke();

  ctx.fillStyle = '#f1c40f';
  ellipse(ctx, headX + 1.5, headY - 1, 1.8, 1.8); ctx.fill();
  ctx.fillStyle = '#111';
  ellipse(ctx, headX + 2, headY - 1, 0.9, 0.9); ctx.fill();

  ctx.fillStyle = '#f39c12';
  ctx.beginPath();
  ctx.moveTo(headX + 4, headY - 2);
  ctx.lineTo(headX + 9, headY + 1);
  ctx.lineTo(headX + 4, headY + 3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2d1e12';
  ctx.beginPath();
  ctx.moveTo(headX + 7, headY); ctx.lineTo(headX + 9, headY + 1); ctx.lineTo(headX + 7, headY + 2);
  ctx.fill();

  ctx.strokeStyle = '#f1c40f';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -4); ctx.lineTo(2, 0); ctx.lineTo(5, -1);
  ctx.stroke();

  ctx.restore();
}

function drawBadger(ctx, x, y, o) {
  const s = o.scale || 1;
  const time = o.time || 0;
  const moving = o.moving;
  const facing = o.facing || 1;
  const raging = o.raging;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * facing, s);

  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ellipse(ctx, 0, 0, 14, 5); ctx.fill();
  if (o.team) {
    ctx.strokeStyle = TEAM_COLORS[o.team];
    ctx.lineWidth = 2;
    ellipse(ctx, 0, 0, 16, 6); ctx.stroke();
  }

  if (raging) {
    ctx.shadowColor = '#e74c3c';
    ctx.shadowBlur = 10;
    ctx.fillStyle = 'rgba(231, 76, 60, 0.6)';
    for (let f = 0; f < 3; f++) {
      const fx = Math.sin(time * 12 + f * 2) * 12;
      const fy = -10 + Math.cos(time * 14 + f * 2) * 7;
      ellipse(ctx, fx, fy, 2, 3); ctx.fill();
    }
  }

  const step = moving ? Math.sin(time * 14) : 0;

  ctx.fillStyle = '#1e272e';
  ctx.strokeStyle = '#050505';
  ctx.lineWidth = 1;
  [[-8, step], [-4, -step], [4, -step], [8, step]].forEach(([lx, phase]) => {
    const up = Math.max(0, phase) * 2.5;
    ctx.fillRect(lx - 2, -7 - up, 4, 7);
    ctx.strokeRect(lx - 2, -7 - up, 4, 7);
    ctx.fillStyle = '#dcdde1';
    ctx.fillRect(lx + 1, -1 - up, 2, 1.5);
    ctx.fillStyle = '#1e272e';
  });

  ctx.fillStyle = '#1e272e';
  ellipse(ctx, 0, -11, 13, 7); ctx.fill(); ctx.stroke();

  ctx.fillStyle = '#f5f6fa';
  ctx.strokeStyle = '#dcdde1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, -14, 12.5, 4.5, 0, Math.PI, 0);
  ctx.fill(); ctx.stroke();

  const headX = 11 + (o.attack ? 2.5 : 0);
  const headY = -12;
  ctx.fillStyle = '#1e272e';
  ctx.strokeStyle = '#050505';
  ellipse(ctx, headX, headY, 5.5, 5); ctx.fill(); ctx.stroke();

  ctx.fillStyle = '#f5f6fa';
  ellipse(ctx, headX - 1, headY - 3, 4, 2.5); ctx.fill();

  ctx.fillStyle = '#1e272e';
  ellipse(ctx, headX + 3.5, headY + 1, 3, 2.2); ctx.fill();
  ctx.fillStyle = '#111';
  ellipse(ctx, headX + 5.5, headY + 0.5, 1.2, 1); ctx.fill();

  ctx.fillStyle = raging ? '#ff3838' : '#111';
  ellipse(ctx, headX + 1.5, headY - 1, raging ? 1.8 : 1.2, raging ? 1.8 : 1.2); ctx.fill();

  ctx.fillStyle = '#1e272e';
  ellipse(ctx, headX - 3, headY - 3.5, 2, 2); ctx.fill();

  ctx.strokeStyle = '#1e272e';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(-12, -13); ctx.lineTo(-18, -17); ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawGorilla(ctx, x, y, o) {
  const s = o.scale || 1;
  const time = o.time || 0;
  const moving = o.moving;
  const facing = o.facing || 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * facing, s);

  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ellipse(ctx, 0, 0, 18, 6); ctx.fill();
  if (o.team) {
    ctx.strokeStyle = TEAM_COLORS[o.team];
    ctx.lineWidth = 2.2;
    ellipse(ctx, 0, 0, 20, 7.5); ctx.stroke();
  }

  const step = moving ? Math.sin(time * 9) : 0;
  const bob = moving ? Math.abs(step) * 1.5 : 0;
  ctx.translate(0, -bob);

  ctx.fillStyle = '#2d3436';
  ctx.strokeStyle = '#1e272e';
  ctx.lineWidth = 1.2;
  ctx.fillRect(-10, -9 + step * 3, 5, 9 - step * 3);
  ctx.strokeRect(-10, -9 + step * 3, 5, 9 - step * 3);

  ctx.fillStyle = '#2d3436';
  ellipse(ctx, 0, -17, 16, 12); ctx.fill(); ctx.stroke();

  ctx.fillStyle = '#b2bec3';
  ellipse(ctx, -5, -17, 8, 9); ctx.fill();

  const armSwing = moving ? -step * 4 : 0;
  ctx.fillStyle = '#2d3436';
  ctx.fillRect(7, -18 + armSwing, 6, 18 - armSwing);
  ctx.strokeRect(7, -18 + armSwing, 6, 18 - armSwing);
  ellipse(ctx, 10, 0, 4, 3); ctx.fill(); ctx.stroke();

  ctx.fillStyle = '#1e272e';
  ellipse(ctx, 5, -16, 4.5, 4.5); ctx.fill();
  ellipse(ctx, 5, -10, 4, 4); ctx.fill();

  const headX = 11 + (o.attack ? 3 : 0);
  const headY = -24;
  ctx.fillStyle = '#2d3436';
  ctx.strokeStyle = '#1e272e';
  ctx.beginPath();
  ctx.arc(headX, headY, 7.5, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();

  ctx.fillStyle = '#2d3436';
  ellipse(ctx, headX - 1, headY - 6, 4.5, 3.5); ctx.fill();

  ctx.fillStyle = '#1e272e';
  ellipse(ctx, headX + 2, headY, 5, 4.5); ctx.fill();

  ctx.fillStyle = '#f39c12';
  ellipse(ctx, headX + 2, headY - 2, 1.5, 1.5); ctx.fill();
  ctx.fillStyle = '#111';
  ellipse(ctx, headX + 2.3, headY - 2, 0.8, 0.8); ctx.fill();

  ctx.fillStyle = '#111';
  ellipse(ctx, headX + 4.5, headY + 1, 1, 1.2); ctx.fill();
  ellipse(ctx, headX + 3.2, headY + 1, 1, 1.2); ctx.fill();

  ctx.restore();
}

function drawHpBar(ctx, x, y, w, ratio, color) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 5);
  ctx.fillStyle = color;
  ctx.fillRect(x - w / 2, y, w * ratio, 3);
}

// Towers: side towers = silos, king = big barn. Roofs show the team color.
function drawTower(ctx, t) {
  const color = TEAM_COLORS[t.team];
  const { x, y } = t;

  if (t.dead) {
    ctx.fillStyle = '#8a8a8a';
    for (let i = 0; i < 6; i++) {
      ellipse(ctx, x - 12 + (i % 3) * 12, y - 2 + Math.floor(i / 3) * 7, 7, 5); ctx.fill();
    }
    ctx.fillStyle = '#7a5028';
    ctx.fillRect(x - 14, y - 8, 22, 4);
    return;
  }

  ctx.strokeStyle = '#4a2c12';
  ctx.lineWidth = 2;

  if (t.kind === 'princess') {
    // Stone base
    ctx.fillStyle = '#9d9d9d';
    ellipse(ctx, x, y + 4, 20, 9); ctx.fill(); ctx.stroke();
    // Metal silo cylinder with bands
    ctx.fillStyle = '#d4d4cc';
    ctx.fillRect(x - 14, y - 44, 28, 48); ctx.strokeRect(x - 14, y - 44, 28, 48);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillRect(x - 9, y - 44, 5, 48);
    ctx.strokeStyle = '#8a8a80';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let by = y - 34; by < y + 4; by += 10) { ctx.moveTo(x - 14, by); ctx.lineTo(x + 14, by); }
    ctx.stroke();
    // Hatch
    ctx.fillStyle = '#4a3a2a';
    ctx.fillRect(x + 2, y - 30, 7, 9);
    // Dome roof
    ctx.strokeStyle = '#4a2c12';
    ctx.lineWidth = 2;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y - 44, 15, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    drawFlag(ctx, x, y - 59, color);
    drawHpBar(ctx, x, y - 80, 40, t.hp / t.maxHp, color);
  } else {
    // Stone base
    ctx.fillStyle = '#9d9d9d';
    ellipse(ctx, x, y + 6, 34, 12); ctx.fill(); ctx.stroke();
    // Barn body
    ctx.fillStyle = '#c68a4c';
    ctx.fillRect(x - 28, y - 28, 56, 36); ctx.strokeRect(x - 28, y - 28, 56, 36);
    // Barn door with white X
    ctx.fillStyle = '#7a4a22';
    ctx.fillRect(x - 11, y - 14, 22, 22);
    ctx.strokeStyle = '#fff6e0';
    ctx.strokeRect(x - 11, y - 14, 22, 22);
    ctx.beginPath();
    ctx.moveTo(x - 11, y - 14); ctx.lineTo(x + 11, y + 8);
    ctx.moveTo(x + 11, y - 14); ctx.lineTo(x - 11, y + 8);
    ctx.stroke();
    // Roof
    ctx.strokeStyle = '#4a2c12';
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - 33, y - 26); ctx.lineTo(x - 24, y - 44); ctx.lineTo(x, y - 54);
    ctx.lineTo(x + 24, y - 44); ctx.lineTo(x + 33, y - 26); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Hay loft window
    ctx.fillStyle = '#ecc75a';
    ctx.fillRect(x - 6, y - 44, 12, 10); ctx.strokeRect(x - 6, y - 44, 12, 10);
    drawFlag(ctx, x, y - 54, color);
    drawHpBar(ctx, x, y - 76, 56, t.hp / t.maxHp, color);
  }

  // HP number
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 9px Trebuchet MS, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(Math.ceil(t.hp), x, t.kind === 'king' ? y - 79 : y - 83);
}

function drawFlag(ctx, x, y, color) {
  ctx.strokeStyle = '#4a2c12';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 14); ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(x, y - 14); ctx.lineTo(x + 10, y - 11); ctx.lineTo(x, y - 8); ctx.closePath(); ctx.fill();
}

function drawCrown(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - 8, y + 6); ctx.lineTo(x - 9, y - 5); ctx.lineTo(x - 4, y);
  ctx.lineTo(x, y - 7); ctx.lineTo(x + 4, y); ctx.lineTo(x + 9, y - 5); ctx.lineTo(x + 8, y + 6);
  ctx.closePath(); ctx.fill(); ctx.stroke();
}

function drawEgg(ctx, x, y) {
  ctx.fillStyle = '#fffaf0';
  ctx.strokeStyle = '#8a7a6a';
  ctx.lineWidth = 1;
  ellipse(ctx, x, y, 3, 4); ctx.fill(); ctx.stroke();
}

// ---------- Spells (cards that are not animals) ----------

// A spell on its way down. spell = { kind, x, y, radius, t, fromX, fromY, team }
// t goes 0 -> 1, at t = 1 it hits the ground at (x, y).
// Optional extras (the card previews use them):
//   flat   squashes the ground circle (1 = real circle, the previews use about 0.3 for their side view)
//   fromH  how high above (fromX, fromY) the mud ball starts (default 38 = the barn's hay loft window)
function drawSpell(ctx, spell, time) {
  const t = Math.max(0, Math.min(1, spell.t));
  const flat = spell.flat || 1;
  drawSpellCircle(ctx, spell.x, spell.y, spell.radius, spell.team, flat, 0.4 + 0.4 * t);
  if (spell.kind === 'cornRain') drawCornRainFalling(ctx, spell, t, flat);
  else if (spell.kind === 'hayBale') drawHayBaleFalling(ctx, spell, t, time || 0);
  else if (spell.kind === 'mudBall') drawMudBallFlying(ctx, spell, t);
}

// What is left right after a spell lands, for about half a second.
// impact = { kind, x, y, radius, t } with t going 0 -> 1 (and the optional flat, like drawSpell)
function drawSpellImpact(ctx, impact) {
  const t = Math.max(0, Math.min(1, impact.t));
  const flat = impact.flat || 1;
  if (impact.kind === 'cornRain') drawCornRainImpact(ctx, impact, t, flat);
  else if (impact.kind === 'hayBale') drawHayBaleImpact(ctx, impact, t, flat);
  else if (impact.kind === 'mudBall') drawMudBallImpact(ctx, impact, t, flat);
}

// Repeatable "random" number between 0 and 1: the same n always gives the same number,
// so falling kernels and flying straw don't jump around from frame to frame.
function spellRand(n) {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}

// Faint circle on the ground where a spell lands. The dashed outline has the team color,
// so you can tell whose spell it is.
function drawSpellCircle(ctx, x, y, radius, team, flat, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(255,248,220,0.25)';
  ellipse(ctx, x, y, radius, radius * flat); ctx.fill();
  ctx.strokeStyle = TEAM_COLORS[team] || '#fff6e0';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.stroke();
  ctx.restore();
}

// --- Corn Rain ---

// Every kernel of a Corn Rain: its landing spot inside the circle, how high it falls from,
// and when it starts / lands (so they come down as a shower, not all at the same moment)
function cornRainKernels(x, y, radius, flat) {
  const count = Math.round(10 + radius * 0.4);   // radius 60 -> 34 kernels
  const seed = Math.round(x * 3 + y * 7);
  const kernels = [];
  for (let i = 0; i < count; i++) {
    const n = seed + i * 5;
    const angle = spellRand(n) * Math.PI * 2;
    const dist = Math.sqrt(spellRand(n + 1)) * radius * 0.92;   // the square root spreads them evenly
    kernels.push({
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist * flat,
      height: 100 + spellRand(n + 2) * 70,
      start: spellRand(n + 3) * 0.3,
      land: 0.8 + spellRand(n + 4) * 0.2,
      spin: angle,
    });
  }
  return kernels;
}

function drawCornRainFalling(ctx, spell, t, flat) {
  cornRainKernels(spell.x, spell.y, spell.radius, flat).forEach(k => {
    if (t < k.start) return;
    const p = Math.min(1, (t - k.start) / (k.land - k.start));   // 0 = high up, 1 = on the ground
    const up = k.height * (1 - p);
    // They come in a little slanted, like rain in the wind
    const kx = k.x - up * 0.25;
    const ky = k.y - up;

    // Tiny shadow on the ground, darker as the kernel gets close
    ctx.fillStyle = `rgba(0,0,0,${0.25 * p})`;
    ellipse(ctx, k.x, k.y, 1.8, 0.8); ctx.fill();

    ctx.globalAlpha = Math.min(1, p * 5);   // fades in high up in the sky
    if (p < 1) {
      // Short streak behind a falling kernel
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(kx - 2, ky - 9); ctx.lineTo(kx - 0.6, ky - 4); ctx.stroke();
    }
    drawCornKernel(ctx, kx, ky, p < 1 ? k.spin + t * 9 : k.spin, 1);
    ctx.globalAlpha = 1;
  });
}

function drawCornRainImpact(ctx, impact, t, flat) {
  const { x, y, radius } = impact;

  // Light dust ring
  const ring = radius * (0.75 + 0.35 * t);
  ctx.strokeStyle = `rgba(240,225,185,${0.7 * (1 - t)})`;
  ctx.lineWidth = 1 + 4 * (1 - t);
  ellipse(ctx, x, y, ring, ring * flat); ctx.stroke();

  // The kernels lie where they landed (some with a little dust puff) and fade away
  ctx.globalAlpha = 1 - t;
  cornRainKernels(x, y, radius, flat).forEach((k, i) => {
    if (i % 4 === 0) {
      const pr = 2 + 4 * t;
      ctx.fillStyle = 'rgba(235,220,180,0.7)';
      ellipse(ctx, k.x, k.y - 1 - 3 * t, pr, pr * 0.7); ctx.fill();
    }
    drawCornKernel(ctx, k.x, k.y, k.spin, 1);
  });
  ctx.globalAlpha = 1;
}

// One corn kernel: a small yellow "tooth" (round top, narrow bottom) with a light spot
function drawCornKernel(ctx, x, y, angle, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(s, s);
  ctx.fillStyle = '#ffd23f';
  ctx.strokeStyle = '#a07a12';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-2.2, -0.8);
  ctx.quadraticCurveTo(0, -3.8, 2.2, -0.8);   // round top
  ctx.lineTo(1, 2.4);
  ctx.quadraticCurveTo(0, 3.2, -1, 2.4);      // narrow bottom
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff3c4';
  ellipse(ctx, -0.6, -1.2, 0.7, 0.9); ctx.fill();
  ctx.restore();
}

// Corn cob with two green husk leaves (card portrait). (x, y) = middle of the cob, angle tilts it
function drawCornCob(ctx, x, y, s, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(s, s);
  ctx.lineWidth = 1;

  // Stem at the bottom
  ctx.fillStyle = '#9ab050';
  ctx.strokeStyle = '#3f7a2a';
  ctx.beginPath(); ctx.rect(-2.2, 14, 4.4, 5); ctx.fill(); ctx.stroke();

  // Yellow cob with rows of kernels (kept inside the cob)
  ctx.fillStyle = '#ffd23f';
  ellipse(ctx, 0, -3, 7, 17); ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#ffe27a';
  ctx.strokeStyle = '#d9a21e';
  ctx.lineWidth = 0.7;
  for (let row = 0; row < 11; row++) {
    const ky = -19 + row * 3.3;
    for (let col = -2; col <= 2; col++) {
      ellipse(ctx, col * 3 + (row % 2) * 1.5, ky, 1.5, 1.4); ctx.fill(); ctx.stroke();
    }
  }
  ctx.restore();
  ctx.strokeStyle = '#a07a12';
  ctx.lineWidth = 1;
  ellipse(ctx, 0, -3, 7, 17); ctx.stroke();

  // Husk leaves hugging the bottom half, their tips peeling outwards
  ctx.fillStyle = '#7cc04a';
  ctx.strokeStyle = '#3f7a2a';
  [-1, 1].forEach(side => {
    ctx.beginPath();
    ctx.moveTo(0, 16);
    ctx.quadraticCurveTo(side * 12, 8, side * 8.5, -9);   // outer edge up to the tip
    ctx.quadraticCurveTo(side * 3.5, 2, side * 1, 16);    // inner edge back down
    ctx.closePath(); ctx.fill(); ctx.stroke();
  });
  ctx.restore();
}

// --- Hay Bale ---

function drawHayBaleFalling(ctx, spell, t, time) {
  const s = spell.radius / 30;           // radius 30 = normal size bale
  const drop = 120 * (1 - t * t);        // falls faster and faster, lands at t = 1
  const bottom = spell.y + 4 * s - drop; // (the bale's front edge sits a little below the middle)

  // Shadow on the ground: small and faint high up, big and dark just before landing
  const grow = 0.3 + 0.7 * t;
  ctx.fillStyle = `rgba(0,0,0,${0.1 + 0.2 * t})`;
  ellipse(ctx, spell.x, spell.y + 2 * s, 20 * s * grow, 6 * s * grow); ctx.fill();

  // Wind lines above the bale (longer as it speeds up)
  ctx.strokeStyle = `rgba(255,255,255,${0.3 + 0.4 * t})`;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  [-10, 0, 10].forEach((lx, i) => {
    const top = bottom - 32 * s - (i % 2) * 4;
    ctx.moveTo(spell.x + lx * s, top);
    ctx.lineTo(spell.x + lx * s, top - (8 + 10 * t));
  });
  ctx.stroke();
  ctx.lineCap = 'butt';

  // The bale wobbles a little while it falls
  drawBigHayBale(ctx, spell.x, bottom, s, 1, Math.sin(time * 7) * 0.06 * (1 - t));
}

function drawHayBaleImpact(ctx, impact, t, flat) {
  const { x, y, radius } = impact;
  const s = radius / 30;

  // Dust ring rushing outwards (that's the push that knocks animals back)
  const ring = radius * (0.5 + 0.9 * t);
  ctx.strokeStyle = `rgba(222,200,150,${0.8 * (1 - t)})`;
  ctx.lineWidth = 2 + 5 * (1 - t);
  ellipse(ctx, x, y, ring, ring * flat); ctx.stroke();

  // Soft dust clouds around the bale
  ctx.fillStyle = `rgba(230,212,170,${0.75 * (1 - t)})`;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.3;
    const d = radius * (0.45 + 0.6 * t);
    const r = (4 + 5 * t) * s;
    ellipse(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * flat - 3 * s, r, r * 0.8); ctx.fill();
  }

  // The bale squashes for a moment when it lands, then fades away
  const bump = Math.sin(Math.min(1, t / 0.25) * Math.PI);
  ctx.globalAlpha = t < 0.4 ? 1 : 1 - (t - 0.4) / 0.6;
  drawBigHayBale(ctx, x, y + 4 * s, s, 1 - 0.22 * bump, 0);

  // Straw bits fly out in little arcs
  ctx.fillStyle = '#e3b04b';
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + spellRand(i) * 0.5;
    const d = radius * (0.2 + t) * (0.7 + 0.5 * spellRand(i + 20));
    const up = Math.sin(Math.min(1, t * 1.2) * Math.PI) * (12 + 10 * spellRand(i + 40)) + 6 * (1 - t);
    ctx.globalAlpha = 1 - t;
    ctx.save();
    ctx.translate(x + Math.cos(a) * d, y + Math.sin(a) * d * flat - up);
    ctx.rotate(a + t * 8);
    ellipse(ctx, 0, 0, 3.5, 1.2); ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

// Big square hay bale seen a little from above. (x, y) = bottom middle of its front side.
// s = size, squash < 1 flattens it (landing bump), tilt = rotation
function drawBigHayBale(ctx, x, y, s, squash, tilt) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.scale(s * (2 - squash), s * squash);   // flatter = also a bit wider
  ctx.strokeStyle = '#a8801f';
  ctx.lineWidth = 1.2;
  ctx.lineJoin = 'round';

  // Top (lighter, the sun shines on it) and front
  ctx.fillStyle = '#f7dc84';
  ctx.beginPath();
  ctx.moveTo(-17, -18); ctx.lineTo(-13, -26); ctx.lineTo(13, -26); ctx.lineTo(17, -18);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ecc75a';
  ctx.beginPath(); ctx.rect(-17, -18, 34, 18); ctx.fill(); ctx.stroke();

  // Straw texture: short strokes
  ctx.strokeStyle = '#d0a53c';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  [[-13, -13], [-2, -6], [3, -14], [11, -8], [-12, -5], [12, -15], [-8, -23], [4, -22]].forEach(([sx, sy]) => {
    ctx.moveTo(sx, sy); ctx.lineTo(sx + 3, sy + 1);
  });
  ctx.stroke();

  // Two binding strings over the front and the top
  ctx.strokeStyle = '#8a5a1a';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  [-1, 1].forEach(side => {
    ctx.moveTo(side * 7, 0); ctx.lineTo(side * 7, -18); ctx.lineTo(side * 5.5, -26);
  });
  ctx.stroke();

  // A few loose straws sticking out
  ctx.strokeStyle = '#d9a441';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-17, -4); ctx.lineTo(-20, -2);
  ctx.moveTo(-17, -12); ctx.lineTo(-20.5, -13);
  ctx.moveTo(17, -9); ctx.lineTo(20.5, -8);
  ctx.moveTo(-6, -26); ctx.lineTo(-7, -29);
  ctx.moveTo(10, -26); ctx.lineTo(11.5, -28.5);
  ctx.stroke();
  ctx.restore();
}

// --- Mud Ball ---

function drawMudBallFlying(ctx, spell, t) {
  // Thrown from our barn: (fromX, fromY) is the barn on the ground, fromH how high up the ball starts
  const fromX = spell.fromX !== undefined ? spell.fromX : spell.x;
  const fromY = spell.fromY !== undefined ? spell.fromY : spell.y + 200 * (spell.team || 1);
  const fromH = spell.fromH !== undefined ? spell.fromH : 38;
  const dist = Math.hypot(spell.x - fromX, spell.y - fromY);
  const arc = Math.min(120, 20 + dist * 0.3);   // longer throws fly higher

  // Where the ball is at time tt: the spot on the ground below it + its height above that spot
  const at = tt => ({
    x: fromX + (spell.x - fromX) * tt,
    y: fromY + (spell.y - fromY) * tt,
    h: fromH * (1 - tt) + Math.sin(tt * Math.PI) * arc,
  });
  const ball = at(t);

  // Shadow: the higher the ball, the smaller and fainter
  const sh = Math.max(0.35, 1 - ball.h / 150);
  ctx.fillStyle = `rgba(0,0,0,${0.3 * sh})`;
  ellipse(ctx, ball.x, ball.y, 8 * sh, 3 * sh); ctx.fill();

  // A few mud drops trail behind the ball
  ctx.fillStyle = '#6a4424';
  for (let i = 1; i <= 3; i++) {
    const tt = t - i * 0.04;
    if (tt <= 0) continue;
    const d = at(tt);
    const r = 2.6 - i * 0.6;
    ellipse(ctx, d.x, d.y - d.h + i * 1.5, r, r); ctx.fill();
  }

  drawMudBall(ctx, ball.x, ball.y - ball.h, 7, t * 10);
}

function drawMudBallImpact(ctx, impact, t, flat) {
  const { x, y, radius } = impact;
  const grow = 1 - Math.pow(1 - Math.min(1, t / 0.2), 2);   // the splat spreads out very fast
  ctx.globalAlpha = t < 0.5 ? 1 : 1 - (t - 0.5) / 0.5;
  drawMudPuddle(ctx, x, y, radius * 0.75, flat, grow, Math.round(x + y));

  // Drips fly out in little arcs and land around the puddle
  const p = Math.min(1, t / 0.6);
  ctx.fillStyle = '#6a4424';
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + 0.4;
    const d = radius * (0.3 + 0.7 * p) * (0.8 + 0.3 * spellRand(i + 50));
    const up = Math.sin(p * Math.PI) * (10 + 8 * spellRand(i + 60));
    const r = 2.4 * (1 - 0.4 * p);
    ellipse(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * flat - up, r, p < 1 ? r * 1.2 : r * 0.6); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// Round, lumpy mud ball with a wet shine. r = size, spin turns the lumps
function drawMudBall(ctx, x, y, r, spin) {
  ctx.save();
  ctx.translate(x, y);
  ctx.save();
  ctx.rotate(spin);
  ctx.fillStyle = '#7a5230';
  ctx.strokeStyle = '#4a2e14';
  ctx.lineWidth = 1;
  // Lumps around the edge first (with outline), then the body covers their inner half
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ellipse(ctx, Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72, r * 0.42, r * 0.42); ctx.fill(); ctx.stroke();
  }
  ellipse(ctx, 0, 0, r * 0.88, r * 0.88); ctx.fill();
  // Darker spots
  ctx.fillStyle = '#5e3c1e';
  ellipse(ctx, r * 0.3, r * 0.2, r * 0.22, r * 0.18); ctx.fill();
  ellipse(ctx, -r * 0.35, r * 0.35, r * 0.15, r * 0.13); ctx.fill();
  ctx.restore();
  // Wet shine (this one doesn't turn)
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ellipse(ctx, -r * 0.35, -r * 0.38, r * 0.25, r * 0.16); ctx.fill();
  ctx.restore();
}

// Brown mud splat on the ground: a big round blob with smaller blobs around it.
// r = size, flat squashes it (previews), grow 0..1 = how far it has spread, seed = its shape
function drawMudPuddle(ctx, x, y, r, flat, grow, seed) {
  const blobs = [[0, 0, 0.55]];   // [angle, distance, size] of each blob, the first one is the middle
  for (let i = 0; i < 8; i++) {
    blobs.push([
      (i / 8) * Math.PI * 2 + spellRand(seed + i) * 0.5,
      0.45 + 0.3 * spellRand(seed + i + 10),
      0.14 + 0.1 * spellRand(seed + i + 20),
    ]);
  }
  const trace = ([a, d, size]) => {
    const k = r * grow;
    ellipse(ctx, x + Math.cos(a) * d * k, y + Math.sin(a) * d * k * flat, size * k, size * k * flat);
  };
  // Outline trick: stroke every blob with a thick dark line, then fill them all on top,
  // so only the outer edge of the whole splat stays dark
  ctx.strokeStyle = '#4a2e14';
  ctx.lineWidth = 2;
  blobs.forEach(b => { trace(b); ctx.stroke(); });
  ctx.fillStyle = '#7a5230';
  blobs.forEach(b => { trace(b); ctx.fill(); });
  // Wet shine
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ellipse(ctx, x - r * 0.18 * grow, y - r * 0.18 * grow * flat, r * 0.22 * grow, r * 0.09 * grow * flat); ctx.fill();
}

// Sticky mud at the feet of a slowed animal. (x, y) = feet position
function drawSlowedMark(ctx, x, y, time) {
  ctx.save();
  ctx.translate(x, y);

  // Flat puddle with two small splashes next to it
  ctx.fillStyle = 'rgba(106,68,36,0.8)';
  ellipse(ctx, 0, 0.5, 8, 2.8); ctx.fill();
  ellipse(ctx, -8, 1.8, 2.2, 1); ctx.fill();
  ellipse(ctx, 8.5, -0.2, 1.8, 0.9); ctx.fill();

  // Sticky strings of mud stretching up from the puddle, wobbling
  const wob = Math.sin(time * 5) * 0.8;
  ctx.strokeStyle = 'rgba(106,68,36,0.85)';
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-4, 0); ctx.quadraticCurveTo(-4.5 + wob, -3, -3.5, -5.5 + wob * 0.5);
  ctx.moveTo(3, 0); ctx.quadraticCurveTo(3.5 - wob, -2.5, 2.5, -4.5 - wob * 0.5);
  ctx.stroke();

  // A mud bubble slowly swells and pops, again and again
  const b = (time * 0.9) % 1;
  if (b < 0.85) {
    const r = 0.6 + b * 1.8;
    ctx.fillStyle = '#8a5a30';
    ctx.strokeStyle = '#4a2e14';
    ctx.lineWidth = 0.6;
    ellipse(ctx, 5.5, -r * 0.6, r, r * 0.8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ellipse(ctx, 5.5 - r * 0.35, -r * 0.9, r * 0.3, r * 0.25); ctx.fill();
  }
  ctx.restore();
}

// Where the newer four-legged animals sit in a card portrait.
// [middle x, middle y, size] of the drawing at scale 1 (size = the bigger of width / height)
const PORTRAIT_FIT = {
  fox:    [-2.6, -11.4, 42.8],
  rabbit: [0.4, -11.2, 29.6],
  horse:  [-0.2, -14, 39.6],
  dog:    [1.8, -9.6, 38],
  goat:   [3.8, -11.8, 38],
};

// Card portrait (hand + deck)
function drawCardPortrait(canvas, cardId) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const w = canvas.width;
  const card = CARDS[cardId];

  // Spells have no animal: draw a little icon of the spell instead
  if (card.spell && !card.unit) {
    drawSpellPortrait(ctx, card.spell.kind, w, canvas.height);
    return;
  }

  const kind = card.unit.draw;
  if (kind === 'bee') {
    drawBee(ctx, w / 2 - 2, w / 2, { scale: w / 18, facing: 1, time: 0 });
  } else if (kind === 'hive') {
    drawHive(ctx, w / 2, canvas.height - 8, { scale: w / 28 });
  } else if (kind === 'wheatfield') {
    // Ripe golden field, no team border
    const fs = (w * 0.86) / 32;
    drawWheatField(ctx, w / 2, canvas.height / 2 + 4 * fs, { scale: fs, team: null, growth: 1, time: 0 });
  } else if (kind === 'goose') {
    // time 0.15 = wings up
    const gs = w / 36;
    drawGoose(ctx, w / 2 - 2.4 * gs, canvas.height / 2 + 13 * gs, { scale: gs, facing: 1, time: 0.15, hover: 0 });
  } else if (kind === 'snake') {
    drawSnake(ctx, w / 2 - 2, canvas.height - 14, { scale: w / 28, facing: 1, time: 0 });
  } else if (kind === 'frog') {
    drawFrog(ctx, w / 2, canvas.height - 12, { scale: w / 25, facing: 1, time: 0 });
  } else if (kind === 'cheetah') {
    drawCheetah(ctx, w / 2 - 2, canvas.height - 12, { scale: w / 36, facing: 1, time: 0 });
  } else if (kind === 'eel') {
    drawEel(ctx, w / 2, canvas.height / 2 + 6, { scale: w / 28, facing: 1, time: 0 });
  } else if (kind === 'armadillo') {
    drawArmadillo(ctx, w / 2, canvas.height - 12, { scale: w / 30, facing: 1, time: 0 });
  } else if (kind === 'falcon') {
    drawFalcon(ctx, w / 2, canvas.height / 2 + 12, { scale: w / 34, facing: 1, time: 0, lift: 0 });
  } else if (kind === 'badger') {
    drawBadger(ctx, w / 2, canvas.height - 12, { scale: w / 30, facing: 1, time: 0 });
  } else if (kind === 'gorilla') {
    drawGorilla(ctx, w / 2, canvas.height - 10, { scale: w / 38, facing: 1, time: 0 });
  } else if (PORTRAIT_FIT[kind]) {
    const [mx, my, size] = PORTRAIT_FIT[kind];
    const ps = (w * 0.88) / size;
    drawQuadruped(ctx, w / 2 - mx * ps, canvas.height / 2 - my * ps, { kind, scale: ps, facing: 1, time: 0 });
  } else if (QUAD_STYLES[kind]) {
    drawQuadruped(ctx, w / 2 - w / 14, canvas.height - 10, { kind, scale: w / 42, facing: 1, time: 0 });
  } else {
    drawBird(ctx, w / 2 - 2, canvas.height - 10, { kind, scale: w / 32, facing: 1, time: 0, team: null });
  }
}

// Card portrait of a spell: a cute icon, drawn in a 64 x 64 space and scaled to the canvas
function drawSpellPortrait(ctx, kind, w, h) {
  ctx.save();
  ctx.scale(w / 64, h / 64);
  ctx.lineCap = 'round';

  if (kind === 'cornRain') {
    // Corn cob with kernels raining down next to it
    drawCornCob(ctx, 25, 33, 1.15, -0.5);
    [[46, 14, 0.4], [55, 29, -0.3], [44, 41, 0.8], [54, 53, 0.1]].forEach(([kx, ky, a]) => {
      ctx.strokeStyle = 'rgba(160,122,18,0.5)';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(kx - 2.5, ky - 11); ctx.lineTo(kx - 1, ky - 6); ctx.stroke();
      drawCornKernel(ctx, kx, ky, a, 1.5);
    });
  } else if (kind === 'hayBale') {
    // Hay bale dropping out of the sky: shadow below, wind lines above
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ellipse(ctx, 32, 56, 24, 5); ctx.fill();
    ctx.strokeStyle = 'rgba(138,90,26,0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    [[20, 4], [32, 1], [44, 4]].forEach(([lx, ly]) => { ctx.moveTo(lx, ly); ctx.lineTo(lx, ly + 7); });
    ctx.stroke();
    drawBigHayBale(ctx, 32, 52, 1.3, 1, -0.08);
  } else if (kind === 'mudBall') {
    // Mud ball about to land, with a splat below and drops flying off
    drawMudPuddle(ctx, 32, 51, 24, 0.4, 1, 3);
    ctx.fillStyle = '#6a4424';
    [[10, 40, 2.2], [54, 38, 2.6], [51, 21, 1.6], [13, 25, 1.5]].forEach(([dx, dy, r]) => {
      ellipse(ctx, dx, dy, r, r * 1.2); ctx.fill();
    });
    drawMudBall(ctx, 32, 29, 14, 0.3);
  }
  ctx.restore();
}
