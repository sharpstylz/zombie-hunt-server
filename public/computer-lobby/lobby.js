/* =========================================================
   ZOMBIE HUNT — COMPUTER WAR ROOM LOBBY (lobby.js)
   Location: public/computer-lobby/lobby.js
========================================================= */

const $ = id => document.getElementById(id);

const PROFILE_KEY = "zh_profile";
const DEFAULT_PROFILE = { name: "Survivor", avatar: "char1.jpg" };
const AVATAR_PATH = "../profile/avatars/";

function normalizeAvatar(avatar) {
  if (!avatar || typeof avatar !== "string") return DEFAULT_PROFILE.avatar;
  let clean = avatar.trim().replace(/\\/g, "/").split("/").pop();
  const match = clean.match(/^char(1[0-7]|[1-9])\.jpg$/i);
  return match ? clean.toLowerCase() : DEFAULT_PROFILE.avatar;
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
    console.warn("Could not load profile:", error);
  }
  return { ...DEFAULT_PROFILE };
}

const profile = loadProfile();
let myCustomTeamName = (localStorage.getItem("zh_custom_team_name") || "TEAM B").trim().toUpperCase();

const squadsConfig = {
  teamA: { name: "TEAM ALPHA", bots: ["Mason", "Riley", "Jordan", "Kai"] },
  teamB: { bots: ["Alex", "Noah", "Zane"] },
  teamC: { name: "TEAM CHARLIE", bots: ["Mia", "Leo", "Avery", "Ethan"] },
  teamD: { name: "TEAM DELTA", bots: ["Luna", "Ryan", "Nova", "Blake"] }
};

function getHumanAvatarSrc() {
  if (window.ZHAuth) {
    return window.ZHAuth.resolvePlayerAvatarSrc(AVATAR_PATH, profile.avatar);
  }
  return AVATAR_PATH + normalizeAvatar(profile.avatar);
}

function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

function buildQuadrants() {
  if ($("myTeamDisplay")) $("myTeamDisplay").textContent = myCustomTeamName;
  if ($("headerMyTeamName")) $("headerMyTeamName").textContent = myCustomTeamName;

  // Clean number only (Golden SVG Coin is already in lobby.html!)
  if ($("lobbyWalletDisplay") && window.ZHWallet) {
    $("lobbyWalletDisplay").textContent = window.ZHWallet.getTokens().toLocaleString();
  }

  const rosterA = $("rosterTeamA");
  if (rosterA) {
    rosterA.innerHTML = "";
    squadsConfig.teamA.bots.forEach((name, idx) => {
      rosterA.appendChild(createPlayerCard(name, `char${idx + 2}.jpg`, "SQUAD RECON", "TEAM ALPHA"));
    });
  }

  const rosterB = $("rosterTeamB");
  if (rosterB) {
    rosterB.innerHTML = "";
    const humanCard = document.createElement("div");
    humanCard.className = "roster-card you-card";
    const humanAvatar = getHumanAvatarSrc();
    humanCard.innerHTML = `
      <div class="roster-avatar">
        <img src="${humanAvatar}" alt="${escapeHTML(profile.name)}">
      </div>
      <div class="roster-info">
        <strong>${escapeHTML(profile.name)} (YOU)</strong>
        <small>COMMAND LEADER</small>
      </div>
      <span class="roster-right-icon">›</span>
    `;
    humanCard.addEventListener("click", () => openInspectModal(profile.name, humanAvatar, myCustomTeamName, true));
    rosterB.appendChild(humanCard);

    squadsConfig.teamB.bots.forEach((name, idx) => {
      rosterB.appendChild(createPlayerCard(name, `char${idx + 6}.jpg`, "SQUAD ALLY", myCustomTeamName));
    });
  }

  const rosterC = $("rosterTeamC");
  if (rosterC) {
    rosterC.innerHTML = "";
    squadsConfig.teamC.bots.forEach((name, idx) => {
      rosterC.appendChild(createPlayerCard(name, `char${idx + 9}.jpg`, "OPPONENT", "TEAM CHARLIE"));
    });
  }

  const rosterD = $("rosterTeamD");
  if (rosterD) {
    rosterD.innerHTML = "";
    squadsConfig.teamD.bots.forEach((name, idx) => {
      rosterD.appendChild(createPlayerCard(name, `char${idx + 13}.jpg`, "OPPONENT", "TEAM DELTA"));
    });
  }
}

