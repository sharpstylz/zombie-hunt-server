/* =========================================================
   ZOMBIE HUNT — UPGRADED BOT GAME ENGINE (bot-game.js)
   Fixes: Zombie AI Logic, +1,000 Bounty Token Reward,
   90s Turn Clock, Vaccine/Shotgun Claim Fix & 1v1 Bot Parley
========================================================= */

const $ = id => document.getElementById(id);

const PROFILE_KEY = "zh_profile";
const DEFAULT_PROFILE = { name: "Survivor", avatar: "char1.jpg" };
const AVATAR_PATH = "../../profile/avatars/";

const SPECIAL_CARD_IMAGES = {
  zombie: "../../cards/Zombie Card.png",
  vaccine: "../../cards/Vaccine Card.png",
  shotgun: "../../cards/Shotgun Card.png"
};

function loadProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROFILE_KEY));
    if (saved && typeof saved === "object") {
      return {
        name: typeof saved.name === "string" && saved.name.trim() ? saved.name.trim() : DEFAULT_PROFILE.name,
        avatar: typeof saved.avatar === "string" && saved.avatar.trim() ? saved.avatar : DEFAULT_PROFILE.avatar
      };
    }
  } catch (error) {
    console.warn("Profile load error", error);
  }
  return { ...DEFAULT_PROFILE };
}

const profile = loadProfile();
const GAME_SESSION_KEY = "zh_game_session_id";

function createGameSessionId() {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

function getGameSessionId() {
  return localStorage.getItem(GAME_SESSION_KEY);
}

function startFreshGameSession() {
  const newGameId = createGameSessionId();
  localStorage.setItem(GAME_SESSION_KEY, newGameId);
  return newGameId;
}

let currentGameSessionId = getGameSessionId();

let spectatorMode = false;
let spectatorViewerId = null;
let spectatorTargetId = null;
let spectatorAdvanceTimer = null;

let turnSeconds = 90;
let turnTimerInterval = null;
let lastRoundPlayerWon = false;

function isSpectatorViewerContext() {
  if (spectatorMode) return true;
  if (humanPlayer?.eliminated || !humanPlayer?.alive) return true;
  if (localStorage.getItem("zh_spectator_mode") === "true") return true;
  const viewerId = spectatorViewerId || localStorage.getItem("zh_spectator_viewer_id");
  const targetId = spectatorTargetId || localStorage.getItem("zh_spectator_target_id") || localStorage.getItem("zh_spectate_target");
  return !!(viewerId && targetId && viewerId !== targetId);
}

function hideSpectatorControls() {
  $("claimSection")?.classList.add("hidden");
  const continueButton = $("continueBtn");
  const openCardsButton = $("openCardsBtn");
  const lockButton = $("lockBtn");
  const modalLockButton = $("modalLockBtn");

  if (continueButton) { continueButton.disabled = true; continueButton.style.display = "none"; }
  if (openCardsButton) { openCardsButton.disabled = true; openCardsButton.style.display = "none"; }
  if (lockButton) { lockButton.disabled = true; lockButton.style.display = "none"; }
  if (modalLockButton) { modalLockButton.disabled = true; modalLockButton.style.display = "none"; }
  $("cardModal")?.classList.add("hidden");
}

function restoreActivePlayerControls() {
  const continueButton = $("continueBtn");
  const openCardsButton = $("openCardsBtn");
  const lockButton = $("lockBtn");
  const modalLockButton = $("modalLockBtn");

  if (continueButton) { continueButton.disabled = false; continueButton.style.display = ""; }
  if (openCardsButton) { openCardsButton.disabled = false; openCardsButton.style.display = ""; }
  if (lockButton) lockButton.style.display = "";
  if (modalLockButton) modalLockButton.style.display = "";
}

const humanTeam = (localStorage.getItem("zh_custom_team_name") || "TEAM B").trim().toUpperCase();
const TEAM_NAMES = ["TEAM A", humanTeam, "TEAM C", "TEAM D"];
const NUMBER_VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10];
const REQUIRED_NUMBER_CARDS = 7;

const SPECIAL_ZOMBIE = "zombie";
const SPECIAL_VACCINE = "vaccine";
const SPECIAL_SHOTGUN = "shotgun";

const suits = [
  { key: "hearts", name: "HEARTS", symbol: "♥", color: "red" },
  { key: "diamonds", name: "DIAMONDS", symbol: "♦", color: "red" },
  { key: "clubs", name: "CLUBS", symbol: "♣", color: "black" },
  { key: "spades", name: "SPADES", symbol: "♠", color: "black" }
];

const botNames = [
  "BLAKE", "MASON", "LUNA", "RYAN", "ALEX", "NOAH", "RILEY", "JORDAN",
  "KAI", "ZANE", "MIA", "LEO", "AVERY", "ETHAN", "NOVA"
];

const botAvatars = [
  "char2.jpg", "char3.jpg", "char4.jpg", "char5.jpg", "char6.jpg", "char7.jpg",
  "char8.jpg", "char9.jpg", "char10.jpg", "char11.jpg", "char12.jpg", "char13.jpg",
  "char14.jpg", "char15.jpg", "char16.jpg"
];

let cardSequence = 0;

function createNumberCard(number, suitKey) {
  const suit = suits.find(item => item.key === suitKey);
  return {
    id: `number-${++cardSequence}`,
    type: "number",
    number,
    value: number,
    suit: suit.key,
    suitName: suit.name,
    symbol: suit.symbol,
    color: suit.color
  };
}

function makePlayer(name, avatar, team, options = {}) {
  const numberCards = [];
  for (let i = 0; i < REQUIRED_NUMBER_CARDS; i++) {
    const suit = suits[Math.floor(Math.random() * suits.length)];
    const number = NUMBER_VALUES[Math.floor(Math.random() * NUMBER_VALUES.length)];
    numberCards.push(createNumberCard(number, suit.key));
  }

  return {
    id: `${team}-${name}-${Math.random()}`,
    name,
    avatar,
    team,
    isHuman: !!options.isHuman,
    alive: true,
    isZombie: !!options.isZombie,
    specialCards: { zombie: !!options.isZombie, vaccine: true, shotgun: true },
    numberCards,
    claimedCards: [],
    eliminated: false
  };
}

const players = [];
let humanPlayer = makePlayer(profile.name || "SURVIVOR", profile.avatar || "char1.jpg", humanTeam, { isHuman: true });
players.push(humanPlayer);

let botIndex = 0;
TEAM_NAMES.forEach(team => {
  const alreadyHuman = team === humanTeam ? 1 : 0;
  const required = 4 - alreadyHuman;

  for (let slot = 0; slot < required; slot++) {
    const name = botNames[botIndex];
    const avatar = botAvatars[botIndex];
    const bot = makePlayer(name, avatar, team, { isHuman: false });
    players.push(bot);
    botIndex++;
  }
});

// 1 Random covert Zombie carrier per squad (including human player's squad!)
TEAM_NAMES.forEach(team => {
  const members = players.filter(player => player.team === team);
  const zombieCandidate = members[Math.floor(Math.random() * members.length)];
  if (zombieCandidate) {
    zombieCandidate.isZombie = true;
    zombieCandidate.specialCards.zombie = true;
  }
});

let currentRound = 1;
let currentOpponent = null;
let currentSuit = "hearts";
let playerLocked = false;
let opponentLocked = false;
let selectedCards = [];
let playerPlayed = [];
let opponentPlayed = [];
let claimedCard = null;
let roundFinished = false;
let roundResolving = false;
let isRoundDraw = false;

let roundInitialPlayerZombie = false;
let roundInitialOpponentZombie = false;

const playedOpponentIds = new Set();
const opponentMatchCounts = new Map();
let ongoingBotMatches = [];

const eliminatedTeams = {};
TEAM_NAMES.forEach(t => eliminatedTeams[t] = []);

function activePlayers() {
  return players.filter(p => p.alive && !p.eliminated);
}

function activeTeamMembers(team) {
  return players.filter(p => p.team === team && p.alive && !p.eliminated);
}

function aliveTeams() {
  return TEAM_NAMES.filter(team => activeTeamMembers(team).length > 0);
}

