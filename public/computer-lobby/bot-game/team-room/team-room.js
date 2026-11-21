/* =========================================================
   ZOMBIE HUNT — UPGRADED BOT SQUAD ROOM (team-room.js)
   Location: public/computer-lobby/bot-game/team-room/team-room.js
========================================================= */

const $ = id => document.getElementById(id);

const AVATAR_PATH = "../../../profile/avatars/";
const FALLBACK_AVATAR = "../../../profile/avatars/char1.jpg";
const AUTO_READY_KEY = "zh_auto_ready_enabled";

let roomState = null;
let intel = [];

let humanLockSeconds = 3;
let humanLockInterval = null;
let humanRoomWaitSeconds = 60;
let humanRoomWaitInterval = null;
let mmMaxWaitSeconds = 1;
let mmMaxWaitInterval = null;
let launchCountdownSeconds = 3;
let launchCountdownInterval = null;
let autonomousTournamentTicker = null;
let mmWaitPollInterval = null;

function loadRoomState() {
  try {
    roomState = JSON.parse(localStorage.getItem("zh_team_room_state") || "null");
  } catch {
    roomState = null;
  }
  try {
    intel = JSON.parse(localStorage.getItem("zh_team_intel") || "[]");
  } catch {
    intel = [];
  }
  if (!Array.isArray(intel)) intel = [];
}

loadRoomState();

function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = String(text ?? "");
  return div.innerHTML;
}

function getTeamMembers() {
  if (!roomState || !Array.isArray(roomState.players)) return [];
  return roomState.players.filter(p => p.team === roomState.team);
}

function getViewer() {
  if (!roomState || !Array.isArray(roomState.players)) return null;
  const viewerId = roomState.spectatorViewerId || roomState.humanPlayerId;
  return roomState.players.find(p => p.id === viewerId) || null;
}

function viewerIsEliminated() {
  const viewer = getViewer();
  return !viewer || viewer.eliminated || !viewer.alive;
}

function myTeamIsCompletelyEliminated() {
  const members = getTeamMembers();
  return members.length > 0 && members.every(m => m.eliminated || !m.alive);
}

function anyActiveBotInTournament() {
  if (!roomState || !Array.isArray(roomState.players)) return null;
  return roomState.players.find(p => p.alive && !p.eliminated) || null;
}

function getTotalCardsCount(player) {
  if (!player) return 0;
  let count = Array.isArray(player.numberCards) ? player.numberCards.length : 0;
  if (player.specialCards?.vaccine) count++;
  if (player.specialCards?.shotgun) count++;
  if (player.specialCards?.zombie && player.isZombie) count++;
  return count;
}

function isPlayerCurrentlyBattling(playerId) {
  if (!roomState || !Array.isArray(roomState.ongoingBotMatches)) return false;
  const now = Date.now();
  return roomState.ongoingBotMatches.some(m =>
    !m.resolved &&
    (m.botAId === playerId || m.botBId === playerId) &&
    m.finishTimestamp > now
  );
}

function areAllAlivePlayersFree() {
  if (!roomState || !Array.isArray(roomState.players)) return true;
  const aliveBots = roomState.players.filter(p => p.alive && !p.eliminated && !p.isHuman);
  return !aliveBots.some(b => isPlayerCurrentlyBattling(b.id));
}

function startSpectating(targetId) {
  const target = (roomState?.players || []).find(p => p.id === targetId && p.alive && !p.eliminated);
  if (!target) return;

  // Enforce Spectator Rule: Cannot watch other teams until own team is wiped out
  if (!myTeamIsCompletelyEliminated() && target.team !== roomState.team) {
    alert("स्पेक्टेटर नियम: जब तक आपकी अपनी टीम जीवित है, आप केवल अपनी टीम के साथियों का मैच देख सकते हैं!");
    return;
  }

  localStorage.setItem("zh_spectator_mode", "true");
  localStorage.setItem("zh_spectator_target_id", target.id);
  localStorage.setItem("zh_spectator_viewer_id", getViewer()?.id || roomState.humanPlayerId);
  localStorage.setItem("zh_return_from_round", "true");

  if (Array.isArray(roomState.ongoingBotMatches)) {
    let existingDuel = roomState.ongoingBotMatches.find(m => m.botAId === target.id || m.botBId === target.id);
    if (existingDuel) {
      const oppId = existingDuel.botAId === target.id ? existingDuel.botBId : existingDuel.botAId;
      localStorage.setItem("zh_next_opponent_id", oppId);
    } else {
      const aliveEnemies = roomState.players.filter(p => p.alive && !p.eliminated && p.team !== target.team && getTotalCardsCount(p) > 0);
      if (aliveEnemies.length > 0) {
        const randOpp = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
        localStorage.setItem("zh_next_opponent_id", randOpp.id);
        roomState.ongoingBotMatches.push({
          botAId: target.id,
          botBId: randOpp.id,
          finishTimestamp: Date.now() + 4000,
          resolved: false
        });
        localStorage.setItem("zh_team_room_state", JSON.stringify(roomState));
      }
    }
  }

  window.location.href = "../bot-game.html";
}

