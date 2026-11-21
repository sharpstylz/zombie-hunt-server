/* =========================================================
   ZOMBIE HUNT — DM ENGINE (WITH CALLS, MUTE & LONG-PRESS MENU)
   Location: public/messages/messages.js
========================================================= */

const $ = id => document.getElementById(id);
const AVATAR_FOLDER = "../profile/avatars/";
const DM_STORAGE_KEY = "zh_dm_threads_v4";

function showToast(msg) {
  const el = $("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2400);
}

function escapeHTML(str) {
  const d = document.createElement("div");
  d.textContent = String(str ?? "");
  return d.innerHTML;
}

let activeFolder = "primary";
let selectedPartnerHandle = null;
let contextTargetHandle = null; 
let searchFilterText = "";
let socket = null;

/* ---------------------------------------------------------
   1. LOAD & SAVE THREADS
--------------------------------------------------------- */
function loadAllThreads() {
  try {
    const saved = JSON.parse(localStorage.getItem(DM_STORAGE_KEY));
    if (saved && typeof saved === "object" && Object.keys(saved).length > 0) return saved;
  } catch {}
  return {};
}

let threadsDB = loadAllThreads();
function saveThreads() { localStorage.setItem(DM_STORAGE_KEY, JSON.stringify(threadsDB)); }

function formatTimeAgo(ts) {
  const diffSec = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

/* ---------------------------------------------------------
   2. RENDER SIDEBAR THREAD LIST & LONG-PRESS (RIGHT CLICK)
--------------------------------------------------------- */
function renderSidebarThreads() {
  const listEl = $("dmThreadList");
  if (!listEl) return;

  const allEntries = Object.values(threadsDB);
  const primaryThreads = allEntries.filter(t => t.folder === "primary");
  const requestThreads = allEntries.filter(t => t.folder === "requests");

  if ($("primaryCountBadge")) $("primaryCountBadge").textContent = primaryThreads.length;
  if ($("requestsCountBadge")) $("requestsCountBadge").textContent = requestThreads.length;

  let visibleThreads = activeFolder === "primary" ? primaryThreads : requestThreads;
  if (searchFilterText.trim()) {
    const q = searchFilterText.trim().toUpperCase();
    visibleThreads = visibleThreads.filter(t => t.handle.toUpperCase().includes(q) || t.messages.some(m => m.text.toUpperCase().includes(q)));
  }

  visibleThreads.sort((a, b) => (b.messages[b.messages.length - 1]?.time || 0) - (a.messages[a.messages.length - 1]?.time || 0));

  if (visibleThreads.length === 0) {
    listEl.innerHTML = `<div style="text-align:center;padding:32px 16px;color:#626c65;font-size:12px;">No conversations found.</div>`;
    return;
  }

  listEl.innerHTML = visibleThreads.map(thread => {
    const p = window.ZHStats.getPublicProfileByHandle(thread.handle);
    const lastMsg = thread.messages[thread.messages.length - 1] || { text: "No messages yet", time: Date.now() };
    const isSelected = selectedPartnerHandle === thread.handle;
    const hasUnread = thread.unreadCount > 0;
    
    const msgMuted = window.ZHMute?.isMessageMuted(thread.handle);
    const callMuted = window.ZHMute?.isCallMuted(thread.handle);
    let muteIcons = "";
    if (msgMuted) muteIcons += `<span title="Messages Muted" style="font-size:11px;margin-left:4px;">🔕</span>`;
    if (callMuted) muteIcons += `<span title="Calls Muted" style="font-size:11px;margin-left:2px;">📵</span>`;

    return `
      <div class="thread-item ${isSelected ? "active-thread" : ""} ${hasUnread ? "unread-thread" : ""}" data-thread-handle="${escapeHTML(thread.handle)}">
        <div class="thread-avatar-box"><img src="${AVATAR_FOLDER}${p.avatar}" alt="${escapeHTML(p.name)}"></div>
        <div class="thread-info">
          <div class="thread-top-line">
            <strong>${escapeHTML(p.name.toUpperCase())} ${muteIcons}</strong>
            <span class="thread-time">${formatTimeAgo(lastMsg.time)}</span>
          </div>
          <div class="thread-preview-line">
            <p>${lastMsg.fromMe ? "You: " : ""}${escapeHTML(lastMsg.text)}</p>
            ${hasUnread ? `<span class="unread-dot"></span>` : ""}
          </div>
        </div>
      </div>
    `;
  }).join("");

  // BIND LONG-PRESS & CLICK EVENTS
  listEl.querySelectorAll("[data-thread-handle]").forEach(item => {
    let pressTimer;
    const handle = item.dataset.threadHandle;

    item.addEventListener("click", (e) => {
      if (item.dataset.held === "true") {
        item.dataset.held = "false";
        return;
      }
      window.ZHSound?.play("click");
      openConversationThread(handle);
    });

    item.addEventListener("touchstart", (e) => {
      pressTimer = setTimeout(() => {
        item.dataset.held = "true";
        openThreadContextMenu(handle);
      }, 500); 
    });
    item.addEventListener("touchend", () => clearTimeout(pressTimer));
    item.addEventListener("touchmove", () => clearTimeout(pressTimer));

    item.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      openThreadContextMenu(handle);
    });
  });
}

