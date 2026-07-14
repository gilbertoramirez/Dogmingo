var STATION_NAMES = ['Bendicion', 'Huellas', 'Adiestramiento', 'Agilidad', 'Mercadito', 'Adopcion'];
var token = sessionStorage.getItem('dgm_vendor_token');
var vendor = null;
var scanner = null;
var scannerActive = false;
var currentFolio = null;
var currentRegistro = null;
var adminSelectedStand = 0;
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

// LOGIN
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
    btn.textContent = 'Iniciar sesion';
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
  document.getElementById('vendorSettings').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  var btn = document.getElementById('loginBtn');
  btn.disabled = false;
  btn.textContent = 'Iniciar sesión';
  document.getElementById('loginError').textContent = '';
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPassword').value = '';
}

function showDashboard() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';

  var standNum = vendor.stand_num;
  var isAdmin = vendor.es_admin;

  if (isAdmin) {
    document.getElementById('dashRole').textContent = 'Administrador';
    document.getElementById('dashTabs').style.display = 'flex';
    document.getElementById('tab-scanner').style.display = 'none';
    document.getElementById('tab-vendors').style.display = 'block';
    document.getElementById('tab-vendors').classList.add('active');
    loadVendors();
  } else {
    document.getElementById('dashRole').textContent = 'Stand ' + standNum + ' — ' + STATION_NAMES[standNum - 1];
    document.getElementById('dashTabs').style.display = 'none';
    document.getElementById('adminStandSelect').style.display = 'none';
    document.getElementById('tab-scanner').style.display = 'block';
    document.getElementById('tab-scanner').classList.add('active');
    document.getElementById('standIndicator').textContent = 'Stand ' + standNum + ' — ' + STATION_NAMES[standNum - 1];
  }
}

function buildAdminStandBtns() {
  var container = document.getElementById('adminStandBtns');
  container.innerHTML = '';
  STATION_NAMES.forEach(function (name, i) {
    var btn = document.createElement('button');
    btn.textContent = (i + 1) + '. ' + name;
    btn.addEventListener('click', function () {
      adminSelectedStand = i + 1;
      container.querySelectorAll('button').forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      document.getElementById('standIndicator').textContent = 'Stand ' + (i + 1) + ' — ' + name;
    });
    container.appendChild(btn);
  });
}

function getActiveStand() {
  if (vendor.es_admin) return adminSelectedStand;
  return vendor.stand_num;
}

// TABS
function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('active', t.dataset.tab === tabName); });
  document.querySelectorAll('.tab-content').forEach(function (c) { c.classList.toggle('active', c.id === 'tab-' + tabName); });
  if (tabName === 'vendors') loadVendors();
  if (tabName === 'stats') loadStats();
}

// QR SCANNER
function toggleScanner() {
  var btn = document.getElementById('startScanBtn');
  if (scannerActive) {
    scanner.stop().then(function () {
      scannerActive = false;
      btn.textContent = 'Abrir camara';
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
        btn.textContent = 'Abrir camara';
        btn.classList.remove('active');
      });
      document.getElementById('folioInput').value = text;
      lookupFolio();
    }
  ).then(function () {
    scannerActive = true;
    btn.textContent = 'Cerrar camara';
    btn.classList.add('active');
  }).catch(function (err) {
    alert('No se pudo acceder a la camara: ' + err);
  });
}

// LOOKUP
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
  if (reg.ninos > 0) infoHtml += ', ' + reg.ninos + ' nino(s)';
  if (reg.trae_perro && reg.nombre_perro) infoHtml += ' — Perro: ' + reg.nombre_perro;
  infoHtml += '</p>';
  details.innerHTML = infoHtml;

  var stampedStands = sellos.map(function (s) { return s.stand_num; });
  var stampsEl = document.getElementById('userStamps');
  stampsEl.innerHTML = '';
  for (var i = 1; i <= 6; i++) {
    var dot = document.createElement('div');
    dot.className = 'stamp-dot' + (stampedStands.indexOf(i) >= 0 ? ' filled' : '');
    dot.textContent = i;
    stampsEl.appendChild(dot);
  }

  var activeStand = getActiveStand();
  var stampBtn = document.getElementById('stampBtn');
  var result = document.getElementById('stampResult');
  result.style.display = 'none';
  result.className = 'stamp-result';

  if (activeStand === 0) {
    stampBtn.disabled = true;
    stampBtn.textContent = 'Selecciona un stand primero';
  } else if (stampedStands.indexOf(activeStand) >= 0) {
    stampBtn.disabled = true;
    stampBtn.textContent = 'Ya sellado en Stand ' + activeStand;
  } else {
    stampBtn.disabled = false;
    stampBtn.textContent = 'Sellar — Stand ' + activeStand + ' (' + STATION_NAMES[activeStand - 1] + ')';
  }
}

