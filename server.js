const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Enable CORS for Netlify and mobile apps
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Serve static assets
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// Lightweight JSON + In-Memory player profile storage
// Render Free Tier Note: Containers on Render free tier sleep after 15m idle and reset disk.
// Hence, clients store authoritative cups in localStorage and sync with server,
// while server persists data/players.json during container lifecycle.
const dataDir = path.join(__dirname, 'data');
const playersFile = path.join(dataDir, 'players.json');
let players = {};

function loadPlayers() {
  try {
    if (fs.existsSync(playersFile)) {
      players = JSON.parse(fs.readFileSync(playersFile, 'utf8'));
    }
  } catch (e) {
    players = {};
  }
}
loadPlayers();

function savePlayers() {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(playersFile, JSON.stringify(players, null, 2), 'utf8');
  } catch (e) {
    // Fallback if disk is read-only
  }
}

function getOrCreatePlayer(id, name, clientCups) {
  if (!id) id = 'anon_' + Math.random().toString(36).substr(2, 9);
  if (!players[id]) {
    players[id] = {
      id,
      name: name || 'Harcos',
      cups: Math.max(0, parseInt(clientCups, 10) || 0),
      wins: 0,
      losses: 0,
      matches: 0,
      createdAt: Date.now()
    };
    savePlayers();
  } else {
    if (clientCups !== undefined && clientCups !== null) {
      players[id].cups = Math.max(players[id].cups, parseInt(clientCups, 10) || 0);
    }
    if (name) players[id].name = name;
  }
  return players[id];
}

// API health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    game: 'Állati Aréna (Animal Clash)',
    activeRooms: Object.keys(rooms).length,
    searchingPlayers: matchmakingQueue.length,
    connectedSockets: wss.clients.size,
    totalRegisteredPlayers: Object.keys(players).length,
    timestamp: Date.now()
  });
});

app.get('/api/leaderboard', (req, res) => {
  const top = Object.values(players)
    .sort((a, b) => b.cups - a.cups)
    .slice(0, 50)
    .map(p => ({ id: p.id, name: p.name, cups: p.cups, wins: p.wins, matches: p.matches }));
  res.json(top);
});

// Multiplayer room storage
// roomCode -> { code, host: ws, guest: ws, hostDeck, guestDeck, state, createdAt }
const rooms = {};

// Matchmaking Queue: list of players searching for opponent
// items: { ws, playerId, playerName, cups, deck, arena, joinedAt }
let matchmakingQueue = [];

function generateRoomCode() {
  let code;
  let attempts = 0;
  do {
    code = String(Math.floor(1000 + Math.random() * 9000));
    attempts++;
  } while (rooms[code] && attempts < 100);
  return code;
}

function cleanExpiredRooms() {
  const now = Date.now();
  for (const code in rooms) {
    if (now - rooms[code].createdAt > 30 * 60 * 1000) { // 30 minutes
      delete rooms[code];
    }
  }
}
setInterval(cleanExpiredRooms, 60 * 1000);

