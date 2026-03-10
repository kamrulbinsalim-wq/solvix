
// ── FIREBASE INIT ──
firebase.initializeApp({
  apiKey:            'AIzaSyAMCmZBxZoha4gWB5elP0p3qz1LHjTXo9s',
  authDomain:        'infobooks-4358d.firebaseapp.com',
  projectId:         'infobooks-4358d',
  messagingSenderId: '938954145740',
  appId:             '1:938954145740:web:ee2a334f8f0e621f552769',
  databaseURL:       'https://infobooks-4358d-default-rtdb.asia-southeast1.firebasedatabase.app'
});
const auth = firebase.auth();
const db   = firebase.firestore();
const FS   = firebase.firestore.FieldValue;

// ── CLOUDINARY ──
const CLOUDINARY_CLOUD  = 'dlporj4u2';
const CLOUDINARY_PRESET = 'vocall_media';

// ── DOM HELPER ──
const $ = id => document.getElementById(id);

// ── TOAST ──
let _toastTimer = null;
function toast(m, t=''){
  const e = $('toast');
  if(_toastTimer){ clearTimeout(_toastTimer); e.classList.remove('show'); }
  e.textContent = m;
  e.className = 'toast ' + t + ' show';
  _toastTimer = setTimeout(() => { e.classList.remove('show'); _toastTimer = null; }, 2800);
}

// ── SVG ICONS ──
const SVG_TICK  = `<span class="uname-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10" fill="rgba(0,229,184,0.15)" stroke="var(--accent)"/><polyline points="7.5 12 10.5 15 16.5 9" stroke="var(--accent)"/></svg></span>`;
const SVG_CROSS = `<span class="uname-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10" fill="rgba(255,68,102,0.15)" stroke="var(--danger)"/><line x1="15" y1="9" x2="9" y2="15" stroke="var(--danger)"/><line x1="9" y1="9" x2="15" y2="15" stroke="var(--danger)"/></svg></span>`;
const SVG_SPIN  = `<span class="uname-spin"></span>`;
const SPIN_SM   = `<div class="spin sm"></div>`;

// ── STATE ──
let CU = null, CUD = null, phoneV = '', emailV = '';
let _pendingNewUser = false, _regAvatarBlob = null;
let _selectedGender = '', _showLoginWelcome = false;
let _valid = { username: false, email: false };
const _checkTimers = {};

// ── BACK BUTTON HISTORY API ──
// যখন কোনো sheet/modal খুলবে তখন history-তে entry push হবে
// Android back button চাপলে sheet বন্ধ হবে, app থেকে বের হবে না
const _backHandlers = [];

function _pushBack(closeFn, key){
  if(key && _backHandlers.some(h => h.key === key)) return;
  _backHandlers.push({ closeFn, key: key||null });
  history.pushState({ modal: key||'open' }, '');
}

function _popBack(){
  if(_backHandlers.length > 0) _backHandlers.pop();
}

window.addEventListener('popstate', () => {
  if(_backHandlers.length > 0){
    const h = _backHandlers[_backHandlers.length - 1];
    _backHandlers.pop();
    try{ h.closeFn(); }catch(_){}
  }
});

// ── THEME ──
function applyTheme(t){
  document.documentElement.setAttribute('data-theme', t);
  const icon = $('themeIcon'); if(!icon) return;
  icon.innerHTML = t === 'light'
    ? '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>'
    : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
}
function toggleTheme(){
  const next = (localStorage.getItem('vc_theme') || 'dark') === 'dark' ? 'light' : 'dark';
  localStorage.setItem('vc_theme', next);
  applyTheme(next);
  toast(next === 'dark' ? '🌙 Dark mode' : '☀️ Light mode', 'success');
}
applyTheme(localStorage.getItem('vc_theme') || 'dark');

// ── SEARCH ──
let searchOpen = false;
function toggleSearch(){
  searchOpen = !searchOpen;
  $('homeSearchBar').classList.toggle('open', searchOpen);
  $('homeHdrLogo').classList.toggle('hidden', searchOpen);
  $('homeHdrActs').style.display = searchOpen ? 'none' : '';
  $('homeSearchBtn').classList.toggle('active', searchOpen);
  if(searchOpen){ setTimeout(() => $('searchInput').focus(), 80); }
  else { $('searchInput').value=''; _clearSearchHint(); }
}
document.addEventListener('keydown', e => { if(e.key==='Escape' && searchOpen) toggleSearch(); });
document.addEventListener('click', e => {
  if(!searchOpen) return;
  if(!$('homeSearchBar').contains(e.target) && !$('homeSearchBtn').contains(e.target)) toggleSearch();
});

