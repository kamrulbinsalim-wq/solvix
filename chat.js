
// ── VERIFIED BADGE ──
function _verifiedBadge(u){ return (u&&u.verified)?'<img src="verified.png" class="verified-badge" width="20" height="20" alt="✓">':''; }

// SOLVIX CHAT ENGINE — chat.js
// Supabase: chats + messages
// Firebase Realtime DB: presence + typing
// Cloudinary: media upload

// ── SUPABASE INIT ──
const SUPA_URL    = 'https://rkmbzepmotyrgmxykspf.supabase.co';
const SUPA_ANON   = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrbWJ6ZXBtb3R5cmdteHlrc3BmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTg0NTIsImV4cCI6MjA4ODM5NDQ1Mn0.DQytB-nf_WbOlc5nLKOxMyWKZ3N4eLJgVOQ19zAmGpM';
const SUPA_WS     = 'wss://rkmbzepmotyrgmxykspf.supabase.co/realtime/v1/websocket?apikey=' + 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrbWJ6ZXBtb3R5cmdteHlrc3BmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTg0NTIsImV4cCI6MjA4ODM5NDQ1Mn0.DQytB-nf_WbOlc5nLKOxMyWKZ3N4eLJgVOQ19zAmGpM' + '&vsn=1.0.0';
let _realtimeWS   = null;
let _wsHeartbeat  = null;
let _wsRef        = 1;

// ── PREFETCH: auth হওয়ার আগেই chat list fetch শুরু ──
// localStorage থেকে uid পড়ে আগেই request পাঠাই
let _prefetchPromise = null;
(function _prefetchChatList(){
  try{
    // Firebase auth cache থেকে uid বের করো
    const fbKey = Object.keys(localStorage).find(k => k.startsWith('firebase:authUser:'));
    if(!fbKey) return;
    const fbUser = JSON.parse(localStorage.getItem(fbKey));
    const uid = fbUser?.uid;
    if(!uid) return;
    // Auth হওয়ার আগেই fetch শুরু
    _prefetchPromise = fetch(
      SUPA_URL + '/rest/v1/chats?or=(user1.eq.' + uid + ',user2.eq.' + uid + ')&order=last_message_time.desc.nullslast',
      { headers: { 'apikey': SUPA_ANON, 'Authorization': 'Bearer ' + SUPA_ANON } }
    ).then(r => r.ok ? r.json() : null).catch(() => null);
  }catch(_){}
})();

