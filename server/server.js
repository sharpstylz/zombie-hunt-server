/* =========================================================
   ZOMBIE HUNT — UPGRADED MULTIPLAYER & VOICE SERVER
   Supports: 16P / 8P / 4P Modes, Custom Friend Rooms (Link/Code),
   Isolated Voice/Text Channels, Follow/DM & CEO Admin Analytics
========================================================= */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const publicDirectoryPath = path.join(__dirname, '../public');
app.use(express.static(publicDirectoryPath));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const SUITS = ["hearts", "diamonds", "clubs", "spades"];
const ENTRY_FEE = 1000;

// MODE CONFIGURATIONS (16P, 8P, 4P)
const MODE_CONFIGS = {
  "16P": { maxPlayers: 16, squadKeys: ["TEAM A", "TEAM B", "TEAM C", "TEAM D"], perSquad: 4, prizePool: 16000, winShare: 4000 },
  "8P":  { maxPlayers: 8,  squadKeys: ["TEAM A", "TEAM B", "TEAM C", "TEAM D"], perSquad: 2, prizePool: 8000,  winShare: 4000 },
  "4P":  { maxPlayers: 4,  squadKeys: ["TEAM A", "TEAM B"],                     perSquad: 2, prizePool: 4000,  winShare: 2000 }
};

// CEO Global Player Registry & Social Graph
const globalPlayerRegistry = {}; // sessionId -> player full record
const socialFollowers = {};      // targetSessionId -> Set of followerSessionIds
const bannedSessions = new Set();

// Active Lobby & Tournament State
let currentModeKey = "16P";
let customRoomCode = null;

let squadCustomNames = {
  "TEAM A": "TEAM ALPHA",
  "TEAM B": "TEAM BRAVO",
  "TEAM C": "TEAM CHARLIE",
  "TEAM D": "TEAM DELTA"
};

let tournamentLobby = {
  "TEAM A": [],
  "TEAM B": [],
  "TEAM C": [],
  "TEAM D": []
};

let activeMatches = {};
let sessionMatchLookup = {};
let sessionSocketLookup = {};
let socketSessionLookup = {};
let duelHistory = {};
let currentRound = 1;
let byePlayerSessionIds = new Set();
let tournamentStarted = false;
let tournamentEnded = false;
let winningSquadKey = null;
let disconnectGraceTimers = {};

function getModeConfig() {
  return MODE_CONFIGS[currentModeKey] || MODE_CONFIGS["16P"];
}

function getActiveSquadKeys() {
  return getModeConfig().squadKeys;
}

function resetTournamentState(newMode = "16P") {
  currentModeKey = MODE_CONFIGS[newMode] ? newMode : "16P";
  squadCustomNames = {
    "TEAM A": "TEAM ALPHA",
    "TEAM B": "TEAM BRAVO",
    "TEAM C": "TEAM CHARLIE",
    "TEAM D": "TEAM DELTA"
  };
  tournamentLobby = { "TEAM A": [], "TEAM B": [], "TEAM C": [], "TEAM D": [] };
  activeMatches = {};
  sessionMatchLookup = {};
  duelHistory = {};
  currentRound = 1;
  byePlayerSessionIds.clear();
  tournamentStarted = false;
  tournamentEnded = false;
  winningSquadKey = null;
}

function getTotalPlayersCount() {
  return getActiveSquadKeys().reduce((acc, sq) => acc + (tournamentLobby[sq]?.length || 0), 0);
}

function getAllPlayers() {
  let list = [];
  for (const sq of getActiveSquadKeys()) {
    list.push(...(tournamentLobby[sq] || []));
  }
  return list;
}

function assignToAvailableSquad(player, preferredTeam = null) {
  const cfg = getModeConfig();
  if (preferredTeam && cfg.squadKeys.includes(preferredTeam) && tournamentLobby[preferredTeam].length < cfg.perSquad) {
    player.team = preferredTeam;
    tournamentLobby[preferredTeam].push(player);
    return preferredTeam;
  }
  for (const sq of cfg.squadKeys) {
    if (tournamentLobby[sq].length < cfg.perSquad) {
      player.team = sq;
      tournamentLobby[sq].push(player);
      return sq;
    }
  }
  return null;
}

function createInitialHand() {
  const cards = [];
  const NUMBER_VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10];
  for (let i = 0; i < 7; i++) {
    const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
    const val = NUMBER_VALUES[Math.floor(Math.random() * NUMBER_VALUES.length)];
    cards.push({
      id: `card_${Math.random().toString(36).substring(2, 9)}`,
      type: "number",
      number: val,
      value: val,
      suit: suit,
      symbol: suit === "hearts" ? "♥" : suit === "diamonds" ? "♦" : suit === "clubs" ? "♣" : "♠",
      color: (suit === "hearts" || suit === "diamonds") ? "red" : "black"
    });
  }
  return cards;
}

function setupTournamentDecks() {
  tournamentStarted = true;
  tournamentEnded = false;
  getActiveSquadKeys().forEach(squadKey => {
    const members = tournamentLobby[squadKey] || [];
    if (members.length > 0) {
      const zombieIndex = Math.floor(Math.random() * members.length);
      members.forEach((player, idx) => {
        const isZombie = idx === zombieIndex;
        player.isZombie = isZombie;
        player.alive = true;
        player.sectorState = "in_arena";
        player.deck = {
          numberCards: createInitialHand(),
          specialCards: {
            zombie: isZombie,
            vaccine: true,
            shotgun: true
          }
        };
      });
    }
  });
}

function checkZeroCardsElimination(player) {
  if (!player || player.alive === false) return;
  const numCardsCount = player.deck?.numberCards?.length || 0;
  const hasVaccine = player.deck?.specialCards?.vaccine === true;
  const hasShotgun = player.deck?.specialCards?.shotgun === true;
  const hasZombie = player.isZombie === true && player.deck?.specialCards?.zombie === true;

  const totalCardsLeft = numCardsCount + (hasVaccine ? 1 : 0) + (hasShotgun ? 1 : 0) + (hasZombie ? 1 : 0);

  if (totalCardsLeft === 0) {
    player.alive = false;
    player.sectorState = "eliminated";
    for (const sqKey of getActiveSquadKeys()) {
      const found = tournamentLobby[sqKey].find(p => p.sessionId === player.sessionId);
      if (found) {
        found.alive = false;
        found.sectorState = "eliminated";
      }
    }
    broadcastTournamentState();
    checkTournamentWinner();
  }
}