function _clearSearchHint(){
  const h=$('searchTypeHint'); if(h){ h.className='search-type-hint'; h.textContent=''; }
}
function onSearchInput(inp){
  const val=inp.value.trim();
  const h=$('searchTypeHint'); if(!h) return;
  if(!val){ h.textContent=''; h.className='search-type-hint'; return; }
  const isPhone=/^(\+?880|0)1[3-9]\d*$/.test(val.replace(/\s/g,'')) || /^\d{5,}$/.test(val);
  if(isPhone){ h.textContent='PHONE'; h.className='search-type-hint phone'; }
  else{ h.textContent='@USER'; h.className='search-type-hint username'; }
}

async function doSearch(){
  const raw=$('searchInput').value.trim();
  if(!raw){ toast('নাম্বার বা ইউজারনেম লিখুন','error'); return; }

  let cleanPhone='';
  const stripped=raw.replace(/\s/g,'');
  let norm=stripped.replace(/\D/g,'');
  if(norm.startsWith('880')) norm='0'+norm.slice(3);
  if(norm.startsWith('01') && norm.length===11) cleanPhone=norm;
  const isPhone = cleanPhone.length>0 || /^\d{5,}$/.test(stripped);
  const isUsername = !isPhone;
  const uname=raw.toLowerCase().replace(/^@/,'').replace(/[^a-z0-9_]/g,'');

  const btn=document.querySelector('.search-go-btn');
  const orig=btn.innerHTML; btn.innerHTML=`<div class="spin sm"></div>`; btn.disabled=true;

  try{
    let userData=null;
    if(isPhone && cleanPhone){
      const snap=await db.collection('users').where('phone','==',cleanPhone).limit(1).get();
      if(!snap.empty) userData=snap.docs[0].data();
    }
    if(!userData && isUsername && uname.length>=2){
      const snap=await db.collection('users').doc(uname).get();
      if(snap.exists && !snap.data().accountDeleted) userData=snap.data();
    }

    if(!userData && isPhone && !cleanPhone){
      const snap=await db.collection('users').where('phone','==',stripped).limit(1).get();
      if(!snap.empty) userData=snap.docs[0].data();
    }

    if(userData && !userData.accountDeleted){
      _openProfileSheet(userData);
      if(searchOpen) toggleSearch();
    } else {
      _openNotFoundSheet(raw);
    }
  }catch(err){
    toast('Connection error. Please try again.','error');
  }finally{
    btn.innerHTML=orig; btn.disabled=false;
  }
}

// ── BUILD PROFILE HTML (shared) ──
async function doRefresh(){
  if(!CU){ toast('Please log in first','error'); return; }
  const btn = $('homeRefreshBtn');
  btn.classList.add('spinning');
  try{
    const snap = await db.collection('users').where('uid','==',CU.uid).limit(1).get();
    if(!snap.empty){
      CUD = snap.docs[0].data();
      _saveCache(CUD);
      toast('✓ Profile updated','success');
    } else {
      toast('No data found','error');
    }
  }catch(err){
    toast('Connection error. Try again.','error');
  }finally{
    btn.classList.remove('spinning');
  }
}

// ── QR SCANNER ──
let _qrStream = null, _qrRAF = null, _qrTrack = null, _qrScanned = false, _qrCooldown = false;

async function doQrScan(){
  _qrScanned = false;
  const overlay = $('qrOverlay');
  const video   = $('qrVideo');
  const status  = $('qrStatus');
  const frame   = $('qrFrame');
  if(status) status.textContent = '';
  if(frame)  frame.classList.remove('success');

  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
    toast('এই browser-এ camera support নেই','error'); return;
  }
  if(typeof jsQR === 'undefined'){
    toast('QR library লোড হয়নি। ইন্টারনেট চেক করুন।','error'); return;
  }

  try{
    const stream = await navigator.mediaDevices.getUserMedia({
      video:{ facingMode:'environment', width:{ideal:1280}, height:{ideal:720} }
    });
    _qrStream = stream;
    _qrTrack  = stream.getVideoTracks()[0];
    video.srcObject = stream;
    await video.play();

    const caps = _qrTrack.getCapabilities?.() || {};
    if(caps.torch){ $('qrFlashBtn').style.display='flex'; }

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    _pushBack(closeQrScanner, 'qr');
    _qrScanLoop();

  }catch(err){
    if(err.name==='NotAllowedError'){
      toast('Camera permission denied. Settings থেকে allow করুন।','error');
    } else if(err.name==='NotFoundError'){
      toast('কোনো camera পাওয়া যায়নি','error');
    } else {
      toast('Camera চালু করা যায়নি: ' + err.message,'error');
    }
  }
}

