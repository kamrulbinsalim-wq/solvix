//  SOLVIX — ADMIN PANEL

let _adminUsers    = [];
let _adminSearchQ  = '';
let _adminLoading  = false;
const _ADMIN_PAGE_SIZE = 30;

// ── ENTRY ──
function renderAdminPanel(){
  if(!CUD?.isAdmin){ toast('Access denied','error'); switchTab('calls'); return; }
  const wrap = $('adminPanelWrap');
  if(!wrap) return;
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  _adminHome();
}

//  HOME — বড় card grid
function _adminHome(){
  const wrap = $('adminPanelWrap');
  wrap.innerHTML = `
    <div class="adm-header">
      <div class="adm-header-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"><path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"/><polyline points="9 12 11 14 15 10"/></svg>
        Admin Panel
      </div>
      <div class="adm-header-sub">Solvix Management</div>
    </div>

    <!-- Stats -->
    <div class="adm-stats-bar" id="admStatsBar">
      <div class="adm-stat-card" id="admStatUsers"><div class="adm-stat-num">—</div><div class="adm-stat-lbl">Users</div></div>
      <div class="adm-stat-card" id="admStatMsgs"> <div class="adm-stat-num">—</div><div class="adm-stat-lbl">Messages</div></div>
      <div class="adm-stat-card" id="admStatCalls"><div class="adm-stat-num">—</div><div class="adm-stat-lbl">Calls</div></div>
      <div class="adm-stat-card" id="admStatChats"><div class="adm-stat-num">—</div><div class="adm-stat-lbl">Chats</div></div>
    </div>

    <!-- Menu Cards 2x2 grid -->
    <div class="adm-menu-grid">
      <div class="adm-menu-card" onclick="_adminPage('users')">
        <div class="adm-menu-icon" style="background:rgba(0,229,184,0.12);color:var(--accent)">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <div class="adm-menu-label">Users</div>
        <div class="adm-menu-sub">Manage করুন</div>
      </div>

      <div class="adm-menu-card" onclick="_adminPage('monitor')">
        <div class="adm-menu-icon" style="background:rgba(0,136,255,0.12);color:var(--accent2)">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </div>
        <div class="adm-menu-label">Monitor</div>
        <div class="adm-menu-sub">Messages দেখুন</div>
      </div>

      <div class="adm-menu-card" onclick="_adminPage('deleted')">
        <div class="adm-menu-icon" style="background:rgba(255,68,102,0.12);color:var(--danger)">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </div>
        <div class="adm-menu-label">Deleted</div>
        <div class="adm-menu-sub">Restore করুন</div>
      </div>

      <div class="adm-menu-card" onclick="_adminPage('media')">
        <div class="adm-menu-icon" style="background:rgba(255,160,0,0.12);color:#ffb300">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        </div>
        <div class="adm-menu-label">Media Vault</div>
        <div class="adm-menu-sub">Hidden media</div>
      </div>

      <div class="adm-menu-card adm-menu-card-wide" onclick="_adminPage('announce')">
        <div class="adm-menu-icon" style="background:rgba(139,92,246,0.12);color:#a78bfa">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3z"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        </div>
        <div class="adm-menu-body"><div class="adm-menu-label">Notice</div><div class="adm-menu-sub">সব user কে announcement পাঠান</div></div>
        <div class="adm-menu-arrow">›</div>
      </div>

      <div class="adm-menu-card adm-menu-card-wide" onclick="_adminPage('storage')">
        <div class="adm-menu-icon" style="background:rgba(251,191,36,0.12);color:#fbbf24">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
        </div>
        <div class="adm-menu-body"><div class="adm-menu-label">Storage & Usage</div><div class="adm-menu-sub">Supabase · Firebase · Cloudflare usage দেখুন</div></div>
        <div class="adm-menu-arrow">›</div>
      </div>

      <div class="adm-menu-card" onclick="_adminPage('reports')">
        <div class="adm-menu-icon" style="background:rgba(255,68,102,0.12);color:var(--danger)">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <div class="adm-menu-label">Reports</div>
        <div class="adm-menu-sub">User reports দেখুন</div>
      </div>

      <div class="adm-menu-card" onclick="_adminPage('blocked')">
        <div class="adm-menu-icon" style="background:rgba(255,160,0,0.12);color:#ffb300">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
        </div>
        <div class="adm-menu-label">Blocked Users</div>
        <div class="adm-menu-sub">Block করা users</div>
      </div>
    </div>
  `;
  _loadAdminStats();
}

//  SECTION PAGE — back button সহ
function _adminPage(section){
  const wrap = $('adminPanelWrap');
  wrap.innerHTML = `
    <div class="adm-page-header">
      <button class="adm-back-btn" onclick="_adminHome()">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      </button>
      <div class="adm-page-title">${_adminSectionTitle(section)}</div>
    </div>
    <div class="adm-content" id="admContent">
      <div class="adm-loading"><div class="spin"></div></div>
    </div>
  `;
  if(section === 'users')    _loadAdminUsers();
  if(section === 'monitor')  _loadMonitorTab();
  if(section === 'deleted')  _loadDeletedMessages();
  if(section === 'media')    _loadMediaVault();
  if(section === 'announce') _renderAnnounceTab();
  if(section === 'storage')  _loadStoragePage();
  if(section === 'reports')  _loadReportsTab();
  if(section === 'blocked')  _loadBlockedTab();
}

function _adminSectionTitle(s){
  const t = { users:'Users', monitor:'Monitor', deleted:'Deleted Messages', media:'Media Vault', announce:'Notice', storage:'Storage & Usage', reports:'Reports', blocked:'Blocked Users' };
  return t[s] || s;
}

//  STATS
async function _loadAdminStats(){
  // Cache থেকে সাথে সাথে দেখাও
  try{
    const cached = localStorage.getItem('solvix_adm_stats');
    if(cached){
      const s = JSON.parse(cached);
      _setStatNum('admStatUsers', s.users);
      _setStatNum('admStatMsgs',  s.msgs);
      _setStatNum('admStatCalls', s.calls);
      _setStatNum('admStatChats', s.chats);
    }
  }catch(_){}

  try{
    const uSnap = await db.collection('users').limit(500).get();
    const uCount = uSnap.docs.filter(d => d.data().accountDeleted !== true).length;
    _setStatNum('admStatUsers', uCount);

    const headers = { 'apikey': SUPA_ANON, 'Authorization': 'Bearer ' + SUPA_ANON, 'Prefer': 'count=exact', 'Range': '0-0' };
    const [msgRes, callRes, chatRes] = await Promise.all([
      fetch(SUPA_URL + '/rest/v1/messages?select=id', { headers }),
      fetch(SUPA_URL + '/rest/v1/calls?select=id',    { headers }),
      fetch(SUPA_URL + '/rest/v1/chats?select=id',    { headers }),
    ]);

    const msgCount  = _parseCount(msgRes.headers.get('content-range'));
    const callCount = _parseCount(callRes.headers.get('content-range'));
    const chatCount = _parseCount(chatRes.headers.get('content-range'));

    _setStatNum('admStatMsgs',  msgCount);
    _setStatNum('admStatCalls', callCount);
    _setStatNum('admStatChats', chatCount);

    // Cache সেভ করো
    try{
      localStorage.setItem('solvix_adm_stats', JSON.stringify({
        users: uCount, msgs: msgCount, calls: callCount, chats: chatCount
      }));
    }catch(_){}
  }catch(_){}
}

function _parseCount(cr){
  if(!cr) return '—';
  const m = cr.match(/\/(\d+)/);
  return m ? Number(m[1]).toLocaleString() : '—';
}

function _setStatNum(id, val){
  const el = $(id);
  if(el){
    const num = el.querySelector('.adm-stat-num');
    if(num) num.textContent = typeof val === 'number' ? val.toLocaleString() : val;
  }
}

//  USERS TAB
async function _loadAdminUsers(search = ''){
  _adminLoading = true;
  const content = $('admContent');
  if(!content) return;

  // Cache থেকে সাথে সাথে দেখাও (শুধু search না থাকলে)
  if(!search){
    try{
      const cached = localStorage.getItem('solvix_adm_users');
      if(cached){
        _adminUsers = JSON.parse(cached);
        _renderUsersTab(_adminUsers, search);
      }
    }catch(_){}
  }

  try{
    const snap = await db.collection('users').limit(500).get();
    _adminUsers = snap.docs
      .map(d => d.data())
      .filter(u => u.accountDeleted !== true);

    // Cache সেভ করো
    try{ localStorage.setItem('solvix_adm_users', JSON.stringify(_adminUsers)); }catch(_){}

    let list = _adminUsers;
    if(search){
      const q = search.toLowerCase();
      list = list.filter(u =>
        (u.name||'').toLowerCase().includes(q) ||
        (u.username||'').toLowerCase().includes(q) ||
        (u.phone||'').includes(q) ||
        (u.email||'').toLowerCase().includes(q)
      );
    }
    _renderUsersTab(list, search);
  }catch(err){
    content.innerHTML = `<div class="adm-error">Failed to load users: ${err.message}</div>`;
  }
  _adminLoading = false;
}

