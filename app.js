// CDN + compat sürüm
const firebaseConfig = {
  apiKey: "AIzaSyAJkdKDJc0_5OB-QLPpTE7KhSEUAW8qyzg",
  authDomain: "msfs-1eeed.firebaseapp.com",
  projectId: "msfs-1eeed",
  storageBucket: "msfs-1eeed.appspot.com",
  messagingSenderId: "953746578457",
  appId: "1:953746578457:web:df91b27ab14884c94dde88",
  measurementId: "G-M0DTKY5QPQ"
};

console.log('app.js başladı');
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const signInBtn = document.getElementById("sign-in-btn");
const signOutBtn = document.getElementById("sign-out-btn");
const userInfo = document.getElementById("user-info");
const adminPanel = document.getElementById("admin-panel");
const routeStatus = document.getElementById("route-status");
let isAdmin = false;

// Harita
const map = L.map('map', { worldCopyJump: true }).setView([41.015137, 28.97953], 4);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: "© OpenStreetMap katkıcıları" }).addTo(map);

// Marker/rota temel hali (çalışması için Firestore kuralları şart)
const cityMarkers = new Map();
let routeLine = L.polyline([], { color: '#00B894', weight: 3 }).addTo(map);
function buildIcon(color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="12" cy="12" r="8" fill="${color}" stroke="#111" stroke-width="2"/></svg>`;
  return L.divIcon({ className: 'city-icon', html: svg, iconSize: [24,24], iconAnchor: [12,12] });
}
function cityDoc(id){ return db.collection('visited').doc(id); }
const metaDoc = db.collection('meta').doc('route');

db.collection('visited').onSnapshot(snap=>{
  snap.docChanges().forEach(ch=>{
    const id = ch.doc.id, d = ch.doc.data();
    if(ch.type==='removed'){ const m=cityMarkers.get(id); if(m){ map.removeLayer(m); cityMarkers.delete(id);} }
    else {
      const lat=d.lat,lng=d.lng,label=d.name||id, visited=d.visited===true, color=visited?'#2ecc71':'#e74c3c';
      if(cityMarkers.has(id)){
        const m=cityMarkers.get(id); m.setLatLng([lat,lng]); m.setIcon(buildIcon(color)); m.bindTooltip(label);
      } else {
        const m=L.marker([lat,lng],{icon:buildIcon(color)}).bindTooltip(label).addTo(map);
        m.on('click', ()=>{ if(!isAdmin) return; toggleVisited(id); });
        cityMarkers.set(id,m);
      }
    }
  });
  refreshRoute();
});
metaDoc.onSnapshot(doc=>{ refreshRoute(doc.data()?.order||[]); });

async function refreshRoute(forceOrder){
  let order=forceOrder; if(!order){ const m=await metaDoc.get(); order=m.exists?(m.data().order||[]):[]; }
  const pts=[]; for(const id of order){ const m=cityMarkers.get(id); if(m) pts.push(m.getLatLng()); }
  routeLine.setLatLngs(pts);
}

async function toggleVisited(id){
  const doc=await cityDoc(id).get(); if(!doc.exists) return;
  const prev=doc.data().visited===true;
  await cityDoc(id).set({visited:!prev, updatedAt:Date.now()},{merge:true});
  if(!prev) await pushToRoute(id); else await removeFromRoute(id);
}

async function pushToRoute(id){
  await db.runTransaction(async tx=>{
    const s=await tx.get(metaDoc); const order=s.exists?(s.data().order||[]):[];
    if(!order.includes(id)){ order.push(id); tx.set(metaDoc,{order},{merge:true}); }
  });
}
async function removeFromRoute(id){
  await db.runTransaction(async tx=>{
    const s=await tx.get(metaDoc); const order=s.exists?(s.data().order||[]):[];
    tx.set(metaDoc,{order:order.filter(x=>x!==id)},{merge:true});
  });
}

document.getElementById('undo-last')?.addEventListener('click', async ()=>{
  if(!isAdmin) return; const s=await metaDoc.get(); const order=s.exists?(s.data().order||[]):[]; const last=order[order.length-1]; if(last) await removeFromRoute(last);
});
document.getElementById('clear-all')?.addEventListener('click', async ()=>{
  if(!isAdmin) return; if(!confirm('Tüm rota ve işaretleri temizle?')) return;
  const s=await db.collection('visited').get(); const b=db.batch(); s.forEach(d=>b.delete(d.ref)); await b.commit(); await metaDoc.set({order:[]});
});

// Auth
signInBtn.addEventListener('click', async ()=>{ const provider=new firebase.auth.GoogleAuthProvider(); await auth.signInWithPopup(provider); });
signOutBtn.addEventListener('click', async ()=>{ await auth.signOut(); });
auth.onAuthStateChanged(user=>{
  if(user){
    console.log(\"UID'in (Rules’a koy):\", user.uid);
    userInfo.textContent = `Giriş: ${user.displayName || user.email}`;
    signInBtn.classList.add('hidden'); signOutBtn.classList.remove('hidden'); isAdmin=true; adminPanel?.classList.remove('hidden');
  } else {
    userInfo.textContent=''; signInBtn.classList.remove('hidden'); signOutBtn.classList.add('hidden'); isAdmin=false; adminPanel?.classList.add('hidden');
  }
});
