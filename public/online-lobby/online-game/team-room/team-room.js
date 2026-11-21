/* =========================================================
   ZOMBIE HUNT — UPGRADED ONLINE SQUAD WAR ROOM (team-room.js)
   Location: public/online-lobby/online-game/team-room/team-room.js
========================================================= */

const $ = id => document.getElementById(id);

const AVATAR_PATH = "../../../profile/avatars/";
const FALLBACK_AVATAR = "../../../profile/avatars/char1.jpg";
const AUTO_READY_KEY = "zh_online_auto_ready";

let playerSessionId = localStorage.getItem("zh_player_session_id") || `zh_user_${Date.now()}`;
let customTeamName = (localStorage.getItem("zh_custom_team_name") || "TEAM B").trim().toUpperCase();

let roomState = {
  team: customTeamName,
  round: 2,
  players: [],
  squadNames: {}
};

let currentTournamentMatches = [];
let isPlayerReady = false;
let isGrantedBye = false;
let roomRewardClaimed = false;
let inspectedRoomPlayer = null;

let initialLockSeconds = 3;
let initialLockInterval = null;
let autoMarkTimeoutSeconds = 30;
let autoMarkTimeoutInterval = null;
let launchCountdownSeconds = 3;
let launchCountdownInterval = null;

function normalizeAvatar(avatar) {
  if (!avatar || typeof avatar !== "string") return "char1.jpg";
  if (avatar.startsWith("data:image/")) return avatar;
  let clean = avatar.trim().replace(/\\/g, "/").split("/").pop();
  return /^(char[1-9]|char1[0-7])\.jpg$/i.test(clean) ? clean.toLowerCase() : "char1.jpg";
}

function resolveRoomAvatar(avatarStr, isMe = false) {
  if (isMe && window.ZHAuth) {
    return window.ZHAuth.resolvePlayerAvatarSrc(AVATAR_PATH, avatarStr);
  }
  if (typeof avatarStr === "string" && avatarStr.startsWith("data:image/")) {
    return avatarStr;
  }
  return AVATAR_PATH + normalizeAvatar(avatarStr);
}

function getSITier(ratio) {
  if (ratio >= 4.0) return "APEX PREDATOR";
  if (ratio >= 2.5) return "ELITE SURVIVOR";
  if (ratio >= 1.5) return "VETERAN";
  if (ratio >= 1.0) return "SURVIVOR";
  return "RECRUIT";
}

function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = String(text ?? "");
  return div.innerHTML;
}

let socket = null;

function initTeamRoomSocket() {
  if (typeof io === "undefined") return;
  socket = io(window.location.origin, { transports: ["websocket", "polling"] });

  socket.on("connect", () => {
    socket.emit("join_team_room", { sessionId: playerSessionId });
  });

  socket.on("team_room_synced", (data) => {
    if (data.customTeamName) {
      customTeamName = data.customTeamName;
      roomState.team = customTeamName;
      localStorage.setItem("zh_custom_team_name", customTeamName);
    }
    if (data.round) roomState.round = data.round;
    if (data.allPlayers) roomState.players = data.allPlayers;
    if (data.squadNames) roomState.squadNames = data.squadNames;

    const viewer = getViewer();
    if (viewer && viewer.alive === false) {
      localStorage.setItem("zh_player_is_alive", "false");
    }

    isGrantedBye = !!(data.isBye || data.byePlayerSessionId === playerSessionId);

    const myTeamKey = viewer ? viewer.team : (data.teamKey || "TEAM B");
    if (window.ZHVoice) {
      window.ZHVoice.joinChannel(socket, `squad_${myTeamKey}`, false);
    }

    updateHeaderUI();
    renderTeam();
    renderTournamentStandings();
    renderSurveillanceIntel(data.activeMatchesCount || 0);
    updateActionControls();
    startRoomReadySequences();
  });

  socket.on("round_bye_granted", () => {
    isGrantedBye = true;
    showByeReserveModal();
  });

  socket.on("tournament_state_sync", (data) => {
    if (data.allPlayers) roomState.players = data.allPlayers;
    if (data.squadNames) roomState.squadNames = data.squadNames;
    if (data.round) roomState.round = data.round;
    if (Array.isArray(data.byePlayerSessionIds)) {
      isGrantedBye = data.byePlayerSessionIds.includes(playerSessionId);
    }

    const viewer = getViewer();
    if (viewer && viewer.alive === false) {
      localStorage.setItem("zh_player_is_alive", "false");
    }

    updateHeaderUI();
    renderTeam();
    renderTournamentStandings();
    renderSurveillanceIntel(data.activeMatchesCount || 0);
    updateActionControls();
    updateWaitingBarrierModal();
  });

  socket.on("next_round_pairings_ready", (data) => {
    $("waitingBarrierModal")?.classList.add("hidden");

    if (viewerIsEliminated()) {
      isPlayerReady = false;
      $("matchmakingModal")?.classList.add("hidden");
      updateActionControls();
      return;
    }

    if (data.byePlayerSessionIds && data.byePlayerSessionIds.includes(playerSessionId)) {
      isGrantedBye = true;
      showByeReserveModal();
      return;
    }

    isGrantedBye = false;
    currentTournamentMatches = data.pairings || [];
    showAllMatchmakingModal();
  });

  socket.on("tournament_won", (data) => {
    clearInterval(initialLockInterval);
    clearInterval(autoMarkTimeoutInterval);
    clearInterval(launchCountdownInterval);
    window.ZHVoice?.leaveChannel();
    $("waitingBarrierModal")?.classList.add("hidden");
    $("matchmakingModal")?.classList.add("hidden");
    showTeamRoomVictoryCeremony(data);
  });

  socket.on("receive_squad_chat", (msg) => {
    const tag = msg.isAlive === false ? `${msg.senderName} (☠ SPECTATOR)` : msg.senderName;
    appendChatMessage(tag, msg.text, msg.senderSessionId === playerSessionId);
  });
}

