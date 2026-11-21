/* =========================================================
   ZOMBIE HUNT — FULL-PAGE INSTAGRAM PROFILE CONTROLLER v8.0
   Includes:
   - Separate @username (Search Handle) & Display Name
   - 1-Click "⚔️ INVITE TO ROOM" on Public Profiles
   - Claimable Achievements (+Tokens, +CP & +% HX Boost!)
   Location: public/profile/profile.js
========================================================= */

const $ = id => document.getElementById(id);
const PROFILE_KEY = "zh_profile";
const AVATAR_FOLDER = "avatars/";

function showToast(msg) {
  const el = $("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2500);
}

const urlParams = new URLSearchParams(window.location.search);
let viewedUserQuery = urlParams.get("user") || null;

let savedLocalProfile = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{"username":"survivor_01","name":"Survivor","avatar":"char1.jpg"}');
let tempEditAvatar = savedLocalProfile.avatar || "char1.jpg";
let activeProfileData = null;

function getAchievementFallbackSVG(idx) {
  const colors = ["#d63d2a", "#2e7d5b", "#16a34a", "#d49a1a", "#c94735", "#e5ae37"];
  const c = colors[idx % colors.length];
  return `<svg viewBox="0 0 64 64" style="width:46px;height:46px;">
    <polygon points="32 4 56 18 56 46 32 60 8 46 8 18" fill="${c}" stroke="#faf3df" stroke-width="3"/>
    <polygon points="32 15 37 25 48 27 40 35 42 46 32 40 22 46 24 35 16 27 27 25" fill="#faf3df"/>
  </svg>`;
}

function renderFullProfilePage() {
  activeProfileData = window.ZHStats.getPublicProfileByHandle(viewedUserQuery);
  const p = activeProfileData;
  const isOwn = p.isOwnProfile;

  if ($("headerTokenCount") && window.ZHWallet) {
    $("headerTokenCount").textContent = window.ZHWallet.getTokens().toLocaleString();
  }
  if ($("topHandleTitle")) {
    $("topHandleTitle").textContent = `@${p.handle.toLowerCase()}`;
  }
  if ($("topVerifiedSlot")) {
    $("topVerifiedSlot").innerHTML = p.isVIP ? window.ZHIcons.renderVerifiedTickHTML("zh-inline-vip-tick") : "";
  }

  const avatarSrc = isOwn
    ? (window.ZHAuth ? window.ZHAuth.resolvePlayerAvatarSrc(AVATAR_FOLDER, p.avatar) : AVATAR_FOLDER + p.avatar)
    : AVATAR_FOLDER + p.avatar;

  if ($("profileMainAvatar")) $("profileMainAvatar").src = avatarSrc;
  if ($("avatarPinnedTickSlot")) {
    $("avatarPinnedTickSlot").innerHTML = p.isVIP
      ? window.ZHIcons.renderVerifiedTickHTML("zh-avatar-tick-pin")
      : "";
  }

  // Separate Display Name & @username
  if ($("profileDisplayName")) $("profileDisplayName").textContent = p.name.toUpperCase();
  if ($("profileSubUsernameTag")) $("profileSubUsernameTag").textContent = `@${p.handle.toLowerCase()}`;
  if ($("nameInlineTickSlot")) {
    $("nameInlineTickSlot").innerHTML = p.isVIP ? window.ZHIcons.renderVerifiedTickHTML("zh-inline-vip-tick") : "";
  }

  const eq = window.ZHWallet?.getEquipped() || {};
  if ($("profileCallsignBadge")) {
    $("profileCallsignBadge").textContent = p.isVIP
      ? "MYTHIC COMMANDER"
      : (isOwn && eq["KILL BANNER"] === "banner_stalker")
      ? "⚡ NIGHT STALKER"
      : p.rankTitle;
  }

  $("ownerActionsGroup")?.classList.toggle("hidden", !isOwn);
  $("visitorActionsGroup")?.classList.toggle("hidden", isOwn);

  if (!isOwn) {
    const amFollowing = window.ZHStats.isFollowing(p.handle);
    const fBtn = $("visitorFollowBtn");
    if (fBtn) {
      fBtn.textContent = amFollowing ? "UNFOLLOW" : "FOLLOW";
      fBtn.classList.toggle("is-following", amFollowing);
    }
  }

  if ($("bigRankNumber")) $("bigRankNumber").textContent = `#${p.globalRankNumber}`;
  if ($("bigFollowersCount")) $("bigFollowersCount").textContent = Number(p.followers || 0).toLocaleString();
  if ($("bigFollowingCount")) {
    const fCount = isOwn ? p.followingCount : (p.following || 45);
    $("bigFollowingCount").textContent = Number(fCount).toLocaleString();
  }

  const achBonuses = isOwn ? window.ZHStats.getAchievementBonuses() : { bonusCP: 0, bonusHxPercent: 0 };

  if ($("profileBioParagraph")) $("profileBioParagraph").textContent = p.bio;
  if ($("subStatCP")) {
    $("subStatCP").innerHTML = `${p.cp.toLocaleString()} ${achBonuses.bonusCP > 0 ? `<small style="color:#2e7d5b;">(+${achBonuses.bonusCP} ACH)</small>` : ""}`;
  }
  if ($("subStatHX")) {
    $("subStatHX").innerHTML = `${p.hx.toFixed(2)} ${achBonuses.bonusHxPercent > 0 ? `<small style="color:#2e7d5b;">(+${achBonuses.bonusHxPercent}%)</small>` : ""}`;
  }
  if ($("subStatMatches")) $("subStatMatches").textContent = p.matches;
  if ($("subStatWinLoss")) $("subStatWinLoss").textContent = `(${p.duelWins}W / ${p.losses}L)`;
  if ($("subStatKills")) $("subStatKills").textContent = p.kills;
  if ($("subStatCures")) $("subStatCures").textContent = p.cures;
  if ($("subStatTokens")) $("subStatTokens").textContent = `${Number(p.tokens || 5000).toLocaleString()} TOKENS`;

  if ($("cardBigCP")) $("cardBigCP").textContent = `${p.cp.toLocaleString()} CP`;
  if ($("cardBigHX")) $("cardBigHX").textContent = `${p.hx.toFixed(2)} HX`;

  renderAchievementsShowcase(p);
  if (isOwn) window.ZHWallet?.applyEquippedCosmetics();
}

function renderAchievementsShowcase(p) {
  const grid = $("achievementsGrid");
  if (!grid) return;

  let unlockedTotal = 0;
  const achConfig = window.ZH_CONFIG.ACHIEVEMENTS;
  const isOwn = p.isOwnProfile;

  grid.innerHTML = achConfig.map((ach, idx) => {
    const currentVal = Number(p[ach.statKey] || 0);
    const isCompleted = currentVal >= ach.target;
    if (isCompleted) unlockedTotal++;
    const isClaimed = isOwn ? window.ZHStats.isAchievementClaimed(ach.id) : isCompleted;
    const canClaimNow = isOwn && isCompleted && !isClaimed;

    const pct = Math.min(100, Math.round((currentVal / ach.target) * 100));
    const fallbackSvg = getAchievementFallbackSVG(idx).replace(/"/g, "'");

    return `
      <article class="ach-card ${isCompleted ? "unlocked" : "locked"}" style="${canClaimNow ? 'border:2.5px solid #d49a1a;box-shadow:0 0 28px rgba(212,154,26,0.35);' : ''}">
        <div class="ach-emblem-wrap">
          <img src="../icons/${ach.iconFile}" alt="${ach.name}" onerror="this.outerHTML=&quot;${fallbackSvg}&quot;">
        </div>
        <span class="ach-status-tag">
          ${isClaimed ? "✓ REWARD CLAIMED" : canClaimNow ? "🔥 READY TO CLAIM!" : `PROGRESS: ${currentVal} / ${ach.target}`}
        </span>
        <h3>${ach.name}</h3>
        <p>${ach.ruleText}</p>
        <div style="font-family:'Oswald',sans-serif;font-size:11px;font-weight:800;color:#b38618;background:rgba(212,154,26,0.12);padding:4px 10px;border-radius:10px;width:100%;">
          REWARD: +${ach.rewardTokens.toLocaleString()} TOKENS • +${ach.rewardCP} CP • +${ach.rewardHxPercent}% HX
        </div>

        ${canClaimNow ? `
          <button type="button" data-claim-ach="${ach.id}" style="width:100%;margin-top:6px;padding:10px;border:0;border-radius:11px;background:linear-gradient(135deg,#f5c85b,#d49a1a);color:#141c18;font-family:'Oswald',sans-serif;font-size:12px;font-weight:900;letter-spacing:0.8px;cursor:pointer;box-shadow:0 6px 16px rgba(212,154,26,0.35);">
            🎁 CLAIM REWARD NOW →
          </button>
        ` : `
          <div class="ach-progress-bar">
            <div class="ach-progress-fill" style="width:${pct}%;"></div>
          </div>
        `}
      </article>
    `;
  }).join("");

  if ($("unlockedAchCount")) {
    $("unlockedAchCount").textContent = `${unlockedTotal}/${achConfig.length}`;
  }

  grid.querySelectorAll("[data-claim-ach]").forEach(btn => {
    btn.addEventListener("click", () => {
      const res = window.ZHStats.claimAchievementReward(btn.dataset.claimAch);
      if (res.ok) {
        renderFullProfilePage();
        showToast(`CLAIMED: +${res.tokensAdded.toLocaleString()} TOKENS, +${res.cpAdded} CP & +${res.hxPctAdded}% HX!`);
      }
    });
  });
}

function openTop10LeaderboardModal() {
  window.ZHSound?.play("lock");
  const me = window.ZHStats.getLocalPlayerStats();
  const top10 = window.ZHStats.getTop10LeaderboardList();

  if ($("myRankBannerNote")) {
    $("myRankBannerNote").innerHTML = me.isInTop10
      ? `🔥 You are currently ranked <b>#${me.globalRankNumber} in the Top 10</b> (${me.cp.toLocaleString()} CP • ${me.hx.toFixed(2)} HX)!`
      : `Your Global Rank: <b>#${me.globalRankNumber}</b> (${me.cp.toLocaleString()} CP • ${me.hx.toFixed(2)} HX) • Showing Top 10 Apex Hunters:`;
  }

  const container = $("top10LeaderboardContainer");
  if (container) {
    container.innerHTML = top10.map(player => {
      const isMe = player.isMe;
      const isFollowed = window.ZHStats.isFollowing(player.handle);
      const tickHtml = player.isVIP ? window.ZHIcons.renderVerifiedTickHTML("zh-inline-vip-tick") : "";
      const avSrc = isMe
        ? (window.ZHAuth ? window.ZHAuth.resolvePlayerAvatarSrc(AVATAR_FOLDER, player.avatar) : AVATAR_FOLDER + player.avatar)
        : AVATAR_FOLDER + player.avatar;

      return `
        <div class="person-row ${isMe ? "me-highlighted-row" : ""}">
          <div class="person-left" data-open-handle="${player.handle}">
            <span class="rank-num-badge">#${player.rankPos}</span>
            <div class="person-avatar-wrap">
              <img src="${avSrc}" alt="${player.name}">
            </div>
            <div class="person-meta">
              <strong>${player.name.toUpperCase()} ${isMe ? "(YOU)" : ""} ${tickHtml}</strong>
              <small>@${player.handle.toLowerCase()} • CP: <b>${player.cp.toLocaleString()}</b> • HX: <b style="color:#d63d2a;">${player.hx.toFixed(2)}</b></small>
            </div>
          </div>
          ${!isMe ? `
            <button type="button" class="follow-toggle-btn ${isFollowed ? "following" : ""}" data-toggle-follow="${player.handle}">
              ${isFollowed ? "UNFOLLOW" : "FOLLOW"}
            </button>
          ` : `<span class="callsign-pill">RANK #${player.rankPos}</span>`}
        </div>
      `;
    }).join("");

    bindPersonRowEvents(container);
  }

  $("rankLeaderboardModal")?.classList.remove("hidden");
}

$("openRankLeaderboardBtn")?.addEventListener("click", openTop10LeaderboardModal);
$("closeRankModalBtn")?.addEventListener("click", () => $("rankLeaderboardModal")?.classList.add("hidden"));
$("closeRankModalBackdrop")?.addEventListener("click", () => $("rankLeaderboardModal")?.classList.add("hidden"));

function openNetworkModal(mode = "following") {
  window.ZHSound?.play("click");
  const container = $("networkListContainer");
  const heading = $("networkModalHeading");
  if (!container) return;

  const roster = window.ZH_CONFIG.TOP_HUNTERS_ROSTER;
  let displayList = [];

  if (mode === "following") {
    const handles = window.ZHStats.getFollowingHandles();
    if (heading) heading.textContent = `FOLLOWING (${handles.length})`;
    displayList = handles.map(h => window.ZHStats.getPublicProfileByHandle(h));
  } else {
    if (heading) heading.textContent = `FOLLOWERS (${activeProfileData.followers.toLocaleString()})`;
    displayList = roster.slice(0, 8).map(r => window.ZHStats.getPublicProfileByHandle(r.handle));
  }

  if (displayList.length === 0) {
    container.innerHTML = `<p style="text-align:center;padding:18px;font-size:12px;color:#5c665f;">Not following any operatives yet. Open the Top 10 Leaderboard to follow hunters!</p>`;
  } else {
    container.innerHTML = displayList.map(person => {
      const isFollowed = window.ZHStats.isFollowing(person.handle);
      const tickHtml = person.isVIP ? window.ZHIcons.renderVerifiedTickHTML("zh-inline-vip-tick") : "";
      return `
        <div class="person-row">
          <div class="person-left" data-open-handle="${person.handle}">
            <div class="person-avatar-wrap">
              <img src="${AVATAR_FOLDER}${person.avatar}" alt="${person.name}">
            </div>
            <div class="person-meta">
              <strong>${person.name.toUpperCase()} ${tickHtml}</strong>
              <small>@${person.handle.toLowerCase()} • RANK #${person.globalRankNumber} • ${person.hx.toFixed(2)} HX</small>
            </div>
          </div>
          <button type="button" class="follow-toggle-btn ${isFollowed ? "following" : ""}" data-toggle-follow="${person.handle}">
            ${isFollowed ? "UNFOLLOW" : "FOLLOW"}
          </button>
        </div>
      `;
    }).join("");

    bindPersonRowEvents(container);
  }

  $("networkListModal")?.classList.remove("hidden");
}

function bindPersonRowEvents(container) {
  container.querySelectorAll("[data-open-handle]").forEach(row => {
    row.addEventListener("click", () => {
      window.ZHSound?.play("click");
      const targetHandle = row.dataset.openHandle;
      $("rankLeaderboardModal")?.classList.add("hidden");
      $("networkListModal")?.classList.add("hidden");
      viewedUserQuery = targetHandle;
      window.history.pushState({}, "", `profile.html?user=${encodeURIComponent(targetHandle)}`);
      renderFullProfilePage();
    });
  });

  container.querySelectorAll("[data-toggle-follow]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      window.ZHSound?.play("lock");
      const handle = btn.dataset.toggleFollow;
      const nowFollowing = window.ZHStats.toggleFollow(handle);
      btn.textContent = nowFollowing ? "UNFOLLOW" : "FOLLOW";
      btn.classList.toggle("following", nowFollowing);
      showToast(nowFollowing ? `FOLLOWED @${handle.toLowerCase()}` : `UNFOLLOWED @${handle.toLowerCase()}`);
      renderFullProfilePage();
    });
  });
}

$("openFollowersModalBtn")?.addEventListener("click", () => openNetworkModal("followers"));
$("openFollowingModalBtn")?.addEventListener("click", () => openNetworkModal("following"));
$("closeNetworkModalBtn")?.addEventListener("click", () => $("networkListModal")?.classList.add("hidden"));
$("closeNetworkModalBackdrop")?.addEventListener("click", () => $("networkListModal")?.classList.add("hidden"));

$("visitorFollowBtn")?.addEventListener("click", () => {
  if (!activeProfileData) return;
  window.ZHSound?.play("lock");
  const nowFollowing = window.ZHStats.toggleFollow(activeProfileData.handle);
  if (nowFollowing) activeProfileData.followers += 1;
  else activeProfileData.followers = Math.max(0, activeProfileData.followers - 1);
  renderFullProfilePage();
  showToast(nowFollowing ? `NOW FOLLOWING @${activeProfileData.handle.toLowerCase()}` : `UNFOLLOWED @${activeProfileData.handle.toLowerCase()}`);
});

$("visitorMessageBtn")?.addEventListener("click", () => {
  if (!activeProfileData) return;
  window.ZHSound?.play("click");
  window.location.href = `../messages/messages.html?to=${encodeURIComponent(activeProfileData.handle)}`;
});

$("visitorInviteRoomBtn")?.addEventListener("click", () => {
  if (!activeProfileData) return;
  const code = window.ZHNotify.sendRoomInviteToPlayer(activeProfileData.handle);
  showToast(`SQUAD ROOM INVITE (${code}) SENT TO @${activeProfileData.handle.toLowerCase()}!`);
  setTimeout(() => {
    window.location.href = `../messages/messages.html?to=${encodeURIComponent(activeProfileData.handle)}`;
  }, 700);
});

$("returnMyProfileBtn")?.addEventListener("click", () => {
  window.ZHSound?.play("click");
  viewedUserQuery = null;
  window.history.pushState({}, "", "profile.html");
  renderFullProfilePage();
});

function openEditModal() {
  window.ZHSound?.play("click");
  const me = window.ZHStats.getLocalPlayerStats();
  const gender = window.ZHAuth?.getGender() || "male";
  const isGoogle = window.ZHAuth?.isGoogleLoggedIn();

  if ($("usernameInput")) $("usernameInput").value = me.handle.toLowerCase();
  if ($("nameInput")) $("nameInput").value = me.name;
  if ($("bioInput")) $("bioInput").value = me.bio;
  $("btnMale")?.classList.toggle("selected", gender === "male");
  $("btnFemale")?.classList.toggle("selected", gender === "female");

  if ($("googleLinkText")) {
    const gUser = window.ZHAuth?.getGoogleUser();
    $("googleLinkText").textContent = isGoogle
      ? `LINKED: ${gUser?.email || "GOOGLE ACCOUNT"} (17 AVATARS UNLOCKED)`
      : "SIGN IN WITH GOOGLE (UNLOCK 17 AVATARS)";
  }

  renderEditAvatarsGrid();
  $("editProfileModal")?.classList.remove("hidden");
}

function renderEditAvatarsGrid() {
  const grid = $("avatarsGrid");
  if (!grid) return;
  grid.innerHTML = "";
  const isGoogle = window.ZHAuth?.isGoogleLoggedIn();

  for (let i = 1; i <= 17; i++) {
    const file = `char${i}.jpg`;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `av-slot ${isGoogle && tempEditAvatar === file ? "selected" : ""} ${!isGoogle ? "locked" : ""}`;
    btn.innerHTML = `
      <img src="${AVATAR_FOLDER}${file}" alt="Avatar ${i}">
      ${!isGoogle ? `<span class="lock-tag">🔒</span>` : ""}
    `;
    btn.onclick = () => {
      window.ZHSound?.play("click");
      if (!isGoogle) return showToast("SIGN IN WITH GOOGLE ABOVE TO UNLOCK ALL 17 AVATARS!");
      tempEditAvatar = file;
      renderEditAvatarsGrid();
    };
    grid.appendChild(btn);
  }
}

$("openEditDrawerBtn")?.addEventListener("click", openEditModal);
$("closeEditModalBtn")?.addEventListener("click", () => $("editProfileModal")?.classList.add("hidden"));
$("closeEditModalBackdrop")?.addEventListener("click", () => $("editProfileModal")?.classList.add("hidden"));

$("btnMale")?.addEventListener("click", () => {
  window.ZHSound?.play("click");
  window.ZHAuth?.setGender("male");
  $("btnMale")?.classList.add("selected");
  $("btnFemale")?.classList.remove("selected");
  renderFullProfilePage();
});

$("btnFemale")?.addEventListener("click", () => {
  window.ZHSound?.play("click");
  window.ZHAuth?.setGender("female");
  $("btnFemale")?.classList.add("selected");
  $("btnMale")?.classList.remove("selected");
  renderFullProfilePage();
});

$("googleLinkBtn")?.addEventListener("click", () => {
  window.ZHSound?.play("click");
  if (window.ZHAuth?.isGoogleLoggedIn()) return showToast("GOOGLE ACCOUNT ALREADY LINKED");
  window.ZHAuth?.signInWithGoogle($("nameInput")?.value.trim() || savedLocalProfile.name);
});

$("saveProfileBtn")?.addEventListener("click", () => {
  window.ZHSound?.play("lock");
  const rawUser = ($("usernameInput")?.value.trim() || "survivor_01").replace(/^@+/, "").replace(/[^a-zA-Z0-9_]/g, "_").toUpperCase();
  const newName = $("nameInput")?.value.trim() || "Survivor";
  const newBio = $("bioInput")?.value.trim() || "Tactical Survivor • Read the cards, outbluff the room.";

  savedLocalProfile = { username: rawUser, name: newName, avatar: tempEditAvatar };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(savedLocalProfile));
  localStorage.setItem("zh_player_username", rawUser);
  localStorage.setItem("zh_player_bio", newBio);

  $("editProfileModal")?.classList.add("hidden");
  renderFullProfilePage();
  showToast(`PROFILE SAVED! (@${rawUser.toLowerCase()})`);
});

document.querySelectorAll(".sec-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    window.ZHSound?.play("click");
    document.querySelectorAll(".sec-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    const sec = tab.dataset.sec;
    $("achievementsSection")?.classList.toggle("hidden", sec !== "achievementsSection");
    $("combatDossierSection")?.classList.toggle("hidden", sec !== "combatDossierSection");
  });
});

$("backHubBtn")?.addEventListener("click", () => {
  window.ZHSound?.play("click");
  window.location.href = "../index.html";
});

$("openInboxPageBtn")?.addEventListener("click", () => {
  window.ZHSound?.play("click");
  window.location.href = "../messages/messages.html";
});

window.addEventListener("zh_profile_changed", () => {
  savedLocalProfile = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{"username":"survivor_01","name":"Survivor","avatar":"char1.jpg"}');
  renderEditAvatarsGrid();
  renderFullProfilePage();
});

renderFullProfilePage();