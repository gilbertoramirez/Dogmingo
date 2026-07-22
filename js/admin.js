var STAMP_MAP = [
  { id: 1, name: 'Bendición Canina', type: 'actividad' },
  { id: 2, name: 'Huellas del Alma', type: 'actividad' },
  { id: 3, name: 'Adiestramiento', type: 'actividad' },
  { id: 6, name: 'Pasarela de Adopción', type: 'actividad' },
  { id: 7, name: 'Doggies Paradise', type: 'patrocinador' },
  { id: 8, name: 'Freshly', type: 'patrocinador' },
  { id: 9, name: "Ba'Alche", type: 'patrocinador' },
  { id: 10, name: 'Zoo Bodega', type: 'patrocinador' },
  { id: 11, name: 'Güesos', type: 'patrocinador' },
  { id: 12, name: 'Edu.Can', type: 'patrocinador' },
  { id: 13, name: 'Esperanza Canina', type: 'patrocinador' },
  { id: 14, name: "Caro's Dog Club", type: 'patrocinador' },
  { id: 15, name: 'Woof Munchies', type: 'patrocinador' },
  { id: 16, name: 'VidaNúPet', type: 'patrocinador' },
  { id: 17, name: 'Zitara', type: 'patrocinador' },
  { id: 18, name: 'Zitara Golf Club', type: 'patrocinador' },
  { id: 19, name: 'Barking Town', type: 'patrocinador' },
  { id: 20, name: 'Barber Dog', type: 'patrocinador' },
  { id: 21, name: 'Hospetalia', type: 'patrocinador' },
  { id: 22, name: 'Patas de Gallo', type: 'patrocinador' },
  { id: 23, name: 'Peternos', type: 'patrocinador' },
  { id: 24, name: 'Iliana Event Planner', type: 'patrocinador' },
  { id: 25, name: 'Avanda Lavandería', type: 'patrocinador' },
  { id: 26, name: 'Nucan', type: 'patrocinador' },
  { id: 27, name: 'Croquetas Balú', type: 'patrocinador' },
  { id: 28, name: 'DolceFresa', type: 'patrocinador' },
];
var ALL_STAMP_IDS = STAMP_MAP.map(function(s) { return s.id; });
var TOTAL_STAMPS = STAMP_MAP.length;
var RAFFLE_STAMPS = 6;
var STAMP_NAME_MAP = {};
STAMP_MAP.forEach(function(s) { STAMP_NAME_MAP[s.id] = s.name; });
var token = sessionStorage.getItem('dgm_vendor_token');
var vendor = null;
var scanner = null;
var scannerActive = false;
var currentFolio = null;
var currentRegistro = null;
var recentStamps = [];

try { vendor = JSON.parse(sessionStorage.getItem('dgm_vendor_data')); } catch (e) {}

function api(path, opts) {
  opts = opts || {};
  var headers = opts.headers || {};
  if (token) headers['Authorization'] = 'Bearer ' + token;
  if (opts.body && typeof opts.body === 'object') {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(opts.body);
  }
  opts.headers = headers;
  return fetch(path, opts).then(function (r) {
    return r.json().then(function (d) {
      if (!r.ok) throw new Error(d.error || 'Error');
      return d;
    });
  });
}

// ── NAVIGATION ──
function showView(viewId) {
  document.querySelectorAll('.panel-view').forEach(function (v) { v.classList.remove('active'); });
  document.getElementById('view-' + viewId).classList.add('active');

  if (viewId === 'vendors') loadVendors();
  if (viewId === 'registros') loadStats();
  if (viewId === 'account') populateAccount();
  if (viewId === 'helpers') populateHelpers();
  if (viewId === 'rifa') loadRifa();
}

function goMenu() {
  if (scanner && scannerActive) {
    scanner.stop().catch(function () {});
    scannerActive = false;
    document.getElementById('startScanBtn').textContent = 'Abrir cámara';
    document.getElementById('startScanBtn').classList.remove('active');
  }
  showView('menu');
}