function createPlayerCard(name, avatarFile, role, teamName) {
  const card = document.createElement("div");
  card.className = "roster-card";
  card.innerHTML = `
    <div class="roster-avatar">
      <img src="${AVATAR_PATH}${avatarFile}" alt="${escapeHTML(name)}">
    </div>
    <div class="roster-info">
      <strong>${escapeHTML(name)}</strong>
      <small>${escapeHTML(role)}</small>
    </div>
    <span class="roster-right-icon">›</span>
  `;
  card.addEventListener("click", () => openInspectModal(name, AVATAR_PATH + avatarFile, teamName, false));
  return card;
}

function openInspectModal(name, avatarFullSrc, team, isHuman) {
  window.ZHSound?.play("click");
  const modal = $("inspectModal");
  if (!modal) return;

  const currentDiff = (localStorage.getItem("zh_bot_difficulty") || "normal").toUpperCase();
  const diffLabels = {
    EASY: "LEVEL 01: RECRUIT",
    NORMAL: "LEVEL 02: SURVIVOR",
    HARD: "LEVEL 03: NIGHTMARE"
  };

  const isMyTeammate = team === myCustomTeamName;
  if ($("inspectImg")) $("inspectImg").src = avatarFullSrc;
  if ($("inspectName")) $("inspectName").textContent = name;
  if ($("inspectTeam")) $("inspectTeam").textContent = team;
  if ($("inspectClass")) $("inspectClass").textContent = isHuman ? "HUMAN (YOU)" : "AI COMBATANT";
  if ($("inspectProtocol")) $("inspectProtocol").textContent = isHuman ? "MANUAL CONTROL" : (diffLabels[currentDiff] || "LEVEL 02: SURVIVOR");

  const allianceEl = $("inspectAlliance");
  if (allianceEl) {
    if (isHuman) {
      allianceEl.textContent = "SQUAD LEADER";
      allianceEl.style.color = "var(--squad-b-accent)";
    } else if (isMyTeammate) {
      allianceEl.textContent = "FRIENDLY (YOUR SQUAD)";
      allianceEl.style.color = "var(--squad-b-accent)";
    } else {
      allianceEl.textContent = "HOSTILE RIVAL";
      allianceEl.style.color = "var(--squad-d-accent)";
    }
  }

  const followBtn = $("followOperativeBtn");
  if (followBtn) {
    if (isHuman) {
      followBtn.style.display = "none";
    } else {
      followBtn.style.display = "block";
      const followedList = JSON.parse(localStorage.getItem("zh_followed_players") || "[]");
      const isFollowed = followedList.includes(name);
      followBtn.textContent = isFollowed ? "✓ FOLLOWING OPERATIVE" : "+ FOLLOW OPERATIVE";
      followBtn.onclick = () => {
        window.ZHSound?.play("lock");
        let list = JSON.parse(localStorage.getItem("zh_followed_players") || "[]");
        if (!list.includes(name)) {
          list.push(name);
          localStorage.setItem("zh_followed_players", JSON.stringify(list));
          followBtn.textContent = "✓ FOLLOWING OPERATIVE";
          showToast(`FOLLOWING ${name.toUpperCase()}`);
        } else {
          showToast(`ALREADY FOLLOWING ${name.toUpperCase()}`);
        }
      };
    }
  }

  modal.classList.remove("hidden");
}

function closeInspectModal() {
  $("inspectModal")?.classList.add("hidden");
}

$("closeInspectBtn")?.addEventListener("click", closeInspectModal);
$("closeInspectBackdrop")?.addEventListener("click", closeInspectModal);

