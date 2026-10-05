// Shop page ("Bolt"): Dynamic Bundles, Hourly Card Offers, Card Chests, and Daily Free Gifts
const SHOP_ROTATION_MS = 60 * 60 * 1000;   // 1 hour rotation
const SHOP_DECK_OFFERS = 3;
const SHOP_OTHER_OFFERS = 3;
const SHOP_REFRESH_BASE_PRICE = 5;

// What one bundle contains and costs, by card rarity
const SHOP_BUNDLES = {
  common:    { amount: 8, price: 16 },
  rare:      { amount: 5, price: 20 },
  epic:      { amount: 2, price: 30 },
  legendary: { amount: 1, price: 60 },
};

const SHOP_CHEST_PRICES = {
  small:  45,
  medium: 90,
  large:  190,
};

// Dynamic Content Bundles (Special Pack Offers)
const SPECIAL_BUNDLES = {
  venomous_reptile: {
    id: 'venomous_reptile',
    name: 'Venomous Reptile Starter Pack',
    badge: 'HOT DEAL -50%',
    desc: 'Unleash the deadly Snake! Slithers past frontlines with persistent poison DoT.',
    costGems: 60,
    costGold: 0,
    rewards: {
      gold: 500,
      gems: 30,
      cards: { snake: 15, mudBall: 10 },
      chest: { type: 'small', arena: 2 }
    }
  },
  amphibian_invasion: {
    id: 'amphibian_invasion',
    name: 'Amphibian Invasion Bundle',
    badge: 'POPULAR PACK',
    desc: 'Master the river leap with the Frog & stun groups with the Electric Eel!',
    costGems: 140,
    costGold: 0,
    rewards: {
      gold: 1200,
      gems: 50,
      cards: { frog: 20, eel: 12, cornRain: 15 },
      chest: { type: 'medium', arena: 2 }
    }
  },
  legendary_jungle: {
    id: 'legendary_jungle',
    name: 'Legendary Jungle Bundle',
    badge: 'LEGENDARY VALUE',
    desc: 'Dominate the arena with Gorilla, Cheetah, Falcon, and Honey Badger!',
    costGems: 260,
    costGold: 0,
    rewards: {
      gold: 3500,
      gems: 80,
      cards: { gorilla: 2, cheetah: 10, falcon: 10, badger: 10 },
      chest: { type: 'large', arena: 2 }
    }
  }
};

function currentShopHour() {
  return Math.floor(Date.now() / SHOP_ROTATION_MS);
}

function timeUntilNextShop() {
  return (currentShopHour() + 1) * SHOP_ROTATION_MS - Date.now();
}

function formatShopTime(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
}

function createShopOffer(id) {
  const card = CARDS[id];
  const bundle = SHOP_BUNDLES[card.rarity] || SHOP_BUNDLES.common;
  return { id, amount: bundle.amount, price: bundle.price, bought: false };
}

function rollShopOffers() {
  const deckIds = save.deck.filter((id, i) => CARDS[id] && save.deck.indexOf(id) === i);
  const fromDeck = shuffle(deckIds.slice()).slice(0, SHOP_DECK_OFFERS);
  const otherIds = Object.keys(CARDS).filter(id => !fromDeck.includes(id) && isCardUnlocked(id));
  const fromOthers = shuffle(otherIds).slice(0, SHOP_OTHER_OFFERS);
  return fromDeck.concat(fromOthers).map(createShopOffer);
}

function ensureShopRotation() {
  const hour = currentShopHour();
  const shop = save.shop;
  const upToDate = shop
    && shop.hour === hour
    && Array.isArray(shop.offers)
    && shop.offers.length > 0
    && shop.offers.every(offer => offer && CARDS[offer.id]);
  if (upToDate) return;

  save.shop = { hour, offers: rollShopOffers(), refreshes: 0 };
  saveGame();
}

function shopRefreshPrice() {
  ensureShopRotation();
  return SHOP_REFRESH_BASE_PRICE * Math.pow(2, save.shop.refreshes || 0);
}

function refreshShopOffers() {
  const price = shopRefreshPrice();
  if (save.gold < price) return;
  save.gold -= price;
  save.shop.offers = rollShopOffers();
  save.shop.refreshes = (save.shop.refreshes || 0) + 1;
  saveGame();
  updateGold();
  renderShop();
}

function buyShopOffer(index) {
  if (!save.shop || save.shop.hour !== currentShopHour()) {
    renderShop();
    return;
  }
  const offer = save.shop.offers[index];
  if (!offer || offer.bought) return;
  if (save.gold < offer.price) return;

  save.gold -= offer.price;
  save.cards[offer.id].count += offer.amount;
  offer.bought = true;
  saveGame();
  updateGold();
  renderShop();
}