function getGreeting() {
  var h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function buildMenu() {
  var grid = document.getElementById('menuGrid');
  grid.innerHTML = '';
  var isAdmin = vendor && vendor.es_admin;
  var isSubadmin = vendor && vendor.es_subadmin;
  var standNum = vendor ? vendor.stand_num : 0;

  var welcome = document.getElementById('menuWelcome');
  var greeting = getGreeting();
  var name = vendor.nombre || 'Administrador';
  var roleLine = '';
  if (isAdmin) {
    roleLine = 'Administrador general';
  } else if (isSubadmin) {
    roleLine = 'Sub-admin · Stand ' + standNum + ' — ' + STAMP_NAME_MAP[standNum];
  } else {
    roleLine = 'Vendedor · Stand ' + standNum + ' — ' + STAMP_NAME_MAP[standNum];
  }
  welcome.innerHTML =
    '<p class="menu-welcome-greeting">' + greeting + ', <strong>' + name + '</strong></p>' +
    '<p class="menu-welcome-role">' + roleLine + '</p>';

  var items = [];

  if (!isAdmin) {
    items.push({ id: 'scanner', icon: '📷', label: 'Escáner', desc: 'Escanear QR y sellar pasaporte' });
    if (isSubadmin) {
      items.push({ id: 'helpers', icon: '👥', label: 'Equipo', desc: 'Agregar vendedores a tu stand' });
    }
  }

  if (isAdmin) {
    items.push({ id: 'vendors', icon: '🏪', label: 'Vendedores', desc: 'Crear y gestionar vendedores por stand' });
    items.push({ id: 'registros', icon: '📊', label: 'Registros', desc: 'Métricas y usuarios registrados' });
    items.push({ id: 'rifa', icon: '🎟️', label: 'Rifa', desc: 'Sorteo entre quienes tienen 6+ sellos' });
  }

  items.push({ id: 'account', icon: '🔑', label: 'Mi cuenta', desc: 'Cambiar contraseña y datos' });

  items.forEach(function (item) {
    var card = document.createElement('button');
    card.className = 'menu-card';
    card.onclick = function () { showView(item.id); };
    card.innerHTML =
      '<span class="menu-card-icon">' + item.icon + '</span>' +
      '<div class="menu-card-body">' +
        '<span class="menu-card-label">' + item.label + '</span>' +
        '<span class="menu-card-desc">' + item.desc + '</span>' +
      '</div>' +
      '<span class="menu-card-arrow">›</span>';
    grid.appendChild(card);
  });
}

// ── LOGIN ──
var loginForm = document.getElementById('loginForm');
loginForm.addEventListener('submit', function (e) {
  e.preventDefault();
  var btn = document.getElementById('loginBtn');
  var errEl = document.getElementById('loginError');
  var emailVal = document.getElementById('loginEmail').value.trim();
  var passVal = document.getElementById('loginPassword').value;

  if (!emailVal || !passVal) {
    errEl.textContent = !emailVal ? 'Ingresa tu correo.' : 'Ingresa tu contraseña.';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Entrando...';
  errEl.textContent = '';

  api('/api/vendor/login', {
    method: 'POST',
    body: { email: emailVal, password: passVal }
  }).then(function (d) {
    token = d.token;
    vendor = d.vendor;
    sessionStorage.setItem('dgm_vendor_token', token);
    sessionStorage.setItem('dgm_vendor_data', JSON.stringify(vendor));
    showDashboard();
  }).catch(function (err) {
    errEl.textContent = err.message;
    btn.disabled = false;
    btn.textContent = 'Iniciar sesión';
  });
});

function logout() {
  token = null;
  vendor = null;
  sessionStorage.removeItem('dgm_vendor_token');
  sessionStorage.removeItem('dgm_vendor_data');
  if (scanner && scannerActive) {
    scanner.stop().catch(function () {});
    scannerActive = false;
  }
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginBtn').disabled = false;
  document.getElementById('loginBtn').textContent = 'Iniciar sesión';
  document.getElementById('loginError').textContent = '';
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPassword').value = '';
}

function showDashboard() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';

  var isAdmin = vendor.es_admin;
  var standNum = vendor.stand_num;

  if (isAdmin) {
    document.getElementById('dashRole').textContent = 'Administrador general';
  } else if (vendor.es_subadmin) {
    document.getElementById('dashRole').textContent = 'Sub-admin · Stand ' + standNum + ' — ' + STAMP_NAME_MAP[standNum];
  } else {
    document.getElementById('dashRole').textContent = 'Vendedor · Stand ' + standNum + ' — ' + STAMP_NAME_MAP[standNum];
    document.getElementById('standIndicator').textContent = 'Stand ' + standNum + ' — ' + STAMP_NAME_MAP[standNum];
  }

  buildMenu();
  showView('menu');
}

// ── ACCOUNT ──
function populateAccount() {
  var info = document.getElementById('vendorSettingsInfo');
  if (vendor.es_admin) {
    info.innerHTML = '<p><strong>Administrador</strong></p>';
  } else {
    info.innerHTML = '<p><strong>' + vendor.nombre + '</strong></p>' +
      '<p>Stand ' + vendor.stand_num + ' — ' + STAMP_NAME_MAP[vendor.stand_num] + '</p>';
  }
}

function populateHelpers() {
  if (vendor && !vendor.es_admin) {
    document.getElementById('helpStandBadge').textContent = 'Stand ' + vendor.stand_num + ' — ' + STAMP_NAME_MAP[vendor.stand_num];
    loadTeamVendors();
  }
}

function loadTeamVendors() {
  var container = document.getElementById('helpVendorList');
  api('/api/vendor/team')
    .then(function (d) {
      if (!d.vendors || d.vendors.length === 0) {
        container.innerHTML = '<p class="empty-msg">No hay vendedores en tu stand a&uacute;n.</p>';
        return;
      }
      container.innerHTML = '';
      d.vendors.forEach(function (v) {
        var item = document.createElement('div');
        item.className = 'vendor-item';
        var standName = STAMP_NAME_MAP[v.stand_num] || ('Stand ' + v.stand_num);
        item.innerHTML = '<div class="vendor-info"><div class="vendor-name">' + v.nombre + '</div>' +
          '<div class="vendor-email">' + v.email + '</div></div>' +
          '<span class="vendor-stand">' + standName + '</span>';
        container.appendChild(item);
      });
    })
    .catch(function () {
      container.innerHTML = '<p class="empty-msg">Error al cargar vendedores.</p>';
    });
}

function selfChangePassword() {
  var currentPw = document.getElementById('selfCurrentPw').value;
  var pw = document.getElementById('selfNewPw').value;
  var confirmPw = document.getElementById('selfConfirmPw').value;
  var msg = document.getElementById('selfPwMsg');

  if (!currentPw) { msg.className = 'form-msg error'; msg.textContent = 'Ingresa tu contraseña actual.'; return; }
  if (!pw || pw.length < 4) { msg.className = 'form-msg error'; msg.textContent = 'La nueva contraseña debe tener al menos 4 caracteres.'; return; }
  if (pw !== confirmPw) { msg.className = 'form-msg error'; msg.textContent = 'Las contraseñas no coinciden.'; return; }

  msg.className = 'form-msg'; msg.textContent = '';

  api('/api/vendor/change-password', {
    method: 'POST',
    body: { current_password: currentPw, new_password: pw }
  }).then(function () {
    msg.className = 'form-msg success';
    msg.textContent = 'Contraseña actualizada.';
    document.getElementById('selfCurrentPw').value = '';
    document.getElementById('selfNewPw').value = '';
    document.getElementById('selfConfirmPw').value = '';
  }).catch(function (err) {
    msg.className = 'form-msg error';
    msg.textContent = err.message;
  });
}

// ── HELPERS (vendor) ──
function createHelper() {
  var nombre = document.getElementById('helpNombre').value.trim();
  var email = document.getElementById('helpEmail').value.trim();
  var password = document.getElementById('helpPassword').value;
  var msg = document.getElementById('helpMsg');

  if (!nombre || !email || !password) { msg.className = 'form-msg error'; msg.textContent = 'Todos los campos son requeridos.'; return; }
  if (password.length < 4) { msg.className = 'form-msg error'; msg.textContent = 'La contraseña debe tener al menos 4 caracteres.'; return; }

  msg.className = 'form-msg'; msg.textContent = '';

  api('/api/vendor/create', {
    method: 'POST',
    body: { nombre: nombre, email: email, password: password }
  }).then(function (d) {
    msg.className = 'form-msg success';
    msg.textContent = 'Vendedor "' + d.vendor.nombre + '" creado para Stand ' + d.vendor.stand_num + '.';
    loadTeamVendors();
    document.getElementById('helpNombre').value = '';
    document.getElementById('helpEmail').value = '';
    document.getElementById('helpPassword').value = '';
  }).catch(function (err) {
    msg.className = 'form-msg error';
    msg.textContent = err.message;
  });
}

// ── SCANNER (vendor) ──
function getActiveStand() {
  return vendor.stand_num;
}

function toggleScanner() {
  var btn = document.getElementById('startScanBtn');
  if (scannerActive) {
    scanner.stop().then(function () {
      scannerActive = false;
      btn.textContent = 'Abrir cámara';
      btn.classList.remove('active');
    }).catch(function () {});
    return;
  }

  if (!scanner) {
    scanner = new Html5Qrcode('qrReader');
  }

  scanner.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: { width: 250, height: 250 } },
    function (text) {
      scanner.stop().then(function () {
        scannerActive = false;
        btn.textContent = 'Abrir cámara';
        btn.classList.remove('active');
      });
      document.getElementById('folioInput').value = text;
      lookupFolio();
    }
  ).then(function () {
    scannerActive = true;
    btn.textContent = 'Cerrar cámara';
    btn.classList.add('active');
  }).catch(function (err) {
    alert('No se pudo acceder a la cámara: ' + err);
  });
}

