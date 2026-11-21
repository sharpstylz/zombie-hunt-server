/* =========================================================
   ZOMBIE HUNT — MASTER ENGINE v8.0 (monetization-config.js)
   Includes:
   1. WebRTC Live Voice Chat Engine (window.ZHVoice) + Strict Spectator Lock
   2. Global 4-Second Top Notification Banner (window.ZHNotify) with 1-Click Room Join
   3. Mute Manager (window.ZHMute) for Per-Player Message & Call Muting
   4. Separate @username (Search ID) vs Display Name in ZHStats
   5. Automatic Bounty Loss Shield Refund Hook (+1,000 Tokens on Defeat)
   6. Non-Stop Continuous BGM, Unclipped Hexagon/Squircle Frames & 5 Nameplates
   Location: public/monetization-config.js
========================================================= */

(function () {
  "use strict";

  /* ---------------------------------------------------------
     1. GLOBAL STYLES: TOP NOTIFICATION POPUP, FRAMES & NAMEPLATES
  --------------------------------------------------------- */
  function injectMasterStyles() {
    if (document.getElementById("zhMasterV8Styles")) return;
    const style = document.createElement("style");
    style.id = "zhMasterV8Styles";
    style.textContent = `
      html { background-color: #efe5ce !important; }
      body { background: transparent !important; position: relative !important; z-index: 0 !important; }
      #zhLiquidGradientCanvas {
        position: fixed !important; inset: 0 !important; width: 100vw !important; height: 100vh !important;
        pointer-events: none !important; z-index: -1 !important; display: block !important;
      }
      #zhConfettiCanvas {
        position: fixed !important; inset: 0 !important; width: 100vw !important; height: 100vh !important;
        pointer-events: none !important; z-index: 100005 !important; display: block !important;
      }
      .bg-orb { display: none !important; }
      header, main, footer, .topbar, .home, .warroom-layout, .lobby-page, .game-layout, .room-layout, .insta-page-shell, .store-page-shell, .dm-page-shell {
        position: relative !important; z-index: 5 !important;
      }
      .modal, .guide-theatre { z-index: 9999 !important; }

      /* GLOBAL TOP SLIDE-DOWN NOTIFICATION POPUP (SHOWS ON EVERY SCREEN) */
      .zh-top-notify-banner {
        position: fixed;
        top: 14px;
        left: 50%;
        transform: translate(-50%, -150%);
        width: min(460px, 94vw);
        background: rgba(20, 29, 24, 0.96);
        color: #faf3df;
        border: 2px solid #d4aa36;
        border-radius: 20px;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        box-shadow: 0 22px 50px rgba(0, 0, 0, 0.55);
        backdrop-filter: blur(16px);
        z-index: 1000010;
        transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
        font-family: "DM Sans", sans-serif;
      }
      .zh-top-notify-banner.show {
        transform: translate(-50%, 0);
      }
      .zh-top-notify-left {
        display: flex;
        align-items: center;
        gap: 11px;
        min-width: 0;
        flex: 1;
        cursor: pointer;
      }
      .zh-top-notify-left img {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid #f5c85b;
        flex-shrink: 0;
      }
      .zh-top-notify-meta {
        min-width: 0;
        flex: 1;
      }
      .zh-top-notify-meta small {
        display: block;
        font-family: "Oswald", sans-serif;
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 1.4px;
        color: #f5c85b;
      }
      .zh-top-notify-meta strong {
        display: block;
        font-size: 13px;
        color: #ffffff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .zh-top-notify-meta p {
        font-size: 11.5px;
        color: #d1cbc0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin: 1px 0 0;
      }
      .zh-top-notify-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
      }
      .zh-notify-join-btn {
        border: 0;
        background: linear-gradient(135deg, #2e7d5b, #1e5c41);
        color: #ffffff;
        padding: 7px 12px;
        border-radius: 11px;
        font-family: "Oswald", sans-serif;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.6px;
        cursor: pointer;
      }
      .zh-notify-reply-btn {
        border: 1px solid rgba(245, 200, 91, 0.45);
        background: rgba(255, 255, 255, 0.08);
        color: #f5c85b;
        padding: 7px 11px;
        border-radius: 11px;
        font-family: "Oswald", sans-serif;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
      }
      .zh-notify-close-btn {
        border: 0;
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        font-size: 14px;
        cursor: pointer;
      }

      /* TABLE SHOCKWAVE ANIMATIONS */
      @keyframes zhShotgunTableShock {
        0%, 100% { transform: translate(0, 0) scale(1); filter: none; }
        12% { transform: translate(-14px, 8px) scale(1.03) rotate(-1.5deg); filter: drop-shadow(0 0 35px #ef4444); }
        28% { transform: translate(14px, -10px) scale(1.04) rotate(1.5deg); filter: drop-shadow(0 0 45px #dc2626); }
        50% { transform: translate(-9px, -5px) scale(1.02) rotate(-0.8deg); }
        75% { transform: translate(8px, 5px) scale(1.01) rotate(0.8deg); }
      }
      @keyframes zhZombieTableInfect {
        0%, 100% { transform: scale(1); filter: none; }
        35% { transform: scale(1.03) skewX(-1.5deg); filter: hue-rotate(45deg) drop-shadow(0 0 40px #22c55e); }
        65% { transform: scale(0.985) skewX(1.5deg); filter: drop-shadow(0 0 30px #16a34a); }
      }
      @keyframes zhVaccineTableCure {
        0%, 100% { transform: scale(1); filter: none; }
        45% { transform: scale(1.035); filter: drop-shadow(0 0 45px #06b6d4) brightness(1.15); }
      }
      .zh-shock-shotgun { animation: zhShotgunTableShock 0.75s cubic-bezier(.36,.07,.19,.97) both !important; }
      .zh-shock-zombie { animation: zhZombieTableInfect 0.85s ease-in-out both !important; }
      .zh-shock-vaccine { animation: zhVaccineTableCure 0.8s ease-out both !important; }

      /* SCOPED LOCAL AVATAR OVERFLOW (OTHER LOBBY/ROOM AVATARS STAY 100% NORMAL ROUND) */
      #avatarMini, #miniAvatar, #instaAvatarCircle, #previewAvatarRing, .you-card .roster-avatar, .player-side .profile-avatar {
        position: relative !important;
        overflow: visible !important;
      }
      #avatarMini > img, #miniAvatar > img, #instaAvatarCircle > img, #previewAvatarRing > img, .you-card .roster-avatar > img, .player-side .profile-avatar > img {
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important;
        border-radius: 50% !important;
        display: block !important;
      }

      /* 1. 3D GOLDEN COMMANDER AURA RING */
      @keyframes zh3DCommanderSpin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes zh3DAuraPulse {
        0%, 100% { box-shadow: 0 0 0 2.5px #f5c85b, 0 0 18px #d49a1a, 0 0 30px rgba(245, 200, 91, 0.8); }
        50% { box-shadow: 0 0 0 4px #fff9ed, 0 0 26px #f5c85b, 0 0 44px rgba(214, 61, 42, 0.85); }
      }
      .cosmetic-frame-vip {
        border-radius: 50% !important;
        border: 3px solid #f5c85b !important;
        animation: zh3DAuraPulse 2s infinite ease-in-out !important;
      }
      .cosmetic-frame-vip::before {
        content: "" !important;
        position: absolute !important;
        inset: -5px !important;
        border-radius: 50% !important;
        background: conic-gradient(from 0deg, #f5c85b, #d63d2a, #fff3cd, #b38618, #d63d2a, #f5c85b) !important;
        z-index: 0 !important;
        animation: zh3DCommanderSpin 3.2s linear infinite !important;
      }
      .cosmetic-frame-vip > img {
        position: relative !important;
        z-index: 1 !important;
        border-radius: 50% !important;
      }

      /* 2. HEXAGON COMMANDER CREST */
      .cosmetic-frame-hexagon {
        border: none !important;
        background: transparent !important;
        box-shadow: none !important;
        filter: drop-shadow(0 0 2px #f5c85b) drop-shadow(0 0 10px rgba(212, 154, 26, 0.8)) !important;
      }
      .cosmetic-frame-hexagon::before {
        content: "" !important;
        position: absolute !important;
        inset: -3px !important;
        background: linear-gradient(135deg, #f5c85b, #d63d2a, #b38618) !important;
        clip-path: polygon(50% 0%, 96% 25%, 96% 75%, 50% 100%, 4% 75%, 4% 25%) !important;
        z-index: 0 !important;
      }
      .cosmetic-frame-hexagon > img {
        position: relative !important;
        z-index: 1 !important;
        border-radius: 0 !important;
        clip-path: polygon(50% 0%, 96% 25%, 96% 75%, 50% 100%, 4% 75%, 4% 25%) !important;
      }

      /* 3. CRIMSON SQUIRCLE SHIELD */
      .cosmetic-frame-squircle {
        border-radius: 26% !important;
        border: 3px solid #ef4444 !important;
        box-shadow: 0 0 0 2px #f5c85b, 0 8px 20px rgba(239, 68, 68, 0.5) !important;
      }
      .cosmetic-frame-squircle > img {
        border-radius: 22% !important;
      }

      /* 4. DUAL-HALO ORBIT RING */
      .cosmetic-frame-dual-halo {
        border-radius: 50% !important;
        border: 2.5px dashed #f5c85b !important;
        outline: 2px solid #d63d2a !important;
        outline-offset: 3px !important;
        box-shadow: 0 0 20px rgba(245, 200, 91, 0.6) !important;
      }

      /* 5. BIOHAZARD & CYBER NEON RINGS */
      .cosmetic-frame-biohazard {
        border-radius: 50% !important;
        border: 3px solid #22c55e !important;
        box-shadow: 0 0 16px #22c55e, inset 0 0 6px #16a34a !important;
      }
      .cosmetic-frame-cyber {
        border-radius: 50% !important;
        border: 3px solid #06b6d4 !important;
        box-shadow: 0 0 18px #06b6d4, 0 0 26px rgba(6,182,212,0.6) !important;
      }

      /* 5 ANIMATED NAMEPLATE STYLES */
      @keyframes zhNameShimmer {
        0% { background-position: 0% 50%; }
        100% { background-position: 200% 50%; }
      }
      .cosmetic-name-royal-gold {
        background: linear-gradient(90deg, #b38618, #d63d2a, #f5c85b, #b38618) !important;
        background-size: 200% auto !important;
        -webkit-background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        animation: zhNameShimmer 3.5s linear infinite !important;
        font-weight: 900 !important;
      }
      .cosmetic-name-cyber-neon {
        background: linear-gradient(90deg, #06b6d4, #6366f1, #ec4899, #06b6d4) !important;
        background-size: 200% auto !important;
        -webkit-background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        animation: zhNameShimmer 3s linear infinite !important;
        font-weight: 900 !important;
      }
      .cosmetic-name-toxic-venom {
        background: linear-gradient(90deg, #15803d, #22c55e, #eab308, #15803d) !important;
        background-size: 200% auto !important;
        -webkit-background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        animation: zhNameShimmer 3.2s linear infinite !important;
        font-weight: 900 !important;
      }
      .cosmetic-name-blood-inferno {
        background: linear-gradient(90deg, #991b1b, #ef4444, #f97316, #991b1b) !important;
        background-size: 200% auto !important;
        -webkit-background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        animation: zhNameShimmer 2.8s linear infinite !important;
        font-weight: 900 !important;
      }
      .cosmetic-name-frost-diamond {
        background: linear-gradient(90deg, #1d4ed8, #0ea5e9, #6366f1, #1d4ed8) !important;
        background-size: 200% auto !important;
        -webkit-background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        animation: zhNameShimmer 3.5s linear infinite !important;
        font-weight: 900 !important;
      }

      /* CARD DECK SKINS IN BATTLE ARENA */
      .playing-card.card-back.cosmetic-deck-bloodmoon,
      .preview-playing-card.cosmetic-deck-bloodmoon {
        background: radial-gradient(circle, #991b1b 0%, #450a0a 65%, #1f0404 100%) !important;
        border: 2px solid #ef4444 !important;
        box-shadow: 0 0 16px rgba(239, 68, 68, 0.65), inset 0 0 12px rgba(239, 68, 68, 0.4) !important;
        color: #fca5a5 !important;
      }
      .playing-card.card-back.cosmetic-deck-bloodmoon::before,
      .playing-card.card-back.cosmetic-deck-bloodmoon::after {
        border-color: rgba(252, 165, 165, 0.45) !important;
        color: #fecaca !important;
        background: transparent !important;
      }

      .playing-card.card-back.cosmetic-deck-emerald,
      .preview-playing-card.cosmetic-deck-emerald {
        background: radial-gradient(circle, #047857 0%, #064e3b 65%, #022c22 100%) !important;
        border: 2px solid #f5c85b !important;
        box-shadow: 0 0 16px rgba(245, 200, 91, 0.55), inset 0 0 12px rgba(16, 185, 129, 0.4) !important;
        color: #f5c85b !important;
      }
      .playing-card.card-back.cosmetic-deck-emerald::before,
      .playing-card.card-back.cosmetic-deck-emerald::after {
        border-color: rgba(245, 200, 91, 0.45) !important;
        color: #fde68a !important;
        background: transparent !important;
      }

      .playing-card.card-back.cosmetic-deck-obsidian,
      .preview-playing-card.cosmetic-deck-obsidian {
        background: radial-gradient(circle, #1e293b 0%, #0f172a 65%, #020617 100%) !important;
        border: 2px solid #38bdf8 !important;
        box-shadow: 0 0 16px rgba(56, 189, 248, 0.55), inset 0 0 12px rgba(56, 189, 248, 0.35) !important;
        color: #38bdf8 !important;
      }
      .playing-card.card-back.cosmetic-deck-obsidian::before,
      .playing-card.card-back.cosmetic-deck-obsidian::after {
        border-color: rgba(56, 189, 248, 0.45) !important;
        color: #7dd3fc !important;
        background: transparent !important;
      }

      .playing-card.card-back.cosmetic-deck-vintage-ivory,
      .preview-playing-card.cosmetic-deck-vintage-ivory {
        background: radial-gradient(circle, #fff9ed 0%, #e5dac3 70%, #d4c4a1 100%) !important;
        border: 2px solid #b38618 !important;
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.28) !important;
        color: #18221d !important;
      }
      .playing-card.card-back.cosmetic-deck-vintage-ivory::before,
      .playing-card.card-back.cosmetic-deck-vintage-ivory::after {
        border-color: rgba(179, 134, 24, 0.5) !important;
        color: #92400e !important;
        background: transparent !important;
      }

      .table.table-crimson-velvet, .stage-table-felt.table-crimson-velvet {
        background: radial-gradient(ellipse at center, #8c2626 0%, #521212 62%, #2b0707 100%) !important;
      }
      .table.table-obsidian-war, .stage-table-felt.table-obsidian-war {
        background: radial-gradient(ellipse at center, #2c353d 0%, #161b20 62%, #0a0d10 100%) !important;
      }

      /* PROPORTIONAL VERIFIED TICK SIZES */
      .zh-avatar-tick-pin {
        position: absolute !important;
        bottom: -1px !important;
        right: -1px !important;
        width: 14px !important;
        height: 14px !important;
        z-index: 60 !important;
        pointer-events: none !important;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.45));
      }
      #previewAvatarRing .zh-avatar-tick-pin {
        width: 26px !important;
        height: 26px !important;
        bottom: 0px !important;
        right: 0px !important;
      }
      #instaAvatarCircle .zh-avatar-tick-pin {
        width: 38px !important;
        height: 38px !important;
        bottom: 3px !important;
        right: 3px !important;
      }
      .zh-inline-vip-tick {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 16px !important;
        height: 16px !important;
        vertical-align: -2px !important;
        margin-left: 4px !important;
        position: relative !important;
        z-index: 10 !important;
      }
      #nameInlineTickSlot .zh-inline-vip-tick {
        width: 22px !important;
        height: 22px !important;
        vertical-align: -3px !important;
      }

      /* FLOATING DUAL AUDIO POPOVER WIDGET */
      .zh-audio-fab-wrap {
        position: fixed; bottom: 18px; right: 18px; z-index: 99990;
        font-family: 'Oswald', sans-serif;
      }
      .zh-audio-fab-btn {
        width: 44px; height: 44px; border-radius: 50%;
        border: 1.5px solid rgba(245,200,91,0.5);
        background: rgba(24, 34, 29, 0.92); color: #f5c85b;
        display: grid; place-items: center; cursor: pointer;
        box-shadow: 0 10px 25px rgba(0,0,0,0.35);
        backdrop-filter: blur(12px); transition: transform 0.2s ease;
      }
      .zh-audio-fab-btn:hover { transform: scale(1.08); }
      .zh-audio-popover {
        position: absolute; bottom: 54px; right: 0;
        width: 215px; background: rgba(22, 32, 27, 0.96);
        border: 1.5px solid rgba(245,200,91,0.4); border-radius: 16px;
        padding: 14px; color: #f7f2e7;
        box-shadow: 0 20px 50px rgba(0,0,0,0.55);
        display: none; flex-direction: column; gap: 10px;
      }
      .zh-audio-popover.open { display: flex; }
      .zh-audio-row {
        display: flex; align-items: center; justify-content: space-between;
        font-size: 12px; letter-spacing: 0.8px;
      }
      .zh-audio-toggle {
        border: 0; border-radius: 20px; padding: 4px 12px;
        font-family: 'Oswald', sans-serif; font-size: 10.5px; font-weight: 800;
        cursor: pointer; transition: 0.15s;
      }
      .zh-audio-toggle.on { background: #2e7d5b; color: #ffffff; }
      .zh-audio-toggle.off { background: #c94735; color: #ffffff; }
    `;
    document.head.appendChild(style);
  }

  /* ---------------------------------------------------------
     2. 60-FPS LIQUID MOVING & COLOR-MORPHING GRADIENT
  --------------------------------------------------------- */
  class LiquidGradientCanvas {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.width = 400;
      this.height = 400;
      this.startTime = performance.now();
      this.running = false;
      this.surgeMode = null;
      this.surgeUntil = 0;

      this.blobs = [
        {
          colors: [[248, 194, 48], [250, 128, 41], [232, 65, 65], [245, 166, 35]],
          cycleDuration: 16000, centerX: 0.74, centerY: 0.26, orbitX: 0.24, orbitY: 0.26,
          speedX: 0.00055, speedY: 0.00042, phase: 0, radiusFactor: 0.56, alpha: 0.55
        },
        {
          colors: [[38, 194, 129], [15, 185, 177], [56, 138, 240], [72, 201, 142]],
          cycleDuration: 19000, centerX: 0.24, centerY: 0.74, orbitX: 0.25, orbitY: 0.24,
          speedX: 0.00046, speedY: 0.00058, phase: 2.2, radiusFactor: 0.58, alpha: 0.48
        },
        {
          colors: [[74, 175, 235], [247, 159, 31], [235, 77, 75], [43, 203, 186]],
          cycleDuration: 22000, centerX: 0.62, centerY: 0.70, orbitX: 0.26, orbitY: 0.25,
          speedX: 0.00062, speedY: 0.00048, phase: 4.4, radiusFactor: 0.48, alpha: 0.40
        }
      ];
    }

    init() {
      injectMasterStyles();
      if (document.getElementById("zhLiquidGradientCanvas")) return;
      this.canvas = document.createElement("canvas");
      this.canvas.id = "zhLiquidGradientCanvas";
      document.body.prepend(this.canvas);
      this.ctx = this.canvas.getContext("2d");
      this.resize();
      window.addEventListener("resize", () => this.resize());
      this.running = true;
      requestAnimationFrame((ts) => this.render(ts));
    }

    triggerEnvironmentalSurge(type, durationMs = 2400) {
      this.surgeMode = type;
      this.surgeUntil = performance.now() + durationMs;
    }

    resize() {
      if (!this.canvas) return;
      this.width = Math.max(320, Math.floor(window.innerWidth * 0.5));
      this.height = Math.max(320, Math.floor(window.innerHeight * 0.5));
      this.canvas.width = this.width;
      this.canvas.height = this.height;
    }

    getInterpolatedRGB(colors, elapsed, duration) {
      if (this.surgeMode && performance.now() < this.surgeUntil) {
        if (this.surgeMode === "shotgun") return { r: 225, g: 28, b: 36 };
        if (this.surgeMode === "zombie")  return { r: 22,  g: 195, b: 78 };
        if (this.surgeMode === "vaccine") return { r: 6,   g: 190, b: 218 };
      } else if (this.surgeMode) {
        this.surgeMode = null;
      }

      const total = colors.length;
      const progress = ((elapsed % duration) / duration) * total;
      const indexA = Math.floor(progress) % total;
      const indexB = (indexA + 1) % total;
      const rawT = progress - Math.floor(progress);
      const t = 0.5 - 0.5 * Math.cos(rawT * Math.PI);
      const cA = colors[indexA];
      const cB = colors[indexB];
      return {
        r: Math.round(cA[0] + (cB[0] - cA[0]) * t),
        g: Math.round(cA[1] + (cB[1] - cA[1]) * t),
        b: Math.round(cA[2] + (cB[2] - cA[2]) * t)
      };
    }

    render(timestamp) {
      if (!this.running || !this.ctx) return;
      const elapsed = timestamp - this.startTime;
      const w = this.width;
      const h = this.height;
      const maxDim = Math.max(w, h);

      const isSurging = this.surgeMode && timestamp < this.surgeUntil;
      this.ctx.fillStyle = isSurging && this.surgeMode === "shotgun"
        ? "#f7d7d4"
        : isSurging && this.surgeMode === "zombie"
        ? "#d8f3dc"
        : isSurging && this.surgeMode === "vaccine"
        ? "#d6f5f9"
        : "#efe5ce";
      this.ctx.fillRect(0, 0, w, h);

      const speedMult = isSurging ? 4.5 : 1;

      for (let i = 0; i < this.blobs.length; i++) {
        const b = this.blobs[i];
        const rgb = this.getInterpolatedRGB(b.colors, elapsed, b.cycleDuration);

        const x = (b.centerX + Math.sin(elapsed * b.speedX * speedMult + b.phase) * b.orbitX + Math.cos(elapsed * b.speedX * 0.55) * 0.07) * w;
        const y = (b.centerY + Math.cos(elapsed * b.speedY * speedMult + b.phase) * b.orbitY + Math.sin(elapsed * b.speedY * 0.65) * 0.07) * h;

        const pulse = 1 + Math.sin(elapsed * 0.0008 + b.phase) * 0.14;
        const radius = maxDim * b.radiusFactor * pulse;
        const alpha = isSurging ? 0.72 : (b.alpha + Math.sin(elapsed * 0.0006 + b.phase) * 0.07);

        const grad = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
        grad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha.toFixed(3)})`);
        grad.addColorStop(0.48, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(alpha * 0.54).toFixed(3)})`);
        grad.addColorStop(0.80, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(alpha * 0.16).toFixed(3)})`);
        grad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);

        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, w, h);
      }

      requestAnimationFrame((ts) => this.render(ts));
    }
  }

  /* ---------------------------------------------------------
     3. VISUAL FX, AUDIO POPOVER & LIVE DOM COSMETIC OBSERVER
  --------------------------------------------------------- */
  const VisualFX = {
    liquidCanvas: new LiquidGradientCanvas(),
    initialized: false,
    observer: null,

    init() {
      if (this.initialized) return;
      this.initialized = true;
      this.liquidCanvas.init();
      this.bind3DTilt();
      this.mountAudioPopoverWidget();
      this.startLiveCosmeticObserver();
    },

    startLiveCosmeticObserver() {
      let debounceTimer = null;
      this.observer = new MutationObserver(() => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          window.ZHWallet?.applyEquippedCosmetics();
          window.ZHIcons?.injectCustomBrandIconsEverywhere();
          window.ZHWallet?.checkDefeatModalForShieldRefund();
        }, 60);
      });
      this.observer.observe(document.body, { childList: true, subtree: true });
    },

    bind3DTilt() {
      document.addEventListener("mousemove", (e) => {
        const card = e.target.closest(".mode-card, .tier-option-card, .selectable-card, .playing-card, .scene-card, .squad-box, .ach-card, .armory-item-card");
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const rotateX = ((y - rect.height / 2) / (rect.height / 2)) * -5;
        const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 5;
        card.style.transform = `perspective(800px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-3px)`;
      });
      document.addEventListener("mouseout", (e) => {
        const card = e.target.closest(".mode-card, .tier-option-card, .selectable-card, .playing-card, .scene-card, .squad-box, .ach-card, .armory-item-card");
        if (card) card.style.transform = "";
      });
    },

    screenFlashAndShake(type = "shotgun") {
      this.liquidCanvas.triggerEnvironmentalSurge(type, 2400);
      if (navigator.vibrate) {
        if (type === "shotgun") navigator.vibrate([160, 45, 240, 40, 120]);
        else if (type === "zombie") navigator.vibrate([90, 60, 180]);
        else navigator.vibrate([80, 40, 80]);
      }
      const tableEl = document.querySelector(".table") || document.body;
      tableEl.classList.remove("zh-shock-shotgun", "zh-shock-zombie", "zh-shock-vaccine");
      void tableEl.offsetWidth;
      tableEl.classList.add(
        type === "shotgun" ? "zh-shock-shotgun" : type === "zombie" ? "zh-shock-zombie" : "zh-shock-vaccine"
      );
      setTimeout(() => {
        tableEl.classList.remove("zh-shock-shotgun", "zh-shock-zombie", "zh-shock-vaccine");
      }, 900);
    },

    startVictoryCelebration() {
      let c = document.getElementById("zhConfettiCanvas");
      if (!c) {
        c = document.createElement("canvas");
        c.id = "zhConfettiCanvas";
        document.body.appendChild(c);
      }
      c.width = window.innerWidth;
      c.height = window.innerHeight;
      const ctx = c.getContext("2d");
      const stars = [];
      const colors = ["#f5c85b", "#ffd700", "#4da88c", "#ffffff", "#ff6b6b"];
      for (let i = 0; i < 95; i++) {
        stars.push({
          x: Math.random() * c.width,
          y: Math.random() * c.height - c.height,
          size: Math.random() * 7 + 4,
          vy: Math.random() * 3.5 + 2,
          vx: (Math.random() - 0.5) * 2,
          rot: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.1,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
      let frames = 0;
      function drawStars() {
        frames++;
        ctx.clearRect(0, 0, c.width, c.height);
        stars.forEach(s => {
          s.x += s.vx; s.y += s.vy; s.rot += s.vRot;
          if (s.y > c.height + 20) s.y = -20;
          ctx.save();
          ctx.translate(s.x, s.y);
          ctx.rotate(s.rot);
          ctx.fillStyle = s.color;
          ctx.shadowBlur = 10;
          ctx.shadowColor = s.color;
          ctx.fillRect(-s.size / 2, -s.size / 2, s.size, s.size * 0.65);
          ctx.restore();
        });
        if (frames < 420) requestAnimationFrame(drawStars);
        else c.remove();
      }
      drawStars();
    },

    mountAudioPopoverWidget() {
      if (document.getElementById("zhGlobalAudioWidget")) return;
      const wrap = document.createElement("div");
      wrap.id = "zhGlobalAudioWidget";
      wrap.className = "zh-audio-fab-wrap";
      wrap.innerHTML = `
        <div class="zh-audio-popover" id="zhAudioPopoverMenu">
          <div style="font-size:10px;color:#f5c85b;letter-spacing:1.5px;border-bottom:1px solid rgba(255,255,255,0.12);padding-bottom:5px;">
            AUDIO MIXER
          </div>
          <div class="zh-audio-row">
            <span>🎵 MUSIC (BGM)</span>
            <button type="button" class="zh-audio-toggle" id="zhToggleBgmBtn">ON</button>
          </div>
          <div class="zh-audio-row">
            <span>🔊 SOUND FX</span>
            <button type="button" class="zh-audio-toggle" id="zhToggleSfxBtn">ON</button>
          </div>
        </div>
        <button type="button" class="zh-audio-fab-btn" id="zhAudioFabTrigger" title="Music & Sound Settings">
          <svg viewBox="0 0 24 24" style="width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/>
          </svg>
        </button>
      `;
      document.body.appendChild(wrap);

      const menu = wrap.querySelector("#zhAudioPopoverMenu");
      const fab = wrap.querySelector("#zhAudioFabTrigger");
      const bgmBtn = wrap.querySelector("#zhToggleBgmBtn");
      const sfxBtn = wrap.querySelector("#zhToggleSfxBtn");

      const refreshButtons = () => {
        const bgmOn = !SoundEngine.musicMuted;
        const sfxOn = !SoundEngine.sfxMuted;
        bgmBtn.textContent = bgmOn ? "ON" : "OFF";
        bgmBtn.className = `zh-audio-toggle ${bgmOn ? "on" : "off"}`;
        sfxBtn.textContent = sfxOn ? "ON" : "OFF";
        sfxBtn.className = `zh-audio-toggle ${sfxOn ? "on" : "off"}`;
      };
      refreshButtons();

      fab.addEventListener("click", (e) => {
        e.stopPropagation();
        menu.classList.toggle("open");
        refreshButtons();
      });

      document.getElementById("toggleSoundBtn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        menu.classList.toggle("open");
        refreshButtons();
      });

      bgmBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        SoundEngine.toggleMusic();
        refreshButtons();
      });

      sfxBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        SoundEngine.toggleSFX();
        refreshButtons();
      });

      document.addEventListener("click", () => menu.classList.remove("open"));
    }
  };

  /* ---------------------------------------------------------
     4. SMART AUDIO ENGINE WITH VICTORY DUCKING
  --------------------------------------------------------- */
  const SoundEngine = {
    ctx: null,
    reverbNode: null,
    musicMuted: localStorage.getItem("zh_music_muted") === "true",
    sfxMuted: localStorage.getItem("zh_sfx_muted") === "true",
    bgmAudio: null,
    bgmPlaying: false,
    bgmInterval: null,
    currentTrackName: null,
    victoryClip: null,
    victoryResumeTimer: null,

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
          this.reverbNode = this.createImpulseReverb(1.3, 2.6);
        }
      }
      if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
    },

    createImpulseReverb(duration, decay) {
      try {
        const rate = this.ctx.sampleRate;
        const length = rate * duration;
        const impulse = this.ctx.createBuffer(2, length, rate);
        for (let ch = 0; ch < 2; ch++) {
          const channelData = impulse.getChannelData(ch);
          for (let i = 0; i < length; i++) {
            channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
          }
        }
        const convolver = this.ctx.createConvolver();
        convolver.buffer = impulse;
        convolver.connect(this.ctx.destination);
        return convolver;
      } catch { return null; }
    },

    getAudioFolderPrefix() {
      const p = window.location.pathname;
      if (p.includes("/team-room/")) return "../../../audio/";
      if (p.includes("/bot-game/") || p.includes("/online-game/")) return "../../audio/";
      if (p.includes("-lobby/") || p.includes("/profile/") || p.includes("/store/") || p.includes("/messages/")) return "../audio/";
      return "audio/";
    },

    getTargetTrackFile() {
      const p = window.location.pathname;
      const isArenaOrLobby = p.includes("-game/") || p.includes("-lobby/");
      return isArenaOrLobby ? "bgm-arena.mp3" : "bgm-home.mp3";
    },

    saveBgmProgress() {
      if (this.bgmAudio && !this.bgmAudio.paused && this.currentTrackName) {
        sessionStorage.setItem("zh_bgm_track", this.currentTrackName);
        sessionStorage.setItem("zh_bgm_time", String(this.bgmAudio.currentTime));
        sessionStorage.setItem("zh_bgm_ts", String(Date.now()));
      }
    },

    toggleMusic() {
      this.musicMuted = !this.musicMuted;
      localStorage.setItem("zh_music_muted", this.musicMuted ? "true" : "false");
      if (this.musicMuted) this.stopBGM();
      else this.startBGM();
      return this.musicMuted;
    },

    toggleSFX() {
      this.sfxMuted = !this.sfxMuted;
      localStorage.setItem("zh_sfx_muted", this.sfxMuted ? "true" : "false");
      if (!this.sfxMuted) this.play("click");
      return this.sfxMuted;
    },

    toggleMute() { return this.toggleMusic(); },

    startBGM() {
      if (this.musicMuted || this.bgmPlaying) return;
      this.bgmPlaying = true;

      const trackFile = this.getTargetTrackFile();
      this.currentTrackName = trackFile;
      const prefix = this.getAudioFolderPrefix();

      if (!this.bgmAudio) {
        this.bgmAudio = new Audio(prefix + trackFile);
        this.bgmAudio.loop = true;
        this.bgmAudio.volume = 0.34;

        this.bgmAudio.addEventListener("loadedmetadata", () => {
          const savedTrack = sessionStorage.getItem("zh_bgm_track");
          const savedTime = parseFloat(sessionStorage.getItem("zh_bgm_time") || "0");
          const savedTs = parseInt(sessionStorage.getItem("zh_bgm_ts") || "0", 10);

          if (savedTrack === trackFile && savedTime > 0) {
            const elapsedSinceUnload = savedTs ? Math.min(3, (Date.now() - savedTs) / 1000) : 0;
            const duration = this.bgmAudio.duration || 120;
            this.bgmAudio.currentTime = (savedTime + elapsedSinceUnload) % duration;
          }
        }, { once: true });

        this.bgmAudio.addEventListener("timeupdate", () => this.saveBgmProgress());
        window.addEventListener("pagehide", () => this.saveBgmProgress());
        window.addEventListener("beforeunload", () => this.saveBgmProgress());
      }

      this.bgmAudio.play().catch(() => {
        this.startCinematicHeartbeatPad();
      });
    },

    startCinematicHeartbeatPad() {
      if (this.bgmInterval) clearInterval(this.bgmInterval);
      const triggerCycle = () => {
        if (this.musicMuted || !this.bgmPlaying) return;
        try {
          this.init();
          if (!this.ctx) return;
          const now = this.ctx.currentTime;
          [0, 0.34].forEach((offset, idx) => {
            const thump = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            thump.type = "sine";
            thump.frequency.setValueAtTime(idx === 0 ? 66 : 52, now + offset);
            thump.frequency.exponentialRampToValueAtTime(28, now + offset + 0.26);
            gain.gain.setValueAtTime(0.001, now + offset);
            gain.gain.linearRampToValueAtTime(idx === 0 ? 0.15 : 0.10, now + offset + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.28);
            thump.connect(gain);
            gain.connect(this.ctx.destination);
            thump.start(now + offset);
            thump.stop(now + offset + 0.3);
          });
        } catch (e) {}
      };
      const delayToNextBeat = 3200 - (Date.now() % 3200);
      setTimeout(() => {
        if (!this.musicMuted && this.bgmPlaying) {
          triggerCycle();
          this.bgmInterval = setInterval(triggerCycle, 3200);
        }
      }, Math.min(800, delayToNextBeat));
    },

    stopBGM() {
      this.bgmPlaying = false;
      if (this.bgmAudio) this.bgmAudio.pause();
      if (this.bgmInterval) {
        clearInterval(this.bgmInterval);
        this.bgmInterval = null;
      }
    },

    playExclusiveVictoryAnthem() {
      VisualFX.startVictoryCelebration();
      if (this.sfxMuted && this.musicMuted) return;

      const wasBgmRunning = this.bgmPlaying && !this.musicMuted;
      if (this.bgmAudio && !this.bgmAudio.paused) {
        this.saveBgmProgress();
        this.bgmAudio.pause();
      }
      if (this.bgmInterval) {
        clearInterval(this.bgmInterval);
        this.bgmInterval = null;
      }

      if (this.victoryClip) {
        this.victoryClip.pause();
        this.victoryClip = null;
      }
      clearTimeout(this.victoryResumeTimer);

      const vic = new Audio(this.getAudioFolderPrefix() + "bgm-victory.mp3");
      vic.volume = 0.65;
      this.victoryClip = vic;

      const resumeBackgroundMusic = () => {
        clearTimeout(this.victoryResumeTimer);
        if (this.victoryClip) {
          this.victoryClip.pause();
          this.victoryClip.currentTime = 0;
          this.victoryClip = null;
        }
        if (wasBgmRunning && !this.musicMuted) {
          if (this.bgmAudio) {
            this.bgmAudio.play().catch(() => this.startCinematicHeartbeatPad());
          } else {
            this.startCinematicHeartbeatPad();
          }
        }
      };

      vic.play().then(() => {
        this.victoryResumeTimer = setTimeout(resumeBackgroundMusic, 7500);
        vic.onended = resumeBackgroundMusic;
      }).catch(() => {
        this.playSynthFallback("victory");
        this.victoryResumeTimer = setTimeout(resumeBackgroundMusic, 2200);
      });
    },

    play(type) {
      if (type === "shotgun" || type === "zombie" || type === "vaccine") {
        VisualFX.screenFlashAndShake(type);
      }
      if (type === "victory") {
        this.playExclusiveVictoryAnthem();
        return;
      }
      if (this.sfxMuted) return;
      if (type === "unlock") {
        this.playSynthFallback("unlock");
        return;
      }

      const sfxMap = {
        shotgun: "sfx-shotgun.mp3",
        zombie: "sfx-zombie.mp3",
        vaccine: "sfx-vaccine.mp3",
        lock: "sfx-lock.mp3",
        card: "sfx-card.mp3",
        click: "sfx-click.mp3"
      };
      if (sfxMap[type]) {
        const clip = new Audio(this.getAudioFolderPrefix() + sfxMap[type]);
        clip.volume = type === "shotgun" ? 0.85 : 0.55;
        clip.play().catch(() => this.playSynthFallback(type));
        return;
      }
      this.playSynthFallback(type);
    },

    playSynthFallback(type) {
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        if (type === "click" || type === "card") {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(115, now);
          osc.frequency.exponentialRampToValueAtTime(35, now + 0.095);
          gain.gain.setValueAtTime(0.4, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.105);
        } else if (type === "unlock") {
          [329.63, 440].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(freq, now + idx * 0.09);
            gain.gain.setValueAtTime(0.28, now + idx * 0.09);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.28);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + idx * 0.09);
            osc.stop(now + idx * 0.09 + 0.3);
          });
        } else if (type === "type") {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(92, now);
          osc.frequency.exponentialRampToValueAtTime(40, now + 0.035);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.045);
        } else if (type === "lock") {
          const sub = this.ctx.createOscillator();
          const subGain = this.ctx.createGain();
          sub.type = "sine";
          sub.frequency.setValueAtTime(140, now);
          sub.frequency.exponentialRampToValueAtTime(30, now + 0.28);
          subGain.gain.setValueAtTime(0.65, now);
          subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          sub.connect(subGain);
          subGain.connect(this.ctx.destination);
          if (this.reverbNode) subGain.connect(this.reverbNode);
          sub.start(now);
          sub.stop(now + 0.31);
        } else if (type === "shotgun") {
          const boom = this.ctx.createOscillator();
          const boomGain = this.ctx.createGain();
          boom.type = "sine";
          boom.frequency.setValueAtTime(175, now);
          boom.frequency.exponentialRampToValueAtTime(22, now + 0.65);
          boomGain.gain.setValueAtTime(0.95, now);
          boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.68);
          boom.connect(boomGain);
          boomGain.connect(this.ctx.destination);
          boom.start(now);
          boom.stop(now + 0.7);

          const buzz = this.ctx.createOscillator();
          const buzzGain = this.ctx.createGain();
          buzz.type = "sawtooth";
          buzz.frequency.setValueAtTime(46, now + 0.05);
          buzz.frequency.linearRampToValueAtTime(32, now + 0.65);
          buzzGain.gain.setValueAtTime(0.45, now + 0.05);
          buzzGain.gain.exponentialRampToValueAtTime(0.001, now + 0.68);
          buzz.connect(buzzGain);
          buzzGain.connect(this.ctx.destination);
          buzz.start(now + 0.05);
          buzz.stop(now + 0.7);
        } else if (type === "zombie") {
          [52, 58, 39].forEach((freq) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.linearRampToValueAtTime(freq * 0.62, now + 0.75);
            gain.gain.setValueAtTime(0.32, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.78);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.8);
          });
        } else if (type === "vaccine" || type === "victory") {
          [220, 277.18, 329.63, 440, 554.37].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);
            gain.gain.setValueAtTime(0.26, now + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.65);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + 0.68);
          });
        }
      } catch (e) {}
    }
  };

  window.ZHFX = VisualFX;
  window.ZHSound = SoundEngine;

  function bootMasterFX() {
    VisualFX.init();
    setTimeout(() => {
      window.ZHWallet?.applyEquippedCosmetics();
      window.ZHIcons?.injectCustomBrandIconsEverywhere();
      window.ZHAds?.checkPageTransitionBannerAd();
      window.ZHNotify?.initGlobalSocketListener();
    }, 140);

    if (sessionStorage.getItem("zh_audio_unlocked") === "true" && !SoundEngine.musicMuted) {
      SoundEngine.startBGM();
    }

    document.body.addEventListener("click", () => {
      sessionStorage.setItem("zh_audio_unlocked", "true");
      if (!SoundEngine.musicMuted && !SoundEngine.bgmPlaying) {
        SoundEngine.startBGM();
      }
    }, { once: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootMasterFX);
  } else {
    bootMasterFX();
  }
})();

/* =========================================================
   5. WEBRTC LIVE VOICE ENGINE (window.ZHVoice)
      Used in 1v1 Battle Arena & 4-Player Squad Team Room
      Enforces Strict Silent Lock when watching Rival Squads!
========================================================= */
window.ZHVoice = {
  socket: null,
  channelId: null,
  isLockedSpectator: false,
  micEnabled: false,
  speakerEnabled: true,
  localStream: null,
  peers: {},
  remoteAudios: {},

  async joinChannel(socketInstance, channelName, isRivalSpectatorLocked = false) {
    this.leaveChannel();
    this.socket = socketInstance;
    this.channelId = channelName;
    this.isLockedSpectator = !!isRivalSpectatorLocked;
    this.micEnabled = false;

    if (!this.socket || !this.channelId) return;

    this.socket.emit("voice_join_channel", {
      channelId: this.channelId,
      isSilentSpectator: this.isLockedSpectator
    });

    this.socket.off("voice_peer_joined");
    this.socket.off("voice_signal");
    this.socket.off("voice_peer_left");

    this.socket.on("voice_peer_joined", async ({ peerSocketId }) => {
      if (!peerSocketId || peerSocketId === this.socket.id) return;
      await this.createPeerConnection(peerSocketId, true);
    });

    this.socket.on("voice_signal", async ({ fromSocketId, signal }) => {
      if (!fromSocketId || !signal) return;
      let pc = this.peers[fromSocketId];
      if (!pc) pc = await this.createPeerConnection(fromSocketId, false);
      try {
        if (signal.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          if (signal.sdp.type === "offer") {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            this.socket.emit("voice_signal", {
              targetSocketId: fromSocketId,
              signal: { sdp: pc.localDescription }
            });
          }
        } else if (signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (e) {}
    });

    this.socket.on("voice_peer_left", ({ peerSocketId }) => {
      if (this.peers[peerSocketId]) {
        this.peers[peerSocketId].close();
        delete this.peers[peerSocketId];
      }
      if (this.remoteAudios[peerSocketId]) {
        this.remoteAudios[peerSocketId].remove();
        delete this.remoteAudios[peerSocketId];
      }
    });
  },

  async createPeerConnection(peerSocketId, isInitiator) {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });
    this.peers[peerSocketId] = pc;

    if (this.localStream && !this.isLockedSpectator) {
      this.localStream.getTracks().forEach(track => pc.addTrack(track, this.localStream));
    }

    pc.onicecandidate = (e) => {
      if (e.candidate && this.socket) {
        this.socket.emit("voice_signal", {
          targetSocketId: peerSocketId,
          signal: { candidate: e.candidate }
        });
      }
    };

    pc.ontrack = (e) => {
      let audioEl = this.remoteAudios[peerSocketId];
      if (!audioEl) {
        audioEl = document.createElement("audio");
        audioEl.autoplay = true;
        audioEl.playsInline = true;
        audioEl.muted = !this.speakerEnabled;
        document.body.appendChild(audioEl);
        this.remoteAudios[peerSocketId] = audioEl;
      }
      audioEl.srcObject = e.streams[0];
    };

    if (isInitiator) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.socket?.emit("voice_signal", {
          targetSocketId: peerSocketId,
          signal: { sdp: pc.localDescription }
        });
      } catch (e) {}
    }
    return pc;
  },

  async toggleMic() {
    window.ZHSound?.play("click");
    // Enforce Strict Anti-Ghosting Rule: Rival Spectators CANNOT turn on Mic!
    if (this.isLockedSpectator) {
      window.ZHNotify?.showTopNotification({
        senderHandle: "SYSTEM",
        senderName: "SILENT SPECTATOR RULE",
        text: "Your squad is eliminated. Mic & Chat are locked while watching rival squads!"
      });
      return false;
    }

    if (!this.localStream) {
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: false
        });
        Object.entries(this.peers).forEach(([peerId, pc]) => {
          this.localStream.getTracks().forEach(track => pc.addTrack(track, this.localStream));
        });
      } catch (err) {
        console.warn("Microphone permission denied or unavailable:", err);
        this.micEnabled = !this.micEnabled;
        return this.micEnabled;
      }
    }

    this.micEnabled = !this.micEnabled;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(t => { t.enabled = this.micEnabled; });
    }
    return this.micEnabled;
  },

  toggleSpeaker() {
    window.ZHSound?.play("click");
    this.speakerEnabled = !this.speakerEnabled;
    Object.values(this.remoteAudios).forEach(a => {
      a.muted = !this.speakerEnabled;
    });
    return this.speakerEnabled;
  },

  leaveChannel() {
    if (this.socket && this.channelId) {
      this.socket.emit("voice_leave_channel", { channelId: this.channelId });
    }
    Object.values(this.peers).forEach(pc => { try { pc.close(); } catch {} });
    Object.values(this.remoteAudios).forEach(a => { try { a.remove(); } catch {} });
    this.peers = {};
    this.remoteAudios = {};
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }
    this.micEnabled = false;
    this.channelId = null;
  }
};

/* =========================================================
   6. PER-PLAYER MUTE MANAGER (window.ZHMute)
      Allows muting Messages & Calls independently per user!
========================================================= */
window.ZHMute = {
  getMuteMap() {
    try { return JSON.parse(localStorage.getItem("zh_muted_users_map") || "{}"); } catch { return {}; }
  },
  saveMuteMap(map) {
    localStorage.setItem("zh_muted_users_map", JSON.stringify(map));
  },
  isMessageMuted(handle) {
    if (!handle) return false;
    const m = this.getMuteMap()[String(handle).trim().toUpperCase()];
    return !!(m && m.muteMessages);
  },
  isCallMuted(handle) {
    if (!handle) return false;
    const m = this.getMuteMap()[String(handle).trim().toUpperCase()];
    return !!(m && m.muteCalls);
  },
  toggleMuteMessages(handle) {
    const key = String(handle || "").trim().toUpperCase();
    const map = this.getMuteMap();
    if (!map[key]) map[key] = { muteMessages: false, muteCalls: false };
    map[key].muteMessages = !map[key].muteMessages;
    this.saveMuteMap(map);
    return map[key].muteMessages;
  },
  toggleMuteCalls(handle) {
    const key = String(handle || "").trim().toUpperCase();
    const map = this.getMuteMap();
    if (!map[key]) map[key] = { muteMessages: false, muteCalls: false };
    map[key].muteCalls = !map[key].muteCalls;
    this.saveMuteMap(map);
    return map[key].muteCalls;
  }
};

/* =========================================================
   7. GLOBAL 4-SECOND TOP NOTIFICATION POPUP (window.ZHNotify)
      Appears at the top of ANY screen (even mid-game!)
      Supports 1-Click "JOIN ROOM NOW ↗" so player can leave & join!
========================================================= */
window.ZHNotify = {
  bannerEl: null,
  hideTimer: null,
  bgSocket: null,

  getAvatarPrefix() {
    const p = window.location.pathname;
    if (p.includes("/team-room/")) return "../../../profile/avatars/";
    if (p.includes("/bot-game/") || p.includes("/online-game/")) return "../../profile/avatars/";
    if (p.includes("-lobby/") || p.includes("/profile/") || p.includes("/store/") || p.includes("/messages/")) return "../profile/avatars/";
    return "profile/avatars/";
  },

  getRootPrefix() {
    const p = window.location.pathname;
    if (p.includes("/team-room/")) return "../../../";
    if (p.includes("/bot-game/") || p.includes("/online-game/")) return "../../";
    if (p.includes("-lobby/") || p.includes("/profile/") || p.includes("/store/") || p.includes("/messages/")) return "../";
    return "";
  },

  showTopNotification(opts = {}) {
    const senderHandle = String(opts.senderHandle || "OPERATIVE").toUpperCase();

    // Respect Per-Player Mute Settings!
    if (opts.type === "call" && window.ZHMute.isCallMuted(senderHandle)) return;
    if (opts.type !== "call" && window.ZHMute.isMessageMuted(senderHandle)) return;

    if (!this.bannerEl) {
      this.bannerEl = document.createElement("div");
      this.bannerEl.className = "zh-top-notify-banner";
      document.body.appendChild(this.bannerEl);
    }

    const pub = window.ZHStats?.getPublicProfileByHandle(senderHandle) || { name: senderHandle, avatar: "char14.jpg" };
    const avatarSrc = this.getAvatarPrefix() + (opts.avatar || pub.avatar || "char14.jpg");
    const displayTitle = opts.senderName || pub.name || senderHandle;
    const text = opts.text || "Sent you a tactical transmission.";

    // Detect if message contains a Custom Room Invite Code (e.g. ZH1234)
    const roomMatch = (opts.roomCode) || (text.match(/\b(ZH\d{4})\b/i)?.[1]);
    const modeKey = opts.modeKey || "16P";

    window.ZHSound?.play("unlock");

    this.bannerEl.innerHTML = `
      <div class="zh-top-notify-left" id="zhBannerOpenChatArea">
        <img src="${avatarSrc}" alt="${displayTitle}">
        <div class="zh-top-notify-meta">
          <small>${roomMatch ? "⚔️ SQUAD ROOM INVITE" : `💬 MESSAGE • @${senderHandle}`}</small>
          <strong>${displayTitle}</strong>
          <p>${text}</p>
        </div>
      </div>
      <div class="zh-top-notify-actions">
        ${roomMatch ? `
          <button type="button" class="zh-notify-join-btn" id="zhBannerJoinRoomBtn">JOIN ROOM (${roomMatch.toUpperCase()}) ↗</button>
        ` : `
          <button type="button" class="zh-notify-reply-btn" id="zhBannerReplyBtn">OPEN ↗</button>
        `}
        <button type="button" class="zh-notify-close-btn" id="zhBannerDismissBtn">✕</button>
      </div>
    `;

    this.bannerEl.classList.add("show");
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => {
      this.bannerEl?.classList.remove("show");
    }, 4800);

    const root = this.getRootPrefix();

    this.bannerEl.querySelector("#zhBannerDismissBtn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.bannerEl.classList.remove("show");
    });

    this.bannerEl.querySelector("#zhBannerJoinRoomBtn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      window.ZHSound?.play("lock");
      localStorage.setItem("zh_custom_room_code", roomMatch.toUpperCase());
      localStorage.setItem("zh_preferred_online_mode", modeKey);
      window.location.href = `${root}online-lobby/lobby.html?mode=${modeKey}&room=${roomMatch.toUpperCase()}`;
    });

    const openDm = () => {
      if (senderHandle === "SYSTEM") return;
      window.location.href = `${root}messages/messages.html?to=${encodeURIComponent(senderHandle)}`;
    };
    this.bannerEl.querySelector("#zhBannerReplyBtn")?.addEventListener("click", openDm);
    this.bannerEl.querySelector("#zhBannerOpenChatArea")?.addEventListener("click", openDm);
  },

  // Helper to send a 1-Click Room Invite DM to any player and show confirmation
  sendRoomInviteToPlayer(targetHandle) {
    const clean = String(targetHandle || "").trim().toUpperCase();
    if (!clean) return;
    let roomCode = localStorage.getItem("zh_custom_room_code");
    if (!roomCode) {
      roomCode = "ZH" + Math.floor(1000 + Math.random() * 9000);
      localStorage.setItem("zh_custom_room_code", roomCode);
    }
    const inviteText = `Join my Squad War Room! Code: ${roomCode} (16P Arena)`;

    // Save into DM threads
    try {
      const threads = JSON.parse(localStorage.getItem("zh_dm_threads_v4") || "{}");
      if (!threads[clean]) {
        threads[clean] = { handle: clean, folder: "primary", accepted: true, unreadCount: 0, messages: [] };
      }
      threads[clean].messages.push({
        id: `inv_${Date.now()}`,
        fromMe: true,
        text: inviteText,
        time: Date.now(),
        seen: true
      });
      localStorage.setItem("zh_dm_threads_v4", JSON.stringify(threads));
    } catch {}

    if (this.bgSocket && this.bgSocket.connected) {
      const me = window.ZHStats.getLocalPlayerStats();
      this.bgSocket.emit("send_private_dm", {
        fromSessionId: localStorage.getItem("zh_player_session_id"),
        fromName: me.handle,
        toSessionId: clean,
        text: inviteText
      });
    }

    window.ZHSound?.play("lock");
    return roomCode;
  },

  initGlobalSocketListener() {
    if (typeof io === "undefined" || window.location.pathname.includes("/messages/")) return;
    try {
      this.bgSocket = io(window.location.origin, { transports: ["websocket", "polling"] });
      const mySession = localStorage.getItem("zh_player_session_id");
      const me = window.ZHStats?.getLocalPlayerStats();

      this.bgSocket.on("receive_private_dm", (data) => {
        if (data.toSessionId === mySession || (me && String(data.toSessionId).toUpperCase() === me.handle)) {
          this.showTopNotification({
            senderHandle: data.fromName || "OPERATIVE",
            senderName: data.fromName || "OPERATIVE",
            text: data.text
          });
        }
      });
    } catch {}
  }
};

/* =========================================================
   8. MASTER CONFIG, CLAIMABLE ACHIEVEMENTS & ROSTER
========================================================= */
window.ZH_CONFIG = {
  ADSENSE_CLIENT_ID: "ca-pub-XXXXXXXXXXXXXXXX",
  ADSENSE_BANNER_SLOT_ID: "1234567890",
  ADMOB_APP_ID: "ca-app-pub-XXXXXXXXXXXXXXXX~ZZZZZZZZZZ",
  ADMOB_REWARDED_ID: "ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY",
  ADMOB_INTERSTITIAL_ID: "ca-app-pub-XXXXXXXXXXXXXXXX/IIIIIIIIII",
  RAZORPAY_KEY_ID: "rzp_test_YourKeyHere",
  CEO_ADMIN_PIN: "2026",
  DEFAULT_START_TOKENS: 5000,
  ENTRY_FEE: 1000,
  BOT_TOURNAMENT_WIN_REWARD: 1000,
  AD_REWARD_TOKENS: 2000,
  DAILY_REWARDS: [500, 750, 1000, 1500, 2000, 2500, 5000],

  ACHIEVEMENTS: [
    {
      id: "ach_first_blood",
      name: "FIRST BLOOD",
      iconFile: "ach-first-blood.png",
      ruleText: "Eliminate a Zombie carrier using the Shotgun Card.",
      statKey: "kills",
      target: 1,
      rewardTokens: 1500,
      rewardCP: 150,
      rewardHxPercent: 3
    },
    {
      id: "ach_plague_doctor",
      name: "BIO SAVIOR",
      iconFile: "ach-plague-doctor.png",
      ruleText: "Cure 10 infected players back to Human using the Vaccine Card.",
      statKey: "cures",
      target: 10,
      rewardTokens: 2500,
      rewardCP: 250,
      rewardHxPercent: 4
    },
    {
      id: "ach_patient_zero",
      name: "PATIENT ZERO",
      iconFile: "ach-patient-zero.png",
      ruleText: "Infect 10 human rivals using the covert Zombie Card.",
      statKey: "infections",
      target: 10,
      rewardTokens: 2500,
      rewardCP: 250,
      rewardHxPercent: 4
    },
    {
      id: "ach_card_shark",
      name: "CARD SHARK",
      iconFile: "ach-card-shark.png",
      ruleText: "Claim 50 number cards from defeated opponents in sector duels.",
      statKey: "claimedCardsCount",
      target: 50,
      rewardTokens: 3500,
      rewardCP: 350,
      rewardHxPercent: 5
    },
    {
      id: "ach_apex_squad",
      name: "APEX SQUAD",
      iconFile: "ach-apex-squad.png",
      ruleText: "Win 10 Tournament Championships with your squad.",
      statKey: "tournamentWins",
      target: 10,
      rewardTokens: 5000,
      rewardCP: 500,
      rewardHxPercent: 6
    },
    {
      id: "ach_high_roller",
      name: "HIGH ROLLER",
      iconFile: "ach-high-roller.png",
      ruleText: "Accumulate 25,000+ Bounty Tokens or activate the VIP Pass.",
      statKey: "highRoller",
      target: 1,
      rewardTokens: 4000,
      rewardCP: 400,
      rewardHxPercent: 5
    }
  ],

  TOP_HUNTERS_ROSTER: [
    { handle: "VIKRAM_APEX", name: "Vikram Rathore", avatar: "char14.jpg", isVIP: true, tournamentWins: 42, duelWins: 168, losses: 24, kills: 58, cures: 32, infections: 29, followers: 18420, following: 42, bio: "Rank #1 Apex Commander | Shotgun never misses | Squad Alpha Leader", tokens: 64500 },
    { handle: "SHADOW_QUEEN", name: "Aanya Sharma", avatar: "char11.jpg", isVIP: true, tournamentWins: 38, duelWins: 152, losses: 25, kills: 49, cures: 41, infections: 24, followers: 15290, following: 68, bio: "Mind-game specialist. Read the voice, steal the deck.", tokens: 52000 },
    { handle: "RAVEN_X", name: "Kabir Verma", avatar: "char7.jpg", isVIP: true, tournamentWins: 34, duelWins: 140, losses: 27, kills: 44, cures: 28, infections: 31, followers: 11800, following: 51, bio: "Covert Zombie Carrier | 16P Grand Arena Veteran", tokens: 43200 },
    { handle: "BLAZE_HUNTER", name: "Rohan Singh", avatar: "char3.jpg", isVIP: false, tournamentWins: 29, duelWins: 124, losses: 28, kills: 39, cures: 22, infections: 19, followers: 9410, following: 94, bio: "Aggressive suit-stacker. No mercy in Round 3.", tokens: 31000 },
    { handle: "NIGHT_WOLF", name: "Aryan Chauhan", avatar: "char16.jpg", isVIP: true, tournamentWins: 26, duelWins: 115, losses: 29, kills: 36, cures: 25, infections: 21, followers: 8750, following: 33, bio: "Night Stalker Callsign | Squad Bravo Commander", tokens: 29400 },
    { handle: "ZOMBIE_SLAYER", name: "Devendra", avatar: "char5.jpg", isVIP: false, tournamentWins: 23, duelWins: 102, losses: 30, kills: 34, cures: 19, infections: 16, followers: 6320, following: 77, bio: "Save the Vaccine, fire the Shotgun.", tokens: 21500 },
    { handle: "CYBER_MONK", name: "Siddharth", avatar: "char9.jpg", isVIP: false, tournamentWins: 20, duelWins: 94, losses: 31, kills: 29, cures: 24, infections: 15, followers: 5190, following: 60, bio: "Calm voice parley. Deadly card lock.", tokens: 18900 },
    { handle: "VALKYRIE_99", name: "Meera Nair", avatar: "char12.jpg", isVIP: true, tournamentWins: 18, duelWins: 86, losses: 32, kills: 26, cures: 27, infections: 14, followers: 4820, following: 45, bio: "Bio Savior Medal Holder | Team Charlie", tokens: 26000 },
    { handle: "GHOST_RECON", name: "Aditya Raj", avatar: "char2.jpg", isVIP: false, tournamentWins: 16, duelWins: 78, losses: 33, kills: 24, cures: 18, infections: 12, followers: 3940, following: 82, bio: "Silent operator in 8P Tactical Clash.", tokens: 14200 },
    { handle: "KAI_STALKER", name: "Kai", avatar: "char6.jpg", isVIP: false, tournamentWins: 14, duelWins: 70, losses: 34, kills: 21, cures: 15, infections: 11, followers: 3120, following: 55, bio: "Gatekeeper of the Top 10 Leaderboard.", tokens: 12500 },
    { handle: "MASON_PRO", name: "Mason", avatar: "char4.jpg", isVIP: false, tournamentWins: 6, duelWins: 32, losses: 19, kills: 11, cures: 8, infections: 6, followers: 1850, following: 110, bio: "Squad Recon | Always ready for 4P Quick Duels.", tokens: 7800 },
    { handle: "LUNA_99", name: "Luna", avatar: "char10.jpg", isVIP: true, tournamentWins: 8, duelWins: 40, losses: 21, kills: 14, cures: 12, infections: 9, followers: 2490, following: 88, bio: "Diamonds & Hearts specialist.", tokens: 15600 },
    { handle: "BLAKE_AI", name: "Blake", avatar: "char8.jpg", isVIP: false, tournamentWins: 4, duelWins: 22, losses: 18, kills: 8, cures: 6, infections: 5, followers: 1120, following: 64, bio: "Testing strategies in the War Room.", tokens: 5400 }
  ]
};

/* =========================================================
   9. CP, HX, SEPARATE @USERNAME vs DISPLAY NAME & SEARCH ENGINE
========================================================= */
window.ZHStats = {
  getClaimedAchievements() {
    try { return JSON.parse(localStorage.getItem("zh_claimed_achievements") || "[]"); } catch { return []; }
  },

  isAchievementClaimed(achId) {
    return this.getClaimedAchievements().includes(achId);
  },

  getAchievementBonuses() {
    const claimed = this.getClaimedAchievements();
    let bonusCP = 0;
    let bonusHxPercent = 0;
    window.ZH_CONFIG.ACHIEVEMENTS.forEach(a => {
      if (claimed.includes(a.id)) {
        bonusCP += Number(a.rewardCP || 0);
        bonusHxPercent += Number(a.rewardHxPercent || 0);
      }
    });
    return { bonusCP, bonusHxPercent };
  },

  claimAchievementReward(achId) {
    const ach = window.ZH_CONFIG.ACHIEVEMENTS.find(a => a.id === achId);
    if (!ach) return { ok: false };
    const claimed = this.getClaimedAchievements();
    if (claimed.includes(achId)) return { ok: false, message: "ALREADY CLAIMED!" };

    claimed.push(achId);
    localStorage.setItem("zh_claimed_achievements", JSON.stringify(claimed));
    window.ZHWallet?.addTokens(ach.rewardTokens);
    window.ZHSound?.play("unlock");

    return {
      ok: true,
      ach,
      tokensAdded: ach.rewardTokens,
      cpAdded: ach.rewardCP,
      hxPctAdded: ach.rewardHxPercent
    };
  },

  calculateCP(p, includeLocalAchBonus = false) {
    const raw =
      (Number(p.tournamentWins || 0) * 150) +
      (Number(p.duelWins || 0) * 25) +
      (Number(p.kills || 0) * 80) +
      (Number(p.cures || 0) * 60) +
      (Number(p.infections || 0) * 50) -
      (Number(p.losses || 0) * 20);
    const achBonus = includeLocalAchBonus ? this.getAchievementBonuses().bonusCP : 0;
    return Math.max(0, Math.floor(raw + achBonus));
  },

  calculateHX(p, includeLocalAchBonus = false) {
    const num =
      (Number(p.duelWins || 0) * 1.5) +
      (Number(p.kills || 0) * 2.0) +
      (Number(p.cures || 0) * 1.5) +
      (Number(p.infections || 0) * 1.5);
    const den = Math.max(1, Number(p.losses || 1));
    let baseHx = num / den;
    if (includeLocalAchBonus) {
      const pct = this.getAchievementBonuses().bonusHxPercent;
      baseHx = baseHx * (1 + pct / 100);
    }
    return Number(baseHx.toFixed(2));
  },

  getRankTier(cp) {
    if (cp >= 10000) return { title: "APEX COMMANDER", short: "APEX" };
    if (cp >= 5000)  return { title: "DIAMOND PREDATOR", short: "DIAMOND" };
    if (cp >= 2500)  return { title: "GOLD OPERATIVE", short: "GOLD" };
    if (cp >= 1000)  return { title: "SILVER STALKER", short: "SILVER" };
    return { title: "BRONZE RECRUIT", short: "BRONZE" };
  },

  // Supports separate unique @username (handle) and Display Name (name)!
  getLocalPlayerStats() {
    const profile = JSON.parse(localStorage.getItem("zh_profile") || '{"username":"survivor_01","name":"Survivor","avatar":"char1.jpg"}');
    const displayName = (profile.name || "Survivor").trim();
    const rawUsername = (profile.username || localStorage.getItem("zh_player_username") || displayName.replace(/\s+/g, "_")).trim().replace(/^@+/, "").replace(/[^a-zA-Z0-9_]/g, "_").toUpperCase();

    const tournamentWins = Number(localStorage.getItem("zh_tournament_wins") ?? 3);
    const duelWins = Number(localStorage.getItem("zh_squad_wins") ?? 24);
    const losses = Number(localStorage.getItem("zh_squad_losses") ?? 12);
    const kills = Number(localStorage.getItem("zh_shotgun_kills") ?? 9);
    const cures = Number(localStorage.getItem("zh_vaccine_cures") ?? 6);
    const infections = Number(localStorage.getItem("zh_zombie_infections") ?? 5);
    const claimedCardsCount = Number(localStorage.getItem("zh_claimed_cards_total") ?? 28);
    const followers = Number(localStorage.getItem("zh_followers") ?? 1420);
    const followingList = this.getFollowingHandles();
    const bio = localStorage.getItem("zh_player_bio") || "Tactical Survivor • Read the cards, outbluff the room.";
    const tokens = window.ZHWallet ? window.ZHWallet.getTokens() : 5000;
    const isVIP = window.ZHWallet ? window.ZHWallet.isVIP() : false;
    const ownsVIP = window.ZHWallet ? window.ZHWallet.hasActiveVipSubscription() : false;

    const rawStats = { tournamentWins, duelWins, losses, kills, cures, infections, claimedCardsCount };
    const cp = this.calculateCP(rawStats, true);
    const hx = this.calculateHX(rawStats, true);
    const matches = duelWins + losses;
    const tier = this.getRankTier(cp);

    const top10WithCP = window.ZH_CONFIG.TOP_HUNTERS_ROSTER.slice(0, 10).map(r => ({
      ...r,
      cp: this.calculateCP(r, false),
      hx: this.calculateHX(r, false)
    })).sort((a, b) => b.cp - a.cp);

    const tenthPlaceCP = top10WithCP[top10WithCP.length - 1].cp;
    let globalRankNumber = 483;
    let isInTop10 = false;

    if (cp >= tenthPlaceCP) {
      isInTop10 = true;
      let pos = 1;
      for (let i = 0; i < top10WithCP.length; i++) {
        if (cp < top10WithCP[i].cp) pos++;
      }
      globalRankNumber = Math.min(10, pos);
    } else {
      const ratio = Math.max(0, Math.min(1, cp / tenthPlaceCP));
      globalRankNumber = Math.max(11, Math.round(580 - ratio * 465));
    }

    return {
      handle: rawUsername || "SURVIVOR_01", // Unique @username
      username: rawUsername || "SURVIVOR_01",
      name: displayName, // Separate Display Name
      avatar: profile.avatar || "char1.jpg",
      isVIP,
      tokens,
      bio,
      followers,
      followingCount: followingList.length,
      followingList,
      matches,
      tournamentWins,
      duelWins,
      losses,
      kills,
      cures,
      infections,
      claimedCardsCount,
      highRoller: (tokens >= 25000 || ownsVIP) ? 1 : 0,
      cp,
      hx,
      rankTitle: tier.title,
      rankShort: tier.short,
      globalRankNumber,
      isInTop10
    };
  },

  // Search Directory by @username or Display Name
  searchPlayers(queryStr = "") {
    const q = String(queryStr || "").trim().replace(/^@+/, "").toUpperCase();
    const all = window.ZH_CONFIG.TOP_HUNTERS_ROSTER.map(r => this.getPublicProfileByHandle(r.handle));
    if (!q) return all;
    return all.filter(p =>
      p.handle.toUpperCase().includes(q) ||
      p.name.toUpperCase().includes(q)
    );
  },

  getTop10LeaderboardList() {
    const me = this.getLocalPlayerStats();
    const roster = window.ZH_CONFIG.TOP_HUNTERS_ROSTER.slice(0, 10).map(r => ({
      ...r,
      cp: this.calculateCP(r, false),
      hx: this.calculateHX(r, false),
      isMe: false
    }));

    if (me.isInTop10) {
      roster.push({
        handle: me.handle,
        name: me.name,
        avatar: me.avatar,
        isVIP: me.isVIP,
        cp: me.cp,
        hx: me.hx,
        tournamentWins: me.tournamentWins,
        isMe: true
      });
    }

    roster.sort((a, b) => b.cp - a.cp);
    return roster.slice(0, 10).map((item, idx) => ({
      ...item,
      rankPos: idx + 1
    }));
  },

  getPublicProfileByHandle(handleQuery) {
    const me = this.getLocalPlayerStats();
    if (!handleQuery) return { ...me, isOwnProfile: true };

    const cleanQ = String(handleQuery).trim().replace(/^@+/, "").toUpperCase();
    if (cleanQ === me.handle || cleanQ === me.name.toUpperCase()) {
      return { ...me, isOwnProfile: true };
    }

    const found = window.ZH_CONFIG.TOP_HUNTERS_ROSTER.find(
      p => p.handle.toUpperCase() === cleanQ || p.name.toUpperCase() === cleanQ
    );

    if (found) {
      const cp = this.calculateCP(found, false);
      const hx = this.calculateHX(found, false);
      const tier = this.getRankTier(cp);
      const top10 = this.getTop10LeaderboardList();
      const inTop = top10.find(t => t.handle.toUpperCase() === found.handle.toUpperCase());
      const rankNum = inTop ? inTop.rankPos : Math.max(12, Math.round(450 - (cp / 5000) * 300));

      return {
        ...found,
        username: found.handle,
        matches: found.duelWins + found.losses,
        claimedCardsCount: found.duelWins * 2,
        highRoller: (found.tokens >= 25000 || found.isVIP) ? 1 : 0,
        cp,
        hx,
        rankTitle: tier.title,
        rankShort: tier.short,
        globalRankNumber: rankNum,
        isInTop10: !!inTop,
        isOwnProfile: false
      };
    }

    const synthStats = { tournamentWins: 5, duelWins: 28, losses: 14, kills: 10, cures: 7, infections: 6 };
    const cp = this.calculateCP(synthStats, false);
    const hx = this.calculateHX(synthStats, false);
    const tier = this.getRankTier(cp);
    return {
      handle: cleanQ,
      username: cleanQ,
      name: cleanQ,
      avatar: "char3.jpg",
      isVIP: false,
      tokens: 6400,
      bio: "Active Operative in Zombie Hunt Survival Arena.",
      followers: 1280,
      following: 54,
      matches: 42,
      ...synthStats,
      claimedCardsCount: 34,
      highRoller: 0,
      cp,
      hx,
      rankTitle: tier.title,
      rankShort: tier.short,
      globalRankNumber: 312,
      isInTop10: false,
      isOwnProfile: false
    };
  },

  getFollowingHandles() {
    try {
      const saved = JSON.parse(localStorage.getItem("zh_followed_players"));
      if (Array.isArray(saved)) return saved;
    } catch {}
    const defaults = ["VIKRAM_APEX", "SHADOW_QUEEN", "MASON_PRO", "LUNA_99"];
    localStorage.setItem("zh_followed_players", JSON.stringify(defaults));
    return defaults;
  },

  isFollowing(handle) {
    if (!handle) return false;
    const clean = String(handle).trim().replace(/^@+/, "").toUpperCase();
    return this.getFollowingHandles().some(h => h.toUpperCase() === clean);
  },

  toggleFollow(handle) {
    if (!handle) return false;
    const clean = String(handle).trim().replace(/^@+/, "").toUpperCase();
    let list = this.getFollowingHandles();
    const exists = list.some(h => h.toUpperCase() === clean);

    if (exists) {
      list = list.filter(h => h.toUpperCase() !== clean);
    } else {
      list.push(clean);
    }
    localStorage.setItem("zh_followed_players", JSON.stringify(list));
    window.dispatchEvent(new CustomEvent("zh_follow_updated", { detail: { handle: clean, following: !exists } }));
    return !exists;
  }
};

/* =========================================================
   10. STRICT 7-DAY DAILY STREAK ENGINE
========================================================= */
window.ZHDailyStreak = {
  getTodayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  },

  getYesterdayKey() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  },

  getValidatedState() {
    const lastDate = localStorage.getItem("zh_daily_last_ymd") || "";
    let streak = Number(localStorage.getItem("zh_daily_streak_count") || 0);
    const today = this.getTodayKey();
    const yesterday = this.getYesterdayKey();

    if (lastDate && lastDate !== today && lastDate !== yesterday) {
      streak = 0;
      localStorage.setItem("zh_daily_streak_count", "0");
    }

    if (streak >= 7 && lastDate !== today) {
      streak = 0;
      localStorage.setItem("zh_daily_streak_count", "0");
    }

    const claimedToday = (lastDate === today);
    const activeDayIndex = claimedToday ? Math.max(0, streak - 1) : streak;

    return {
      streak,
      activeDayIndex,
      claimedToday,
      rewards: window.ZH_CONFIG.DAILY_REWARDS
    };
  },

  claimToday() {
    const state = this.getValidatedState();
    if (state.claimedToday) {
      return { ok: false, message: "TODAY'S SUPPLY DROP ALREADY CLAIMED!" };
    }
    const baseReward = state.rewards[state.activeDayIndex] || 500;
    const vipBonus = window.ZHWallet?.hasActiveVipSubscription() ? 500 : 0;
    const totalReward = baseReward + vipBonus;
    const newStreak = state.activeDayIndex + 1;

    localStorage.setItem("zh_daily_last_ymd", this.getTodayKey());
    localStorage.setItem("zh_daily_streak_count", String(newStreak));
    window.ZHWallet?.addTokens(totalReward);
    return {
      ok: true,
      dayNumber: newStreak,
      reward: totalReward,
      vipBonus
    };
  }
};

/* =========================================================
   11. VERIFIED ROSETTE TICK & CUSTOM BRAND ICON INJECTOR
========================================================= */
window.ZHIcons = {
  getIconsFolderPrefix() {
    const p = window.location.pathname;
    if (p.includes("/team-room/")) return "../../../icons/";
    if (p.includes("/bot-game/") || p.includes("/online-game/")) return "../../icons/";
    if (p.includes("-lobby/") || p.includes("/profile/") || p.includes("/store/") || p.includes("/messages/")) return "../icons/";
    return "icons/";
  },

  getVerifiedTickSVG() {
    return `<svg viewBox="0 0 40 40" style="width:100%;height:100%;display:block;">
      <defs>
        <linearGradient id="zhVipGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#e5ae37"/>
          <stop offset="50%" stop-color="#d63d2a"/>
          <stop offset="100%" stop-color="#991b1b"/>
        </linearGradient>
      </defs>
      <path d="M20 2 L24.5 5.2 L30 4.5 L32.2 9.6 L37.3 11.8 L36.6 17.3 L39.8 21.8 L36.6 26.3 L37.3 31.8 L32.2 34 L30 39.1 L24.5 38.4 L20 41.6 L15.5 38.4 L10 39.1 L7.8 34 L2.7 31.8 L3.4 26.3 L0.2 21.8 L3.4 17.3 L2.7 11.8 L7.8 9.6 L10 4.5 L15.5 5.2 Z" transform="scale(0.9) translate(2.2, 1.2)" fill="url(#zhVipGrad)" stroke="#efe5ce" stroke-width="2.6"/>
      <path d="M13.5 20.5 L18 25 L27.5 15" fill="none" stroke="#faf3df" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  },

  renderVerifiedTickHTML(className = "zh-inline-vip-tick") {
    const pngPath = this.getIconsFolderPrefix() + "vip-tick.png";
    const fallbackSvg = this.getVerifiedTickSVG().replace(/"/g, "'");
    return `<span class="${className}" title="Verified VIP Commander">
      <img src="${pngPath}" alt="Verified" style="width:100%;height:100%;object-fit:contain;display:block;" onerror="this.outerHTML=&quot;${fallbackSvg}&quot;">
    </span>`;
  },

  injectCustomBrandIconsEverywhere() {
    const prefix = this.getIconsFolderPrefix();

    document.querySelectorAll(".brand-mark").forEach(mark => {
      if (mark.dataset.zhLogoInjected) return;
      mark.dataset.zhLogoInjected = "true";
      const existingSvg = mark.querySelector("svg");
      if (existingSvg && !mark.querySelector("img")) {
        const img = document.createElement("img");
        img.src = prefix + "game-logo.png";
        img.alt = "Zombie Hunt";
        img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;";
        img.onload = () => { existingSvg.style.display = "none"; };
        img.onerror = () => { img.remove(); existingSvg.style.display = ""; };
        mark.prepend(img);
      }
    });

    document.querySelectorAll("#lobbyWalletDisplay, #topWalletTokens, #headerPrizePool").forEach(el => {
      const parent = el.parentElement;
      if (!parent || parent.dataset.zhCoinInjected) return;
      parent.dataset.zhCoinInjected = "true";
      const existingSvg = parent.querySelector("svg");
      if (existingSvg && !parent.querySelector("img.zh-auto-coin")) {
        const img = document.createElement("img");
        img.src = prefix + "bounty-token.png";
        img.className = "zh-auto-coin";
        img.style.cssText = "width:17px;height:17px;object-fit:contain;flex-shrink:0;";
        img.onload = () => { existingSvg.style.display = "none"; };
        img.onerror = () => { img.remove(); existingSvg.style.display = ""; };
        parent.prepend(img);
      }
    });
  }
};