// Matchmaking process
// Requirements:
// 1. If only just 2 players are searching on the server: they play directly!
// 2. If more than 2 players are searching: compares how many cups they have and pairs the most similar ones!
function processMatchmaking() {
  // Filter out disconnected sockets
  matchmakingQueue = matchmakingQueue.filter(p => p.ws && p.ws.readyState === WebSocket.OPEN);

  if (matchmakingQueue.length < 2) {
    if (matchmakingQueue.length === 1) {
      const p = matchmakingQueue[0];
      if (p.ws.readyState === WebSocket.OPEN) {
        p.ws.send(JSON.stringify({
          type: 'search_status',
          status: 'searching',
          searchingCount: 1,
          totalOnline: wss.clients.size,
          cups: p.cups
        }));
      }
    }
    return;
  }

  let pair = null;

  if (matchmakingQueue.length === 2) {
    // If only just 2 players are searching: pair them immediately
    pair = [matchmakingQueue[0], matchmakingQueue[1]];
    matchmakingQueue = [];
  } else {
    // If there is more than 2: look at cups and pair the two with closest cup count!
    let minDiff = Infinity;
    let bestI = 0;
    let bestJ = 1;

    for (let i = 0; i < matchmakingQueue.length; i++) {
      for (let j = i + 1; j < matchmakingQueue.length; j++) {
        const diff = Math.abs(matchmakingQueue[i].cups - matchmakingQueue[j].cups);
        if (diff < minDiff) {
          minDiff = diff;
          bestI = i;
          bestJ = j;
        }
      }
    }

    const p1 = matchmakingQueue[bestI];
    const p2 = matchmakingQueue[bestJ];
    pair = [p1, p2];

    matchmakingQueue = matchmakingQueue.filter((_, idx) => idx !== bestI && idx !== bestJ);
  }

  if (pair && pair.length === 2) {
    const [p1, p2] = pair;
    const code = generateRoomCode();

    rooms[code] = {
      code,
      isMatchmaking: true,
      host: p1.ws,
      guest: p2.ws,
      hostPlayerId: p1.playerId,
      guestPlayerId: p2.playerId,
      hostName: p1.playerName,
      guestName: p2.playerName,
      hostCups: p1.cups,
      guestCups: p2.cups,
      hostDeck: p1.deck,
      guestDeck: p2.deck,
      arena: Math.max(p1.arena || 1, p2.arena || 1),
      state: 'playing',
      createdAt: Date.now()
    };

    p1.ws.roomCode = code;
    p1.ws.isHost = true;
    p2.ws.roomCode = code;
    p2.ws.isHost = false;

    // Send match_start to host
    p1.ws.send(JSON.stringify({
      type: 'match_start',
      isMatchmaking: true,
      code,
      role: 'host',
      opponentName: p2.playerName,
      opponentCups: p2.cups,
      opponentDeck: p2.deck,
      myCups: p1.cups,
      arena: rooms[code].arena
    }));

    // Send match_start to guest
    p2.ws.send(JSON.stringify({
      type: 'match_start',
      isMatchmaking: true,
      code,
      role: 'guest',
      opponentName: p1.playerName,
      opponentCups: p1.cups,
      opponentDeck: p1.deck,
      myCups: p2.cups,
      arena: rooms[code].arena
    }));

    console.log(`[Matchmaking] Matched: ${p1.playerName} (${p1.cups} cups) vs ${p2.playerName} (${p2.cups} cups) in room ${code}`);
  }
}

// Tick matchmaking every second
setInterval(processMatchmaking, 1000);

wss.on('connection', (ws) => {
  ws.roomCode = null;
  ws.isHost = false;
  ws.playerId = null;

  // Inform newly connected client of online players
  ws.send(JSON.stringify({
    type: 'connected',
    online: wss.clients.size
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleMessage(ws, data);
    } catch (err) {
      console.error('Error parsing WS message:', err);
    }
  });

  ws.on('close', () => {
    // Remove from search queue if present
    matchmakingQueue = matchmakingQueue.filter(p => p.ws !== ws);

    if (ws.roomCode && rooms[ws.roomCode]) {
      const room = rooms[ws.roomCode];
      const other = ws.isHost ? room.guest : room.host;
      if (other && other.readyState === WebSocket.OPEN) {
        other.send(JSON.stringify({
          type: 'opponent_disconnected',
          message: 'Your opponent left or disconnected.'
        }));
      }
      delete rooms[ws.roomCode];
    }
  });
});

