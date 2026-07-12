function renderQRToCanvas(text, size) {
  var qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  var canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  var ctx = canvas.getContext('2d');
  var count = qr.getModuleCount();
  var cellSize = size / count;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#191714';
  for (var row = 0; row < count; row++) {
    for (var col = 0; col < count; col++) {
      if (qr.isDark(row, col)) {
        ctx.fillRect(Math.floor(col * cellSize), Math.floor(row * cellSize), Math.ceil(cellSize), Math.ceil(cellSize));
      }
    }
  }
  return canvas;
}

// ══════════════════════════════════════════════════════
// Stamp verification system
// ══════════════════════════════════════════════════════
var STAMP_SECRET = 'dgm2025zitara';
var STATION_NAMES = ['Bendicion', 'Huellas', 'Adiestramiento', 'Agilidad', 'Mercadito', 'Adopcion'];

function stampHash(folio, stand) {
  var s = folio + '-' + stand + '-' + STAMP_SECRET;
  var h = 0;
  for (var i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h = h & h;
  }
  return Math.abs(h).toString(36).toUpperCase().padStart(4, '0').slice(0, 4);
}

function makeStampCode(folio, stand) {
  return 'S' + stand + '-' + stampHash(folio, stand);
}

function verifyStampCode(folio, code) {
  code = code.trim().toUpperCase();
  for (var i = 1; i <= 6; i++) {
    if (code === makeStampCode(folio, i)) return i;
  }
  return 0;
}