/* ---------------------------------------------------------
   3. BOTTOM-SHEET CONTEXT MENU (OPEN & ACTION BINDINGS)
--------------------------------------------------------- */
function openThreadContextMenu(handle) {
  if (navigator.vibrate) navigator.vibrate(40);
  window.ZHSound?.play("click");
  contextTargetHandle = handle;
  
  const p = window.ZHStats.getPublicProfileByHandle(handle);
  if ($("contextMenuAvatar")) $("contextMenuAvatar").src = AVATAR_FOLDER + p.avatar;
  if ($("contextMenuName")) $("contextMenuName").textContent = `@${p.handle.toLowerCase()}`;

  const msgMuted = window.ZHMute.isMessageMuted(handle);
  if ($("ctxMsgIcon")) $("ctxMsgIcon").textContent = msgMuted ? "🔔" : "🔕";
  if ($("ctxMsgText")) $("ctxMsgText").textContent = msgMuted ? "Unmute Messages" : "Mute Messages";

  const callMuted = window.ZHMute.isCallMuted(handle);
  if ($("ctxCallIcon")) $("ctxCallIcon").textContent = callMuted ? "📞" : "📵";
  if ($("ctxCallText")) $("ctxCallText").textContent = callMuted ? "Unmute Audio Calls" : "Mute Audio Calls";

  $("threadContextMenu")?.classList.remove("hidden");
}

function bindContextMenuActions() {
  $("closeContextMenuBackdrop")?.addEventListener("click", () => {
    $("threadContextMenu")?.classList.add("hidden");
  });

  $("ctxViewProfileBtn")?.addEventListener("click", () => {
    if (!contextTargetHandle) return;
    $("threadContextMenu")?.classList.add("hidden");
    window.location.href = `../profile/profile.html?user=${encodeURIComponent(contextTargetHandle)}`;
  });

  $("ctxMuteMessagesBtn")?.addEventListener("click", () => {
    if (!contextTargetHandle) return;
    window.ZHSound?.play("lock");
    const isMuted = window.ZHMute.toggleMuteMessages(contextTargetHandle);
    showToast(isMuted ? `Muted messages from @${contextTargetHandle}` : `Unmuted messages from @${contextTargetHandle}`);
    $("threadContextMenu")?.classList.add("hidden");
    renderSidebarThreads();
  });

  $("ctxMuteCallsBtn")?.addEventListener("click", () => {
    if (!contextTargetHandle) return;
    window.ZHSound?.play("lock");
    const isMuted = window.ZHMute.toggleMuteCalls(contextTargetHandle);
    showToast(isMuted ? `Muted calls from @${contextTargetHandle}` : `Unmuted calls from @${contextTargetHandle}`);
    $("threadContextMenu")?.classList.add("hidden");
    renderSidebarThreads();
  });

  $("ctxDeleteChatBtn")?.addEventListener("click", () => {
    if (!contextTargetHandle) return;
    window.ZHSound?.play("lock");
    delete threadsDB[contextTargetHandle];
    saveThreads();
    if (selectedPartnerHandle === contextTargetHandle) {
      selectedPartnerHandle = null;
      $("dmActiveConversation")?.classList.add("hidden");
      $("dmEmptyState")?.classList.remove("hidden");
      document.querySelector(".dm-page-shell")?.classList.remove("mobile-chat-open");
    }
    showToast(`Chat with @${contextTargetHandle} deleted.`);
    $("threadContextMenu")?.classList.add("hidden");
    renderSidebarThreads();
  });
}