// STAMP
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
      '<p>' + d.nombre + ' — ' + d.total_stamps + '/6 sellos</p>';

    recentStamps.unshift({
      folio: currentFolio,
      nombre: d.nombre,
      code: d.stamp_code,
      stand: activeStand
    });
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

// VENDORS (admin)
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
        item.innerHTML = '<div class="vendor-info"><div class="vendor-name">' + v.nombre + '</div>' +
          '<div class="vendor-email">' + v.email + '</div></div>' +
          '<span class="vendor-stand">Stand ' + v.stand_num + '</span>' +
          '<button class="btn-change-pw" onclick="showChangePassword(\'' + v.email.replace(/'/g, "\\'") + '\', \'' + v.nombre.replace(/'/g, "\\'") + '\')">Cambiar contraseña</button>';
        container.appendChild(item);
      });

      if (d.stats) {
        document.getElementById('statRegistros').textContent = d.stats.total_registros;
        document.getElementById('statSellos').textContent = d.stats.total_sellos;
        document.getElementById('statVendedores').textContent = d.vendors.length;
      }
    })
    .catch(function () {
      document.getElementById('vendorList').innerHTML = '<p class="empty-msg">Error al cargar vendedores.</p>';
    });
}

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
    var stamps = r.stamps || [];
    var stampDots = '';
    for (var i = 1; i <= 6; i++) {
      var has = stamps.indexOf(i) >= 0;
      stampDots += '<span class="reg-stamp-dot' + (has ? ' filled' : '') + '">' + i + '</span>';
    }
    var date = r.created_at ? new Date(r.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : '';
    var perro = r.trae_perro && r.nombre_perro ? ' · Perro: ' + r.nombre_perro : '';
    var item = document.createElement('div');
    item.className = 'registro-item';
    item.innerHTML =
      '<div class="registro-item-header">' +
        '<strong>' + r.nombre + ' ' + r.apellido + '</strong>' +
        '<span class="folio-badge">' + r.folio + '</span>' +
      '</div>' +
      '<div class="registro-item-details">' +
        '<p>' + r.email + ' · ' + r.telefono + '</p>' +
        '<p>' + r.adultos + ' adulto(s)' + (r.ninos > 0 ? ', ' + r.ninos + ' niño(s)' : '') + perro + ' · ' + date + '</p>' +
      '</div>' +
      '<div class="registro-item-stamps">' +
        '<span class="reg-stamps-label">' + stamps.length + '/6</span>' +
        stampDots +
      '</div>';
    container.appendChild(item);
  });
}

// CREATE VENDOR
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

// VENDOR SETTINGS PANEL
function toggleVendorSettings() {
  var panel = document.getElementById('vendorSettings');
  var isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
  if (!isOpen && vendor) {
    var info = document.getElementById('vendorSettingsInfo');
    if (vendor.es_admin) {
      info.innerHTML = '<p><strong>Administrador</strong></p>';
    } else {
      info.innerHTML = '<p><strong>' + vendor.nombre + '</strong></p>' +
        '<p>Stand ' + vendor.stand_num + ' — ' + STATION_NAMES[vendor.stand_num - 1] + '</p>';
    }
  }
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

// CREATE HELPER
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
    msg.textContent = 'Ayudante "' + d.vendor.nombre + '" creado para Stand ' + d.vendor.stand_num + '.';
    document.getElementById('helpNombre').value = '';
    document.getElementById('helpEmail').value = '';
    document.getElementById('helpPassword').value = '';
  }).catch(function (err) {
    msg.className = 'form-msg error';
    msg.textContent = err.message;
  });
}

// CHANGE PASSWORD (admin modal)
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
      '<input type="text" id="newPw" placeholder="M&iacute;nimo 4 caracteres"></div>' +
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

// INIT
if (token && vendor) {
  showDashboard();
} else {
  document.getElementById('loginScreen').style.display = 'flex';
}
