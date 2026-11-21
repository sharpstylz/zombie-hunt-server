/* =========================================================
   ZOMBIE HUNT — UPGRADED ONLINE BATTLE ARENA (online-game.js)
   Location: public/online-lobby/online-game/online-game.js
========================================================= */

const $ = id => document.getElementById(id);

const PROFILE_KEY = "zh_profile";
const AVATAR_PATH = "../../profile/avatars/";
const SPECIAL_CARD_IMAGES = {
  zombie: "../../cards/Zombie Card.png",
  vaccine: "../../cards/Vaccine Card.png",
  shotgun: "../../cards/Shotgun Card.png"
};

function normalizeAvatar(avatar) {
  if (!avatar || typeof avatar !== "string") return "char1.jpg";
  if (avatar.startsWith("data:image/")) return avatar;
  let clean = avatar.trim().replace(/\\/g, "/").split("/").pop();
  return /^(char[1-9]|char1[0-7])\.jpg$/i.test(clean) ? clean.toLowerCase() : "char1.jpg";
}

function resolveArenaAvatar(avatarStr, isLocal = false) {
  if (isLocal && window.ZHAuth) {
    return window.ZHAuth.resolvePlayerAvatarSrc(AVATAR_PATH, avatarStr);
  }
  if (typeof avatarStr === "string" && avatarStr.startsWith("data:image/")) {
    return avatarStr;
  }
  return AVATAR_PATH + normalizeAvatar(avatarStr);
}

let profile = JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
let playerSessionId = localStorage.getItem("zh_player_session_id") || `zh_user_${Date.now()}`;
localStorage.setItem("zh_player_session_id", playerSessionId);

let customTeamName = (localStorage.getItem("zh_custom_team_name") || "TEAM B").trim().toUpperCase();
let isSpectatorMode = false;
let isRivalSpectatorLocked = false;
let tournamentRewardClaimed = false;
let inspectedArenaPlayer = null;

let humanPlayer = {
  sessionId: playerSessionId,
  name: profile.name || "Survivor",
  avatar: profile.avatar || "char1.jpg",
  team: customTeamName,
  alive: true,
  isZombie: false,
  deck: { numberCards: [], specialCards: { zombie: false, vaccine: true, shotgun: true } }
};

let currentOpponent = {
  sessionId: "opp_session",
  name: "Connecting Rival...",
  avatar: "char2.jpg",
  team: "RIVAL TEAM",
  alive: true
};

let activeMatchId = null;
let squadMembersList = [];
let allTournamentPlayers = [];
let serverSquadNamesMap = {};
let currentSuitKey = "hearts";
let playerLocked = false;
let opponentLocked = false;
let selectedCards = [];
let opponentCardsCount = 7;
let claimedCard = null;
let currentClaimableCards = [];
let currentLoserSessionId = null;

let turnSeconds = 90;
let turnTimerInterval = null;
let universalProceedSeconds = 10;
let universalProceedInterval = null;

const suits = [
  { key: "hearts", name: "HEARTS", symbol: "♥", color: "red" },
  { key: "diamonds", name: "DIAMONDS", symbol: "♦", color: "red" },
  { key: "clubs", name: "CLUBS", symbol: "♣", color: "black" },
  { key: "spades", name: "SPADES", symbol: "♠", color: "black" }
];

let socket = null;