$("squadMicBtn")?.addEventListener("click", async () => {
  if (!window.ZHVoice) return;
  const active = await window.ZHVoice.toggleMic();
  const btn = $("squadMicBtn");
  if (btn) {
    btn.textContent = active ? "🎙️ SQUAD MIC LIVE" : "🎙️ SQUAD MIC OFF";
    btn.style.background = active ? "#2e7d5b" : "#fff";
    btn.style.color = active ? "#fff" : "";
  }
});

$("squadSpeakerBtn")?.addEventListener("click", () => {
  if (!window.ZHVoice) return;
  const unmuted = window.ZHVoice.toggleSpeaker();
  const btn = $("squadSpeakerBtn");
  if (btn) {
    btn.textContent = unmuted ? "🔊 AUDIO ON" : "🔇 MUTED";
  }
});

$("openEnemySectorsBtn")?.addEventListener("click", () => $("enemySectorsModal")?.classList.remove("hidden"));
$("closeEnemySectorsBtn")?.addEventListener("click", () => $("enemySectorsModal")?.classList.add("hidden"));
$("closeEnemySectorsBackdrop")?.addEventListener("click", () => $("enemySectorsModal")?.classList.add("hidden"));

function showByeReserveModal() {
  clearInterval(initialLockInterval);
  clearInterval(autoMarkTimeoutInterval);
  $("waitingBarrierModal")?.classList.add("hidden");
  $("matchmakingModal")?.classList.add("hidden");

  const btn = $("actionBtn");
  const btnText = $("actionBtnText");
  if (btn) {
    btn.disabled = true;
    btn.style.opacity = "0.7";
    btn.style.cursor = "not-allowed";
  }
  if (btnText) btnText.textContent = "🛡 ROUND BYE (RESERVE)";
  showToast("ODD OPERATIVES: You are held in Combat Reserve for this round!");
}

function getTeamMembers() {
  if (!Array.isArray(roomState.players)) return [];
  const myPlayer = roomState.players.find(p => p.sessionId === playerSessionId);
  const myTeamKey = myPlayer ? myPlayer.team : (localStorage.getItem("zh_assigned_team_key") || "TEAM B");
  return roomState.players.filter(p => p.team === myTeamKey);
}

function getViewer() {
  if (!Array.isArray(roomState.players)) return null;
  return roomState.players.find(p => p.sessionId === playerSessionId) || roomState.players[0];
}

function viewerIsEliminated() {
  const viewer = getViewer();
  return viewer ? viewer.alive === false : (localStorage.getItem("zh_player_is_alive") === "false");
}

function myTeamIsCompletelyEliminated() {
  const members = getTeamMembers();
  return members.length > 0 && members.every(m => m.alive === false);
}

function startSpectating(targetSessionId) {
  window.ZHVoice?.leaveChannel();
  localStorage.setItem("zh_spectator_mode", "true");
  if (targetSessionId) {
    localStorage.setItem("zh_spectator_target_id", targetSessionId);
  }
  window.location.href = "../online-game.html";
}

