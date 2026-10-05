// The arenas. You reach a new arena by collecting trophies.
// Cards have an "arena" number: they can only be found in chests from that arena or a later one.
const ARENAS = [
  { id: 1, name: 'Farm', trophies: 0,   chestWord: 'farmláda',   build: res => buildFarmArena(res) },
  { id: 2, name: 'Erdő', trophies: 250, chestWord: 'erdei láda', build: res => buildForestArena(res) },
];

// Highest arena the player has reached
function highestArena() {
  let best = 1;
  for (const a of ARENAS) if (isArenaUnlocked(a.id)) best = a.id;
  return best;
}