/* ---------------------------------------------------------
   4. OPEN CONVERSATION THREAD
--------------------------------------------------------- */
function openConversationThread(handle) {
  if (!handle) return;
  const cleanHandle = handle.trim().toUpperCase();

  if (!threadsDB[cleanHandle]) {
    const amFollowing = window.ZHStats.isFollowing(cleanHandle);
    threadsDB[cleanHandle] = { handle: cleanHandle, folder: "primary", accepted: true, unreadCount: 0, messages: [] };
    saveThreads();
  }

  selectedPartnerHandle = cleanHandle;
  const thread = threadsDB[cleanHandle];
  const partnerProfile = window.ZHStats.getPublicProfileByHandle(cleanHandle);

  $("dmEmptyState")?.classList.add("hidden");
  $("dmActiveConversation")?.classList.remove("hidden");
  document.querySelector(".dm-page-shell")?.classList.add("mobile-chat-open");

  if (thread.accepted && thread.folder === "primary") {
    thread.unreadCount = 0;
    thread.messages.forEach(m => { if (!m.fromMe) m.seen = true; });
    saveThreads();
    socket?.emit("mark_dm_seen", { fromHandle: window.ZHStats.getLocalPlayerStats().handle, toHandle: cleanHandle });
  }

  if ($("partnerAvatarImg")) $("partnerAvatarImg").src = AVATAR_FOLDER + partnerProfile.avatar;
  if ($("partnerDisplayName")) $("partnerDisplayName").textContent = partnerProfile.name.toUpperCase();
  if ($("partnerSubStats")) $("partnerSubStats").textContent = `RANK #${partnerProfile.globalRankNumber} • ${partnerProfile.cp.toLocaleString()} CP`;

  const isUnacceptedRequest = (thread.folder === "requests" && !thread.accepted);
  $("dmRequestGateBanner")?.classList.toggle("hidden", !isUnacceptedRequest);
  $("dmComposerForm")?.classList.toggle("hidden", isUnacceptedRequest);
  $("startAudioCallBtn")?.classList.toggle("hidden", isUnacceptedRequest); 

  if ($("muteMessagesToggle") && window.ZHMute) {
    $("muteMessagesToggle").checked = window.ZHMute.isMessageMuted(cleanHandle);
    $("muteCallsToggle").checked = window.ZHMute.isCallMuted(cleanHandle);
  }

  renderMessagesStream(thread);
  renderSidebarThreads();
}

function renderMessagesStream(thread) {
  const stream = $("dmMessagesStream");
  if (!stream) return;

  if (!thread.messages || thread.messages.length === 0) {
    stream.innerHTML = `<div style="margin:auto;text-align:center;color:#626c65;font-size:12.5px;">Send a message to start conversation.</div>`;
    return;
  }

  stream.innerHTML = thread.messages.map(m => {
    const receiptHTML = m.fromMe
      ? (m.seen ? `<span class="seen-receipt">✓✓ SEEN</span>` : `<span class="sent-receipt">✓ DELIVERED</span>`)
      : (thread.accepted ? `<span class="seen-receipt">✓✓ READ</span>` : `<span class="sent-receipt">🔒 STEALTH READ</span>`);
    return `
      <div class="msg-row ${m.fromMe ? "outgoing" : "incoming"}">
        <div class="msg-bubble">${escapeHTML(m.text)}</div>
        <div class="msg-foot-meta"><span>${formatTimeAgo(m.time)}</span><span>•</span>${receiptHTML}</div>
      </div>
    `;
  }).join("");
  stream.scrollTop = stream.scrollHeight;
}

