// Real-time WebSocket Multiplayer client
// Features:
// 1. Switch between Quick Match (Matchmaking Search) and Private Room (4-Digit Code)
// 2. Cups-based matchmaking (similar cups paired, or instant match if 2 players on server)
// 3. Persistent cup progress (stored in localStorage & synced with server)

let mpSocket = null;
let currentRoomCode = null;
let mpRole = null;          // 'host' or 'guest'
let isMultiplayerMatch = false;
let isSearchingMatch = false;
let searchTimerInterval = null;
let searchSeconds = 0;

// Smart Server URL resolution for Web and Android Native APK
function getMultiplayerServerUrl() {
  const customUrl = localStorage.getItem('animal_clash_server_url');
  if (customUrl && customUrl.trim()) {
    let url = customUrl.trim();
    if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
      if (url.startsWith('https://')) url = url.replace('https://', 'wss://');
      else if (url.startsWith('http://')) url = url.replace('http://', 'ws://');
      else url = (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + url;
    }
    return url;
  }

  // Detect Android Native APK (Capacitor/Cordova/file protocol or empty host)
  const isApk = (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) ||
                window.location.protocol === 'capacitor:' ||
                window.location.protocol === 'file:' ||
                !window.location.host ||
                window.location.host === 'localhost';

  if (isApk && window.location.protocol !== 'http:' && window.location.protocol !== 'https:') {
    return 'wss://allati-arena.onrender.com';
  }

  // Web fallback (relative to current domain or localhost:3000)
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host || 'localhost:3000';
  return `${protocol}//${host}`;
}

function updateServerStatusUI(status, msg) {
  const dot = document.getElementById('mp-status-indicator');
  const text = document.getElementById('mp-status-text');
  const quickDot = document.getElementById('mp-quick-dot');
  const quickText = document.getElementById('mp-quick-status-txt');

  if (dot) dot.className = `status-dot ${status}`;
  if (text) text.textContent = msg;
  if (quickDot) quickDot.className = `status-dot ${status}`;
  if (quickText) quickText.textContent = msg;
}

function updatePlayerCupsUI() {
  const cupsEl = document.getElementById('mp-player-cups');
  if (cupsEl && typeof save !== 'undefined') {
    cupsEl.textContent = save.trophies || 0;
  }
}

let mpReconnectTimer = null;

function initMultiplayerSocket() {
  if (mpSocket && (mpSocket.readyState === WebSocket.OPEN || mpSocket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const wsUrl = getMultiplayerServerUrl();
  updateServerStatusUI('connecting', 'Kapcsolódás szerverhez...');

  try {
    mpSocket = new WebSocket(wsUrl);
  } catch (err) {
    console.warn('Could not establish WebSocket connection:', err);
    updateServerStatusUI('offline', '🔴 Nincs kapcsolat (Szerver offline)');
    scheduleMpReconnect();
    return;
  }

  mpSocket.onopen = () => {
    console.log('Connected to Animal Clash multiplayer server at:', wsUrl);
    updateServerStatusUI('online', '🟢 Online szerver aktív');
    if (mpReconnectTimer) {
      clearTimeout(mpReconnectTimer);
      mpReconnectTimer = null;
    }
    // Update player cups in UI
    updatePlayerCupsUI();
  };

  mpSocket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleServerMessage(data);
    } catch (e) {
      console.error('Error handling WS message:', e);
    }
  };

  mpSocket.onclose = () => {
    console.log('Disconnected from multiplayer server.');
    updateServerStatusUI('offline', '🔴 Nincs kapcsolat');
    if (isSearchingMatch) {
      cancelQuickMatchSearch(false);
    }
    scheduleMpReconnect();
  };

  mpSocket.onerror = (e) => {
    console.warn('WebSocket error:', e);
    updateServerStatusUI('offline', '🔴 Szerver hiba');
  };
}

function scheduleMpReconnect() {
  if (mpReconnectTimer) return;
  mpReconnectTimer = setTimeout(() => {
    mpReconnectTimer = null;
    if (!isMultiplayerMatch && (!mpSocket || mpSocket.readyState === WebSocket.CLOSED)) {
      initMultiplayerSocket();
    }
  }, 5000);
}

