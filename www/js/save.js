// Player progression: gold, trophies, card levels, unlocked cards, deck and chests.
// Saved in the browser (localStorage).
const SAVE_KEY = 'allatiArena.save';

// TEMPORARY testing switch: unlocks every card and every arena. Set to false for the real game.
const DEV_UNLOCK_ALL = true;

// Trophies for a win / loss
const WIN_TROPHIES = 30;
const LOSS_TROPHIES = 10;

// Everyone starts with these 8 cards; the rest are found in chests
const STARTER_DECK = ['chickens', 'hen', 'piglet', 'cornRain', 'mudBall', 'cow', 'mangalica', 'goat'];
const MAX_LEVEL = 10;
const CHEST_SLOTS = 4;
const DECK_SIZE = 8;

// Every gold reward is multiplied by this (+20%)
const GOLD_BONUS = 1.2;
const VICTORY_GOLD = Math.round(10 * GOLD_BONUS);

// chance: how often a victory gives this chest; draws: how many random cards are inside.
// The full chest name also says which arena it is from (see chestName).
const CHESTS = {
  small:  { name: 'Kis',     minutes: 5,  chance: 0.70, gold: Math.round(20 * GOLD_BONUS),  cards: 24,  draws: 3 },
  medium: { name: 'Közepes', minutes: 10, chance: 0.25, gold: Math.round(41 * GOLD_BONUS),  cards: 52,  draws: 4 },
  large:  { name: 'Nagy',    minutes: 20, chance: 0.05, gold: Math.round(100 * GOLD_BONUS), cards: 120, draws: 6 },
};

function defaultSave() {
  return {
    gold: 500,
    gems: 120,
    wins: 0,
    trophies: 0,
    arena: 1,      // the arena picked in the lobby
    cards: {},     // id -> { level, count, unlocked }
    deck: [...STARTER_DECK],
    savedDecks: [
      [...STARTER_DECK],
      ['snake', 'frog', 'cheetah', 'eel', 'armadillo', 'falcon', 'badger', 'gorilla'],
      ['chickens', 'rooster', 'bull', 'horse', 'snake', 'frog', 'cheetah', 'cornRain']
    ],
    activeDeckIndex: 0,
    chests: [],    // { type, arena, readyAt } (readyAt = time in ms when it can be opened)
    bundlesBought: {},
  };
}

function loadSave() {
  let data = null;
  try {
    data = JSON.parse(localStorage.getItem(SAVE_KEY));
  } catch (e) {
    data = null;
  }
  const s = Object.assign(defaultSave(), data || {});
  if (s.gems === undefined) s.gems = 120;
  if (!s.savedDecks || s.savedDecks.length < 3) {
    s.savedDecks = [
      [...s.deck],
      ['snake', 'frog', 'cheetah', 'eel', 'armadillo', 'falcon', 'badger', 'gorilla'],
      ['chickens', 'rooster', 'bull', 'horse', 'snake', 'frog', 'cheetah', 'cornRain']
    ];
    s.activeDeckIndex = 0;
  if (!s.playerId) {
    s.playerId = 'player_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
  }
  if (!s.playerName) {
    s.playerName = 'Harcos';
  }
  if (s.trophies === undefined || s.trophies === null || isNaN(s.trophies)) {
    s.trophies = 0;
  }
  if (!s.bundlesBought) s.bundlesBought = {};
  // Every card gets an entry, also cards added in a later version of the game
  for (const id of Object.keys(CARDS)) {
    if (!s.cards[id]) s.cards[id] = { level: 1, count: 0 };
    const c = s.cards[id];
    // Older saves had no "unlocked": keep everything the player already used or collected
    if (c.unlocked === undefined) {
      c.unlocked = STARTER_DECK.includes(id) || s.deck.includes(id) || c.count > 0 || c.level > 1;
    }
  }
  return s;
}

function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch (e) {
    // Storage blocked (private window etc.): the game still works, it just won't remember
  }
}