function initArenaSocket() {
  if (typeof io === "undefined") return;
  socket = io(window.location.origin, { transports: ["websocket", "polling"] });

  socket.on("connect", () => {
    const isDead = localStorage.getItem("zh_player_is_alive") === "false";
    const spectateTargetId = isDead ? localStorage.getItem("zh_spectator_target_id") : null;

    if (!isDead) {
      localStorage.removeItem("zh_spectator_mode");
      localStorage.removeItem("zh_spectator_target_id");
      isSpectatorMode = false;
    }

    socket.emit("join_arena", {
      sessionId: playerSessionId,
      name: humanPlayer.name,
      avatar: humanPlayer.avatar,
      spectateTargetId: spectateTargetId
    });
  });

  socket.on("round_bye_granted", (data) => {
    showToast(data.message || "Sector Bye Granted for this round.");
    setTimeout(() => {
      window.location.href = "team-room/team-room.html";
    }, 1200);
  });

  socket.on("spectator_view_init", (data) => {
    isSpectatorMode = true;
    humanPlayer.alive = false;
    applySpectatorHUD(true);
    allTournamentPlayers = data.allPlayers || [];
    renderEliminatedModal();
    showToast("SPECTATOR FEED ACTIVE");
  });

  socket.on("arena_initialized", (data) => {
    activeMatchId = data.matchId;
    currentSuitKey = data.suit || "hearts";
    updateSuitUI(currentSuitKey);

    const activeRoundNum = data.round || 1;
    if ($("roundNumber")) $("roundNumber").textContent = activeRoundNum;
    if ($("statusRoundLabel")) $("statusRoundLabel").textContent = `ROUND ${activeRoundNum}`;

    allTournamentPlayers = data.allPlayers || [];
    serverSquadNamesMap = data.squadNames || {};

    let displaySideSquadKey = "";
    let displaySideSquadTitle = "";

    if (data.isSpectatorView) {
      isSpectatorMode = true;
      isRivalSpectatorLocked = !!data.isRivalSpectatorLock;
      humanPlayer.alive = false;
      localStorage.setItem("zh_spectator_mode", "true");
      applySpectatorHUD(isRivalSpectatorLocked);

      const spectateTargetId = localStorage.getItem("zh_spectator_target_id");
      let focusedPlayer = data.you;
      let focusedOpponent = data.opponent;

      if (data.opponent && data.opponent.sessionId === spectateTargetId) {
        focusedPlayer = data.opponent;
        focusedOpponent = data.you;
      }

      humanPlayer = { ...humanPlayer, ...focusedPlayer };
      currentOpponent = { ...currentOpponent, ...focusedOpponent };
      currentOpponent.team = serverSquadNamesMap[focusedOpponent.team] || data.opponentTeamName || focusedOpponent.team;
      humanPlayer.team = serverSquadNamesMap[focusedPlayer.team] || data.customTeamName || focusedPlayer.team;

      displaySideSquadKey = focusedPlayer.team;
      displaySideSquadTitle = serverSquadNamesMap[focusedPlayer.team] || data.customTeamName || focusedPlayer.team;
    } else {
      isSpectatorMode = false;
      isRivalSpectatorLocked = false;
      humanPlayer.alive = true;

      if (data.opponent) {
        currentOpponent = { ...currentOpponent, ...data.opponent };
        currentOpponent.team = serverSquadNamesMap[data.opponent.team] || data.opponentTeamName || currentOpponent.team;
        opponentCardsCount = data.opponent.cardsCount || 7;
      }

      if (data.you) {
        humanPlayer = { ...humanPlayer, ...data.you };
        humanPlayer.team = serverSquadNamesMap[data.you.team] || data.customTeamName || humanPlayer.team;
        if (data.you.deck && Array.isArray(data.you.deck.numberCards)) {
          humanPlayer.deck = data.you.deck;
        }
      }

      const openBtn = $("openCardsBtn");
      const lockBtn = $("lockBtn");
      if (openBtn) openBtn.style.display = "flex";
      if (lockBtn) lockBtn.style.display = "block";
      if ($("arenaDuelChatSection")) $("arenaDuelChatSection").style.display = "block";
      if ($("arenaMicBtn")) $("arenaMicBtn").style.display = "inline-block";

      playerLocked = false;
      opponentLocked = false;
      selectedCards = [];
      start90SecondsTurnTimer();
      showToast("Rival synced! 90s to parley & lock cards.");

      displaySideSquadKey = data.you?.team || humanPlayer.team;
      displaySideSquadTitle = serverSquadNamesMap[displaySideSquadKey] || displaySideSquadKey;
    }

    if (window.ZHVoice && activeMatchId) {
      window.ZHVoice.joinChannel(socket, `arena_${activeMatchId}`, isRivalSpectatorLocked);
    }

    squadMembersList = allTournamentPlayers.filter(p => p.team === displaySideSquadKey);
    if (squadMembersList.length === 0) {
      squadMembersList = data.squadMembers || [humanPlayer];
    }

    renderProfiles(displaySideSquadTitle);
    renderOpponentHand();
    renderPlayerPreview();
    renderSideSquadMembers(displaySideSquadTitle);
    renderEliminatedModal();
  });

  socket.on("receive_arena_duel_chat", (msg) => {
    const log = $("arenaDuelChatLog");
    if (!log) return;
    const isMe = msg.senderSessionId === playerSessionId;
    const color = isMe ? "#2c755f" : (msg.isSpectator ? "#54758b" : "#dc2626");
    log.insertAdjacentHTML("beforeend", `<div><b style="color:${color};">[${escapeHTML(msg.senderName)}${msg.isSpectator ? " 👁" : ""}]:</b> ${escapeHTML(msg.text)}</div>`);
    log.scrollTop = log.scrollHeight;
  });

  socket.on("opponent_has_locked", (info) => {
    opponentLocked = true;
    window.ZHSound?.play("lock");
    showToast("RIVAL HAS LOCKED THEIR CARDS!");
    if ($("centerStatus")) {
      $("centerStatus").innerHTML = playerLocked
        ? `<small>SYNCHRONIZING</small><strong>RESOLVING DUEL...</strong>`
        : `<small>OPPONENT LOCKED (${info?.cardsCount || 1} CARDS)</small><strong>AWAITING YOUR PLAY</strong>`;
    }
  });

  socket.on("duel_resolved", (data) => {
    clearInterval(turnTimerInterval);
    revealDuelOutcome(data);
  });

  socket.on("tournament_won", (data) => {
    clearInterval(turnTimerInterval);
    clearInterval(universalProceedInterval);
    window.ZHVoice?.leaveChannel();
    showTournamentVictoryCeremony(data);
  });

  socket.on("disconnect", () => {
    if ($("arenaConnectionDot")) $("arenaConnectionDot").textContent = "● OFFLINE";
  });
}

