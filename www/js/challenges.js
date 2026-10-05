// Challenges page ("Kihívás"): every channel member (js/members.js) gets their own challenge.
//
// The challenge is made from the member's public YouTube handle (@...):
//   id -> hashString() -> a number (the "seed") -> seededRandom(seed) -> "random" numbers
// The same id always gives the same seed, and the same seed always gives the same
// "random" numbers, so a member's decks and modifier never change. Nothing has to be saved.
//
// A challenge looks like this (see getChallenge):
//   {
//     id: '@handle',
//     seed: 1234567890,
//     playerDeck: [8 card ids],   // the deck YOU play with
//     enemyDeck:  [8 card ids],   // the deck of the enemy
//     modifier: 'double',         // an id from CHALLENGE_MODIFIERS, or null (no modifier)
//   }
// The "Harc!" button calls openBattle({ challenge }) (the battle code does the rest).
// A won challenge is remembered in the save as save.challengesWon[id] = true.
//
// Load this file after icons.js, cards.js, save.js, draw.js and members.js.

// ---------- Settings ----------

const CHALLENGE_DECK_SIZE = 8;              // cards in each deck
const CHALLENGE_NO_MODIFIER_CHANCE = 0.3;   // 30% of the challenges have no modifier
const CHALLENGE_LIST_LIMIT = 50;            // at most this many challenges are drawn at once (speed)
const CHALLENGE_ORDER_MS = 60 * 60 * 1000;  // the order of the list changes every hour

// The special rules a challenge can have. The battle code checks challenge.modifier
// against these ids. icon: shown on the badge, color: the badge background.
// The other 70% is shared equally by these 5 (14% each).
const CHALLENGE_MODIFIERS = {
  double: {
    id: 'double',
    name: 'Dupla táp',
    description: '2x táp a meccs elejétől.',
    icon: 'feed',
    color: '#c98512',
  },
  suddenDeath: {
    id: 'suddenDeath',
    name: 'Hirtelen halál',
    description: 'Aki először lerombol egy tornyot, nyer.',
    icon: 'bolt',
    color: '#c23b2b',
  },
  chickenMayhem: {
    id: 'chickenMayhem',
    name: 'Csirkekáosz',
    description: '20 mp-enként mindkét oldal hátsó sorában megjelenik egy csirke.',
    icon: 'chick',
    color: '#8a5cc2',
  },
  beeMayhem: {
    id: 'beeMayhem',
    name: 'Méhkáosz',
    description: '10 mp-enként egy méh mindkét oldalon.',
    icon: 'bee',
    color: '#7a5a10',
  },
  cornStorm: {
    id: 'cornStorm',
    name: 'Kukoricavihar',
    description: 'Véletlen helyeken kukoricaeső hullik, ami mindkét fél állatait sebzi, a tornyokat nem.',
    icon: 'corn',
    color: '#3f8a2a',
  },
};

