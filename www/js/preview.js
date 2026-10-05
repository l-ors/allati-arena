// Small looping animations on the deck cards showing what each animal does
const PREVIEW_W = 260;
const PREVIEW_H = 110;

// Only one preview animates at a time
let activePreview = null;

// setPreview(canvas, cardId) makes that canvas the animated one; setPreview(null) stops animating
function setPreview(canvas, cardId) {
  activePreview = canvas ? { canvas, ctx: canvas.getContext('2d'), cardId } : null;
}

// One animation per card id. Each loops every 4 seconds.
const PREVIEW_DRAW = {
  chickens(ctx, w, h, time) {
    const cycle = time % 4;
    const groundY = h - 22;
    const targetX = w - 45;
    const running = cycle < 1.6;
    const pecking = cycle >= 1.6 && cycle < 3.6;

    drawPreviewGround(ctx, w, h, groundY);
    drawScarecrow(ctx, targetX + (pecking ? Math.sin(time * 40) * 1.5 : 0), groundY);

    // Three chickens run in, then peck
    const runT = Math.min(cycle / 1.6, 1);
    [[0, -6], [-16, 2], [-4, 8]].forEach(([ox, oy], i) => {
      const x = -30 + runT * targetX + ox;
      const peck = pecking && ((time * 1.4 + i * 0.33) % 1) < 0.3;
      drawBird(ctx, x, groundY + oy, { kind: 'chicken', scale: 1.5, facing: 1, time: time + i, team: PLAYER, moving: running, peck });
    });

    if (pecking) drawDamagePop(ctx, targetX + 12, groundY - 50, ((cycle - 1.6) % 0.7) / 0.7, '-35');
    fadeOut(ctx, w, h, cycle);
  },

  hen(ctx, w, h, time) {
    const cycle = time % 4;
    const groundY = h - 22;
    const henX = 40;
    const scareX = w - 45;
    const crow = { x: w - 90, y: 30 + Math.sin(time * 3) * 4 };

    drawPreviewGround(ctx, w, h, groundY);
    drawScarecrow(ctx, scareX, groundY);
    drawCrow(ctx, crow.x, crow.y, time);

    // First throw at the scarecrow (ground), second at the crow (air)
    const throwT = cycle % 2;
    const target = cycle < 2 ? { x: scareX, y: groundY - 30 } : crow;
    const throwing = throwT < 0.2;
    drawBird(ctx, henX, groundY, { kind: 'hen', scale: 1.8, facing: 1, time, team: PLAYER, peck: throwing });

    if (throwT < 0.7) {
      // Egg flies in an arc
      const t = throwT / 0.7;
      const sx = henX + 14, sy = groundY - 26;
      drawEgg(ctx, sx + (target.x - sx) * t, sy + (target.y - sy) * t - Math.sin(t * Math.PI) * 25);
    } else if (throwT < 1.4) {
      // Splat + damage number
      const t = (throwT - 0.7) / 0.7;
      ctx.fillStyle = '#ffd23f';
      ellipse(ctx, target.x, target.y, 5, 4); ctx.fill();
      drawDamagePop(ctx, target.x + 10, target.y - 12, t, '-60');
    }
    fadeOut(ctx, w, h, cycle);
  },

  rooster(ctx, w, h, time) {
    const cycle = time % 4;
    const groundY = h - 22;
    const scareX = w - 45;
    const crow = { x: w - 110, y: groundY - 45 + Math.sin(time * 3) * 3 };
    const running = cycle < 1.2;
    const pecking = cycle >= 1.2 && cycle < 2.4;
    const jumping = cycle >= 2.4 && cycle < 3.6;

    drawPreviewGround(ctx, w, h, groundY);
    drawScarecrow(ctx, scareX + (pecking ? Math.sin(time * 40) * 1.5 : 0), groundY);
    drawCrow(ctx, crow.x, crow.y, time);

    // Runs to the scarecrow and pecks hard, then flutters up at the crow
    let x = -20 + Math.min(cycle / 1.2, 1) * (scareX - 5);
    let lift = 0;
    let facing = 1;
    if (jumping) {
      const t = (cycle - 2.4) / 1.2;
      x = scareX - 25 - t * 50;
      lift = Math.sin(t * Math.PI) * 30;
      facing = -1;
    } else if (cycle >= 3.6) {
      x = scareX - 75;
      facing = -1;
    }
    const peck = (pecking || jumping) && (time * 1.5 % 1) < 0.3;
    drawBird(ctx, x, groundY, { kind: 'rooster', scale: 1.7, facing, time, team: PLAYER, moving: running, peck, lift });

    if (pecking) drawDamagePop(ctx, scareX + 12, groundY - 50, ((cycle - 1.2) % 0.6) / 0.6, '-130');
    if (jumping && cycle > 2.8) drawDamagePop(ctx, crow.x, crow.y - 14, ((cycle - 2.8) % 0.8) / 0.8, '-65');
    fadeOut(ctx, w, h, cycle);
  },

  cow(ctx, w, h, time) {
    const cycle = time % 4;
    const groundY = h - 22;
    const siloX = w - 38;
    const chickX = w * 0.42;
    const walking = cycle < 2;
    const butting = cycle >= 2 && cycle < 3.6;
    const cowX = -30 + Math.min(cycle / 2, 1) * (siloX - 30 + 30);

    drawPreviewGround(ctx, w, h, groundY);

    // Enemy silo that loses health with every headbutt
    const hits = butting ? Math.floor((cycle - 2) / 0.8) + 1 : 0;
    drawMiniSilo(ctx, siloX, groundY, 1 - hits * 0.1);

    // An enemy chicken the cow simply ignores
    const near = Math.abs(cowX - chickX) < 40;
    drawBird(ctx, chickX, groundY - 8, {
      kind: 'chicken', scale: 1.5, facing: cowX < chickX ? -1 : 1, time, team: ENEMY, peck: near && (time * 2 % 1) < 0.3,
    });

    const attack = butting && ((cycle - 2) % 0.8) < 0.25;
    drawQuadruped(ctx, cowX, groundY + 4, { kind: 'cow', scale: 1.5, facing: 1, time, team: PLAYER, moving: walking, attack });

    if (butting) drawDamagePop(ctx, siloX, groundY - 60, ((cycle - 2) % 0.8) / 0.8, '-80');
    fadeOut(ctx, w, h, cycle);
  },

  bull(ctx, w, h, time) {
    const cycle = time % 4;
    const groundY = h - 22;
    const targetX = w - 45;
    const stopX = targetX - 34;

    // Walk slowly, then charge, hit hard (double), later a normal hit
    let x = stopX;
    if (cycle < 0.8) x = -30 + (cycle / 0.8) * 60;
    else if (cycle < 1.4) x = 30 + ((cycle - 0.8) / 0.6) * (stopX - 30);
    const moving = cycle < 1.4;
    const charging = cycle >= 0.8 && cycle < 1.4;
    const attack = (cycle >= 1.4 && cycle < 1.65) || (cycle >= 2.8 && cycle < 3.05);

    drawPreviewGround(ctx, w, h, groundY);
    const shaking = (cycle >= 1.4 && cycle < 1.9) || (cycle >= 2.8 && cycle < 3.2);
    drawScarecrow(ctx, targetX + (shaking ? Math.sin(time * 40) * 2 : 0), groundY);

    // Dust clouds behind a charging bull
    if (charging) {
      ctx.fillStyle = 'rgba(217,191,140,0.7)';
      for (let i = 0; i < 3; i++) { ellipse(ctx, x - 26 - i * 9, groundY - 3 - i * 2, 4 + i, 3 + i); ctx.fill(); }
    }

    drawQuadruped(ctx, x, groundY + 4, { kind: 'bull', scale: 1.5, facing: 1, time, team: PLAYER, moving, attack, charging });

    if (cycle >= 1.4 && cycle < 2.2) drawDamagePop(ctx, targetX + 12, groundY - 50, (cycle - 1.4) / 0.8, '-300');
    if (cycle >= 2.8 && cycle < 3.6) drawDamagePop(ctx, targetX + 12, groundY - 50, (cycle - 2.8) / 0.8, '-150');
    fadeOut(ctx, w, h, cycle);
  },

  bees(ctx, w, h, time) {
    const cycle = time % 4;
    const groundY = h - 22;
    const targetX = w - 45;

    drawPreviewGround(ctx, w, h, groundY);
    drawScarecrow(ctx, targetX, groundY);

    // Six bees fly in one after another; each stings once and is gone
    for (let i = 0; i < 6; i++) {
      const t = (cycle - i * 0.25) / 1.2;   // 0 = start, 1 = sting
      const y = groundY - 30 + (i % 3 - 1) * 10;
      if (t > 0 && t < 1) {
        drawBee(ctx, -10 + t * (targetX - 5), y + Math.sin(time * 8 + i) * 3, { scale: 1.6, facing: 1, time: time + i });
      } else if (t >= 1 && t < 1.5) {
        drawDamagePop(ctx, targetX + 14, y - 10, (t - 1) * 2, '-25');
      }
    }

    // Poison bubbles after the first sting
    if (cycle > 1.2) {
      ctx.fillStyle = 'rgba(120,220,60,0.85)';
      for (let i = 0; i < 3; i++) {
        const bob = (time * 1.5 + i / 3) % 1;
        ellipse(ctx, targetX - 8 + i * 8, groundY - 66 - bob * 12, 2.5, 2.5); ctx.fill();
      }
    }
    fadeOut(ctx, w, h, cycle);
  },

  beehive(ctx, w, h, time) {
    const cycle = time % 4;
    const groundY = h - 22;
    const hiveX = 60;

    const breakTime = 3.0;

    drawPreviewGround(ctx, w, h, groundY);
    if (cycle < breakTime) {
      drawHive(ctx, hiveX, groundY, { scale: 2, team: PLAYER });
      // Health slowly drains (stands for the 40 seconds)
      drawHpBar(ctx, hiveX, groundY - 50, 40, 1 - cycle / breakTime, TEAM_COLORS[PLAYER]);
    } else {
      // Broken hive: a few straw pieces
      ctx.fillStyle = '#d9a441';
      [[-10, -3], [2, -2], [12, -4], [-4, -8]].forEach(([ox, oy]) => { ellipse(ctx, hiveX + ox, groundY + oy, 5, 2.5); ctx.fill(); });
    }

    // One bee every "4 seconds", then 2 more burst out when it breaks
    const releases = [[0.3, 0], [1.6, 0], [breakTime, -12], [breakTime, 12]];
    releases.forEach(([start, oy], i) => {
      const t = (cycle - start) / 1.8;
      if (t <= 0 || t >= 1) return;
      const x = hiveX + t * (w - hiveX + 20);
      const y = groundY - 20 - t * 30 + oy + Math.sin(time * 8 + i) * 3;
      drawBee(ctx, x, y, { scale: 1.6, facing: 1, time: time + i });
    });
    fadeOut(ctx, w, h, cycle);
  },

  piglet(ctx, w, h, time) {
    drawPigPreview(ctx, w, h, time, 'piglet', 1.3, '-30');
  },

  mangalica(ctx, w, h, time) {
    drawPigPreview(ctx, w, h, time, 'mangalica', 1.6, '-65');
  },

  goose(ctx, w, h, time) {
    const cycle = time % 4;
    const groundY = h - 22;
    const scareX = w - 45;
    const gooseX = 15 + cycle * 10;               // slowly drifts in
    const hover = 36 + Math.sin(time * 3) * 3;
    const throwT = cycle % 1.6;                   // a new egg every 1.6 s
    const throwing = cycle < 3.2;

    drawPreviewGround(ctx, w, h, groundY);
    const shaking = throwing && throwT >= 0.7 && throwT < 1;
    drawScarecrow(ctx, scareX + (shaking ? Math.sin(time * 40) * 2 : 0), groundY);
    drawGoose(ctx, gooseX, groundY, { scale: 1.5, facing: 1, time, team: PLAYER, hover, attack: throwing && throwT < 0.2 });

    if (throwing && throwT < 0.7) {
      // Egg flies in an arc from the goose to the scarecrow
      const t = throwT / 0.7;
      const sx = gooseX + 12, sy = groundY - hover - 6;
      const tx = scareX, ty = groundY - 30;
      drawEgg(ctx, sx + (tx - sx) * t, sy + (ty - sy) * t - Math.sin(t * Math.PI) * 20);
    } else if (throwing) {
      // Big splat + damage number
      ctx.fillStyle = '#ffd23f';
      ellipse(ctx, scareX, groundY - 30, 6, 5); ctx.fill();
      drawDamagePop(ctx, scareX + 12, groundY - 50, (throwT - 0.7) / 0.9, '-110');
    }
    fadeOut(ctx, w, h, cycle);
  },

  fox(ctx, w, h, time) {
    const cycle = time % 4;
    const groundY = h - 22;
    const scareX = w - 45;
    const chickX = scareX - 32;
    const stopX = chickX - 30;
    const runTime = 0.7;                          // very fast run in
    const running = cycle < runTime;
    const biting = cycle >= runTime && cycle < 3.6;
    const hitT = ((cycle - runTime) % 0.7) / 0.7;
    const hits = biting ? Math.floor((cycle - runTime) / 0.7) + 1 : 0;
    const x = -30 + Math.min(cycle / runTime, 1) * (stopX + 30);

    drawPreviewGround(ctx, w, h, groundY);
    drawScarecrow(ctx, scareX, groundY);

    // Enemy chicken in front of the scarecrow (foxes bite birds extra hard)
    const hurt = biting && hitT < 0.3;
    drawBird(ctx, chickX + (hurt ? Math.sin(time * 40) * 1.5 : 0), groundY, {
      kind: 'chicken', scale: 1.5, facing: -1, time, team: ENEMY, peck: biting && (time * 2 % 1) < 0.3,
    });
    drawHpBar(ctx, chickX, groundY - 38, 18, 1 - hits * 0.17, TEAM_COLORS[ENEMY]);

    drawQuadruped(ctx, x, groundY + 4, { kind: 'fox', scale: 1.4, facing: 1, time, team: PLAYER, moving: running, charging: running, attack: biting && hitT < 0.35 });

    if (biting) {
      drawDamagePop(ctx, chickX, groundY - 46, hitT, '-61');
      drawDamagePop(ctx, chickX, groundY - 62, hitT, '+35%', '#ffd23f', 10);
    }
    fadeOut(ctx, w, h, cycle);
  },

  rabbit(ctx, w, h, time) {
    const cycle = time % 4;
    const groundY = h - 22;
    const stopX = w * 0.45;
    const ringX = stopX + 34;
    const hopTime = 1.2;
    const x = -25 + Math.min(cycle / hopTime, 1) * (stopX + 25);

    // After arriving: an attack jump every 1.2s (0.6s in the air), the damage lands with it
    const fightT = cycle - hopTime;
    const jumpT = fightT >= 0 ? (fightT % 1.2) / 0.6 : 1;
    const inAir = fightT >= 0 && fightT < 2.4 && jumpT < 1;
    const sinceLanding = fightT >= 0.6 ? (fightT - 0.6) % 1.2 : -1;
    const landed = sinceLanding >= 0 && sinceLanding < 0.6;
    const t = sinceLanding / 0.6;

    drawPreviewGround(ctx, w, h, groundY);

    // Dusty ring where it lands: everything inside gets hit
    if (landed) {
      ctx.strokeStyle = `rgba(160,120,70,${0.8 * (1 - t)})`;
      ctx.lineWidth = 3;
      ellipse(ctx, ringX, groundY + 2, 8 + t * 34, 3 + t * 10); ctx.stroke();
    }

    // Two enemy chickens standing close together, both get hit
    [[ringX, -4], [ringX + 22, 6]].forEach(([cx, oy], i) => {
      const hurt = landed && t < 0.5;
      drawBird(ctx, cx + (hurt ? Math.sin(time * 40 + i) * 1.5 : 0), groundY + oy, { kind: 'chicken', scale: 1.4, facing: -1, time: time + i, team: ENEMY });
      if (landed) drawDamagePop(ctx, cx, groundY + oy - 36, t, '-70');
    });

    const lift = inAir ? Math.sin(jumpT * Math.PI) * 30 : 0;
    drawQuadruped(ctx, x, groundY + 4, { kind: 'rabbit', scale: 1.3, facing: 1, time, team: PLAYER, moving: cycle < hopTime, lift });
    fadeOut(ctx, w, h, cycle);
  },

  horse(ctx, w, h, time) {
    const cycle = time % 4;
    const groundY = h - 22;
    const siloX = w - 38;
    const riverX = w * 0.42;
    const riverW = 30;
    const stopX = siloX - 42;
    const runTime = 2;
    const galloping = cycle < runTime;
    const kicking = cycle >= runTime && cycle < 3.6;
    const hitT = ((cycle - runTime) % 0.8) / 0.8;
    const x = -30 + Math.min(cycle / runTime, 1) * (stopX + 30);

    drawPreviewGround(ctx, w, h, groundY);

    // Blue river across the path, with wave lines flowing down
    ctx.fillStyle = '#4aa3df';
    ctx.fillRect(riverX, 0, riverW, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const wy = ((time * 20 + i * 30) % (h + 10)) - 5;
      ctx.beginPath(); ctx.moveTo(riverX + 6, wy); ctx.lineTo(riverX + riverW - 6, wy + 3); ctx.stroke();
    }

    // Jump arc: the horse is lifted while it passes over the water
    const jumpStart = riverX - 30;
    const jumpEnd = riverX + riverW + 30;
    let lift = 0;
    if (x > jumpStart && x < jumpEnd) lift = Math.sin((x - jumpStart) / (jumpEnd - jumpStart) * Math.PI) * 28;

    const hits = kicking ? Math.floor((cycle - runTime) / 0.8) + 1 : 0;
    drawMiniSilo(ctx, siloX, groundY, 1 - hits * 0.12);

    drawQuadruped(ctx, x, groundY + 4, {
      kind: 'horse', scale: 1.5, facing: 1, time, team: PLAYER,
      moving: galloping && lift === 0, charging: galloping, attack: kicking && hitT < 0.3, lift,
    });

    if (kicking) drawDamagePop(ctx, siloX, groundY - 60, hitT, '-120');
    fadeOut(ctx, w, h, cycle);
  },

  dog(ctx, w, h, time) {
    const cycle = time % 4;
    const groundY = h - 22;
    const midX = w / 2;
    const chickStop = midX - 14;

    drawPreviewGround(ctx, w, h, groundY);

    // Our half of the field, with a dashed border line
    ctx.fillStyle = 'rgba(59,130,246,0.12)';
    ctx.fillRect(0, 0, midX, h);
    ctx.strokeStyle = TEAM_COLORS[PLAYER];
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.moveTo(midX, 4); ctx.lineTo(midX, h - 4); ctx.stroke();
    ctx.setLineDash([]);

    // Enemy chicken walks in from the right and crosses the line
    const walkT = Math.min(Math.max((cycle - 0.4) / 1.6, 0), 1);
    const chickX = w + 15 - walkT * (w + 15 - chickStop);
    const fighting = cycle >= 2.2 && cycle < 3.6;
    const hitT = ((cycle - 2.2) % 0.5) / 0.5;
    const hits = fighting ? Math.floor((cycle - 2.2) / 0.5) + 1 : 0;
    drawBird(ctx, chickX, groundY, {
      kind: 'chicken', scale: 1.5, facing: -1, time, team: ENEMY, moving: walkT > 0 && walkT < 1, peck: fighting && (time * 2 % 1) < 0.3,
    });
    if (hits > 0) drawHpBar(ctx, chickX, groundY - 38, 18, 1 - hits * 0.25, TEAM_COLORS[ENEMY]);

    // Dog patrols back and forth, then runs at the chicken once it gets close
    let x = 60 + Math.sin(cycle * 2.5) * 35;
    let facing = Math.cos(cycle * 2.5) >= 0 ? 1 : -1;
    if (cycle >= 1.8) {
      const fromX = 60 + Math.sin(1.8 * 2.5) * 35;
      x = fromX + Math.min((cycle - 1.8) / 0.4, 1) * (chickStop - 30 - fromX);
      facing = 1;
    }
    drawQuadruped(ctx, x, groundY + 4, {
      kind: 'dog', scale: 1.4, facing, time, team: PLAYER,
      moving: cycle < 2.2, charging: cycle >= 1.8 && cycle < 2.2, attack: fighting && hitT < 0.35,
    });

    if (fighting) drawDamagePop(ctx, chickX, groundY - 46, hitT, '-40');
    fadeOut(ctx, w, h, cycle);
  },

  goat(ctx, w, h, time) {
    const cycle = time % 4;
    const groundY = h - 22;
    const scareX = w - 45;
    const startX = 40;
    const stopX = scareX - 34;
    const leapT = Math.min(Math.max((cycle - 0.5) / 0.9, 0), 1);   // waits 0.5 s, then a 0.9 s leap
    const x = startX + leapT * (stopX - startX);
    const lift = Math.sin(leapT * Math.PI) * 25;
    const landing = cycle >= 1.4 && cycle < 2;
    const landT = (cycle - 1.4) / 0.6;                               // 0 -> 1 right after landing
    const butting = cycle >= 2.2 && cycle < 3.6;                     // two normal headbutts
    const buttT = ((cycle - 2.2) % 0.7) / 0.7;

    drawPreviewGround(ctx, w, h, groundY);

    // Cone of dust in front of the goat when it lands
    if (landing) {
      ctx.save();
      ctx.translate(stopX + 20, groundY);
      ctx.scale(1, 0.45);
      ctx.fillStyle = `rgba(217,191,140,${0.85 * (1 - landT)})`;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 20 + landT * 40, -0.5, 0.5);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // Scarecrow gets pushed back on the landing, shakes on headbutts
    let push = 0;
    if (landing) push = Math.sin(landT * Math.PI) * 8 + Math.sin(time * 40) * 2;
    else if (butting && buttT < 0.3) push = Math.sin(time * 40) * 1.5;
    drawScarecrow(ctx, scareX + push, groundY);

    const attack = (landing && landT < 0.4) || (butting && buttT < 0.35);
    drawQuadruped(ctx, x, groundY + 4, { kind: 'goat', scale: 1.5, facing: 1, time, team: PLAYER, attack, lift });

    if (landing) drawDamagePop(ctx, scareX + 12, groundY - 50, landT, '-90');
    if (butting) drawDamagePop(ctx, scareX + 12, groundY - 50, buttT, '-55');
    fadeOut(ctx, w, h, cycle);
  },

  // Spell: a shower of corn kernels over a big circle. Weak, but it wipes out a group of small animals.
  cornRain(ctx, w, h, time) {
    const cycle = time % 4;
    const groundY = h - 22;
    const walkTime = 0.7;
    const castAt = 0.7;
    const fallTime = 1.1;
    const hitAt = castAt + fallTime;
    // flat squashes the ground circle so it fits this side view
    const spell = { kind: 'cornRain', x: w * 0.62, y: groundY + 2, radius: 50, team: PLAYER, flat: 0.32 };

    drawPreviewGround(ctx, w, h, groundY);

    // Three enemy chickens walk in and peck around in a little group... until the corn arrives
    const chicks = [[-28, -5], [0, 4], [28, -3]];
    if (cycle < hitAt) {
      const walkIn = (1 - Math.min(cycle / walkTime, 1)) * 120;
      chicks.forEach(([ox, oy], i) => {
        drawBird(ctx, spell.x + ox + walkIn, spell.y + oy, {
          kind: 'chicken', scale: 1.4, facing: -1, time: time + i, team: ENEMY,
          moving: cycle < walkTime, peck: cycle >= walkTime && ((time * 1.3 + i * 0.37) % 1) < 0.25,
        });
      });
    }

    // Kernels rain down, then lie on the ground for a moment
    if (cycle >= castAt && cycle < hitAt) {
      spell.t = (cycle - castAt) / fallTime;
      drawSpell(ctx, spell, time);
    } else if (cycle >= hitAt && cycle < hitAt + 0.5) {
      spell.t = (cycle - hitAt) / 0.5;
      drawSpellImpact(ctx, spell);
    }

    // The chickens are gone in a puff of smoke
    if (cycle >= hitAt && cycle < hitAt + 0.8) {
      const t = (cycle - hitAt) / 0.8;
      chicks.forEach(([ox, oy], i) => {
        drawSmokePuff(ctx, spell.x + ox, spell.y + oy - 8, 9, t);
        drawDamagePop(ctx, spell.x + ox, spell.y + oy - 28 - (i % 2) * 12, t, '-115', '#fff', 12);
      });
    }
    fadeOut(ctx, w, h, cycle);
  },

  // Spell: a big hay bale drops out of the sky. Heavy damage on a small spot and a big push.
  hayBale(ctx, w, h, time) {
    const cycle = time % 4;
    const groundY = h - 22;
    const castAt = 0.5;
    const dropTime = 1.0;
    const hitAt = castAt + dropTime;
    const speed = 55;
    // A bit bigger than in the game, like the animals in the previews
    const spell = { kind: 'hayBale', x: w * 0.58, y: groundY + 2, radius: 36, team: PLAYER, flat: 0.32 };
    const hitX = spell.x + 8;   // where the pig is when the bale lands

    drawPreviewGround(ctx, w, h, groundY);

    // Enemy mangalica runs in from the right. The bale knocks it back, then it walks on, badly hurt.
    let pigX = hitX + (hitAt - cycle) * speed;
    let moving = true;
    if (cycle >= hitAt) {
      const push = Math.min((cycle - hitAt) / 0.35, 1);
      pigX = hitX + 26 * (1 - (1 - push) * (1 - push));   // slides back, slowing down
      moving = cycle > 2.4;
      if (moving) pigX -= (cycle - 2.4) * speed * 0.6;
    }
    const dizzy = cycle >= hitAt && cycle < hitAt + 0.5;
    drawQuadruped(ctx, pigX + (dizzy ? Math.sin(time * 40) * 1.5 : 0), groundY + 4, {
      kind: 'mangalica', scale: 1.5, facing: -1, time, team: ENEMY, moving,
    });
    if (cycle >= hitAt) drawHpBar(ctx, pigX, groundY - 42, 22, 0.32, TEAM_COLORS[ENEMY]);

    // The falling bale (its shadow grows first), then the landing: dust and flying straw
    if (cycle >= castAt && cycle < hitAt) {
      spell.t = (cycle - castAt) / dropTime;
      drawSpell(ctx, spell, time);
    } else if (cycle >= hitAt && cycle < hitAt + 0.5) {
      spell.t = (cycle - hitAt) / 0.5;
      drawSpellImpact(ctx, spell);
    }

    if (cycle >= hitAt && cycle < hitAt + 0.9) drawDamagePop(ctx, hitX + 16, groundY - 56, (cycle - hitAt) / 0.9, '-380');
    fadeOut(ctx, w, h, cycle);
  },

  // Spell: a mud ball thrown from our barn. Splat: damage, a small push, and the enemies get slowed down.
  mudBall(ctx, w, h, time) {
    const cycle = time % 4;
    const groundY = h - 22;
    const barnX = 24;
    const castAt = 0.3;
    const flyTime = 1.0;
    const hitAt = castAt + flyTime;
    const speed = 32;
    const slowed = cycle >= hitAt;
    // fromH: the ball comes out of the small barn's hay loft window
    const spell = {
      kind: 'mudBall', x: w * 0.66, y: groundY + 2, radius: 44, team: PLAYER, flat: 0.3,
      fromX: barnX, fromY: groundY, fromH: 25,
    };

    drawPreviewGround(ctx, w, h, groundY);
    drawMiniBarn(ctx, barnX, groundY);

    // Two enemy animals walk in from the right. After the splat they walk at half speed, muddy feet.
    [
      { kind: 'piglet', dx: -18, dy: -4, push: -8, hp: 0.59, barY: 40 },
      { kind: 'goat', dx: 18, dy: 5, push: 8, hp: 0.8, barY: 42 },
    ].forEach((a, i) => {
      const hitX = spell.x + a.dx;   // where it is when the ball lands
      let x = hitX + (hitAt - cycle) * speed;
      if (slowed) {
        const p = Math.min((cycle - hitAt) / 0.25, 1);
        x = hitX + a.push * (1 - (1 - p) * (1 - p)) - (cycle - hitAt) * speed * 0.5;
      }
      const y = groundY + 4 + a.dy;
      // Half speed also means slower steps: the legs get half the time
      drawQuadruped(ctx, x, y, { kind: a.kind, scale: 1.3, facing: -1, time: (slowed ? time * 0.5 : time) + i, team: ENEMY, moving: true });
      if (slowed) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1.3, 1.3);
        drawSlowedMark(ctx, 0, 0, time + i);
        ctx.restore();
        drawHpBar(ctx, x, y - a.barY, 20, a.hp, TEAM_COLORS[ENEMY]);
        if (cycle < hitAt + 0.7) drawDamagePop(ctx, x, y - a.barY - 6, (cycle - hitAt) / 0.7, '-90', '#fff', 12);
      }
    });

    // The ball flies in an arc, then splats
    if (cycle >= castAt && cycle < hitAt) {
      spell.t = (cycle - castAt) / flyTime;
      drawSpell(ctx, spell, time);
    } else if (cycle >= hitAt && cycle < hitAt + 0.5) {
      spell.t = (cycle - hitAt) / 0.5;
      drawSpellImpact(ctx, spell);
    }

    // "Slowed!" sign pops up above them (after the damage numbers are gone)
    if (cycle >= hitAt + 0.6) {
      const pop = Math.min(1, (cycle - hitAt - 0.6) / 0.15);
      ctx.save();
      ctx.translate(spell.x, 18);
      ctx.scale(pop, pop);
      ctx.fillStyle = '#7a5230';
      ctx.strokeStyle = '#4a2e14';
      ctx.lineWidth = 1.5;
      roundRectPath(ctx, -31, -8, 62, 16, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff6e0';
      ctx.font = 'bold 11px Trebuchet MS, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Lassítva!', 0, 4);
      ctx.restore();
    }
    fadeOut(ctx, w, h, cycle);
  },

  // Building: a wheat field that makes 1 feed every 3 seconds (here time runs faster: one every second)
  wheatField(ctx, w, h, time) {
    const cycle = time % 4;
    const groundY = h - 22;
    const fieldX = 72;
    const fieldY = groundY - 2;
    const bar = { x: 150, y: 14, w: 80 };
    const madeAt = [0.8, 1.8, 2.8];   // when a feed is ready
    const flyTime = 0.7;              // how long the wheat flies to the feed bar

    drawPreviewGround(ctx, w, h, groundY);

    // The wheat grows and turns golden, then starts again every time a feed is made
    drawWheatField(ctx, fieldX, fieldY, { scale: 2.2, team: PLAYER, growth: (cycle + 0.2) % 1, time });
    // Its life slowly runs out (18 seconds in the game)
    drawHpBar(ctx, fieldX, fieldY - 46, 40, 1 - cycle / 4.5, TEAM_COLORS[PLAYER]);

    // Count the feed that already arrived; the ones on their way fly to the bar
    let feed = 4;
    let flash = 0;
    const flying = [];
    madeAt.forEach(start => {
      const t = (cycle - start) / flyTime;
      if (t >= 1) {
        feed++;
        const since = cycle - start - flyTime;
        if (since < 0.3) flash = 1 - since / 0.3;   // the new piece of the bar lights up
      } else if (t >= 0) {
        flying.push(t);
      }
    });
    drawMiniFeedBar(ctx, bar.x, bar.y, bar.w, feed, flash);

    // A wheat with "+1" floats from the field up to the next empty spot of the bar
    flying.forEach(t => {
      const e = t * t * (3 - 2 * t);   // smooth start and stop
      const sx = fieldX + 12, sy = fieldY - 34;
      const ex = bar.x + (feed + 0.5) * bar.w / 10, ey = bar.y + 5;
      const x = sx + (ex - sx) * e;
      const y = sy + (ey - sy) * e - Math.sin(e * Math.PI) * 18;
      const size = t < 0.15 ? 0.6 + (t / 0.15) * 0.4 : 1 - Math.max(0, t - 0.8) * 2;
      ctx.globalAlpha = t > 0.85 ? (1 - t) / 0.15 : 1;
      drawWheatEar(ctx, x, y + 9 * size, 0.85 * size);
      ctx.font = 'bold 12px Trebuchet MS, sans-serif';
      ctx.textAlign = 'left';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#7a5a10';
      ctx.fillStyle = '#ffe07a';
      ctx.strokeText('+1', x + 7, y + 4);
      ctx.fillText('+1', x + 7, y + 4);
      ctx.globalAlpha = 1;
    });
    fadeOut(ctx, w, h, cycle);
  },

  snake(ctx, w, h, time) {
    const cycle = time % 4;
    const groundY = h - 22;
    const targetX = w - 45;
    const stopX = targetX - 25;
    const runTime = 1.2;
    const biting = cycle >= runTime && cycle < 3.6;
    const x = -30 + Math.min(cycle / runTime, 1) * (stopX + 30);
    const hitT = ((cycle - runTime) % 0.9) / 0.9;

    drawPreviewGround(ctx, w, h, groundY);
    const shaking = biting && hitT < 0.3;
    drawScarecrow(ctx, targetX + (shaking ? Math.sin(time * 40) * 1.5 : 0), groundY);

    const attack = biting && hitT < 0.3;
    drawSnake(ctx, x, groundY + 4, { scale: 1.8, facing: 1, time, team: PLAYER, moving: cycle < runTime, attack });

    if (biting) {
      drawDamagePop(ctx, targetX + 12, groundY - 50, hitT, '-52');
      ctx.fillStyle = '#2ecc71';
      ctx.font = 'bold 11px Trebuchet MS, sans-serif';
      ctx.fillText('Méreg (DoT)', targetX + 10, groundY - 65 - hitT * 8);
    }
    fadeOut(ctx, w, h, cycle);
  },

  frog(ctx, w, h, time) {
    const cycle = time % 4;
    const groundY = h - 22;
    const riverX = 90;
    const targetX = w - 45;
    const jumping = cycle < 1.0;
    const frogX = cycle < 1.0 ? 30 + cycle * 70 : 100;
    const lift = jumping ? Math.sin(cycle * Math.PI) * 28 : 0;
    const tongueOut = cycle >= 1.2 && cycle < 3.2;

    drawPreviewGround(ctx, w, h, groundY);
    ctx.fillStyle = '#3f97d4';
    ctx.fillRect(riverX - 20, 0, 40, h);

    const pulled = tongueOut ? Math.min(1, (cycle - 1.2) * 1.5) : 0;
    const scareX = targetX - pulled * 50;
    drawScarecrow(ctx, scareX, groundY);

    drawFrog(ctx, frogX, groundY + 2, { scale: 1.8, facing: 1, time, team: PLAYER, moving: jumping, lift, attack: tongueOut });

    if (tongueOut && ((cycle - 1.2) % 0.8) < 0.3) {
      drawDamagePop(ctx, scareX + 10, groundY - 45, (cycle % 0.8) / 0.8, '-65 (Rántás!)');
    }
    fadeOut(ctx, w, h, cycle);
  },

  cheetah(ctx, w, h, time) {
    const cycle = time % 4;
    const groundY = h - 22;
    const targetX = w - 45;
    const stopX = targetX - 28;
    const runTime = 0.7;
    const hit = cycle >= runTime && cycle < 3.6;
    const x = -30 + Math.min(cycle / runTime, 1) * (stopX + 30);
    const hitT = ((cycle - runTime) % 1.0) / 1.0;

    drawPreviewGround(ctx, w, h, groundY);
    const shaking = hit && hitT < 0.3;
    drawScarecrow(ctx, targetX + (shaking ? Math.sin(time * 50) * 2.5 : 0), groundY);

    const sprinting = cycle < runTime;
    const attack = hit && hitT < 0.35;
    drawCheetah(ctx, x, groundY + 4, { scale: 1.8, facing: 1, time, team: PLAYER, moving: sprinting, sprinting, attack });

    if (hit) {
      const isFirst = cycle < runTime + 0.9;
      drawDamagePop(ctx, targetX + 12, groundY - 50, hitT, isFirst ? '-275 (CRIT!)' : '-110');
    }
    fadeOut(ctx, w, h, cycle);
  },

  eel(ctx, w, h, time) {
    const cycle = time % 4;
    const groundY = h - 22;
    const eelX = 55;
    const scareX = w - 85;
    const crow = { x: w - 40, y: 35 + Math.sin(time * 3) * 4 };

    drawPreviewGround(ctx, w, h, groundY);
    drawScarecrow(ctx, scareX, groundY);
    drawCrow(ctx, crow.x, crow.y, time);

    const shock = (cycle % 1.5) < 0.4;
    drawEel(ctx, eelX, groundY - 14, { scale: 1.8, facing: 1, time, team: PLAYER });

    if (shock) {
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(eelX + 20, groundY - 24);
      ctx.lineTo(scareX - 10, groundY - 30);
      ctx.lineTo(crow.x, crow.y);
      ctx.stroke();

      drawDamagePop(ctx, scareX + 10, groundY - 45, (cycle % 0.5) / 0.5, '-85');
      drawDamagePop(ctx, crow.x + 8, crow.y - 15, (cycle % 0.5) / 0.5, 'BÉNÍTVA!');
      drawStunnedEffect(ctx, scareX, groundY - 58, time);
      drawStunnedEffect(ctx, crow.x, crow.y - 12, time);
    }
    fadeOut(ctx, w, h, cycle);
  },

  armadillo(ctx, w, h, time) {
    const cycle = time % 4;
    const groundY = h - 22;
    const targetX = w - 45;
    const stopX = targetX - 26;
    const x = cycle < 1.2 ? -20 + (cycle / 1.2) * (stopX + 20) : stopX;
    const shellActive = cycle >= 1.5 && cycle < 3.6;

    drawPreviewGround(ctx, w, h, groundY);
    drawScarecrow(ctx, targetX, groundY);

    drawArmadillo(ctx, x, groundY + 4, { scale: 1.8, facing: 1, time, team: PLAYER, moving: cycle < 1.2, shellActive });

    if (shellActive) {
      ctx.fillStyle = '#f39c12';
      ctx.font = 'bold 12px Trebuchet MS, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('-50% Páncél Védelem', x, groundY - 30);
    }
    fadeOut(ctx, w, h, cycle);
  },

  falcon(ctx, w, h, time) {
    const cycle = time % 4;
    const groundY = h - 22;
    const targetX = w - 50;
    const diving = cycle >= 1.0 && cycle < 1.7;
    const swoopingUp = cycle >= 1.7 && cycle < 2.5;
    let x = 40;
    let lift = 45;
    if (diving) {
      const t = (cycle - 1.0) / 0.7;
      x = 40 + t * (targetX - 40);
      lift = (1 - t) * 45;
    } else if (swoopingUp) {
      const t = (cycle - 1.7) / 0.8;
      x = targetX + t * 40;
      lift = t * 45;
    }

    drawPreviewGround(ctx, w, h, groundY);
    const shaking = cycle >= 1.6 && cycle < 2.0;
    drawScarecrow(ctx, targetX + (shaking ? Math.sin(time * 50) * 2 : 0), groundY);

    drawFalcon(ctx, x, groundY, { scale: 1.8, facing: 1, time, team: PLAYER, lift, diving });

    if (cycle >= 1.6 && cycle < 2.4) {
      drawDamagePop(ctx, targetX + 12, groundY - 50, (cycle - 1.6) / 0.8, '-209 (Zuhanás!)');
    }
    fadeOut(ctx, w, h, cycle);
  },

  badger(ctx, w, h, time) {
    const cycle = time % 4;
    const groundY = h - 22;
    const targetX = w - 45;
    const stopX = targetX - 24;
    const raging = cycle >= 1.2;
    const x = cycle < 0.8 ? -20 + (cycle / 0.8) * (stopX + 20) : stopX;
    const hitEvery = raging ? 0.4 : 0.8;
    const hitT = ((cycle - 0.8) % hitEvery) / hitEvery;

    drawPreviewGround(ctx, w, h, groundY);
    const shaking = cycle >= 0.8 && hitT < 0.3;
    drawScarecrow(ctx, targetX + (shaking ? Math.sin(time * 40) * 1.5 : 0), groundY);

    drawBadger(ctx, x, groundY + 4, { scale: 1.8, facing: 1, time, team: PLAYER, moving: cycle < 0.8, attack: hitT < 0.3, raging });

    if (cycle >= 0.8) {
      drawDamagePop(ctx, targetX + 12, groundY - 50, hitT, raging ? '-78 (DÜH!)' : '-78');
    }
    fadeOut(ctx, w, h, cycle);
  },

  gorilla(ctx, w, h, time) {
    const cycle = time % 4;
    const groundY = h - 22;
    const targetX = w - 45;
    const stopX = targetX - 35;
    const walking = cycle < 1.0;
    const slam = cycle >= 1.4 && cycle < 2.0;
    const x = walking ? -20 + (cycle / 1.0) * (stopX + 20) : stopX;

    drawPreviewGround(ctx, w, h, groundY);
    const shaking = slam && ((cycle - 1.4) < 0.3);
    drawScarecrow(ctx, targetX + (shaking ? Math.sin(time * 50) * 3 : 0), groundY);

    drawGorilla(ctx, x, groundY + 4, { scale: 2.0, facing: 1, time, team: PLAYER, moving: walking, attack: slam });

    if (slam) {
      drawDamagePop(ctx, targetX + 12, groundY - 50, (cycle - 1.4) / 0.6, '-145 (FÖLDCSAPÁS!)');
      ctx.strokeStyle = 'rgba(127, 140, 141, 0.7)';
      ctx.lineWidth = 2;
      ellipse(ctx, x + 15, groundY, 35 * ((cycle - 1.4) / 0.6), 12 * ((cycle - 1.4) / 0.6));
      ctx.stroke();
    }
    fadeOut(ctx, w, h, cycle);
  },
};