function openTeamNameModal() {
  window.ZHSound?.play("click");
  const modal = $("teamNameModal");
  const input = $("customTeamInput");
  if (input) input.value = myCustomTeamName;
  modal?.classList.remove("hidden");
}

function closeTeamNameModal() {
  $("teamNameModal")?.classList.add("hidden");
}

$("editTeamNameBtn")?.addEventListener("click", openTeamNameModal);
$("closeTeamNameBtn")?.addEventListener("click", closeTeamNameModal);
$("closeTeamNameBackdrop")?.addEventListener("click", closeTeamNameModal);
$("cancelRenameBtn")?.addEventListener("click", closeTeamNameModal);

$("renameForm")?.addEventListener("submit", event => {
  event.preventDefault();
  const input = $("customTeamInput");
  if (!input) return;
  const newName = input.value.trim();
  if (newName) {
    window.ZHSound?.play("lock");
    myCustomTeamName = newName.toUpperCase();
    localStorage.setItem("zh_custom_team_name", myCustomTeamName);
    buildQuadrants();
    showToast(`CALLSIGN UPDATED: ${myCustomTeamName}`);
    closeTeamNameModal();
  }
});

function paintTopProfile() {
  const avatar = $("miniAvatar");
  const name = $("miniName");
  if (avatar) {
    avatar.innerHTML = `<img src="${getHumanAvatarSrc()}" alt="Player">`;
  }
  if (name) {
    name.textContent = (profile.name || "SURVIVOR").toUpperCase();
  }
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

const difficultyInfo = {
  easy: "Bots make basic decisions",
  normal: "Balanced combat & memory intelligence",
  hard: "Hostile tactical play with sharp deductions"
};

const survivalRates = {
  easy: "92.4%",
  normal: "64.8%",
  hard: "28.1%"
};

let selectedDifficulty = (localStorage.getItem("zh_bot_difficulty") || "normal").toLowerCase();

function applySelectedDifficultyUI() {
  document.querySelectorAll(".difficulty").forEach(button => {
    button.classList.remove("selected");
    if (button.dataset.level === selectedDifficulty) button.classList.add("selected");
  });

  const hint = $("difficultyHint");
  if (hint) hint.textContent = difficultyInfo[selectedDifficulty] || difficultyInfo.normal;

  const rateDisplay = $("survivalRateDisplay");
  if (rateDisplay) {
    rateDisplay.textContent = survivalRates[selectedDifficulty] || "64.8%";
    rateDisplay.style.color = selectedDifficulty === "hard" ? "var(--squad-d-accent)" : "var(--squad-b-accent)";
  }
}

applySelectedDifficultyUI();

document.querySelectorAll(".difficulty").forEach(button => {
  button.addEventListener("click", () => {
    window.ZHSound?.play("click");
    selectedDifficulty = button.dataset.level;
    localStorage.setItem("zh_bot_difficulty", selectedDifficulty);
    applySelectedDifficultyUI();
  });
});

$("backBtn")?.addEventListener("click", () => {
  window.ZHSound?.play("click");
  window.location.href = "../index.html";
});

$("startBtn")?.addEventListener("click", () => {
  window.ZHSound?.play("lock");
  localStorage.removeItem("zh_team_room_state");
  localStorage.removeItem("zh_team_intel");
  localStorage.removeItem("zh_return_from_round");
  localStorage.removeItem("zh_spectator_mode");
  localStorage.removeItem("zh_spectator_target_id");
  localStorage.removeItem("zh_spectator_viewer_id");
  localStorage.removeItem("zh_next_opponent_id");
  localStorage.removeItem("zh_locked_pairings");

  localStorage.setItem("zh_game_mode", "computer");
  localStorage.setItem("zh_bot_difficulty", selectedDifficulty);
  localStorage.setItem("zh_custom_team_name", myCustomTeamName);

  showToast("HUNT BEGINS...");
  setTimeout(() => {
    window.location.href = "bot-game/bot-game.html";
  }, 450);
});

paintTopProfile();
buildQuadrants();