function getTotalCardsCount(player) {
  if (!player) return 0;
  let count = Array.isArray(player.numberCards) ? player.numberCards.length : 0;
  if (player.specialCards?.vaccine) count++;
  if (player.specialCards?.shotgun) count++;
  if (player.specialCards?.zombie && player.isZombie) count++;
  return count;
}

function eliminatePlayersWithNoCards() {
  players.forEach(p => {
    if (!p || p.eliminated) return;
    if (getTotalCardsCount(p) <= 0) {
      eliminatePlayer(p, "NO CARDS LEFT");
    }
  });
}

function eliminatePlayer(player, reason) {
  if (!player || player.eliminated) return;
  player.alive = false;
  player.eliminated = true;

  if (!eliminatedTeams[player.team]) eliminatedTeams[player.team] = [];
  const exists = eliminatedTeams[player.team].some(item => item.name === player.name);
  if (!exists) {
    eliminatedTeams[player.team].push({ name: player.name, avatar: player.avatar, reason });
  }

  player.isZombie = false;
  player.specialCards.zombie = false;
  renderTeamMembers();
}

function start90SecondsTurnTimer() {
  clearInterval(turnTimerInterval);
  if (isSpectatorViewerContext()) return;
  turnSeconds = 90;
  updateTurnClockUI();

  turnTimerInterval = setInterval(() => {
    turnSeconds--;
    updateTurnClockUI();
    if (turnSeconds <= 0) {
      clearInterval(turnTimerInterval);
      if (!playerLocked && !isSpectatorViewerContext()) {
        if (selectedCards.length > 0) {
          showToast("90s EXPIRED! Auto-locking your selected cards...");
          lockPlayerCards();
        } else {
          const playable = getPlayableCards(humanPlayer);
          const numCards = playable.filter(c => c.type === "number").sort((a, b) => a.value - b.value);
          if (numCards.length > 0) selectedCards = [numCards[0]];
          else if (playable.length > 0) selectedCards = [playable[0]];
          showToast("90s EXPIRED! Auto-locking card...");
          lockPlayerCards();
        }
      }
    }
  }, 1000);
}

function updateTurnClockUI() {
  const el = $("turnTimerText");
  if (!el) return;
  const mins = Math.floor(turnSeconds / 60);
  const secs = turnSeconds % 60;
  el.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  el.style.color = turnSeconds <= 15 ? "#dc2626" : "";
}

function checkMatchEnd() {
  eliminatePlayersWithNoCards();
  const teams = aliveTeams();

  if (teams.length <= 1) {
    const winningTeam = teams[0] || (humanPlayer?.alive ? humanPlayer.team : currentOpponent?.team || "CHAMPION TEAM");
    finishMatch(winningTeam);
    return true;
  }
  return false;
}