// Shared by the two pigs: run in fast, then bite the scarecrow again and again
function drawPigPreview(ctx, w, h, time, kind, scale, damage) {
  const cycle = time % 4;
  const groundY = h - 22;
  const targetX = w - 45;
  const stopX = targetX - 23 * scale;   // bigger pig stops a bit further away
  const runTime = 0.8;                  // quick run in
  const hitEvery = 0.6;                 // fast bites
  const running = cycle < runTime;
  const biting = cycle >= runTime && cycle < 3.6;
  const x = -30 + Math.min(cycle / runTime, 1) * (stopX + 30);
  const hitT = ((cycle - runTime) % hitEvery) / hitEvery;   // 0 -> 1 between two bites

  drawPreviewGround(ctx, w, h, groundY);
  const shaking = biting && hitT < 0.3;
  drawScarecrow(ctx, targetX + (shaking ? Math.sin(time * 40) * 1.5 : 0), groundY);

  const attack = biting && hitT < 0.35;
  drawQuadruped(ctx, x, groundY + 4, { kind, scale, facing: 1, time, team: PLAYER, moving: running, attack });

  if (biting) drawDamagePop(ctx, targetX + 12, groundY - 50, hitT, damage);
  fadeOut(ctx, w, h, cycle);
}

function drawPreviewGround(ctx, w, h, groundY) {
  ctx.fillStyle = '#8fcf5f';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#d8b377';
  ctx.fillRect(0, groundY - 14, w, 26);
}

