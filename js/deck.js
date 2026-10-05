// Deck page: your 8-card deck, deck presets, collection, card details, upgrading and swapping
let swapCardId = null;   // a collection card waiting to be swapped into the deck

function renderDeckPage() {
  const page = document.getElementById('page-deck');
  let deckTabs = document.getElementById('deck-preset-bar');
  if (!deckTabs) {
    deckTabs = document.createElement('div');
    deckTabs.id = 'deck-preset-bar';
    deckTabs.className = 'deck-preset-bar';
    const firstTitle = page.querySelector('.page-title');
    page.insertBefore(deckTabs, firstTitle);
  }

  // Active deck index (0, 1, 2)
  const activeIdx = save.activeDeckIndex || 0;
  if (!save.savedDecks) {
    save.savedDecks = [
      [...save.deck],
      ['snake', 'frog', 'cheetah', 'eel', 'armadillo', 'falcon', 'badger', 'gorilla'],
      ['chickens', 'rooster', 'bull', 'horse', 'snake', 'frog', 'cheetah', 'cornRain']
    ];
  }

  // Average elixir calculation
  const totalCost = save.deck.reduce((sum, id) => sum + (CARDS[id] ? CARDS[id].cost : 0), 0);
  const avgCost = (totalCost / Math.max(1, save.deck.length)).toFixed(1);

  deckTabs.innerHTML = `
    <div class="deck-presets">
      <button class="preset-btn ${activeIdx === 0 ? 'active' : ''}" data-idx="0">Deck 1</button>
      <button class="preset-btn ${activeIdx === 1 ? 'active' : ''}" data-idx="1">Deck 2</button>
      <button class="preset-btn ${activeIdx === 2 ? 'active' : ''}" data-idx="2">Deck 3</button>
    </div>
    <div class="avg-elixir-pill">
      <span class="icon" data-icon="feed"></span>
      <span>Avg: <b>${avgCost}</b> táp</span>
    </div>
  `;
  applyIcons(deckTabs);

  deckTabs.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.idx);
      save.activeDeckIndex = idx;
      if (save.savedDecks[idx] && save.savedDecks[idx].length === DECK_SIZE) {
        save.deck = [...save.savedDecks[idx]];
      } else {
        save.savedDecks[idx] = [...save.deck];
      }
      saveGame();
      renderDeckPage();
    });
  });

  const deckGrid = document.getElementById('deck-grid');
  const collectionGrid = document.getElementById('collection-grid');
  deckGrid.innerHTML = '';
  collectionGrid.innerHTML = '';

  // The deck: 8 framed slots (4 x 2)
  for (let i = 0; i < DECK_SIZE; i++) {
    const slot = document.createElement('div');
    slot.className = 'deck-slot';
    const id = save.deck[i];
    if (id && CARDS[id]) slot.appendChild(createCardTile(id, true, i));
    else slot.innerHTML = '<span class="deck-slot-empty">Üres</span>';
    deckGrid.appendChild(slot);
  }

  // Collection: found cards first, then the locked ones ordered by arena
  Object.keys(CARDS)
    .filter(id => !save.deck.includes(id))
    .sort((a, b) => (isCardUnlocked(b) - isCardUnlocked(a)) || (CARDS[a].arena - CARDS[b].arena))
    .forEach(id => collectionGrid.appendChild(createCardTile(id, false)));

  // While swapping, the deck cards are highlighted as targets
  const swapBanner = document.getElementById('swap-banner');
  if (swapBanner) {
    swapBanner.classList.toggle('hidden', !swapCardId);
    if (swapCardId && CARDS[swapCardId]) {
      swapBanner.querySelector('span').textContent = `Select a slot to replace with ${CARDS[swapCardId].name}:`;
    }
  }
  deckGrid.classList.toggle('swapping', !!swapCardId);
}

// Small static card: portrait, name, level and card progress toward next level
function createCardTile(id, inDeck, slotIndex = -1) {
  const card = CARDS[id];
  const p = save.cards[id];
  const maxed = p.level >= MAX_LEVEL;
  const need = upgradeCost(p.level).cards;
  const dpr = window.devicePixelRatio || 1;
  const unlocked = isCardUnlocked(id);

  const tile = document.createElement('button');
  tile.className = 'card-tile' + (unlocked ? '' : ' locked') + (inDeck ? ' in-battle-deck' : '');
  tile.style.borderColor = RARITIES[card.rarity].color;
  tile.innerHTML = `
    <span class="cost-badge">${card.cost}</span>
    <canvas width="${64 * dpr}" height="${64 * dpr}"></canvas>
    <span class="tile-name">${card.name}</span>
    ${unlocked ? `
    <span class="tile-level">${maxed ? 'Max. szint' : p.level + '. szint'}</span>
    <div class="tile-bar ${canUpgrade(id) ? 'ready' : ''}">
      <div style="width: ${maxed ? 100 : Math.min(100, (p.count / need) * 100)}%"></div>
      <span>${maxed ? 'MAX' : p.count + ' / ' + need}</span>
    </div>` : `
    <span class="tile-lock"><span class="icon" data-icon="lock"></span>${card.arena}. Aréna</span>`}`;
  applyIcons(tile);
  drawCardPortrait(tile.querySelector('canvas'), id);

  tile.addEventListener('click', () => {
    if (swapCardId && inDeck) {
      // Put the waiting card in this card's place
      const targetIndex = slotIndex >= 0 ? slotIndex : save.deck.indexOf(id);
      save.deck[targetIndex] = swapCardId;
      if (save.savedDecks) {
        save.savedDecks[save.activeDeckIndex || 0] = [...save.deck];
      }
      swapCardId = null;
      saveGame();
      renderDeckPage();
      return;
    }
    openCardModal(id);
  });
  return tile;
}