function handleServerMessage(data) {
  switch (data.type) {
    // --- MATCHMAKING STATUS ---
    case 'search_status': {
      const infoEl = document.getElementById('mp-search-queue-info');
      if (infoEl) {
        if (data.searchingCount <= 1) {
          infoEl.textContent = 'Várakozás ellenfélre a szerveren... (1 várakozik)';
        } else {
          infoEl.textContent = `Hasonló kupaérték keresése... (${data.searchingCount} játékos sorban)`;
        }
      }
      break;
    }

    case 'search_canceled': {
      resetSearchUI();
      break;
    }

    // --- MATCH FOUND / START ---
    case 'match_start': {
      currentRoomCode = data.code;
      mpRole = data.role;
      closeMultiplayerModals();

      if (isSearchingMatch || data.isMatchmaking) {
        showMatchFoundBanner(data);
      } else {
        startMultiplayerBattle({
          role: mpRole,
          code: data.code,
          opponentName: data.opponentName,
          opponentCups: data.opponentCups,
          opponentDeck: data.opponentDeck,
          arena: data.arena || 1
        });
      }
      break;
    }

    // --- PROGRESS / CUPS UPDATE ---
    case 'cups_updated': {
      if (typeof save !== 'undefined' && data.newCups !== undefined) {
        save.trophies = data.newCups;
        if (typeof saveGame === 'function') saveGame();
        updatePlayerCupsUI();

        const chestInfo = document.getElementById('result-chest');
        if (chestInfo && data.delta !== undefined) {
          const sign = data.delta > 0 ? '+' : '';
          const color = data.delta > 0 ? '#2ed573' : (data.delta < 0 ? '#ff4757' : '#ffd23f');
          const cupBadge = `<div style="margin-top:8px; font-size:16px; font-weight:800; color:${color};">
            🏆 Rangsorolt Kupa: ${sign}${data.delta} (Összesen: ${data.newCups})
          </div>`;
          chestInfo.innerHTML += cupBadge;
        }
      }
      break;
    }

    // --- PRIVATE ROOM HOST ---
    case 'room_created': {
      currentRoomCode = data.code;
      mpRole = 'host';
      showHostWaitingModal(data.code);
      break;
    }

    case 'join_error': {
      alert(data.message || 'Nem sikerült csatlakozni a szobához.');
      const joinBtn = document.getElementById('btn-mp-join-submit');
      if (joinBtn) {
        joinBtn.disabled = false;
        joinBtn.textContent = 'Csatlakozás & Csata!';
      }
      break;
    }

    // --- GAMEPLAY SYNCHRONIZATION ---
    case 'opponent_deploy': {
      if (!battle || !isMultiplayerMatch) return;
      const mirroredX = ARENA.W - data.x;
      const mirroredY = ARENA.H - data.y;
      playCard(data.cardId, ENEMY, mirroredX, mirroredY);
      break;
    }

    case 'opponent_disconnected': {
      if (battle && isMultiplayerMatch) {
        alert('Az ellenfél kilépett vagy megszakadt a kapcsolata! Győzelem feladás miatt.');
        battle.crowns.player = 3;
        endBattle();
      }
      break;
    }

    case 'opponent_emote': {
      if (battle && isMultiplayerMatch) {
        showFloatingEmote(ENEMY, data.emote);
      }
      break;
    }
  }
}

// ---------- MODE SWITCH TOGGLE ----------
function switchMultiplayerMode(mode) {
  const btnQuick = document.getElementById('btn-toggle-quick');
  const btnCode = document.getElementById('btn-toggle-code');
  const panelQuick = document.getElementById('mp-panel-quick');
  const panelCode = document.getElementById('mp-panel-code');

  if (mode === 'code') {
    if (btnCode) btnCode.classList.add('active');
    if (btnQuick) btnQuick.classList.remove('active');
    if (panelCode) panelCode.classList.remove('hidden');
    if (panelQuick) panelQuick.classList.add('hidden');
    localStorage.setItem('animal_clash_mp_mode', 'code');
    if (isSearchingMatch) cancelQuickMatchSearch(true);
  } else {
    if (btnQuick) btnQuick.classList.add('active');
    if (btnCode) btnCode.classList.remove('active');
    if (panelQuick) panelQuick.classList.remove('hidden');
    if (panelCode) panelCode.classList.add('hidden');
    localStorage.setItem('animal_clash_mp_mode', 'quick');
  }
}