function leaveGameToLobby() {
  clearInterval(initialLockInterval);
  clearInterval(autoMarkTimeoutInterval);
  clearInterval(launchCountdownInterval);
  window.ZHVoice?.leaveChannel();

  if (socket && socket.connected) {
    socket.emit("forfeit_match", { sessionId: playerSessionId });
    socket.disconnect();
  }

  localStorage.removeItem("zh_player_session_id");
  localStorage.removeItem("zh_online_room_state");
  localStorage.removeItem("zh_spectator_mode");
  localStorage.removeItem("zh_player_is_alive");
  window.location.href = "../../../index.html";
}

$("leaveGameBtn")?.addEventListener("click", leaveGameToLobby);
$("leaveBottomBtn")?.addEventListener("click", leaveGameToLobby);

function updateActionControls() {
  const btn = $("actionBtn");
  const btnText = $("actionBtnText");
  const autoReadyBox = document.querySelector(".auto-ready-box");
  if (!btn || !btnText) return;

  if (viewerIsEliminated()) {
    clearInterval(initialLockInterval);
    clearInterval(autoMarkTimeoutInterval);
    if (autoReadyBox) autoReadyBox.style.display = "none";
    btn.disabled = false;
    btn.style.opacity = "1";
    btn.style.cursor = "pointer";
    btn.style.background = "#54758b";
    btnText.textContent = myTeamIsCompletelyEliminated() ? "👁 SPECTATE RIVAL DUELS (SILENT)" : "👁 SPECTATE SURVIVING TEAM";
  } else {
    if (autoReadyBox) autoReadyBox.style.display = "flex";
  }
}

function startRoomReadySequences() {
  if (isGrantedBye) return;
  if (viewerIsEliminated()) {
    updateActionControls();
    return;
  }

  const btn = $("actionBtn");
  const btnText = $("actionBtnText");
  if (!btn || !btnText) return;

  initialLockSeconds = 3;
  btn.disabled = true;
  btn.style.opacity = "0.6";
  btn.style.cursor = "not-allowed";
  btnText.textContent = `WAIT (${initialLockSeconds}s)`;

  clearInterval(initialLockInterval);
  initialLockInterval = setInterval(() => {
    initialLockSeconds--;
    if (initialLockSeconds > 0) {
      btnText.textContent = `WAIT (${initialLockSeconds}s)`;
    } else {
      clearInterval(initialLockInterval);
      if (localStorage.getItem(AUTO_READY_KEY) === "true") {
        btnText.textContent = "AUTO READY...";
        setTimeout(markPlayerReady, 200);
      } else {
        start30SecondsAutoFallbackTimer();
      }
    }
  }, 1000);
}

function start30SecondsAutoFallbackTimer() {
  if (isGrantedBye || isPlayerReady || viewerIsEliminated()) return;

  const btn = $("actionBtn");
  const btnText = $("actionBtnText");
  if (!btn || !btnText) return;

  btn.disabled = false;
  btn.style.opacity = "1";
  btn.style.cursor = "pointer";

  autoMarkTimeoutSeconds = 30;
  btnText.textContent = `MARK READY (${autoMarkTimeoutSeconds}s)`;

  clearInterval(autoMarkTimeoutInterval);
  autoMarkTimeoutInterval = setInterval(() => {
    autoMarkTimeoutSeconds--;
    if (autoMarkTimeoutSeconds <= 0) {
      clearInterval(autoMarkTimeoutInterval);
      btn.disabled = true;
      btn.style.opacity = "0.7";
      btn.style.cursor = "not-allowed";
      btnText.textContent = "WAITING FOR OTHERS...";
      if (!isPlayerReady && !viewerIsEliminated()) markPlayerReady();
    } else {
      btnText.textContent = `MARK READY (${autoMarkTimeoutSeconds}s)`;
    }
  }, 1000);
}

function markPlayerReady() {
  if (viewerIsEliminated()) {
    const activeTeammates = getTeamMembers().filter(m => m.alive === true && m.sessionId !== playerSessionId);
    if (activeTeammates.length > 0) {
      startSpectating(activeTeammates[0].sessionId);
    } else {
      const anyAlive = (roomState.players || []).find(p => p.alive === true);
      if (anyAlive) startSpectating(anyAlive.sessionId);
    }
    return;
  }

  if (isPlayerReady) return;
  isPlayerReady = true;

  clearInterval(initialLockInterval);
  clearInterval(autoMarkTimeoutInterval);

  const btn = $("actionBtn");
  const btnText = $("actionBtnText");
  if (btn) {
    btn.disabled = true;
    btn.style.opacity = "0.7";
    btn.style.cursor = "not-allowed";
  }
  if (btnText) btnText.textContent = "WAITING FOR OTHERS...";

  if (socket && socket.connected) {
    socket.emit("player_marked_ready", { sessionId: playerSessionId });
  }

  showWaitingBarrierModal();
}