function lookupFolio() {
  var folio = document.getElementById('folioInput').value.trim().toUpperCase();
  if (!folio) return;

  document.getElementById('userCard').style.display = 'none';
  document.getElementById('stampResult').style.display = 'none';

  api('/api/vendor/lookup?folio=' + encodeURIComponent(folio))
    .then(function (d) {
      currentFolio = folio;
      currentRegistro = d.registro;
      showUserCard(d.registro, d.sellos);
    })
    .catch(function (err) {
      var card = document.getElementById('userCard');
      card.style.display = 'block';
      card.innerHTML = '<p style="color:var(--salsa);text-align:center;padding:1rem;">' + err.message + '</p>';
    });
}

function showUserCard(reg, sellos) {
  var card = document.getElementById('userCard');
  card.style.display = 'block';

  document.getElementById('userName').textContent = reg.nombre + ' ' + reg.apellido;
  document.getElementById('userFolio').textContent = reg.folio;

  var details = document.getElementById('userDetails');
  var infoHtml = '<p>' + reg.email + '</p><p>' + reg.telefono + '</p>';
  infoHtml += '<p>' + reg.adultos + ' adulto(s)';
  if (reg.ninos > 0) infoHtml += ', ' + reg.ninos + ' niño(s)';
  if (reg.trae_perro && reg.nombre_perro) infoHtml += ' — Perro: ' + reg.nombre_perro;
  infoHtml += '</p>';
  details.innerHTML = infoHtml;

  var stampedStands = sellos.map(function (s) { return s.stand_num; });
  var stampsEl = document.getElementById('userStamps');
  stampsEl.innerHTML = '';
  STAMP_MAP.forEach(function (item) {
    var dot = document.createElement('div');
    dot.className = 'stamp-dot' + (stampedStands.indexOf(item.id) >= 0 ? ' filled' : '');
    dot.title = item.name;
    dot.textContent = item.name.substring(0, 3);
    stampsEl.appendChild(dot);
  });

  var activeStand = getActiveStand();
  var stampBtn = document.getElementById('stampBtn');
  var result = document.getElementById('stampResult');
  result.style.display = 'none';
  result.className = 'stamp-result';

  if (stampedStands.indexOf(activeStand) >= 0) {
    stampBtn.disabled = true;
    stampBtn.textContent = 'Ya sellado en Stand ' + activeStand;
  } else {
    stampBtn.disabled = false;
    stampBtn.textContent = 'Sellar — Stand ' + activeStand + ' (' + STAMP_NAME_MAP[activeStand] + ')';
  }
}