function buySpecialBundle(bundleKey) {
  const bundle = SPECIAL_BUNDLES[bundleKey];
  if (!bundle) return;
  const currentGems = save.gems !== undefined ? save.gems : 120;
  if (currentGems < bundle.costGems) {
    alert('Nincs elég drágaköved! / Not enough gems!');
    return;
  }

  save.gems = currentGems - bundle.costGems;
  if (!save.bundlesBought) save.bundlesBought = {};
  save.bundlesBought[bundleKey] = (save.bundlesBought[bundleKey] || 0) + 1;

  // Add rewards to player save
  save.gold += bundle.rewards.gold;
  save.gems += bundle.rewards.gems;

  const newCards = [];
  for (const id in bundle.rewards.cards) {
    if (!save.cards[id]) save.cards[id] = { level: 1, count: 0, unlocked: true };
    if (!save.cards[id].unlocked) {
      save.cards[id].unlocked = true;
      newCards.push(id);
    }
    save.cards[id].count += bundle.rewards.cards[id];
  }
  saveGame();
  updateGold();

  // Play celebratory animated chest opening
  const animRewards = {
    chest: bundle.rewards.chest,
    gold: bundle.rewards.gold,
    gems: bundle.rewards.gems,
    cards: bundle.rewards.cards,
    newCards
  };
  playChestOpeningAnimation(animRewards, () => {
    renderShop();
  });
}

function claimDailyFreeGift() {
  const now = Date.now();
  const lastClaim = save.lastDailyGift || 0;
  if (now - lastClaim < 24 * 60 * 60 * 1000) {
    alert('A napi jutalmat már átvetted ma! / Daily reward already claimed today!');
    return;
  }

  save.lastDailyGift = now;
  save.gems = (save.gems || 0) + 25;
  save.gold = (save.gold || 0) + 200;
  saveGame();
  updateGold();

  const animRewards = {
    chest: { type: 'small', arena: 1 },
    gold: 200,
    gems: 25,
    cards: { chickens: 8, piglet: 6 },
    newCards: []
  };
  playChestOpeningAnimation(animRewards, () => {
    renderShop();
  });
}

function buyShopChest(type) {
  const price = SHOP_CHEST_PRICES[type];
  if (save.gold < price) return;
  save.gold -= price;

  const def = CHESTS[type];
  const arena = highestArena();
  const cardPool = Object.keys(CARDS).filter(id => CARDS[id].arena <= arena);
  const cards = {};
  const newCards = [];

  for (let i = 0; i < def.draws; i++) {
    const id = randomFrom(cardPool);
    const amount = Math.max(1, Math.round(def.cards / def.draws));
    cards[id] = (cards[id] || 0) + amount;
    if (!save.cards[id]) save.cards[id] = { level: 1, count: 0, unlocked: true };
    if (!save.cards[id].unlocked) {
      save.cards[id].unlocked = true;
      newCards.push(id);
    }
    save.cards[id].count += amount;
  }

  saveGame();
  updateGold();

  const rewards = {
    chest: { type, arena },
    gold: 0,
    gems: type === 'large' ? 15 : 0,
    cards,
    newCards
  };
  playChestOpeningAnimation(rewards, () => {
    renderShop();
  });
}

// Render dynamic bundles section
function renderSpecialBundles() {
  let html = '<div class="special-bundles-grid">';
  for (const key in SPECIAL_BUNDLES) {
    const b = SPECIAL_BUNDLES[key];
    const canAfford = (save.gems || 0) >= b.costGems;
    html += `
      <div class="bundle-card">
        <span class="bundle-badge">${b.badge}</span>
        <h4 class="bundle-title">${b.name}</h4>
        <p class="bundle-desc">${b.desc}</p>
        <div class="bundle-contents">
          <span class="pill gold"><span class="icon" data-icon="gold"></span> +${b.rewards.gold}</span>
          <span class="pill gem"><span class="icon" data-icon="gem"></span> +${b.rewards.gems}</span>
          <span class="pill chest"><span class="icon" data-icon="chest_${b.rewards.chest.type}"></span> Chest</span>
        </div>
        <button class="big-btn bundle-buy-btn" data-bundle="${key}" ${canAfford ? '' : 'disabled'}>
          <span class="icon" data-icon="gem"></span> ${b.costGems} Gems
        </button>
      </div>
    `;
  }
  html += '</div>';
  return html;
}

function renderDailyFreeGift() {
  const now = Date.now();
  const lastClaim = save.lastDailyGift || 0;
  const canClaim = (now - lastClaim) >= 24 * 60 * 60 * 1000;
  return `
    <div class="daily-gift-banner">
      <div class="daily-gift-info">
        <h4>🎁 Napi Ajándék / Daily Free Reward</h4>
        <p>+25 Gems & +200 Gold every 24 hours!</p>
      </div>
      <button class="action-btn claim-daily-btn" ${canClaim ? '' : 'disabled'}>
        ${canClaim ? 'Átveszem! (Claim)' : 'Később nyitható'}
      </button>
    </div>
  `;
}