$("actionBtn")?.addEventListener("click", markPlayerReady);

function setupAutoReadyToggle() {
  const toggle = $("autoReadyToggle");
  if (!toggle) return;
  toggle.checked = localStorage.getItem(AUTO_READY_KEY) === "true";
  toggle.addEventListener("change", () => {
    localStorage.setItem(AUTO_READY_KEY, toggle.checked ? "true" : "false");
    if (toggle.checked && initialLockSeconds <= 0 && !isPlayerReady && !viewerIsEliminated()) {
      markPlayerReady();
    }
  });
}

function renderTeam() {
  const container = $("teamGrid");
  if (!container) return;

  let members = getTeamMembers();
  if (!members.length) {
    const viewer = getViewer() || { sessionId: playerSessionId, name: "Survivor", avatar: "char1.jpg", alive: true, sectorState: "in_room" };
    members = [viewer];
  }

  const spectator = viewerIsEliminated();

  container.innerHTML = members.map(member => {
    const isYou = member.sessionId === playerSessionId;
    const isAlive = member.alive === true;
    const canWatch = spectator && isAlive && !isYou;
    const avatarSrc = resolveRoomAvatar(member.avatar, isYou);

    let statusClass = "status-alive";
    let statusText = "● IN ROOM";

    if (!isAlive) {
      statusClass = "status-dead";
      statusText = "☠ ELIMINATED (VOICE ACTIVE)";
    } else if (member.sectorState === "in_arena") {
      statusClass = "status-battling";
      statusText = "⚔ IN BATTLEGROUND";
    } else if (member.sectorState === "ready") {
      statusClass = "status-alive";
      statusText = "✓ READY FOR ROUND";
    } else if (member.sectorState === "bye_reserve") {
      statusClass = "status-alive";
      statusText = "🛡 SECTOR BYE";
    }

    return `
      <div class="squad-member-card ${isYou ? "is-you" : ""} ${!isAlive ? "member-eliminated" : ""}" data-inspect-id="${escapeHTML(member.sessionId)}">
        <div class="member-avatar-wrap">
          <img src="${avatarSrc}" onerror="this.onerror=null; this.src='${FALLBACK_AVATAR}';" alt="${escapeHTML(member.name)}" style="${!isAlive ? 'filter:grayscale(100%) opacity(0.6);' : ''}">
          ${canWatch ? `<button type="button" class="spectate-icon" data-watch-id="${escapeHTML(member.sessionId)}" title="Watch Teammate">▶</button>` : ""}
        </div>
        <div class="member-info">
          <strong>${escapeHTML(member.name)} ${isYou ? "(YOU)" : ""}</strong>
          <small>${isAlive ? "SQUAD OPERATIVE" : "ELIMINATED TEAMMATE"}</small>
        </div>
        <span class="status-tag ${statusClass}">${statusText}</span>
      </div>
    `;
  }).join("");

  container.querySelectorAll("[data-inspect-id]").forEach(card => {
    card.addEventListener("click", (e) => {
      if (e.target.closest(".spectate-icon")) return;
      const p = roomState.players.find(x => x.sessionId === card.dataset.inspectId);
      if (p) openPlayerInspectModal(p);
    });
  });

  container.querySelectorAll("[data-watch-id]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      startSpectating(btn.dataset.watchId);
    });
  });

  const activeCount = members.filter(m => m.alive === true).length;
  if ($("onlineCount")) $("onlineCount").textContent = activeCount;
}

function renderTournamentStandings() {
  const container = $("standingsGrid");
  if (!container) return;

  const SQUAD_KEYS = ["TEAM A", "TEAM B", "TEAM C", "TEAM D"];
  container.innerHTML = SQUAD_KEYS.map(tKey => {
    const customName = roomState.squadNames[tKey] || tKey;
    const squadPlayers = (roomState.players || []).filter(p => p.team === tKey);
    if (squadPlayers.length === 0) return "";
    const aliveCount = squadPlayers.filter(p => p.alive === true).length;
    const isDead = aliveCount === 0;

    return `
      <div class="standing-card ${isDead ? "eliminated-team" : ""}" data-team="${escapeHTML(tKey)}">
        <strong>${escapeHTML(customName)}</strong>
        <small>${isDead ? "☠ WIPED OUT" : `● ${aliveCount}/${squadPlayers.length} ALIVE`}</small>
      </div>
    `;
  }).join("");

  container.querySelectorAll("[data-team]").forEach(card => {
    card.addEventListener("click", () => openTeamRosterModal(card.dataset.team));
  });
}