$("arenaMicBtn")?.addEventListener("click", async () => {
  if (!window.ZHVoice) return;
  const active = await window.ZHVoice.toggleMic();
  const btn = $("arenaMicBtn");
  if (btn) {
    btn.textContent = active ? "🎙️ MIC LIVE" : "🎙️ MIC OFF";
    btn.style.background = active ? "#2e7d5b" : "#fff";
    btn.style.color = active ? "#fff" : "";
  }
});

$("arenaSpeakerBtn")?.addEventListener("click", () => {
  if (!window.ZHVoice) return;
  const unmuted = window.ZHVoice.toggleSpeaker();
  const btn = $("arenaSpeakerBtn");
  if (btn) {
    btn.textContent = unmuted ? "🔊 AUDIO ON" : "🔇 MUTED";
  }
});

$("arenaDuelChatForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  if (isRivalSpectatorLocked) {
    showToast("Spectator Rule: Cannot chat while watching rival squads!");
    return;
  }
  const input = $("arenaDuelChatInput");
  if (!input || !input.value.trim() || !socket) return;
  socket.emit("send_arena_duel_chat", {
    matchId: activeMatchId,
    senderSessionId: playerSessionId,
    text: input.value.trim()
  });
  input.value = "";
});

function start90SecondsTurnTimer() {
  clearInterval(turnTimerInterval);
  turnSeconds = 90;
  updateTimerUI();

  turnTimerInterval = setInterval(() => {
    turnSeconds--;
    updateTimerUI();

    if (turnSeconds <= 0) {
      clearInterval(turnTimerInterval);
      if (!playerLocked && !isSpectatorMode && humanPlayer.alive !== false) {
        if (selectedCards.length > 0) {
          showToast("90s UP! Locking your selected cards...");
          lockPlayerCards();
        } else {
          showToast("90s UP! Auto-locking lowest card...");
          triggerAutoCardLock();
        }
      }
    }
  }, 1000);
}

function updateTimerUI() {
  const el = $("turnTimerText");
  if (!el) return;
  const mins = Math.floor(turnSeconds / 60);
  const secs = turnSeconds % 60;
  el.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  if (turnSeconds <= 15) {
    el.parentElement.style.borderColor = "#dc2626";
    el.style.color = "#dc2626";
  } else {
    el.parentElement.style.borderColor = "";
    el.style.color = "";
  }
}

function triggerAutoCardLock() {
  const playable = getPlayableCards(humanPlayer);
  const numberCards = playable.filter(c => c.type === "number");

  if (numberCards.length > 0) {
    numberCards.sort((a, b) => a.value - b.value);
    selectedCards = [numberCards[0]];
  } else if (playable.length > 0) {
    selectedCards = [playable[0]];
  }

  lockPlayerCards();
}

function applySpectatorHUD(lockComms = false) {
  clearInterval(turnTimerInterval);
  const openBtn = $("openCardsBtn");
  const lockBtn = $("lockBtn");
  const hudBadge = $("hudMatchText");
  const centerStatus = $("centerStatus");
  const turnClock = document.querySelector(".game-turn-clock");

  if (openBtn) openBtn.style.display = "none";
  if (lockBtn) lockBtn.style.display = "none";
  if (turnClock) turnClock.style.display = "none";

  if (lockComms) {
    if ($("arenaMicBtn")) $("arenaMicBtn").style.display = "none";
    if ($("arenaDuelChatSection")) $("arenaDuelChatSection").style.display = "none";
  } else {
    if ($("arenaMicBtn")) $("arenaMicBtn").style.display = "inline-block";
    if ($("arenaDuelChatSection")) $("arenaDuelChatSection").style.display = "block";
  }

  if (hudBadge) {
    hudBadge.textContent = lockComms ? "SILENT SPECTATOR • RIVAL FEED" : "SPECTATOR CAMERA • TEAM FEED";
    hudBadge.parentElement.style.borderColor = "#54758b";
    hudBadge.parentElement.style.color = "#54758b";
  }
  if (centerStatus) {
    centerStatus.innerHTML = `<small>SPECTATOR FEED</small><strong>WATCHING LIVE COMBAT</strong>`;
  }

  renderSpectatorCameraSwitcher();
}