function _qrScanLoop(){
  const video  = $('qrVideo');
  const canvas = $('qrCanvas');
  const ctx    = canvas.getContext('2d');
  const status = $('qrStatus');
  const frame  = $('qrFrame');

  function tick(){
    if(!$('qrOverlay').classList.contains('open')) return;
    if(video.readyState === video.HAVE_ENOUGH_DATA){
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imgData.data, imgData.width, imgData.height, {
        inversionAttempts:'dontInvert'
      });
      if(code && !_qrScanned && !_qrCooldown){
        _qrScanned = true;
        _onQrDetected(code.data);
        return;
      }
    }
    _qrRAF = requestAnimationFrame(tick);
  }
  _qrRAF = requestAnimationFrame(tick);
}

async function _onQrDetected(raw){
  const frame  = $('qrFrame');
  const status = $('qrStatus');

  frame.classList.add('success');
  if(navigator.vibrate) navigator.vibrate([60,30,60]);

  let query = raw.trim();
  query = query.replace(/^solvix:/i,'').replace(/^@/,'');

  if(status) status.textContent = '🔍 Looking up...';

  // Detect phone vs username
  let norm = query.replace(/\D/g,'');
  if(norm.startsWith('880')) norm = '0'+norm.slice(3);
  const isPhone = norm.startsWith('01') && norm.length===11;
  const isUsername = !isPhone && /^[a-z0-9_]{3,}$/i.test(query);

  try{
    let userData = null;
    if(isPhone){
      const snap = await db.collection('users').where('phone','==',norm).limit(1).get();
      if(!snap.empty) userData = snap.docs[0].data();
    } else if(isUsername){
      const snap = await db.collection('users').doc(query.toLowerCase()).get();
      if(snap.exists && !snap.data().accountDeleted) userData = snap.data();
    }

    if(userData && !userData.accountDeleted){
      if(status) status.textContent = '✓ Found: ' + (userData.name||query);
      setTimeout(()=>{
        closeQrScanner();
        _openProfileSheet(userData);
      }, 600);
    } else {
      if(status) status.textContent = '✗ User not found';
      frame.classList.remove('success');
      _qrCooldown = true;
      setTimeout(()=>{ _qrCooldown=false; _qrScanned=false; if(status) status.textContent=''; frame.classList.remove('success'); _qrScanLoop(); }, 2000);
    }
  }catch(err){
    if(status) status.textContent = 'Connection error';
    _qrCooldown = true;
    setTimeout(()=>{ _qrCooldown=false; _qrScanned=false; if(status) status.textContent=''; _qrScanLoop(); }, 2000);
  }
}

function closeQrScanner(){
  _popBack();
  $('qrOverlay').classList.remove('open');
  document.body.style.overflow='';
  if(_qrRAF){ cancelAnimationFrame(_qrRAF); _qrRAF=null; }
  if(_qrStream){ _qrStream.getTracks().forEach(t=>t.stop()); _qrStream=null; }
  if($('qrFlashBtn')) $('qrFlashBtn').style.display='none';
  _qrScanned=false; _qrCooldown=false;
}

function toggleQrFlash(){
  if(!_qrTrack) return;
  const btn = $('qrFlashBtn');
  const isOn = btn.classList.contains('on');
  _qrTrack.applyConstraints({advanced:[{torch:!isOn}]}).then(()=>{
    btn.classList.toggle('on',!isOn);
  }).catch(()=>toast('Flashlight not supported','error'));
}