// ══════════════════════════════════════════════════════
// Dog drawing engine
// ══════════════════════════════════════════════════════
function drawDog(canvas, type) {
  var ctx = canvas.getContext('2d');
  var w = canvas.width, h = canvas.height;
  var cx = w / 2, cy = h / 2;
  var s = w / 160;
  ctx.clearRect(0, 0, w, h);
  var dogs = {
    golden: { body: '#D4A54A', dark: '#B8893A', nose: '#3D2B1A', tongue: '#E06B6B', ear: '#C49340' },
    husky: { body: '#B8C4D0', dark: '#6B7B8D', nose: '#2A2A2A', tongue: '#D4696E', ear: '#8A9AAA' },
    pug: { body: '#D4B896', dark: '#A08060', nose: '#2A2A2A', tongue: '#D47878', ear: '#B89A78' },
    dalmatian: { body: '#F0EDE8', dark: '#2A2A2A', nose: '#2A2A2A', tongue: '#D47878', ear: '#E0DCD3' },
    corgi: { body: '#E8A840', dark: '#CC8E2E', nose: '#2A2A2A', tongue: '#E06B6B', ear: '#D49530' },
    beagle: { body: '#C4935A', dark: '#8B6838', nose: '#2A2A2A', tongue: '#D47878', ear: '#7A5028' },
    schnauzer: { body: '#8A8A8A', dark: '#5A5A5A', nose: '#2A2A2A', tongue: '#D47878', ear: '#6A6A6A' },
    chihuahua: { body: '#D4A870', dark: '#B88C52', nose: '#2A2A2A', tongue: '#E06B6B', ear: '#C49660' },
    labrador: { body: '#D4A54A', dark: '#B08030', nose: '#3D2B1A', tongue: '#D47878', ear: '#C09038' },
  };
  var c = dogs[type] || dogs.golden;
  ctx.fillStyle = c.body;
  ctx.beginPath(); ctx.ellipse(cx, cy + 20*s, 40*s, 35*s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx, cy - 15*s, 32*s, 30*s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c.ear;
  if (type === 'corgi' || type === 'chihuahua') {
    ctx.beginPath(); ctx.moveTo(cx - 25*s, cy - 35*s); ctx.lineTo(cx - 38*s, cy - 60*s); ctx.lineTo(cx - 8*s, cy - 40*s); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx + 25*s, cy - 35*s); ctx.lineTo(cx + 38*s, cy - 60*s); ctx.lineTo(cx + 8*s, cy - 40*s); ctx.fill();
  } else if (type === 'husky') {
    ctx.beginPath(); ctx.moveTo(cx - 22*s, cy - 32*s); ctx.lineTo(cx - 34*s, cy - 58*s); ctx.lineTo(cx - 6*s, cy - 36*s); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx + 22*s, cy - 32*s); ctx.lineTo(cx + 34*s, cy - 58*s); ctx.lineTo(cx + 6*s, cy - 36*s); ctx.fill();
  } else {
    ctx.beginPath(); ctx.ellipse(cx - 28*s, cy - 8*s, 12*s, 22*s, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 28*s, cy - 8*s, 12*s, 22*s, 0.3, 0, Math.PI * 2); ctx.fill();
  }
  if (type === 'husky') { ctx.fillStyle = '#F0EDE8'; ctx.beginPath(); ctx.ellipse(cx, cy - 8*s, 18*s, 22*s, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = type === 'husky' ? '#F0EDE8' : (type === 'dalmatian' ? '#F0EDE8' : '#F0E0C8');
  ctx.beginPath(); ctx.ellipse(cx, cy - 2*s, 16*s, 12*s, 0, 0, Math.PI * 2); ctx.fill();
  if (type === 'pug') { ctx.fillStyle = c.dark; ctx.beginPath(); ctx.ellipse(cx, cy - 5*s, 20*s, 18*s, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#F0E0C8'; ctx.beginPath(); ctx.ellipse(cx, cy, 14*s, 10*s, 0, 0, Math.PI * 2); ctx.fill(); }
  if (type === 'dalmatian') { ctx.fillStyle = c.dark; [[cx-15*s,cy-28*s,5*s],[cx+12*s,cy-25*s,4*s],[cx-8*s,cy+25*s,6*s],[cx+18*s,cy+15*s,4*s],[cx+5*s,cy-35*s,3*s]].forEach(function(p){ctx.beginPath();ctx.arc(p[0],p[1],p[2],0,Math.PI*2);ctx.fill();}); }
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.ellipse(cx - 12*s, cy - 20*s, 7*s, 7*s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + 12*s, cy - 20*s, 7*s, 7*s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2A1A0A';
  ctx.beginPath(); ctx.arc(cx - 11*s, cy - 20*s, 4*s, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 13*s, cy - 20*s, 4*s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(cx - 9*s, cy - 22*s, 1.5*s, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 15*s, cy - 22*s, 1.5*s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c.nose;
  ctx.beginPath(); ctx.moveTo(cx, cy - 6*s); ctx.lineTo(cx - 5*s, cy - 1*s); ctx.lineTo(cx + 5*s, cy - 1*s); ctx.closePath(); ctx.arc(cx, cy - 3*s, 5*s, 0, Math.PI); ctx.fill();
  ctx.strokeStyle = c.dark; ctx.lineWidth = 1.5*s; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx, cy + 1*s); ctx.lineTo(cx - 8*s, cy + 8*s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy + 1*s); ctx.lineTo(cx + 8*s, cy + 8*s); ctx.stroke();
  ctx.fillStyle = c.tongue;
  ctx.beginPath(); ctx.ellipse(cx + 3*s, cy + 10*s, 5*s, 7*s, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c.body;
  ctx.beginPath(); ctx.ellipse(cx - 20*s, cy + 52*s, 10*s, 6*s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + 20*s, cy + 52*s, 10*s, 6*s, 0, 0, Math.PI * 2); ctx.fill();
}

document.querySelectorAll('.dog-canvas').forEach(function(c) { drawDog(c, c.dataset.dog); });

// ══════════════════════════════════════════════════════
// Real dog photos from Dog CEO API
// ══════════════════════════════════════════════════════
function loadDogPhoto(imgEl, breed) {
  fetch('https://dog.ceo/api/breed/' + breed + '/images/random')
    .then(function(r) { return r.json(); })
    .then(function(d) { if (d.status === 'success') { imgEl.src = d.message; } })
    .catch(function() {});
}

function createDogImg(breed) {
  var img = document.createElement('img');
  img.alt = breed.split('/').pop();
  img.loading = 'lazy';
  img.style.background = '#E0DCD3';
  loadDogPhoto(img, breed);
  return img;
}

var heroBreeds = ['retriever/golden', 'husky', 'pug', 'dalmatian', 'samoyed'];
var heroDogs = document.getElementById('heroDogs');
heroBreeds.forEach(function(b) { heroDogs.appendChild(createDogImg(b)); });

var midBreeds = ['corgi/cardigan', 'beagle', 'labrador', 'schnauzer/miniature', 'germanshepherd', 'shibainu'];
var midDogs = document.getElementById('midDogs');
midBreeds.forEach(function(b) { midDogs.appendChild(createDogImg(b)); });

var regBreeds = ['chihuahua', 'shiba', 'poodle/standard', 'papillon'];
var regDogs = document.getElementById('registroDogs');
regBreeds.forEach(function(b) { regDogs.appendChild(createDogImg(b)); });

document.querySelectorAll('.dog-photo').forEach(function(img) {
  if (img.dataset.breed) loadDogPhoto(img, img.dataset.breed);
});

// ══════════════════════════════════════════════════════
// Nav
// ══════════════════════════════════════════════════════
var navEl = document.getElementById('nav');
var heroEl = document.getElementById('hero');
new IntersectionObserver(function(entries) { navEl.classList.toggle('visible', !entries[0].isIntersecting); }, { threshold: 0.1 }).observe(heroEl);

// ══════════════════════════════════════════════════════
// Hero paw prints
// ══════════════════════════════════════════════════════
var hCanvas = document.getElementById('heroCanvas');
var hCtx = hCanvas.getContext('2d');
var pawsList = [];
function hResize() { hCanvas.width = hCanvas.offsetWidth * devicePixelRatio; hCanvas.height = hCanvas.offsetHeight * devicePixelRatio; hCtx.scale(devicePixelRatio, devicePixelRatio); }
hResize(); window.addEventListener('resize', hResize);
function drawPaw(x, y, sz, rot, a) {
  hCtx.save(); hCtx.translate(x, y); hCtx.rotate(rot); hCtx.globalAlpha = a; hCtx.fillStyle = '#D93B1E';
  hCtx.beginPath(); hCtx.ellipse(0, sz*0.3, sz*0.45, sz*0.35, 0, 0, Math.PI*2); hCtx.fill();
  [[-sz*0.35,-sz*0.15,sz*0.18],[-sz*0.12,-sz*0.35,sz*0.16],[sz*0.12,-sz*0.35,sz*0.16],[sz*0.35,-sz*0.15,sz*0.18]].forEach(function(p){
    hCtx.beginPath(); hCtx.ellipse(p[0], p[1], p[2], p[2]*1.15, 0, 0, Math.PI*2); hCtx.fill();
  });
  hCtx.restore();
}
(function initPaws(){
  var w=hCanvas.offsetWidth, h=hCanvas.offsetHeight;
  for(var i=0;i<Math.floor((w*h)/18000);i++) pawsList.push({x:Math.random()*w,y:Math.random()*h,size:12+Math.random()*18,rotation:Math.random()*Math.PI*2,alpha:0.15+Math.random()*0.4,drift:0.15+Math.random()*0.3,phase:Math.random()*Math.PI*2});
})();
var t=0;
function animPaws(){
  var w=hCanvas.offsetWidth, h=hCanvas.offsetHeight; hCtx.clearRect(0,0,w,h); t+=0.003;
  pawsList.forEach(function(p){drawPaw(p.x+Math.sin(t+p.phase)*p.drift*8,p.y+Math.cos(t*0.7+p.phase)*p.drift*5,p.size,p.rotation,p.alpha*(0.5+0.5*Math.sin(t*0.5+p.phase)));});
  requestAnimationFrame(animPaws);
}
if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches) animPaws();
else pawsList.forEach(function(p){drawPaw(p.x,p.y,p.size,p.rotation,p.alpha*0.5);});

// ══════════════════════════════════════════════════════
// Passport Generator
// ══════════════════════════════════════════════════════
function drawPawOnCtx(ctx, x, y, sz, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.beginPath(); ctx.ellipse(0, sz*0.3, sz*0.45, sz*0.35, 0, 0, Math.PI*2); ctx.fill();
  [[-sz*0.35,-sz*0.15,sz*0.18],[-sz*0.12,-sz*0.35,sz*0.16],[sz*0.12,-sz*0.35,sz*0.16],[sz*0.35,-sz*0.15,sz*0.18]].forEach(function(p){
    ctx.beginPath(); ctx.ellipse(p[0], p[1], p[2], p[2]*1.15, 0, 0, Math.PI*2); ctx.fill();
  });
  ctx.restore();
}

function generatePassport(data) {
  var c = document.getElementById('passportCanvas');
  var ctx = c.getContext('2d');
  var W = 800, H = 1100;
  c.width = W; c.height = H;
  ctx.fillStyle = '#F7F3EB'; ctx.beginPath(); ctx.roundRect(0, 0, W, H, 20); ctx.fill();
  ctx.strokeStyle = '#D4C9B5'; ctx.lineWidth = 3; ctx.setLineDash([8, 4]);
  ctx.beginPath(); ctx.roundRect(20, 20, W-40, H-40, 16); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#D93B1E'; ctx.beginPath(); ctx.roundRect(40, 40, W-80, 100, [12, 12, 0, 0]); ctx.fill();
  ctx.fillStyle = '#FFFFFF'; ctx.font = '900 36px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('PASAPORTE PERRUNO', W/2, 105);
  ctx.fillStyle = '#8A8378'; ctx.font = '700 16px system-ui, sans-serif';
  ctx.fillText('DOGMINGO · 26 JULIO 2025', W/2, 175);
  var dogCanvas = document.createElement('canvas'); dogCanvas.width = 200; dogCanvas.height = 200;
  drawDog(dogCanvas, 'golden'); ctx.drawImage(dogCanvas, W/2-60, 195, 120, 120);
  ctx.fillStyle = '#191714'; ctx.font = '800 28px system-ui, sans-serif';
  ctx.fillText(data.nombre + ' ' + data.apellido, W/2, 355);
  if (data.nombrePerro) { ctx.fillStyle = '#5C584F'; ctx.font = '600 20px system-ui, sans-serif'; ctx.fillText('y su perro ' + data.nombrePerro, W/2, 385); }
  ctx.fillStyle = '#2D6A3F'; ctx.font = '700 14px system-ui, sans-serif'; ctx.fillText('Folio: ' + data.id, W/2, 420);
  ctx.strokeStyle = '#D4C9B5'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(80, 445); ctx.lineTo(W-80, 445); ctx.stroke();
  ctx.fillStyle = '#191714'; ctx.font = '800 22px system-ui, sans-serif'; ctx.fillText('SELLOS DE ESTACIONES', W/2, 485);
  ctx.fillStyle = '#8A8378'; ctx.font = '400 14px system-ui, sans-serif'; ctx.fillText('Visita cada estación para obtener tu sello', W/2, 510);
  var stations = ['Bendición\nCanina', 'Huellas\ndel Alma', 'Exhibición\nAdiestramiento', 'Circuito\nAgilidad', 'Mercadito\nPet-Friendly', 'Pasarela\nAdopción'];
  var cols = 3, rows = 2, slotSize = 140, gapX = 40, gapY = 30;
  var gridW = cols * slotSize + (cols-1) * gapX;
  var startX = (W - gridW) / 2, startY = 540;
  var stamps = getUserStamps();
  stations.forEach(function(name, i) {
    var col = i % cols, row = Math.floor(i / cols);
    var x = startX + col * (slotSize + gapX) + slotSize/2;
    var y = startY + row * (slotSize + gapY) + slotSize/2;
    var isStamped = stamps.indexOf(i + 1) >= 0;
    if (isStamped) {
      ctx.fillStyle = 'rgba(45,106,63,0.1)'; ctx.beginPath(); ctx.arc(x, y, slotSize/2 - 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#2D6A3F'; ctx.lineWidth = 3; ctx.setLineDash([]); ctx.beginPath(); ctx.arc(x, y, slotSize/2 - 5, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#2D6A3F'; ctx.font = '800 36px system-ui, sans-serif'; ctx.fillText('✓', x, y + 12);
    } else {
      ctx.strokeStyle = '#C9BDA8'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.arc(x, y, slotSize/2 - 5, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.fillStyle = isStamped ? '#2D6A3F' : '#B5A998'; ctx.font = '600 12px system-ui, sans-serif'; ctx.textAlign = 'center';
    var lines = name.split('\n');
    lines.forEach(function(line, li) { ctx.fillText(line, x, y + (isStamped ? 30 : 0) + (li - (lines.length-1)/2) * 16); });
    ctx.fillStyle = '#D4C9B5'; ctx.font = '800 11px system-ui, sans-serif'; ctx.fillText((i+1).toString(), x, y + slotSize/2 - 15);
  });
  var bottomY = startY + rows * (slotSize + gapY) + 20;
  ctx.fillStyle = '#D93B1E'; ctx.beginPath(); ctx.roundRect(40, bottomY, W-80, 80, [0, 0, 12, 12]); ctx.fill();
  ctx.fillStyle = '#FFFFFF'; ctx.font = '700 16px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('¡Completa los 6 sellos y reclama tu premio!', W/2, bottomY + 35);
  ctx.font = '400 13px system-ui, sans-serif';
  ctx.fillText('Presenta tu pasaporte en el stand principal de Dogmingo', W/2, bottomY + 58);
  ctx.globalAlpha = 0.04; ctx.fillStyle = '#D93B1E';
  for (var i = 0; i < 8; i++) { drawPawOnCtx(ctx, 80 + Math.random() * (W-160), 200 + Math.random() * (H-300), 20 + Math.random() * 15, Math.random() * Math.PI * 2); }
  ctx.globalAlpha = 1;
}

// ══════════════════════════════════════════════════════
// Stamp tracking (user side)
// ══════════════════════════════════════════════════════
function getUserData() { try { return JSON.parse(localStorage.getItem('dogmingo_user') || 'null'); } catch(e) { return null; } }
function getUserStamps() { try { return JSON.parse(localStorage.getItem('dogmingo_stamps') || '[]'); } catch(e) { return []; } }
function saveStamp(standNum) {
  var stamps = getUserStamps();
  if (stamps.indexOf(standNum) < 0) { stamps.push(standNum); localStorage.setItem('dogmingo_stamps', JSON.stringify(stamps)); }
  return stamps;
}

function renderStampGrid() {
  var grid = document.getElementById('stampGrid');
  if (!grid) return;
  var stamps = getUserStamps();
  grid.innerHTML = '';
  STATION_NAMES.forEach(function(name, i) {
    var slot = document.createElement('div');
    slot.className = 'stamp-tracker-slot' + (stamps.indexOf(i + 1) >= 0 ? ' stamped' : '');
    var span = document.createElement('span');
    span.textContent = name;
    slot.appendChild(span);
    grid.appendChild(slot);
  });
  var complete = document.getElementById('stampComplete');
  if (complete) complete.classList.toggle('visible', stamps.length >= 6);
}

function addStampCode() {
  var input = document.getElementById('stampCodeInput');
  var msg = document.getElementById('stampMsg');
  var userData = getUserData();
  if (!userData) { msg.className = 'stamp-msg error'; msg.textContent = 'Primero debes registrarte.'; return; }
  var code = input.value.trim().toUpperCase();
  if (!code) { msg.className = 'stamp-msg error'; msg.textContent = 'Ingresa un código de sello.'; return; }
  var standNum = verifyStampCode(userData.id, code);
  if (standNum === 0) { msg.className = 'stamp-msg error'; msg.textContent = 'Código inválido. Verifica e intenta de nuevo.'; return; }
  var stamps = getUserStamps();
  if (stamps.indexOf(standNum) >= 0) { msg.className = 'stamp-msg error'; msg.textContent = 'Ya tienes el sello de ' + STATION_NAMES[standNum - 1] + '.'; return; }
  saveStamp(standNum);
  msg.className = 'stamp-msg success';
  msg.textContent = '¡Sello ' + standNum + ' (' + STATION_NAMES[standNum - 1] + ') agregado!';
  input.value = '';
  renderStampGrid();
  generatePassport(userData);
}

// ══════════════════════════════════════════════════════
// Registration
// ══════════════════════════════════════════════════════
var form = document.getElementById('registroForm');
var submitBtn = document.getElementById('submitBtn');
var formSuccess = document.getElementById('formSuccess');
var regCount = document.getElementById('regCount');
var traePerro = document.getElementById('traePerro');
var dogNameField = document.getElementById('dogNameField');

function getRegs() { try { return JSON.parse(localStorage.getItem('dogmingo_registros') || '[]'); } catch(e) { return []; } }
function updateCounter() {
  regCount.textContent = getRegs().length;
  fetch('/api/registros').then(function(r) { return r.json(); }).then(function(d) {
    if (d.count > 0) regCount.textContent = d.count;
  }).catch(function() {});
}

function syncRegistration(data) {
  fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).catch(function() {});
}

(function restoreSession() {
  updateCounter();
  var userData = getUserData();
  if (userData) {
    form.style.display = 'none';
    formSuccess.classList.add('visible');
    document.getElementById('folioDisplay').textContent = userData.id;
    var qrCanvas = renderQRToCanvas(userData.id, 256);
    var qrArea = document.getElementById('qrArea');
    qrArea.innerHTML = '';
    qrArea.appendChild(qrCanvas);
    var p = document.createElement('p');
    p.textContent = 'Muestra este QR en cada stand';
    qrArea.appendChild(p);
    renderStampGrid();
    generatePassport(userData);
  }
})();

traePerro.addEventListener('change', function() {
  dogNameField.classList.toggle('visible', traePerro.checked);
  if (!traePerro.checked) document.getElementById('nombrePerro').value = '';
});

function validateField(field) {
  var group = field.closest('.form-group');
  if (!group) return true;
  var valid = true;
  if (field.required && !field.value.trim()) valid = false;
  if (field.type === 'email' && field.value.trim()) valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim());
  if (field.type === 'tel' && field.value.trim()) valid = field.value.replace(/\D/g, '').length >= 7;
  group.classList.toggle('has-error', !valid);
  return valid;
}

form.querySelectorAll('.form-input').forEach(function(input) {
  input.addEventListener('blur', function() { validateField(input); });
  input.addEventListener('input', function() { var g = input.closest('.form-group'); if (g && g.classList.contains('has-error')) validateField(input); });
});

form.addEventListener('submit', function(e) {
  e.preventDefault();
  var allValid = true;
  form.querySelectorAll('.form-input[required]').forEach(function(f) { if (!validateField(f)) allValid = false; });
  if (!allValid) return;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Generando pasaporte...';
  setTimeout(function() {
    var data = {
      id: 'DGM-' + Date.now().toString(36).toUpperCase(),
      nombre: document.getElementById('nombre').value.trim(),
      apellido: document.getElementById('apellido').value.trim(),
      email: document.getElementById('email').value.trim(),
      telefono: document.getElementById('telefono').value.trim(),
      adultos: parseInt(document.getElementById('adultos').value),
      ninos: parseInt(document.getElementById('ninos').value),
      traePerro: traePerro.checked,
      nombrePerro: document.getElementById('nombrePerro').value.trim(),
      fecha: new Date().toISOString()
    };
    var regs = getRegs(); regs.push(data);
    localStorage.setItem('dogmingo_registros', JSON.stringify(regs));
    localStorage.setItem('dogmingo_user', JSON.stringify(data));
    localStorage.setItem('dogmingo_stamps', '[]');
    syncRegistration({
      folio: data.id, nombre: data.nombre, apellido: data.apellido,
      email: data.email, telefono: data.telefono, adultos: data.adultos,
      ninos: data.ninos, traePerro: data.traePerro, nombrePerro: data.nombrePerro
    });
    document.getElementById('folioDisplay').textContent = data.id;
    var qrCanvas = renderQRToCanvas(data.id, 256);
    var qrArea = document.getElementById('qrArea');
    qrArea.innerHTML = '';
    qrArea.appendChild(qrCanvas);
    var p = document.createElement('p');
    p.textContent = 'Muestra este QR en cada stand';
    qrArea.appendChild(p);
    generatePassport(data);
    renderStampGrid();
    form.style.display = 'none';
    formSuccess.classList.add('visible');
    updateCounter();
  }, 1000);
});

document.getElementById('downloadPassport').addEventListener('click', function() {
  var c = document.getElementById('passportCanvas');
  var link = document.createElement('a');
  link.download = 'pasaporte-perruno-dogmingo.png';
  link.href = c.toDataURL('image/png');
  link.click();
});

// ══════════════════════════════════════════════════════
// Stand Portal
// ══════════════════════════════════════════════════════
var selectedStand = 0;

function initStandSelect() {
  var container = document.getElementById('standSelect');
  STATION_NAMES.forEach(function(name, i) {
    var btn = document.createElement('button');
    btn.className = 'stand-btn';
    btn.innerHTML = 'Stand ' + (i + 1) + '<small>' + name + '</small>';
    btn.addEventListener('click', function() {
      selectedStand = i + 1;
      container.querySelectorAll('.stand-btn').forEach(function(b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      updateStandHistory();
    });
    container.appendChild(btn);
  });
}
initStandSelect();

function getStandStamps(standNum) {
  try { return JSON.parse(localStorage.getItem('dogmingo_stand_' + standNum) || '[]'); } catch(e) { return []; }
}

function processStamp() {
  var result = document.getElementById('standResult');
  if (selectedStand === 0) {
    result.className = 'stand-result visible error';
    result.innerHTML = '<h4>Selecciona tu stand</h4><p>Primero elige qué stand eres (1-6).</p>';
    return;
  }
  var folio = document.getElementById('standFolioInput').value.trim().toUpperCase();
  if (!folio || !folio.startsWith('DGM-')) {
    result.className = 'stand-result visible error';
    result.innerHTML = '<h4>Folio inválido</h4><p>El folio debe comenzar con DGM- seguido del código.</p>';
    return;
  }
  var stampedList = getStandStamps(selectedStand);
  if (stampedList.indexOf(folio) >= 0) {
    result.className = 'stand-result visible error';
    result.innerHTML = '<h4>Ya sellado</h4><p>El folio <strong>' + folio + '</strong> ya fue sellado en este stand.</p>';
    return;
  }
  var code = makeStampCode(folio, selectedStand);
  stampedList.push(folio);
  localStorage.setItem('dogmingo_stand_' + selectedStand, JSON.stringify(stampedList));
  result.className = 'stand-result visible success';
  result.innerHTML = '<h4>¡Sello registrado!</h4><p>Dile al usuario que ingrese este código en su pasaporte:</p><div class="stamp-code-display">' + code + '</div><p class="note">Stand ' + selectedStand + ' — ' + STATION_NAMES[selectedStand - 1] + ' — Folio: ' + folio + '</p>';
  document.getElementById('standFolioInput').value = '';
  updateStandHistory();
}

function updateStandHistory() {
  var historyDiv = document.getElementById('standHistory');
  var list = document.getElementById('standHistoryList');
  if (selectedStand === 0) { historyDiv.style.display = 'none'; return; }
  var stampedList = getStandStamps(selectedStand);
  if (stampedList.length === 0) { historyDiv.style.display = 'none'; return; }
  historyDiv.style.display = 'block';
  list.innerHTML = '';
  stampedList.slice().reverse().forEach(function(folio) {
    var li = document.createElement('li');
    li.innerHTML = folio + ' <span>✓ Sellado</span>';
    list.appendChild(li);
  });
}

function openStand() {
  document.getElementById('mainContent').classList.add('hidden');
  document.getElementById('standPortal').classList.add('active');
  window.scrollTo(0, 0);
  history.pushState(null, '', '#stand');
}

function closeStand() {
  document.getElementById('mainContent').classList.remove('hidden');
  document.getElementById('standPortal').classList.remove('active');
  history.pushState(null, '', '#');
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', function() {
  if (location.hash === '#stand') openStand();
  else if (document.getElementById('standPortal').classList.contains('active')) closeStand();
});
if (location.hash === '#stand') openStand();