function leaveGameToLobby() {
  localStorage.removeItem("zh_team_room_state");
  localStorage.removeItem("zh_team_intel");
  localStorage.removeItem("zh_return_from_round");
  localStorage.removeItem("zh_spectator_mode");
  localStorage.removeItem("zh_spectator_target_id");
  localStorage.removeItem("zh_spectator_viewer_id");
  localStorage.removeItem("zh_next_opponent_id");
  localStorage.removeItem("zh_locked_pairings");
  window.location.href = "../../lobby.html";
}

$("leaveGameBtn")?.addEventListener("click", leaveGameToLobby);
$("leaveBottomBtn")?.addEventListener("click", leaveGameToLobby);

$("toggleIntelDrawerBtn")?.addEventListener("click", () => $("intelDrawerModal")?.classList.remove("hidden"));
$("closeIntelDrawerBtn")?.addEventListener("click", () => $("intelDrawerModal")?.classList.add("hidden"));
$("closeIntelDrawerBackdrop")?.addEventListener("click", () => $("intelDrawerModal")?.classList.add("hidden"));

/* =========================================================
   DYNAMIC CHAMPION MODAL FIX (+1,000 BOUNTY TOKENS)
========================================================= */
function checkTournamentFinishedInRoom() {
  if (!roomState || !Array.isArray(roomState.players)) return false;

  const activeTeams = new Set();
  roomState.players.forEach(p => {
    if (p.alive && !p.eliminated) activeTeams.add(p.team);
  });

  if (activeTeams.size <= 1) {
    const winningTeam = Array.from(activeTeams)[0] || roomState.team;
    const champPlayer = roomState.players.find(p => p.team === winningTeam && p.alive && !p.eliminated) || roomState.players[0];

    clearInterval(autonomousTournamentTicker);
    clearInterval(humanRoomWaitInterval);
    clearInterval(mmWaitPollInterval);

    window.ZHSound?.play("victory");

    const didWeWin = winningTeam === roomState.team;
    if (didWeWin) {
      if (window.ZHWallet) window.ZHWallet.addTokens(1000);
      else {
        const cur = Number(localStorage.getItem("zh_bounty_tokens") || 5000);
        localStorage.setItem("zh_bounty_tokens", String(cur + 1000));
      }
    }

    const modal = $("championModal");
    if (modal) {
      if ($("championTeamTitle")) $("championTeamTitle").textContent = `${winningTeam} VICTORIOUS`;
      if ($("championPlayerName")) $("championPlayerName").textContent = champPlayer.name;
      if ($("championAvatar")) $("championAvatar").src = AVATAR_PATH + (champPlayer.avatar || "char1.jpg");
      if ($("championDesc")) {
        $("championDesc").textContent = didWeWin
          ? "🎉 YOUR SQUAD WON THE TOURNAMENT! +1,000 🪙 BOUNTY TOKENS CREDITED!"
          : `${winningTeam} outlasted all other squads across the tournament.`;
      }
      if ($("championLobbyBtn")) {
        $("championLobbyBtn").onclick = leaveGameToLobby;
      }
      modal.classList.remove("hidden");
    }

    localStorage.removeItem("zh_team_room_state");
    localStorage.removeItem("zh_return_from_round");
    return true;
  }
  return false;
}