function _renderUsersTab(list, search = ''){
  const content = $('admContent');
  if(!content) return;

  let html = `
    <div class="adm-search-row">
      <div class="adm-search-wrap">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input type="text" class="adm-search-inp" placeholder="নাম, username বা phone..."
          value="${_esc(search)}"
          oninput="_adminUserSearch(this.value)"
          autocomplete="off">
      </div>
      <div class="adm-user-count">${list.length} জন</div>
    </div>
    <div class="adm-user-list">`;

  if(list.length === 0){
    html += `<div class="adm-empty">কোনো user পাওয়া যায়নি</div>`;
  } else {
    list.forEach(u => {
      const photo    = u.photoURL && u.photoURL.startsWith('https://') ? u.photoURL : '';
      const avHTML   = photo ? `<img src="${photo}" alt="">` : `<span>${(u.name||'?')[0].toUpperCase()}</span>`;
      const isAdmin   = u.isAdmin === true;
      const isBlocked = u.blocked === true;
      const uJson     = JSON.stringify(u).replace(/'/g,"\\'").replace(/"/g,'&quot;');

      html += `
        <div class="adm-user-row ${isBlocked?'adm-user-blocked':''}" onclick="_adminUserDetail(this)" data-user="${uJson}" style="cursor:pointer">
          <div class="adm-user-av">${avHTML}</div>
          <div class="adm-user-info">
            <div class="adm-user-name">
              ${_esc(u.name||'Unknown')}${u.verified ? '<img src="verified.png" class="verified-badge" width="16" height="16" alt="✓">' : ''}
              ${isAdmin   ? '<span class="adm-badge adm-badge-admin">Admin</span>'   : ''}
              ${isBlocked ? '<span class="adm-badge adm-badge-blocked">Blocked</span>' : ''}
            </div>
            <div class="adm-user-meta">@${_esc(u.username||'—')} · ${_esc(u.phone||'—')}</div>
          </div>
          <div class="adm-user-chevron">›</div>
        </div>`;
    });
  }

  html += `</div>`;
  content.innerHTML = html;
}

let _adminSearchTimer = null;
function _adminUserSearch(val){
  _adminSearchQ = val;
  clearTimeout(_adminSearchTimer);
  _adminSearchTimer = setTimeout(() => {
    const q = val.toLowerCase();
    const list = _adminUsers.filter(u =>
      (u.name||'').toLowerCase().includes(q) ||
      (u.username||'').toLowerCase().includes(q) ||
      (u.phone||'').includes(q) ||
      (u.email||'').toLowerCase().includes(q)
    );
    _renderUsersTab(list, val);
  }, 300);
}

// ── USER DETAIL PAGE ──
function _adminUserDetail(el){
  try{
    const u = JSON.parse(el.getAttribute('data-user').replace(/&quot;/g,'"'));
    _showUserDetailPage(u);
  }catch(e){ toast('Error loading user','error'); }
}

async function _showUserDetailPage(u){
  const wrap = $('adminPanelWrap');
  const isBlocked = u.blocked === true;
  const isAdmin   = u.isAdmin === true;
  const photo     = u.photoURL && u.photoURL.startsWith('https://') ? u.photoURL : '';
  const avHTML    = photo ? `<img src="${photo}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">` : `<span style="font-size:28px;font-weight:800;color:#050810">${(u.name||'?')[0].toUpperCase()}</span>`;

  wrap.innerHTML = `
    <div class="adm-page-header">
      <button class="adm-back-btn" onclick="_adminPage('users')">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      </button>
      <div class="adm-page-title">User Detail</div>
    </div>

    <!-- Profile card -->
    <div class="adm-udet-profile">
      <div class="adm-udet-av">${avHTML}</div>
      <div class="adm-udet-name">${_esc(u.name||'Unknown')}${u.verified ? '<img src="verified.png" class="verified-badge" width="20" height="20" alt="✓">' : ''}</div>
      <div class="adm-udet-handle">@${_esc(u.username||'—')}</div>
      <div class="adm-udet-badges">
        ${isAdmin   ? '<span class="adm-badge adm-badge-admin">Admin</span>'     : ''}
        ${isBlocked ? '<span class="adm-badge adm-badge-blocked">Blocked</span>' : ''}
        ${u.verified ? '<span class="adm-badge" style="background:rgba(29,155,240,0.15);color:#1D9BF0">✅ Verified</span>' : ''}
        ${u.gender === 'male' ? '<span class="adm-badge" style="background:rgba(0,136,255,0.15);color:var(--accent2)">Male</span>' : ''}
        ${u.gender === 'female' ? '<span class="adm-badge" style="background:rgba(255,100,180,0.15);color:#ff78c0">Female</span>' : ''}
      </div>
    </div>

    <!-- Info -->
    <div class="adm-udet-info">
      ${u.phone ? `<div class="adm-udet-row"><span class="adm-udet-lbl"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg> Phone</span><span class="adm-udet-val">${_esc(u.phone)}</span></div>` : ''}
      ${u.email ? `<div class="adm-udet-row"><span class="adm-udet-lbl"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> Email</span><span class="adm-udet-val">${_esc(u.email)}</span></div>` : ''}
      ${u.dob   ? `<div class="adm-udet-row"><span class="adm-udet-lbl"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> DOB</span><span class="adm-udet-val">${_esc(u.dob)}</span></div>` : ''}
      ${u.bio   ? `<div class="adm-udet-row"><span class="adm-udet-lbl"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="21" y1="6" x2="3" y2="6"/><line x1="15" y1="12" x2="3" y2="12"/><line x1="17" y1="18" x2="3" y2="18"/></svg> Bio</span><span class="adm-udet-val">${_esc(u.bio)}</span></div>` : ''}
      <div class="adm-udet-row"><span class="adm-udet-lbl"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> UID</span><span class="adm-udet-val" style="font-size:10px;word-break:break-all">${_esc(u.uid||'—')}</span></div>
    </div>

    <!-- Admin Actions -->
    <div class="adm-udet-section-title">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"><path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"/></svg>
      Admin Actions
    </div>
    <div class="adm-udet-actions">
      <button class="adm-udet-btn ${isBlocked?'adm-act-unblock':'adm-act-block'}"
        onclick="_adminToggleBlock('${_esc(u.uid||'')}','${_esc(u.username||'')}',${isBlocked})">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
        ${isBlocked ? 'Unblock User' : 'Block User'}
      </button>
      <button class="adm-udet-btn adm-act-delete"
        onclick="_adminDeleteUser('${_esc(u.uid||'')}','${_esc(u.username||'')}','${_esc(u.name||'')}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
        Delete User
      </button>
      ${!isAdmin ? `<button class="adm-udet-btn" style="background:rgba(0,229,184,0.12);color:var(--accent)"
        onclick="_adminMakeAdmin('${_esc(u.uid||'')}','${_esc(u.username||'')}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"/><polyline points="9 12 11 14 15 10"/></svg>
        Make Admin
      </button>` : ''}
      <button class="adm-udet-btn" style="background:rgba(29,155,240,0.12);color:#1D9BF0"
        onclick="_adminToggleVerified('${_esc(u.uid||'')}','${_esc(u.name||'')}',${u.verified ? 'true' : 'false'})">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        ${u.verified ? 'Remove Verified' : 'Verify User'}
      </button>
      ${u.photoURL ? `<button class="adm-udet-btn" style="background:rgba(255,160,0,0.1);color:#ffb300"
        onclick="_adminRemovePhoto('${_esc(u.uid||'')}','${_esc(u.username||'')}','${_esc(u.name||'')}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
        Remove Photo
      </button>` : ''}
      <button class="adm-udet-btn" style="background:rgba(168,85,247,0.1);color:#c084fc"
        onclick="_adminPrivacyOverride('${_esc(u.uid||'')}','${_esc(u.username||'')}','${_esc(u.name||'')}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        Privacy Override
      </button>
    </div>

    <!-- Messages of this user -->
    <div class="adm-udet-section-title">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      Messages
    </div>
    <div id="admUdetMsgs"><div class="adm-loading"><div class="spin"></div></div></div>

    <!-- Call history -->
    <div class="adm-udet-section-title" style="margin-top:8px">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent2)" stroke-width="2" stroke-linecap="round"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>
      Call History
    </div>
    <div id="admUdetCalls"><div class="adm-loading"><div class="spin"></div></div></div>
  `;

  // Load messages and calls
  _loadUserMessages(u.uid);
  _loadUserCalls(u.uid);
}

async function _loadUserMessages(uid){
  const el = $('admUdetMsgs');
  if(!el) return;
  try{
    const res = await fetch(
      SUPA_URL + '/rest/v1/messages?sender_id=eq.' + uid + '&order=created_at.desc&limit=50',
      { headers: { 'apikey': SUPA_ANON, 'Authorization': 'Bearer ' + SUPA_ANON } }
    );
    const msgs = await res.json();
    if(!msgs || msgs.length === 0){ el.innerHTML = `<div class="adm-empty">কোনো message নেই</div>`; return; }

    let html = `<div class="adm-mon-list">`;
    msgs.forEach(m => {
      const time      = m.created_at ? new Date(m.created_at).toLocaleString('en-BD') : '—';
      const isDeleted = m.deleted === true;
      const isHidden  = m.media_hidden === true;
      const mediaIcon = m.media_type === 'image' ? '📷' : m.media_type === 'video' ? '🎥'
                      : m.media_type === 'audio'  ? '🎵' : m.media_type === 'voice' ? '🎤'
                      : m.media_type === 'document'? '📎' : '';
      html += `
        <div class="adm-mon-row ${isDeleted?'adm-mon-deleted':''}">
          <div class="adm-mon-meta">
            <span class="adm-mon-time">${time}</span>
            ${isDeleted ? '<span class="adm-mon-badge adm-mon-badge-del">🗑 Deleted</span>' : ''}
            ${isHidden  ? '<span class="adm-mon-badge adm-mon-badge-hid">🔒 Hidden</span>' : ''}
            ${m.seen    ? '<span class="adm-mon-badge adm-mon-badge-seen">✓ Seen</span>' : ''}
          </div>
          <div class="adm-mon-body">
            ${mediaIcon ? `<span class="adm-msg-media">${mediaIcon} ${_esc(m.media_type)}</span>` : ''}
            ${m.text    ? `<span class="adm-mon-text">${_esc(m.text.slice(0,180))}${m.text.length>180?'…':''}</span>` : ''}
            ${m.media_url ? `<a href="${_esc(m.media_url)}" target="_blank" class="adm-media-link" style="font-size:11px">🔗 Media</a>` : ''}
          </div>
          ${isDeleted ? `<button class="adm-act-btn adm-act-unblock" style="margin-top:5px;font-size:11px;padding:3px 10px" onclick="_adminRestoreMsg('${m.id}',this)">♻ Restore</button>` : ''}
        </div>`;
    });
    html += `</div>`;
    el.innerHTML = html;
  }catch(_){ el.innerHTML = `<div class="adm-error">লোড হয়নি</div>`; }
}

