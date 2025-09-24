// Firebase başlangıç (compat)
const firebaseConfig = {
  apiKey: "AIzaSyAJkdKDJc0_5OB-QLPpTE7KhSEUAW8qyzg",
  authDomain: "msfs-1eeed.firebaseapp.com",
  projectId: "msfs-1eeed",
  storageBucket: "msfs-1eeed.appspot.com",
  messagingSenderId: "953746578457",
  appId: "1:953746578457:web:df91b27ab14884c94dde88",
  measurementId: "G-M0DTKY5QPQ"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Giriş/Çıkış
const signInBtn = document.getElementById("sign-in-btn");
const signOutBtn = document.getElementById("sign-out-btn");
const userInfo = document.getElementById("user-info");
let isAdmin = false;

signInBtn.addEventListener("click", async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  await auth.signInWithPopup(provider);
});
signOutBtn.addEventListener("click", async () => {
  await auth.signOut();
});
auth.onAuthStateChanged((user) => {
  if (user) {
    console.log("UID (Rules'a koy):", user.uid);
    userInfo.textContent = `Giriş: ${user.displayName || user.email}`;
    signInBtn.classList.add("hidden");
    signOutBtn.classList.remove("hidden");
    isAdmin = true;
  } else {
    userInfo.textContent = "";
    signInBtn.classList.remove("hidden");
    signOutBtn.classList.add("hidden");
    isAdmin = false;
  }
});
console.log('app.js minimal başladı');

var map = L.map('map', { worldCopyJump: true }).setView([41.015137, 28.97953], 4);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap katkıcıları'
}).addTo(map);

document.getElementById('sign-in-btn').addEventListener('click', function () {
  console.log('Giriş Yap tıklandı (test)');
});
document.getElementById('sign-out-btn').addEventListener('click', function () {
  console.log('Çıkış tıklandı (test)');
});
