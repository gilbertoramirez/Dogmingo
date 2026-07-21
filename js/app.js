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
  ctx.fillStyle = '#313323';
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
var STAMP_MAP = [
  { id: 1, name: 'Bendición Canina', type: 'actividad', img: null },
  { id: 2, name: 'Huellas del Alma', type: 'actividad', img: null },
  { id: 3, name: 'Adiestramiento', type: 'actividad', img: null },
  { id: 6, name: 'Pasarela de Adopción', type: 'actividad', img: null },
  { id: 7, name: 'Doggies Paradise', type: 'patrocinador', img: 'img/patrocinadores/DOGGIES%20PARADISE%20.jpeg' },
  { id: 8, name: 'Freshly', type: 'patrocinador', img: 'img/patrocinadores/FRESHLY.jpeg' },
  { id: 9, name: "Ba'Alche", type: 'patrocinador', img: 'img/patrocinadores/Logotipos%20Ba%27Alche-02%20(1).png' },
  { id: 10, name: 'Zoo Bodega', type: 'patrocinador', img: 'img/patrocinadores/ZOO%20BODEGA.jpeg' },
  { id: 11, name: 'Güesos', type: 'patrocinador', img: 'img/patrocinadores/GU%CC%88ESOS%20LOGO%20con%20slogan%20PNG.png' },
  { id: 12, name: 'Edu.Can', type: 'patrocinador', img: 'img/patrocinadores/WhatsApp%20Image%202026-07-14%20at%201.09.11%20PM.jpeg' },
  { id: 13, name: 'Esperanza Canina', type: 'patrocinador', img: 'img/patrocinadores/EsperanzaCaninca.jpeg' },
  { id: 14, name: "Caro's Dog Club", type: 'patrocinador', img: 'img/patrocinadores/CDC_CAROS_DOG_CLUB.png' },
  { id: 15, name: 'Woof Munchies', type: 'patrocinador', img: 'img/patrocinadores/WOOF_MUNCHIES.png' },
  { id: 16, name: 'VidaNúPet', type: 'patrocinador', img: 'img/patrocinadores/VIDANUPET.png' },
  { id: 17, name: 'Zitara', type: 'patrocinador', img: 'img/patrocinadores/ZITARA.png' },
  { id: 18, name: 'Zitara Golf Club', type: 'patrocinador', img: 'img/patrocinadores/ZITARA_GOLF_CLUB.png' },
  { id: 19, name: 'Barking Town', type: 'patrocinador', img: 'img/patrocinadores/barking_town.jpg' },
  { id: 20, name: 'Barber Dog', type: 'patrocinador', img: 'img/patrocinadores/BARBERDOG.png' },
  { id: 21, name: 'Hospetalia', type: 'patrocinador', img: 'img/patrocinadores/HOSPET.png' },
  { id: 22, name: 'Patas de Gallo', type: 'patrocinador', img: 'img/patrocinadores/patasDeGallo.jpeg' },
  { id: 23, name: 'Peternos', type: 'patrocinador', img: 'img/patrocinadores/peternos.jpeg' },
  { id: 24, name: 'Iliana Event Planner', type: 'patrocinador', img: 'img/patrocinadores/IMG-20260718-WA0102.jpg' },
  { id: 25, name: 'Avanda Lavandería', type: 'patrocinador', img: 'img/patrocinadores/lavanderias.jpeg' },
  { id: 26, name: 'Nucan', type: 'patrocinador', img: 'img/patrocinadores/nucan.jpeg' },
  { id: 27, name: 'Croquetas Balú', type: 'patrocinador', img: 'img/patrocinadores/balu.jpeg' },
];
var ALL_STAMP_IDS = STAMP_MAP.map(function(s) { return s.id; });
var TOTAL_STAMPS = STAMP_MAP.length;
var RAFFLE_STAMPS = 6;
var STAMP_NAME_MAP = {};
var STAMP_IMG_MAP = {};
STAMP_MAP.forEach(function(s) { STAMP_NAME_MAP[s.id] = s.name; STAMP_IMG_MAP[s.id] = s.img; });

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
  for (var i = 0; i < ALL_STAMP_IDS.length; i++) {
    var id = ALL_STAMP_IDS[i];
    if (code === makeStampCode(folio, id)) return id;
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
var DOG_PLACEHOLDER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect fill='%23E8DFD0' width='120' height='120' rx='60'/%3E%3Cg transform='translate(60,55)' fill='%23C4923A' opacity='0.5'%3E%3Cellipse cx='0' cy='6' rx='14' ry='10'/%3E%3Ccircle cx='-10' cy='-6' r='5'/%3E%3Ccircle cx='-4' cy='-12' r='4.5'/%3E%3Ccircle cx='4' cy='-12' r='4.5'/%3E%3Ccircle cx='10' cy='-6' r='5'/%3E%3C/g%3E%3C/svg%3E";

function loadDogPhoto(imgEl, breed, retries) {
  if (retries === undefined) retries = 2;
  fetch('https://dog.ceo/api/breed/' + breed + '/images/random')
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (d.status === 'success') {
        var testImg = new Image();
        testImg.onload = function() { imgEl.src = d.message; };
        testImg.onerror = function() {
          if (retries > 0) loadDogPhoto(imgEl, breed, retries - 1);
          else imgEl.src = DOG_PLACEHOLDER;
        };
        testImg.src = d.message;
      } else if (retries > 0) {
        loadDogPhoto(imgEl, breed, retries - 1);
      }
    })
    .catch(function() {
      if (retries > 0) setTimeout(function() { loadDogPhoto(imgEl, breed, retries - 1); }, 1000);
      else imgEl.src = DOG_PLACEHOLDER;
    });
}

