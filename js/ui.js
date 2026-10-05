// Tabs, gold display, lobby (arena + chests), chest opening and switching into / out of battle

function showTab(name) {
  document.querySelectorAll('.tab-page').forEach(p => p.classList.toggle('active', p.id === 'page-' + name));
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  if (name === 'deck') renderDeckPage();
  if (name === 'shop') renderShop();
  if (name === 'challenge') renderChallenges();
  if (name === 'battle') { renderChests(); renderArena(); }
}

function updateGold() {
  const g = document.getElementById('gold-amount');
  if (g) g.textContent = save.gold;
  const gm = document.getElementById('gem-amount');
  if (gm) gm.textContent = save.gems !== undefined ? save.gems : 120;
  const tr = document.getElementById('trophy-amount');
  if (tr) tr.textContent = save.trophies;
}

// ---------- Arenas (lobby) ----------

let viewedArena = save.arena;   // the arena shown in the lobby (arrows browse)

function renderArena() {
  const arena = ARENAS[viewedArena - 1];
  const unlocked = isArenaUnlocked(arena.id);
  if (unlocked) { save.arena = arena.id; saveGame(); }   // play in the arena you picked

  document.getElementById('arena-label').textContent = `${arena.id}. Aréna`;
  document.getElementById('arena-name').textContent = arena.name;
  document.getElementById('btn-arena-prev').disabled = viewedArena === 1;
  document.getElementById('btn-arena-next').disabled = viewedArena === ARENAS.length;
  document.getElementById('btn-fight').disabled = !unlocked;

  // Locked arena: lock over the picture with the trophies needed
  document.getElementById('arena-lock').classList.toggle('hidden', unlocked);
  document.getElementById('arena-lock-text').textContent = `${arena.trophies} trófea kell`;

  // Arena picture with its towers
  const canvas = document.getElementById('arena-preview');
  canvas.width = ARENA.W * 2;
  canvas.height = ARENA.H * 2;
  canvas.style.aspectRatio = `${ARENA.W} / ${ARENA.H}`;
  const c = canvas.getContext('2d');
  c.scale(2, 2);
  c.drawImage(arena.build(2), 0, 0, ARENA.W, ARENA.H);
  createAllTowers().forEach(t => drawTower(c, t));

  // Trophy progress toward the next locked arena
  const next = ARENAS.find(a => save.trophies < a.trophies);
  const progress = document.getElementById('arena-progress');
  progress.innerHTML = next
    ? `<span>Következő: ${next.id}. Aréna (${next.name})</span>
       <div class="arena-bar"><div style="width: ${(save.trophies / next.trophies) * 100}%"></div><b>${save.trophies} / ${next.trophies}</b></div>`
    : '<span>Minden arénát elértél!</span>';

}

// Popup with every arena in a scrollable list: picture, trophies needed, lock and its cards
function openArenaModal() {
  const dpr = window.devicePixelRatio || 1;
  const list = document.getElementById('arena-list');
  list.innerHTML = '';

  ARENAS.forEach(arena => {
    const unlocked = isArenaUnlocked(arena.id);
    const entry = document.createElement('div');
    entry.className = 'arena-entry' + (unlocked ? '' : ' locked') + (arena.id === save.arena ? ' current' : '');
    entry.innerHTML = `
      <div class="arena-entry-head">
        <b>${arena.id}. Aréna: ${arena.name}</b>
        <span class="arena-entry-trophies"><span class="icon" data-icon="${unlocked ? 'trophy' : 'lock'}"></span>${arena.trophies}+</span>
      </div>
      <div class="arena-entry-body">
        <canvas class="arena-thumb" width="${96 * dpr}" height="${Math.round(96 * dpr * ARENA.H / ARENA.W)}"></canvas>
        <div>
          <div class="arena-cards-title">Kártyák, amiket itt találhatsz:</div>
          <div class="arena-cards"></div>
        </div>
      </div>`;

    // Small picture of the arena
    const thumb = entry.querySelector('canvas');
    const c = thumb.getContext('2d');
    const k = thumb.width / ARENA.W;
    c.scale(k, k);
    c.drawImage(arena.build(k), 0, 0, ARENA.W, ARENA.H);
    createAllTowers().forEach(t => drawTower(c, t));

    // Cards that first show up in this arena's chests
    const cards = entry.querySelector('.arena-cards');
    const arenaCardIds = Object.keys(CARDS).filter(id => CARDS[id].arena === arena.id);
    if (arenaCardIds.length === 0) cards.innerHTML = '<span class="arena-no-cards">Még nincsenek új kártyák.</span>';
    arenaCardIds.forEach(id => {
      const item = document.createElement('div');
      item.className = 'arena-card-item' + (isCardUnlocked(id) ? '' : ' locked');
      item.style.borderColor = RARITIES[CARDS[id].rarity].color;
      item.innerHTML = `<canvas width="${44 * dpr}" height="${44 * dpr}"></canvas><span>${CARDS[id].name}</span>`;
      drawCardPortrait(item.querySelector('canvas'), id);
      cards.appendChild(item);
    });
    list.appendChild(entry);
  });

  applyIcons(list);
  document.getElementById('arena-modal').classList.remove('hidden');
}