// Extra icons used only on this page. They are added to the shared ICONS list (icons.js),
// so applyIcons() draws them like any other icon. If icons.js already has an icon
// with the same name, that one is kept.
const CHALLENGE_ICONS = {
  // Green circle with a white tick: "Teljesítve"
  check: `<svg viewBox="0 0 64 64">
    <circle cx="32" cy="32" r="26" fill="#5cc24a" stroke="#2f6a1d" stroke-width="4"/>
    <path d="M19 33 L28 42 L46 22" fill="none" stroke="#fff6e0" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  // Lightning bolt: "Hirtelen halál"
  bolt: `<svg viewBox="0 0 64 64">
    <path d="M37 4 L12 36 H28 L23 60 L52 24 H35 Z" fill="#ffc93c" stroke="#7a5a10" stroke-width="3" stroke-linejoin="round"/></svg>`,

  // Little white chicken: "Csirkekáosz"
  chick: `<svg viewBox="0 0 64 64">
    <path d="M36 11 C37 5 41 5 42 9 C44 4 48 6 47 11 Z" fill="#e05a47" stroke="#6b1d1d" stroke-width="2" stroke-linejoin="round"/>
    <ellipse cx="29" cy="40" rx="19" ry="15" fill="#fff6e0" stroke="#5a3515" stroke-width="3"/>
    <circle cx="41" cy="22" r="11" fill="#fff6e0" stroke="#5a3515" stroke-width="3"/>
    <path d="M51 20 L60 24 L51 28 Z" fill="#f08a24" stroke="#7a4a10" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="44" cy="20" r="2.4" fill="#3a2a10"/>
    <path d="M18 38 C24 44 32 44 36 38" fill="none" stroke="#5a3515" stroke-width="3" stroke-linecap="round"/></svg>`,

  // Striped bee: "Méhkáosz"
  bee: `<svg viewBox="0 0 64 64">
    <ellipse cx="32" cy="38" rx="19" ry="13" fill="#ffc93c" stroke="#3a2a10" stroke-width="3"/>
    <path d="M27 26 V50 M37 26 V50" stroke="#3a2a10" stroke-width="5"/>
    <path d="M51 38 L59 38" stroke="#3a2a10" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="25" cy="20" rx="7" ry="11" transform="rotate(-25 25 20)" fill="#e6f4ff" stroke="#3a2a10" stroke-width="2.5"/>
    <ellipse cx="38" cy="19" rx="7" ry="11" transform="rotate(20 38 19)" fill="#e6f4ff" stroke="#3a2a10" stroke-width="2.5"/>
    <circle cx="19" cy="35" r="2.6" fill="#3a2a10"/></svg>`,

  // Ear of corn in green leaves: "Kukoricavihar"
  corn: `<svg viewBox="0 0 64 64">
    <ellipse cx="32" cy="28" rx="11" ry="22" fill="#ffcf4a" stroke="#7a5a10" stroke-width="3"/>
    <path d="M23 18 H41 M21 27 H43 M22 36 H42 M32 8 V48" stroke="#d99a1a" stroke-width="2.5"/>
    <path d="M32 60 C17 54 13 40 17 28 C21 40 26 46 32 50 Z" fill="#7cc45a" stroke="#2f6a1d" stroke-width="3" stroke-linejoin="round"/>
    <path d="M32 60 C47 54 51 40 47 28 C43 40 38 46 32 50 Z" fill="#7cc45a" stroke="#2f6a1d" stroke-width="3" stroke-linejoin="round"/></svg>`,
};

for (const iconName in CHALLENGE_ICONS) {
  if (!ICONS[iconName]) ICONS[iconName] = CHALLENGE_ICONS[iconName];
}

// ---------- Seeded "random" numbers ----------

// Turns a text into a whole number between 0 and 4294967295 (FNV-1a hash).
// The same text always gives the same number; a tiny change gives a totally different one.
function hashString(str) {
  let hash = 2166136261;                 // FNV "offset basis": the fixed starting number
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);            // mix in one letter
    hash = Math.imul(hash, 16777619);     // multiply by the FNV prime (as a 32-bit number)
  }
  return hash >>> 0;                      // ">>> 0" makes it a positive (unsigned) number
}

// Gives back a function that works like Math.random() (a number from 0 up to, but not
// including, 1), but the numbers are always the same for the same seed (mulberry32).
function seededRandom(seed) {
  let state = seed >>> 0;
  return function () {
    state = (state + 0x6D2B79F5) | 0;          // step forward by a fixed big number
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);       // scramble the bits...
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);  // ...and scramble them some more
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Returns a shuffled COPY of the list (the original stays untouched), using the
// random function we give it. Same random function -> same order every time.
function shuffleWithRandom(list, random) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ---------- Challenges ----------

// Builds the challenge of one member from their handle (always the same for the same handle).
// Careful: changing the order of the random() calls below (or adding/removing cards
// in cards.js) changes every member's challenge.
function getChallenge(id) {
  const seed = hashString(id);
  const random = seededRandom(seed);
  const cardIds = Object.keys(CARDS);

  // Shuffle all cards and take the first 8 = 8 different cards
  const playerDeck = shuffleWithRandom(cardIds, random).slice(0, CHALLENGE_DECK_SIZE);
  // The enemy shuffles the full card list again, so its deck doesn't depend on ours
  const enemyDeck = shuffleWithRandom(cardIds, random).slice(0, CHALLENGE_DECK_SIZE);

  // 30%: no modifier, otherwise one of the 5 with the same chance
  let modifier = null;
  if (random() >= CHALLENGE_NO_MODIFIER_CHANCE) {
    const modifierIds = Object.keys(CHALLENGE_MODIFIERS);
    modifier = modifierIds[Math.floor(random() * modifierIds.length)];
  }

  return { id, seed, playerDeck, enemyDeck, modifier };
}

// Has the player already won this member's challenge? (the battle code saves it)
function isChallengeWon(id) {
  return Boolean(save.challengesWon && save.challengesWon[id]);
}

// ---------- Search ----------

// Makes a text easy to compare: lower case, no accents, no "@" at the start.
// "@Kukorica Király" -> "kukorica kiraly"
function normalizeSearchText(text) {
  return String(text)
    .normalize('NFD')                   // split "á" into "a" + an accent mark
    .replace(/[̀-ͯ]/g, '')    // throw away the accent marks
    .toLowerCase()
    .trim()
    .replace(/^@/, '');                 // ignore a leading "@"
}

// ---------- Hourly order ----------

let challengeOrderHour = -1;   // which hour the cached order belongs to
let challengeOrder = [];       // [{ id, searchText }] in this hour's order

// The members in a random order that stays the same for a whole hour.
// Every member is shuffled with the number of the current hour as the seed,
// so everybody sees the same order, and it only changes when a new hour starts.
function getChallengeOrder() {
  const hour = Math.floor(Date.now() / CHALLENGE_ORDER_MS);
  if (hour !== challengeOrderHour) {
    challengeOrder = shuffleWithRandom(members, seededRandom(hour)).map(id => ({
      id,
      searchText: normalizeSearchText(id),   // prepared once, so typing stays fast
    }));
    challengeOrderHour = hour;
  }
  return challengeOrder;
}

// ---------- Page ----------

let challengeSearchText = '';               // what is typed in the search box (kept between visits)
const challengeCardCache = new Map();       // id -> its finished card element (no redraw while typing)
const challengePortraitCache = {};          // "cardId@size" -> a canvas with that card's picture

// The picture of a card, drawn only once and then copied (8 + 8 pictures per challenge add up)
function getChallengePortrait(cardId, size) {
  const key = cardId + '@' + size;
  if (!challengePortraitCache[key]) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    drawCardPortrait(canvas, cardId);
    challengePortraitCache[key] = canvas;
  }
  return challengePortraitCache[key];
}

// Fills one deck row with 8 small card pictures (border color = rarity)
function fillChallengeDeckRow(row, deck) {
  const dpr = window.devicePixelRatio || 1;
  const size = Math.round(32 * dpr);   // sharp drawing on high-resolution screens
  deck.forEach(id => {
    const card = CARDS[id];
    const slot = document.createElement('div');
    slot.className = 'challenge-slot';
    slot.style.borderColor = RARITIES[card.rarity].color;
    slot.title = card.name;            // the card name shows up when you hover it

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    canvas.getContext('2d').drawImage(getChallengePortrait(id, size), 0, 0);

    slot.appendChild(canvas);
    row.appendChild(slot);
  });
}

// The badge of the modifier: icon + name + one-line description, or "Nincs módosító"
function challengeModifierHtml(modifierId) {
  const modifier = CHALLENGE_MODIFIERS[modifierId];
  if (!modifier) {
    return '<span class="challenge-badge none">Nincs módosító</span>';
  }
  return `
    <span class="challenge-badge" style="background: ${modifier.color}">
      <span class="icon" data-icon="${modifier.icon}"></span>${modifier.name}
    </span>
    <span class="challenge-modifier-desc">${modifier.description}</span>`;
}

// One challenge card: YouTube id, "Teljesítve" marker, "Harc!" button, modifier and both decks
function createChallengeCard(member) {
  const challenge = getChallenge(member.id);
  const won = isChallengeWon(member.id);

  const card = document.createElement('div');
  card.className = 'challenge-card' + (won ? ' won' : '');
  card.innerHTML = `
    <div class="challenge-head">
      <div class="challenge-who">
        <span class="challenge-name"></span>
        ${won ? '<span class="challenge-won"><span class="icon" data-icon="check"></span>Teljesítve</span>' : ''}
      </div>
      <button class="action-btn use challenge-fight"><span class="icon" data-icon="battle"></span>Harc!</button>
    </div>
    <div class="challenge-modifier">${challengeModifierHtml(challenge.modifier)}</div>
    <div class="challenge-decks">
      <div class="challenge-deck-row">
        <span class="challenge-deck-label">Te</span>
        <div class="challenge-deck-cards"></div>
      </div>
      <div class="challenge-deck-row enemy">
        <span class="challenge-deck-label">Ellenfél</span>
        <div class="challenge-deck-cards"></div>
      </div>
    </div>`;

  // The id goes in with textContent, so it is always shown as plain text
  const nameEl = card.querySelector('.challenge-name');
  nameEl.textContent = member.id;
  nameEl.title = member.id;   // long ids get cut with "...", hovering shows the full id

  const rows = card.querySelectorAll('.challenge-deck-cards');
  fillChallengeDeckRow(rows[0], challenge.playerDeck);
  fillChallengeDeckRow(rows[1], challenge.enemyDeck);

  // A fresh challenge object for every battle, so the battle code may change it freely
  card.querySelector('.challenge-fight').addEventListener('click', () => {
    openBattle({ challenge: getChallenge(member.id) });
  });

  applyIcons(card);
  return card;
}

// The card of a member: made once, then reused while typing in the search box
function getChallengeCard(member) {
  if (!challengeCardCache.has(member.id)) {
    challengeCardCache.set(member.id, createChallengeCard(member));
  }
  return challengeCardCache.get(member.id);
}

// Shows the members that match the search text (at most CHALLENGE_LIST_LIMIT of them)
function updateChallengeList() {
  const list = document.getElementById('challenge-list');
  const count = document.getElementById('challenge-count');
  if (!list) return;

  const order = getChallengeOrder();
  const query = normalizeSearchText(challengeSearchText);
  const matches = order.filter(member => member.searchText.includes(query));

  // "12 kihívás" without searching, "3 találat" while searching
  if (count) count.textContent = query ? `${matches.length} találat` : `${order.length} kihívás`;

  list.textContent = '';   // empty the list (the cached cards are kept in challengeCardCache)
  const shown = matches.slice(0, CHALLENGE_LIST_LIMIT);
  shown.forEach(member => list.appendChild(getChallengeCard(member)));

  if (order.length === 0) {
    list.innerHTML = '<p class="challenge-note">Még nincsenek tagok a listában.</p>';
  } else if (matches.length === 0) {
    list.innerHTML = '<p class="challenge-note">Nincs ilyen nevű tag.</p>';
  } else if (matches.length > shown.length) {
    const more = document.createElement('p');
    more.className = 'challenge-note challenge-more';
    more.textContent = `+${matches.length - shown.length} további...`;
    list.appendChild(more);
  }
}

// Entry point: draws the whole challenges page into <div id="challenge-page">.
// Call it every time the "Kihívás" tab opens.
function renderChallenges() {
  const root = document.getElementById('challenge-page');
  if (!root) return;

  // Build the cards again, because a challenge may have been won since the last visit
  challengeCardCache.clear();

  root.innerHTML = `
    <h2 class="page-title">Kihívások</h2>
    <p class="challenge-intro">A csatorna tagjainak saját kihívásai. A sorrend óránként változik.</p>
    <div class="challenge-search">
      <input type="search" id="challenge-search" placeholder="Keresés YouTube név (@...) alapján..."
             autocomplete="off" spellcheck="false">
      <span class="challenge-count" id="challenge-count"></span>
    </div>
    <div class="challenge-list" id="challenge-list"></div>`;

  // Put back what was typed before, and filter again on every key press
  const input = document.getElementById('challenge-search');
  input.value = challengeSearchText;
  input.addEventListener('input', () => {
    challengeSearchText = input.value;
    updateChallengeList();
  });

  updateChallengeList();
}