function createDogImg(breed) {
  var img = document.createElement('img');
  img.alt = breed.split('/').pop();
  img.loading = 'lazy';
  img.src = DOG_PLACEHOLDER;
  loadDogPhoto(img, breed);
  return img;
}

var heroBreeds = ['retriever/golden', 'husky', 'pug', 'dalmatian', 'samoyed'];
var heroDogs = document.getElementById('heroDogs');
heroBreeds.forEach(function(b) { heroDogs.appendChild(createDogImg(b)); });

var midBreeds = ['corgi/cardigan', 'beagle', 'labrador', 'schnauzer/miniature', 'boxer', 'shiba'];
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

var navToggle = document.getElementById('navToggle');
var navLinks = document.getElementById('navLinks');
navToggle.addEventListener('click', function() {
  navToggle.classList.toggle('open');
  navLinks.classList.toggle('open');
});
navLinks.querySelectorAll('a').forEach(function(a) {
  a.addEventListener('click', function() {
    navToggle.classList.remove('open');
    navLinks.classList.remove('open');
  });
});

// ══════════════════════════════════════════════════════
// Hero paw prints
// ══════════════════════════════════════════════════════
var hCanvas = document.getElementById('heroCanvas');
var hCtx = hCanvas.getContext('2d');
var pawsList = [];
function hResize() { hCanvas.width = hCanvas.offsetWidth * devicePixelRatio; hCanvas.height = hCanvas.offsetHeight * devicePixelRatio; hCtx.scale(devicePixelRatio, devicePixelRatio); }
hResize(); window.addEventListener('resize', hResize);
function drawPaw(x, y, sz, rot, a) {
  hCtx.save(); hCtx.translate(x, y); hCtx.rotate(rot); hCtx.globalAlpha = a; hCtx.fillStyle = '#BF7634';
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

var currentUserData = null;
var currentStamps = [];

function generatePassport(data, stamps) {
  var c = document.getElementById('passportCanvas');
  var ctx = c.getContext('2d');
  var W = 800, H = 2200;
  c.width = W; c.height = H;
  ctx.fillStyle = '#F4E6D0'; ctx.beginPath(); ctx.roundRect(0, 0, W, H, 20); ctx.fill();
  ctx.strokeStyle = '#D4C9B5'; ctx.lineWidth = 3; ctx.setLineDash([8, 4]);
  ctx.beginPath(); ctx.roundRect(20, 20, W-40, H-40, 16); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#BF7634'; ctx.beginPath(); ctx.roundRect(40, 40, W-80, 100, [12, 12, 0, 0]); ctx.fill();
  ctx.fillStyle = '#FFFFFF'; ctx.font = '900 36px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('PASAPORTE PERRUNO', W/2, 105);
  ctx.fillStyle = '#8A7E6E'; ctx.font = '700 16px system-ui, sans-serif';
  ctx.fillText('DOGMINGO · 26 JULIO 2026', W/2, 175);
  var dogCanvas = document.createElement('canvas'); dogCanvas.width = 200; dogCanvas.height = 200;
  drawDog(dogCanvas, 'golden'); ctx.drawImage(dogCanvas, W/2-60, 195, 120, 120);
  ctx.fillStyle = '#313323'; ctx.font = '800 28px system-ui, sans-serif';
  ctx.fillText(data.nombre + ' ' + data.apellido, W/2, 355);
  if (data.nombre_perro) { ctx.fillStyle = '#6B6558'; ctx.font = '600 20px system-ui, sans-serif'; ctx.fillText('y su perro ' + data.nombre_perro, W/2, 385); }
  ctx.fillStyle = '#313323'; ctx.font = '700 14px system-ui, sans-serif'; ctx.fillText('Folio: ' + data.folio, W/2, 420);
  ctx.strokeStyle = '#D4C9B5'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(80, 445); ctx.lineTo(W-80, 445); ctx.stroke();

  var activities = STAMP_MAP.filter(function(s) { return s.type === 'actividad'; });
  var sponsors = STAMP_MAP.filter(function(s) { return s.type === 'patrocinador'; });

  ctx.fillStyle = '#313323'; ctx.font = '800 22px system-ui, sans-serif'; ctx.fillText('ACTIVIDADES', W/2, 485);
  ctx.fillStyle = '#8A7E6E'; ctx.font = '400 14px system-ui, sans-serif'; ctx.fillText('Visita cada estación para obtener tu sello', W/2, 510);

  var cols = 3, slotSize = 110, gapX = 30, gapY = 25;
  var aRows = Math.ceil(activities.length / cols);
  var gridW = cols * slotSize + (cols-1) * gapX;
  var startX = (W - gridW) / 2, startY = 540;

  function drawStampSlot(item, idx, startX, startY, cols, slotSize, gapX, gapY) {
    var col = idx % cols, row = Math.floor(idx / cols);
    var x = startX + col * (slotSize + gapX) + slotSize/2;
    var y = startY + row * (slotSize + gapY) + slotSize/2;
    var isStamped = stamps.indexOf(item.id) >= 0;
    if (isStamped) {
      ctx.fillStyle = 'rgba(45,106,63,0.1)'; ctx.beginPath(); ctx.arc(x, y, slotSize/2 - 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#313323'; ctx.lineWidth = 3; ctx.setLineDash([]); ctx.beginPath(); ctx.arc(x, y, slotSize/2 - 5, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#313323'; ctx.font = '800 28px system-ui, sans-serif'; ctx.fillText('✓', x, y + 8);
    } else {
      ctx.strokeStyle = '#C9BDA8'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.arc(x, y, slotSize/2 - 5, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.fillStyle = isStamped ? '#313323' : '#B5A998'; ctx.font = '600 10px system-ui, sans-serif'; ctx.textAlign = 'center';
    var words = item.name.split(' ');
    var lines = []; var line = '';
    words.forEach(function(w) { if ((line + ' ' + w).length > 14 && line) { lines.push(line); line = w; } else { line = line ? line + ' ' + w : w; } });
    if (line) lines.push(line);
    var textY = y + (isStamped ? 24 : 0) - ((lines.length-1) * 13) / 2;
    lines.forEach(function(l, li) { ctx.fillText(l, x, textY + li * 13); });
  }

  activities.forEach(function(item, i) { drawStampSlot(item, i, startX, startY, cols, slotSize, gapX, gapY); });

  var sponsorStartY = startY + aRows * (slotSize + gapY) + 30;
  ctx.fillStyle = '#313323'; ctx.font = '800 22px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('PATROCINADORES', W/2, sponsorStartY);
  ctx.fillStyle = '#8A7E6E'; ctx.font = '400 14px system-ui, sans-serif';
  ctx.fillText('Visita cada patrocinador para completar tu pasaporte', W/2, sponsorStartY + 25);

  var sCols = 4, sSlotSize = 100, sGapX = 25, sGapY = 22;
  var sRows = Math.ceil(sponsors.length / sCols);
  var sGridW = sCols * sSlotSize + (sCols-1) * sGapX;
  var sStartX = (W - sGridW) / 2, sStartY = sponsorStartY + 50;

  sponsors.forEach(function(item, i) { drawStampSlot(item, i, sStartX, sStartY, sCols, sSlotSize, sGapX, sGapY); });

  var bottomY = sStartY + sRows * (sSlotSize + sGapY) + 20;
  ctx.fillStyle = '#BF7634'; ctx.beginPath(); ctx.roundRect(40, bottomY, W-80, 80, [0, 0, 12, 12]); ctx.fill();
  ctx.fillStyle = '#FFFFFF'; ctx.font = '700 16px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('¡Completa ' + RAFFLE_STAMPS + ' sellos y participa en la rifa!', W/2, bottomY + 35);
  ctx.font = '400 13px system-ui, sans-serif';
  ctx.fillText('Presenta tu pasaporte en el stand principal de Dogmingo', W/2, bottomY + 58);
  var qrSize = 120;
  var qrCanvas = renderQRToCanvas(data.folio, qrSize);
  var qrX = W/2 - qrSize/2;
  var qrY = bottomY + 100;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16);
  ctx.strokeStyle = '#D4C9B5'; ctx.lineWidth = 1;
  ctx.strokeRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16);
  ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
  ctx.fillStyle = '#8A7E6E'; ctx.font = '600 12px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('Escanea para verificar tu folio', W/2, qrY + qrSize + 20);

  ctx.globalAlpha = 0.04; ctx.fillStyle = '#BF7634';
  for (var i = 0; i < 8; i++) { drawPawOnCtx(ctx, 80 + Math.random() * (W-160), 200 + Math.random() * (H-300), 20 + Math.random() * 15, Math.random() * Math.PI * 2); }
  ctx.globalAlpha = 1;
}

// ══════════════════════════════════════════════════════
// Stamp tracking (user side) — all from DB
// ══════════════════════════════════════════════════════
function renderStampGrid(stamps) {
  var grid = document.getElementById('stampGrid');
  if (!grid) return;
  grid.innerHTML = '';
  STAMP_MAP.forEach(function(item) {
    var has = stamps.indexOf(item.id) >= 0;
    var slot = document.createElement('div');
    slot.className = 'stamp-tracker-slot' + (has ? ' stamped' : '');
    if (has && item.img) {
      var img = document.createElement('img');
      img.src = item.img;
      img.alt = item.name;
      img.className = 'stamp-tracker-img';
      slot.appendChild(img);
    }
    var span = document.createElement('span');
    span.textContent = item.name;
    slot.appendChild(span);
    grid.appendChild(slot);
  });
  var complete = document.getElementById('stampComplete');
  if (complete) complete.classList.toggle('visible', stamps.length >= RAFFLE_STAMPS);
}

function addStampCode() {
  var input = document.getElementById('stampCodeInput');
  var msg = document.getElementById('stampMsg');
  if (!currentUserData) { msg.className = 'stamp-msg error'; msg.textContent = 'Primero debes registrarte.'; return; }
  var code = input.value.trim().toUpperCase();
  if (!code) { msg.className = 'stamp-msg error'; msg.textContent = 'Ingresa un código de sello.'; return; }
  var standNum = verifyStampCode(currentUserData.folio, code);
  if (standNum === 0) { msg.className = 'stamp-msg error'; msg.textContent = 'Código inválido. Verifica e intenta de nuevo.'; return; }
  if (currentStamps.indexOf(standNum) >= 0) { msg.className = 'stamp-msg error'; msg.textContent = 'Ya tienes el sello de ' + STAMP_NAME_MAP[standNum] + '.'; return; }
  currentStamps.push(standNum);
  msg.className = 'stamp-msg success';
  msg.textContent = '¡Sello de ' + STAMP_NAME_MAP[standNum] + ' agregado!';
  input.value = '';
  renderStampGrid(currentStamps);
  generatePassport(currentUserData, currentStamps);
}

// ══════════════════════════════════════════════════════
// Show success screen with user data from DB
// ══════════════════════════════════════════════════════
function showSuccessScreen(registro, stamps) {
  currentUserData = registro;
  currentStamps = stamps;
  form.style.display = 'none';
  formSuccess.classList.add('visible');
  generatePassport(registro, stamps);
}

// ══════════════════════════════════════════════════════
// Registration — email verification + DB + session
// ══════════════════════════════════════════════════════
var form = document.getElementById('registroForm');
var submitBtn = document.getElementById('submitBtn');
var formSuccess = document.getElementById('formSuccess');
var verificationStep = document.getElementById('verificationStep');
var traePerro = document.getElementById('traePerro');
var dogNameField = document.getElementById('dogNameField');

var pendingPayload = null;
var verificationToken = null;


function sendPassportEmail(registro) {
  var c = document.getElementById('passportCanvas');
  var passportImage = c.toDataURL('image/png');
  fetch('/api/send-passport', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: registro.email,
      nombre: registro.nombre + ' ' + registro.apellido,
      folio: registro.folio,
      passportImage: passportImage
    })
  }).catch(function() {});
}