// Card details popup with the animated preview
function openCardModal(id) {
  const card = CARDS[id];
  const p = save.cards[id];
  const rarity = RARITIES[card.rarity];
  const maxed = p.level >= MAX_LEVEL;
  const cost = upgradeCost(p.level);
  const inDeck = save.deck.includes(id);
  const unlocked = isCardUnlocked(id);
  const arena = ARENAS[Math.min(card.arena, ARENAS.length) - 1] || ARENAS[0];

  const actions = !unlocked
    ? `<p class="upgrade-need"><span class="icon" data-icon="lock"></span> Még nem találtad meg. ${arena.id}. Aréna (${arena.name}) vagy későbbi ládákban lehet.</p>`
    : `${maxed ? '' : `<p class="upgrade-need">Fejlesztéshez: ${p.count} / ${cost.cards} kártya, ${cost.gold} arany</p>`}
    <div class="modal-actions">
      <button id="btn-upgrade" class="action-btn" ${canUpgrade(id) ? '' : 'disabled'}>
        ${maxed ? 'Maximális szint' : `Fejlesztés <span class="icon" data-icon="gold"></span> ${cost.gold}`}
      </button>
      ${inDeck ? '<span class="in-deck">A pakliban van</span>' : '<button id="btn-use" class="action-btn use">Pakliba (Csere)</button>'}
    </div>`;

  const body = document.getElementById('card-modal-body');
  body.innerHTML = `
    <div class="modal-head">
      <h3>${card.name}</h3>
      <span class="rarity-chip" style="background: ${rarity.color}">${rarity.name}</span>
    </div>
    <div class="modal-sub">
      ${unlocked ? p.level + '. szint &middot; ' : ''}
      <span class="icon" data-icon="feed"></span> ${card.cost} táp &middot; ${arena.id}. Aréna (${arena.name})
    </div>
    ${card.ability ? `<div class="ability-badge">⚡ <b>Képesség / Ability:</b> ${card.ability}</div>` : ''}
    <canvas class="preview"></canvas>
    <p class="desc">${card.description}</p>
    <ul class="stats">${statsHtml(card, p.level)}</ul>
    ${actions}`;
  applyIcons(body);
  setPreview(body.querySelector('canvas.preview'), id);
  if (!unlocked) {
    document.getElementById('card-modal').classList.remove('hidden');
    return;
  }

  document.getElementById('btn-upgrade').addEventListener('click', () => {
    upgradeCard(id);
    updateGold();
    renderDeckPage();
    openCardModal(id);
  });
  const useBtn = document.getElementById('btn-use');
  if (useBtn) {
    useBtn.addEventListener('click', () => {
      swapCardId = id;
      closeCardModal();
      renderDeckPage();
    });
  }

  document.getElementById('card-modal').classList.remove('hidden');
}

// Stat lines for the popup: HP, DPS, Attack Speed, Speed, Target Type, Elixir Cost, Special Abilities
function statsHtml(card, level) {
  const mult = levelMultiplier(level);
  const line = (label, value) => `<li><span>${label}</span><b>${value}</b></li>`;
  if (card.spell) {
    const sp = card.spell;
    return line('Sebzés (Damage)', Math.round(sp.damage * mult)) +
      line('Toronyra (Tower Dmg)', Math.round(sp.damage * mult * sp.towerDamage)) +
      line('Költség (Elixir)', `${card.cost} táp`) +
      line('Terület (Radius)', sp.radius < 35 ? 'Kicsi' : sp.radius < 50 ? 'Közepes' : 'Nagy') +
      line('Hátralökés (Knockback)', sp.pushback ? 'Igen' : 'Nem') +
      line('Hatás (Effect)', card.typeLabel) +
      line('Célpont (Targets)', card.targetLabel);
  }
  const u = card.unit;
  const dmg = u.damage ? Math.round(u.damage * mult) : 0;
  const dps = dmg && u.attackRate ? Math.round(dmg / u.attackRate) : '-';
  const atkSpeed = u.attackRate ? `${u.attackRate} s` : '-';

  return line('Életerő (HP)', Math.round(u.hp * mult)) +
    line('Sebzés (Damage)', dmg || '-') +
    line('Másodpercenként (DPS)', dps) +
    line('Támadási sebesség (Attack Rate)', atkSpeed) +
    line('Mozgási sebesség (Speed)', card.speedLabel) +
    line('Táp Költség (Elixir Cost)', `${card.cost} táp`) +
    line('Darabszám (Count)', card.count) +
    line('Célpont (Target Type)', card.targetLabel) +
    line('Támadás típusa (Attack Type)', card.typeLabel) +
    (card.ability ? line('Különleges Képesség (Ability)', card.ability) : '');
}

function closeCardModal() {
  document.getElementById('card-modal').classList.add('hidden');
  setPreview(null);
}

document.getElementById('btn-card-close').addEventListener('click', closeCardModal);
document.getElementById('btn-swap-cancel').addEventListener('click', () => {
  swapCardId = null;
  renderDeckPage();
});