function handleMessage(ws, data) {
  switch (data.type) {
    // --- MATCHMAKING SEARCH MODE ---
    case 'find_match': {
      const playerId = data.playerId || 'player_' + Math.random().toString(36).substr(2, 9);
      const playerName = data.name || 'Harcos';
      const cups = Math.max(0, parseInt(data.cups, 10) || 0);
      const deck = data.deck || [];
      const arena = data.arena || 1;

      ws.playerId = playerId;
      const profile = getOrCreatePlayer(playerId, playerName, cups);

      // Remove any existing entry for this socket or playerId
      matchmakingQueue = matchmakingQueue.filter(p => p.ws !== ws && p.playerId !== playerId);

      // Add to search queue
      matchmakingQueue.push({
        ws,
        playerId,
        playerName: profile.name,
        cups: profile.cups,
        deck,
        arena,
        joinedAt: Date.now()
      });

      console.log(`[Queue] ${playerName} (cups: ${profile.cups}) joined matchmaking. Queue size: ${matchmakingQueue.length}`);

      ws.send(JSON.stringify({
        type: 'search_status',
        status: 'searching',
        searchingCount: matchmakingQueue.length,
        totalOnline: wss.clients.size,
        cups: profile.cups
      }));

      // Immediate match check
      processMatchmaking();
      break;
    }

    case 'cancel_search': {
      matchmakingQueue = matchmakingQueue.filter(p => p.ws !== ws);
      ws.send(JSON.stringify({
        type: 'search_canceled'
      }));
      console.log(`[Queue] Player canceled search. Queue size: ${matchmakingQueue.length}`);
      break;
    }

    // --- CODE-BASED PRIVATE ROOM MODE ---
    case 'create_room': {
      cleanExpiredRooms();
      const code = generateRoomCode();
      const playerId = data.playerId || 'player_' + Math.random().toString(36).substr(2, 9);
      const profile = getOrCreatePlayer(playerId, data.name, data.cups);

      rooms[code] = {
        code,
        isMatchmaking: false,
        host: ws,
        guest: null,
        hostPlayerId: playerId,
        guestPlayerId: null,
        hostDeck: data.deck || [],
        hostName: profile.name,
        hostCups: profile.cups,
        guestDeck: null,
        guestName: null,
        guestCups: 0,
        arena: data.arena || 1,
        state: 'waiting',
        createdAt: Date.now()
      };
      ws.roomCode = code;
      ws.isHost = true;
      ws.playerId = playerId;

      ws.send(JSON.stringify({
        type: 'room_created',
        code,
        role: 'host',
        myCups: profile.cups
      }));
      console.log(`Room created: ${code} by ${profile.name}`);
      break;
    }

    case 'join_room': {
      const code = String(data.code).trim();
      const room = rooms[code];
      if (!room) {
        ws.send(JSON.stringify({
          type: 'join_error',
          message: `Szoba "${code}" nem található! Ellenőrizd a kódot.`
        }));
        return;
      }
      if (room.guest) {
        ws.send(JSON.stringify({
          type: 'join_error',
          message: `A "${code}" szoba már tele van!`
        }));
        return;
      }

      const playerId = data.playerId || 'player_' + Math.random().toString(36).substr(2, 9);
      const profile = getOrCreatePlayer(playerId, data.name, data.cups);

      room.guest = ws;
      room.guestPlayerId = playerId;
      room.guestDeck = data.deck || [];
      room.guestName = profile.name;
      room.guestCups = profile.cups;
      room.state = 'playing';
      ws.roomCode = code;
      ws.isHost = false;
      ws.playerId = playerId;

      // Notify host
      if (room.host.readyState === WebSocket.OPEN) {
        room.host.send(JSON.stringify({
          type: 'match_start',
          isMatchmaking: false,
          code,
          role: 'host',
          opponentName: room.guestName,
          opponentCups: room.guestCups,
          opponentDeck: room.guestDeck,
          myCups: room.hostCups,
          arena: room.arena
        }));
      }

      // Notify guest
      ws.send(JSON.stringify({
        type: 'match_start',
        isMatchmaking: false,
        code,
        role: 'guest',
        opponentName: room.hostName,
        opponentCups: room.hostCups,
        opponentDeck: room.hostDeck,
        myCups: room.guestCups,
        arena: room.arena
      }));

      console.log(`Player joined room ${code}: ${room.guestName} vs ${room.hostName}`);
      break;
    }

    // --- MATCH RESULT & CUPS PROGRESSION ---
    case 'match_end': {
      if (!ws.roomCode || !rooms[ws.roomCode]) return;
      const room = rooms[ws.roomCode];
      if (room.ended) return; // avoid duplicate resolution
      room.ended = true;

      const winnerRole = data.winnerRole; // 'host', 'guest', or 'draw'
      const isHostWinner = winnerRole === 'host';
      const isDraw = winnerRole === 'draw';

      const hostProfile = getOrCreatePlayer(room.hostPlayerId, room.hostName, room.hostCups);
      const guestProfile = getOrCreatePlayer(room.guestPlayerId, room.guestName, room.guestCups);

      let hostDelta = 0;
      let guestDelta = 0;

      if (isDraw) {
        hostDelta = 0;
        guestDelta = 0;
      } else if (isHostWinner) {
        hostDelta = +30;
        guestDelta = -15;
      } else {
        hostDelta = -15;
        guestDelta = +30;
      }

      hostProfile.cups = Math.max(0, hostProfile.cups + hostDelta);
      guestProfile.cups = Math.max(0, guestProfile.cups + guestDelta);
      hostProfile.matches = (hostProfile.matches || 0) + 1;
      guestProfile.matches = (guestProfile.matches || 0) + 1;

      if (!isDraw) {
        if (isHostWinner) {
          hostProfile.wins = (hostProfile.wins || 0) + 1;
          guestProfile.losses = (guestProfile.losses || 0) + 1;
        } else {
          guestProfile.wins = (guestProfile.wins || 0) + 1;
          hostProfile.losses = (hostProfile.losses || 0) + 1;
        }
      }
      savePlayers();

      if (room.host && room.host.readyState === WebSocket.OPEN) {
        room.host.send(JSON.stringify({
          type: 'cups_updated',
          newCups: hostProfile.cups,
          delta: hostDelta,
          opponentCups: guestProfile.cups
        }));
      }

      if (room.guest && room.guest.readyState === WebSocket.OPEN) {
        room.guest.send(JSON.stringify({
          type: 'cups_updated',
          newCups: guestProfile.cups,
          delta: guestDelta,
          opponentCups: hostProfile.cups
        }));
      }
      break;
    }

    // --- GAMEPLAY SYNC ---
    case 'deploy_card': {
      if (!ws.roomCode || !rooms[ws.roomCode]) return;
      const room = rooms[ws.roomCode];
      const other = ws.isHost ? room.guest : room.host;
      if (other && other.readyState === WebSocket.OPEN) {
        other.send(JSON.stringify({
          type: 'opponent_deploy',
          cardId: data.cardId,
          x: data.x,
          y: data.y,
          level: data.level || 1,
          timestamp: data.timestamp
        }));
      }
      break;
    }

    case 'sync_state': {
      if (!ws.roomCode || !rooms[ws.roomCode]) return;
      const room = rooms[ws.roomCode];
      const other = ws.isHost ? room.guest : room.host;
      if (other && other.readyState === WebSocket.OPEN) {
        other.send(JSON.stringify({
          type: 'state_sync',
          fromHost: ws.isHost,
          towers: data.towers,
          time: data.time,
          crowns: data.crowns
        }));
      }
      break;
    }

    case 'emote': {
      if (!ws.roomCode || !rooms[ws.roomCode]) return;
      const room = rooms[ws.roomCode];
      const other = ws.isHost ? room.guest : room.host;
      if (other && other.readyState === WebSocket.OPEN) {
        other.send(JSON.stringify({
          type: 'opponent_emote',
          emote: data.emote
        }));
      }
      break;
    }

    case 'surrender': {
      if (!ws.roomCode || !rooms[ws.roomCode]) return;
      const room = rooms[ws.roomCode];
      const other = ws.isHost ? room.guest : room.host;
      if (other && other.readyState === WebSocket.OPEN) {
        other.send(JSON.stringify({
          type: 'opponent_surrendered'
        }));
      }
      delete rooms[ws.roomCode];
      break;
    }
  }
}

server.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(` Animal Clash Server running on port ${PORT}`);
  console.log(` Matchmaking & Cups progression enabled`);
  console.log(` http://localhost:${PORT}`);
  console.log(`=========================================`);
});