function simulateCardGameLogic(botA, botB) {
  if (!botA || !botB) return;

  botA.numberCards = Array.isArray(botA.numberCards) ? botA.numberCards : [];
  botB.numberCards = Array.isArray(botB.numberCards) ? botB.numberCards : [];

  const suitKeys = ["hearts", "diamonds", "clubs", "spades"];
  const roundSuit = suitKeys[Math.floor(Math.random() * suitKeys.length)];

  const scoreA = botA.numberCards.filter(c => c && c.suit === roundSuit).reduce((s, c) => s + (Number(c.value) || 0), 0);
  const scoreB = botB.numberCards.filter(c => c && c.suit === roundSuit).reduce((s, c) => s + (Number(c.value) || 0), 0);

  if (scoreA === scoreB) return;

  let winner = scoreA > scoreB ? botA : botB;
  let loser = winner === botA ? botB : botA;

  if (loser.numberCards.length > 0) {
    const stolen = loser.numberCards.pop();
    if (stolen) winner.numberCards.push(stolen);
  }

  if (getTotalCardsCount(loser) === 0) {
    loser.alive = false;
    loser.eliminated = true;
    loser.isZombie = false;

    if (!roomState.eliminatedTeams) roomState.eliminatedTeams = {};
    if (!roomState.eliminatedTeams[loser.team]) roomState.eliminatedTeams[loser.team] = [];
    roomState.eliminatedTeams[loser.team].push({
      name: loser.name,
      avatar: loser.avatar,
      reason: "NO CARDS"
    });

    addChatMessage("HQ RECON", `Broadcast: ${loser.name} (${loser.team}) has been ELIMINATED!`, false);
  } else {
    if (winner.team === roomState.team) {
      addChatMessage(winner.name, `Won duel vs ${loser.name}! Claimed 1 card.`, false);
    } else if (loser.team === roomState.team) {
      addChatMessage(loser.name, `Lost a card to ${winner.name}. Back in room.`, false);
    }
  }
}

function triggerAutonomousBackgroundCycles() {
  if (!roomState || !Array.isArray(roomState.players)) return;
  const now = Date.now();
  let stateChanged = false;

  if (!Array.isArray(roomState.ongoingBotMatches)) roomState.ongoingBotMatches = [];

  for (let i = 0; i < roomState.ongoingBotMatches.length; i++) {
    const match = roomState.ongoingBotMatches[i];
    if (!match.resolved && now >= match.finishTimestamp) {
      match.resolved = true;
      stateChanged = true;

      const botA = roomState.players.find(p => p.id === match.botAId);
      const botB = roomState.players.find(p => p.id === match.botBId);

      if (botA && botB && botA.alive && botB.alive) {
        simulateCardGameLogic(botA, botB);
      }
    }
  }

  roomState.ongoingBotMatches = roomState.ongoingBotMatches.filter(m => !m.resolved);

  if (checkTournamentFinishedInRoom()) return;

  const aliveBots = roomState.players.filter(p => p.alive && !p.eliminated && !p.isHuman);
  const freeBots = aliveBots.filter(b => !isPlayerCurrentlyBattling(b.id) && getTotalCardsCount(b) > 0);

  if (freeBots.length >= 2) {
    const matchCounts = roomState.opponentMatchCounts || {};
    const shuffled = [...freeBots].sort(() => Math.random() - 0.5);
    const paired = new Set();

    for (let i = 0; i < shuffled.length; i++) {
      const b1 = shuffled[i];
      if (paired.has(b1.id)) continue;

      const enemies = shuffled.filter(cand => cand.id !== b1.id && cand.team !== b1.team && !paired.has(cand.id));
      if (!enemies.length) continue;

      let minCount = Infinity;
      enemies.forEach(e => {
        const c = matchCounts[e.id] || 0;
        if (c < minCount) minCount = c;
      });

      const pool = enemies.filter(e => (matchCounts[e.id] || 0) === minCount);
      const b2 = pool[Math.floor(Math.random() * pool.length)];

      if (b2) {
        paired.add(b1.id);
        paired.add(b2.id);

        const naturalDuration = (Math.floor(Math.random() * 4) + 4) * 1000;
        roomState.ongoingBotMatches.push({
          botAId: b1.id,
          botBId: b2.id,
          finishTimestamp: now + naturalDuration,
          resolved: false
        });

        matchCounts[b1.id] = (matchCounts[b1.id] || 0) + 1;
        matchCounts[b2.id] = (matchCounts[b2.id] || 0) + 1;
        stateChanged = true;
      }
    }
  }

  if (stateChanged) {
    localStorage.setItem("zh_team_room_state", JSON.stringify(roomState));
    renderTeam();
    renderTournamentStandings();
  }
}

function startAutonomousTicker() {
  clearInterval(autonomousTournamentTicker);
  autonomousTournamentTicker = setInterval(triggerAutonomousBackgroundCycles, 1000);
}