$("dmComposerForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const input = $("dmMessageInput");
  if (!input || !input.value.trim() || !selectedPartnerHandle) return;
  window.ZHSound?.play("lock");
  const text = input.value.trim();
  input.value = "";
  
  const thread = threadsDB[selectedPartnerHandle];
  const msgId = `msg_${Date.now()}`;
  thread.messages.push({ id: msgId, fromMe: true, text, time: Date.now(), seen: false });
  saveThreads();
  renderMessagesStream(thread);
  renderSidebarThreads();

  if (socket && socket.connected) {
    socket.emit("send_private_dm", {
      fromSessionId: localStorage.getItem("zh_player_session_id"),
      fromName: window.ZHStats.getLocalPlayerStats().handle,
      toSessionId: selectedPartnerHandle,
      text
    });
  }
});

/* ---------------------------------------------------------
   5. TOP HEADER ACTIONS (MUTE SETTINGS, VIEW PROFILE)
--------------------------------------------------------- */
$("openMuteSettingsBtn")?.addEventListener("click", () => {
  window.ZHSound?.play("click");
  $("muteSettingsModal")?.classList.remove("hidden");
});
$("closeMuteBtn")?.addEventListener("click", () => $("muteSettingsModal")?.classList.add("hidden"));
$("closeMuteBackdrop")?.addEventListener("click", () => $("muteSettingsModal")?.classList.add("hidden"));

$("muteMessagesToggle")?.addEventListener("change", () => {
  if (selectedPartnerHandle && window.ZHMute) {
    window.ZHMute.toggleMuteMessages(selectedPartnerHandle);
    renderSidebarThreads();
  }
});
$("muteCallsToggle")?.addEventListener("change", () => {
  if (selectedPartnerHandle && window.ZHMute) {
    window.ZHMute.toggleMuteCalls(selectedPartnerHandle);
  }
});

$("headerViewProfileBtn")?.addEventListener("click", () => { 
  window.location.href = `../profile/profile.html?user=${encodeURIComponent(selectedPartnerHandle)}`; 
});
$("mobileBackThreadsBtn")?.addEventListener("click", () => { 
  document.querySelector(".dm-page-shell")?.classList.remove("mobile-chat-open"); 
});
$("backHubBtn")?.addEventListener("click", () => { window.location.href = "../index.html"; });
$("goMyProfileBtn")?.addEventListener("click", () => { window.location.href = "../profile/profile.html"; });


/* ---------------------------------------------------------
   6. STEALTH MODE ACCEPT / DECLINE ACTIONS
--------------------------------------------------------- */
$("acceptRequestBtn")?.addEventListener("click", () => {
  if (!selectedPartnerHandle || !threadsDB[selectedPartnerHandle]) return;
  window.ZHSound?.play("victory");
  const thread = threadsDB[selectedPartnerHandle];
  thread.folder = "primary";
  thread.accepted = true;
  thread.unreadCount = 0;
  thread.messages.forEach(m => { m.seen = true; });
  saveThreads();
  activeFolder = "primary";
  $("tabPrimaryBtn")?.classList.add("active");
  $("tabRequestsBtn")?.classList.remove("active");
  openConversationThread(selectedPartnerHandle);
  showToast(`REQUEST ACCEPTED!`);
});

$("declineRequestBtn")?.addEventListener("click", () => {
  if (!selectedPartnerHandle || !threadsDB[selectedPartnerHandle]) return;
  window.ZHSound?.play("click");
  delete threadsDB[selectedPartnerHandle];
  saveThreads();
  selectedPartnerHandle = null;
  $("dmActiveConversation")?.classList.add("hidden");
  $("dmEmptyState")?.classList.remove("hidden");
  renderSidebarThreads();
});


/* ---------------------------------------------------------
   7. 1v1 AUDIO CALL ENGINE & NEW DM DIRECTORY
--------------------------------------------------------- */
let callDurationTimer = null;
let callSeconds = 0;
let isCallActive = false;

function formatCallTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

$("startAudioCallBtn")?.addEventListener("click", () => {
  if (!selectedPartnerHandle) return;
  window.ZHSound?.play("click");
  
  if (socket && socket.connected) {
    const myId = localStorage.getItem("zh_player_session_id");
    const channelId = `dm_call_${myId}_${selectedPartnerHandle}`;
    socket.emit("dm_call_offer", { fromId: myId, fromName: window.ZHStats.getLocalPlayerStats().name, toId: selectedPartnerHandle, channelId: channelId });
    showActiveCallUI(selectedPartnerHandle, "CALLING...", true);
    window.ZHVoice?.joinChannel(socket, channelId, false);
  } else {
    showToast("SERVER OFFLINE. Cannot initiate call.");
  }
});

