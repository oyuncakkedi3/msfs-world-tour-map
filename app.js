// Temel ve sorunsuz sürüm (sadece harita + giriş/çıkış)
// Not: index.html'de firebase-app-compat.js, firebase-auth-compat.js, firebase-firestore-compat.js yüklü olmalı

const firebaseConfig = {
  apiKey: "AIzaSyAJkdKDJc0_5OB-QLPpTE7KhSEUAW8qyzg",
  authDomain: "msfs-1eeed.firebaseapp.com",
  projectId: "msfs-1eeed",
  storageBucket: "msfs-1eeed.appspot.com",
  messagingSenderId: "953746578457",
  appId: "1:953746578457:web:df91b27ab14884c94dde88",
  measurementId: "G-M0DTKY5QPQ"
};

console.log("app.js started");
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

var signInBtn = document.getElementById("sign-in-btn");
var signOutBtn = document.getElementById("sign-out-btn");
var userInfo = document.getElementById("user-info");
var adminPanel = document.getElementById("admin-panel");
var routeStatus = document.getElementById("route-status");
var isAdmin = false;

// Harita
var map = L.map("map", { worldCopyJump: true }).setView([41.015137, 28.97953], 4);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap katkıcıları"
}).addTo(map);

// Giriş / Çıkış
signInBtn.addEventListener("click", async function () {
  var provider = new firebase.auth.GoogleAuthProvider();
  await auth.signInWithPopup(provider);
});

signOutBtn.addEventListener("click", async function () {
  await auth.signOut();
});

auth.onAuthStateChanged(function (user) {
  if (user) {
    console.log("UID (Rules'a koy):", user.uid);
    if (userInfo) userInfo.textContent = "Giriş: " + (user.displayName || user.email);
    if (signInBtn) signInBtn.classList.add("hidden");
    if (signOutBtn) signOutBtn.classList.remove("hidden");
    isAdmin = true;
    if (adminPanel) adminPanel.classList.remove("hidden");
  } else {
    if (userInfo) userInfo.textContent = "";
    if (signInBtn) signInBtn.classList.remove("hidden");
    if (signOutBtn) signOutBtn.classList.add("hidden");
    isAdmin = false;
    if (adminPanel) adminPanel.classList.add("hidden");
  }
});
