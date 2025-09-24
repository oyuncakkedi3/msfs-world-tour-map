// Firebase configini kendi projenle değiştir
const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME.firebaseapp.com",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME.appspot.com",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const signInBtn = document.getElementById("sign-in-btn");
const signOutBtn = document.getElementById("sign-out-btn");
const userInfo = document.getElementById("user-info");
const adminPanel = document.getElementById("admin-panel");
const routeStatus = document.getElementById("route-status");

let isAdmin = false;

const map = L.map('map', { worldCopyJump: true }).setView([41.015137, 28.97953], 4);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: "© OpenStreetMap katkıcıları" }).addTo(map);

const cityMarkers = new Map();
let routeLine = L.polyline([], { color: '#00B894', weight: 3 }).addTo(map);

function cityDoc(cityId) { return db.collection('visited').doc(cityId); }
function latLngId(latlng) { return `${latlng.lat.toFixed(5)}_${latlng.lng.toFixed(5)}`; }

db.collection('visited').onSnapshot(snapshot => {
  snapshot.docChanges().forEach(change => {
    const id = change.doc.id;
    const data = change.doc.data();
    if (change.type === 'removed') {
      if (cityMarkers.has(id)) { map.removeLayer(cityMarkers.get(id)); cityMarkers.delete(id); }
    } else {
      upsertMarker(id, data);
    }
  });
  refreshRoute();
  updateRouteStatus();
});

const metaDoc = db.collection('meta').doc('route');
db.collection('meta').doc('route').onSnapshot(doc => {
  refreshRoute(doc.data()?.order || []);
  updateRouteStatus();
});

async function refreshRoute(forceOrder) {
  let order = forceOrder;
  if (!order) {
    const meta = await metaDoc.get();
    order = meta.exists ? (meta.data().order || []) : [];
  }
  const coords = [];
  for (const id of order) {
    const m = cityMarkers.get(id);
    if (m) coords.push(m.getLatLng());
  }
  routeLine.setLatLngs(coords);
}

function updateRouteStatus() {
  const count = routeLine.getLatLngs().length;
  routeStatus.textContent = count > 0 ? `Rota noktası: ${count}` : '';
}

function buildIcon(color) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">
      <circle cx="12" cy="12" r="8" fill="${color}" stroke="#111" stroke-width="2" />
    </svg>
  `;
  return L.divIcon({ className: 'city-icon', html: svg, iconSize: [24, 24], iconAnchor: [12, 12] });
}

function upsertMarker(id, data) {
  const lat = data.lat; const lng = data.lng; const label = data.name || id;
  const visited = data.visited === true; const color = visited ? '#2ecc71' : '#e74c3c';
  if (cityMarkers.has(id)) {
    const m = cityMarkers.get(id);
    m.setLatLng([lat, lng]); m.setIcon(buildIcon(color)); m.bindTooltip(label, { permanent: false });
  } else {
    const marker = L.marker([lat, lng], { icon: buildIcon(color) }).bindTooltip(label, { permanent: false }).addTo(map);
    marker.on('click', () => { if (!isAdmin) return; toggleVisited(id); });
    cityMarkers.set(id, marker);
  }
}

map.on('click', async (e) => {
  if (!isAdmin) return;
  const id = latLngId(e.latlng);
  const name = prompt("Şehir/konum adı (örn: İstanbul, Paris...):", "");
  if (name === null) return;
  await cityDoc(id).set({ name: name && name.trim() ? name.trim() : id, lat: e.latlng.lat, lng: e.latlng.lng, visited: true, updatedAt: Date.now() }, { merge: true });
  await pushToRoute(id);
});

async function toggleVisited(id) {
  const doc = await cityDoc(id).get(); if (!doc.exists) return;
  const prev = doc.data().visited === true;
  await cityDoc(id).set({ visited: !prev, updatedAt: Date.now() }, { merge: true });
  if (!prev) { await pushToRoute(id); } else { await removeFromRoute(id); }
}

async function pushToRoute(id) {
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(metaDoc); const order = snap.exists ? (snap.data().order || []) : [];
    if (!order.includes(id)) { order.push(id); tx.set(metaDoc, { order }, { merge: true }); }
  });
}

async function removeFromRoute(id) {
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(metaDoc); const order = snap.exists ? (snap.data().order || []) : [];
    const next = order.filter(x => x !== id); tx.set(metaDoc, { order: next }, { merge: true });
  });
}

document.getElementById('undo-last').addEventListener('click', async () => {
  if (!isAdmin) return;
  const snap = await metaDoc.get(); const order = snap.exists ? (snap.data().order || []) : [];
  const last = order[order.length - 1]; if (!last) return; await removeFromRoute(last);
});

document.getElementById('clear-all').addEventListener('click', async () => {
  if (!isAdmin) return;
  if (!confirm("Tüm rota ve işaretleri temizle? (Geri alınamaz)")) return;
  const snap = await db.collection('visited').get(); const batch = db.batch(); snap.forEach(doc => batch.delete(doc.ref)); await batch.commit();
  await metaDoc.set({ order: [] });
});

signInBtn.addEventListener('click', async () => { const provider = new firebase.auth.GoogleAuthProvider(); await auth.signInWithPopup(provider); });
signOutBtn.addEventListener('click', async () => { await auth.signOut(); });

auth.onAuthStateChanged(async (user) => {
  if (user) {
    console.log("UID'in (Rules'a koy):", user.uid);
    userInfo.textContent = `Giriş: ${user.displayName || user.email}`;
    document.getElementById('sign-in-btn').classList.add('hidden');
    document.getElementById('sign-out-btn').classList.remove('hidden');
    isAdmin = true; adminPanel.classList.remove('hidden');
  } else {
    userInfo.textContent = '';
    document.getElementById('sign-in-btn').classList.remove('hidden');
    document.getElementById('sign-out-btn').classList.add('hidden');
    isAdmin = false; adminPanel.classList.add('hidden');
  }
});