function checkTournamentWinner() {
  if (tournamentEnded || !tournamentStarted) return false;

  const allCurrent = getAllPlayers();
  const survivingSquadKeys = getActiveSquadKeys().filter(sqKey => {
    return allCurrent.some(p => p.team === sqKey && p.alive === true);
  });

  if (survivingSquadKeys.length === 1) {
    tournamentEnded = true;
    winningSquadKey = survivingSquadKeys[0];
    const winningSquadName = squadCustomNames[winningSquadKey] || winningSquadKey;
    const winningMembers = tournamentLobby[winningSquadKey] || [];
    const cfg = getModeConfig();

    winningMembers.forEach(m => {
      if (globalPlayerRegistry[m.sessionId]) {
        globalPlayerRegistry[m.sessionId].bountyTokens += cfg.winShare;
        globalPlayerRegistry[m.sessionId].squadWins += 1;
      }
    });

    io.emit('tournament_won', {
      winningSquadKey,
      winningSquadName,
      totalPrizePool: cfg.prizePool,
      sharePerPlayer: cfg.winShare,
      members: winningMembers,
      modeKey: currentModeKey
    });

    // Auto-reset server lobby 12 seconds after tournament ends so next match can run smoothly
    setTimeout(() => {
      resetTournamentState(currentModeKey);
    }, 12000);

    return true;
  }
  return false;
}

function generateTournamentDuels(roundNumber = 1) {
  if (checkTournamentWinner()) return;

  const previousOpponentMap = {};
  Object.values(activeMatches).forEach(m => {
    if (m.p1?.sessionId && m.p2?.sessionId) {
      previousOpponentMap[m.p1.sessionId] = m.p2.sessionId;
      previousOpponentMap[m.p2.sessionId] = m.p1.sessionId;
    }
  });

  activeMatches = {};
  sessionMatchLookup = {};
  currentRound = roundNumber;
  byePlayerSessionIds.clear();

  const alivePlayers = getAllPlayers().filter(p => p.alive === true);
  const uniqueSquads = new Set(alivePlayers.map(p => p.team));
  if (uniqueSquads.size <= 1) {
    checkTournamentWinner();
    return;
  }

  const paired = new Set();
  let matchIndex = 1;

  // Priority Pairing: Rival Squads + Least Played + Avoid Immediate Rematch
  alivePlayers.forEach(p1 => {
    if (paired.has(p1.sessionId)) return;

    let candidates = alivePlayers.filter(p2 =>
      p2.sessionId !== p1.sessionId &&
      !paired.has(p2.sessionId) &&
      p2.team !== p1.team
    );

    if (candidates.length > 0) {
      candidates.sort((a, b) => {
        const hA = (duelHistory[p1.sessionId] || []).filter(id => id === a.sessionId).length;
        const hB = (duelHistory[p1.sessionId] || []).filter(id => id === b.sessionId).length;
        if (hA !== hB) return hA - hB;
        const wasLastA = previousOpponentMap[p1.sessionId] === a.sessionId ? 1 : 0;
        const wasLastB = previousOpponentMap[p1.sessionId] === b.sessionId ? 1 : 0;
        return wasLastA - wasLastB;
      });

      const p2 = candidates[0];
      paired.add(p1.sessionId);
      paired.add(p2.sessionId);

      if (!duelHistory[p1.sessionId]) duelHistory[p1.sessionId] = [];
      if (!duelHistory[p2.sessionId]) duelHistory[p2.sessionId] = [];
      duelHistory[p1.sessionId].push(p2.sessionId);
      duelHistory[p2.sessionId].push(p1.sessionId);

      p1.sectorState = "in_arena";
      p2.sectorState = "in_arena";

      createDuelInstance(`match_${matchIndex++}`, p1, p2, roundNumber);
    }
  });

  alivePlayers.forEach(p => {
    if (!paired.has(p.sessionId)) {
      byePlayerSessionIds.add(p.sessionId);
      p.sectorState = "bye_reserve";
      const byeSocketId = sessionSocketLookup[p.sessionId];
      if (byeSocketId) {
        io.to(byeSocketId).emit('round_bye_granted', {
          message: "No rival squad available. You are in Combat Reserve (Bye) for this round.",
          round: currentRound
        });
      }
    }
  });

  broadcastTournamentState();
}

function createDuelInstance(matchId, p1, p2, roundNumber = 1) {
  const selectedSuit = SUITS[Math.floor(Math.random() * SUITS.length)];

  [p1, p2].forEach(p => {
    if (!p.deck) {
      p.deck = { numberCards: createInitialHand(), specialCards: { zombie: p.isZombie || false, vaccine: true, shotgun: true } };
    } else if (!Array.isArray(p.deck.numberCards)) {
      p.deck.numberCards = [];
    }
  });

  activeMatches[matchId] = {
    matchId,
    suit: selectedSuit,
    round: roundNumber,
    p1: {
      sessionId: p1.sessionId,
      socketId: sessionSocketLookup[p1.sessionId] || p1.id,
      player: p1,
      playedCards: null,
      lastPlayedCards: [],
      locked: false
    },
    p2: {
      sessionId: p2.sessionId,
      socketId: sessionSocketLookup[p2.sessionId] || p2.id,
      player: p2,
      playedCards: null,
      lastPlayedCards: [],
      locked: false
    },
    status: "in_progress"
  };

  sessionMatchLookup[p1.sessionId] = matchId;
  sessionMatchLookup[p2.sessionId] = matchId;
}