async function _supaFetch(path, opts = {}){
  const res = await fetch(SUPA_URL + '/rest/v1' + path, {
    ...opts,
    headers: {
      'apikey':        SUPA_ANON,
      'Authorization': 'Bearer ' + SUPA_ANON,
      'Content-Type':  'application/json',
      'Prefer':        'return=representation',
      ...(opts.headers || {})
    }
  });
  if(!res.ok){
    const err = await res.text();
    console.error('Supabase error:', res.status, err);
    throw new Error('HTTP ' + res.status + ': ' + err.slice(0,120));
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

// ── REALTIME DB ──
let rtdb = null;
function _getRtdb(){ if(!rtdb){ try{ rtdb = firebase.database(); }catch(_){} } return rtdb; }

// ── CHAT STATE ──
let _activeChatId   = null;
let _activePeerUid  = null;
let _activePeerData = null;
let _msgSub         = null;   // Supabase realtime subscription
let _typingTimer    = null;
let _presenceSub    = null;
let _lastMsgId      = 0;
let _selectedMsg    = null;  // long-press এ selected message object
let _selectedMsgs   = new Map(); // multi-select: msgId → msgData
let _selectMode     = false;     // multi-select mode চালু আছে?
let _forwardMsg     = null;  // forward করার message
let _mediaBlob      = null;
let _mediaType      = null;
let _mediaFileName  = null;
let _voiceRecorder  = null;
let _voiceChunks    = [];
let _voiceTimer     = null;
let _voiceSecs      = 0;

// ── CHAT ID GENERATOR ──
function _getChatId(uid1, uid2){
  return [uid1, uid2].sort().join('__');
}

// CHAT LIST (Chats ট্যাব)

const CHAT_LIST_CACHE_KEY = 'solvix_chat_list_v2_' + (CU?.uid || '');

function _renderChatListHTML(rows, peers){
  if(!rows.length) return null;
  let html = '';
  rows.forEach(chat => {
    const peerUid  = chat.user1 === CU.uid ? chat.user2 : chat.user1;
    const peer     = peers[peerUid] || {};
    const name     = peer.name || 'Unknown';
    const photo    = peer.photoURL || '';
    const safePhoto = photo.startsWith('https://') ? photo : '';
    const unread   = (chat.unread_count || 0) && chat.last_sender_id !== CU.uid ? chat.unread_count : 0;
    const lastMsg  = chat.last_message || '';
    const lastTime = chat.last_message_time ? _formatMsgTime(chat.last_message_time) : '';
    const avHTML   = safePhoto
      ? `<img src="${safePhoto}" alt="${_esc(name)}">`
      : `<span>${(name[0]||'?').toUpperCase()}</span>`;
    const peerJSON = JSON.stringify(peer).replace(/'/g,"\\'").replace(/"/g,'&quot;');
    html += `
      <div class="chat-list-item" onclick="openChat('${_esc(chat.id)}','${_esc(peerUid)}',JSON.parse(this.dataset.peer))" data-peer="${peerJSON}" data-chatid="${_esc(chat.id)}">
        <div class="cli-av">${avHTML}
          <div class="cli-online-dot" id="dot-${_esc(peerUid)}"></div>
        </div>
        <div class="cli-body">
          <div class="cli-top">
            <span class="cli-name">${_esc(name)}${_verifiedBadge(peer)}</span>
            <span class="cli-time" id="msgtime-${_esc(peerUid)}" data-ts="${_esc(chat.last_message_time||'')}">${_esc(lastTime)}</span>
          </div>
          <div class="cli-bottom">
            <span class="cli-last">${_lastMsgHTML(lastMsg)}</span>
            ${unread > 0 ? `<span class="cli-badge">${unread}</span>` : ''}
          </div>
        </div>
      </div>`;
  });
  return html;
}

async function loadChatList(){
  const container = $('chatListContainer');
  if(!container || !CU) return;

  // ── Cache থেকে সাথে সাথে দেখাও ──
  let cachedRaw = null;
  try{
    const cached = localStorage.getItem('solvix_chat_list_v2_' + CU.uid);
    if(cached){
      const { html, peerUids, rawKey } = JSON.parse(cached);
      cachedRaw = rawKey || null;
      container.innerHTML = html;
      peerUids.forEach(uid => _watchPresenceDot(uid));
    } else {
      container.innerHTML = `<div class="chat-list-loading"><div class="spin"></div></div>`;
    }
  }catch(_){
    container.innerHTML = `<div class="chat-list-loading"><div class="spin"></div></div>`;
  }

  // ── Background এ fresh data আনো ──
  try{
    const rows = await (_prefetchPromise || _supaFetch(
      `/chats?or=(user1.eq.${CU.uid},user2.eq.${CU.uid})&order=last_message_time.desc.nullslast`
    ));
    _prefetchPromise = null;

    if(!rows.length){
      container.innerHTML = `
        <div class="chat-empty">
          <div class="chat-empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" stroke-width="1.5" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div class="chat-empty-title">কোনো চ্যাট নেই</div>
          <div class="chat-empty-sub">কারো প্রোফাইলে গিয়ে Message বাটনে ক্লিক করুন</div>
        </div>`;
      localStorage.removeItem('solvix_chat_list_v2_' + CU.uid);
      return;
    }

    // ── Data আগের মতোই আছে কিনা check করো ──
    const newRawKey = rows.map(r => r.id + ':' + r.last_message_time + ':' + (r.unread_count||0)).join('|');
    if(newRawKey === cachedRaw){
      // কোনো পরিবর্তন নেই — re-render করবো না, flash হবে না
      return;
    }

    const peerUids = rows.map(r => r.user1 === CU.uid ? r.user2 : r.user1);
    const peerSnaps = await Promise.all(
      peerUids.map(uid => db.collection('users').where('uid','==',uid).limit(1).get())
    );
    const peers = {};
    peerSnaps.forEach((snap, i) => {
      if(!snap.empty) peers[peerUids[i]] = snap.docs[0].data();
    });

    const html = _renderChatListHTML(rows, peers);
    container.innerHTML = html;
    peerUids.forEach(uid => _watchPresenceDot(uid));

    // ── Cache আপডেট করো ──
    try{
      localStorage.setItem('solvix_chat_list_v2_' + CU.uid, JSON.stringify({ html, peerUids, rawKey: newRawKey }));
    }catch(_){}

  }catch(err){
    if(!container.querySelector('.chat-list-item')){
      container.innerHTML = `<div class="chat-list-err">লোড হয়নি। <span onclick="loadChatList()" style="color:var(--accent);cursor:pointer">আবার চেষ্টা করুন</span></div>`;
    }
  }
}

// Chat tab এ ফিরে এলে শুধু time update করো — পুরো list re-render না করে
function _refreshChatTimes(){
  const items = document.querySelectorAll('.cli-time[data-ts]');
  items.forEach(el => {
    const ts = el.dataset.ts;
    if(ts) el.textContent = _formatMsgTime(ts);
  });
}

async function openChat(chatId, peerUid, peerDataDirect){
  _activeChatId  = chatId;
  _activePeerUid = peerUid;

  // পুরনো interval clear করো

  // Get peer data
  if(peerDataDirect){
    _activePeerData = peerDataDirect;
  } else {
    try{
      const snap = await db.collection('users').where('uid','==',peerUid).limit(1).get();
      _activePeerData = snap.empty ? { name:'Unknown' } : snap.docs[0].data();
    }catch(_){ _activePeerData = { name:'Unknown' }; }
  }

  _renderChatScreen();
  _loadMessages();
  _markAllRead(chatId);
  _watchPresence(peerUid);
  _watchTyping(chatId);
  _setOnline(true);
}

function _renderChatScreen(){
  const p      = _activePeerData || {};
  const name   = p.name || 'Unknown';
  const photo  = p.photoURL || '';
  const safePhoto = photo.startsWith('https://') ? photo : '';
  const avHTML = safePhoto
    ? `<img src="${safePhoto}" alt="${_esc(name)}">`
    : `<span>${(name[0]||'?').toUpperCase()}</span>`;

  const chatScreen = $('chatScreen');
  chatScreen.innerHTML = `
    <!-- Normal topbar -->
    <div class="chat-topbar" id="chatTopbarNormal">
      <div class="chat-peer-info" onclick="_openPeerProfile()">
        <div class="chat-peer-av">${avHTML}</div>
        <div>
          <div class="chat-peer-name">${_esc(name)}${_verifiedBadge(p)}</div>
          <div class="chat-peer-status" id="chatPeerStatus">...</div>
        </div>
      </div>
      <div class="chat-topbar-acts">
        <button class="chat-act-btn" onclick="_startChatCall('voice')" title="Voice call">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>
        </button>
        <button class="chat-act-btn" onclick="_startChatCall('video')" title="Video call">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
        </button>
      </div>
    </div>

    <!-- Selection mode topbar -->
    <div class="chat-topbar chat-sel-topbar" id="chatTopbarSel" style="display:none">
      <button class="chat-back-btn" onclick="_clearMsgSelection()">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      </button>
      <span class="chat-sel-title" id="selCount">0</span>
      <div class="chat-topbar-acts">
        <button class="chat-act-btn" onclick="_setActiveBtn(this);_replyMsg()" title="Reply">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
        </button>
        <button class="chat-act-btn" onclick="_setActiveBtn(this);_copyMsg()" title="Copy">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
        <button class="chat-act-btn" onclick="_setActiveBtn(this);_forwardMsgOpen()" title="Forward">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 17 20 12 15 7"/><path d="M4 18v-2a4 4 0 0 1 4-4h12"/></svg>
        </button>
        <button class="chat-act-btn" onclick="_setActiveBtn(this);_starMsg()" title="Star">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </button>
        <button class="chat-act-btn" onclick="_setActiveBtn(this);_pinMsg()" title="Pin">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>
        </button>
        <button class="chat-act-btn" onclick="_enterSelectMode()" title="Select" id="selModeBtn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>
        </button>
        <button class="chat-act-btn danger" onclick="_setActiveBtn(this);_deleteMsg()" title="Delete">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </div>
    </div>

    <div class="pinned-msg-bar" id="pinnedMsgBar" style="display:none" onclick="_scrollToPinned()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>
      <span id="pinnedMsgText">Pinned message</span>
      <button onclick="event.stopPropagation();_unpinMsg()" style="background:none;border:none;color:var(--t3);font-size:16px;cursor:pointer;padding:0 4px">✕</button>
    </div>

    <div class="chat-messages" id="chatMessages">
      <div class="chat-msgs-loading"><div class="spin"></div></div>
    </div>

    <button class="scroll-to-bottom" id="scrollToBottomBtn" onclick="_scrollToBottom()" style="display:none">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    </button>

    <div class="chat-typing-row" id="chatTypingRow" style="display:none">
      <div class="typing-dots"><span></span><span></span><span></span></div>
      <span class="typing-label">${_esc(name)} typing...</span>
    </div>

    <div class="chat-media-preview" id="chatMediaPreview" style="display:none">
      <div class="cmp-inner">
        <button class="cmp-close" onclick="_clearMedia()">✕</button>
        <div id="cmpContent"></div>
        <div class="cmp-filename" id="cmpFilename"></div>
      </div>
    </div>

    <!-- Attach popup menu -->
    <div class="chat-attach-menu" id="chatAttachMenu" style="display:none">
      <button class="cam-item" onclick="_pickFile('photovideo')">
        <div class="cam-icon-wrap" style="background:linear-gradient(145deg,#a855f7,#7c3aed)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="6" width="20" height="14" rx="3"/>
            <circle cx="12" cy="13" r="3.5"/>
            <path d="M8 6V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1"/>
            <circle cx="18" cy="9" r="1" fill="#fff" stroke="none"/>
          </svg>
        </div>
        <span>Gallery</span>
      </button>
      <button class="cam-item" onclick="_pickFile('camera')">
        <div class="cam-icon-wrap" style="background:linear-gradient(145deg,#f43f5e,#e11d48)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2.5L7 4h10l1.5 2H21a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
            <circle cx="12" cy="13" r="1.5" fill="#fff" stroke="none"/>
          </svg>
        </div>
        <span>Camera</span>
      </button>
      <button class="cam-item" onclick="_pickFile('document')">
        <div class="cam-icon-wrap" style="background:linear-gradient(145deg,#3b82f6,#1d4ed8)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="8" y1="13" x2="16" y2="13"/>
            <line x1="8" y1="17" x2="13" y2="17"/>
          </svg>
        </div>
        <span>Document</span>
      </button>
      <button class="cam-item" onclick="_pickFile('audio')">
        <div class="cam-icon-wrap" style="background:linear-gradient(145deg,#f97316,#ea580c)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 18V5l12-2v13"/>
            <circle cx="6" cy="18" r="3"/>
            <circle cx="18" cy="16" r="3"/>
          </svg>
        </div>
        <span>Audio</span>
      </button>
      <button class="cam-item" onclick="_openPollCreator()">
        <div class="cam-icon-wrap" style="background:linear-gradient(145deg,#10b981,#059669)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="3"/>
            <line x1="8" y1="17" x2="8" y2="12"/>
            <line x1="12" y1="17" x2="12" y2="8"/>
            <line x1="16" y1="17" x2="16" y2="14"/>
          </svg>
        </div>
        <span>Poll</span>
      </button>
      <button class="cam-item" onclick="_sendLocation()">
        <div class="cam-icon-wrap" style="background:linear-gradient(145deg,#06b6d4,#0891b2)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            <circle cx="12" cy="9" r="2.5"/>
          </svg>
        </div>
        <span>Location</span>
      </button>
      <button class="cam-item" onclick="_openViewOnce()">
        <div class="cam-icon-wrap" style="background:linear-gradient(145deg,#ec4899,#be185d)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 5C6.48 5 2 12 2 12s4.48 7 10 7 10-7 10-7S17.52 5 12 5z"/>
            <circle cx="12" cy="12" r="3"/>
            <circle cx="12" cy="12" r="1" fill="#fff" stroke="none"/>
            <path d="M3 3l18 18" stroke-width="2"/>
          </svg>
        </div>
        <span>View Once</span>
      </button>
    </div>

    <div class="chat-input-bar">
      <input type="file" id="chatImgInput"  accept="image/*,video/*" multiple style="display:none" onchange="_onFileSelected(this,'photovideo')">
      <input type="file" id="chatCamInput"  accept="image/*" capture="environment" style="display:none" onchange="_onFileSelected(this,'photovideo')">
      <input type="file" id="chatVidInput"  accept="video/*" style="display:none" onchange="_onFileSelected(this,'video')">
      <input type="file" id="chatDocInput"   accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar" style="display:none" onchange="_onFileSelected(this,'document')">
      <input type="file" id="chatAudioInput"   accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac" style="display:none" onchange="_onFileSelected(this,'audio')">
      <input type="file" id="chatViewOnceInput" accept="image/*,video/*" style="display:none" onchange="_onFileSelected(this,'viewonce')">
      <input type="file" id="chatAddMoreInput" accept="image/*,video/*" multiple style="display:none" onchange="_fpsAddFiles(this)">
      <div class="chat-input-wrap">
        <textarea id="chatInput" class="chat-input" placeholder="মেসেজ লিখুন..."
          rows="1" maxlength="2000"
          readonly
          onclick="this.removeAttribute('readonly')"
          oninput="_onChatInput(this)"
          onkeydown="_onChatKeydown(event)"></textarea>
        <button class="chat-attach-inline-btn" id="chatAttachBtn" onclick="_toggleAttachMenu()" title="Attach">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
        </button>
      </div>

      <!-- Voice timer -->
      <div class="voice-timer" id="voiceTimer" style="display:none">⏺ <span id="voiceTimerVal">0:00</span></div>
      <!-- Mic / Send toggle button -->
      <button class="chat-send-btn" id="chatMainBtn"
        onclick="_onMainBtnClick()"
        ontouchstart="_onMainBtnTouchStart(event)"
        ontouchend="_onMainBtnTouchEnd(event)"
        onmousedown="_onMainBtnMouseDown(event)"
        onmouseup="_onMainBtnMouseUp(event)">
        <!-- Mic icon (default) -->
        <svg id="mainBtnMic" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
        <!-- Send icon (hidden until text typed) -->
        <svg id="mainBtnSend" width="22" height="22" viewBox="0 0 24 24" fill="none" style="display:none;transform:translateX(1px)"><path d="M3 12L5.5 5.5C6.2 3.6 8.5 3 10 4.2L21 12L10 19.8C8.5 21 6.2 20.4 5.5 18.5L3 12Z" fill="white" stroke="white" stroke-width="1" stroke-linejoin="round"/><path d="M12 12H3" stroke="rgba(0,0,0,0.2)" stroke-width="1.5" stroke-linecap="round"/></svg>
      </button>
    </div>
  `;

  // Forward screen inject করো (একবার)
  if(!$('forwardScreen')){
    const fwd = document.createElement('div');
    fwd.id = 'forwardScreen';
    fwd.className = 'forward-screen';
    fwd.innerHTML = `
      <div class="forward-topbar">
        <button class="chat-back-btn" onclick="_closeForward()">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <span style="font-size:16px;font-weight:700">Forward to</span>
      </div>
      <div class="forward-search-wrap">
        <input id="forwardSearchInp" class="forward-search" placeholder="Search name or number..." oninput="_filterForwardList(this.value)">
      </div>
      <div class="forward-list" id="forwardList"></div>
    `;
    document.body.appendChild(fwd);
  }

  chatScreen.classList.add('open');
  document.body.style.overflow = 'hidden';
  _pushBack(closeChat, 'chat');

  // keyboard যেন না ওঠে — সব focus সরিয়ে দাও
  const inp = $('chatInput');
  if(inp){
    inp.setAttribute('readonly', 'readonly');
    inp.blur();
  }
  if(document.activeElement && document.activeElement !== document.body){
    document.activeElement.blur();
  }
  // screen open হওয়ার পরেও একবার blur করো (animation শেষে)
  setTimeout(() => {
    const i = $('chatInput');
    if(i){ i.setAttribute('readonly','readonly'); i.blur(); }
    if(document.activeElement && document.activeElement !== document.body){
      document.activeElement.blur();
    }
  }, 300);
}

function closeChat(){
  _popBack();
  const chatScreen = $('chatScreen');
  chatScreen.classList.remove('open');
  document.body.style.overflow = '';

  // Cleanup
  _closeRealtimeWS();
  _stopTyping();
  if(_getRtdb() && _activePeerUid) {
    try{ _getRtdb().ref('typing/' + _activeChatId + '/' + CU.uid).remove(); }catch(_){}
    try{ _getRtdb().ref('reactions/' + _activeChatId).off(); }catch(_){}
    try{ _getRtdb().ref('pinned/' + _activeChatId).off(); }catch(_){}
  }
  _activeChatId = null; _activePeerUid = null; _activePeerData = null; _lastMsgId = 0;
  _mediaBlob = null; _mediaType = null; _mediaFileName = null;
  _stopVoiceRecording();
}

async function _openPeerProfile(){
  if(!_activePeerUid) return;
  // সবসময় Firestore থেকে fresh full data আনো — privacy field নিশ্চিত করতে
  try{
    const snap = await db.collection('users').where('uid','==',_activePeerUid).limit(1).get();
    if(!snap.empty){
      _activePeerData = snap.docs[0].data();
      _openProfileSheet(_activePeerData);
    } else {
      _openProfileSheet(_activePeerData || { name:'Unknown' });
    }
  }catch(_){
    _openProfileSheet(_activePeerData || { name:'Unknown' });
  }
}

// MESSAGES — load & render

async function _loadMessages(){
  const container = $('chatMessages');
  if(!container) return;
  _lastMsgId = 0;

  // ── Step 1: Cache থেকে সাথে সাথে দেখাও ──
  const cacheKey = 'solvix_msgs_' + _activeChatId;
  try{
    const cached = localStorage.getItem(cacheKey);
    if(cached){
      const rows = JSON.parse(cached);
      if(rows.length){
        _renderMessages(rows);
        _lastMsgId = rows[rows.length - 1].id || 0;
      }
    } else {
      container.innerHTML = `<div class="chat-list-loading"><div class="spin"></div></div>`;
    }
  }catch(_){
    container.innerHTML = `<div class="chat-list-loading"><div class="spin"></div></div>`;
  }

  // ── Step 2: Background এ fresh data আনো ──
  try{
    const rows = await _supaFetch(
      `/messages?chat_id=eq.${_activeChatId}&deleted=eq.false&or=(media_url.is.null,media_hidden.eq.false)&order=created_at.asc&limit=80`
    );

    // Cache আপডেট করো
    try{ localStorage.setItem(cacheKey, JSON.stringify(rows)); }catch(_){}

    _renderMessages(rows);
    if(rows.length) _lastMsgId = rows[rows.length-1].id;

    _subscribeMessages();
    _watchReactions(_activeChatId);
    _watchPinned(_activeChatId);
    _watchPolls(_activeChatId);
    _initScrollToBottom();
  }catch(err){
    if(!container.querySelector('.msg-bubble')){
      container.innerHTML = `<div style="text-align:center;color:var(--danger);padding:20px;font-size:13px">লোড হয়নি</div>`;
    }
  }
}

function _renderMessages(rows){
  const container = $('chatMessages');
  if(!container) return;
  if(!rows.length){
    container.innerHTML = `<div class="chat-no-msgs">কথা শুরু করুন 👋</div>`;
    return;
  }

  let html = '';
  let lastDate = '';
  rows.forEach(msg => {
    const isMine = msg.sender_id === CU.uid;
    const dateStr = _formatMsgDate(msg.created_at);
    if(dateStr !== lastDate){
      html += `<div class="msg-date-sep"><span>${dateStr}</span></div>`;
      lastDate = dateStr;
    }
    html += _buildMsgBubble(msg, isMine);
  });
  container.innerHTML = html;
  // chat খুলতেই নিচে scroll করো
  requestAnimationFrame(() => {
    container.scrollTop = container.scrollHeight;
  });
  _attachMsgPressListeners(container);
}

function _buildMsgBubble(msg, isMine){
  const time  = _formatMsgTime(msg.created_at);
  const seenColor = msg.seen ? '#53bdeb' : 'rgba(255,255,255,0.5)';
  const seenSVG = isMine ? (msg.seen
    ? `<svg class="msg-tick" viewBox="0 0 20 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1.5 6C3.5 8.5 5 10 5 10L11 2" stroke="${seenColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M6.5 6C8.5 8.5 10 10 10 10L18 1" stroke="${seenColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
       </svg>`
    : `<svg class="msg-tick" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1.5 6C3.5 8.5 5 10.5 5 10.5L12.5 1" stroke="${seenColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
       </svg>`)
    : '';
  let content = '';

  if(msg.media_type === 'viewonce'){
    const seen = msg.viewonce_seen;
    content = seen
      ? `<div class="viewonce-seen"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg> Opened</div>`
      : `<div class="viewonce-box" onclick="_openViewOnceMedia('${_esc(msg.id)}','${_esc(msg.media_url)}','${_esc(msg.media_subtype||'image')}')"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg><span>View once</span></div>`;
  } else if(msg.media_url && msg.media_type !== 'poll' && msg.media_type !== 'location'){
    const mt = msg.media_type || 'document';
    const rawName = msg.media_url.split('/').pop().split('?')[0] || 'file';
    const fileName = (msg.text && !msg.text.startsWith('{')) ? msg.text : rawName;

    if(mt === 'voice' || mt === 'audio'){
      const isVoice = mt === 'voice';
      const accentColor = isVoice ? '#34d399' : '#fb923c';
      const lbl = isVoice ? 'Voice message' : (fileName.length > 26 ? fileName.slice(0,23)+'…' : fileName);
      const safeUrl = _esc(msg.media_url);
      const pid = 'ap_' + (msg.id || Math.random().toString(36).slice(2));
      content = `<div class="msg-audio-player" style="--ap-color:${accentColor}">
        <button class="map-play-btn" id="btn_${pid}" onclick="event.stopPropagation();_toggleAudioPlay('${pid}','${safeUrl}',this)">
          <svg class="map-play-ico" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>
        </button>
        <div class="map-middle">
          <span class="map-label">${_esc(lbl)}</span>
          <div class="map-progress-wrap" onclick="event.stopPropagation();_seekAudio('${pid}',event,this)">
            <div class="map-progress-bg"><div class="map-progress-fill" id="prog_${pid}"></div></div>
          </div>
          <span class="map-time" id="time_${pid}">0:00</span>
        </div>
        <a class="map-dl-btn" href="${safeUrl}" download onclick="event.stopPropagation()" title="Download">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </a>
      </div>`;
    } else {
    const iconMap = {
      image:    {
        svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="15" rx="3"/><circle cx="12" cy="13.5" r="3.5"/><path d="M8 6V5a2 2 0 012-2h4a2 2 0 012 2v1"/></svg>`,
        color: 'linear-gradient(145deg,#a78bfa,#7c3aed)', label: 'Photo'
      },
      video:    {
        svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="15" height="14" rx="2"/><path d="M17 8l5-3v14l-5-3V8z"/></svg>`,
        color: 'linear-gradient(145deg,#f87171,#dc2626)', label: 'Video'
      },
      audio:    {
        svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
        color: 'linear-gradient(145deg,#fb923c,#ea580c)', label: 'Audio'
      },
      voice:    {
        svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0014 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>`,
        color: 'linear-gradient(145deg,#34d399,#059669)', label: 'Voice'
      },
      document: {
        svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
        color: 'linear-gradient(145deg,#60a5fa,#2563eb)', label: 'Document'
      },
    };
    const { svg, color, label } = iconMap[mt] || iconMap.document;
    const dispName = fileName.length > 30 ? fileName.slice(0,27) + '…' : fileName;
    content = `<div class="msg-doc-file-row">
      <div class="msg-doc-file-icon" style="background:${color}">${svg}</div>
      <div class="msg-doc-file-info">
        <span class="msg-doc-file-name">${_esc(dispName)}</span>
        <span class="msg-doc-file-label">${label}</span>
      </div>
      <button class="msg-doc-file-dl" onclick="event.stopPropagation();_dlMedia('${_esc(msg.media_url)}','${_esc(mt)}')" title="Download">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      </button>
    </div>`;
    } // end else
  } else if(msg.media_type === 'poll'){
    try{
      const poll = JSON.parse(msg.text || '{}');
      const totalVotes = Object.values(poll.counts||{}).reduce((a,b)=>a+(b||0),0);
      const myVote = CU ? (poll.votes||{})[CU.uid] : undefined;
      const opts = (poll.options||[]).map((opt,i) => {
        const v   = (poll.counts||{})[i] || 0;
        const pct = totalVotes ? Math.round(v/totalVotes*100) : 0;
        const isMyVote = myVote === i;
        return `<div class="poll-opt${isMyVote?' my-vote':''}" onclick="_votePoll('${_esc(msg.id)}',${i})">
          <div class="poll-opt-bar" style="width:${pct}%"></div>
          <span class="poll-opt-text">${_esc(opt)}</span>
          <div class="poll-opt-right">
            <span class="poll-opt-cnt">${v} vote${v!==1?'s':''}</span>
            <span class="poll-opt-pct">${pct}%</span>
          </div>
        </div>`;
      }).join('');
      content = `<div class="poll-bubble">
        <div class="poll-q">${_esc(poll.question||'')}</div>
        ${opts}
        <div class="poll-total">${totalVotes} vote${totalVotes!==1?'s':''}</div>
      </div>`;
    }catch(_){ content = `<div class="msg-text">📊 Poll</div>`; }
  } else if(msg.media_type === 'location'){
    try{
      const loc = JSON.parse(msg.text||'{}');
      content = `<a class="msg-location" href="https://maps.google.com/?q=${loc.lat},${loc.lng}" target="_blank">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <span>${_esc(loc.name||'Location')}</span>
      </a>`;
    }catch(_){ content = `<div class="msg-text">📍 Location</div>`; }
  } else {
    content = `<div class="msg-text">${_esc(msg.text)}</div>`;
  }
  // Star indicator
  const starBadge = msg.starred ? `<span class="msg-star-badge">⭐</span>` : '';

  const msgEncoded = encodeURIComponent(JSON.stringify(msg));
  return `
    <div class="msg-row ${isMine ? 'mine' : 'theirs'}" data-msgid="${msg.id||''}" data-msg="${msgEncoded}" style="position:relative">
      <div class="msg-bubble">
        ${msg.reply_to_text ? `<div class="msg-reply-quote" onclick="_scrollToMsg('${msg.reply_to_id||''}')">
          <div class="msg-reply-bar"></div>
          <div class="msg-reply-txt">${_esc((msg.reply_to_text||'').slice(0,60))}${(msg.reply_to_text||'').length>60?'…':''}</div>
        </div>` : ''}
        <div class="msg-content-wrap">${content}<div class="msg-meta">${msg.starred?'<span class="msg-star-badge">⭐</span>':''}<span class="msg-time">${time}</span>${isMine ? seenSVG : ''}</div></div>
        <div class="msg-reaction-bar" id="rxbar-${msg.id||0}" style="display:none">
          <button onclick="_sendReaction('👍',${msg.id||0})">👍</button>
          <button onclick="_sendReaction('❤️',${msg.id||0})">❤️</button>
          <button onclick="_sendReaction('😂',${msg.id||0})">😂</button>
          <button onclick="_sendReaction('😮',${msg.id||0})">😮</button>
          <button onclick="_sendReaction('😢',${msg.id||0})">😢</button>
          <button onclick="_sendReaction('🙏',${msg.id||0})">🙏</button>
        </div>
      </div>
      <div class="msg-reactions" id="rxshow-${msg.id||0}"></div>
    </div>`;
}

function _subscribeMessages(){
  // পুরনো connection বন্ধ করো
  _closeRealtimeWS();

  const chatId = _activeChatId;

  function connect(){
    const ws = new WebSocket(SUPA_WS);
    _realtimeWS = ws;

    ws.onopen = () => {
      // Channel join করো
      const joinMsg = {
        topic: `realtime:public:messages:chat_id=eq.${chatId}`,
        event: 'phx_join',
        payload: { config: { broadcast: { self: false }, presence: { key: '' } } },
        ref: String(_wsRef++)
      };
      ws.send(JSON.stringify(joinMsg));

      // Heartbeat — 25s পরপর
      _wsHeartbeat = setInterval(() => {
        if(ws.readyState === WebSocket.OPEN){
          ws.send(JSON.stringify({ topic:'phoenix', event:'heartbeat', payload:{}, ref: String(_wsRef++) }));
        }
      }, 25000);
    };

    ws.onmessage = e => {
      try{
        const data = JSON.parse(e.data);
        if(data.event !== 'INSERT') return;
        const msg = data.payload?.record;
        if(!msg || msg.chat_id !== chatId) return;
        if(msg.id <= _lastMsgId) return; // duplicate এড়াও
        // deleted বা media_hidden message show করবো না
        if(msg.deleted === true) return;
        if(msg.media_url && msg.media_hidden === true) return;

        _lastMsgId = msg.id;
        _appendNewMsg(msg);
        _markAllRead(chatId);
      }catch(_){}
    };

    ws.onerror = () => {};
    ws.onclose = () => {
      clearInterval(_wsHeartbeat);
      // reconnect — 3s পরে
      if(_activeChatId === chatId){
        _msgSub = setTimeout(connect, 3000);
      }
    };
  }

  connect();
}

function _closeRealtimeWS(){
  clearInterval(_wsHeartbeat);
  clearTimeout(_msgSub);
  _wsHeartbeat = null;
  _msgSub = null;
  if(_realtimeWS){
    try{ _realtimeWS.close(); }catch(_){}
    _realtimeWS = null;
  }
}

function _appendNewMsg(msg){
  const container = $('chatMessages');
  if(!container) return;
  // duplicate check — same id আগে থেকে আছে কিনা
  if(msg.id && container.querySelector(`[data-msgid="${msg.id}"]`)) return;
  const isMine = msg.sender_id === CU?.uid;
  const wasAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 80;

  const noMsg = container.querySelector('.chat-no-msgs');
  if(noMsg) container.innerHTML = '';

  // date separator
  const dateStr = _formatMsgDate(msg.created_at);
  const lastSep = container.querySelector('.msg-date-sep:last-of-type span');
  if(!lastSep || lastSep.textContent !== dateStr){
    const sep = document.createElement('div');
    sep.className = 'msg-date-sep';
    sep.innerHTML = `<span>${dateStr}</span>`;
    container.appendChild(sep);
  }

  const tmp = document.createElement('div');
  tmp.innerHTML = _buildMsgBubble(msg, isMine).trim();
  container.appendChild(tmp.firstElementChild);

  if(wasAtBottom) container.scrollTop = container.scrollHeight;

  // Cache আপডেট করো
  try{
    const cacheKey = 'solvix_msgs_' + _activeChatId;
    const cached = localStorage.getItem(cacheKey);
    const rows = cached ? JSON.parse(cached) : [];
    if(!rows.find(r => r.id === msg.id)){
      rows.push(msg);
      if(rows.length > 80) rows.splice(0, rows.length - 80);
      localStorage.setItem(cacheKey, JSON.stringify(rows));
    }
  }catch(_){}
}

// SEND MESSAGE

async function sendMessage(){
  if(!CU || !_activeChatId) return;
  const inp  = $('chatInput');
  const text = (inp?.value || '').trim();
  if(!text && !_mediaBlob){ toast('মেসেজ লিখুন','error'); return; }

  const btn = $('chatMainBtn');
  if(btn) btn.disabled = true;

  try{
    let mediaUrl  = '';
    let mediaType = '';
    let savedFileName = '';

    // Upload media if any
    if(_mediaBlob){
      let cloudType, ext;
      savedFileName = _mediaFileName || '';
      if(_mediaType === 'viewonce')      { cloudType= savedFileName&&savedFileName.match(/\.mp4|\.mov|\.webm/i)?'video':'image'; ext=(savedFileName||'img').split('.').pop()||'jpg'; }
      else if(_mediaType === 'video')    { cloudType='video';  ext='mp4'; }
      else if(_mediaType === 'voice')    { cloudType='video';  ext='webm'; }
      else if(_mediaType === 'audio')    { cloudType='raw';    ext=(savedFileName||'file').split('.').pop()||'mp3'; }
      else if(_mediaType === 'document') { cloudType='raw';    ext=(savedFileName||'file').split('.').pop()||'bin'; }
      else                               { cloudType='image';  ext='jpg'; }
      const res = await _uploadToCloudinary(_mediaBlob, cloudType, ext, savedFileName);
      mediaUrl  = res.secure_url;
      mediaType = _mediaType;
      _clearMedia();
    }

    // Ensure chat row exists in Supabase
    await _ensureChatRow();

    // Insert message
    const msgText = mediaType
      ? (savedFileName || text || mediaType)
      : text;
    const rp = $('replyPreview');
    const replyToId   = rp?.style.display !== 'none' ? (rp?.dataset.replyId   || null) : null;
    const replyToText = rp?.style.display !== 'none' ? (rp?.dataset.replyText || null) : null;
    const msgBody = {
      chat_id:    _activeChatId,
      sender_id:  CU.uid,
      text:       msgText,
      media_url:  mediaUrl,
      media_type: mediaType,
      seen:       false,
      created_at: new Date().toISOString()
    };
    if(replyToId)   msgBody.reply_to_id   = replyToId;
    if(replyToText) msgBody.reply_to_text = replyToText.slice(0,200);
    const inserted = await _supaFetch('/messages', {
      method: 'POST',
      body: JSON.stringify(msgBody)
    });
    if(Array.isArray(inserted) && inserted[0]?.id) _lastMsgId = inserted[0].id;
    _clearReply();
    // inserted row এর id দিয়ে _lastMsgId আপডেট করো — poll duplicate আনবে না

    // last_message text বানাও
    const lastMsgText = mediaUrl
      ? (mediaType==='image'?'📷 Photo':mediaType==='video'?'🎥 Video':mediaType==='voice'?'🎤 Voice':mediaType==='audio'?'🎵 '+(savedFileName||'Audio'):mediaType==='document'?'📎 '+(savedFileName||'Document'):'📎 File')
      : text;

    // Instantly chat list DOM update — server reply এর জন্য অপেক্ষা না করে
    _updateChatListPreview(_activeChatId, lastMsgText);

    // Server-এ update (background)
    _supaFetch(`/chats?id=eq.${_activeChatId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        last_message:      lastMsgText,
        last_message_time: new Date().toISOString(),
        last_sender_id:    CU.uid,
        unread_count:      1
      })
    }).catch(()=>{});

    // ── FCM Push Notification (Worker দিয়ে) ──
    _sendMessageNotification(lastMsgText).catch(()=>{});

    if(inp){
      inp.value = '';
      inp.style.height = '22px';
      const wrap = inp.closest('.chat-input-wrap');
      if(wrap){ wrap.style.height = '40px'; wrap.classList.remove('expanded'); }
      const bar = inp.closest('.chat-input-bar');
      if(bar){ bar.style.alignItems = 'center'; }
    }
    _updateMainBtn(false);
    _stopTyping();

    // Optimistic render
    const container = $('chatMessages');
    if(container){
      const noMsg = container.querySelector('.chat-no-msgs');
      if(noMsg) container.innerHTML = '';
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = _buildMsgBubble({
        sender_id: CU.uid, text: msgText, media_url: mediaUrl, media_type: mediaType,
        reply_to_id: replyToId, reply_to_text: replyToText,
        seen: false, created_at: new Date().toISOString()
      }, true);
      const sentRow = tempDiv.firstElementChild;
      container.appendChild(sentRow);
      container.scrollTop = container.scrollHeight;
    }

  }catch(err){
    toast('মেসেজ পাঠানো যায়নি','error');
  }finally{
    if(btn) btn.disabled = false;
    _updateMainBtn(false);
  }
}

async function _ensureChatRow(){
  const existing = await _supaFetch(`/chats?id=eq.${_activeChatId}`);
  if(!existing.length){
    await _supaFetch('/chats', {
      method: 'POST',
      body: JSON.stringify({
        id:                _activeChatId,
        user1:             CU.uid,
        user2:             _activePeerUid,
        last_message:      '',
        last_message_time: new Date().toISOString(),
        unread_count:      0,
        created_at:        new Date().toISOString()
      })
    });
  }
}

// START CHAT from profile Message button

async function startChatWithUser(peerData){
  if(!CU){ toast('প্রথমে লগইন করুন','error'); return; }
  closeProfileSheet();

  const chatId = _getChatId(CU.uid, peerData.uid);
  switchTab('chats');
  await openChat(chatId, peerData.uid, peerData);
}

// MARK READ

async function _markAllRead(chatId){
  if(!CU) return;
  try{
    // Mark messages as seen
    await _supaFetch(`/messages?chat_id=eq.${chatId}&sender_id=neq.${CU.uid}&seen=eq.false`, {
      method: 'PATCH',
      body: JSON.stringify({ seen: true })
    });
    // Reset unread count
    await _supaFetch(`/chats?id=eq.${chatId}`, {
      method: 'PATCH',
      body: JSON.stringify({ unread_count: 0 })
    });
  }catch(_){}
}

// TYPING INDICATOR

function _onChatInput(ta){
  _autoResize(ta);
  _sendTyping();
  _updateMainBtn(ta.value.trim().length > 0);
}

function _onChatKeydown(e){
  if(e.key === 'Enter'){
    // নতুন লাইন যোগ হবে, তারপর scroll করে সেই লাইন দেখাবে
    setTimeout(()=>{
      const el = e.target;
      el.scrollTop = el.scrollHeight;
      _autoResize(el);
    }, 0);
  }
}

function _autoResize(el){
  el.style.height = 'auto';
  const h = Math.min(el.scrollHeight, 110);
  el.style.height = h + 'px';
  el.scrollTop = el.scrollHeight;
  const wrap = el.closest('.chat-input-wrap');
  if(wrap){
    if(h > 22){
      wrap.classList.add('expanded');
      wrap.style.height = Math.min(h + 18, 130) + 'px';
    } else {
      wrap.classList.remove('expanded');
      wrap.style.height = '40px';
    }
  }
  // send btn align
  const bar = el.closest('.chat-input-bar');
  if(bar){
    bar.style.alignItems = h > 22 ? 'flex-end' : 'center';
  }
}

function _updateMainBtn(hasText){
  const mic  = $('mainBtnMic');
  const send = $('mainBtnSend');
  if(!mic || !send) return;
  if(hasText){
    mic.style.display  = 'none';
    send.style.display = '';
  } else {
    mic.style.display  = '';
    send.style.display = 'none';
  }
}

function _onMainBtnClick(){
  const inp = $('chatInput');
  if(inp && inp.value.trim().length > 0){
    sendMessage();
  }
}

function _onMainBtnTouchStart(e){
  const inp = $('chatInput');
  if(inp && inp.value.trim().length > 0) return;
  e.preventDefault();
  _startVoice(e);
}

function _onMainBtnTouchEnd(e){
  const inp = $('chatInput');
  if(inp && inp.value.trim().length > 0) return;
  _stopVoice(e);
}

function _onMainBtnMouseDown(e){
  const inp = $('chatInput');
  if(inp && inp.value.trim().length > 0) return;
  _startVoice(e);
}

function _onMainBtnMouseUp(e){
  const inp = $('chatInput');
  if(inp && inp.value.trim().length > 0) return;
  _stopVoice(e);
}

function _sendTyping(){
  if(!_getRtdb() || !_activeChatId || !CU) return;
  _getRtdb().ref('typing/' + _activeChatId + '/' + CU.uid).set(true);
  clearTimeout(_typingTimer);
  _typingTimer = setTimeout(_stopTyping, 3000);
}

function _stopTyping(){
  clearTimeout(_typingTimer);
  if(!_getRtdb() || !_activeChatId || !CU) return;
  try{ _getRtdb().ref('typing/' + _activeChatId + '/' + CU.uid).remove(); }catch(_){}
}

function _watchTyping(chatId){
  if(!_getRtdb()) return;
  _getRtdb().ref('typing/' + chatId).on('value', snap => {
    const data = snap.val() || {};
    const peerTyping = data[_activePeerUid] === true;
    const row = $('chatTypingRow');
    if(row) row.style.display = peerTyping ? 'flex' : 'none';
  });
}

// PRESENCE

function _setOnline(online){
  if(!_getRtdb() || !CU) return;
  const ref = _getRtdb().ref('presence/' + CU.uid);
  if(online){
    ref.set({ online: true, lastSeen: firebase.database.ServerValue.TIMESTAMP });
    ref.onDisconnect().set({ online: false, lastSeen: firebase.database.ServerValue.TIMESTAMP });
  } else {
    ref.set({ online: false, lastSeen: firebase.database.ServerValue.TIMESTAMP });
  }
}

function _watchPresence(peerUid){
  if(!_getRtdb()) return;
  _getRtdb().ref('presence/' + peerUid).on('value', snap => {
    const data    = snap.val() || {};
    const online  = data.online === true;
    const statusEl = $('chatPeerStatus');
    if(statusEl){
      statusEl.textContent = online ? 'Online' : (data.lastSeen ? 'Last seen ' + _formatRelTime(data.lastSeen) : 'Offline');
      statusEl.style.color = online ? 'var(--accent)' : 'var(--t2)';
    }
  });
}

// Track active presence listeners to avoid duplicates
let _presenceListeners = {}; // uid → ref

function _watchPresenceDot(peerUid){
  if(!_getRtdb()) return;
  if(_presenceListeners[peerUid]){
    try{ _presenceListeners[peerUid].off(); }catch(_){}
  }
  const ref = _getRtdb().ref('presence/' + peerUid);
  _presenceListeners[peerUid] = ref;
  ref.on('value', snap => {
    const data   = snap.val() || {};
    const online = data.online === true;
    const dot = $('dot-' + peerUid);
    if(dot) dot.style.display = online ? 'block' : 'none';
  });
}

function _clearAllPresenceListeners(){
  Object.values(_presenceListeners).forEach(ref => {
    try{ ref.off(); }catch(_){}
  });
  _presenceListeners = {};
}

// MEDIA — pick, preview, upload

function _scrollToBottom(){
  const container = $('chatMessages');
  if(container) container.scrollTop = container.scrollHeight;
  const btn = $('scrollToBottomBtn');
  if(btn) btn.style.display = 'none';
}

function _initScrollToBottom(){
  const container = $('chatMessages');
  const btn = $('scrollToBottomBtn');
  if(!container || !btn) return;
  let _scrollRAF = null;
  container.addEventListener('scroll', () => {
    if(_scrollRAF) return;
    _scrollRAF = requestAnimationFrame(() => {
      const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      btn.style.display = distFromBottom > 150 ? 'flex' : 'none';
      _scrollRAF = null;
    });
  }, { passive: true });
}

function _toggleAttachMenu(){
  const menu = $('chatAttachMenu');
  if(!menu) return;
  const open = menu.style.display !== 'none';
  if(open){
    menu.style.display = 'none';
    document.removeEventListener('click', _attachMenuOutsideClick);
  } else {
    menu.style.display = 'flex';
    // এক tick পরে listener লাগাও — নাহলে এই click-ই বন্ধ করে দেবে
    setTimeout(() => document.addEventListener('click', _attachMenuOutsideClick), 50);
  }
}

function _attachMenuOutsideClick(e){
  const menu = $('chatAttachMenu');
  const btn  = $('chatAttachBtn');
  if(!menu) return;
  if(!menu.contains(e.target) && (!btn || !btn.contains(e.target))){
    menu.style.display = 'none';
    document.removeEventListener('click', _attachMenuOutsideClick);
  }
}

function _closeAttachMenu(){
  const menu = $('chatAttachMenu');
  if(menu) menu.style.display = 'none';
  document.removeEventListener('click', _attachMenuOutsideClick);
}

function _pickFile(type){
  _closeAttachMenu();
  const ids = {
    photovideo: 'chatImgInput',
    camera:     'chatCamInput',
    document:   'chatDocInput',
    audio:      'chatAudioInput',
    viewonce:   'chatViewOnceInput'
  };
  const inp = $(ids[type]);
  if(inp) inp.click();
}

function _onFileSelected(input, type){
  const files = Array.from(input.files || []);
  if(!files.length) return;
  input.value = '';

  if(type === 'photovideo'){
    // image/video → full-screen multi-preview
    const valid = [];
    for(const f of files){
      if(f.type.startsWith('image/') && f.size > 10*1024*1024){ toast('ছবি সর্বোচ্চ 10MB','error'); continue; }
      if(f.type.startsWith('video/') && f.size > 50*1024*1024){ toast('ভিডিও সর্বোচ্চ 50MB','error'); continue; }
      valid.push(f);
    }
    if(valid.length) _fpsOpen(valid);
    return;
  }

  const file = files[0];
  if(type==='viewonce' && file.size > 10*1024*1024){ toast('View once সর্বোচ্চ 10MB','error'); return; }
  if(type==='document' && file.size > 20*1024*1024){ toast('ডকুমেন্ট সর্বোচ্চ 20MB','error'); return; }
  if(type==='audio'    && file.size > 20*1024*1024){ toast('অডিও সর্বোচ্চ 20MB','error'); return; }

  _mediaFileName = file.name;
  if(type === 'audio'){
    _fpsOpenSingle(file, 'audio');
  } else if(type === 'viewonce'){
    _mediaType = 'viewonce'; _mediaBlob = file; _mediaFileName = file.name;
    const subtype = file.type.startsWith('video/') ? 'video' : 'image';
    _showMediaPreview(file, subtype);
  } else if(type === 'document'){
    _fpsOpenSingle(file, 'document');
  }
}

function _fpsOpenSingle(file, type){
  const url     = URL.createObjectURL(file);
  const ext     = (file.name||'').split('.').pop().toUpperCase() || 'FILE';
  const sizeMB  = (file.size / (1024*1024)).toFixed(1);
  const isAudio = type === 'audio';

  let previewHTML = '';
  if(isAudio){
    previewHTML = `
      <div class="fps-single-audio">
        <div class="fps-audio-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
        </div>
        <div class="fps-single-name">${_esc(file.name)}</div>
        <div class="fps-single-size">${sizeMB} MB</div>
        <audio src="${url}" controls class="fps-audio-player"></audio>
      </div>`;
  } else {
    previewHTML = `
      <div class="fps-single-doc">
        <div class="fps-doc-icon">${ext}</div>
        <div class="fps-single-name">${_esc(file.name)}</div>
        <div class="fps-single-size">${sizeMB} MB</div>
      </div>`;
  }

  const ov = document.createElement('div');
  ov.id = 'fpsSingleOverlay';
  ov.className = 'media-full-preview';
  ov.innerHTML = `
    <div class="mfp-topbar">
      <button class="mfp-back" onclick="_fpsSingleClose()">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <span class="mfp-count">${isAudio ? '🎵 Audio' : '📎 Document'}</span>
    </div>
    <div class="mfp-content" style="flex-direction:column;gap:0">${previewHTML}</div>
    <div class="mfp-bottom">
      <div class="mfp-caption-wrap">
        <input class="mfp-caption-input" id="fpsSingleCaption" type="text" placeholder="Caption লিখুন...">
      </div>
      <button class="mfp-send-btn ready" onclick="_fpsSingleSend('${type}')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        Send
      </button>
    </div>`;

  // file reference সেভ করো
  ov._file = file;
  ov._url  = url;
  ov._type = type;

  document.body.appendChild(ov);
  requestAnimationFrame(() => ov.classList.add('open'));
  _pushBack(_fpsSingleClose, 'fpsSingle');
}

function _fpsSingleClose(){
  const ov = document.getElementById('fpsSingleOverlay');
  if(ov){ ov.classList.remove('open'); setTimeout(()=>ov.remove(),220); }
  _popBack();
}

async function _fpsSingleSend(type){
  const ov      = document.getElementById('fpsSingleOverlay');
  if(!ov) return;
  const file    = ov._file;
  const caption = ($('fpsSingleCaption')||{}).value || '';
  _fpsSingleClose();

  // optimistic bubble
  const container = $('chatMessages');
  const blobUrl   = URL.createObjectURL(file);
  let sentRow = null;
  if(container){
    const noMsg = container.querySelector('.chat-no-msgs');
    if(noMsg) container.innerHTML = '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = _buildMsgBubble({
      sender_id:  CU.uid,
      text:       caption || file.name,
      media_url:  blobUrl,
      media_type: type,
      seen:       false,
      created_at: new Date().toISOString()
    }, true).trim();
    sentRow = tempDiv.firstElementChild;
    // progress bar
    const uploadBar = document.createElement('div');
    uploadBar.className = 'msg-upload-bar';
    uploadBar.innerHTML = `<div class="msg-upload-progress" id="mup_single"></div>`;
    sentRow.querySelector('.msg-bubble')?.appendChild(uploadBar);
    container.appendChild(sentRow);
    container.scrollTop = container.scrollHeight;
  }

  try{
    const ext       = file.name.split('.').pop() || (type==='audio'?'mp3':'bin');
    const cloudType = type==='audio' ? 'raw' : 'raw';
    const res = await _uploadToCloudinaryProgress(file, cloudType, ext, file.name, pct => {
      const bar = document.getElementById('mup_single');
      if(bar) bar.style.width = pct + '%';
    });
    sentRow?.querySelector('.msg-upload-bar')?.remove();
    URL.revokeObjectURL(blobUrl);
    await _supaInsertMediaMsg(res.secure_url, type, caption, file.name);
  }catch(e){
    toast('পাঠানো যায়নি','error');
    sentRow?.remove();
  }
}
let _fpsFiles    = [];  // File[]
let _fpsIdx      = 0;   // currently previewed index
let _fpsReady    = [];  // boolean per file (loaded ok)

