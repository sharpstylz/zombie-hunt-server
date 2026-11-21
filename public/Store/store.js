/* =========================================================
   ZOMBIE HUNT — FULL-PAGE STORE WORLD CONTROLLER v7.0 (store.js)
   Fixes:
   - Full EQUIP / UNEQUIP toggle on VIP Pass (1M & 6M) AND all Store Items!
   - Progressive Tiered Pricing Ladder (Entry ₹19 -> Pro ₹29 -> Elite ₹49 -> Mythic ₹89)
   Location: public/store/store.js
========================================================= */

const $ = id => document.getElementById(id);
const AVATAR_FOLDER = "../profile/avatars/";

function showToast(msg) {
  const el = $("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2500);
}

/* ---------------------------------------------------------
   1. PROGRESSIVE TIERED STORE CATALOG (ASCENDING PRICES BY APPEAL)
--------------------------------------------------------- */
const INR_ARMORY_CATALOG = [
  // AVATAR FRAMES (Progressive Pricing: ₹19 -> ₹29 -> ₹45 -> ₹65 -> ₹89 -> VIP)
  {
    id: "frame_biohazard",
    name: "BIOHAZARD NEON RING",
    category: "AVATAR FRAME",
    filterGroup: "frames",
    priceINR: 19,
    tier: "TIER 1 • STARTER RING",
    cssClass: "cosmetic-frame-biohazard",
    desc: "Radioactive emerald-green glowing border around your circular profile avatar."
  },
  {
    id: "frame_cyber",
    name: "CYBER VISOR RING",
    category: "AVATAR FRAME",
    filterGroup: "frames",
    priceINR: 29,
    tier: "TIER 2 • TACTICAL RING",
    cssClass: "cosmetic-frame-cyber",
    desc: "High-voltage cyan laser rim around your profile picture across Lobby & Arena."
  },
  {
    id: "frame_squircle",
    name: "CRIMSON SQUIRCLE SHIELD",
    category: "AVATAR FRAME",
    filterGroup: "frames",
    priceINR: 45,
    tier: "TIER 3 • CUSTOM SHAPE",
    cssClass: "cosmetic-frame-squircle",
    desc: "Transforms your profile avatar into a modern rounded-square ruby & gold badge."
  },
  {
    id: "frame_dual_halo",
    name: "DUAL-HALO ORBIT RING",
    category: "AVATAR FRAME",
    filterGroup: "frames",
    priceINR: 65,
    tier: "TIER 4 • ELITE HALO",
    cssClass: "cosmetic-frame-dual-halo",
    desc: "Surrounds your profile avatar with a double golden-amber and crimson tactical ring."
  },
  {
    id: "frame_hexagon",
    name: "HEXAGON COMMANDER CREST",
    category: "AVATAR FRAME",
    filterGroup: "frames",
    priceINR: 89,
    tier: "TIER 5 • MYTHIC SHAPE",
    cssClass: "cosmetic-frame-hexagon",
    desc: "Transforms your profile avatar into a sharp 6-sided Esports Hexagon Crest."
  },
  {
    id: "frame_vip_3d_gold",
    name: "3D GOLDEN COMMANDER AURA RING",
    category: "AVATAR FRAME",
    filterGroup: "frames",
    priceINR: 119,
    isVipIncludedRing: true,
    tier: "APEX • 3D SPINNING HALO",
    cssClass: "cosmetic-frame-vip",
    desc: "Spinning 3D Conic-Gold & Ruby Commander Halo. Included FREE with any VIP Pass or ₹119 standalone!"
  },

  // NAMEPLATES (Progressive Pricing: ₹19 -> ₹29 -> ₹49 -> ₹79)
  {
    id: "nameplate_frost_diamond",
    name: "FROSTBYTE SAPPHIRE NAMEPLATE",
    category: "NAMEPLATE",
    filterGroup: "frames",
    priceINR: 19,
    tier: "TIER 1 • ICE SHIMMER",
    cssClass: "cosmetic-name-frost-diamond",
    desc: "Icy royal-blue and crystalline sapphire shimmering handle across Lobby & Profile."
  },
  {
    id: "nameplate_cyber_neon",
    name: "CYBER NEON PULSE NAMEPLATE",
    category: "NAMEPLATE",
    filterGroup: "frames",
    priceINR: 29,
    tier: "TIER 2 • NEON GRADIENT",
    cssClass: "cosmetic-name-cyber-neon",
    desc: "Renders your handle in animated Electric Cyan, Indigo & Neon Magenta gradient text."
  },
  {
    id: "nameplate_blood_inferno",
    name: "BLOOD-FIRE INFERNO NAMEPLATE",
    category: "NAMEPLATE",
    filterGroup: "frames",
    priceINR: 49,
    tier: "TIER 3 • MOLTEN FLAME",
    cssClass: "cosmetic-name-blood-inferno",
    desc: "Blazing crimson-scarlet and molten orange animated text for aggressive hunters."
  },
  {
    id: "nameplate_royal_gold",
    name: "ROYAL GOLD SOVEREIGN NAMEPLATE",
    category: "NAMEPLATE",
    filterGroup: "frames",
    priceINR: 79,
    tier: "TIER 4 • MOST POPULAR",
    cssClass: "cosmetic-name-royal-gold",
    desc: "Our #1 flagship nameplate! Shimmering 24K Gold & Ruby gradient text everywhere."
  },

  // SHIELDS, CARD DECKS & ARENA TABLES (Progressive Pricing: ₹29 -> ₹35 -> ₹55 -> ₹69 -> ₹79 -> ₹99)
  {
    id: "shield_bounty_3x",
    name: "BOUNTY LOSS SHIELD (3 MATCHES)",
    category: "TACTICAL SHIELD",
    filterGroup: "decks",
    priceINR: 29,
    tier: "ENTRY PROTECTION",
    isShieldPack: true,
    desc: "Protects your 1,000 Entry Fee for 3 matches! If defeated, your entry tokens are refunded."
  },
  {
    id: "deck_emerald",
    name: "ROYAL EMERALD DECK",
    category: "CARD SKIN",
    filterGroup: "decks",
    priceINR: 35,
    tier: "TIER 1 • DECK SKIN",
    cssClass: "cosmetic-deck-emerald",
    desc: "Transforms all card backs in the Battle Arena into deep Emerald & Antique Gold trim."
  },
  {
    id: "deck_bloodmoon",
    name: "BLOOD-MOON CARD BACK",
    category: "CARD SKIN",
    filterGroup: "decks",
    priceINR: 55,
    tier: "TIER 2 • CRIMSON FOIL",
    cssClass: "cosmetic-deck-bloodmoon",
    desc: "Transforms all card backs on the Battle Table into glowing Crimson Blood-Moon foil."
  },
  {
    id: "table_crimson_velvet",
    name: "CRIMSON CASINO TABLE",
    category: "TABLE THEME",
    filterGroup: "decks",
    priceINR: 69,
    tier: "ARENA FELT THEME",
    cssClass: "table-crimson-velvet",
    desc: "Customizes the battle arena felt into a high-stakes Monte Carlo crimson table."
  },
  {
    id: "deck_obsidian",
    name: "OBSIDIAN CARBON DECK",
    category: "CARD SKIN",
    filterGroup: "decks",
    priceINR: 79,
    tier: "TIER 3 • MYTHIC DECK",
    cssClass: "cosmetic-deck-obsidian",
    desc: "Matte black carbon-fiber playing cards with electric blue neon emblem."
  },
  {
    id: "table_obsidian_war",
    name: "OBSIDIAN WAR TABLE",
    category: "TABLE THEME",
    filterGroup: "decks",
    priceINR: 99,
    tier: "APEX • COMMAND BUNKER",
    cssClass: "table-obsidian-war",
    desc: "Dark slate command-bunker battle surface with high-contrast gold lines."
  }
];

const TOKEN_VAULT_CATALOG = [
  {
    id: "crate_tactical",
    name: "TACTICAL SUPPLY CRATE",
    category: "SUPPLY CRATE",
    filterGroup: "crates",
    priceTokens: 1500,
    tier: "TOKEN MYSTERY BOX",
    isCrate: true,
    desc: "Open to win between 1,000 to 4,500 Bounty Tokens or a free Bounty Loss Shield!"
  },
  {
    id: "crate_commander",
    name: "GOLDEN COMMANDER CRATE",
    category: "SUPPLY CRATE",
    filterGroup: "crates",
    priceTokens: 4000,
    tier: "JACKPOT BOX",
    isCrate: true,
    desc: "High-stakes crate! Win up to 12,000 Bounty Tokens or 3x Bounty Loss Shields!"
  },
  {
    id: "banner_stalker",
    name: "CALLSIGN: NIGHT STALKER",
    category: "KILL BANNER",
    filterGroup: "tokens",
    priceTokens: 2000,
    tier: "TIER 1 • TOKEN TITLE",
    callsignText: "⚡ NIGHT STALKER",
    desc: "Equips the '⚡ NIGHT STALKER' title badge on your profile and lobby card."
  },
  {
    id: "banner_bluff_master",
    name: "CALLSIGN: BLUFF MASTER",
    category: "KILL BANNER",
    filterGroup: "tokens",
    priceTokens: 3000,
    tier: "TIER 2 • TOKEN TITLE",
    callsignText: "🃏 BLUFF MASTER",
    desc: "Equips the '🃏 BLUFF MASTER' title badge on your profile and lobby card."
  },
  {
    id: "nameplate_toxic_venom",
    name: "TOXIC BIO-VENOM NAMEPLATE",
    category: "NAMEPLATE",
    filterGroup: "tokens",
    priceTokens: 4000,
    tier: "TIER 3 • TOKEN NAMEPLATE",
    cssClass: "cosmetic-name-toxic-venom",
    desc: "Radioactive emerald-green and bio-gold animated handle unlockable with Bounty Tokens!"
  },
  {
    id: "banner_apex_hunter",
    name: "CALLSIGN: APEX HUNTER",
    category: "KILL BANNER",
    filterGroup: "tokens",
    priceTokens: 5000,
    tier: "TIER 4 • ELITE TITLE",
    callsignText: "🎯 APEX HUNTER",
    desc: "Equips the '🎯 APEX HUNTER' title badge on your profile and lobby card."
  },
  {
    id: "deck_vintage_ivory",
    name: "VINTAGE IVORY CLUB DECK",
    category: "CARD SKIN",
    filterGroup: "tokens",
    priceTokens: 6500,
    tier: "TIER 5 • ROYAL DECK",
    cssClass: "cosmetic-deck-vintage-ivory",
    desc: "Classic parchment-cream luxury card backs with brushed brass borders."
  }
];

let activeFilter = "all";

/* ---------------------------------------------------------
   2. LIVE TRY-ON PREVIEW STAGE & VIP BUTTON STATE CONTROLLER
--------------------------------------------------------- */
function syncPreviewStage(overrideItem = null) {
  const me = window.ZHStats.getLocalPlayerStats();
  const eq = window.ZHWallet.getEquipped();
  const hasVipSub = window.ZHWallet.hasActiveVipSubscription();
  const vipEquipped = window.ZHWallet.isVipEquipped();
  const showVipVisual = (hasVipSub && vipEquipped) || (overrideItem && (overrideItem.id === "vip_pass" || overrideItem.id === "frame_vip_3d_gold"));

  if ($("storeTokenBalance")) {
    $("storeTokenBalance").textContent = window.ZHWallet.getTokens().toLocaleString();
  }
  if ($("activeShieldsCount")) {
    $("activeShieldsCount").textContent = window.ZHWallet.getShieldCharges();
  }
  if ($("activeAdStatusText")) {
    $("activeAdStatusText").textContent = window.ZHWallet.getAdFreeStatusLabel();
  }

  const avatarSrc = window.ZHAuth
    ? window.ZHAuth.resolvePlayerAvatarSrc(AVATAR_FOLDER, me.avatar)
    : AVATAR_FOLDER + me.avatar;

  if ($("previewAvatarImg")) $("previewAvatarImg").src = avatarSrc;

  const allItems = [...INR_ARMORY_CATALOG, ...TOKEN_VAULT_CATALOG];
  const nameplateId = (overrideItem && overrideItem.category === "NAMEPLATE") ? overrideItem.id : eq["NAMEPLATE"];
  const nameEl = $("previewPlayerName");
  if (nameEl) {
    nameEl.textContent = me.name.toUpperCase();
    nameEl.className = "";
    if (nameplateId) {
      const npObj = allItems.find(x => x.id === nameplateId);
      if (npObj?.cssClass) nameEl.classList.add(npObj.cssClass);
    }
  }

  if ($("previewPinnedTick")) {
    $("previewPinnedTick").innerHTML = showVipVisual ? window.ZHIcons.renderVerifiedTickHTML("zh-avatar-tick-pin") : "";
  }
  if ($("previewInlineTick")) {
    $("previewInlineTick").innerHTML = showVipVisual ? window.ZHIcons.renderVerifiedTickHTML("zh-inline-vip-tick") : "";
  }

  const frameId = (overrideItem && overrideItem.category === "AVATAR FRAME") ? overrideItem.id : eq["AVATAR FRAME"];
  const deckId = (overrideItem && overrideItem.category === "CARD SKIN") ? overrideItem.id : eq["CARD SKIN"];
  const tableId = (overrideItem && overrideItem.category === "TABLE THEME") ? overrideItem.id : eq["TABLE THEME"];
  const bannerId = (overrideItem && overrideItem.category === "KILL BANNER") ? overrideItem.id : eq["KILL BANNER"];

  const ringEl = $("previewAvatarRing");
  if (ringEl) {
    ringEl.className = "stage-avatar-ring";
    if (overrideItem && overrideItem.id === "vip_pass") {
      ringEl.classList.add("cosmetic-frame-vip");
    } else if (frameId) {
      const fObj = allItems.find(x => x.id === frameId);
      if (fObj?.cssClass) ringEl.classList.add(fObj.cssClass);
    } else if (showVipVisual) {
      ringEl.classList.add("cosmetic-frame-vip");
    }
  }

  ["previewCardBack1", "previewCardBack2", "previewCardBack3"].forEach(cid => {
    const cEl = $(cid);
    if (!cEl) return;
    cEl.classList.remove("cosmetic-deck-bloodmoon", "cosmetic-deck-emerald", "cosmetic-deck-obsidian", "cosmetic-deck-vintage-ivory");
    if (deckId) {
      const dObj = allItems.find(x => x.id === deckId);
      if (dObj?.cssClass) cEl.classList.add(dObj.cssClass);
    }
  });

  const tableEl = $("previewTableSurface");
  if (tableEl) {
    tableEl.classList.remove("table-crimson-velvet", "table-obsidian-war");
    if (tableId) {
      const tObj = INR_ARMORY_CATALOG.find(x => x.id === tableId);
      if (tObj?.cssClass) tableEl.classList.add(tObj.cssClass);
    }
  }

  if ($("previewCallsignBadge")) {
    const bObj = allItems.find(x => x.id === bannerId);
    $("previewCallsignBadge").textContent = bObj?.callsignText
      ? bObj.callsignText
      : showVipVisual
      ? "MYTHIC COMMANDER"
      : me.rankTitle;
  }

  if ($("previewingItemName")) {
    $("previewingItemName").textContent = overrideItem
      ? `PREVIEWING: ${overrideItem.name}`
      : "CURRENT EQUIPPED GEAR";
  }

  // UPDATE VIP PASS BUTTONS TO SHOW EQUIP / UNEQUIP ONCE PURCHASED!
  const remDays = window.ZHWallet.getVipRemainingDays();
  const btn1M = $("buyVipMonthlyBtn");
  const btn6M = $("buyVipSixMonthsBtn");

  if ($("vipStatusBadgeText")) {
    $("vipStatusBadgeText").textContent = hasVipSub
      ? `✓ VIP PASS OWNED (${remDays} DAYS LEFT) • ${vipEquipped ? "EQUIPPED" : "UNEQUIPPED"}`
      : "ROYAL VERIFIED MEMBERSHIP";
  }

  if (hasVipSub) {
    if (btn1M) {
      btn1M.textContent = vipEquipped ? "✓ VIP EQUIPPED (TAP TO UNEQUIP)" : "EQUIP VIP PRIVILEGES";
      btn1M.style.background = vipEquipped ? "#c94735" : "#2e7d5b";
      btn1M.style.color = "#ffffff";
    }
    if (btn6M) {
      btn6M.textContent = vipEquipped ? "✓ VIP ACTIVE (TAP TO UNEQUIP)" : "EQUIP VIP PRIVILEGES";
      btn6M.style.background = vipEquipped ? "#c94735" : "linear-gradient(135deg, #f5c85b, #d49a1a)";
      btn6M.style.color = vipEquipped ? "#ffffff" : "#141c18";
    }
  } else {
    if (btn1M) {
      btn1M.textContent = "ACTIVATE 1 MONTH • ₹199 →";
      btn1M.style.background = "";
      btn1M.style.color = "";
    }
    if (btn6M) {
      btn6M.textContent = "ACTIVATE 6 MONTHS • ₹999 →";
      btn6M.style.background = "";
      btn6M.style.color = "";
    }
  }
}

/* ---------------------------------------------------------
   3. RENDER STORE CATALOG GRIDS (WITH EQUIP / UNEQUIP LABELS)
--------------------------------------------------------- */
function renderStoreCatalogs() {
  const inrGrid = $("inrItemsGrid");
  const tokenGrid = $("tokenItemsGrid");
  const eq = window.ZHWallet.getEquipped();
  const hasVipSub = window.ZHWallet.hasActiveVipSubscription();

  const filteredInr = INR_ARMORY_CATALOG.filter(item =>
    activeFilter === "all" || item.filterGroup === activeFilter
  );
  const filteredTokens = TOKEN_VAULT_CATALOG.filter(item =>
    activeFilter === "all" || item.filterGroup === activeFilter
  );

  $("inrCatalogSection")?.classList.toggle("hidden", filteredInr.length === 0);
  $("tokenCatalogSection")?.classList.toggle("hidden", filteredTokens.length === 0);

  if (inrGrid) {
    inrGrid.innerHTML = filteredInr.map(item => {
      const owned = (!item.isShieldPack && window.ZHWallet.ownsItem(item.id)) || (item.isVipIncludedRing && hasVipSub);
      const isEquipped = !item.isShieldPack && eq[item.category] === item.id;
      return `
        <article class="armory-item-card ${owned ? "owned-card" : ""}">
          <div>
            <div class="item-visual-box">
              <span class="item-tier-badge">${item.tier}</span>
              <span class="item-price-pill">${owned ? "OWNED" : `₹${item.priceINR}`}</span>
              ${renderMiniDemoGraphic(item)}
            </div>
            <div class="item-info" style="margin-top:12px;">
              <h3>${item.name}</h3>
              <p>${item.desc}</p>
            </div>
          </div>

          <div class="item-btn-row">
            ${!item.isShieldPack ? `<button type="button" class="btn-try" data-preview-id="${item.id}">PREVIEW</button>` : ""}
            <button type="button" class="btn-buy-item ${isEquipped ? "equipped-state" : ""}" style="${isEquipped ? 'background:#c94735;' : ''}" data-inr-buy="${item.id}">
              ${isEquipped ? "✓ EQUIPPED (UNEQUIP)" : owned ? "EQUIP NOW" : item.isShieldPack ? `ADD +3 SHIELDS • ₹${item.priceINR}` : `BUY • ₹${item.priceINR}`}
            </button>
          </div>
        </article>
      `;
    }).join("");
  }

  if (tokenGrid) {
    tokenGrid.innerHTML = filteredTokens.map(item => {
      const owned = !item.isCrate && window.ZHWallet.ownsItem(item.id);
      const isEquipped = eq[item.category] === item.id;
      return `
        <article class="armory-item-card ${owned ? "owned-card" : ""}">
          <div>
            <div class="item-visual-box">
              <span class="item-tier-badge">${item.tier}</span>
              <span class="item-price-pill token-pill">${owned ? "OWNED" : `${item.priceTokens.toLocaleString()} TOKENS`}</span>
              ${renderMiniDemoGraphic(item)}
            </div>
            <div class="item-info" style="margin-top:12px;">
              <h3>${item.name}</h3>
              <p>${item.desc}</p>
            </div>
          </div>

          <div class="item-btn-row">
            ${!item.isCrate ? `<button type="button" class="btn-try" data-preview-id="${item.id}">PREVIEW</button>` : ""}
            <button type="button" class="btn-buy-item ${isEquipped ? "equipped-state" : ""}" style="${isEquipped ? 'background:#c94735;' : ''}" data-token-buy="${item.id}">
              ${isEquipped ? "✓ EQUIPPED (UNEQUIP)" : owned ? "EQUIP NOW" : item.isCrate ? `OPEN CRATE (${item.priceTokens.toLocaleString()})` : `REDEEM (${item.priceTokens.toLocaleString()})`}
            </button>
          </div>
        </article>
      `;
    }).join("");
  }

  bindCatalogActions();
}

function renderMiniDemoGraphic(item) {
  if (item.category === "AVATAR FRAME") {
    return `<div class="mini-frame-demo ${item.cssClass || ""}" style="position:relative;z-index:2;"><img src="../profile/avatars/char1.jpg" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"></div>`;
  }
  if (item.category === "NAMEPLATE") {
    return `<span class="${item.cssClass || ""}" style="font-family:'Bebas Neue',sans-serif;font-size:26px;letter-spacing:1.5px;">SURVIVOR</span>`;
  }
  if (item.isShieldPack) {
    return `<div style="font-size:40px;">🛡️</div>`;
  }
  if (item.category === "CARD SKIN") {
    return `<div class="mini-deck-demo preview-playing-card ${item.cssClass || ""}">♠</div>`;
  }
  if (item.category === "TABLE THEME") {
    return `<div style="width:90px;height:54px;border-radius:12px;border:2px solid rgba(255,255,255,0.3);" class="stage-table-felt ${item.cssClass || ""}"></div>`;
  }
  if (item.category === "KILL BANNER") {
    return `<span class="stage-callsign-badge" style="font-size:12px;padding:6px 14px;">${item.callsignText}</span>`;
  }
  return `<div style="font-size:42px;">📦</div>`;
}

function bindCatalogActions() {
  const allItems = [...INR_ARMORY_CATALOG, ...TOKEN_VAULT_CATALOG];

  document.querySelectorAll("[data-preview-id]").forEach(btn => {
    btn.onclick = () => {
      window.ZHSound?.play("card");
      const item = allItems.find(x => x.id === btn.dataset.previewId);
      if (item) {
        syncPreviewStage(item);
        window.scrollTo({ top: 0, behavior: "smooth" });
        showToast(`PREVIEWING: ${item.name}`);
      }
    };
  });

  // INR Items: Buy OR Equip/Unequip Toggle
  document.querySelectorAll("[data-inr-buy]").forEach(btn => {
    btn.onclick = () => {
      const item = INR_ARMORY_CATALOG.find(x => x.id === btn.dataset.inrBuy);
      if (!item) return;

      const hasVipSub = window.ZHWallet.hasActiveVipSubscription();
      if (!item.isShieldPack && (window.ZHWallet.ownsItem(item.id) || (item.isVipIncludedRing && hasVipSub))) {
        window.ZHSound?.play("click");
        const nowEquipped = window.ZHWallet.toggleEquipItem(item.category, item.id);
        syncPreviewStage(null);
        renderStoreCatalogs();
        showToast(nowEquipped ? `EQUIPPED: ${item.name}` : `UNEQUIPPED: ${item.name} (REVERTED TO DEFAULT)`);
        return;
      }

      window.ZHWallet.initiateINRCheckout(item.name, item.priceINR, () => {
        if (item.isShieldPack) {
          const totalShields = window.ZHWallet.addShieldCharges(3);
          syncPreviewStage(null);
          showToast(`+3 BOUNTY LOSS SHIELDS ACTIVATED (TOTAL: ${totalShields})!`);
        } else {
          window.ZHWallet.unlockItem(item.id);
          window.ZHWallet.equipItem(item.category, item.id);
          syncPreviewStage(null);
          renderStoreCatalogs();
          showToast(`UNLOCKED & EQUIPPED: ${item.name}!`);
        }
      }, false);
    };
  });

  // Token Items: Buy OR Equip/Unequip Toggle
  document.querySelectorAll("[data-token-buy]").forEach(btn => {
    btn.onclick = () => {
      const item = TOKEN_VAULT_CATALOG.find(x => x.id === btn.dataset.tokenBuy);
      if (!item) return;

      if (!item.isCrate && window.ZHWallet.ownsItem(item.id)) {
        window.ZHSound?.play("click");
        const nowEquipped = window.ZHWallet.toggleEquipItem(item.category, item.id);
        syncPreviewStage(null);
        renderStoreCatalogs();
        showToast(nowEquipped ? `EQUIPPED: ${item.name}` : `UNEQUIPPED: ${item.name} (REVERTED TO DEFAULT)`);
        return;
      }

      const currentTokens = window.ZHWallet.getTokens();
      if (currentTokens < item.priceTokens) {
        window.ZHSound?.play("click");
        showToast(`NEED ${item.priceTokens.toLocaleString()} TOKENS! Watch Ad or win matches.`);
        return;
      }

      window.ZHWallet.addTokens(-item.priceTokens);

      if (item.isCrate) {
        openMysterySupplyCrate(item);
      } else {
        window.ZHSound?.play("unlock");
        window.ZHWallet.unlockItem(item.id);
        window.ZHWallet.equipItem(item.category, item.id);
        syncPreviewStage(null);
        renderStoreCatalogs();
        showToast(`UNLOCKED & EQUIPPED: ${item.name}!`);
      }
    };
  });
}

function openMysterySupplyCrate(crateItem) {
  window.ZHSound?.play("unlock");
  const isGold = crateItem.id === "crate_commander";
  const roll = Math.random();

  let title = "";
  let desc = "";

  if (roll < 0.55) {
    const wonTokens = isGold ? 6500 : 2500;
    window.ZHWallet.addTokens(wonTokens);
    title = `+${wonTokens.toLocaleString()} BOUNTY TOKENS!`;
    desc = `Token cache recovered from the ${crateItem.name}.`;
  } else if (roll < 0.82) {
    const shields = isGold ? 3 : 1;
    window.ZHWallet.addShieldCharges(shields);
    title = `+${shields} BOUNTY LOSS SHIELD(S)!`;
    desc = `Protects your 1,000 Entry Fee if defeated in an Online Match!`;
  } else {
    const jackpotTokens = isGold ? 12000 : 4500;
    window.ZHWallet.addTokens(jackpotTokens);
    title = `MEGA JACKPOT: +${jackpotTokens.toLocaleString()} TOKENS!`;
    desc = `Ultra-rare supply drop! Added directly to your Bounty balance.`;
  }

  if ($("crateRewardTitle")) $("crateRewardTitle").textContent = title;
  if ($("crateRewardDesc")) $("crateRewardDesc").textContent = desc;
  $("crateRewardModal")?.classList.remove("hidden");
  syncPreviewStage(null);
  renderStoreCatalogs();
}

$("closeCrateModalBtn")?.addEventListener("click", () => $("crateRewardModal")?.classList.add("hidden"));
$("closeCrateModalBackdrop")?.addEventListener("click", () => $("crateRewardModal")?.classList.add("hidden"));

/* ---------------------------------------------------------
   4. VIP PLANS (₹199 1M / ₹999 6M) WITH EQUIP / UNEQUIP TOGGLE!
--------------------------------------------------------- */
$("previewVipPassBtn")?.addEventListener("click", () => {
  window.ZHSound?.play("lock");
  syncPreviewStage({ id: "vip_pass", name: "MYTHIC COMMANDER VIP PASS + 3D RING" });
});

function handleVipPlanButtonClick(days, priceINR, label, planKey) {
  // If VIP is already purchased and active, toggle Equip / Unequip!
  if (window.ZHWallet.hasActiveVipSubscription()) {
    window.ZHSound?.play("click");
    const nowEquipped = window.ZHWallet.toggleVipEquipped();
    syncPreviewStage(null);
    renderStoreCatalogs();
    showToast(nowEquipped ? "VIP PRIVILEGES & VERIFIED TICK EQUIPPED!" : "VIP UNEQUIPPED (PROFILE REVERTED TO NORMAL)");
    return;
  }

  window.ZHWallet.initiateINRCheckout(label, priceINR, () => {
    window.ZHWallet.activateVipPlan(days, planKey);
    if (days >= 180) window.ZHWallet.addTokens(5000);
    syncPreviewStage(null);
    renderStoreCatalogs();
    showToast(`${label} ACTIVATED & EQUIPPED!`);
  }, true);
}

$("buyVipMonthlyBtn")?.addEventListener("click", () => {
  handleVipPlanButtonClick(30, 199, "VIP COMMANDER PASS (1 MONTH / 30 DAYS)", "1M");
});

$("buyVipSixMonthsBtn")?.addEventListener("click", () => {
  handleVipPlanButtonClick(180, 999, "VIP COMMANDER PASS (6 MONTHS / 180 DAYS)", "6M");
});

$("buyAdFree10Btn")?.addEventListener("click", () => {
  window.ZHWallet.initiateINRCheckout("TODAY AD-FREE PASS (TILL MIDNIGHT)", 10, () => {
    window.ZHWallet.activateDailyAdFree();
    syncPreviewStage(null);
    showToast("TODAY AD-FREE PASS ACTIVATED TILL MIDNIGHT!");
  }, false);
});

$("buyAdFree50Btn")?.addEventListener("click", () => {
  window.ZHWallet.initiateINRCheckout("7-DAY AD-FREE PASS", 50, () => {
    window.ZHWallet.activateWeeklyAdFree();
    syncPreviewStage(null);
    showToast("7-DAY AD-FREE PASS ACTIVATED!");
  }, false);
});

$("resetPreviewBtn")?.addEventListener("click", () => {
  window.ZHSound?.play("click");
  syncPreviewStage(null);
});

$("storeFreeAdBtn")?.addEventListener("click", () => {
  window.ZHAds?.watchRewardedAd("ARMORY SUPPLY DROP: +2,000 TOKENS", () => {
    window.ZHWallet.addTokens(2000);
    syncPreviewStage(null);
    showToast("+2,000 BOUNTY TOKENS CREDITED!");
  });
});

document.querySelectorAll(".filter-pill").forEach(pill => {
  pill.addEventListener("click", () => {
    window.ZHSound?.play("click");
    document.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
    pill.classList.add("active");
    activeFilter = pill.dataset.filter || "all";
    renderStoreCatalogs();
  });
});

$("backHubBtn")?.addEventListener("click", () => {
  window.ZHSound?.play("click");
  window.location.href = "../index.html";
});

$("goProfileBtn")?.addEventListener("click", () => {
  window.ZHSound?.play("click");
  window.location.href = "../profile/profile.html";
});

syncPreviewStage(null);
renderStoreCatalogs();