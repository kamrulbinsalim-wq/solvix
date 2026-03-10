// ══════════════════════════════════════════════════════
//  SOLVIX — NOTIFICATIONS + PWA INSTALL
//  notifications.js
// ══════════════════════════════════════════════════════

const VAPID_KEY = 'BD4GfVND0yPwtjxC4y0LHx48LRu7HK-XbtgRdSEhgaaxg2M-2T1Se2kxnYc3RyNpvk35KeMQk_FH1_iM0eDQX8c';

let _fcmMessaging    = null;
let _fcmToken        = null;
let _pwaInstallPrompt = null;
let _pwaInstalled    = false;

// PWA install prompt আগেভাগে ধরে রাখো
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _pwaInstallPrompt = e;
});
window.addEventListener('appinstalled', () => {
  _pwaInstalled     = true;
  _pwaInstallPrompt = null;
});

// ══════════════════════════════════════════════════════
//  PERMISSION GATE — splash শেষ হওয়ার পরই চলবে
// ══════════════════════════════════════════════════════
async function runPermissionGate() {
  // PWA standalone mode = already installed, গেট দরকার নেই
  if (window.matchMedia('(display-mode: standalone)').matches) return;

  // সব permission আগেই দেওয়া থাকলে গেট দেখাবো না
  const notifOk  = Notification.permission === 'granted';
  const micOk    = localStorage.getItem('perm_mic')    === 'granted';
  const cameraOk = localStorage.getItem('perm_camera') === 'granted';
  if (notifOk && micOk && cameraOk) {
    _initFcm(); // শুধু FCM চালু করো
    return;
  }

  await _showPermissionGate();
}

