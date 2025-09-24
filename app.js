console.log('app.js başladı');
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
const firebaseConfig = {
  apiKey: "AIzaSyAJkdKDJc0_5OB-QLPpTE7KhSEUAW8qyzg",
  authDomain: "msfs-1eeed.firebaseapp.com",
  projectId: "msfs-1eeed",
  storageBucket: "msfs-1eeed.firebasestorage.app",
  messagingSenderId: "953746578457",
  appId: "1:953746578457:web:df91b27ab14884c94dde88",
  measurementId: "G-M0DTKY5QPQ"
};
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const signInBtn = document.getElementById("sign-in-btn");
const signOutBtn = document.getElementById("sign-out-btn");
const userInfo = document.getElementById("user-info");
const adminPanel = document.getElementById("admin-panel");
let isAdmin = false;

signInBtn.addEventListener('click', async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  await auth.signInWithPopup(provider);
});

signOutBtn.addEventListener('click', async () => {
  await auth.signOut();
});

auth.onAuthStateChanged((user) => {
  if (user) {
    console.log("UID'in (Rules’a koy):", user.uid);
    userInfo.textContent = `Giriş: ${user.displayName || user.email}`;
    signInBtn.classList.add('hidden');
    signOutBtn.classList.remove('hidden');
    isAdmin = true;
    adminPanel?.classList.remove('hidden');
  } else {
    userInfo.textContent = '';
    signInBtn.classList.remove('hidden');
    signOutBtn.classList.add('hidden');
    isAdmin = false;
    adminPanel?.classList.add('hidden');
  }
});  