function _fpsOpen(files){
  _fpsFiles = files.slice();
  _fpsIdx   = 0;
  _fpsReady = new Array(_fpsFiles.length).fill(false);

  // Overlay তৈরি
  const ov = document.createElement('div');
  ov.id = 'fpsOverlay';
  ov.className = 'media-full-preview';
  ov.innerHTML = `
    <div class="mfp-topbar">
      <button class="mfp-back" onclick="_fpsClose()">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <span class="mfp-count" id="mfpCount"></span>
    </div>
    <div class="mfp-content" id="mfpContent">
      <div class="mfp-spinner" id="mfpSpinner"><div class="mfp-spin-ring"></div></div>
    </div>
    <div class="mfp-bottom">
      <div class="mfp-strip-row">
        <div class="mfp-strip" id="mfpStrip"></div>
        <button class="mfp-add-btn" onclick="$('chatAddMoreInput').click()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>
      <div class="mfp-caption-wrap">
        <input class="mfp-caption-input" id="mfpCaption" type="text" placeholder="Caption লিখুন...">
      </div>
      <button class="mfp-send-btn" id="mfpSendBtn" disabled onclick="_fpsSend()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        Send
      </button>
    </div>`;
  document.body.appendChild(ov);
  requestAnimationFrame(() => ov.classList.add('open'));
  _pushBack(_fpsClose, 'fps');
  _fpsLoadAll();
}

