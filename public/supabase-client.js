/* =========================================================
   ZOMBIE HUNT — SUPABASE CLOUD CONNECTOR (ULTIMATE FIX)
   Location: public/supabase-client.js
========================================================= */

(function () {
  "use strict";

  // 1. Initialize Supabase Client
  const supabaseUrl = 'https://skhtzmswdspjpeotvyty.supabase.co';
  const supabaseKey = 'sb_publishable_jM84bkHsQtk_tzQxqWQmNQ_6maXBcc5';
  const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

  window.ZHSupabase = {
    client: supabase,
    
    // Cloud Sync Function
    async syncLocalDataToCloud() {
      if (!window.ZHStats) return;
      const me = window.ZHStats.getLocalPlayerStats();
      await supabase.from('players').upsert({
        handle: me.handle, display_name: me.name, avatar: me.avatar, bio: me.bio,
        tokens: me.tokens, cp: me.cp, hx: me.hx, is_vip: me.isVIP
      });
    },
    
    // REAL LOGOUT FUNCTION
    async logout() {
       window.ZHSound?.play("click");
       await supabase.auth.signOut();
       localStorage.removeItem("zh_google_linked"); // Delete dummy memory completely
       alert("REAL ACCOUNT UNLINKED SUCCESSFULLY!");
       window.location.reload();
    }
  };

  document.addEventListener("DOMContentLoaded", async () => {
    // Check if the user is REALLY logged in to Cloud
    const { data: { session } } = await supabase.auth.getSession();
    
    // 🔴 1. ASSASSINATE OLD DUMMY EVENTS!
    // यह कोड पुराने डमी क्लिक को मार देगा ताकि बैकग्राउंड में फालतू स्क्रीन न खुले
    document.querySelectorAll("#googleLinkBtn, #lobbyGoogleLoginBtn").forEach(oldBtn => {
        const newBtn = oldBtn.cloneNode(true);
        oldBtn.parentNode.replaceChild(newBtn, oldBtn);
    });

    // 2. SETUP CLEAN BUTTONS & INJECT LOGOUT AUTOMATICALLY
    const googleBtns = document.querySelectorAll("#googleLinkBtn, #lobbyGoogleLoginBtn");

    googleBtns.forEach(btn => {
        // बिना HTML एडिट किए, जावास्क्रिप्ट से LOGOUT बटन बनाना
        let logoutBtn = document.createElement("button");
        logoutBtn.type = "button";
        logoutBtn.className = "zh-dynamic-logout";
        logoutBtn.innerHTML = "LOGOUT / UNLINK ACCOUNT";
        logoutBtn.style.cssText = "width:100%;padding:10px;border-radius:10px;border:1.5px solid #ef4444;background:#fef2f2;color:#dc2626;font-family:'Oswald',sans-serif;font-size:11.5px;font-weight:700;cursor:pointer;margin-top:8px;display:none;";
        logoutBtn.onclick = window.ZHSupabase.logout;
        
        // बटन को गूगल बटन के ठीक नीचे फिट करना
        btn.parentNode.insertBefore(logoutBtn, btn.nextSibling);
        
        // Attach Real Cloud Login
        btn.onclick = async (e) => {
            e.preventDefault();
            window.ZHSound?.play("click");
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: window.location.origin + window.location.pathname }
            });
            if (error) alert("Auth Error: " + error.message);
        };
    });

    // 3. ENFORCE REAL STATUS (LOCK OR UNLOCK)
    if (session) {
        // User is REALLY logged in
        localStorage.setItem("zh_google_linked", "true"); 
        googleBtns.forEach(btn => {
            btn.style.background = "#e5e7eb";
            btn.style.color = "#374151";
            if(btn.querySelector("span")) btn.querySelector("span").innerText = "✓ LINKED TO REAL CLOUD";
            else btn.innerText = "✓ LINKED TO REAL CLOUD";
            btn.disabled = true; // Prevent double clicking
        });
        document.querySelectorAll(".zh-dynamic-logout").forEach(b => b.style.display = "block");
        window.ZHSupabase.syncLocalDataToCloud();
    } else {
        // 🔴 NOT LOGGED IN - FORCE LOCK EVERYTHING
        localStorage.removeItem("zh_google_linked");
        googleBtns.forEach(btn => {
            if(btn.querySelector("span")) btn.querySelector("span").innerText = "SIGN IN WITH GOOGLE (UNLOCK 17 AVATARS)";
            else btn.innerText = "SIGN IN WITH GOOGLE (UNLOCK 17 AVATARS)";
            btn.disabled = false;
        });
        document.querySelectorAll(".zh-dynamic-logout").forEach(b => b.style.display = "none");
        
        // 🔴 Force Avatars to Lock Visually
        setTimeout(() => {
            document.querySelectorAll(".avatar-option").forEach((opt, index) => {
                if (index >= 3) {
                    opt.classList.add("locked");
                    let lockIcon = opt.querySelector(".lock-overlay");
                    if (lockIcon) lockIcon.style.display = "flex";
                }
            });
        }, 300); // 300ms delay to override any old code
    }

    // Auto-Sync Events
    window.addEventListener("zh_wallet_updated", () => window.ZHSupabase.syncLocalDataToCloud());
    window.addEventListener("zh_profile_changed", () => window.ZHSupabase.syncLocalDataToCloud());
  });

})();