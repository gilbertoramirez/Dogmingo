const { Resend } = require('resend');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, nombre, folio, passportImage } = req.body || {};
  if (!email || !nombre || !folio || !passportImage) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'Email service not configured' });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const base64Data = passportImage.replace(/^data:image\/png;base64,/, '');

    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Dogmingo <onboarding@resend.dev>',
      to: email,
      subject: 'Tu Pasaporte Perruno - Dogmingo',
      html: [
        '<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;background:#FAF8F3;padding:2rem;border-radius:16px;">',
        '<h1 style="color:#D93B1E;text-align:center;font-size:2rem;margin:0 0 0.5rem;">DOGMINGO</h1>',
        '<p style="text-align:center;color:#5C584F;margin:0 0 1.5rem;">El Domingo más Perrón del Año</p>',
        '<hr style="border:none;border-top:2px dashed #D4C9B5;margin:0 0 1.5rem;">',
        '<h2 style="color:#191714;text-align:center;margin:0 0 0.5rem;">¡Hola ' + nombre + '!</h2>',
        '<p style="color:#5C584F;text-align:center;margin:0 0 1.5rem;">Tu registro ha sido confirmado. Aquí está tu Pasaporte Perruno digital.</p>',
        '<div style="background:#FFFFFF;padding:1.5rem;border-radius:12px;margin:0 0 1.5rem;text-align:center;">',
        '<p style="font-weight:700;color:#2D6A3F;margin:0 0 0.5rem;">Tu folio: ' + folio + '</p>',
        '<p style="color:#8A8378;font-size:0.9rem;margin:0;">Muestra este folio o tu código QR en cada stand para que te sellen tu pasaporte.</p>',
        '</div>',
        '<p style="color:#5C584F;text-align:center;margin:0 0 1.5rem;">Tu pasaporte está adjunto como imagen.</p>',
        '<hr style="border:none;border-top:2px dashed #D4C9B5;margin:0 0 1.5rem;">',
        '<p style="text-align:center;color:#8A8378;font-size:0.8rem;margin:0;">',
        '<strong>Domingo 26 de Julio</strong> &middot; 10:00 a 15:00 hrs<br>',
        'Zitara Club &amp; Golf &middot; Salida a Calvillo, Aguascalientes<br><br>',
        'Evento en beneficio de <strong>Esperanza Canina</strong>',
        '</p></div>'
      ].join('\n'),
      attachments: [{
        filename: 'pasaporte-perruno-dogmingo.png',
        content: base64Data
      }]
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Email error:', err);
    return res.status(500).json({ error: 'Failed to send email' });
  }
};