traePerro.addEventListener('change', function() {
  dogNameField.classList.toggle('visible', traePerro.checked);
  if (!traePerro.checked) document.getElementById('nombrePerro').value = '';
});

function switchRegTab(type) {
  var tabs = document.querySelectorAll('.reg-tab');
  tabs.forEach(function(t) { t.classList.remove('active'); });
  if (type === 'familia') {
    tabs[1].classList.add('active');
    document.getElementById('regType').value = 'familia';
    document.getElementById('familyNote').style.display = '';
    document.getElementById('familyFields').style.display = '';
    document.getElementById('lblNombre').textContent = 'Nombre del representante';
  } else {
    tabs[0].classList.add('active');
    document.getElementById('regType').value = 'individual';
    document.getElementById('familyNote').style.display = 'none';
    document.getElementById('familyFields').style.display = 'none';
    document.getElementById('lblNombre').textContent = 'Nombre';
    document.getElementById('adultos').value = '1';
    document.getElementById('ninos').value = '0';
  }
}

function validateField(field) {
  var group = field.closest('.form-group');
  if (!group) return true;
  var valid = true;
  if (field.required && !field.value.trim()) valid = false;
  if (field.type === 'email' && field.value.trim()) valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim());
  if (field.type === 'tel' && field.value.trim()) valid = field.value.replace(/\D/g, '').length === 10;
  group.classList.toggle('has-error', !valid);
  return valid;
}