function renderTeam() {
  const container = $("teamGrid");
  if (!container) return;

  const members = getTeamMembers();
  const spectator = viewerIsEliminated();

  container.innerHTML = members.map(member => {
    const you = member.id === (roomState.spectatorViewerId || roomState.humanPlayerId);
    const active = member.alive && !member.eliminated;
    const battling = active && !you && isPlayerCurrentlyBattling(member.id);

    // FIXED SPECTATOR RULE: Eliminated player can watch their own surviving teammates!
    const canWatch = spectator && active && !you;
    const avatarSrc = `${AVATAR_PATH}${escapeHTML(member.avatar || "char1.jpg")}`;

    let statusClass = "status-alive";
    let statusText = `● IN ROOM (${getTotalCardsCount(member)} CARDS)`;

    if (!active) {
      statusClass = "status-dead";
      statusText = "☠ ELIMINATED";
    } else if (battling) {
      statusClass = "status-battling";
      statusText = "⚔ IN BATTLE...";
    }

    return `
      <div class="team-member ${statusClass}">
        <div class="member-avatar-wrap">
          <img src="${avatarSrc}" onerror="this.onerror=null; this.src='${FALLBACK_AVATAR}';" alt="${escapeHTML(member.name)}">
          ${canWatch ? `<button type="button" class="spectate-icon" data-watch-id="${escapeHTML(member.id)}" title="Watch Teammate Live">▶</button>` : ""}
        </div>
        <div class="member-info">
          <strong>${escapeHTML(member.name)} ${you ? "(YOU)" : ""}</strong>
          <span class="status-tag">${statusText}</span>
          <small>${you ? "SQUAD LEADER" : "SQUAD ALLY"}</small>
        </div>
      </div>
    `;
  }).join("");

  container.querySelectorAll("[data-watch-id]").forEach(btn => {
    btn.addEventListener("click", () => startSpectating(btn.dataset.watchId));
  });

  const activeCount = members.filter(m => m.alive && !m.eliminated).length;
  if ($("onlineCount")) $("onlineCount").textContent = activeCount;
}

function renderTournamentStandings() {
  const container = $("standingsGrid");
  if (!container || !roomState || !Array.isArray(roomState.players)) return;

  const myTeam = roomState.team || localStorage.getItem("zh_custom_team_name") || "TEAM B";
  const teams = Array.isArray(roomState.teamNames) && roomState.teamNames.length === 4
    ? roomState.teamNames
    : ["TEAM A", myTeam, "TEAM C", "TEAM D"];

  container.innerHTML = teams.map(tName => {
    const aliveCount = roomState.players.filter(p => p.team === tName && p.alive && !p.eliminated).length;
    const isEliminated = aliveCount === 0;

    return `
      <button type="button" class="standing-card ${isEliminated ? "eliminated-team" : "active-team"}" data-team="${escapeHTML(tName)}">
        <strong>${escapeHTML(tName)}</strong>
        <small>${isEliminated ? "☠ DEFEATED" : `● ${aliveCount}/4 ALIVE`}</small>
      </button>
    `;
  }).join("");

  container.querySelectorAll("[data-team]").forEach(btn => {
    btn.addEventListener("click", () => openTeamRosterModal(btn.dataset.team));
  });
}