function openTeamRosterModal(teamKey) {
  const modal = $("teamModal");
  const title = $("modalTeamTitle");
  const list = $("rosterList");
  if (!modal || !list) return;

  const customTitle = roomState.squadNames[teamKey] || teamKey;
  if (title) title.textContent = `${customTitle} ROSTER`;

  const teamPlayers = (roomState.players || []).filter(p => p.team === teamKey);
  const spectator = viewerIsEliminated();
  const teamDead = myTeamIsCompletelyEliminated();

  list.innerHTML = teamPlayers.map(p => {
    const active = p.alive === true;
    const isYou = p.sessionId === playerSessionId;
    const avatarSrc = resolveRoomAvatar(p.avatar, isYou);

    const canSpectate = spectator && active && !isYou && (p.team === getViewer()?.team || teamDead);
    const locStatus = active ? (p.sectorState === "in_arena" ? "⚔ BATTLEGROUND" : (p.sectorState === "ready" ? "✓ READY" : "● IN ROOM")) : "☠ CASUALTY (ELIMINATED)";

    return `
      <div class="roster-item" data-roster-inspect-id="${escapeHTML(p.sessionId)}">
        <img src="${avatarSrc}" onerror="this.onerror=null; this.src='${FALLBACK_AVATAR}';" alt="${escapeHTML(p.name)}" style="${!active ? 'filter:grayscale(100%) opacity(0.5);' : ''}">
        <div class="roster-info">
          <strong>${escapeHTML(p.name)} ${isYou ? "(YOU)" : ""}</strong>
          <small style="color:${active ? 'inherit' : '#e95c54'}">${locStatus}</small>
        </div>
        ${canSpectate ? `<button type="button" class="roster-spectate-btn" data-watch-id="${escapeHTML(p.sessionId)}">WATCH ▶</button>` : ""}
      </div>
    `;
  }).join("");

  list.querySelectorAll("[data-roster-inspect-id]").forEach(item => {
    item.addEventListener("click", (e) => {
      if (e.target.closest(".roster-spectate-btn")) return;
      const p = roomState.players.find(x => x.sessionId === item.dataset.rosterInspectId);
      if (p) openPlayerInspectModal(p);
    });
  });

  list.querySelectorAll("[data-watch-id]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      startSpectating(btn.dataset.watchId);
    });
  });

  modal.classList.remove("hidden");
}

function closeTeamRosterModal() {
  $("teamModal")?.classList.add("hidden");
}

$("closeTeamModal")?.addEventListener("click", closeTeamRosterModal);
$("closeModalBackdrop")?.addEventListener("click", closeTeamRosterModal);

function renderSurveillanceIntel(activeDuelsCount) {
  const countEl = $("intelCount");
  const list = $("knownList");
  if (!list) return;
  if (countEl) countEl.textContent = activeDuelsCount;

  if (activeDuelsCount > 0) {
    list.innerHTML = `<div class="intel-tile" style="border-left:3px solid #e95c54;"><b>${activeDuelsCount} Sector Duel(s)</b> currently active across the arena.</div>`;
  } else {
    list.innerHTML = `<div class="intel-tile" style="border-left:3px solid #4da88c;">All arena sectors clear. Survivors gathered in squad safe rooms.</div>`;
  }
}

function renderChat() {
  const container = $("chatMessages");
  if (!container) return;
  container.innerHTML = `
    <div class="chat-bubble">
      <strong>SQUAD ENCRYPTED COMMS</strong>
      Messages & voice here are strictly private to your 4 squad members (both alive and eliminated teammates).
    </div>
  `;
}

function appendChatMessage(senderName, text, isMine) {
  const container = $("chatMessages");
  if (!container) return;
  container.insertAdjacentHTML("beforeend", `
    <div class="chat-bubble ${isMine ? "mine" : ""}">
      <strong>${escapeHTML(senderName)}</strong>
      ${escapeHTML(text)}
    </div>
  `);
  container.scrollTop = container.scrollHeight;
}

$("chatForm")?.addEventListener("submit", event => {
  event.preventDefault();
  const input = $("chatInput");
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  const viewer = getViewer() || { name: "Survivor" };
  if (socket && socket.connected) {
    socket.emit("send_squad_chat", {
      text: text,
      senderSessionId: playerSessionId,
      senderName: viewer.name
    });
  } else {
    appendChatMessage(viewer.name, text, true);
  }
  input.value = "";
});