async function _loadUserCalls(uid){
  const el = $('admUdetCalls');
  if(!el) return;
  try{
    const res = await fetch(
      SUPA_URL + '/rest/v1/calls?or=(caller_id.eq.' + uid + ',receiver_id.eq.' + uid + ')&order=start_time.desc.nullslast&limit=30',
      { headers: { 'apikey': SUPA_ANON, 'Authorization': 'Bearer ' + SUPA_ANON } }
    );
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const calls = await res.json();
    if(!calls || calls.length === 0){ el.innerHTML = `<div class="adm-empty">কোনো call নেই</div>`; return; }

    let html = `<div class="adm-call-list">`;
    calls.forEach(c => {
      const time      = c.start_time ? new Date(c.start_time).toLocaleString('en-BD') : '—';
      const isCaller  = c.caller_id === uid;
      const peerName  = isCaller ? (c.receiver_name || 'Unknown') : (c.caller_name || 'Unknown');
      const dir       = isCaller ? '📤 Outgoing' : '📥 Incoming';
      const typeIcon  = c.type === 'video' ? '🎥' : '📞';
      const isMissed  = c.status === 'missed' || c.status === 'rejected';
      const statusCol = c.status === 'ended' ? 'var(--accent)' : isMissed ? 'var(--danger)' : '#ffb300';
      const statusTxt = c.status || '—';
      const dur       = c.duration ? `${Math.floor(c.duration/60)}m ${c.duration%60}s` : '';

      html += `
        <div class="adm-call-row">
          <div class="adm-call-icon">${typeIcon}</div>
          <div class="adm-call-info">
            <div class="adm-call-peer">${dir} · ${_esc(peerName)}</div>
            <div class="adm-call-meta">
              ${time}
              · <span style="color:${statusCol}">${statusTxt}</span>
              ${dur ? '· ' + dur : ''}
            </div>
          </div>
        </div>`;
    });
    html += `</div>`;
    el.innerHTML = html;
  }catch(e){
    el.innerHTML = `<div class="adm-error">Call history লোড হয়নি<br><span style="font-size:11px;color:var(--t3)">${e.message}</span></div>`;
  }
}

// Make admin
async function _adminMakeAdmin(uid, username){
  if(!confirm('এই user কে Admin করবেন?')) return;
  try{
    if(username){ await db.collection('users').doc(username).update({ isAdmin: true }); }
    else {
      const snap = await db.collection('users').where('uid','==',uid).limit(1).get();
      if(!snap.empty) await snap.docs[0].ref.update({ isAdmin: true });
    }
    toast('Admin করা হয়েছে!', 'success');
    _adminPage('users');
  }catch(_){ toast('Failed','error'); }
}

// Block / Unblock
async function _adminToggleVerified(uid, name, isVerified){
  if(!confirm(`${name} কে ${isVerified ? 'Verified badge সরাবেন' : 'Verify করবেন'}?`)) return;
  try{
    const snap = await db.collection('users').where('uid','==',uid).limit(1).get();
    if(!snap.empty){
      await snap.docs[0].ref.update({ verified: !isVerified });
      toast(isVerified ? 'Verified badge সরানো হয়েছে' : '✅ Verified করা হয়েছে!', 'success');
      _adminPage('users');
    }
  }catch(_){ toast('Failed','error'); }
}

async function _adminToggleBlock(uid, username, isBlocked){
  if(!uid && !username){ toast('User ID নেই', 'error'); return; }
  const action = isBlocked ? 'Unblock' : 'Block';
  if(!confirm(`${action} this user?`)) return;
  try{
    const ref = username
      ? db.collection('users').doc(username)
      : db.collection('users').where('uid','==',uid).limit(1);

    if(username){
      await db.collection('users').doc(username).update({ blocked: !isBlocked });
    } else {
      const snap = await db.collection('users').where('uid','==',uid).limit(1).get();
      if(!snap.empty) await snap.docs[0].ref.update({ blocked: !isBlocked });
    }
    toast(action + 'd successfully', 'success');
    _loadAdminUsers(_adminSearchQ);
  }catch(_){ toast('Failed. Try again.', 'error'); }
}

