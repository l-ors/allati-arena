// Battle: units, towers, feed (elixir), card rotation, enemy AI, input and rendering
const BATTLE_TIME = 180;      // seconds
const MAX_FEED = 10;
const FEED_REGEN = 2.8;       // seconds per 1 feed
const HAND_SIZE = 4;
const RIVER_MID = (ARENA.riverTop + ARENA.riverBottom) / 2;
const JUMP_TIME = 0.35;       // how long a "röppenés" lasts
const LEAP_TIME = 0.6;        // how long the goat's big jump lasts
const HOP_ATTACK_TIME = 0.6;  // how long the rabbit's attack jump lasts
const IMPACT_TIME = 0.5;      // how long a spell's aftermath stays visible
const DOUBLE_FEED_TIME = 60;  // the last minute gives 2x táp
const STORM_WARNING = 2;      // seconds a corn storm hit is shown before it falls
const NEUTRAL = 0;            // team of hazards that hurt both sides
TEAM_COLORS[NEUTRAL] = '#e8a51f';

// Challenge modifiers: how often each side gets a free animal on its back line
const MAYHEM = {
  chickenMayhem: { cardId: 'chickens', every: 20 },
  beeMayhem: { cardId: 'bees', every: 10 },
};
const STORM_EVERY = 7;        // corn storm: a new hit every few seconds

const canvas = document.getElementById('battle-canvas');
const ctx = canvas.getContext('2d');
let arenaImage = null;   // built for the chosen arena in fitCanvas

// How the arena is placed on the canvas (set in fitCanvas)
const view = { scale: 1, offsetX: 0, offsetY: 0, dpr: 1 };

let battle = null;
let selectedSlot = null;   // index of the selected card in the hand
let mouse = null;
let lastTime = 0;

// ---------- Setup ----------

function createTower(team, kind, x, y) {
  const king = kind === 'king';
  const hp = king ? 2400 : 1400;
  return {
    isTower: true, team, kind, x, y, hp, maxHp: hp,
    radius: king ? 28 : 20,
    damage: king ? 50 : 45,
    range: king ? 130 : 140,
    attackRate: king ? 1.0 : 0.8,
    splashRadius: king ? 32 : 0,   // the barn's shots hit an area
    active: !king,                 // the barn sleeps until a tower falls or it gets hit
    cooldown: 0,
    poisons: [],
    dead: false,
  };
}

// Barn in the middle, silos on the lanes, for both sides
function createAllTowers() {
  const H = ARENA.H;
  return [
    createTower(ENEMY, 'king', ARENA.centerX, ARENA.kingY),
    createTower(ENEMY, 'princess', ARENA.lanes[0], ARENA.siloY),
    createTower(ENEMY, 'princess', ARENA.lanes[1], ARENA.siloY),
    createTower(PLAYER, 'king', ARENA.centerX, H - ARENA.kingY),
    createTower(PLAYER, 'princess', ARENA.lanes[0], H - ARENA.siloY),
    createTower(PLAYER, 'princess', ARENA.lanes[1], H - ARENA.siloY),
  ];
}

function createUnit(cardId, team, x, y, level = 1) {
  const s = CARDS[cardId].unit;
  const mult = levelMultiplier(level);   // higher level = more health and damage
  const hp = Math.round(s.hp * mult);
  return {
    isTower: false, cardId, team, x, y, level,
    hp, maxHp: hp, damage: s.damage * mult, speed: s.speed, range: s.range,
    attackRate: s.attackRate, radius: s.radius, sight: s.sight,
    targets: s.targets, airMultiplier: s.airMultiplier, projectile: s.projectile,
    flying: !!s.flying, building: !!s.building, kamikaze: !!s.kamikaze, poison: s.poison,
    lifetime: s.lifetime, spawns: s.spawns, spawnEvery: s.spawnEvery, spawnTimer: s.spawnEvery,
    spawnOnDeath: s.spawnOnDeath || 0,
    chargeAfter: s.chargeAfter || 0, walkTime: 0, charging: false,
    bird: !!s.bird, bonusVsBirds: s.bonusVsBirds || 1, splashRadius: s.splashRadius || 0,
    jumpsRiver: !!s.jumpsRiver, guard: !!s.guard, lifeLeft: s.lifetime, wanderTarget: null, wanderTimer: 0,
    leap: s.leap, leapDamage: s.leap ? s.leap.damage * mult : 0, leapState: null, leapCooldown: 0, lift: 0,
    jumpAttack: !!s.jumpAttack, hopAttack: null,
    produce: s.produce, produceEvery: s.produce ? s.produce.every : 0, produceTimer: s.produce ? s.produce.every : 0,
    deathFeed: s.deathFeed || 0, slowTimer: 0, stunTimer: 0,
    ignoresCollision: !!s.ignoresCollision,
    sprintBurst: !!s.sprintBurst,
    sprinting: !!s.sprintBurst,
    tonguePull: !!s.tonguePull,
    shockWave: s.shockWave || null,
    shellDefense: s.shellDefense || 0,
    diveBomb: !!s.diveBomb,
    diving: false,
    rageMode: !!s.rageMode,
    raging: false,
    groundPound: s.groundPound || null,
    poisons: [],
    cooldown: 0, peck: 0, jump: 0, moving: false,
    facing: 1,
    anim: Math.random() * 10,
    dead: false,
  };
}

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

// options.challenge: a member challenge (fixed decks + modifier, no trophies or chests)
function startBattle(options = {}) {
  fitCanvas();
  const challenge = options.challenge || null;
  const isMP = !!options.multiplayer;
  const queue = shuffle([...(challenge ? challenge.playerDeck : save.deck)]);
  // The enemy rolls a random 8-card deck from the cards of this arena
  const arenaCards = Object.keys(CARDS).filter(id => CARDS[id].arena <= save.arena);
  const enemyDeck = challenge
    ? [...challenge.enemyDeck]
    : options.enemyDeck
    ? [...options.enemyDeck]
    : shuffle(arenaCards).slice(0, DECK_SIZE);
  // The enemy's cards are as strong as the player's deck on average
  const avgLevel = save.deck.reduce((sum, id) => sum + save.cards[id].level, 0) / save.deck.length;
  battle = {
    multiplayer: isMP,
    role: options.role || null,
    opponentName: options.opponentName || 'Enemy',
    time: BATTLE_TIME,
    feed: 5,
    enemyFeed: 5,
    hand: queue.splice(0, HAND_SIZE),   // the 4 playable cards
    queue,                              // the rest; queue[0] is the next card
    arena: save.arena,
    challenge,
    modifier: challenge ? challenge.modifier : null,
    mayhemTimer: 0,
    stormTimer: 3,
    hazards: [],    // corn storm warnings
    enemyLevel: Math.round(avgLevel),
    enemyDeck,
    aiTimer: 2,
    aiWant: 4,
    aiNext: enemyDeck[0],
    units: [],
    projectiles: [],
    particles: [],
    spells: [],     // spells on their way down
    impacts: [],    // spell aftermath (dust, mud, kernels)
    popups: [],     // floating "+1" texts
    crowns: { player: 0, enemy: 0 },
    over: false,
    towers: createAllTowers(),
  };
  selectedSlot = null;
  renderHand();
  lastTime = performance.now();
  requestAnimationFrame(battleLoop);
}