function openTeamRosterModal(teamName) {
  if (!roomState || !Array.isArray(roomState.players)) return;

  const modal = $("teamModal");
  const title = $("modalTeamTitle");
  const list = $("rosterList");
  if (!modal || !list) return;

  if (title) title.textContent = `${teamName} ROSTER`;

  const teamPlayers = roomState.players.filter(p => p.team === teamName);
  const spectator = viewerIsEliminated();
  const teamDead = myTeamIsCompletelyEliminated();

  list.innerHTML = teamPlayers.map(p => {
    const active = p.alive && !p.eliminated;
    const battling = active && isPlayerCurrentlyBattling(p.id);
    const isYou = p.id === (roomState.spectatorViewerId || roomState.humanPlayerId);
    const avatarSrc = `${AVATAR_PATH}${escapeHTML(p.avatar || "char1.jpg")}`;

    // Can watch own team if eliminated, OR can watch rival teams ONLY once own team is wiped out!
    const canSpectate = spectator && active && !isYou && (p.team === roomState.team || teamDead);

    let itemClass = active ? "alive" : "dead";
    let badgeClass = active ? "badge-alive" : "badge-dead";
    let badgeText = active ? (battling ? "IN BATTLE" : "IN ROOM") : "ELIMINATED";

    if (battling) {
      itemClass = "battling";
      badgeClass = "badge-battling";
    }

    return `
      <div class="roster-item ${itemClass}">
        <img src="${avatarSrc}" onerror="this.onerror=null; this.src='${FALLBACK_AVATAR}';" alt="${escapeHTML(p.name)}">
        <div class="roster-info">
          <strong>${escapeHTML(p.name)} ${isYou ? "(YOU)" : ""}</strong>
          <small>${p.team} • ${p.isHuman ? "HUMAN" : "BOT"}</small>
        </div>
        <div class="roster-right">
          <span class="roster-badge ${badgeClass}">${badgeText}</span>
          ${canSpectate ? `<button type="button" class="roster-spectate-btn" data-watch-id="${escapeHTML(p.id)}">WATCH ▶</button>` : ""}
        </div>
      </div>
    `;
  }).join("");

  list.querySelectorAll("[data-watch-id]").forEach(btn => {
    btn.addEventListener("click", () => startSpectating(btn.dataset.watchId));
  });

  modal.classList.remove("hidden");
}

function closeTeamRosterModal() {
  $("teamModal")?.classList.add("hidden");
}

$("closeTeamModal")?.addEventListener("click", closeTeamRosterModal);
$("closeModalBackdrop")?.addEventListener("click", closeTeamRosterModal);

function renderIntel() {
  const list = $("knownList");
  if (!list) return;

  list.innerHTML = "";
  if ($("intelCount")) $("intelCount").textContent = intel.length;

  if (!intel.length) {
    list.innerHTML = `
      <div class="known-card">
        <strong>NO INTEL YET</strong>
        <p>Encounter opponents on the battlefield to gather combat intelligence.</p>
      </div>
    `;
    return;
  }

  intel.slice().reverse().forEach(info => {
    const opponent = info.opponent || {};
    const specialUsed = Array.isArray(opponent.specialUsed) ? opponent.specialUsed : [];

    let message = `Round ${info.round}: encountered ${opponent.name || "UNKNOWN"}.`;
    if (opponent.isZombie) message += " Confirmed ZOMBIE.";
    if (specialUsed.length) message += ` Used: ${specialUsed.join(", ").toUpperCase()}.`;

    const opponentAvatar = `${AVATAR_PATH}${escapeHTML(opponent.avatar || "char2.jpg")}`;

    list.insertAdjacentHTML("beforeend", `
      <div class="known-card">
        <div class="known-top">
          <img src="${opponentAvatar}" onerror="this.onerror=null; this.src='${FALLBACK_AVATAR}';" alt="${escapeHTML(opponent.name || "Opponent")}">
          <div>
            <strong>${escapeHTML(opponent.name || "UNKNOWN")}</strong>
            <small>${escapeHTML(opponent.team || "UNKNOWN TEAM")}</small>
          </div>
        </div>
        <p>${escapeHTML(message)}</p>
      </div>
    `);
  });
}

const CHAT_KEY = "zh_team_chat";

function loadChat() {
  try {
    const messages = JSON.parse(localStorage.getItem(CHAT_KEY) || "[]");
    return Array.isArray(messages) ? messages : [];
  } catch {
    return [];
  }
}

function saveChat(messages) {
  localStorage.setItem(CHAT_KEY, JSON.stringify(messages.slice(-100)));
}

function renderChat() {
  const container = $("chatMessages");
  if (!container) return;

  const messages = loadChat();
  container.innerHTML = messages.map(msg => `
    <div class="chat-message ${msg.mine ? "mine" : ""}">
      <div class="chat-name">${escapeHTML(msg.name)}</div>
      <div class="chat-bubble">${escapeHTML(msg.text)}</div>
    </div>
  `).join("");

  container.scrollTop = container.scrollHeight;
}

function addChatMessage(name, text, mine = false) {
  if (!text || !text.trim()) return;
  const messages = loadChat();
  messages.push({ name, text: text.trim(), mine, time: Date.now() });
  saveChat(messages);
  renderChat();
}

function addBotMessage(name, text) {
  setTimeout(() => { addChatMessage(name, text, false); }, 600 + Math.random() * 900);
}

