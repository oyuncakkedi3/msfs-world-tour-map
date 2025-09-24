console.log('app.js minimal başladı');

var map = L.map('map', { worldCopyJump: true }).setView([41.015137, 28.97953], 4);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap katkıcıları'
}).addTo(map);

// Geçici: butonların tıklandığını görelim
document.getElementById('sign-in-btn').addEventListener('click', function () {
  console.log('Giriş Yap tıklandı (test)');
});
document.getElementById('sign-out-btn').addEventListener('click', function () {
  console.log('Çıkış tıklandı (test)');
});