// Spawns all animals of a card around (x, y)
const SPAWN_OFFSETS = [[0, -10], [-10, 7], [10, 7], [-16, -6], [16, -6], [0, 16]];

function playCard(cardId, team, x, y) {
  const card = CARDS[cardId];
  // In challenges both sides play at the same level
  const level = team === PLAYER && !battle.challenge ? save.cards[cardId].level : battle.enemyLevel;
  if (card.spell) { castSpell(card, team, x, y, level); return; }
  for (let i = 0; i < card.count; i++) {
    const [ox, oy] = SPAWN_OFFSETS[i % SPAWN_OFFSETS.length];
    battle.units.push(createUnit(cardId, team, x + ox, y + oy * team, level));
  }
}

// ---------- Spells ----------

// A spell flies / falls for a moment (delay), then hits everything of the enemy in its radius
function castSpell(card, team, x, y, level) {
  const sp = card.spell;
  const king = battle.towers.find(t => t.team === team && t.kind === 'king') || { x, y: y - 200 };
  battle.spells.push({
    kind: sp.kind, team, x, y, radius: sp.radius, t: 0,
    fromX: king.x, fromY: king.y - 40,          // the mud ball is thrown from your barn
    damage: sp.damage * levelMultiplier(level),
    def: sp,
  });
}

function updateSpells(dt) {
  for (const sp of battle.spells) {
    sp.t = Math.min(1, sp.t + dt / sp.def.delay);
    if (sp.t >= 1) spellImpact(sp);
  }
  battle.spells = battle.spells.filter(sp => sp.t < 1);

  for (const im of battle.impacts) im.t += dt / IMPACT_TIME;
  battle.impacts = battle.impacts.filter(im => im.t < 1);
}

function spellImpact(sp) {
  const def = sp.def;
  for (const e of [...battle.units, ...battle.towers]) {
    if (e.team === sp.team || e.dead) continue;
    if (sp.team === NEUTRAL && e.isTower) continue;   // the corn storm spares the towers
    const d = Math.hypot(e.x - sp.x, e.y - sp.y);
    if (d > sp.radius + e.radius) continue;
    dealDamage(e, e.isTower ? sp.damage * def.towerDamage : sp.damage);
    if (e.isTower || e.building) continue;
    // Push away from the middle of the spell (straight back if it landed right on top)
    if (def.pushback) {
      const nx = d > 0 ? (e.x - sp.x) / d : 0;
      const ny = d > 0 ? (e.y - sp.y) / d : -e.team;
      e.x += nx * def.pushback;
      e.y += ny * def.pushback;
    }
    if (def.slow) e.slowTimer = def.slow.duration;
  }
  battle.impacts.push({ kind: sp.kind, x: sp.x, y: sp.y, radius: sp.radius, t: 0 });
}

// ---------- Challenge modifiers ----------

function updateModifiers(dt) {
  const mayhem = MAYHEM[battle.modifier];
  if (mayhem) {
    battle.mayhemTimer -= dt;
    if (battle.mayhemTimer <= 0) {
      battle.mayhemTimer = mayhem.every;
      // One free animal each, on the back line behind the barns
      const x = 60 + Math.random() * (ARENA.W - 120);
      battle.units.push(createUnit(mayhem.cardId, PLAYER, x, ARENA.H - 30, battle.enemyLevel));
      battle.units.push(createUnit(mayhem.cardId, ENEMY, ARENA.W - x, 30, battle.enemyLevel));
    }
  }

  if (battle.modifier === 'cornStorm') {
    // Show where the corn will fall, then drop a corn rain that hurts everyone's animals
    battle.stormTimer -= dt;
    if (battle.stormTimer <= 0) {
      battle.stormTimer = STORM_EVERY;
      battle.hazards.push({ x: 50 + Math.random() * (ARENA.W - 100), y: 70 + Math.random() * (ARENA.H - 140), t: 0 });
    }
    for (const h of battle.hazards) {
      h.t += dt / STORM_WARNING;
      if (h.t >= 1) castSpell(CARDS.cornRain, NEUTRAL, h.x, h.y, battle.enemyLevel);
    }
    battle.hazards = battle.hazards.filter(h => h.t < 1);
  }
}

// ---------- Feed (táp) ----------

function addFeed(team, amount, x, y) {
  if (team === PLAYER) battle.feed = Math.min(MAX_FEED, battle.feed + amount);
  else battle.enemyFeed = Math.min(MAX_FEED, battle.enemyFeed + amount);
  battle.popups.push({ x, y, text: '+' + String(amount).replace('.', ','), life: 1 });
}

// ---------- Where can a team drop cards? ----------

// Own half of the field. Once an enemy silo falls, the area in front of it opens up too.
// Spells can go anywhere.
function canDeploy(team, card, x, y) {
  if (x < 0 || x > ARENA.W || y < 0 || y > ARENA.H) return false;
  if (card.spell) return true;
  const ownHalf = team === PLAYER ? y >= ARENA.playerZoneTop : y <= ARENA.H - ARENA.playerZoneTop;
  if (ownHalf) return true;
  const laneX = x < ARENA.centerX ? ARENA.lanes[0] : ARENA.lanes[1];
  const silo = battle.towers.find(t => t.team !== team && t.kind === 'princess' && t.x === laneX);
  if (!silo || !silo.dead) return false;
  return team === PLAYER ? y >= ARENA.siloY - 10 : y <= ARENA.H - ARENA.siloY + 10;
}

// ---------- Update ----------

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function sideOf(y) {
  return y > RIVER_MID ? PLAYER : ENEMY;
}

function inRiverBand(y) {
  return y > ARENA.riverTop - 2 && y < ARENA.riverBottom + 2;
}

function closestLane(x) {
  const [l, r] = ARENA.lanes;
  return Math.abs(x - l) < Math.abs(x - r) ? l : r;
}

// Can unit u attack e at all?
function canTarget(u, e) {
  if (u.targets === 'buildings') return e.isTower || e.building;
  if (e.flying) return u.targets === 'both';
  return true;
}