// Floating damage number, t goes 0 -> 1 (color and size are optional)
function drawDamagePop(ctx, x, y, t, text, color = '#fff', size = 14) {
  ctx.globalAlpha = 1 - t;
  ctx.fillStyle = color;
  ctx.strokeStyle = '#8a1d1d';
  ctx.lineWidth = 3;
  ctx.font = `bold ${size}px Trebuchet MS, sans-serif`;
  ctx.textAlign = 'center';
  ctx.strokeText(text, x, y - t * 20);
  ctx.fillText(text, x, y - t * 20);
  ctx.globalAlpha = 1;
}

function fadeOut(ctx, w, h, cycle) {
  if (cycle <= 3.6) return;
  ctx.fillStyle = `rgba(143,207,95,${(cycle - 3.6) / 0.4})`;
  ctx.fillRect(0, 0, w, h);
}

// Small enemy silo for previews (reuses the real tower drawing)
function drawMiniSilo(ctx, x, y, hpRatio) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(0.8, 0.8);
  drawTower(ctx, { kind: 'princess', team: ENEMY, x: 0, y: -4, hp: Math.round(1400 * hpRatio), maxHp: 1400, dead: false });
  ctx.restore();
}

// Our own small barn for previews (reuses the real tower drawing). Its hay loft window is about 25 px up.
function drawMiniBarn(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(0.55, 0.55);
  drawTower(ctx, { kind: 'king', team: PLAYER, x: 0, y: -6, hp: 2400, maxHp: 2400, dead: false });
  ctx.restore();
}