// Delete user
async function _adminDeleteUser(uid, username, name){
  if(!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  try{
    if(username){
      await db.collection('users').doc(username).update({ accountDeleted: true, blocked: true });
    } else {
      const snap = await db.collection('users').where('uid','==',uid).limit(1).get();
      if(!snap.empty) await snap.docs[0].ref.update({ accountDeleted: true, blocked: true });
    }
    toast('User deleted', 'success');
    _loadAdminUsers(_adminSearchQ);
    _loadAdminStats();
  }catch(_){ toast('Failed. Try again.', 'error'); }
}

//  MESSAGES TAB
async function _loadAdminMessages(offset = 0){
  const content = $('admContent');
  if(!content) return;

  // Cache থেকে সাথে সাথে দেখাও (শুধু প্রথম page)
  if(offset === 0){
    try{
      const cached = localStorage.getItem('solvix_adm_messages');
      if(cached){
        content.innerHTML = JSON.parse(cached);
      } else {
        content.innerHTML = `<div class="adm-loading"><div class="spin"></div></div>`;
      }
    }catch(_){
      content.innerHTML = `<div class="adm-loading"><div class="spin"></div></div>`;
    }
  }

  try{
    const res = await fetch(
      SUPA_URL + `/rest/v1/messages?select=*&order=created_at.desc&limit=${_ADMIN_PAGE_SIZE}&offset=${offset}`,
      { headers: { 'apikey': SUPA_ANON, 'Authorization': 'Bearer ' + SUPA_ANON, 'Prefer': 'count=exact' } }
    );
    const msgs  = await res.json();
    const total = _parseCount(res.headers.get('content-range'));

    let html = `
      <div class="adm-msg-header">
        <span class="adm-msg-total">Total: ${total} messages</span>
      </div>
      <div class="adm-msg-list">`;

    if(!msgs || msgs.length === 0){
      html += `<div class="adm-empty">No messages found</div>`;
    } else {
      msgs.forEach(m => {
        const time = m.created_at ? new Date(m.created_at).toLocaleString('en-BD') : '—';
        const mediaIcon = m.media_type === 'image'    ? '📷'
                        : m.media_type === 'video'    ? '🎥'
                        : m.media_type === 'audio'    ? '🎵'
                        : m.media_type === 'voice'    ? '🎤'
                        : m.media_type === 'document' ? '📎'
                        : m.media_type === 'location' ? '📍' : '';

        html += `
          <div class="adm-msg-row">
            <div class="adm-msg-meta">
              <span class="adm-msg-sender" title="${_esc(m.sender_id||'')}">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                ${_esc((m.sender_id||'').slice(0,12))}...
              </span>
              <span class="adm-msg-time">${time}</span>
              ${m.seen ? '<span class="adm-msg-seen">Seen</span>' : ''}
            </div>
            <div class="adm-msg-body">
              ${mediaIcon ? `<span class="adm-msg-media">${mediaIcon} ${_esc(m.media_type)}</span>` : ''}
              ${m.text ? `<span class="adm-msg-text">${_esc(m.text.slice(0,120))}${m.text.length>120?'…':''}</span>` : ''}
            </div>
            <div class="adm-msg-chat-id">Chat: ${_esc((m.chat_id||'').slice(0,30))}...</div>
            <button class="adm-act-btn adm-act-delete adm-msg-del" onclick="_adminDeleteMsg('${m.id}',this)">
              Delete
            </button>
          </div>`;
      });
    }

    html += `</div>`;

    // Pagination
    if(msgs && msgs.length === _ADMIN_PAGE_SIZE){
      html += `<div class="adm-pagination">
        <button class="adm-page-btn" onclick="_loadAdminMessages(${offset + _ADMIN_PAGE_SIZE})">
          Load more
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
        </button>
      </div>`;
    }

    if(offset === 0){
      content.innerHTML = html;
      // Cache সেভ করো
      try{ localStorage.setItem('solvix_adm_messages', JSON.stringify(html)); }catch(_){}
    } else {
      // Append
      const list = content.querySelector('.adm-msg-list');
      if(list){
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        const newList = tmp.querySelector('.adm-msg-list');
        if(newList) list.insertAdjacentHTML('beforeend', newList.innerHTML);
        const oldPag = content.querySelector('.adm-pagination');
        if(oldPag) oldPag.remove();
        const newPag = tmp.querySelector('.adm-pagination');
        if(newPag) content.appendChild(newPag);
      }
    }
  }catch(err){
    content.innerHTML = `<div class="adm-error">Failed to load messages</div>`;
  }
}

async function _adminDeleteMsg(id, btn){
  if(!confirm('Delete this message?')) return;
  btn.disabled = true; btn.textContent = '...';
  try{
    await fetch(SUPA_URL + `/rest/v1/messages?id=eq.${id}`, {
      method: 'DELETE',
      headers: { 'apikey': SUPA_ANON, 'Authorization': 'Bearer ' + SUPA_ANON }
    });
    const row = btn.closest('.adm-msg-row');
    if(row){ row.style.opacity = '0'; row.style.transition = 'opacity .3s'; setTimeout(() => row.remove(), 300); }
    toast('Message deleted', 'success');
    _loadAdminStats();
  }catch(_){ toast('Failed', 'error'); btn.disabled = false; btn.textContent = 'Delete'; }
}

//  ANNOUNCE / NOTICE TAB
async function _renderAnnounceTab(){
  const content = $('admContent');
  if(!content) return;

  // Load existing notices
  let noticesHTML = `<div class="adm-loading"><div class="spin"></div></div>`;
  content.innerHTML = `
    <div class="adm-announce-form">
      <div class="adm-section-title">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3z"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        Send Announcement
      </div>
      <input type="text" id="admAnnTitle" class="adm-inp" placeholder="Title (optional)" maxlength="100">
      <textarea id="admAnnText" class="adm-textarea" placeholder="Write your announcement here..." maxlength="500" rows="4" oninput="_admAnnCount(this)"></textarea>
      <div class="adm-ann-footer">
        <span class="adm-ann-count" id="admAnnCount">0 / 500</span>
        <div class="adm-ann-types">
          <label class="adm-ann-type-lbl">
            <input type="radio" name="annType" value="info" checked> Info
          </label>
          <label class="adm-ann-type-lbl">
            <input type="radio" name="annType" value="warning"> Warning
          </label>
          <label class="adm-ann-type-lbl">
            <input type="radio" name="annType" value="success"> Success
          </label>
        </div>
        <button class="adm-send-btn" onclick="_adminSendAnnounce()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          Send to All
        </button>
      </div>
    </div>
    <div class="adm-section-title" style="padding:0 14px 8px">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent2)" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      Previous Announcements
    </div>
    <div id="admAnnList">${noticesHTML}</div>
  `;

  // Load previous
  _loadAnnouncements();
}

function _admAnnCount(ta){
  const cnt = $('admAnnCount');
  if(cnt) cnt.textContent = `${ta.value.length} / 500`;
}

async function _adminSendAnnounce(){
  const title = ($('admAnnTitle')?.value || '').trim();
  const text  = ($('admAnnText')?.value  || '').trim();
  const type  = document.querySelector('input[name="annType"]:checked')?.value || 'info';

  if(!text){ toast('Message লিখুন', 'error'); return; }

  const btn = document.querySelector('.adm-send-btn');
  if(btn){ btn.disabled = true; btn.innerHTML = `<div class="spin sm"></div> Sending...`; }

  try{
    await db.collection('announcements').add({
      title,
      text,
      type,
      sentBy: CU.uid,
      sentByName: CUD?.name || 'Admin',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    toast('Announcement sent!', 'success');
    if($('admAnnTitle')) $('admAnnTitle').value = '';
    if($('admAnnText'))  $('admAnnText').value  = '';
    const cnt = $('admAnnCount'); if(cnt) cnt.textContent = '0 / 500';
    _loadAnnouncements();
    _loadAdminStats();
  }catch(_){ toast('Failed to send', 'error'); }
  finally{
    if(btn){
      btn.disabled = false;
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Send to All`;
    }
  }
}

async function _loadAnnouncements(){
  const list = $('admAnnList');
  if(!list) return;
  try{
    const snap = await db.collection('announcements').orderBy('createdAt','desc').limit(20).get();
    if(snap.empty){ list.innerHTML = `<div class="adm-empty">No announcements yet</div>`; return; }
    let html = '';
    snap.docs.forEach(doc => {
      const d = doc.data();
      const time = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleString('en-BD') : '—';
      const typeColor = d.type === 'warning' ? 'var(--danger)' : d.type === 'success' ? '#22c55e' : 'var(--accent)';
      html += `
        <div class="adm-ann-row">
          <div class="adm-ann-row-header">
            <span class="adm-ann-type-dot" style="background:${typeColor}"></span>
            <span class="adm-ann-row-title">${_esc(d.title || 'Announcement')}</span>
            <span class="adm-ann-row-time">${time}</span>
            <button class="adm-act-btn adm-act-delete" style="padding:3px 10px;font-size:11px"
              onclick="_adminDeleteAnnounce('${doc.id}',this)">Del</button>
          </div>
          <div class="adm-ann-row-text">${_esc(d.text)}</div>
          <div class="adm-ann-row-by">— ${_esc(d.sentByName||'Admin')}</div>
        </div>`;
    });
    list.innerHTML = html;
  }catch(_){ list.innerHTML = `<div class="adm-error">Failed to load</div>`; }
}

async function _adminDeleteAnnounce(id, btn){
  if(!confirm('Delete this announcement?')) return;
  btn.disabled = true;
  try{
    await db.collection('announcements').doc(id).delete();
    const row = btn.closest('.adm-ann-row');
    if(row){ row.style.opacity='0'; row.style.transition='opacity .3s'; setTimeout(()=>row.remove(),300); }
    toast('Deleted', 'success');
  }catch(_){ toast('Failed','error'); btn.disabled = false; }
}

//  MONITOR TAB — সব user এর সব message
let _monitorUserFilter = '';

async function _loadMonitorTab(){
  const content = $('admContent');
  if(!content) return;

  // প্রথমে user list দেখাই filter এর জন্য
  content.innerHTML = `
    <div class="adm-search-row">
      <div class="adm-search-wrap">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input type="text" class="adm-search-inp" placeholder="Sender UID বা chat_id দিয়ে খুঁজুন..."
          id="monitorSearchInp" autocomplete="off"
          oninput="_monitorSearch(this.value)">
      </div>
    </div>
    <div id="monitorMsgList"><div class="adm-loading"><div class="spin"></div></div></div>
  `;
  _fetchMonitorMsgs('', 0);
}

async function _monitorSearch(val){
  clearTimeout(window._monitorSearchTimer);
  window._monitorSearchTimer = setTimeout(() => _fetchMonitorMsgs(val, 0), 400);
}

async function _fetchMonitorMsgs(search, offset){
  const list = $('monitorMsgList');
  if(!list) return;
  if(offset === 0) list.innerHTML = `<div class="adm-loading"><div class="spin"></div></div>`;

  try{
    // সব message — deleted সহ সবই আনি
    let url = SUPA_URL + `/rest/v1/messages?select=*&order=created_at.desc&limit=${_ADMIN_PAGE_SIZE}&offset=${offset}`;
    if(search) url += `&or=(sender_id.ilike.*${encodeURIComponent(search)}*,chat_id.ilike.*${encodeURIComponent(search)}*)`;

    const res  = await fetch(url, {
      headers: { 'apikey': SUPA_ANON, 'Authorization': 'Bearer ' + SUPA_ANON, 'Prefer': 'count=exact' }
    });
    const msgs  = await res.json();
    const total = _parseCount(res.headers.get('content-range'));

    let html = offset === 0 ? `<div class="adm-msg-header"><span class="adm-msg-total">Total: ${total} messages</span></div>` : '';

    if(!msgs || msgs.length === 0){
      html += `<div class="adm-empty">কোনো message পাওয়া যায়নি</div>`;
      if(offset === 0) list.innerHTML = html;
      return;
    }

    html += `<div class="adm-mon-list">`;
    msgs.forEach(m => {
      const time     = m.created_at ? new Date(m.created_at).toLocaleString('en-BD') : '—';
      const isDeleted= m.deleted === true;
      const isHidden = m.media_hidden === true;
      const mediaIcon= m.media_type === 'image' ? '📷' : m.media_type === 'video' ? '🎥'
                     : m.media_type === 'audio'  ? '🎵' : m.media_type === 'voice' ? '🎤'
                     : m.media_type === 'document'? '📎' : m.media_type === 'location' ? '📍' : '';

      html += `
        <div class="adm-mon-row ${isDeleted ? 'adm-mon-deleted' : ''}">
          <div class="adm-mon-meta">
            <span class="adm-mon-sender">👤 ${_esc((m.sender_id||'').slice(0,14))}...</span>
            <span class="adm-mon-time">${time}</span>
            ${isDeleted ? '<span class="adm-mon-badge adm-mon-badge-del">🗑 Deleted</span>' : ''}
            ${isHidden  ? '<span class="adm-mon-badge adm-mon-badge-hid">🔒 Hidden</span>' : ''}
            ${m.seen    ? '<span class="adm-mon-badge adm-mon-badge-seen">✓ Seen</span>'   : ''}
          </div>
          <div class="adm-mon-body">
            ${mediaIcon ? `<span class="adm-msg-media">${mediaIcon} ${_esc(m.media_type)}</span>` : ''}
            ${m.text    ? `<span class="adm-mon-text">${_esc(m.text.slice(0,160))}${m.text.length>160?'…':''}</span>` : ''}
          </div>
          <div class="adm-msg-chat-id">Chat: ${_esc((m.chat_id||'').slice(0,35))}...</div>
          ${isDeleted ? `<button class="adm-act-btn adm-act-unblock" style="margin-top:5px;font-size:11px;padding:4px 10px" onclick="_adminRestoreMsg('${m.id}',this)">♻ Restore</button>` : ''}
        </div>`;
    });
    html += `</div>`;

    if(msgs.length === _ADMIN_PAGE_SIZE){
      html += `<div class="adm-pagination"><button class="adm-page-btn" onclick="_fetchMonitorMsgs('${_esc(search)}',${offset+_ADMIN_PAGE_SIZE})">Load more <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg></button></div>`;
    }

    if(offset === 0){ list.innerHTML = html; }
    else{
      const existing = list.querySelector('.adm-mon-list');
      if(existing){
        const tmp = document.createElement('div'); tmp.innerHTML = html;
        const newList = tmp.querySelector('.adm-mon-list');
        if(newList) existing.insertAdjacentHTML('beforeend', newList.innerHTML);
        const oldPag = list.querySelector('.adm-pagination'); if(oldPag) oldPag.remove();
        const newPag = tmp.querySelector('.adm-pagination'); if(newPag) list.appendChild(newPag);
      }
    }
  }catch(e){ list.innerHTML = `<div class="adm-error">লোড হয়নি</div>`; }
}

//  DELETED MESSAGES TAB
async function _loadDeletedMessages(offset = 0){
  const content = $('admContent');
  if(!content) return;

  if(offset === 0){
    try{
      const cached = localStorage.getItem('solvix_adm_deleted');
      if(cached){
        content.innerHTML = JSON.parse(cached);
      } else {
        content.innerHTML = `<div class="adm-loading"><div class="spin"></div></div>`;
      }
    }catch(_){
      content.innerHTML = `<div class="adm-loading"><div class="spin"></div></div>`;
    }
  }

  try{
    const res = await fetch(
      SUPA_URL + `/rest/v1/messages?deleted=eq.true&select=*&order=deleted_at.desc.nullslast&limit=${_ADMIN_PAGE_SIZE}&offset=${offset}`,
      { headers: { 'apikey': SUPA_ANON, 'Authorization': 'Bearer ' + SUPA_ANON, 'Prefer': 'count=exact' } }
    );
    const msgs  = await res.json();
    const total = _parseCount(res.headers.get('content-range'));

    let html = offset === 0
      ? `<div class="adm-msg-header" style="padding:10px 12px">
           <span class="adm-msg-total">🗑 মোট Deleted: ${total}</span>
           <button class="adm-act-btn adm-act-unblock" style="font-size:12px;padding:5px 14px"
             onclick="_adminRestoreAllMsg()">♻ Restore All</button>
         </div>`
      : '';

    if(!msgs || msgs.length === 0){
      html += `<div class="adm-empty">কোনো deleted message নেই</div>`;
      if(offset === 0) content.innerHTML = html; return;
    }

    html += `<div class="adm-mon-list">`;
    msgs.forEach(m => {
      const sentTime    = m.created_at    ? new Date(m.created_at).toLocaleString('en-BD')    : '—';
      const deletedTime = m.deleted_at    ? new Date(m.deleted_at).toLocaleString('en-BD')    : '—';
      const mediaIcon   = m.media_type === 'image' ? '📷' : m.media_type === 'video' ? '🎥'
                        : m.media_type === 'audio'  ? '🎵' : m.media_type === 'voice' ? '🎤'
                        : m.media_type === 'document'? '📎' : '';

      html += `
        <div class="adm-mon-row adm-mon-deleted">
          <div class="adm-mon-meta">
            <span class="adm-mon-sender">👤 ${_esc((m.sender_id||'').slice(0,14))}...</span>
            <span class="adm-mon-time">Sent: ${sentTime}</span>
            <span class="adm-mon-badge adm-mon-badge-del">🗑 ${deletedTime}</span>
          </div>
          <div class="adm-mon-body">
            ${mediaIcon ? `<span class="adm-msg-media">${mediaIcon} ${_esc(m.media_type)}</span>` : ''}
            ${m.text    ? `<span class="adm-mon-text">${_esc(m.text.slice(0,200))}${m.text.length>200?'…':''}</span>` : ''}
            ${m.media_url ? `<div style="margin-top:4px"><a href="${_esc(m.media_url)}" target="_blank" class="adm-media-link">🔗 Media দেখুন</a></div>` : ''}
          </div>
          <div class="adm-msg-chat-id">Chat: ${_esc((m.chat_id||'').slice(0,35))}...</div>
          <button class="adm-act-btn adm-act-unblock" style="margin-top:6px;font-size:12px;padding:5px 14px"
            onclick="_adminRestoreMsg('${m.id}',this)">♻ Restore করুন</button>
        </div>`;
    });
    html += `</div>`;

    if(msgs.length === _ADMIN_PAGE_SIZE){
      html += `<div class="adm-pagination"><button class="adm-page-btn" onclick="_loadDeletedMessages(${offset+_ADMIN_PAGE_SIZE})">Load more</button></div>`;
    }

    if(offset === 0){ content.innerHTML = html; try{ localStorage.setItem('solvix_adm_deleted', JSON.stringify(html)); }catch(_){} }
    else{
      const existing = content.querySelector('.adm-mon-list');
      if(existing){
        const tmp = document.createElement('div'); tmp.innerHTML = html;
        const newList = tmp.querySelector('.adm-mon-list');
        if(newList) existing.insertAdjacentHTML('beforeend', newList.innerHTML);
        const oldPag = content.querySelector('.adm-pagination'); if(oldPag) oldPag.remove();
        const newPag = tmp.querySelector('.adm-pagination'); if(newPag) content.appendChild(newPag);
      }
    }
  }catch(e){ content.innerHTML = `<div class="adm-error">লোড হয়নি</div>`; }
}

// একটা message restore
async function _adminRestoreMsg(id, btn){
  if(btn){ btn.disabled = true; btn.textContent = '...'; }
  try{
    await fetch(SUPA_URL + `/rest/v1/messages?id=eq.${id}`, {
      method: 'PATCH',
      headers: { 'apikey': SUPA_ANON, 'Authorization': 'Bearer ' + SUPA_ANON, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({ deleted: false, deleted_at: null })
    });
    const row = btn?.closest('.adm-mon-row');
    if(row){ row.style.opacity='0'; row.style.transition='opacity .3s'; setTimeout(()=>row.remove(),300); }
    toast('Message restored!', 'success');
  }catch(_){ toast('Failed','error'); if(btn){ btn.disabled=false; btn.textContent='♻ Restore করুন'; } }
}

// সব deleted message একসাথে restore
async function _adminRestoreAllMsg(){
  if(!confirm('সব deleted message restore করবেন?')) return;
  try{
    await fetch(SUPA_URL + `/rest/v1/messages?deleted=eq.true`, {
      method: 'PATCH',
      headers: { 'apikey': SUPA_ANON, 'Authorization': 'Bearer ' + SUPA_ANON, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({ deleted: false, deleted_at: null })
    });
    toast('সব message restore হয়েছে!', 'success');
    _loadDeletedMessages();
  }catch(_){ toast('Failed','error'); }
}

//  MEDIA VAULT TAB — hidden media (12 ঘন্টার পরে)
async function _loadMediaVault(offset = 0){
  const content = $('admContent');
  if(!content) return;

  if(offset === 0){
    try{
      const cached = localStorage.getItem('solvix_adm_media');
      if(cached){
        content.innerHTML = JSON.parse(cached);
      } else {
        content.innerHTML = `<div class="adm-loading"><div class="spin"></div></div>`;
      }
    }catch(_){
      content.innerHTML = `<div class="adm-loading"><div class="spin"></div></div>`;
    }
  }

  try{
    const res = await fetch(
      SUPA_URL + `/rest/v1/messages?media_url=not.is.null&media_hidden=eq.true&select=*&order=media_hidden_at.desc.nullslast&limit=${_ADMIN_PAGE_SIZE}&offset=${offset}`,
      { headers: { 'apikey': SUPA_ANON, 'Authorization': 'Bearer ' + SUPA_ANON, 'Prefer': 'count=exact' } }
    );
    const msgs  = await res.json();
    const total = _parseCount(res.headers.get('content-range'));

    let html = offset === 0
      ? `<div class="adm-msg-header" style="padding:10px 12px">
           <span class="adm-msg-total">🔒 Hidden Media: ${total}</span>
           <button class="adm-act-btn adm-act-unblock" style="font-size:12px;padding:5px 14px"
             onclick="_adminRestoreAllMedia()">♻ Restore All</button>
         </div>`
      : '';

    if(!msgs || msgs.length === 0){
      html += `<div class="adm-empty">কোনো hidden media নেই</div>`;
      if(offset === 0) content.innerHTML = html; return;
    }

    html += `<div class="adm-media-grid">`;
    msgs.forEach(m => {
      const hiddenTime = m.media_hidden_at ? new Date(m.media_hidden_at).toLocaleString('en-BD') : '—';
      const sentTime   = m.created_at      ? new Date(m.created_at).toLocaleString('en-BD')      : '—';
      const isImage    = m.media_type === 'image' || m.media_type === 'viewonce';
      const isVideo    = m.media_type === 'video';
      const isAudio    = m.media_type === 'audio' || m.media_type === 'voice';
      const isDoc      = m.media_type === 'document';

      let previewHTML = '';
      if(isImage && m.media_url){
        previewHTML = `<img src="${_esc(m.media_url)}" class="adm-media-thumb" onclick="window.open('${_esc(m.media_url)}','_blank')">`;
      } else if(isVideo && m.media_url){
        previewHTML = `<video src="${_esc(m.media_url)}" class="adm-media-thumb" controls></video>`;
      } else if(isAudio && m.media_url){
        previewHTML = `<audio src="${_esc(m.media_url)}" controls class="adm-media-audio"></audio>`;
      } else if(isDoc && m.media_url){
        previewHTML = `<a href="${_esc(m.media_url)}" target="_blank" class="adm-media-link">📎 Document খুলুন</a>`;
      }

      html += `
        <div class="adm-media-card">
          <div class="adm-media-preview">${previewHTML}</div>
          <div class="adm-media-info">
            <div class="adm-media-type">${m.media_type || 'file'}</div>
            <div class="adm-media-sender">👤 ${_esc((m.sender_id||'').slice(0,12))}...</div>
            <div class="adm-media-time">Sent: ${sentTime}</div>
            <div class="adm-media-time" style="color:var(--danger)">Hidden: ${hiddenTime}</div>
          </div>
          <button class="adm-act-btn adm-act-unblock" style="width:100%;margin-top:8px;font-size:12px"
            onclick="_adminRestoreMedia('${m.id}',this)">♻ Restore করুন</button>
        </div>`;
    });
    html += `</div>`;

    if(msgs.length === _ADMIN_PAGE_SIZE){
      html += `<div class="adm-pagination"><button class="adm-page-btn" onclick="_loadMediaVault(${offset+_ADMIN_PAGE_SIZE})">Load more</button></div>`;
    }

    if(offset === 0){ content.innerHTML = html; try{ localStorage.setItem('solvix_adm_media', JSON.stringify(html)); }catch(_){} }
    else{
      if(existing){
        const tmp = document.createElement('div'); tmp.innerHTML = html;
        const newGrid = tmp.querySelector('.adm-media-grid');
        if(newGrid) existing.insertAdjacentHTML('beforeend', newGrid.innerHTML);
        const oldPag = content.querySelector('.adm-pagination'); if(oldPag) oldPag.remove();
        const newPag = tmp.querySelector('.adm-pagination'); if(newPag) content.appendChild(newPag);
      }
    }
  }catch(e){ content.innerHTML = `<div class="adm-error">লোড হয়নি</div>`; }
}

// একটা media restore
async function _adminRestoreMedia(id, btn){
  if(btn){ btn.disabled=true; btn.textContent='...'; }
  try{
    await fetch(SUPA_URL + `/rest/v1/messages?id=eq.${id}`, {
      method: 'PATCH',
      headers: { 'apikey': SUPA_ANON, 'Authorization': 'Bearer ' + SUPA_ANON, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({ media_hidden: false, media_hidden_at: null })
    });
    const card = btn?.closest('.adm-media-card');
    if(card){ card.style.opacity='0'; card.style.transition='opacity .3s'; setTimeout(()=>card.remove(),300); }
    toast('Media restored!', 'success');
  }catch(_){ toast('Failed','error'); if(btn){ btn.disabled=false; btn.textContent='♻ Restore করুন'; } }
}

// সব hidden media restore
async function _adminRestoreAllMedia(){
  if(!confirm('সব hidden media restore করবেন? User রা আবার দেখতে পাবে।')) return;
  try{
    await fetch(SUPA_URL + `/rest/v1/messages?media_hidden=eq.true`, {
      method: 'PATCH',
      headers: { 'apikey': SUPA_ANON, 'Authorization': 'Bearer ' + SUPA_ANON, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({ media_hidden: false, media_hidden_at: null })
    });
    toast('সব media restore হয়েছে!', 'success');
    _loadMediaVault();
  }catch(_){ toast('Failed','error'); }
}

//  STORAGE & USAGE PAGE
async function _loadStoragePage(){
  const content = $('admContent');
  if(!content) return;

  // Cache থেকে সাথে সাথে দেখাও
  try{
    const cached = localStorage.getItem('solvix_adm_storage');
    if(cached){
      content.innerHTML = JSON.parse(cached);
    } else {
      content.innerHTML = `<div class="adm-loading"><div class="spin"></div></div>`;
    }
  }catch(_){
    content.innerHTML = `<div class="adm-loading"><div class="spin"></div></div>`;
  }

  const [supaData, appStats, cfData, cfCalls, fbData] = await Promise.all([
    _fetchSupabaseUsage(),
    _fetchAppStats(),
    _fetchCloudflareUsage(),
    _fetchCallsUsage(),
    _fetchFirebaseUsage(),
  ]);

  let html = `<div class="adm-storage-wrap">`;

  // ══ APP STATS OVERVIEW ══
  html += `
    <div class="adm-stor-section">
      <div class="adm-stor-header" style="border-bottom:none">
        <div class="adm-stor-logo" style="background:rgba(0,229,184,0.12);color:var(--accent)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
        </div>
        <div><div class="adm-stor-name">App Overview</div><div class="adm-stor-plan">সব platform এর summary</div></div>
      </div>
      <div class="adm-stor-info-grid" style="grid-template-columns:repeat(3,1fr)">
        <div class="adm-stor-info-card">
          <div class="adm-stor-info-val" style="color:var(--accent2)">${appStats.messages || 0}</div>
          <div class="adm-stor-info-lbl">💬 Messages</div>
        </div>
        <div class="adm-stor-info-card">
          <div class="adm-stor-info-val" style="color:#ffb300">${appStats.media_files || 0}</div>
          <div class="adm-stor-info-lbl">📎 Media Files</div>
        </div>
        <div class="adm-stor-info-card">
          <div class="adm-stor-info-val" style="color:var(--accent)">${appStats.chats_total || 0}</div>
          <div class="adm-stor-info-lbl">🗨 Chats</div>
        </div>
        <div class="adm-stor-info-card">
          <div class="adm-stor-info-val" style="color:var(--accent)">${appStats.calls_total || 0}</div>
          <div class="adm-stor-info-lbl">📞 Total Calls</div>
        </div>
        <div class="adm-stor-info-card">
          <div class="adm-stor-info-val" style="color:var(--accent2)">${appStats.calls_voice || 0}</div>
          <div class="adm-stor-info-lbl">🎙 Voice</div>
        </div>
        <div class="adm-stor-info-card">
          <div class="adm-stor-info-val" style="color:#a78bfa">${appStats.calls_video || 0}</div>
          <div class="adm-stor-info-lbl">🎥 Video</div>
        </div>
      </div>
      <div class="adm-stor-tables" style="padding-top:8px">
        <div class="adm-stor-table-row">
          <span class="adm-stor-table-name">⏱ মোট call duration</span>
          <span class="adm-stor-table-meta" style="color:var(--accent)">${_formatDur(appStats.calls_duration || 0)}</span>
        </div>
        <div class="adm-stor-table-row">
          <span class="adm-stor-table-name">🗑 Deleted messages</span>
          <span class="adm-stor-table-meta">${appStats.messages_deleted || 0} টি</span>
        </div>
        <div class="adm-stor-table-row">
          <span class="adm-stor-table-name">🔒 Hidden media</span>
          <span class="adm-stor-table-meta">${appStats.media_hidden || 0} টি</span>
        </div>
        <div class="adm-stor-table-row">
          <span class="adm-stor-table-name">📵 Missed calls</span>
          <span class="adm-stor-table-meta" style="color:var(--danger)">${appStats.calls_missed || 0} টি</span>
        </div>
      </div>
    </div>`;

  // ══ CLOUDFLARE CALLS USAGE ══
  const cfCallsColor = !cfCalls.ok ? 'var(--t3)' : cfCalls.percent_used > 80 ? 'var(--danger)' : cfCalls.percent_used > 60 ? '#ffb300' : '#f97316';
  html += `
    <div class="adm-stor-section">
      <div class="adm-stor-header">
        <div class="adm-stor-logo" style="background:rgba(249,130,52,0.12);color:#f97316">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>
        </div>
        <div>
          <div class="adm-stor-name">Cloudflare Calls</div>
          <div class="adm-stor-plan">Free: 1,000 min/month · ${cfCalls.month || ''}</div>
        </div>
        <div class="adm-stor-status">${cfCalls.ok ? '🟢' : '🔴'}</div>
      </div>
      ${cfCalls.ok ? `
        <div class="adm-stor-bar-wrap">
          <div class="adm-stor-bar-label">
            <span>Participant Minutes</span>
            <span style="color:${cfCallsColor}">${cfCalls.used_minutes} / 1,000 min</span>
          </div>
          <div class="adm-stor-bar">
            <div class="adm-stor-bar-fill" style="width:${cfCalls.percent_used}%;background:${cfCallsColor}"></div>
          </div>
          <div class="adm-stor-pct">${cfCalls.percent_used}% used</div>
        </div>
        <div class="adm-stor-tables">
          <div class="adm-stor-table-row">
            <span class="adm-stor-table-name">✅ বাকি আছে</span>
            <span class="adm-stor-table-meta" style="color:var(--accent)">${cfCalls.remaining} participant-minutes</span>
          </div>
          <div class="adm-stor-table-row">
            <span class="adm-stor-table-name">📞 Voice call করা যাবে</span>
            <span class="adm-stor-table-meta" style="color:var(--accent2)">${_formatDur(Math.floor(cfCalls.remaining / 2) * 60)}</span>
          </div>
          <div class="adm-stor-table-row">
            <span class="adm-stor-table-name">🎥 Video call করা যাবে</span>
            <span class="adm-stor-table-meta" style="color:#a78bfa">${_formatDur(Math.floor(cfCalls.remaining / 2) * 60)}</span>
          </div>
          <div class="adm-stor-table-row">
            <span class="adm-stor-table-name">📊 এই মাসে ব্যবহার হয়েছে</span>
            <span class="adm-stor-table-meta">${_formatDur(Math.floor(cfCalls.used_minutes / 2) * 60)}</span>
          </div>
          <div class="adm-stor-table-row">
            <span class="adm-stor-table-name">💰 Limit শেষ হলে</span>
            <span class="adm-stor-table-meta">$0.05 / 1,000 participant-min</span>
          </div>
        </div>
      ` : `<div class="adm-error" style="padding:12px">${cfCalls.error || 'লোড হয়নি'}</div>`}
    </div>`;

  // ══ SUPABASE ══
  html += `
    <div class="adm-stor-section">
      <div class="adm-stor-header">
        <div class="adm-stor-logo" style="background:rgba(62,207,142,0.12);color:#3ecf8e">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M11.9 1.036c-.015-.986-1.26-1.41-1.874-.637L.764 12.05C.199 12.768.718 13.81 1.624 13.81h9.072l.2 9.154c.015.986 1.26 1.41 1.874.637l9.262-11.649c.565-.718.046-1.76-.86-1.76h-9.072l-.2-9.156z"/></svg>
        </div>
        <div><div class="adm-stor-name">Supabase Database</div><div class="adm-stor-plan">Free Plan · 500 MB limit</div></div>
        <div class="adm-stor-status">${supaData.ok ? '🟢' : '🔴'}</div>
      </div>
      ${supaData.ok ? `
        <div class="adm-stor-bar-wrap">
          <div class="adm-stor-bar-label">
            <span>Database Size</span>
            <span>${supaData.db_size} / 500 MB</span>
          </div>
          <div class="adm-stor-bar">
            <div class="adm-stor-bar-fill" style="width:${Math.min(supaData.percent,100)}%;background:${supaData.percent>80?'var(--danger)':supaData.percent>60?'#ffb300':'#3ecf8e'}"></div>
          </div>
          <div class="adm-stor-pct">${supaData.percent}% used · ${Math.round(500 - (supaData.percent * 5))} MB বাকি</div>
        </div>
        <div class="adm-stor-tables">
          ${supaData.tables.map(t => `
            <div class="adm-stor-table-row">
              <span class="adm-stor-table-name">📋 ${_esc(t.name)}</span>
              <span class="adm-stor-table-meta">${t.rows >= 0 ? Number(t.rows).toLocaleString() + ' rows' : ''} · ${_esc(t.size)}</span>
            </div>`).join('')}
        </div>
      ` : `<div class="adm-error" style="padding:12px">${supaData.error}</div>`}
    </div>`;

  // ══ FIREBASE ══
  html += `
    <div class="adm-stor-section">
      <div class="adm-stor-header">
        <div class="adm-stor-logo" style="background:rgba(255,160,0,0.12);color:#ffb300">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3.89 15.672L6.255.461A.542.542 0 0 1 7.27.288l2.543 4.771zm16.794 3.692l-2.25-14a.54.54 0 0 0-.919-.295L3.316 19.365l7.856 4.427a1.621 1.621 0 0 0 1.588 0zM14.3 7.147l-1.82-3.482a.542.542 0 0 0-.96 0L3.53 17.984z"/></svg>
        </div>
        <div><div class="adm-stor-name">Firebase</div><div class="adm-stor-plan">Spark Plan · Firestore + Auth + RTDB</div></div>
        <div class="adm-stor-status">🟡</div>
      </div>
      <div class="adm-stor-info-grid">
        <div class="adm-stor-info-card">
          <div class="adm-stor-info-val">${fbData.users}</div>
          <div class="adm-stor-info-lbl">👥 Users</div>
        </div>
        <div class="adm-stor-info-card">
          <div class="adm-stor-info-val">∞</div>
          <div class="adm-stor-info-lbl">Max Users</div>
        </div>
        <div class="adm-stor-info-card">
          <div class="adm-stor-info-val">1 GB</div>
          <div class="adm-stor-info-lbl">DB Limit</div>
        </div>
        <div class="adm-stor-info-card">
          <div class="adm-stor-info-val">50K</div>
          <div class="adm-stor-info-lbl">Reads/day</div>
        </div>
        <div class="adm-stor-info-card">
          <div class="adm-stor-info-val">20K</div>
          <div class="adm-stor-info-lbl">Writes/day</div>
        </div>
        <div class="adm-stor-info-card">
          <div class="adm-stor-info-val">1 GB</div>
          <div class="adm-stor-info-lbl">RTDB Limit</div>
        </div>
      </div>
      <div class="adm-stor-note">⚠️ Firebase Spark plan এ Auth unlimited users allowed। Firestore exact usage Firebase Console এ দেখো।</div>
    </div>`;

  html += `
    <div style="text-align:center;font-size:11px;color:var(--t3);padding:16px">
      Last updated: ${new Date().toLocaleString('en-BD')}
    </div>
  </div>`;

  content.innerHTML = html;
  try{ localStorage.setItem('solvix_adm_storage', JSON.stringify(html)); }catch(_){}
}

function _formatDur(seconds){
  if(!seconds) return '0 sec';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if(h > 0) return `${h}h ${m}m`;
  if(m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

async function _fetchAppStats(){
  try{
    const res = await fetch(SUPA_URL + '/rest/v1/rpc/get_app_stats', {
      method: 'POST',
      headers: { 'apikey': SUPA_ANON, 'Authorization': 'Bearer ' + SUPA_ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    if(!res.ok) return {};
    return await res.json();
  }catch(_){ return {}; }
}

async function _fetchCallsUsage(){
  try{
    const res = await fetch('https://vocall.kamrulbinsalim.workers.dev/calls-usage');
    if(!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  }catch(e){
    return { ok: false, error: e.message };
  }
}

async function _fetchSupabaseUsage(){
  try{
    const res = await fetch(SUPA_URL + '/rest/v1/rpc/get_db_stats', {
      method: 'POST',
      headers: {
        'apikey':        SUPA_ANON,
        'Authorization': 'Bearer ' + SUPA_ANON,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({})
    });
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const bytes   = data.db_size_bytes || 0;
    const limitB  = 500 * 1024 * 1024; // 500 MB
    const percent = Math.round((bytes / limitB) * 100);
    const tables  = (data.tables || []).sort((a,b) => b.size_bytes - a.size_bytes);
    return { ok: true, db_size: data.db_size || '—', percent, tables };
  }catch(e){
    return { ok: false, error: 'Supabase লোড হয়নি: ' + e.message };
  }
}

async function _fetchCloudflareUsage(){
  try{
    const res = await fetch('https://vocall.kamrulbinsalim.workers.dev/usage');
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if(data.error) throw new Error(data.error);
    return {
      ok:           true,
      workers_count: data.workers?.count || 0,
      worker_names:  (data.workers?.services || []).map(s => s.name),
      r2_buckets:    data.r2?.bucket_count || 0,
    };
  }catch(e){
    return { ok: false, error: 'Cloudflare লোড হয়নি: ' + e.message };
  }
}

async function _fetchFirebaseUsage(){
  try{
    const snap = await db.collection('users').limit(500).get();
    const users = snap.docs.filter(d => d.data().accountDeleted !== true).length;
    return { ok: true, users };
  }catch(e){
    return { ok: false, users: '—' };
  }
}

function _esc(s){
  if(s === null || s === undefined) return '';
  const d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
}

// ADMIN — REMOVE USER PHOTO
async function _adminRemovePhoto(uid, username, name){
  if(!confirm(name + '-এর profile photo সরাবেন?')) return;
  try{
    if(username){
      await db.collection('users').doc(username).update({ photoURL: '', updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    } else {
      const snap = await db.collection('users').where('uid','==',uid).limit(1).get();
      if(!snap.empty) await snap.docs[0].ref.update({ photoURL: '' });
    }
    toast('Profile photo সরানো হয়েছে', 'success');
    _adminPage('users');
  }catch(e){ toast('Failed: ' + e.message, 'error'); }
}

// ADMIN — PRIVACY OVERRIDE MODAL
function _adminPrivacyOverride(uid, username, name){
  const old = document.getElementById('admPrivacyModal');
  if(old) old.remove();

  function prvRow(id, label){
    return `<div class="adm-prv-row">
      <span class="adm-prv-label">${label}</span>
      <select class="adm-prv-select" id="${id}">
        <option value="keep"    selected>Keep as-is</option>
        <option value="public">Public</option>
        <option value="private">Private</option>
      </select>
    </div>`;
  }

  const overlay = document.createElement('div');
  overlay.id = 'admPrivacyModal';
  overlay.className = 'adm-modal-overlay';
  overlay.innerHTML = `
    <div class="adm-modal-sheet">
      <div class="adm-modal-handle"></div>
      <div class="adm-modal-header">
        <div class="adm-modal-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Privacy Override
        </div>
        <button class="adm-modal-close" onclick="document.getElementById('admPrivacyModal').remove()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="adm-modal-target">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <span>${_esc(name)}</span>
        ${username ? '<span class="adm-modal-handle-txt">@' + _esc(username) + '</span>' : ''}
      </div>
      <div class="adm-modal-desc">এই user-এর privacy settings force করুন। "Keep as-is" মানে পরিবর্তন হবে না।</div>
      <div class="adm-prv-grid">
        ${prvRow('admPrv_phone',    'Phone Number')}
        ${prvRow('admPrv_email',    'Email Address')}
        ${prvRow('admPrv_gender',   'Gender')}
        ${prvRow('admPrv_address',  'Address')}
        ${prvRow('admPrv_social',   'Social Media')}
        ${prvRow('admPrv_photo',    'Profile Photo')}
        ${prvRow('admPrv_lastseen', 'Last Seen / Online')}
      </div>
      <div class="adm-modal-actions">
        <button class="adm-modal-cancel" onclick="document.getElementById('admPrivacyModal').remove()">Cancel</button>
        <button class="adm-modal-submit" onclick="_applyPrivacyOverride('${_esc(uid)}','${_esc(username)}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          Apply Override
        </button>
      </div>
    </div>`;

  const _closePrivacyModal = () => {
    _popBack();
    const m = document.getElementById('admPrivacyModal');
    if(m){ m.classList.remove('open'); setTimeout(() => m.remove(), 300); }
  };
  overlay.addEventListener('click', e => { if(e.target === overlay) _closePrivacyModal(); });
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));
  _pushBack(_closePrivacyModal, 'adminprivacy');
}

async function _applyPrivacyOverride(uid, username){
  const g  = id => document.getElementById(id)?.value;
  const tv = v  => v === 'keep' ? undefined : v === 'public';
  const privacy = {};
  const map = { phone:'admPrv_phone', email:'admPrv_email', gender:'admPrv_gender', address:'admPrv_address', social:'admPrv_social', photo:'admPrv_photo', lastSeen:'admPrv_lastseen' };
  const keys = { phone:'showPhone', email:'showEmail', gender:'showGender', address:'showAddress', social:'showSocial', photo:'showPhoto', lastSeen:'showLastSeen' };
  for(const k in map){
    const v = tv(g(map[k]));
    if(v !== undefined) privacy[keys[k]] = v;
  }
  if(Object.keys(privacy).length === 0){ toast('সব "Keep as-is" — পরিবর্তন নেই', 'info'); return; }
  try{
    if(username){
      await db.collection('users').doc(username).update({ privacy });
    } else {
      const snap = await db.collection('users').where('uid','==',uid).limit(1).get();
      if(!snap.empty) await snap.docs[0].ref.update({ privacy });
    }
    const _m = document.getElementById('admPrivacyModal');
    if(_m){ _popBack(); _m.classList.remove('open'); setTimeout(() => _m.remove(), 300); }
    toast('Privacy override প্রয়োগ হয়েছে', 'success');
  }catch(e){ toast('Failed: ' + e.message, 'error'); }
}

// ADMIN — REPORTS TAB
async function _loadReportsTab(){
  const content = $('admContent');
  if(!content) return;
  const reasonLabels = { spam:'Spam or Unwanted Content', fake:'Fake Account or Impersonation', harass:'Harassment or Bullying', harmful:'Harmful or Dangerous Content', other:'Other' };
  try{
    const snap = await db.collection('reports').orderBy('createdAt','desc').limit(100).get();
    if(snap.empty){
      content.innerHTML = `<div class="adm-empty" style="margin-top:60px;text-align:center">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" stroke-width="1.5" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <div style="margin-top:12px;color:var(--t2)">কোনো report নেই</div>
      </div>`;
      return;
    }
    const all      = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const pending  = all.filter(r => r.status === 'pending');
    const reviewed = all.filter(r => r.status !== 'pending');

    let html = `
      <div class="adm-tab-bar">
        <button class="adm-tab active" id="rptTabPending"  onclick="_rptSwitchTab('pending')">
          Pending ${pending.length > 0 ? '<span class="adm-tab-badge">'+pending.length+'</span>' : ''}
        </button>
        <button class="adm-tab" id="rptTabReviewed" onclick="_rptSwitchTab('reviewed')">
          Reviewed
        </button>
      </div>
      <div id="rptListPending" class="adm-rpt-list">`;
    if(pending.length === 0){
      html += `<div class="adm-empty" style="margin-top:32px;text-align:center;color:var(--t2)">সব reports reviewed</div>`;
    } else {
      pending.forEach(r => { html += _buildReportCard(r, reasonLabels); });
    }
    html += `</div><div id="rptListReviewed" class="adm-rpt-list" style="display:none">`;
    if(reviewed.length === 0){
      html += `<div class="adm-empty" style="margin-top:32px;text-align:center;color:var(--t2)">কোনো reviewed report নেই</div>`;
    } else {
      reviewed.forEach(r => { html += _buildReportCard(r, reasonLabels); });
    }
    html += `</div>`;
    content.innerHTML = html;
  }catch(e){
    content.innerHTML = `<div class="adm-error">Reports লোড হয়নি: ${_esc(e.message)}</div>`;
  }
}

function _rptSwitchTab(tab){
  const p = tab === 'pending';
  document.getElementById('rptTabPending' )?.classList.toggle('active',  p);
  document.getElementById('rptTabReviewed')?.classList.toggle('active', !p);
  const lp = document.getElementById('rptListPending');
  const lr = document.getElementById('rptListReviewed');
  if(lp) lp.style.display = p  ? '' : 'none';
  if(lr) lr.style.display = !p ? '' : 'none';
}

function _buildReportCard(r, reasonLabels){
  const time  = r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString('en-BD') : '—';
  const isPend = r.status === 'pending';
  const stCol = isPend ? '#ffb300' : r.status === 'dismissed' ? 'var(--t3)' : 'var(--accent)';
  const stLbl = isPend ? 'Pending' : r.status === 'dismissed' ? 'Dismissed' : 'Actioned';
  return `
    <div class="adm-rpt-card">
      <div class="adm-rpt-top">
        <div class="adm-rpt-who">
          <div class="adm-rpt-avatar">${(r.reportedName||'?')[0].toUpperCase()}</div>
          <div>
            <div class="adm-rpt-name">${_esc(r.reportedName||'Unknown')}</div>
            <div class="adm-rpt-handle">${r.reportedUsername ? '@'+_esc(r.reportedUsername) : _esc(r.reportedUid||'—')}</div>
          </div>
        </div>
        <span class="adm-rpt-status" style="color:${stCol};background:${stCol}1a">${stLbl}</span>
      </div>
      <div class="adm-rpt-reason">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>
        ${_esc(reasonLabels[r.reason] || r.reason || '—')}
      </div>
      ${r.note ? `<div class="adm-rpt-note">${_esc(r.note)}</div>` : ''}
      <div class="adm-rpt-meta">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        ${time} · By: ${r.reporterUsername ? '@'+_esc(r.reporterUsername) : _esc(r.reporterUid||'—')}
      </div>
      ${isPend ? `<div class="adm-rpt-btns">
        <button class="adm-rpt-btn adm-rpt-dismiss" onclick="_adminReviewReport('${r.id}','dismissed',this,'','')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          Dismiss
        </button>
        <button class="adm-rpt-btn adm-rpt-block-btn" onclick="_adminReviewReport('${r.id}','actioned',this,'${_esc(r.reportedUid||'')}','${_esc(r.reportedUsername||'')}')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
          Block User
        </button>
      </div>` : ''}
    </div>`;
}

async function _adminReviewReport(reportId, action, btn, targetUid, targetUsername){
  if(btn) btn.disabled = true;
  try{
    await db.collection('reports').doc(reportId).update({
      status:     action,
      reviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
      reviewedBy: CUD?.username || CU?.uid || 'admin',
    });
    if(action === 'actioned' && (targetUid || targetUsername)){
      if(targetUsername){
        await db.collection('users').doc(targetUsername).update({ blocked: true });
      } else if(targetUid){
        const snap = await db.collection('users').where('uid','==',targetUid).limit(1).get();
        if(!snap.empty) await snap.docs[0].ref.update({ blocked: true });
      }
      toast('User blocked ও report actioned', 'success');
    } else {
      toast('Report ' + action, 'success');
    }
    const card = btn?.closest('.adm-rpt-card');
    if(card){ card.style.opacity='0.4'; card.style.pointerEvents='none'; }
    setTimeout(() => _loadReportsTab(), 700);
  }catch(e){ toast('Failed: ' + e.message, 'error'); if(btn) btn.disabled = false; }
}

// ADMIN — BLOCKED USERS TAB
async function _loadBlockedTab(){
  const content = $('admContent');
  if(!content) return;
  try{
    const snap  = await db.collection('users').where('blocked','==',true).get();
    const users = snap.docs.map(d => d.data()).filter(u => u.accountDeleted !== true);
    if(users.length === 0){
      content.innerHTML = `<div class="adm-empty" style="margin-top:60px;text-align:center">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
        <div style="margin-top:12px;color:var(--t2)">কোনো blocked user নেই</div>
      </div>`;
      return;
    }
    let html = `<div class="adm-blocked-list">`;
    users.forEach(u => {
      const photo  = u.photoURL?.startsWith('https://') ? u.photoURL : '';
      const avHTML = photo ? `<img src="${photo}" alt="">` : `<span>${(u.name||'?')[0].toUpperCase()}</span>`;
      html += `
        <div class="adm-blocked-row">
          <div class="adm-blocked-av">${avHTML}</div>
          <div class="adm-blocked-info">
            <div class="adm-blocked-name">${_esc(u.name||'Unknown')}${u.verified?'<img src="verified.png" class="verified-badge" width="14" height="14" alt="">':''}</div>
            <div class="adm-blocked-meta">@${_esc(u.username||'—')} · ${_esc(u.phone||'—')}</div>
          </div>
          <button class="adm-unblock-btn" onclick="_adminToggleBlock('${_esc(u.uid||'')}','${_esc(u.username||'')}',true)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            Unblock
          </button>
        </div>`;
    });
    html += `</div>`;
    content.innerHTML = html;
  }catch(e){
    content.innerHTML = `<div class="adm-error">Blocked users লোড হয়নি: ${_esc(e.message)}</div>`;
  }
}