const save = loadSave();

// ---------- Unlocks: cards and arenas ----------

function isCardUnlocked(id) {
  return DEV_UNLOCK_ALL || save.cards[id].unlocked;
}

function isArenaUnlocked(arenaId) {
  return DEV_UNLOCK_ALL || save.trophies >= ARENAS[arenaId - 1].trophies;
}

// Win: +30 trophies, loss: -10 (never below 0). Returns the change.
function changeTrophies(won, lost) {
  const before = save.trophies;
  if (won) save.trophies += WIN_TROPHIES;
  if (lost) save.trophies = Math.max(0, save.trophies - LOSS_TROPHIES);
  saveGame();
  return save.trophies - before;
}

// ---------- Card levels ----------

// Level 1 -> 2 costs 5 cards + 7 gold, every next level costs 1.4x more (keeps the 5:7 ratio)
function upgradeCost(level) {
  const factor = Math.pow(1.4, level - 1);
  return { cards: Math.round(5 * factor), gold: Math.round(7 * factor) };
}

// Each level adds +10% health and damage
function levelMultiplier(level) {
  return 1 + 0.1 * (level - 1);
}

function canUpgrade(id) {
  const p = save.cards[id];
  if (p.level >= MAX_LEVEL) return false;
  const cost = upgradeCost(p.level);
  return p.count >= cost.cards && save.gold >= cost.gold;
}

function upgradeCard(id) {
  if (!canUpgrade(id)) return;
  const p = save.cards[id];
  const cost = upgradeCost(p.level);
  p.count -= cost.cards;
  save.gold -= cost.gold;
  p.level++;
  saveGame();
}

// ---------- Chests ----------

function rollChestType() {
  const r = Math.random();
  if (r < CHESTS.large.chance) return 'large';
  if (r < CHESTS.large.chance + CHESTS.medium.chance) return 'medium';
  return 'small';
}

// e.g. "Kis farmláda" or "Közepes erdei láda"
function chestName(chest) {
  return `${CHESTS[chest.type].name} ${ARENAS[(chest.arena || 1) - 1].chestWord}`;
}

// Called after a victory in an arena. Returns the chest, or null if all slots are full.
function earnChest(arenaId) {
  if (save.chests.length >= CHEST_SLOTS) return null;
  const type = rollChestType();
  const chest = { type, arena: arenaId, readyAt: Date.now() + CHESTS[type].minutes * 60 * 1000 };
  save.chests.push(chest);
  saveGame();
  return chest;
}

// Random card from this arena or earlier ones; rarer cards come up less often
function randomCardByRarity(arenaId) {
  const ids = Object.keys(CARDS).filter(id => CARDS[id].arena <= arenaId);
  const total = ids.reduce((sum, id) => sum + RARITIES[CARDS[id].rarity].weight, 0);
  let r = Math.random() * total;
  for (const id of ids) {
    r -= RARITIES[CARDS[id].rarity].weight;
    if (r <= 0) return id;
  }
  return ids[0];
}

// Opens a ready chest, adds the rewards and returns them:
// { chest, gold, cards: { id: amount }, newCards: [ids unlocked for the first time] }
function openChest(index) {
  const chest = save.chests[index];
  if (!chest || Date.now() < chest.readyAt) return null;
  const def = CHESTS[chest.type];
  const rewards = { chest, gold: def.gold, cards: {}, newCards: [] };
  const perDraw = Math.round(def.cards / def.draws);
  for (let i = 0; i < def.draws; i++) {
    const id = randomCardByRarity(chest.arena || 1);
    rewards.cards[id] = (rewards.cards[id] || 0) + perDraw;
  }

  save.gold += rewards.gold;
  for (const id in rewards.cards) {
    const c = save.cards[id];
    if (!c.unlocked) { c.unlocked = true; rewards.newCards.push(id); }
    c.count += rewards.cards[id];
  }
  save.chests.splice(index, 1);
  saveGame();
  return rewards;
}