function generateIntelChat() {
  if (!intel.length) return;
  const newest = intel[intel.length - 1];
  if (!newest || !newest.opponent) return;

  const opponent = newest.opponent;
  const teammates = getTeamMembers().filter(m => !m.isHuman && m.alive && !m.eliminated);
  if (!teammates.length) return;

  const bot = teammates[Math.floor(Math.random() * teammates.length)];
  if (opponent.isZombie) {
    addBotMessage(bot.name, `Alert Squad! ${opponent.name} is a confirmed ZOMBIE! Use Shotgun or Vaccine!`);
  } else {
    addBotMessage(bot.name, `${opponent.name} was HUMAN in the last duel.`);
  }
}

$("chatForm")?.addEventListener("submit", event => {
  event.preventDefault();
  const input = $("chatInput");
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  const me = getTeamMembers().find(m => m.isHuman);
  addChatMessage(me?.name || "SURVIVOR", text, true);
  input.value = "";
});

function generateAndLockNextPairings() {
  if (!roomState || !Array.isArray(roomState.players)) return { pairs: [], solos: [] };

  const alive = roomState.players.filter(p => p.alive && !p.eliminated);
  const matchCounts = roomState.opponentMatchCounts || {};

  const primaryId = roomState.spectatorTargetId || roomState.humanPlayerId;
  const primaryHero = alive.find(p => p.id === primaryId) || alive.find(p => p.isHuman) || alive[0];

  const pairs = [];
  const pairedIds = new Set();

  if (primaryHero) {
    const possibleOpponents = alive.filter(p =>
      p.id !== primaryHero.id &&
      p.team !== primaryHero.team &&
      getTotalCardsCount(p) > 0
    );

    if (possibleOpponents.length > 0) {
      let minCount = Infinity;
      possibleOpponents.forEach(p => {
        const count = matchCounts[p.id] || 0;
        if (count < minCount) minCount = count;
      });

      let pool = possibleOpponents.filter(p => (matchCounts[p.id] || 0) === minCount);
      const chosenOpponent = pool[Math.floor(Math.random() * pool.length)];

      pairedIds.add(primaryHero.id);
      pairedIds.add(chosenOpponent.id);

      pairs.push({
        a: primaryHero,
        b: chosenOpponent,
        aId: primaryHero.id,
        bId: chosenOpponent.id
      });

      localStorage.setItem("zh_next_opponent_id", chosenOpponent.id);
    }
  }

  const remainingBots = alive.filter(p => !pairedIds.has(p.id)).sort(() => Math.random() - 0.5);

  for (let i = 0; i < remainingBots.length; i++) {
    const p1 = remainingBots[i];
    if (pairedIds.has(p1.id)) continue;

    const enemies = remainingBots.filter(cand => cand.id !== p1.id && cand.team !== p1.team && !pairedIds.has(cand.id));
    if (!enemies.length) continue;

    let minCount = Infinity;
    enemies.forEach(e => {
      const c = matchCounts[e.id] || 0;
      if (c < minCount) minCount = c;
    });

    const pool = enemies.filter(e => (matchCounts[e.id] || 0) === minCount);
    const p2 = pool[Math.floor(Math.random() * pool.length)];

    if (p2) {
      pairedIds.add(p1.id);
      pairedIds.add(p2.id);
      pairs.push({ a: p1, b: p2, aId: p1.id, bId: p2.id });
    }
  }

  const solos = alive.filter(p => !pairedIds.has(p.id));
  localStorage.setItem("zh_locked_pairings", JSON.stringify(pairs));

  return { pairs, solos };
}

function openMatchmakingModal() {
  clearInterval(humanRoomWaitInterval);
  clearInterval(humanLockInterval);
  clearInterval(mmWaitPollInterval);

  const modal = $("matchmakingModal");
  const container = $("pairingsList");
  const desc = $("matchmakingDesc");
  const timerEl = $("autoTimer");
  const startBtn = $("startBattleBtn");

  if (!modal || !container) return;
  modal.classList.remove("hidden");

  const now = Date.now();
  if (Array.isArray(roomState?.ongoingBotMatches)) {
    roomState.ongoingBotMatches.forEach(m => {
      if (now >= m.finishTimestamp) m.resolved = true;
    });
    roomState.ongoingBotMatches = roomState.ongoingBotMatches.filter(m => !m.resolved);
  }

  if (!areAllAlivePlayersFree()) {
    if (desc) desc.textContent = "Concluding ongoing battle duels...";
    if (timerEl) timerEl.textContent = "WAITING...";
    if (startBtn) startBtn.disabled = true;

    container.innerHTML = `<div class="matchmaking-waiting">⏳ BATTLES IN PROGRESS... FINALIZING DUELS</div>`;

    let maxPoll = 2;
    mmWaitPollInterval = setInterval(() => {
      triggerAutonomousBackgroundCycles();
      maxPoll--;
      if (areAllAlivePlayersFree() || maxPoll <= 0) {
        clearInterval(mmWaitPollInterval);
        performMatchmakingSequence();
      }
    }, 1000);
    return;
  }

  performMatchmakingSequence();
}