// Server-Authoritative Card Validation (Anti-Cheat)
function sanitizePlayedCards(player, rawCards) {
  if (!Array.isArray(rawCards) || !player?.deck) return [];
  const valid = [];
  let specialCount = 0;

  rawCards.forEach(rc => {
    if (!rc) return;
    if (rc.type === "special") {
      if (specialCount >= 1) return;
      if (rc.special === "zombie" && player.isZombie && player.deck.specialCards?.zombie) {
        valid.push({ id: "spec_zombie", type: "special", special: "zombie", name: "ZOMBIE" });
        specialCount++;
      } else if (rc.special === "vaccine" && player.deck.specialCards?.vaccine) {
        valid.push({ id: "spec_vaccine", type: "special", special: "vaccine", name: "VACCINE" });
        specialCount++;
      } else if (rc.special === "shotgun" && player.deck.specialCards?.shotgun) {
        valid.push({ id: "spec_shotgun", type: "special", special: "shotgun", name: "SHOTGUN" });
        specialCount++;
      }
    } else if (rc.type === "number") {
      const owned = (player.deck.numberCards || []).find(c => c.id === rc.id);
      if (owned && !valid.some(v => v.id === owned.id)) {
        valid.push(owned);
      }
    }
  });

  if (valid.length === 0 && player.deck.numberCards?.length > 0) {
    valid.push(player.deck.numberCards[0]);
  }
  return valid;
}

function calculateDuelOutcome(match) {
  const currentSuit = match.suit;
  const p1Played = match.p1.playedCards || [];
  const p2Played = match.p2.playedCards || [];

  match.p1.lastPlayedCards = [...p1Played];
  match.p2.lastPlayedCards = [...p2Played];

  const p1ZombieCard = p1Played.some(c => c.type === "special" && c.special === "zombie");
  const p1Vaccine = p1Played.some(c => c.type === "special" && c.special === "vaccine");
  const p1Shotgun = p1Played.some(c => c.type === "special" && c.special === "shotgun");

  const p2ZombieCard = p2Played.some(c => c.type === "special" && c.special === "zombie");
  const p2Vaccine = p2Played.some(c => c.type === "special" && c.special === "vaccine");
  const p2Shotgun = p2Played.some(c => c.type === "special" && c.special === "shotgun");

  const p1IsZombieCarrier = match.p1.player.isZombie === true || p1ZombieCard;
  const p2IsZombieCarrier = match.p2.player.isZombie === true || p2ZombieCard;

  let p1Score = p1Played.reduce((sum, c) => (c.type === "number" && c.suit === currentSuit ? sum + c.value : sum), 0);
  let p2Score = p2Played.reduce((sum, c) => (c.type === "number" && c.suit === currentSuit ? sum + c.value : sum), 0);

  let winnerSessionId = null;
  let loserSessionId = null;
  let isTie = false;
  let reason = "";

  if (p1ZombieCard && p2ZombieCard) {
    reason = "DUAL ZOMBIE COLLISION! Both zombie attacks clashed and dissolved. Decided by suit points.";
    match.p1.player.isZombie = false;
    match.p2.player.isZombie = false;
    if (match.p1.player.deck) match.p1.player.deck.specialCards.zombie = false;
    if (match.p2.player.deck) match.p2.player.deck.specialCards.zombie = false;

    if (p1Score === p2Score) isTie = true;
    else {
      winnerSessionId = p1Score > p2Score ? match.p1.sessionId : match.p2.sessionId;
      loserSessionId = p1Score > p2Score ? match.p2.sessionId : match.p1.sessionId;
    }
  } else if (p1Shotgun && p2IsZombieCarrier) {
    winnerSessionId = match.p1.sessionId;
    loserSessionId = match.p2.sessionId;
    match.p2.player.alive = false;
    match.p2.player.isZombie = false;
    match.p2.player.sectorState = "eliminated";
    reason = "SHOTGUN FIRED! Zombie carrier identified and eliminated, overriding all suit points!";
  } else if (p2Shotgun && p1IsZombieCarrier) {
    winnerSessionId = match.p2.sessionId;
    loserSessionId = match.p1.sessionId;
    match.p1.player.alive = false;
    match.p1.player.isZombie = false;
    match.p1.player.sectorState = "eliminated";
    reason = "SHOTGUN FIRED! Zombie carrier identified and eliminated, overriding all suit points!";
  } else if (p1Vaccine && p2IsZombieCarrier) {
    winnerSessionId = match.p1.sessionId;
    loserSessionId = match.p2.sessionId;
    match.p2.player.isZombie = false;
    if (match.p2.player.deck) match.p2.player.deck.specialCards.zombie = false;
    reason = "VACCINE DEPLOYED! Zombie operative cured back to human.";
  } else if (p2Vaccine && p1IsZombieCarrier) {
    winnerSessionId = match.p2.sessionId;
    loserSessionId = match.p1.sessionId;
    match.p1.player.isZombie = false;
    if (match.p1.player.deck) match.p1.player.deck.specialCards.zombie = false;
    reason = "VACCINE DEPLOYED! Zombie operative cured back to human.";
  } else if (p1ZombieCard && !p2ZombieCard) {
    winnerSessionId = match.p1.sessionId;
    loserSessionId = match.p2.sessionId;
    match.p1.player.deck.specialCards.zombie = false;
    match.p2.player.isZombie = true;
    if (match.p2.player.deck) match.p2.player.deck.specialCards.zombie = true;
    reason = "ZOMBIE AMBUSH! Operative breached defenses. Opponent is now INFECTED!";
  } else if (p2ZombieCard && !p1ZombieCard) {
    winnerSessionId = match.p2.sessionId;
    loserSessionId = match.p1.sessionId;
    match.p2.player.deck.specialCards.zombie = false;
    match.p1.player.isZombie = true;
    if (match.p1.player.deck) match.p1.player.deck.specialCards.zombie = true;
    reason = "ZOMBIE AMBUSH! Operative breached defenses. Opponent is now INFECTED!";
  } else {
    if (p1Score === p2Score) {
      isTie = true;
      reason = `Points Standoff! Both operatives scored ${p1Score} active suit points.`;
    } else {
      winnerSessionId = p1Score > p2Score ? match.p1.sessionId : match.p2.sessionId;
      loserSessionId = p1Score > p2Score ? match.p2.sessionId : match.p1.sessionId;
      reason = `${Math.max(p1Score, p2Score)} suit points surpassed ${Math.min(p1Score, p2Score)} points.`;
    }
  }

  // Note: Played number cards stay in the player's hand for next rounds; only 1 claimed card is transferred!
  let claimableCards = [];
  if (!isTie && loserSessionId) {
    const loserPlayed = loserSessionId === match.p1.sessionId ? p1Played : p2Played;
    claimableCards = loserPlayed.filter(c => c && c.type === "number");
  }

  [match.p1, match.p2].forEach(side => {
    const played = side.playedCards || [];
    if (side.player && side.player.deck) {
      played.forEach(c => {
        if (c.type === "special") {
          if (c.special === "vaccine") side.player.deck.specialCards.vaccine = false;
          if (c.special === "shotgun") side.player.deck.specialCards.shotgun = false;
        }
      });
      checkZeroCardsElimination(side.player);
    }
  });

  match.status = "finished";

  return {
    winnerSessionId,
    loserSessionId,
    isTie,
    p1Score,
    p2Score,
    reason,
    p1Played,
    p2Played,
    claimableCards
  };
}