// ---------- QUICK MATCH SEARCH LOGIC ----------
function startQuickMatchSearch() {
  initMultiplayerSocket();
  isSearchingMatch = true;
  searchSeconds = 0;

  const idleView = document.getElementById('mp-search-idle');
  const activeView = document.getElementById('mp-search-active');
  const banner = document.getElementById('mp-match-found-banner');
  const timerEl = document.getElementById('mp-search-timer');
  const queueInfo = document.getElementById('mp-search-queue-info');

  if (idleView) idleView.classList.add('hidden');
  if (banner) banner.classList.add('hidden');
  if (activeView) activeView.classList.remove('hidden');
  if (timerEl) timerEl.textContent = '00:00';
  if (queueInfo) queueInfo.textContent = 'Kapcsolódás a meccskeresőhöz...';

  if (searchTimerInterval) clearInterval(searchTimerInterval);
  searchTimerInterval = setInterval(() => {
    searchSeconds++;
    const mins = String(Math.floor(searchSeconds / 60)).padStart(2, '0');
    const secs = String(searchSeconds % 60).padStart(2, '0');
    if (timerEl) timerEl.textContent = `${mins}:${secs}`;
  }, 1000);

  const sendFind = () => {
    if (mpSocket && mpSocket.readyState === WebSocket.OPEN) {
      mpSocket.send(JSON.stringify({
        type: 'find_match',
        playerId: save.playerId,
        name: save.playerName || 'Harcos',
        cups: save.trophies || 0,
        deck: [...save.deck],
        arena: save.arena || 1
      }));
    }
  };

  if (mpSocket && mpSocket.readyState === WebSocket.OPEN) {
    sendFind();
  } else {
    mpSocket.addEventListener('open', sendFind, { once: true });
  }
}

function cancelQuickMatchSearch(sendToServer = true) {
  if (searchTimerInterval) {
    clearInterval(searchTimerInterval);
    searchTimerInterval = null;
  }
  isSearchingMatch = false;

  if (sendToServer && mpSocket && mpSocket.readyState === WebSocket.OPEN) {
    mpSocket.send(JSON.stringify({ type: 'cancel_search' }));
  }

  resetSearchUI();
}

function resetSearchUI() {
  if (searchTimerInterval) {
    clearInterval(searchTimerInterval);
    searchTimerInterval = null;
  }
  isSearchingMatch = false;

  const idleView = document.getElementById('mp-search-idle');
  const activeView = document.getElementById('mp-search-active');
  const banner = document.getElementById('mp-match-found-banner');

  if (idleView) idleView.classList.remove('hidden');
  if (activeView) activeView.classList.add('hidden');
  if (banner) banner.classList.add('hidden');
}

function showMatchFoundBanner(data) {
  isSearchingMatch = false;
  if (searchTimerInterval) {
    clearInterval(searchTimerInterval);
    searchTimerInterval = null;
  }

  const idleView = document.getElementById('mp-search-idle');
  const activeView = document.getElementById('mp-search-active');
  const banner = document.getElementById('mp-match-found-banner');

  if (idleView) idleView.classList.add('hidden');
  if (activeView) activeView.classList.add('hidden');
  if (banner) banner.classList.remove('hidden');

  const myNameEl = document.getElementById('mp-found-my-name');
  const myCupsEl = document.getElementById('mp-found-my-cups');
  const oppNameEl = document.getElementById('mp-found-opp-name');
  const oppCupsEl = document.getElementById('mp-found-opp-cups');
  const countdownEl = document.getElementById('mp-found-countdown');

  if (myNameEl) myNameEl.textContent = save.playerName || 'Te';
  if (myCupsEl) myCupsEl.textContent = `🏆 ${save.trophies || 0}`;
  if (oppNameEl) oppNameEl.textContent = data.opponentName || 'Ellenfél';
  if (oppCupsEl) oppCupsEl.textContent = `🏆 ${data.opponentCups || 0}`;

  let countdown = 2;
  if (countdownEl) countdownEl.textContent = `Csata indul: ${countdown}...`;

  const countInterval = setInterval(() => {
    countdown--;
    if (countdown > 0) {
      if (countdownEl) countdownEl.textContent = `Csata indul: ${countdown}...`;
    } else {
      clearInterval(countInterval);
      if (banner) banner.classList.add('hidden');
      resetSearchUI();
      startMultiplayerBattle({
        role: mpRole,
        code: data.code,
        opponentName: data.opponentName,
        opponentCups: data.opponentCups,
        opponentDeck: data.opponentDeck,
        arena: data.arena || 1
      });
    }
  }, 1000);
}

// ---------- CODE-BASED ROOMS ----------
function createMultiplayerRoom() {
  initMultiplayerSocket();
  const sendCreate = () => {
    mpSocket.send(JSON.stringify({
      type: 'create_room',
      playerId: save.playerId,
      name: save.playerName || 'Harcos (Host)',
      cups: save.trophies || 0,
      deck: [...save.deck],
      arena: save.arena
    }));
  };
  if (mpSocket.readyState === WebSocket.OPEN) {
    sendCreate();
  } else {
    mpSocket.addEventListener('open', sendCreate, { once: true });
  }
}

