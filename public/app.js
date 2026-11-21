/* =========================================================
   ZOMBIE HUNT — HOME HUB & @USERNAME SEARCH CONTROLLER (app.js)
   Includes:
   1. Global Player Search by @username or Display Name
   2. Instant Follow/Unfollow, Open Public Profile & 1-Click Room Invite
   3. Strict 7-Day Daily Streak Reset (Miss 1 Day = Reset to Day 1)
   4. 5-Chapter Cinematic Interactive Walkthrough Guide
   5. Rewarded Ad (+500 Bounty Tokens with Live 5-Min Cooldown UI)
   Location: public/app.js
========================================================= */

const $ = id => document.getElementById(id);

const PROFILE_KEY = "zh_profile";
const AVATAR_FOLDER = "profile/avatars/";
const AD_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes in milliseconds
const AD_REWARD_TOKENS = 500;
let selectedMode = localStorage.getItem("zh_game_mode") || "online";

let toastTimer;
function toast(msg) {
  const el = $("toast");
  if (!el) return;
  clearTimeout(toastTimer);
  el.textContent = msg;
  el.classList.add("show");
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

/* ---------------------------------------------------------
   1. PAINT TOPBAR PROFILE & WALLET
--------------------------------------------------------- */
function paintProfileAndWallet() {
  const me = window.ZHStats ? window.ZHStats.getLocalPlayerStats() : { name: "Survivor", username: "SURVIVOR_01", avatar: "char1.jpg" };
  const imgSrc = window.ZHAuth
    ? window.ZHAuth.resolvePlayerAvatarSrc(AVATAR_FOLDER, me.avatar)
    : AVATAR_FOLDER + me.avatar;

  if ($("homeAvatarImage")) $("homeAvatarImage").src = imgSrc;
  if ($("homeProfileName")) $("homeProfileName").textContent = me.name;
  if ($("homeTokenBalance") && window.ZHWallet) {
    $("homeTokenBalance").textContent = window.ZHWallet.getTokens().toLocaleString();
  }
  window.ZHWallet?.applyEquippedCosmetics();
}

window.addEventListener("zh_wallet_updated", paintProfileAndWallet);
window.addEventListener("zh_profile_changed", paintProfileAndWallet);

/* ---------------------------------------------------------
   2. NAVIGATION BUTTONS (PROFILE, INBOX, FREE AD)
--------------------------------------------------------- */
$("profileBtn")?.addEventListener("click", () => {
  window.ZHSound?.play("click");
  window.location.href = "profile/profile.html";
});

$("openMessagesHubBtn")?.addEventListener("click", () => {
  window.ZHSound?.play("click");
  window.location.href = "messages/messages.html";
});

let isAdPlaying = false;
let adDefaultText = null;
let adDefaultStyle = null;

function formatTimerMMSS(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const mins = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const secs = String(totalSec % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

function updateAdButtonUI() {
  const btn = $("freeTokensAdBtn");
  if (!btn) return;

  if (adDefaultText === null) {
    adDefaultText = btn.textContent.trim() || "+500 AD";
    adDefaultStyle = {
      background: btn.style.background || "",
      color: btn.style.color || "",
      borderColor: btn.style.borderColor || "",
      opacity: btn.style.opacity || "",
      cursor: btn.style.cursor || ""
    };
  }

  const lastAdTime = Number(localStorage.getItem("zh_last_ad_time") || 0);
  const remaining = AD_COOLDOWN_MS - (Date.now() - lastAdTime);

  if (isAdPlaying) {
    btn.disabled = true;
    btn.textContent = "⏳ PLAYING...";
    btn.style.background = "#3b4740";
    btn.style.color = "#f5c85b";
    btn.style.borderColor = "#f5c85b";
    btn.style.opacity = "0.9";
    btn.style.cursor = "not-allowed";
    btn.setAttribute("data-ad-timer", "PLAYING");
    return;
  }

  if (lastAdTime && remaining > 0) {
    const mmss = formatTimerMMSS(remaining);
    btn.disabled = true;
    btn.textContent = `✕ ${mmss}`;
    btn.style.background = "#262d29";
    btn.style.color = "#fca5a5";
    btn.style.borderColor = "#ef4444";
    btn.style.opacity = "0.82";
    btn.style.cursor = "not-allowed";
    btn.setAttribute("data-ad-timer", mmss);
    btn.title = `Next Ad available in ${mmss}`;
  } else {
    btn.disabled = false;
    btn.textContent = adDefaultText;
    btn.style.background = adDefaultStyle.background;
    btn.style.color = adDefaultStyle.color;
    btn.style.borderColor = adDefaultStyle.borderColor;
    btn.style.opacity = adDefaultStyle.opacity;
    btn.style.cursor = adDefaultStyle.cursor || "pointer";
    btn.removeAttribute("data-ad-timer");
    btn.title = "Watch Video Ad for +500 Bounty Tokens";
  }
}

setInterval(updateAdButtonUI, 1000);

$("freeTokensAdBtn")?.addEventListener("click", () => {
  if (isAdPlaying) return;

  const lastAdTime = Number(localStorage.getItem("zh_last_ad_time") || 0);
  const now = Date.now();
  const elapsed = now - lastAdTime;

  if (lastAdTime && elapsed < AD_COOLDOWN_MS) {
    updateAdButtonUI();
    return;
  }

  isAdPlaying = true;
  updateAdButtonUI();
  window.ZHSound?.play("click");
  toast("Playing Ad... Please wait 5s!");

  const finishReward = () => {
    if (!isAdPlaying) return;
    isAdPlaying = false;
    localStorage.setItem("zh_last_ad_time", String(Date.now()));

    if (window.ZHWallet?.addTokens) {
      window.ZHWallet.addTokens(AD_REWARD_TOKENS);
    } else if ($("homeTokenBalance")) {
      const currentBalance = parseInt($("homeTokenBalance").textContent.replace(/,/g, ""), 10) || 0;
      $("homeTokenBalance").textContent = (currentBalance + AD_REWARD_TOKENS).toLocaleString();
    }

    paintProfileAndWallet();
    updateAdButtonUI();
    window.ZHSound?.play("unlock");
    toast(`+${AD_REWARD_TOKENS} BOUNTY TOKENS CREDITED! (5m timer started)`);
  };

  if (window.ZHAds?.watchRewardedAd) {
    window.ZHAds.watchRewardedAd(`SUPPLY DROP: +${AD_REWARD_TOKENS} BOUNTY TOKENS`, finishReward);
    setTimeout(finishReward, 5000);
  } else {
    setTimeout(finishReward, 5000);
  }
});

/* ---------------------------------------------------------
   3. GLOBAL PLAYER SEARCH MODAL (@USERNAME & DISPLAY NAME)
--------------------------------------------------------- */
function renderHomeSearchResults(query = "") {
  const container = $("homeSearchResultsList");
  if (!container || !window.ZHStats) return;

  const results = window.ZHStats.searchPlayers(query);
  if (results.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:24px;color:#5c665f;font-size:12.5px;">No operative found matching "<b>${query}</b>".</div>`;
    return;
  }

  container.innerHTML = results.map(p => {
    const isFollowed = window.ZHStats.isFollowing(p.handle);
    const tickHtml = p.isVIP ? window.ZHIcons.renderVerifiedTickHTML("zh-inline-vip-tick") : "";
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;background:#fff9ed;border:1.5px solid rgba(24,34,29,0.13);padding:10px 12px;border-radius:15px;">
        <div data-search-profile="${p.handle}" style="display:flex;align-items:center;gap:10px;cursor:pointer;flex:1;min-width:0;">
          <img src="${AVATAR_FOLDER}${p.avatar}" alt="${p.name}" style="width:42px;height:42px;border-radius:50%;object-fit:cover;border:2px solid #18221d;flex-shrink:0;">
          <div style="min-width:0;">
            <strong style="display:block;font-size:13.5px;color:#18221d;">${p.name} ${tickHtml}</strong>
            <small style="display:block;font-size:10.5px;font-weight:800;color:#2e7d5b;">@${p.handle.toLowerCase()} • RANK #${p.globalRankNumber} • ${p.hx.toFixed(2)} HX</small>
          </div>
        </div>

        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
          <button type="button" data-search-invite="${p.handle}" title="Send Room Invite" style="border:1px solid #d49a1a;background:#fff3cd;color:#18221d;padding:6px 10px;border-radius:9px;font-family:'Oswald',sans-serif;font-size:10.5px;font-weight:800;cursor:pointer;">
            ⚔️ INVITE
          </button>
          <button type="button" data-search-follow="${p.handle}" style="border:1.5px solid ${isFollowed ? 'rgba(24,34,29,0.28)' : '#2e7d5b'};background:${isFollowed ? 'transparent' : '#2e7d5b'};color:${isFollowed ? '#18221d' : '#fff'};padding:6px 12px;border-radius:9px;font-family:'Oswald',sans-serif;font-size:10.5px;font-weight:800;cursor:pointer;">
            ${isFollowed ? "UNFOLLOW" : "FOLLOW"}
          </button>
        </div>
      </div>
    `;
  }).join("");

  container.querySelectorAll("[data-search-profile]").forEach(el => {
    el.addEventListener("click", () => {
      window.ZHSound?.play("click");
      window.location.href = `profile/profile.html?user=${encodeURIComponent(el.dataset.searchProfile)}`;
    });
  });

  container.querySelectorAll("[data-search-follow]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      window.ZHSound?.play("lock");
      const h = btn.dataset.searchFollow;
      const nowFollowing = window.ZHStats.toggleFollow(h);
      renderHomeSearchResults($("homePlayerSearchInput")?.value || "");
      toast(nowFollowing ? `FOLLOWED @${h.toLowerCase()}` : `UNFOLLOWED @${h.toLowerCase()}`);
    });
  });

  container.querySelectorAll("[data-search-invite]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const h = btn.dataset.searchInvite;
      const code = window.ZHNotify.sendRoomInviteToPlayer(h);
      toast(`ROOM INVITE (${code}) SENT TO @${h.toLowerCase()}!`);
      setTimeout(() => {
        window.location.href = `messages/messages.html?to=${encodeURIComponent(h)}`;
      }, 650);
    });
  });
}

$("openSearchModalBtn")?.addEventListener("click", () => {
  window.ZHSound?.play("click");
  if ($("homePlayerSearchInput")) $("homePlayerSearchInput").value = "";
  renderHomeSearchResults("");
  $("playerSearchModal")?.classList.remove("hidden");
  setTimeout(() => $("homePlayerSearchInput")?.focus(), 80);
});

$("homePlayerSearchInput")?.addEventListener("input", (e) => {
  renderHomeSearchResults(e.target.value || "");
});

$("closeSearchModalBtn")?.addEventListener("click", () => {
  $("playerSearchModal")?.classList.add("hidden");
});

/* ---------------------------------------------------------
   4. MODE SELECTION & ARENA LAUNCH
--------------------------------------------------------- */
function updateModeSelectionUI() {
  $("onlineBtn")?.classList.toggle("selected", selectedMode === "online");
  $("botBtn")?.classList.toggle("selected", selectedMode === "computer");
}

$("onlineBtn")?.addEventListener("click", () => {
  window.ZHSound?.play("click");
  selectedMode = "online";
  localStorage.setItem("zh_game_mode", "online");
  updateModeSelectionUI();
});

$("botBtn")?.addEventListener("click", () => {
  window.ZHSound?.play("click");
  selectedMode = "computer";
  localStorage.setItem("zh_game_mode", "computer");
  updateModeSelectionUI();
});

$("arenaBtn")?.addEventListener("click", () => {
  window.ZHSound?.play("lock");
  if (selectedMode === "computer") {
    window.location.href = "computer-lobby/lobby.html";
  } else {
    $("modeSizeModal")?.classList.remove("hidden");
  }
});

$("closeModeSizeModal")?.addEventListener("click", () => $("modeSizeModal")?.classList.add("hidden"));

document.querySelectorAll(".tier-option-card").forEach(card => {
  card.addEventListener("click", () => {
    window.ZHSound?.play("lock");
    const size = card.dataset.size || "16P";
    localStorage.setItem("zh_preferred_online_mode", size);
    localStorage.removeItem("zh_custom_room_code");
    window.location.href = `online-lobby/lobby.html?mode=${size}`;
  });
});

$("joinCustomRoomBtn")?.addEventListener("click", () => {
  const code = $("joinRoomCodeInput")?.value.trim().toUpperCase();
  if (!code) return toast("ENTER A VALID ROOM CODE!");
  window.ZHSound?.play("lock");
  localStorage.setItem("zh_custom_room_code", code);
  window.location.href = `online-lobby/lobby.html?mode=16P&room=${encodeURIComponent(code)}`;
});

$("createCustomRoomBtn")?.addEventListener("click", () => {
  window.ZHSound?.play("lock");
  const code = "ZH" + Math.floor(1000 + Math.random() * 9000);
  localStorage.setItem("zh_custom_room_code", code);
  const link = `${window.location.origin}/online-lobby/lobby.html?mode=16P&room=${code}`;
  if (navigator.clipboard) navigator.clipboard.writeText(link);
  toast(`ROOM CREATED (${code})! Entering Lobby...`);
  setTimeout(() => {
    window.location.href = `online-lobby/lobby.html?mode=16P&room=${code}`;
  }, 500);
});

/* ---------------------------------------------------------
   5. STRICT 7-DAY DAILY SUPPLY DROP
--------------------------------------------------------- */
function openDailyModal() {
  window.ZHSound?.play("click");
  const grid = $("dailyStreakGrid");
  if (!grid || !window.ZHDailyStreak) return;
  const state = window.ZHDailyStreak.getValidatedState();

  grid.innerHTML = state.rewards.map((amt, idx) => {
    const isCompleted = idx < state.activeDayIndex || (idx === state.activeDayIndex && state.claimedToday);
    const isTodayTarget = idx === state.activeDayIndex && !state.claimedToday;
    return `
      <div class="daily-day-card ${isTodayTarget ? "active-day" : ""}" style="${isCompleted ? 'opacity:0.55;background:#d8e8de;' : ''}">
        <small>DAY ${idx + 1}</small>
        <strong style="display:block;font-size:15px;margin-top:4px;color:#b38618;">
          ${isCompleted ? "✓ DONE" : `+${amt}`}
        </strong>
      </div>
    `;
  }).join("");

  $("dailyModal")?.classList.remove("hidden");
}

$("openDailyBtn")?.addEventListener("click", openDailyModal);
$("closeDailyModal")?.addEventListener("click", () => $("dailyModal")?.classList.add("hidden"));

$("claimDailyBtn")?.addEventListener("click", () => {
  if (!window.ZHDailyStreak) return;
  const res = window.ZHDailyStreak.claimToday();
  if (!res.ok) {
    toast(res.message);
    return;
  }
  window.ZHSound?.play("unlock");
  paintProfileAndWallet();
  $("dailyModal")?.classList.add("hidden");
  toast(`DAY ${res.dayNumber} STREAK: +${res.reward.toLocaleString()} TOKENS CLAIMED!`);
});

/* ---------------------------------------------------------
   6. 5-CHAPTER CINEMATIC INTERACTIVE WALKTHROUGH GUIDE
--------------------------------------------------------- */
const GUIDE_CHAPTERS = [
  {
    tag: "CHAPTER 01 / 05 • TOURNAMENT STRUCTURE",
    title: "4 SQUADS ENTER. 1 SQUAD SURVIVES.",
    text: "16 Operatives are divided into 4 Squads (Alpha, Bravo, Charlie, Delta). Each round, the arena pairs you in a 1v1 Sector Duel against a rival squad member. Between rounds, you return to your private Squad Safe Room to share intel over encrypted voice and text.",
    html: `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;width:min(420px,90%);">
      <div style="background:#1c2b24;border:2px solid #4da88c;padding:16px;border-radius:16px;color:#fff;text-align:center;"><b>SQUAD ALPHA</b><br><small style="color:#4da88c;">4 OPERATIVES</small></div>
      <div style="background:#1c2b24;border:2px solid #f5c85b;padding:16px;border-radius:16px;color:#fff;text-align:center;"><b>SQUAD BRAVO (YOU)</b><br><small style="color:#f5c85b;">4 OPERATIVES</small></div>
      <div style="background:#1c2b24;border:2px solid #60a5fa;padding:16px;border-radius:16px;color:#fff;text-align:center;"><b>SQUAD CHARLIE</b><br><small style="color:#60a5fa;">4 OPERATIVES</small></div>
      <div style="background:#1c2b24;border:2px solid #f87171;padding:16px;border-radius:16px;color:#fff;text-align:center;"><b>SQUAD DELTA</b><br><small style="color:#f87171;">4 OPERATIVES</small></div>
    </div>`
  },
  {
    tag: "CHAPTER 02 / 05 • SUIT POINTS & CARD STEALING",
    title: "MASTER THE ACTIVE SUIT & CLAIM CARDS",
    text: "Every round announces one Active Suit (Hearts ♥, Diamonds ♦, Clubs ♣, or Spades ♠). Only number cards matching the Active Suit count toward your round total! The duel winner steals 1 played card from the loser. If a player runs out of number cards, they are eliminated!",
    html: `<div style="display:flex;gap:14px;align-items:center;justify-content:center;">
      <div style="width:84px;height:118px;background:#fff9ed;border:2.5px solid #d63d2a;border-radius:12px;display:grid;place-items:center;color:#d63d2a;font-family:'Bebas Neue',sans-serif;font-size:38px;">♥ 9</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:32px;color:#f5c85b;">+</div>
      <div style="width:84px;height:118px;background:#fff9ed;border:2.5px solid #d63d2a;border-radius:12px;display:grid;place-items:center;color:#d63d2a;font-family:'Bebas Neue',sans-serif;font-size:38px;">♥ 7</div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:32px;color:#4da88c;">= 16 PTS (WIN!)</div>
    </div>`
  },
  {
    tag: "CHAPTER 03 / 05 • COVERT ZOMBIE INFECTION",
    title: "1 SECRET ZOMBIE LURKS IN THE ARENA",
    text: "At the start of the tournament, 1 random operative is secretly infected with the Zombie Card. If a Zombie plays their Zombie Card against a human who plays normal number cards, the Zombie wins the duel automatically and infects that human into a new Zombie!",
    html: `<div style="text-align:center;color:#fff;">
      <div style="display:inline-block;padding:18px 28px;border-radius:20px;background:linear-gradient(135deg,#064e3b,#14532d);border:2.5px solid #22c55e;box-shadow:0 0 35px rgba(34,197,94,0.5);">
        <div style="font-size:44px;">☣</div>
        <strong style="font-family:'Bebas Neue',sans-serif;font-size:30px;letter-spacing:1.5px;color:#86efac;">ZOMBIE AMBUSH</strong>
        <p style="font-size:12px;color:#d1fae5;margin-top:4px;">Beats Number Cards & Infects the Target!</p>
      </div>
    </div>`
  },
  {
    tag: "CHAPTER 04 / 05 • SHOTGUN vs VACCINE",
    title: "THE ULTIMATE PSYCHOLOGICAL COUNTER",
    text: "Every operative holds 1 Shotgun Card and 1 Vaccine Card. Playing SHOTGUN against a Zombie kills and eliminates the Zombie permanently! Playing VACCINE cures a Zombie back into a human. Warning: Shotgun and Vaccine only work against Zombies—against a human, they score 0 points!",
    html: `<div style="display:flex;gap:18px;flex-wrap:wrap;justify-content:center;">
      <div style="background:#3b0d0c;border:2px solid #ef4444;padding:16px 20px;border-radius:16px;color:#fff;text-align:center;width:180px;">
        <strong style="font-family:'Oswald',sans-serif;color:#fca5a5;">🔫 SHOTGUN CARD</strong>
        <small style="display:block;font-size:11px;margin-top:4px;color:#fecaca;">Instantly Eliminates a Zombie Carrier!</small>
      </div>
      <div style="background:#083344;border:2px solid #06b6d4;padding:16px 20px;border-radius:16px;color:#fff;text-align:center;width:180px;">
        <strong style="font-family:'Oswald',sans-serif;color:#67e8f9;">💉 VACCINE CARD</strong>
        <small style="display:block;font-size:11px;margin-top:4px;color:#cffafe;">Cures Zombie Infection Back to Human!</small>
      </div>
    </div>`
  },
  {
    tag: "CHAPTER 05 / 05 • 90s VOICE BLUFF & BOUNTY POOL",
    title: "BLUFF ON LIVE VOICE. CLAIM THE 16,000 POOL.",
    text: "Use the 90-second live voice parley in each duel to read your opponent or bluff them into wasting their Shotgun. Wipe out all 3 rival squads so your Squad stands last and splits the entire 16,000 Bounty Token Prize Pool!",
    html: `<div style="text-align:center;color:#fff3cd;">
      <div style="font-size:50px;">🏆</div>
      <strong style="font-family:'Bebas Neue',sans-serif;font-size:40px;color:#f5c85b;">16,000 BOUNTY POOL</strong>
      <p style="font-size:13px;color:#d7d0c0;">+4,000 Tokens per Winning Squad Member!</p>
    </div>`
  }
];

let currentGuideChapter = 0;
let guideTypeTimer = null;

function renderGuideChapter(index) {
  currentGuideChapter = Math.max(0, Math.min(GUIDE_CHAPTERS.length - 1, index));
  const ch = GUIDE_CHAPTERS[currentGuideChapter];

  document.querySelectorAll(".ch-pill").forEach((pill, idx) => {
    pill.classList.toggle("active", idx === currentGuideChapter);
  });

  if ($("guideChapterTag")) $("guideChapterTag").textContent = ch.tag;
  if ($("guideChapterTitle")) $("guideChapterTitle").textContent = ch.title;
  if ($("guideVisualStage")) $("guideVisualStage").innerHTML = ch.html;

  const textEl = $("guideTypewriterText");
  if (textEl) {
    clearInterval(guideTypeTimer);
    textEl.textContent = "";
    let charIdx = 0;
    guideTypeTimer = setInterval(() => {
      if (charIdx < ch.text.length) {
        textEl.textContent += ch.text.charAt(charIdx);
        if (charIdx % 4 === 0) window.ZHSound?.play("type");
        charIdx++;
      } else {
        clearInterval(guideTypeTimer);
      }
    }, 18);
  }

  if ($("nextGuideChapterBtn")) {
    $("nextGuideChapterBtn").textContent = currentGuideChapter === GUIDE_CHAPTERS.length - 1 ? "FINISH GUIDE ✓" : "NEXT CHAPTER →";
  }
}

$("openGuideBtn")?.addEventListener("click", () => {
  window.ZHSound?.play("click");
  $("cinematicGuideScreen")?.classList.remove("hidden");
  renderGuideChapter(0);
});

$("skipGuideBtn")?.addEventListener("click", () => {
  clearInterval(guideTypeTimer);
  $("cinematicGuideScreen")?.classList.add("hidden");
});

$("prevGuideChapterBtn")?.addEventListener("click", () => {
  window.ZHSound?.play("click");
  renderGuideChapter(currentGuideChapter - 1);
});

$("nextGuideChapterBtn")?.addEventListener("click", () => {
  window.ZHSound?.play("click");
  if (currentGuideChapter >= GUIDE_CHAPTERS.length - 1) {
    clearInterval(guideTypeTimer);
    $("cinematicGuideScreen")?.classList.add("hidden");
  } else {
    renderGuideChapter(currentGuideChapter + 1);
  }
});

document.querySelectorAll(".ch-pill").forEach(pill => {
  pill.addEventListener("click", () => {
    window.ZHSound?.play("click");
    renderGuideChapter(Number(pill.dataset.ch || 0));
  });
});

updateModeSelectionUI();
paintProfileAndWallet();
updateAdButtonUI();