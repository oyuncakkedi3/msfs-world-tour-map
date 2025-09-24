// Firebase (compat) yapılandırma
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

// Sadece sahibin yazabilmesi için UID
const OWNER_UID = "RBnsLQ1odEXiY9JsIA9VdnyiJi03";

// UI elemanları
const signInBtn = document.getElementById("sign-in-btn");
const signOutBtn = document.getElementById("sign-out-btn");
const userInfo = document.getElementById("user-info");
const adminPanel = document.getElementById("admin-panel");
const routeStatus = document.getElementById("route-status");
let isAdmin = false;

// Giriş / Çıkış
signInBtn.addEventListener("click", async () => {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
  } catch (e) {
    console.error("signIn error:", e);
    alert("Giriş hatası: " + (e && e.message ? e.message : e));
  }
});

signOutBtn.addEventListener("click", async () => {
  await auth.signOut();
});

auth.onAuthStateChanged((user) => {
  if (user) {
    const isOwner = user.uid === OWNER_UID;
    console.log("UID (Rules'a koy):", user.uid);
    if (userInfo) userInfo.textContent = `Giriş: ${user.displayName || user.email}`;
    if (signInBtn) signInBtn.classList.add("hidden");
    if (signOutBtn) signOutBtn.classList.remove("hidden");
    isAdmin = isOwner; // yalnızca OWNER admin
    if (adminPanel) {
      if (isOwner) adminPanel.classList.remove("hidden");
      else adminPanel.classList.add("hidden");
    }
  } else {
    if (userInfo) userInfo.textContent = "";
    if (signInBtn) signInBtn.classList.remove("hidden");
    if (signOutBtn) signOutBtn.classList.add("hidden");
    isAdmin = false;
    if (adminPanel) adminPanel.classList.add("hidden");
  }
});

// Harita
var map = L.map("map", { worldCopyJump: true }).setView([41.015137, 28.97953], 4);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap katkıcıları"
}).addTo(map);

// Şehir/rota
var cityMarkers = new Map();
var routeLine = L.polyline([], { color: "#00B894", weight: 3 }).addTo(map);
var metaDoc = db.collection("meta").doc("route");

function cityDoc(id) { return db.collection("visited").doc(id); }
function latLngId(latlng) { return latlng.lat.toFixed(5) + "_" + latlng.lng.toFixed(5); }

function buildIcon(color) {
  var svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">' +
    '<circle cx="12" cy="12" r="8" fill="' + color + '" stroke="#111" stroke-width="2" />' +
    "</svg>";
  return L.divIcon({ className: "city-icon", html: svg, iconSize: [24, 24], iconAnchor: [12, 12] });
}

function upsertMarker(id, data) {
  var lat = data.lat, lng = data.lng, label = data.name || id;
  var visited = data.visited === true, color = visited ? "#2ecc71" : "#e74c3c";
  if (cityMarkers.has(id)) {
    var m = cityMarkers.get(id);
    m.setLatLng([lat, lng]);
    m.setIcon(buildIcon(color));
    m.bindTooltip(label);
  } else {
    var marker = L.marker([lat, lng], { icon: buildIcon(color) }).bindTooltip(label).addTo(map);
    marker.on("click", function () { if (!isAdmin) return; toggleVisited(id); });
    cityMarkers.set(id, marker);
  }
}

function drawRoute(order) {
  var pts = [];
  for (var i = 0; i < order.length; i++) {
    var m = cityMarkers.get(order[i]);
    if (m) pts.push(m.getLatLng());
  }
  routeLine.setLatLngs(pts);
  if (routeStatus) routeStatus.textContent = pts.length ? ("Rota noktası: " + pts.length) : "";
}

function refreshRoute() {
  metaDoc.get().then(function (snap) {
    var order = snap.exists ? (snap.data().order || []) : [];
    drawRoute(order);
  });
}

// Firestore canlı dinleme
db.collection("visited").onSnapshot(function (snap) {
  snap.docChanges().forEach(function (ch) {
    var id = ch.doc.id, d = ch.doc.data();
    if (ch.type === "removed") {
      if (cityMarkers.has(id)) { map.removeLayer(cityMarkers.get(id)); cityMarkers.delete(id); }
    } else {
      upsertMarker(id, d);
    }
  });
  refreshRoute();
});

metaDoc.onSnapshot(function (doc) {
  var data = doc && doc.data ? doc.data() : null;
  var order = data && data.order ? data.order : [];
  drawRoute(order);
});

// Admin: haritaya tıklayınca nokta ekle
map.on("click", function (e) {
  if (!isAdmin) return;
  var id = latLngId(e.latlng);
  var name = prompt("Şehir/konum adı:", "");
  if (name === null) return;
  cityDoc(id).set({
    name: (name && name.trim()) ? name.trim() : id,
    lat: e.latlng.lat,
    lng: e.latlng.lng,
    visited: true,
    updatedAt: Date.now()
  }, { merge: true }).then(function () {
    pushToRoute(id);
  }).catch(function (err) {
    console.error("write error:", err);
    alert("Yazma hatası: " + (err && err.message ? err.message : err));
  });
});

// Ziyaret değiştir
function toggleVisited(id) {
  cityDoc(id).get().then(function (doc) {
    if (!doc.exists) return;
    var prev = doc.data().visited === true;
    cityDoc(id).set({ visited: !prev, updatedAt: Date.now() }, { merge: true })
      .then(function () { if (!prev) pushToRoute(id); else removeFromRoute(id); })
      .catch(function (err) { console.error("toggle error:", err); });
  });
}

// Rota ekle/çıkar
function pushToRoute(id) {
  return db.runTransaction(function (tx) {
    return tx.get(metaDoc).then(function (snap) {
      var order = snap.exists ? (snap.data().order || []) : [];
      if (order.indexOf(id) === -1) order.push(id);
      tx.set(metaDoc, { order: order }, { merge: true });
    });
  });
}

function removeFromRoute(id) {
  return db.runTransaction(function (tx) {
    return tx.get(metaDoc).then(function (snap) {
      var order = snap.exists ? (snap.data().order || []) : [];
      var next = order.filter(function (x) { return x !== id; });
      tx.set(metaDoc, { order: next }, { merge: true });
    });
  });
}

// Admin panel butonları (opsiyonel)
var undoBtn = document.getElementById("undo-last");
if (undoBtn) undoBtn.addEventListener("click", function () {
  if (!isAdmin) return;
  metaDoc.get().then(function (snap) {
    var order = snap.exists ? (snap.data().order || []) : [];
    var last = order[order.length - 1];
    if (last) removeFromRoute(last);
  });
});

var clearBtn = document.getElementById("clear-all");
if (clearBtn) clearBtn.addEventListener("click", function () {
  if (!isAdmin) return;
  if (!confirm("Tüm rota ve işaretleri temizle? (Geri alınamaz)")) return;
  db.collection("visited").get().then(function (s) {
    var b = db.batch();
    s.forEach(function (d) { b.delete(d.ref); });
    return b.commit();
  }).then(function () {
    return metaDoc.set({ order: [] });
  });
});
