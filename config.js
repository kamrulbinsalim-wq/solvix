// ══════════════════════════════════════════
//   SOLVIX — CONFIG.JS
//   সমস্ত API, URL, KEY এক জায়গায়
// ══════════════════════════════════════════


// ── FIREBASE CONFIG ──
const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyAMCmZBxZoha4gWB5elP0p3qz1LHjTXo9s',
  authDomain:        'infobooks-4358d.firebaseapp.com',
  projectId:         'infobooks-4358d',
  messagingSenderId: '938954145740',
  appId:             '1:938954145740:web:ee2a334f8f0e621f552769',
  databaseURL:       'https://infobooks-4358d-default-rtdb.asia-southeast1.firebasedatabase.app'
};

// ── FIREBASE INIT ──
firebase.initializeApp(FIREBASE_CONFIG);
const auth = firebase.auth();
const db   = firebase.firestore();
const FS   = firebase.firestore.FieldValue;


// ── CLOUDINARY CONFIG ──
const CLOUDINARY_CLOUD   = 'dlporj4u2';
const CLOUDINARY_PRESET  = 'vocall_media';
const CLOUDINARY_API_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}`;


// ── CLOUDFLARE WORKER ──
const _CF_WORKER_URL = 'https://vocall.kamrulbinsalim.workers.dev';


// ── SOCIAL MEDIA BASE URLs ──
const SOCIAL_BASE_URLS = {
  facebook:  'https://facebook.com/',
  instagram: 'https://instagram.com/',
  whatsapp:  'https://wa.me/',
  tiktok:    'https://tiktok.com/@',
  youtube:   'https://youtube.com/@',
  twitter:   'https://x.com/',
};
