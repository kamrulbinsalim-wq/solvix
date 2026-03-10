
// SOLVIX CALLS ENGINE — calls.js

// ── VERIFIED BADGE + CACHE ──
const _verifiedCache = {}; // uid → true/false
function _callVerifiedBadge(uid){
  return _verifiedCache[uid] ? '<img src="verified.png" class="verified-badge" width="20" height="20" alt="✓">' : '';
}
async function _loadVerifiedForUid(uid){
  if(_verifiedCache[uid] !== undefined) return;
  try{
    const snap = await db.collection('users').where('uid','==',uid).limit(1).get();
    if(!snap.empty) _verifiedCache[uid] = snap.docs[0].data().verified === true;
    else _verifiedCache[uid] = false;
  }catch(_){ _verifiedCache[uid] = false; }
}
// WebRTC : voice + video calls
// Firebase RTDB : signaling (ringing / accepted / ended)
//                 ICE candidates exchange
// Supabase : call history (calls table)

// ── FIREBASE RTDB ──
const _callRtdb = firebase.database();

// Shared SVG icons for call UI
const _SVG_PHONE_SM = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>`;
const _SVG_VIDEO_SM = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>`;

// ── Cloudflare Worker URL (TURN credentials) ──
const _CF_WORKER_URL = 'https://vocall.kamrulbinsalim.workers.dev';

// Static fallback STUN config
const _RTC_CONFIG_BASE = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10
};