// ── Permission Gate UI ──
async function _showPermissionGate() {
  const overlay = document.createElement('div');
  overlay.id = 'perm-gate';
  overlay.innerHTML = `
    <div class="pg-box">
      <div class="pg-logo">
        <svg width="38" height="38" viewBox="0 0 24 24" fill="#00e5b8">
          <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
        </svg>
      </div>
      <div class="pg-title">Solvix ব্যবহার করতে<br>অনুমতি দিন</div>
      <div class="pg-sub">সেরা অভিজ্ঞতার জন্য নিচের অনুমতিগুলো প্রয়োজন</div>
      <div class="pg-steps" id="pgSteps"></div>
      <div class="pg-progress"><div class="pg-progress-bar" id="pgProgressBar"></div></div>
      <button class="pg-btn" id="pgBtn" onclick="pgNextStep()">শুরু করুন →</button>
      <div class="pg-skip" id="pgSkip"></div>
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));

  window._pgSteps = [
    {
      icon: '🔔', title: 'Notification চালু করুন',
      desc: 'মেসেজ ও কল আসলে সাথে সাথে জানতে পারবেন',
      action: _askNotificationPermission, required: true,
    },
    {
      icon: '🎤', title: 'Microphone অনুমতি দিন',
      desc: 'ভয়েস কল করতে মাইক্রোফোন দরকার',
      action: _askMicPermission, required: true,
    },
    {
      icon: '📷', title: 'Camera অনুমতি দিন',
      desc: 'QR স্ক্যান ও প্রোফাইল ফটো তুলতে ক্যামেরা দরকার',
      action: _askCameraPermission, required: false,
    },
  ];
  window._pgCurrent = 0;
  _pgRender();

  // প্রথম ক্লিকে সরাসরি permission চাওয়া শুরু হবে
  document.getElementById('pgBtn').onclick = _pgAskCurrent;
}

function _pgRender() {
  const total   = window._pgSteps.length;
  const current = window._pgCurrent;
  const pct     = Math.round((current / total) * 100);

  const bar = document.getElementById('pgProgressBar');
  if (bar) bar.style.width = pct + '%';

  const stepsEl = document.getElementById('pgSteps');
  if (stepsEl) {
    stepsEl.innerHTML = window._pgSteps.map((s, i) => `
      <div class="pg-step ${i < current ? 'done' : i === current ? 'active' : ''}">
        <div class="pg-step-ic">${i < current ? '✅' : s.icon}</div>
        <div class="pg-step-text">
          <div class="pg-step-title">${s.title}</div>
          <div class="pg-step-desc">${s.desc}</div>
        </div>
        ${i < current ? '<div class="pg-step-check">✓</div>' : ''}
      </div>
    `).join('');
  }

  const step = window._pgSteps[current];
  const btn  = document.getElementById('pgBtn');
  const skip = document.getElementById('pgSkip');

  if (btn) btn.textContent = step.icon + ' ' + step.title;
  if (skip) {
    skip.innerHTML = !step.required
      ? `<button onclick="pgSkipStep()">এটা এখন না</button>` : '';
  }
}

async function _pgAskCurrent() {
  const step = window._pgSteps[window._pgCurrent];
  const btn  = document.getElementById('pgBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'অপেক্ষা করুন...'; }

  const result = await step.action();

  if (result === 'granted') {
    window._pgCurrent++;
    if (window._pgCurrent >= window._pgSteps.length) {
      _pgDone();
    } else {
      if (btn) btn.disabled = false;
      _pgRender();
      document.getElementById('pgBtn').onclick = _pgAskCurrent;
    }
  } else if (result === 'denied' && step.required) {
    _pgShowDenied(step);
  } else {
    // Optional deny বা dismissed — পরের step এ যাও
    window._pgCurrent++;
    if (window._pgCurrent >= window._pgSteps.length) {
      _pgDone();
    } else {
      if (btn) btn.disabled = false;
      _pgRender();
      document.getElementById('pgBtn').onclick = _pgAskCurrent;
    }
  }
}

async function pgNextStep() { await _pgAskCurrent(); }

async function pgSkipStep() {
  window._pgCurrent++;
  if (window._pgCurrent >= window._pgSteps.length) { _pgDone(); return; }
  _pgRender();
  document.getElementById('pgBtn').onclick = _pgAskCurrent;
}

function _pgDone() {
  const overlay = document.getElementById('perm-gate');
  if (overlay) { overlay.classList.add('done'); setTimeout(() => overlay.remove(), 500); }
  _initFcm();
}

// Required permission deny হলে — PWA install screen
function _pgShowDenied(step) {
  const box = document.querySelector('.pg-box');
  if (!box) return;

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);

  box.innerHTML = `
    <div class="pg-logo" style="background:rgba(255,68,102,0.1);border-color:rgba(255,68,102,0.2)">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round">
        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
    </div>
    <div class="pg-title" style="font-size:18px">অনুমতি ছাড়া<br>ব্যবহার সম্ভব নয়</div>
    <div class="pg-sub">
      <b style="color:#ef4444">${step.icon} ${step.title.replace(' চালু করুন','').replace(' অনুমতি দিন','')}</b>
      অনুমতি না দিলে Solvix সঠিকভাবে কাজ করবে না।<br><br>
      অ্যাপ হিসেবে Install করলে সব permission সহজে পাওয়া যাবে।
    </div>

    ${_pwaInstallPrompt ? `
      <div class="pg-install-card">
        <div class="pic-icon">📲</div>
        <div class="pic-text">
          <div class="pic-title">Solvix অ্যাপ Install করুন</div>
          <div class="pic-sub">Home Screen-এ যোগ করুন — কোনো App Store লাগবে না</div>
        </div>
      </div>
      <button class="pg-btn" id="pgInstallBtn" onclick="_pgTriggerInstall()">⬇️ এখনই Install করুন</button>
    ` : isIos ? `
      <div class="pg-install-card" style="flex-direction:column;align-items:flex-start;gap:8px">
        <div style="font-size:13px;color:rgba(255,255,255,0.6);line-height:1.9">
          📱 <b style="color:#00e5b8">iPhone-এ Install করুন:</b><br>
          1️⃣ Safari-এর নিচে <b>Share ↑</b> বাটন চাপুন<br>
          2️⃣ <b>"Add to Home Screen"</b> বেছে নিন<br>
          3️⃣ উপরে <b>Add</b> চাপুন
        </div>
      </div>
    ` : `
      <div class="pg-install-card">
        <div class="pic-icon">⚙️</div>
        <div class="pic-text">
          <div class="pic-title">Browser Settings থেকে Allow করুন</div>
          <div class="pic-sub">Address bar-এর 🔒 আইকনে ক্লিক করে permission চালু করুন</div>
        </div>
      </div>
    `}

    <div class="pg-skip"><button onclick="_pgRetryPermission()">🔄 আবার চেষ্টা করুন</button></div>
  `;
}

async function _pgTriggerInstall() {
  if (!_pwaInstallPrompt) { _showIosInstallGuide(); return; }
  const btn = document.getElementById('pgInstallBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Installing...'; }
  _pwaInstallPrompt.prompt();
  const { outcome } = await _pwaInstallPrompt.userChoice;
  _pwaInstallPrompt = null;
  if (outcome === 'accepted') {
    const box = document.querySelector('.pg-box');
    if (box) box.innerHTML = `
      <div class="pg-logo">
        <svg width="38" height="38" viewBox="0 0 24 24" fill="#00e5b8">
          <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
        </svg>
      </div>
      <div class="pg-title">✅ Install হয়ে গেছে!</div>
      <div class="pg-sub">Home Screen থেকে Solvix খুলুন এবং উপভোগ করুন 🎉</div>
    `;
  } else {
    if (btn) { btn.disabled = false; btn.textContent = '⬇️ এখনই Install করুন'; }
  }
}

function _pgRetryPermission() {
  const overlay = document.getElementById('perm-gate');
  if (overlay) overlay.remove();
  window._pgCurrent = 0;
  _showPermissionGate();
}

// ── Permission Requesters ──
async function _askNotificationPermission() {
  if (!('Notification' in window))          return 'granted';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied')  return 'denied';
  try { return await Notification.requestPermission(); }
  catch (_) { return 'denied'; }
}

async function _askMicPermission() {
  if (localStorage.getItem('perm_mic') === 'granted') return 'granted';
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true });
    s.getTracks().forEach(t => t.stop());
    localStorage.setItem('perm_mic', 'granted');
    return 'granted';
  } catch (e) {
    return e.name === 'NotAllowedError' ? 'denied' : 'denied';
  }
}

async function _askCameraPermission() {
  if (localStorage.getItem('perm_camera') === 'granted') return 'granted';
  try {
    const s = await navigator.mediaDevices.getUserMedia({ video: true });
    s.getTracks().forEach(t => t.stop());
    localStorage.setItem('perm_camera', 'granted');
    return 'granted';
  } catch (_) { return 'granted'; } // optional — failure হলেও skip
}

// ══════════════════════════════════════════════════════
//  FCM INIT
// ══════════════════════════════════════════════════════
async function _initFcm() {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('/solvix/firebase-messaging-sw.js', { scope: '/solvix/' });
    _fcmMessaging = firebase.messaging();
    _fcmMessaging.onMessage(payload => _handleForegroundMessage(payload));
    navigator.serviceWorker.addEventListener('message', event => {
      const { type, data } = event.data || {};
      if (type === 'NOTIFICATION_CLICK') _onNotificationClick(data);
    });
    await _getFcmToken();
  } catch (err) { console.warn('[Solvix] FCM init:', err); }
}

async function _getFcmToken() {
  if (!_fcmMessaging || Notification.permission !== 'granted') return;
  try {
    const token = await _fcmMessaging.getToken({ vapidKey: VAPID_KEY });
    if (token) { _fcmToken = token; await _saveFcmToken(token); }
  } catch (_) {}
}

async function _saveFcmToken(token) {
  if (!CU || !token) return;
  try {
    const snap = await db.collection('users').where('uid', '==', CU.uid).limit(1).get();
    if (!snap.empty) {
      await snap.docs[0].ref.update({
        fcmTokens: firebase.firestore.FieldValue.arrayUnion(token),
        fcmTokenUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
  } catch (_) {}
}

// ══════════════════════════════════════════════════════
//  FOREGROUND MESSAGES
// ══════════════════════════════════════════════════════
function _handleForegroundMessage(payload) {
  const data = payload.data || {};
  const type = data.type || 'message';
  if (type === 'call') {
    if (typeof _cs !== 'undefined' && _cs.state !== 'idle') return;
    _showInAppCallNotification(data);
  } else {
    const activeChatId = typeof _activeChatId !== 'undefined' ? _activeChatId : null;
    if (activeChatId && activeChatId === data.chatId) return;
    _showInAppMessageNotification(data);
  }
}

function _showInAppMessageNotification(data) {
  const old = document.getElementById('solvix-notif-banner');
  if (old) old.remove();
  const b = document.createElement('div');
  b.id = 'solvix-notif-banner';
  b.className = 'solvix-notif-banner msg-notif';
  b.innerHTML = `
    <div class="snb-avatar">${data.senderPhoto ? `<img src="${data.senderPhoto}">` : `<div class="snb-av-fallback">${(data.senderName||'?')[0].toUpperCase()}</div>`}</div>
    <div class="snb-content">
      <div class="snb-name">${_escHtml(data.senderName||'Someone')}</div>
      <div class="snb-body">${_escHtml(data.body||'New message')}</div>
    </div>
    <button class="snb-close" onclick="this.parentElement.remove()">✕</button>
  `;
  b.addEventListener('click', e => {
    if (e.target.classList.contains('snb-close')) return;
    b.remove();
    if (data.chatId && data.peerUid) openChat(data.chatId, data.peerUid, null);
  });
  document.body.appendChild(b);
  requestAnimationFrame(() => b.classList.add('show'));
  setTimeout(() => { b.classList.remove('show'); setTimeout(() => b.remove(), 350); }, 5000);
  _playNotifSound('message');
}

function _showInAppCallNotification(data) {
  const old = document.getElementById('solvix-call-notif');
  if (old) old.remove();
  const b = document.createElement('div');
  b.id = 'solvix-call-notif';
  b.className = 'solvix-notif-banner call-notif show';
  b.innerHTML = `
    <div class="snb-avatar call-pulse">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="#00e5b8"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>
    </div>
    <div class="snb-content">
      <div class="snb-name">${_escHtml(data.callerName||'Someone')}</div>
      <div class="snb-body">Incoming voice call...</div>
    </div>
  `;
  document.body.appendChild(b);
  _playNotifSound('call');
}

function _onNotificationClick(data) {
  if (data?.type === 'message' && data.chatId && data.peerUid) openChat(data.chatId, data.peerUid, null);
}

// ── Sound ──
let _audioCtx = null;
function _playNotifSound(type) {
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = _audioCtx;
    if (type === 'message') {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.setValueAtTime(880, ctx.currentTime);
      o.frequency.setValueAtTime(1100, ctx.currentTime + 0.08);
      g.gain.setValueAtTime(0.18, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.25);
    } else {
      let t = ctx.currentTime;
      for (let i = 0; i < 3; i++) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.frequency.value = 480;
        g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t+0.4);
        o.start(t); o.stop(t+0.4); t += 0.6;
      }
    }
  } catch (_) {}
}

function _escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _showIosInstallGuide() {
  const m = document.createElement('div');
  m.className = 'ios-install-modal';
  m.innerHTML = `<div class="ios-install-inner">
    <div style="font-size:15px;font-weight:800;color:#fff;margin-bottom:10px">iPhone-এ Install করুন</div>
    <div style="font-size:13px;color:rgba(255,255,255,0.5);line-height:1.8">
      1️⃣ নিচের <b style="color:#00e5b8">Share ↑</b> বাটনে ট্যাপ করুন<br>
      2️⃣ <b style="color:#00e5b8">"Add to Home Screen"</b> বেছে নিন<br>
      3️⃣ উপরে <b style="color:#00e5b8">Add</b> ট্যাপ করুন
    </div>
    <button onclick="this.parentElement.parentElement.remove()" style="margin-top:16px;width:100%;padding:12px;border-radius:12px;background:#00e5b8;color:#050810;font-weight:800;border:none;font-size:14px;cursor:pointer">বুঝেছি ✓</button>
  </div>`;
  document.body.appendChild(m);
  requestAnimationFrame(() => m.classList.add('show'));
}

// Login এর পরে token রিফ্রেশ
function initNotificationsAfterLogin() {
  if (Notification.permission === 'granted') setTimeout(() => _getFcmToken(), 1500);
}

// ══════════════════════════════════════════════════════
//  AUTO START — splash (3s) এর পরেই গেট দেখাও
// ══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => runPermissionGate(), 3200);
});

// ══════════════════════════════════════════════════════
//  CSS
// ══════════════════════════════════════════════════════
(function injectStyles() {
  const s = document.createElement('style');
  s.textContent = `
    #perm-gate {
      position:fixed;inset:0;z-index:999999;
      background:#050810;
      display:flex;align-items:center;justify-content:center;padding:20px;
      opacity:0;transition:opacity 0.4s ease;
    }
    #perm-gate.show { opacity:1; }
    #perm-gate.done { opacity:0;pointer-events:none; }

    .pg-box {
      width:100%;max-width:380px;
      background:#0e1525;
      border:1px solid rgba(0,229,184,0.15);
      border-radius:28px;padding:28px 24px 24px;
      display:flex;flex-direction:column;align-items:center;gap:16px;
      box-shadow:0 0 60px rgba(0,229,184,0.08),0 20px 60px rgba(0,0,0,0.6);
      text-align:center;
    }
    .pg-logo {
      width:68px;height:68px;border-radius:20px;
      background:rgba(0,229,184,0.1);border:1px solid rgba(0,229,184,0.2);
      display:flex;align-items:center;justify-content:center;
    }
    .pg-title { font-size:20px;font-weight:800;color:#fff;line-height:1.3;letter-spacing:-0.5px; }
    .pg-sub   { font-size:13px;color:rgba(255,255,255,0.45);line-height:1.6; }

    .pg-steps { width:100%;display:flex;flex-direction:column;gap:10px; }
    .pg-step {
      display:flex;align-items:center;gap:12px;
      padding:12px 14px;border-radius:14px;
      background:rgba(255,255,255,0.03);
      border:1px solid rgba(255,255,255,0.06);
      text-align:left;transition:all 0.3s ease;
    }
    .pg-step.active { background:rgba(0,229,184,0.08);border-color:rgba(0,229,184,0.25); }
    .pg-step.done   { background:rgba(0,229,184,0.05);border-color:rgba(0,229,184,0.12);opacity:0.7; }
    .pg-step-ic     { font-size:22px;flex-shrink:0; }
    .pg-step-text   { flex:1; }
    .pg-step-title  { font-size:13px;font-weight:700;color:#fff; }
    .pg-step-desc   { font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px; }
    .pg-step-check  { font-size:16px;color:#00e5b8;flex-shrink:0; }

    .pg-progress { width:100%;height:4px;background:rgba(255,255,255,0.06);border-radius:99px;overflow:hidden; }
    .pg-progress-bar { height:100%;background:linear-gradient(90deg,#00e5b8,#0088ff);border-radius:99px;width:0%;transition:width 0.5s ease; }

    .pg-btn {
      width:100%;padding:15px;
      background:linear-gradient(135deg,#00e5b8,#00b896);
      color:#050810;border:none;font-size:15px;font-weight:800;
      border-radius:16px;cursor:pointer;letter-spacing:0.2px;
      transition:opacity 0.2s,transform 0.15s;
    }
    .pg-btn:active   { opacity:0.85;transform:scale(0.98); }
    .pg-btn:disabled { opacity:0.5;cursor:not-allowed; }
    .pg-skip button  { background:none;border:none;color:rgba(255,255,255,0.35);font-size:12px;cursor:pointer;padding:4px 8px;border-radius:8px; }
    .pg-skip button:hover { color:rgba(255,255,255,0.7); }

    .pg-install-card {
      width:100%;background:rgba(0,229,184,0.06);
      border:1px solid rgba(0,229,184,0.2);
      border-radius:16px;padding:14px 16px;
      display:flex;align-items:center;gap:12px;text-align:left;
    }
    .pic-icon  { font-size:28px;flex-shrink:0; }
    .pic-title { font-size:13px;font-weight:800;color:#fff; }
    .pic-sub   { font-size:11px;color:rgba(255,255,255,0.45);margin-top:3px; }

    .solvix-notif-banner {
      position:fixed;top:16px;left:50%;
      transform:translateX(-50%) translateY(-120%);
      width:calc(100% - 32px);max-width:420px;
      background:#141828;border:1px solid rgba(255,255,255,0.08);
      border-radius:18px;padding:12px 14px;
      display:flex;align-items:center;gap:12px;
      z-index:99999;cursor:pointer;
      box-shadow:0 8px 32px rgba(0,0,0,0.5);
      transition:transform 0.35s cubic-bezier(0.34,1.56,0.64,1),opacity 0.35s ease;
      opacity:0;user-select:none;
    }
    .solvix-notif-banner.show { transform:translateX(-50%) translateY(0);opacity:1; }
    .solvix-notif-banner.call-notif { border-color:rgba(0,229,184,0.3); }
    .snb-avatar { width:44px;height:44px;border-radius:50%;background:rgba(0,229,184,0.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden; }
    .snb-avatar img { width:100%;height:100%;object-fit:cover; }
    .snb-av-fallback { font-size:18px;font-weight:800;color:#00e5b8; }
    .call-pulse { animation:callPulse 1s infinite; }
    @keyframes callPulse { 0%,100%{box-shadow:0 0 0 0 rgba(0,229,184,0.4)} 50%{box-shadow:0 0 0 10px rgba(0,229,184,0)} }
    .snb-content { flex:1;min-width:0; }
    .snb-name { font-size:14px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
    .snb-body { font-size:12px;color:rgba(255,255,255,0.5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px; }
    .snb-close { background:none;border:none;color:rgba(255,255,255,0.3);font-size:14px;cursor:pointer;padding:4px 6px;border-radius:6px;flex-shrink:0; }

    .ios-install-modal { position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:99998;display:flex;align-items:flex-end;opacity:0;transition:opacity 0.3s ease; }
    .ios-install-modal.show { opacity:1; }
    .ios-install-inner { background:#141828;border-radius:24px 24px 0 0;padding:24px 20px 40px;width:100%;border-top:1px solid rgba(255,255,255,0.08); }
  `;
  document.head.appendChild(s);
})();