function performMatchmakingSequence() {
  const container = $("pairingsList");
  const desc = $("matchmakingDesc");
  const timerEl = $("autoTimer");

  if (desc) desc.textContent = "All players ready! Pairing opponents...";
  mmMaxWaitSeconds = 1;
  if (timerEl) timerEl.textContent = `MATCHING... (${mmMaxWaitSeconds}s)`;

  clearInterval(mmMaxWaitInterval);
  mmMaxWaitInterval = setInterval(() => {
    mmMaxWaitSeconds--;
    if (mmMaxWaitSeconds <= 0) {
      clearInterval(mmMaxWaitInterval);
      renderPairingCards(container);
      if (desc) desc.textContent = "Pairings locked! Launching in 3 seconds...";
      startFinal321Countdown();
    }
  }, 800);
}

function renderPairingCards(container) {
  const { pairs, solos } = generateAndLockNextPairings();

  container.innerHTML = pairs.map(({ a, b }) => `
    <div class="pairing-card">
      <div class="pairing-side left">
        <img src="${AVATAR_PATH}${escapeHTML(a.avatar || "char1.jpg")}" onerror="this.src='${FALLBACK_AVATAR}'">
        <div class="pairing-info">
          <strong>${escapeHTML(a.name)}</strong>
          <small>${escapeHTML(a.team)}</small>
        </div>
      </div>
      <div class="pairing-vs">VS</div>
      <div class="pairing-side right">
        <div class="pairing-info">
          <strong>${escapeHTML(b.name)}</strong>
          <small>${escapeHTML(b.team)}</small>
        </div>
        <img src="${AVATAR_PATH}${escapeHTML(b.avatar || "char2.jpg")}" onerror="this.src='${FALLBACK_AVATAR}'">
      </div>
    </div>
  `).join("");

  if (solos.length) {
    container.innerHTML += solos.map(solo => `
      <div class="pairing-single">${escapeHTML(solo.name)} (${escapeHTML(solo.team)}) — BYE ROUND (RESERVE)</div>
    `).join("");
  }
}

function startFinal321Countdown() {
  const timerEl = $("autoTimer");
  const startBtn = $("startBattleBtn");

  launchCountdownSeconds = 3;
  if (startBtn) startBtn.disabled = false;

  clearInterval(launchCountdownInterval);
  launchCountdownInterval = setInterval(() => {
    if (timerEl) timerEl.textContent = `LAUNCH IN: ${launchCountdownSeconds}s`;
    if (startBtn) startBtn.querySelector("span").textContent = `ENTERING IN ${launchCountdownSeconds}s...`;

    launchCountdownSeconds--;
    if (launchCountdownSeconds < 0) {
      clearInterval(launchCountdownInterval);
      proceedToNextBattle();
    }
  }, 1000);
}

function proceedToNextBattle() {
  clearInterval(humanRoomWaitInterval);
  clearInterval(launchCountdownInterval);
  clearInterval(mmWaitPollInterval);
  clearInterval(autonomousTournamentTicker);

  if (viewerIsEliminated()) {
    const activeTeammate = getTeamMembers().find(m => m.alive && !m.eliminated && m.id !== getViewer()?.id);
    if (activeTeammate) {
      startSpectating(activeTeammate.id);
      return;
    }
    const anyAlive = anyActiveBotInTournament();
    if (anyAlive) {
      startSpectating(anyAlive.id);
      return;
    }
    leaveGameToLobby();
    return;
  }

  localStorage.setItem("zh_return_from_round", "true");
  window.location.href = "../bot-game.html";
}

$("startBattleBtn")?.addEventListener("click", proceedToNextBattle);