function _fpsLoadAll(){
  let loaded = 0;
  const total = _fpsFiles.length;
  _fpsRenderStrip();

  _fpsFiles.forEach((f, i) => {
    const url = URL.createObjectURL(f);
    if(f.type.startsWith('video/')){
      // video → poster via canvas
      const tmp = document.createElement('video');
      tmp.muted = true; tmp.preload = 'metadata'; tmp.src = url;
      tmp.addEventListener('loadedmetadata', () => { tmp.currentTime = 0.001; });
      tmp.addEventListener('seeked', () => {
        _fpsReady[i] = true;
        _fpsUpdateThumb(i, url, f, tmp);
        if(++loaded === total) _fpsOnAllLoaded();
      }, { once: true });
      tmp.addEventListener('error', () => {
        _fpsReady[i] = true;
        if(++loaded === total) _fpsOnAllLoaded();
      }, { once: true });
    } else {
      const img = new Image();
      img.onload = () => {
        _fpsReady[i] = true;
        _fpsUpdateThumb(i, url, f, null);
        if(++loaded === total) _fpsOnAllLoaded();
      };
      img.onerror = () => {
        _fpsReady[i] = true;
        if(++loaded === total) _fpsOnAllLoaded();
      };
      img.src = url;
    }
  });
  _fpsShow(0);
}

function _fpsOnAllLoaded(){
  const spinner = $('mfpSpinner');
  if(spinner) spinner.style.display = 'none';
  const btn = $('mfpSendBtn');
  if(btn){ btn.disabled = false; btn.classList.add('ready'); }
  _fpsShow(_fpsIdx);
}

function _fpsShow(idx){
  _fpsIdx = idx;
  const f   = _fpsFiles[idx];
  const url = URL.createObjectURL(f);
  const content = $('mfpContent');
  if(!content) return;

  // Count
  const countEl = $('mfpCount');
  if(countEl) countEl.textContent = _fpsFiles.length > 1 ? `${idx+1} / ${_fpsFiles.length}` : '';

  if(f.type.startsWith('video/')){
    content.innerHTML = `<div class="mfp-spinner" id="mfpSpinner" style="display:none"><div class="mfp-spin-ring"></div></div>
      <video src="${url}" class="mfp-media-el" controls muted playsinline style="max-width:100%;max-height:100%;border-radius:10px"></video>`;
  } else {
    content.innerHTML = `<div class="mfp-spinner" id="mfpSpinner" style="display:none"><div class="mfp-spin-ring"></div></div>
      <img src="${url}" class="mfp-media-el" style="max-width:100%;max-height:100%;border-radius:10px;object-fit:contain">`;
  }

  // Strip active
  const thumbs = document.querySelectorAll('.mfp-thumb');
  thumbs.forEach((t,i) => t.classList.toggle('active', i === idx));
}

function _fpsRenderStrip(){
  const strip = $('mfpStrip');
  if(!strip) return;
  strip.innerHTML = '';
  _fpsFiles.forEach((f, i) => {
    const div = document.createElement('div');
    div.className = 'mfp-thumb' + (i===_fpsIdx?' active':'');
    div.onclick = () => _fpsShow(i);

    // remove button
    const rm = document.createElement('button');
    rm.className = 'mfp-thumb-rm';
    rm.innerHTML = '✕';
    rm.onclick = e => { e.stopPropagation(); _fpsRemove(i); };

    if(f.type.startsWith('video/')){
      div.innerHTML = `<div class="mfp-thumb-vid-icon">▶</div>`;
    } else {
      const url = URL.createObjectURL(f);
      div.style.backgroundImage = `url(${url})`;
    }
    div.appendChild(rm);
    strip.appendChild(div);
  });
}

function _fpsUpdateThumb(i, url, file, videoEl){
  const thumbs = document.querySelectorAll('.mfp-thumb');
  const th = thumbs[i];
  if(!th) return;
  if(file.type.startsWith('video/') && videoEl){
    try{
      const c = document.createElement('canvas');
      c.width = videoEl.videoWidth || 120; c.height = videoEl.videoHeight || 80;
      c.getContext('2d').drawImage(videoEl, 0, 0, c.width, c.height);
      th.style.backgroundImage = `url(${c.toDataURL('image/jpeg',0.7)})`;
      th.querySelector('.mfp-thumb-vid-icon') && (th.querySelector('.mfp-thumb-vid-icon').style.display='flex');
    }catch(e){}
  }
}