function renderSpectatorCameraSwitcher() {
  let switcher = document.getElementById("spectatorCameraSwitcher");
  if (!switcher) {
    switcher = document.createElement("div");
    switcher.id = "spectatorCameraSwitcher";
    switcher.style.cssText = `
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
      z-index: 100000; background: rgba(18, 16, 14, 0.94);
      border: 1.5px solid rgba(77, 168, 140, 0.5); border-radius: 20px;
      padding: 10px 18px; box-shadow: 0 16px 45px rgba(0,0,0,0.6);
      backdrop-filter: blur(16px); display: flex; flex-direction: column;
      gap: 8px; min-width: 310px; max-width: 90vw;
    `;
    document.body.appendChild(switcher);
  }

  const meInTournament = (allTournamentPlayers || []).find(p => p.sessionId === playerSessionId);
  const myRealSquadKey = meInTournament ? meInTournament.team : (localStorage.getItem("zh_assigned_team_key") || "TEAM A");
  const myRealCustomTitle = serverSquadNamesMap[myRealSquadKey] || myRealSquadKey;

  const mySquadAliveMembers = (allTournamentPlayers || []).filter(p => p.team === myRealSquadKey && p.alive === true);
  const mySquadIsWiped = (mySquadAliveMembers.length === 0);

  const watchablePlayers = !mySquadIsWiped
    ? mySquadAliveMembers
    : (allTournamentPlayers || []).filter(p => p.alive === true && p.sessionId !== playerSessionId);

  const currentTargetId = localStorage.getItem("zh_spectator_target_id") || (watchablePlayers[0]?.sessionId);

  switcher.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:6px;">
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${mySquadIsWiped ? '#dc2626' : '#4da88c'};"></span>
        <span style="font-size:9.5px;font-weight:800;color:${mySquadIsWiped ? '#f87171' : '#4da88c'};letter-spacing:0.12em;font-family:'Oswald',sans-serif;">
          ${mySquadIsWiped ? "SQUAD WIPED • SILENT RIVAL FEED (MIC/CHAT OFF)" : `SQUAD SURVIVORS FEED (${myRealCustomTitle})`}
        </span>
      </div>
      <button onclick="window.location.href='team-room/team-room.html'" style="background:rgba(220,38,38,0.15);border:1px solid rgba(220,38,38,0.4);color:#f87171;font-family:'Oswald',sans-serif;font-size:9.5px;font-weight:700;border-radius:8px;padding:3px 8px;cursor:pointer;">✕ SAFE ROOM</button>
    </div>

    <div style="display:flex;gap:8px;overflow-x:auto;padding:4px 2px;">
      ${watchablePlayers.length ? watchablePlayers.map(p => {
        const isSelected = p.sessionId === currentTargetId;
        const customPlayerTeam = serverSquadNamesMap[p.team] || p.team;
        return `
          <button type="button" class="spec-cam-card" data-target-id="${p.sessionId}" style="
            flex: 0 0 auto; display: flex; align-items: center; gap: 8px;
            background: ${isSelected ? 'linear-gradient(135deg, rgba(44,117,95,0.4), rgba(77,168,140,0.2))' : 'rgba(255,255,255,0.04)'};
            border: 1.5px solid ${isSelected ? '#4da88c' : 'rgba(255,255,255,0.1)'};
            border-radius: 12px; padding: 6px 12px; color: #faf6ee; cursor: pointer;
          ">
            <img src="${resolveArenaAvatar(p.avatar, false)}" style="width:24px;height:24px;border-radius:50%;object-fit:cover;">
            <div style="text-align:left;">
              <strong style="display:block;font-size:10px;font-family:'Oswald',sans-serif;line-height:1.1;">${escapeHTML(p.name)}</strong>
              <small style="font-size:7.5px;color:#a8a29e;">${escapeHTML(customPlayerTeam)}</small>
            </div>
            ${isSelected ? '<span style="font-size:9px;color:#4da88c;margin-left:2px;">● LIVE</span>' : ''}
          </button>
        `;
      }).join("") : `<div style="font-size:9px;color:#8c8270;padding:4px;">No active operatives available.</div>`}
    </div>
  `;

  switcher.querySelectorAll(".spec-cam-card").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.targetId;
      localStorage.setItem("zh_spectator_target_id", targetId);
      socket.emit("join_arena", {
        sessionId: playerSessionId,
        spectateTargetId: targetId
      });
      renderSpectatorCameraSwitcher();
    });
  });
}

function updateSuitUI(suitKey) {
  const suitObj = suits.find(s => s.key === suitKey) || suits[0];
  if ($("currentSuit")) $("currentSuit").textContent = suitObj.name;
  if ($("suitIcon")) {
    $("suitIcon").textContent = suitObj.symbol;
    $("suitIcon").style.color = suitObj.color === "red" ? "#dc2626" : "#25231f";
  }
  if ($("modalSuit")) $("modalSuit").textContent = suitObj.name;
  if ($("modalSuitIcon")) $("modalSuitIcon").textContent = suitObj.symbol;
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
          onerror="this.onerror=null; this.parentElement.innerHTML='<span style=\\'font-size:18px;font-weight:800;\\'>${card.special.toUpperCase()}</span>';"
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

function getPlayableCards(player) {
  if (player.alive === false || isSpectatorMode) return [];
  const d = player.deck || { numberCards: [], specialCards: { zombie: false, vaccine: true, shotgun: true } };
  const cards = [...(d.numberCards || [])];

  if (d.specialCards?.zombie && player.isZombie) {
    cards.push({ id: "spec_zombie", type: "special", special: "zombie", name: "ZOMBIE" });
  }
  if (d.specialCards?.vaccine) {
    cards.push({ id: "spec_vaccine", type: "special", special: "vaccine", name: "VACCINE" });
  }
  if (d.specialCards?.shotgun) {
    cards.push({ id: "spec_shotgun", type: "special", special: "shotgun", name: "SHOTGUN" });
  }
  return cards;
}

function renderProfiles(customTitle) {
  if ($("playerName")) $("playerName").textContent = humanPlayer.name;
  if ($("playerImage")) {
    $("playerImage").src = resolveArenaAvatar(humanPlayer.avatar, !isSpectatorMode);
    $("playerImage").parentElement.style.boxShadow = (!isSpectatorMode && humanPlayer.isZombie) ? "0 0 16px #2ecc71" : "";
  }
  if ($("playerTeamLabel")) $("playerTeamLabel").textContent = `${humanPlayer.team} • ${isSpectatorMode ? "OPERATIVE" : "YOU"}`;
  if ($("playerZombieBadge")) {
    $("playerZombieBadge").textContent = (!isSpectatorMode && humanPlayer.isZombie) ? "☣ COVERT ZOMBIE" : "SQUAD MEMBER";
  }

  if ($("opponentName")) $("opponentName").textContent = currentOpponent.name;
  if ($("opponentImage")) $("opponentImage").src = resolveArenaAvatar(currentOpponent.avatar, false);
  if ($("opponentTeamLabel")) $("opponentTeamLabel").textContent = `${currentOpponent.team} • OPPONENT`;
  if ($("sideSquadName")) $("sideSquadName").textContent = customTitle || humanPlayer.team;
}

function renderOpponentHand() {
  const container = $("opponentHand");
  if (!container) return;
  container.innerHTML = Array.from({ length: Math.max(1, opponentCardsCount) }).map(() => `<div class="playing-card card-back"></div>`).join("");
}

function renderPlayerPreview() {
  const container = $("cardPreview");
  if (!container || isSpectatorMode || humanPlayer.alive === false) return;
  const cards = getPlayableCards(humanPlayer);
  container.innerHTML = cards.slice(0, 4).map(card => cardHTML(card)).join("");
}

function renderSideSquadMembers(customTitle) {
  const container = $("teamMembers");
  if (!container) return;

  if ($("sideSquadName")) $("sideSquadName").textContent = customTitle || humanPlayer.team;

  container.innerHTML = squadMembersList.map(member => {
    const isFocused = isSpectatorMode
      ? member.sessionId === humanPlayer.sessionId
      : member.sessionId === playerSessionId;
    const active = member.alive === true;
    const isMe = member.sessionId === playerSessionId;
    return `
      <div class="team-member-item ${isFocused ? "you-item" : ""}">
        <img src="${resolveArenaAvatar(member.avatar, isMe)}" alt="${escapeHTML(member.name)}" style="${!active ? 'filter:grayscale(100%);opacity:0.6;' : ''}">
        <div>
          <strong>${escapeHTML(member.name)} ${isFocused ? (isSpectatorMode ? "(WATCHING)" : "(YOU)") : ""}</strong>
          <small style="color:${active ? '#2c755f' : '#dc2626'}">${active ? "● ACTIVE" : "☠ ELIMINATED"}</small>
        </div>
      </div>
    `;
  }).join("");
}

function renderEliminatedModal() {
  const list = $("eliminatedList");
  if (!list) return;

  const SQUAD_ORDER = ["TEAM A", "TEAM B", "TEAM C", "TEAM D"];
  list.innerHTML = "";

  SQUAD_ORDER.forEach(sqKey => {
    const squadPlayers = allTournamentPlayers.filter(p => p.team === sqKey);
    const customHeaderTitle = serverSquadNamesMap[sqKey] || sqKey;
    if (squadPlayers.length > 0) {
      const header = document.createElement("div");
      header.style.cssText = "font-size:10px;font-weight:800;color:var(--muted);margin:8px 0 4px;letter-spacing:0.08em;border-bottom:1px solid rgba(0,0,0,0.06);padding-bottom:3px;";
      header.textContent = `${customHeaderTitle} ROSTER`;
      list.appendChild(header);

      squadPlayers.forEach(p => {
        const item = document.createElement("div");
        item.className = "eliminated-item";
        const isAlive = p.alive === true;
        item.innerHTML = `
          <img src="${resolveArenaAvatar(p.avatar, p.sessionId === playerSessionId)}" alt="${escapeHTML(p.name)}">
          <div>
            <strong>${escapeHTML(p.name)}</strong>
            <small style="color:${isAlive ? '#2c755f' : '#dc2626'};">${isAlive ? "● ACTIVE IN COMBAT" : "☠ CASUALTY — ELIMINATED"}</small>
          </div>
        `;
        list.appendChild(item);
      });
    }
  });
}

function renderSelectionGrid() {
  const grid = $("selectionGrid");
  if (!grid || isSpectatorMode || humanPlayer.alive === false) return;
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
  if (playerLocked || isSpectatorMode || humanPlayer.alive === false) return;
  window.ZHSound?.play("click");
  const cards = getPlayableCards(humanPlayer);
  const card = cards.find(item => item.id === cardId);
  if (!card) return;

  const index = selectedCards.findIndex(item => item.id === cardId);
  if (index >= 0) {
    selectedCards.splice(index, 1);
  } else {
    if (card.type === "special") {
      const alreadyHasSpecial = selectedCards.some(s => s.type === "special");
      if (alreadyHasSpecial) {
        showToast("ONLY ONE SPECIAL CARD ALLOWED PER ROUND");
        return;
      }
    }
    selectedCards.push(card);
  }
  renderSelectionGrid();
}

function updateSelectionUI() {
  const count = selectedCards.length;
  if ($("modalSelectedCount")) $("modalSelectedCount").textContent = count;
  if ($("selectionCount")) $("selectionCount").textContent = `${count} SELECTED`;
  const modalLock = $("modalLockBtn");
  const lock = $("lockBtn");
  if (modalLock) modalLock.disabled = count === 0 || playerLocked || isSpectatorMode;
  if (lock) lock.disabled = count === 0 || playerLocked || isSpectatorMode;
}

function lockPlayerCards() {
  if (playerLocked || !selectedCards.length || isSpectatorMode || humanPlayer.alive === false) return;
  playerLocked = true;
  clearInterval(turnTimerInterval);
  window.ZHSound?.play("lock");
  $("cardModal")?.classList.add("hidden");
  updateSelectionUI();

  const playerContainer = $("playerPlayed");
  if (playerContainer) playerContainer.innerHTML = selectedCards.map(c => cardHTML(c)).join("");

  if ($("centerStatus")) {
    $("centerStatus").innerHTML = opponentLocked
      ? `<small>CARDS LOCKED</small><strong>RESOLVING DUEL...</strong>`
      : `<small>YOUR CARDS</small><strong>LOCKED • AWAITING RIVAL</strong>`;
  }
  showToast("CARDS LOCKED — TRANSMITTING TO SECTOR...");

  if (socket && socket.connected) {
    socket.emit("lock_cards", { playedCards: selectedCards });
  }
}

function revealDuelOutcome(data) {
  const opponentContainer = $("opponentPlayed");
  const playerContainer = $("playerPlayed");

  const isYouP1 = humanPlayer.sessionId === data.p1SessionId;
  const myCards = isYouP1 ? data.p1Played : data.p2Played;
  const oppCards = isYouP1 ? data.p2Played : data.p1Played;

  if (opponentContainer && oppCards) opponentContainer.innerHTML = oppCards.map(c => cardHTML(c)).join("");
  if (playerContainer && myCards) playerContainer.innerHTML = myCards.map(c => cardHTML(c)).join("");

  const myScore = isYouP1 ? data.p1Score : data.p2Score;
  const oppScore = isYouP1 ? data.p2Score : data.p1Score;

  if ($("playerTotal")) $("playerTotal").textContent = myScore ?? 0;
  if ($("opponentTotal")) $("opponentTotal").textContent = oppScore ?? 0;
  $("totalsBoard")?.classList.remove("hidden");

  if (data.reason.includes("SHOTGUN")) window.ZHSound?.play("shotgun");
  else if (data.reason.includes("VACCINE")) window.ZHSound?.play("vaccine");
  else if (data.reason.includes("ZOMBIE")) window.ZHSound?.play("zombie");

  const youWon = data.winnerSessionId === humanPlayer.sessionId;

  if (data.reason.includes("SHOTGUN FIRED") && data.loserSessionId === humanPlayer.sessionId) {
    humanPlayer.alive = false;
    localStorage.setItem("zh_player_is_alive", "false");
  }

  if (data.reason.includes("ZOMBIE AMBUSH") && data.loserSessionId === humanPlayer.sessionId) {
    humanPlayer.isZombie = true;
    if (humanPlayer.deck) humanPlayer.deck.specialCards.zombie = true;
    showToast("YOU HAVE BEEN INFECTED! Zombie operative activated.");
  }

  setTimeout(() => {
    showResultModal(youWon, data.isTie, data.reason, data.claimableCards, data.loserSessionId);
  }, 1100);
}

function showResultModal(playerWon, isTie, reason, claimableCards, loserSessionId) {
  const word = $("resultWord");
  const winner = $("resultWinner");
  const desc = $("resultDescription");
  const claimSection = $("claimSection");

  currentClaimableCards = claimableCards || [];
  currentLoserSessionId = loserSessionId;
  claimedCard = null;

  if (isSpectatorMode) {
    if (word) { word.textContent = "DUEL CONCLUDED"; word.className = "result-word"; }
    if (winner) winner.textContent = playerWon ? humanPlayer.name : currentOpponent.name;
    if (desc) desc.textContent = reason;
    claimSection?.classList.add("hidden");
    $("resultModal")?.classList.remove("hidden");
    startUniversal10sTimer();
    return;
  }

  if (humanPlayer.alive === false) {
    if (word) { word.textContent = "ELIMINATED"; word.className = "result-word defeat"; }
    if (winner) winner.textContent = currentOpponent.name;
    if (desc) desc.textContent = reason;
    claimSection?.classList.add("hidden");
  } else if (isTie) {
    if (word) { word.textContent = "ROUND DRAW"; word.className = "result-word draw"; }
    if (winner) winner.textContent = "STANDOFF";
    if (desc) desc.textContent = reason;
    claimSection?.classList.add("hidden");
  } else if (playerWon) {
    if (word) { word.textContent = "VICTORY"; word.className = "result-word"; }
    if (winner) winner.textContent = humanPlayer.name;
    if (desc) desc.textContent = reason;

    if (currentClaimableCards.length > 0) {
      claimSection?.classList.remove("hidden");
      renderClaimCardsWithDefaultSelection();
    } else {
      claimSection?.classList.add("hidden");
    }
  } else {
    if (word) { word.textContent = "DEFEAT"; word.className = "result-word defeat"; }
    if (winner) winner.textContent = currentOpponent.name;
    if (desc) desc.textContent = reason;
    claimSection?.classList.add("hidden");
  }

  $("resultModal")?.classList.remove("hidden");
  startUniversal10sTimer();
}

function renderClaimCardsWithDefaultSelection() {
  const container = $("claimCards");
  if (!container || !currentClaimableCards.length) return;
  container.innerHTML = "";

  claimedCard = currentClaimableCards[0];

  currentClaimableCards.forEach((card, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `claim-card ${idx === 0 ? "selected" : ""}`;
    btn.innerHTML = cardHTML(card);
    btn.addEventListener("click", () => {
      container.querySelectorAll(".claim-card").forEach(c => c.classList.remove("selected"));
      btn.classList.add("selected");
      claimedCard = card;
      showToast(`Selected: ${card.number} of ${card.suit}`);
    });
    container.appendChild(btn);
  });
}

function startUniversal10sTimer() {
  clearInterval(universalProceedInterval);
  universalProceedSeconds = 10;
  updateUniversalTimerUI();

  universalProceedInterval = setInterval(() => {
    universalProceedSeconds--;
    updateUniversalTimerUI();

    if (universalProceedSeconds <= 0) {
      clearInterval(universalProceedInterval);
      finalizeRoundAndProceed();
    }
  }, 1000);
}

function updateUniversalTimerUI() {
  const badge = $("claimTimerBadge");
  const continueBtn = $("continueBtn");

  if (badge) badge.textContent = `AUTO-PROCEED IN ${universalProceedSeconds}s`;
  if (continueBtn) continueBtn.textContent = `PROCEED TO SQUAD ROOM (${universalProceedSeconds}s) →`;
}

function finalizeRoundAndProceed() {
  clearInterval(universalProceedInterval);
  window.ZHVoice?.leaveChannel();

  if (claimedCard && socket && socket.connected && !isSpectatorMode) {
    let redirected = false;
    const go = () => {
      if (redirected) return;
      redirected = true;
      proceedToRoom();
    };
    socket.emit("claim_card_action", {
      matchId: activeMatchId,
      claimedCardId: claimedCard.id,
      winnerSessionId: humanPlayer.sessionId,
      loserSessionId: currentLoserSessionId
    }, go);
    setTimeout(go, 400);
  } else {
    proceedToRoom();
  }
}

function proceedToRoom() {
  clearInterval(universalProceedInterval);
  $("resultModal")?.classList.add("hidden");
  window.location.href = "team-room/team-room.html";
}

$("forfeitBtn")?.addEventListener("click", () => $("forfeitModal")?.classList.remove("hidden"));
$("cancelForfeitBtn")?.addEventListener("click", () => $("forfeitModal")?.classList.add("hidden"));
$("closeForfeitBackdrop")?.addEventListener("click", () => $("forfeitModal")?.classList.add("hidden"));

$("confirmForfeitBtn")?.addEventListener("click", () => {
  $("forfeitModal")?.classList.add("hidden");
  window.ZHVoice?.leaveChannel();
  humanPlayer.alive = false;
  localStorage.setItem("zh_player_is_alive", "false");

  if (socket && socket.connected) {
    socket.emit("forfeit_match", { sessionId: playerSessionId });
  }

  showToast("Combat abandoned. You have been eliminated.");
  setTimeout(() => {
    localStorage.removeItem("zh_player_session_id");
    localStorage.removeItem("zh_online_room_state");
    localStorage.removeItem("zh_spectator_mode");
    window.location.href = "../../index.html";
  }, 600);
});

function showTournamentVictoryCeremony(data) {
  const myTeamRaw = localStorage.getItem("zh_assigned_team_key") || humanPlayer.team;
  const isYourTeamWinner =
    humanPlayer.team === data.winningSquadKey ||
    myTeamRaw === data.winningSquadKey ||
    humanPlayer.team === data.winningSquadName ||
    (data.members || []).some(m => m.sessionId === playerSessionId);

  if (!isYourTeamWinner) {
    showResultModal(false, false, `Tournament Concluded! ${data.winningSquadName} emerged as Champions.`, [], null);
    return;
  }

  window.ZHSound?.play("victory");
  const modal = $("tournamentVictoryModal");
  const title = $("champSquadTitle");
  const list = $("champDistributionList");
  if (!modal) return;

  if (title) title.textContent = data.winningSquadName;
  const share = Number(data.sharePerPlayer || 4000);

  if (!tournamentRewardClaimed) {
    tournamentRewardClaimed = true;
    if (window.ZHWallet) window.ZHWallet.addTokens(share);
    else {
      let currentTokens = Number(localStorage.getItem("zh_bounty_tokens") || 4000);
      localStorage.setItem("zh_bounty_tokens", String(currentTokens + share));
    }
  }

  if (list && Array.isArray(data.members)) {
    list.innerHTML = data.members.map(m => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-radius:10px;background:rgba(0,0,0,0.04);">
        <div style="display:flex;align-items:center;gap:10px;">
          <img src="${resolveArenaAvatar(m.avatar, m.sessionId === playerSessionId)}" style="width:28px;height:28px;border-radius:50%;border:1.5px solid #c9932b;object-fit:cover;">
          <strong style="font-size:12px;">${escapeHTML(m.name)}</strong>
        </div>
        <b style="color:#a37217;font-family:'Oswald',sans-serif;font-size:13px;">+${share.toLocaleString()} TOKENS</b>
      </div>
    `).join("");
  }

  modal.classList.remove("hidden");
}