// Nearest enemy unit in sight, otherwise the nearest enemy tower.
// Building-only units (cow) always pick the nearest building or tower.
function findTarget(u) {
  const buildingsOnly = u.targets === 'buildings';
  let best = null;
  let bestD = Infinity;
  for (const e of battle.units) {
    if (e.team === u.team || e.dead || !canTarget(u, e)) continue;
    const d = distance(u, e);
    if ((buildingsOnly || d < u.sight) && d < bestD) { best = e; bestD = d; }
  }
  if (best && !buildingsOnly) return best;
  for (const t of battle.towers) {
    if (t.team === u.team || t.dead) continue;
    const d = distance(u, t);
    if (d < bestD) { best = t; bestD = d; }
  }
  return best;
}

// Where to walk next: straight to the target, or over the closest bridge.
// Anywhere across the bridge's width is fine, so a group can cross side by side.
function nextWaypoint(u, target) {
  if (u.flying || u.jumpsRiver) return target;   // flyers and the horse go straight over the river
  const inRiver = inRiverBand(u.y);
  if (!inRiver && sideOf(u.y) === sideOf(target.y)) return target;

  const bridgeX = closestLane(u.x);
  const x = Math.max(bridgeX - ARENA.bridgeHalf, Math.min(bridgeX + ARENA.bridgeHalf, u.x));
  const goingUp = target.y < u.y;
  const acrossY = goingUp ? ARENA.riverTop - 12 : ARENA.riverBottom + 12;
  if (inRiver || x === u.x) return { x, y: acrossY };        // on / lined up with the bridge: cross
  const bankY = goingUp ? ARENA.riverBottom + 6 : ARENA.riverTop - 6;
  return { x, y: bankY };                                    // otherwise walk to the bridge head
}

// Buildings don't move or attack: they lose health over time and may release animals
function updateBuilding(u, dt) {
  // Wheat field: gives feed to its owner every few seconds
  if (u.produce) {
    u.produceTimer -= dt;
    if (u.produceTimer <= 0) {
      u.produceTimer = u.produceEvery;
      addFeed(u.team, u.produce.amount, u.x, u.y - 20);
    }
  }
  dealDamage(u, (u.maxHp / u.lifetime) * dt);
  if (!u.spawns || u.dead) return;
  u.spawnTimer -= dt;
  if (u.spawnTimer <= 0) {
    u.spawnTimer = u.spawnEvery;
    battle.units.push(createUnit(u.spawns, u.team, u.x, u.y - 10, u.level));
  }
}

function updateUnit(u, dt) {
  if (u.building) { updateBuilding(u, dt); return; }
  if (u.leapState) { updateLeap(u, dt); return; }

  // Stunned: electric shock stops movement and attacks
  if (u.stunTimer > 0) {
    u.stunTimer = Math.max(0, u.stunTimer - dt);
    u.moving = false;
    return;
  }

  // Honey Badger Rage Mode: below 50% HP, immune to slows and stuns
  if (u.rageMode && u.hp <= u.maxHp * 0.5) {
    u.raging = true;
    u.slowTimer = 0;
    u.stunTimer = 0;
  }

  // Mud / Slow: slowed animals move and attack at half speed
  u.slowTimer = Math.max(0, u.slowTimer - dt);
  const slow = (u.slowTimer > 0 && !u.raging) ? 0.5 : 1;
  u.cooldown -= dt * slow;
  u.leapCooldown -= dt;
  u.peck = Math.max(0, u.peck - dt);
  u.jump = Math.max(0, u.jump - dt);
  if (u.hopAttack) { updateHopAttack(u, dt); return; }

  // Animals with a time limit (guard dog) leave in a puff of smoke
  if (u.guard) {
    u.lifeLeft -= dt;
    if (u.lifeLeft <= 0) { dealDamage(u, u.hp); return; }
  }

  // Amphibian / River Leaping (Frog & Horse)
  if (u.jumpsRiver) {
    const top = ARENA.riverTop - 15;
    const bottom = ARENA.riverBottom + 15;
    u.lift = u.y > top && u.y < bottom ? Math.sin(((u.y - top) / (bottom - top)) * Math.PI) * 20 : 0;
  }

  const target = u.guard ? findGuardTarget(u) : findTarget(u);
  if (!target) {
    if (u.guard) wander(u, dt * slow);
    else u.moving = false;
    return;
  }

  const dist = distance(u, target);

  // Falcon Dive-Bombing
  if (u.diveBomb) {
    if (dist <= 130 && dist > u.range + u.radius + target.radius) {
      u.diving = true;
      u.lift = Math.max(0, (dist / 130) * 22);
    } else if (dist <= u.range + u.radius + target.radius) {
      u.lift = 0;
    } else {
      u.diving = false;
      u.lift = 22;
    }
  }

  // In reach: attack
  if (dist <= u.range + u.radius + target.radius) {
    u.moving = false;
    u.facing = target.x >= u.x ? 1 : -1;
    if (u.cooldown <= 0) attack(u, target);
    return;
  }

  // Goat: far away target on the same side of the river = big jump
  if (u.leap && u.leapCooldown <= 0 && dist >= u.leap.minDist && dist <= u.leap.maxDist &&
      sideOf(u.y) === sideOf(target.y) && !inRiverBand(u.y)) {
    startLeap(u, target);
    return;
  }

  // Charging (bull): after walking long enough it speeds up
  if (u.chargeAfter) {
    u.walkTime += dt;
    if (u.walkTime >= u.chargeAfter) u.charging = true;
    if (u.charging && Math.random() < dt * 20) spawnParticles(u.x - u.facing * 14, u.y - 2, '#d9bf8c', 1);
  }

  // Walk speed calculation
  let baseSpeed = u.speed;
  if (u.sprinting) baseSpeed *= 2;
  else if (u.charging) baseSpeed *= 2;
  else if (u.raging) baseSpeed *= 1.4;
  else if (u.diving) baseSpeed *= 2.2;
  const speed = baseSpeed * slow;
  moveToward(u, nextWaypoint(u, target), speed, dt);
}

function moveToward(u, goal, speed, dt) {
  const dx = goal.x - u.x;
  const dy = goal.y - u.y;
  const d = Math.hypot(dx, dy) || 1;
  const step = Math.min(d, speed * dt);
  u.x += (dx / d) * step;
  u.y += (dy / d) * step;
  if (Math.abs(dx) > 1) u.facing = dx > 0 ? 1 : -1;
  u.moving = true;
}

// Guard dog: only chases enemies that are on its own side of the river
function findGuardTarget(u) {
  let best = null;
  let bestD = Infinity;
  for (const e of battle.units) {
    if (e.team === u.team || e.dead || !canTarget(u, e) || sideOf(e.y) !== u.team) continue;
    const d = distance(u, e);
    if (d < u.sight && d < bestD) { best = e; bestD = d; }
  }
  return best;
}