$("endCallBtn")?.addEventListener("click", () => {
  window.ZHSound?.play("click");
  isCallActive = false;
  clearInterval(callDurationTimer);
  window.ZHVoice?.leaveChannel();
  $("activeCallOverlay")?.classList.add("hidden");
  if (socket && socket.connected && selectedPartnerHandle) socket.emit("dm_call_end", { toId: selectedPartnerHandle });
});

$("callMicToggleBtn")?.addEventListener("click", async () => {
  if (window.ZHVoice) {
    const active = await window.ZHVoice.toggleMic();
    const btn = $("callMicToggleBtn");
    if (active) { btn.classList.remove("mic-off"); btn.textContent = "🎤"; } 
    else { btn.classList.add("mic-off"); btn.textContent = "🔇"; }
  }
});

function showActiveCallUI(partnerHandle, statusText, isInitiator) {
  isCallActive = true;
  $("activeCallOverlay")?.classList.remove("hidden");
  $("callStatusTag").textContent = statusText;
  const p = window.ZHStats.getPublicProfileByHandle(partnerHandle);
  $("callTargetName").textContent = p.name.toUpperCase();
  $("callAvatarImg").src = AVATAR_FOLDER + p.avatar;
  $("acceptCallBtn")?.classList.toggle("hidden", isInitiator);
  $("callMicToggleBtn")?.classList.toggle("hidden", !isInitiator);
  clearInterval(callDurationTimer);
  $("callTimerDisplay").textContent = "Connecting...";
}

function startCallDuration() {
  $("callStatusTag").textContent = "LIVE AUDIO CALL";
  $("acceptCallBtn")?.classList.add("hidden");
  $("callMicToggleBtn")?.classList.remove("hidden");
  clearInterval(callDurationTimer);
  callSeconds = 0;
  $("callTimerDisplay").textContent = "00:00";
  callDurationTimer = setInterval(() => {
    callSeconds++;
    $("callTimerDisplay").textContent = formatCallTime(callSeconds);
  }, 1000);
}

$("newMessageModalBtn")?.addEventListener("click", () => {
  window.ZHSound?.play("click");
  const list = $("quickDirectoryList");
  if (list) {
    const roster = window.ZH_CONFIG.TOP_HUNTERS_ROSTER;
    list.innerHTML = roster.map(r => {
      const p = window.ZHStats.getPublicProfileByHandle(r.handle);
      return `
        <div class="thread-item" data-start-dm="${p.handle}" style="background:#fff9ed;border:1px solid rgba(24,34,29,0.12);">
          <div class="thread-avatar-box" style="width:40px;height:40px;"><img src="${AVATAR_FOLDER}${p.avatar}" alt="${p.name}"></div>
          <div class="thread-info">
            <strong style="font-size:13px;">${p.name.toUpperCase()}</strong>
            <small style="display:block;font-size:10.5px;color:#545e57;">RANK #${p.globalRankNumber}</small>
          </div>
          <span style="font-family:'Oswald',sans-serif;font-size:11px;font-weight:800;color:#2e7d5b;">MESSAGE →</span>
        </div>
      `;
    }).join("");

    list.querySelectorAll("[data-start-dm]").forEach(row => {
      row.onclick = () => {
        window.ZHSound?.play("lock");
        $("newDmModal")?.classList.add("hidden");
        activeFolder = "primary";
        $("tabPrimaryBtn")?.classList.add("active");
        $("tabRequestsBtn")?.classList.remove("active");
        openConversationThread(row.dataset.startDm);
      };
    });
  }
  $("newDmModal")?.classList.remove("hidden");
});
$("closeNewDmBtn")?.addEventListener("click", () => $("newDmModal")?.classList.add("hidden"));
$("closeNewDmBackdrop")?.addEventListener("click", () => $("newDmModal")?.classList.add("hidden"));

