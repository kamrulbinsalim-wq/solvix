// PROFILE.JS — Profile view, edit, avatar, cover, crop

function _buildProfileHTML(u){
  const name=u.name||'Unknown', username=u.username||'', phone=u.phone||'';
  const email=u.email||'', gender=u.gender||'', photo=u.photoURL||'';
  const bio=u.bio||'', currentAddress=u.currentAddress||'', permanentAddress=u.permanentAddress||'';
  const social=u.social||{};

  // 25002500 Privacy: 09a809bf099c09c709b0 09aa09cd09b009cb09ab09be098709b209c7 09b809ac 09a609c7099609be09ac09c7, 098509a809cd09af09c709b0099f09be09df privacy 09ae09be09a809ac09c7 25002500
  const isSelfCheck = CU && (u.uid === CU.uid);
  const prv = u.privacy || {};
  const canSeePhone   = isSelfCheck || prv.showPhone   !== false;
  const canSeeEmail   = isSelfCheck || prv.showEmail   !== false;
  const canSeeGender  = isSelfCheck || prv.showGender  !== false;
  const canSeeAddress = isSelfCheck || prv.showAddress !== false;
  const canSeeSocial  = isSelfCheck || prv.showSocial  !== false;
  const safePhoto=(photo&&photo.startsWith('https://'))?photo:'';
  const cover=u.coverPhotoURL||'';
  const safeCover=(cover&&cover.startsWith('https://'))?cover:'';

  let avHTML='';
  if(safePhoto) avHTML=`<img src="${safePhoto}" alt="${name}">`;
  else if(gender) avHTML=getGenderAvatar(gender,96);
  else avHTML=`<span>${name[0]?.toUpperCase()||'?'}</span>`;

  const isSelf = CU && (u.uid===CU.uid);
  const canSeePhoto = true; // Profile photo সবাই দেখতে পারবে

  let html = '';
  // Cover photo
  html += '<div class="profile-cover">';
  if(safeCover) html += '<img src="' + safeCover + '" alt="cover">';
  if(isSelf){
    html += '<div class="profile-cover-cam" onclick="triggerCoverUpload()" title="Change cover photo">';
    html += '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';
    html += '</div>';
  }

  html += '</div>';
  html += '<div class="profile-card-hero">';
  html += '<div class="profile-av-wrap">';
  const _avDisplay = (canSeePhoto && safePhoto) ? avHTML : (gender ? getGenderAvatar(gender,96) : '<span>' + (name[0]?.toUpperCase()||'?') + '</span>');
  const _avClick   = (canSeePhoto && safePhoto) ? ' onclick="_openAvatarZoom(\'' + safePhoto + '\',\'' + _esc(name) + '\')" style="cursor:pointer"' : '';
  html += '<div class="profile-av"' + _avClick + '>' + _avDisplay + '</div>';
  html += '<div class="profile-online-dot"></div></div>';
  html += '<div class="profile-name">' + _esc(name) + (u.verified ? '<img src="verified.png" class="verified-badge" width="20" height="20" alt="✓">' : '') + '</div>';
  html += '</div>';

  // Bio — পরিচয়ের ঠিক পরে
  if(bio){
    html += '<div class="profile-bio-card"><div class="profile-bio-text">' + _esc(bio) + '</div></div>';
  }

  // Call / Message buttons
  html += '<div class="profile-actions">';
  if(!isSelf){
    html += '<div class="profile-actions-callmsg">';
    const _uJson = JSON.stringify(u).replace(/'/g,"\\'").replace(/\"/g,'&quot;');
    html += '<button class="pact-btn pact-call" onclick="_callFromProfile(this)" data-peer="' + _uJson + '">';
    html += '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg> Call</button>';
    html += '<button class="pact-btn pact-video" onclick="_videoCallFromProfile(this)" data-peer="' + _uJson + '">';
    html += '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg> Video</button>';
    html += '<button class="pact-btn pact-msg" onclick=\'startChatWithUser(' + JSON.stringify(u).replace(/'/g,"\\'") + ')\'>';
    html += '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Message</button>';
    html += '</div>';
  } else {
    // ── নিজের প্রোফাইল: Stats + Verify + QR — জোড়া পিল বাটন ──
    html += '<div class="profile-self-pill">';
    html += '<button class="pact-pill-btn pact-pill-stats" onclick="openMyStats()">';
    html += '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> My Stats</button>';
    html += '<button class="pact-pill-btn pact-pill-verify" onclick="toast(\'Verify feature coming soon...\',\'info\')">'
    html += '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"/><polyline points="9 12 11 14 15 10"/></svg> Verify</button>';
    if(username){
      html += '<button class="pact-pill-btn pact-pill-qr" onclick="_openQRModal(\''+_esc(username)+'\',\''+_esc(name)+'\',\''+_esc(phone)+'\')">';
      html += '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="3" height="3"/><rect x="18" y="14" width="3" height="3"/><rect x="14" y="18" width="3" height="3"/><rect x="18" y="18" width="3" height="3"/></svg> My QR</button>';
    }
    html += '</div>';

    // ── Settings rows — সরাসরি background এ, কোনো card wrapper নেই ──
    html += '<div class="profile-settings-rows">';

    html += '<button class="edit-settings-row" onclick="openEditSectionDirect(\'account\')">';
    html += '<div class="esr-left"><div class="esr-icon" style="background:rgba(0,229,184,0.12);border-color:rgba(0,229,184,0.2)">';
    html += '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    html += '</div><div class="esr-text"><div class="esr-title">Account Info</div>';
    html += '<div class="esr-sub">' + _esc(name) + (username ? ' · @' + _esc(username) : '') + '</div></div></div>';
    html += '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" stroke-width="2.5" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg></button>';

    html += '<button class="edit-settings-row" onclick="openEditSectionDirect(\'address\')">';
    html += '<div class="esr-left"><div class="esr-icon" style="background:rgba(0,136,255,0.12);border-color:rgba(0,136,255,0.2)">';
    html += '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent2)" stroke-width="2" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>';
    html += '</div><div class="esr-text"><div class="esr-title">Address</div>';
    html += '<div class="esr-sub">' + (currentAddress ? _esc(currentAddress) : 'বর্তমান ও স্থায়ী ঠিকানা') + '</div></div></div>';
    html += '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" stroke-width="2.5" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg></button>';

    html += '<button class="edit-settings-row" onclick="openEditSectionDirect(\'social\')">';
    html += '<div class="esr-left"><div class="esr-icon" style="background:rgba(168,85,247,0.12);border-color:rgba(168,85,247,0.2)">';
    html += '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2" stroke-linecap="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>';
    html += '</div><div class="esr-text"><div class="esr-title">Social Media</div>';
    html += '<div class="esr-sub">Facebook, Instagram, TikTok ইত্যাদি</div></div></div>';
    html += '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" stroke-width="2.5" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg></button>';

    html += '<button class="edit-settings-row" style="border-bottom:none" onclick="openEditSectionDirect(\'privacy\')">';
    html += '<div class="esr-left"><div class="esr-icon" style="background:rgba(239,68,68,0.1);border-color:rgba(239,68,68,0.2)">';
    html += '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
    html += '</div><div class="esr-text"><div class="esr-title">Privacy Settings</div>';
    html += '<div class="esr-sub">কে কী দেখতে পাবে</div></div></div>';
    html += '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" stroke-width="2.5" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg></button>';

    html += '</div>';
  }
  html += '</div>';

  // ── অন্যের প্রোফাইলে info cards (isSelf এর জন্য নয়) ──
  if(!isSelf){
    html += '<div class="profile-info-grid">';
    if(phone && canSeePhone){
      html += '<div class="profile-info-card"><div class="pic-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg></div><div class="pic-text"><div class="pic-lbl">Phone</div><div class="pic-val mono" title="Double-tap to copy" ondblclick="_copyVal(this,\'' + _esc(phone) + '\',\'Number copied!\')" style="cursor:pointer">' + _esc(phone) + '</div></div></div>';
    }
    if(username){
      html += '<div class="profile-info-card"><div class="pic-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div><div class="pic-text"><div class="pic-lbl">Username</div><div class="pic-val mono" title="Double-tap to copy" ondblclick="_copyVal(this,\'' + _esc(username) + '\',\'Username copied!\')" style="cursor:pointer">@' + _esc(username) + '</div></div></div>';
    }
    if(email && canSeeEmail){
      html += '<div class="profile-info-card"><div class="pic-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent2)" stroke-width="2" stroke-linecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div><div class="pic-text"><div class="pic-lbl">Email</div><div class="pic-val">' + _esc(email) + '</div></div></div>';
    }
    if(gender && canSeeGender){
      const gIcon = gender==='male'
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent2)" stroke-width="2" stroke-linecap="round"><circle cx="10" cy="14" r="5"/><line x1="19" y1="5" x2="14.14" y2="9.86"/><polyline points="15 5 19 5 19 9"/></svg>'
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff78c0" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="9" r="5"/><line x1="12" y1="14" x2="12" y2="21"/><line x1="9" y1="18" x2="15" y2="18"/></svg>';
      const gColor = gender==='male' ? 'var(--accent2)' : '#ff78c0';
      html += '<div class="profile-info-card"><div class="pic-icon" style="background:' + (gender==='male'?'rgba(0,136,255,0.1)':'rgba(255,100,180,0.1)') + ';border-color:' + (gender==='male'?'rgba(0,136,255,0.2)':'rgba(255,100,180,0.2)') + '">' + gIcon + '</div><div class="pic-text"><div class="pic-lbl">Gender</div><div class="pic-val" style="color:' + gColor + '">' + (gender==='male'?'Male':'Female') + '</div></div></div>';
    }
    html += '</div>';

    // Addresses — privacy check
    if(canSeeAddress && (currentAddress || permanentAddress)){
      html += '<div class="profile-section-hdr"><span>Address</span></div>';
      html += '<div class="profile-info-grid" style="padding-top:0">';
      if(currentAddress){
        html += '<div class="profile-info-card"><div class="pic-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div><div class="pic-text"><div class="pic-val">' + _esc(currentAddress) + '</div></div></div>';
      }
      if(permanentAddress){
        html += '<div class="profile-info-card"><div class="pic-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent2)" stroke-width="2" stroke-linecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div><div class="pic-text"><div class="pic-val">' + _esc(permanentAddress) + '</div></div></div>';
      }
      html += '</div>';
    }
  }

  // Social Media
  const socLinks = {
    facebook:  { cls:'fb',  url:'https://facebook.com/',  icon:'<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',  fill:true,  label:'Facebook'  },
    instagram: { cls:'ig',  url:'https://instagram.com/', icon:'<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".5" fill="currentColor"/>', fill:false, label:'Instagram' },
    whatsapp:  { cls:'wa',  url:'https://wa.me/',         icon:'<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.985-1.368A9.956 9.956 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>', fill:true, label:'WhatsApp' },
    tiktok:    { cls:'tt',  url:'https://tiktok.com/@',   icon:'<path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.73a4.85 4.85 0 0 1-1.01-.04z"/>', fill:true, label:'TikTok' },
    youtube:   { cls:'yt',  url:'https://youtube.com/@',  icon:'<path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.96-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon fill="var(--bg)" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/>',  fill:true, label:'YouTube' },
    twitter:   { cls:'tw',  url:'https://x.com/',         icon:'<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>',  fill:true, label:'X / Twitter' }
  };
  const hasSocial = social && Object.keys(socLinks).some(k => social[k]);
  if(hasSocial && !isSelf && canSeeSocial){
    html += '<div class="profile-section-hdr"><span>Social Media</span></div>';
    html += '<div class="profile-social-grid">';
    Object.entries(socLinks).forEach(([key, cfg]) => {
      if(!social[key]) return;
      const svgAttrs = cfg.fill ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"';
      html += '<a class="social-chip ' + cfg.cls + '" href="' + cfg.url + _esc(social[key]) + '" target="_blank">';
      html += '<svg width="14" height="14" viewBox="0 0 24 24" ' + svgAttrs + '>' + cfg.icon + '</svg>';
      html += cfg.label + '</a>';
    });
    html += '</div>';
  }

  // Block & Report — সবার নিচে (শুধু অন্যের প্রোফাইলে)
  if(!isSelf){
    const _isBlocked = (CUD?.blockedUsers || []).includes(u.uid);
    html += '<div class="profile-danger-row">';
    html += '<button class="pact-danger-btn pact-block' + (_isBlocked ? ' blocked' : '') + '" onclick="_toggleBlockUser(\'' + _esc(u.uid) + '\',\'' + _esc(u.username||'') + '\',\'' + _esc(name) + '\',' + (_isBlocked?'true':'false') + ')">';
    html += '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>';
    html += (_isBlocked ? ' Unblock' : ' Block') + '</button>';
    html += '<button class="pact-danger-btn pact-report" onclick="_openReportModal(\'' + _esc(u.uid) + '\',\'' + _esc(u.username||'') + '\',\'' + _esc(name) + '\')">';
    html += '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
    html += ' Report</button>';
    html += '</div>';
  }

  return html;
}

// ── QR CODE MODAL ──
function _openQRModal(username, name, phone){
  // পুরনো modal থাকলে সরাও
  const old = document.getElementById('qrModalOverlay');
  if(old) old.remove();

  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const qrData = phone ? '@' + username + '\n' + phone : '@' + username;
  const infoLine = phone
    ? '<span class="qrm-uname">@' + _esc(username) + '</span><span class="qrm-dot">·</span><span class="qrm-phone">' + _esc(phone) + '</span>'
    : '<span class="qrm-uname">@' + _esc(username) + '</span>';

  const overlay = document.createElement('div');
  overlay.id = 'qrModalOverlay';
  overlay.className = 'qrm-overlay';
  overlay.innerHTML = `
    <div class="qrm-sheet" id="qrModalSheet">
      <div class="qrm-handle"></div>
      <div class="qrm-header">
        <div class="qrm-title">QR Code</div>
        <button class="qrm-close" onclick="_closeQRModal()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="qrm-name">${_esc(name||username)}</div>
      <div class="qrm-qr-box">
        <div class="qrm-qr-inner" id="qrModalCanvas"></div>
      </div>
      <div class="qrm-info">${infoLine}</div>
      <div class="qrm-actions">
        <button class="qrm-share-btn" onclick="_shareQR('${_esc(username)}','${_esc(phone||'')}')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          Share
        </button>
      </div>
    </div>`;

  overlay.addEventListener('click', e => { if(e.target === overlay) _closeQRModal(); });
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  _pushBack(_closeQRModal, 'qrmodal');

  // animate in
  requestAnimationFrame(() => overlay.classList.add('open'));

  // QR generate
  setTimeout(() => {
    const canvas = document.getElementById('qrModalCanvas');
    if(!canvas || !window.QRCode) return;
    new QRCode(canvas, {
      text:         qrData,
      width:        200,
      height:       200,
      colorDark:    isDark ? '#00e5b8' : '#0a1628',
      colorLight:   isDark ? '#0d1525' : '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  }, 120);
}

function _closeQRModal(){
  _popBack();
  const overlay = document.getElementById('qrModalOverlay');
  if(!overlay) return;
  overlay.classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(() => overlay.remove(), 320);
}

// ── QR SHARE ──
function _shareQR(username, phone){
  const info = phone ? '@' + username + ' · ' + phone : '@' + username;
  if(navigator.share){
    navigator.share({ title: 'Solvix — ' + info, text: 'Solvix-এ আমাকে খুঁজুন: ' + info });
  } else {
    navigator.clipboard.writeText(info).then(() => toast('Copied!', 'success')).catch(() => toast(info, 'info'));
  }
}

// ── MY STATS MODAL ──
async function openMyStats(){
  if(!CU){ toast('Please log in first','error'); return; }

  // Overlay + sheet তৈরি করো
  let overlay = $('myStatsOverlay');
  if(!overlay){
    overlay = document.createElement('div');
    overlay.id = 'myStatsOverlay';
    overlay.className = 'my-stats-overlay';
    overlay.onclick = e => { if(e.target === overlay) closeMyStats(); };
    document.body.appendChild(overlay);
  }
  let sheet = $('myStatsSheet');
  if(!sheet){
    sheet = document.createElement('div');
    sheet.id = 'myStatsSheet';
    sheet.className = 'my-stats-sheet';
    document.body.appendChild(sheet);
  }

  // Loading দেখাও
  sheet.innerHTML = `
    <div class="my-stats-topbar">
      <button class="profile-page-back" onclick="closeMyStats()">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      </button>
      <div class="my-stats-topbar-title">My Activity Stats</div>
      <div style="width:40px"></div>
    </div>
    <div class="my-stats-body" style="display:flex;align-items:center;justify-content:center;min-height:200px">
      <div class="spin"></div>
    </div>`;

  overlay.classList.add('open');
  sheet.classList.add('open');
  document.body.style.overflow = 'hidden';
  _pushBack(closeMyStats, 'mystats');

  try{
    // ── Chat stats: Supabase chats table ──
    const chatsRes = await fetch(
      'https://rkmbzepmotyrgmxykspf.supabase.co/rest/v1/chats?or=(user1.eq.' + CU.uid + ',user2.eq.' + CU.uid + ')&select=id,user1,user2,last_message_time',
      { headers: { 'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrbWJ6ZXBtb3R5cmdteHlrc3BmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTg0NTIsImV4cCI6MjA4ODM5NDQ1Mn0.DQytB-nf_WbOlc5nLKOxMyWKZ3N4eLJgVOQ19zAmGpM', 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrbWJ6ZXBtb3R5cmdteHlrc3BmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTg0NTIsImV4cCI6MjA4ODM5NDQ1Mn0.DQytB-nf_WbOlc5nLKOxMyWKZ3N4eLJgVOQ19zAmGpM' } }
    );
    const chats = chatsRes.ok ? await chatsRes.json() : [];
    const totalChats = chats.length;
    const activeChats = chats.filter(c => c.last_message_time).length;

    // ── Message count ──
    let totalMessages = 0;
    if(totalChats > 0){
      const msgRes = await fetch(
        'https://rkmbzepmotyrgmxykspf.supabase.co/rest/v1/messages?sender_id=eq.' + CU.uid + '&select=id',
        { headers: { 'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrbWJ6ZXBtb3R5cmdteHlrc3BmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTg0NTIsImV4cCI6MjA4ODM5NDQ1Mn0.DQytB-nf_WbOlc5nLKOxMyWKZ3N4eLJgVOQ19zAmGpM', 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrbWJ6ZXBtb3R5cmdteHlrc3BmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTg0NTIsImV4cCI6MjA4ODM5NDQ1Mn0.DQytB-nf_WbOlc5nLKOxMyWKZ3N4eLJgVOQ19zAmGpM',
          'Range': '0-0', 'Prefer': 'count=exact' } }
      );
      const cHeader = msgRes.headers.get('Content-Range');
      if(cHeader){ const m = cHeader.match(/\/(\d+)/); if(m) totalMessages = parseInt(m[1])||0; }
    }

    // ── Call stats: Supabase calls table ──
    const callsRes = await fetch(
      'https://rkmbzepmotyrgmxykspf.supabase.co/rest/v1/calls?or=(caller_id.eq.' + CU.uid + ',receiver_id.eq.' + CU.uid + ')&select=caller_id,receiver_id,status,duration,type',
      { headers: { 'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrbWJ6ZXBtb3R5cmdteHlrc3BmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTg0NTIsImV4cCI6MjA4ODM5NDQ1Mn0.DQytB-nf_WbOlc5nLKOxMyWKZ3N4eLJgVOQ19zAmGpM', 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrbWJ6ZXBtb3R5cmdteHlrc3BmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTg0NTIsImV4cCI6MjA4ODM5NDQ1Mn0.DQytB-nf_WbOlc5nLKOxMyWKZ3N4eLJgVOQ19zAmGpM' } }
    );
    const calls = callsRes.ok ? await callsRes.json() : [];

    const connectedCalls = calls.filter(c => c.status === 'connected' || c.status === 'ended');
    const totalCallPeople = new Set(calls.map(c => c.caller_id === CU.uid ? c.receiver_id : c.caller_id)).size;
    const totalCallDurSec = connectedCalls.reduce((s, c) => s + (c.duration || 0), 0);
    const outgoing = calls.filter(c => c.caller_id === CU.uid).length;
    const incoming = calls.filter(c => c.receiver_id === CU.uid).length;
    const missed   = calls.filter(c => c.receiver_id === CU.uid && c.status === 'missed').length;

    // Duration format
    const hrs  = Math.floor(totalCallDurSec / 3600);
    const mins = Math.floor((totalCallDurSec % 3600) / 60);
    const secs = totalCallDurSec % 60;
    const durStr = hrs > 0 ? `${hrs}h ${mins}m` : mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

    // ── Member since ──
    const joinDate = CUD?.createdAt?.seconds
      ? new Date(CUD.createdAt.seconds * 1000).toLocaleDateString('bn-BD', {year:'numeric',month:'long',day:'numeric'})
      : '—';

    sheet.innerHTML = `
      <div class="my-stats-topbar">
        <button class="profile-page-back" onclick="closeMyStats()">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div class="my-stats-topbar-title">My Activity Stats</div>
        <div style="width:40px"></div>
      </div>
      <div class="my-stats-body">

        <div class="stats-section-hdr">💬 Chat Activity</div>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon" style="background:rgba(0,229,184,0.12);border-color:rgba(0,229,184,0.2)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <div class="stat-val">${totalChats}</div>
            <div class="stat-lbl">Total Chats</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:rgba(0,229,184,0.12);border-color:rgba(0,229,184,0.2)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="13" x2="13" y2="13"/></svg>
            </div>
            <div class="stat-val">${totalMessages.toLocaleString()}</div>
            <div class="stat-lbl">Messages Sent</div>
          </div>
        </div>

        <div class="stats-section-hdr">📞 Call Activity</div>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon" style="background:rgba(0,136,255,0.12);border-color:rgba(0,136,255,0.2)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--accent2)"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>
            </div>
            <div class="stat-val">${totalCallPeople}</div>
            <div class="stat-lbl">People Called</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:rgba(0,136,255,0.12);border-color:rgba(0,136,255,0.2)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent2)" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div class="stat-val">${durStr || '0s'}</div>
            <div class="stat-lbl">Total Call Time</div>
          </div>
        </div>

        <div class="stats-grid" style="margin-top:10px">
          <div class="stat-card">
            <div class="stat-icon" style="background:rgba(34,197,94,0.1);border-color:rgba(34,197,94,0.2)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
            </div>
            <div class="stat-val">${outgoing}</div>
            <div class="stat-lbl">Outgoing</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:rgba(0,136,255,0.12);border-color:rgba(0,136,255,0.2)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent2)" stroke-width="2" stroke-linecap="round"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>
            </div>
            <div class="stat-val">${incoming}</div>
            <div class="stat-lbl">Incoming</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:rgba(239,68,68,0.1);border-color:rgba(239,68,68,0.2)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </div>
            <div class="stat-val">${missed}</div>
            <div class="stat-lbl">Missed</div>
          </div>
        </div>

        <div class="stats-section-hdr">📅 Account</div>
        <div class="stats-grid">
          <div class="stat-card stat-card-wide">
            <div class="stat-icon" style="background:rgba(168,85,247,0.1);border-color:rgba(168,85,247,0.2)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <div class="stat-val" style="font-size:16px">${joinDate}</div>
            <div class="stat-lbl">Member Since</div>
          </div>
        </div>

      </div>`;

  }catch(err){
    sheet.querySelector('.my-stats-body').innerHTML = `<div style="text-align:center;padding:40px;color:var(--t2)">লোড করা যায়নি। আবার চেষ্টা করুন।</div>`;
  }
}

function closeMyStats(){
  _popBack();
  const overlay = $('myStatsOverlay');
  const sheet   = $('myStatsSheet');
  if(overlay) overlay.classList.remove('open');
  if(sheet)   sheet.classList.remove('open');
  document.body.style.overflow = '';
}

// ── OPEN PROFILE SHEET — search/QR result এর জন্য (slide from right) ──
function _openProfileSheet(u){
  const html = _buildProfileHTML(u);
  const name = u.name || 'Unknown';
  const isSelf = CU && (u.uid === CU.uid);

  // নিজের profile হলে — tab-এর ভেতরেই দেখাও, কোনো sheet খুলো না
  if(isSelf){
    switchTab('profile');
    return;
  }

  // অন্যের profile — profileSheet-এ slide করে দেখাও
  const uname = u.username || '';
  const qrPhoneHdr = (u.privacy?.showPhone !== false && u.phone) ? u.phone : '';
  const topbar = `
    <div class="profile-page-topbar">
      <button class="profile-page-back" onclick="closeProfileSheet()">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      </button>
      <div class="profile-page-topbar-title">${_esc(name)}</div>
      <div class="profile-topbar-actions">
        ${uname ? `<button class="profile-hdr-btn" onclick="_openQRModal('${uname}','${_esc(name)}','${qrPhoneHdr}')" title="QR Code">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="3" height="3"/><rect x="18" y="14" width="3" height="3"/><rect x="14" y="18" width="3" height="3"/><rect x="18" y="18" width="3" height="3"/></svg>
        </button>` : ''}
        ${uname ? `<button class="profile-hdr-btn" onclick="_shareProfile('${uname}','${_esc(name)}')" title="Share">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        </button>` : ''}
      </div>
    </div>`;

  $('profileSheet').innerHTML = topbar + '<div id="profileSheetContent">' + html + '</div>';
  $('profileSheet').scrollTop = 0;
  $('profileSheet').classList.add('open');
  _pushBack(closeProfileSheet, 'profile');
}

function closeProfileSheet(){
  _popBack();
  $('profileSheet').classList.remove('open');
}

function _openNotFoundSheet(query){
  let html = '<div class="search-not-found">';
  html += '<div class="snf-icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><line x1="8" y1="11" x2="14" y2="11"/></svg></div>';
  html += '<div class="snf-title">No user found</div>';
  html += '<div class="snf-sub">No account found for<br><strong style="color:var(--text)">' + _esc(query) + '</strong><br><span style="font-size:12px;color:var(--t3)">Check the number or username and try again.</span></div>';
  html += '</div>';
  const topbar2 = `
    <div class="profile-page-topbar">
      <button class="profile-page-back" onclick="closeProfileSheet()">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      </button>
      <div class="profile-page-topbar-title">Search Result</div>
    </div>`;
  $('profileSheet').innerHTML = topbar2 + '<div id="profileSheetContent">' + html + '</div>';
  $('profileSheet').scrollTop = 0;
  $('profileSheet').classList.add('open');
  _pushBack(closeProfileSheet, 'profile');
}

function _callFromProfile(btn){
  try{
    const peer = JSON.parse(btn.getAttribute('data-peer').replace(/&quot;/g,'"'));
    closeProfileSheet();
    startChatWithUser(peer);
    setTimeout(() => startCall(peer, 'voice'), 500);
  }catch(e){ toast('কল শুরু করা যাচ্ছে না','error'); }
}

function _videoCallFromProfile(btn){
  try{
    const peer = JSON.parse(btn.getAttribute('data-peer').replace(/&quot;/g,'"'));
    closeProfileSheet();
    startChatWithUser(peer);
    setTimeout(() => startCall(peer, 'video'), 500);
  }catch(e){ toast('ভিডিও কল শুরু করা যাচ্ছে না','error'); }
}

function _esc(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

function _copyVal(el, val, msg){
  navigator.clipboard.writeText(val).then(() => {
    toast(msg || 'Copied!', 'success');
    el.style.transition = 'color .15s';
    el.style.color = 'var(--accent)';
    setTimeout(() => el.style.color = '', 700);
  }).catch(() => {
    // fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = val; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    toast(msg || 'Copied!', 'success');
  });
}

// ── REFRESH ──
function _prebuildProfile(){
  const data = CUD || _loadCache();
  if(!data) return;
  _profileHTMLCache = _buildProfileHTML(data);
  // সাথে সাথে div-এ inject করো — display:none থাকবে, কিন্তু ready
  const profDiv = $('profilePageContent');
  if(profDiv){
    profDiv.innerHTML = _profileHTMLCache;
  }
}

// Profile data update হলে cache refresh করো (background silent update)
function _refreshProfileCache(){
  if(!CU) return;
  db.collection('users').where('uid','==',CU.uid).limit(1).get()
    .then(snap => {
      if(!snap.empty){
        CUD = snap.docs[0].data();
        _saveCache(CUD);
        _profileHTMLCache = _buildProfileHTML(CUD);
        // Profile tab খোলা থাকলে চুপচাপ update — flicker নেই
        const profDiv = $('profilePageContent');
        if(profDiv){
          profDiv.innerHTML = _profileHTMLCache;
        }
      }
    }).catch(()=>{});
}

// ── ADMIN VISIBILITY ──
function triggerCoverUpload(){
  let inp = $('coverPhotoInput');
  if(!inp){
    inp = document.createElement('input');
    inp.type = 'file'; inp.id = 'coverPhotoInput';
    inp.accept = 'image/*'; inp.style.display = 'none';
    inp.onchange = handleCoverSelect;
    document.body.appendChild(inp);
  }
  inp.click();
}
function handleCoverSelect(){
  const file = this.files && this.files[0]; if(!file) return;
  if(file.size > 10*1024*1024){ toast('Cover image must be under 10MB','error'); return; }
  const inp = this; inp.value = '';
  openCrop(file, 'cover', async blob => {
    // Preview immediately
    const cover = document.querySelector('#profileSheet .profile-cover');
    const camBtn = cover ? cover.querySelector('.profile-cover-cam') : null;
    if(cover){
      let img = cover.querySelector('img');
      if(!img){ img = document.createElement('img'); cover.insertBefore(img, cover.firstChild); }
      img.src = URL.createObjectURL(blob);
    }

    // Show spinner on cam button
    if(camBtn){
      camBtn.classList.add('uploading');
      camBtn.innerHTML = '<div class="cover-cam-spinner"></div>';
    }

    // Upload to Cloudinary immediately
    try{
      const fd = new FormData();
      fd.append('file', blob, 'cover.jpg');
      fd.append('upload_preset', CLOUDINARY_PRESET);
      fd.append('folder', 'vocall_covers');
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {method:'POST', body:fd});
      if(!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      const coverPhotoURL = data.secure_url;

      // Save to Firestore
      const username = CUD?.username;
      if(username && coverPhotoURL){
        await db.collection('users').doc(username).update({ coverPhotoURL });
        CUD = { ...CUD, coverPhotoURL };
        _saveCache(CUD);
      }

      // Show checkmark
      if(camBtn){
        camBtn.classList.remove('uploading');
        camBtn.classList.add('done');
        camBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>';
        setTimeout(() => {
          camBtn.classList.remove('done');
          camBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';
        }, 2500);
      }
      toast('Cover photo saved!', 'success');

    }catch(err){
      if(camBtn){
        camBtn.classList.remove('uploading');
        camBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';
      }
      toast('Upload failed. Please try again.', 'error');
    }
  });
}

let _currentEditSection = null;

function openEditProfile(){
  const u = CUD || {};
  _editAvatarBlob = null;
  _editOrigUsername = u.username || '';
  _editOrigEmail = u.email || '';
  _editUsernameValid = true;
  _editEmailValid = true;
  _editGender = u.gender || '';

  // Avatar preview
  const circle = $('editAvCircle');
  if(circle){
    const photo = u.photoURL||'';
    const safePhoto = (photo && photo.startsWith('https://')) ? photo : '';
    if(safePhoto){
      circle.innerHTML = `<img src="${safePhoto}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">` + _CAM_OVERLAY;
    } else if(_editGender){
      circle.style.background = 'transparent';
      circle.innerHTML = getGenderAvatar(_editGender, 86) + _CAM_OVERLAY;
    } else {
      circle.style.background = '';
      circle.innerHTML = `<span style="font-size:34px;font-weight:800;color:#050810">${(u.name||'?')[0].toUpperCase()}</span>` + _CAM_OVERLAY;
    }
  }
  const np = $('editNamePreview');     if(np) np.textContent = u.name || '';
  const up = $('editUsernamePreview'); if(up) up.textContent = u.username ? '@' + u.username : '';

  $('editProfileOverlay').classList.add('open');
  _pushBack(closeEditProfile, 'editprofile');
  document.body.style.overflow = 'hidden';
}

// ── প্রোফাইল পেজ থেকে সরাসরি section sheet খোলো — modal দেখাবে না ──
function openEditSectionDirect(section){
  // state init (openEditProfile এর মতো)
  const u = CUD || {};
  _editAvatarBlob = null;
  _editOrigUsername = u.username || '';
  _editOrigEmail = u.email || '';
  _editUsernameValid = true;
  _editEmailValid = true;
  _editGender = u.gender || '';
  // editProfileOverlay open করবো না — সরাসরি section sheet
  openEditSection(section);
}

function openEditSection(section){
  _currentEditSection = section;
  const u = CUD || {};
  const sheet = $('editSectionSheet');
  const body  = $('editSectionBody');
  const title = $('editSectionTitle');
  if(!sheet || !body || !title) return;

  const setVal = (id, v) => { const el=$(id); if(el) el.value = v||''; };

  if(section === 'account'){
    title.textContent = 'Account Info';
    body.innerHTML = `
      <div class="edit-section-inner">
        <div class="fg-wrap">
          <input type="text" class="fg" id="editName" placeholder=" ">
          <span class="fg-lbl">Your Name</span>
        </div>
        <div class="fg-wrap">
          <input type="text" class="fg" id="editUsername" placeholder=" " style="padding-right:50px"
            oninput="checkEditUsername(this.value)" autocomplete="off" autocapitalize="off" spellcheck="false">
          <span class="fg-lbl">Username</span>
          <span id="editUsernameStatus" class="field-status"></span>
        </div>
        <div class="fg-wrap" style="position:relative">
          <input type="email" class="fg" id="editEmail" placeholder=" " readonly
            style="opacity:0.5;cursor:not-allowed;pointer-events:none">
          <span class="fg-lbl">Email Address</span>
          <span style="position:absolute;right:14px;top:50%;transform:translateY(-50%)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </span>
        </div>
        <div style="margin-bottom:14px">
          <div class="edit-section-lbl">Date of Birth</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1.4fr;gap:8px">
            <div>
              <input type="number" class="fg dob-field" id="editDobDay" placeholder="DD" oninput="dobInput(this,'editDobMonth',2,31)" onblur="dobBlur(this,1,31)">
              <div style="font-size:10px;color:var(--t3);text-align:center;margin-top:4px;font-weight:600;letter-spacing:.5px">Day</div>
            </div>
            <div>
              <input type="number" class="fg dob-field" id="editDobMonth" placeholder="MM" oninput="dobInput(this,'editDobYear',2,12)" onblur="dobBlur(this,1,12)">
              <div style="font-size:10px;color:var(--t3);text-align:center;margin-top:4px;font-weight:600;letter-spacing:.5px">Month</div>
            </div>
            <div>
              <input type="number" class="fg dob-field" id="editDobYear" placeholder="YYYY" oninput="dobInput(this,null,4,new Date().getFullYear())" onblur="dobBlur(this,1900,new Date().getFullYear())">
              <div style="font-size:10px;color:var(--t3);text-align:center;margin-top:4px;font-weight:600;letter-spacing:.5px">Year</div>
            </div>
          </div>
        </div>
        <div style="margin-bottom:20px">
          <div class="edit-section-lbl">Gender</div>
          <div style="display:flex;gap:10px">
            <div id="editGenderMale" onclick="selectEditGender('male')" class="gender-card">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" stroke-width="1.5" stroke-linecap="round"><circle cx="10" cy="14" r="5"/><line x1="19" y1="5" x2="14.14" y2="9.86"/><polyline points="15 5 19 5 19 9"/></svg>
              <span style="font-size:13px;font-weight:700;color:var(--t2)">Male</span>
            </div>
            <div id="editGenderFemale" onclick="selectEditGender('female')" class="gender-card">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="9" r="5"/><line x1="12" y1="14" x2="12" y2="21"/><line x1="9" y1="18" x2="15" y2="18"/></svg>
              <span style="font-size:13px;font-weight:700;color:var(--t2)">Female</span>
            </div>
          </div>
        </div>
        <div style="margin-bottom:14px">
          <div class="edit-section-lbl">About (Bio)</div>
          <textarea class="fg-textarea" id="editBio" rows="3" maxlength="200" placeholder="নিজের সম্পর্কে কিছু লিখুন..." oninput="updateBioCount(this)"></textarea>
          <div class="char-count" id="bioCnt">0 / 200</div>
        </div>
        <div id="editErr" class="edit-err-box"></div>
      </div>`;
    setVal('editName',     u.name);
    setVal('editUsername', u.username);
    setVal('editEmail',    u.email);
    if(u.dob){
      const parts = u.dob.split('-');
      if(parts.length === 3){
        if(parts[0].length === 4){ setVal('editDobYear', parts[0]); setVal('editDobMonth', parts[1]); setVal('editDobDay', parts[2]); }
        else { setVal('editDobDay', parts[0]); setVal('editDobMonth', parts[1]); setVal('editDobYear', parts[2]); }
      }
    }
    const bioEl = $('editBio'); if(bioEl){ bioEl.value = u.bio||''; updateBioCount(bioEl); }
    _editOrigUsername = u.username || '';
    _editOrigEmail    = u.email    || '';
    _editUsernameValid = true;
    _editEmailValid    = true;
    _editGender        = u.gender  || '';
    _resetEditGenderUI();
    const us = $('editUsernameStatus'); if(us) us.innerHTML = '';
    const es = $('editEmailStatus');    if(es) es.innerHTML = '';
    const err = $('editErr');           if(err){ err.style.display='none'; err.textContent=''; }

  } else if(section === 'address'){
    title.textContent = 'Address';
    body.innerHTML = `
      <div class="edit-section-inner">
        <div class="fg-wrap">
          <input type="text" class="fg" id="editCurrentAddress" placeholder=" " maxlength="120">
          <span class="fg-lbl">বর্তমান ঠিকানা</span>
        </div>
        <div class="fg-wrap" style="margin-bottom:0">
          <input type="text" class="fg" id="editPermanentAddress" placeholder=" " maxlength="120">
          <span class="fg-lbl">স্থায়ী ঠিকানা</span>
        </div>
      </div>`;
    setVal('editCurrentAddress',   u.currentAddress);
    setVal('editPermanentAddress', u.permanentAddress);

  } else if(section === 'social'){
    title.textContent = 'Social Media';
    body.innerHTML = `
      <div class="edit-section-inner">
        <div class="social-input-row">
          <div class="social-input-icon" style="background:rgba(24,119,242,0.12);border:1px solid rgba(24,119,242,0.25)"><svg width="16" height="16" viewBox="0 0 24 24" fill="#4a9eff"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg></div>
          <div class="fg-wrap"><input type="text" class="fg" id="editFacebook" placeholder=" " autocapitalize="off"><span class="fg-lbl">Facebook username</span></div>
        </div>
        <div class="social-input-row">
          <div class="social-input-icon" style="background:rgba(225,48,108,0.1);border:1px solid rgba(225,48,108,0.25)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e8607a" stroke-width="2" stroke-linecap="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".5" fill="#e8607a"/></svg></div>
          <div class="fg-wrap"><input type="text" class="fg" id="editInstagram" placeholder=" " autocapitalize="off"><span class="fg-lbl">Instagram username</span></div>
        </div>
        <div class="social-input-row">
          <div class="social-input-icon" style="background:rgba(37,211,102,0.1);border:1px solid rgba(37,211,102,0.25)"><svg width="16" height="16" viewBox="0 0 24 24" fill="#25d366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.985-1.368A9.956 9.956 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg></div>
          <div class="fg-wrap"><input type="text" class="fg" id="editWhatsapp" placeholder=" " inputmode="tel"><span class="fg-lbl">WhatsApp number</span></div>
        </div>
        <div class="social-input-row">
          <div class="social-input-icon" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12)"><svg width="16" height="16" viewBox="0 0 24 24" fill="var(--text)"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.73a4.85 4.85 0 0 1-1.01-.04z"/></svg></div>
          <div class="fg-wrap"><input type="text" class="fg" id="editTiktok" placeholder=" " autocapitalize="off"><span class="fg-lbl">TikTok username</span></div>
        </div>
        <div class="social-input-row">
          <div class="social-input-icon" style="background:rgba(255,0,0,0.08);border:1px solid rgba(255,0,0,0.2)"><svg width="16" height="16" viewBox="0 0 24 24" fill="#ff4444"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.96-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon fill="white" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg></div>
          <div class="fg-wrap"><input type="text" class="fg" id="editYoutube" placeholder=" " autocapitalize="off"><span class="fg-lbl">YouTube @handle</span></div>
        </div>
        <div class="social-input-row" style="margin-bottom:0">
          <div class="social-input-icon" style="background:rgba(29,155,240,0.1);border:1px solid rgba(29,155,240,0.25)"><svg width="16" height="16" viewBox="0 0 24 24" fill="#1d9bf0"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></div>
          <div class="fg-wrap" style="margin-bottom:0"><input type="text" class="fg" id="editTwitter" placeholder=" " autocapitalize="off"><span class="fg-lbl">X / Twitter username</span></div>
        </div>
      </div>`;
    const soc = u.social||{};
    setVal('editFacebook',  soc.facebook);
    setVal('editInstagram', soc.instagram);
    setVal('editWhatsapp',  soc.whatsapp);
    setVal('editTiktok',    soc.tiktok);
    setVal('editYoutube',   soc.youtube);
    setVal('editTwitter',   soc.twitter);

  } else if(section === 'privacy'){
    title.textContent = 'Privacy Settings';
    const prv = u.privacy || {};
    const prvRow = (id, label, icon, checked) => `
      <div class="prv-row">
        <div class="prv-label">${icon}${label}</div>
        <div class="prv-right">
          <span class="prv-state" id="${id}State" style="color:${checked!==false?'var(--accent)':'var(--t2)'}">${checked!==false?'Public':'Private'}</span>
          <label class="prv-toggle">
            <input type="checkbox" id="${id}" ${checked!==false?'checked':''} onchange="_updatePrivacyToggleUI(this)">
            <span class="prv-track"></span>
          </label>
        </div>
      </div>`;
    body.innerHTML = `<div class="edit-section-inner">
      <div class="prv-desc">কোন তথ্যগুলো অন্যরা দেখতে পাবে সেটা নিয়ন্ত্রণ করুন।</div>
      ${prvRow('privPhone',   'Phone Number',
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg>',
        prv.showPhone)}
      ${prvRow('privEmail',   'Email Address',
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent2)" stroke-width="2" stroke-linecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
        prv.showEmail)}
      ${prvRow('privGender',  'Gender',
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="9" r="5"/><line x1="12" y1="14" x2="12" y2="21"/></svg>',
        prv.showGender)}
      ${prvRow('privAddress', 'Address',
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
        prv.showAddress)}
      ${prvRow('privSocial',  'Social Media',
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent2)" stroke-width="2" stroke-linecap="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>',
        prv.showSocial)}
      ${prvRow('privLastSeen', 'Last Seen',
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent2)" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
        prv.showLastSeen)}
      ${prvRow('privOnline', 'Online Status',
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="var(--accent)"/></svg>',
        prv.showOnline)}
    </div>`;
  }

  sheet.classList.add('open');
  _pushBack(closeEditSection, 'editsection');
}

function closeEditSection(){
  _popBack();
  const sheet = $('editSectionSheet');
  if(sheet) sheet.classList.remove('open');
  _currentEditSection = null;
  // editProfileOverlay যদি open না থাকে (মানে profile page থেকে এসেছে) তাহলে কিছু করার নেই
  // কিন্তু যদি open থাকে (Edit Profile modal থেকে এসেছে) সেটাও বন্ধ করবো না — user নিজে বন্ধ করবে
}

async function saveEditSection(){
  const u   = CUD || {};
  const section = _currentEditSection;
  if(!section) return;

  const btn = $('editSectionSaveBtn');
  if(btn){ btn.disabled = true; btn.textContent = '...'; }

  try{
    let updateData = {};

    if(section === 'account'){
      _hideEditErr();
      const name     = ($('editName')?.value||'').trim();
      const username = ($('editUsername')?.value||'').trim().toLowerCase();
      const email    = CUD?.email || '';
      const dobD     = ($('editDobDay')?.value||'').trim();
      const dobM     = ($('editDobMonth')?.value||'').trim();
      const dobY     = ($('editDobYear')?.value||'').trim();
      const bio      = ($('editBio')?.value||'').trim().slice(0,200);

      if(!name)                         { _showEditErr('Name cannot be empty'); return; }
      if(!username||username.length<3)  { _showEditErr('Username must be at least 3 characters'); return; }
      if(!_editUsernameValid)           { _showEditErr('This username is already taken'); return; }

      if(!_editGender)                  { _showEditErr('Please select your gender'); return; }

      let dob = '';
      if(dobD && dobM && dobY) dob = `${dobY.padStart(4,'0')}-${dobM.padStart(2,'0')}-${dobD.padStart(2,'0')}`;

      let photoURL = CUD?.photoURL || '';
      if(_editAvatarBlob){
        try{
          const fd = new FormData();
          fd.append('file', _editAvatarBlob, 'avatar.jpg');
          fd.append('upload_preset', CLOUDINARY_PRESET);
          fd.append('folder', 'vocall_avatars');
          const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,{method:'POST',body:fd});
          if(res.ok){ const d = await res.json(); photoURL = d.secure_url||photoURL; }
        }catch(_){ toast('Photo upload failed, other changes saved.','error'); }
      }

      updateData = { name, username, email, gender:_editGender, photoURL, bio };
      if(dob) updateData.dob = dob;

      const oldUsername = CUD?.username || '';
      const fullData = { ...CUD, ...updateData, coverPhotoURL: CUD?.coverPhotoURL||'', social: CUD?.social||{}, privacy: CUD?.privacy||{}, updatedAt: FS.serverTimestamp() };
      if(username !== oldUsername){
        await db.collection('users').doc(username).set(fullData);
        await db.collection('users').doc(oldUsername).update({ accountDeleted:true });
      } else {
        await db.collection('users').doc(username).update({ ...updateData, updatedAt: FS.serverTimestamp() });
      }

      // Update preview
      const np = $('editNamePreview');     if(np) np.textContent = name;
      const up = $('editUsernamePreview'); if(up) up.textContent = '@' + username;

    } else if(section === 'address'){
      updateData = {
        currentAddress:   ($('editCurrentAddress')?.value||'').trim(),
        permanentAddress: ($('editPermanentAddress')?.value||'').trim(),
      };
      await db.collection('users').doc(u.username).update({ ...updateData, updatedAt: FS.serverTimestamp() });

    } else if(section === 'social'){
      updateData = { social: {
        facebook:  ($('editFacebook')?.value||'').trim().replace(/^@/,''),
        instagram: ($('editInstagram')?.value||'').trim().replace(/^@/,''),
        whatsapp:  ($('editWhatsapp')?.value||'').trim(),
        tiktok:    ($('editTiktok')?.value||'').trim().replace(/^@/,''),
        youtube:   ($('editYoutube')?.value||'').trim().replace(/^@/,''),
        twitter:   ($('editTwitter')?.value||'').trim().replace(/^@/,''),
      }};
      await db.collection('users').doc(u.username).update({ ...updateData, updatedAt: FS.serverTimestamp() });

    } else if(section === 'privacy'){
      updateData = { privacy: {
        showPhone:    $('privPhone')?.checked    !== false,
        showEmail:    $('privEmail')?.checked    !== false,
        showGender:   $('privGender')?.checked   !== false,
        showAddress:  $('privAddress')?.checked  !== false,
        showSocial:   $('privSocial')?.checked   !== false,
        showLastSeen: $('privLastSeen')?.checked !== false,
        showOnline:   $('privOnline')?.checked   !== false,
      }};
      await db.collection('users').doc(u.username).update({ ...updateData, updatedAt: FS.serverTimestamp() });
    }

    CUD = { ...CUD, ...updateData };
    _saveCache(CUD);
    _prebuildProfile();
    _refreshProfileCache();
    toast('Saved!', 'success');
    closeEditSection();

  }catch(err){
    let m = 'Could not save. Try again.';
    if(err.code==='auth/requires-recent-login') m = 'Please log in again to change email.';
    else if(err.code==='unavailable') m = 'No connection. Please try again.';
    _showEditErr(m);
  }finally{
    if(btn){ btn.disabled = false; btn.textContent = 'Save'; }
  }
}

function _updatePrivacyToggleUI(el){
  if(!el) return;
  const stateEl = $(el.id + 'State');
  if(!stateEl) return;
  stateEl.textContent = el.checked ? 'Public' : 'Private';
  stateEl.style.color = el.checked ? 'var(--accent)' : 'var(--t2)';
}

function closeEditProfile(){
  _popBack();
  $('editProfileOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function handleEditOverlayClick(e){
  if(e.target === $('editProfileOverlay')) closeEditProfile();
}

function _resetEditGenderUI(){
  ['editGenderMale','editGenderFemale'].forEach(id => {
    const el = $(id); if(!el) return;
    const g = id === 'editGenderMale' ? 'male' : 'female';
    const isSelected = _editGender === g;
    el.style.borderColor = isSelected ? 'var(--accent)' : '';
    el.style.background  = isSelected ? 'var(--adim)' : '';
    const svg = el.querySelector('svg');
    const span = el.querySelector('span');
    if(svg)  svg.setAttribute('stroke', isSelected ? 'var(--accent)' : 'var(--t2)');
    if(span) span.style.color = isSelected ? 'var(--accent)' : '';
  });
}

function selectEditGender(g){
  _editGender = g;
  _resetEditGenderUI();
}

function handleEditAvatarSelect(inp){
  if(!inp.files||!inp.files[0]) return;
  const file = inp.files[0];
  if(file.size > 8*1024*1024){ toast('Image too large (max 8MB)','error'); return; }
  inp.value = '';
  openCrop(file, 'avatar', blob => {
    _editAvatarBlob = blob;
    const circle = $('editAvCircle');
    if(circle) circle.innerHTML = `<img src="${URL.createObjectURL(blob)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">` + _CAM_OVERLAY;
  });
}

function checkEditUsername(rawVal){
  const val = rawVal.toLowerCase().replace(/[^a-z0-9_]/g,'');
  const el = $('editUsername'); if(el && el.value !== val) el.value = val;
  const st = $('editUsernameStatus'); if(!st) return;
  if(!val || val === _editOrigUsername){ st.innerHTML = val === _editOrigUsername ? SVG_TICK : ''; _editUsernameValid = true; return; }
  if(val.length < 3){ st.innerHTML = SVG_CROSS; _editUsernameValid = false; return; }
  st.innerHTML = SVG_SPIN;
  clearTimeout(_editCheckTimers.username);
  _editCheckTimers.username = setTimeout(async () => {
    try{
      const snap = await db.collection('users').doc(val).get();
      _editUsernameValid = !snap.exists || snap.data().accountDeleted === true;
      st.innerHTML = _editUsernameValid ? SVG_TICK : SVG_CROSS;
    }catch(_){ st.innerHTML = ''; _editUsernameValid = false; }
  }, 500);
}

function checkEditEmail(rawVal){
  const val = rawVal.trim();
  const st = $('editEmailStatus'); if(!st) return;
  if(!val || val === _editOrigEmail){ st.innerHTML = val === _editOrigEmail ? SVG_TICK : ''; _editEmailValid = true; return; }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)){ st.innerHTML = SVG_CROSS; _editEmailValid = false; return; }
  st.innerHTML = SVG_SPIN;
  clearTimeout(_editCheckTimers.email);
  _editCheckTimers.email = setTimeout(async () => {
    try{
      const methods = await auth.fetchSignInMethodsForEmail(val);
      _editEmailValid = methods.length === 0;
      st.innerHTML = _editEmailValid ? SVG_TICK : SVG_CROSS;
    }catch(_){ st.innerHTML = SVG_TICK; _editEmailValid = true; }
  }, 500);
}

function updateBioCount(ta){
  const len = (ta.value||'').length;
  const cnt = $('bioCnt');
  if(cnt){ cnt.textContent = len+' / 200'; cnt.className='char-count'+(len>180?' warn':''); }
}

function _showEditErr(msg){ const el=$('editErr'); if(el){ el.textContent=msg; el.style.display='block'; } }
function _hideEditErr()   { const el=$('editErr'); if(el) el.style.display='none'; }

// ── CROP ENGINE ──
const _crop = {
  canvas:null, ctx:null, stage:null,
  img:null, mode:'avatar',
  scale:1, minScale:1,
  ox:0, oy:0,
  dragging:false, lastX:0, lastY:0,
  pinchDist:0,
  onDone:null
};
function openCrop(file, mode, onDone){
  _crop.mode   = mode;
  _crop.onDone = onDone;
  _crop.canvas = $('cropCanvas');
  _crop.ctx    = _crop.canvas.getContext('2d');
  _crop.stage  = $('cropStage');
  $('cropTitle').textContent = mode==='cover' ? 'Crop Cover Photo' : 'Crop Profile Photo';
  $('cropZoom').value   = 100;
  $('cropZoomVal').textContent = '1×';

  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      _crop.img = img;
      _cropSetup();
      $('cropOverlay').classList.add('open');
      _pushBack(closeCrop, 'crop');
      document.body.style.overflow = 'hidden';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function _cropSetup(){
  const s = _crop.stage;
  const W = s.clientWidth || Math.min(window.innerWidth, 480);
  // avatar: square-ish, cover: 16:9-ish shorter, chat: 4:3
  const H = _crop.mode === 'avatar' ? Math.round(W * 0.85)
          : _crop.mode === 'chat'   ? Math.round(W * 0.82)
          : Math.round(W * 0.55);
  s.style.height = H + 'px';
  _crop.canvas.width  = W;
  _crop.canvas.height = H;

  const img = _crop.img;
  let fW, fH;
  if(_crop.mode === 'avatar'){
    const r = Math.min(W,H) * 0.42;
    fW = fH = r*2;
  } else if(_crop.mode === 'chat'){
    // chat image: 4:3 ratio, সম্পূর্ণ ছবি ব্যবহার করা যাবে
    fW = W * 0.96; fH = fW * (3/4);
  } else {
    fW = W * 0.96; fH = fW * (9/21);
  }
  const fit = Math.max(fW/img.width, fH/img.height);
  _crop.minScale = fit;
  _crop.scale    = fit;
  _crop.ox = 0; _crop.oy = 0;
  _cropDraw();
}

function _cropDraw(){
  const {canvas, ctx, img, scale, ox, oy, mode} = _crop;
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);

  // Image
  const iw = img.width*scale, ih = img.height*scale;
  const ix = W/2+ox-iw/2,    iy = H/2+oy-ih/2;
  ctx.drawImage(img, ix, iy, iw, ih);

  // Dark overlay using composite
  if(mode === 'avatar'){
    const r = Math.min(W,H)*0.42;
    ctx.save();
    ctx.fillStyle='rgba(0,0,0,0.62)';
    ctx.fillRect(0,0,W,H);
    ctx.globalCompositeOperation='destination-out';
    ctx.beginPath(); ctx.arc(W/2,H/2,r,0,Math.PI*2); ctx.fill();
    ctx.restore();
    // Glowing ring
    ctx.save();
    ctx.strokeStyle='rgba(0,229,184,1)';
    ctx.lineWidth=2.5;
    ctx.shadowColor='rgba(0,229,184,0.5)';
    ctx.shadowBlur=8;
    ctx.beginPath(); ctx.arc(W/2,H/2,r,0,Math.PI*2); ctx.stroke();
    ctx.restore();
    // Rule-of-thirds inside circle
    ctx.save();
    ctx.strokeStyle='rgba(255,255,255,0.12)';
    ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(W/2,H/2,r,0,Math.PI*2); ctx.clip();
    for(let i=1;i<3;i++){
      const lx=W/2-r+i*(r*2/3), ly=H/2-r+i*(r*2/3);
      ctx.moveTo(lx,H/2-r); ctx.lineTo(lx,H/2+r);
      ctx.moveTo(W/2-r,ly); ctx.lineTo(W/2+r,ly);
    }
    ctx.stroke(); ctx.restore();
  } else {
    // cover এবং chat দুটোর জন্যই rectangle crop UI
    let cW, cH;
    if(mode === 'chat'){ cW = W*0.96; cH = cW*(3/4); }
    else               { cW = W*0.96; cH = cW*(9/21); }
    const cx  = (W-cW)/2, cy = (H-cH)/2;
    ctx.save();
    ctx.fillStyle='rgba(0,0,0,0.62)';
    ctx.fillRect(0,0,W,cy);
    ctx.fillRect(0,cy+cH,W,H);
    ctx.fillRect(0,cy,cx,cH);
    ctx.fillRect(cx+cW,cy,W,cH);
    ctx.restore();
    // Glow border
    ctx.save();
    ctx.strokeStyle='rgba(0,229,184,0.9)';
    ctx.lineWidth=2;
    ctx.shadowColor='rgba(0,229,184,0.4)';
    ctx.shadowBlur=8;
    ctx.strokeRect(cx,cy,cW,cH);
    ctx.restore();
    // Corner brackets
    ctx.save();
    ctx.strokeStyle='#00e5b8'; ctx.lineWidth=3.5;
    ctx.lineCap='round';
    const m=20;
    [[cx,cy,1,1],[cx+cW,cy,-1,1],[cx,cy+cH,1,-1],[cx+cW,cy+cH,-1,-1]].forEach(([x,y,dx,dy])=>{
      ctx.beginPath(); ctx.moveTo(x+dx*m,y); ctx.lineTo(x,y); ctx.lineTo(x,y+dy*m); ctx.stroke();
    });
    ctx.restore();
    // Rule of thirds
    ctx.save();
    ctx.strokeStyle='rgba(255,255,255,0.1)'; ctx.lineWidth=1;
    ctx.beginPath();
    for(let i=1;i<3;i++){
      const lx=cx+i*(cW/3), ly=cy+i*(cH/3);
      ctx.moveTo(lx,cy); ctx.lineTo(lx,cy+cH);
      ctx.moveTo(cx,ly); ctx.lineTo(cx+cW,ly);
    }
    ctx.stroke(); ctx.restore();
  }
}

function _cropClamp(){
  const {canvas, img, scale, mode} = _crop;
  const W = canvas.width, H = canvas.height;
  const iw = img.width*scale, ih = img.height*scale;
  let zoneW, zoneH;
  if(mode==='avatar'){
    const r=Math.min(W,H)*0.42; zoneW=zoneH=r*2;
  } else if(mode==='chat'){
    zoneW=W*0.96; zoneH=zoneW*(3/4);
  } else { zoneW=W*0.96; zoneH=zoneW*(9/21); }
  const maxOx = Math.max(0,(iw-zoneW)/2);
  const maxOy = Math.max(0,(ih-zoneH)/2);
  _crop.ox = Math.max(-maxOx,Math.min(maxOx,_crop.ox));
  _crop.oy = Math.max(-maxOy,Math.min(maxOy,_crop.oy));
}

function onCropZoom(val){
  const f = val/100;
  _crop.scale = _crop.minScale * f;
  const capped = Math.max(_crop.minScale, _crop.scale);
  _crop.scale = capped;
  _cropClamp(); _cropDraw();
  $('cropZoomVal').textContent = f.toFixed(1)+'×';
}

function closeCrop(){
  _popBack();
  $('cropOverlay').classList.remove('open');
  document.body.style.overflow='';
}

function handleCropOverlayClick(e){
  if(e.target === $('cropOverlay')) closeCrop();
}

function applyCrop(){
  const {canvas, img, scale, ox, oy, mode} = _crop;
  const W=canvas.width, H=canvas.height;
  let cx,cy,cW,cH,outW,outH;
  if(mode==='avatar'){
    const r=Math.min(W,H)*0.42; cW=cH=r*2; outW=outH=600;
    cx=W/2-r; cy=H/2-r;
  } else if(mode==='chat'){
    cW=W*0.96; cH=cW*(3/4); outW=1200; outH=Math.round(outW*(3/4));
    cx=(W-cW)/2; cy=(H-cH)/2;
  } else {
    cW=W*0.96; cH=cW*(9/21); outW=1400; outH=Math.round(outW*(9/21));
    cx=(W-cW)/2; cy=(H-cH)/2;
  }
  const out=document.createElement('canvas');
  out.width=outW; out.height=outH;
  const octx=out.getContext('2d');
  if(mode==='avatar'){
    octx.beginPath(); octx.arc(outW/2,outH/2,outW/2,0,Math.PI*2); octx.clip();
  }
  const iw=img.width*scale, ih=img.height*scale;
  const ix=W/2+ox-iw/2, iy=H/2+oy-ih/2;
  const sx=(cx-ix)/scale, sy=(cy-iy)/scale;
  const sw=cW/scale, sh=cH/scale;
  octx.drawImage(img,sx,sy,sw,sh,0,0,outW,outH);
  out.toBlob(blob=>{
    if(_crop.onDone) _crop.onDone(blob);
    closeCrop();
  },'image/jpeg',0.93);
}

// ── Input handling: drag + pinch-zoom ──
(function(){
  const cv = ()=> $('cropOverlay')?.classList.contains('open');
  let pDist=0;

  function dist(t){ return Math.hypot(t[0].clientX-t[1].clientX, t[0].clientY-t[1].clientY); }

  function onDown(e){
    if(!cv()) return;
    if(e.type==='touchstart' && e.touches.length===2){
      e.preventDefault(); pDist=dist(e.touches);
      _crop.dragging=false; return;
    }
    const stage = $('cropStage');
    if(!stage || (!stage.contains(e.target) && e.target !== $('cropCanvas'))) return;
    e.preventDefault(); _crop.dragging=true;
    const p=e.touches?e.touches[0]:e;
    _crop.lastX=p.clientX; _crop.lastY=p.clientY;
  }
  function onMove(e){
    if(!cv()) return;
    if(e.type==='touchmove' && e.touches.length===2){
      e.preventDefault();
      const d=dist(e.touches);
      const factor=d/pDist;
      pDist=d;
      const newScale=Math.max(_crop.minScale, Math.min(_crop.minScale*4, _crop.scale*factor));
      _crop.scale=newScale;
      const pct=Math.round((newScale/_crop.minScale)*100);
      $('cropZoom').value=Math.min(400,pct);
      $('cropZoomVal').textContent=(newScale/_crop.minScale).toFixed(1)+'×';
      _cropClamp(); _cropDraw(); return;
    }
    if(!_crop.dragging) return; e.preventDefault();
    const p=e.touches?e.touches[0]:e;
    _crop.ox+=p.clientX-_crop.lastX;
    _crop.oy+=p.clientY-_crop.lastY;
    _crop.lastX=p.clientX; _crop.lastY=p.clientY;
    _cropClamp(); _cropDraw();
  }
  function onUp(){ _crop.dragging=false; }
  function onWheel(e){
    if(!cv()) return;
    e.preventDefault();
    const delta=e.deltaY<0?1.06:0.95;
    const ns=Math.max(_crop.minScale,Math.min(_crop.minScale*4,_crop.scale*delta));
    _crop.scale=ns;
    const pct=Math.round((ns/_crop.minScale)*100);
    $('cropZoom').value=Math.min(400,pct);
    $('cropZoomVal').textContent=(ns/_crop.minScale).toFixed(1)+'×';
    _cropClamp(); _cropDraw();
  }
  document.addEventListener('mousedown',  onDown, {passive:false});
  document.addEventListener('mousemove',  onMove, {passive:false});
  document.addEventListener('mouseup',    onUp);
  document.addEventListener('touchstart', onDown, {passive:false});
  document.addEventListener('touchmove',  onMove, {passive:false});
  document.addEventListener('touchend',   onUp);
  document.addEventListener('wheel',      onWheel,{passive:false});
})();

// BLOCK USER
async function _toggleBlockUser(uid, username, name, isBlocked){
  const msg = isBlocked
    ? name + '-কে unblock করবেন?'
    : name + '-কে block করবেন? সে আর আপনাকে message বা call করতে পারবে না।';
  if(!confirm(msg)) return;
  if(!CU || !CUD) return;
  try{
    const myUsername = CUD.username;
    const blockedList = Array.isArray(CUD.blockedUsers) ? [...CUD.blockedUsers] : [];
    if(isBlocked){
      const idx = blockedList.indexOf(uid);
      if(idx > -1) blockedList.splice(idx, 1);
    } else {
      if(!blockedList.includes(uid)) blockedList.push(uid);
    }
    await db.collection('users').doc(myUsername).update({ blockedUsers: blockedList });
    CUD = { ...CUD, blockedUsers: blockedList };
    _saveCache(CUD);
    toast(isBlocked ? name + ' unblocked' : name + ' blocked', 'success');
    closeProfileSheet();
  }catch(e){ toast('Failed. Try again.', 'error'); }
}

// REPORT USER MODAL
function _openReportModal(uid, username, name){
  const old = document.getElementById('reportModalOverlay');
  if(old) old.remove();

  const reasons = [
    { id:'spam',    label:'Spam or Unwanted Content',      icon:'<path d="M18.36 6.64A9 9 0 0 1 20.77 15"/><path d="M6.16 6.16a9 9 0 1 0 12.68 12.68"/><line x1="1" y1="1" x2="23" y2="23"/>' },
    { id:'fake',    label:'Fake Account or Impersonation', icon:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="1" y1="1" x2="23" y2="23"/>' },
    { id:'harass',  label:'Harassment or Bullying',        icon:'<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>' },
    { id:'harmful', label:'Harmful or Dangerous Content',  icon:'<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' },
    { id:'other',   label:'Other',                         icon:'<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>' },
  ];

  let reasonsHTML = '';
  reasons.forEach(r => {
    reasonsHTML += `
      <label class="report-reason-row" for="rr_${r.id}">
        <div class="report-reason-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">${r.icon}</svg>
        </div>
        <span class="report-reason-label">${r.label}</span>
        <div class="report-reason-radio">
          <input type="radio" name="reportReason" id="rr_${r.id}" value="${r.id}">
          <span class="report-radio-dot"></span>
        </div>
      </label>`;
  });

  const overlay = document.createElement('div');
  overlay.id = 'reportModalOverlay';
  overlay.className = 'report-overlay';
  overlay.innerHTML = `
    <div class="report-sheet" id="reportSheet">
      <div class="report-handle"></div>
      <div class="report-header">
        <div class="report-title">Report User</div>
        <button class="report-close" onclick="_closeReportModal()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="report-target">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <span>${_esc(name)}</span>
        ${username ? '<span class="report-target-handle">@' + _esc(username) + '</span>' : ''}
      </div>
      <div class="report-subtitle">রিপোর্টের কারণ বেছে নিন:</div>
      <div class="report-reasons">${reasonsHTML}</div>
      <div class="report-note-wrap">
        <textarea class="report-note" id="reportNote" placeholder="অতিরিক্ত বিবরণ (ঐচ্ছিক)..." maxlength="300" rows="3"></textarea>
      </div>
      <div class="report-actions">
        <button class="report-cancel-btn" onclick="_closeReportModal()">Cancel</button>
        <button class="report-submit-btn" id="reportSubmitBtn" onclick="_submitReport('${_esc(uid)}','${_esc(username)}','${_esc(name)}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
          Submit Report
        </button>
      </div>
    </div>`;

  overlay.addEventListener('click', e => { if(e.target === overlay) _closeReportModal(); });
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  _pushBack(_closeReportModal, 'reportmodal');
  requestAnimationFrame(() => overlay.classList.add('open'));
}

function _closeReportModal(){
  _popBack();
  const el = document.getElementById('reportModalOverlay');
  if(!el) return;
  el.classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(() => el.remove(), 320);
}

async function _submitReport(uid, username, name){
  const reason = document.querySelector('input[name="reportReason"]:checked')?.value;
  if(!reason){ toast('একটি কারণ বেছে নিন', 'error'); return; }
  const note = ($('reportNote')?.value || '').trim().slice(0, 300);
  const btn  = $('reportSubmitBtn');
  if(btn){ btn.disabled = true; btn.textContent = '...'; }
  try{
    await db.collection('reports').add({
      reportedUid:      uid,
      reportedUsername: username,
      reportedName:     name,
      reporterUid:      CU?.uid || '',
      reporterUsername: CUD?.username || '',
      reason, note,
      status:    'pending',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    _closeReportModal();
    toast('Report submitted. ধন্যবাদ।', 'success');
  }catch(e){
    toast('Failed. Try again.', 'error');
    if(btn){ btn.disabled = false; btn.textContent = 'Submit Report'; }
  }
}

// AVATAR FULLSCREEN ZOOM
function _openAvatarZoom(photoURL, name){
  const old = document.getElementById('avatarZoomOverlay');
  if(old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'avatarZoomOverlay';
  overlay.className = 'avzoom-overlay';
  overlay.innerHTML = `
    <div class="avzoom-topbar">
      <button class="avzoom-close" onclick="_closeAvatarZoom()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <div class="avzoom-name">${_esc(name)}</div>
      <div style="width:38px"></div>
    </div>
    <div class="avzoom-stage">
      <img src="${_esc(photoURL)}" class="avzoom-img" id="avzoomImg" draggable="false">
    </div>
    <div class="avzoom-hint">Pinch to zoom &nbsp;·&nbsp; Double tap to reset</div>`;

  overlay.addEventListener('click', e => { if(e.target === overlay) _closeAvatarZoom(); });
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  _pushBack(_closeAvatarZoom, 'avzoom');
  requestAnimationFrame(() => overlay.classList.add('open'));

  const img = document.getElementById('avzoomImg');
  let _az = { scale:1, tx:0, ty:0, lastDist:0, dragging:false, lx:0, ly:0 };
  function _azApply(){ img.style.transform = `translate(${_az.tx}px,${_az.ty}px) scale(${_az.scale})`; }

  img.addEventListener('touchstart', e => {
    if(e.touches.length === 2){
      _az.lastDist = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
    } else {
      _az.dragging=true; _az.lx=e.touches[0].clientX; _az.ly=e.touches[0].clientY;
    }
  }, {passive:true});
  img.addEventListener('touchmove', e => {
    e.preventDefault();
    if(e.touches.length === 2){
      const d = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
      _az.scale = Math.max(1, Math.min(5, _az.scale * (d/_az.lastDist)));
      _az.lastDist = d; _azApply();
    } else if(_az.dragging){
      _az.tx += e.touches[0].clientX-_az.lx; _az.ty += e.touches[0].clientY-_az.ly;
      _az.lx=e.touches[0].clientX; _az.ly=e.touches[0].clientY; _azApply();
    }
  }, {passive:false});
  img.addEventListener('touchend', () => { _az.dragging=false; });

  let _azLastTap = 0;
  img.addEventListener('touchend', () => {
    const now = Date.now();
    if(now - _azLastTap < 300){ _az.scale=1; _az.tx=0; _az.ty=0; _azApply(); }
    _azLastTap = now;
  });
}

function _closeAvatarZoom(){
  _popBack();
  const el = document.getElementById('avatarZoomOverlay');
  if(!el) return;
  el.classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(() => el.remove(), 280);
}

// PROFILE SHARE
function _shareProfile(username, name){
  const text = 'Solvix-এ ' + name + '-এর প্রোফাইল দেখুন: @' + username;
  if(navigator.share){
    navigator.share({ title: name + ' — Solvix', text });
  } else {
    navigator.clipboard.writeText('@' + username)
      .then(() => toast('Username copied!', 'success'))
      .catch(() => toast('@' + username, 'info'));
  }
}