// Nothing to chase: stroll to a random spot on its own side, pick a new one now and then
function wander(u, dt) {
  u.wanderTimer -= dt;
  if (!u.wanderTarget || u.wanderTimer <= 0 || distance(u, u.wanderTarget) < 5) {
    const top = u.team === PLAYER ? ARENA.riverBottom + 20 : 40;
    const bottom = u.team === PLAYER ? ARENA.H - 40 : ARENA.riverTop - 20;
    u.wanderTarget = { x: 30 + Math.random() * (ARENA.W - 60), y: top + Math.random() * (bottom - top) };
    u.wanderTimer = 2.5;
  }
  moveToward(u, u.wanderTarget, u.speed * 0.6, dt);
}

// Goat leap: flies in an arc to just in front of the target
function startLeap(u, target) {
  const d = distance(u, target);
  const stop = u.radius + target.radius + 2;
  const k = (d - stop) / d;
  u.leapState = {
    fromX: u.x, fromY: u.y,
    toX: u.x + (target.x - u.x) * k, toY: u.y + (target.y - u.y) * k,
    dirX: (target.x - u.x) / d, dirY: (target.y - u.y) / d,
    t: 0,
  };
  u.facing = target.x >= u.x ? 1 : -1;
  u.moving = false;
}

function updateLeap(u, dt) {
  const L = u.leapState;
  L.t = Math.min(1, L.t + dt / LEAP_TIME);
  u.x = L.fromX + (L.toX - L.fromX) * L.t;
  u.y = L.fromY + (L.toY - L.fromY) * L.t;
  u.lift = Math.sin(L.t * Math.PI) * 25;
  if (L.t < 1) return;
  u.lift = 0;
  u.leapState = null;
  u.leapCooldown = u.leap.cooldown;
  landingSlam(u, L.dirX, L.dirY);
}

// Landing: damages every enemy in a cone in front of the goat and pushes animals back
function landingSlam(u, dirX, dirY) {
  const reach = 45;
  for (const e of [...battle.units, ...battle.towers]) {
    if (e.team === u.team || e.dead || e.flying) continue;
    const dx = e.x - u.x;
    const dy = e.y - u.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d > reach + e.radius) continue;
    const facingAmount = (dx * dirX + dy * dirY) / d;   // 1 = straight ahead, 0 = to the side
    if (d > u.radius + e.radius + 4 && facingAmount < 0.5) continue;
    dealDamage(e, u.leapDamage);
    if (!e.isTower && !e.building) {
      e.x += dirX * 20;
      e.y += dirY * 20;
    }
  }
  spawnParticles(u.x + dirX * 18, u.y + dirY * 18, '#d9bf8c', 10);
}

// Rabbit: the attack is a jump, the hit happens on landing
function updateHopAttack(u, dt) {
  const hop = u.hopAttack;
  hop.t = Math.min(1, hop.t + dt / HOP_ATTACK_TIME);
  u.lift = Math.sin(hop.t * Math.PI) * 26;
  if (hop.t < 1) return;
  u.lift = 0;
  u.hopAttack = null;
  if (!hop.target.dead) hit(u, hop.target, hop.damage);
}

function attack(u, target) {
  let damage = u.damage;
  if (target.flying) {
    damage *= u.airMultiplier;
    if (!u.projectile) u.jump = JUMP_TIME;   // melee birds flutter up to reach flyers
  }
  if (u.charging) damage *= 2;               // charge hit = double damage
  if (target.bird) damage *= u.bonusVsBirds; // fox bites birds harder

  // Cheetah Sprint Burst: 2.5x damage on first strike
  if (u.sprinting) {
    damage *= 2.5;
    u.sprinting = false;
    spawnParticles(u.x, u.y, '#e67e22', 12);
  }

  // Falcon Dive-Bomb: 2.2x damage on aerial dive strike
  if (u.diving) {
    damage *= 2.2;
    u.diving = false;
    spawnParticles(target.x, target.y, '#4b382a', 10);
  }

  // Frog Tongue Pull: snatches light enemy units
  if (u.tonguePull && !target.isTower && !target.building && (target.radius <= 12 || target.hp <= 650)) {
    const pullDist = distance(u, target);
    if (pullDist > u.radius + target.radius + 15) {
      const k = 0.65;
      target.x += (u.x - target.x) * k;
      target.y += (u.y - target.y) * k;
      spawnParticles(target.x, target.y, '#2ecc71', 6);
    }
  }

  // Gorilla Ground Pound: creates circular earthquake shockwave
  if (u.groundPound) {
    const gp = u.groundPound;
    for (const e of [...battle.units, ...battle.towers]) {
      if (e.team === u.team || e.dead || e.flying) continue;
      const d = distance(u, e);
      if (d <= gp.radius + e.radius) {
        if (e !== target) dealDamage(e, damage * 0.7);
        if (!e.isTower && !e.building) {
          const nx = d > 0 ? (e.x - u.x) / d : 0;
          const ny = d > 0 ? (e.y - u.y) / d : 1;
          e.x += nx * gp.pushback;
          e.y += ny * gp.pushback;
          e.slowTimer = gp.slowDuration;
        }
      }
    }
    spawnParticles(u.x, u.y, '#7f8c8d', 16);
  }

  // Honey Badger Rage Mode: 2x attack rate (+100% attack speed)
  if (u.raging) {
    u.cooldown = u.attackRate * 0.5;
    spawnParticles(u.x, u.y, '#e74c3c', 5);
  } else {
    u.cooldown = u.attackRate;
  }

  u.peck = 0.2;
  u.walkTime = 0;
  u.charging = false;

  if (u.jumpAttack) {
    u.hopAttack = { t: 0, target, damage };   // damage is dealt when it lands
    return;
  }
  hit(u, target, damage);
}

// Deals one attack's damage (plus splash, poison, shockwave, etc.)
function hit(u, target, damage) {
  // Rabbit: area damage on the ground around the target
  if (u.splashRadius) {
    for (const e of battle.units) {
      if (e === target || e.team === u.team || e.dead || e.flying) continue;
      if (distance(e, target) <= u.splashRadius) dealDamage(e, damage);
    }
    spawnParticles(target.x, target.y, '#d9bf8c', 6);
  }

  // Electric Eel: Shock Wave chain lightning with stun
  if (u.shockWave) {
    const sw = u.shockWave;
    target.stunTimer = sw.stunDuration;
    let chained = 0;
    for (const e of battle.units) {
      if (chained >= sw.chainCount - 1) break;
      if (e === target || e.team === u.team || e.dead) continue;
      if (distance(target, e) <= sw.chainRange) {
        dealDamage(e, damage * 0.75);
        e.stunTimer = sw.stunDuration;
        spawnParticles(e.x, e.y, '#00d2d3', 6);
        chained++;
      }
    }
    spawnParticles(target.x, target.y, '#00d2d3', 10);
  }

  if (u.projectile) {
    battle.projectiles.push({ kind: u.projectile, x: u.x, y: u.y - (u.flying ? 32 : 14), target, damage, speed: 220 });
  } else {
    dealDamage(target, damage);
  }
  if (u.poison) target.poisons.push({ dps: u.poison.dps, time: u.poison.duration });
  if (u.kamikaze) dealDamage(u, u.hp);       // bee dies after stinging
}

