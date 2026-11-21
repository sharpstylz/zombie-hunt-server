/* =========================================================
   ZOMBIE HUNT — UPGRADED ONLINE SQUAD LOBBY (lobby.js)
   Location: public/online-lobby/lobby.js
========================================================= */

const $ = id => document.getElementById(id);

const PROFILE_KEY = "zh_profile";
const DEFAULT_PROFILE = { name: "Survivor", avatar: "char1.jpg" };
const AVATAR_PATH = "../profile/avatars/";
const DEFAULT_STARTING_TOKENS = 5000;

function normalizeAvatar(avatar) {
  if (!avatar || typeof avatar !== "string") return DEFAULT_PROFILE.avatar;
  if (avatar.startsWith("data:image/")) return avatar;
  let clean = avatar.trim().replace(/\\/g, "/").split("/").pop();
  return /^(char[1-9]|char1[0-7])\.jpg$/i.test(clean) ? clean.toLowerCase() : DEFAULT_PROFILE.avatar;
}

function getDisplayAvatarSrc(playerAvatar, isLocalPlayer = false) {
  if (isLocalPlayer && window.ZHAuth) {
    return window.ZHAuth.resolvePlayerAvatarSrc(AVATAR_PATH, playerAvatar);
  }
  if (typeof playerAvatar === "string" && playerAvatar.startsWith("data:image/")) {
    return playerAvatar;
  }
  return AVATAR_PATH + normalizeAvatar(playerAvatar);
}

function loadProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROFILE_KEY));
    if (saved && typeof saved === "object") {
      return {
        name: typeof saved.name === "string" && saved.name.trim() ? saved.name.trim() : DEFAULT_PROFILE.name,
        avatar: normalizeAvatar(saved.avatar)
      };
    }
  } catch (error) {
    console.warn("Profile load error", error);
  }
  return { ...DEFAULT_PROFILE };
}

let profile = loadProfile();

