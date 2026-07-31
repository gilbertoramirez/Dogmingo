#!/usr/bin/env node
const BASE = process.argv[2] || 'http://localhost:3000';
const CONCURRENT = parseInt(process.argv[3]) || 100;
const crypto = require('crypto');

function randomEmail() {
  return 'test' + crypto.randomBytes(4).toString('hex') + '@loadtest.com';
}

function randomPhone() {
  return '44' + Math.floor(10000000 + Math.random() * 90000000);
}

async function testRegistration(i) {
  const folio = 'DGM-LOAD' + i + Date.now().toString(36);
  const email = randomEmail();
  const start = Date.now();
  try {
    const res = await fetch(BASE + '/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folio,
        nombre: 'LoadTest',
        apellido: 'User' + i,
        email,
        telefono: randomPhone(),
        adultos: 1,
        ninos: 0,
        traePerro: false,
        nombrePerro: ''
      })
    });
    const data = await res.json();
    const elapsed = Date.now() - start;
    return { i, ok: res.ok, status: res.status, elapsed, error: data.error || null };
  } catch (err) {
    return { i, ok: false, status: 0, elapsed: Date.now() - start, error: err.message };
  }
}

async function testLookup(i) {
  const start = Date.now();
  try {
    const res = await fetch(BASE + '/api/sellos?q=loadtest' + i + '@test.com');
    const elapsed = Date.now() - start;
    return { i, ok: res.ok, status: res.status, elapsed, type: 'lookup' };
  } catch (err) {
    return { i, ok: false, status: 0, elapsed: Date.now() - start, error: err.message };
  }
}

async function run() {
  console.log('Load test: ' + CONCURRENT + ' concurrent registrations → ' + BASE);
  console.log('---');

  // Test 1: Concurrent registrations
  const regStart = Date.now();
  const regResults = await Promise.all(
    Array.from({ length: CONCURRENT }, (_, i) => testRegistration(i))
  );
  const regTotal = Date.now() - regStart;

  const ok = regResults.filter(r => r.ok).length;
  const fail = regResults.filter(r => !r.ok).length;
  const times = regResults.map(r => r.elapsed).sort((a, b) => a - b);
  const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  const p50 = times[Math.floor(times.length * 0.5)];
  const p95 = times[Math.floor(times.length * 0.95)];
  const p99 = times[Math.floor(times.length * 0.99)];

  console.log('REGISTRATIONS (' + CONCURRENT + ' concurrent):');
  console.log('  OK: ' + ok + '  Failed: ' + fail);
  console.log('  Total time: ' + regTotal + 'ms');
  console.log('  Avg: ' + avg + 'ms  P50: ' + p50 + 'ms  P95: ' + p95 + 'ms  P99: ' + p99 + 'ms');

  if (fail > 0) {
    var errors = {};
    regResults.filter(r => !r.ok).forEach(r => {
      var key = r.error || ('HTTP ' + r.status);
      errors[key] = (errors[key] || 0) + 1;
    });
    console.log('  Errors:', errors);
  }

  // Test 2: Concurrent lookups
  console.log('---');
  const lookStart = Date.now();
  const lookResults = await Promise.all(
    Array.from({ length: CONCURRENT }, (_, i) => testLookup(i))
  );
  const lookTotal = Date.now() - lookStart;
  const lookTimes = lookResults.map(r => r.elapsed).sort((a, b) => a - b);
  const lookAvg = Math.round(lookTimes.reduce((a, b) => a + b, 0) / lookTimes.length);

  console.log('LOOKUPS (' + CONCURRENT + ' concurrent):');
  console.log('  OK: ' + lookResults.filter(r => r.ok).length + '  Failed: ' + lookResults.filter(r => !r.ok).length);
  console.log('  Total time: ' + lookTotal + 'ms');
  console.log('  Avg: ' + lookAvg + 'ms  P50: ' + lookTimes[Math.floor(lookTimes.length * 0.5)] + 'ms  P95: ' + lookTimes[Math.floor(lookTimes.length * 0.95)] + 'ms');

  console.log('---');
  if (fail === 0 && avg < 2000) {
    console.log('RESULTADO: Tu app aguanta ' + CONCURRENT + ' usuarios sin problema.');
  } else if (fail === 0) {
    console.log('RESULTADO: Funciona pero lento. Revisa connection pooling.');
  } else {
    console.log('RESULTADO: Hay fallos bajo carga. Revisa logs y conexiones DB.');
  }
}

run().catch(console.error);