function _fpsRemove(i){
  if(_fpsFiles.length === 1){ _fpsClose(); return; }
  _fpsFiles.splice(i, 1);
  _fpsReady.splice(i, 1);
  _fpsIdx = Math.min(_fpsIdx, _fpsFiles.length - 1);
  _fpsRenderStrip();
  _fpsShow(_fpsIdx);
}

function _fpsAddFiles(input){
  const newFiles = Array.from(input.files || []);
  input.value = '';
  for(const f of newFiles){
    if(f.type.startsWith('image/') && f.size > 10*1024*1024){ toast('ছবি সর্বোচ্চ 10MB','error'); continue; }
    if(f.type.startsWith('video/') && f.size > 50*1024*1024){ toast('ভিডিও সর্বোচ্চ 50MB','error'); continue; }
    _fpsFiles.push(f);
    _fpsReady.push(false);
  }
  _fpsRenderStrip();
  _fpsShow(_fpsIdx);
  // load new files
  newFiles.forEach((f, ni) => {
    const i = _fpsFiles.length - newFiles.length + ni;
    const url = URL.createObjectURL(f);
    if(f.type.startsWith('video/')){
      const tmp = document.createElement('video');
      tmp.muted=true; tmp.preload='metadata'; tmp.src=url;
      tmp.addEventListener('loadedmetadata',()=>{ tmp.currentTime=0.001; });
      tmp.addEventListener('seeked',()=>{ _fpsReady[i]=true; _fpsUpdateThumb(i,url,f,tmp); },{ once:true });
    } else {
      const img = new Image(); img.src = url;
      img.onload = () => { _fpsReady[i]=true; _fpsUpdateThumb(i,url,f,null); };
    }
  });
}

function _fpsClose(){
  const ov = $('fpsOverlay');
  if(ov){ ov.classList.remove('open'); setTimeout(()=>ov.remove(),220); }
  _fpsFiles=[]; _fpsReady=[]; _fpsIdx=0;
  _popBack();
}

async function _supaInsertMediaMsg(mediaUrl, mediaType, text, fileName){
  await _ensureChatRow();
  // সবসময় ফাইলের আসল নাম সেভ করো, caption থাকলে সেটাও
  const msgText = fileName || text || mediaType || 'File';
  const msgBody = {
    chat_id:    _activeChatId,
    sender_id:  CU.uid,
    text:       msgText,
    media_url:  mediaUrl,
    media_type: mediaType,
    seen:       false,
    created_at: new Date().toISOString()
  };
  const inserted = await _supaFetch('/messages',{ method:'POST', body:JSON.stringify(msgBody) });
  if(Array.isArray(inserted) && inserted[0]?.id) _lastMsgId = inserted[0].id;
  const label = mediaType==='image'?'📷 Photo':mediaType==='video'?'🎥 Video':'📎 File';
  _updateChatListPreview(_activeChatId, text||label);
}

async function _fpsSend(){
  const caption = ($('mfpCaption')||{}).value || '';
  const files   = _fpsFiles.slice();
  _fpsClose();

  const container = $('chatMessages');
  if(container){
    const noMsg = container.querySelector('.chat-no-msgs');
    if(noMsg) container.innerHTML = '';
  }

  for(let i=0; i<files.length; i++){
    const f      = files[i];
    const type   = f.type.startsWith('video/') ? 'video' : 'image';
    const cap    = (i === files.length-1) ? caption : '';
    const blobUrl = URL.createObjectURL(f);

    // ── সাথে সাথে local bubble দেখাও ──
    let sentRow = null;
    if(container){
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = _buildMsgBubble({
        sender_id:  CU.uid,
        text:       cap,
        media_url:  blobUrl,
        media_type: type,
        seen:       false,
        created_at: new Date().toISOString(),
        _uploading: true
      }, true).trim();
      sentRow = tempDiv.firstElementChild;
      // uploading indicator
      const uploadBar = document.createElement('div');
      uploadBar.className = 'msg-upload-bar';
      uploadBar.innerHTML = `<div class="msg-upload-progress" id="mup_${i}"></div>`;
      sentRow.querySelector('.msg-bubble')?.appendChild(uploadBar);
      container.appendChild(sentRow);
      container.scrollTop = container.scrollHeight;
    }

    // ── Background upload ──
    try{
      const ext = f.name.split('.').pop() || (type==='video'?'mp4':'jpg');
      const cloudType = type === 'video' ? 'video' : 'image';

      // Progress callback দিয়ে upload
      const res = await _uploadToCloudinaryProgress(f, cloudType, ext, f.name, (pct) => {
        const bar = document.getElementById('mup_' + i);
        if(bar) bar.style.width = pct + '%';
      });

      // Upload done — bubble এ real URL set করো
      if(sentRow){
        const img = sentRow.querySelector('img.msg-media-img');
        const vid = sentRow.querySelector('video, canvas');
        if(img) img.src = res.secure_url;
        // upload bar সরিয়ে দাও
        sentRow.querySelector('.msg-upload-bar')?.remove();
        URL.revokeObjectURL(blobUrl);
      }

      await _supaInsertMediaMsg(res.secure_url, type, cap, f.name);
    }catch(e){
      toast('পাঠানো যায়নি','error');
      if(sentRow) sentRow.remove();
    }
  }
}

function _showMediaPreview(blob, type){
  const preview = $('chatMediaPreview');
  const content = $('cmpContent');
  const fname   = $('cmpFilename');
  if(!preview || !content) return;

  const url = URL.createObjectURL(blob);
  if(type === 'image'){
    content.innerHTML = `<img src="${url}" style="max-width:100%;max-height:180px;border-radius:10px;object-fit:cover">`;
  } else if(type === 'video'){
    content.innerHTML = `<video src="${url}" style="max-width:100%;max-height:180px;border-radius:10px" controls muted></video>`;
  } else if(type === 'voice' || type === 'audio'){
    content.innerHTML = `<audio src="${url}" controls style="width:100%;border-radius:10px"></audio>`;
  } else {
    const ext = (_mediaFileName||'').split('.').pop().toUpperCase()||'FILE';
    content.innerHTML = `<div class="doc-preview-box"><div class="doc-ext">${ext}</div><div class="doc-name">${_esc(_mediaFileName||'document')}</div></div>`;
  }
  if(fname){
    if(type==='image')         fname.textContent = '📷 Photo';
    else if(type==='video')    fname.textContent = '🎥 Video';
    else if(type==='voice')    fname.textContent = '🎤 Voice message';
    else if(type==='audio')    fname.textContent = '🎵 ' + (_mediaFileName || 'Audio');
    else fname.textContent = '📎 ' + (_mediaFileName || 'Document');
  }
  preview.style.display = 'flex';
}

function _clearMedia(){
  _mediaBlob = null; _mediaType = null; _mediaFileName = null;
  const preview = $('chatMediaPreview');
  if(preview) preview.style.display = 'none';
}

async function _uploadToCloudinary(blob, resourceType, ext, filename){
  const fd = new FormData();
  fd.append('file', blob, filename || ('media.' + ext));
  fd.append('upload_preset', CLOUDINARY_PRESET);
  fd.append('folder', 'vocall_chat');
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/${resourceType}/upload`,
    { method:'POST', body:fd }
  );
  if(!res.ok) throw new Error('Upload failed');
  return await res.json();
}

// Progress callback সহ upload (XHR)
function _uploadToCloudinaryProgress(blob, resourceType, ext, filename, onProgress){
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append('file', blob, filename || ('media.' + ext));
    fd.append('upload_preset', CLOUDINARY_PRESET);
    fd.append('folder', 'vocall_chat');
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/${resourceType}/upload`);
    xhr.upload.onprogress = e => {
      if(e.lengthComputable && onProgress) onProgress(Math.round(e.loaded/e.total*100));
    };
    xhr.onload = () => {
      if(xhr.status >= 200 && xhr.status < 300){
        try{ resolve(JSON.parse(xhr.responseText)); }
        catch(e){ reject(e); }
      } else { reject(new Error('Upload failed: ' + xhr.status)); }
    };
    xhr.onerror = () => reject(new Error('Upload network error'));
    xhr.send(fd);
  });
}

function _viewMedia(url, type){
  const ov = document.createElement('div');
  ov.className = 'mv-overlay';
  ov.innerHTML = `<img src="${url}" class="mv-img">`;
  ov.onclick = () => { ov.classList.remove('open'); setTimeout(()=>ov.remove(),220); _popBack(); };
  document.body.appendChild(ov);
  requestAnimationFrame(() => ov.classList.add('open'));
  _pushBack(() => { ov.classList.remove('open'); setTimeout(()=>ov.remove(),220); }, 'imgview');
}

// Download
function _dlMedia(url, type){
  fetch(url)
    .then(r => r.blob())
    .then(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const seg = url.split('/');
      a.download = decodeURIComponent(seg[seg.length-1].split('?')[0]) || ('file.' + type);
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    })
    .catch(() => {
      const a = document.createElement('a');
      a.href = url; a.download = ''; a.target = '_blank';
      document.body.appendChild(a); a.click();
      setTimeout(() => a.remove(), 500);
    });
}

// HELPERS — time formatting