function showWaitingBarrierModal() {
  if (viewerIsEliminated() || isGrantedBye) return;
  const modal = $("waitingBarrierModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  updateWaitingBarrierModal();
}

function updateWaitingBarrierModal() {
  const modal = $("waitingBarrierModal");
  if (!modal || modal.classList.contains("hidden")) return;
  if (document.getElementById("teamRoomVictoryModal")) {
    modal.classList.add("hidden");
    return;
  }

  const alivePlayers = (roomState.players || []).filter(p => p.alive === true);
  const readyPlayers = alivePlayers.filter(p => p.sectorState === "ready" || p.sectorState === "bye_reserve");
  const inArenaPlayers = alivePlayers.filter(p => p.sectorState === "in_arena");

  const readyDisplay = $("readyCountDisplay");
  const badge = $("waitingStatusBadge");
  const list = $("readyPlayersList");

  if (readyDisplay) readyDisplay.textContent = `${readyPlayers.length} / ${alivePlayers.length}`;

  if (badge) {
    if (inArenaPlayers.length > 0) {
      badge.textContent = `⏳ ${inArenaPlayers.length} OPERATIVE(S) STILL FIGHTING IN ARENA`;
      badge.style.color = "#e95c54";
    } else {
      badge.textContent = `WAITING FOR REMAINING OPERATIVES TO READY UP (${readyPlayers.length}/${alivePlayers.length})`;
      badge.style.color = "#4da88c";
    }
  }

  if (list) {
    list.innerHTML = alivePlayers.map(p => {
      const isReady = p.sectorState === "ready";
      const isFighting = p.sectorState === "in_arena";
      const isBye = p.sectorState === "bye_reserve";
      const isYou = p.sessionId === playerSessionId;
      const teamCustom = roomState.squadNames[p.team] || p.team;

      let statusColor = isReady ? "#2c755f" : (isFighting ? "#e95c54" : (isBye ? "#54758b" : "#8c8270"));
      let statusIcon = isReady ? "✓ READY" : (isFighting ? "⚔ IN DUEL" : (isBye ? "🛡 SECTOR BYE" : "⏳ IN SQUAD ROOM"));

      return `
        <div class="roster-item" style="padding:6px 10px;margin-bottom:4px;">
          <img src="${resolveRoomAvatar(p.avatar, isYou)}" style="width:28px;height:28px;border-radius:50%;">
          <div class="roster-info">
            <strong>${escapeHTML(p.name)} ${isYou ? "(YOU)" : ""}</strong>
            <small>${escapeHTML(teamCustom)}</small>
          </div>
          <span style="font-size:8.5px;font-weight:800;color:${statusColor};">${statusIcon}</span>
        </div>
      `;
    }).join("");
  }
}

function showAllMatchmakingModal() {
  $("waitingBarrierModal")?.classList.add("hidden");
  if (viewerIsEliminated()) return;

  const modal = $("matchmakingModal");
  const container = $("pairingsList");
  if (!modal) return;
  modal.classList.remove("hidden");

  if (container && Array.isArray(currentTournamentMatches) && currentTournamentMatches.length > 0) {
    container.innerHTML = currentTournamentMatches.map(m => `
      <div class="pairing-card" style="margin-bottom:6px;">
        <div class="pairing-side">
          <img src="${resolveRoomAvatar(m.p1Avatar, false)}" onerror="this.src='${FALLBACK_AVATAR}'">
          <div class="pairing-info">
            <strong>${escapeHTML(m.p1Name)}</strong>
            <small>${escapeHTML(m.p1Team)}</small>
          </div>
        </div>
        <div class="pairing-vs">VS</div>
        <div class="pairing-side">
          <div class="pairing-info" style="text-align:right;">
            <strong>${escapeHTML(m.p2Name)}</strong>
            <small>${escapeHTML(m.p2Team)}</small>
          </div>
          <img src="${resolveRoomAvatar(m.p2Avatar, false)}" onerror="this.src='${FALLBACK_AVATAR}'">
        </div>
      </div>
    `).join("");
  }

  launchCountdownSeconds = 3;
  clearInterval(launchCountdownInterval);
  launchCountdownInterval = setInterval(() => {
    if ($("autoTimer")) $("autoTimer").textContent = `LAUNCH IN: ${launchCountdownSeconds}s`;
    launchCountdownSeconds--;
    if (launchCountdownSeconds < 0) {
      clearInterval(launchCountdownInterval);
      window.ZHVoice?.leaveChannel();
      window.location.href = "../online-game.html";
    }
  }, 1000);
}

function showTeamRoomVictoryCeremony(data) {
  clearInterval(initialLockInterval);
  clearInterval(autoMarkTimeoutInterval);
  clearInterval(launchCountdownInterval);

  $("waitingBarrierModal")?.classList.add("hidden");
  $("matchmakingModal")?.classList.add("hidden");

  const myPlayer = (roomState.players || []).find(p => p.sessionId === playerSessionId);
  const myTeamRaw = myPlayer ? myPlayer.team : (localStorage.getItem("zh_assigned_team_key") || "");
  const myTeamCustom = (roomState.squadNames && roomState.squadNames[myTeamRaw]) || customTeamName || "";

  const isYourTeamWinner =
    myTeamRaw === data.winningSquadKey ||
    myTeamCustom === data.winningSquadName ||
    myTeamRaw === data.winningSquadName ||
    (data.members || []).some(m => m.sessionId === playerSessionId);

  let victoryModal = document.getElementById("teamRoomVictoryModal");
  if (!victoryModal) {
    victoryModal = document.createElement("div");
    victoryModal.id = "teamRoomVictoryModal";
    victoryModal.style.cssText = `
      position: fixed; inset: 0; z-index: 9999999;
      display: grid; place-items: center; padding: 14px;
      background: rgba(20,18,15,0.95); backdrop-filter: blur(14px);
    `;
    document.body.appendChild(victoryModal);
  }

  const share = Number(data.sharePerPlayer || 4000);

  if (isYourTeamWinner && !roomRewardClaimed) {
    roomRewardClaimed = true;
    window.ZHSound?.play("victory");
    if (window.ZHWallet) window.ZHWallet.addTokens(share);
    else {
      let currentTokens = Number(localStorage.getItem("zh_bounty_tokens") || 4000);
      localStorage.setItem("zh_bounty_tokens", String(currentTokens + share));
    }
  }

  victoryModal.innerHTML = `
    <div style="background:#fdfaf3;border:2.5px solid ${isYourTeamWinner ? '#c9932b' : '#e95c54'};border-radius:22px;padding:24px;max-width:440px;width:100%;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,0.4);">
      <div style="font-size:52px;line-height:1;margin-bottom:8px;">${isYourTeamWinner ? "🏆" : "☠"}</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:46px;color:${isYourTeamWinner ? '#a37217' : '#e95c54'};letter-spacing:0.04em;line-height:1;">
        ${isYourTeamWinner ? "CHAMPIONS" : "TOURNAMENT ENDED"}
      </div>
      <span style="display:block;font-size:9.5px;font-weight:800;color:#2c755f;letter-spacing:0.12em;margin-top:4px;">
        ${isYourTeamWinner ? "YOUR SQUAD WON THE TOURNAMENT!" : `${escapeHTML(data.winningSquadName)} EMERGED VICTORIOUS`}
      </span>
      <h2 style="font-family:'Oswald',sans-serif;font-size:26px;margin:6px 0 10px;color:#25231f;">${escapeHTML(data.winningSquadName)}</h2>
      <p style="font-size:11px;color:#6f6758;line-height:1.5;margin-bottom:14px;">
        ${isYourTeamWinner ? `Total bounty pool secured! +${share.toLocaleString()} TOKENS credited to each member.` : "All rival squads have been eliminated. Return to hub for the next match."}
      </p>

      <div style="background:white;border:1px solid rgba(45,40,33,0.12);border-radius:14px;padding:12px;margin-bottom:16px;display:flex;flex-direction:column;gap:6px;">
        ${(data.members || []).map(m => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;border-radius:8px;background:rgba(0,0,0,0.03);">
            <div style="display:flex;align-items:center;gap:8px;">
              <img src="${resolveRoomAvatar(m.avatar, m.sessionId === playerSessionId)}" style="width:24px;height:24px;border-radius:50%;object-fit:cover;">
              <strong style="font-size:11px;">${escapeHTML(m.name)}</strong>
            </div>
            <b style="color:#a37217;font-family:'Oswald',sans-serif;font-size:12px;">+${share.toLocaleString()} TOKENS</b>
          </div>
        `).join("")}
      </div>

      <button onclick="localStorage.removeItem('zh_player_session_id');localStorage.removeItem('zh_online_room_state');localStorage.removeItem('zh_spectator_mode');localStorage.removeItem('zh_player_is_alive');window.location.href='../../../index.html';" style="width:100%;border:none;border-radius:11px;background:#2c755f;color:white;font-family:'Oswald',sans-serif;font-size:13px;font-weight:700;padding:12px;cursor:pointer;">
        ${isYourTeamWinner ? `CLAIM +${share.toLocaleString()} TOKENS & RETURN TO HUB →` : "RETURN TO HUB →"}
      </button>
    </div>
  `;
}

function updateHeaderUI() {
  const myPlayer = (roomState.players || []).find(p => p.sessionId === playerSessionId);
  const myTeamKey = myPlayer ? myPlayer.team : (localStorage.getItem("zh_assigned_team_key") || "TEAM B");
  const customName = roomState.squadNames[myTeamKey] || myTeamKey;

  if ($("teamName")) $("teamName").textContent = customName;
  if ($("squadBadge")) $("squadBadge").textContent = myTeamKey.slice(-1);
  if ($("nextRound")) $("nextRound").textContent = roomState.round || 2;
  if ($("roundLabel")) $("roundLabel").textContent = `ROUND ${roomState.round || 2}`;

  const spectator = viewerIsEliminated();
  const teamDead = myTeamIsCompletelyEliminated();

  if ($("spectatorBanner")) {
    $("spectatorBanner").classList.toggle("hidden", !spectator);
    if (teamDead) {
      if ($("bannerTitle")) $("bannerTitle").textContent = "YOUR ENTIRE SQUAD WAS ELIMINATED";
      if ($("bannerSub")) $("bannerSub").textContent = "Talk with your eliminated teammates here, or silently watch rival duels.";
    } else {
      if ($("bannerTitle")) $("bannerTitle").textContent = "YOU HAVE BEEN ELIMINATED";
      if ($("bannerSub")) $("bannerSub").textContent = "You can talk with your squad on voice/text and watch your surviving teammates.";
    }
  }
}

function openPlayerInspectModal(player) {
  window.ZHSound?.play("click");
  const modal = $("playerProfileModal");
  if (!modal || !player) return;
  inspectedRoomPlayer = player;

  const isMe = player.sessionId === playerSessionId;
  if ($("inspectAvatarImg")) $("inspectAvatarImg").src = resolveRoomAvatar(player.avatar, isMe);
  if ($("inspectPlayerName")) $("inspectPlayerName").textContent = player.name;
  if ($("inspectPlayerTeam")) $("inspectPlayerTeam").textContent = `${roomState.squadNames[player.team] || player.team} • SQUAD MEMBER`;

  const followers = Number(player.followers ?? 1250);
  if ($("inspectFollowers")) $("inspectFollowers").textContent = followers.toLocaleString();

  const bounty = Number(player.bountyTokens ?? 4500);
  if ($("inspectBounty")) $("inspectBounty").textContent = `${bounty.toLocaleString()} TOKENS`;

  const wins = Number(player.squadWins ?? 18);
  const losses = Number(player.squadLosses ?? 5);
  const ratio = (wins / (losses === 0 ? 1 : losses)).toFixed(2);
  const tier = getSITier(parseFloat(ratio));

  if ($("inspectWinsLosses")) $("inspectWinsLosses").textContent = `SQUAD: ${wins} WINS / ${losses} LOSS`;
  if ($("inspectSI")) $("inspectSI").textContent = `${ratio} (${tier})`;

  if ($("roomFollowPlayerBtn")) {
    $("roomFollowPlayerBtn").style.display = isMe ? "none" : "block";
    $("roomFollowPlayerBtn").textContent = "+ FOLLOW OPERATIVE";
  }

  modal.classList.remove("hidden");
}

$("roomFollowPlayerBtn")?.addEventListener("click", () => {
  if (!inspectedRoomPlayer || !socket) return;
  window.ZHSound?.play("lock");
  socket.emit("follow_player", {
    followerSessionId: playerSessionId,
    targetSessionId: inspectedRoomPlayer.sessionId
  });
  $("roomFollowPlayerBtn").textContent = "✓ FOLLOWING";
  showToast(`Following ${inspectedRoomPlayer.name}!`);
});

function closePlayerInspectModal() {
  $("playerProfileModal")?.classList.add("hidden");
}

$("closeProfileBtn")?.addEventListener("click", closePlayerInspectModal);
$("closeProfileBackdrop")?.addEventListener("click", closePlayerInspectModal);

let toastTimer;
function showToast(message) {
  const toast = $("toast");
  if (!toast) return;
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function initTeamRoom() {
  updateHeaderUI();
  renderTeam();
  renderTournamentStandings();
  renderChat();
  setupAutoReadyToggle();
  initTeamRoomSocket();
}

initTeamRoom();