console.log('app.js yüklendi (test sürümü)');

const map = L.map('map', { worldCopyJump: true }).setView([41.015137, 28.97953], 4);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap katkıcıları'
}).addTo(map);
