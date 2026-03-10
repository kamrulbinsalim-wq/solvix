// ── SOLVIX SERVICE WORKER ──
// Firebase Cloud Messaging + PWA Cache

importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'AIzaSyAMCmZBxZoha4gWB5elP0p3qz1LHjTXo9s',
  authDomain:        'infobooks-4358d.firebaseapp.com',
  projectId:         'infobooks-4358d',
  messagingSenderId: '938954145740',
  appId:             '1:938954145740:web:ee2a334f8f0e621f552769',
  databaseURL:       'https://infobooks-4358d-default-rtdb.asia-southeast1.firebasedatabase.app'
});

const messaging = firebase.messaging();

// ── BACKGROUND MESSAGE HANDLER ──
// App বন্ধ বা background-এ থাকলে এখানে notification আসবে
messaging.onBackgroundMessage(payload => {
  const data = payload.data || {};
  const type = data.type || 'message'; // 'message' | 'call'

  let title, body, icon, badge, tag, actions, vibrate, requireInteraction;

  if (type === 'call') {
    // ── INCOMING CALL NOTIFICATION ──
    title          = `📞 ${data.callerName || 'Someone'} calling...`;
    body           = 'Solvix voice call — Tap to answer';
    icon           = 'icons/icon-192.png';
    badge          = 'icons/badge-72.png';
    tag            = 'solvix-call';          // পুরনো call notification replace হবে
    requireInteraction = true;               // dismiss না করা পর্যন্ত থাকবে
    vibrate        = [300, 100, 300, 100, 300];
    actions        = [
      { action: 'answer', title: '✅ Answer' },
      { action: 'decline', title: '❌ Decline' }
    ];
  } else {
    // ── NEW MESSAGE NOTIFICATION ──
    title   = data.senderName || 'Solvix';
    body    = data.body || 'New message';
    icon    = data.senderPhoto || 'icons/icon-192.png';
    badge   = 'icons/badge-72.png';
    tag     = `solvix-msg-${data.chatId || 'chat'}`; // একই চ্যাটের notification stack হবে
    vibrate = [100, 50, 100];
    requireInteraction = false;
  }

  return self.registration.showNotification(title, {
    body,
    icon,
    badge,
    tag,
    vibrate,
    requireInteraction,
    actions,
    data: { type, chatId: data.chatId, callId: data.callId, url: '/' }
  });
});

// ── NOTIFICATION CLICK HANDLER ──
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const data   = event.notification.data || {};
  const action = event.action;

  // Call notification এ Decline চাপলে শুধু বন্ধ করো
  if (data.type === 'call' && action === 'decline') return;

  // App open করো বা focus দাও
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      const target = data.url || '/';
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // App খোলা আছে — focus দাও এবং message পাঠাও
          client.focus();
          client.postMessage({ type: 'NOTIFICATION_CLICK', data });
          return;
        }
      }
      // App বন্ধ আছে — নতুন window খোলো
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});

// ── INSTALL & ACTIVATE ──
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(clients.claim()));