function finishMatch(winningTeam) {
  clearTimeout(spectatorAdvanceTimer);
  clearInterval(turnTimerInterval);
  spectatorAdvanceTimer = null;

  $("resultModal")?.classList.add("hidden");
  $("cardModal")?.classList.add("hidden");

  const champPlayer = players.find(p => p.team === winningTeam && p.alive && !p.eliminated) ||
                      players.find(p => p.team === winningTeam) ||
                      { name: "SURVIVOR", avatar: "char1.jpg" };

  window.ZHSound?.play("victory");

  const didHumanSquadWin = winningTeam === humanPlayer?.team;
  const rewardTokens = didHumanSquadWin ? (window.ZH_CONFIG?.BOT_TOURNAMENT_WIN_REWARD || 1000) : 0;

  if (didHumanSquadWin) {
    if (window.ZHWallet) window.ZHWallet.addTokens(rewardTokens);
    else {
      const cur = Number(localStorage.getItem("zh_bounty_tokens") || 5000);
      localStorage.setItem("zh_bounty_tokens", String(cur + rewardTokens));
    }
  }

  let modal = $("championModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "championModal";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(18,28,33,0.92);backdrop-filter:blur(8px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;";
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div style="background:#fcf9f2;border:2px solid #e2b04a;border-radius:20px;padding:30px 20px;text-align:center;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.4);font-family:'DM Sans',sans-serif;">
      <div style="font-size:54px;line-height:1;margin-bottom:10px;">🏆</div>
      <span style="font-size:10px;font-weight:900;letter-spacing:0.2em;color:#b88628;display:block;">TOURNAMENT CHAMPION</span>
      <h2 style="font-family:'Oswald',sans-serif;font-size:28px;color:#24323a;margin:5px 0 15px;">${winningTeam} VICTORIOUS</h2>
      <div style="width:84px;height:84px;margin:0 auto 12px;position:relative;">
        <img src="${AVATAR_PATH + (champPlayer.avatar || "char1.jpg")}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;border:3px solid #e2b04a;">
        <span style="position:absolute;top:-10px;right:-4px;font-size:22px;">👑</span>
      </div>
      <strong style="font-family:'Oswald',sans-serif;font-size:22px;color:#24323a;display:block;">${champPlayer.name}</strong>
      <p style="font-size:12px;color:#2e7d5b;font-weight:800;margin:10px 0;">
        ${didHumanSquadWin ? `🎉 YOUR SQUAD WON! +${rewardTokens.toLocaleString()} 🪙 BOUNTY CREDITED!` : `Rival Squad Outlasted All Teams.`}
      </p>
      ${didHumanSquadWin ? `<button id="doubleBotRewardAdBtn" style="background:#c28c17;color:white;border:none;border-radius:10px;padding:11px;font-weight:900;font-size:11px;cursor:pointer;width:100%;margin-bottom:8px;">🎬 WATCH AD FOR +1,000 🪙 BONUS (2X)</button>` : ""}
      <button id="dynLobbyBtn" style="background:#304b5c;color:white;border:none;border-radius:10px;padding:12px 24px;font-weight:900;font-size:11px;cursor:pointer;width:100%;">RETURN TO LOBBY →</button>
    </div>
  `;
  modal.classList.remove("hidden");

  $("doubleBotRewardAdBtn")?.addEventListener("click", function() {
    this.disabled = true;
    window.ZHAds?.watchRewardedAd("2X BOT TOURNAMENT BOUNTY (+1,000 🪙)", () => {
      window.ZHWallet?.addTokens(1000);
      this.textContent = "✓ +1,000 🪙 EXTRA BONUS CLAIMED!";
      this.style.background = "#2e7d5b";
    });
  });

  $("dynLobbyBtn").onclick = () => { window.location.href = "../lobby.html"; };

  localStorage.removeItem("zh_team_room_state");
  localStorage.removeItem("zh_team_intel");
  localStorage.removeItem("zh_return_from_round");
  localStorage.removeItem("zh_spectator_mode");
  localStorage.removeItem("zh_spectator_target_id");
  localStorage.removeItem("zh_spectate_target");
  localStorage.removeItem("zh_spectator_viewer_id");
  localStorage.removeItem("zh_next_opponent_id");
  localStorage.removeItem("zh_locked_pairings");
}

function isOpponentKnownZombie(opponentId, opponentName) {
  if (!opponentId && !opponentName) return false;
  try {
    const intelList = JSON.parse(localStorage.getItem("zh_team_intel") || "[]");
    return intelList.some(entry => {
      const opp = entry.opponent || {};
      const matches = (opp.id && opp.id === opponentId) || (opp.name && opp.name === opponentName);
      return matches && opp.isZombie === true;
    });
  } catch {
    return false;
  }
}

function chooseOpponent() {
  eliminatePlayersWithNoCards();

  const lockedOpponentId = localStorage.getItem("zh_next_opponent_id");
  if (lockedOpponentId) {
    const lockedOpponent = players.find(p => p.id === lockedOpponentId && p.alive && !p.eliminated);
    if (lockedOpponent && getTotalCardsCount(lockedOpponent) > 0) {
      localStorage.removeItem("zh_next_opponent_id");
      const nextCount = (opponentMatchCounts.get(lockedOpponent.id) || 0) + 1;
      opponentMatchCounts.set(lockedOpponent.id, nextCount);
      playedOpponentIds.add(lockedOpponent.id);
      return lockedOpponent;
    }
  }

  const possible = activePlayers().filter(p =>
    !p.isHuman &&
    p.id !== humanPlayer.id &&
    p.team !== humanPlayer.team &&
    getTotalCardsCount(p) > 0
  );

  if (!possible.length) return null;

  let minCount = Infinity;
  possible.forEach(p => {
    const count = opponentMatchCounts.get(p.id) || 0;
    if (count < minCount) minCount = count;
  });

  let pool = possible.filter(p => (opponentMatchCounts.get(p.id) || 0) === minCount);

  if (pool.length > 1 && currentOpponent) {
    const withoutLast = pool.filter(p => p.id !== currentOpponent.id);
    if (withoutLast.length) pool = withoutLast;
  }

  const opponent = pool[Math.floor(Math.random() * pool.length)];
  const nextCount = (opponentMatchCounts.get(opponent.id) || 0) + 1;
  opponentMatchCounts.set(opponent.id, nextCount);
  playedOpponentIds.add(opponent.id);

  return opponent;
}

function chooseSuit() {
  const suit = suits[Math.floor(Math.random() * suits.length)];
  currentSuit = suit.key;
}

function cardHTML(card) {
  if (!card) return "";

  if (card.type === "special") {
    const customImgSrc = SPECIAL_CARD_IMAGES[card.special];
    return `
      <div class="playing-card special-card special-${card.special}">
        <img 
          src="${customImgSrc}" 
          alt="${card.name}" 
          class="special-card-art"
          onerror="this.onerror=null; this.parentElement.innerHTML='<span class=\\'special-symbol\\'>${card.symbol}</span><span class=\\'special-name\\'>${card.name}</span>';"
        >
      </div>
    `;
  }

  return `
    <div class="playing-card ${card.color === "red" ? "red-card" : "black-card"}">
      <div class="card-corner-top">
        <span class="card-number">${card.number}</span>
        <span class="card-suit">${card.symbol}</span>
      </div>
      <span class="card-center-suit">${card.symbol}</span>
      <div class="card-corner-bottom">
        <span class="card-number">${card.number}</span>
        <span class="card-suit">${card.symbol}</span>
      </div>
    </div>
  `;
}

function cardBackHTML() {
  return `<div class="playing-card card-back"></div>`;
}

function getPlayableCards(player) {
  if (!player || player.eliminated || !player.alive) return [];
  const cards = [...(Array.isArray(player.numberCards) ? player.numberCards : [])];
  if (player.specialCards.zombie && player.isZombie) cards.push(createVirtualSpecialCard(SPECIAL_ZOMBIE));
  if (player.specialCards.vaccine) cards.push(createVirtualSpecialCard(SPECIAL_VACCINE));
  if (player.specialCards.shotgun) cards.push(createVirtualSpecialCard(SPECIAL_SHOTGUN));
  return cards;
}

function createVirtualSpecialCard(special) {
  const definitions = {
    zombie: { name: "ZOMBIE", symbol: "🧟" },
    vaccine: { name: "VACCINE", symbol: "💉" },
    shotgun: { name: "SHOTGUN", symbol: "🔫" }
  };
  const info = definitions[special];
  return { id: `virtual-${special}`, type: "special", special, name: info.name, symbol: info.symbol, value: 0 };
}

function renderDifficultyHUD() {
  const difficulty = (localStorage.getItem("zh_bot_difficulty") || "normal").toLowerCase();
  const meta = {
    easy: { label: "LVL 01 • RECRUIT AI", className: "diff-easy" },
    normal: { label: "LVL 02 • SURVIVOR AI", className: "diff-normal" },
    hard: { label: "LVL 03 • NIGHTMARE AI", className: "diff-hard" }
  };

  const current = meta[difficulty] || meta.normal;
  const badge = $("hudDifficultyBadge");
  const textEl = $("hudDifficultyText");

  if (badge) badge.className = `difficulty-indicator-badge ${current.className}`;
  if (textEl) textEl.textContent = current.label;
}

function renderProfiles() {
  const playerImage = $("playerImage");
  const opponentImage = $("opponentImage");
  const playerName = $("playerName");
  const opponentName = $("opponentName");
  const opponentTeamLabel = $("opponentTeamLabel");
  const playerTeamLabel = $("playerTeamLabel");
  const sideSquadName = $("sideSquadName");

  if (playerImage) {
    playerImage.src = AVATAR_PATH + (humanPlayer.avatar || "char1.jpg");
    playerImage.onerror = () => { playerImage.src = AVATAR_PATH + "char1.jpg"; };
    playerImage.parentElement.style.boxShadow = humanPlayer.isZombie ? "0 0 16px #2ecc71" : "";
  }
  if (opponentImage && currentOpponent) {
    opponentImage.src = AVATAR_PATH + currentOpponent.avatar;
    opponentImage.onerror = () => { opponentImage.src = AVATAR_PATH + "char2.jpg"; };
  }
  if (playerName) playerName.textContent = humanPlayer.name || "SURVIVOR";
  if (playerTeamLabel) playerTeamLabel.textContent = `${humanPlayer.team} • ${isSpectatorViewerContext() ? "OPERATIVE" : "YOU"}`;
  if (sideSquadName) sideSquadName.textContent = humanPlayer.team;
  if ($("playerRoleSub")) $("playerRoleSub").textContent = humanPlayer.isZombie ? "☣ COVERT ZOMBIE" : "HUMAN SURVIVOR";

  if (opponentName && currentOpponent) opponentName.textContent = currentOpponent.name;
  if (opponentTeamLabel && currentOpponent) opponentTeamLabel.textContent = `${currentOpponent.team} • OPPONENT`;

  if ($("resultPlayerName")) $("resultPlayerName").textContent = humanPlayer.name || "SURVIVOR";
  if ($("resultOpponentName") && currentOpponent) $("resultOpponentName").textContent = currentOpponent.name;
}

function renderOpponentHand() {
  const container = $("opponentHand");
  if (!container) return;
  const count = currentOpponent ? getTotalCardsCount(currentOpponent) : 0;
  container.innerHTML = Array.from({ length: Math.max(1, count) }).map(() => cardBackHTML()).join("");
}

function renderPlayerPreview() {
  const container = $("cardPreview");
  if (!container) return;
  const cards = getPlayableCards(humanPlayer);
  container.innerHTML = cards.slice(0, 4).map(card => cardHTML(card)).join("");
}

function renderTeamMembers() {
  const container = $("teamMembers");
  if (!container) return;
  const members = players.filter(p => p.team === humanPlayer.team);
  container.innerHTML = members.map(m => `
    <div class="team-member">
      <img src="${AVATAR_PATH}${m.avatar}" alt="${escapeHTML(m.name)}" onerror="this.src='${AVATAR_PATH}char1.jpg'">
      <span class="team-member-name">${escapeHTML(m.name)}</span>
      <span class="team-member-status ${m.alive ? "alive" : "dead"}">${m.alive ? "ACTIVE" : "ELIMINATED"}</span>
    </div>
  `).join("");
}

function renderSuit() {
  const suit = suits.find(item => item.key === currentSuit);
  if (!suit) return;
  if ($("suitIcon")) $("suitIcon").textContent = suit.symbol;
  if ($("currentSuit")) $("currentSuit").textContent = suit.name;
  if ($("modalSuitIcon")) $("modalSuitIcon").textContent = suit.symbol;
  if ($("modalSuit")) $("modalSuit").textContent = suit.name;
}

function renderRound() {
  if ($("roundNumber")) $("roundNumber").textContent = currentRound;
}

function renderPlayedCards() {
  const opponentContainer = $("opponentPlayed");
  const playerContainer = $("playerPlayed");
  if (opponentContainer) opponentContainer.innerHTML = opponentPlayed.map(c => cardHTML(c)).join("");
  if (playerContainer) playerContainer.innerHTML = playerPlayed.map(c => cardHTML(c)).join("");
}

function updateSelectionUI() {
  const count = selectedCards.length;
  if ($("modalSelectedCount")) $("modalSelectedCount").textContent = count;
  if ($("selectionCount")) $("selectionCount").textContent = `${count} SELECTED`;
  const modalLock = $("modalLockBtn");
  const lock = $("lockBtn");
  if (modalLock) modalLock.disabled = count === 0 || playerLocked;
  if (lock) lock.disabled = count === 0 || playerLocked;
}

function renderSelectionGrid() {
  const grid = $("selectionGrid");
  if (!grid) return;
  grid.innerHTML = "";

  const cards = getPlayableCards(humanPlayer);
  cards.forEach(card => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "selectable-card";
    if (selectedCards.some(selected => selected.id === card.id)) button.classList.add("selected");
    button.innerHTML = `${cardHTML(card)}<span class="selection-check">✓</span>`;
    button.addEventListener("click", () => toggleCardSelection(card.id));
    grid.appendChild(button);
  });
  updateSelectionUI();
}

function toggleCardSelection(cardId) {
  if (playerLocked) return;
  window.ZHSound?.play("click");
  const cards = getPlayableCards(humanPlayer);
  const card = cards.find(item => item.id === cardId);
  if (!card) return;

  const index = selectedCards.findIndex(item => item.id === cardId);
  if (index >= 0) {
    selectedCards.splice(index, 1);
  } else {
    if (card.type === "special") {
      const alreadySelectedSpecial = selectedCards.some(selected => selected.type === "special");
      if (alreadySelectedSpecial) {
        showToast("ONLY ONE SPECIAL CARD CAN BE USED PER ROUND");
        return;
      }
    }
    selectedCards.push(card);
  }
  renderSelectionGrid();
}

function openCardModal() {
  if (playerLocked) { showToast("YOUR CARDS ARE ALREADY LOCKED"); return; }
  if (humanPlayer.eliminated || getTotalCardsCount(humanPlayer) === 0) { showToast("YOU HAVE NO CARDS LEFT"); return; }
  window.ZHSound?.play("click");
  renderSelectionGrid();
  $("cardModal")?.classList.remove("hidden");
}

function closeCardModal() {
  $("cardModal")?.classList.add("hidden");
}

function lockPlayerCards() {
  if (playerLocked || !selectedCards.length) return;
  const specialCardsSelected = selectedCards.filter(card => card.type === "special");
  if (specialCardsSelected.length > 1) {
    showToast("ONLY ONE SPECIAL CARD CAN BE LOCKED PER ROUND");
    return;
  }

  clearInterval(turnTimerInterval);
  window.ZHSound?.play("lock");
  playerLocked = true;
  playerPlayed = [...selectedCards];
  closeCardModal();
  updateSelectionUI();

  if ($("centerStatus")) {
    $("centerStatus").innerHTML = `<small>YOUR CARDS</small><strong>LOCKED</strong>`;
  }
  showToast("CARDS LOCKED — WAITING FOR OPPONENT");
  setTimeout(botLockCards, 850);
}

/* =========================================================
   FIXED BOT CARD AI (ZOMBIE LOGIC FIXED!)
========================================================= */
function getBotCardDecisions(bot, targetOpponent) {
  const difficulty = (localStorage.getItem("zh_bot_difficulty") || "normal").toLowerCase();
  const available = getPlayableCards(bot);
  if (!available.length) return [];

  const isKnownTargetZombie = isOpponentKnownZombie(targetOpponent?.id, targetOpponent?.name);
  // FIXED BUG: Previously said !bot.isZombie which prevented bots from ever playing Zombie card!
  const hasZombieCard = !!(bot.specialCards?.zombie && bot.isZombie);

  if (difficulty === "hard") {
    if (isKnownTargetZombie && bot.specialCards?.shotgun) return [createVirtualSpecialCard(SPECIAL_SHOTGUN)];
    if (isKnownTargetZombie && bot.specialCards?.vaccine) return [createVirtualSpecialCard(SPECIAL_VACCINE)];
  } else if (difficulty === "normal") {
    if (isKnownTargetZombie && Math.random() < 0.7) {
      if (bot.specialCards?.shotgun) return [createVirtualSpecialCard(SPECIAL_SHOTGUN)];
      if (bot.specialCards?.vaccine) return [createVirtualSpecialCard(SPECIAL_VACCINE)];
    }
  } else if (difficulty === "easy") {
    if (hasZombieCard && Math.random() < 0.35) return [createVirtualSpecialCard(SPECIAL_ZOMBIE)];
  }

  const matching = available
    .filter(c => c.type === "number" && c.suit === currentSuit)
    .sort((a, b) => Number(b.value || 0) - Number(a.value || 0));

  const nonMatching = available
    .filter(c => c.type === "number" && c.suit !== currentSuit)
    .sort((a, b) => Number(a.value || 0) - Number(b.value || 0));

  const maxVal = matching.length > 0 ? matching[0].value : 0;
  if (difficulty !== "easy" && hasZombieCard && (matching.length === 0 || maxVal <= 5 || Math.random() < 0.45)) {
    return [createVirtualSpecialCard(SPECIAL_ZOMBIE)];
  }

  const selection = [];

  if (difficulty === "easy") {
    if (matching.length > 0) {
      const count = Math.floor(Math.random() * matching.length) + 1;
      for (let i = 0; i < count; i++) selection.push(matching[i]);
    }
    if (nonMatching.length > 0 && Math.random() < 0.5) {
      selection.push(nonMatching[0]);
    }
    return selection.length ? selection : [available[0]];
  } else if (difficulty === "normal") {
    if (matching.length > 0) {
      const matchingTotal = matching.reduce((sum, c) => sum + Number(c.value || 0), 0);
      if (matchingTotal <= 9 && nonMatching.length > 0) {
        return [nonMatching[0]];
      }
      let targetScore = Math.floor(Math.random() * 7) + 16;
      let currentScore = 0;
      for (let i = 0; i < matching.length; i++) {
        selection.push(matching[i]);
        currentScore += Number(matching[i].value || 0);
        if (currentScore >= targetScore) break;
      }
      return selection;
    }
    if (nonMatching.length > 0) return [nonMatching[0]];
  } else {
    if (matching.length > 0) {
      const count = matching.length <= 3 ? matching.length : Math.min(matching.length, Math.floor(Math.random() * 2) + 3);
      for (let i = 0; i < count; i++) selection.push(matching[i]);
      return selection;
    }
    if (nonMatching.length > 0) return [nonMatching[0]];
  }

  return [available[0]];
}

function chooseSpectatorCards(player) {
  return getBotCardDecisions(player, currentOpponent);
}

function botLockCards() {
  if (opponentLocked || !currentOpponent || currentOpponent.eliminated) return;
  const bot = currentOpponent;
  const available = getPlayableCards(bot);

  if (!available.length) {
    eliminatePlayer(bot, "NO CARDS LEFT");
    checkMatchEnd();
    return;
  }

  opponentPlayed = getBotCardDecisions(bot, humanPlayer);
  opponentLocked = true;
  revealAfterBothLocked();
}

function revealAfterBothLocked() {
  if (!playerLocked || !opponentLocked || roundResolving) return;
  roundResolving = true;
  renderPlayedCards();

  if ($("centerStatus")) {
    $("centerStatus").innerHTML = `<small>BOTH PLAYERS LOCKED</small><strong>REVEAL</strong>`;
  }
  startCountdown(3, () => calculateResult());
}

function startCountdown(seconds, callback) {
  let remaining = seconds;
  const interval = setInterval(() => {
    if ($("centerStatus")) {
      $("centerStatus").innerHTML = `<small>CARDS REVEALED</small><strong>${remaining}</strong>`;
    }
    remaining--;
    if (remaining < 0) {
      clearInterval(interval);
      callback();
    }
  }, 650);
}

function calculateNumberTotal(cards) {
  return cards.reduce((total, card) => {
    if (card.type !== "number" || card.suit !== currentSuit) return total;
    return total + card.value;
  }, 0);
}

function hasPlayedSpecial(cards, special) {
  return cards.some(card => card.type === "special" && card.special === special);
}

function resolveSpecialEffects() {
  const playerZombie = hasPlayedSpecial(playerPlayed, SPECIAL_ZOMBIE);
  const playerVaccine = hasPlayedSpecial(playerPlayed, SPECIAL_VACCINE);
  const playerShotgun = hasPlayedSpecial(playerPlayed, SPECIAL_SHOTGUN);

  const opponentZombie = hasPlayedSpecial(opponentPlayed, SPECIAL_ZOMBIE);
  const opponentVaccine = hasPlayedSpecial(opponentPlayed, SPECIAL_VACCINE);
  const opponentShotgun = hasPlayedSpecial(opponentPlayed, SPECIAL_SHOTGUN);

  if (playerVaccine) humanPlayer.specialCards.vaccine = false;
  if (opponentVaccine) currentOpponent.specialCards.vaccine = false;

  if (playerShotgun) humanPlayer.specialCards.shotgun = false;
  if (opponentShotgun) currentOpponent.specialCards.shotgun = false;

  // 1. DUAL ZOMBIE COLLISION
  if (playerZombie && opponentZombie) {
    window.ZHSound?.play("zombie");
    humanPlayer.isZombie = false;
    humanPlayer.specialCards.zombie = false;
    currentOpponent.isZombie = false;
    currentOpponent.specialCards.zombie = false;

    return {
      playerZombie: false, opponentZombie: false,
      playerVaccine, opponentVaccine, playerShotgun, opponentShotgun,
      dualZombieCancel: true
    };
  }

  // 2. SHOTGUN vs ZOMBIE
  if (playerShotgun && (opponentZombie || roundInitialOpponentZombie)) {
    window.ZHSound?.play("shotgun");
    currentOpponent.isZombie = false;
    currentOpponent.specialCards.zombie = false;
    eliminatePlayer(currentOpponent, "SHOTGUN");
    return {
      playerZombie: false, opponentZombie: false,
      playerVaccine, opponentVaccine, playerShotgun: false, opponentShotgun,
      shotgunEliminated: "opponent"
    };
  }
  if (opponentShotgun && (playerZombie || roundInitialPlayerZombie)) {
    window.ZHSound?.play("shotgun");
    humanPlayer.isZombie = false;
    humanPlayer.specialCards.zombie = false;
    eliminatePlayer(humanPlayer, "SHOTGUN");
    return {
      playerZombie: false, opponentZombie: false,
      playerVaccine, opponentVaccine, playerShotgun, opponentShotgun: false,
      shotgunEliminated: "player"
    };
  }

  // 3. VACCINE vs ZOMBIE
  if (playerVaccine && (opponentZombie || roundInitialOpponentZombie)) {
    window.ZHSound?.play("vaccine");
    currentOpponent.isZombie = false;
    currentOpponent.specialCards.zombie = false;
    return {
      playerZombie: false, opponentZombie: false,
      playerVaccine: false, opponentVaccine, playerShotgun, opponentShotgun,
      vaccineCured: "opponent"
    };
  }
  if (opponentVaccine && (playerZombie || roundInitialPlayerZombie)) {
    window.ZHSound?.play("vaccine");
    humanPlayer.isZombie = false;
    humanPlayer.specialCards.zombie = false;
    return {
      playerZombie: false, opponentZombie: false,
      playerVaccine, opponentVaccine: false, playerShotgun, opponentShotgun,
      vaccineCured: "player"
    };
  }

  // 4. ZOMBIE AMBUSH INFECTION
  if (playerZombie && !roundInitialOpponentZombie && !currentOpponent.eliminated) {
    window.ZHSound?.play("zombie");
    humanPlayer.specialCards.zombie = false;
    currentOpponent.isZombie = true;
    currentOpponent.specialCards.zombie = true;
  }
  if (opponentZombie && !roundInitialPlayerZombie && !humanPlayer.eliminated) {
    window.ZHSound?.play("zombie");
    currentOpponent.specialCards.zombie = false;
    humanPlayer.isZombie = true;
    humanPlayer.specialCards.zombie = true;
  }

  return {
    playerZombie, playerVaccine, playerShotgun,
    opponentZombie, opponentVaccine, opponentShotgun,
    dualZombieCancel: false
  };
}

function calculateResult() {
  const effects = resolveSpecialEffects();

  const playerTotal = calculateNumberTotal(playerPlayed);
  const opponentTotal = calculateNumberTotal(opponentPlayed);

  if ($("playerTotal")) $("playerTotal").textContent = playerTotal;
  if ($("opponentTotal")) $("opponentTotal").textContent = opponentTotal;
  if ($("totalsBoard")) $("totalsBoard").classList.remove("hidden");

  let playerWon = false;
  let isTie = false;
  let specialWinnerReason = "";

  if (effects.shotgunEliminated === "opponent") {
    playerWon = true;
    specialWinnerReason = "SHOTGUN FIRED! Zombie carrier eliminated, overriding all suit points!";
  } else if (effects.shotgunEliminated === "player") {
    playerWon = false;
    specialWinnerReason = "Eliminated by Opponent's Shotgun!";
  } else if (effects.vaccineCured === "opponent") {
    playerWon = true;
    specialWinnerReason = "VACCINE DEPLOYED! Zombie cured cleanly. Victory awarded!";
  } else if (effects.vaccineCured === "player") {
    playerWon = false;
    specialWinnerReason = "You were cured by Opponent's Vaccine!";
  } else if (effects.dualZombieCancel) {
    specialWinnerReason = "DUAL ZOMBIE COLLISION! Both cards vanished. Decided by suit points.";
    if (playerTotal === opponentTotal) isTie = true;
    else playerWon = playerTotal > opponentTotal;
  } else if (effects.playerZombie && !effects.opponentZombie) {
    playerWon = true;
    specialWinnerReason = "ZOMBIE AMBUSH! Opponent is now INFECTED!";
  } else if (!effects.playerZombie && effects.opponentZombie) {
    playerWon = false;
    specialWinnerReason = "ZOMBIE AMBUSH! You have been INFECTED!";
  } else {
    if (playerTotal === opponentTotal) {
      isTie = true;
      specialWinnerReason = `Equal Score (${playerTotal} vs ${opponentTotal}). Standoff! No cards stolen.`;
    } else {
      playerWon = playerTotal > opponentTotal;
    }
  }

  isRoundDraw = isTie;
  lastRoundPlayerWon = playerWon;
  eliminatePlayersWithNoCards();

  setTimeout(() => {
    if (checkMatchEnd()) return;
    showResult(playerWon, playerTotal, opponentTotal, specialWinnerReason, isTie);
  }, 950);
}

function showResult(playerWon, playerTotal, opponentTotal, specialWinnerReason, isTie) {
  roundFinished = true;
  const word = $("resultWord");
  const winner = $("resultWinner");
  const description = $("resultDescription");
  const claimSection = $("claimSection");
  const continueButton = $("continueBtn");

  const spectator = isSpectatorViewerContext() || !!spectatorViewerId || !!(humanPlayer && (humanPlayer.eliminated || !humanPlayer.alive));

  if (spectator) {
    if (word) {
      word.textContent = isTie ? "ROUND DRAW" : (playerWon ? "VICTORY" : "DEFEAT");
      word.className = `result-word ${isTie ? "draw" : (playerWon ? "" : "defeat")}`;
    }
    if (winner) {
      winner.textContent = isTie ? "STALEMATE" : (playerWon ? (humanPlayer?.name || "TEAMMATE") : (currentOpponent?.name || "OPPONENT"));
    }
    if (description) {
      description.textContent = specialWinnerReason || (isTie ? "Both combatants tied." : "Round concluded.");
    }

    hideSpectatorControls();
    if (continueButton) continueButton.onclick = null;
    $("resultModal")?.classList.remove("hidden");

    clearTimeout(spectatorAdvanceTimer);
    spectatorAdvanceTimer = setTimeout(() => {
      if (spectatorMode) finishSpectatorRound(playerWon, isTie);
      else {
        $("resultModal")?.classList.add("hidden");
        goToTeamRoom();
      }
    }, 1800);
    return;
  }

  restoreActivePlayerControls();

  if (isTie) {
    if (word) { word.textContent = "ROUND DRAW"; word.className = "result-word draw"; }
    if (winner) winner.textContent = "STANDOFF";
    if (description) description.textContent = specialWinnerReason || "Both played equal strength. No cards stolen.";
    claimSection?.classList.add("hidden");
  } else if (playerWon) {
    if (word) { word.textContent = "VICTORY"; word.className = "result-word"; }
    if (winner) winner.textContent = humanPlayer.name || "SURVIVOR";
    if (description) {
      description.textContent = specialWinnerReason || `${playerTotal} points vs ${opponentTotal}. You won the round.`;
    }
    claimSection?.classList.remove("hidden");
    createClaimCards();
  } else {
    if (word) { word.textContent = "DEFEAT"; word.className = "result-word defeat"; }
    if (winner) winner.textContent = currentOpponent ? currentOpponent.name : "OPPONENT";
    if (description) {
      description.textContent = specialWinnerReason || `${opponentTotal} points vs ${playerTotal}. The opponent won the round.`;
    }
    claimSection?.classList.add("hidden");
  }

  $("resultModal")?.classList.remove("hidden");
}

function createClaimCards() {
  const container = $("claimCards");
  if (!container) return;
  container.innerHTML = "";

  const visibleNumberCards = opponentPlayed.filter(card => card.type === "number");
  if (visibleNumberCards.length > 0) {
    claimedCard = visibleNumberCards[0];
  }

  visibleNumberCards.forEach((card, idx) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `claim-card ${idx === 0 ? "selected" : ""}`;
    button.innerHTML = cardHTML(card);
    button.addEventListener("click", () => {
      container.querySelectorAll(".claim-card").forEach(item => item.classList.remove("selected"));
      button.classList.add("selected");
      claimedCard = card;
      showToast(`${getCardName(card)} SELECTED`);
    });
    container.appendChild(button);
  });

  if (!visibleNumberCards.length) {
    const empty = document.createElement("div");
    empty.textContent = "NO VISIBLE NUMBER CARDS TO CLAIM";
    empty.style.opacity = "0.6";
    container.appendChild(empty);
  }
}

function getCardName(card) {
  if (card.type === "special") return card.name;
  return `${card.number} ${card.suitName}`;
}

function transferClaimedCard() {
  if (!claimedCard || !currentOpponent || claimedCard.type !== "number") return null;
  const index = currentOpponent.numberCards.findIndex(card => card.id === claimedCard.id);
  if (index < 0) return null;
  const [card] = currentOpponent.numberCards.splice(index, 1);
  humanPlayer.numberCards.push(card);
  humanPlayer.claimedCards.push(card);
  return card;
}

function botClaimVisibleCard() {
  if (!currentOpponent || !playerPlayed.length) return null;
  const visibleNumberCards = playerPlayed.filter(card => card && card.type === "number");
  if (!visibleNumberCards.length) return null;

  const difficulty = (localStorage.getItem("zh_bot_difficulty") || "normal").toLowerCase();
  let selected = visibleNumberCards[0];
  if (difficulty === "hard") {
    selected = [...visibleNumberCards].sort((a, b) => Number(b.value || 0) - Number(a.value || 0))[0];
  } else if (difficulty === "easy") {
    selected = [...visibleNumberCards].sort((a, b) => Number(a.value || 0) - Number(b.value || 0))[0];
  } else {
    selected = visibleNumberCards[Math.floor(Math.random() * visibleNumberCards.length)];
  }

  if (!selected) return null;
  const claimed = removeClaimedNumberCard(humanPlayer, selected.id);
  if (!claimed) return null;

  currentOpponent.numberCards.push(claimed);
  currentOpponent.claimedCards.push(claimed);
  return claimed;
}

function removeClaimedNumberCard(player, cardId) {
  if (!player || !Array.isArray(player.numberCards) || !cardId) return null;
  const index = player.numberCards.findIndex(c => c && c.type === "number" && c.id === cardId);
  if (index < 0) return null;
  const [card] = player.numberCards.splice(index, 1);
  return card || null;
}

function chooseSpectatorClaim(cards) {
  const visible = cards.filter(card => card && card.type === "number");
  if (!visible.length) return null;
  return [...visible].sort((a, b) => Number(b.value || 0) - Number(a.value || 0))[0];
}

function transferCardBetweenPlayers(fromPlayer, toPlayer, cardId) {
  if (!fromPlayer || !toPlayer || !cardId || !Array.isArray(fromPlayer.numberCards)) return null;
  const index = fromPlayer.numberCards.findIndex(card => card && card.type === "number" && card.id === cardId);
  if (index < 0) return null;

  const [card] = fromPlayer.numberCards.splice(index, 1);
  if (!Array.isArray(toPlayer.numberCards)) toPlayer.numberCards = [];
  toPlayer.numberCards.push(card);
  return card;
}

function finishSpectatorRound(teammateWon, isTie = false) {
  clearTimeout(spectatorAdvanceTimer);
  spectatorAdvanceTimer = null;
  $("resultModal")?.classList.add("hidden");

  if (!isTie && spectatorMode && humanPlayer && !humanPlayer.eliminated && currentOpponent && !currentOpponent.eliminated) {
    if (teammateWon) {
      const selected = chooseSpectatorClaim(opponentPlayed);
      if (selected) transferCardBetweenPlayers(currentOpponent, humanPlayer, selected.id);
    } else {
      const selected = chooseSpectatorClaim(playerPlayed);
      if (selected) transferCardBetweenPlayers(humanPlayer, currentOpponent, selected.id);
    }
  }

  eliminatePlayersWithNoCards();
  if (checkMatchEnd()) return;
  goToTeamRoom();
}

function continueRound() {
  if (isSpectatorViewerContext() || !!spectatorViewerId || !!(humanPlayer && (humanPlayer.eliminated || !humanPlayer.alive))) {
    hideSpectatorControls();
    $("resultModal")?.classList.add("hidden");
    return;
  }

  $("resultModal")?.classList.add("hidden");

  if (!isRoundDraw) {
    if (lastRoundPlayerWon) {
      if (claimedCard) transferClaimedCard();
    } else {
      botClaimVisibleCard();
    }
  }

  eliminatePlayersWithNoCards();
  if (checkMatchEnd()) return;

  if (humanPlayer.eliminated || !humanPlayer.alive) {
    spectatorMode = false;
    spectatorViewerId = humanPlayer.id;
    spectatorTargetId = null;
    hideSpectatorControls();
    goToTeamRoom();
    return;
  }

  goToTeamRoom();
}

function scheduleAsynchronousBotMatches() {
  ongoingBotMatches = [];
  let lockedPairs = [];
  try {
    lockedPairs = JSON.parse(localStorage.getItem("zh_locked_pairings") || "[]");
  } catch {
    lockedPairs = [];
  }

  if (Array.isArray(lockedPairs) && lockedPairs.length > 0) {
    lockedPairs.forEach(pair => {
      if (pair.aId === humanPlayer.id || pair.bId === humanPlayer.id) return;
      if (pair.aId === currentOpponent?.id || pair.bId === currentOpponent?.id) return;
      ongoingBotMatches.push({
        botAId: pair.aId,
        botBId: pair.bId,
        finishTimestamp: Date.now() + 3500,
        resolved: false
      });
    });
    localStorage.removeItem("zh_locked_pairings");
    return;
  }

  const bots = players.filter(p => !p.isHuman && p.id !== currentOpponent?.id && p.alive && !p.eliminated);
  const shuffled = [...bots].sort(() => Math.random() - 0.5);
  const paired = new Set();

  for (let i = 0; i < shuffled.length; i++) {
    const botA = shuffled[i];
    if (paired.has(botA.id) || botA.eliminated) continue;
    const botB = shuffled.find(b => b.id !== botA.id && b.team !== botA.team && !paired.has(b.id) && !b.eliminated);
    if (botB) {
      paired.add(botA.id);
      paired.add(botB.id);
      ongoingBotMatches.push({
        botAId: botA.id,
        botBId: botB.id,
        finishTimestamp: Date.now() + 3500,
        resolved: false
      });
    }
  }
}

function startSpectatorRound() {
  eliminatePlayersWithNoCards();
  if (humanPlayer.eliminated || !humanPlayer.alive) {
    window.location.href = "./team-room/team-room.html";
    return;
  }

  currentOpponent = chooseOpponent();
  if (!currentOpponent) {
    checkMatchEnd();
    return;
  }

  scheduleAsynchronousBotMatches();
  chooseSuit();
  roundInitialPlayerZombie = !!humanPlayer.isZombie;
  roundInitialOpponentZombie = !!currentOpponent.isZombie;

  selectedCards = [];
  playerPlayed = chooseSpectatorCards(humanPlayer);
  opponentPlayed = [];
  playerLocked = true;
  opponentLocked = false;
  claimedCard = null;
  roundFinished = false;
  roundResolving = false;
  isRoundDraw = false;

  renderEverything();

  if ($("centerStatus")) {
    $("centerStatus").innerHTML = `
      <small>SPECTATING LIVE MATCH</small>
      <strong>${escapeHTML(humanPlayer.name)} VS ${escapeHTML(currentOpponent.name)}</strong>
    `;
  }

  setTimeout(botLockCards, 1200);
}

function startRound() {
  if (spectatorMode) {
    startSpectatorRound();
    return;
  }

  eliminatePlayersWithNoCards();
  if (checkMatchEnd()) return;

  currentOpponent = chooseOpponent();
  if (!currentOpponent) {
    checkMatchEnd();
    return;
  }

  if (getTotalCardsCount(currentOpponent) <= 0) {
    eliminatePlayer(currentOpponent, "NO CARDS LEFT");
    startRound();
    return;
  }

  scheduleAsynchronousBotMatches();
  chooseSuit();
  roundInitialPlayerZombie = !!humanPlayer.isZombie;
  roundInitialOpponentZombie = !!currentOpponent.isZombie;

  selectedCards = [];
  playerPlayed = [];
  opponentPlayed = [];
  playerLocked = false;
  opponentLocked = false;
  claimedCard = null;
  roundFinished = false;
  roundResolving = false;
  isRoundDraw = false;

  renderEverything();
  start90SecondsTurnTimer();

  if ($("duelChatBox") && currentOpponent) {
    $("duelChatBox").innerHTML = `<div style="color:#697a82;"><b>[${currentOpponent.name}]:</b> Let's see what cards you've got this round!</div>`;
  }

  if ($("centerStatus")) {
    $("centerStatus").innerHTML = `
      <small>ROUND ${currentRound}</small>
      <strong>CHOOSE YOUR CARDS</strong>
    `;
  }
}

/* 1v1 DUEL PARLEY CHAT WITH BOT AI REPLIES */
$("duelChatForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  if (isSpectatorViewerContext()) {
    showToast("Spectators cannot message the rival in Arena!");
    return;
  }
  const input = $("duelChatInput");
  const box = $("duelChatBox");
  if (!input || !box || !input.value.trim()) return;
  const msg = input.value.trim();
  input.value = "";
  box.insertAdjacentHTML("beforeend", `<div><b style="color:#2e7d5b;">[YOU]:</b> ${escapeHTML(msg)}</div>`);
  box.scrollTop = box.scrollHeight;

  setTimeout(() => {
    const replies = [
      "Don't use Shotgun on me, I'm 100% Human!",
      "I have high suit cards, tread carefully.",
      "Are you sure you're not the covert Zombie?",
      "Let's play clean number cards this round!"
    ];
    const pick = replies[Math.floor(Math.random() * replies.length)];
    box.insertAdjacentHTML("beforeend", `<div><b style="color:#b95347;">[${escapeHTML(currentOpponent?.name || "BOT")}]:</b> ${pick}</div>`);
    box.scrollTop = box.scrollHeight;
  }, 700);
});

function goToTeamRoom() {
  clearInterval(turnTimerInterval);
  const opponentSpecialsUsed = opponentPlayed.filter(c => c.type === "special").map(c => c.special);
  const playerSpecialsUsed = playerPlayed.filter(c => c.type === "special").map(c => c.special);

  const roundIntel = {
    round: currentRound,
    opponent: {
      id: currentOpponent?.id || null,
      name: currentOpponent?.name || "UNKNOWN",
      avatar: currentOpponent?.avatar || "char2.jpg",
      team: currentOpponent?.team || "UNKNOWN",
      isZombie: !!currentOpponent?.isZombie,
      specialUsed: opponentSpecialsUsed
    },
    player: { specialUsed: playerSpecialsUsed }
  };

  let previousIntel = [];
  try {
    previousIntel = JSON.parse(localStorage.getItem("zh_team_intel") || "[]");
    if (!Array.isArray(previousIntel)) previousIntel = [];
  } catch {
    previousIntel = [];
  }
  previousIntel.push(roundIntel);

  const roomState = {
    mode: "computer",
    gameSessionId: currentGameSessionId,
    team: humanPlayer.team,
    teamNames: TEAM_NAMES,
    round: currentRound + 1,
    spectator: {
      enabled: !!(humanPlayer.eliminated || spectatorMode),
      viewerId: spectatorMode ? (spectatorViewerId || null) : (humanPlayer.eliminated ? humanPlayer.id : null),
      targetId: spectatorMode ? humanPlayer.id : null
    },
    spectatorMode: !!(humanPlayer.eliminated || spectatorMode),
    spectatorViewerId: humanPlayer.eliminated ? humanPlayer.id : (spectatorViewerId || null),
    spectatorTargetId: spectatorMode ? humanPlayer.id : null,
    currentSuit,
    playedOpponentIds: Array.from(playedOpponentIds),
    opponentMatchCounts: Object.fromEntries(opponentMatchCounts),
    ongoingBotMatches: ongoingBotMatches,
    humanPlayerId: humanPlayer.id,
    players: players.map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      team: p.team,
      alive: p.alive,
      eliminated: p.eliminated,
      isHuman: p.isHuman,
      isZombie: p.isZombie,
      numberCards: Array.isArray(p.numberCards) ? p.numberCards : [],
      claimedCards: Array.isArray(p.claimedCards) ? p.claimedCards : [],
      specialCards: p.specialCards
    })),
    eliminatedTeams,
    roundIntel: previousIntel
  };

  localStorage.setItem("zh_team_room_state", JSON.stringify(roomState));
  localStorage.setItem("zh_team_intel", JSON.stringify(previousIntel));
  localStorage.setItem("zh_return_from_round", "true");

  window.location.href = "./team-room/team-room.html";
}

function restoreMatchFromTeamRoom() {
  const returningFromTeamRoom = localStorage.getItem("zh_return_from_round") === "true";
  if (!returningFromTeamRoom) return false;

  const saved = localStorage.getItem("zh_team_room_state");
  if (!saved) {
    localStorage.removeItem("zh_return_from_round");
    return false;
  }

  try {
    const state = JSON.parse(saved);
    if (!state || !Array.isArray(state.players)) {
      localStorage.removeItem("zh_return_from_round");
      return false;
    }

    if (state.gameSessionId && currentGameSessionId && state.gameSessionId !== currentGameSessionId) {
      localStorage.removeItem("zh_return_from_round");
      localStorage.removeItem("zh_team_room_state");
      return false;
    }

    players.length = 0;
    state.players.forEach(p => players.push(p));

    humanPlayer = players.find(p => p.id === state.humanPlayerId) || players.find(p => p.isHuman);
    if (!humanPlayer) throw new Error("Human player could not be restored.");

    if (state.eliminatedTeams) {
      TEAM_NAMES.forEach(team => {
        eliminatedTeams[team] = Array.isArray(state.eliminatedTeams[team]) ? state.eliminatedTeams[team] : [];
      });
    }

    playedOpponentIds.clear();
    if (Array.isArray(state.playedOpponentIds)) {
      state.playedOpponentIds.forEach(id => playedOpponentIds.add(id));
    }

    opponentMatchCounts.clear();
    if (state.opponentMatchCounts && typeof state.opponentMatchCounts === "object") {
      Object.entries(state.opponentMatchCounts).forEach(([id, count]) => {
        opponentMatchCounts.set(id, Number(count) || 0);
      });
    }

    if (Array.isArray(state.ongoingBotMatches)) ongoingBotMatches = state.ongoingBotMatches;
    if (Number.isFinite(Number(state.round))) currentRound = Number(state.round);
    if (state.currentSuit) currentSuit = state.currentSuit;

    localStorage.removeItem("zh_return_from_round");
    eliminatePlayersWithNoCards();
    return true;
  } catch (error) {
    console.error("Team room state restore failed:", error);
    localStorage.removeItem("zh_return_from_round");
    localStorage.removeItem("zh_team_room_state");
    return false;
  }
}

function openEliminatedModal() {
  const container = $("eliminatedList");
  if (!container) return;
  container.innerHTML = "";

  TEAM_NAMES.forEach(team => {
    const eliminated = eliminatedTeams[team] || [];
    const wrapper = document.createElement("div");
    wrapper.className = "eliminated-team";
    wrapper.innerHTML = `
      <div class="eliminated-team-head">
        <strong>${team}</strong>
        <span>${eliminated.length} ELIMINATED</span>
      </div>
    `;

    if (eliminated.length === 0) {
      const empty = document.createElement("div");
      empty.style.fontSize = "8px";
      empty.style.color = "#718089";
      empty.textContent = "No eliminations yet";
      wrapper.appendChild(empty);
    } else {
      eliminated.forEach(person => {
        const row = document.createElement("div");
        row.className = "eliminated-person";
        row.innerHTML = `
          <img src="${AVATAR_PATH}${person.avatar}" alt="${escapeHTML(person.name)}" onerror="this.src='${AVATAR_PATH}char1.jpg'">
          <strong>${escapeHTML(person.name)}</strong>
          <small>${escapeHTML(person.reason || "ELIMINATED")}</small>
        `;
        wrapper.appendChild(row);
      });
    }
    container.appendChild(wrapper);
  });
  $("eliminatedModal")?.classList.remove("hidden");
}

function openProfilePopup(isOpponent) {
  const modal = $("profileModal");
  const image = $("popupAvatar");
  const name = $("popupName");
  const team = $("popupTeam");
  const stats = $("socialStats");

  if (isOpponent && currentOpponent) {
    image.src = AVATAR_PATH + currentOpponent.avatar;
    name.textContent = currentOpponent.name;
    team.textContent = `${currentOpponent.team} • COMPUTER`;
    stats.innerHTML = `<div class="social-stat"><strong>1,240</strong><small>FOLLOWERS</small></div><div class="social-stat"><strong>${getTotalCardsCount(currentOpponent)}</strong><small>CARDS LEFT</small></div>`;
  } else {
    image.src = AVATAR_PATH + (humanPlayer.avatar || "char1.jpg");
    name.textContent = humanPlayer.name || "SURVIVOR";
    team.textContent = `${humanPlayer.team} • YOU`;
    const tokens = window.ZHWallet ? window.ZHWallet.getTokens() : 5000;
    stats.innerHTML = `<div class="social-stat"><strong>${tokens.toLocaleString()} 🪙</strong><small>BOUNTY</small></div><div class="social-stat"><strong>${getTotalCardsCount(humanPlayer)}</strong><small>CARDS LEFT</small></div>`;
  }

  image.onerror = () => { image.src = AVATAR_PATH + "char1.jpg"; };
  modal?.classList.remove("hidden");
}

function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

let toastTimer;
function showToast(message) {
  const toast = $("toast");
  if (!toast) return;
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function clearOldMatchState() {
  localStorage.removeItem("zh_team_room_state");
  localStorage.removeItem("zh_team_intel");
  localStorage.removeItem("zh_return_from_round");
  localStorage.removeItem("zh_last_match");
  localStorage.removeItem("zh_spectator_mode");
  localStorage.removeItem("zh_spectator_target_id");
  localStorage.removeItem("zh_spectator_viewer_id");
  localStorage.removeItem("zh_spectate_target");
  localStorage.removeItem("zh_next_opponent_id");
  localStorage.removeItem("zh_locked_pairings");
}

$("forfeitBtn")?.addEventListener("click", () => $("forfeitModal")?.classList.remove("hidden"));
$("cancelForfeitBtn")?.addEventListener("click", () => $("forfeitModal")?.classList.add("hidden"));
$("closeForfeitBackdrop")?.addEventListener("click", () => $("forfeitModal")?.classList.add("hidden"));
$("confirmForfeitBtn")?.addEventListener("click", () => {
  clearOldMatchState();
  window.location.href = "../lobby.html";
});

$("openCardsBtn")?.addEventListener("click", openCardModal);
$("closeCardModal")?.addEventListener("click", closeCardModal);
$("modalLockBtn")?.addEventListener("click", lockPlayerCards);
$("lockBtn")?.addEventListener("click", lockPlayerCards);
$("eliminatedBtn")?.addEventListener("click", openEliminatedModal);
$("closeEliminated")?.addEventListener("click", () => $("eliminatedModal")?.classList.add("hidden"));
$("opponentProfile")?.addEventListener("click", () => openProfilePopup(true));
$("playerProfile")?.addEventListener("click", () => openProfilePopup(false));
$("closeProfile")?.addEventListener("click", () => $("profileModal")?.classList.add("hidden"));
$("continueBtn")?.addEventListener("click", continueRound);

document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
  backdrop.addEventListener("click", () => {
    const modal = backdrop.parentElement;
    if (modal.id === "cardModal") closeCardModal();
    else modal.classList.add("hidden");
  });
});

function renderEverything() {
  renderProfiles();
  renderOpponentHand();
  renderPlayerPreview();
  renderTeamMembers();
  renderSuit();
  renderRound();
  renderDifficultyHUD();
  renderPlayedCards();
  updateSelectionUI();
}

function initializeGame() {
  const returningFromTeamRoom = localStorage.getItem("zh_return_from_round") === "true";
  const queryTarget = new URLSearchParams(window.location.search).get("spectate");
  const storedTarget = localStorage.getItem("zh_spectator_target_id") || localStorage.getItem("zh_spectate_target");
  const spectatorRequested = localStorage.getItem("zh_spectator_mode") === "true" || !!queryTarget || !!storedTarget;

  if (spectatorRequested) {
    const saved = localStorage.getItem("zh_team_room_state");
    if (!saved) {
      localStorage.removeItem("zh_spectator_mode");
      clearOldMatchState();
      startFreshGameSession();
      currentGameSessionId = getGameSessionId();
      startRound();
      return;
    }

    try {
      const state = JSON.parse(saved);
      players.length = 0;
      state.players.forEach(p => players.push(p));

      const viewerId = state.spectatorViewerId || state.spectator?.viewerId || localStorage.getItem("zh_spectator_viewer_id") || null;
      const targetId = queryTarget || storedTarget || state.spectatorTargetId || state.spectator?.targetId || null;

      const target = players.find(p => p.id === targetId && p.alive && !p.eliminated) ||
                     players.find(p => p.alive && !p.eliminated);

      if (!target) {
        localStorage.removeItem("zh_spectator_mode");
        localStorage.removeItem("zh_spectator_target_id");
        localStorage.removeItem("zh_spectator_viewer_id");
        window.location.href = "./team-room/team-room.html";
        return;
      }

      humanPlayer = target;
      spectatorMode = true;
      spectatorViewerId = viewerId;
      spectatorTargetId = target.id;

      playedOpponentIds.clear();
      (state.playedOpponentIds || []).forEach(id => playedOpponentIds.add(id));

      opponentMatchCounts.clear();
      if (state.opponentMatchCounts && typeof state.opponentMatchCounts === "object") {
        Object.entries(state.opponentMatchCounts).forEach(([id, count]) => {
          opponentMatchCounts.set(id, Number(count) || 0);
        });
      }

      TEAM_NAMES.forEach(team => {
        eliminatedTeams[team] = Array.isArray(state.eliminatedTeams?.[team]) ? state.eliminatedTeams[team] : [];
      });

      currentRound = Number(state.round) || 1;
      currentSuit = state.currentSuit || "hearts";

      localStorage.removeItem("zh_spectator_mode");
      localStorage.removeItem("zh_spectator_target_id");
      localStorage.removeItem("zh_spectator_viewer_id");

      startRound();
      return;
    } catch (error) {
      console.error("Spectator restore failed:", error);
    }
  }

  if (returningFromTeamRoom) {
    const restored = restoreMatchFromTeamRoom();
    if (restored) {
      if (humanPlayer.eliminated) {
        window.location.href = "./team-room/team-room.html";
        return;
      }
      startRound();
      return;
    }
    clearOldMatchState();
    startFreshGameSession();
    currentGameSessionId = getGameSessionId();
    startRound();
    return;
  }

  clearOldMatchState();
  startFreshGameSession();
  currentGameSessionId = getGameSessionId();
  spectatorMode = false;
  spectatorViewerId = null;
  spectatorTargetId = null;
  startRound();
}

initializeGame();