// ── TAB SWITCHING ──
function switchTab(name){

  ['calls','callhistory','profile','admin'].forEach(id => {
    const el = $('tab-' + id);
    if(el) el.classList.toggle('active', id === name);
  });

  const hdr       = document.querySelector('.hdr');
  const hdrLogo   = $('homeHdrLogo');
  const hdrActs   = $('homeHdrActs');
  const searchBar = $('homeSearchBar');
  const searchBtn = $('homeSearchBtn');
  const chatDiv   = $('chatListContainer');
  const callsDiv  = $('callsListContainer');
  const profDiv   = $('profilePageContent');
  const adminDiv  = $('adminPanelWrap');

  if(chatDiv)   chatDiv.style.display   = 'none';
  if(callsDiv)  callsDiv.style.display  = 'none';
  if(profDiv)   profDiv.style.display   = 'none';
  if(adminDiv)  adminDiv.style.display  = 'none';
  if(searchBar) searchBar.classList.remove('open');

  if(name === 'calls'){
    if(hdr)       hdr.style.display       = '';
    if(hdrLogo)   hdrLogo.innerHTML       = 'Sol<span>vix</span>';
    if(hdrActs)   hdrActs.style.display   = '';
    if(searchBtn) searchBtn.style.display = '';
    if(chatDiv)   chatDiv.style.display   = '';

    if(!chatDiv || !chatDiv.querySelector('.chat-list-item')){
      loadChatList();
    } else {
      _refreshChatTimes();
    }

  } else if(name === 'callhistory'){
    if(hdr)       hdr.style.display       = 'none';
    if(hdrActs)   hdrActs.style.display   = 'none';
    if(searchBtn) searchBtn.style.display = 'none';
    if(callsDiv)  callsDiv.style.display  = '';
    if(typeof renderCallsTab === 'function') renderCallsTab();

  } else if(name === 'profile'){
    if(hdr)       hdr.style.display       = '';
    if(hdrLogo)   hdrLogo.innerHTML       = 'Profile';
    if(hdrActs)   hdrActs.style.display   = 'none';
    if(searchBtn) searchBtn.style.display = 'none';
    if(profDiv)   profDiv.style.display   = '';

  } else if(name === 'admin'){
    if(hdr)       hdr.style.display       = 'none';
    if(hdrActs)   hdrActs.style.display   = 'none';
    if(searchBtn) searchBtn.style.display = 'none';
    if(adminDiv){
      adminDiv.style.display       = 'flex';
      adminDiv.style.flexDirection = 'column';
    }
    if(typeof renderAdminPanel === 'function') renderAdminPanel();
  }
}

// ── PRE-RENDERED PROFILE CACHE ──
function applyAdminVisibility(isAdmin){
  const tab = $('tab-admin');
  tab.classList.toggle('hidden', !isAdmin);
  if(!isAdmin && tab.classList.contains('active')) switchTab('calls');
}

// ── STEP CONTROL ──
function lStep(s){
  ['ls1','ls2','ls3','ls4'].forEach(x => { const el=$(x); if(el) el.classList.add('hidden'); });
  const el = $(s); if(!el) return;
  el.classList.remove('hidden');
  const bb = $('landingBackBtn');
  if(bb) bb.classList.toggle('hidden', s==='ls1' || s==='ls4');
  const logo = $('landingLogo');
  if(logo) logo.style.display = (s==='ls3' || s==='ls4') ? 'none' : '';
}

// ── BACK ──
function landingBack(){
  emailV = '';
  const llp = $('llp'); if(llp) llp.value='';
  hideErr('ls2err');
  if(!$('ls3').classList.contains('hidden')){
    ['lrn','lruser','lre','lrp'].forEach(id => { const el=$(id); if(el) el.value=''; });
    ['dobDay','dobMonth','dobYear'].forEach(id => { const el=$(id); if(el) el.value=''; });
    _valid = { username:false, email:false };
    _selectedGender = ''; _regAvatarBlob = null;
    const circle = $('regAvCircle');
    if(circle) circle.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#050810" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
    ['usernameStatus','emailStatus'].forEach(id => { const el=$(id); if(el) el.innerHTML=''; });
    _resetGenderUI();
    hideErr('ls3err');
  }
  lStep('ls1');
}

// ── ERRORS ──
function showErr(id, msg){ const el=$(id); if(el){ el.textContent=msg; el.style.display='block'; } }
function hideErr(id)     { const el=$(id); if(el) el.style.display='none'; }

// ── PHONE FORMAT ──
function formatPhone(inp){
  const cur = inp.selectionStart, raw = inp.value;
  const hasPlus = raw.startsWith('+');
  let d = raw.replace(/[^\d+]/g,'').replace(/(?!^)\+/g,'');
  if(hasPlus && !d.startsWith('+')) d = '+' + d;
  const maxLen = hasPlus ? 14 : 11;
  if(d.length > maxLen) d = d.slice(0, maxLen);
  if(inp.value !== d){ inp.value = d; try{ inp.setSelectionRange(cur,cur); }catch(_){} }
  let norm = d.replace(/\D/g,'');
  if(norm.startsWith('880')) norm = '0' + norm.slice(3);
  phoneV = (norm.startsWith('01') && norm.length===11) ? norm : '';
  hideErr('ls1err');
}

// ── CACHE ──
function _saveCache(data){
  try{

    localStorage.setItem('vc_profile', JSON.stringify(data));

    localStorage.setItem('vc_ui', JSON.stringify({name:data.name,username:data.username,photoURL:data.photoURL||''}));
  }catch(_){}
}
function _loadCache(){
  try{

    const full = localStorage.getItem('vc_profile');
    if(full) return JSON.parse(full);

    const c = localStorage.getItem('vc_ui');
    return c ? JSON.parse(c) : null;
  }catch(_){ return null; }
}
function _clearCache()   { try{ localStorage.removeItem('vc_ui'); localStorage.removeItem('vc_profile'); }catch(_){} }