function _formatLastSeen(ts){
  if(!ts) return '';
  const d   = new Date(ts);
  const now = new Date();
  const diff = now - d; // ms
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(diff / 3600000);

  if(mins < 1)   return 'Just now';
  if(mins < 60)  return `${mins} min ago`;
  if(hrs  < 24)  return d.toLocaleTimeString('en-BD',{hour:'2-digit',minute:'2-digit',hour12:true});
  const yesterday = new Date(now); yesterday.setDate(now.getDate()-1);
  if(d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  if(diff < 7 * 86400000) return d.toLocaleDateString('en-BD',{weekday:'long'});
  return d.toLocaleDateString('en-BD',{day:'numeric',month:'short'});
}

function _formatMsgTime(iso){
  if(!iso) return '';
  return new Date(iso).toLocaleTimeString('en-BD',{hour:'2-digit',minute:'2-digit',hour12:true});
}

function _formatMsgDate(iso){
  if(!iso) return '';
  const d   = new Date(iso);
  const now = new Date();
  if(d.toDateString() === now.toDateString()) return 'আজ';
  const yesterday = new Date(now); yesterday.setDate(now.getDate()-1);
  if(d.toDateString() === yesterday.toDateString()) return 'গতকাল';
  return d.toLocaleDateString('bn-BD',{day:'numeric',month:'long',year:'numeric'});
}

function _formatRelTime(ts){
  const d   = new Date(ts);
  const now = new Date();
  const diff = now - d;
  if(diff < 60000) return 'just now';
  if(diff < 3600000) return Math.floor(diff/60000) + 'm ago';
  if(diff < 86400000) return Math.floor(diff/3600000) + 'h ago';
  return d.toLocaleDateString();
}

// MESSAGE SELECTION & ACTIONS

// touch state
let _touchStartX = 0, _touchStartY = 0, _touchRow = null, _lpTimer = null;

function _attachMsgPressListeners(root){
  if(window._chatDelegated) return;
  window._chatDelegated = true;

  const getRow = e => e.target.closest('.msg-row');

  document.addEventListener('touchstart', e => {
    const row = getRow(e);
    if(!row) return;
    _touchRow    = row;
    _touchStartX = e.touches[0].clientX;
    _touchStartY = e.touches[0].clientY;
    if(_selectMode) return;
    clearTimeout(_lpTimer);
    _lpTimer = setTimeout(() => {
      _touchRow = null;
      _triggerMsgSelect(row);
    }, 500);
  }, { passive:true });

  document.addEventListener('touchmove', e => {
    const dx = Math.abs(e.touches[0].clientX - _touchStartX);
    const dy = Math.abs(e.touches[0].clientY - _touchStartY);
    if(dx > 8 || dy > 8) clearTimeout(_lpTimer);
    if(_selectMode || !_touchRow) return;
    const dxS = e.touches[0].clientX - _touchStartX;
    if(dx > dy && dx > 10){
      const b = _touchRow.querySelector('.msg-bubble');
      if(b){
        const clamp = Math.min(dx, 60) * Math.sign(dxS);
        b.style.transition = 'none';
        b.style.transform  = `translateX(${clamp}px)`;
        _touchRow.classList.toggle('swipe-reply-hint', dx >= 40);
      }
    }
  }, { passive:true });

  document.addEventListener('touchend', e => {
    clearTimeout(_lpTimer);
    const row = _touchRow;
    _touchRow = null;
    if(!row) return;
    const dx = Math.abs((e.changedTouches[0]?.clientX||0) - _touchStartX);
    if(_selectMode){
      if(dx < 15) _toggleSelectRow(row);
      return;
    }
    const b = row.querySelector('.msg-bubble');
    if(b){
      const tx = parseFloat(b.style.transform.replace('translateX(',''))||0;
      b.style.transition = 'transform .2s ease';
      b.style.transform  = 'translateX(0)';
      if(Math.abs(tx) >= 40){
        try{
          _selectedMsg = JSON.parse(decodeURIComponent(row.dataset.msg));
          _replyMsg();
        }catch(_){}
      }
    }
    row.classList.remove('swipe-reply-hint');
  }, { passive:true });

  document.addEventListener('contextmenu', e => {
    const row = getRow(e);
    if(!row) return;
    e.preventDefault();
    _triggerMsgSelect(row);
  });
}

function _toggleSelectRow(row){
  const msgId  = row.dataset.msgid;
  const msgEnc = row.dataset.msg;
  if(!msgId || !msgEnc) return;
  let msgData;
  try{ msgData = JSON.parse(decodeURIComponent(msgEnc)); }catch(_){ return; }
  if(_selectedMsgs.has(msgId)){
    _selectedMsgs.delete(msgId);
    row.classList.remove('selected');
  } else {
    _selectedMsgs.set(msgId, msgData);
    row.classList.add('selected');
  }
  const cnt = $('selCount');
  if(cnt) cnt.textContent = _selectedMsgs.size;
}

function _setActiveBtn(btn){
  document.querySelectorAll('.chat-act-btn.btn-active').forEach(b => b.classList.remove('btn-active'));
  if(btn) btn.classList.add('btn-active');
  // ৫০০ms পরে নিজেই সরাও
  setTimeout(() => btn?.classList.remove('btn-active'), 500);
}

function _enterSelectMode(){
  _selectMode = true;
  _selectedMsgs.clear();
  if(_selectedMsg){
    const id = String(_selectedMsg.id);
    _selectedMsgs.set(id, _selectedMsg);
    const row = document.querySelector(`.msg-row[data-msgid="${id}"]`);
    if(row) row.classList.add('selected');
  }
  const cnt = $('selCount');
  if(cnt) cnt.textContent = _selectedMsgs.size;
  // Select বাটন highlight
  document.querySelectorAll('.chat-act-btn').forEach(b => b.classList.remove('btn-active'));
  const sb = $('selModeBtn');
  if(sb) sb.classList.add('btn-active');
  _hideAllReactionBars();
}

function _triggerMsgSelect(el){
  const msgId  = el.dataset.msgid;
  const msgEnc = el.dataset.msg;
  if(!msgId || !msgEnc) return;
  try{ _selectedMsg = JSON.parse(decodeURIComponent(msgEnc)); }
  catch(_){ return; }

  // Highlight selected bubble
  document.querySelectorAll('.msg-row.selected').forEach(r => r.classList.remove('selected'));
  const row = document.querySelector(`.msg-row[data-msgid="${_selectedMsg.id}"]`);
  if(row) row.classList.add('selected');

  // Show reaction bar
  _hideAllReactionBars();
  const rxbar = $('rxbar-' + _selectedMsg.id);
  if(rxbar) rxbar.style.display = 'flex';

  // Show selection topbar
  $('chatTopbarNormal').style.display = 'none';
  $('chatTopbarSel').style.display    = 'flex';
  _pushBack(_clearMsgSelection, 'msgsel');

  // Dismiss on outside click
  setTimeout(() => {
    document.addEventListener('click', _onOutsideSelClick, { once: true });
  }, 50);
}

function _onOutsideSelClick(e){
  const row = e.target.closest('.msg-row');
  const rxbar = e.target.closest('.msg-reaction-bar');
  const selBar = e.target.closest('#chatTopbarSel');
  if(!row && !rxbar && !selBar) _clearMsgSelection();
  else if(row && !rxbar && !selBar) _clearMsgSelection();
}

function _clearMsgSelection(){
  _popBack();
  _selectedMsg = null;
  document.querySelectorAll('.msg-row.selected').forEach(el => el.classList.remove('selected'));
  _hideAllReactionBars();
  const n = $('chatTopbarNormal'), s = $('chatTopbarSel');
  if(n) n.style.display = 'flex';
  if(s) s.style.display = 'none';
  document.removeEventListener('click', _onOutsideSelClick);
}

function _hideAllReactionBars(){
  document.querySelectorAll('.msg-reaction-bar').forEach(el => el.style.display = 'none');
}

function _sendReaction(emoji){
  if(!_selectedMsg) return;
  const msgId = _selectedMsg.id;
  _clearMsgSelection();

  // DOM-এ তাৎক্ষণিক দেখাও
  _addReactionPill(msgId, emoji, CU.uid, true);

  // Firebase RTDB-তে সেভ করো
  if(_getRtdb() && msgId){
    _getRtdb().ref('reactions/' + _activeChatId + '/' + msgId + '/' + CU.uid).set(emoji);
  }
}

function _addReactionPill(msgId, emoji, senderUid, isMe){
  const el = $('rxshow-' + msgId);
  if(!el) return;
  // পুরনো আমার reaction সরাও
  if(isMe){
    const old = el.querySelector('.my-rx');
    if(old) old.remove();
  }
  // একই emoji আগে থেকে আছে? count বাড়াও
  const existing = Array.from(el.querySelectorAll('.msg-reaction-pill'))
    .find(p => p.dataset.emoji === emoji);
  if(existing){
    const cnt = existing.querySelector('span');
    if(cnt) cnt.textContent = parseInt(cnt.textContent||'1') + 1;
  } else {
    const pill = document.createElement('div');
    pill.className = 'msg-reaction-pill' + (isMe ? ' my-rx' : '');
    pill.dataset.emoji = emoji;
    pill.textContent = emoji;
    const cnt = document.createElement('span');
    cnt.textContent = '1';
    pill.appendChild(cnt);
    el.appendChild(pill);
  }
}

function _watchReactions(chatId){
  if(!_getRtdb()) return;
  _getRtdb().ref('reactions/' + chatId).on('value', snap => {
    const data = snap.val() || {};
    // সব msg-এর reactions update করো
    Object.entries(data).forEach(([msgId, userReactions]) => {
      const el = $('rxshow-' + msgId);
      if(!el) return;
      el.innerHTML = '';
      // emoji count করো
      const counts = {};
      Object.entries(userReactions).forEach(([uid, emoji]) => {
        if(!counts[emoji]) counts[emoji] = { count:0, mine:false };
        counts[emoji].count++;
        if(uid === CU?.uid) counts[emoji].mine = true;
      });
      Object.entries(counts).forEach(([emoji, info]) => {
        const pill = document.createElement('div');
        pill.className = 'msg-reaction-pill' + (info.mine ? ' my-rx' : '');
        pill.dataset.emoji = emoji;
        pill.textContent = emoji;
        if(info.count > 1){
          const cnt = document.createElement('span');
          cnt.textContent = info.count;
          pill.appendChild(cnt);
        }
        el.appendChild(pill);
      });
    });
  });
}

function _copyMsg(){
  let texts = [];
  if(_selectedMsgs.size > 0){
    texts = [..._selectedMsgs.values()].map(m => m.text||'').filter(Boolean);
  } else if(_selectedMsg?.text){
    texts = [_selectedMsg.text];
  }
  if(!texts.length){ toast('কপি করার মতো text নেই','error'); _clearMsgSelection(); return; }
  const combined = texts.join(' | ');
  if(navigator.clipboard?.writeText){
    navigator.clipboard.writeText(combined).then(() => toast('Copied!','')).catch(() => {
      _fallbackCopy(combined);
    });
  } else {
    _fallbackCopy(combined);
  }
  _clearMsgSelection();
}

function _fallbackCopy(text){
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position='fixed'; ta.style.opacity='0';
  document.body.appendChild(ta); ta.focus(); ta.select();
  try{ document.execCommand('copy'); toast('Copied!',''); }
  catch(_){ toast('Copy failed','error'); }
  document.body.removeChild(ta);
}

function _replyMsg(){
  if(!_selectedMsg) return;
  const text = _selectedMsg.text || '📎 Media';
  // Reply preview যোগ করো input এর উপরে
  let rp = $('replyPreview');
  if(!rp){
    rp = document.createElement('div');
    rp.id = 'replyPreview';
    rp.className = 'reply-preview';
    const bar = document.querySelector('.chat-input-bar');
    if(bar) bar.parentNode.insertBefore(rp, bar);
  }
  const preview = text.length > 50 ? text.slice(0,50) + '…' : text;
  rp.innerHTML = `
    <div class="reply-inner">
      <div class="reply-line"></div>
      <div class="reply-text">${_esc(preview)}</div>
      <button class="reply-close" onclick="_clearReply()">✕</button>
    </div>`;
  rp.style.display = 'flex';
  rp.dataset.replyId   = _selectedMsg.id || '';
  rp.dataset.replyText = text;
  const inp = $('chatInput');
  if(inp){ inp.removeAttribute('readonly'); inp.focus(); }
  _clearMsgSelection();
}

function _scrollToMsg(msgId){
  if(!msgId) return;
  const row = document.querySelector(`.msg-row[data-msgid="${msgId}"]`);
  if(!row){
    toast('মেসেজটি আর নেই','');
    return;
  }
  // scroll to
  row.scrollIntoView({ behavior:'smooth', block:'center' });
  // highlight
  row.classList.add('msg-highlight');
  setTimeout(() => row.classList.remove('msg-highlight'), 1500);
}

function _clearReply(){
  const rp = $('replyPreview');
  if(rp){ rp.style.display = 'none'; rp.dataset.replyId=''; rp.dataset.replyText=''; }
}

async function _deleteMsg(){
  const msgsToDelete = _selectedMsgs.size > 0
    ? [..._selectedMsgs.values()]
    : _selectedMsg ? [_selectedMsg] : [];

  if(!msgsToDelete.length) return;

  const myMsgs = msgsToDelete.filter(m => m.sender_id === CU?.uid);
  if(!myMsgs.length){ toast('শুধু নিজের message মুছতে পারবেন','error'); _clearMsgSelection(); return; }

  try{
    const ids = myMsgs.map(m => m.id);
    const now  = new Date().toISOString();
    const BATCH = 50; // প্রতি request এ ৫০টা

    // Batch করে পাঠাও — যত বেশি হোক সব delete হবে
    for(let i = 0; i < ids.length; i += BATCH){
      const chunk = ids.slice(i, i + BATCH);
      const idFilter = chunk.map(id => `id.eq.${id}`).join(',');
      await _supaFetch(`/messages?or=(${idFilter})`, {
        method: 'PATCH',
        body: JSON.stringify({ deleted: true, deleted_at: now })
      });
    }

    // UI থেকে সরাও
    ids.forEach(id => {
      const row = document.querySelector(`.msg-row[data-msgid="${id}"]`);
      if(row) row.remove();
    });
    toast(`${ids.length}টি message deleted`, '');
  }catch(_){ toast('Delete failed','error'); }
  _clearMsgSelection();
}

// FORWARD

let _fwdChatList = []; // chat list cache for forward

async function _forwardMsgOpen(){
  if(_selectedMsgs.size === 0 && !_selectedMsg) return;
  _forwardMsg = _selectedMsg; // last selected (single forward)
  // multi-forward: _selectedMsgs use করবে _doForward
  _clearMsgSelection();

  const fwd = $('forwardScreen');
  if(!fwd) return;
  fwd.classList.add('open');
  _pushBack(_closeForward, 'forward');

  // Load chat list for forward
  const listEl = $('forwardList');
  if(listEl) listEl.innerHTML = `<div style="text-align:center;padding:40px"><div class="spin"></div></div>`;

  try{
    const rows = await _supaFetch(
      `/chats?or=(user1.eq.${CU.uid},user2.eq.${CU.uid})&order=last_message_time.desc.nullslast`
    );
    const peerUids = rows.map(r => r.user1===CU.uid ? r.user2 : r.user1);
    const peerSnaps = await Promise.all(peerUids.map(uid => db.collection('users').where('uid','==',uid).limit(1).get()));
    _fwdChatList = [];
    peerSnaps.forEach((snap,i) => {
      if(!snap.empty){
        const p = snap.docs[0].data();
        _fwdChatList.push({ uid: peerUids[i], chatId: rows[i].id, name: p.name||'Unknown', photo: p.photoURL||'', peer: p });
      }
    });
    _renderForwardList(_fwdChatList);
  }catch(_){
    if(listEl) listEl.innerHTML = `<div style="text-align:center;color:var(--danger);padding:20px">লোড হয়নি</div>`;
  }
}

function _renderForwardList(list){
  const listEl = $('forwardList');
  if(!listEl) return;
  if(!list.length){ listEl.innerHTML = `<div class="chat-empty-sub" style="padding:40px;text-align:center">কোনো chat নেই</div>`; return; }
  listEl.innerHTML = list.map(p => {
    const safePhoto = (p.photo||'').startsWith('https://') ? p.photo : '';
    const avHTML = safePhoto ? `<img src="${safePhoto}">` : `<span>${(p.name[0]||'?').toUpperCase()}</span>`;
    return `<div class="fwd-item" onclick="_doForward('${_esc(p.chatId)}','${_esc(p.uid)}')">
      <div class="fwd-av">${avHTML}</div>
      <div class="fwd-name">${_esc(p.name)}${_verifiedBadge(p.peer)}</div>
    </div>`;
  }).join('');
}

function _filterForwardList(q){
  if(!q.trim()){ _renderForwardList(_fwdChatList); return; }
  const filtered = _fwdChatList.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));
  _renderForwardList(filtered);
}

async function _doForward(chatId, peerUid){
  if(!chatId || !peerUid || !CU) return;

  // কোন messages forward করব
  let msgsToFwd = [];
  if(_selectedMsgs.size > 0){
    msgsToFwd = [..._selectedMsgs.values()];
  } else if(_forwardMsg){
    msgsToFwd = [_forwardMsg];
  } else if(_selectedMsg){
    msgsToFwd = [_selectedMsg];
  }
  if(!msgsToFwd.length){ toast('কোন message নেই','error'); return; }

  _closeForward();
  try{
    const fwdChatId = _getChatId(CU.uid, peerUid);
    // chat row নিশ্চিত করো
    const existing = await _supaFetch(`/chats?id=eq.${fwdChatId}`);
    if(!existing.length){
      const uids = fwdChatId.split('__').sort();
      await _supaFetch('/chats',{ method:'POST', body: JSON.stringify({
        id: fwdChatId, user1: uids[0], user2: uids[1],
        last_message:'', last_message_time: new Date().toISOString(),
        unread_count:0, created_at: new Date().toISOString()
      })});
    }
    // আলাদা আলাদা message পাঠাও
    let lastText = '';
    for(const msg of msgsToFwd){
      const text     = msg.text || '';
      const mediaUrl = msg.media_url || '';
      const mediaType= msg.media_type || '';
      await _supaFetch('/messages',{ method:'POST', body: JSON.stringify({
        chat_id: fwdChatId, sender_id: CU.uid,
        text, media_url: mediaUrl, media_type: mediaType,
        seen: false, created_at: new Date().toISOString()
      })});
      lastText = mediaUrl ? '📎 Forwarded' : text;
    }
    await _supaFetch(`/chats?id=eq.${fwdChatId}`,{ method:'PATCH', body: JSON.stringify({
      last_message: lastText, last_message_time: new Date().toISOString(), last_sender_id: CU.uid, unread_count:1
    })});
    toast(`✓ ${msgsToFwd.length}টি message forward হয়েছে`,'');
    _forwardMsg = null;
    _clearMsgSelection();
  }catch(err){
    console.error('Forward error:', err);
    toast('Forward failed: ' + (err.message||'').slice(0,50),'error');
  }
}

function _closeForward(){
  _popBack();
  const fwd = $('forwardScreen');
  if(fwd) fwd.classList.remove('open');
  _forwardMsg = null;
}

// EMOJI PICKER

const EMOJI_LIST = [
  '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇',
  '🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚',
  '😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔',
  '🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥',
  '😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧',
  '🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐',
  '😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦',
  '😧','😨','😰','😥','😢','😭','😱','😖','😣','😞',
  '😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿',
  '💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖',
  '👋','🤚','🖐','✋','🖖','👌','🤌','🤏','✌️','🤞',
  '🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍',
  '👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🙏',
  '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔',
  '🔥','⭐','✨','💫','💥','💢','💦','💨','🎉','🎊',
];

function _toggleEmojiPicker(){
  const panel = $('emojiPickerPanel');
  if(!panel) return;
  if(panel.style.display !== 'none'){
    panel.style.display = 'none';
    return;
  }
  // Build if empty
  if(!panel.innerHTML){
    panel.innerHTML = EMOJI_LIST.map(e =>
      `<button class="ep-btn" onclick="_insertEmoji('${e}')">${e}</button>`
    ).join('');
  }
  panel.style.display = 'grid';
  setTimeout(() => document.addEventListener('click', _emojiOutsideClick, { once:true }), 50);
}

function _emojiOutsideClick(e){
  const panel = $('emojiPickerPanel');
  const btn   = $('emojiPickerBtn');
  if(panel && !panel.contains(e.target) && (!btn || !btn.contains(e.target))){
    panel.style.display = 'none';
  }
}

function _insertEmoji(emoji){
  const inp = $('chatInput');
  if(!inp) return;
  const pos = inp.selectionStart || inp.value.length;
  inp.value = inp.value.slice(0,pos) + emoji + inp.value.slice(pos);
  inp.removeAttribute('readonly');
  inp.focus();
  inp.selectionStart = inp.selectionEnd = pos + emoji.length;
  _autoResize(inp);
  const panel = $('emojiPickerPanel');
  if(panel) panel.style.display = 'none';
}