function setupAutoReadyToggle() {
  const toggle = $("autoReadyToggle");
  if (!toggle) return;

  toggle.checked = localStorage.getItem(AUTO_READY_KEY) === "true";
  toggle.addEventListener("change", () => {
    localStorage.setItem(AUTO_READY_KEY, toggle.checked ? "true" : "false");
    if (toggle.checked && humanRoomWaitInterval && !viewerIsEliminated()) {
      clearInterval(humanRoomWaitInterval);
      openMatchmakingModal();
    }
  });
}

function startTeamRoomSequences() {
  const btn = $("actionBtn");
  const btnText = $("actionBtnText");
  const footerText = $("footerStatusText");

  humanLockSeconds = 3;
  if (btn) btn.disabled = true;

  clearInterval(humanLockInterval);
  humanLockInterval = setInterval(() => {
    if (btnText) btnText.textContent = `WAIT (${humanLockSeconds}s)`;
    humanLockSeconds--;
    if (humanLockSeconds < 0) {
      clearInterval(humanLockInterval);
      if (btn) btn.disabled = false;

      const spectator = viewerIsEliminated();
      const teamDead = myTeamIsCompletelyEliminated();

      if (spectator) {
        if (btnText) btnText.textContent = teamDead ? "👁 SPECTATE RIVAL TEAMS" : "👁 WATCH TEAMMATE";
        if (footerText) footerText.textContent = "SPECTATOR MODE: WATCH YOUR SQUAD OR REST IN ROOM";
        return;
      }

      if (localStorage.getItem(AUTO_READY_KEY) === "true") {
        if (btnText) btnText.textContent = "AUTO READY...";
        setTimeout(openMatchmakingModal, 350);
      } else {
        startHuman60SecondRoomTimer();
      }
    }
  }, 1000);
}

function startHuman60SecondRoomTimer() {
  const btnText = $("actionBtnText");
  const footerText = $("footerStatusText");
  humanRoomWaitSeconds = 60;

  if (btnText) btnText.textContent = `READY (${humanRoomWaitSeconds}s)`;
  if (footerText) footerText.textContent = `ROOM STANDBY: AUTO-READY IN ${humanRoomWaitSeconds}s`;

  clearInterval(humanRoomWaitInterval);
  humanRoomWaitInterval = setInterval(() => {
    humanRoomWaitSeconds--;
    if (btnText) btnText.textContent = `READY (${humanRoomWaitSeconds}s)`;
    if (footerText) footerText.textContent = `ROOM STANDBY: AUTO-READY IN ${humanRoomWaitSeconds}s`;

    if (humanRoomWaitSeconds <= 0) {
      clearInterval(humanRoomWaitInterval);
      openMatchmakingModal();
    }
  }, 1000);
}

$("actionBtn")?.addEventListener("click", () => {
  clearInterval(humanRoomWaitInterval);
  if (viewerIsEliminated()) {
    const activeTeammate = getTeamMembers().find(m => m.alive && !m.eliminated && m.id !== getViewer()?.id);
    if (activeTeammate) return startSpectating(activeTeammate.id);
    const anyAlive = anyActiveBotInTournament();
    if (anyAlive) return startSpectating(anyAlive.id);
    return;
  }
  openMatchmakingModal();
});

function initTeamRoom() {
  if (!roomState || !Array.isArray(roomState.players) || roomState.players.length === 0) {
    window.location.href = "../bot-game.html";
    return;
  }

  if ($("teamName")) $("teamName").textContent = roomState.team || "TEAM B";
  const nextRound = Number(roomState.round || 1);
  if ($("nextRound")) $("nextRound").textContent = nextRound;
  if ($("roundLabel")) $("roundLabel").textContent = `ROUND ${nextRound}`;

  const spectator = viewerIsEliminated();
  const teamDead = myTeamIsCompletelyEliminated();

  if ($("spectatorBanner")) {
    $("spectatorBanner").classList.toggle("hidden", !spectator);
    if (teamDead) {
      if ($("bannerTitle")) $("bannerTitle").textContent = "☠ YOUR ENTIRE TEAM IS DEFEATED";
      if ($("bannerSub")) $("bannerSub").textContent = "You can now spectate all opposing teams, or leave to lobby.";
    }
  }

  renderTeam();
  renderTournamentStandings();
  renderIntel();
  renderChat();
  setupAutoReadyToggle();
  startTeamRoomSequences();
  startAutonomousTicker();

  const botChatKey = `zh_team_room_announced_${nextRound}`;
  if (!sessionStorage.getItem(botChatKey)) {
    sessionStorage.setItem(botChatKey, "true");
    generateIntelChat();
  }
}

initTeamRoom();