// ── SPLASH ──
let _splashDone=false, _authResolved=false, _authUser=null;

function _resolveSplash(){
  if(!_splashDone || !_authResolved) return;
  const splash = $('splash');
  if(splash){ splash.classList.add('hide'); setTimeout(()=>{ splash.style.display='none'; const lp=$('landing-page'); if(lp) lp.style.opacity='1'; }, 400); }
  if(_authUser){ onLoginSuccess(); } else { lStep('ls1'); }
}

setTimeout(() => { _splashDone=true; _resolveSplash(); }, 3000);

// ── AUTH STATE ──
auth.onAuthStateChanged(async u => {
  if(u){
    CU = u;
    if(!CUD){
      const cached = _loadCache();
      if(cached) CUD = cached;
      try{
        const snap = await db.collection('users').where('uid','==',u.uid).limit(1).get();
        if(!snap.empty){ CUD = snap.docs[0].data(); _saveCache(CUD); }
      }catch(_){}
    }
    if(_pendingNewUser) return;
    if(_showLoginWelcome){ _showLoginWelcome=false; _showWelcomeScreen(false); return; }
    _authUser=u; _authResolved=true; _resolveSplash();
  } else {
    CU=null; CUD=null; _clearCache();
    _authUser=null; _authResolved=true; _resolveSplash();
  }
});

// ── STEP 1: CHECK PHONE ──
async function landingCheckPhone(){
  const b = $('lpb');
  hideErr('ls1err');
  if(!phoneV){ showErr('ls1err','Please enter a valid mobile number (01XXXXXXXXX or +8801XXXXXXXXX)'); return; }
  b.disabled=true; b.innerHTML=SPIN_SM;
  try{
    const snap = await db.collection('users').where('phone','==',phoneV).limit(1).get();
    if(!snap.empty){
      emailV = snap.docs[0].data().email || '';
      $('llpd').textContent = phoneV;
      lStep('ls2');
      setTimeout(() => { try{ $('llp').focus(); }catch(_){} }, 200);
    } else {
      emailV = ''; lStep('ls3');
    }
  }catch(_){ showErr('ls1err','Connection failed. Please try again.'); }
  finally{
    b.disabled=false;
    b.innerHTML='Next <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
  }
}

// ── STEP 2: LOGIN ──
async function landingLogin(){
  const p=$('llp').value, b=$('llb');
  hideErr('ls2err');
  if(!p){ showErr('ls2err','Enter your password'); return; }
  if(!emailV){ lStep('ls1'); showErr('ls1err','Please enter your number again.'); return; }
  b.disabled=true; b.innerHTML=`${SPIN_SM} Signing in...`;
  try{
    await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    _showLoginWelcome=true;
    await auth.signInWithEmailAndPassword(emailV, p);
  }catch(e){
    _showLoginWelcome=false;
    let m='Wrong password. Please try again.';
    if(e.code==='auth/too-many-requests') m='Too many failed attempts. Try again later.';
    else if(e.code==='auth/network-request-failed') m='No internet connection.';
    showErr('ls2err', m);
    b.disabled=false; b.textContent='Sign In';
  }
}

// ── FORGOT PASSWORD ──
async function landingForgot(){
  if(!emailV){ showErr('ls2err','Please enter your number first.'); return; }
  const link=$('forgotLink'), el=$('ls2err');
  if(link) link.classList.add('sending');
  if(el){ el.innerHTML=`${SPIN_SM} Sending...`; el.style.display='block'; el.style.background='rgba(0,229,184,0.08)'; el.style.borderColor='var(--accent)'; el.style.color='var(--accent)'; }
  try{
    await auth.sendPasswordResetEmail(emailV);
    if(el) el.innerHTML=`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="vertical-align:middle;margin-right:4px"><circle cx="12" cy="12" r="10"/><polyline points="7.5 12 10.5 15 16.5 9"/></svg> Reset link sent to: ${emailV}`;
  }catch(e){
    if(el){ el.style.background='rgba(255,68,102,0.12)'; el.style.borderColor='var(--danger)'; el.style.color='var(--danger)'; el.textContent='Failed to send. Please try again.'; }
  }finally{
    if(link) link.classList.remove('sending');
  }
}

// ── PASSWORD SHOW/HIDE ──
function togglePwVis(id, btn){
  const inp=$(id); if(!inp) return;
  inp.type = inp.type==='password'?'text':'password';
  const icon=btn.querySelector('.eye-icon');
  if(icon) icon.style.opacity = inp.type==='text'?'0.4':'1';
}