form.querySelectorAll('.form-input').forEach(function(input) {
  input.addEventListener('blur', function() { validateField(input); });
  input.addEventListener('input', function() { var g = input.closest('.form-group'); if (g && g.classList.contains('has-error')) validateField(input); });
});

// Terms checkbox → progress bar + button enable
(function initTermsProgress() {
  var cbs = document.querySelectorAll('.terms-cb');
  var bar = document.getElementById('termsProgressBar');
  var txt = document.getElementById('termsProgressText');
  var btn = document.getElementById('submitBtn');
  function update() {
    var checked = 0;
    cbs.forEach(function(cb) { if (cb.checked) checked++; });
    var pct = Math.round((checked / cbs.length) * 100);
    bar.style.setProperty('--progress', pct + '%');
    txt.textContent = checked + ' de ' + cbs.length + ' aceptados';
    if (checked === cbs.length) {
      btn.disabled = false;
      btn.classList.remove('form-submit-locked');
      btn.innerHTML = 'Verificar correo electrónico';
    } else {
      btn.disabled = true;
      btn.classList.add('form-submit-locked');
      btn.innerHTML = '<span class="submit-lock-icon">🔒</span> Acepta los términos para continuar';
    }
    document.getElementById('termsError').textContent = '';
  }
  cbs.forEach(function(cb) { cb.addEventListener('change', update); });
  update();
})();

