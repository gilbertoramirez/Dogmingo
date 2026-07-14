const { Resend } = require('resend');
const crypto = require('crypto');

const CODE_SECRET = process.env.VENDOR_SECRET || 'dgm2025-vendor-key';

function generateCode() {
  return crypto.randomInt(100000, 999999).toString();
}

function signCode(email, code, expiresAt) {
  const data = email + ':' + code + ':' + expiresAt;
  return crypto.createHmac('sha256', CODE_SECRET).update(data).digest('hex').slice(0, 16);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email required' });

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'Email service not configured' });
  }

  try {
    const code = generateCode();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    const signature = signCode(email.toLowerCase().trim(), code, expiresAt);
    const token = Buffer.from(JSON.stringify({
      email: email.toLowerCase().trim(),
      code,
      exp: expiresAt,
      sig: signature,
    })).toString('base64');

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Dogmingo <onboarding@resend.dev>',
      to: email,
      subject: 'Tu código de verificación - Dogmingo',
      html: [
        '<div style="font-family:system-ui,sans-serif;max-width:400px;margin:0 auto;background:#FAF8F3;padding:2rem;border-radius:16px;text-align:center;">',
        '<h1 style="color:#D93B1E;font-size:1.8rem;margin:0 0 0.5rem;">DOGMINGO</h1>',
        '<p style="color:#5C584F;margin:0 0 1.5rem;">El Domingo más Perrón del Año</p>',
        '<hr style="border:none;border-top:2px dashed #D4C9B5;margin:0 0 1.5rem;">',
        '<p style="color:#191714;font-size:1rem;margin:0 0 1rem;">Tu código de verificación es:</p>',
        '<div style="background:#FFFFFF;padding:1rem;border-radius:12px;margin:0 0 1rem;">',
        '<span style="font-size:2.5rem;font-weight:800;letter-spacing:0.3em;color:#2D6A3F;">' + code + '</span>',
        '</div>',
        '<p style="color:#8A8378;font-size:0.85rem;margin:0;">Este código expira en 10 minutos.</p>',
        '</div>',
      ].join('\n'),
    });

    return res.status(200).json({ ok: true, token });
  } catch (err) {
    console.error('Send code error:', err);
    return res.status(500).json({ error: 'Failed to send code' });
  }
};