function joinMultiplayerRoom(code) {
  initMultiplayerSocket();
  const sendJoin = () => {
    mpSocket.send(JSON.stringify({
      type: 'join_room',
      code: String(code).trim(),
      playerId: save.playerId,
      name: save.playerName || 'Kihívó',
      cups: save.trophies || 0,
      deck: [...save.deck]
    }));
  };
  if (mpSocket.readyState === WebSocket.OPEN) {
    sendJoin();
  } else {
    mpSocket.addEventListener('open', sendJoin, { once: true });
  }
}

function broadcastDeployCard(cardId, x, y) {
  if (!isMultiplayerMatch || !mpSocket || mpSocket.readyState !== WebSocket.OPEN) return;
  mpSocket.send(JSON.stringify({
    type: 'deploy_card',
    cardId,
    x,
    y,
    level: save.cards[cardId] ? save.cards[cardId].level : 1,
    timestamp: Date.now()
  }));
}

function broadcastEmote(emote) {
  if (!isMultiplayerMatch || !mpSocket || mpSocket.readyState !== WebSocket.OPEN) return;
  mpSocket.send(JSON.stringify({
    type: 'emote',
    emote
  }));
}

function notifyMultiplayerBattleEnd(p, e) {
  if (!isMultiplayerMatch || !mpSocket || mpSocket.readyState !== WebSocket.OPEN) return;
  const winnerRole = p > e ? mpRole : (p < e ? (mpRole === 'host' ? 'guest' : 'host') : 'draw');
  mpSocket.send(JSON.stringify({
    type: 'match_end',
    winnerRole,
    crownsPlayer: p,
    crownsEnemy: e
  }));
}

function startMultiplayerBattle(opts) {
  isMultiplayerMatch = true;
  document.getElementById('battle-screen').classList.remove('hidden');
  document.getElementById('result').classList.add('hidden');

  startBattle({
    multiplayer: true,
    role: opts.role,
    opponentName: opts.opponentName,
    enemyDeck: opts.opponentDeck && opts.opponentDeck.length === 8 ? opts.opponentDeck : null
  });
}

function showFloatingEmote(team, emoteText) {
  const x = ARENA.centerX;
  const y = team === PLAYER ? ARENA.H - 120 : 120;
  if (battle) {
    battle.popups.push({ x, y, text: emoteText, life: 2.2 });
  }
}