function updateTower(t, dt) {
  if (t.dead || !t.active) return;
  t.cooldown -= dt;
  if (t.cooldown > 0) return;

  let best = null;
  let bestD = Infinity;
  for (const u of battle.units) {
    if (u.team === t.team || u.dead) continue;
    const d = distance(t, u) - u.radius;
    if (d < t.range && d < bestD) { best = u; bestD = d; }
  }
  if (!best) return;

  // Shoot a corn kernel
  battle.projectiles.push({ kind: 'corn', x: t.x, y: t.y - 30, target: best, damage: t.damage, speed: 320, splash: t.splashRadius, team: t.team });
  t.cooldown = t.attackRate;
}

function updateProjectiles(dt) {
  for (const p of battle.projectiles) {
    const dx = p.target.x - p.x;
    const dy = (p.target.y - 8) - p.y;
    const d = Math.hypot(dx, dy);
    if (p.target.dead) { p.done = true; continue; }
    if (d < 6) {
      dealDamage(p.target, p.damage);
      if (p.kind === 'egg') spawnParticles(p.x, p.y, '#ffd23f', 5);
      // Barn shots also hit every enemy animal around the target
      if (p.splash) {
        for (const u of battle.units) {
          if (u !== p.target && u.team !== p.team && !u.dead && distance(u, p.target) <= p.splash) dealDamage(u, p.damage);
        }
        spawnParticles(p.x, p.y, '#ffd23f', 8);
      }
      p.done = true;
      continue;
    }
    p.x += (dx / d) * p.speed * dt;
    p.y += (dy / d) * p.speed * dt;
  }
  battle.projectiles = battle.projectiles.filter(p => !p.done);
}

// Poison: each sting adds its own small damage-over-time
function updatePoison(target, dt) {
  if (target.dead || target.poisons.length === 0) return;
  for (const p of target.poisons) {
    dealDamage(target, p.dps * dt);
    p.time -= dt;
  }
  target.poisons = target.poisons.filter(p => p.time > 0);
}

function dealDamage(target, amount) {
  if (target.dead) return;
  // Armadillo Shell Defense: 50% damage reduction shield when drops below 50% HP
  if (target.shellDefense && target.hp <= target.maxHp * 0.5) {
    amount *= (1 - target.shellDefense);
    spawnParticles(target.x, target.y, '#f39c12', 3);
  }
  if (target.isTower) target.active = true;   // a hit barn wakes up
  target.hp -= amount;
  if (target.hp > 0) return;
  target.hp = 0;
  target.dead = true;
  if (target.isTower) onTowerDestroyed(target);
  else onUnitDeath(target);
}

function onUnitDeath(u) {
  spawnSmoke(u.x, u.y - 8, u.radius);
  if (u.deathFeed) addFeed(u.team, u.deathFeed, u.x, u.y - 20);
  // Some buildings release animals when destroyed (beehive)
  for (let i = 0; i < u.spawnOnDeath; i++) {
    battle.units.push(createUnit(u.spawns, u.team, u.x + (i % 2 ? 8 : -8), u.y - 10, u.level));
  }
}

function onTowerDestroyed(t) {
  const winnerKey = t.team === ENEMY ? 'player' : 'enemy';
  battle.crowns[winnerKey]++;
  // Losing a silo wakes up that side's barn
  battle.towers.forEach(other => { if (other.team === t.team) other.active = true; });
  if (t.kind === 'king') {
    battle.crowns[winnerKey] = 3;
    endBattle();
  }
  // Sudden death: the first tower decides the match
  if (battle.modifier === 'suddenDeath') endBattle();
}

// Keeps units from stacking on each other, walking into towers or into the water
function separateUnits() {
  const units = battle.units;
  for (let i = 0; i < units.length; i++) {
    const a = units[i];
    if (a.leapState) continue;   // mid-air goats don't bump into anything
    for (let j = i + 1; j < units.length; j++) {
      const b = units[j];
      if (a.flying !== b.flying || b.leapState) continue;   // air and ground don't bump
      if (a.ignoresCollision || b.ignoresCollision) continue; // Snake slithers past frontline tanks!
      const d = distance(a, b);
      const min = a.radius + b.radius;
      if (d > 0 && d < min) {
        // Buildings never get pushed, the other unit moves the full distance
        const pushA = a.building ? 0 : b.building ? min - d : (min - d) / 2;
        const pushB = b.building ? 0 : a.building ? min - d : (min - d) / 2;
        const nx = (a.x - b.x) / d;
        const ny = (a.y - b.y) / d;
        a.x += nx * pushA; a.y += ny * pushA;
        b.x -= nx * pushB; b.y -= ny * pushB;
      }
    }
    a.x = Math.max(10, Math.min(ARENA.W - 10, a.x));
    if (a.flying) continue;   // flyers pass over towers and water

    for (const t of battle.towers) {
      if (t.dead) continue;
      const d = distance(a, t);
      const min = a.radius + t.radius;
      if (d > 0 && d < min) {
        a.x += ((a.x - t.x) / d) * (min - d);
        a.y += ((a.y - t.y) / d) * (min - d);
      }
    }

    // Pushed off a bridge? Step back onto it (or back onto the bank if far off)
    if (inRiverBand(a.y) && !a.jumpsRiver) {
      const bridgeX = closestLane(a.x);
      const off = Math.abs(a.x - bridgeX) - ARENA.bridgeHalf;
      if (off > 10) a.y = a.y < RIVER_MID ? ARENA.riverTop - 3 : ARENA.riverBottom + 3;
      else if (off > 0) a.x = Math.max(bridgeX - ARENA.bridgeHalf, Math.min(bridgeX + ARENA.bridgeHalf, a.x));
    }
  }
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    battle.particles.push({
      x, y, color,
      vx: (Math.random() - 0.5) * 60,
      vy: -Math.random() * 50,
      rot: Math.random() * 6,
      life: 0.8,
    });
  }
}