let playerSessionId = localStorage.getItem("zh_player_session_id");
if (!playerSessionId) {
  playerSessionId = `zh_user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  localStorage.setItem("zh_player_session_id", playerSessionId);
}

let myTokens = window.ZHWallet ? window.ZHWallet.getTokens() : Number(localStorage.getItem("zh_bounty_tokens") || DEFAULT_STARTING_TOKENS);
let myFollowers = Number(localStorage.getItem("zh_followers") || 1420);
let mySquadWins = Number(localStorage.getItem("zh_squad_wins") || 28);
let mySquadLosses = Number(localStorage.getItem("zh_squad_losses") || 8);

const urlParams = new URLSearchParams(window.location.search);
let currentModeKey = (urlParams.get("mode") || localStorage.getItem("zh_preferred_online_mode") || "16P").toUpperCase();
if (!["4P", "8P", "16P"].includes(currentModeKey)) currentModeKey = "16P";
let customRoomCode = urlParams.get("room") || localStorage.getItem("zh_custom_room_code") || null;

let currentModeConfig = {
  maxPlayers: 16,
  squadKeys: ["TEAM A", "TEAM B", "TEAM C", "TEAM D"],
  perSquad: 4,
  prizePool: 16000,
  winShare: 4000
};

let assignedSquadKey = null;
let autoLaunchInitiated = false;
let launchCountdownTimer = null;
let countdownSeconds = 3;
let currentlyInspectedPlayer = null;

let liveSquadNames = {
  "TEAM A": "TEAM ALPHA",
  "TEAM B": "TEAM BRAVO",
  "TEAM C": "TEAM CHARLIE",
  "TEAM D": "TEAM DELTA"
};

let tournamentLobbyState = {
  "TEAM A": [],
  "TEAM B": [],
  "TEAM C": [],
  "TEAM D": []
};

function getSITier(ratio) {
  if (ratio >= 4.0) return "APEX PREDATOR";
  if (ratio >= 2.5) return "ELITE SURVIVOR";
  if (ratio >= 1.5) return "VETERAN";
  if (ratio >= 1.0) return "SURVIVOR";
  return "RECRUIT";
}

function getEffectiveLocalAvatarForServer() {
  if (window.ZHAuth && !window.ZHAuth.isGoogleLoggedIn()) {
    return window.ZHAuth.getDefaultGenderAvatarDataURI();
  }
  return profile.avatar;
}

let socket = null;

function initSocket() {
  if (typeof io === "undefined") return;
  socket = io(window.location.origin, { transports: ["websocket", "polling"] });

  socket.on("connect", () => {
    if ($("serverStatusText")) $("serverStatusText").textContent = "CONNECTED";
    if ($("serverPulseDot")) $("serverPulseDot").style.background = "#4da88c";

    socket.emit("join_lobby", {
      sessionId: playerSessionId,
      name: profile.name,
      avatar: getEffectiveLocalAvatarForServer(),
      followers: myFollowers,
      bountyTokens: myTokens,
      squadWins: mySquadWins,
      squadLosses: mySquadLosses,
      isVIP: window.ZHWallet ? window.ZHWallet.isVIP() : false,
      preferredMode: currentModeKey,
      customRoomCode: customRoomCode
    });
  });

  socket.on("joined_successfully", (data) => {
    assignedSquadKey = data.assignedTeamKey;
    localStorage.setItem("zh_assigned_team_key", assignedSquadKey || "TEAM B");
    if (data.squadNames) liveSquadNames = data.squadNames;
    if (data.modeKey) currentModeKey = data.modeKey;
    if (data.modeConfig) currentModeConfig = data.modeConfig;
    if (data.customRoomCode) customRoomCode = data.customRoomCode;

    if (!data.alreadyPaidFee && data.player?.bountyTokens !== undefined) {
      myTokens = data.player.bountyTokens;
      if (window.ZHWallet) window.ZHWallet.setTokens(myTokens);
      else localStorage.setItem("zh_bounty_tokens", String(myTokens));
      showToast(`ENTRY FEE PAID: 1,000 TOKENS (BALANCE: ${myTokens.toLocaleString()})`);
    }

    paintTopProfile();
    applyDynamicRenameButton();
    highlightMySquadBox();
    renderAllSquads();
  });

  socket.on("update_lobby_state", (data) => {
    if (data.lobby) tournamentLobbyState = data.lobby;
    if (data.squadNames) liveSquadNames = data.squadNames;
    if (data.modeKey) currentModeKey = data.modeKey;
    if (data.modeConfig) currentModeConfig = data.modeConfig;
    if (data.customRoomCode !== undefined) customRoomCode = data.customRoomCode;

    renderAllSquads();
    highlightMySquadBox();
  });

  socket.on("squad_renamed", (data) => {
    liveSquadNames[data.teamKey] = data.newName;
    renderAllSquads();
    showToast(`${data.teamKey} CALLSIGN: ${data.newName}`);
  });

  socket.on("social_follow_updated", (data) => {
    if (data.targetSessionId === playerSessionId) {
      myFollowers = data.followersCount;
      localStorage.setItem("zh_followers", String(myFollowers));
      showToast(`NEW FOLLOWER! Total Followers: ${myFollowers.toLocaleString()}`);
    }
    if (currentlyInspectedPlayer && currentlyInspectedPlayer.sessionId === data.targetSessionId) {
      if ($("inspectFollowers")) $("inspectFollowers").textContent = Number(data.followersCount).toLocaleString();
    }
  });

  socket.on("receive_private_dm", (data) => {
    if (data.toSessionId === playerSessionId) {
      window.ZHSound?.play("click");
      showToast(`DM from ${data.fromName}: "${data.text}"`);
    }
  });

  socket.on("ceo_wallet_grant", (data) => {
    myTokens = data.tokens;
    window.ZHWallet?.setTokens(myTokens);
    paintTopProfile();
    showToast(`ADMIN GRANTED TOKENS! Balance: ${myTokens.toLocaleString()}`);
  });

  socket.on("auto_launch_countdown", (data) => {
    if (!autoLaunchInitiated) {
      triggerAutomaticMatchLaunch(data.countdown || 3);
    }
  });

  socket.on("disconnect", () => {
    if ($("serverStatusText")) $("serverStatusText").textContent = "DISCONNECTED";
    if ($("serverPulseDot")) $("serverPulseDot").style.background = "#e95c54";
  });
}

document.querySelectorAll(".mode-switch-pill").forEach(btn => {
  btn.addEventListener("click", () => {
    window.ZHSound?.play("click");
    const targetMode = btn.dataset.mode;
    if (socket && socket.connected) {
      socket.emit("change_lobby_mode", { modeKey: targetMode, customRoomCode });
      showToast(`Switched Arena Format to ${targetMode}`);
    }
  });
});

$("copyInviteLinkBtn")?.addEventListener("click", () => {
  window.ZHSound?.play("lock");
  if (!customRoomCode) {
    customRoomCode = "ZH" + Math.floor(1000 + Math.random() * 9000);
    if (socket && socket.connected) {
      socket.emit("change_lobby_mode", { modeKey: currentModeKey, customRoomCode });
    }
  }
  const inviteUrl = `${window.location.origin}/online-lobby/lobby.html?mode=${currentModeKey}&room=${customRoomCode}`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(inviteUrl);
  }
  showToast(`ROOM LINK COPIED (${customRoomCode})! Share with friends!`);
});

function applyDynamicRenameButton() {
  ["A", "B", "C", "D"].forEach(letter => {
    const slot = $("renameSlot" + letter);
    if (slot) slot.innerHTML = "";
  });

  if (!assignedSquadKey) return;
  const myLetter = assignedSquadKey.slice(-1);
  const targetSlot = $("renameSlot" + myLetter);

  if (targetSlot) {
    targetSlot.innerHTML = `<button class="rename-team-btn" id="openRenameModalBtn" type="button" title="Rename Your Squad">RENAME</button>`;
    $("openRenameModalBtn")?.addEventListener("click", openRenameModal);
  }
}

function highlightMySquadBox() {
  ["TEAM A", "TEAM B", "TEAM C", "TEAM D"].forEach(teamKey => {
    const letter = teamKey.slice(-1);
    const box = $("squadBox" + letter);
    if (box) {
      const isVisibleInMode = currentModeConfig.squadKeys.includes(teamKey);
      box.style.display = isVisibleInMode ? "flex" : "none";
      if (assignedSquadKey && teamKey === assignedSquadKey) {
        box.classList.add("squad-mine");
      } else {
        box.classList.remove("squad-mine");
      }
    }
  });

  if ($("headerMyTeamName")) {
    $("headerMyTeamName").textContent = assignedSquadKey ? (liveSquadNames[assignedSquadKey] || assignedSquadKey) : "SEARCHING...";
  }
  if ($("headerPrizePool")) {
    $("headerPrizePool").textContent = (currentModeConfig.prizePool || 16000).toLocaleString();
  }
  if ($("modeTitle")) {
    $("modeTitle").textContent = `${currentModeConfig.maxPlayers}-PLAYER ARENA ${customRoomCode ? `(ROOM: ${customRoomCode})` : ""}`;
  }
  if ($("modeLabel")) {
    $("modeLabel").textContent = `ONLINE MULTIPLAYER • ENTRY: 1,000 • WIN SHARE: ${(currentModeConfig.winShare || 4000).toLocaleString()} TOKENS`;
  }
}

function renderAllSquads() {
  const squadMap = {
    "TEAM A": { container: $("slotsA"), counter: $("countA"), titleEl: $("nameTeamA") },
    "TEAM B": { container: $("slotsB"), counter: $("countB"), titleEl: $("nameTeamB") },
    "TEAM C": { container: $("slotsC"), counter: $("countC"), titleEl: $("nameTeamC") },
    "TEAM D": { container: $("slotsD"), counter: $("countD"), titleEl: $("nameTeamD") }
  };

  let totalActive = 0;
  const perSquad = currentModeConfig.perSquad || 4;

  currentModeConfig.squadKeys.forEach(teamKey => {
    const members = tournamentLobbyState[teamKey] || [];
    const ui = squadMap[teamKey];
    if (!ui || !ui.container) return;

    totalActive += members.length;
    if (ui.counter) ui.counter.textContent = `${members.length}/${perSquad}`;
    if (ui.titleEl) ui.titleEl.textContent = liveSquadNames[teamKey] || teamKey;

    ui.container.innerHTML = "";

    members.forEach(player => {
      const isYou = player.sessionId === playerSessionId;
      const card = document.createElement("div");
      card.className = `roster-card ${isYou ? "you-card" : ""}`;
      const imgSrc = getDisplayAvatarSrc(player.avatar, isYou);

      card.innerHTML = `
        <div class="roster-avatar">
          <img src="${imgSrc}" alt="${escapeHTML(player.name)}">
        </div>
        <div class="roster-info">
          <strong>${escapeHTML(player.name)} ${isYou ? "(YOU)" : ""}</strong>
          <small>SQUAD MEMBER</small>
        </div>
        <span class="roster-right-icon">›</span>
      `;

      card.addEventListener("click", () => {
        openInspectModal(player, liveSquadNames[teamKey] || teamKey);
      });

      ui.container.appendChild(card);
    });

    const emptyCount = Math.max(0, perSquad - members.length);
    for (let i = 0; i < emptyCount; i++) {
      const emptySlot = document.createElement("div");
      emptySlot.className = "empty-slot";
      emptySlot.style.cursor = "pointer";
      emptySlot.title = `Click to switch to ${liveSquadNames[teamKey] || teamKey}`;
      emptySlot.innerHTML = `<span>+</span><small>JOIN SLOT</small>`;
      emptySlot.addEventListener("click", () => {
        if (assignedSquadKey !== teamKey && socket && socket.connected) {
          window.ZHSound?.play("click");
          socket.emit("switch_my_squad", { sessionId: playerSessionId, targetTeam: teamKey });
        }
      });
      ui.container.appendChild(emptySlot);
    }
  });

  if ($("playerCount")) $("playerCount").textContent = `${totalActive} / ${currentModeConfig.maxPlayers}`;
}

function openRenameModal() {
  if (!assignedSquadKey) return;
  const modal = $("renameTeamModal");
  const input = $("squadNameInput");
  if (input) input.value = liveSquadNames[assignedSquadKey] || assignedSquadKey;
  modal?.classList.remove("hidden");
}

function closeRenameModal() {
  $("renameTeamModal")?.classList.add("hidden");
}

$("closeRenameBtn")?.addEventListener("click", closeRenameModal);
$("closeRenameBackdrop")?.addEventListener("click", closeRenameModal);
$("cancelRenameBtn")?.addEventListener("click", closeRenameModal);

$("renameSquadForm")?.addEventListener("submit", event => {
  event.preventDefault();
  const input = $("squadNameInput");
  if (!input || !assignedSquadKey) return;

  const newName = input.value.trim().toUpperCase();
  if (newName) {
    if (socket && socket.connected) {
      socket.emit("rename_squad", {
        sessionId: playerSessionId,
        teamKey: assignedSquadKey,
        newName: newName
      });
    }
    localStorage.setItem("zh_custom_team_name", newName);
    closeRenameModal();
  }
});

/* =========================================================
   TOPBAR PROFILE EDIT MODAL (GENDER + GOOGLE + 17 AVATARS)
========================================================= */
let tempSelectedAvatar = profile.avatar;

function renderLobbyProfileModalGrid() {
  const grid = $("avatarSelectGrid");
  if (!grid) return;
  grid.innerHTML = "";
  const isGoogle = window.ZHAuth ? window.ZHAuth.isGoogleLoggedIn() : false;
  const gender = window.ZHAuth ? window.ZHAuth.getGender() : "male";

  if ($("lobbyGenderMaleBtn")) {
    $("lobbyGenderMaleBtn").style.borderColor = gender === "male" ? "#2563eb" : "rgba(0,0,0,0.12)";
    $("lobbyGenderMaleBtn").style.background = gender === "male" ? "#dbeafe" : "#faf3df";
  }
  if ($("lobbyGenderFemaleBtn")) {
    $("lobbyGenderFemaleBtn").style.borderColor = gender === "female" ? "#ec4899" : "rgba(0,0,0,0.12)";
    $("lobbyGenderFemaleBtn").style.background = gender === "female" ? "#fce7f3" : "#faf3df";
  }
  if ($("lobbyGoogleLoginBtn")) {
    const gUser = window.ZHAuth?.getGoogleUser();
    $("lobbyGoogleLoginBtn").textContent = isGoogle
      ? `LINKED: ${gUser?.email || "GOOGLE ACCOUNT"} (17 AVATARS UNLOCKED)`
      : "SIGN IN WITH GOOGLE (UNLOCK 17 AVATARS)";
  }

  for (let i = 1; i <= 17; i++) {
    const avName = `char${i}.jpg`;
    const btn = document.createElement("div");
    btn.style.cssText = `
      position:relative; cursor:pointer; border-radius:50%; overflow:hidden;
      border:2.5px solid ${isGoogle && avName === tempSelectedAvatar ? '#4da88c' : 'transparent'};
      width:44px; height:44px; background:#24221e;
    `;
    btn.innerHTML = `
      <img src="${AVATAR_PATH}${avName}" style="width:100%;height:100%;object-fit:cover;display:block;${!isGoogle ? 'filter:grayscale(90%) brightness(0.45);' : ''}">
      ${!isGoogle ? `<span style="position:absolute;inset:0;display:grid;place-items:center;color:#fff;font-size:11px;">🔒</span>` : ""}
    `;
    btn.addEventListener("click", () => {
      window.ZHSound?.play("click");
      if (!isGoogle) {
        showToast("SIGN IN WITH GOOGLE ABOVE TO UNLOCK ALL 17 AVATARS!");
        return;
      }
      tempSelectedAvatar = avName;
      renderLobbyProfileModalGrid();
    });
    grid.appendChild(btn);
  }
}

$("openProfileEditBtn")?.addEventListener("click", () => {
  window.ZHSound?.play("click");
  const modal = $("profileEditModal");
  const input = $("editProfileNameInput");
  if (!modal) return;
  if (input) input.value = profile.name;
  tempSelectedAvatar = profile.avatar;
  renderLobbyProfileModalGrid();
  modal.classList.remove("hidden");
});

$("lobbyGenderMaleBtn")?.addEventListener("click", () => {
  window.ZHSound?.play("click");
  window.ZHAuth?.setGender("male");
  renderLobbyProfileModalGrid();
  paintTopProfile();
});

$("lobbyGenderFemaleBtn")?.addEventListener("click", () => {
  window.ZHSound?.play("click");
  window.ZHAuth?.setGender("female");
  renderLobbyProfileModalGrid();
  paintTopProfile();
});

$("lobbyGoogleLoginBtn")?.addEventListener("click", () => {
  window.ZHSound?.play("click");
  if (window.ZHAuth?.isGoogleLoggedIn()) return showToast("GOOGLE ACCOUNT ALREADY LINKED");
  window.ZHAuth?.signInWithGoogle($("editProfileNameInput")?.value.trim() || profile.name);
});

window.addEventListener("zh_profile_changed", () => {
  profile = loadProfile();
  renderLobbyProfileModalGrid();
  paintTopProfile();
  if (socket && socket.connected) {
    socket.emit("update_profile_info", {
      sessionId: playerSessionId,
      name: profile.name,
      avatar: getEffectiveLocalAvatarForServer()
    });
  }
});

function closeProfileEditModal() {
  $("profileEditModal")?.classList.add("hidden");
}

$("closeProfileModalBtn")?.addEventListener("click", closeProfileEditModal);
$("closeProfileBackdrop")?.addEventListener("click", closeProfileEditModal);

$("profileEditForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const newName = $("editProfileNameInput")?.value.trim();
  if (newName) {
    window.ZHSound?.play("lock");
    profile.name = newName;
    profile.avatar = tempSelectedAvatar;
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));

    paintTopProfile();
    closeProfileEditModal();
    showToast("Profile Updated!");

    if (socket && socket.connected) {
      socket.emit("update_profile_info", {
        sessionId: playerSessionId,
        name: profile.name,
        avatar: getEffectiveLocalAvatarForServer()
      });
    }
  }
});

function triggerAutomaticMatchLaunch(seconds = 3) {
  autoLaunchInitiated = true;
  countdownSeconds = seconds;

  const waitingCard = $("waitingCard");
  const statusHeader = $("statusHeader");
  const waitingText = $("waitingText");

  if (waitingCard) waitingCard.classList.add("launching");
  window.ZHSound?.play("lock");
  showToast("All Operatives Assembled! Mobilizing Arena...");

  clearInterval(launchCountdownTimer);
  launchCountdownTimer = setInterval(() => {
    if (statusHeader) {
      statusHeader.textContent = `Operatives Ready! Mobilizing in ${countdownSeconds}...`;
    }
    if (waitingText) {
      waitingText.textContent = `Prize Pool locked (${currentModeConfig.prizePool.toLocaleString()} TOKENS). Entering arena in ${countdownSeconds}s.`;
    }

    countdownSeconds--;
    if (countdownSeconds < 0) {
      clearInterval(launchCountdownTimer);
      redirectToArena();
    }
  }, 1000);
}

function redirectToArena() {
  localStorage.setItem("zh_game_mode", "online");
  localStorage.removeItem("zh_player_is_alive");
  localStorage.removeItem("zh_spectator_mode");
  const myCurrentTeamName = assignedSquadKey ? (liveSquadNames[assignedSquadKey] || assignedSquadKey) : "TEAM B";
  localStorage.setItem("zh_custom_team_name", myCurrentTeamName);
  localStorage.setItem("zh_online_tournament_state", JSON.stringify(tournamentLobbyState));

  window.location.href = "online-game/online-game.html";
}

function openInspectModal(player, teamTitle) {
  window.ZHSound?.play("click");
  const modal = $("inspectModal");
  if (!modal || !player) return;
  currentlyInspectedPlayer = player;

  const isYou = player.sessionId === playerSessionId;
  if ($("inspectImg")) $("inspectImg").src = getDisplayAvatarSrc(player.avatar, isYou);
  if ($("inspectName")) $("inspectName").textContent = player.name;
  if ($("inspectTeam")) $("inspectTeam").textContent = `${teamTitle} • SQUAD MEMBER`;

  const followers = Number(player.followers ?? 1250);
  if ($("inspectFollowers")) $("inspectFollowers").textContent = followers.toLocaleString();

  const bounty = Number(player.bountyTokens ?? 5000);
  if ($("inspectBounty")) $("inspectBounty").textContent = `${bounty.toLocaleString()} TOKENS`;

  const wins = Number(player.squadWins ?? 18);
  const losses = Number(player.squadLosses ?? 6);
  const ratio = (wins / (losses === 0 ? 1 : losses)).toFixed(2);
  const tier = getSITier(parseFloat(ratio));

  if ($("inspectWinsLosses")) $("inspectWinsLosses").textContent = `SQUAD: ${wins} WINS / ${losses} LOSS`;
  if ($("inspectSI")) $("inspectSI").textContent = `${ratio} (${tier})`;

  const socialBox = $("inspectSocialActions");
  if (socialBox) {
    socialBox.style.display = isYou ? "none" : "flex";
  }

  modal.classList.remove("hidden");
}

$("followPlayerBtn")?.addEventListener("click", () => {
  if (!currentlyInspectedPlayer || !socket) return;
  window.ZHSound?.play("lock");
  socket.emit("follow_player", {
    followerSessionId: playerSessionId,
    targetSessionId: currentlyInspectedPlayer.sessionId
  });
  $("followPlayerBtn").textContent = "✓ FOLLOWING";
  showToast(`Following ${currentlyInspectedPlayer.name}!`);
});

$("sendQuickDmBtn")?.addEventListener("click", () => {
  const text = $("quickDmInput")?.value.trim();
  if (!text || !currentlyInspectedPlayer || !socket) return;
  window.ZHSound?.play("click");
  socket.emit("send_private_dm", {
    fromSessionId: playerSessionId,
    fromName: profile.name,
    toSessionId: currentlyInspectedPlayer.sessionId,
    text
  });
  $("quickDmInput").value = "";
  showToast(`Private message sent to ${currentlyInspectedPlayer.name}!`);
});

function closeInspectModal() {
  $("inspectModal")?.classList.add("hidden");
}

$("closeInspectBtn")?.addEventListener("click", closeInspectModal);
$("closeInspectBackdrop")?.addEventListener("click", closeInspectModal);

function paintTopProfile() {
  const avatar = $("miniAvatar");
  const name = $("miniName");
  if (avatar) {
    avatar.innerHTML = `<img src="${getDisplayAvatarSrc(profile.avatar, true)}" alt="Player">`;
  }
  if (name) {
    name.textContent = (profile.name || "SURVIVOR").toUpperCase();
  }
  if ($("topWalletTokens") && window.ZHWallet) {
    $("topWalletTokens").textContent = window.ZHWallet.getTokens().toLocaleString();
  }
}

$("backBtn")?.addEventListener("click", () => {
  if (socket) {
    socket.emit("leave_lobby_explicit", { sessionId: playerSessionId });
    socket.disconnect();
  }
  window.location.href = "../index.html";
});

$("leaveBtn")?.addEventListener("click", () => {
  if (socket) {
    socket.emit("leave_lobby_explicit", { sessionId: playerSessionId });
    socket.disconnect();
  }
  window.location.href = "../index.html";
});

let toastTimer;
function showToast(message) {
  const toast = $("toast");
  if (!toast) return;
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

paintTopProfile();
renderAllSquads();
initSocket();