function showHostWaitingModal(code) {
  let modal = document.getElementById('mp-host-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'mp-host-modal';
    modal.className = 'modal';
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="modal-box mp-box">
      <button class="modal-close" id="btn-close-host-modal">&times;</button>
      <div class="mp-head">
        <span class="icon" data-icon="battle"></span>
        <h3>Online Szoba / Lobby</h3>
      </div>
      <p class="mp-sub">Oszd meg ezt a 4 számjegyű kódot az ellenfeleddel:</p>
      <div class="mp-code-display">${code}</div>
      <div class="mp-waiting-dots">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        <span>Várakozás az ellenfélre...</span>
      </div>
      <div class="mp-modal-actions">
        <button class="action-btn" id="btn-copy-code">Kód Másolása</button>
        <button class="action-btn cancel" id="btn-cancel-host">Mégse</button>
      </div>
    </div>
  `;
  applyIcons(modal);
  modal.classList.remove('hidden');

  document.getElementById('btn-close-host-modal').addEventListener('click', closeMultiplayerModals);
  document.getElementById('btn-cancel-host').addEventListener('click', closeMultiplayerModals);
  document.getElementById('btn-copy-code').addEventListener('click', () => {
    navigator.clipboard.writeText(code).then(() => {
      document.getElementById('btn-copy-code').textContent = 'Másolva!';
      setTimeout(() => {
        const btn = document.getElementById('btn-copy-code');
        if (btn) btn.textContent = 'Kód Másolása';
      }, 2000);
    });
  });
}

function showJoinInputModal() {
  let modal = document.getElementById('mp-join-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'mp-join-modal';
    modal.className = 'modal';
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="modal-box mp-box">
      <button class="modal-close" id="btn-close-join-modal">&times;</button>
      <div class="mp-head">
        <span class="icon" data-icon="users"></span>
        <h3>Csatlakozás Szobához</h3>
      </div>
      <p class="mp-sub">Add meg a szoba 4 számjegyű kódját:</p>
      <div class="mp-input-wrap">
        <input type="text" id="mp-room-input" maxlength="4" placeholder="4821" autofocus />
      </div>
      <div class="mp-modal-actions">
        <button class="big-btn mp-connect-btn" id="btn-mp-join-submit">Csatlakozás & Csata!</button>
        <button class="action-btn cancel" id="btn-cancel-join">Mégse</button>
      </div>
    </div>
  `;
  applyIcons(modal);
  modal.classList.remove('hidden');

  const input = document.getElementById('mp-room-input');
  input.focus();

  document.getElementById('btn-close-join-modal').addEventListener('click', closeMultiplayerModals);
  document.getElementById('btn-cancel-join').addEventListener('click', closeMultiplayerModals);
  document.getElementById('btn-mp-join-submit').addEventListener('click', () => {
    const val = input.value.trim();
    if (val.length !== 4 || isNaN(val)) {
      alert('Kérlek 4 számjegyet adj meg!');
      return;
    }
    document.getElementById('btn-mp-join-submit').disabled = true;
    document.getElementById('btn-mp-join-submit').textContent = 'Csatlakozás...';
    joinMultiplayerRoom(val);
  });
}

function closeMultiplayerModals() {
  const hostModal = document.getElementById('mp-host-modal');
  if (hostModal) hostModal.classList.add('hidden');
  const joinModal = document.getElementById('mp-join-modal');
  if (joinModal) joinModal.classList.add('hidden');
  const serverModal = document.getElementById('server-config-modal');
  if (serverModal) serverModal.classList.add('hidden');
}

function showServerConfigModal() {
  const modal = document.getElementById('server-config-modal');
  if (!modal) return;
  const input = document.getElementById('mp-server-url-input');
  const resultDiv = document.getElementById('mp-test-result');
  if (resultDiv) resultDiv.textContent = '';

  const currentUrl = localStorage.getItem('animal_clash_server_url') || getMultiplayerServerUrl();
  if (input) input.value = currentUrl;

  modal.classList.remove('hidden');
}

function setupMultiplayerEventListeners() {
  const btnToggleQuick = document.getElementById('btn-toggle-quick');
  const btnToggleCode = document.getElementById('btn-toggle-code');
  if (btnToggleQuick) btnToggleQuick.onclick = () => switchMultiplayerMode('quick');
  if (btnToggleCode) btnToggleCode.onclick = () => switchMultiplayerMode('code');

  const btnFindMatch = document.getElementById('btn-find-match');
  if (btnFindMatch) btnFindMatch.onclick = startQuickMatchSearch;

  const btnCancelSearch = document.getElementById('btn-cancel-search');
  if (btnCancelSearch) btnCancelSearch.onclick = () => cancelQuickMatchSearch(true);

  const btnHost = document.getElementById('btn-mp-host');
  if (btnHost) btnHost.onclick = createMultiplayerRoom;

  const btnJoin = document.getElementById('btn-mp-join');
  if (btnJoin) btnJoin.onclick = showJoinInputModal;

  const btnCfg = document.getElementById('btn-mp-server-cfg');
  if (btnCfg) btnCfg.onclick = showServerConfigModal;

  const btnClose = document.getElementById('btn-server-close');
  if (btnClose) btnClose.onclick = closeMultiplayerModals;

  const btnCancel = document.getElementById('btn-server-cancel');
  if (btnCancel) btnCancel.onclick = closeMultiplayerModals;

  const presets = document.querySelectorAll('.preset-btn');
  presets.forEach(btn => {
    btn.onclick = () => {
      const input = document.getElementById('mp-server-url-input');
      if (input && btn.dataset.url) {
        input.value = btn.dataset.url;
      }
    };
  });

  const btnSave = document.getElementById('btn-server-save');
  if (btnSave) {
    btnSave.onclick = () => {
      const input = document.getElementById('mp-server-url-input');
      const val = input ? input.value.trim() : '';
      if (val) {
        localStorage.setItem('animal_clash_server_url', val);
      } else {
        localStorage.removeItem('animal_clash_server_url');
      }
      closeMultiplayerModals();
      if (mpSocket) {
        mpSocket.close();
      }
      initMultiplayerSocket();
    };
  }

  const savedMode = localStorage.getItem('animal_clash_mp_mode') || 'quick';
  switchMultiplayerMode(savedMode);

  updatePlayerCupsUI();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupMultiplayerEventListeners);
} else {
  setupMultiplayerEventListeners();
}

initMultiplayerSocket();
