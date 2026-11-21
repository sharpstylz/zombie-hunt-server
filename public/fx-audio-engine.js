/* =========================================================
   ZOMBIE HUNT — 60FPS LIQUID COLOR-MORPHING MESH & BASS AUDIO
   Location: public/fx-audio-engine.js
========================================================= */

(function () {
  "use strict";

  /* ---------------------------------------------------------
     1. TRUE 60-FPS LIQUID MESH GRADIENT ENGINE (CANVAS)
        - Cream Base (#efe5ce)
        - Smoothly Drifting & Color-Morphing Gradient Patches:
          * Patch 1: Golden Yellow -> Warm Orange -> Crimson Red
          * Patch 2: Mint Green -> Ocean Teal -> Royal Sky Blue
          * Patch 3: Soft Amber -> Coral Peach -> Emerald
  --------------------------------------------------------- */
  class LiquidGradientCanvas {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.startTime = performance.now();
      this.running = false;

      // Curated RGB Color Palettes (Never turns muddy!)
      this.blobs = [
        {
          // Blob 1: Starts Top-Right, wanders across Center & Right
          // Yellow -> Warm Orange -> Crimson Red -> Marigold
          colors: [
            [248, 194, 48],  // Golden Yellow
            [250, 128, 41],  // Warm Tangerine Orange
            [232, 65, 65],   // Soft Crimson Red
            [245, 166, 35]   // Rich Amber
          ],
          cycleDuration: 18000, // 18s full color cycle
          centerX: 0.76, centerY: 0.24,
          orbitX: 0.22, orbitY: 0.25,
          speedX: 0.00045, speedY: 0.00035,
          phase: 0,
          radiusFactor: 0.52,
          alpha: 0.52
        },
        {
          // Blob 2: Starts Bottom-Left, wanders across Left & Center
          // Emerald Green -> Ocean Teal -> Sky Blue -> Mint
          colors: [
            [38, 194, 129],  // Lush Mint Green
            [15, 185, 177],  // Ocean Teal
            [56, 138, 240],  // Royal Sky Blue
            [72, 201, 142]   // Soft Jade
          ],
          cycleDuration: 21000,
          centerX: 0.22, centerY: 0.76,
          orbitX: 0.24, orbitY: 0.22,
          speedX: 0.00038, speedY: 0.00048,
          phase: 2.1,
          radiusFactor: 0.54,
          alpha: 0.46
        },
        {
          // Blob 3: Drifts diagonally across the middle & bottom-right
          // Sky Blue -> Warm Sunset Orange -> Rose Red -> Teal
          colors: [
            [74, 175, 235],  // Soft Sky Blue
            [247, 159, 31],  // Sunset Gold
            [235, 77, 75],   // Warm Rose Red
            [43, 203, 186]   // Turquoise
          ],
          cycleDuration: 24000,
          centerX: 0.65, centerY: 0.72,
          orbitX: 0.25, orbitY: 0.24,
          speedX: 0.00052, speedY: 0.00039,
          phase: 4.2,
          radiusFactor: 0.46,
          alpha: 0.38
        }
      ];
    }

    init() {
      if (document.getElementById("zhLiquidGradientCanvas")) return;

      // Hide old static CSS orbs so they don't muddy the canvas
      document.querySelectorAll(".bg-orb").forEach(el => {
        el.style.display = "none";
      });

      this.canvas = document.createElement("canvas");
      this.canvas.id = "zhLiquidGradientCanvas";
      this.canvas.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:1;display:block;";
      document.body.prepend(this.canvas);
      this.ctx = this.canvas.getContext("2d");

      this.resize();
      window.addEventListener("resize", () => this.resize());

      this.running = true;
      requestAnimationFrame((ts) => this.render(ts));
    }

    resize() {
      if (!this.canvas) return;
      // Render at half resolution for ultra-silky natural blur & 60FPS speed
      this.width = Math.max(320, Math.floor(window.innerWidth * 0.5));
      this.height = Math.max(320, Math.floor(window.innerHeight * 0.5));
      this.canvas.width = this.width;
      this.canvas.height = this.height;
    }

    // Cosine-eased RGB interpolation between color stops
    getInterpolatedRGB(colors, elapsed, duration) {
      const total = colors.length;
      const progress = ((elapsed % duration) / duration) * total;
      const indexA = Math.floor(progress) % total;
      const indexB = (indexA + 1) % total;
      const rawT = progress - Math.floor(progress);
      // Smooth cosine easing so color transitions feel like liquid
      const t = 0.5 - 0.5 * Math.cos(rawT * Math.PI);

      const cA = colors[indexA];
      const cB = colors[indexB];
      const r = Math.round(cA[0] + (cB[0] - cA[0]) * t);
      const g = Math.round(cA[1] + (cB[1] - cA[1]) * t);
      const b = Math.round(cA[2] + (cB[2] - cA[2]) * t);
      return { r, g, b };
    }

    render(timestamp) {
      if (!this.running || !this.ctx) return;
      const elapsed = timestamp - this.startTime;
      const w = this.width;
      const h = this.height;
      const maxDim = Math.max(w, h);

      // 1. Paint Warm Vintage Cream Base
      this.ctx.globalCompositeOperation = "source-over";
      this.ctx.fillStyle = "#efe5ce";
      this.ctx.fillRect(0, 0, w, h);

      // 2. Paint Drifting & Color-Shifting Gradient Patches
      for (let i = 0; i < this.blobs.length; i++) {
        const b = this.blobs[i];
        const rgb = this.getInterpolatedRGB(b.colors, elapsed, b.cycleDuration);

        // Organic Figure-8 wandering motion across the screen
        const x = (b.centerX + Math.sin(elapsed * b.speedX + b.phase) * b.orbitX + Math.cos(elapsed * b.speedX * 0.55) * 0.06) * w;
        const y = (b.centerY + Math.cos(elapsed * b.speedY + b.phase) * b.orbitY + Math.sin(elapsed * b.speedY * 0.65) * 0.06) * h;

        // Subtle breathing radius & opacity
        const pulse = 1 + Math.sin(elapsed * 0.0007 + b.phase) * 0.12;
        const radius = maxDim * b.radiusFactor * pulse;
        const alpha = b.alpha + Math.sin(elapsed * 0.0006 + b.phase) * 0.06;

        const grad = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
        grad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha.toFixed(3)})`);
        grad.addColorStop(0.45, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(alpha * 0.52).toFixed(3)})`);
        grad.addColorStop(0.78, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${(alpha * 0.15).toFixed(3)})`);
        grad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);

        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, w, h);
      }

      requestAnimationFrame((ts) => this.render(ts));
    }
  }

  /* ---------------------------------------------------------
     2. 3D INTERACTIVE CARD TILT & SCREEN IMPACT CONTROLLER
  --------------------------------------------------------- */
  const VisualFX = {
    liquidCanvas: new LiquidGradientCanvas(),
    initialized: false,

    init() {
      if (this.initialized) return;
      this.initialized = true;
      this.liquidCanvas.init();
      this.bind3DTilt();
    },

    bind3DTilt() {
      document.addEventListener("mousemove", (e) => {
        const card = e.target.closest(".mode-card, .tier-option-card, .selectable-card, .playing-card, .scene-card");
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -6.5;
        const rotateY = ((x - centerX) / centerX) * 6.5;
        card.style.transform = `perspective(800px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px)`;
      });

      document.addEventListener("mouseout", (e) => {
        const card = e.target.closest(".mode-card, .tier-option-card, .selectable-card, .playing-card, .scene-card");
        if (card) card.style.transform = "";
      });
    },

    screenFlashAndShake(type = "shotgun") {
      const flash = document.createElement("div");
      const flashColors = {
        shotgun: "radial-gradient(circle, rgba(220,38,38,0.45) 0%, rgba(0,0,0,0) 72%)",
        zombie: "radial-gradient(circle, rgba(22,163,74,0.45) 0%, rgba(0,0,0,0) 72%)",
        vaccine: "radial-gradient(circle, rgba(8,145,178,0.42) 0%, rgba(0,0,0,0) 72%)"
      };
      flash.style.cssText = `position:fixed;inset:0;z-index:99998;pointer-events:none;background:${flashColors[type] || flashColors.shotgun};animation:zhFlashFade 0.55s ease-out forwards;`;
      document.body.appendChild(flash);
      setTimeout(() => flash.remove(), 560);

      document.body.classList.remove("zh-screen-shake");
      void document.body.offsetWidth;
      document.body.classList.add("zh-screen-shake");
      setTimeout(() => document.body.classList.remove("zh-screen-shake"), 480);
    }
  };

  /* ---------------------------------------------------------
     3. HEAVY TACTILE SUB-BASS & CINEMATIC AUDIO ENGINE
  --------------------------------------------------------- */
  const SoundEngine = {
    ctx: null,
    reverbNode: null,
    muted: localStorage.getItem("zh_sound_muted") === "true",
    bgmAudio: null,
    bgmPlaying: false,
    bgmInterval: null,

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
          this.reverbNode = this.createImpulseReverb(1.4, 2.8);
        }
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume();
      }
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
      } catch {
        return null;
      }
    },

    toggleMute() {
      this.muted = !this.muted;
      localStorage.setItem("zh_sound_muted", this.muted ? "true" : "false");
      if (this.muted) this.stopBGM();
      else this.startBGM();
      return this.muted;
    },

    startBGM() {
      if (this.muted || this.bgmPlaying) return;
      this.bgmPlaying = true;

      if (!this.bgmAudio) {
        const prefix = window.location.pathname.includes("/team-room/")
          ? "../../../audio/"
          : window.location.pathname.includes("/bot-game/") || window.location.pathname.includes("/online-game/")
          ? "../../audio/"
          : window.location.pathname.includes("-lobby/")
          ? "../audio/"
          : "audio/";

        this.bgmAudio = new Audio(prefix + "bgm.mp3");
        this.bgmAudio.loop = true;
        this.bgmAudio.volume = 0.32;
      }

      this.bgmAudio.play().catch(() => {
        this.startCinematicHeartbeatPad();
      });
    },

    startCinematicHeartbeatPad() {
      if (this.bgmInterval) clearInterval(this.bgmInterval);
      const triggerCycle = () => {
        if (this.muted || !this.bgmPlaying) return;
        try {
          this.init();
          if (!this.ctx) return;
          const now = this.ctx.currentTime;

          [0, 0.34].forEach((offset, idx) => {
            const thump = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            thump.type = "sine";
            thump.frequency.setValueAtTime(idx === 0 ? 68 : 54, now + offset);
            thump.frequency.exponentialRampToValueAtTime(28, now + offset + 0.26);

            gain.gain.setValueAtTime(0.001, now + offset);
            gain.gain.linearRampToValueAtTime(idx === 0 ? 0.16 : 0.11, now + offset + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.28);

            thump.connect(gain);
            gain.connect(this.ctx.destination);
            thump.start(now + offset);
            thump.stop(now + offset + 0.3);
          });
        } catch (e) {}
      };
      triggerCycle();
      this.bgmInterval = setInterval(triggerCycle, 3200);
    },

    stopBGM() {
      this.bgmPlaying = false;
      if (this.bgmAudio) this.bgmAudio.pause();
      if (this.bgmInterval) {
        clearInterval(this.bgmInterval);
        this.bgmInterval = null;
      }
    },

    play(type) {
      if (this.muted) return;
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        if (type === "click" || type === "card") {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(118, now);
          osc.frequency.exponentialRampToValueAtTime(36, now + 0.095);
          gain.gain.setValueAtTime(0.38, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.105);
        } else if (type === "type") {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(95, now);
          osc.frequency.exponentialRampToValueAtTime(42, now + 0.035);
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

          const clank = this.ctx.createOscillator();
          const clankGain = this.ctx.createGain();
          clank.type = "sawtooth";
          const filter = this.ctx.createBiquadFilter();
          filter.type = "bandpass";
          filter.frequency.setValueAtTime(340, now + 0.06);
          clank.frequency.setValueAtTime(190, now + 0.06);
          clank.frequency.exponentialRampToValueAtTime(65, now + 0.18);
          clankGain.gain.setValueAtTime(0.28, now + 0.06);
          clankGain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
          clank.connect(filter);
          filter.connect(clankGain);
          clankGain.connect(this.ctx.destination);
          clank.start(now + 0.06);
          clank.stop(now + 0.2);
        } else if (type === "shotgun") {
          VisualFX.screenFlashAndShake("shotgun");
          const boom = this.ctx.createOscillator();
          const boomGain = this.ctx.createGain();
          boom.type = "sine";
          boom.frequency.setValueAtTime(160, now);
          boom.frequency.exponentialRampToValueAtTime(24, now + 0.55);
          boomGain.gain.setValueAtTime(0.95, now);
          boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.58);
          boom.connect(boomGain);
          boomGain.connect(this.ctx.destination);
          boom.start(now);
          boom.stop(now + 0.6);

          const duration = 0.65;
          const bufLen = Math.floor(this.ctx.sampleRate * duration);
          const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
          const data = buf.getChannelData(0);
          for (let i = 0; i < bufLen; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 1.5);
          }
          const noise = this.ctx.createBufferSource();
          noise.buffer = buf;
          const lowpass = this.ctx.createBiquadFilter();
          lowpass.type = "lowpass";
          lowpass.frequency.setValueAtTime(950, now);
          lowpass.frequency.exponentialRampToValueAtTime(110, now + duration);

          const nGain = this.ctx.createGain();
          nGain.gain.setValueAtTime(0.8, now);
          nGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

          noise.connect(lowpass);
          lowpass.connect(nGain);
          nGain.connect(this.ctx.destination);
          if (this.reverbNode) nGain.connect(this.reverbNode);
          noise.start(now);
        } else if (type === "zombie") {
          VisualFX.screenFlashAndShake("zombie");
          [52, 58, 39].forEach((freq) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.linearRampToValueAtTime(freq * 0.62, now + 0.75);

            filter.type = "lowpass";
            filter.frequency.setValueAtTime(260, now);

            gain.gain.setValueAtTime(0.32, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.78);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            if (this.reverbNode) gain.connect(this.reverbNode);
            osc.start(now);
            osc.stop(now + 0.8);
          });
        } else if (type === "vaccine") {
          VisualFX.screenFlashAndShake("vaccine");
          [220, 277.18, 329.63, 440].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, now + idx * 0.06);
            gain.gain.setValueAtTime(0.24, now + idx * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.55);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            if (this.reverbNode) gain.connect(this.reverbNode);
            osc.start(now + idx * 0.06);
            osc.stop(now + idx * 0.06 + 0.58);
          });
        } else if (type === "victory") {
          const sub = this.ctx.createOscillator();
          const sGain = this.ctx.createGain();
          sub.type = "sine";
          sub.frequency.setValueAtTime(110, now);
          sub.frequency.exponentialRampToValueAtTime(35, now + 0.6);
          sGain.gain.setValueAtTime(0.7, now);
          sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
          sub.connect(sGain);
          sGain.connect(this.ctx.destination);
          sub.start(now);
          sub.stop(now + 0.66);

          [220, 277.18, 329.63, 440].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(freq, now + idx * 0.1);
            gain.gain.setValueAtTime(0.26, now + idx * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.75);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            if (this.reverbNode) gain.connect(this.reverbNode);
            osc.start(now + idx * 0.1);
            osc.stop(now + idx * 0.1 + 0.78);
          });
        }
      } catch (e) {}
    }
  };

  window.ZHFX = VisualFX;
  window.ZHSound = SoundEngine;

  // CRITICAL FIX: Run immediately if DOM is already loaded, otherwise wait for DOMContentLoaded!
  function bootFX() {
    VisualFX.init();
    document.body.addEventListener("click", () => {
      if (!SoundEngine.muted && !SoundEngine.bgmPlaying) {
        SoundEngine.startBGM();
      }
    }, { once: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootFX);
  } else {
    bootFX();
  }
})();