// Step 1: Send verification code
form.addEventListener('submit', function(e) {
  e.preventDefault();
  var allValid = true;
  form.querySelectorAll('.form-input[required]').forEach(function(f) { if (!validateField(f)) allValid = false; });
  if (!allValid) return;

  var termsError = document.getElementById('termsError');
  var acceptTerms = document.getElementById('acceptTerms');
  var acceptCarta = document.getElementById('acceptCarta');
  var acceptPrivacy = document.getElementById('acceptPrivacy');
  if (!acceptTerms.checked || !acceptCarta.checked || !acceptPrivacy.checked) {
    termsError.textContent = 'Debes aceptar todos los términos y condiciones para continuar.';
    return;
  }
  termsError.textContent = '';

  submitBtn.disabled = true;
  submitBtn.textContent = 'Enviando código...';

  var email = document.getElementById('email').value.trim();

  var isFamily = document.getElementById('regType').value === 'familia';
  pendingPayload = {
    folio: 'DGM-' + Date.now().toString(36).toUpperCase(),
    nombre: document.getElementById('nombre').value.trim(),
    apellido: document.getElementById('apellido').value.trim(),
    email: email,
    telefono: document.getElementById('telefono').value.trim(),
    adultos: isFamily ? parseInt(document.getElementById('adultos').value) : 1,
    ninos: isFamily ? parseInt(document.getElementById('ninos').value) : 0,
    traePerro: traePerro.checked,
    nombrePerro: document.getElementById('nombrePerro').value.trim()
  };

  fetch('/api/send-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email })
  }).then(function(r) {
    return r.json().then(function(d) {
      if (!r.ok) throw new Error(d.error || 'Error al enviar código');
      return d;
    });
  }).then(function(d) {
    verificationToken = d.token;
    form.style.display = 'none';
    verificationStep.style.display = 'block';
    document.getElementById('verifyEmailDisplay').textContent = email;
    document.getElementById('verificationCode').focus();
  }).catch(function(err) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Verificar correo electrónico';
    alert('Error: ' + err.message);
  });
});