// ── DOB ──
function dobInput(inp, nextId, maxLen, maxVal){
  let v=inp.value.replace(/\D/g,'');
  if(v.length>maxLen) v=v.slice(0,maxLen);
  if(parseInt(v)>maxVal) v=String(maxVal);
  inp.value=v;
  if(nextId && v.length===maxLen){ const next=$(nextId); if(next) next.focus(); }
}
function dobBlur(inp, minVal, maxVal){
  let v=parseInt(inp.value);
  if(!isNaN(v)){
    if(v<minVal) v=minVal; if(v>maxVal) v=maxVal;
    inp.value = maxVal<=31 ? String(v).padStart(2,'0') : String(v);
  }
}

// ── FIELD AVAILABILITY ──
function _setStatus(statusId, html){ const el=$(statusId); if(el) el.innerHTML=html; }
function checkAvail(type, rawVal){
  if(_checkTimers[type]) clearTimeout(_checkTimers[type]);
  if(type==='username'){
    const val=rawVal.toLowerCase().replace(/[^a-z0-9_]/g,'');
    const inp=$('lruser'); if(inp && inp.value!==val) inp.value=val;
    _valid.username=false;
    if(!val){ _setStatus('usernameStatus',''); return; }
    if(val.length<3){ _setStatus('usernameStatus',SVG_CROSS); return; }
    _setStatus('usernameStatus',SVG_SPIN);
    _checkTimers.username=setTimeout(async()=>{
      try{
        const snap=await db.collection('users').doc(val).get();
        _valid.username=!snap.exists||snap.data().accountDeleted===true;
        _setStatus('usernameStatus',_valid.username?SVG_TICK:SVG_CROSS);
      }catch(_){ _setStatus('usernameStatus',''); _valid.username=false; showErr('ls3err','Connection error. Please check your internet.'); }
    },600);
  } else if(type==='email'){
    const val=rawVal.trim().toLowerCase();
    _valid.email=false;
    if(!val){ _setStatus('emailStatus',''); return; }
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)){ _setStatus('emailStatus',SVG_CROSS); return; }
    _setStatus('emailStatus',SVG_SPIN);
    _checkTimers.email=setTimeout(async()=>{
      try{
        const snap=await db.collection('users').where('email','==',val).limit(1).get();
        _valid.email=snap.empty;
        _setStatus('emailStatus',_valid.email?SVG_TICK:SVG_CROSS);
      }catch(_){ _setStatus('emailStatus',''); _valid.email=false; showErr('ls3err','Connection error. Please check your internet.'); }
    },600);
  }
}

// ── GENDER ──
function _resetGenderUI(){
  ['genderMale','genderFemale'].forEach(id => {
    const el=$(id); if(!el) return;
    el.style.borderColor='var(--border)'; el.style.background='var(--input)';
    el.querySelector('svg').setAttribute('stroke','var(--t2)');
    el.querySelector('span').style.color='var(--t2)';
  });
}
function selectGender(g){
  _selectedGender=g; _resetGenderUI();
  const sel=$(g==='male'?'genderMale':'genderFemale');
  sel.style.borderColor='var(--accent)'; sel.style.background='var(--adim)';
  sel.querySelector('svg').setAttribute('stroke','var(--accent)');
  sel.querySelector('span').style.color='var(--accent)';
}
function getGenderAvatar(gender, size=80){
  return gender==='female'
    ? `<svg width="${size}" height="${size}" viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="50" fill="rgba(255,100,180,0.15)"/><circle cx="50" cy="35" r="18" fill="rgba(255,100,180,0.4)" stroke="rgba(255,120,190,0.7)" stroke-width="2"/><path d="M18 85c0-17.67 14.33-28 32-28s32 10.33 32 28" fill="rgba(255,100,180,0.35)" stroke="rgba(255,120,190,0.7)" stroke-width="2" stroke-linecap="round"/></svg>`
    : `<svg width="${size}" height="${size}" viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="50" fill="rgba(0,136,255,0.15)"/><circle cx="50" cy="34" r="17" fill="rgba(0,136,255,0.4)" stroke="rgba(0,160,255,0.7)" stroke-width="2"/><path d="M19 84c0-17 13.5-27 31-27s31 10 31 27" fill="rgba(0,136,255,0.35)" stroke="rgba(0,160,255,0.7)" stroke-width="2" stroke-linecap="round"/></svg>`;
}