// STAR MESSAGE

function _starMsg(){
  if(!_selectedMsg) return;
  const msgId = String(_selectedMsg.id);
  if(!_getRtdb() || !CU || !msgId){ _clearMsgSelection(); return; }

  const ref = _getRtdb().ref('starred/' + CU.uid + '/' + msgId);
  const row = document.querySelector(`.msg-row[data-msgid="${msgId}"]`);

  // DOM badge দেখে star আছে কিনা বোঝো (data চেয়ে বেশি reliable)
  const alreadyStarred = !!(row && row.querySelector('.msg-star-badge'));

  if(alreadyStarred){
    ref.remove();
    toast('★ Star সরানো হয়েছে','');
    if(row) row.querySelector('.msg-star-badge')?.remove();
  } else {
    ref.set({ text: _selectedMsg.text||'', chatId: _activeChatId, ts: Date.now() });
    toast('⭐ Star করা হয়েছে!','');
    if(row){
      const meta = row.querySelector('.msg-meta');
      if(meta && !row.querySelector('.msg-star-badge')){
        const b = document.createElement('span');
        b.className = 'msg-star-badge';
        b.textContent = '⭐';
        meta.insertBefore(b, meta.firstChild);
      }
    }
  }
  _clearMsgSelection();
}

// PIN MESSAGE

function _pinMsg(){
  if(!_selectedMsg || !_activeChatId) return;
  const text = _selectedMsg.text || '📎 Media';
  const msgId = _selectedMsg.id;
  if(_getRtdb()){
    _getRtdb().ref('pinned/' + _activeChatId).set({ msgId, text, ts: Date.now() });
  }
  _showPinnedBar(text, msgId);
  toast('📌 Pinned!','');
  _clearMsgSelection();
}

function _unpinMsg(){
  if(_getRtdb() && _activeChatId){
    _getRtdb().ref('pinned/' + _activeChatId).remove();
  }
  const bar = $('pinnedMsgBar');
  if(bar) bar.style.display = 'none';
}

function _showPinnedBar(text, msgId){
  const bar = $('pinnedMsgBar');
  const txt = $('pinnedMsgText');
  if(!bar) return;
  if(txt) txt.textContent = text.slice(0,60);
  bar.dataset.msgid = msgId||'';
  bar.style.display = 'flex';
}

function _scrollToPinned(){
  const bar = $('pinnedMsgBar');
  const msgId = bar?.dataset.msgid;
  if(!msgId) return;
  const row = document.querySelector(`.msg-row[data-msgid="${msgId}"]`);
  if(row) row.scrollIntoView({ behavior:'smooth', block:'center' });
}

function _watchPinned(chatId){
  if(!_getRtdb()) return;
  _getRtdb().ref('pinned/' + chatId).on('value', snap => {
    const data = snap.val();
    if(data){ _showPinnedBar(data.text, data.msgId); }
    else { const bar=$('pinnedMsgBar'); if(bar) bar.style.display='none'; }
  });
}

// MESSAGE SEARCH

let _searchResults = [];
let _searchIdx     = 0;

function _toggleMsgSearch(){
  const bar = $('msgSearchBar');
  if(!bar) return;
  if(bar.style.display !== 'none'){
    _closeMsgSearch();
  } else {
    bar.style.display = 'flex';
    const inp = $('msgSearchInp');
    if(inp) inp.focus();
    _pushBack(_closeMsgSearch, 'msgsearch');
  }
}

function _closeMsgSearch(){
  _popBack();
  const bar = $('msgSearchBar');
  if(bar) bar.style.display = 'none';
  document.querySelectorAll('.msg-row.search-hl').forEach(r => r.classList.remove('search-hl','search-hl-active'));
  _searchResults = []; _searchIdx = 0;
  const cnt = $('msgSearchCount'); if(cnt) cnt.textContent = '';
}

function _searchMessages(q){
  document.querySelectorAll('.msg-row.search-hl').forEach(r => r.classList.remove('search-hl','search-hl-active'));
  _searchResults = []; _searchIdx = 0;
  const cnt = $('msgSearchCount');
  if(!q.trim()){ if(cnt) cnt.textContent=''; return; }
  const rows = document.querySelectorAll('.msg-row');
  rows.forEach(row => {
    const txt = row.querySelector('.msg-text,.msg-media-caption');
    if(txt && txt.textContent.toLowerCase().includes(q.toLowerCase())){
      row.classList.add('search-hl');
      _searchResults.push(row);
    }
  });
  if(_searchResults.length){
    _searchResults[0].classList.add('search-hl-active');
    _searchResults[0].scrollIntoView({ behavior:'smooth', block:'center' });
  }
  if(cnt) cnt.textContent = _searchResults.length ? `1/${_searchResults.length}` : 'Not found';
}

function _nextSearchResult(){
  if(!_searchResults.length) return;
  _searchResults[_searchIdx].classList.remove('search-hl-active');
  _searchIdx = (_searchIdx + 1) % _searchResults.length;
  _searchResults[_searchIdx].classList.add('search-hl-active');
  _searchResults[_searchIdx].scrollIntoView({ behavior:'smooth', block:'center' });
  const cnt = $('msgSearchCount');
  if(cnt) cnt.textContent = `${_searchIdx+1}/${_searchResults.length}`;
}

function _prevSearchResult(){
  if(!_searchResults.length) return;
  _searchResults[_searchIdx].classList.remove('search-hl-active');
  _searchIdx = (_searchIdx - 1 + _searchResults.length) % _searchResults.length;
  _searchResults[_searchIdx].classList.add('search-hl-active');
  _searchResults[_searchIdx].scrollIntoView({ behavior:'smooth', block:'center' });
  const cnt = $('msgSearchCount');
  if(cnt) cnt.textContent = `${_searchIdx+1}/${_searchResults.length}`;
}

// POLL

function _openPollCreator(){
  _closeAttachMenu();
  let overlay = $('pollOverlay');
  if(!overlay){
    overlay = document.createElement('div');
    overlay.id = 'pollOverlay';
    overlay.className = 'poll-overlay';
    overlay.innerHTML = `
      <div class="poll-modal">
        <div class="poll-modal-hdr">
          <span>Create Poll</span>
          <button onclick="_closePollCreator()">✕</button>
        </div>
        <input id="pollQuestion" class="poll-inp" placeholder="Question..." maxlength="200">
        <div id="pollOptions">
          <input class="poll-inp poll-opt-inp" placeholder="Option 1" maxlength="100">
          <input class="poll-inp poll-opt-inp" placeholder="Option 2" maxlength="100">
        </div>
        <button class="poll-add-opt" onclick="_addPollOption()">+ Add option</button>
        <button class="poll-send-btn" onclick="_sendPoll()">Send Poll</button>
      </div>`;
    document.body.appendChild(overlay);
  }
  overlay.style.display = 'flex';
  _pushBack(_closePollCreator, 'poll');
}

function _closePollCreator(){
  _popBack();
  const o = $('pollOverlay'); if(o) o.style.display='none';
}

function _addPollOption(){
  const opts = $('pollOptions');
  if(!opts || opts.children.length >= 6) return;
  const inp = document.createElement('input');
  inp.className = 'poll-inp poll-opt-inp';
  inp.placeholder = `Option ${opts.children.length+1}`;
  inp.maxLength = 100;
  opts.appendChild(inp);
}

async function _sendPoll(){
  const q = $('pollQuestion')?.value?.trim();
  const opts = Array.from(document.querySelectorAll('.poll-opt-inp')).map(i=>i.value.trim()).filter(Boolean);
  if(!q || opts.length < 2){ toast('Question and 2+ options required','error'); return; }
  _closePollCreator();
  const pollData = { question:q, options:opts, votes:{}, voters:{} };

  // ── সাথে সাথে chat এ দেখাও (optimistic) ──
  const container = $('chatMessages');
  let optimisticRow = null;
  if(container){
    const noMsg = container.querySelector('.chat-no-msgs');
    if(noMsg) container.innerHTML = '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = _buildMsgBubble({
      sender_id:  CU.uid,
      text:       JSON.stringify(pollData),
      media_type: 'poll',
      media_url:  '',
      seen:       false,
      created_at: new Date().toISOString()
    }, true).trim();
    optimisticRow = tempDiv.firstElementChild;
    container.appendChild(optimisticRow);
    container.scrollTop = container.scrollHeight;
  }

  try{
    await _ensureChatRow();
    await _supaFetch('/messages',{ method:'POST', body: JSON.stringify({
      chat_id: _activeChatId, sender_id: CU.uid,
      text: JSON.stringify(pollData), media_type:'poll',
      media_url:'', seen:false, created_at: new Date().toISOString()
    })});
    await _supaFetch(`/chats?id=eq.${_activeChatId}`,{ method:'PATCH', body: JSON.stringify({
      last_message:'📊 Poll: '+q, last_message_time:new Date().toISOString(), unread_count:1
    })});
    _updateChatListPreview(_activeChatId, '📊 Poll: '+q);
  }catch(_){
    toast('Poll send failed','error');
    if(optimisticRow) optimisticRow.remove();
  }
}

async function _votePoll(msgId, optIdx){
  if(!CU || !msgId) return;
  const db = _getRtdb();
  if(!db){ toast('Vote failed','error'); return; }

  const ref = db.ref('polls/' + _activeChatId + '/' + msgId);

  // আগে current data পড়ো
  const snap = await ref.once('value');
  const data = snap.val() || {};
  const votes  = data.votes  || {};  // { uid: optIdx }
  const counts = data.counts || {};  // { optIdx: count }

  // আগের vote ছিলে? তাহলে সেটা সরাও
  const prevOpt = votes[CU.uid];
  if(prevOpt !== undefined && prevOpt !== null){
    if(prevOpt === optIdx){
      toast('ইতোমধ্যে ভোট দিয়েছেন','');
      return;
    }
    counts[prevOpt] = Math.max(0, (counts[prevOpt]||0) - 1);
  }

  // নতুন vote যোগ করো
  votes[CU.uid] = optIdx;
  counts[optIdx] = (counts[optIdx]||0) + 1;

  await ref.update({ votes, counts });
  toast('✓ ভোট দেওয়া হয়েছে!', '');
}

// ── Poll votes real-time watch ──
function _watchPolls(chatId){
  const db = _getRtdb();
  if(!db) return;
  db.ref('polls/' + chatId).on('value', snap => {
    const allPolls = snap.val() || {};
    Object.entries(allPolls).forEach(([msgId, data]) => {
      _updatePollUI(msgId, data);
    });
  });
}

function _updatePollUI(msgId, data){
  const row = document.querySelector(`.msg-row[data-msgid="${msgId}"]`);
  if(!row) return;
  const counts = data.counts || {};
  const votes  = data.votes  || {};
  const totalVotes = Object.values(counts).reduce((a,b) => a + (b||0), 0);
  const myVote = CU ? votes[CU.uid] : undefined;

  const optEls = row.querySelectorAll('.poll-opt');
  optEls.forEach((el, i) => {
    const v   = counts[i] || 0;
    const pct = totalVotes ? Math.round(v / totalVotes * 100) : 0;
    const bar = el.querySelector('.poll-opt-bar');
    const pctEl = el.querySelector('.poll-opt-pct');
    const cntEl = el.querySelector('.poll-opt-cnt');
    if(bar)   bar.style.width = pct + '%';
    if(pctEl) pctEl.textContent = pct + '%';
    if(cntEl) cntEl.textContent = v + ' vote' + (v !== 1 ? 's' : '');
    // আমার vote হলে highlight
    el.classList.toggle('my-vote', myVote === i);
  });

  // total votes counter আপডেট
  const totalEl = row.querySelector('.poll-total');
  if(totalEl) totalEl.textContent = totalVotes + ' vote' + (totalVotes !== 1 ? 's' : '');
}

// LOCATION

function _sendLocation(){
  _closeAttachMenu();
  if(!navigator.geolocation){ toast('Location not supported','error'); return; }
  toast('Getting location...','');
  navigator.geolocation.getCurrentPosition(async pos => {
    const lat = pos.coords.latitude.toFixed(6);
    const lng = pos.coords.longitude.toFixed(6);
    const locData = { lat, lng, name: `${lat}, ${lng}` };
    const createdAt = new Date().toISOString();

    // ── সাথে সাথে দেখাও ──
    const container = $('chatMessages');
    let optimisticRow = null;
    if(container){
      const noMsg = container.querySelector('.chat-no-msgs');
      if(noMsg) container.innerHTML = '';
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = _buildMsgBubble({
        sender_id: CU.uid, text: JSON.stringify(locData),
        media_type: 'location', media_url: '',
        seen: false, created_at: createdAt
      }, true).trim();
      optimisticRow = tempDiv.firstElementChild;
      container.appendChild(optimisticRow);
      container.scrollTop = container.scrollHeight;
    }
    _updateChatListPreview(_activeChatId, '📍 Location');

    try{
      await _ensureChatRow();
      await _supaFetch('/messages',{ method:'POST', body: JSON.stringify({
        chat_id:_activeChatId, sender_id:CU.uid,
        text: JSON.stringify(locData), media_type:'location',
        media_url:'', seen:false, created_at: createdAt
      })});
      await _supaFetch(`/chats?id=eq.${_activeChatId}`,{ method:'PATCH', body:JSON.stringify({
        last_message:'📍 Location', last_message_time:createdAt, unread_count:1
      })});
    }catch(_){
      toast('Send failed','error');
      if(optimisticRow) optimisticRow.remove();
    }
  }, () => toast('Location permission denied','error'));
}

// VIEW ONCE

function _openViewOnce(){
  _closeAttachMenu();
  const inp = $('chatViewOnceInput');
  if(inp) inp.click();
}

function _openViewOnceMedia(msgId, url, subtype){
  // Mark as seen
  if(_getRtdb() && msgId){
    _getRtdb().ref('viewonce_seen/' + msgId + '/' + CU.uid).set(true);
  }
  _viewMedia(url, subtype);
  // Update DOM
  const row = document.querySelector(`.msg-row[data-msgid="${msgId}"]`);
  if(row){
    const box = row.querySelector('.viewonce-box');
    if(box) box.outerHTML = `<div class="viewonce-seen"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><line x1="1" y1="1" x2="23" y2="23"/></svg> Opened</div>`;
  }
}

// CHAT LIST — instant preview update