// Step 2: Confirm code and register
function completeRegistration() {
  var code = document.getElementById('verificationCode').value.trim();
  if (!code || code.length !== 6) {
    alert('Ingresa el código de 6 dígitos que recibiste por correo.');
    return;
  }

  var verifyBtn = document.getElementById('verifyBtn');
  verifyBtn.disabled = true;
  verifyBtn.textContent = 'Verificando...';

  var payload = Object.assign({}, pendingPayload, {
    verificationToken: verificationToken,
    verificationCode: code
  });

  fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(function(r) {
    return r.json().then(function(d) {
      if (!r.ok) throw new Error(d.error || 'Error al registrar');
      return d;
    });
  }).then(function(d) {
    var registro = d.registro;
    var stamps = d.stamps || [];

    verificationStep.style.display = 'none';
    showSuccessScreen(registro, stamps);
    if (!d.existing) {
      setTimeout(function() { sendPassportEmail(registro); }, 500);
    }
  }).catch(function(err) {
    verifyBtn.disabled = false;
    verifyBtn.textContent = 'Confirmar y registrarme';
    alert('Error: ' + err.message);
  });
}

// Resend code
document.getElementById('resendCode').addEventListener('click', function(e) {
  e.preventDefault();
  var email = pendingPayload.email;
  this.textContent = 'Enviando...';
  var self = this;
  fetch('/api/send-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email })
  }).then(function(r) { return r.json(); }).then(function(d) {
    if (d.token) verificationToken = d.token;
    self.textContent = '¡Código reenviado!';
    setTimeout(function() { self.textContent = 'Reenviar código'; }, 3000);
  }).catch(function() {
    self.textContent = 'Error, intenta de nuevo';
    setTimeout(function() { self.textContent = 'Reenviar código'; }, 3000);
  });
});

// Change email — go back to form
document.getElementById('changeEmail').addEventListener('click', function(e) {
  e.preventDefault();
  verificationStep.style.display = 'none';
  form.style.display = 'block';
  var allChecked = document.querySelectorAll('.terms-cb:not(:checked)').length === 0;
  submitBtn.disabled = !allChecked;
  if (allChecked) {
    submitBtn.classList.remove('form-submit-locked');
    submitBtn.innerHTML = 'Verificar correo electrónico';
  } else {
    submitBtn.classList.add('form-submit-locked');
    submitBtn.innerHTML = '<span class="submit-lock-icon">🔒</span> Acepta los términos para continuar';
  }
});