// ── AVATAR SELECT ──
function handleAvatarSelect(input){
  const file=input.files&&input.files[0]; if(!file) return;
  if(!file.type.startsWith('image/')){ toast('Only image files are allowed.','error'); input.value=''; return; }
  if(file.size>8*1024*1024){ toast('Image must be under 8MB.','error'); input.value=''; return; }
  input.value='';
  openCrop(file, 'avatar', blob => {
    _regAvatarBlob = blob;
    const circle = $('regAvCircle');
    if(circle) circle.innerHTML = `<img src="${URL.createObjectURL(blob)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
  });
}

// ── REGISTER ──
async function landingRegister(){
  const n=$('lrn').value.trim(), u=($('lruser')?.value||'').trim().toLowerCase();
  const e=$('lre').value.trim(), p=$('lrp').value;
  const dobD=parseInt($('dobDay')?.value||0), dobM=parseInt($('dobMonth')?.value||0), dobY=parseInt($('dobYear')?.value||0);
  const dob=dobY&&dobM&&dobD?`${dobY}-${String(dobM).padStart(2,'0')}-${String(dobD).padStart(2,'0')}`:'';
  const b=$('lrb');
  hideErr('ls3err');
  if(!n)                       { showErr('ls3err','Enter your name'); return; }
  if(!u||u.length<3)           { showErr('ls3err','Username must be at least 3 characters'); return; }
  if(u.length>20)              { showErr('ls3err','Username cannot exceed 20 characters'); return; }
  if(!/^[a-z0-9_]+$/.test(u)) { showErr('ls3err','Username can only contain a-z, 0-9 and _'); return; }
  if(!_valid.username)         { showErr('ls3err','This username is already taken, please choose another'); return; }
  if(!dob)                     { showErr('ls3err','Please enter your Date of Birth'); return; }
  const dobDate=new Date(dob);
  if(isNaN(dobDate.getTime())||dobDate.getMonth()+1!==dobM||dobDate.getDate()!==dobD){ showErr('ls3err','Invalid date. Please check Day/Month/Year'); return; }
  const minAge=new Date(); minAge.setFullYear(minAge.getFullYear()-8);
  if(new Date(dob)>minAge)     { showErr('ls3err','You must be at least 8 years old'); return; }
  if(dobY<new Date().getFullYear()-50){ showErr('ls3err','Maximum age limit is 50 years'); return; }
  if(!_selectedGender)         { showErr('ls3err','Please select your gender'); return; }
  if(!e||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)){ showErr('ls3err','Enter a valid email. Example: name@gmail.com'); return; }
  if(!_valid.email)            { showErr('ls3err','This email is already in use, please use a different email'); return; }
  if(!p||p.length<6)           { showErr('ls3err','Password must be at least 6 characters'); return; }
  if(!phoneV)                  { showErr('ls3err','Go back and re-enter your phone number'); return; }

  b.disabled=true; b.innerHTML=`${SPIN_SM} Creating...`;
  try{
    const uSnap=await db.collection('users').doc(u).get();
    if(uSnap.exists&&!uSnap.data().accountDeleted){ showErr('ls3err','This username was just taken, please choose another'); b.disabled=false; b.textContent='Create Account'; return; }
    await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    _pendingNewUser=true;
    const c=await auth.createUserWithEmailAndPassword(e,p);
    let photoURL='';
    if(_regAvatarBlob){
      try{
        const fd=new FormData();
        fd.append('file',_regAvatarBlob,'avatar.jpg');
        fd.append('upload_preset',CLOUDINARY_PRESET);
        fd.append('folder','vocall_avatars');
        const res=await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,{method:'POST',body:fd});
        if(res.ok){ const d=await res.json(); photoURL=d.secure_url||''; }
      }catch(_){ toast('Photo upload failed. You can add it later.','error'); }
    }
    try{
      await db.collection('users').doc(u).set({ uid:c.user.uid,name:n,username:u,phone:phoneV,email:e,gender:_selectedGender,dob,photoURL,createdAt:FS.serverTimestamp() });
    }catch(fsErr){ try{ await c.user.delete(); }catch(_){} throw fsErr; }
    _saveCache({name:n,username:u,photoURL});
    _showWelcomeScreen(true,{name:n,username:u,phone:phoneV,email:e,photoURL,gender:_selectedGender});
  }catch(e){
    _pendingNewUser=false;
    if(CU){ b.disabled=false; b.textContent='Create Account'; return; }
    let m='Could not create account';
    if(e.code==='auth/email-already-in-use') m='An account with this email already exists.';
    else if(e.code==='auth/weak-password')   m='Please use a stronger password';
    else if(e.code==='auth/network-request-failed') m='No internet connection';
    else if(e.code==='unavailable'||e.message?.includes('firestore')) m='Connection error. Please try again.';
    showErr('ls3err',m);
    b.disabled=false; b.textContent='Create Account';
  }
}

// ── WELCOME SCREEN ──
function _showWelcomeScreen(isNew=false, data=null){
  const src=data||CUD||{};
  const name=src.name||'User', phone=src.phone||phoneV||'', photo=src.photoURL||'';
  const gender=src.gender||_selectedGender||'', email=src.email||'', username=src.username||'';
  const tagEl=$('welcomeTag');       if(tagEl) tagEl.textContent=isNew?'Account Created':'Welcome back';
  const nameEl=$('welcomeName');     if(nameEl) nameEl.textContent=name;
  const userEl=$('welcomeUsername'); if(userEl) userEl.textContent=username?'@'+username:'';
  const phoneEl=$('welcomePhone');   if(phoneEl) phoneEl.textContent=phone;
  const emailEl=$('welcomeEmail');   if(emailEl) emailEl.textContent=email;
  const avEl=$('welcomeAv');
  if(avEl){
    const safePhoto=(photo&&photo.startsWith('https://'))?photo:'';
    if(safePhoto){ avEl.innerHTML=`<img src="${safePhoto}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`; }
    else if(gender){ avEl.style.background='transparent'; avEl.style.boxShadow='none'; avEl.innerHTML=getGenderAvatar(gender,80); }
    else { const initEl=$('welcomeAvInitial'); if(initEl) initEl.textContent=name[0]?.toUpperCase()||'U'; }
  }
  lStep('ls4');
}
// ── ON LOGIN SUCCESS → SHOW DASHBOARD ──
function onLoginSuccess(){
  $('landing-page').classList.add('hidden');
  $('home-page').classList.remove('hidden');
  $('tabBar').classList.remove('hidden');
  applyAdminVisibility(CUD?.isAdmin === true);

  _prebuildProfile();

  _refreshProfileCache();
  initChat();
  if(typeof initCalls === 'function') initCalls();
  if(typeof _startMediaAutoHideTimer === 'function') _startMediaAutoHideTimer();

  switchTab('calls');

  // ── NOTIFICATIONS & PWA ──
  if (typeof initNotificationsAfterLogin === 'function') initNotificationsAfterLogin();
}

// ── LOGOUT ──
function showLogoutConfirm(){
  const src = CUD || {};
  const name = src.name || 'User';
  const username = src.username || '';
  const photo = src.photoURL || '';
  const gender = src.gender || '';

  const nameEl = $('logoutName'); if(nameEl) nameEl.textContent = name;
  const handleEl = $('logoutHandle'); if(handleEl) handleEl.textContent = username ? '@'+username : (CU?.email||'');
  const avEl = $('logoutAv');
  if(avEl){
    const safePhoto = (photo && photo.startsWith('https://')) ? photo : '';
    if(safePhoto) avEl.innerHTML = `<img src="${safePhoto}" alt="${name}">`;
    else if(gender) { avEl.style.background='transparent'; avEl.innerHTML = getGenderAvatar(gender, 38); }
    else avEl.textContent = name[0]?.toUpperCase() || 'U';
  }
  $('logoutOverlay').classList.add('open');
  _pushBack(hideLogoutConfirm, 'logout');
  document.body.style.overflow = 'hidden';
}

function hideLogoutConfirm(){
  _popBack();
  $('logoutOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function handleLogoutOverlayClick(e){
  if(e.target === $('logoutOverlay')) hideLogoutConfirm();
}

async function doLogout(){
  const btn = $('logoutConfirmBtn');
  btn.disabled = true;
  btn.innerHTML = `<div class="spin sm" style="border-top-color:#fff"></div> Logging out...`;
  try{
    await auth.signOut();
    CU = null; CUD = null; _clearCache();
    if(typeof cleanupOnLogout === 'function') cleanupOnLogout();
    hideLogoutConfirm();
    $('home-page').classList.add('hidden');
    $('tabBar').classList.add('hidden');
    $('landing-page').classList.remove('hidden');
    lStep('ls1');
    const lpi = $('lpi'); if(lpi) lpi.value = '';
    phoneV = ''; emailV = '';
    toast('Successfully logged out', 'success');
  }catch(err){
    toast('Logout failed. Please try again.', 'error');
    btn.disabled = false;
    btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> Log Out`;
  }
}

// ── EDIT PROFILE ──
const _CAM_OVERLAY = '<div class="edit-av-overlay"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></div>';
let _editAvatarBlob = null;
let _editGender = '';
let _editOrigUsername = '';
let _editOrigEmail = '';
let _editUsernameValid = true;
let _editEmailValid = true;
const _editCheckTimers = {};