$("startCustomHandleChatBtn")?.addEventListener("click", () => {
  const val = $("customTargetHandleInput")?.value.trim();
  if (!val) return showToast("ENTER AN OPERATIVE HANDLE");
  $("newDmModal")?.classList.add("hidden");
  activeFolder = "primary";
  $("tabPrimaryBtn")?.classList.add("active");
  $("tabRequestsBtn")?.classList.remove("active");
  openConversationThread(val);
});

/* ---------------------------------------------------------
   8. SOCKET.IO INTEGRATION & INITIALIZATION
--------------------------------------------------------- */
document.querySelectorAll(".folder-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    window.ZHSound?.play("click");
    document.querySelectorAll(".folder-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    activeFolder = tab.dataset.folder || "primary";
    renderSidebarThreads();
  });
});

$("threadSearchInput")?.addEventListener("input", (e) => {
  searchFilterText = e.target.value || "";
  renderSidebarThreads();
});

function initDmSocket() {
  if (typeof io === "undefined") return;
  socket = io(window.location.origin, { transports: ["websocket", "polling"] });
  const myId = localStorage.getItem("zh_player_session_id");
  const myHandle = window.ZHStats.getLocalPlayerStats().handle;
  socket.emit("join_dm_lobby", { sessionId: myId, handle: myHandle });

  socket.on("receive_private_dm", (data) => {
    const senderHandle = (data.fromName || "SURVIVOR").toUpperCase();
    if (senderHandle === myHandle) return;

    const isMuted = window.ZHMute?.isMessageMuted(senderHandle);
    const amFollowing = window.ZHStats.isFollowing(senderHandle);

    if (!threadsDB[senderHandle]) {
      threadsDB[senderHandle] = { handle: senderHandle, folder: amFollowing ? "primary" : "requests", accepted: amFollowing, unreadCount: 0, messages: [] };
    }

    const thread = threadsDB[senderHandle];
    thread.messages.push({ id: `live_${Date.now()}`, fromMe: false, text: data.text, time: Date.now(), seen: (selectedPartnerHandle === senderHandle && thread.accepted) });

    if (selectedPartnerHandle !== senderHandle || !thread.accepted) {
      thread.unreadCount = (thread.unreadCount || 0) + 1;
    }
    saveThreads();

    if (!isMuted) {
      window.ZHSound?.play("click");
      showToast(thread.accepted ? `NEW MESSAGE FROM @${senderHandle}` : `1 NEW MESSAGE REQUEST FROM @${senderHandle}`);
    }

    if (selectedPartnerHandle === senderHandle) renderMessagesStream(thread);
    renderSidebarThreads();
  });

  socket.on("dm_call_offer", (data) => {
    if (window.ZHMute?.isCallMuted(data.fromName)) return; 
    window.ZHSound?.play("victory"); 
    selectedPartnerHandle = data.fromName;
    showActiveCallUI(data.fromName, "INCOMING CALL...", false);
    
    $("acceptCallBtn").onclick = () => {
      window.ZHSound?.play("click");
      startCallDuration();
      window.ZHVoice?.joinChannel(socket, data.channelId, false);
      socket.emit("dm_call_answer", { toId: data.fromId });
    };
  });

  socket.on("dm_call_answer", () => { if (isCallActive) startCallDuration(); });
  socket.on("dm_call_end", () => { if (isCallActive) { isCallActive = false; clearInterval(callDurationTimer); window.ZHVoice?.leaveChannel(); $("activeCallOverlay")?.classList.add("hidden"); } });
}

/* =========================================================
   CRITICAL FIX: ATTACH ALL EVENTS AT BOOT
========================================================= */
function bootMessagesPage() {
  initDmSocket();
  
  // FINALLY BINDING THE LONG-PRESS CONTEXT MENU!
  bindContextMenuActions(); 

  const params = new URLSearchParams(window.location.search);
  const directTarget = params.get("to");

  if (directTarget) {
    activeFolder = "primary";
    openConversationThread(directTarget);
  } else {
    const primaryKeys = Object.keys(threadsDB).filter(k => threadsDB[k].folder === "primary");
    if (primaryKeys.length > 0) {
      openConversationThread(primaryKeys[0]);
    } else {
      $("dmActiveConversation")?.classList.add("hidden");
      $("dmEmptyState")?.classList.remove("hidden");
      renderSidebarThreads();
    }
  }
}

// EXECUTE BOOT
bootMessagesPage();