function renderShop() {
  const root = document.getElementById('shop-page');
  if (!root) return;
  ensureShopRotation();

  const refreshPrice = shopRefreshPrice();
  const canRefresh = save.gold >= refreshPrice;

  root.innerHTML = `
    <h2 class="page-title">Bolt / Shop & Bundles</h2>

    ${renderDailyFreeGift()}

    <h3 class="shop-section-title">🔥 Különleges Csomagok (Featured Bundles)</h3>
    ${renderSpecialBundles()}

    <h3 class="shop-section-title">⏰ Napi Kártya Ajánlatok (Hourly Card Rotation)</h3>
    <div class="shop-timer-row">
      <p class="shop-timer">Új ajánlatok: <b id="shop-countdown">${formatShopTime(timeUntilNextShop())}</b></p>
      <button class="action-btn shop-refresh" ${canRefresh ? '' : 'disabled title="Nincs elég aranyad"'}>
        Frissítés <span class="icon" data-icon="gold"></span> ${refreshPrice}
      </button>
    </div>
    <div class="card-grid shop-grid"></div>

    <h3 class="shop-section-title">📦 Kártyaládák (Chests)</h3>
    <p class="shop-chest-hint">Azonnal kinyílnak látványos animációval!</p>
    <div class="card-grid shop-chest-grid"></div>
  `;

  // Attach bundle buy clicks
  root.querySelectorAll('.bundle-buy-btn').forEach(btn => {
    btn.addEventListener('click', () => buySpecialBundle(btn.dataset.bundle));
  });

  // Attach daily claim click
  const dailyBtn = root.querySelector('.claim-daily-btn');
  if (dailyBtn) {
    dailyBtn.addEventListener('click', claimDailyFreeGift);
  }

  root.querySelector('.shop-refresh').addEventListener('click', refreshShopOffers);

  const grid = root.querySelector('.shop-grid');
  save.shop.offers.forEach((offer, index) => grid.appendChild(createShopTile(offer, index)));

  const chestGrid = root.querySelector('.shop-chest-grid');
  Object.keys(SHOP_CHEST_PRICES).forEach(type => chestGrid.appendChild(createShopChestTile(type)));

  applyIcons(root);
}

function createShopTile(offer, index) {
  const card = CARDS[offer.id];
  const dpr = window.devicePixelRatio || 1;
  const size = 60 * dpr;
  const inDeck = save.deck.includes(offer.id);
  const canAfford = save.gold >= offer.price;

  let buttonHtml = '';
  if (offer.bought) {
    buttonHtml = '<button class="action-btn shop-buy" disabled>Megvéve</button>';
  } else {
    buttonHtml = `
      <button class="action-btn shop-buy" ${canAfford ? '' : 'disabled title="Nincs elég aranyad"'}>
        <span class="icon" data-icon="gold"></span> ${offer.price}
      </button>`;
  }

  const tile = document.createElement('div');
  tile.className = 'card-tile shop-offer' + (offer.bought ? ' bought' : '');
  tile.style.borderColor = RARITIES[card.rarity].color;
  tile.innerHTML = `
    ${inDeck ? '<span class="shop-in-deck">Pakliban</span>' : ''}
    <canvas width="${size}" height="${size}"></canvas>
    <span class="tile-name">${card.name}</span>
    <span class="shop-amount">+${offer.amount} db</span>
    ${buttonHtml}`;
  drawCardPortrait(tile.querySelector('canvas'), offer.id);

  tile.querySelector('.shop-buy').addEventListener('click', () => buyShopOffer(index));
  return tile;
}

function createShopChestTile(type) {
  const price = SHOP_CHEST_PRICES[type];
  const canAfford = save.gold >= price;

  const tile = document.createElement('div');
  tile.className = 'card-tile shop-chest';
  tile.innerHTML = `
    <span class="icon shop-chest-icon" data-icon="chest_${type}"></span>
    <span class="shop-chest-name">${chestName({ type, arena: highestArena() })}</span>
    <span class="shop-amount">~${CHESTS[type].cards} kártya</span>
    <button class="action-btn shop-buy" ${canAfford ? '' : 'disabled title="Nincs elég aranyad"'}>
      <span class="icon" data-icon="gold"></span> ${price}
    </button>`;

  tile.querySelector('.shop-buy').addEventListener('click', () => buyShopChest(type));
  return tile;
}

function tickShop() {
  const page = document.getElementById('page-shop');
  if (!page || !page.classList.contains('active')) return;

  if (!save.shop || save.shop.hour !== currentShopHour()) {
    renderShop();
    return;
  }
  const countdown = document.getElementById('shop-countdown');
  if (countdown) countdown.textContent = formatShopTime(timeUntilNextShop());
}

setInterval(tickShop, 1000);