window.ZHAuth = {
  getGender() {
    return localStorage.getItem("zh_user_gender") === "female" ? "female" : "male";
  },
  setGender(gender) {
    const clean = gender === "female" ? "female" : "male";
    localStorage.setItem("zh_user_gender", clean);
    window.dispatchEvent(new CustomEvent("zh_profile_changed"));
    return clean;
  },
  isGoogleLoggedIn() {
    return localStorage.getItem("zh_google_logged_in") === "true";
  },
  getGoogleUser() {
    try { return JSON.parse(localStorage.getItem("zh_google_user") || "null"); } catch { return null; }
  },
  getDefaultGenderAvatarDataURI(genderOverride) {
    const gender = genderOverride || this.getGender();
    if (gender === "female") {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="pG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fbcfe8"/><stop offset="55%" stop-color="#f472b6"/><stop offset="100%" stop-color="#ec4899"/></linearGradient></defs><rect width="120" height="120" rx="60" fill="url(#pG)"/><circle cx="60" cy="43" r="20" fill="#fff5f9"/><path d="M24 106 C24 78, 96 78, 96 106 Z" fill="#fff5f9"/></svg>`;
      return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
    } else {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="bG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#93c5fd"/><stop offset="55%" stop-color="#3b82f6"/><stop offset="100%" stop-color="#1d4ed8"/></linearGradient></defs><rect width="120" height="120" rx="60" fill="url(#bG)"/><circle cx="60" cy="43" r="20" fill="#f0f7ff"/><path d="M24 106 C24 78, 96 78, 96 106 Z" fill="#f0f7ff"/></svg>`;
      return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
    }
  },
  resolvePlayerAvatarSrc(baseAvatarFolder = "profile/avatars/", requestedAvatar = "char1.jpg") {
    if (!this.isGoogleLoggedIn()) return this.getDefaultGenderAvatarDataURI();
    const clean = String(requestedAvatar || "char1.jpg").trim().split(/[\\/]/).pop();
    const valid = /^char(1[0-9]|20|[1-9])\.jpg$/i.test(clean) ? clean.toLowerCase() : "char1.jpg";
    return baseAvatarFolder + valid;
  },
  signInWithGoogle(customNameInput) {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(15,20,18,0.88);backdrop-filter:blur(10px);z-index:9999999;display:grid;place-items:center;padding:18px;font-family:'DM Sans',sans-serif;";
    overlay.innerHTML = `
      <div style="background:#ffffff;color:#1f2937;border-radius:22px;padding:28px 24px;max-width:380px;width:100%;text-align:center;box-shadow:0 30px 70px rgba(0,0,0,0.45);">
        <h3 style="font-family:'Oswald',sans-serif;font-size:22px;margin:0 0 6px;">SIGN IN WITH GOOGLE</h3>
        <p style="font-size:12px;color:#6b7280;margin:0 0 16px;">Link your Google Account to unlock all 17 Character Avatars.</p>
        <input id="zhGoogleEmailInput" type="email" placeholder="yourname@gmail.com" value="${customNameInput ? customNameInput.toLowerCase().replace(/\s+/g, '') + '@gmail.com' : ''}" style="width:100%;padding:12px 14px;border-radius:10px;border:1px solid #d1d5db;font-size:13px;margin-bottom:10px;">
        <input id="zhGoogleNameInput" type="text" maxlength="18" placeholder="Display Name" value="${customNameInput || ''}" style="width:100%;padding:12px 14px;border-radius:10px;border:1px solid #d1d5db;font-size:13px;margin-bottom:16px;">
        <div style="display:flex;gap:8px;">
          <button type="button" id="zhCancelGoogleBtn" style="flex:1;padding:11px;border-radius:10px;border:1px solid #d1d5db;background:#f9fafb;font-weight:700;cursor:pointer;">CANCEL</button>
          <button type="button" id="zhConfirmGoogleBtn" style="flex:1.4;padding:11px;border-radius:10px;border:0;background:#2563eb;color:#fff;font-weight:800;cursor:pointer;">CONTINUE</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector("#zhCancelGoogleBtn").onclick = () => overlay.remove();
    overlay.querySelector("#zhConfirmGoogleBtn").onclick = () => {
      const email = overlay.querySelector("#zhGoogleEmailInput").value.trim() || "survivor@gmail.com";
      const gName = overlay.querySelector("#zhGoogleNameInput").value.trim() || email.split("@")[0] || "Survivor";
      const gUsername = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_").toUpperCase();
      localStorage.setItem("zh_google_logged_in", "true");
      localStorage.setItem("zh_google_user", JSON.stringify({ email, name: gName, username: gUsername, linkedAt: Date.now() }));
      const currentProfile = JSON.parse(localStorage.getItem("zh_profile") || "{}");
      currentProfile.name = gName;
      currentProfile.username = gUsername;
      localStorage.setItem("zh_player_username", gUsername);
      if (!currentProfile.avatar || !currentProfile.avatar.startsWith("char")) currentProfile.avatar = "char1.jpg";
      localStorage.setItem("zh_profile", JSON.stringify(currentProfile));
      overlay.remove();
      window.ZHSound?.play("unlock");
      window.dispatchEvent(new CustomEvent("zh_profile_changed"));
    };
  }
};

/* =========================================================
   12. WALLET, BOUNTY SHIELD AUTO-REFUND & REVENUE TRACKER
========================================================= */
window.ZHWallet = {
  getTokens() {
    let val = Number(localStorage.getItem("zh_bounty_tokens"));
    if (isNaN(val) || val < 0) {
      val = window.ZH_CONFIG.DEFAULT_START_TOKENS;
      this.setTokens(val);
    }
    return val;
  },
  setTokens(amount) {
    const clean = Math.max(0, Math.floor(Number(amount) || 0));
    localStorage.setItem("zh_bounty_tokens", String(clean));
    window.dispatchEvent(new CustomEvent("zh_wallet_updated", { detail: { tokens: clean } }));
    return clean;
  },
  addTokens(delta) {
    return this.setTokens(this.getTokens() + Number(delta || 0));
  },
  getOwnedItems() {
    try { return JSON.parse(localStorage.getItem("zh_owned_cosmetics") || "[]"); } catch { return []; }
  },
  ownsItem(itemId) {
    return this.getOwnedItems().includes(itemId);
  },
  unlockItem(itemId) {
    const list = this.getOwnedItems();
    if (!list.includes(itemId)) {
      list.push(itemId);
      localStorage.setItem("zh_owned_cosmetics", JSON.stringify(list));
    }
  },

  getVipExpiryTimestamp() {
    return Number(localStorage.getItem("zh_vip_expiry_ts") || 0);
  },
  hasActiveVipSubscription() {
    return this.getVipExpiryTimestamp() > Date.now();
  },
  isVipEquipped() {
    return localStorage.getItem("zh_vip_visual_equipped") !== "false";
  },
  isVIP() {
    return this.hasActiveVipSubscription() && this.isVipEquipped();
  },
  setVipEquipped(equippedBool) {
    localStorage.setItem("zh_vip_visual_equipped", equippedBool ? "true" : "false");
    if (!equippedBool) {
      const eq = this.getEquipped();
      if (eq["AVATAR FRAME"] === "frame_vip_3d_gold") {
        delete eq["AVATAR FRAME"];
        localStorage.setItem("zh_equipped_cosmetics", JSON.stringify(eq));
      }
    }
    this.applyEquippedCosmetics();
    window.dispatchEvent(new CustomEvent("zh_profile_changed"));
  },
  toggleVipEquipped() {
    const next = !this.isVipEquipped();
    this.setVipEquipped(next);
    return next;
  },
  getVipRemainingDays() {
    const exp = this.getVipExpiryTimestamp();
    if (exp <= Date.now()) return 0;
    return Math.ceil((exp - Date.now()) / (1000 * 60 * 60 * 24));
  },
  activateVipPlan(days = 30, planKey = "1M") {
    const currentExp = Math.max(Date.now(), this.getVipExpiryTimestamp());
    const newExp = currentExp + days * 24 * 60 * 60 * 1000;
    localStorage.setItem("zh_vip_expiry_ts", String(newExp));
    localStorage.setItem("zh_vip_commander", "true");
    localStorage.setItem("zh_vip_plan_type", planKey);
    localStorage.setItem("zh_vip_visual_equipped", "true");
    this.unlockItem("frame_vip_3d_gold");
    const eq = this.getEquipped();
    if (!eq["AVATAR FRAME"]) this.equipItem("AVATAR FRAME", "frame_vip_3d_gold");
    this.applyEquippedCosmetics();
  },

  isAdFree() {
    if (this.hasActiveVipSubscription()) return true;
    const todayKey = window.ZHDailyStreak.getTodayKey();
    if (localStorage.getItem("zh_adfree_calendar_ymd") === todayKey) return true;
    const sevenDayExp = Number(localStorage.getItem("zh_adfree_7d_expiry_ts") || 0);
    if (sevenDayExp > Date.now()) return true;
    return false;
  },
  getAdFreeStatusLabel() {
    if (this.hasActiveVipSubscription()) return `VIP AD-FREE (${this.getVipRemainingDays()}D LEFT)`;
    const sevenDayExp = Number(localStorage.getItem("zh_adfree_7d_expiry_ts") || 0);
    if (sevenDayExp > Date.now()) {
      const d = Math.ceil((sevenDayExp - Date.now()) / (1000 * 60 * 60 * 24));
      return `7-DAY AD-FREE (${d}D LEFT)`;
    }
    const todayKey = window.ZHDailyStreak.getTodayKey();
    if (localStorage.getItem("zh_adfree_calendar_ymd") === todayKey) {
      return "TODAY AD-FREE (TILL MIDNIGHT)";
    }
    return "STANDARD (ADS ENABLED)";
  },
  activateDailyAdFree() {
    const todayKey = window.ZHDailyStreak.getTodayKey();
    localStorage.setItem("zh_adfree_calendar_ymd", todayKey);
  },
  activateWeeklyAdFree() {
    const currentExp = Math.max(Date.now(), Number(localStorage.getItem("zh_adfree_7d_expiry_ts") || 0));
    const newExp = currentExp + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem("zh_adfree_7d_expiry_ts", String(newExp));
  },

  // Bounty Loss Shield Auto-Refund on Elimination!
  getShieldCharges() {
    return Math.max(0, Number(localStorage.getItem("zh_bounty_shield_charges") || 0));
  },
  addShieldCharges(count = 3) {
    const next = this.getShieldCharges() + count;
    localStorage.setItem("zh_bounty_shield_charges", String(next));
    return next;
  },
  checkDefeatModalForShieldRefund() {
    const resultModal = document.getElementById("resultModal");
    const resultWord = document.getElementById("resultWord");
    if (!resultModal || resultModal.classList.contains("hidden") || !resultWord) return;
    if (resultModal.dataset.shieldChecked === "true") return;

    const text = resultWord.textContent.trim().toUpperCase();
    if ((text === "ELIMINATED" || text === "DEFEAT") && this.getShieldCharges() > 0) {
      resultModal.dataset.shieldChecked = "true";
      const rem = this.getShieldCharges() - 1;
      localStorage.setItem("zh_bounty_shield_charges", String(rem));
      this.addTokens(1000);
      window.ZHNotify?.showTopNotification({
        senderHandle: "SYSTEM",
        senderName: "🛡️ BOUNTY LOSS SHIELD ACTIVATED",
        text: `+1,000 Entry Tokens refunded to your wallet! (${rem} Shields left)`
      });
    }
  },

  getEquipped() {
    try { return JSON.parse(localStorage.getItem("zh_equipped_cosmetics") || "{}"); } catch { return {}; }
  },
  equipItem(category, itemId) {
    const eq = this.getEquipped();
    eq[category] = itemId;
    localStorage.setItem("zh_equipped_cosmetics", JSON.stringify(eq));
    this.applyEquippedCosmetics();
  },
  unequipCategory(category) {
    const eq = this.getEquipped();
    delete eq[category];
    localStorage.setItem("zh_equipped_cosmetics", JSON.stringify(eq));
    this.applyEquippedCosmetics();
  },
  toggleEquipItem(category, itemId) {
    const eq = this.getEquipped();
    if (eq[category] === itemId) {
      delete eq[category];
      localStorage.setItem("zh_equipped_cosmetics", JSON.stringify(eq));
      this.applyEquippedCosmetics();
      return false;
    } else {
      eq[category] = itemId;
      localStorage.setItem("zh_equipped_cosmetics", JSON.stringify(eq));
      this.applyEquippedCosmetics();
      return true;
    }
  },

  applyEquippedCosmetics() {
    const eq = this.getEquipped();
    const isVip = this.isVIP();

    const avatarContainers = document.querySelectorAll("#avatarMini, #miniAvatar, .player-side .profile-avatar, #instaAvatarCircle, .you-card .roster-avatar");
    const frameMap = {
      "frame_vip_3d_gold": "cosmetic-frame-vip",
      "frame_hexagon": "cosmetic-frame-hexagon",
      "frame_squircle": "cosmetic-frame-squircle",
      "frame_dual_halo": "cosmetic-frame-dual-halo",
      "frame_biohazard": "cosmetic-frame-biohazard",
      "frame_cyber": "cosmetic-frame-cyber"
    };

    avatarContainers.forEach(el => {
      Object.values(frameMap).forEach(cls => el.classList.remove(cls));
      const chosenFrame = eq["AVATAR FRAME"];
      if (chosenFrame && frameMap[chosenFrame]) {
        el.classList.add(frameMap[chosenFrame]);
      } else if (isVip) {
        el.classList.add("cosmetic-frame-vip");
      }

      const existingPin = el.querySelector(".zh-avatar-tick-pin");
      if (isVip) {
        if (!existingPin && el.id !== "instaAvatarCircle") {
          el.insertAdjacentHTML("beforeend", window.ZHIcons.renderVerifiedTickHTML("zh-avatar-tick-pin"));
        }
      } else if (existingPin) {
        existingPin.remove();
      }
    });

    const nameMap = {
      "nameplate_royal_gold": "cosmetic-name-royal-gold",
      "nameplate_cyber_neon": "cosmetic-name-cyber-neon",
      "nameplate_toxic_venom": "cosmetic-name-toxic-venom",
      "nameplate_blood_inferno": "cosmetic-name-blood-inferno",
      "nameplate_frost_diamond": "cosmetic-name-frost-diamond"
    };
    const nameEls = document.querySelectorAll("#homeProfileName, #miniName, #playerName, #profileDisplayName, .you-card .roster-info strong");
    nameEls.forEach(el => {
      Object.values(nameMap).forEach(cls => el.classList.remove(cls));
      const chosenNameplate = eq["NAMEPLATE"];
      if (chosenNameplate && nameMap[chosenNameplate]) {
        el.classList.add(nameMap[chosenNameplate]);
      }

      const existingInlineTick = el.querySelector(".zh-inline-vip-tick");
      if (isVip) {
        if (!existingInlineTick && el.id !== "profileDisplayName") {
          el.insertAdjacentHTML("beforeend", window.ZHIcons.renderVerifiedTickHTML("zh-inline-vip-tick"));
        }
      } else if (existingInlineTick) {
        existingInlineTick.remove();
      }
    });

    const deckMap = {
      "deck_bloodmoon": "cosmetic-deck-bloodmoon",
      "deck_emerald": "cosmetic-deck-emerald",
      "deck_obsidian": "cosmetic-deck-obsidian",
      "deck_vintage_ivory": "cosmetic-deck-vintage-ivory"
    };
    document.querySelectorAll(".playing-card.card-back, .card-back").forEach(cb => {
      Object.values(deckMap).forEach(cls => cb.classList.remove(cls));
      const chosenDeck = eq["CARD SKIN"];
      if (chosenDeck && deckMap[chosenDeck]) {
        cb.classList.add(deckMap[chosenDeck]);
      }
    });

    const tableMap = {
      "table_crimson_velvet": "table-crimson-velvet",
      "table_obsidian_war": "table-obsidian-war"
    };
    document.querySelectorAll(".table-zone .table, #battleTableSurface").forEach(tb => {
      Object.values(tableMap).forEach(cls => tb.classList.remove(cls));
      const chosenTable = eq["TABLE THEME"];
      if (chosenTable && tableMap[chosenTable]) {
        tb.classList.add(tableMap[chosenTable]);
      }
    });
  },

  // Also records every purchase into Founder Revenue Ledger for CEO UPI Wallet!
  recordFounderRevenue(itemTitle, amountINR, sourceType = "STORE_INR") {
    try {
      const ledger = JSON.parse(localStorage.getItem("zh_founder_revenue_ledger") || "[]");
      ledger.unshift({
        id: `TXN_${Date.now()}`,
        title: itemTitle,
        amountINR: Number(amountINR || 0),
        source: sourceType,
        time: Date.now()
      });
      localStorage.setItem("zh_founder_revenue_ledger", JSON.stringify(ledger.slice(0, 200)));
      const curBal = Number(localStorage.getItem("zh_founder_wallet_inr") || 0);
      localStorage.setItem("zh_founder_wallet_inr", String((curBal + Number(amountINR || 0)).toFixed(2)));
    } catch {}
  },

  initiateINRCheckout(itemTitle, priceINR, onSuccessCallback, isVipPurchase = false) {
    window.ZHSound?.play("click");
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(12,16,14,0.9);backdrop-filter:blur(10px);z-index:9999999;display:grid;place-items:center;padding:18px;font-family:'DM Sans',sans-serif;";
    overlay.innerHTML = `
      <div style="background:#18221e;color:#f7f2e7;border:2px solid #d4aa36;border-radius:22px;padding:26px 22px;max-width:390px;width:100%;text-align:center;box-shadow:0 30px 70px rgba(0,0,0,0.65);">
        <span style="font-size:9px;font-weight:900;letter-spacing:2px;color:#d4aa36;">SECURE INR CHECKOUT • UPI / PLAY BILLING</span>
        <h3 style="font-family:'Bebas Neue',sans-serif;font-size:30px;letter-spacing:1px;margin:6px 0;">${itemTitle}</h3>
        <div style="font-family:'Oswald',sans-serif;font-size:34px;color:#4da88c;margin:8px 0 14px;">₹${priceINR}.00</div>
        <p style="font-size:11px;color:#9ca8a2;margin-bottom:16px;">Instant activation on your operative account.</p>
        <div style="display:flex;gap:10px;margin-top:16px;">
          <button type="button" id="zhCancelPayBtn" style="flex:1;padding:12px;border-radius:11px;border:1px solid rgba(255,255,255,0.2);background:transparent;color:#fff;font-weight:800;cursor:pointer;">CANCEL</button>
          <button type="button" id="zhConfirmPayBtn" style="flex:1.5;padding:12px;border-radius:11px;border:0;background:linear-gradient(135deg,#d4aa36,#b38618);color:#18201c;font-weight:900;cursor:pointer;">PAY ₹${priceINR} NOW →</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector("#zhCancelPayBtn").onclick = () => overlay.remove();
    overlay.querySelector("#zhConfirmPayBtn").onclick = () => {
      overlay.remove();
      this.recordFounderRevenue(itemTitle, priceINR, "STORE_PURCHASE");
      if (isVipPurchase) {
        window.ZHSound?.play("victory");
      } else {
        window.ZHSound?.play("unlock");
      }
      if (typeof onSuccessCallback === "function") onSuccessCallback();
    };
  }
};