$("doubleOnlineWinAdBtn")?.addEventListener("click", function () {
  this.disabled = true;
  window.ZHAds?.watchRewardedAd("CLAIM +2,000 CHAMPION BONUS", () => {
    window.ZHWallet?.addTokens(2000);
    this.textContent = "✓ +2,000 BONUS CREDITED!";
    this.style.background = "#2c755f";
  });
});

$("finishTournamentBtn")?.addEventListener("click", () => {
  localStorage.removeItem("zh_player_session_id");
  localStorage.removeItem("zh_online_room_state");
  localStorage.removeItem("zh_spectator_mode");
  localStorage.removeItem("zh_player_is_alive");
  window.location.href = "../../index.html";
});

function openInspectModal(player) {
  window.ZHSound?.play("click");
  const modal = $("profileModal");
  if (!modal || !player) return;
  inspectedArenaPlayer = player;

  const isMe = player.sessionId === playerSessionId;
  if ($("popupAvatar")) $("popupAvatar").src = resolveArenaAvatar(player.avatar, isMe);
  if ($("popupName")) $("popupName").textContent = player.name;
  if ($("popupTeam")) $("popupTeam").textContent = player.team;

  if ($("popupFollowers")) $("popupFollowers").textContent = (player.followers || 1200).toLocaleString();
  if ($("popupBounty")) $("popupBounty").textContent = `${(player.bountyTokens || 4000).toLocaleString()} TOKENS`;

  const wins = player.squadWins || 15;
  const losses = player.squadLosses || 5;
  const ratio = (wins / (losses === 0 ? 1 : losses)).toFixed(2);
  if ($("popupSI")) $("popupSI").textContent = `${ratio} (SQUAD RATIO)`;

  if ($("arenaFollowBtn")) {
    $("arenaFollowBtn").style.display = isMe ? "none" : "block";
    $("arenaFollowBtn").textContent = "+ FOLLOW OPERATIVE";
  }

  modal.classList.remove("hidden");
}