// ---------- Chests ----------

function formatTime(ms) {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function renderChests() {
  const wrap = document.getElementById('chest-slots');
  wrap.innerHTML = '';
  for (let i = 0; i < CHEST_SLOTS; i++) {
    const chest = save.chests[i];
    const slot = document.createElement('button');
    if (!chest) {
      slot.className = 'chest-slot empty';
      slot.innerHTML = '<span class="chest-time">Üres hely</span>';
    } else {
      const left = chest.readyAt - Date.now();
      slot.className = 'chest-slot' + (left <= 0 ? ' ready' : '');
      slot.dataset.index = i;
      slot.innerHTML = `
        <span class="chest-arena">${chest.arena || 1}. Aréna</span>
        <span class="icon chest-icon" data-icon="chest_${chest.type}"></span>
        <span class="chest-name">${chestName(chest)}</span>
        <span class="chest-time">${left <= 0 ? 'Nyitható!' : formatTime(left)}</span>`;
      slot.addEventListener('click', () => showChestRewards(openChest(i)));
    }
    wrap.appendChild(slot);
  }
  applyIcons(wrap);
}

// Every second: count down the timers, redraw when a chest becomes ready
function tickChests() {
  document.querySelectorAll('.chest-slot[data-index]').forEach(el => {
    const chest = save.chests[el.dataset.index];
    if (!chest) return;
    const left = chest.readyAt - Date.now();
    if (left <= 0 && !el.classList.contains('ready')) renderChests();
    else if (left > 0) el.querySelector('.chest-time').textContent = formatTime(left);
  });
}

function showChestRewards(rewards) {
  if (!rewards) return;   // not ready yet
  if (typeof playChestOpeningAnimation === 'function') {
    playChestOpeningAnimation(rewards, () => {
      updateGold();
      renderChests();
    });
    return;
  }
  const dpr = window.devicePixelRatio || 1;
  const body = document.getElementById('chest-modal-body');
  body.innerHTML = `
    <h3 class="chest-modal-title">${chestName(rewards.chest)}</h3>
    <span class="icon chest-big" data-icon="chest_${rewards.chest.type}"></span>
    ${rewards.gold ? `<div class="reward-gold"><span class="icon" data-icon="gold"></span> +${rewards.gold}</div>` : ''}
    <div class="reward-cards"></div>
    <button class="big-btn" id="btn-chest-ok">Szuper!</button>`;

  const list = body.querySelector('.reward-cards');
  for (const id in rewards.cards) {
    const item = document.createElement('div');
    item.className = 'reward-card';
    item.style.borderColor = RARITIES[CARDS[id].rarity].color;
    const isNew = rewards.newCards.includes(id);
    item.innerHTML = `${isNew ? '<span class="new-badge">Új kártya!</span>' : ''}
      <canvas width="${56 * dpr}" height="${56 * dpr}"></canvas><span>${CARDS[id].name}</span><b>+${rewards.cards[id]}</b>`;
    drawCardPortrait(item.querySelector('canvas'), id);
    list.appendChild(item);
  }
  applyIcons(body);

  document.getElementById('btn-chest-ok').addEventListener('click', () => {
    document.getElementById('chest-modal').classList.add('hidden');
  });
  document.getElementById('chest-modal').classList.remove('hidden');
  updateGold();
  renderChests();
}

// ---------- Battle ----------

// options.challenge: play a member challenge instead of a normal match
function openBattle(options = {}) {
  document.getElementById('battle-screen').classList.remove('hidden');
  document.getElementById('result').classList.add('hidden');
  startBattle(options);
}

function closeBattle() {
  const fromChallenge = battle && battle.challenge;
  stopBattle();
  document.getElementById('battle-screen').classList.add('hidden');
  updateGold();
  if (typeof updatePlayerCupsUI === 'function') updatePlayerCupsUI();
  showTab(fromChallenge ? 'challenge' : 'battle');
}

// ---------- Init ----------

applyIcons(document);
updateGold();
renderChests();
setInterval(tickChests, 1000);

renderArena();
document.getElementById('btn-arena-prev').addEventListener('click', () => { viewedArena--; renderArena(); });
document.querySelector('.arena-preview-wrap').addEventListener('click', openArenaModal);
document.getElementById('btn-arena-close').addEventListener('click', () => {
  document.getElementById('arena-modal').classList.add('hidden');
});
document.getElementById('btn-arena-next').addEventListener('click', () => { viewedArena++; renderArena(); });

document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => showTab(t.dataset.tab));
});
document.getElementById('btn-fight').addEventListener('click', () => openBattle());
document.getElementById('btn-result-ok').addEventListener('click', closeBattle);

const btnHost = document.getElementById('btn-mp-host');
if (btnHost) btnHost.addEventListener('click', () => {
  if (typeof createMultiplayerRoom === 'function') createMultiplayerRoom();
});
const btnJoin = document.getElementById('btn-mp-join');
if (btnJoin) btnJoin.addEventListener('click', () => {
  if (typeof showJoinInputModal === 'function') showJoinInputModal();
});
