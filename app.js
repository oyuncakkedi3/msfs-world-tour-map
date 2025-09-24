const firebaseConfig = {
  apiKey: "SENIN_API_KEYIN",
  authDomain: "proje-id.firebaseapp.com",
  projectId: "proje-id",
  storageBucket: "proje-id.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
console.log('app.js yüklendi (test sürümü)');

const map = L.map('map', { worldCopyJump: true }).setView([41.015137, 28.97953], 4);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap katkıcıları'
}).addTo(map);