$("arenaFollowBtn")?.addEventListener("click", () => {
  if (!inspectedArenaPlayer || !socket) return;
  window.ZHSound?.play("lock");
  socket.emit("follow_player", {
    followerSessionId: playerSessionId,
    targetSessionId: inspectedArenaPlayer.sessionId
  });
  $("arenaFollowBtn").textContent = "✓ FOLLOWING";
  showToast(`Following ${inspectedArenaPlayer.name}!`);
});

$("openCardsBtn")?.addEventListener("click", () => {
  if (playerLocked || isSpectatorMode || humanPlayer.alive === false) return;
  renderSelectionGrid();
  $("cardModal")?.classList.remove("hidden");
});

$("closeCardModal")?.addEventListener("click", () => $("cardModal")?.classList.add("hidden"));
$("closeCardBackdrop")?.addEventListener("click", () => $("cardModal")?.classList.add("hidden"));
$("modalLockBtn")?.addEventListener("click", lockPlayerCards);
$("lockBtn")?.addEventListener("click", lockPlayerCards);
$("continueBtn")?.addEventListener("click", finalizeRoundAndProceed);
$("playerProfile")?.addEventListener("click", () => openInspectModal(humanPlayer));
$("opponentProfile")?.addEventListener("click", () => openInspectModal(currentOpponent));
$("closeProfile")?.addEventListener("click", () => $("profileModal")?.classList.add("hidden"));
$("closeProfileBackdrop")?.addEventListener("click", () => $("profileModal")?.classList.add("hidden"));
$("eliminatedBtn")?.addEventListener("click", () => $("eliminatedModal")?.classList.remove("hidden"));
$("closeEliminated")?.addEventListener("click", () => $("eliminatedModal")?.classList.add("hidden"));
$("closeEliminatedBackdrop")?.addEventListener("click", () => $("eliminatedModal")?.classList.add("hidden"));

let toastTimer;
function showToast(message) {
  const toast = $("toast");
  if (!toast) return;
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = String(text ?? "");
  return div.innerHTML;
}

renderProfiles();
renderOpponentHand();
renderPlayerPreview();
initArenaSocket();