/* =========================================================
   13. REAL THIRD-PARTY AD NETWORK ENGINE (ADSENSE + ADMOB)
========================================================= */
window.ZHAds = {
  checkPageTransitionBannerAd() {
    if (window.location.pathname.includes("-game/")) return;
    if (window.ZHWallet && window.ZHWallet.isAdFree()) return;

    let count = Number(sessionStorage.getItem("zh_page_switch_count") || 0) + 1;
    sessionStorage.setItem("zh_page_switch_count", String(count));

    if (count % 3 === 0) {
      this.showThirdPartySponsoredAd();
    }
  },

  async showThirdPartySponsoredAd() {
    window.ZHWallet?.recordFounderRevenue("3s Interstitial Ad Impression", 0.45, "AD_REVENUE");

    const admobPlugin = window.Capacitor?.Plugins?.AdMob || window.AdMob;
    if (admobPlugin && typeof admobPlugin.prepareInterstitial === "function") {
      try {
        await admobPlugin.prepareInterstitial({
          adId: window.ZH_CONFIG.ADMOB_INTERSTITIAL_ID,
          isTesting: false
        });
        await admobPlugin.showInterstitial();
        return;
      } catch (e) {}
    }

    if (document.getElementById("zhThirdPartyAdOverlay")) return;

    const sampleExternalSponsors = [
      {
        brand: "AMAZON PRIME GAMING",
        domain: "gaming.amazon.com",
        headline: "CLAIM FREE IN-GAME LOOT & PC GAMES",
        sub: "Try Amazon Prime Gaming free for 30 days. Instant delivery.",
        cta: "INSTALL / VISIT SPONSOR ↗",
        bg: "linear-gradient(135deg, #0f172a, #1e3a8a)"
      },
      {
        brand: "ROG GAMING PHONES",
        domain: "rog.asus.com",
        headline: "165Hz AMOLED • SNAPDRAGON 8 ELITE",
        sub: "Built for pro esports tournaments. Zero touch latency.",
        cta: "EXPLORE ROG SERIES ↗",
        bg: "linear-gradient(135deg, #18181b, #7f1d1d)"
      },
      {
        brand: "SWIGGY INSTAMART",
        domain: "swiggy.com",
        headline: "LATE NIGHT GAMING SNACKS IN 10 MINS",
        sub: "Flat ₹100 OFF + Free Delivery on your first 3 orders.",
        cta: "ORDER NOW ↗",
        bg: "linear-gradient(135deg, #431407, #c2410c)"
      }
    ];
    const ad = sampleExternalSponsors[Math.floor(Math.random() * sampleExternalSponsors.length)];

    const overlay = document.createElement("div");
    overlay.id = "zhThirdPartyAdOverlay";
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(10,14,12,0.85);backdrop-filter:blur(8px);z-index:9999998;display:grid;place-items:center;padding:16px;font-family:'DM Sans',sans-serif;";

    let remaining = 3;
    overlay.innerHTML = `
      <div style="position:relative;background:#ffffff;color:#111827;border-radius:20px;overflow:hidden;max-width:420px;width:100%;box-shadow:0 30px 70px rgba(0,0,0,0.65);border:1px solid #e5e7eb;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 14px;background:#f3f4f6;border-bottom:1px solid #e5e7eb;font-size:10px;font-weight:800;color:#4b5563;">
          <span>Ad • Google AdSense / AdMob Network</span>
          <button type="button" id="zhThirdPartyCloseBtn" disabled style="min-width:30px;height:26px;border-radius:13px;border:1px solid #d1d5db;background:#e5e7eb;color:#374151;font-family:'Oswald',sans-serif;font-size:11px;font-weight:800;padding:0 9px;cursor:not-allowed;">
            ${remaining}s
          </button>
        </div>

        <div style="padding:16px;">
          <ins class="adsbygoogle"
               style="display:block;width:100%;"
               data-ad-client="${window.ZH_CONFIG.ADSENSE_CLIENT_ID}"
               data-ad-slot="${window.ZH_CONFIG.ADSENSE_BANNER_SLOT_ID}"
               data-ad-format="auto"></ins>

          <div style="background:${ad.bg};color:#ffffff;border-radius:14px;padding:22px 18px;text-align:left;box-shadow:inset 0 0 30px rgba(0,0,0,0.3);">
            <span style="font-size:9px;font-weight:800;letter-spacing:1.4px;color:#fcd34d;display:block;margin-bottom:4px;">${ad.brand} • ${ad.domain}</span>
            <h3 style="font-family:'Bebas Neue',sans-serif;font-size:30px;letter-spacing:1px;line-height:1.05;margin:0 0 6px;">${ad.headline}</h3>
            <p style="font-size:12px;color:#e5e7eb;margin:0 0 14px;line-height:1.4;">${ad.sub}</p>
            <button type="button" id="zhExternalSponsorClickBtn" style="width:100%;padding:10px;border-radius:10px;border:0;background:#ffffff;color:#111827;font-family:'Oswald',sans-serif;font-size:12px;font-weight:900;letter-spacing:0.8px;cursor:pointer;">
              ${ad.cta}
            </button>
          </div>
        </div>

        <div style="padding:8px 14px;background:#f9fafb;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;font-size:10.5px;color:#6b7280;">
          <span>Sponsored Ad Unit</span>
          <a href="#" id="zhSubtleRemoveAdsLink" style="color:#2563eb;font-weight:800;text-decoration:none;">Remove Ads Today (₹10) ›</a>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}

    const closeBtn = overlay.querySelector("#zhThirdPartyCloseBtn");
    const iv = setInterval(() => {
      remaining--;
      if (remaining > 0) {
        closeBtn.textContent = `${remaining}s`;
      } else {
        clearInterval(iv);
        closeBtn.disabled = false;
        closeBtn.textContent = "✕";
        closeBtn.style.cursor = "pointer";
        closeBtn.style.background = "#111827";
        closeBtn.style.color = "#ffffff";
      }
    }, 1000);

    closeBtn.onclick = () => {
      if (remaining <= 0) overlay.remove();
    };

    overlay.querySelector("#zhExternalSponsorClickBtn").onclick = () => {
      window.ZHWallet?.recordFounderRevenue("Sponsored Ad Click (CPC)", 2.50, "AD_REVENUE");
      overlay.remove();
    };

    overlay.querySelector("#zhSubtleRemoveAdsLink").onclick = (e) => {
      e.preventDefault();
      overlay.remove();
      window.ZHWallet.initiateINRCheckout("TODAY AD-FREE PASS (TILL MIDNIGHT)", 10, () => {
        window.ZHWallet.activateDailyAdFree();
      }, false);
    };
  },

  async watchRewardedAd(reasonLabel, onCompleteCallback) {
    window.ZHWallet?.recordFounderRevenue("Rewarded Video Ad View", 1.80, "AD_REVENUE");

    const admobPlugin = window.Capacitor?.Plugins?.AdMob || window.AdMob;
    if (admobPlugin && typeof admobPlugin.prepareRewardVideoAd === "function") {
      try {
        await admobPlugin.prepareRewardVideoAd({
          adId: window.ZH_CONFIG.ADMOB_REWARDED_ID,
          isTesting: false
        });
        const rewardItem = await admobPlugin.showRewardVideoAd();
        if (rewardItem) {
          window.ZHSound?.play("unlock");
          if (typeof onCompleteCallback === "function") onCompleteCallback();
        }
        return;
      } catch (err) {}
    }

    if (typeof window.adBreak === "function") {
      window.adBreak({
        type: "reward",
        name: "bounty_reward_drop",
        beforeReward: (showAdFn) => showAdFn(),
        adViewed: () => {
          window.ZHSound?.play("unlock");
          if (typeof onCompleteCallback === "function") onCompleteCallback();
        },
        adDismissed: () => {}
      });
      return;
    }

    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(12,15,14,0.95);z-index:9999999;display:grid;place-items:center;padding:20px;color:#fff;font-family:'DM Sans',sans-serif;";
    let sec = 5;
    overlay.innerHTML = `
      <div style="background:#18221e;border:2px solid #d4aa36;border-radius:22px;padding:28px;max-width:400px;width:100%;text-align:center;box-shadow:0 30px 70px rgba(0,0,0,0.65);">
        <span style="font-size:9px;font-weight:900;letter-spacing:2px;color:#f5c85b;">GOOGLE ADMOB REWARDED VIDEO</span>
        <h3 style="font-family:'Oswald',sans-serif;font-size:22px;margin:8px 0 6px;">${reasonLabel || "SPONSORED REWARD"}</h3>
        <div style="width:74px;height:74px;border-radius:50%;border:3px solid #f5c85b;display:grid;place-items:center;margin:0 auto 18px;font-family:'Bebas Neue',sans-serif;font-size:34px;" id="zhAdTimerNum">${sec}s</div>
        <button id="zhAdClaimBtn" disabled style="width:100%;padding:13px;border-radius:12px;border:0;background:#3a443f;color:#fff;font-weight:800;cursor:not-allowed;">PLAYING SPONSOR VIDEO (${sec}s)...</button>
      </div>
    `;
    document.body.appendChild(overlay);
    const numEl = overlay.querySelector("#zhAdTimerNum");
    const btnEl = overlay.querySelector("#zhAdClaimBtn");
    const iv = setInterval(() => {
      sec--;
      if (sec > 0) {
        numEl.textContent = `${sec}s`;
        btnEl.textContent = `PLAYING SPONSOR VIDEO (${sec}s)...`;
      } else {
        clearInterval(iv);
        numEl.textContent = "✓";
        btnEl.disabled = false;
        btnEl.style.background = "#2e7d5b";
        btnEl.style.cursor = "pointer";
        btnEl.textContent = "CLAIM REWARD NOW →";
      }
    }, 1000);
    btnEl.onclick = () => {
      overlay.remove();
      window.ZHSound?.play("unlock");
      if (typeof onCompleteCallback === "function") onCompleteCallback();
    };
  }
};