function broadcastTournamentState() {
  io.emit('tournament_state_sync', {
    allPlayers: getAllPlayers(),
    squadNames: squadCustomNames,
    activeMatchesCount: Object.values(activeMatches).filter(m => m.status === "in_progress").length,
    round: currentRound,
    modeKey: currentModeKey,
    byePlayerSessionIds: Array.from(byePlayerSessionIds)
  });
}

function checkAllPlayersReadyForNextRound() {
  if (checkTournamentWinner()) return;

  const alivePlayers = getAllPlayers().filter(p => p.alive === true);
  const activeDuels = Object.values(activeMatches).filter(m => m.status === "in_progress");
  if (activeDuels.length > 0) return;

  const uniqueAliveSquads = new Set(alivePlayers.map(p => p.team));
  if (uniqueAliveSquads.size <= 1 && tournamentStarted) {
    checkTournamentWinner();
    return;
  }

  const readyPlayers = alivePlayers.filter(p => p.sectorState === "ready" || p.sectorState === "bye_reserve");

  if (readyPlayers.length >= alivePlayers.length && alivePlayers.length > 0) {
    generateTournamentDuels(currentRound + 1);

    const matchesList = Object.values(activeMatches).map(m => ({
      matchId: m.matchId,
      p1Name: m.p1.player.name,
      p1Avatar: m.p1.player.avatar,
      p1Team: squadCustomNames[m.p1.player.team] || m.p1.player.team,
      p2Name: m.p2.player.name,
      p2Avatar: m.p2.player.avatar,
      p2Team: squadCustomNames[m.p2.player.team] || m.p2.player.team
    }));

    io.emit('next_round_pairings_ready', {
      pairings: matchesList,
      round: currentRound,
      byePlayerSessionIds: Array.from(byePlayerSessionIds)
    });
  }
}

function handlePlayerForfeit(sessionId) {
  const all = getAllPlayers();
  const player = all.find(p => p.sessionId === sessionId);
  if (!player) return;

  player.alive = false;
  player.sectorState = "eliminated";
  player.forfeited = true;

  const matchId = sessionMatchLookup[sessionId];
  if (matchId && activeMatches[matchId] && activeMatches[matchId].status === "in_progress") {
    const match = activeMatches[matchId];
    match.status = "finished";
    const isP1 = match.p1.sessionId === sessionId;
    const opponentSide = isP1 ? match.p2 : match.p1;

    io.to(matchId).emit('duel_resolved', {
      suit: match.suit,
      p1SessionId: match.p1.sessionId,
      p2SessionId: match.p2.sessionId,
      p1Played: [],
      p2Played: [],
      p1Score: isP1 ? 0 : 10,
      p2Score: isP1 ? 10 : 0,
      winnerSessionId: opponentSide.sessionId,
      loserSessionId: sessionId,
      claimableCards: [],
      isTie: false,
      reason: `${player.name} FORFEITED COMBAT! Victory awarded by default.`
    });
  }

  broadcastTournamentState();
  checkTournamentWinner();
  checkAllPlayersReadyForNextRound();
}

function removePlayerFromLobby(sessionId) {
  let removed = false;
  for (const sqKey of getActiveSquadKeys()) {
    const initialLen = tournamentLobby[sqKey].length;
    tournamentLobby[sqKey] = tournamentLobby[sqKey].filter(p => p.sessionId !== sessionId);
    if (tournamentLobby[sqKey].length !== initialLen) removed = true;
  }
  if (removed) {
    delete sessionSocketLookup[sessionId];
    io.emit('update_lobby_state', {
      lobby: tournamentLobby,
      squadNames: squadCustomNames,
      modeKey: currentModeKey,
      modeConfig: getModeConfig(),
      customRoomCode
    });
  }
}

/* =========================================================
   CEO / OWNER ADMIN REST ENDPOINTS
========================================================= */
app.get('/api/ceo/analytics', (req, res) => {
  const pin = req.query.pin;
  if (pin !== "2026") return res.status(403).json({ error: "Unauthorized CEO PIN" });

  res.json({
    onlineSocketsCount: io.engine.clientsCount,
    currentModeKey,
    tournamentStarted,
    currentRound,
    activeMatchesCount: Object.values(activeMatches).filter(m => m.status === "in_progress").length,
    players: Object.values(globalPlayerRegistry)
  });
});