// Soft gray puff; bigger animals make a bigger cloud
function spawnSmoke(x, y, size) {
  const count = 5 + Math.round(size / 3);
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    battle.particles.push({
      smoke: true,
      x: x + Math.cos(angle) * size * 0.5,
      y: y + Math.sin(angle) * size * 0.3,
      vx: Math.cos(angle) * 12,
      vy: -8 - Math.random() * 8,
      r: size * 0.5 + Math.random() * 2,
      shade: 170 + Math.floor(Math.random() * 50),
      life: 0.7,
    });
  }
}

function updateParticles(dt) {
  for (const p of battle.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += (p.smoke ? 0 : 60) * dt;   // smoke floats, bits fall
    p.rot += dt * 4;
    p.life -= dt;
  }
  battle.particles = battle.particles.filter(p => p.life > 0);
}

// Very simple enemy with its own random 8-card deck:
// throws spells at groups, defends against intruders, otherwise saves up and attacks
function updateAI(dt) {
  if (battle.multiplayer) return; // In multiplayer, opponent is a real human player!
  battle.aiTimer -= dt;
  if (battle.aiTimer > 0) return;
  battle.aiTimer = 0.5;

  const card = CARDS[battle.aiNext];
  if (battle.enemyFeed < card.cost) return;

  const pos = card.spell ? aiSpellTarget(card) : aiTroopSpot(card);
  if (!pos) {
    // Nothing worth doing with this card right now: sometimes pick another one
    if (Math.random() < 0.2) battle.aiNext = randomFrom(battle.enemyDeck);
    return;
  }

  playCard(battle.aiNext, ENEMY, pos.x, pos.y);
  battle.enemyFeed -= card.cost;
  battle.aiNext = randomFrom(battle.enemyDeck);
  battle.aiWant = card.cost + Math.floor(Math.random() * 5);
  battle.aiTimer = 1.5;
}

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Spell: aim at the player's biggest group (at least 2 animals, or 1 big one)
function aiSpellTarget(card) {
  let best = null;
  let bestScore = 0;
  for (const u of battle.units) {
    if (u.team !== PLAYER || u.dead) continue;
    let score = 0;
    for (const o of battle.units) {
      if (o.team === PLAYER && !o.dead && distance(u, o) <= card.spell.radius) score += Math.min(o.hp, card.spell.damage);
    }
    if (score > bestScore) { best = u; bestScore = score; }
  }
  return bestScore >= card.spell.damage * 1.5 ? { x: best.x, y: best.y } : null;
}

function aiTroopSpot(card) {
  const unit = card.unit;
  // Feed-making buildings go safely in the back
  if (unit.produce) return { x: ARENA.lanes[Math.random() < 0.5 ? 0 : 1], y: 100 };

  const intruder = battle.units.find(u => u.team === PLAYER && !u.dead && u.y < RIVER_MID);
  if (intruder && unit.targets !== 'buildings') {
    return {
      x: Math.max(20, Math.min(ARENA.W - 20, intruder.x)),
      y: Math.max(30, Math.min(ARENA.riverTop - 15, intruder.y - 50)),
    };
  }
  if (battle.enemyFeed < battle.aiWant) return null;
  // Attack a lane; if that lane's silo is already down, drop in much closer
  const x = ARENA.lanes[Math.random() < 0.5 ? 0 : 1];
  const deepY = ARENA.H - ARENA.siloY + 5;
  return { x, y: canDeploy(ENEMY, card, x, deepY) ? deepY : 240 };
}

function update(dt) {
  battle.time -= dt;
  if (battle.time <= 0) {
    battle.time = 0;
    endBattle();
    return;
  }

  // 2x táp in the last minute (or the whole match with the "double" modifier)
  const regen = (isDoubleFeed() ? 2 : 1) * dt / FEED_REGEN;
  battle.feed = Math.min(MAX_FEED, battle.feed + regen);
  battle.enemyFeed = Math.min(MAX_FEED, battle.enemyFeed + regen);

  updateAI(dt);
  updateModifiers(dt);
  updateSpells(dt);
  battle.units.forEach(u => updateUnit(u, dt));
  battle.towers.forEach(t => updateTower(t, dt));
  updateProjectiles(dt);
  battle.units.forEach(u => updatePoison(u, dt));
  battle.towers.forEach(t => updatePoison(t, dt));
  battle.units = battle.units.filter(u => !u.dead);
  separateUnits();
  updateParticles(dt);
  for (const p of battle.popups) { p.y -= 20 * dt; p.life -= dt; }
  battle.popups = battle.popups.filter(p => p.life > 0);
}

function challengeModifierName(id) {
  return CHALLENGE_MODIFIERS[id].name;
}

function isDoubleFeed() {
  return battle.modifier === 'double' || battle.time <= DOUBLE_FEED_TIME;
}

function endBattle() {
  if (battle.over) return;
  battle.over = true;
  const p = battle.crowns.player;
  const e = battle.crowns.enemy;
  document.getElementById('result-title').textContent = p > e ? 'Győzelem!' : p < e ? 'Vereség' : 'Döntetlen';
  document.getElementById('result-crowns').textContent = `Koronák: ${p} - ${e}`;

  const chestInfo = document.getElementById('result-chest');
  if (battle.challenge) {
    // Challenges don't give trophies or chests, they just get marked as done
    if (p > e) {
      save.challengesWon = save.challengesWon || {};
      save.challengesWon[battle.challenge.id] = true;
      saveGame();
    }
    chestInfo.innerHTML = p > e ? '<span class="new-arena">Kihívás teljesítve!</span>' : '';
    document.getElementById('result').classList.remove('hidden');
    return;
  }

  // Trophies: +30 for a win, -10 for a loss
  const arenaBefore = highestArena();
  const trophyChange = changeTrophies(p > e, p < e);
  chestInfo.innerHTML = `<span class="icon" data-icon="trophy"></span><span>${trophyChange >= 0 ? '+' : ''}${trophyChange}</span>`;

  // A victory also gives gold and a chest of this arena, if there is a free slot
  if (p > e) {
    save.wins++;
    save.gold += VICTORY_GOLD;
    const chest = earnChest(battle.arena);
    chestInfo.innerHTML += `<span class="icon" data-icon="gold"></span><span>+${VICTORY_GOLD}</span>` + (chest
      ? `<span class="icon" data-icon="chest_${chest.type}"></span><span>${chestName(chest)}</span>`
      : '<span>Minden ládahely foglalt, most nem kaptál ládát.</span>');
    saveGame();
  }
  if (highestArena() > arenaBefore) chestInfo.innerHTML += `<span class="new-arena">Új aréna: ${ARENAS[highestArena() - 1].name}!</span>`;
  applyIcons(chestInfo);

  if (typeof isMultiplayerMatch !== 'undefined' && isMultiplayerMatch && typeof notifyMultiplayerBattleEnd === 'function') {
    notifyMultiplayerBattleEnd(p, e);
  }
  if (typeof updatePlayerCupsUI === 'function') {
    updatePlayerCupsUI();
  }

  document.getElementById('result').classList.remove('hidden');
}