// ── Chat list last message কে সুন্দর icon+label এ রূপান্তর ──
function _lastMsgHTML(text){
  const t = (text||'').trim();
  const map = [
    { prefix: '📷',  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="15" rx="3"/><circle cx="12" cy="13.5" r="3.5"/><path d="M8 6V5a2 2 0 012-2h4a2 2 0 012 2v1"/></svg>`,            color:'#a78bfa', label:'Photo'    },
    { prefix: '🎥',  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="15" height="14" rx="2"/><path d="M17 8l5-3v14l-5-3V8z"/></svg>`,                                                              color:'#f87171', label:'Video'    },
    { prefix: '🎤',  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0014 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>`, color:'#34d399', label:'Voice'    },
    { prefix: '🎵',  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,                                                         color:'#fb923c', label:'Audio'    },
    { prefix: '📎',  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>`,                     color:'#60a5fa', label:'Document' },
    { prefix: '📊',  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="8" y1="12" x2="8" y2="17"/><line x1="12" y1="8" x2="12" y2="17"/><line x1="16" y1="14" x2="16" y2="17"/></svg>`, color:'#a3e635', label:'Poll'     },
    { prefix: '📍',  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>`,                                                          color:'#f472b6', label:'Location' },
  ];
  for(const m of map){
    if(t.startsWith(m.prefix) || t.includes(m.label)){
      const extra = t.replace(m.prefix,'').replace(m.label,'').replace(/^[\s:]+/,'').trim();
      return `<span class="cli-last-icon" style="color:${m.color}">${m.icon}</span><span class="cli-last-label">${m.label}${extra?' · '+extra:''}</span>`;
    }
  }
  return `<span class="cli-last-text">${_esc(t.slice(0,50))}</span>`;
}

function _updateChatListPreview(chatId, lastMsg){
  const item = document.querySelector(`.chat-list-item[data-chatid="${chatId}"]`);
  if(!item) return;
  const lastEl = item.querySelector('.cli-last');
  if(lastEl) lastEl.innerHTML = _lastMsgHTML(lastMsg);
  const container = item.parentElement;
  if(container && container.firstElementChild !== item){
    container.insertBefore(item, container.firstElementChild);
  }
}

// VOICE RECORDING

async function _startVoice(e){
  e.preventDefault();
  if(_voiceRecorder) return;
  try{
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation:   true,   // ইকো বন্ধ (WhatsApp-এর মতো)
        noiseSuppression:   true,   // হালকা noise কমাও
        autoGainControl:    false,  // volume natural রাখো — কণ্ঠ বদলাবে না
        sampleRate:         48000,  // CD quality
        channelCount:       1,      // mono — ভয়েসের জন্য পারফেক্ট
      }
    });
    _voiceChunks = [];
    const mimeType = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
    ].find(t => MediaRecorder.isTypeSupported(t)) || '';
    _voiceRecorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 96000 } : {});
    _voiceRecorder.ondataavailable = ev => { if(ev.data.size>0) _voiceChunks.push(ev.data); };
    _voiceRecorder.onstop = async () => {
      const blob = new Blob(_voiceChunks, { type:'audio/webm' });
      stream.getTracks().forEach(t => t.stop());
      if(_voiceSecs < 1){ toast('রেকর্ড খুব ছোট','error'); return; }

      // ── সাথে সাথে optimistic bubble দেখাও ──
      const blobUrl = URL.createObjectURL(blob);
      const container = $('chatMessages');
      let sentRow = null;
      if(container){
        const noMsg = container.querySelector('.chat-no-msgs');
        if(noMsg) container.innerHTML = '';
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = _buildMsgBubble({
          sender_id: CU.uid, text: 'voice.webm',
          media_url: blobUrl, media_type: 'voice',
          seen: false, created_at: new Date().toISOString()
        }, true).trim();
        sentRow = tempDiv.firstElementChild;
        // upload progress bar
        const uploadBar = document.createElement('div');
        uploadBar.className = 'msg-upload-bar';
        uploadBar.innerHTML = `<div class="msg-upload-progress" id="mup_voice"></div>`;
        sentRow.querySelector('.msg-bubble')?.appendChild(uploadBar);
        container.appendChild(sentRow);
        container.scrollTop = container.scrollHeight;
      }

      // ── Background এ upload + save ──
      try{
        await _ensureChatRow();
        const res = await _uploadToCloudinaryProgress(blob, 'video', 'webm', 'voice.webm', pct => {
          const bar = document.getElementById('mup_voice');
          if(bar) bar.style.width = pct + '%';
        });
        sentRow?.querySelector('.msg-upload-bar')?.remove();
        URL.revokeObjectURL(blobUrl);
        await _supaInsertMediaMsg(res.secure_url, 'voice', '', 'voice.webm');
        _updateChatListPreview(_activeChatId, '🎤 Voice');
      }catch(err){
        toast('ভয়েস পাঠানো যায়নি','error');
        sentRow?.remove();
      }
    };
    _voiceRecorder.start();
    // Timer
    _voiceSecs = 0;
    const timerEl = $('voiceTimer'); const valEl = $('voiceTimerVal');
    if(timerEl) timerEl.style.display = 'flex';
    const btn = $('chatVoiceBtn'); if(btn) btn.classList.add('recording');
    _voiceTimer = setInterval(() => {
      _voiceSecs++;
      const m = Math.floor(_voiceSecs/60), s = _voiceSecs%60;
      if(valEl) valEl.textContent = m+':'+(s<10?'0':'')+s;
      if(_voiceSecs >= 120) _stopVoice(null); // max 2 min
    }, 1000);
  }catch(err){
    toast('Microphone permission denied','error');
  }
}

function _stopVoice(e){
  if(e) e.preventDefault();
  clearInterval(_voiceTimer); _voiceTimer = null;
  const timerEl = $('voiceTimer'); if(timerEl) timerEl.style.display = 'none';
  const btn = $('chatVoiceBtn'); if(btn) btn.classList.remove('recording');
  if(_voiceRecorder && _voiceRecorder.state !== 'inactive'){
    _voiceRecorder.stop();
  }
  _voiceRecorder = null;
}

function _stopVoiceRecording(){
  clearInterval(_voiceTimer); _voiceTimer = null;
  if(_voiceRecorder){ try{ _voiceRecorder.stop(); }catch(_){} _voiceRecorder = null; }
}

// INIT — called after login

let _chatListWS = null;

function _subscribeChatList(){
  if(_chatListWS) try{ _chatListWS.close(); }catch(_){}

  const ws = new WebSocket(SUPA_WS);
  _chatListWS = ws;

  ws.onopen = () => {
    ws.send(JSON.stringify({ topic: 'realtime:public:chats', event: 'phx_join', payload: { config: { broadcast: { ack: false }, presence: { key: '' }, postgres_changes: [{ event: '*', schema: 'public', table: 'chats' }] } }, ref: '1' }));
  };

  ws.onmessage = e => {
    try{
      const msg = JSON.parse(e.data);
      if(msg.event !== 'postgres_changes') return;
      const rec = msg.payload?.data?.record || msg.payload?.record;
      if(!rec) return;
      // আমার chat কিনা চেক করো
      if(rec.user1 !== CU.uid && rec.user2 !== CU.uid) return;
      // Chat list item আপডেট করো
      _updateChatListItem(rec);
    }catch(_){}
  };

  ws.onclose = () => {
    // Reconnect after 3s
    setTimeout(() => { if(CU) _subscribeChatList(); }, 3000);
  };
}

function _updateChatListItem(rec){
  const container = $('chatListContainer');
  if(!container) return;

  const chatId  = rec.id;
  const lastMsg = rec.last_message || '';
  const unread  = (rec.unread_count || 0) && rec.last_sender_id !== CU.uid ? rec.unread_count : 0;

  let item = container.querySelector(`.chat-list-item[data-chatid="${chatId}"]`);
  if(item){
    // আগে থেকে আছে — update করো
    const lastEl   = item.querySelector('.cli-last');
    const badgeEl  = item.querySelector('.cli-badge');
    const timeEl   = item.querySelector('.cli-time');
    if(lastEl)  lastEl.innerHTML  = _lastMsgHTML(lastMsg);
    if(timeEl)  timeEl.textContent = rec.last_message_time ? _formatMsgTime(rec.last_message_time) : '';
    // Badge update
    if(unread > 0){
      if(badgeEl) badgeEl.textContent = unread;
      else{
        const bottom = item.querySelector('.cli-bottom');
        if(bottom){ const b = document.createElement('span'); b.className = 'cli-badge'; b.textContent = unread; bottom.appendChild(b); }
      }
    } else {
      if(badgeEl) badgeEl.remove();
    }
    // উপরে আনো
    if(container.firstElementChild !== item) container.insertBefore(item, container.firstElementChild);
  } else {
    // নতুন chat — পুরো list reload করো
    loadChatList();
  }
}

function initChat(){
  if(!CU) return;
  _setOnline(true);
  _subscribeChatList();

  // প্রতি মিনিটে last seen refresh করো
  setInterval(() => {
    Object.keys(_presenceListeners).forEach(uid => {
      const lsEl = $('lastseen-' + uid);
      if(lsEl && lsEl.textContent !== 'Online'){
        _presenceListeners[uid].once('value', snap => {
          const data = snap.val() || {};
          if(data.online !== true && data.lastSeen && lsEl){
            lsEl.textContent = _formatLastSeen(data.lastSeen);
          }
        });
      }
    });
  }, 60000);

  // ── Page বন্ধ/background হলে সাথে সাথে offline করো ──
  const _goOfflineInstant = () => {
    if(!CU) return;
    // sendBeacon — page বন্ধ হলেও পাঠায়
    const url = `https://infobooks-4358d-default-rtdb.asia-southeast1.firebasedatabase.app/presence/${CU.uid}.json`;
    const data = JSON.stringify({ online: false, lastSeen: { '.sv': 'timestamp' } });
    try{ navigator.sendBeacon(url, new Blob([data], { type: 'application/json' })); }catch(_){}
    // সাথে SDK দিয়েও চেষ্টা করো
    try{ _setOnline(false); }catch(_){}
  };

  // Page সম্পূর্ণ বন্ধ হলে
  window.addEventListener('pagehide',    _goOfflineInstant);
  window.addEventListener('beforeunload', _goOfflineInstant);

  // Background/foreground
  document.addEventListener('visibilitychange', () => {
    if(document.visibilityState === 'visible'){
      _setOnline(true);
      _subscribeChatList();
    } else {
      _goOfflineInstant();
    }
  });
}

// ── INLINE AUDIO PLAYER ──
const _audioPlayers = {};

function _toggleAudioPlay(pid, url, btn){
  Object.entries(_audioPlayers).forEach(([id, audio]) => {
    if(id !== pid && !audio.paused){
      audio.pause();
      const ob = document.getElementById('btn_' + id);
      if(ob) ob.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>';
    }
  });
  if(!_audioPlayers[pid]){
    const audio = new Audio(url);
    _audioPlayers[pid] = audio;
    audio.addEventListener('timeupdate', () => {
      const p = document.getElementById('prog_' + pid);
      const t = document.getElementById('time_' + pid);
      if(p && audio.duration) p.style.width = (audio.currentTime / audio.duration * 100) + '%';
      if(t) t.textContent = _fmtAudioTime(audio.currentTime);
    });
    audio.addEventListener('ended', () => {
      const b = document.getElementById('btn_' + pid);
      const p = document.getElementById('prog_' + pid);
      const t = document.getElementById('time_' + pid);
      if(b) b.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>';
      if(p) p.style.width = '0%';
      if(t) t.textContent = '0:00';
    });
    audio.addEventListener('loadedmetadata', () => {
      const t = document.getElementById('time_' + pid);
      if(t) t.textContent = _fmtAudioTime(audio.duration);
    });
  }
  const audio = _audioPlayers[pid];
  if(audio.paused){
    audio.play().catch(() => toast('Audio চালানো যায়নি', 'error'));
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
  } else {
    audio.pause();
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>';
  }
}

function _seekAudio(pid, event, wrapEl){
  const audio = _audioPlayers[pid];
  if(!audio || !audio.duration) return;
  const rect = wrapEl.getBoundingClientRect();
  const pct  = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  audio.currentTime = pct * audio.duration;
}

function _fmtAudioTime(secs){
  if(!secs || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return m + ':' + String(s).padStart(2, '0');
}

// ── Logout এর সময় call করুন — cache পরিষ্কার হবে ──
function cleanupOnLogout(){
  Object.values(_audioPlayers).forEach(a => { try{ a.pause(); }catch(_){} });
  Object.keys(_audioPlayers).forEach(k => delete _audioPlayers[k]);
  if(typeof cleanupCallsOnLogout === 'function') cleanupCallsOnLogout();
  if(_wsHeartbeat){ clearInterval(_wsHeartbeat); _wsHeartbeat = null; }
  if(_realtimeWS){ try{ _realtimeWS.close(); }catch(_){} _realtimeWS = null; }
  _clearAllPresenceListeners();
  try{
    Object.keys(localStorage)
      .filter(k => k.startsWith('solvix_chat_list_') || k.startsWith('solvix_msgs_') || k.startsWith('solvix_calls_') || k.startsWith('solvix_adm_'))
      .forEach(k => localStorage.removeItem(k));
  }catch(_){}
  _prefetchPromise = null;
}

// ── CHAT HEADER CALL BUTTONS ──
// Chat screen এর উপরের audio/video বাটন থেকে call শুরু করার জন্য
function _startChatCall(type){
  if(!_activePeerData || !_activePeerUid){
    toast('Peer data পাওয়া যাচ্ছে না', 'error');
    return;
  }
  if(typeof startCall !== 'function'){
    toast('Call engine লোড হয়নি', 'error');
    return;
  }
  // peer object তৈরি করো
  const peer = {
    uid:      _activePeerUid,
    name:     _activePeerData.name     || 'Unknown',
    photoURL: _activePeerData.photoURL || '',
    gender:   _activePeerData.gender   || '',
    username: _activePeerData.username || '',
  };
  startCall(peer, type);
}

// MEDIA AUTO-HIDE — 12 ঘন্টা পর hide
async function _runMediaAutoHide(){
  if(!CU) return;
  try{
    const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    await fetch(
      SUPA_URL + `/rest/v1/messages?media_url=not.is.null&media_hidden=eq.false&created_at=lt.${cutoff}`,
      {
        method: 'PATCH',
        headers: {
          'apikey':        SUPA_ANON,
          'Authorization': 'Bearer ' + SUPA_ANON,
          'Content-Type':  'application/json',
          'Prefer':        'return=minimal'
        },
        body: JSON.stringify({ media_hidden: true, media_hidden_at: new Date().toISOString() })
      }
    );
  }catch(_){}
}

// App open হলে এবং প্রতি ঘন্টায় একবার run করো
function _startMediaAutoHideTimer(){
  _runMediaAutoHide();
  setInterval(_runMediaAutoHide, 60 * 60 * 1000);
}

// ══════════════════════════════════════════════════════
//  FCM MESSAGE NOTIFICATION — Worker এর মাধ্যমে
// ══════════════════════════════════════════════════════
async function _sendMessageNotification(msgText) {
  if (!_activePeerData || !CUD) return;

  // Receiver এর FCM tokens নাও
  const tokens = _activePeerData.fcmTokens || [];
  if (!tokens.length) return;

  // নিজের চ্যাট খোলা থাকলে notification পাঠাবো না
  // (receiver online আছে কিনা check করা যাবে না — তাই সবসময় পাঠাই)

  await fetch(_CF_WORKER_URL + '/notify-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tokens:      tokens,
      senderName:  CUD.name     || 'Someone',
      senderPhoto: CUD.photoURL || '',
      body:        msgText,
      chatId:      _activeChatId  || '',
      peerUid:     CU.uid,
    })
  });
}