// Dynamic TURN fetch — call শুরুর আগে call করা হয়
async function _getRtcConfig(){
  try{
    const res = await fetch(_CF_WORKER_URL + '/turn-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if(!res.ok) throw new Error('TURN fetch failed');
    const data = await res.json();
    const iceServers = data.iceServers || data.ice_servers || [];
    if(iceServers.length === 0) throw new Error('No ICE servers');
    return { iceServers, iceCandidatePoolSize: 10 };
  }catch(e){
    console.warn('TURN fetch failed, using STUN only:', e.message);
    return _RTC_CONFIG_BASE;
  }
}

// STATE
let _cs = {
  state:         'idle',   // idle | calling | ringing | active
  callId:        null,
  peer:          null,     // { uid, name, photoURL, gender }
  type:          'voice',  // voice | video
  direction:     null,     // outgoing | incoming
  startTime:     null,
  ringTimeout:   null,     // outgoing auto-cancel timeout
  timerInterval: null,     // active call timer
  localStream:   null,
  remoteStream:  null,
  pc:            null,     // RTCPeerConnection
  muted:         false,
  videoOff:      false,
  speaker:       true,
};

// Firebase RTDB listeners
let _signalListener   = null;
let _incomingListener = null;

// ICE candidates already added (prevents re-processing)
const _addedIceCandidates = new Set();

// Call history
let _callHistFilter = 'all';  // all | missed | received | dialed
let _callHistData   = [];

// INIT — called from app.js onLoginSuccess()
function initCalls(){
  if(!CU) return;
  _listenIncoming();
  loadCallHistory();
}

// CALL HISTORY TAB
async function loadCallHistory(){
  if(!CU) return;
  const container = $('callListContainer');
  if(!container) return;

  // Step 1: Cache থেকে সাথে সাথে দেখাও
  const cacheKey = 'solvix_calls_' + CU.uid;
  try{
    const cached = localStorage.getItem(cacheKey);
    if(cached){
      _callHistData = JSON.parse(cached);
      _renderCallHistory();
    } else {
      container.innerHTML = `<div class="call-list-loading"><div class="spin"></div></div>`;
    }
  }catch(_){
    container.innerHTML = `<div class="call-list-loading"><div class="spin"></div></div>`;
  }

  // Step 2: Background এ fresh data আনো
  try{
    const uid = encodeURIComponent(CU.uid);
    const res = await fetch(
      SUPA_URL + '/rest/v1/calls?or=(caller_id.eq.' + uid + ',receiver_id.eq.' + uid + ')&order=start_time.desc.nullslast&limit=200',
      { headers: { 'apikey': SUPA_ANON, 'Authorization': 'Bearer ' + SUPA_ANON } }
    );
    _callHistData = res.ok ? await res.json() : [];
    try{ localStorage.setItem(cacheKey, JSON.stringify(_callHistData)); }catch(_){}
    _renderCallHistory();
  }catch(_){
    if(!container.querySelector('.call-item')){
      container.innerHTML = `<div class="call-list-err">Call history লোড হয়নি। আবার চেষ্টা করুন।</div>`;
    }
  }
}

async function _renderCallHistory(){
  if(!CU) return;
  const container = $('callListContainer');
  if(!container) return;

  const filtered = _callHistFilter === 'all'
    ? _callHistData
    : _callHistData.filter(c => {
        if(_callHistFilter === 'missed')   return c.status === 'missed' && c.receiver_id === CU.uid;
        if(_callHistFilter === 'received') return (c.status === 'ended' || c.status === 'connected') && c.receiver_id === CU.uid;
        if(_callHistFilter === 'dialed')   return c.caller_id === CU.uid;
        return true;
      });

  // ── Verified status preload ──
  const peerUids = [...new Set(filtered.map(c => c.caller_id === CU.uid ? c.receiver_id : c.caller_id))];
  await Promise.all(peerUids.map(uid => _loadVerifiedForUid(uid)));

  if(!filtered.length){
    container.innerHTML = `
      <div class="call-empty">
        <div class="call-empty-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" stroke-width="1.5" stroke-linecap="round">
            <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
          </svg>
        </div>
        <div class="call-empty-title">কোনো call নেই</div>
        <div class="call-empty-sub">Chat এ গিয়ে কাউকে call করুন</div>
      </div>`;
    return;
  }

  const svgPhone = _SVG_PHONE_SM;
  const svgVideo = _SVG_VIDEO_SM;
  const svgPhoneLg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>`;
  const svgVideoLg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>`;

  let html = '';
  filtered.forEach(c => {
    const isOutgoing = c.caller_id === CU.uid;
    const isMissed   = c.status === 'missed';
    const isVideo    = c.type === 'video';
    const peerName   = isOutgoing ? (c.receiver_name || 'Unknown') : (c.caller_name || 'Unknown');
    const peerPhoto  = isOutgoing ? (c.receiver_photo || '') : (c.caller_photo || '');
    const peerUid    = isOutgoing ? c.receiver_id : c.caller_id;
    const peerGender = isOutgoing ? (c.receiver_gender || '') : (c.caller_gender || '');
    const safePhoto  = peerPhoto.startsWith('https://') ? peerPhoto : '';

    const avHTML = safePhoto
      ? `<img src="${safePhoto}" alt="${_cesc(peerName)}">`
      : `<span>${(peerName[0]||'?').toUpperCase()}</span>`;

    const arrowColor = isMissed ? 'var(--danger)' : 'var(--accent)';
    const dirIcon = isOutgoing
      ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${arrowColor}" stroke-width="2.5" stroke-linecap="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>`
      : isMissed
        ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2.5" stroke-linecap="round"><line x1="17" y1="7" x2="7" y2="17"/><polyline points="17 17 7 17 7 7"/></svg>`
        : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"><line x1="17" y1="17" x2="7" y2="7"/><polyline points="7 17 17 17 17 7"/></svg>`;

    const statusColor = isMissed ? 'var(--danger)' : 'var(--t2)';
    const dur         = _formatDuration(c.duration || 0);
    const statusText  = isMissed
      ? (isOutgoing ? 'না ধরেছে' : 'Missed')
      : (c.status === 'rejected' ? 'Rejected' : c.status === 'cancelled' ? 'Cancelled' : dur || 'Connected');

    html += `
      <div class="call-hist-item"
        data-peer-uid="${_cesc(peerUid)}"
        data-peer-name="${_cesc(peerName)}"
        data-peer-photo="${_cesc(peerPhoto)}"
        data-peer-gender="${_cesc(peerGender)}"
        data-call-type="${isVideo ? 'video' : 'voice'}">
        <div class="chi-av" onclick="event.stopPropagation();_openCallPeerProfile(this.closest('.call-hist-item'))">${avHTML}</div>
        <div class="chi-body" onclick="_showCallHistoryWith(this.closest('.call-hist-item'))">
          <div class="chi-top">
            <span class="chi-name">${_cesc(peerName)}${_callVerifiedBadge(peerUid)}</span>
            <span class="chi-time">${_formatCallTime(c.start_time)}</span>
          </div>
          <div class="chi-bottom">
            <span class="chi-status" style="color:${statusColor}">
              ${dirIcon}
              ${isVideo ? svgVideo : svgPhone}
              <span>${statusText}</span>
            </span>
          </div>
        </div>
        <button class="chi-call-btn" onclick="event.stopPropagation();_quickCallFromEl(this.closest('.call-hist-item'))">
          ${isVideo ? svgVideoLg : svgPhoneLg}
        </button>
      </div>`;
  });

  container.innerHTML = html;
}

// Avatar/name click → profile sheet (WhatsApp style)
async function _openCallPeerProfile(el){
  if(!el) return;
  const uid = el.dataset.peerUid;
  // সবসময় Firestore থেকে fresh full data আনো — privacy field নিশ্চিত করতে
  try{
    const snap = await db.collection('users').where('uid','==',uid).limit(1).get();
    if(!snap.empty){
      _openProfileSheet(snap.docs[0].data());
    } else {
      _openProfileSheet({ uid, name: el.dataset.peerName, photoURL: el.dataset.peerPhoto, gender: el.dataset.peerGender });
    }
  }catch(_){
    _openProfileSheet({ uid, name: el.dataset.peerName, photoURL: el.dataset.peerPhoto, gender: el.dataset.peerGender });
  }
}

// Middle row click → সেই person এর সাথে call history দেখাও
function _showCallHistoryWith(el){
  if(!el) return;
  const peerUid  = el.dataset.peerUid;
  const peerName = el.dataset.peerName;
  const filtered = _callHistData.filter(c =>
    c.caller_id === peerUid || c.receiver_id === peerUid
  );
  _showPeerCallHistory(peerName, filtered);
}

// Call button click → সরাসরি call
function _quickCallFromEl(el){
  if(!el) return;
  const peer = {
    uid:      el.dataset.peerUid,
    name:     el.dataset.peerName,
    photoURL: el.dataset.peerPhoto,
    gender:   el.dataset.peerGender,
  };
  const type = el.dataset.callType || 'voice';
  _quickCall(peer.uid, type, peer);
}

// Peer এর সাথে call history sheet
function _showPeerCallHistory(peerName, calls){
  let screen = $('callHistorySheet');
  if(!screen){
    screen = document.createElement('div');
    screen.id = 'callHistorySheet';
    screen.className = 'call-hist-sheet';
    document.body.appendChild(screen);
  }

  const svgPhone = _SVG_PHONE_SM;
  const svgVideo = _SVG_VIDEO_SM;

  let listHTML = '';
  if(!calls.length){
    listHTML = `<div class="call-list-err">কোনো history নেই</div>`;
  } else {
    calls.forEach(c => {
      const isOutgoing = c.caller_id === CU.uid;
      const isMissed   = c.status === 'missed';
      const isVideo    = c.type === 'video';
      const dur        = _formatDuration(c.duration || 0);
      const timeStr    = _formatCallTime(c.start_time);
      const statusColor= isMissed ? 'var(--danger)' : 'var(--t2)';
      const statusText = isMissed
        ? (isOutgoing ? 'না ধরেছে' : 'Missed')
        : (c.status === 'rejected' ? 'Rejected' : c.status === 'cancelled' ? 'Cancelled' : dur || 'Connected');
      const arrowColor = isMissed ? 'var(--danger)' : 'var(--accent)';
      const dirIcon = isOutgoing
        ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${arrowColor}" stroke-width="2.5" stroke-linecap="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>`
        : isMissed
          ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2.5" stroke-linecap="round"><line x1="17" y1="7" x2="7" y2="17"/><polyline points="17 17 7 17 7 7"/></svg>`
          : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"><line x1="17" y1="17" x2="7" y2="7"/><polyline points="7 17 17 17 17 7"/></svg>`;

      listHTML += `
        <div class="chs-item">
          <div class="chs-item-icon" style="color:${statusColor}">${dirIcon}${isVideo ? svgVideo : svgPhone}</div>
          <div class="chs-item-body">
            <div class="chs-item-status" style="color:${statusColor}">${statusText || (isOutgoing ? 'Dialed' : 'Received')}</div>
            <div class="chs-item-time">${timeStr}</div>
          </div>
        </div>`;
    });
  }

  screen.innerHTML = `
    <div class="profile-page-topbar">
      <button class="profile-page-back" onclick="_closeCallHistSheet()">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      </button>
      <div class="profile-page-topbar-title">${_cesc(peerName)}</div>
    </div>
    <div class="chs-list">${listHTML}</div>
  `;

  screen.classList.add('open');
  document.body.style.overflow = 'hidden';
  _pushBack(_closeCallHistSheet, 'callhistsheet');
}

function _closeCallHistSheet(){
  _popBack();
  const screen = $('callHistorySheet');
  if(screen){ screen.classList.remove('open'); setTimeout(()=>{ screen.innerHTML=''; }, 350); }
  document.body.style.overflow = '';
}

function filterCalls(filter){
  _callHistFilter = filter;
  ['all','missed','received','dialed'].forEach(f => {
    const btn = $('callFilter_' + f);
    if(btn) btn.classList.toggle('active', f === filter);
  });
  _renderCallHistory();
}

function _quickCall(peerUid, type, peerObj){
  if(_cs.state !== 'idle'){ toast('আরেকটি call চলছে', 'error'); return; }
  const peer = typeof peerObj === 'string' ? JSON.parse(peerObj) : peerObj;
  startCall(peer, type);
}

// START OUTGOING CALL
async function startCall(peer, type = 'voice'){
  if(!CU){ toast('Login করুন', 'error'); return; }
  if(_cs.state !== 'idle'){ toast('আরেকটি call চলছে', 'error'); return; }
  if(peer.uid === CU.uid){ toast('নিজেকে call করা যাবে না', 'error'); return; }

  _cs.type      = type;
  _cs.peer      = peer;
  _cs.direction = 'outgoing';
  _cs.callId    = _callRtdb.ref().push().key;
  _cs.state     = 'calling';

  try{
    _cs.localStream = await navigator.mediaDevices.getUserMedia(
      type === 'video'
        ? { audio: { echoCancellation:true, noiseSuppression:true, autoGainControl:false, sampleRate:48000, channelCount:1 }, video: { facingMode: 'user', width:{ ideal:1280 }, height:{ ideal:720 } } }
        : { audio: { echoCancellation:true, noiseSuppression:true, autoGainControl:false, sampleRate:48000, channelCount:1 }, video: false }
    );
  }catch(err){
    _cs.state = 'idle';
    _handleMediaError(err); return;
  }

  _showCallScreen('calling');
  _attachLocalVideo();

  const myData  = CUD || {};
  const callRef = _callRtdb.ref('calls/' + _cs.callId);

  try{
    await callRef.set({
      callId:         _cs.callId,
      callerId:       CU.uid,
      callerName:     myData.name     || '',
      callerPhoto:    myData.photoURL || '',
      callerGender:   myData.gender   || '',
      receiverId:     peer.uid,
      receiverName:   peer.name       || '',
      receiverPhoto:  peer.photoURL   || '',
      receiverGender: peer.gender     || '',
      type:           type,
      state:          'ringing',
      startTime:      Date.now(),
    });
  }catch(err){
    toast('Call শুরু করা যায়নি। Internet চেক করুন।', 'error');
    _resetCallState();
    _hideCallScreen();
    return;
  }

  _cs.ringTimeout = setTimeout(() => {
    if(_cs.state === 'calling') _endCall('missed');
  }, 45000);

  _watchSignal(_cs.callId);
  await _createPeerConnection(false);
}

// LISTEN FOR INCOMING CALLS
function _listenIncoming(){
  if(!CU) return;
  if(_incomingListener) _incomingListener.off();

  _incomingListener = _callRtdb.ref('calls').orderByChild('receiverId').equalTo(CU.uid);
  _incomingListener.on('child_added', snap => {
    const d = snap.val();
    if(!d || d.state !== 'ringing' || _cs.state !== 'idle') return;
    if(Date.now() - (d.startTime || 0) > 60000) return;

    _cs.callId    = d.callId;
    _cs.type      = d.type || 'voice';
    _cs.direction = 'incoming';
    _cs.peer      = { uid: d.callerId, name: d.callerName, photoURL: d.callerPhoto, gender: d.callerGender };
    _cs.state     = 'ringing';

    _showCallScreen('ringing');
    _watchSignal(_cs.callId);
  });
}

// ANSWER INCOMING CALL
async function answerCall(){
  if(_cs.state !== 'ringing') return;

  // FIX: answering শুরু হওয়ার flag — double tap এড়াতে
  _cs.state = 'answering';

  try{
    _cs.localStream = await navigator.mediaDevices.getUserMedia(
      _cs.type === 'video'
        ? { audio: { echoCancellation:true, noiseSuppression:true, autoGainControl:false, sampleRate:48000, channelCount:1 }, video: { facingMode: 'user', width:{ ideal:1280 }, height:{ ideal:720 } } }
        : { audio: { echoCancellation:true, noiseSuppression:true, autoGainControl:false, sampleRate:48000, channelCount:1 }, video: false }
    );
  }catch(err){
    // getUserMedia fail — state ফিরিয়ে দাও
    _cs.state = 'ringing';
    _handleMediaError(err); return;
  }

  // FIX: getUserMedia এর পরে check — caller cancel করে থাকলে বের হও
  if(_cs.state !== 'answering'){ 
    _cs.localStream?.getTracks().forEach(t => t.stop());
    return;
  }

  _attachLocalVideo();
  _cs.state = 'active';
  _showCallScreen('active');

  await _createPeerConnection(true);
}

// REJECT INCOMING CALL
async function rejectCall(){
  if(!_cs.callId) return;
  const callId = _cs.callId; // local copy নাও — reset হওয়ার আগে
  _cs.state = 'idle';        // FIX: double-tap block করো
  try{
    await _callRtdb.ref('calls/' + callId).update({ state: 'rejected' });
  }catch(_){}
  _saveCallHistory('rejected');
  _resetCallState();
  _hideCallScreen();
}

// END / HANG UP
async function _endCall(status = 'ended'){
  if(!_cs.callId) return; // callId না থাকলে কিছু করার নেই
  const callId   = _cs.callId; // local copy
  const prevState = _cs.state;
  const duration = _cs.startTime ? Math.floor((Date.now() - _cs.startTime) / 1000) : 0;
  _cs.state = 'idle'; // double call block করো
  try{
    const rtdbState = status === 'missed'    ? 'missed'
                    : status === 'cancelled' ? 'cancelled'
                    : 'ended';
    await _callRtdb.ref('calls/' + callId).update({
      state:   rtdbState,
      endTime: Date.now(),
      duration,
      endedBy: CU?.uid || ''
    });
  }catch(_){}
  _saveCallHistory(status, duration);
  _resetCallState();
  _hideCallScreen();
}

function hangUp(){
  // যেকোনো অবস্থায় screen বন্ধ করো
  _endCall('ended');
  _hideCallScreen();
}
function cancelCall(){
  _endCall('cancelled');
  _hideCallScreen();
}

// WATCH SIGNAL (both sides)
function _watchSignal(callId){
  if(_signalListener) _signalListener.off();
  _addedIceCandidates.clear();
  _signalListener = _callRtdb.ref('calls/' + callId);
  _signalListener.on('value', async snap => {
    const d = snap.val();
    if(!d) return;

    if(d.state === 'accepted' && _cs.direction === 'outgoing' && _cs.state === 'calling'){
      clearTimeout(_cs.ringTimeout);
      _cs.state     = 'active';
      _cs.startTime = Date.now();
      _showCallScreen('active');
      _startTimer();
      if(d.answer && _cs.pc && !_cs.pc.currentRemoteDescription){
        try{
          await _cs.pc.setRemoteDescription(new RTCSessionDescription(d.answer));
        }catch(e){ console.error('setRemoteDescription error:', e); }
      }
    }

    if(d.state === 'rejected' && _cs.direction === 'outgoing'){
      toast((_cs.peer?.name || 'User') + ' call reject করেছে', 'error');
      _resetCallState(); _hideCallScreen();
    }

    if(d.state === 'ended' && _cs.state === 'active'){
      if(!d.endedBy || d.endedBy !== CU.uid){
        _resetCallState(); _hideCallScreen();
      }
    }

    // Incoming: caller cancelled (ringing বা answering যেকোনো state এ)
    if((d.state === 'missed' || d.state === 'cancelled') && _cs.direction === 'incoming' &&
       (_cs.state === 'ringing' || _cs.state === 'answering')){
      _resetCallState(); _hideCallScreen();
    }

    // Caller side: cancelled state এ screen বন্ধ করো
    if(d.state === 'cancelled' && _cs.direction === 'outgoing' && _cs.state !== 'idle'){
      _resetCallState(); _hideCallScreen();
    }

    // Receiver ended call — caller এর screen বন্ধ করো
    if(d.state === 'ended' && _cs.direction === 'outgoing' && _cs.state === 'active'){
      if(!d.endedBy || d.endedBy !== CU.uid){
        _resetCallState(); _hideCallScreen();
      }
    }

      if(d.iceCandidates && _cs.pc){
      const candidates = Object.values(d.iceCandidates).filter(c =>
        c.from !== CU.uid && !_addedIceCandidates.has(c.candidate)
      );
      await Promise.all(candidates.map(async c => {
        _addedIceCandidates.add(c.candidate);
        try{
          await _cs.pc.addIceCandidate(new RTCIceCandidate({
            candidate:     c.candidate,
            sdpMid:        c.sdpMid,
            sdpMLineIndex: c.sdpMLineIndex
          }));
        }catch(_){}
      }));
    }
  });
}

// WebRTC PEER CONNECTION
async function _createPeerConnection(isAnswerer){
  const rtcConfig = await _getRtcConfig();
  _cs.pc = new RTCPeerConnection(rtcConfig);

  if(_cs.localStream){
    _cs.localStream.getTracks().forEach(track => _cs.pc.addTrack(track, _cs.localStream));
  }

  _cs.pc.ontrack = e => {
    _cs.remoteStream = e.streams[0];
    _attachRemoteVideo();
  };

  _cs.pc.onicecandidate = e => {
    if(!e.candidate) return;
    _callRtdb.ref('calls/' + _cs.callId + '/iceCandidates').push({
      from:          CU.uid,
      candidate:     e.candidate.candidate,
      sdpMid:        e.candidate.sdpMid,
      sdpMLineIndex: e.candidate.sdpMLineIndex,
    });
  };

  _cs.pc.onconnectionstatechange = () => {
    if(_cs.pc && (_cs.pc.connectionState === 'disconnected' || _cs.pc.connectionState === 'failed')){
      if(_cs.state === 'active') _endCall('ended');
    }
  };

  if(!isAnswerer){
      const offer = await _cs.pc.createOffer();
    await _cs.pc.setLocalDescription(offer);
    await _callRtdb.ref('calls/' + _cs.callId).update({ offer: { type: offer.type, sdp: offer.sdp } });
  } else {
    const snap = await _callRtdb.ref('calls/' + _cs.callId).once('value');
    const d    = snap.val();
    if(d?.offer){
      await _cs.pc.setRemoteDescription(new RTCSessionDescription(d.offer));
      const answer = await _cs.pc.createAnswer();
      await _cs.pc.setLocalDescription(answer);
      await _callRtdb.ref('calls/' + _cs.callId).update({
        answer:      { type: answer.type, sdp: answer.sdp },
        state:       'accepted',
        answeredAt:  Date.now()
      });
      _cs.startTime = Date.now();
      _startTimer();
    }
  }
}

// VIDEO / AUDIO ATTACH
function _attachLocalVideo(){
  const el = $('callLocalVideo');
  if(el && _cs.localStream){
    el.srcObject = null;
    el.srcObject = _cs.localStream;
  }
}

function _attachRemoteVideo(){
  const el = $('callRemoteVideo');
  if(el && _cs.remoteStream){
    el.srcObject = _cs.remoteStream;
    el.play().catch(()=>{});
  }
  if(_cs.type === 'voice'){
    let audio = document.getElementById('callRemoteAudio');
    if(!audio){
      audio = document.createElement('audio');
      audio.id       = 'callRemoteAudio';
      audio.autoplay = true;
      document.body.appendChild(audio);
    }
    audio.srcObject = _cs.remoteStream;
  }
}

// CALL CONTROLS
function toggleMute(){
  if(!_cs.localStream) return;
  _cs.muted = !_cs.muted;
  _cs.localStream.getAudioTracks().forEach(t => t.enabled = !_cs.muted);
  const btn  = $('callMuteBtn');
  const icon = $('callMuteIcon');
  if(btn) btn.classList.toggle('active', _cs.muted);
  // BUG-1 fix: icon এ শুধু path নয়, পুরো SVG দিতে হবে
  if(icon) icon.outerHTML = _cs.muted
    ? `<svg id="callMuteIcon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`
    : `<svg id="callMuteIcon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`;
}

function toggleVideo(){
  if(!_cs.localStream || _cs.type !== 'video') return;
  _cs.videoOff = !_cs.videoOff;
  _cs.localStream.getVideoTracks().forEach(t => t.enabled = !_cs.videoOff);
  const btn      = $('callVideoBtn');
  const localVid = $('callLocalVideo');
  if(btn)      btn.classList.toggle('active', _cs.videoOff);
  if(localVid) localVid.style.opacity = _cs.videoOff ? '0' : '1';
}

function toggleSpeaker(){
  _cs.speaker = !_cs.speaker;
  // video call এ remoteVideo element এও setSinkId চেষ্টা করো
  const targets = [
    document.getElementById('callRemoteAudio'),
    document.getElementById('callRemoteVideo'),
  ].filter(Boolean);
  targets.forEach(el => {
    if(el.setSinkId) el.setSinkId(_cs.speaker ? '' : 'communications').catch(()=>{});
  });
  const btn = $('callSpeakerBtn');
  if(btn) btn.classList.toggle('active', !_cs.speaker);
}

function flipCamera(){
  if(!_cs.localStream || _cs.type !== 'video') return;
  const videoTrack = _cs.localStream.getVideoTracks()[0];
  if(!videoTrack) return;
  const settings   = videoTrack.getSettings();
  const newFacing  = settings.facingMode === 'user' ? 'environment' : 'user';
  navigator.mediaDevices.getUserMedia({ video: { facingMode: newFacing }, audio: false })
    .then(newStream => {
      const newTrack = newStream.getVideoTracks()[0];
      const sender   = _cs.pc?.getSenders().find(s => s.track?.kind === 'video');
      if(sender) sender.replaceTrack(newTrack);
      videoTrack.stop();
      _cs.localStream.removeTrack(videoTrack);
      _cs.localStream.addTrack(newTrack);

      const el = $('callLocalVideo');
      if(el){ el.srcObject = null; el.srcObject = _cs.localStream; }
    }).catch(err => {
      toast('Camera flip হয়নি', 'error');
      // newTrack এখানে defined নয় (getUserMedia fail) — তাই try-catch এ আর নেই
    });
}

// CALL SCREEN UI
function _showCallScreen(mode){
  let screen = $('callScreen');
  if(!screen){
    screen = document.createElement('div');
    screen.id = 'callScreen';
    document.body.appendChild(screen);
  }

  const peer      = _cs.peer || {};
  const isVideo   = _cs.type === 'video';
  const safePhoto = (peer.photoURL || '').startsWith('https://') ? peer.photoURL : '';
  const gender    = peer.gender || '';

  let avHTML = '';
  if(safePhoto)   avHTML = `<img src="${safePhoto}" alt="${_cesc(peer.name||'')}">`;
  else if(gender) avHTML = getGenderAvatar(gender, 96);
  else            avHTML = `<span>${(peer.name||'?')[0].toUpperCase()}</span>`;

  // Bottom controls per mode
  let controlsHTML = '';
  if(mode === 'ringing' && _cs.direction === 'incoming'){
    controlsHTML = `
      <div class="cs-inc-controls">
        <div class="cs-inc-action">
          <button class="cs-btn cs-btn-reject" onclick="rejectCall()">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <span class="cs-btn-label">Decline</span>
        </div>
        <div class="cs-inc-action">
          <button class="cs-btn cs-btn-answer" onclick="answerCall()">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>
          </button>
          <span class="cs-btn-label">Answer</span>
        </div>
      </div>`;
  } else if(mode === 'calling'){
    controlsHTML = `
      <div class="cs-calling-controls">
        <button class="cs-btn cs-btn-end" id="cancelCallBtn" onclick="cancelCall()">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45c1.12.45 2.3.78 3.53.9a2 2 0 0 1 1.8 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.83 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.74 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11z" transform="rotate(135 12 12)"/>
          </svg>
        </button>
        <span class="cs-btn-label">Cancel</span>
      </div>`;
  } else {
    // Active call controls
    controlsHTML = `
      <div class="cs-active-controls">
        <div class="cs-ctrl-row">
          <div class="cs-ctrl-action">
            <button class="cs-ctrl-btn" id="callMuteBtn" onclick="toggleMute()">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" id="callMuteIcon">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>
            <span class="cs-ctrl-label">Mute</span>
          </div>
          ${isVideo ? `
            <div class="cs-ctrl-action">
              <button class="cs-ctrl-btn" id="callVideoBtn" onclick="toggleVideo()">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                </svg>
              </button>
              <span class="cs-ctrl-label">Video</span>
            </div>
            <div class="cs-ctrl-action">
              <button class="cs-ctrl-btn" onclick="flipCamera()">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <path d="M1 4v6h6"/><path d="M23 20v-6h-6"/>
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
                </svg>
              </button>
              <span class="cs-ctrl-label">Flip</span>
            </div>
          ` : `
            <div class="cs-ctrl-action">
              <button class="cs-ctrl-btn" id="callSpeakerBtn" onclick="toggleSpeaker()">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                </svg>
              </button>
              <span class="cs-ctrl-label">Speaker</span>
            </div>
          `}
        </div>
        <button class="cs-btn cs-btn-end" onclick="hangUp()">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45c1.12.45 2.3.78 3.53.9a2 2 0 0 1 1.8 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.83 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.74 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11z" transform="rotate(135 12 12)"/>
          </svg>
        </button>
      </div>`;
  }

  screen.innerHTML = `
    <div class="cs-bg" ${safePhoto ? `style="background-image:url('${safePhoto}')"` : ''}></div>
    <div class="cs-bg-overlay"></div>
    ${isVideo ? `
      <video id="callRemoteVideo" class="cs-remote-video" autoplay playsinline></video>
      <div class="cs-local-video-wrap" id="callLocalVideoWrap">
        <video id="callLocalVideo" class="cs-local-video" autoplay playsinline muted></video>
      </div>
    ` : ''}
    <div class="cs-topbar">
      <div class="cs-call-type">
        ${isVideo
          ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg> Video Call`
          : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg> Voice Call`
        }
      </div>
    </div>
    <div class="cs-center ${isVideo && mode === 'active' ? 'cs-center-small' : ''}">
      ${!isVideo || mode !== 'active' ? `<div class="cs-avatar">${avHTML}</div>` : ''}
      <div class="cs-name">${_cesc(peer.name || 'Unknown')}${_callVerifiedBadge(peer.uid)}</div>
      <div class="cs-status" id="callStatus">
        ${mode === 'calling' ? 'Calling...' : ''}
        ${mode === 'ringing' && _cs.direction === 'incoming' ? 'Incoming call' : ''}
        ${mode === 'active'  ? '<span id="callTimerEl">00:00</span>' : ''}
      </div>
      ${mode === 'ringing' && _cs.direction === 'incoming' ? `
        <div class="cs-ringing-wave">
          <div class="rw-ring rw-ring1"></div>
          <div class="rw-ring rw-ring2"></div>
          <div class="rw-ring rw-ring3"></div>
        </div>
      ` : ''}
    </div>
    <div class="cs-controls">${controlsHTML}</div>
  `;

  screen.classList.add('open');
  document.body.style.overflow = 'hidden';
  // শুধু প্রথমবার push করো — calling/ringing mode এ। active mode এ আবার push করলে duplicate হবে
  if(_cs.direction === 'outgoing' && mode === 'calling'){
    _pushBack(_hangUpAndClose, 'callscreen');
  } else if(_cs.direction === 'incoming' && mode === 'ringing'){
    _pushBack(_hangUpAndClose, 'callscreen');
  }
  // active mode এ screen rebuild হয়, তাই pushBack দরকার নেই — আগেরটাই কাজ করে
}

function _hangUpAndClose(){
  if(_cs.state === 'active')                                           hangUp();
  else if(_cs.state === 'calling')                                     cancelCall();
  else if(_cs.state === 'ringing' && _cs.direction === 'incoming')     rejectCall();
  else if(_cs.state === 'answering' && _cs.direction === 'incoming')   rejectCall();
  else if(_cs.state === 'calling')                               _endCall('missed');
}

function _hideCallScreen(){
  const screen = $('callScreen');
  if(screen){
    screen.classList.remove('open');
    setTimeout(() => { try{ screen.innerHTML = ''; }catch(_){} }, 400);
  }
  document.body.style.overflow = '';
  const audio = document.getElementById('callRemoteAudio');
  if(audio){ audio.srcObject = null; audio.remove(); }
}

// TIMER
function _startTimer(){
  _cs.startTime = _cs.startTime || Date.now();
  clearInterval(_cs.timerInterval);
  _cs.timerInterval = setInterval(() => {
    const el = $('callTimerEl');
    if(!el) return;
    const secs = Math.floor((Date.now() - _cs.startTime) / 1000);
    const m    = String(Math.floor(secs / 60)).padStart(2,'0');
    const s    = String(secs % 60).padStart(2,'0');
    el.textContent = m + ':' + s;
  }, 1000);
}

// SAVE CALL HISTORY → SUPABASE
async function _saveCallHistory(status, duration = 0){
  if(!CU || !_cs.peer) return;
  const myData  = CUD || {};
  const isOut   = _cs.direction === 'outgoing';
  const newCall = {
    caller_id:       isOut ? CU.uid            : _cs.peer.uid,
    caller_name:     isOut ? (myData.name     || '') : (_cs.peer.name     || ''),
    caller_photo:    isOut ? (myData.photoURL || '') : (_cs.peer.photoURL || ''),
    caller_gender:   isOut ? (myData.gender   || '') : (_cs.peer.gender   || ''),
    receiver_id:     isOut ? _cs.peer.uid      : CU.uid,
    receiver_name:   isOut ? (_cs.peer.name   || '') : (myData.name     || ''),
    receiver_photo:  isOut ? (_cs.peer.photoURL||'') : (myData.photoURL || ''),
    receiver_gender: isOut ? (_cs.peer.gender || '') : (myData.gender   || ''),
    type:            _cs.type,
    status,
    start_time:      new Date(_cs.startTime || Date.now()).toISOString(),
    duration,
  };
  try{
    await fetch(SUPA_URL + '/rest/v1/calls', {
      method:  'POST',
      headers: {
        'apikey':        SUPA_ANON,
        'Authorization': 'Bearer ' + SUPA_ANON,
        'Content-Type':  'application/json',
        'Prefer':        'return=minimal'
      },
      body: JSON.stringify(newCall)
    });
    try{
      const cacheKey = 'solvix_calls_' + CU.uid;
      const cached   = localStorage.getItem(cacheKey);
      const rows     = cached ? JSON.parse(cached) : [];
      rows.unshift(newCall);
      if(rows.length > 200) rows.pop();
      localStorage.setItem(cacheKey, JSON.stringify(rows));
    }catch(_){}
    if(_cs.callId) _callRtdb.ref('calls/' + _cs.callId).remove().catch(()=>{});
  }catch(_){}
}

// RESET STATE
function _resetCallState(){
  // সব call button enable করো
  ['cancelCallBtn','callEndBtn'].forEach(id => {
    const b = document.getElementById(id);
    if(b){ b.disabled = false; b.style.opacity = '1'; }
  });
  clearTimeout(_cs.ringTimeout);
  clearInterval(_cs.timerInterval);
  if(_signalListener){ _signalListener.off(); _signalListener = null; }
  if(_cs.pc){ _cs.pc.close(); _cs.pc = null; }
  if(_cs.localStream){ _cs.localStream.getTracks().forEach(t => t.stop()); }
  _addedIceCandidates.clear();
  // FIX: _endCall/_rejectCall এ ইতিমধ্যে state 'idle' হয়ে গেলে _popBack একবারই হবে
  // _cs.state এখনো 'idle' নয় মানে কেউ _popBack করেনি — এখন করো
  if(_cs.state !== 'idle') _popBack();
  _cs = {
    state:'idle', callId:null, peer:null, type:'voice',
    direction:null, startTime:null, ringTimeout:null, timerInterval:null,
    localStream:null, remoteStream:null, pc:null,
    muted:false, videoOff:false, speaker:true,
  };
  loadCallHistory();
}

// MEDIA ERROR HANDLER
function _handleMediaError(err){
  let msg = 'Microphone/Camera access নেওয়া যায়নি';
  if(err.name === 'NotAllowedError')  msg = 'Permission denied — Settings থেকে allow করুন';
  if(err.name === 'NotFoundError')    msg = 'Microphone/Camera পাওয়া যায়নি';
  if(err.name === 'NotReadableError') msg = 'Device অন্য app ব্যবহার করছে';
  toast(msg, 'error');

  if(_cs.direction === 'incoming') rejectCall();
  else _endCall('missed');
}

// HELPERS
function _cesc(s){ const d = document.createElement('div'); d.textContent = String(s||''); return d.innerHTML; }

function _formatDuration(secs){
  if(!secs || secs < 1) return '';
  if(secs < 60) return secs + 's';
  const m = Math.floor(secs / 60), s = secs % 60;
  return m + 'm' + (s ? ' ' + s + 's' : '');
}

function _formatCallTime(isoOrTs){
  if(!isoOrTs) return '';
  const d    = new Date(isoOrTs);
  const diff = Date.now() - d;
  if(diff < 86400000)  return d.toLocaleTimeString('en-BD',  { hour:'2-digit', minute:'2-digit', hour12:true });
  if(diff < 604800000) return d.toLocaleDateString('en-BD',  { weekday:'short' });
  return                      d.toLocaleDateString('en-BD',  { day:'2-digit', month:'short' });
}

// CALL HISTORY TAB — rendered by switchTab('callhistory')
// ── CLEANUP ON LOGOUT ──
function cleanupCallsOnLogout(){
  if(_incomingListener){ _incomingListener.off(); _incomingListener = null; }
  if(_signalListener){   _signalListener.off();   _signalListener   = null; }
  if(_cs && _cs.localStream){ _cs.localStream.getTracks().forEach(t => t.stop()); }
  if(_cs && _cs.pc){ try{ _cs.pc.close(); }catch(_){} }
}

function renderCallsTab(){
  const container = $('callsListContainer');
  if(!container) return;
  if(!container.querySelector('.call-filter-bar')){
    container.innerHTML = `
      <div id="callsTabWrap">
        <div class="call-filter-bar">
          <button class="call-filter-btn active" id="callFilter_all"      onclick="filterCalls('all')">All</button>
          <button class="call-filter-btn"        id="callFilter_missed"   onclick="filterCalls('missed')">Missed</button>
          <button class="call-filter-btn"        id="callFilter_received" onclick="filterCalls('received')">Received</button>
          <button class="call-filter-btn"        id="callFilter_dialed"   onclick="filterCalls('dialed')">Dialed</button>
        </div>
        <div id="callListContainer"></div>
      </div>
    `;
  }
  loadCallHistory();
}

// ══════════════════════════════════════════════════════
//  FCM CALL NOTIFICATION — Worker এর মাধ্যমে
// ══════════════════════════════════════════════════════
async function _sendCallNotification(peer) {
  if (!peer || !CUD) return;
  let tokens = peer.fcmTokens || [];
  if (!tokens.length) {
    try {
      const snap = await db.collection('users').where('uid', '==', peer.uid).limit(1).get();
      if (!snap.empty) tokens = snap.docs[0].data().fcmTokens || [];
    } catch (_) {}
  }
  if (!tokens.length) return;
  await fetch(_CF_WORKER_URL + '/notify-call', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tokens:      tokens,
      callerName:  CUD.name     || 'Someone',
      callerPhoto: CUD.photoURL || '',
      callId:      _cs.callId   || '',
      callerUid:   CU.uid,
    })
  });
}
// ── Global scope এ expose করো — onclick এর জন্য ──
window.cancelCall  = cancelCall;
window.hangUp      = hangUp;
window.rejectCall  = rejectCall;
window.answerCall  = answerCall;
window.toggleMute  = toggleMute;
window.toggleVideo = toggleVideo;
window.toggleSpeaker = toggleSpeaker;
window.flipCamera  = flipCamera;
window.startCall   = startCall;
window.filterCalls = filterCalls;
window.loadCallHistory = loadCallHistory;