// ══════════════════════════════════════════════════════
// Stand Portal
// ══════════════════════════════════════════════════════
var selectedStand = 0;

function initStandSelect() {
  var container = document.getElementById('standSelect');
  STAMP_MAP.forEach(function(item) {
    var btn = document.createElement('button');
    btn.className = 'stand-btn';
    btn.innerHTML = (item.id) + '<small>' + item.name + '</small>';
    btn.addEventListener('click', function() {
      selectedStand = item.id;
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
    result.innerHTML = '<h4>Selecciona tu stand</h4><p>Primero elige qué stand o patrocinador eres.</p>';
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
  result.innerHTML = '<h4>¡Sello registrado!</h4><p>Dile al usuario que ingrese este código en su pasaporte:</p><div class="stamp-code-display">' + code + '</div><p class="note">' + STAMP_NAME_MAP[selectedStand] + ' — Folio: ' + folio + '</p>';
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

// ══════════════════════════════════════════════════════
// Mis Sellos — stamp progress lookup
// ══════════════════════════════════════════════════════
function lookupSellos() {
  var query = document.getElementById('sellosQuery').value.trim();
  var result = document.getElementById('sellosResult');
  var error = document.getElementById('sellosError');
  var btn = document.getElementById('sellosBtn');
  if (!query) { error.textContent = 'Ingresa tu correo electrónico o número de teléfono.'; error.style.display = 'block'; result.style.display = 'none'; return; }
  error.style.display = 'none';
  btn.disabled = true; btn.textContent = 'Consultando...';

  fetch('/api/stamps/lookup?q=' + encodeURIComponent(query))
    .then(function(r) { return r.json(); })
    .then(function(d) {
      btn.disabled = false; btn.textContent = 'Consultar';
      if (!d.ok) { error.textContent = d.error || 'No se encontró un registro con ese correo o teléfono.'; error.style.display = 'block'; result.style.display = 'none'; return; }
      result.style.display = 'block';
      document.getElementById('sellosUserInfo').textContent = d.nombre + ' — Folio: ' + d.folio;
      var grid = document.getElementById('sellosGrid');
      grid.innerHTML = '';
      STAMP_MAP.forEach(function(stamp) {
        var has = d.stamps.indexOf(stamp.id) >= 0;
        var item = document.createElement('div');
        item.className = 'sello-item' + (has ? ' collected' : '');
        var iconHtml;
        if (has && stamp.img) {
          iconHtml = '<img src="' + stamp.img + '" alt="' + stamp.name + '" class="sello-img">';
        } else {
          iconHtml = '<div class="sello-icon">' + (has ? '🐾' : '○') + '</div>';
        }
        item.innerHTML = iconHtml + '<div class="sello-name">' + stamp.name + '</div>';
        grid.appendChild(item);
      });
      var count = Math.min(d.stamps.length, RAFFLE_STAMPS);
      var pct = Math.round((count / RAFFLE_STAMPS) * 100);
      document.getElementById('sellosProgressFill').style.width = pct + '%';
      document.getElementById('sellosProgressText').textContent = d.stamps.length + ' de ' + RAFFLE_STAMPS + ' sellos para la rifa';
      var existing = document.getElementById('sellosComplete');
      if (existing) existing.remove();
      if (d.stamps.length >= RAFFLE_STAMPS) {
        var msg = document.createElement('div');
        msg.className = 'sellos-complete';
        msg.id = 'sellosComplete';
        msg.textContent = '¡Felicidades! Tienes ' + d.stamps.length + ' sellos. Participas automáticamente en la rifa.';
        result.appendChild(msg);
      }
    })
    .catch(function() {
      btn.disabled = false; btn.textContent = 'Consultar';
      error.textContent = 'Error de conexión. Intenta de nuevo.'; error.style.display = 'block'; result.style.display = 'none';
    });
}