app.post('/api/ceo/action', (req, res) => {
  const { pin, action, targetSessionId, amount } = req.body || {};
  if (pin !== "2026") return res.status(403).json({ error: "Unauthorized CEO PIN" });

  const target = globalPlayerRegistry[targetSessionId];
  if (action === "reset_lobby") {
    resetTournamentState(currentModeKey);
    io.emit('update_lobby_state', { lobby: tournamentLobby, squadNames: squadCustomNames, modeKey: currentModeKey, modeConfig: getModeConfig() });
    return res.json({ ok: true, message: "Lobby Reset Completed" });
  }

  if (!target) return res.status(404).json({ error: "Player not found" });

  if (action === "add_tokens") {
    target.bountyTokens = Math.max(0, (target.bountyTokens || 0) + Number(amount || 0));
    const sockId = sessionSocketLookup[targetSessionId];
    if (sockId) io.to(sockId).emit("ceo_wallet_grant", { tokens: target.bountyTokens, delta: Number(amount || 0) });
  } else if (action === "grant_vip") {
    target.isVIP = true;
    const sockId = sessionSocketLookup[targetSessionId];
    if (sockId) io.to(sockId).emit("ceo_vip_grant", { isVIP: true });
  } else if (action === "ban_player") {
    bannedSessions.add(targetSessionId);
    target.banned = true;
    handlePlayerForfeit(targetSessionId);
  }

  res.json({ ok: true, player: target });
});