function applyStamp() {
  var activeStand = getActiveStand();
  if (!currentFolio || activeStand === 0) return;

  var btn = document.getElementById('stampBtn');
  btn.disabled = true;
  btn.textContent = 'Sellando...';

  api('/api/vendor/stamp', {
    method: 'POST',
    body: { folio: currentFolio, stand_num: activeStand }
  }).then(function (d) {
    var result = document.getElementById('stampResult');
    result.className = 'stamp-result success';
    result.innerHTML = '<strong>Sello registrado</strong><div class="stamp-code">' + d.stamp_code + '</div>' +
      '<p>' + d.nombre + ' — ' + d.total_stamps + '/' + TOTAL_STAMPS + ' sellos</p>';

    recentStamps.unshift({ folio: currentFolio, nombre: d.nombre, code: d.stamp_code, stand: activeStand });
    renderRecent();
    btn.textContent = 'Sellado';
    lookupFolio();
  }).catch(function (err) {
    var result = document.getElementById('stampResult');
    result.className = 'stamp-result error';
    result.innerHTML = err.message;
    btn.disabled = false;
    btn.textContent = 'Reintentar';
  });
}

function renderRecent() {
  var ul = document.getElementById('recentList');
  ul.innerHTML = '';
  recentStamps.slice(0, 20).forEach(function (s) {
    var li = document.createElement('li');
    li.innerHTML = '<span class="name">' + s.nombre + '</span><span class="code">' + s.code + '</span>';
    ul.appendChild(li);
  });
  document.getElementById('recentStamps').style.display = recentStamps.length > 0 ? 'block' : 'none';
}