// ---------- Render ----------

function render(time) {
  // Work in arena units: scale up for sharpness and center the arena
  const k = view.scale * view.dpr;
  ctx.setTransform(k, 0, 0, k, view.offsetX * view.dpr, view.offsetY * view.dpr);

  // Grass around the arena fills any leftover space, then the arena itself
  const left = -view.offsetX / view.scale;
  const top = -view.offsetY / view.scale;
  drawGrass(ctx, left, top, ARENA.W - left, ARENA.H - top, battle.arena === 2 ? FOREST_GRASS : undefined);
  ctx.drawImage(arenaImage, 0, 0, ARENA.W, ARENA.H);

  // While a card is selected: dim where you can't drop it, show where it would land
  if (selectedSlot !== null) {
    const card = CARDS[battle.hand[selectedSlot]];
    if (!card.spell) {
      ctx.fillStyle = 'rgba(120,0,0,0.18)';
      [0, 1].forEach(i => {
        const x0 = i === 0 ? 0 : ARENA.centerX;
        const pocketOpen = canDeploy(PLAYER, card, x0 + 1, ARENA.siloY);
        ctx.fillRect(x0, 0, ARENA.centerX, pocketOpen ? ARENA.siloY - 10 : ARENA.playerZoneTop);
      });
    }
    if (mouse && canDeploy(PLAYER, card, mouse.x, mouse.y)) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      if (card.spell) ellipse(ctx, mouse.x, mouse.y, card.spell.radius, card.spell.radius);
      else ellipse(ctx, mouse.x, mouse.y, 20, 12);
      ctx.fill();
    }
  }

  // Corn storm warnings: a pulsing circle where the corn will fall
  for (const h of battle.hazards) {
    const pulse = 0.5 + Math.sin(time * 12) * 0.2;
    ctx.fillStyle = `rgba(232,165,31,${0.15 + h.t * 0.2})`;
    ctx.strokeStyle = `rgba(232,120,20,${pulse})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ellipse(ctx, h.x, h.y, CARDS.cornRain.spell.radius, CARDS.cornRain.spell.radius);
    ctx.fill(); ctx.stroke();
    ctx.setLineDash([]);
  }

  // Spell aftermath lies on the ground under the animals
  battle.impacts.forEach(im => drawSpellImpact(ctx, im));

  // Draw towers and ground units sorted by y so nearer things overlap farther ones,
  // then flyers on top of everything
  const ground = battle.units.filter(u => !u.flying);
  const things = [...battle.towers, ...ground].sort((a, b) => a.y - b.y);
  for (const t of things) {
    if (t.isTower) drawTower(ctx, t);
    else drawUnit(ctx, t, time);
  }
  battle.units.filter(u => u.flying).forEach(u => drawUnit(ctx, u, time));

  // Sleeping barns: little "z z" above the roof
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.textAlign = 'center';
  for (const t of battle.towers) {
    if (t.dead || t.active) continue;
    const bob = (time * 0.8) % 1;
    ctx.globalAlpha = 1 - bob;
    ctx.font = 'bold 11px Trebuchet MS, sans-serif';
    ctx.fillText('z', t.x + 20 + bob * 6, t.y - 50 - bob * 12);
    ctx.font = 'bold 14px Trebuchet MS, sans-serif';
    ctx.fillText('Z', t.x + 30 + bob * 6, t.y - 62 - bob * 12);
    ctx.globalAlpha = 1;
  }

  // Mud marks on slowed animals, then incoming spells on top
  battle.units.forEach(u => { if (u.slowTimer > 0) drawSlowedMark(ctx, u.x, u.y, time); });
  battle.spells.forEach(sp => drawSpell(ctx, sp, time));

  // Green bubbles over poisoned things
  ctx.fillStyle = 'rgba(120,220,60,0.85)';
  for (const t of [...battle.towers, ...battle.units]) {
    if (t.dead || t.poisons.length === 0) continue;
    const h = t.isTower ? 45 : 22;
    for (let i = 0; i < 3; i++) {
      const bob = (time * 1.5 + i / 3) % 1;
      ellipse(ctx, t.x - 6 + i * 6, t.y - h - bob * 10, 2, 2); ctx.fill();
    }
  }

  // Projectiles: eggs from hens, corn kernels from towers
  for (const p of battle.projectiles) {
    if (p.kind === 'egg') {
      drawEgg(ctx, p.x, p.y);
    } else {
      ctx.fillStyle = '#ffd23f';
      ctx.strokeStyle = '#8a6a10';
      ctx.lineWidth = 1;
      ellipse(ctx, p.x, p.y, 3, 4); ctx.fill(); ctx.stroke();
    }
  }

  // Smoke puffs / egg splats / dust
  for (const p of battle.particles) {
    if (p.smoke) {
      const t = 1 - p.life / 0.7;   // 0 -> 1 over its life
      ctx.globalAlpha = Math.max(0, 0.85 * (1 - t));
      ctx.fillStyle = `rgb(${p.shade},${p.shade},${p.shade})`;
      ellipse(ctx, p.x, p.y, p.r * (1 + t), p.r * (1 + t));
      ctx.fill();
      continue;
    }
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life / 0.8);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ellipse(ctx, 0, 0, 3.5, 1.5); ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  // Floating "+1" feed texts
  ctx.font = 'bold 14px Trebuchet MS, sans-serif';
  ctx.textAlign = 'center';
  for (const p of battle.popups) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = '#ffd23f';
    ctx.strokeStyle = '#5a3515';
    ctx.lineWidth = 3;
    ctx.strokeText(p.text, p.x, p.y);
    ctx.fillText(p.text, p.x, p.y);
  }
  ctx.globalAlpha = 1;

  drawHud();
}

function drawHud() {
  // Timer box, sized to fit its label
  const label = 'Hátralévő idő';
  ctx.font = 'bold 10px Trebuchet MS, sans-serif';
  const boxW = ctx.measureText(label).width + 16;
  const boxX = ARENA.W - 12 - boxW;
  const cx = boxX + boxW / 2;
  ctx.fillStyle = 'rgba(40,25,10,0.7)';
  ctx.fillRect(boxX, 20, boxW, 36);
  ctx.fillStyle = '#fff6e0';
  ctx.textAlign = 'center';
  ctx.fillText(label, cx, 32);
  const t = Math.ceil(battle.time);
  ctx.font = 'bold 16px Trebuchet MS, sans-serif';
  ctx.fillText(`${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`, cx, 50);

  // "2x táp" and the challenge modifier, under the enemy crowns
  const labels = [];
  if (isDoubleFeed()) labels.push('2x táp!');
  if (battle.modifier && battle.modifier !== 'double') labels.push(challengeModifierName(battle.modifier));
  labels.forEach((text, i) => {
    ctx.font = 'bold 13px Trebuchet MS, sans-serif';
    const w = ctx.measureText(text).width + 16;
    ctx.fillStyle = 'rgba(40,25,10,0.7)';
    ctx.fillRect(12, 46 + i * 24, w, 20);
    ctx.fillStyle = '#ffd23f';
    ctx.fillText(text, 12 + w / 2, 61 + i * 24);
  });

  // Crowns: enemy top-left, player bottom-left
  for (let i = 0; i < 3; i++) {
    drawCrown(ctx, 24 + i * 22, 30, i < battle.crowns.enemy ? TEAM_COLORS[ENEMY] : 'rgba(0,0,0,0.25)');
    drawCrown(ctx, 24 + i * 22, 612, i < battle.crowns.player ? TEAM_COLORS[PLAYER] : 'rgba(0,0,0,0.25)');
  }
}

// ---------- Hand UI (4 cards + the next one) ----------

// enteringSlot: the slot that just got a new card; it flies in from the "next" spot
function renderHand(enteringSlot = null) {
  const hand = document.getElementById('hand-cards');
  hand.innerHTML = '';

  const next = document.createElement('div');
  next.className = 'next-card';
  next.innerHTML = `<span>Következő</span><canvas width="${40 * view.dpr}" height="${40 * view.dpr}"></canvas>`;
  drawCardPortrait(next.querySelector('canvas'), battle.queue[0]);
  hand.appendChild(next);

  battle.hand.forEach((id, slot) => {
    const btn = document.createElement('button');
    btn.className = 'hand-card';
    btn.dataset.slot = slot;
    btn.innerHTML = `
      <canvas width="${60 * view.dpr}" height="${60 * view.dpr}"></canvas>
      <span class="hand-name">${CARDS[id].name}</span>
      <span class="cost-badge">${CARDS[id].cost}</span>`;
    drawCardPortrait(btn.querySelector('canvas'), id);
    btn.addEventListener('click', () => {
      selectedSlot = selectedSlot === slot ? null : slot;
    });
    hand.appendChild(btn);
  });

  if (enteringSlot !== null) {
    // Slide the new card from the "next" preview into its slot, and pop in the new "next" card
    const card = hand.querySelector(`.hand-card[data-slot="${enteringSlot}"]`);
    const from = next.getBoundingClientRect();
    const to = card.getBoundingClientRect();
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    card.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(0.5)`, opacity: 0.4 },
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
    ], { duration: 350, easing: 'ease-out' });
    next.animate([
      { transform: 'scale(0)', opacity: 0 },
      { transform: 'scale(1)', opacity: 1 },
    ], { duration: 250, delay: 200, easing: 'ease-out', fill: 'backwards' });
  }
}