// Gray puff of smoke, like the one in battle when an animal is gone. t goes 0 -> 1
function drawSmokePuff(ctx, x, y, size, t) {
  const count = 5 + Math.round(size / 3);
  const age = t * 0.7;   // the battle smoke lasts 0.7 seconds
  ctx.globalAlpha = 0.85 * (1 - t);
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const shade = 180 + (i * 37) % 40;
    const r = (size * 0.5 + (i % 3)) * (1 + t);
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    ellipse(ctx, x + Math.cos(angle) * (size * 0.5 + 12 * age), y + Math.sin(angle) * size * 0.3 - 12 * age, r, r);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// Small copy of the battle's feed bar: wheat icon, golden fill (10 feed = full) and the number.
// flash 0..1 lights up the newest piece of the bar
function drawMiniFeedBar(ctx, x, y, w, feed, flash) {
  const h = 10;
  const piece = w / 10;
  drawWheatEar(ctx, x - 9, y + h + 2, 0.6);

  // Dark track, then the golden fill
  ctx.fillStyle = '#4a2c12';
  roundRectPath(ctx, x, y, w, h, 5); ctx.fill();
  const grad = ctx.createLinearGradient(0, y, 0, y + h);
  grad.addColorStop(0, '#ffe07a');
  grad.addColorStop(1, '#e8a51f');
  ctx.fillStyle = grad;
  roundRectPath(ctx, x, y, piece * feed, h, 5); ctx.fill();
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${0.8 * flash})`;
    roundRectPath(ctx, x + piece * (feed - 1), y, piece, h, 3); ctx.fill();
  }

  // Thin lines between the 10 pieces, and the border
  ctx.strokeStyle = 'rgba(74,44,18,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < 10; i++) { ctx.moveTo(x + i * piece, y + 2); ctx.lineTo(x + i * piece, y + h - 2); }
  ctx.stroke();
  ctx.strokeStyle = '#5a3515';
  ctx.lineWidth = 2;
  roundRectPath(ctx, x, y, w, h, 5); ctx.stroke();

  // Number of feed
  ctx.font = 'bold 13px Trebuchet MS, sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#5a3515';
  ctx.fillStyle = '#fff6e0';
  ctx.strokeText(String(feed), x + w + 11, y + h);
  ctx.fillText(String(feed), x + w + 11, y + h);
}

// Starts a rounded rectangle path (fill / stroke it afterwards)
function roundRectPath(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawScarecrow(ctx, x, y) {
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ellipse(ctx, x, y, 12, 4); ctx.fill();
  ctx.fillStyle = '#7a4a22';
  ctx.fillRect(x - 2, y - 44, 4, 44);
  ctx.fillRect(x - 18, y - 36, 36, 4);
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(x - 10, y - 38, 20, 18);
  ctx.fillStyle = '#ecc75a';
  ellipse(ctx, x, y - 46, 8, 8); ctx.fill();
  ctx.fillStyle = '#5a3a1a';
  ctx.fillRect(x - 12, y - 53, 24, 3);
  ctx.fillRect(x - 7, y - 61, 14, 9);
  ctx.fillStyle = '#222';
  ctx.fillRect(x - 4, y - 48, 2, 2);
  ctx.fillRect(x + 2, y - 48, 2, 2);
}

// A flying crow, used as an "air target" in previews
function drawCrow(ctx, x, y, time) {
  const flap = Math.sin(time * 12) * 6;
  ctx.fillStyle = '#2a2a33';
  ellipse(ctx, x, y, 9, 5); ctx.fill();
  ellipse(ctx, x + 8, y - 3, 4, 4); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 4, y - 2); ctx.lineTo(x - 10, y - 8 - flap); ctx.lineTo(x + 4, y - 2); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 8, y); ctx.lineTo(x - 15, y - 3); ctx.lineTo(x - 14, y + 3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f2c23a';
  ctx.beginPath(); ctx.moveTo(x + 11, y - 4); ctx.lineTo(x + 16, y - 2); ctx.lineTo(x + 11, y - 1); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff';
  ellipse(ctx, x + 9, y - 4, 1, 1); ctx.fill();
}

function previewLoop(now) {
  const time = now / 1000;
  const p = activePreview;
  // offsetParent is null when the canvas is hidden
  if (p && p.canvas.offsetParent && PREVIEW_DRAW[p.cardId]) {
    // Keep canvas pixels = displayed size, draw in a fixed 260x110 space
    const pw = Math.round(p.canvas.clientWidth * (window.devicePixelRatio || 1));
    if (p.canvas.width !== pw) {
      p.canvas.width = pw;
      p.canvas.height = Math.round(pw * PREVIEW_H / PREVIEW_W);
    }
    const k = p.canvas.width / PREVIEW_W;
    p.ctx.setTransform(k, 0, 0, k, 0, 0);
    PREVIEW_DRAW[p.cardId](p.ctx, PREVIEW_W, PREVIEW_H, time);
  }
  requestAnimationFrame(previewLoop);
}
requestAnimationFrame(previewLoop);