/* =========================================================
   SOCKET.IO REAL-TIME ENGINE
========================================================= */
io.on('connection', (socket) => {

  socket.on('join_lobby', (playerProfile = {}) => {
    const sessionId = playerProfile.sessionId || `session_${Math.random().toString(36).substring(2, 9)}`;
    if (bannedSessions.has(sessionId)) {
      socket.emit('lobby_full', { message: "Your account has been restricted by Administrator." });
      return;
    }

    socketSessionLookup[socket.id] = sessionId;
    sessionSocketLookup[sessionId] = socket.id;

    if (disconnectGraceTimers[sessionId]) {
      clearTimeout(disconnectGraceTimers[sessionId]);
      delete disconnectGraceTimers[sessionId];
    }

    // Switch arena mode if lobby is empty and user selected 4P / 8P / 16P
    if (!tournamentStarted && getTotalPlayersCount() === 0 && playerProfile.preferredMode) {
      if (MODE_CONFIGS[playerProfile.preferredMode]) {
        currentModeKey = playerProfile.preferredMode;
      }
      customRoomCode = playerProfile.customRoomCode || null;
    } else if (tournamentEnded) {
      resetTournamentState(playerProfile.preferredMode || currentModeKey);
    }

    const cfg = getModeConfig();

    // Update Global Registry for CEO Dashboard
    globalPlayerRegistry[sessionId] = {
      sessionId,
      name: playerProfile.name || "Survivor",
      avatar: playerProfile.avatar || "char1.jpg",
      bountyTokens: Number(playerProfile.bountyTokens) || 5000,
      followers: socialFollowers[sessionId] ? socialFollowers[sessionId].size + 1200 : (Number(playerProfile.followers) || 1200),
      squadWins: Number(playerProfile.squadWins) || 15,
      squadLosses: Number(playerProfile.squadLosses) || 5,
      isVIP: !!playerProfile.isVIP,
      lastSeen: new Date().toISOString()
    };

    let existingPlayer = getAllPlayers().find(p => p.sessionId === sessionId);
    if (existingPlayer) {
      existingPlayer.id = socket.id;
      existingPlayer.name = playerProfile.name || existingPlayer.name;
      existingPlayer.avatar = playerProfile.avatar || existingPlayer.avatar;
      existingPlayer.isVIP = !!playerProfile.isVIP;

      socket.emit('joined_successfully', {
        player: existingPlayer,
        assignedTeamKey: existingPlayer.team,
        squadNames: squadCustomNames,
        prizePool: cfg.prizePool,
        modeKey: currentModeKey,
        modeConfig: cfg,
        customRoomCode,
        alreadyPaidFee: true
      });
      io.emit('update_lobby_state', { lobby: tournamentLobby, squadNames: squadCustomNames, modeKey: currentModeKey, modeConfig: cfg, customRoomCode });
      return;
    }

    if (getTotalPlayersCount() >= cfg.maxPlayers) {
      socket.emit('lobby_full', { message: `Match lobby is full (${cfg.maxPlayers}/${cfg.maxPlayers}).` });
      return;
    }

    const player = {
      id: socket.id,
      sessionId: sessionId,
      name: playerProfile.name || "Survivor",
      avatar: playerProfile.avatar || "char1.jpg",
      followers: globalPlayerRegistry[sessionId].followers,
      bountyTokens: Math.max(0, (Number(playerProfile.bountyTokens) || 5000) - ENTRY_FEE),
      squadWins: Number(playerProfile.squadWins) || 15,
      squadLosses: Number(playerProfile.squadLosses) || 5,
      isVIP: !!playerProfile.isVIP,
      alive: true,
      isZombie: false,
      sectorState: "in_arena",
      paidEntryFee: true
    };

    globalPlayerRegistry[sessionId].bountyTokens = player.bountyTokens;
    const assignedTeamKey = assignToAvailableSquad(player, playerProfile.preferredTeam);

    socket.emit('joined_successfully', {
      player,
      assignedTeamKey,
      squadNames: squadCustomNames,
      prizePool: cfg.prizePool,
      modeKey: currentModeKey,
      modeConfig: cfg,
      customRoomCode,
      alreadyPaidFee: false
    });

    io.emit('update_lobby_state', { lobby: tournamentLobby, squadNames: squadCustomNames, modeKey: currentModeKey, modeConfig: cfg, customRoomCode });

    if (getTotalPlayersCount() >= cfg.maxPlayers) {
      setupTournamentDecks();
      generateTournamentDuels(1);
      io.emit('auto_launch_countdown', { countdown: 3, modeKey: currentModeKey });
    }
  });

  // Switch Mode or Start Custom Room by Host
  socket.on('change_lobby_mode', (data = {}) => {
    if (tournamentStarted) return;
    const newMode = data.modeKey;
    if (!MODE_CONFIGS[newMode]) return;

    const currentPlayers = getAllPlayers();
    resetTournamentState(newMode);
    if (data.customRoomCode) customRoomCode = data.customRoomCode;

    currentPlayers.forEach(p => assignToAvailableSquad(p));
    const cfg = getModeConfig();

    io.emit('update_lobby_state', {
      lobby: tournamentLobby,
      squadNames: squadCustomNames,
      modeKey: currentModeKey,
      modeConfig: cfg,
      customRoomCode
    });

    if (getTotalPlayersCount() >= cfg.maxPlayers) {
      setupTournamentDecks();
      generateTournamentDuels(1);
      io.emit('auto_launch_countdown', { countdown: 3, modeKey: currentModeKey });
    }
  });

  socket.on('switch_my_squad', (data = {}) => {
    if (tournamentStarted) return;
    const sessionId = data.sessionId || socketSessionLookup[socket.id];
    const targetTeam = data.targetTeam;
    const cfg = getModeConfig();
    if (!cfg.squadKeys.includes(targetTeam)) return;
    if (tournamentLobby[targetTeam].length >= cfg.perSquad) return;

    let movingPlayer = null;
    for (const sq of cfg.squadKeys) {
      const idx = tournamentLobby[sq].findIndex(p => p.sessionId === sessionId);
      if (idx >= 0) {
        [movingPlayer] = tournamentLobby[sq].splice(idx, 1);
        break;
      }
    }
    if (movingPlayer) {
      movingPlayer.team = targetTeam;
      tournamentLobby[targetTeam].push(movingPlayer);
      socket.emit('joined_successfully', {
        player: movingPlayer,
        assignedTeamKey: targetTeam,
        squadNames: squadCustomNames,
        prizePool: cfg.prizePool,
        modeKey: currentModeKey,
        modeConfig: cfg,
        customRoomCode,
        alreadyPaidFee: true
      });
      io.emit('update_lobby_state', { lobby: tournamentLobby, squadNames: squadCustomNames, modeKey: currentModeKey, modeConfig: cfg, customRoomCode });
    }
  });

  // Social Follow & Private Direct Message (DM)
  socket.on('follow_player', (data = {}) => {
    const { followerSessionId, targetSessionId } = data;
    if (!followerSessionId || !targetSessionId || followerSessionId === targetSessionId) return;
    if (!socialFollowers[targetSessionId]) socialFollowers[targetSessionId] = new Set();
    socialFollowers[targetSessionId].add(followerSessionId);

    const newCount = 1200 + socialFollowers[targetSessionId].size;
    const targetPlayer = getAllPlayers().find(p => p.sessionId === targetSessionId);
    if (targetPlayer) targetPlayer.followers = newCount;
    if (globalPlayerRegistry[targetSessionId]) globalPlayerRegistry[targetSessionId].followers = newCount;

    io.emit('social_follow_updated', { targetSessionId, followersCount: newCount, followerSessionId });
  });

  socket.on('send_private_dm', (data = {}) => {
    const { fromSessionId, fromName, toSessionId, text } = data;
    if (!toSessionId || !text) return;
    const targetSocketId = sessionSocketLookup[toSessionId];
    const payload = {
      fromSessionId,
      fromName: fromName || "Survivor",
      toSessionId,
      text: String(text).slice(0, 180),
      timestamp: Date.now()
    };
    if (targetSocketId) io.to(targetSocketId).emit('receive_private_dm', payload);
    socket.emit('receive_private_dm', payload);
  });

  // WebRTC Voice Chat Signaling (Isolated by Channel)
  socket.on('voice_join_channel', ({ channelId, isSilentSpectator }) => {
    if (!channelId) return;
    socket.join(`voice_${channelId}`);
    if (!isSilentSpectator) {
      socket.to(`voice_${channelId}`).emit('voice_peer_joined', { peerSocketId: socket.id });
    }
  });

  socket.on('voice_signal', ({ channelId, targetSocketId, signal }) => {
    if (!targetSocketId || !signal) return;
    io.to(targetSocketId).emit('voice_signal', {
      fromSocketId: socket.id,
      channelId,
      signal
    });
  });

  socket.on('voice_speaking_state', ({ channelId, speaking }) => {
    if (!channelId) return;
    const sessionId = socketSessionLookup[socket.id];
    io.to(`voice_${channelId}`).emit('voice_Variables_speaking', {
      sessionId,
      socketId: socket.id,
      speaking: !!speaking
    });
  });

  socket.on('voice_leave_channel', ({ channelId }) => {
    if (!channelId) return;
    socket.leave(`voice_${channelId}`);
    socket.to(`voice_${channelId}`).emit('voice_peer_left', { peerSocketId: socket.id });
  });

  // Arena 1v1 Duel Chat (Only Between the 2 Duelists or Same-Team Spectator)
  socket.on('send_arena_duel_chat', (data = {}) => {
    const sessionId = data.senderSessionId || socketSessionLookup[socket.id];
    const matchId = data.matchId || sessionMatchLookup[sessionId];
    if (!matchId || !activeMatches[matchId]) return;

    const all = getAllPlayers();
    const sender = all.find(p => p.sessionId === sessionId);
    if (!sender) return;

    const match = activeMatches[matchId];
    const isDuelist = match.p1.sessionId === sessionId || match.p2.sessionId === sessionId;

    // Strict Spectator Rule: If spectator is watching a rival squad (their own team is wiped), block chat!
    if (!isDuelist) {
      const sameTeamInDuel = match.p1.player.team === sender.team || match.p2.player.team === sender.team;
      if (!sameTeamInDuel) return;
    }

    io.to(matchId).emit('receive_arena_duel_chat', {
      senderName: sender.name,
      senderSessionId: sender.sessionId,
      senderTeam: sender.team,
      isSpectator: !isDuelist,
      text: String(data.text || "").slice(0, 140)
    });
  });

  socket.on('leave_lobby_explicit', (data) => {
    const sessionId = data?.sessionId || socketSessionLookup[socket.id];
    if (sessionId && !tournamentStarted) {
      removePlayerFromLobby(sessionId);
    }
  });

  socket.on('update_profile_info', (data) => {
    const player = getAllPlayers().find(p => p.sessionId === data.sessionId);
    if (player) {
      player.name = data.name;
      player.avatar = data.avatar;
      io.emit('update_lobby_state', { lobby: tournamentLobby, squadNames: squadCustomNames, modeKey: currentModeKey, modeConfig: getModeConfig(), customRoomCode });
      broadcastTournamentState();
    }
  });

  socket.on('rename_squad', (data = {}) => {
    const { teamKey, newName, sessionId } = data;
    const callerId = sessionId || socketSessionLookup[socket.id];
    const caller = getAllPlayers().find(p => p.sessionId === callerId);
    if (caller && caller.team !== teamKey) return;

    if (getActiveSquadKeys().includes(teamKey) && newName) {
      squadCustomNames[teamKey] = newName.trim().toUpperCase().slice(0, 18);
      io.emit('squad_renamed', {
        teamKey,
        newName: squadCustomNames[teamKey],
        squadNames: squadCustomNames
      });
      broadcastTournamentState();
    }
  });

  socket.on('join_arena', (data) => {
    const sessionId = data?.sessionId;
    const targetId = data?.spectateTargetId;
    if (!sessionId) return;

    socketSessionLookup[socket.id] = sessionId;
    sessionSocketLookup[sessionId] = socket.id;

    if (disconnectGraceTimers[sessionId]) {
      clearTimeout(disconnectGraceTimers[sessionId]);
      delete disconnectGraceTimers[sessionId];
    }

    const all = getAllPlayers();
    let me = all.find(p => p.sessionId === sessionId);

    if (me && me.alive === false) {
      const mySquadAlive = all.filter(p => p.team === me.team && p.alive === true);
      const isMySquadWiped = mySquadAlive.length === 0;

      let targetPlayer = all.find(p => p.sessionId === targetId && p.alive === true);
      // Enforce Spectator Rule: Cannot spectate other squads until own squad is wiped out
      if (targetPlayer && !isMySquadWiped && targetPlayer.team !== me.team) {
        targetPlayer = mySquadAlive[0] || null;
      }
      if (!targetPlayer) {
        targetPlayer = !isMySquadWiped
          ? mySquadAlive[0]
          : all.find(p => p.alive === true && sessionMatchLookup[p.sessionId]);
      }

      if (targetPlayer) {
        const targetMatchId = sessionMatchLookup[targetPlayer.sessionId];
        const match = activeMatches[targetMatchId];
        if (match) {
          socket.join(match.matchId);
          const spectatorSquadKey = targetPlayer.team;
          const isRivalSpectatorLock = isMySquadWiped && targetPlayer.team !== me.team;

          socket.emit('arena_initialized', {
            matchId: match.matchId,
            suit: match.suit,
            round: match.round,
            you: match.p1.player,
            opponent: match.p2.player,
            customTeamName: squadCustomNames[match.p1.player.team] || match.p1.player.team,
            opponentTeamName: squadCustomNames[match.p2.player.team] || match.p2.player.team,
            squadNames: squadCustomNames,
            spectatorTeamKey: spectatorSquadKey,
            squadMembers: tournamentLobby[spectatorSquadKey] || [me],
            allPlayers: all,
            isSpectatorView: true,
            isRivalSpectatorLock
          });
          return;
        }
      }

      socket.emit('spectator_view_init', {
        you: me,
        allPlayers: all,
        currentMatches: Object.values(activeMatches).filter(m => m.status === "in_progress")
      });
      return;
    }

    if (byePlayerSessionIds.has(sessionId)) {
      socket.emit('round_bye_granted', {
        message: "You are on Squad Combat Reserve (Bye) for this round.",
        round: currentRound
      });
      return;
    }

    if (me) {
      me.sectorState = "in_arena";
      if (!me.deck || !Array.isArray(me.deck.numberCards)) {
        me.deck = { numberCards: createInitialHand(), specialCards: { zombie: me.isZombie || false, vaccine: true, shotgun: true } };
      }
    }

    let matchId = sessionMatchLookup[sessionId];
    let match = activeMatches[matchId];

    if (!match) {
      const pendingMatch = Object.values(activeMatches).find(m => m.p1.sessionId === sessionId || m.p2.sessionId === sessionId);
      if (pendingMatch) {
        match = pendingMatch;
        sessionMatchLookup[sessionId] = match.matchId;
      }
    }

    if (match) {
      socket.join(match.matchId);
      const isP1 = match.p1.sessionId === sessionId;
      if (isP1) match.p1.socketId = socket.id;
      else match.p2.socketId = socket.id;

      const you = isP1 ? match.p1.player : match.p2.player;
      const opponent = isP1 ? match.p2.player : match.p1.player;

      socket.emit('arena_initialized', {
        matchId: match.matchId,
        suit: match.suit,
        round: match.round,
        you,
        opponent: {
          sessionId: opponent.sessionId,
          name: opponent.name,
          avatar: opponent.avatar,
          team: opponent.team,
          alive: opponent.alive,
          followers: opponent.followers,
          bountyTokens: opponent.bountyTokens,
          squadWins: opponent.squadWins,
          squadLosses: opponent.squadLosses,
          cardsCount: (opponent.deck?.numberCards?.length || 0)
        },
        customTeamName: squadCustomNames[you.team] || you.team,
        opponentTeamName: squadCustomNames[opponent.team] || opponent.team,
        squadNames: squadCustomNames,
        spectatorTeamKey: you.team,
        squadMembers: tournamentLobby[you.team] || [you],
        allPlayers: all,
        isSpectatorView: false,
        isRivalSpectatorLock: false
      });
    } else {
      socket.emit('round_bye_granted', {
        message: "No eligible rival available. You are held in Combat Reserve.",
        round: currentRound
      });
    }

    broadcastTournamentState();
  });

  socket.on('join_team_room', (data) => {
    const sessionId = data?.sessionId;
    if (!sessionId) return;

    socketSessionLookup[socket.id] = sessionId;
    sessionSocketLookup[sessionId] = socket.id;

    if (disconnectGraceTimers[sessionId]) {
      clearTimeout(disconnectGraceTimers[sessionId]);
      delete disconnectGraceTimers[sessionId];
    }

    const all = getAllPlayers();
    let me = all.find(p => p.sessionId === sessionId);
    if (me && me.alive !== false) {
      me.sectorState = "in_room";
    }

    const mySquadKey = me ? me.team : "TEAM B";
    const roomKey = `squad_${mySquadKey}`;
    socket.join(roomKey);

    socket.emit('team_room_synced', {
      you: me,
      teamKey: mySquadKey,
      customTeamName: squadCustomNames[mySquadKey] || mySquadKey,
      round: currentRound,
      squadMembers: tournamentLobby[mySquadKey] || (me ? [me] : []),
      allPlayers: all,
      squadNames: squadCustomNames,
      activeMatchesCount: Object.values(activeMatches).filter(m => m.status === "in_progress").length,
      isBye: byePlayerSessionIds.has(sessionId),
      modeKey: currentModeKey
    });

    broadcastTournamentState();
    checkTournamentWinner();
  });

  socket.on('player_marked_ready', (data) => {
    const sessionId = data?.sessionId;
    const all = getAllPlayers();
    let player = all.find(p => p.sessionId === sessionId);
    if (player && player.alive === true) {
      player.sectorState = "ready";
    }

    byePlayerSessionIds.forEach(bId => {
      const byePlayer = all.find(p => p.sessionId === bId);
      if (byePlayer && byePlayer.alive === true) {
        byePlayer.sectorState = "ready";
      }
    });

    broadcastTournamentState();
    checkAllPlayersReadyForNextRound();
  });

  socket.on('forfeit_match', (data) => {
    const sessionId = data?.sessionId || socketSessionLookup[socket.id];
    handlePlayerForfeit(sessionId);
  });

  socket.on('lock_cards', (data) => {
    const sessionId = socketSessionLookup[socket.id];
    const matchId = sessionMatchLookup[sessionId];
    if (!matchId || !activeMatches[matchId]) return;

    const match = activeMatches[matchId];
    const isP1 = match.p1.sessionId === sessionId;
    const currentSide = isP1 ? match.p1 : match.p2;

    if (currentSide.player.alive === false || currentSide.locked) return;

    currentSide.playedCards = sanitizePlayedCards(currentSide.player, data.playedCards || []);
    currentSide.locked = true;

    socket.to(matchId).emit('opponent_has_locked', { cardsCount: currentSide.playedCards.length });

    if (match.p1.locked && match.p2.locked) {
      const outcome = calculateDuelOutcome(match);

      io.to(matchId).emit('duel_resolved', {
        suit: match.suit,
        p1SessionId: match.p1.sessionId,
        p2SessionId: match.p2.sessionId,
        p1Played: match.p1.playedCards,
        p2Played: match.p2.playedCards,
        p1Score: outcome.p1Score,
        p2Score: outcome.p2Score,
        winnerSessionId: outcome.winnerSessionId,
        loserSessionId: outcome.loserSessionId,
        claimableCards: outcome.claimableCards,
        isTie: outcome.isTie,
        reason: outcome.reason
      });

      match.p1.locked = false;
      match.p2.locked = false;
      match.p1.playedCards = null;
      match.p2.playedCards = null;

      broadcastTournamentState();
      checkTournamentWinner();
    }
  });

  socket.on('claim_card_action', (data, ackCallback) => {
    try {
      const { matchId, claimedCardId, winnerSessionId, loserSessionId } = data || {};
      const all = getAllPlayers();
      const winner = all.find(p => p.sessionId === winnerSessionId);
      const loser = all.find(p => p.sessionId === loserSessionId);

      if (winner && loser && winner.deck && loser.deck) {
        const match = activeMatches[matchId];
        let loserPlayed = [];

        if (match) {
          loserPlayed = (match.p1 && match.p1.sessionId === loserSessionId)
            ? (match.p1.lastPlayedCards || [])
            : (match.p2 ? (match.p2.lastPlayedCards || []) : []);
        }

        if (Array.isArray(loserPlayed) && loserPlayed.length > 0) {
          const claimed = loserPlayed.find(c => c && c.id === claimedCardId) || loserPlayed[0];
          if (claimed) {
            winner.deck.numberCards.push(claimed);
            loser.deck.numberCards = loser.deck.numberCards.filter(c => c.id !== claimed.id);
          }
        }

        checkZeroCardsElimination(loser);
        broadcastTournamentState();
        checkTournamentWinner();
      }
      if (typeof ackCallback === "function") ackCallback({ ok: true });
    } catch (err) {
      console.error("[CLAIM ERROR]:", err);
      if (typeof ackCallback === "function") ackCallback({ ok: false });
    }
  });

  // Squad-Isolated Chat (Only visible to own 4-player team in Team Room)
  socket.on('send_squad_chat', (data) => {
    const player = getAllPlayers().find(p => p.sessionId === data.senderSessionId);
    if (!player) return;
    const roomKey = `squad_${player.team}`;
    io.to(roomKey).emit('receive_squad_chat', {
      senderName: player.name,
      senderSessionId: player.sessionId,
      isAlive: player.alive,
      text: String(data.text || "").slice(0, 180)
    });
  });

  socket.on('disconnect', () => {
    const sessionId = socketSessionLookup[socket.id];
    if (!sessionId) return;

    if (!tournamentStarted) {
      removePlayerFromLobby(sessionId);
    } else {
      disconnectGraceTimers[sessionId] = setTimeout(() => {
        const player = getAllPlayers().find(p => p.sessionId === sessionId);
        if (player && sessionSocketLookup[sessionId] === socket.id) {
          handlePlayerForfeit(sessionId);
        }
      }, 20000);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`=============================================`);
  console.log(`  ZOMBIE HUNT MULTIPLAYER ARENA ONLINE`);
  console.log(`  HOME HUB: http://localhost:${PORT}`);
  console.log(`=============================================`);
});