function updateHandUI() {
  document.getElementById('feed-fill').style.width = (battle.feed / MAX_FEED) * 100 + '%';
  document.getElementById('feed-count').textContent = Math.floor(battle.feed);
  document.querySelectorAll('.hand-card').forEach(el => {
    const slot = Number(el.dataset.slot);
    el.classList.toggle('selected', slot === selectedSlot);
    el.classList.toggle('too-expensive', CARDS[battle.hand[slot]].cost > battle.feed);
  });
}

// ---------- Input ----------

function canvasPos(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left - view.offsetX) / view.scale,
    y: (e.clientY - r.top - view.offsetY) / view.scale,
  };
}

function deployAtPos(pos) {
  if (!battle || battle.over || selectedSlot === null) return;
  const cardId = battle.hand[selectedSlot];
  const card = CARDS[cardId];
  if (!canDeploy(PLAYER, card, pos.x, pos.y) || battle.feed < card.cost) return;

  const targetY = Math.min(pos.y, ARENA.H - 20);
  playCard(cardId, PLAYER, pos.x, targetY);

  if (battle.multiplayer && typeof broadcastDeployCard === 'function') {
    broadcastDeployCard(cardId, pos.x, targetY);
  }

  battle.feed -= card.cost;

  // Card rotation: the next card takes the empty slot, the played one goes to the back
  const usedSlot = selectedSlot;
  battle.hand[usedSlot] = battle.queue.shift();
  battle.queue.push(cardId);
  selectedSlot = null;
  renderHand(usedSlot);
}

canvas.addEventListener('mousemove', e => { mouse = canvasPos(e); });
canvas.addEventListener('mouseleave', () => { mouse = null; });
canvas.addEventListener('click', e => {
  deployAtPos(canvasPos(e));
});

// Mobile Touch Controls
canvas.addEventListener('touchstart', e => {
  if (e.touches && e.touches.length > 0) mouse = canvasPos(e.touches[0]);
}, { passive: true });
canvas.addEventListener('touchmove', e => {
  if (e.touches && e.touches.length > 0) mouse = canvasPos(e.touches[0]);
}, { passive: true });
canvas.addEventListener('touchend', e => {
  if (e.changedTouches && e.changedTouches.length > 0) {
    deployAtPos(canvasPos(e.changedTouches[0]));
  }
  mouse = null;
});

// Makes the canvas fill its box at full screen resolution (no gaps, no blur).
// The arena keeps its shape and is centered; extra space is grass.
function fitCanvas() {
  const wrap = canvas.parentElement;
  const w = wrap.clientWidth;
  const h = wrap.clientHeight;
  view.dpr = window.devicePixelRatio || 1;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  canvas.width = Math.round(w * view.dpr);
  canvas.height = Math.round(h * view.dpr);
  view.scale = Math.min(w / ARENA.W, h / ARENA.H);
  view.offsetX = (w - ARENA.W * view.scale) / 2;
  view.offsetY = (h - ARENA.H * view.scale) / 2;
  const arenaId = (battle && battle.arena) ? battle.arena : save.arena;
  const arenaDef = ARENAS[Math.min(ARENAS.length, Math.max(1, arenaId)) - 1] || ARENAS[0];
  arenaImage = arenaDef.build(view.scale * view.dpr);
}
window.addEventListener('resize', () => { if (battle) fitCanvas(); });

// ---------- Loop ----------

function battleLoop(now) {
  if (!battle) return;
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  if (!battle.over) update(dt);
  render(now / 1000);
  updateHandUI();
  requestAnimationFrame(battleLoop);
}

function stopBattle() {
  battle = null;
}