// ── VENDORS (admin) ──
function buildStandOptions(selectedId) {
  var html = '';
  var acts = STAMP_MAP.filter(function(s) { return s.type === 'actividad'; });
  var pats = STAMP_MAP.filter(function(s) { return s.type === 'patrocinador'; });
  html += '<optgroup label="Actividades">';
  acts.forEach(function(s) { html += '<option value="' + s.id + '"' + (s.id === selectedId ? ' selected' : '') + '>' + s.name + '</option>'; });
  html += '</optgroup><optgroup label="Patrocinadores">';
  pats.forEach(function(s) { html += '<option value="' + s.id + '"' + (s.id === selectedId ? ' selected' : '') + '>' + s.name + '</option>'; });
  html += '</optgroup>';
  return html;
}

function changeVendorStand(email, selectEl) {
  var newStand = selectEl.value;
  api('/api/vendor/change-stand', {
    method: 'POST',
    body: { vendor_email: email, new_stand: newStand }
  }).then(function(d) {
    if (d.ok) loadVendors();
    else alert(d.error || 'Error al cambiar stand');
  }).catch(function() { alert('Error de conexión'); });
}

function loadVendors() {
  api('/api/vendor/list')
    .then(function (d) {
      var container = document.getElementById('vendorList');
      if (d.vendors.length === 0) {
        container.innerHTML = '<p class="empty-msg">No hay vendedores. Crea uno arriba.</p>';
        return;
      }
      container.innerHTML = '';
      d.vendors.forEach(function (v) {
        var item = document.createElement('div');
        item.className = 'vendor-item';
        var safeEmail = v.email.replace(/'/g, "\\'");
        var safeName = v.nombre.replace(/'/g, "\\'");
        item.innerHTML = '<div class="vendor-info"><div class="vendor-name">' + v.nombre + '</div>' +
          '<div class="vendor-email">' + v.email + '</div></div>' +
          '<div class="vendor-stand-row">' +
            '<select class="vendor-stand-select" onchange="changeVendorStand(\'' + safeEmail + '\', this)">' + buildStandOptions(v.stand_num) + '</select>' +
          '</div>' +
          '<button class="btn-change-pw" onclick="showChangePassword(\'' + safeEmail + '\', \'' + safeName + '\')">Cambiar contrase&ntilde;a</button>';
        container.appendChild(item);
      });
    })
    .catch(function () {
      document.getElementById('vendorList').innerHTML = '<p class="empty-msg">Error al cargar vendedores.</p>';
    });
}

// ── REGISTROS (admin) ──
var allRegistros = [];

function loadStats() {
  api('/api/vendor/list')
    .then(function (d) {
      if (d.stats) {
        document.getElementById('statRegistros').textContent = d.stats.total_registros;
        document.getElementById('statSellos').textContent = d.stats.total_sellos;
        document.getElementById('statVendedores').textContent = d.vendors.length;
      }
    })
    .catch(function () {});

  api('/api/admin/registros')
    .then(function (d) {
      allRegistros = d.registros || [];
      renderRegistros(allRegistros);
    })
    .catch(function () {
      document.getElementById('registroList').innerHTML = '<p class="empty-msg">Error al cargar registros.</p>';
    });
}

function filterRegistros() {
  var q = document.getElementById('registroSearch').value.toLowerCase().trim();
  if (!q) { renderRegistros(allRegistros); return; }
  var filtered = allRegistros.filter(function (r) {
    return (r.nombre + ' ' + r.apellido).toLowerCase().indexOf(q) >= 0 ||
      r.email.toLowerCase().indexOf(q) >= 0 ||
      r.folio.toLowerCase().indexOf(q) >= 0 ||
      r.telefono.indexOf(q) >= 0;
  });
  renderRegistros(filtered);
}

function renderRegistros(list) {
  var container = document.getElementById('registroList');
  if (list.length === 0) {
    container.innerHTML = '<p class="empty-msg">No se encontraron registros.</p>';
    return;
  }
  container.innerHTML = '';
  list.forEach(function (r) {
    var date = r.created_at ? new Date(r.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
    var item = document.createElement('div');
    item.className = 'registro-item';
    item.innerHTML =
      '<div class="registro-item-header">' +
        '<strong>' + r.nombre + ' ' + r.apellido + '</strong>' +
        '<span class="folio-badge">' + r.folio + '</span>' +
      '</div>' +
      '<div class="registro-detail-grid">' +
        '<div class="registro-detail"><span class="detail-key">Email</span><span class="detail-val">' + r.email + '</span></div>' +
        '<div class="registro-detail"><span class="detail-key">Teléfono</span><span class="detail-val">' + r.telefono + '</span></div>' +
        '<div class="registro-detail"><span class="detail-key">Adultos</span><span class="detail-val">' + r.adultos + '</span></div>' +
        '<div class="registro-detail"><span class="detail-key">Niños</span><span class="detail-val">' + (r.ninos || 0) + '</span></div>' +
        '<div class="registro-detail"><span class="detail-key">Trae perro</span><span class="detail-val">' + (r.trae_perro ? 'Sí' : 'No') + '</span></div>' +
        (r.trae_perro && r.nombre_perro ? '<div class="registro-detail"><span class="detail-key">Nombre perro</span><span class="detail-val">' + r.nombre_perro + '</span></div>' : '') +
        '<div class="registro-detail"><span class="detail-key">Registro</span><span class="detail-val">' + date + '</span></div>' +
      '</div>';
    container.appendChild(item);
  });
}

// ── CREATE VENDOR (admin) ──
var createForm = document.getElementById('createVendorForm');
createForm.addEventListener('submit', function (e) {
  e.preventDefault();
  var msg = document.getElementById('vendorMsg');
  msg.textContent = '';
  msg.className = 'form-msg';

  api('/api/vendor/create', {
    method: 'POST',
    body: {
      nombre: document.getElementById('vNombre').value.trim(),
      email: document.getElementById('vEmail').value.trim(),
      password: document.getElementById('vPassword').value,
      stand_num: parseInt(document.getElementById('vStand').value)
    }
  }).then(function (d) {
    msg.className = 'form-msg success';
    msg.textContent = 'Vendedor "' + d.vendor.nombre + '" creado para Stand ' + d.vendor.stand_num;
    createForm.reset();
    loadVendors();
  }).catch(function (err) {
    msg.className = 'form-msg error';
    msg.textContent = err.message;
  });
});

// ── CHANGE PASSWORD (admin modal) ──
function showChangePassword(email, nombre) {
  var existing = document.getElementById('pwModal');
  if (existing) existing.remove();

  var modal = document.createElement('div');
  modal.id = 'pwModal';
  modal.className = 'pw-modal-overlay';
  modal.innerHTML =
    '<div class="pw-modal">' +
      '<h3>Cambiar contrase&ntilde;a</h3>' +
      '<p class="pw-modal-name">' + nombre + '</p>' +
      '<div class="field"><label for="newPw">Nueva contrase&ntilde;a</label>' +
      '<input type="password" id="newPw" placeholder="M&iacute;nimo 4 caracteres"></div>' +
      '<div class="pw-modal-actions">' +
        '<button class="btn-create" onclick="changePassword(\'' + email.replace(/'/g, "\\'") + '\')">Guardar</button>' +
        '<button class="btn-logout" onclick="document.getElementById(\'pwModal\').remove()">Cancelar</button>' +
      '</div>' +
      '<p class="form-msg" id="pwMsg"></p>' +
    '</div>';
  document.body.appendChild(modal);
  document.getElementById('newPw').focus();
}

function changePassword(email) {
  var pw = document.getElementById('newPw').value;
  var msg = document.getElementById('pwMsg');
  if (!pw || pw.length < 4) { msg.className = 'form-msg error'; msg.textContent = 'La contraseña debe tener al menos 4 caracteres.'; return; }
  msg.className = 'form-msg'; msg.textContent = '';

  api('/api/vendor/change-password', {
    method: 'POST',
    body: { vendor_email: email, new_password: pw }
  }).then(function () {
    msg.className = 'form-msg success';
    msg.textContent = 'Contraseña actualizada.';
    setTimeout(function () { var m = document.getElementById('pwModal'); if (m) m.remove(); }, 1500);
  }).catch(function (err) {
    msg.className = 'form-msg error';
    msg.textContent = err.message;
  });
}

// ── RIFA (admin) ──
var rifaEligible = [];

function loadRifa() {
  var countEl = document.getElementById('rifaCount');
  var btn = document.getElementById('rifaBtn');

  api('/api/admin/raffle-eligible')
    .then(function (d) {
      rifaEligible = d.eligible || [];
      countEl.textContent = rifaEligible.length + ' participante(s) elegible(s)';
      btn.disabled = rifaEligible.length === 0;
      btn.textContent = rifaEligible.length > 0 ? 'Realizar Sorteo' : 'No hay participantes';
    })
    .catch(function () {
      countEl.textContent = 'Error al cargar participantes.';
    });
}

function realizarRifa() {
  if (rifaEligible.length === 0) return;
  var winnerEl = document.getElementById('rifaWinner');
  var btn = document.getElementById('rifaBtn');
  btn.disabled = true;
  btn.textContent = 'Sorteando...';
  winnerEl.style.display = 'block';
  winnerEl.className = 'rifa-winner shuffling';

  var shuffleCount = 0;
  var totalShuffles = 40;
  var baseSpeed = 80;
  var interval = setInterval(function () {
    var rand = rifaEligible[Math.floor(Math.random() * rifaEligible.length)];
    winnerEl.innerHTML = '<p class="rifa-winner-name">' + rand.nombre + ' ' + rand.apellido + '</p>';
    shuffleCount++;
    if (shuffleCount >= totalShuffles) {
      clearInterval(interval);
      var slowDown = 0;
      var slowInterval = setInterval(function () {
        var rand2 = rifaEligible[Math.floor(Math.random() * rifaEligible.length)];
        winnerEl.innerHTML = '<p class="rifa-winner-name">' + rand2.nombre + ' ' + rand2.apellido + '</p>';
        slowDown++;
        if (slowDown >= 10) {
          clearInterval(slowInterval);
          var winner = rifaEligible[Math.floor(Math.random() * rifaEligible.length)];
          winnerEl.className = 'rifa-winner final';
          winnerEl.innerHTML =
            '<h3>🎉 ¡Ganador(a)!</h3>' +
            '<p class="rifa-winner-name">' + winner.nombre + ' ' + winner.apellido + '</p>' +
            '<p class="rifa-winner-details">' + winner.email + '</p>' +
            '<p class="rifa-winner-details">Folio: ' + winner.folio + '</p>' +
            '<p class="rifa-winner-details">' + winner.telefono + '</p>';
          api('/api/admin/raffle-winner', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folio: winner.folio })
          }).then(function () {
            loadRifa();
          });
        }
      }, 300);
    }
  }, baseSpeed);
}

function seedTestData() {
  var btn = document.getElementById('seedBtn');
  btn.disabled = true;
  btn.textContent = 'Generando...';
  api('/api/admin/seed-test', { method: 'POST' })
    .then(function (d) {
      btn.textContent = d.message;
      loadRifa();
    })
    .catch(function (err) {
      btn.textContent = 'Error: ' + err.message;
      btn.disabled = false;
    });
}

// ── INIT ──
if (token && vendor) {
  showDashboard();
} else {
  document.getElementById('loginScreen').style.display = 'flex';
}
